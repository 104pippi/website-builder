(() => {
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const header = $('#header');
  const dock = $('#dock');
  const hero = $('.hero');
  const heroMedia = $('.hero__media');

  // Metodo: passo attivo, corsia gialla che si riempie, numero grande che cambia
  const stepsList = $('#steps');
  const steps = $$('.step');
  const digits = $('#method-digits');
  let current = '01';

  function updateSteps() {
    if (!stepsList) return;
    const mid = innerHeight * .55;
    let active = steps[0];
    steps.forEach((s) => { if (s.getBoundingClientRect().top < mid) active = s; });
    const ai = steps.indexOf(active);
    steps.forEach((s, i) => {
      s.classList.toggle('is-active', i === ai);
      s.classList.toggle('is-done', i < ai);
    });
    const r = stepsList.getBoundingClientRect();
    const p = Math.min(1, Math.max(0, (mid - r.top) / r.height));
    stepsList.style.setProperty('--p', p.toFixed(3));
    const n = active.dataset.step;
    if (digits && n !== current) {
      current = n;
      digits.textContent = n;
      digits.classList.remove('roll');
      void digits.offsetWidth;
      digits.classList.add('roll');
    }
  }

  let ticking = false;
  function onScroll() {
    const y = scrollY;
    const h = hero.offsetHeight;
    header.classList.toggle('is-solid', y > 24);
    dock.classList.toggle('is-visible', y > h * .6);
    if (!reduce && y < h) heroMedia.style.transform = `translate3d(0, ${(y * .18).toFixed(1)}px, 0)`;
    updateSteps();
    ticking = false;
  }
  addEventListener('scroll', () => {
    if (!ticking) { ticking = true; requestAnimationFrame(onScroll); }
  }, { passive: true });
  addEventListener('resize', onScroll);
  onScroll();

  // Menu mobile
  const burger = $('#burger');
  const nav = $('#nav');
  const setMenu = (open) => {
    burger.setAttribute('aria-expanded', String(open));
    burger.setAttribute('aria-label', open ? 'Chiudi il menu' : 'Apri il menu');
    nav.classList.toggle('is-open', open);
    document.body.classList.toggle('menu-open', open);
  };
  burger.addEventListener('click', () => setMenu(burger.getAttribute('aria-expanded') !== 'true'));
  $$('a', nav).forEach((a) => a.addEventListener('click', () => setMenu(false)));
  addEventListener('keydown', (e) => { if (e.key === 'Escape') setMenu(false); });

  // Ingressi: titoli tracciati, foto che passano dal disegno al colore, quote in scala
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      e.target.classList.add('is-in');
      io.unobserve(e.target);
    });
  }, { rootMargin: '0px 0px -12% 0px' });
  $$('[data-reveal], .sqm').forEach((el) => (reduce ? el.classList.add('is-in') : io.observe(el)));

  // Corsie: le barre partono insieme ai numeri
  const lanes = $('#lanes');
  if (lanes) {
    if (reduce) {
      lanes.classList.add('is-in');
    } else {
      const vals = $$('[data-count]', lanes);
      vals.forEach((v) => { v.textContent = '0'; });
      const lio = new IntersectionObserver(([e]) => {
        if (!e.isIntersecting) return;
        lio.disconnect();
        lanes.classList.add('is-in');
        const t0 = performance.now();
        vals.forEach((v, i) => {
          const to = Number(v.dataset.count);
          const delay = i * 90;
          const tick = (now) => {
            const t = Math.min(1, Math.max(0, (now - t0 - delay) / 1400));
            v.textContent = String(Math.round(to * (1 - Math.pow(1 - t, 4))));
            if (t < 1) requestAnimationFrame(tick);
          };
          requestAnimationFrame(tick);
        });
      }, { threshold: .3 });
      lio.observe(lanes);
    }
  }

  // Aree: su desktop la lista comanda la foto grande
  const areas = $$('.area');
  const desk = matchMedia('(min-width: 960px)');
  const activate = (a) => areas.forEach((x) => {
    const on = x === a;
    x.classList.toggle('is-active', on);
    $('.area__tab', x).setAttribute('aria-pressed', String(on));
  });
  areas.forEach((a) => {
    const tab = $('.area__tab', a);
    tab.addEventListener('click', () => activate(a));
    tab.addEventListener('mouseenter', () => { if (desk.matches) activate(a); });
    tab.addEventListener('focus', () => { if (desk.matches) activate(a); });
  });

  // Modulo: compone il messaggio e apre WhatsApp
  const form = $('#form');
  const err = $('#form-error');
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const d = Object.fromEntries(new FormData(form));
    const get = (k) => String(d[k] || '').trim();
    const missing = ['nome', 'telefono', 'tipo', 'citta'].filter((k) => !get(k));
    $$('input, select', form).forEach((el) => el.setAttribute('aria-invalid', String(missing.includes(el.name))));
    if (missing.length) {
      err.hidden = false;
      form.elements[missing[0]].focus();
      return;
    }
    err.hidden = true;
    const lines = [
      'Ciao Metem Fit, vorrei richiedere un progetto.',
      `Nome: ${get('nome')}`,
      `Telefono: ${get('telefono')}`,
      `Struttura: ${get('tipo')}`,
      `Città: ${get('citta')}`,
    ];
    if (get('mq')) lines.push(`Metri quadri: ${get('mq')}`);
    if (get('messaggio')) lines.push(`La mia idea: ${get('messaggio')}`);
    const url = `https://wa.me/390422267010?text=${encodeURIComponent(lines.join('\n'))}`;
    const w = window.open(url, '_blank');
    if (w) w.opener = null;
    else location.href = url;
  });

  const year = $('#year');
  if (year) year.textContent = String(new Date().getFullYear());
})();
