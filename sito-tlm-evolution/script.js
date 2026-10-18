(() => {
  const d = document;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const WA = '393773150474';

  d.querySelectorAll('[data-year]').forEach((el) => { el.textContent = new Date().getFullYear(); });

  const top = d.querySelector('[data-top]');
  const dock = d.querySelector('[data-dock]');
  const hero = d.querySelector('[data-hero]');
  const dolly = d.querySelector('[data-dolly]');
  const copy = d.querySelector('[data-hero-copy]');

  /* ---- Cantiere: scena fissa con arco che si disegna ---- */
  const build = d.querySelector('[data-build]');
  const track = build && build.querySelector('[data-track]');
  const steps = build ? Array.from(build.querySelectorAll('.build__step')) : [];
  const arch = build && build.querySelector('[data-arch]');
  let pinned = false;
  let rungs = [];
  let archLines = [];

  if (build && track && arch && !reduce) {
    build.classList.add('is-pinned');
    pinned = true;
    const bases = arch.querySelectorAll('.arch-base');
    const group = arch.querySelector('[data-rungs]');
    archLines = Array.from(arch.querySelectorAll('.arch-line'));
    if (bases.length === 2 && group) {
      const [a, b] = bases;
      const la = a.getTotalLength();
      const lb = b.getTotalLength();
      const N = 15;
      for (let i = 0; i < N; i++) {
        const t = i / (N - 1);
        const pa = a.getPointAtLength(t * la);
        const pb = b.getPointAtLength(t * lb);
        const line = d.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', pa.x.toFixed(1));
        line.setAttribute('y1', pa.y.toFixed(1));
        line.setAttribute('x2', pb.x.toFixed(1));
        line.setAttribute('y2', pb.y.toFixed(1));
        line.setAttribute('class', 'arch-rung');
        line.dataset.t = t.toFixed(3);
        group.appendChild(line);
        rungs.push(line);
      }
    }
  }

  /* ---- Scroll: header, barra, carrellata nel tunnel, cantiere ---- */
  let ticking = false;
  let lastStep = -1;
  const clamp = (v, a, b) => Math.min(Math.max(v, a), b);

  function frame() {
    ticking = false;
    const y = window.scrollY;
    const vh = window.innerHeight;
    const heroH = hero ? hero.offsetHeight : vh;

    if (top) top.classList.toggle('is-solid', y > heroH * 0.55);
    if (dock) dock.classList.toggle('is-on', y > vh * 0.45);

    if (!reduce && hero && y < heroH * 1.2) {
      const s = clamp(y / heroH, 0, 1);
      if (dolly) dolly.style.transform = 'scale(' + (1 + s * 0.24).toFixed(4) + ')';
      if (copy) {
        copy.style.transform = 'translateY(' + (-s * 70).toFixed(1) + 'px)';
        copy.style.opacity = String(clamp(1 - s * 1.7, 0, 1).toFixed(3));
      }
    }

    if (pinned) {
      const r = track.getBoundingClientRect();
      const total = Math.max(r.height - vh, 1);
      const p = clamp(-r.top / total, 0, 1);
      const idx = Math.min(steps.length - 1, Math.floor(p * steps.length));
      if (idx !== lastStep) {
        steps.forEach((s, i) => s.classList.toggle('is-on', i === idx));
        lastStep = idx;
      }
      const draw = clamp(p * 1.08, 0, 1);
      archLines.forEach((l) => { l.style.strokeDashoffset = (1 - draw).toFixed(4); });
      rungs.forEach((l) => l.classList.toggle('is-on', draw >= Number(l.dataset.t) - 0.001 && draw > 0.01));
    }
  }
  const onScroll = () => { if (!ticking) { ticking = true; window.requestAnimationFrame(frame); } };
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  frame();

  /* ---- Foto prodotto: il telo che scende ---- */
  const reveals = d.querySelectorAll('[data-reveal]');
  if ('IntersectionObserver' in window && !reduce) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
      });
    }, { threshold: 0.18, rootMargin: '0px 0px -6% 0px' });
    reveals.forEach((el) => io.observe(el));
  } else {
    reveals.forEach((el) => el.classList.add('is-in'));
  }

  /* ---- Menu mobile ---- */
  const sheet = d.getElementById('menu');
  const openBtn = d.querySelector('[data-menu-open]');
  const closeBtn = d.querySelector('[data-menu-close]');
  function openMenu() {
    sheet.hidden = false;
    openBtn.setAttribute('aria-expanded', 'true');
    d.body.style.overflow = 'hidden';
    const first = sheet.querySelector('a');
    if (first) first.focus();
  }
  function closeMenu(restore) {
    sheet.hidden = true;
    openBtn.setAttribute('aria-expanded', 'false');
    d.body.style.overflow = '';
    if (restore) openBtn.focus();
  }
  if (sheet && openBtn && closeBtn) {
    openBtn.addEventListener('click', openMenu);
    closeBtn.addEventListener('click', () => closeMenu(true));
    sheet.querySelectorAll('.sheet__nav a').forEach((a) => a.addEventListener('click', () => closeMenu(false)));
    d.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !sheet.hidden) closeMenu(true); });
  }

  /* ---- Preventivo: compone il messaggio e apre WhatsApp ---- */
  const form = d.querySelector('[data-quote]');
  d.querySelectorAll('[data-tipo]').forEach((a) => {
    a.addEventListener('click', () => {
      if (!form) return;
      const radio = form.querySelector('input[name="tipo"][value="' + a.dataset.tipo + '"]');
      if (radio) radio.checked = true;
    });
  });
  if (form) {
    const err = form.querySelector('.form__err');
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const f = new FormData(form);
      const v = (k) => String(f.get(k) || '').trim();
      const nome = form.elements.nome;
      if (!v('nome')) {
        err.hidden = false;
        nome.setAttribute('aria-invalid', 'true');
        nome.focus();
        return;
      }
      err.hidden = true;
      nome.removeAttribute('aria-invalid');

      const righe = ['Buongiorno, vorrei un preventivo da TLM Evolution.', '', 'Cosa mi serve: ' + v('tipo')];
      const larg = v('larghezza');
      const lung = v('lunghezza');
      const misure = [];
      if (larg) misure.push('larghezza ' + larg + ' m');
      if (lung) misure.push('lunghezza ' + lung + ' m');
      if (misure.length) righe.push('Misure indicative: ' + misure.join(', '));
      if (v('uso')) righe.push('Uso: ' + v('uso'));
      if (v('comune')) righe.push('Comune di installazione: ' + v('comune'));
      righe.push('Nome: ' + v('nome'));
      if (v('telefono')) righe.push('Telefono: ' + v('telefono'));

      const url = 'https://wa.me/' + WA + '?text=' + encodeURIComponent(righe.join('\n'));
      const w = window.open(url, '_blank', 'noopener');
      if (!w) window.location.href = url;
    });
  }

  /* ---- Orari: aperto o chiuso adesso (ora italiana) ---- */
  const now = d.querySelector('[data-now]');
  if (now && window.Intl) {
    try {
      const parts = new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Europe/Rome', weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
      }).formatToParts(new Date());
      const get = (t) => (parts.find((p) => p.type === t) || {}).value;
      const day = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].indexOf(get('weekday'));
      const m = Number(get('hour')) * 60 + Number(get('minute'));
      const feriale = day >= 0 && day <= 4;
      const aperto = feriale && ((m >= 480 && m < 720) || (m >= 870 && m < 1080));
      let txt;
      if (aperto) txt = 'Aperto adesso';
      else if (feriale && m < 480) txt = 'Chiuso, apre alle 8:00';
      else if (feriale && m >= 720 && m < 870) txt = 'Chiuso, riapre alle 14:30';
      else if (day >= 0 && day <= 3) txt = 'Chiuso, riapre domani alle 8:00';
      else txt = 'Chiuso, riapre lunedì alle 8:00';
      now.textContent = txt;
      now.classList.toggle('is-open', aperto);
    } catch (e) { /* orari statici restano visibili */ }
  }
})();
