(() => {
  const html = document.documentElement;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const riduci = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const TEL = '393357597337';
  const wa = (testo) => `https://wa.me/${TEL}?text=${encodeURIComponent(testo)}`;

  /* ---------- Intro dell'hero ---------- */
  let avviato = false;
  const avvia = () => { if (!avviato) { avviato = true; html.classList.add('avvio'); } };
  const fotoHero = $('.hero__foto img');
  const attese = [];
  if (document.fonts && document.fonts.load) {
    attese.push(document.fonts.load('900 100px "Sofia Sans Extra Condensed"').catch(() => {}));
    attese.push(document.fonts.load('400 16px "Sofia Sans"').catch(() => {}));
  }
  if (fotoHero && fotoHero.decode) attese.push(fotoHero.decode().catch(() => {}));
  Promise.race([Promise.all(attese), new Promise((r) => setTimeout(r, 900))]).then(avvia);
  setTimeout(avvia, 1400);

  /* ---------- Testata e menu ---------- */
  const testata = $('#testata');
  const bottoneMenu = $('.testata__menu');
  const menu = $('#menu-mobile');
  const chiudiMenu = () => {
    menu.hidden = true;
    bottoneMenu.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
    aggiornaTestata();
  };
  bottoneMenu.addEventListener('click', () => {
    const apri = menu.hidden;
    menu.hidden = !apri;
    bottoneMenu.setAttribute('aria-expanded', String(apri));
    document.body.style.overflow = apri ? 'hidden' : '';
    aggiornaTestata();
  });
  $$('a', menu).forEach((a) => a.addEventListener('click', chiudiMenu));
  addEventListener('keydown', (e) => { if (e.key === 'Escape' && !menu.hidden) chiudiMenu(); });
  function aggiornaTestata() {
    testata.classList.toggle('solida', scrollY > 40 || !menu.hidden);
  }

  /* ---------- Che problema hai? ---------- */
  const PROBLEMI = {
    intasato: {
      titolo: 'Scarico intasato',
      cosa: "Liberiamo scarichi e fognature con l'autospurgo e l'acqua ad alta pressione. Se il problema torna, entriamo nel tubo con la telecamera e troviamo la causa.",
      mezzi: ['Spurgo', 'Alta pressione', 'Videoispezione'],
      foto: 's-spurgo', w: 900, h: 600, alt: 'Autospurgo Cescon Servizi con cisterna in acciaio',
      cta: 'Chiama per lo scarico intasato', msg: 'ho uno scarico intasato',
    },
    allagato: {
      titolo: 'Garage o cantina allagati',
      cosa: "Prosciughiamo autorimesse, scantinati, locali tecnici e fosse ascensore con le motopompe. Poi cerchiamo perché l'acqua non scende, così al prossimo temporale non si allaga di nuovo.",
      mezzi: ['Motopompe', 'Spurgo', 'Videoispezione'],
      foto: 'allagamento', w: 640, h: 363, alt: 'Autorimessa interrata allagata dopo un temporale',
      cta: "Chiama per l'allagamento", msg: 'ho un locale allagato',
    },
    odori: {
      titolo: 'Cattivi odori',
      cosa: "Troviamo da dove arrivano con la videoispezione e le attrezzature per la ricerca degli odori: può essere una colonna di sfiato corrosa o un giunto aperto. Poi sostituiamo o risaniamo il tratto.",
      mezzi: ['Videoispezione', 'Ricerca odori', 'Risanamento'],
      foto: 'odori-colonna', w: 900, h: 1200, alt: 'Colonna di sfiato corrosa trovata con la videoispezione',
      cta: 'Chiama per i cattivi odori', msg: 'sento cattivi odori dagli scarichi',
    },
    rotto: {
      titolo: 'Tubo rotto o perdita',
      cosa: "Localizziamo la tubazione e il punto della perdita, poi la ripariamo o la risaniamo dall'interno, con poche demolizioni o nessuna.",
      mezzi: ['Localizzazione', 'Risanamento', 'Riparazione'],
      foto: 'packer', w: 1000, h: 750, alt: 'Packer per il risanamento calato in una tubazione',
      cta: 'Chiama per il tubo rotto', msg: 'ho un tubo rotto o una perdita',
    },
    infestanti: {
      titolo: 'Topi, blatte, insetti',
      cosa: 'Facciamo disinfestazioni per eliminare insetti, blatte e ratti, in casa, in condominio e in azienda.',
      mezzi: ['Disinfestazione'],
      foto: 's-disinfestazioni', w: 600, h: 338, alt: 'Macchina per disinfestazione al lavoro in un cortile',
      cta: 'Chiama per la disinfestazione', msg: 'ho bisogno di una disinfestazione',
    },
    allaccio: {
      titolo: 'Nuovo allaccio in fognatura',
      cosa: 'Costruiamo, ripariamo e allacciamo impianti fognari alla fognatura comunale, con escavatori di diverse misure.',
      mezzi: ['Escavatori', 'Costruzione', 'Allacciamento'],
      foto: 'f-escavatori', w: 900, h: 600, alt: 'Pala compatta e mini escavatori di Cescon Servizi',
      cta: "Chiama per l'allaccio", msg: "devo allacciare un impianto alla fognatura",
    },
  };
  const risposta = $('#pannello-problema');
  const voci = $$('.scelta__voce');
  const campoProblema = $('#campo-problema');
  function mostraProblema(chiave, conAnimazione) {
    const d = PROBLEMI[chiave];
    if (!d) return;
    voci.forEach((v) => {
      const sel = v.dataset.problema === chiave;
      v.setAttribute('aria-selected', String(sel));
      v.tabIndex = sel ? 0 : -1;
    });
    $('source', risposta).srcset = `assets/img/${d.foto}.webp`;
    const img = $('img', risposta);
    img.src = `assets/img/${d.foto}.jpg`;
    img.width = d.w; img.height = d.h; img.alt = d.alt;
    $('.risposta__titolo', risposta).textContent = d.titolo;
    $('.risposta__cosa', risposta).textContent = d.cosa;
    $('.risposta__mezzi', risposta).innerHTML = d.mezzi.map((m) => `<li>${m}</li>`).join('');
    $('.risposta__azioni .btn--rosso', risposta).textContent = d.cta;
    $('.risposta__wa', risposta).href = wa(`Buongiorno, vi scrivo dal sito: ${d.msg}. Mi trovo a `);
    if (campoProblema) campoProblema.value = d.titolo;
    if (conAnimazione && !riduci) {
      risposta.classList.remove('cambia');
      void risposta.offsetWidth;
      risposta.classList.add('cambia');
    }
  }
  voci.forEach((v, i) => {
    v.addEventListener('click', () => mostraProblema(v.dataset.problema, true));
    v.addEventListener('keydown', (e) => {
      const passo = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
      if (!passo) return;
      const prossima = voci[(i + passo + voci.length) % voci.length];
      prossima.focus();
      mostraProblema(prossima.dataset.problema, true);
    });
  });
  mostraProblema('intasato', false);

  /* ---------- Dentro il tubo: progresso e HUD ---------- */
  const tubo = $('.tubo');
  const palco = $('.tubo__palco');
  const tappe = $$('.tappa');
  const metriEl = $('.osd__metri');
  const statoEl = $('.osd__stato');
  const suggerimento = $('.tubo__suggerimento');
  const oraEl = $('.osd__ora');
  const dataEl = $('.osd__data');
  // ancore di scorrimento -> posizione della telecamera (z) e metri sull'HUD
  const ANCORE = [0, 0.3, 0.6, 0.86, 1];
  const ZETA = [1.0, -5.6, -11.6, -18.2, -18.8];
  const METRI = [0, 3.40, 5.90, 8.72, 8.72];
  const morbido = (t) => t * t * (3 - 2 * t);
  function interpola(p, valori) {
    for (let i = 0; i < ANCORE.length - 1; i++) {
      if (p <= ANCORE[i + 1]) {
        const t = (p - ANCORE[i]) / (ANCORE[i + 1] - ANCORE[i]);
        return valori[i] + (valori[i + 1] - valori[i]) * morbido(Math.min(1, Math.max(0, t)));
      }
    }
    return valori[valori.length - 1];
  }
  const statoTubo = { p: 0, z: ZETA[0] };
  window.cesconTubo = statoTubo;
  let tappaAttiva = 0;
  const fmtMetri = (m) => m.toFixed(2).replace('.', ',');
  function aggiornaTubo() {
    const r = tubo.getBoundingClientRect();
    const corsa = tubo.offsetHeight - innerHeight;
    const p = Math.min(1, Math.max(0, -r.top / corsa));
    statoTubo.p = p;
    statoTubo.z = interpola(p, ZETA);
    metriEl.textContent = fmtMetri(interpola(p, METRI));
    palco.style.setProperty('--p', p.toFixed(4));
    const t = p < 0.16 ? 0 : p < 0.45 ? 1 : p < 0.73 ? 2 : 3;
    if (t !== tappaAttiva) {
      tappe[tappaAttiva].classList.remove('attiva');
      tappe[t].classList.add('attiva');
      tappaAttiva = t;
    }
    statoEl.textContent = t === 0 ? 'Ispezione in corso'
      : t === 1 ? 'Ostruzione: radici'
      : t === 2 ? 'Sonda attiva'
      : p > 0.95 ? 'Tubazione risanata' : 'Risanamento in corso';
    if (suggerimento) suggerimento.style.opacity = p > 0.04 ? '0' : '1';
  }
  function aggiornaOra() {
    const d = new Date();
    const due = (n) => String(n).padStart(2, '0');
    dataEl.textContent = `${due(d.getDate())}/${due(d.getMonth() + 1)}/${d.getFullYear()}`;
    oraEl.textContent = `${due(d.getHours())}:${due(d.getMinutes())}`;
  }
  aggiornaOra();
  setInterval(aggiornaOra, 30000);

  // la scena 3D arriva dopo: solo se c'è WebGL e quando il palco si avvicina
  let scenaChiesta = false;
  function caricaScena() {
    if (scenaChiesta) return;
    scenaChiesta = true;
    const prova = document.createElement('canvas');
    const gl = prova.getContext('webgl2') || prova.getContext('webgl');
    if (!gl) return;
    import('./3d.js')
      .then((m) => m.default($('.tubo__scena'), palco, statoTubo))
      .catch((e) => console.warn('Scena 3D non disponibile:', e));
  }
  if ('IntersectionObserver' in window) {
    const oss = new IntersectionObserver((voci) => {
      if (voci.some((v) => v.isIntersecting)) { caricaScena(); oss.disconnect(); }
    }, { rootMargin: '150% 0px' });
    oss.observe(tubo);
  }
  addEventListener('load', () => setTimeout(caricaScena, 1800), { once: true });

  /* ---------- Panorama della flotta ---------- */
  const panorama = $('.panorama');
  const panoramaImg = $('.panorama__img');
  function aggiornaPanorama() {
    const r = panorama.getBoundingClientRect();
    if (r.bottom < -50 || r.top > innerHeight + 50) return;
    const extra = panoramaImg.offsetWidth - panorama.clientWidth;
    if (extra <= 0) { panoramaImg.style.setProperty('--pan', '0px'); return; }
    const p = Math.min(1, Math.max(0, (innerHeight - r.top) / (innerHeight + r.height)));
    panoramaImg.style.setProperty('--pan', `${(-extra * p).toFixed(1)}px`);
  }

  /* ---------- Scroll unico ---------- */
  let inCoda = false;
  function alScroll() {
    if (inCoda) return;
    inCoda = true;
    requestAnimationFrame(() => {
      inCoda = false;
      aggiornaTestata();
      aggiornaTubo();
      aggiornaPanorama();
    });
  }
  addEventListener('scroll', alScroll, { passive: true });
  addEventListener('resize', alScroll);
  aggiornaTestata(); aggiornaTubo(); aggiornaPanorama();
  if (panoramaImg && !panoramaImg.complete) panoramaImg.addEventListener('load', aggiornaPanorama);

  /* ---------- Rivelazioni dei passi ---------- */
  const rivela = $$('[data-rivela]');
  if ('IntersectionObserver' in window && !riduci) {
    const ossR = new IntersectionObserver((voci) => {
      voci.forEach((v) => { if (v.isIntersecting) { v.target.classList.add('in'); ossR.unobserve(v.target); } });
    }, { threshold: 0.15, rootMargin: '0px 0px -8% 0px' });
    rivela.forEach((el) => ossR.observe(el));
  } else {
    rivela.forEach((el) => el.classList.add('in'));
  }

  /* ---------- Barra di chiamata su mobile ---------- */
  const barra = $('#barra-cta');
  const ctaHero = $('[data-cta="hero"]');
  if (barra && ctaHero && 'IntersectionObserver' in window) {
    new IntersectionObserver(([v]) => {
      barra.classList.toggle('vis', !v.isIntersecting && v.boundingClientRect.top < 0);
    }).observe(ctaHero);
  }

  /* ---------- Modulo -> WhatsApp ---------- */
  const modulo = $('#modulo');
  const errore = $('#modulo-errore');
  modulo.addEventListener('submit', (e) => {
    e.preventDefault();
    const f = new FormData(modulo);
    const nome = (f.get('nome') || '').trim();
    const comune = (f.get('comune') || '').trim();
    if (!nome || !comune) {
      errore.hidden = false;
      (nome ? modulo.comune : modulo.nome).focus();
      return;
    }
    errore.hidden = true;
    const righe = [
      'Buongiorno, vi scrivo dal sito.',
      `Problema: ${f.get('problema')}`,
      `Nome: ${nome}`,
      `Comune: ${comune}`,
    ];
    const tel = (f.get('telefono') || '').trim();
    const note = (f.get('note') || '').trim();
    if (tel) righe.push(`Telefono: ${tel}`);
    if (note) righe.push(`Dettagli: ${note}`);
    window.open(wa(righe.join('\n')), '_blank', 'noopener');
  });

  /* ---------- Aperti adesso? (ora di Roma) ---------- */
  const statoOrario = $('#stato-orario');
  try {
    const parti = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Rome', weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date());
    const val = (t) => parti.find((x) => x.type === t).value;
    const giorni = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const g = giorni.indexOf(val('weekday'));
    const min = Number(val('hour')) * 60 + Number(val('minute'));
    const chiude = g >= 1 && g <= 5 ? 18 * 60 : g === 6 ? 12 * 60 : 0;
    let testo;
    if (chiude && min >= 7 * 60 && min < chiude) {
      testo = `Adesso puoi chiamare: richieste d'intervento aperte fino alle ${chiude / 60}:00`;
      statoOrario.classList.add('aperto');
    } else if (chiude && min < 7 * 60) {
      testo = "Le richieste d'intervento aprono oggi alle 7:00";
    } else {
      const domani = (g + 1) % 7;
      const quando = domani === 0 ? 'lunedì' : 'domani';
      testo = `Le richieste d'intervento riaprono ${quando} alle 7:00`;
    }
    statoOrario.textContent = testo;
    statoOrario.hidden = false;
  } catch (e) { /* senza Intl resta nascosto */ }

  const anno = $('#anno');
  if (anno) anno.textContent = new Date().getFullYear();
})();
