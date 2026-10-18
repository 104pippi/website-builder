/* L'Elettrica — demo. Nessuna libreria. */
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const root = document.documentElement;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Accensione hero ---------- */
  const heroImg = $('.hero__bg img');
  const turnOn = () => root.classList.add('is-on');
  if (heroImg && !heroImg.complete) {
    heroImg.addEventListener('load', turnOn, { once: true });
    heroImg.addEventListener('error', turnOn, { once: true });
    setTimeout(turnOn, 1400);
  } else turnOn();

  /* ---------- Header, menu, barra mobile ---------- */
  const hdr = $('[data-hdr]'), dock = $('[data-dock]'), hero = $('[data-hero]');
  const burger = $('[data-burger]'), menu = $('[data-menu]');
  const closeMenu = () => { burger.setAttribute('aria-expanded', 'false'); menu.hidden = true; hdr.classList.remove('is-open'); };
  burger.addEventListener('click', () => {
    const open = burger.getAttribute('aria-expanded') !== 'true';
    burger.setAttribute('aria-expanded', String(open));
    menu.hidden = !open;
    hdr.classList.toggle('is-open', open);
  });
  $$('a', menu).forEach(a => a.addEventListener('click', closeMenu));
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeMenu(); });

  /* ---------- Reveal ---------- */
  const io = new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
  }), { rootMargin: '0px 0px -8% 0px' });
  $$('[data-reveal]').forEach(el => io.observe(el));

  /* ---------- Orari: ora di Roma ---------- */
  const DAYS = ['domenica', 'lunedì', 'martedì', 'mercoledì', 'giovedì', 'venerdì', 'sabato'];
  const fmt = m => `${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}`;
  function romeNow() {
    const parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Rome', weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date());
    const get = t => (parts.find(p => p.type === t) || {}).value;
    return { d: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(get('weekday')), m: parseInt(get('hour'), 10) * 60 + parseInt(get('minute'), 10) };
  }
  function status(hours, now) {
    if (now.d >= 1 && now.d <= 5) {
      for (const [o, c] of hours) if (now.m >= o && now.m < c) return { open: true, text: `Aperto, chiude alle ${fmt(c)}` };
      const next = hours.find(([o]) => o > now.m);
      if (next) return { open: false, nextDay: 0, nextM: next[0], text: now.m < hours[0][0] ? `Chiuso, apre alle ${fmt(next[0])}` : `Chiuso, riapre alle ${fmt(next[0])}` };
    }
    let add = 1, d = (now.d + 1) % 7;
    while (d === 0 || d === 6) { d = (d + 1) % 7; add++; }
    return { open: false, nextDay: add, nextM: hours[0][0], text: `Chiuso, apre ${add === 1 ? 'domani' : DAYS[d]} alle ${fmt(hours[0][0])}` };
  }

  /* ---------- Punti vendita ---------- */
  const map = $('.map');
  const list = $('[data-stores]');
  const stores = $$('[data-store]').map(li => ({
    li, id: li.dataset.store, region: li.dataset.region, city: li.dataset.city,
    lat: +li.dataset.lat, lng: +li.dataset.lng, hours: JSON.parse(li.dataset.hours),
    tel: li.dataset.tel, email: li.dataset.email,
    node: $(`[data-nd="${li.dataset.store}"]`), line: $(`[data-ln="${li.dataset.store}"]`), dist: null
  }));

  function refresh() {
    const now = romeNow();
    let open = 0, best = null;
    stores.forEach(s => {
      const st = status(s.hours, now);
      s.li.classList.toggle('is-open', st.open);
      s.li.classList.toggle('is-closed', !st.open);
      $('[data-status]', s.li).textContent = st.text;
      if (s.node) s.node.classList.toggle('is-open', st.open);
      if (st.open) open++;
      else if (!best || st.nextDay < best.nextDay || (st.nextDay === best.nextDay && st.nextM < best.nextM)) best = st;
    });
    const live = $('[data-live]'), lt = $('[data-live-text]');
    if (open) {
      live.classList.add('is-open');
      lt.textContent = open === 1 ? '1 punto vendita aperto adesso' : `${open} punti vendita aperti adesso`;
    } else if (best) {
      live.classList.remove('is-open');
      const when = best.nextDay === 0 ? '' : best.nextDay === 1 ? 'domani ' : `${DAYS[(now.d + best.nextDay) % 7]} `;
      lt.textContent = `Chiusi ora, riapriamo ${when}alle ${fmt(best.nextM)}`;
    }
  }
  refresh();
  setInterval(refresh, 60000);

  /* Mappa: la corrente parte dal CEDI */
  if (map) {
    const mio = new IntersectionObserver(es => {
      if (es[0].isIntersecting) { map.classList.add('is-drawn'); mio.disconnect(); }
    }, { threshold: 0.2 });
    mio.observe(map);
  }
  const spark = $('[data-spark]');
  const sparkAnim = spark && spark.querySelector('animateMotion');
  function runSpark(s) {
    if (reduce || !sparkAnim || !s.line || typeof sparkAnim.beginElement !== 'function') return;
    sparkAnim.setAttribute('path', s.line.getAttribute('d'));
    spark.classList.add('is-run');
    sparkAnim.beginElement();
    clearTimeout(runSpark.t);
    runSpark.t = setTimeout(() => spark.classList.remove('is-run'), 950);
  }

  function hover(s, on) {
    s.li.classList.toggle('is-hover', on);
    if (s.node) s.node.classList.toggle('is-hover', on);
  }
  function setActive(s, { open = true, scroll = false } = {}) {
    stores.forEach(x => {
      const on = x === s;
      x.li.classList.toggle('is-active', on);
      if (x.node) x.node.classList.toggle('is-active', on);
      if (x.line) x.line.classList.toggle('is-hot', on);
      if (!on && open) $('details', x.li).open = false;
    });
    if (open) $('details', s.li).open = true;
    if (scroll) s.li.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'nearest' });
    if (s.node && s.node.parentNode) s.node.parentNode.appendChild(s.node); // in primo piano
    runSpark(s);
  }
  stores.forEach(s => {
    s.li.addEventListener('mouseenter', () => hover(s, true));
    s.li.addEventListener('mouseleave', () => hover(s, false));
    const det = $('details', s.li);
    det.addEventListener('toggle', () => { if (det.open && !s.li.classList.contains('is-active')) setActive(s, { open: false }); });
    if (s.node) {
      s.node.setAttribute('tabindex', '0');
      s.node.setAttribute('role', 'button');
      s.node.setAttribute('aria-label', `${s.city}: mostra orari e telefono`);
      s.node.addEventListener('mouseenter', () => hover(s, true));
      s.node.addEventListener('mouseleave', () => hover(s, false));
      s.node.addEventListener('click', () => setActive(s, { scroll: true }));
      s.node.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setActive(s, { scroll: true }); } });
    }
  });

  /* Filtro per regione */
  const chips = $$('.chip');
  function filter(region) {
    chips.forEach(c => c.setAttribute('aria-pressed', String(c.dataset.region === region)));
    stores.forEach(s => {
      const show = region === 'all' || s.region === region;
      s.li.hidden = !show;
      if (s.node) s.node.classList.toggle('is-dim', !show);
      if (s.line) s.line.classList.toggle('is-dim', !show);
    });
  }
  chips.forEach(c => c.addEventListener('click', () => filter(c.dataset.region)));

  /* Geolocalizzazione */
  const msg = $('[data-net-msg]');
  const rad = x => x * Math.PI / 180;
  function km(a, b) {
    const dLat = rad(b.lat - a.lat), dLng = rad(b.lng - a.lng);
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
    return 6371 * 2 * Math.asin(Math.sqrt(h));
  }
  const fmtKm = d => d < 1 ? 'meno di 1 km' : d < 10 ? `${d.toFixed(1).replace('.', ',')} km` : `${Math.round(d)} km`;
  function sortList() {
    const first = new Map(stores.map(s => [s, s.li.getBoundingClientRect().top]));
    stores.slice().sort((a, b) => a.dist - b.dist).forEach(s => list.appendChild(s.li));
    if (reduce || !Element.prototype.animate) return;
    stores.forEach(s => {
      const dy = first.get(s) - s.li.getBoundingClientRect().top;
      if (Math.abs(dy) > 1) s.li.animate([{ transform: `translateY(${dy}px)` }, { transform: 'none' }], { duration: 700, easing: 'cubic-bezier(.2,.7,.1,1)' });
    });
  }
  function showYou(me, near) {
    const g = $('[data-you]');
    if (!map || !g || !near.node) return;
    const [lng0, lat1, K, sx] = map.dataset.proj.split(',').map(Number);
    const x = (me.lng - lng0) * K * sx, y = (lat1 - me.lat) * sx;
    const vb = map.viewBox.baseVal;
    if (x < 0 || y < 0 || x > vb.width || y > vb.height) { g.classList.remove('is-on'); return; }
    const [nx, ny] = near.node.getAttribute('transform').match(/-?[\d.]+/g).map(Number);
    g.setAttribute('transform', `translate(${x.toFixed(0)} ${y.toFixed(0)})`);
    $('.you__ln', g).setAttribute('d', `M0 0L${(nx - x).toFixed(0)} ${(ny - y).toFixed(0)}`);
    g.classList.add('is-on');
  }
  let busy = false;
  function locate() {
    if (busy) return;
    if (!('geolocation' in navigator)) { msg.textContent = 'Il browser non condivide la posizione: scegli la tua regione qui sopra.'; return; }
    busy = true;
    msg.textContent = 'Cerco la tua posizione…';
    navigator.geolocation.getCurrentPosition(pos => {
      busy = false;
      const me = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      filter('all');
      stores.forEach(s => { s.dist = km(me, s); $('[data-dist]', s.li).textContent = fmtKm(s.dist); });
      sortList();
      const near = stores.slice().sort((a, b) => a.dist - b.dist)[0];
      showYou(me, near);
      setActive(near);
      msg.textContent = `Il più vicino è ${near.city}, a ${fmtKm(near.dist)} da te.`;
      const call = $('[data-dock-call]');
      if (call) { call.href = `tel:${near.tel}`; const lab = $('[data-dock-call-label]'); lab.textContent = 'Chiama'; const sm = document.createElement('small'); sm.textContent = near.city; lab.appendChild(sm); }
      const sel = $('[data-form-store]');
      if (sel) sel.value = near.id;
    }, err => {
      busy = false;
      msg.textContent = err && err.code === 1
        ? 'Posizione non condivisa. Nessun problema: scegli la tua regione qui sopra.'
        : 'Non riesco a trovare la tua posizione. Scegli la tua regione qui sopra.';
    }, { enableHighAccuracy: false, timeout: 12000, maximumAge: 600000 });
  }
  $$('[data-locate]').forEach(a => a.addEventListener('click', () => { closeMenu(); locate(); }));
  const lb = $('[data-locate-btn]');
  if (lb) lb.addEventListener('click', locate);

  /* ---------- Scroll: header, barra, linea del tempo, famiglie ---------- */
  const tl = $('[data-tl]');
  const tlItems = tl ? $$('li', tl) : [];
  const fam = $$('[data-fam] li');
  let ticking = false;
  function onScroll() {
    ticking = false;
    const y = window.scrollY, vh = window.innerHeight;
    hdr.classList.toggle('is-solid', y > 40);
    dock.classList.toggle('is-shown', y > hero.offsetHeight * 0.55);
    if (tl) {
      const r = tl.getBoundingClientRect();
      const p = Math.min(1, Math.max(0, (vh * 0.62 - r.top) / r.height));
      tl.style.setProperty('--p', reduce ? 1 : p.toFixed(3));
      tlItems.forEach(li => li.classList.toggle('is-lit', reduce || li.getBoundingClientRect().top < vh * 0.62));
    }
    fam.forEach(li => li.classList.toggle('is-lit', reduce || li.getBoundingClientRect().top < vh * 0.78));
  }
  const req = () => { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } };
  window.addEventListener('scroll', req, { passive: true });
  window.addEventListener('resize', req);
  onScroll();

  /* ---------- Form: email al punto vendita scelto ---------- */
  const form = $('[data-form]');
  if (form) form.addEventListener('submit', e => {
    e.preventDefault();
    const f = new FormData(form);
    const note = $('[data-form-note]');
    let firstBad = null;
    ['nome', 'telefono', 'messaggio'].forEach(n => {
      const el = form.elements[n];
      const bad = !String(f.get(n) || '').trim();
      el.closest('.field').classList.toggle('is-err', bad);
      if (bad && !firstBad) firstBad = el;
    });
    if (firstBad) {
      note.textContent = 'Compila nome, telefono e messaggio: servono al punto vendita per risponderti.';
      note.classList.add('is-err');
      firstBad.focus();
      return;
    }
    note.classList.remove('is-err');
    const opt = form.elements.pv.selectedOptions[0];
    const subject = `Richiesta dal sito - ${f.get('nome')}`;
    const body = `Buongiorno,\n\n${f.get('messaggio')}\n\nNome: ${f.get('nome')}\n` +
      (String(f.get('azienda') || '').trim() ? `Azienda: ${f.get('azienda')}\n` : '') +
      `Telefono: ${f.get('telefono')}\nPunto vendita: ${opt.textContent}\n`;
    window.location.href = `mailto:${opt.dataset.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    note.textContent = `Email pronta per il punto vendita di ${opt.textContent}: controllala e premi invia.`;
  });

  const yr = $('[data-year]');
  if (yr) yr.textContent = new Date().getFullYear();
})();
