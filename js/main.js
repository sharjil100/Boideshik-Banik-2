/* =========================================================
   Boideshik Banik — interactions & motion
   ========================================================= */
(() => {
  document.documentElement.classList.add('js');

  const D = window.BB_DATA;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const taka = n => '৳' + Math.round(n).toLocaleString('en-IN');

  /* ---------- Product art ---------- */
  let uid = 0;
  const art = (type, o = {}) =>
    window.ProductArt ? window.ProductArt.svg(type, { ...o, uid: 'a' + (++uid) }) : '';

  function hydrateArt(root = document) {
    $$('[data-art]', root).forEach(el => {
      el.innerHTML = art(el.dataset.art, {
        color: el.dataset.color,
        accent: el.dataset.accent,
        view: el.dataset.view || 'front'
      });
    });
  }
  const artEl = (type, color, view = 'front', accent) =>
    `<div class="art" data-art="${type}" data-color="${color}" data-view="${view}"${accent ? ` data-accent="${accent}"` : ''}></div>`;

  /* ---------- Toast & quote badge ---------- */
  const toastEl = $('[data-toast]');
  let toastTimer;
  window.toast = msg => {
    toastEl.textContent = msg;
    toastEl.classList.add('is-on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('is-on'), 2800);
  };
  let quoteCount = 0;
  const badge = $('[data-quote-count]');
  const bumpQuote = n => {
    quoteCount += n;
    badge.textContent = quoteCount;
    badge.hidden = quoteCount === 0;
    gsap.fromTo(badge, { scale: 1.6 }, { scale: 1, duration: .5, ease: 'back.out(3)' });
  };

  /* ---------- Text splitting ---------- */
  function splitLetters(el) {
    const words = el.textContent.trim().split(/\s+/);
    el.innerHTML = words
      .map(w => `<span class="word">${[...w].map(c => `<span class="ch">${c}</span>`).join('')}</span>`)
      .join('<span class="sp"></span>');
  }
  function splitWords(el) {
    const frag = document.createDocumentFragment();
    [...el.childNodes].forEach(node => {
      if (node.nodeType === 3) {
        node.textContent.split(/(\s+)/).forEach(part => {
          if (!part) return;
          if (/^\s+$/.test(part)) { frag.append(' '); return; }
          const s = document.createElement('span');
          s.className = 'w';
          s.textContent = part;
          frag.append(s);
        });
      } else {
        node.classList.add('w');
        frag.append(node);
      }
    });
    el.replaceChildren(frag);
  }
  $$('[data-split-letters]').forEach(splitLetters);
  $$('[data-split-words]').forEach(splitWords);

  /* =========================================================
     RENDER SECTIONS
     ========================================================= */

  /* ---------- Mixed lot grid ---------- */
  const lotGrid = $('[data-lot-grid]');
  lotGrid.innerHTML = D.lot.map(p => {
    const c0 = p.colors[0];
    const price = p.was
      ? `<span class="now-sale">${taka(p.price)}</span><s>${taka(p.was)}</s>`
      : taka(p.price);
    const opts = p.sizes
      ? `<p class="opt-label">Length: <b data-opt-label>${p.sizes[0][0]}</b></p>
         <div class="sizes">${p.sizes.map((s, i) =>
           `<button type="button" class="size${i ? '' : ' is-active'}" data-size="${s[0]}" data-price="${s[1]}">${s[0]}</button>`).join('')}</div>`
      : `<p class="opt-label">Color: <b data-opt-label>${c0[0]}</b></p>
         <div class="swatches">${p.colors.map((c, i) =>
           `<button type="button" class="swatch${i ? '' : ' is-active'}" style="--sw:${c[1]}" data-name="${c[0]}" data-hex="${c[1]}" aria-label="${c[0]}"></button>`).join('')}</div>`;
    return `
      <article class="pcard" data-id="${p.id}" data-reveal>
        <div class="pcard__media">
          ${p.badge ? `<span class="sale-badge">${p.badge}</span>` : ''}
          ${artEl(p.art, c0[1])}
        </div>
        <p class="pcard__cat">${p.cat}</p>
        <h3 class="pcard__name">${p.name}</h3>
        <p class="pcard__price" data-price>${price} <span class="muted">/ pc</span></p>
        <p class="pcard__moq">MOQ ${p.moq.toLocaleString('en-IN')} pcs</p>
        ${opts}
        <button type="button" class="btn btn--solid btn--block" data-add>Add to lot</button>
      </article>`;
  }).join('');

  /* ---------- New arrivals ---------- */
  $('[data-new-track]').innerHTML = D.arrivals.map(p => `
    <article class="acard" data-reveal>
      <div class="acard__media">
        ${p.badge ? `<span class="sale-badge">${p.badge}</span>` : ''}
        ${artEl(p.art, p.color, 'angle')}
        <button type="button" class="acard__actions" aria-label="Add ${p.name} to quote" data-quick="${p.name}"><svg><use href="#i-plus"/></svg></button>
      </div>
      <p class="pcard__cat">${p.cat}</p>
      <h3 class="pcard__name">${p.name}</h3>
      <p class="pcard__price">${p.badge ? '<span class="now-sale">' : ''}${taka(p.from)} – ${taka(p.to)}${p.badge ? '</span>' : ''} <span class="muted">/ pc</span></p>
      <p class="pcard__moq">MOQ ${p.moq.toLocaleString('en-IN')} pcs</p>
    </article>`).join('');

  /* ---------- Feed ---------- */
  $('[data-feed-track]').innerHTML = D.feed.map(f => `
    <a href="#" class="post" style="--bg:${f.bg}" data-reveal>
      <div class="post__art">${f.items.map(i => artEl(i[0], i[1], i[2])).join('')}</div>
      <svg class="post__ig"><use href="#i-insta"/></svg>
      <div class="post__thumbs">${f.items.map(i => `<span>${artEl(i[0], i[1])}</span>`).join('')}</div>
    </a>`).join('');

  /* ---------- Voices ---------- */
  const voicePos = ['38%', '10%', '47%', '22%', '52%', '14%'];
  const voiceSpeed = [0.35, 0.1, 0.5, 0.2, 0.42, 0.15];
  $('[data-voices]').innerHTML = D.voices.map((v, i) => `
    <figure class="vcard" style="margin-left:${voicePos[i % voicePos.length]}" data-speed="${voiceSpeed[i % voiceSpeed.length]}">
      <div class="vcard__who">
        <span class="vcard__av" style="--hue:${v.hue}">${v.name.split(' ').map(s => s[0]).join('')}</span>
        <div><b>${v.name}</b><small>${v.org}</small></div>
      </div>
      <q>${v.quote}</q>
    </figure>`).join('');

  /* ---------- Hubs ---------- */
  $('[data-hubs-track]').innerHTML = D.hubs.map(h => `
    <a href="#" class="hub" data-reveal>
      <div class="hub__img" style="background-image:url('${h.img}')"></div>
      <div class="hub__text"><h3>${h.name}</h3><p>${h.note}</p></div>
      <span class="hub__plus"><svg><use href="#i-plus"/></svg></span>
    </a>`).join('');

  hydrateArt();

  /* =========================================================
     MIXED LOT LOGIC
     ========================================================= */
  const LOT_DISCOUNT = 0.08;
  const lines = [];
  const itemsEl = $('[data-lot-items]');
  const totalEl = $('[data-lot-total]');
  const saveEl = $('[data-lot-save]');
  const submitEl = $('[data-lot-submit]');

  function renderLot() {
    const rows = lines.map((l, i) => `
      <li class="lot__item">
        <div class="thumb">${artEl(l.art, l.hex)}</div>
        <div><h5>${l.name}</h5><p>${l.variant} · ${l.qty.toLocaleString('en-IN')} pcs × ${taka(l.price)}</p></div>
        <button type="button" class="rm" data-rm="${i}" aria-label="Remove ${l.name}"><svg><use href="#i-close"/></svg></button>
      </li>`);
    const ph = ['<li class="lot__ph"><i></i><span></span></li>'];
    while (rows.length < 3) rows.push(ph[0]);
    itemsEl.innerHTML = rows.join('');
    hydrateArt(itemsEl);

    const gross = lines.reduce((s, l) => s + l.qty * l.price, 0);
    const ok = lines.length >= 3;
    const net = ok ? gross * (1 - LOT_DISCOUNT) : gross;
    totalEl.textContent = taka(net);
    saveEl.hidden = !ok;
    if (ok) saveEl.textContent = `You save ${taka(gross - net)} (8%)`;
    submitEl.disabled = !ok;
  }

  lotGrid.addEventListener('click', e => {
    const card = e.target.closest('.pcard');
    if (!card) return;
    const p = D.lot.find(x => x.id === card.dataset.id);

    const sw = e.target.closest('.swatch');
    if (sw) {
      $$('.swatch', card).forEach(b => b.classList.toggle('is-active', b === sw));
      $('[data-opt-label]', card).textContent = sw.dataset.name;
      const a = $('.pcard__media .art', card);
      a.dataset.color = sw.dataset.hex;
      gsap.fromTo(a, { opacity: 0, scale: .96 }, { opacity: 1, scale: 1, duration: .5, ease: 'power2.out' });
      hydrateArt(a.parentElement);
      return;
    }
    const sz = e.target.closest('.size');
    if (sz) {
      $$('.size', card).forEach(b => b.classList.toggle('is-active', b === sz));
      $('[data-opt-label]', card).textContent = sz.dataset.size;
      $('[data-price]', card).innerHTML = `${taka(+sz.dataset.price)} <span class="muted">/ pc</span>`;
      return;
    }
    if (e.target.closest('[data-add]')) {
      const btn = e.target.closest('[data-add]');
      const activeSw = $('.swatch.is-active', card);
      const activeSz = $('.size.is-active', card);
      const variant = activeSz ? activeSz.dataset.size : activeSw.dataset.name;
      const price = activeSz ? +activeSz.dataset.price : p.price;
      const key = p.id + '|' + variant;
      const hit = lines.find(l => l.key === key);
      if (hit) hit.qty += p.moq;
      else lines.push({ key, name: p.name, art: p.art, hex: activeSw ? activeSw.dataset.hex : p.colors[0][1], variant, price, qty: p.moq });
      renderLot();
      btn.textContent = 'Added ✓';
      setTimeout(() => (btn.textContent = 'Add to lot'), 1400);
    }
  });
  itemsEl.addEventListener('click', e => {
    const rm = e.target.closest('[data-rm]');
    if (!rm) return;
    lines.splice(+rm.dataset.rm, 1);
    renderLot();
  });
  submitEl.addEventListener('click', () => {
    bumpQuote(lines.length);
    toast('Quote request sent. Our team will call you within 24 hours (demo).');
  });
  renderLot();

  /* =========================================================
     PDP LOGIC (MOQ + tiered pricing)
     ========================================================= */
  const MOQ = 500, STEP = 100;
  const tiers = $$('[data-tiers] .tier').map(t => ({ el: t, min: +t.dataset.min, price: +t.querySelector('strong').textContent.replace(/[^\d]/g, '') }));
  const qtyIn = $('[data-qty-input]');
  const tierFor = q => tiers.filter(t => q >= t.min).pop();

  function updatePdp() {
    let q = parseInt(qtyIn.value.replace(/[^\d]/g, ''), 10) || MOQ;
    q = Math.max(MOQ, q);
    qtyIn.value = q.toLocaleString('en-IN');
    const t = tierFor(q);
    tiers.forEach(x => x.el.classList.toggle('is-active', x === t));
    $('[data-pdp-price]').textContent = taka(t.price);
    $('[data-pdp-total]').textContent = taka(q * t.price);
    return q;
  }
  const stepQty = d => {
    const q = parseInt(qtyIn.value.replace(/[^\d]/g, ''), 10) || MOQ;
    qtyIn.value = Math.max(MOQ, q + d);
    updatePdp();
  };
  $('[data-qty-dec]').addEventListener('click', () => stepQty(-STEP));
  $('[data-qty-inc]').addEventListener('click', () => stepQty(STEP));
  qtyIn.addEventListener('change', updatePdp);
  updatePdp();

  $('[data-pdp-swatches]').addEventListener('click', e => {
    const sw = e.target.closest('.swatch');
    if (!sw) return;
    $$('[data-pdp-swatches] .swatch').forEach(b => b.classList.toggle('is-active', b === sw));
    $('[data-pdp-color]').textContent = sw.dataset.name;
    const hex = getComputedStyle(sw).getPropertyValue('--sw').trim();
    $$('.pdp__shot').slice(0, 2).forEach(fig => {
      const a = $('.art', fig);
      a.dataset.color = hex;
      hydrateArt(fig);
      gsap.fromTo(a, { opacity: 0 }, { opacity: 1, duration: .5 });
    });
  });
  $('[data-pdp-add]').addEventListener('click', () => {
    const q = updatePdp();
    bumpQuote(1);
    toast(`Added ${q.toLocaleString('en-IN')} pcs of Aero TWS Pro to your quote.`);
  });

  document.addEventListener('click', e => {
    const quick = e.target.closest('[data-quick]');
    if (!quick) return;
    e.preventDefault();
    bumpQuote(1);
    toast(`${quick.dataset.quick} added to your quote list.`);
  });

  /* =========================================================
     CAROUSELS
     ========================================================= */
  $$('[data-arrows]').forEach(group => {
    const track = $(`[data-track="${group.dataset.arrows}"]`);
    const [prev, next] = $$('.arrow', group);
    const sync = () => {
      prev.disabled = track.scrollLeft < 4;
      next.disabled = track.scrollLeft + track.clientWidth >= track.scrollWidth - 4;
    };
    group.addEventListener('click', e => {
      const b = e.target.closest('.arrow');
      if (!b) return;
      const card = track.firstElementChild;
      const step = card ? card.getBoundingClientRect().width + 18 : track.clientWidth * .75;
      track.scrollBy({ left: step * +b.dataset.dir, behavior: 'smooth' });
    });
    track.addEventListener('scroll', sync, { passive: true });
    window.addEventListener('resize', sync);
    sync();
  });

  /* =========================================================
     HERO SLIDESHOW
     ========================================================= */
  const slides = $$('.hero__slide');
  let si = 0;
  if (slides.length > 1 && !reduced) {
    setInterval(() => {
      slides[si].classList.remove('is-active');
      si = (si + 1) % slides.length;
      slides[si].classList.add('is-active');
    }, 5200);
  }

  /* =========================================================
     MOTION — Lenis + GSAP ScrollTrigger
     ========================================================= */
  gsap.registerPlugin(ScrollTrigger);
  const hh = () => parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--hh')) || 116;

  let lenis = null;
  if (!reduced && window.Lenis) {
    lenis = new Lenis({ lerp: 0.085, smoothWheel: true, wheelMultiplier: 1 });
    window.__lenis = lenis;
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(t => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
  }

  // in-page anchors
  document.addEventListener('click', e => {
    const a = e.target.closest('a[href^="#"]');
    if (!a || a.getAttribute('href').length < 2) return;
    const target = $(a.getAttribute('href'));
    if (!target) return;
    e.preventDefault();
    if (lenis) lenis.scrollTo(target, { offset: -hh() + 1, duration: 1.4 });
    else target.scrollIntoView({ behavior: 'smooth' });
  });

  // header: square corners once stuck
  const header = $('.site-header');
  ScrollTrigger.create({
    trigger: '.panel', start: 'top top', end: 'max',
    onToggle: self => header.classList.toggle('is-stuck', self.isActive)
  });

  if (reduced) {
    $$('[data-reveal]').forEach(el => el.classList.add('is-in'));
    return;
  }

  /* ---- Hero intro: letters rise, caption fades ---- */
  gsap.from('.hero__mark .ch', { yPercent: 70, opacity: 0, duration: 1.3, ease: 'expo.out', stagger: 0.045, delay: .15 });
  gsap.from('.hero__bottom > *', { y: 30, opacity: 0, duration: 1.1, ease: 'expo.out', stagger: .12, delay: .55 });
  // hero content drifts and fades slightly as the panel covers it
  gsap.to('.hero__mark, .hero__bottom', {
    yPercent: -12, opacity: .35, ease: 'none',
    scrollTrigger: { trigger: '.panel', start: 'top bottom', end: 'top top', scrub: true }
  });

  /* ---- Generic reveals ---- */
  ScrollTrigger.batch('[data-reveal]', {
    start: 'top 90%',
    once: true,
    onEnter: batch => {
      batch.forEach(el => el.classList.add('is-in'));
      gsap.to(batch, { opacity: 1, y: 0, duration: 1.1, ease: 'expo.out', stagger: .09, overwrite: true });
    }
  });

  /* ---- Statement: word-by-word scroll reveal + product rise ---- */
  gsap.fromTo('.statement__text .w', { opacity: 0 }, {
    opacity: 1, ease: 'none', stagger: .5,
    scrollTrigger: { trigger: '.statement__text', start: 'top 82%', end: 'bottom 38%', scrub: .6 }
  });
  gsap.fromTo('.statement__product', { y: 180, scale: .9 }, {
    y: 0, scale: 1, ease: 'none',
    scrollTrigger: { trigger: '.statement__product', start: 'top bottom', end: 'center 60%', scrub: .6 }
  });
  gsap.from('.statement__btn', {
    opacity: 0, y: 20, duration: .9, ease: 'expo.out',
    scrollTrigger: { trigger: '.statement__btn', start: 'top 92%' }
  });

  /* ---- Pinned banners: image settles from a slight zoom as it arrives ---- */
  ['.banner__img', '.feature__img'].forEach(sel => {
    const el = $(sel);
    gsap.fromTo(el, { scale: 1.18 }, {
      scale: 1, ease: 'none',
      scrollTrigger: { trigger: el.parentElement, start: 'top bottom', end: () => `top ${hh()}px`, scrub: true }
    });
  });
  gsap.from('.banner__text > *', {
    y: 40, opacity: 0, duration: 1.1, ease: 'expo.out', stagger: .12,
    scrollTrigger: { trigger: '.banner', start: 'top 55%' }
  });
  gsap.from('.feature__text > *', {
    y: 40, opacity: 0, duration: 1.1, ease: 'expo.out', stagger: .12,
    scrollTrigger: { trigger: '.feature', start: 'top 55%' }
  });
  gsap.from('.hotspot', {
    scale: 0, duration: .8, ease: 'back.out(2.5)', stagger: .15,
    scrollTrigger: { trigger: '.feature', start: 'top 40%' }
  });

  /* ---- Inline-image statement ---- */
  gsap.fromTo('.inline-statement__text .w:not(.pill-img)', { opacity: .12 }, {
    opacity: 1, ease: 'none', stagger: .4,
    scrollTrigger: { trigger: '.inline-statement__text', start: 'top 80%', end: 'bottom 50%', scrub: .6 }
  });
  gsap.fromTo('.inline-statement .pill-img', { scale: 0 }, {
    scale: 1, ease: 'back.out(1.6)', duration: 1, stagger: .18,
    scrollTrigger: { trigger: '.inline-statement__text', start: 'top 70%' }
  });

  /* ---- PDP gallery ---- */
  gsap.utils.toArray('.pdp__shot').forEach(fig => {
    gsap.from(fig, {
      y: 50, opacity: 0, duration: 1.2, ease: 'expo.out',
      scrollTrigger: { trigger: fig, start: 'top 92%' }
    });
  });

  /* ---- Story: card grows to full-bleed, then text + second image ---- */
  const media = $('.story__media');
  gsap.fromTo(media,
    { clipPath: 'inset(14% 18% 0% 18% round 14px)' },
    {
      clipPath: 'inset(0% 0% 0% 0% round 20px)', ease: 'none',
      scrollTrigger: { trigger: '.story-wrap', start: 'top bottom', end: () => `top ${hh()}px`, scrub: true }
    });
  const storyTl = gsap.timeline({
    scrollTrigger: {
      trigger: '.story__spacer',
      start: () => `top ${window.innerHeight}px`,
      end: 'bottom bottom',
      scrub: .6
    }
  });
  storyTl
    .to('.story__shade', { opacity: 1, duration: .25, ease: 'none' }, 0)
    .from('.story__text > *', { y: 40, opacity: 0, duration: .25, stagger: .05, ease: 'power2.out' }, .02)
    .to('.story__img--next', { yPercent: -100, duration: .5, ease: 'none' }, .45);

  /* ---- About collage: cards drift apart slightly ---- */
  gsap.fromTo('.about__back', { rotate: 2, y: 60 }, {
    rotate: -3, y: 0, ease: 'none',
    scrollTrigger: { trigger: '.about', start: 'top bottom', end: 'center center', scrub: true }
  });
  gsap.fromTo('.about__front', { rotate: 0, y: 120 }, {
    rotate: -9, y: 0, ease: 'none',
    scrollTrigger: { trigger: '.about', start: 'top bottom', end: 'center center', scrub: true }
  });

  /* ---- Voices: cards drift at different speeds over the pinned title ---- */
  $$('.vcard').forEach(card => {
    const s = +card.dataset.speed;
    gsap.fromTo(card, { y: s * 220 }, {
      y: -s * 220, ease: 'none',
      scrollTrigger: { trigger: card, start: 'top bottom', end: 'bottom top', scrub: true }
    });
  });
  gsap.fromTo('.voices__title span:first-child', { xPercent: -6 }, {
    xPercent: 0, ease: 'none',
    scrollTrigger: { trigger: '.voices', start: 'top bottom', end: 'top top', scrub: true }
  });
  gsap.fromTo('.voices__title span:last-child', { xPercent: 6 }, {
    xPercent: 0, ease: 'none',
    scrollTrigger: { trigger: '.voices', start: 'top bottom', end: 'top top', scrub: true }
  });

  /* ---- Footer: content rises as the panel lifts away ---- */
  gsap.fromTo('.site-footer__main, .site-footer__bar', { y: -60, opacity: .4 }, {
    y: 0, opacity: 1, ease: 'none',
    scrollTrigger: { trigger: '.site-footer', start: 'top bottom', end: 'bottom bottom', scrub: true }
  });

  window.addEventListener('load', () => ScrollTrigger.refresh());
})();
