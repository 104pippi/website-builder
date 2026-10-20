/* Lafarmacia. — demo: cerca farmacia, servizi, animazioni */
(() => {
  'use strict';
  const doc = document.documentElement;
  doc.classList.add('js');
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const ridotto = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
  const norm = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/['’.]/g, ' ').replace(/\s+/g, ' ').trim();
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  /* ---------- Dati delle farmacie (un solo file, condiviso con la scena 3D) ---------- */
  const dati = fetch('assets/dati/farmacie.json').then((r) => r.json()).then((d) => {
    const farmacie = d.f.map((r, i) => ({
      i, nome: r[0], ind: r[1], cap: r[2], comune: r[3], prov: r[4], reg: d.regioni[r[5]],
      lat: r[6], lng: r[7], tel: r[8], wa: r[9], url: r[10],
      orari: r[11].split('|').map((g) => (g ? g.split(',').map((f) => [parseInt(f.slice(0, 4), 10), parseInt(f.slice(4, 8), 10)]) : [])),
      serv: new Set(Array.from(r[12]).map((c) => c.charCodeAt(0) - 48)), h24: r[13] === 1,
      chiave: norm(`${r[0]} ${r[3]} ${r[4]} ${r[1]}`), chiaveComune: norm(r[3])
    }));
    return { farmacie, servizi: d.servizi, regioni: d.regioni };
  });
  window.__datiFarmacie = dati;

  /* ---------- Ora di Roma e stato "aperta ora" ---------- */
  const GIORNI = ['lunedì', 'martedì', 'mercoledì', 'giovedì', 'venerdì', 'sabato', 'domenica'];
  function oraRoma() {
    try {
      const p = Object.fromEntries(new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Rome', weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date()).map((x) => [x.type, x.value]));
      return { g: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].indexOf(p.weekday), m: parseInt(p.hour, 10) * 100 + parseInt(p.minute, 10) };
    } catch (e) { const d = new Date(); return { g: (d.getDay() + 6) % 7, m: d.getHours() * 100 + d.getMinutes() }; }
  }
  const hhmm = (n) => `${Math.floor(n / 100)}:${String(n % 100).padStart(2, '0')}`;
  function stato(f, ora = oraRoma()) {
    if (f.h24) return { aperta: true, testo: 'Aperta 24 ore su 24' };
    const oggi = f.orari[ora.g] || [];
    for (const [a, b] of oggi) {
      const fine = b <= a ? 2400 : b;
      if (ora.m >= a && ora.m < fine) return { aperta: true, testo: b >= 2359 ? 'Aperta ora, chiude a mezzanotte' : `Aperta ora, chiude alle ${hhmm(b)}` };
    }
    const dopo = oggi.find(([a]) => a > ora.m);
    if (dopo) return { aperta: false, testo: `Chiusa, apre oggi alle ${hhmm(dopo[0])}` };
    for (let k = 1; k <= 7; k++) {
      const g = (ora.g + k) % 7;
      if ((f.orari[g] || []).length) return { aperta: false, testo: `Chiusa, apre ${k === 1 ? 'domani' : GIORNI[g]} alle ${hhmm(f.orari[g][0][0])}` };
    }
    return { aperta: false, testo: 'Orari non disponibili: chiama la farmacia' };
  }
  window.__statoFarmacia = stato;

  /* ---------- Testata, barra, menu mobile ---------- */
  const testata = $('[data-testata]');
  const barra = $('[data-barra]');
  const hero = $('[data-hero]');
  const burger = $('[data-burger]');
  const menuMobile = $('[data-menu-mobile]');
  function apriMenu(apri) {
    burger.setAttribute('aria-expanded', String(apri));
    menuMobile.hidden = !apri;
    document.body.style.overflow = apri ? 'hidden' : '';
    aggiornaTestata();
  }
  function aggiornaTestata() {
    const chiara = !menuMobile.hidden || scrollY > hero.offsetHeight - testata.offsetHeight - 10;
    testata.classList.toggle('is-chiara', chiara);
  }
  burger.addEventListener('click', () => apriMenu(menuMobile.hidden));
  menuMobile.addEventListener('click', (e) => { if (e.target.closest('a')) apriMenu(false); });

  /* ---------- Cerca farmacia ---------- */
  const elCerca = $('[data-cerca]');
  const elVicino = $('[data-vicino]');
  const elAperta = $('[data-aperta]');
  const elServ = $('[data-servizio]');
  const elRis = $('[data-risultati]');
  const elStato = $('[data-stato-ricerca]');
  const elAltre = $('[data-altre]');
  const sezTrova = $('#trova');
  const PAGINA = 9;
  let posizione = null;
  let mostrate = PAGINA;
  let ultimo = [];
  let query = 'Milano';
  elCerca.value = '';

  const distKm = (a, b, c, d) => {
    const R = 6371, t = Math.PI / 180;
    const x = Math.sin((c - a) * t / 2) ** 2 + Math.cos(a * t) * Math.cos(c * t) * Math.sin((d - b) * t / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(x));
  };
  const fmtKm = (k) => (k < 1 ? `${Math.round(k * 1000 / 10) * 10} m` : `${k < 10 ? k.toFixed(1).replace('.', ',') : Math.round(k)} km`);
  const telLink = (t) => 'tel:+39' + t.replace(/\D/g, '');
  const waLink = (w, nome) => `https://wa.me/39${w.replace(/\D/g, '').replace(/^39(?=\d{9,10}$)/, '')}?text=${encodeURIComponent(`Buongiorno, vi scrivo per la farmacia ${nome}.`)}`;

  function filtra(D) {
    const q = norm(query);
    const servIdx = elServ.value === '' ? -1 : Number(elServ.value);
    const soloAperte = elAperta.getAttribute('aria-pressed') === 'true';
    const ora = oraRoma();
    let lista = D.farmacie;
    if (servIdx >= 0) lista = lista.filter((f) => f.serv.has(servIdx));
    if (q && !posizione) {
      const capQ = /^\d{3,5}$/.test(q);
      lista = lista.map((f) => {
        let p = 0;
        if (capQ) p = f.cap.startsWith(q) ? 3 : 0;
        else if (f.chiaveComune === q) p = 4;
        else if (f.chiaveComune.startsWith(q)) p = 3;
        else if (norm(f.nome).includes(q)) p = 2;
        else if (f.chiave.includes(q)) p = 1;
        return [p, f];
      }).filter(([p]) => p > 0).sort((a, b) => b[0] - a[0] || a[1].nome.localeCompare(b[1].nome, 'it')).map(([, f]) => f);
    }
    if (posizione) {
      lista = lista.map((f) => Object.assign(f, { km: distKm(posizione.lat, posizione.lng, f.lat, f.lng) })).sort((a, b) => a.km - b.km);
    }
    const conStato = lista.map((f) => [f, stato(f, ora)]);
    return soloAperte ? conStato.filter(([, s]) => s.aperta) : conStato;
  }

  function cardHTML([f, s], k) {
    const dist = posizione && f.km != null ? `<span class="farm__dist">${fmtKm(f.km)}</span>` : '';
    const azioni = [
      f.tel ? `<a class="btn btn--rosso" href="${telLink(f.tel)}">Chiama</a>` : '',
      f.wa ? `<a class="btn btn--linea farm__wa" href="${waLink(f.wa, f.nome)}" target="_blank" rel="noopener">WhatsApp</a>` : '',
      `<a class="btn btn--linea" href="https://www.google.com/maps/dir/?api=1&destination=${f.lat},${f.lng}" target="_blank" rel="noopener">Indicazioni</a>`
    ].join('');
    return `<li class="farm" style="--k:${Math.min(k, 10)}">
      <div class="farm__testa"><h3 class="farm__nome"><a href="https://www.lafarmacia.it/trova-farmacia/${f.url}" target="_blank" rel="noopener"><small>Lafarmacia.</small>${esc(f.nome)}</a></h3>${dist}</div>
      <p class="farm__ind">${esc(f.ind)}, ${esc(f.cap)} ${esc(f.comune)} (${esc(f.prov)})</p>
      <p class="farm__stato${s.aperta ? ' is-aperta' : ''}">${s.testo}</p>
      <div class="farm__azioni">${azioni}</div>
    </li>`;
  }

  function disegna(D) {
    ultimo = filtra(D);
    const n = ultimo.length;
    const aperte = ultimo.filter(([, s]) => s.aperta).length;
    const servNome = elServ.value === '' ? '' : ` con ${D.servizi[Number(elServ.value)][1]}`;
    if (!n) {
      elStato.textContent = query ? `Nessuna farmacia${servNome} per “${query}”. Prova con il comune vicino o con “Vicino a me”.` : 'Nessuna farmacia con questi filtri.';
    } else if (posizione) {
      const viste = ultimo.slice(0, mostrate);
      const aperteViste = viste.filter(([, s]) => s.aperta).length;
      elStato.textContent = `Le farmacie${servNome} più vicine a te, in ordine di distanza. Aperte adesso: ${aperteViste} su ${viste.length}.`;
    } else {
      elStato.textContent = `${n} ${n === 1 ? 'farmacia' : 'farmacie'}${servNome}${query ? ` per “${query}”` : ''}, ${aperte} aperte adesso.`;
    }
    elRis.innerHTML = ultimo.slice(0, mostrate).map(cardHTML).join('');
    elAltre.hidden = n <= mostrate;
    elAltre.textContent = `Mostra altre ${Math.min(PAGINA, n - mostrate)} farmacie`;
  }

  const aggiorna = () => dati.then((D) => { mostrate = PAGINA; disegna(D); });
  let tCerca;
  elCerca.addEventListener('input', () => {
    clearTimeout(tCerca);
    tCerca = setTimeout(() => { query = elCerca.value.trim(); posizione = null; segnaCitta(); aggiorna(); }, 160);
  });
  elCerca.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); elCerca.blur(); } });
  elAperta.addEventListener('click', () => { elAperta.setAttribute('aria-pressed', String(elAperta.getAttribute('aria-pressed') !== 'true')); aggiorna(); });
  elServ.addEventListener('change', aggiorna);
  elAltre.addEventListener('click', () => dati.then((D) => { mostrate += PAGINA; disegna(D); }));

  function segnaCitta() { $$('[data-citta] button').forEach((b) => b.setAttribute('aria-pressed', String(!posizione && norm(b.dataset.q) === norm(query)))); }
  $$('[data-citta] button').forEach((b) => b.addEventListener('click', () => {
    query = b.dataset.q; elCerca.value = b.dataset.q; posizione = null; segnaCitta(); aggiorna();
  }));

  function vicinoAMe() {
    if (!('geolocation' in navigator)) { elStato.textContent = 'Il browser non condivide la posizione: scrivi il tuo comune o il CAP.'; return; }
    elStato.textContent = 'Cerco dove sei…';
    elVicino.disabled = true;
    navigator.geolocation.getCurrentPosition((p) => {
      elVicino.disabled = false;
      posizione = { lat: p.coords.latitude, lng: p.coords.longitude };
      query = ''; elCerca.value = ''; segnaCitta(); aggiorna();
    }, () => {
      elVicino.disabled = false;
      elStato.textContent = 'Posizione non disponibile: scrivi il tuo comune o il CAP qui sopra.';
      elCerca.focus();
    }, { enableHighAccuracy: false, timeout: 9000, maximumAge: 300000 });
  }
  elVicino.addEventListener('click', vicinoAMe);
  $$('[data-vicino-hero]').forEach((a) => a.addEventListener('click', (e) => {
    e.preventDefault();
    sezTrova.scrollIntoView({ behavior: ridotto ? 'auto' : 'smooth', block: 'start' });
    setTimeout(vicinoAMe, ridotto ? 0 : 450);
  }));

  // dai servizi al cerca farmacia, già filtrato
  dati.then((D) => {
    const opz = D.servizi.map(([slug, nome], i) => [i, nome]).sort((a, b) => a[1].localeCompare(b[1], 'it'));
    elServ.insertAdjacentHTML('beforeend', opz.map(([i, n]) => `<option value="${i}">${esc(n)}</option>`).join(''));
    const conta = {};
    D.farmacie.forEach((f) => f.serv.forEach((s) => { conta[s] = (conta[s] || 0) + 1; }));
    $$('[data-conta-servizio]').forEach((el) => {
      const i = D.servizi.findIndex(([slug]) => slug === el.dataset.contaServizio);
      if (i >= 0 && conta[i]) el.textContent = String(conta[i]);
    });
    const ora = oraRoma();
    const aperte = D.farmacie.filter((f) => stato(f, ora).aperta).length;
    const leg = $('[data-conta-aperte]');
    if (leg) leg.textContent = aperte ? `${D.farmacie.length} indirizzi, ${aperte} aperti adesso` : `${D.farmacie.length} indirizzi in ${D.regioni.length} regioni`;
    $$('[data-filtra-servizio]').forEach((a) => a.addEventListener('click', (e) => {
      e.preventDefault();
      const i = D.servizi.findIndex(([slug]) => slug === a.dataset.filtraServizio);
      if (i >= 0) elServ.value = String(i);
      sezTrova.scrollIntoView({ behavior: ridotto ? 'auto' : 'smooth', block: 'start' });
      aggiorna();
    }));
    segnaCitta();
    disegna(D);
  }).catch(() => { elStato.textContent = 'Non riesco a caricare l\'elenco: riprova tra poco.'; });

  /* ---------- Schede dei servizi ---------- */
  const schede = $$('[data-tab]');
  schede.forEach((b) => b.addEventListener('click', () => {
    schede.forEach((x) => x.setAttribute('aria-selected', String(x === b)));
    $$('[data-pannello]').forEach((p) => { p.hidden = p.dataset.pannello !== b.dataset.tab; });
  }));
  $('.servizi__schede')?.addEventListener('keydown', (e) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft' && e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
    e.preventDefault();
    const i = schede.findIndex((x) => x.getAttribute('aria-selected') === 'true');
    const n = schede[(i + (e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : schede.length - 1)) % schede.length];
    n.click(); n.focus();
  });

  /* ---------- Anno ---------- */
  const anno = $('[data-anno]');
  if (anno) anno.textContent = String(new Date().getFullYear());

  /* ---------- Intro ---------- */
  let partito = false;
  const via = () => { if (partito) return; partito = true; requestAnimationFrame(() => doc.classList.add('pronto')); };
  if (document.fonts && document.fonts.load) {
    Promise.race([
      Promise.all([document.fonts.load('500 100px "Bodoni Moda"'), document.fonts.load('400 16px Outfit')]).catch(() => {}),
      new Promise((r) => setTimeout(r, 1200))
    ]).then(via);
  } else via();
  setTimeout(via, 1800);

  /* ---------- Scroll: un solo ciclo ---------- */
  const ecg = $('[data-ecg]');
  const cerchi = $$('.evid__foto');
  const ricetta = $('[data-profondita]');
  const carta = $('[data-carta]');
  const chiusura = $('.chiusura');
  let inCoda = false;
  function scorri() {
    inCoda = false;
    const vh = innerHeight, y = scrollY;
    aggiornaTestata();
    if (barra) barra.classList.toggle('is-su', y > Math.min(hero.offsetHeight * 0.6, 460));
    if (ridotto) return;
    const prog = (el, a = 1, b = 0.25) => { const r = el.getBoundingClientRect(); return clamp((vh * a - r.top) / (vh * (a - b) + r.height * 0.3)); };
    if (ecg) ecg.style.setProperty('--p', (prog(ecg, 0.95, 0.45)).toFixed(3));
    cerchi.forEach((c) => { const t = prog(c, 1.05, 0.2); c.style.setProperty('--s', (0.82 + 0.18 * (1 - Math.pow(1 - t, 3))).toFixed(3)); });
    if (ricetta) { const r = ricetta.getBoundingClientRect(); const t = clamp((vh - r.top) / (vh + r.height)); ricetta.style.setProperty('--r', ((t - 0.5) * -16).toFixed(2)); }
    if (carta) { const r = carta.getBoundingClientRect(); carta.style.setProperty('--c', clamp((vh - r.top) / (vh + r.height)).toFixed(3)); }
    if (chiusura) { const r = chiusura.getBoundingClientRect(); if (r.bottom > 0 && r.top < vh) chiusura.style.setProperty('--cy', ((r.top / vh) * 60).toFixed(1) + 'px'); }
  }
  const chiedi = () => { if (!inCoda) { inCoda = true; requestAnimationFrame(scorri); } };
  addEventListener('scroll', chiedi, { passive: true });
  addEventListener('resize', chiedi);
  scorri();

  /* ---------- Scena 3D: un punto che diventa 669 ---------- */
  const canvas = $('[data-scena]');
  function webglOk() {
    try { const c = document.createElement('canvas'); return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl'))); } catch (e) { return false; }
  }
  function carica3d() {
    if (!canvas) return;
    if (!webglOk()) { doc.classList.add('no-webgl'); return; }
    import('./3d.js').then((m) => m.avvia(canvas, hero, { ridotto })).catch((e) => { console.warn('3D non disponibile', e); doc.classList.add('no-webgl'); });
  }
  if (document.readyState === 'complete') setTimeout(carica3d, 30);
  else addEventListener('load', () => setTimeout(carica3d, 30), { once: true });
})();
