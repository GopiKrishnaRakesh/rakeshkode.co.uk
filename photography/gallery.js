/* Rakesh Kode Photography — builds the wall, filters and lightbox from window.PHOTOS (photos.js). */
(() => {
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const pad = (n) => String(n).padStart(2, '0');
  const photos = (window.PHOTOS || []).map((p, i) => ({ ...p, no: `FR ${pad(i + 1)}` }));
  const caption = (p) => [p.title, [p.place, p.year].filter(Boolean).join(', ')].filter(Boolean).join(' — ');
  const altText = (p) => `${p.title}${p.series ? `, ${p.series.toLowerCase()} photograph` : ''}${p.place ? `, ${p.place}` : ''}`;

  /* Hero */
  const featured = photos.find((p) => p.featured) || photos[0];
  if (featured) {
    const img = $('.js-featured');
    img.src = featured.src;
    img.alt = altText(featured);
    img.width = featured.w;
    img.height = featured.h;
    $('.js-featured-no').textContent = featured.no;
    $('.js-featured-cap').textContent = caption(featured);
  }
  const series = [...new Set(photos.map((p) => p.series).filter(Boolean))];
  $('.js-count').textContent = pad(photos.length);
  $('.js-series-list').textContent = series.join(' · ');

  /* Wall */
  const grid = $('.js-grid');
  grid.innerHTML = photos.map((p, i) => `
    <figure class="tile" data-i="${i}" data-series="${p.series || ''}">
      <button type="button" aria-label="Open ${p.no}: ${caption(p)}">
        <img src="${p.src}" alt="${altText(p)}" width="${p.w}" height="${p.h}" loading="${i < 3 ? 'eager' : 'lazy'}" decoding="async">
      </button>
      <figcaption><span>${p.no}</span><span>${caption(p)}</span></figcaption>
    </figure>`).join('');
  $$('.tile img', grid).forEach((img) => {
    const done = () => img.classList.add('is-loaded');
    img.complete ? done() : (img.addEventListener('load', done), img.addEventListener('error', done));
  });

  /* Filters */
  let active = 'All';
  const filters = $('.js-filters');
  const count = (s) => (s === 'All' ? photos.length : photos.filter((p) => p.series === s).length);
  filters.innerHTML = ['All', ...series].map((s) => `<button type="button" class="chip" data-series="${s}" aria-pressed="${s === active}">${s} <small>${pad(count(s))}</small></button>`).join('');
  const visible = () => $$('.tile', grid).filter((t) => !t.hidden).map((t) => +t.dataset.i);
  filters.addEventListener('click', (e) => {
    const chip = e.target.closest('.chip');
    if (!chip) return;
    active = chip.dataset.series;
    $$('.chip', filters).forEach((c) => c.setAttribute('aria-pressed', String(c === chip)));
    $$('.tile', grid).forEach((t) => (t.hidden = active !== 'All' && t.dataset.series !== active));
  });

  /* Lightbox */
  const lb = $('.lb');
  const lbImg = $('.js-lb-img');
  let list = [];
  let pos = 0;
  let lastFocus = null;
  const show = (n) => {
    pos = (n + list.length) % list.length;
    const p = photos[list[pos]];
    lbImg.style.opacity = 0;
    lbImg.onload = () => (lbImg.style.opacity = 1);
    lbImg.src = p.src;
    lbImg.alt = altText(p);
    $('.js-lb-cap').textContent = `${p.no} — ${caption(p)}`;
    $('.js-lb-count').textContent = `${pad(pos + 1)} / ${pad(list.length)}`;
    const nav = list.length > 1;
    $('.js-lb-prev').hidden = !nav;
    $('.js-lb-next').hidden = !nav;
  };
  const open = (i) => {
    list = visible();
    if (!list.includes(i)) list = photos.map((_, k) => k);
    lastFocus = document.activeElement;
    show(list.indexOf(i));
    lb.hidden = false;
    document.body.style.overflow = 'hidden';
    requestAnimationFrame(() => lb.classList.add('is-open'));
    $('.js-lb-close').focus();
  };
  const close = () => {
    lb.classList.remove('is-open');
    document.body.style.overflow = '';
    setTimeout(() => (lb.hidden = true), 300);
    lastFocus && lastFocus.focus();
  };
  grid.addEventListener('click', (e) => { const t = e.target.closest('.tile'); if (t) open(+t.dataset.i); });
  $('.hero__open').addEventListener('click', () => featured && open(photos.indexOf(featured)));
  $('.js-lb-close').addEventListener('click', close);
  $('.js-lb-prev').addEventListener('click', () => show(pos - 1));
  $('.js-lb-next').addEventListener('click', () => show(pos + 1));
  lb.addEventListener('click', (e) => { if (e.target === lb || e.target.classList.contains('lb__fig')) close(); });
  document.addEventListener('keydown', (e) => {
    if (lb.hidden) return;
    if (e.key === 'Escape') close();
    if (e.key === 'ArrowRight') show(pos + 1);
    if (e.key === 'ArrowLeft') show(pos - 1);
  });
  let startX = null;
  lb.addEventListener('pointerdown', (e) => (startX = e.clientX));
  lb.addEventListener('pointerup', (e) => {
    if (startX === null) return;
    const dx = e.clientX - startX;
    startX = null;
    if (Math.abs(dx) > 50) show(pos + (dx < 0 ? 1 : -1));
  });

  /* Copy email */
  $$('.js-copy').forEach((btn) => btn.addEventListener('click', () => {
    const text = btn.dataset.copy;
    const fallback = () => {
      const r = document.createRange();
      r.selectNodeContents(btn.previousElementSibling);
      getSelection().removeAllRanges();
      getSelection().addRange(r);
      btn.textContent = 'Selected';
    };
    if (navigator.clipboard) navigator.clipboard.writeText(text).then(() => (btn.textContent = 'Copied'), fallback);
    else fallback();
  }));
})();
