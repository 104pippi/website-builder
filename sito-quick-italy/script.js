(() => {
  'use strict';

  const radice = document.documentElement;
  radice.classList.add('js');
  const ridotto = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const limita = (v, a, b) => Math.min(b, Math.max(a, v));
  const morbido = (a, b, v) => { const t = limita((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  const gradi = (n) => Math.abs(n).toFixed(1).replace('.', ',') + '°';

  /* ---------- anno ---------- */
  $$('[data-anno]').forEach((el) => { el.textContent = new Date().getFullYear(); });

  /* ---------- inclinometri: tacche e ago ---------- */
  const VISTA = 3; // un grado di rollio = tre gradi sul quadrante, per leggerlo da lontano
  $$('.clino__tacche').forEach((g) => {
    for (let a = -40; a <= 40; a += 10) {
      const r = (a * Math.PI) / 180;
      const maggiore = a % 20 === 0;
      const r1 = maggiore ? 45 : 49;
      const l = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      l.setAttribute('x1', (60 + r1 * Math.sin(r)).toFixed(2));
      l.setAttribute('y1', (6 + r1 * Math.cos(r)).toFixed(2));
      l.setAttribute('x2', (60 + 56 * Math.sin(r)).toFixed(2));
      l.setAttribute('y2', (6 + 56 * Math.cos(r)).toFixed(2));
      if (maggiore) l.setAttribute('class', 'maggiore');
      g.appendChild(l);
    }
  });
  const ago = (radiceClino, rollio) => {
    const a = radiceClino && $('[data-ago]', radiceClino);
    if (a) a.setAttribute('transform', `rotate(${(-rollio * VISTA).toFixed(2)} 60 6)`);
  };

  /* ---------- testata e menu ---------- */
  const testata = $('[data-testata]');
  const menu = $('[data-menu]');
  const bottoneMenu = $('[data-apri-menu]');
  const chiudiMenu = () => {
    menu.hidden = true;
    bottoneMenu.setAttribute('aria-expanded', 'false');
    radice.classList.remove('menu-aperto');
    document.body.style.overflow = '';
  };
  bottoneMenu.addEventListener('click', () => {
    const apri = menu.hidden;
    menu.hidden = !apri;
    bottoneMenu.setAttribute('aria-expanded', String(apri));
    radice.classList.toggle('menu-aperto', apri);
    document.body.style.overflow = apri ? 'hidden' : '';
  });
  $$('a', menu).forEach((a) => a.addEventListener('click', chiudiMenu));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !menu.hidden) chiudiMenu(); });

  /* ---------- hero: la foto rolla e si stabilizza ---------- */
  const heroMedia = $('[data-hero-media]');
  const clinoHero = $('[data-clino-hero]');
  const valoreHero = $('[data-clino-valore]');
  const hero = $('.hero');
  let rollioHero = 0;
  let scalaHero = 1.06;
  const disegnaHero = () => {
    const y = Math.min(window.scrollY, hero.offsetHeight);
    const p = y / hero.offsetHeight;
    heroMedia.style.transform = `translate3d(0, ${(y * 0.28).toFixed(1)}px, 0) rotate(${rollioHero.toFixed(3)}deg) scale(${(scalaHero + p * 0.05).toFixed(4)})`;
  };
  if (ridotto) {
    valoreHero.textContent = gradi(0);
    disegnaHero();
  } else {
    const DURATA = 3.2;
    let inizio = null;
    const passo = () => {
      const ora = performance.now();
      if (inizio === null) inizio = ora;
      const t = (ora - inizio) / 1000;
      const smorza = Math.exp(-t / 0.78);
      rollioHero = 4.5 * smorza * Math.cos((2 * Math.PI * t) / 1.3);
      scalaHero = 1.06 + 0.15 * Math.exp(-t / 0.95);
      if (t >= DURATA) { rollioHero = 0; scalaHero = 1.06; }
      ago(clinoHero, rollioHero);
      valoreHero.textContent = gradi(rollioHero);
      disegnaHero();
      if (t < DURATA) requestAnimationFrame(passo);
    };
    requestAnimationFrame(passo);
  }

  /* ---------- rollio: passi, strumenti, scena 3D ---------- */
  const sezRollio = $('[data-rollio]');
  const passi = $$('[data-passo]');
  const SOGLIE = [0, 0.22, 0.44, 0.7];
  const hud = {
    clino: $('[data-clino-rollio]'),
    rollio: $('[data-hud-rollio]'),
    riduzione: $('[data-hud-riduzione]'),
    volano: $('[data-hud-volano]'),
    volanoTesto: $('[data-hud-volano-testo]'),
    barra: $('[data-rollio-barra]'),
  };
  const AMPIEZZA = 14; // rollio della simulazione senza stabilizzatore
  const statoRollio = (p) => {
    const calma = morbido(0.42, 0.66, p);
    return {
      p,
      apertura: morbido(0.18, 0.3, p) * (1 - morbido(0.68, 0.8, p)),
      volano: morbido(0.3, 0.5, p),
      calma,
      ampiezza: AMPIEZZA + (AMPIEZZA * 0.05 - AMPIEZZA) * calma,
    };
  };
  const progressoRollio = () => {
    const r = sezRollio.getBoundingClientRect();
    return limita(-r.top / (r.height - window.innerHeight), 0, 1);
  };
  let passoAttivo = 0;
  let scena3dAttiva = false;
  const aggiornaRollio = () => {
    const s = statoRollio(progressoRollio());
    let i = 0;
    SOGLIE.forEach((soglia, k) => { if (s.p >= soglia) i = k; });
    if (i !== passoAttivo) {
      passi[passoAttivo].classList.remove('attivo');
      passi[i].classList.add('attivo');
      passoAttivo = i;
    }
    hud.barra.style.width = (s.p * 100).toFixed(1) + '%';
    hud.riduzione.textContent = Math.round((1 - s.ampiezza / AMPIEZZA) * 100) + '%';
    hud.volano.style.width = (s.volano * 100).toFixed(1) + '%';
    hud.volanoTesto.textContent = s.volano < 0.04 ? 'fermo' : s.volano < 0.96 ? 'prende giri' : 'a regime';
    if (!scena3dAttiva) {
      hud.rollio.textContent = '±' + gradi(s.ampiezza);
      ago(hud.clino, s.ampiezza);
    }
  };

  const caricaScena = () => {
    const canvas = $('[data-rollio-canvas]');
    import('./3d.js')
      .then((m) => m.avvia({
        canvas,
        sezione: sezRollio,
        statoRollio,
        progresso: progressoRollio,
        ridotto,
        suFrame: (rollio) => {
          hud.rollio.textContent = gradi(rollio);
          ago(hud.clino, rollio);
        },
      }))
      .then((ok) => {
        if (!ok) return;
        scena3dAttiva = true;
        sezRollio.classList.add('pronta');
      })
      .catch(() => { /* senza WebGL resta la foto */ });
  };
  const avviaQuandoServe = () => {
    const io = new IntersectionObserver((voci) => {
      if (voci.some((v) => v.isIntersecting)) { io.disconnect(); caricaScena(); }
    }, { rootMargin: '600px 0px' });
    io.observe(sezRollio);
  };
  if (document.readyState === 'complete') avviaQuandoServe();
  else window.addEventListener('load', avviaQuandoServe, { once: true });

  /* ---------- rivelazioni (si osserva il contenitore, mai l'elemento ritagliato) ---------- */
  $$('.coppie__lista li').forEach((li, i) => li.style.setProperty('--i', i));
  const daRivelare = [...$$('[data-rivela]'), ...$$('[data-coppie]')];
  if ('IntersectionObserver' in window && !ridotto) {
    const io = new IntersectionObserver((voci) => {
      voci.forEach((v) => {
        if (v.isIntersecting) { v.target.classList.add('in'); io.unobserve(v.target); }
      });
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.01 });
    daRivelare.forEach((el) => io.observe(el));
  } else {
    daRivelare.forEach((el) => el.classList.add('in'));
  }

  /* ---------- da prua a poppa: il punto sulla pianta segue la linea in vista ---------- */
  const linee = $$('.linea[data-zona]');
  const punti = $$('.punto[data-zona]');
  const dove = $('[data-pianta-dove]');
  const attivaZona = (linea) => {
    const z = linea.dataset.zona;
    punti.forEach((p) => p.classList.toggle('attivo', p.dataset.zona === z));
    if (dove.textContent !== linea.dataset.dove) dove.textContent = linea.dataset.dove;
  };
  attivaZona(linee[0]);
  const ioLinee = new IntersectionObserver((voci) => {
    voci.forEach((v) => { if (v.isIntersecting) attivaZona(v.target); });
  }, { rootMargin: '-48% 0px -48% 0px' });
  linee.forEach((l) => ioLinee.observe(l));

  /* ---------- scroll: testata, parallasse, storia, barra ---------- */
  const parallasse = $$('[data-parallasse]');
  const storia = $('[data-storia]');
  const barra = $('[data-barra]');
  const modulo = $('[data-modulo]');
  let moduloInVista = false;
  new IntersectionObserver((voci) => {
    moduloInVista = voci[0].isIntersecting;
    barra.classList.toggle('nascosta', moduloInVista);
  }, { threshold: 0.15 }).observe(modulo);

  let inCoda = false;
  const suScroll = () => {
    inCoda = false;
    const h = window.innerHeight;
    testata.classList.toggle('scorsa', window.scrollY > 40);
    if (window.scrollY < hero.offsetHeight + 50) disegnaHero();
    aggiornaRollio();
    if (!ridotto) {
      parallasse.forEach((el) => {
        const r = el.getBoundingClientRect();
        if (r.bottom < 0 || r.top > h) return;
        const p = limita((h - r.top) / (h + r.height), 0, 1);
        const img = $('img', el);
        img.style.transform = `translate3d(0, ${((p - 0.5) * -12).toFixed(2)}%, 0) scale(${(1.16 - p * 0.08).toFixed(4)})`;
      });
    }
    if (storia) {
      const r = storia.getBoundingClientRect();
      storia.style.setProperty('--avanza', limita((h * 0.6 - r.top) / r.height, 0, 1).toFixed(3));
    }
  };
  const chiedi = () => { if (!inCoda) { inCoda = true; requestAnimationFrame(suScroll); } };
  window.addEventListener('scroll', chiedi, { passive: true });
  window.addEventListener('resize', chiedi);
  suScroll();

  /* ---------- modulo: compone la mail per l'ufficio commerciale ---------- */
  const selProdotto = $('[data-prodotto]');
  $$('[data-scegli]').forEach((a) => a.addEventListener('click', () => { selProdotto.value = a.dataset.scegli; }));

  const errore = $('[data-errore]');
  modulo.addEventListener('submit', (e) => {
    e.preventDefault();
    const d = new FormData(modulo);
    const v = (k) => String(d.get(k) || '').trim();
    $$('.campo', modulo).forEach((c) => c.classList.remove('errore'));
    const segna = (nome, testo) => {
      const campo = modulo.elements[nome];
      campo.closest('.campo')?.classList.add('errore');
      errore.textContent = testo;
      errore.hidden = false;
      campo.focus();
    };
    if (!v('nome')) return segna('nome', 'Scrivi nome e cognome: servono per risponderti.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v('email'))) return segna('email', "Controlla l'email: così com'è non possiamo risponderti.");
    if (!modulo.elements.privacy.checked) {
      errore.textContent = "Spunta l'informativa privacy per inviare la richiesta.";
      errore.hidden = false;
      modulo.elements.privacy.focus();
      return;
    }
    errore.hidden = true;

    const righe = [
      'Buongiorno,',
      `vorrei una quotazione per: ${v('prodotto')}.`,
      '',
      `Sono: ${v('chi')}`,
      `Nome: ${v('nome')}`,
      `Email: ${v('email')}`,
    ];
    if (v('telefono')) righe.push(`Telefono: ${v('telefono')}`);
    if (v('paese')) righe.push(`Paese: ${v('paese')}`);
    if (v('barca')) righe.push(`Barca: ${v('barca')}`);
    if (v('lunghezza')) righe.push(`Lunghezza: ${v('lunghezza')} m`);
    if (v('dislocamento')) righe.push(`Dislocamento: ${v('dislocamento')} t`);
    if (v('messaggio')) righe.push('', v('messaggio'));
    righe.push('', 'Grazie.');

    const oggetto = `Richiesta quotazione: ${v('prodotto')}`;
    window.location.href = 'mailto:quick@quickitaly.com?subject=' + encodeURIComponent(oggetto) + '&body=' + encodeURIComponent(righe.join('\n'));
  });
})();
