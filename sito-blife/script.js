/* B Life: interazioni della demo */
(() => {
  'use strict';

  const WA = '393342154283';
  const PRODOTTI = {"18426":{"n":"Guanti in nitrile non talcati","p":6.4,"c":"confezione da 100","s":"AB-08A","da":true},"2147":{"n":"Garze 8 strati 10×10 cm non sterili","p":5.7,"c":"confezione da 100","s":"SM-142","da":false},"25233":{"n":"Aghi BD Microlance 30G, 0,29×13 mm","p":3.6,"c":"confezione da 100","s":"IN-129","da":false},"1591":{"n":"Speculum vaginali monouso a perno centrale, misura media","p":69.9,"c":"confezione da 200","s":"MG-02","da":false},"29173":{"n":"Lenzuolini medici in carta, 60 cm per 70 metri","p":39.6,"c":"confezione da 6","s":"LDS-200W","da":false},"28691":{"n":"Siringa BD Micro-Fine 0,3 ml con ago 30G×8 mm","p":11.0,"c":"confezione da 100","s":"IN-164","da":false},"21517":{"n":"Germoxid, disinfettante alla clorexidina per la cute","p":3.6,"c":"flacone","s":"LDS-133","da":false},"11801":{"n":"Bisturi monouso sterili, figura 15","p":4.9,"c":"confezione da 10","s":"IMS-02FIG15","da":false},"9287":{"n":"Guanti in vinile non talcati","p":4.6,"c":"confezione da 100","s":"AB-05","da":true},"2094":{"n":"Medicazione adesiva sterile 7,2×5 cm","p":8.5,"c":"confezione da 50","s":"SM-190","da":false},"2854":{"n":"Gel per ultrasuoni, flacone 250 ml","p":6.9,"c":"confezione da 5","s":"MG-85","da":false},"26100":{"n":"Siringa PosiFlush 10 ml preriempita di soluzione salina","p":15.0,"c":"confezione da 30","s":"IN-380","da":false},"1277":{"n":"Mascherina chirurgica 3 strati, dispositivo medico di classe I","p":3.4,"c":"confezione da 50","s":"AB-71A","da":false},"29618":{"n":"Compresse di garza 10×10 cm sterili, in busta singola","p":3.3,"c":"confezione da 10","s":"SM-148P","da":false},"1674":{"n":"Spazzolino endocervicale cytobrush","p":11.2,"c":"confezione da 100","s":"MG-21","da":false},"11730":{"n":"Curette dermatologiche, diametro 4 mm","p":39.0,"c":"confezione da 20","s":"IMS-267C","da":false},"2798":{"n":"Abbassalingua in legno non sterili","p":2.9,"c":"confezione da 100","s":"IMS-222","da":false},"2646":{"n":"Telo in TNT doppio strato 35×50 cm sterile","p":7.3,"c":"confezione da 20","s":"IMS-61","da":false},"74822":{"n":"Dermlite DL5 Plus, dermatoscopio a LED","p":2399.0,"c":"singolo","s":"DCP-15APLUS","da":false}};

  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const euro = (v) => {
    const [i, d] = v.toFixed(2).split('.');
    return i.replace(/\B(?=(\d{3})+(?!\d))/g, '.') + ',' + d + ' €';
  };
  const ridotto = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const desktop = matchMedia('(min-width: 960px)');

  $('#anno').textContent = new Date().getFullYear();

  /* ---------- menu mobile ---------- */
  const menuBtn = $('.menu-btn');
  const menu = $('#menu');
  const chiudiMenu = () => { menu.hidden = true; menuBtn.setAttribute('aria-expanded', 'false'); menuBtn.textContent = 'Menu'; };
  menuBtn.addEventListener('click', () => {
    const apri = menu.hidden;
    menu.hidden = !apri;
    menuBtn.setAttribute('aria-expanded', String(apri));
    menuBtn.textContent = apri ? 'Chiudi' : 'Menu';
  });
  $$('a', menu).forEach((a) => a.addEventListener('click', chiudiMenu));

  /* ---------- hero: regione del libro e avanzamento ---------- */
  const hero = $('#hero');
  const palco = $('.hero__palco');
  const scena = $('.hero__scena');
  const testo = $('.hero__testo');
  const didascalia = $('.hero__didascalia');
  const didTesto = $('#didascalia');
  const testata = $('#testata');
  const barra = $('#barra');

  // stato condiviso con 3d.js (frazioni del palco)
  const stato = window.__libro = { p: 0, chiuso: { cx: .71, cy: .53, w: .4, h: .72 }, aperto: { cx: .5, cy: .52, w: .86, h: .8 } };

  function misuraRegioni() {
    const W = palco.clientWidth, H = palco.clientHeight;
    const r = testo.getBoundingClientRect();
    const rp = palco.getBoundingClientRect();
    let cx, cy, h;
    if (desktop.matches) {
      const destra = r.right - rp.left;
      const larg = W - destra;
      cx = destra + larg * 0.5;
      cy = H * 0.53;
      h = Math.min(H * 0.72, (larg * 0.74) / 0.707);
      stato.aperto = { cx: .5, cy: .53, w: .84, h: .8 };
    } else {
      // il testo, a t = 0, finisce qui (tolta la traslazione dello scroll)
      const t = parseFloat(getComputedStyle(testo).getPropertyValue('--t')) || 0;
      const fondo = r.bottom - rp.top + t * 46;
      const alto = fondo + 30;
      const basso = H - 66;
      h = Math.max(180, Math.min(basso - alto, (W * 0.64) / 0.707) * 0.94);
      cx = W * 0.5;
      cy = Math.max(alto + h / 2, Math.min(basso - h / 2, (alto + basso) / 2));
      stato.aperto = { cx: .53, cy: .5, w: .8, h: .66 };
    }
    stato.chiuso = { cx: cx / W, cy: cy / H, w: (h * 0.707) / W, h: h / H };
    scena.style.setProperty('--lx', cx + 'px');
    scena.style.setProperty('--ly', cy + 'px');
    scena.style.setProperty('--lh', h + 'px');
  }

  const PAGINE_LARGO = [
    [0, 'Scorri per sfogliare il catalogo'],
    [0.12, 'Indice e Medicazione, 114 articoli'],
    [0.5, 'Infusione e prelievo, Ginecologia'],
    [0.8, 'Dermatologia e Chirurgia'],
  ];
  const PAGINE_TEL = [
    [0, 'Scorri per sfogliare il catalogo'],
    [0.12, 'Medicazione, 114 articoli'],
    [0.5, 'Ginecologia, 185 articoli'],
    [0.8, 'Chirurgia, 228 articoli'],
  ];
  let didAttuale = 'Scorri per sfogliare il catalogo';

  function aggiornaHero() {
    const corsa = hero.offsetHeight - innerHeight;
    const y = scrollY;
    const p = clamp(corsa > 0 ? y / corsa : 0);
    stato.p = p;
    const t = clamp(p / 0.1);
    testo.style.setProperty('--t', t.toFixed(3));
    hero.classList.toggle('hero--via', t > 0.6);
    const PAGINE = desktop.matches ? PAGINE_LARGO : PAGINE_TEL;
    let k = 0;
    PAGINE.forEach(([soglia], i) => { if (p >= soglia) k = i; });
    if (PAGINE[k][1] !== didAttuale) {
      didAttuale = PAGINE[k][1];
      didTesto.textContent = didAttuale;
      didascalia.classList.remove('cambia');
      void didascalia.offsetWidth;
      didascalia.classList.add('cambia');
    }
    didascalia.style.opacity = p > 0.97 ? '0' : '1';
    testata.classList.toggle('testata--piena', y > corsa + innerHeight * 0.5);
    const su = t > 0.5 || y > corsa;
    barra.classList.toggle('barra--su', su);
    didascalia.classList.toggle('didascalia--su', su);
  }

  /* ---------- orario della consegna ---------- */
  const orario = $('#orario');
  const passi = $$('li', orario);
  function aggiornaOrario() {
    const r = orario.getBoundingClientRect();
    const vh = innerHeight;
    const a = clamp((vh * 0.72 - r.top) / (r.height * 0.92));
    orario.style.setProperty('--avanz', a.toFixed(3));
    const linea = r.height * a;
    passi.forEach((li) => li.classList.toggle('fatto', li.offsetTop + 12 <= linea + 2));
  }

  /* ---------- dermatoscopio ---------- */
  const app = $('.apparecchi__foto');
  function aggiornaApparecchio() {
    const r = app.getBoundingClientRect();
    const vh = innerHeight;
    if (r.bottom < 0 || r.top > vh) return;
    const g = clamp((vh - r.top) / (vh + r.height)) * 2 - 1;
    app.style.setProperty('--g', g.toFixed(3));
  }

  let inAttesa = false;
  function aggiornaTutto() {
    inAttesa = false;
    aggiornaHero();
    aggiornaOrario();
    aggiornaApparecchio();
  }
  const richiedi = () => { if (!inAttesa) { inAttesa = true; requestAnimationFrame(aggiornaTutto); } };
  addEventListener('scroll', richiedi, { passive: true });
  addEventListener('resize', () => { misuraRegioni(); richiedi(); });
  desktop.addEventListener('change', () => { misuraRegioni(); richiedi(); });
  misuraRegioni();
  aggiornaTutto();
  if (document.fonts) document.fonts.ready.then(() => { misuraRegioni(); richiedi(); }).catch(() => {});

  /* ---------- indice: puntini che si tracciano ---------- */
  const lista = $('.indice__lista');
  $$('.voce__punti', lista).forEach((el, i) => el.style.setProperty('--i', i));
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((voci) => {
      voci.forEach((v) => { if (v.isIntersecting) { lista.classList.add('vista'); io.disconnect(); } });
    }, { rootMargin: '0px 0px -15% 0px' });
    io.observe(lista);
  } else lista.classList.add('vista');

  /* ---------- filtri ---------- */
  const filtri = $$('.filtro');
  const schede = $$('.prod');
  filtri.forEach((b) => b.addEventListener('click', () => {
    filtri.forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    const f = b.dataset.filtro;
    schede.forEach((s) => { s.hidden = f !== 'tutti' && s.dataset.gruppo !== f; });
  }));

  /* ---------- lista d'ordine ---------- */
  let righe = {};
  try { righe = JSON.parse(localStorage.getItem('blife-lista') || '{}') || {}; } catch (e) { righe = {}; }
  Object.keys(righe).forEach((id) => { if (!PRODOTTI[id] || !(righe[id] > 0)) delete righe[id]; });
  const salva = () => { try { localStorage.setItem('blife-lista', JSON.stringify(righe)); } catch (e) { /* niente */ } };

  const pillola = $('#lista-apri');
  const conta = $('#lista-conta');
  const dialogo = $('#lista');
  const elRighe = $('#lista-righe');
  const vuota = $('#lista-vuota');
  const totale = $('#lista-totale');
  const altro = $('#lista-altro');
  const studio = $('#lista-studio');

  function passo(id, q) {
    return `<div class="passo"><button type="button" data-meno="${id}" aria-label="Togli una confezione">−</button><output aria-live="polite">${q}</output><button type="button" data-piu="${id}" aria-label="Aggiungi una confezione">+</button></div>`;
  }

  function disegna(batti) {
    const ids = Object.keys(righe);
    const pezzi = ids.reduce((s, id) => s + righe[id], 0);
    pillola.hidden = pezzi === 0;
    conta.textContent = pezzi;
    if (batti && pezzi) { pillola.classList.remove('batte'); void pillola.offsetWidth; pillola.classList.add('batte'); }
    // schede prodotto
    $$('[data-id]').forEach((box) => {
      const id = box.dataset.id;
      box.innerHTML = righe[id]
        ? passo(id, righe[id])
        : `<button type="button" class="btn-agg" data-aggiungi="${id}">Aggiungi alla lista</button>`;
    });
    // finestra
    vuota.hidden = ids.length > 0;
    elRighe.innerHTML = ids.map((id) => {
      const p = PRODOTTI[id];
      return `<li><img src="assets/img/t/${id}.jpg" alt="" width="52" height="52"><div><p class="nome">${p.n}</p><p class="det">${p.da ? 'da ' : ''}${euro(p.p)} + IVA, ${p.c}</p></div>${passo(id, righe[id])}</li>`;
    }).join('');
    const tot = ids.reduce((s, id) => s + PRODOTTI[id].p * righe[id], 0);
    totale.hidden = !ids.length;
    totale.innerHTML = `Totale indicativo: <b>${euro(tot)}</b> + IVA`;
  }

  function cambia(id, d) {
    righe[id] = (righe[id] || 0) + d;
    if (righe[id] <= 0) delete righe[id];
    salva();
    disegna(d > 0);
  }

  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-aggiungi],[data-piu],[data-meno]');
    if (!b) return;
    if (b.dataset.aggiungi) {
      cambia(b.dataset.aggiungi, 1);
      if (b.closest('.apparecchi')) { b.textContent = 'Aggiunto alla lista'; setTimeout(() => { b.textContent = 'Aggiungi alla lista'; }, 2200); }
    } else if (b.dataset.piu) cambia(b.dataset.piu, 1);
    else cambia(b.dataset.meno, -1);
  });

  pillola.addEventListener('click', () => {
    if (typeof dialogo.showModal === 'function') dialogo.showModal();
    else dialogo.setAttribute('open', '');
  });
  dialogo.addEventListener('click', (e) => { if (e.target === dialogo) dialogo.close(); });

  function testoLista() {
    const ids = Object.keys(righe);
    const r = ['Buongiorno, vorrei ordinare dal catalogo B Life:'];
    ids.forEach((id) => {
      const p = PRODOTTI[id];
      r.push(`- ${righe[id]} x ${p.n} (cod. ${p.s}), ${p.c}, ${p.da ? 'da ' : ''}${euro(p.p)} + IVA${p.da ? ', taglia: ' : ''}`);
    });
    if (altro.value.trim()) r.push('', 'Altri articoli: ' + altro.value.trim());
    if (ids.length) {
      const tot = ids.reduce((s, id) => s + PRODOTTI[id].p * righe[id], 0);
      r.push('', `Totale indicativo: ${euro(tot)} + IVA`);
    }
    if (studio.value.trim()) r.push('', 'Studio e recapito: ' + studio.value.trim());
    r.push('', 'Grazie!');
    return r.join('\n');
  }
  const vuotaAvviso = () => {
    if (Object.keys(righe).length || altro.value.trim()) return false;
    altro.focus();
    altro.placeholder = 'Scrivi qui almeno un articolo o un codice';
    return true;
  };
  $('#lista-wa').addEventListener('click', () => {
    if (vuotaAvviso()) return;
    window.open(`https://wa.me/${WA}?text=${encodeURIComponent(testoLista())}`, '_blank', 'noopener');
  });
  $('#lista-mail').addEventListener('click', () => {
    if (vuotaAvviso()) return;
    location.href = `mailto:info@blife.it?subject=${encodeURIComponent('Ordine dal catalogo B Life')}&body=${encodeURIComponent(testoLista())}`;
  });
  disegna(false);

  /* ---------- modulo contatti ---------- */
  const modulo = $('#modulo');
  const errore = $('#modulo-errore');
  modulo.addEventListener('submit', (e) => {
    e.preventDefault();
    const via = (e.submitter && e.submitter.dataset.via) || 'wa';
    const d = Object.fromEntries(new FormData(modulo));
    const ok = d.nome.trim() && d.recapito.trim() && d.messaggio.trim();
    errore.hidden = !!ok;
    if (!ok) { (d.nome.trim() ? (d.recapito.trim() ? modulo.messaggio : modulo.recapito) : modulo.nome).focus(); return; }
    const t = [`Buongiorno, sono ${d.nome.trim()}${d.studio.trim() ? ' (' + d.studio.trim() + ')' : ''}.`, '', d.messaggio.trim(), '', `Recapito: ${d.recapito.trim()}`].join('\n');
    if (via === 'mail') location.href = `mailto:info@blife.it?subject=${encodeURIComponent('Richiesta dal sito')}&body=${encodeURIComponent(t)}`;
    else window.open(`https://wa.me/${WA}?text=${encodeURIComponent(t)}`, '_blank', 'noopener');
  });

  /* ---------- scena 3D: dopo il caricamento, solo se serve ---------- */
  function puoWebGL() {
    try {
      const c = document.createElement('canvas');
      return !!(window.WebGL2RenderingContext && c.getContext('webgl2'));
    } catch (e) { return false; }
  }
  function carica3D() {
    if (ridotto || !puoWebGL()) { document.documentElement.classList.add('senza3d'); richiedi(); return; }
    import('./3d.js')
      .then((m) => m.avvia({ scena, hero, stato }))
      .catch((err) => {
        console.warn('3D non disponibile:', err);
        document.documentElement.classList.add('senza3d');
        richiedi();
      });
  }
  if (document.readyState === 'complete') setTimeout(carica3D, 60);
  else addEventListener('load', () => setTimeout(carica3D, 60), { once: true });
})();
