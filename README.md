# rakeshkode.co.uk

Two static websites, built and uploaded to Hostinger by GitHub Actions on every push to `main`.

| Site | Source | Live at | Hostinger folder |
| --- | --- | --- | --- |
| Portfolio | `index.html`, `styles.css`, `main.js`, `assets/` | rakeshkode.co.uk | `public_html/` |
| Photography | `photography/` | photography.rakeshkode.co.uk | `public_html/photography/` |

## Add or remove photographs

Everything in `photography/library/` appears on the photography site. Folder = series, file name = caption.

```
photography/library/
  Portrait/01 Overshirt.webp
  Architecture/02 Sash windows.webp
  Street/07 Rain on Brick Lane, Shoreditch.jpg   → series "Street", 7th, place "Shoreditch"
```

- **Add:** on github.com open `photography/library/<Series>/` → **Add file → Upload files** → Commit. JPG, PNG, WebP, TIFF and iPhone HEIC all work; full-size files are fine, they are resized for the web automatically.
- **New series:** upload into a new folder name (e.g. `library/Travel/`). A filter button appears for it.
- **Remove:** open the photo on github.com → **⋯ → Delete file** → Commit.
- **Order:** the number at the start of the file name. Files without a number go last.
- **Place:** text after the last comma in the file name; otherwise `place` in `photography/gallery.json`.
- **Year:** read from the camera data when the photo has it.
- **Large photo at the top:** set `featured` in `photography/gallery.json` to `"<Series>/<file name without extension>"`.

The site updates 1–2 minutes after each commit. Progress: the repository's **Actions** tab.

## One-time setup

### 1. Hostinger
1. **hPanel → Domains → Subdomains:** create `photography` for `rakeshkode.co.uk` and keep the suggested folder `public_html/photography`.
2. **hPanel → Files → FTP Accounts:** note the FTP host (e.g. `ftp.rakeshkode.co.uk`), username and password. Reset the password there if you don't know it.
3. **hPanel → Security → SSL:** make sure SSL is active for both `rakeshkode.co.uk` and `photography.rakeshkode.co.uk`.

### 2. GitHub
In the repository: **Settings → Secrets and variables → Actions → New repository secret**, add:

| Name | Value |
| --- | --- |
| `FTP_SERVER` | FTP host from step 1.2 |
| `FTP_USERNAME` | FTP username |
| `FTP_PASSWORD` | FTP password |

If your FTP account opens directly inside `public_html` (instead of the folder that contains it), also add a **variable** (same page, Variables tab) `FTP_SERVER_DIR` = `./`.

Then **Actions → Build and deploy to Hostinger → Run workflow** for the first upload.

## Work on it locally

```bash
python3 -m pip install Pillow pillow-heif
python3 scripts/build.py          # builds dist/
python3 -m http.server 5174 -d dist
```

Open http://localhost:5174 and http://localhost:5174/photography/.

## Contact form

The enquiry form opens the visitor's email app addressed to contact@rakeshkode.co.uk. To receive enquiries directly instead, create a free form at formspree.io and paste its URL into `FORM_ENDPOINT` at the top of the enquiry section in `main.js`.
