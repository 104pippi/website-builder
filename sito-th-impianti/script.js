(() => {
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const root = document.documentElement;
  const ridotto = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const poster = new URLSearchParams(location.search).get('poster');

  const anno = $('[data-anno]');
  if (anno) anno.textContent = new Date().getFullYear();

  // ---------- testata e menu ----------
  const testata = $('[data-testata]');
  const menuBtn = $('[data-menu-btn]');
  const menu = $('[data-menu]');
  const apriMenu = (si) => {
    menu.hidden = !si;
    menuBtn.setAttribute('aria-expanded', String(si));
    menuBtn.querySelector('.menu-btn__testo').textContent = si ? 'Chiudi' : 'Menu';
    testata.classList.toggle('solida', si || scrollY > 40);
    document.body.style.overflow = si ? 'hidden' : '';
  };
  menuBtn.addEventListener('click', () => apriMenu(menu.hidden));
  $$('a', menu).forEach((a) => a.addEventListener('click', () => apriMenu(false)));
  addEventListener('keydown', (e) => { if (e.key === 'Escape' && !menu.hidden) apriMenu(false); });

  // ---------- hero: accensione ----------
  const hero = $('[data-hero]');
  const canvas = $('#quadro');
  const accendiPagina = () => root.classList.add('acceso');

  let scenaPartita = false;
  const avviaScena = () => {
    if (scenaPartita) return;
    scenaPartita = true;
    const prova = document.createElement('canvas');
    const gl = prova.getContext('webgl2') || prova.getContext('webgl');
    if (!gl) { root.classList.add('hero-senza-3d'); accendiPagina(); return; }
    import('./3d.js')
      .then((m) => m.avvia({ canvas, hero }))
      .catch((e) => { console.warn('Quadro 3D non disponibile:', e); root.classList.add('hero-senza-3d'); accendiPagina(); });
  };
  if (document.readyState === 'complete') avviaScena();
  else addEventListener('load', avviaScena, { once: true });
  // rete lenta o niente 3D: la pagina si accende comunque
  if (!poster) {
    setTimeout(() => {
      if (!root.classList.contains('acceso')) {
        if (!hero.classList.contains('hero--3d')) root.classList.add('hero-senza-3d');
        accendiPagina();
      }
    }, ridotto ? 300 : 3200);
  }

  // ---------- barra in basso e testata solida ----------
  const barra = $('[data-barra]');
  const azioniHero = $('[data-azioni-hero]');
  let azioniVisibili = true;
  new IntersectionObserver(([e]) => {
    azioniVisibili = e.isIntersecting || e.boundingClientRect.top > 0;
    aggiornaBarra();
  }).observe(azioniHero);
  const contatti = $('#preventivo');
  let contattiVisibili = false;
  new IntersectionObserver(([e]) => { contattiVisibili = e.isIntersecting; aggiornaBarra(); }, { rootMargin: '0px 0px -30% 0px' }).observe(contatti);
  function aggiornaBarra() {
    const vis = !azioniVisibili && !contattiVisibili;
    barra.classList.toggle('vis', vis);
    barra.setAttribute('aria-hidden', String(!vis));
    $$('a', barra).forEach((a) => (a.tabIndex = vis ? 0 : -1));
  }

  // ---------- legenda: i circuiti si accendono ----------
  const circuiti = $$('[data-circuito]');
  const imposta = (c, on) => {
    c.classList.toggle('on', on);
    const b = $('.circuito__int', c);
    b.setAttribute('aria-pressed', String(on));
    b.setAttribute('aria-label', b.getAttribute('aria-label').replace(/^(Accendi|Spegni)/, on ? 'Spegni' : 'Accendi'));
  };
  circuiti.forEach((c) => $('.circuito__int', c).addEventListener('click', () => imposta(c, !c.classList.contains('on'))));
  const legenda = $('[data-legenda]');
  const ioLegenda = new IntersectionObserver(([e]) => {
    if (!e.isIntersecting) return;
    ioLegenda.disconnect();
    circuiti.forEach((c, i) => setTimeout(() => imposta(c, true), ridotto ? 0 : 160 + i * 150));
  }, { threshold: 0.2 });
  ioLegenda.observe(legenda);

  // ---------- come lavoriamo: il filo scende con lo scroll ----------
  const passi = $('[data-passi]');
  const passo = $$('[data-passo]');
  function aggiornaPassi() {
    const r = passi.getBoundingClientRect();
    const vh = innerHeight;
    const p = ridotto ? 1 : clamp((vh * 0.72 - r.top) / Math.max(1, r.height));
    passi.style.setProperty('--p', p.toFixed(4));
    for (const el of passo) {
      const t = (el.offsetTop + 16) / r.height;
      el.classList.toggle('raggiunto', p >= t);
    }
  }

  // ---------- zona: mappa con le coordinate vere ----------
  // posizioni in px (14 px = 1 km) rispetto alla sede di via Negrelli; [nome, x, y, km, lato etichetta]
  const COMUNI = [
    ['Treviso', 76, 59, 6.9, 'd'],
    ['Paese', -26, 8, 1.9, 's'],
    ['Ponzano Veneto', 23, -29, 2.7, 'su'],
    ['Quinto di Treviso', -25, 97, 7.2, 'd'],
    ['Istrana', -85, 37, 6.7, 's'],
    ['Morgano', -66, 95, 8.3, 's'],
    ['Villorba', 90, -38, 7.0, 'd'],
    ['Trevignano', -86, -44, 6.9, 's'],
    ['Vedelago', -168, 28, 12.2, 's'],
    ['Montebelluna', -138, -98, 12.1, 's'],
    ['Castelfranco Veneto', -265, 69, 19.6, 'd'],
    ['Zero Branco', -21, 157, 11.3, 's'],
    ['Volpago del Montello', -59, -133, 10.4, 's'],
    ['Povegliano', 11, -76, 5.5, 'd'],
    ['Preganziol', 54, 148, 11.2, 'd'],
    ['Silea', 164, 98, 13.7, 'd'],
    ['Spresiano', 114, -110, 11.3, 'd'],
    ['Giavera del Montello', -9, -152, 10.9, 'd'],
  ];
  const mappa = $('[data-mappa]');
  if (mappa) {
    const NS = 'http://www.w3.org/2000/svg';
    const el = (tag, attr, padre) => { const n = document.createElementNS(NS, tag); for (const k in attr) n.setAttribute(k, attr[k]); padre && padre.appendChild(n); return n; };
    const anelli = $('[data-anelli]', mappa), linee = $('[data-linee]', mappa), comuni = $('[data-comuni]', mappa);
    [5, 10, 15, 20].forEach((km, i) => {
      const d = 0.15 + i * 0.28;
      el('circle', { class: 'mappa__anello', r: km * 14, style: `--d:${d}` }, anelli);
      const t = el('text', { class: 'mappa__km', x: -km * 14, y: -7, 'text-anchor': 'middle', style: `--d:${d}` }, anelli);
      t.textContent = `${km} km`;
    });
    for (const [nome, x, y, km, lato] of COMUNI) {
      const d = 0.25 + (km / 20) * 1.1;
      el('line', { class: 'mappa__linea', x1: 0, y1: 0, x2: x, y2: y, pathLength: 1, style: `--d:${d}` }, linee);
      const lontano = Math.abs(x) > 220 || Math.abs(y) > 180;
      const g = el('g', { class: 'mappa__comune' + (nome === 'Treviso' ? ' mappa__comune--capoluogo' : '') + (lontano ? ' mappa__comune--lontano' : ''), style: `--d:${d}` }, comuni);
      el('circle', { cx: x, cy: y, r: nome === 'Treviso' ? 7 : 4.5 }, g);
      const pos = { d: [x + 10, y + 5, 'start'], s: [x - 10, y + 5, 'end'], su: [x, y - 11, 'middle'] }[lato];
      const t = el('text', { x: pos[0], y: pos[1], 'text-anchor': pos[2] }, g);
      t.textContent = nome;
    }
    // da telefono si inquadrano i primi 15 km, così i nomi restano leggibili
    const svg = $('svg', mappa);
    const inquadraMappa = () => svg.setAttribute('viewBox', innerWidth < 600 ? '-228 -196 456 392' : '-300 -300 600 600');
    inquadraMappa();
    addEventListener('resize', inquadraMappa);
    const ioMappa = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      ioMappa.disconnect();
      mappa.classList.add('in');
    }, { threshold: 0.25 });
    ioMappa.observe(mappa);
  }

  // ---------- foto ravvicinate: parallasse leggera ----------
  const parallasse = ridotto ? [] : $$('[data-parallasse]');
  function aggiornaParallasse() {
    const vh = innerHeight;
    for (const img of parallasse) {
      const r = img.parentElement.getBoundingClientRect();
      if (r.bottom < -50 || r.top > vh + 50) continue;
      const k = clamp((vh - r.top) / (vh + r.height)) - 0.5;
      img.style.setProperty('--py', (k * -r.height * 0.09).toFixed(1) + 'px');
    }
  }

  // ---------- scroll ----------
  let attesa = false;
  function suScroll() {
    attesa = false;
    if (menu.hidden) testata.classList.toggle('solida', scrollY > 40);
    aggiornaPassi();
    aggiornaParallasse();
  }
  addEventListener('scroll', () => { if (!attesa) { attesa = true; requestAnimationFrame(suScroll); } }, { passive: true });
  addEventListener('resize', suScroll);
  suScroll();

  // ---------- modulo: compone l'email ----------
  const modulo = $('[data-modulo]');
  const errore = $('[data-errore]', modulo);
  modulo.addEventListener('submit', (e) => {
    e.preventDefault();
    const f = new FormData(modulo);
    const nome = (f.get('nome') || '').trim();
    const tel = (f.get('telefono') || '').trim();
    const mancano = [];
    if (!nome) mancano.push('il nome');
    if (tel.replace(/\D/g, '').length < 6) mancano.push('un telefono valido');
    if (!f.get('privacy')) mancano.push("la conferma dell'informativa");
    if (mancano.length) {
      errore.textContent = `Per inviare la richiesta servono ${mancano.join(', ')}.`;
      errore.hidden = false;
      return;
    }
    errore.hidden = true;
    const righe = [
      'Buongiorno, vorrei un preventivo.',
      '',
      `Nome: ${nome}`,
      `Telefono: ${tel}`,
      f.get('comune') ? `Comune del lavoro: ${f.get('comune').trim()}` : null,
      `Tipo di lavoro: ${f.get('tipo')}`,
      f.get('messaggio') ? `\n${f.get('messaggio').trim()}` : null,
    ].filter((r) => r !== null);
    const oggetto = `Richiesta preventivo: ${f.get('tipo')}`;
    location.href = `mailto:th.impiantisrl@pec.it?subject=${encodeURIComponent(oggetto)}&body=${encodeURIComponent(righe.join('\n'))}`;
  });
})();
