/* Rakesh Kode — Portfolio interactions
   GSAP + ScrollTrigger + Lenis, with a graceful no-JS / reduced-motion path. */
(() => {
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const root = document.documentElement;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const hasGsap = !!(window.gsap && window.ScrollTrigger);
  const motion = hasGsap && !reduce;
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));

  if (!motion) root.classList.add('no-motion');
  if (hasGsap) gsap.registerPlugin(ScrollTrigger);

  /* ---------- London clock ---------- */
  const fmt = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/London' });
  const tick = () => { const t = fmt.format(new Date()); $$('.js-clock').forEach((e) => (e.textContent = t)); };
  tick();
  setInterval(tick, 15000);

  /* ---------- Text splitting ---------- */
  $$('[data-split]').forEach((el) => {
    el.innerHTML = el.innerHTML
      .split(/<br\s*\/?>/i)
      .map((part) => `<span class="sl"><span>${part.trim()}</span></span>`)
      .join('');
  });

  const manifesto = $('[data-words]');
  const goldWords = ['frames', 'interfaces', 'businesses'];
  if (manifesto) {
    manifesto.innerHTML = manifesto.textContent
      .trim()
      .split(/\s+/)
      .map((w) => {
        const bare = w.replace(/[^a-z]/gi, '').toLowerCase();
        return `<span class="w${goldWords.includes(bare) ? ' gold' : ''}">${w}</span>`;
      })
      .join(' ');
  }
  if (!motion && manifesto) $$('.w', manifesto).forEach((w) => w.classList.add('is-on'));

  /* ---------- Smooth scroll ---------- */
  let lenis = null;
  if (motion && window.Lenis) {
    lenis = new Lenis({ lerp: 0.09, smoothWheel: true, wheelMultiplier: 1 });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((t) => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
  }

  const scrollToTarget = (hash) => {
    const el = hash === '#top' ? 0 : $(hash);
    if (el === null) return;
    if (lenis) lenis.scrollTo(el, { duration: 1.6, easing: (t) => 1 - Math.pow(1 - t, 4) });
    else (el === 0 ? window.scrollTo({ top: 0, behavior: 'smooth' }) : el.scrollIntoView({ behavior: 'smooth' }));
  };

  /* ---------- Menu ---------- */
  const burger = $('.nav__burger');
  const setMenu = (open) => {
    document.body.classList.toggle('menu-open', open);
    burger.setAttribute('aria-expanded', String(open));
    burger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    $('.menu').setAttribute('aria-hidden', String(!open));
    if (lenis) open ? lenis.stop() : lenis.start();
  };
  burger.addEventListener('click', () => setMenu(!document.body.classList.contains('menu-open')));

  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (!a) return;
    const hash = a.getAttribute('href');
    if (hash.length < 2) return;
    e.preventDefault();
    const wasOpen = document.body.classList.contains('menu-open');
    if (wasOpen) setMenu(false);
    setTimeout(() => scrollToTarget(hash), wasOpen ? 350 : 0);
  });

  /* ---------- Nav state ---------- */
  const nav = $('.nav');
  let lastY = 0;
  const onScroll = () => {
    const y = window.scrollY;
    nav.classList.toggle('is-solid', y > 60);
    nav.classList.toggle('is-hidden', y > window.innerHeight * 0.9 && y > lastY + 2 && !document.body.classList.contains('menu-open'));
    if (y < lastY - 2) nav.classList.remove('is-hidden');
    lastY = y;
  };
  window.addEventListener('scroll', onScroll, { passive: true });

  /* ---------- Hero word rotator ---------- */
  const rot = $$('.rot-w');
  let ri = 0;
  if (rot.length > 1) {
    setInterval(() => {
      const cur = rot[ri];
      cur.classList.remove('is-active');
      cur.classList.add('is-out');
      setTimeout(() => cur.classList.remove('is-out'), 900);
      ri = (ri + 1) % rot.length;
      rot[ri].classList.add('is-active');
    }, 2600);
  }

  /* ---------- Loader + hero intro ---------- */
  const loader = $('.loader');
  const heroIntro = () => {
    if (!motion) return;
    const tl = gsap.timeline({ defaults: { ease: 'expo.out' } });
    tl.from('.hero__word .ch', { yPercent: 120, opacity: 0, duration: 1.5, stagger: 0.06 })
      .from('.hero__portrait img', { y: 120, opacity: 0, scale: 1.06, duration: 1.8 }, 0.15)
      .from('.hero__meta', { y: -16, opacity: 0, duration: 1 }, 0.5)
      .from('.hero__left > *, .hero__right > *', { y: 30, opacity: 0, duration: 1.2, stagger: 0.08 }, 0.7)
      .from('.hero__badge', { scale: 0.6, opacity: 0, rotate: -90, duration: 1.4 }, 0.9)
      .from('.hero__scroll', { opacity: 0, duration: 1 }, 1.1)
      .from('.nav', { y: -30, opacity: 0, duration: 1, clearProps: 'transform,opacity' }, 0.6);
  };

  const runLoader = async () => {
    if (!motion) { loader && loader.remove(); return; }
    lenis && lenis.stop();
    window.scrollTo(0, 0);
    const heroBits = '.hero__word .ch, .hero__portrait img, .hero__meta, .hero__left > *, .hero__right > *, .hero__badge, .hero__scroll, .nav';
    gsap.set(heroBits, { opacity: 0 });
    // Failsafe: never trap the visitor behind the loader (e.g. tab opened in the background).
    setTimeout(() => {
      if (!loader.isConnected) return;
      loader.remove();
      gsap.set(heroBits, { clearProps: 'opacity,transform' });
      lenis && lenis.start();
      ScrollTrigger.refresh();
    }, 9000);
    const num = $('.loader__num');
    const bar = $('.loader__bar span');
    const o = { v: 0 };
    const paint = () => { num.textContent = Math.round(o.v); bar.style.width = o.v + '%'; };
    gsap.to(o, { v: 82, duration: 1.5, ease: 'power2.out', onUpdate: paint });

    const img = $('.hero__portrait img');
    const imgReady = img.complete ? Promise.resolve() : new Promise((r) => { img.addEventListener('load', r, { once: true }); img.addEventListener('error', r, { once: true }); });
    const fontsReady = document.fonts ? document.fonts.ready : Promise.resolve();
    await Promise.race([Promise.all([imgReady, fontsReady, wait(1500)]), wait(5000)]);

    await new Promise((r) => gsap.to(o, { v: 100, duration: 0.45, ease: 'power1.inOut', onUpdate: paint, onComplete: r }));
    gsap.set('.hero__word .ch, .hero__portrait img, .hero__meta, .hero__left > *, .hero__right > *, .hero__badge, .hero__scroll, .nav', { clearProps: 'opacity' });
    gsap.timeline()
      .to('.loader__inner, .loader__bar, .loader__meta', { opacity: 0, y: -24, duration: 0.5, ease: 'power2.in' })
      .to(loader, { clipPath: 'inset(0 0 100% 0)', duration: 1.1, ease: 'expo.inOut' })
      .add(heroIntro, '-=0.65')
      .add(() => { loader.remove(); lenis && lenis.start(); ScrollTrigger.refresh(); });
  };
  runLoader();

  /* ---------- Scroll animations ---------- */
  if (motion) {
    // Split headings
    $$('[data-split]').forEach((el) => {
      gsap.from($$('.sl > span', el), {
        yPercent: 110, rotate: 2, duration: 1.3, ease: 'expo.out', stagger: 0.09,
        scrollTrigger: { trigger: el, start: 'top 85%' },
      });
    });

    // Generic reveals
    $$('.reveal-up').forEach((el) => {
      gsap.to(el, { opacity: 1, y: 0, duration: 1.4, ease: 'expo.out', scrollTrigger: { trigger: el, start: 'top 85%' } });
    });

    ScrollTrigger.batch('.disc__row, .step, .stat, .clev__steps li, .about__p, .about__principles li, .tools span, .frame, .contact__grid > div, .clev__ints span, .section-head__aside, .clev__lead, .clev__quote', {
      start: 'top 88%',
      onEnter: (els) => gsap.from(els, { opacity: 0, y: 44, duration: 1.2, ease: 'expo.out', stagger: 0.07, clearProps: 'transform,opacity' }),
      once: true,
    });

    // Manifesto word highlight
    if (manifesto) {
      const words = $$('.w', manifesto);
      ScrollTrigger.create({
        trigger: manifesto, start: 'top 80%', end: 'bottom 40%', scrub: true,
        onUpdate: (self) => {
          const n = Math.round(self.progress * words.length);
          words.forEach((w, i) => w.classList.toggle('is-on', i < n));
        },
      });
    }

    // Hero scroll-out
    const mm = gsap.matchMedia();
    mm.add('(min-width: 861px)', () => {
      gsap.to('.hero__word', { yPercent: 28, opacity: 0.25, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
      gsap.to('.hero__portrait', { y: 90, scale: 0.94, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
      gsap.to('.hero__left, .hero__right, .hero__badge', { y: -60, opacity: 0, ease: 'none', scrollTrigger: { trigger: '.hero', start: '20% top', end: '70% top', scrub: true } });

      // Horizontal work track
      const track = $('.work__track');
      const bar = $('.work__bar i');
      const idx = $('.js-work-idx');
      const dist = () => Math.max(0, track.scrollWidth - window.innerWidth);
      gsap.to(track, {
        x: () => -dist(), ease: 'none',
        scrollTrigger: {
          trigger: '.work', start: 'top top', end: () => '+=' + dist(), pin: true, scrub: 0.8, invalidateOnRefresh: true, anticipatePin: 1,
          onUpdate: (self) => {
            bar.style.transform = `scaleX(${Math.max(0.02, self.progress)})`;
            idx.textContent = String(Math.min(6, 1 + Math.floor(self.progress * 6))).padStart(2, '0');
          },
        },
      });
    });

    // Clevorise wordmark
    gsap.from('.clev__word span', {
      yPercent: 60, opacity: 0, duration: 1.6, ease: 'expo.out', stagger: 0.12,
      scrollTrigger: { trigger: '.clev__word', start: 'top 85%' },
    });

    // Counters
    $$('[data-count]').forEach((el) => {
      const end = +el.dataset.count;
      const o = { v: 0 };
      gsap.to(o, { v: end, duration: 2, ease: 'power3.out', onUpdate: () => (el.textContent = Math.round(o.v)), scrollTrigger: { trigger: el, start: 'top 90%' } });
    });

    // About image reveal + parallax
    gsap.fromTo('.about__img', { clipPath: 'inset(100% 0 0 0)' }, { clipPath: 'inset(0% 0 0 0)', duration: 1.6, ease: 'expo.inOut', scrollTrigger: { trigger: '.about__img', start: 'top 80%' } });
    gsap.fromTo('.about__img img', { yPercent: -12 }, { yPercent: 0, ease: 'none', scrollTrigger: { trigger: '.about', start: 'top bottom', end: 'bottom top', scrub: true } });

    // Contact headline
    gsap.from('.contact__big .cl > span', { yPercent: 110, duration: 1.4, ease: 'expo.out', stagger: 0.1, scrollTrigger: { trigger: '.contact__big', start: 'top 80%' } });
    gsap.from('.contact__btn', { scale: 0, rotate: -120, duration: 1.4, ease: 'expo.out', scrollTrigger: { trigger: '.contact__big', start: 'top 60%' } });

    // Footer wordmark drift
    gsap.from('.footer__word', { yPercent: 40, opacity: 0, ease: 'none', scrollTrigger: { trigger: '.footer', start: 'top bottom', end: 'bottom bottom', scrub: true } });

    // Dashboard bars grow
    gsap.from('.md-chart i', { scaleY: 0, duration: 1.2, ease: 'expo.out', stagger: 0.05, scrollTrigger: { trigger: '.work', start: 'top 40%' } });

    window.addEventListener('load', () => ScrollTrigger.refresh());
  }

  /* ---------- Pointer-only interactions ---------- */
  if (finePointer && !reduce) {
    // Custom cursor
    const cursor = $('.cursor');
    const ring = $('.cursor__ring');
    const dot = $('.cursor__dot');
    const label = $('.cursor__label');
    root.classList.add('has-cursor');
    let mx = innerWidth / 2, my = innerHeight / 2, rx = mx, ry = my;
    addEventListener('mousemove', (e) => { mx = e.clientX; my = e.clientY; }, { passive: true });
    const loop = () => {
      rx += (mx - rx) * 0.18;
      ry += (my - ry) * 0.18;
      dot.style.transform = `translate(${mx}px, ${my}px)`;
      ring.style.transform = `translate(${rx}px, ${ry}px)`;
      requestAnimationFrame(loop);
    };
    loop();
    document.addEventListener('mouseover', (e) => {
      const lab = e.target.closest('[data-cursor]');
      const hov = e.target.closest('a, button, [data-hover], .frame');
      cursor.classList.toggle('is-label', !!lab);
      cursor.classList.toggle('is-hover', !lab && !!hov);
      if (lab) label.textContent = lab.dataset.cursor;
    });
    document.addEventListener('mouseleave', () => (cursor.style.opacity = 0));
    document.addEventListener('mouseenter', () => (cursor.style.opacity = 1));

    if (hasGsap) {
      // Magnetic buttons
      $$('[data-magnetic]').forEach((el) => {
        const xTo = gsap.quickTo(el, 'x', { duration: 0.6, ease: 'power3.out' });
        const yTo = gsap.quickTo(el, 'y', { duration: 0.6, ease: 'power3.out' });
        el.addEventListener('mousemove', (e) => {
          const r = el.getBoundingClientRect();
          xTo((e.clientX - r.left - r.width / 2) * 0.35);
          yTo((e.clientY - r.top - r.height / 2) * 0.35);
        });
        el.addEventListener('mouseleave', () => { xTo(0); yTo(0); });
      });

      // Hero mouse parallax
      const hero = $('.hero');
      const pX = gsap.quickTo('.hero__portrait img', 'x', { duration: 1.2, ease: 'power3.out' });
      const pR = gsap.quickTo('.hero__portrait img', 'rotationY', { duration: 1.2, ease: 'power3.out' });
      const wX = gsap.quickTo('.hero__word-inner', 'x', { duration: 1.4, ease: 'power3.out' });
      const wY = gsap.quickTo('.hero__word-inner', 'y', { duration: 1.4, ease: 'power3.out' });
      hero.addEventListener('mousemove', (e) => {
        const nx = e.clientX / innerWidth - 0.5;
        const ny = e.clientY / innerHeight - 0.5;
        pX(nx * 26); pR(nx * 4);
        wX(nx * -40); wY(ny * -14);
      });
    }
  }

  /* ---------- Enquiry form ----------
     With FORM_ENDPOINT set (e.g. a Formspree URL), enquiries post straight to your inbox.
     Without it, the form opens the visitor's email app with the message filled in. */
  const FORM_ENDPOINT = '';
  const CONTACT_EMAIL = 'contact@rakeshkode.co.uk';
  const form = $('#enquiry-form');
  const status = $('.form__status');
  const setStatus = (html, kind = '') => { status.innerHTML = html; status.className = 'form__status' + (kind ? ' is-' + kind : ''); };

  const copyEmail = (btn) => {
    const done = () => (btn.textContent = 'Copied');
    if (navigator.clipboard) navigator.clipboard.writeText(CONTACT_EMAIL).then(done, () => (btn.textContent = CONTACT_EMAIL));
    else btn.textContent = CONTACT_EMAIL;
  };
  status.addEventListener('click', (e) => { const b = e.target.closest('[data-copy]'); if (b) copyEmail(b); });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(form));
    const checks = { name: data.name.trim(), email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email.trim()), message: data.message.trim() };
    let firstBad = null;
    Object.entries(checks).forEach(([k, ok]) => {
      const field = form.elements[k].closest('.field');
      field.classList.toggle('is-invalid', !ok);
      if (!ok && !firstBad) firstBad = form.elements[k];
    });
    if (firstBad) {
      setStatus('Please add your name, a valid email and a short message.', 'error');
      firstBad.focus();
      return;
    }

    const subject = `New enquiry: ${data.service} — ${data.name.trim()}`;
    const body = [
      `Name: ${data.name.trim()}`,
      `Email: ${data.email.trim()}`,
      `Service: ${data.service}`,
      `Budget: ${data.budget || 'Not given'}`,
      '',
      data.message.trim(),
    ].join('\n');

    if (FORM_ENDPOINT) {
      const btn = form.querySelector('.form__submit');
      btn.disabled = true;
      setStatus('Sending…');
      try {
        const res = await fetch(FORM_ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify({ ...data, _subject: subject }) });
        if (!res.ok) throw new Error(res.status);
        form.reset();
        setStatus('Thank you — your enquiry has been sent. I’ll reply within a couple of working days.', 'ok');
      } catch {
        setStatus(`That didn’t go through. Please email <b>${CONTACT_EMAIL}</b> directly.`, 'error');
      } finally {
        btn.disabled = false;
      }
      return;
    }

    window.location.href = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    setStatus(`Your email app should open with this message ready to send. Nothing opened? Email <b>${CONTACT_EMAIL}</b> — <button type="button" data-copy>copy address</button>`, 'ok');
  });
  $$('input, textarea', form).forEach((el) => el.addEventListener('input', () => el.closest('.field').classList.remove('is-invalid')));

  /* ---------- Lightbox ---------- */
  const lb = $('.lb');
  const lbImg = $('.lb__fig img');
  const lbCap = $('.lb__fig figcaption');
  const items = $$('[data-lightbox]');
  let li = 0;
  const show = (i) => {
    li = (i + items.length) % items.length;
    const it = items[li];
    lbImg.src = it.dataset.lightbox;
    lbImg.alt = (it.querySelector('img') || {}).alt || '';
    lbCap.textContent = it.dataset.caption || '';
    if (hasGsap && !reduce) gsap.fromTo(lbImg, { opacity: 0, scale: 0.97 }, { opacity: 1, scale: 1, duration: 0.6, ease: 'expo.out' });
  };
  const open = (i) => {
    show(i);
    lb.hidden = false;
    requestAnimationFrame(() => lb.classList.add('is-open'));
    lenis && lenis.stop();
    $('.lb__close').focus();
  };
  const close = () => {
    lb.classList.remove('is-open');
    setTimeout(() => (lb.hidden = true), 350);
    lenis && lenis.start();
    items[li] && items[li].focus();
  };
  items.forEach((el, i) => {
    el.setAttribute('tabindex', '0');
    el.setAttribute('role', 'button');
    el.setAttribute('aria-label', `Open image: ${el.dataset.caption || 'photograph'}`);
    el.addEventListener('click', () => open(i));
    el.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(i); } });
  });
  $('.lb__close').addEventListener('click', close);
  $('.lb__prev').addEventListener('click', () => show(li - 1));
  $('.lb__next').addEventListener('click', () => show(li + 1));
  lb.addEventListener('click', (e) => { if (e.target === lb || e.target.classList.contains('lb__fig')) close(); });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && document.body.classList.contains('menu-open')) setMenu(false);
    if (lb.hidden) return;
    if (e.key === 'Escape') close();
    if (e.key === 'ArrowRight') show(li + 1);
    if (e.key === 'ArrowLeft') show(li - 1);
  });
})();
