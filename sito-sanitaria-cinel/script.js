(() => {
  const root = document.documentElement;
  const body = document.body;
  const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const WA = 'https://wa.me/393453528460?text=';

  // Ingresso dell'hero: parte quando i font sono pronti (o dopo 700 ms al massimo)
  const go = () => requestAnimationFrame(() => root.classList.add('is-ready'));
  if (document.fonts && document.fonts.ready) {
    Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 700))]).then(go);
  } else go();

  // Header pieno dopo lo scroll + profondità dell'hero
  const top = document.querySelector('[data-top]');
  const hero = document.querySelector('[data-hero]');
  let ticking = false;
  const onScroll = () => {
    const y = window.scrollY;
    top.classList.toggle('is-solid', y > 12);
    if (!calm && hero && y < hero.offsetHeight) hero.style.setProperty('--py', y.toFixed(1));
    ticking = false;
  };
  window.addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
  onScroll();

  // Menu mobile
  const btn = document.querySelector('.menu-btn');
  const menu = document.getElementById('menu');
  const setMenu = (open) => {
    body.classList.toggle('menu-open', open);
    btn.setAttribute('aria-expanded', String(open));
    btn.querySelector('.menu-label').textContent = open ? 'Chiudi' : 'Menu';
  };
  btn.addEventListener('click', () => setMenu(!body.classList.contains('menu-open')));
  menu.addEventListener('click', (e) => { if (e.target.closest('a')) setMenu(false); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && body.classList.contains('menu-open')) { setMenu(false); btn.focus(); } });

  // Barra Chiama / WhatsApp: compare quando i bottoni dell'hero escono dallo schermo
  const dock = document.querySelector('[data-dock]');
  const heroCta = document.querySelector('[data-hero-cta]');
  if ('IntersectionObserver' in window && heroCta) {
    new IntersectionObserver(([e]) => {
      dock.classList.toggle('is-on', !e.isIntersecting && e.boundingClientRect.top < 0);
    }).observe(heroCta);
  } else dock.classList.add('is-on');

  // Aperto ora / chiuso: orari del negozio, ora di Paese (Europe/Rome)
  const SLOTS = { 0: [], 1: [[900, 1140]], 2: [[540, 750], [900, 1140]], 3: [[540, 750], [900, 1140]], 4: [[540, 750], [900, 1140]], 5: [[540, 750], [900, 1140]], 6: [[540, 750], [900, 1140]] };
  const DAYS = ['domenica', 'lunedì', 'martedì', 'mercoledì', 'giovedì', 'venerdì', 'sabato'];
  const hhmm = (m) => `${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}`;
  const nowRome = () => {
    try {
      const p = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Rome', weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date());
      const get = (t) => p.find((x) => x.type === t).value;
      const day = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(get('weekday'));
      return { day, min: parseInt(get('hour'), 10) * 60 + parseInt(get('minute'), 10) };
    } catch (_) {
      const d = new Date();
      return { day: d.getDay(), min: d.getHours() * 60 + d.getMinutes() };
    }
  };
  const status = () => {
    const { day, min } = nowRome();
    const open = SLOTS[day].find(([a, b]) => min >= a && min < b);
    if (open) return { day, open: true, short: `Aperto ora, fino alle ${hhmm(open[1])}`, long: `Aperto ora: ti aspettiamo fino alle ${hhmm(open[1])}.` };
    for (let i = 0; i < 8; i++) {
      const d = (day + i) % 7;
      const next = SLOTS[d].find(([a]) => i > 0 || a > min);
      if (next) {
        const when = i === 0 ? 'oggi' : i === 1 ? 'domani' : DAYS[d];
        return { day, open: false, short: `Chiuso, riapre ${when} alle ${hhmm(next[0])}`, long: `Ora siamo chiusi: riapriamo ${when} alle ${hhmm(next[0])}.` };
      }
    }
    return { day, open: false, short: 'Chiuso', long: 'Ora siamo chiusi.' };
  };
  const paintStatus = () => {
    const s = status();
    document.querySelectorAll('[data-status]').forEach((el) => { el.textContent = s.short; el.classList.toggle('is-open', s.open); });
    document.querySelectorAll('[data-status-long]').forEach((el) => { el.textContent = s.long; el.classList.toggle('is-open', s.open); });
    document.querySelectorAll('.hours tr').forEach((tr) => tr.classList.toggle('is-today', Number(tr.dataset.day) === s.day));
  };
  paintStatus();
  setInterval(paintStatus, 60000);

  // Cosa trovi: la foto fissa cambia con il capitolo (desktop), le foto si aprono (mobile)
  const frame = document.querySelector('.story-frame');
  const frameImgs = frame ? [...frame.querySelectorAll('img')] : [];
  const tag = document.querySelector('[data-frame-tag]');
  const chapters = [...document.querySelectorAll('[data-chapter]')];
  let current = 0;
  const show = (i) => {
    if (i === current || !frameImgs[i]) return;
    frameImgs.forEach((img) => img.classList.remove('was-on'));
    frameImgs[current].classList.remove('is-on');
    frameImgs[current].classList.add('was-on');
    frameImgs[i].classList.add('is-on');
    current = i;
    if (tag) {
      tag.classList.add('is-swap');
      setTimeout(() => { tag.textContent = chapters[i].querySelector('h3').textContent; tag.classList.remove('is-swap'); }, 220);
    }
  };
  if ('IntersectionObserver' in window) {
    const active = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) show(Number(e.target.dataset.chapter)); });
    }, { rootMargin: '-45% 0px -45% 0px' });
    const seen = new IntersectionObserver((entries, obs) => {
      entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('is-seen'); obs.unobserve(e.target); } });
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.15 });
    chapters.forEach((c) => { active.observe(c); seen.observe(c); });
  } else chapters.forEach((c) => c.classList.add('is-seen'));

  // Noleggio: il messaggio WhatsApp si compone mentre scegli
  const form = document.querySelector('[data-composer]');
  const bubble = document.querySelector('[data-bubble]');
  const comune = document.querySelector('[data-comune]');
  let lastLines = [];
  const lines = () => {
    const fd = new FormData(form);
    const items = fd.getAll('cosa');
    const tempo = fd.get('tempo');
    const consegna = fd.get('consegna');
    const luogo = (fd.get('comune') || '').trim();
    const nome = (fd.get('nome') || '').trim();
    const out = [];
    if (items.length) {
      out.push('Buongiorno Sanitaria Cinel, vorrei noleggiare:');
      items.forEach((x) => out.push(`• ${x}`));
    } else out.push('Buongiorno Sanitaria Cinel, vorrei informazioni sul noleggio di ausili.');
    if (tempo) out.push(`Mi serve per ${tempo}.`);
    if (consegna === 'domicilio') out.push(luogo ? `Con consegna a domicilio a ${luogo}.` : 'Con consegna a domicilio.');
    else out.push('Passo a ritirarlo in negozio.');
    if (nome) out.push(`Sono ${nome}, grazie!`);
    else out.push('Grazie!');
    return out;
  };
  const render = () => {
    const next = lines();
    bubble.replaceChildren(...next.map((t) => {
      const s = document.createElement('span');
      s.className = 'bl';
      s.textContent = t;
      if (lastLines.length && !lastLines.includes(t) && !calm) s.classList.add('is-new');
      return s;
    }));
    lastLines = next;
    comune.hidden = new FormData(form).get('consegna') !== 'domicilio';
  };
  if (form) {
    form.addEventListener('input', render);
    form.addEventListener('change', render);
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const url = WA + encodeURIComponent(lines().join('\n'));
      const w = window.open(url, '_blank', 'noopener');
      if (!w) window.location.href = url;
    });
    render();
  }

  // Marche: la fila si ripete per scorrere senza stacchi
  document.querySelectorAll('.marquee-row').forEach((row) => {
    [...row.children].forEach((li) => {
      const c = li.cloneNode(true);
      c.setAttribute('aria-hidden', 'true');
      row.appendChild(c);
    });
  });

  const y = document.querySelector('[data-year]');
  if (y) y.textContent = new Date().getFullYear();
})();
