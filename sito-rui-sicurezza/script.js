/* Rui Sistemi di Sicurezza — script della pagina.
   Qui stanno anche i dati della planimetria: li usano sia il disegno SVG dell'hero
   (visibile subito e come riserva senza WebGL) sia la scena 3D (3d.js). */
(() => {
  'use strict';
  const doc = document.documentElement;
  doc.classList.add('js');
  const ridotto = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Planimetria (metri; x verso destra, z verso il basso dello schermo) ---------- */
  const ALTEZZA = 3;
  // [x1, z1, x2, z2, spessore, aperture [[da, a, tipo]]] — tipo: f finestra, p porta, p- porta verso l'altro lato, g portone
  const MURI = [
    [-7, -4, 5, -4, 0.3, [[1.5, 2.9, 'f'], [4.6, 5.8, 'f'], [8.6, 10.2, 'f']]],
    [5, -4, 5, 3, 0.3, [[1.2, 2.6, 'f'], [4.4, 5.6, 'f']]],
    [5, 3, 9, 3, 0.3, [[1.2, 2.6, 'f']]],
    [9, 3, 9, 7, 0.3, [[0.5, 3.5, 'g']]],
    [9, 7, 1, 7, 0.3, [[1.2, 2.6, 'f'], [4.4, 6.4, 'f']]],
    [1, 7, 1, 3, 0.3, [[1.3, 2.7, 'f']]],
    [1, 3, -7, 3, 0.3, [[2.5, 3.5, 'p-'], [4.2, 6.8, 'f']]],
    [-7, 3, -7, -4, 0.3, [[2.0, 5.0, 'f']]],
    [-1, -4, -1, 3, 0.12, [[4.9, 5.8, 'p']]],
    [-1, -0.5, 5, -0.5, 0.12, [[0.6, 1.4, 'p'], [3.8, 4.6, 'p-']]],
    [2, -0.5, 2, 3, 0.12, []],
    [1, 3, 5, 3, 0.12, [[0.2, 1.0, 'p']]],
    [5, 3, 5, 7, 0.12, [[1.2, 2.0, 'p-']]],
  ];
  const STANZE = [
    ['Soggiorno', -4, -0.5], ['Cucina', 2, -2.25], ['Camera', 0.5, 1.4],
    ['Bagno', 3.5, 1.4], ['Camera', 3, 5], ['Garage', 7, 5],
  ];
  const LOTTO = [-12, -9, 14, 11];

  function costruisciPianta() {
    const linee = []; // [x1, z1, x2, z2, peso]  peso 1 muri, 0.6 dettagli, 0.4 esterni
    const aperture = []; // per il 3D: {x, z, ux, uz, a, b, tipo, esterno}
    for (const [x1, z1, x2, z2, sp, ap] of MURI) {
      const L = Math.hypot(x2 - x1, z2 - z1);
      const ux = (x2 - x1) / L, uz = (z2 - z1) / L, nx = -uz, nz = ux, h = sp / 2;
      const P = (d, o) => [x1 + ux * d + nx * o, z1 + uz * d + nz * o];
      const ord = [...ap].sort((a, b) => a[0] - b[0]);
      const pieni = [];
      let s = 0;
      for (const [a, b] of ord) { if (a > s) pieni.push([s, a]); s = b; }
      if (s < L) pieni.push([s, L]);
      for (const [a, b] of pieni) {
        for (const o of [-h, h]) linee.push([...P(a, o), ...P(b, o), 1]);
        for (const d of [a, b]) if (d > 0.001 && d < L - 0.001) linee.push([...P(d, -h), ...P(d, h), 1]);
      }
      for (const [a, b, tipo] of ord) {
        aperture.push({ x1, z1, ux, uz, nx, nz, a, b, tipo: tipo[0], esterno: sp > 0.2 });
        if (tipo === 'f') {
          linee.push([...P(a, 0), ...P(b, 0), 0.6]);
          linee.push([...P(a, -h * 0.4), ...P(b, -h * 0.4), 0.6]);
        } else if (tipo[0] === 'p') {
          const lato = tipo === 'p-' ? -1 : 1, r = b - a;
          const cx = x1 + ux * a, cz = z1 + uz * a;
          linee.push([cx, cz, cx + nx * r * lato, cz + nz * r * lato, 0.6]);
          const n = 9;
          for (let i = 0; i < n; i++) {
            const t0 = (i / n) * Math.PI / 2, t1 = ((i + 1) / n) * Math.PI / 2;
            const q = (t) => [cx + (ux * Math.cos(t) + nx * lato * Math.sin(t)) * r, cz + (uz * Math.cos(t) + nz * lato * Math.sin(t)) * r];
            linee.push([...q(t0), ...q(t1), 0.45]);
          }
        } else {
          for (let d = a; d < b - 0.01; d += 0.5) linee.push([...P(d, 0), ...P(Math.min(b, d + 0.3), 0), 0.45]);
        }
      }
    }
    // lotto con i due cancelli, vialetto, passo carraio, alberi
    const [lx1, lz1, lx2, lz2] = LOTTO;
    linee.push([lx1, lz1, lx2, lz1, 0.4], [lx2, lz1, lx2, 3.6, 0.4], [lx2, 6.4, lx2, lz2, 0.4]);
    linee.push([lx2, lz2, -1.4, lz2, 0.4], [-2.8, lz2, lx1, lz2, 0.4], [lx1, lz2, lx1, lz1, 0.4]);
    linee.push([-1.4, 3.2, -1.4, lz2, 0.4], [-2.8, 3.2, -2.8, lz2, 0.4]);
    linee.push([9.2, 3.6, lx2, 3.6, 0.4], [9.2, 6.4, lx2, 6.4, 0.4]);
    for (const [ax, az, r] of [[-9.6, -6.6, 1.6], [11.4, -6.2, 1.8], [-9.4, 8.4, 1.5], [-5, 8.8, 1.1], [11.6, 9.2, 1.2]]) {
      const n = 22;
      for (let i = 0; i < n; i++) {
        const t0 = (i / n) * Math.PI * 2, t1 = ((i + 1) / n) * Math.PI * 2;
        linee.push([ax + Math.cos(t0) * r, az + Math.sin(t0) * r, ax + Math.cos(t1) * r, az + Math.sin(t1) * r, 0.4]);
      }
      linee.push([ax - r * 0.5, az, ax + r * 0.5, az, 0.4], [ax, az - r * 0.5, ax, az + r * 0.5, 0.4]);
    }
    // quote (linee di misura con i trattini a 45°)
    const quote = [
      [-7, -5.6, 5, -5.6, '12,00'], [-8.6, -4, -8.6, 3, '7,00'],
      [10.6, 3, 10.6, 7, '4,00'], [1, 8.6, 9, 8.6, '8,00'],
    ];
    const etichette = STANZE.map(([t, x, z]) => ({ t, x, z, h: 0.52, rot: 0, peso: 1 }));
    for (const [x1, z1, x2, z2, t] of quote) {
      linee.push([x1, z1, x2, z2, 0.45]);
      for (const [x, z] of [[x1, z1], [x2, z2]]) linee.push([x - 0.25, z + 0.25, x + 0.25, z - 0.25, 0.6]);
      const vert = x1 === x2;
      etichette.push({ t, x: (x1 + x2) / 2 + (vert ? -0.45 : 0), z: (z1 + z2) / 2 + (vert ? 0 : -0.45), h: 0.42, rot: vert ? -90 : 0, peso: 0.6 });
    }
    return { linee, aperture, etichette, altezza: ALTEZZA, lotto: LOTTO, muri: MURI };
  }

  window.RUI_PIANTA = costruisciPianta();

  // Inquadratura comune a SVG e 3D: dove sta la casa nello schermo e quanto è grande.
  window.RUI_INQ = (w, h) => {
    const asp = w / h;
    const desk = asp > 1.15, mobile = asp < 0.85;
    const fov = mobile ? 40 : 30;
    const t = Math.tan((fov * Math.PI) / 360);
    const th = t * asp;
    const cx = desk ? 0.71 * w : 0.5 * w;
    const cy = mobile ? 0.6 * h : desk ? 0.54 * h : 0.6 * h;
    const spanTop = desk ? 40 : mobile ? 24 : 32;
    const span34 = desk ? 41 : mobile ? 21 : 32;
    const Rtop = Math.max(spanTop / 2 / th, (mobile ? 20 : 26) / 2 / t);
    const R34 = Math.max(span34 / 2 / th, (mobile ? 17 : 22) / 2 / t);
    return { fov, cx, cy, Rtop, R34, tx: 1, tz: 1.5 };
  };

  /* ---------- Disegno SVG della planimetria (prima e al posto del 3D) ---------- */
  const scena = document.querySelector('.hero__scena');
  const svgNS = 'http://www.w3.org/2000/svg';
  function disegnaPianta() {
    if (!scena) return;
    const w = scena.clientWidth, h = scena.clientHeight;
    if (!w || !h) return;
    const q = window.RUI_INQ(w, h);
    const s = h / 2 / (Math.tan((q.fov * Math.PI) / 360) * q.Rtop);
    const X = (x) => (q.cx + (x - q.tx) * s).toFixed(1);
    const Z = (z) => (q.cy + (z - q.tz) * s).toFixed(1);
    const gruppi = { 1: '', 0.6: '', 0.45: '', 0.4: '' };
    for (const [x1, z1, x2, z2, p] of window.RUI_PIANTA.linee) {
      gruppi[p] += `M${X(x1)} ${Z(z1)}L${X(x2)} ${Z(z2)}`;
    }
    let testo = '';
    for (const e of window.RUI_PIANTA.etichette) {
      const x = X(e.x), y = Z(e.z);
      testo += `<text x="${x}" y="${y}" font-size="${(e.h * s).toFixed(1)}"${e.rot ? ` transform="rotate(${e.rot} ${x} ${y})"` : ''} class="${e.peso < 1 ? 'q' : ''}">${e.t}</text>`;
    }
    let svg = scena.querySelector('.hero__pianta');
    if (!svg) {
      svg = document.createElementNS(svgNS, 'svg');
      svg.setAttribute('class', 'hero__pianta');
      svg.setAttribute('aria-hidden', 'true');
      scena.prepend(svg);
    }
    svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
    svg.innerHTML =
      `<path class="l1" d="${gruppi[1]}"/><path class="l2" d="${gruppi[0.6]}"/>` +
      `<path class="l3" d="${gruppi[0.45]}"/><path class="l4" d="${gruppi[0.4]}"/><g class="et">${testo}</g>`;
    requestAnimationFrame(() => svg.classList.add('vis'));
  }
  disegnaPianta();
  if (scena && 'ResizeObserver' in window) {
    let ultimo = '';
    new ResizeObserver(() => {
      const k = scena.clientWidth + 'x' + scena.clientHeight;
      if (k !== ultimo) { ultimo = k; disegnaPianta(); }
    }).observe(scena);
  }

  /* ---------- Hero: progresso dello scroll, stato dell'impianto ---------- */
  const hero = document.querySelector('.hero');
  const statoTesto = document.querySelector('.hero__stato-testo');
  let statoAttuale = '';
  function progressoHero() {
    if (!hero) return 0;
    const corsa = hero.offsetHeight - innerHeight;
    return Math.min(1, Math.max(0, -hero.getBoundingClientRect().top / Math.max(1, corsa)));
  }
  function aggiornaHero() {
    const p = progressoHero();
    window.RUI_P = p;
    hero.style.setProperty('--p', p.toFixed(3));
    const stato = p > 0.38 ? 'inserito' : 'pronto';
    if (stato !== statoAttuale) {
      statoAttuale = stato;
      hero.dataset.stato = stato;
      if (statoTesto) statoTesto.textContent = stato === 'inserito' ? 'Impianto inserito' : 'Impianto disinserito';
    }
  }

  /* ---------- Header e barra ---------- */
  const header = document.querySelector('.testata');
  let inCoda = false;
  function alloScroll() {
    if (inCoda) return;
    inCoda = true;
    requestAnimationFrame(() => {
      inCoda = false;
      header.classList.toggle('testata--piena', scrollY > 24);
      if (hero) aggiornaHero();
    });
  }
  addEventListener('scroll', alloScroll, { passive: true });
  addEventListener('resize', alloScroll, { passive: true });
  if (hero) aggiornaHero();
  header.classList.toggle('testata--piena', scrollY > 24);

  /* ---------- Menu mobile ---------- */
  const bottoneMenu = document.querySelector('.testata__menu');
  const pannello = document.getElementById('menu-mobile');
  function chiudiMenu() {
    pannello.hidden = true;
    bottoneMenu.setAttribute('aria-expanded', 'false');
    bottoneMenu.textContent = 'Menu';
    doc.classList.remove('menu-aperto');
  }
  bottoneMenu?.addEventListener('click', () => {
    const apri = pannello.hidden;
    pannello.hidden = !apri;
    bottoneMenu.setAttribute('aria-expanded', String(apri));
    bottoneMenu.textContent = apri ? 'Chiudi' : 'Menu';
    doc.classList.toggle('menu-aperto', apri);
  });
  pannello?.addEventListener('click', (e) => { if (e.target.closest('a')) chiudiMenu(); });
  addEventListener('keydown', (e) => { if (e.key === 'Escape' && pannello && !pannello.hidden) chiudiMenu(); });

  /* ---------- Casa | Azienda ---------- */
  const schede = document.querySelectorAll('[data-scheda]');
  schede.forEach((b) => b.addEventListener('click', () => {
    schede.forEach((x) => {
      const attiva = x === b;
      x.setAttribute('aria-selected', String(attiva));
      x.tabIndex = attiva ? 0 : -1;
      document.getElementById(x.getAttribute('aria-controls')).hidden = !attiva;
    });
    document.querySelector('.perchi__selettore')?.setAttribute('data-attiva', b.dataset.scheda);
  }));
  document.querySelector('.perchi__selettore')?.addEventListener('keydown', (e) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    const lista = [...schede];
    const i = lista.findIndex((x) => x.getAttribute('aria-selected') === 'true');
    const prossima = lista[(i + (e.key === 'ArrowRight' ? 1 : lista.length - 1)) % lista.length];
    prossima.click();
    prossima.focus();
  });

  /* ---------- Comparse (osservo il contenitore, la classe va sul figlio) ---------- */
  const daRivelare = document.querySelectorAll('[data-rivela]');
  if (!ridotto && 'IntersectionObserver' in window) {
    const io = new IntersectionObserver((voci) => {
      for (const v of voci) if (v.isIntersecting) { v.target.classList.add('in'); io.unobserve(v.target); }
    }, { rootMargin: '0px 0px -12% 0px' });
    daRivelare.forEach((el) => io.observe(el));
  } else {
    daRivelare.forEach((el) => el.classList.add('in'));
  }

  /* ---------- Form: compone l'email ---------- */
  const form = document.getElementById('form-sopralluogo');
  form?.addEventListener('submit', (e) => {
    e.preventDefault();
    const d = new FormData(form);
    const errore = form.querySelector('.form__errore');
    const nome = (d.get('nome') || '').toString().trim();
    const tel = (d.get('telefono') || '').toString().trim();
    if (!nome || !tel) {
      errore.textContent = 'Scrivi nome e telefono: ti richiamiamo noi per fissare il sopralluogo.';
      (nome ? form.telefono : form.nome).focus();
      return;
    }
    if (!form.privacy.checked) {
      errore.textContent = 'Per inviare la richiesta serve il consenso al trattamento dei dati.';
      form.privacy.focus();
      return;
    }
    errore.textContent = '';
    const per = d.get('per') || 'Casa';
    const comune = (d.get('comune') || '').toString().trim();
    const messaggio = (d.get('messaggio') || '').toString().trim();
    const righe = [
      'Buongiorno,',
      `vorrei un sopralluogo per ${per === 'Azienda' ? 'la mia azienda' : 'la mia casa'}.`,
      '',
      `Nome: ${nome}`,
      `Telefono: ${tel}`,
      comune ? `Comune: ${comune}` : null,
      `Mi serve: ${d.get('servizio')}`,
      messaggio ? `\n${messaggio}` : null,
      '',
      'Grazie.',
    ].filter((r) => r !== null);
    const oggetto = `Richiesta sopralluogo${comune ? ' a ' + comune : ''}`;
    location.href = `mailto:info@ruisicurezza.it?subject=${encodeURIComponent(oggetto)}&body=${encodeURIComponent(righe.join('\n'))}`;
    form.querySelector('.form__fatto').hidden = false;
  });

  /* ---------- Anno ---------- */
  document.querySelectorAll('[data-anno]').forEach((el) => { el.textContent = new Date().getFullYear(); });

  /* ---------- Scena 3D: arriva dopo il caricamento, mai prima del testo ---------- */
  function puoiWebGL() {
    try {
      const c = document.createElement('canvas');
      return !!(c.getContext('webgl2') || c.getContext('webgl'));
    } catch (e) { return false; }
  }
  function caricaScena() {
    if (!scena || !puoiWebGL()) return;
    if (navigator.connection && navigator.connection.saveData) return;
    import('./3d.js').catch((err) => console.warn('Scena 3D non disponibile:', err));
  }
  if (document.readyState === 'complete') setTimeout(caricaScena, 60);
  else addEventListener('load', () => setTimeout(caricaScena, 60), { once: true });
})();
