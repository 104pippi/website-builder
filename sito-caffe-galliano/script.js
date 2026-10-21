/* Caffè Galliano: interazioni della demo */
(() => {
  const doc = document.documentElement;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const ridotto = matchMedia('(prefers-reduced-motion: reduce)').matches;
  window.galliano = window.galliano || { tostatura: 0 };

  /* ---------- Intro ---------- */
  let partito = false;
  const parti = () => {
    if (partito) return;
    partito = true;
    requestAnimationFrame(() => requestAnimationFrame(() => doc.classList.add('pronto')));
  };
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(parti).catch(parti);
  setTimeout(parti, 650);

  /* ---------- Testata, barra, menu ---------- */
  const testata = $('#testata');
  const barra = $('.barra');
  const hero = $('.hero');
  const bottoneMenu = $('.testata__menu');
  const menu = $('#menu-mobile');

  const chiudiMenu = () => {
    menu.hidden = true;
    bottoneMenu.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
  };
  bottoneMenu.addEventListener('click', () => {
    const aperto = bottoneMenu.getAttribute('aria-expanded') === 'true';
    if (aperto) return chiudiMenu();
    menu.hidden = false;
    bottoneMenu.setAttribute('aria-expanded', 'true');
    testata.classList.add('solida');
    document.body.style.overflow = 'hidden';
  });
  $$('a', menu).forEach(a => a.addEventListener('click', chiudiMenu));
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !menu.hidden) chiudiMenu(); });

  /* ---------- Comparse ---------- */
  const io = new IntersectionObserver(voci => {
    voci.forEach(v => {
      if (v.isIntersecting) { v.target.classList.add('in'); io.unobserve(v.target); }
    });
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
  $$('[data-rivela]').forEach(el => io.observe(el));

  /* ---------- Schede dello shop ---------- */
  const schede = $$('.scheda');
  const mostraScaffale = (scheda, focus) => {
    schede.forEach(s => {
      const attiva = s === scheda;
      s.setAttribute('aria-selected', attiva);
      s.tabIndex = attiva ? 0 : -1;
      const pannello = document.getElementById(s.getAttribute('aria-controls'));
      pannello.hidden = !attiva;
      if (attiva) {
        $$('.prodotto', pannello).forEach((p, k) => p.style.setProperty('--k', k));
        pannello.classList.remove('entra');
        void pannello.offsetWidth;
        pannello.classList.add('entra');
      }
    });
    if (focus) scheda.focus();
    scheda.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: ridotto ? 'auto' : 'smooth' });
  };
  schede.forEach((s, i) => {
    s.addEventListener('click', () => mostraScaffale(s));
    s.addEventListener('keydown', e => {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      e.preventDefault();
      const j = (i + (e.key === 'ArrowRight' ? 1 : -1) + schede.length) % schede.length;
      mostraScaffale(schede[j], true);
    });
  });

  /* ---------- Monorigini: ventaglio di sacchetti ---------- */
  const origini = $('.origini');
  const sacchetti = $$('.sacchetto');
  const paesi = $$('.paese');
  let scelto = paesi.findIndex(p => p.getAttribute('aria-selected') === 'true');
  let aperto = false;

  const disponi = () => {
    sacchetti.forEach((s, i) => {
      const d = aperto ? i - scelto : (i - scelto) * 0.12;
      s.style.setProperty('--d', d.toFixed(2));
      s.style.setProperty('--ad', Math.abs(d).toFixed(2));
      s.style.setProperty('--sel', aperto && i === scelto ? 1 : 0);
    });
  };
  const scegli = (i, focus) => {
    scelto = i;
    paesi.forEach((p, k) => {
      const attivo = k === i;
      p.setAttribute('aria-selected', attivo);
      p.tabIndex = attivo ? 0 : -1;
      const scheda = document.getElementById(p.getAttribute('aria-controls'));
      scheda.hidden = !attivo;
      if (attivo) {
        const col = scheda.dataset.col;
        origini.style.setProperty('--col', col);
        scheda.style.setProperty('--col-scheda', col);
        scheda.classList.remove('entra');
        void scheda.offsetWidth;
        scheda.classList.add('entra');
      }
    });
    if (focus) paesi[i].focus();
    disponi();
  };
  paesi.forEach((p, i) => {
    p.addEventListener('click', () => {
      scegli(i);
      p.scrollIntoView({ block: 'nearest', inline: 'center', behavior: ridotto ? 'auto' : 'smooth' });
    });
    p.addEventListener('keydown', e => {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      e.preventDefault();
      scegli((i + (e.key === 'ArrowRight' ? 1 : -1) + paesi.length) % paesi.length, true);
    });
  });
  sacchetti.forEach((s, i) => s.addEventListener('click', () => scegli(i)));
  scegli(scelto);
  new IntersectionObserver((voci, oss) => {
    if (voci.some(v => v.isIntersecting)) {
      aperto = true;
      disponi();
      oss.disconnect();
    }
  }, { rootMargin: '0px 0px -25% 0px' }).observe(origini);

  /* ---------- Tostatura: strumenti e fasi ---------- */
  const pista = $('.tostatura__pista');
  const fasi = $$('.fase');
  const numTemp = $('[data-temp]');
  const numTempo = $('[data-tempo]');
  const taglio = $('.curva__taglio');
  const punto = $('.curva__punto');
  const avanz = $('.avanzamento');
  // temperatura del chicco indicativa: punti della curva [progresso, °C]
  const curvaT = [[0, 22], [0.14, 100], [0.4, 160], [0.64, 196], [0.8, 206], [1, 214]];
  const temperatura = p => {
    for (let k = 1; k < curvaT.length; k++) {
      const [p1, t1] = curvaT[k];
      const [p0, t0] = curvaT[k - 1];
      if (p <= p1) {
        const u = (p - p0) / (p1 - p0);
        return t0 + (t1 - t0) * (1 - Math.pow(1 - u, 1.6));
      }
    }
    return 214;
  };
  // la curva del grafico: x = progresso, y = temperatura
  const yDi = t => 110 - (t - 20) / 200 * 104;
  const dCurva = Array.from({ length: 61 }, (_, k) => {
    const p = k / 60;
    return `${k ? 'L' : 'M'}${(p * 300).toFixed(1)} ${yDi(temperatura(p)).toFixed(1)}`;
  }).join(' ');
  $$('.curva__traccia, .curva__fatta').forEach(el => el.setAttribute('d', dCurva));
  let ultimoP = -1;
  const aggiornaTostatura = () => {
    const r = pista.getBoundingClientRect();
    const corsa = pista.offsetHeight - innerHeight;
    const p = Math.min(1, Math.max(0, -r.top / Math.max(1, corsa)));
    window.galliano.tostatura = p;
    if (Math.abs(p - ultimoP) < 0.0005) return;
    ultimoP = p;
    const t = temperatura(p);
    numTemp.textContent = Math.round(t);
    numTemp.style.fontWeight = Math.round(300 + 600 * p);
    const secondi = Math.round(p * 14 * 60);
    numTempo.textContent = `${Math.floor(secondi / 60)}:${String(secondi % 60).padStart(2, '0')}`;
    taglio.setAttribute('width', (p * 300).toFixed(1));
    punto.setAttribute('cx', (p * 300).toFixed(1));
    punto.setAttribute('cy', yDi(t).toFixed(1));
    avanz.style.setProperty('--p', p.toFixed(4));
    fasi.forEach(f => {
      const attiva = p >= +f.dataset.da && p < +f.dataset.a;
      f.classList.toggle('attiva', attiva);
    });
  };

  /* ---------- Scroll: un solo giro di rAF ---------- */
  let inCoda = false;
  const suScroll = () => {
    inCoda = false;
    const y = scrollY;
    testata.classList.toggle('solida', y > 24 || !menu.hidden);
    barra.classList.toggle('visibile', y > hero.offsetHeight * 0.55);
    aggiornaTostatura();
    const ro = origini.getBoundingClientRect();
    if (ro.bottom > 0 && ro.top < innerHeight) {
      const t = (innerHeight - ro.top) / (innerHeight + ro.height);
      origini.style.setProperty('--giro', `${((t - 0.5) * 22).toFixed(2)}deg`);
    }
  };
  const chiedi = () => { if (!inCoda) { inCoda = true; requestAnimationFrame(suScroll); } };
  addEventListener('scroll', chiedi, { passive: true });
  addEventListener('resize', chiedi);
  suScroll();

  /* ---------- Modulo prova per i bar ---------- */
  const modulo = $('#modulo-prova');
  modulo.addEventListener('submit', e => {
    e.preventDefault();
    const esito = $('.modulo__esito', modulo);
    let primo = null;
    $$('[required]', modulo).forEach(c => {
      const ok = c.type === 'checkbox' ? c.checked : c.value.trim() !== '';
      c.classList.toggle('errore', !ok);
      if (!ok && !primo) primo = c;
    });
    if (primo) {
      esito.textContent = primo.type === 'checkbox'
        ? 'Spunta l\'informativa privacy per inviare la richiesta.'
        : 'Mancano dei dati: nome, telefono e nome del locale servono per richiamarti.';
      primo.focus();
      return;
    }
    const d = new FormData(modulo);
    const corpo = [
      'Buongiorno, vorrei fissare una prova del vostro caffè nel mio locale.',
      '',
      `Nome: ${d.get('nome')}`,
      `Telefono: ${d.get('telefono')}`,
      `Locale: ${d.get('locale')}`,
      `Città: ${d.get('citta') || '-'}`,
      `Caffè a settimana: ${d.get('kg') || '-'}`,
    ].join('\n');
    const oggetto = `Richiesta prova caffè: ${d.get('locale')}`;
    location.href = `mailto:info@caffegalliano.com?subject=${encodeURIComponent(oggetto)}&body=${encodeURIComponent(corpo)}`;
    esito.textContent = 'Si apre la tua email con la richiesta già scritta: premi Invia e ti richiamiamo.';
  });

  $$('[data-anno]').forEach(el => { el.textContent = new Date().getFullYear(); });

  /* ---------- 3D: dopo il caricamento, solo se c'è WebGL ---------- */
  const haWebGL = () => {
    try {
      const c = document.createElement('canvas');
      return !!(c.getContext('webgl2') || c.getContext('webgl'));
    } catch (err) { return false; }
  };
  const avvia3d = () => {
    if (!haWebGL()) return;
    import('./3d.js').catch(err => console.warn('3D non disponibile:', err));
  };
  if (document.readyState === 'complete') setTimeout(avvia3d, 120);
  else addEventListener('load', () => setTimeout(avvia3d, 120), { once: true });
})();
