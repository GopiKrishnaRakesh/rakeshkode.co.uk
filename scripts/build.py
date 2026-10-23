#!/usr/bin/env python3
"""Build both websites into dist/ for Hostinger.

    dist/               -> rakeshkode.co.uk              (public_html)
    dist/photography/   -> photography.rakeshkode.co.uk  (public_html/photography)

The photography wall is generated from the files in photography/library/:

    library/<Series>/<optional number> <Title>[, <Place>].<jpg|jpeg|png|webp|tif|heic>

    library/Street/07 Rain on Brick Lane, Shoreditch.jpg
      -> series "Street", position 7, title "Rain on Brick Lane", place "Shoreditch"

Add a file and the photo appears; delete it and it disappears. Settings such as the
default place and the large featured photo live in photography/gallery.json.

Run locally:  python3 scripts/build.py   (needs: python3 -m pip install Pillow pillow-heif)
"""
import hashlib
import json
import re
import shutil
from pathlib import Path

from PIL import Image, ImageOps

try:  # iPhone photos (.heic) — optional locally, installed in the GitHub Action
    from pillow_heif import register_heif_opener
    register_heif_opener()
    HEIC = {".heic", ".heif"}
except ImportError:
    HEIC = set()

ROOT = Path(__file__).resolve().parent.parent
DIST = ROOT / "dist"
CACHE = ROOT / ".build-cache"
PHOTO_SRC = ROOT / "photography"
LIBRARY = PHOTO_SRC / "library"
SETTINGS = PHOTO_SRC / "gallery.json"
HTACCESS = ROOT / "deploy" / "htaccess"

MAIN_FILES = ["index.html", "styles.css", "main.js", "assets"]
PHOTO_FILES = ["index.html", "photo.css", "gallery.js", "og.jpg", "about.webp"]
IMAGE_EXT = {".jpg", ".jpeg", ".png", ".webp", ".tif", ".tiff"} | HEIC
LONG_EDGE = 2000
QUALITY = 84


def slugify(text):
    return re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-") or "photo"


def short_hash(data):
    return hashlib.sha1(data).hexdigest()[:10]


def copy(src_dir, names, dest):
    dest.mkdir(parents=True, exist_ok=True)
    for name in names:
        src = src_dir / name
        if src.is_dir():
            shutil.copytree(src, dest / name, ignore=shutil.ignore_patterns(".DS_Store"))
        else:
            shutil.copy2(src, dest / name)


def parse_name(stem):
    """'07 Rain on Brick Lane, Shoreditch' -> (7, 'Rain on Brick Lane', 'Shoreditch')"""
    match = re.match(r"^\s*(\d+)[\s._-]+(.*)$", stem)
    order = int(match.group(1)) if match else None
    rest = (match.group(2) if match else stem).replace("_", " ").strip()
    title, place = rest, None
    if "," in rest:
        title, place = (part.strip() for part in rest.rsplit(",", 1))
    return order, title or "Untitled", place or None


def capture_year(img):
    try:
        exif = img.getexif()
        raw = exif.get_ifd(0x8769).get(36867) or exif.get(306)  # DateTimeOriginal, DateTime
        return int(str(raw)[:4]) if raw else None
    except Exception:
        return None


def has_gps(img):
    try:
        return bool(img.getexif().get_ifd(0x8825))
    except Exception:
        return False


def web_image(path, raw, out_dir, name):
    """Resize to the long edge and save as WebP; reuse the cached result when the source is unchanged."""
    CACHE.mkdir(exist_ok=True)
    cached = CACHE / f"{short_hash(raw)}-{LONG_EDGE}-{QUALITY}-noexif.webp"
    meta = cached.with_suffix(".json")
    if cached.exists() and meta.exists():
        info = json.loads(meta.read_text())
    else:
        with Image.open(path) as im:
            year = capture_year(im)
            if has_gps(im):
                print(f"Warning: {path.relative_to(ROOT)} contains GPS location. The website copy is "
                      "stripped, but the original in the public GitHub repo still has it.")
            im = ImageOps.exif_transpose(im).convert("RGB")
            im.thumbnail((LONG_EDGE, LONG_EDGE), Image.LANCZOS)
            # exif=b"" keeps camera data and location out of the published photo
            im.save(cached, "WEBP", quality=QUALITY, method=6, exif=b"")
            info = {"w": im.width, "h": im.height, "year": year}
        meta.write_text(json.dumps(info))
    shutil.copy2(cached, out_dir / name)
    return info


def build_gallery(dest):
    settings = json.loads(SETTINGS.read_text()) if SETTINGS.exists() else {}
    default_place = settings.get("place")
    featured_key = (settings.get("featured") or "").strip().lower()
    out_dir = dest / "photos"
    out_dir.mkdir(parents=True, exist_ok=True)

    files = sorted(
        p for p in LIBRARY.rglob("*")
        if p.is_file() and p.suffix.lower() in IMAGE_EXT and not p.name.startswith(".")
    )
    rows = []
    for path in files:
        rel = path.relative_to(LIBRARY)
        series = rel.parts[0] if len(rel.parts) > 1 else settings.get("default_series", "Selected")
        order, title, place = parse_name(path.stem)
        raw = path.read_bytes()
        name = f"{slugify(series)}-{slugify(title)}-{short_hash(raw)[:8]}.webp"
        info = web_image(path, raw, out_dir, name)
        entry = {"src": f"photos/{name}", "w": info["w"], "h": info["h"], "title": title,
                 "series": series, "place": place or default_place}
        if info.get("year"):
            entry["year"] = info["year"]
        if featured_key and rel.with_suffix("").as_posix().lower() == featured_key:
            entry["featured"] = True
        rows.append((order if order is not None else 10**6, rel.as_posix().lower(), entry))

    rows.sort(key=lambda row: (row[0], row[1]))
    entries = [row[2] for row in rows]
    if entries and not any(e.get("featured") for e in entries):
        entries[0]["featured"] = True
    (dest / "photos.js").write_text(
        "/* Generated by scripts/build.py from photography/library — do not edit. */\n"
        "window.PHOTOS = " + json.dumps(entries, indent=1, ensure_ascii=False) + ";\n",
        encoding="utf-8",
    )
    # Photo files are named by content hash, so browsers can keep them for a year.
    (out_dir / ".htaccess").write_text(
        '<IfModule mod_headers.c>\n  Header set Cache-Control "public, max-age=31536000, immutable"\n</IfModule>\n'
    )
    return entries


def set_featured(html_path, photo):
    html = html_path.read_text(encoding="utf-8")
    tag = (f'<img class="js-featured" src="{photo["src"]}" alt="" '
           f'width="{photo["w"]}" height="{photo["h"]}" fetchpriority="high">')
    html_path.write_text(re.sub(r'<img class="js-featured"[^>]*>', tag, html), encoding="utf-8")


def cache_bust(html_path, names):
    """Add ?v=<hash> to local CSS/JS so visitors always get the latest version."""
    html = html_path.read_text(encoding="utf-8")
    for name in names:
        version = short_hash((html_path.parent / name).read_bytes())[:8]
        html = html.replace(f'"{name}"', f'"{name}?v={version}"')
    html_path.write_text(html, encoding="utf-8")


def main():
    if DIST.exists():
        shutil.rmtree(DIST)
    copy(ROOT, MAIN_FILES, DIST)
    photo_dest = DIST / "photography"
    copy(PHOTO_SRC, PHOTO_FILES, photo_dest)

    entries = build_gallery(photo_dest)
    if entries:
        set_featured(photo_dest / "index.html", next(e for e in entries if e.get("featured")))
    cache_bust(DIST / "index.html", ["styles.css", "main.js"])
    cache_bust(photo_dest / "index.html", ["photo.css", "photos.js", "gallery.js"])
    for site in (DIST, photo_dest):
        shutil.copy2(HTACCESS, site / ".htaccess")

    series = sorted({e["series"] for e in entries})
    print(f"Built dist/ — {len(entries)} photographs in {len(series)} series: {', '.join(series) or 'none'}")
    if not HEIC:
        print("Note: .heic files are skipped locally until you run: python3 -m pip install pillow-heif")


if __name__ == "__main__":
    main()
