(() => {
  'use strict';

  const doc = document.documentElement;
  const riduci = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));

  /* Anno nel piede */
  const anno = $('#anno');
  if (anno) anno.textContent = new Date().getFullYear();

  /* Testata: trasparente sulla vasca, chiara sulle sezioni chiare */
  const testata = $('#testata');
  const vasca = $('#vasca');
  const contatti = $('#contatti');
  const piede = $('.piede');
  function aggiornaTestata() {
    const y = window.scrollY;
    const h = testata.offsetHeight;
    const fineVasca = vasca.getBoundingClientRect().bottom;
    const scuroSotto = [contatti, piede].some((el) => {
      const r = el.getBoundingClientRect();
      return r.top <= h && r.bottom > h;
    });
    const chiara = fineVasca <= h && !scuroSotto;
    testata.classList.toggle('chiara', chiara);
    testata.classList.toggle('scorsa', !chiara && y > 24);
  }

  /* Barra mobile: compare quando i bottoni dell'hero escono di vista */
  const barra = $('.barra');
  const azioniHero = $('.hero-azioni');
  if (barra && azioniHero && 'IntersectionObserver' in window) {
    new IntersectionObserver(([e]) => {
      barra.classList.toggle('visibile', !e.isIntersecting && e.boundingClientRect.top < 0);
    }).observe(azioniHero);
  } else if (barra) {
    barra.classList.add('visibile');
  }

  /* Menu mobile */
  const menuBtn = $('.menu-btn');
  const menuMobile = $('#menu-mobile');
  function chiudiMenu() {
    menuMobile.hidden = true;
    menuBtn.setAttribute('aria-expanded', 'false');
    document.body.classList.remove('menu-aperto');
  }
  menuBtn.addEventListener('click', () => {
    const apri = menuMobile.hidden;
    menuMobile.hidden = !apri;
    menuBtn.setAttribute('aria-expanded', String(apri));
    document.body.classList.toggle('menu-aperto', apri);
  });
  $$('a', menuMobile).forEach((a) => a.addEventListener('click', chiudiMenu));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !menuMobile.hidden) { chiudiMenu(); menuBtn.focus(); } });

  /* Svelamenti */
  const daSvelare = $$('[data-svela]');
  if ('IntersectionObserver' in window && !riduci) {
    const io = new IntersectionObserver((voci) => {
      voci.forEach((v) => {
        if (v.isIntersecting) { v.target.classList.add('vista'); io.unobserve(v.target); }
      });
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.05 });
    daSvelare.forEach((el) => io.observe(el));
  } else {
    daSvelare.forEach((el) => el.classList.add('vista'));
  }

  /* Gamma: schede con indicatore e un giro automatico la prima volta */
  const tablist = $('.schede-tab');
  const tabs = $$('.tab', tablist);
  const pannelli = tabs.map((t) => document.getElementById(t.getAttribute('aria-controls')));
  let giroAttivo = false;
  let giroTimer = 0;
  function mostra(i, focus) {
    tabs.forEach((t, k) => {
      const on = k === i;
      t.setAttribute('aria-selected', String(on));
      t.tabIndex = on ? 0 : -1;
      pannelli[k].hidden = !on;
    });
    tablist.style.setProperty('--i', i);
    const p = pannelli[i];
    p.scrollLeft = 0;
    p.classList.remove('entra');
    void p.offsetWidth;
    p.classList.add('entra');
    if (focus) tabs[i].focus();
  }
  function fermaGiro() {
    giroAttivo = false;
    clearTimeout(giroTimer);
  }
  tabs.forEach((t, i) => {
    t.addEventListener('click', () => { fermaGiro(); mostra(i); });
    t.addEventListener('keydown', (e) => {
      const k = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
      if (!k) return;
      e.preventDefault();
      fermaGiro();
      mostra((i + k + tabs.length) % tabs.length, true);
    });
  });
  const gamma = $('#gamma');
  ['pointerdown', 'keydown', 'wheel'].forEach((ev) => gamma.addEventListener(ev, (e) => {
    if (ev === 'wheel' && Math.abs(e.deltaX) < Math.abs(e.deltaY)) return;
    fermaGiro();
  }, { passive: true }));
  $$('.pannello').forEach((p) => p.addEventListener('touchstart', fermaGiro, { passive: true }));
  if ('IntersectionObserver' in window && !riduci) {
    const ioGamma = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      ioGamma.disconnect();
      giroAttivo = true;
      const sequenza = [1, 2, 0];
      let passo = 0;
      const avanti = () => {
        if (!giroAttivo) return;
        mostra(sequenza[passo]);
        passo += 1;
        if (passo < sequenza.length) giroTimer = setTimeout(avanti, 2400);
        else giroAttivo = false;
      };
      giroTimer = setTimeout(avanti, 1000);
    }, { threshold: 0.35 });
    ioGamma.observe(tablist);
  }

  /* "Chiedi un'offerta": porta il modello nel modulo */
  const campoModello = $('#f-modello');
  $$('.chiedi').forEach((a) => a.addEventListener('click', () => {
    if (campoModello) campoModello.value = a.dataset.modello || '';
  }));

  /* Rulliera: le lastre scorrono con lo scroll, la luce attraversa il vetro */
  const impianti = $('#impianti');
  const rulli = $$('.rullo');
  function aggiornaRulli() {
    const r = impianti.getBoundingClientRect();
    const vh = window.innerHeight;
    if (r.bottom < -200 || r.top > vh + 200) return;
    const p = Math.min(1, Math.max(0, (vh - r.top) / (vh + r.height)));
    const vw = document.documentElement.clientWidth;
    rulli.forEach((rullo) => {
      const verso = Number(rullo.dataset.verso);
      const corsa = Math.max(0, rullo.scrollWidth - vw);
      const t = verso < 0 ? p : 1 - p;
      const x = corsa > 0 ? -corsa * t : (vw - rullo.scrollWidth) / 2;
      rullo.style.transform = `translate3d(${x.toFixed(1)}px,0,0)`;
      rullo.style.setProperty('--rx', `${(x * 1).toFixed(1)}px`);
      rullo.querySelectorAll('.lastra').forEach((l, k) => {
        l.style.setProperty('--luce', `${(110 - p * 120 + k * 9 * verso).toFixed(1)}%`);
      });
    });
  }

  /* Un solo giro di aggiornamento per evento di scroll */
  let inCoda = false;
  function alloScroll() {
    if (inCoda) return;
    inCoda = true;
    requestAnimationFrame(() => {
      inCoda = false;
      aggiornaTestata();
      if (!riduci) aggiornaRulli();
    });
  }
  window.addEventListener('scroll', alloScroll, { passive: true });
  window.addEventListener('resize', alloScroll);
  aggiornaTestata();
  if (!riduci) aggiornaRulli();
  else rulli.forEach((rullo) => { rullo.parentElement.style.overflowX = 'auto'; });

  /* Modulo: compone l'email con i dati inseriti */
  const modulo = $('#modulo');
  const errore = $('#modulo-errore');
  modulo.addEventListener('submit', (e) => {
    e.preventDefault();
    const dati = new FormData(modulo);
    const obbligatori = ['f-nome', 'f-azienda', 'f-email'].map((id) => document.getElementById(id));
    let primo = null;
    obbligatori.forEach((campo) => {
      const ok = campo.value.trim() !== '' && (campo.type !== 'email' || /.+@.+\..+/.test(campo.value));
      campo.setAttribute('aria-invalid', ok ? 'false' : 'true');
      if (!ok && !primo) primo = campo;
    });
    const consenso = modulo.querySelector('[name="privacy"]');
    if (primo) {
      errore.textContent = 'Inserite nome, azienda e un indirizzo email valido.';
      errore.hidden = false;
      primo.focus();
      return;
    }
    if (!consenso.checked) {
      errore.textContent = 'Serve il consenso al trattamento dei dati per inviare la richiesta.';
      errore.hidden = false;
      consenso.focus();
      return;
    }
    errore.hidden = true;
    const lavorazioni = dati.getAll('lavorazioni');
    const righe = [
      'Buongiorno,',
      'vorrei una proposta di impianto per il trattamento dell\'acqua di lavorazione.',
      '',
      `Nome: ${dati.get('nome')}`,
      `Azienda: ${dati.get('azienda')}`,
      `Email: ${dati.get('email')}`,
    ];
    if (dati.get('telefono')) righe.push(`Telefono: ${dati.get('telefono')}`);
    if (dati.get('macchine')) righe.push(`Macchine da collegare: ${dati.get('macchine')}`);
    if (lavorazioni.length) righe.push(`Lavorazioni: ${lavorazioni.join(', ')}`);
    if (dati.get('modello')) righe.push(`Modello di interesse: ${dati.get('modello')}`);
    if (String(dati.get('messaggio') || '').trim()) righe.push('', String(dati.get('messaggio')).trim());
    righe.push('', 'Grazie.');
    const oggetto = `Richiesta dimensionamento impianto - ${dati.get('azienda')}`;
    window.location.href = `mailto:info@dieffemacchine.it?subject=${encodeURIComponent(oggetto)}&body=${encodeURIComponent(righe.join('\n'))}`;
  });
  $$('#modulo input, #modulo textarea').forEach((c) => c.addEventListener('input', () => c.removeAttribute('aria-invalid')));

  /* Scena 3D: arriva dopo la pagina, solo se c'è WebGL */
  function haWebGL() {
    try {
      const c = document.createElement('canvas');
      return !!(c.getContext('webgl2') || c.getContext('webgl'));
    } catch (err) { return false; }
  }
  function avvia3D() {
    const canvas = $('#scena');
    if (!canvas || !haWebGL()) { doc.classList.add('senza-3d'); return; }
    import('./3d.js')
      .then((m) => m.avvia({
        canvas,
        velo: $('#torbido'),
        vasca,
        hero: $('.hero'),
        macchina: $('#hero-macchina img'),
        fasi: $$('.fase'),
        fermo: riduci,
      }))
      .catch(() => doc.classList.add('senza-3d'));
  }
  if (document.readyState === 'complete') setTimeout(avvia3D, 60);
  else window.addEventListener('load', () => setTimeout(avvia3D, 60), { once: true });
})();
