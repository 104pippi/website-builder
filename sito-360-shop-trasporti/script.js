/* 360 Shop Trasporti — intro dell'hero, menu, reveal, palco del giro e calcolatore del preventivo */
(() => {
  'use strict';
  const doc = document.documentElement;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const liscio = (t) => { t = clamp(t); return t * t * (3 - 2 * t); };
  const ridotto = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const eMobile = () => window.innerWidth < 761;
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  $('#anno').textContent = String(new Date().getFullYear());

  /* ---------- testata, barra, menu ---------- */
  const testata = $('#testata'), barra = $('#barra'), hero = $('#inizio');
  let tickScroll = false;
  function suScroll() {
    const y = window.scrollY;
    testata.classList.toggle('solida', y > 24);
    barra.classList.toggle('vista', y > hero.offsetHeight * 0.55);
  }
  suScroll();

  const menuBtn = $('.menu-apri');
  function chiudiMenu() { document.body.classList.remove('menu-aperto'); menuBtn.setAttribute('aria-expanded', 'false'); }
  menuBtn.addEventListener('click', () => { const a = document.body.classList.toggle('menu-aperto'); menuBtn.setAttribute('aria-expanded', String(a)); });
  $$('#menu a').forEach((a) => a.addEventListener('click', chiudiMenu));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') chiudiMenu(); });

  /* ---------- reveal ---------- */
  const rivela = new IntersectionObserver((voci) => {
    voci.forEach((v) => { if (v.isIntersecting) { v.target.classList.add('in'); rivela.unobserve(v.target); } });
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.06 });
  $$('[data-rivela]').forEach((el) => rivela.observe(el));

  /* ---------- HERO: il termometro scende, le cifre si stringono, arriva il furgone ---------- */
  const termo = $('#termo-num'), termoEt = $('#termo-etichetta'), termometro = $('.termometro');
  const brina = $('.hero-brina'), furgone = $('.hero-furgone'), scena = $('.hero-scena');
  const misuraScena = () => hero.style.setProperty('--sh', scena.clientHeight + 'px');
  misuraScena();
  if (window.ResizeObserver) new ResizeObserver(misuraScena).observe(scena);
  const CHIAVI = [[0, 20], [0.35, 20], [1.0, 4], [1.28, 4], [2.4, -18]];
  function temperatura(t) {
    for (let i = 1; i < CHIAVI.length; i++) {
      const [t1, v1] = CHIAVI[i], [t0, v0] = CHIAVI[i - 1];
      if (t <= t1) { const k = (t - t0) / ((t1 - t0) || 1); return lerp(v0, v1, i === CHIAVI.length - 1 ? 1 - Math.pow(1 - k, 2.2) : liscio(k)); }
    }
    return -18;
  }
  const CALDO = [246, 233, 220], FRESCO = [214, 234, 248], GELO = [168, 213, 245];
  function coloreTemp(T) {
    const a = T > 4 ? CALDO : FRESCO, b = T > 4 ? FRESCO : GELO;
    const k = T > 4 ? (20 - T) / 16 : (4 - T) / 22;
    return 'rgb(' + a.map((c, i) => Math.round(lerp(c, b[i], clamp(k)))).join(',') + ')';
  }
  let ultimoTesto = '', ultimaEt = '';
  function mostraTemp(T) {
    const n = Math.round(T);
    const testo = (n > 0 ? '+' : n < 0 ? '−' : '') + Math.abs(n) + '°';
    if (testo !== ultimoTesto) { termo.textContent = testo; ultimoTesto = testo; }
    termo.style.fontStretch = (62 + (clamp(T, -18, 20) + 18) / 38 * 63).toFixed(1) + '%';
    termo.style.color = coloreTemp(T);
    const et = T > 9 ? 'temperatura ambiente' : T > -6 ? 'fresco, da 0 a +4 °C' : 'surgelato';
    if (et !== ultimaEt) { termoEt.textContent = et; ultimaEt = et; }
    brina.style.opacity = ((window.innerWidth >= 1000 ? 0.46 : 0.6) * liscio((4 - T) / 20)).toFixed(3);
  }
  function furgoneIntro(t) {
    const k = clamp((t - 0.2) / 1.4);
    const e = 1 - Math.pow(1 - k, 3.4);
    const tb = t - 1.6;
    const becc = tb > 0 ? Math.exp(-tb * 4.4) * Math.sin(tb * 9.5) * 1.0 : 0;
    return { x: (1 - e) * -110, skew: (1 - e) * -5, becc, op: clamp((t - 0.2) / 0.25) };
  }
  let t0Intro = null, rafHero = 0, heroInVista = true;
  function cicloHero() {
    rafHero = 0;
    const t = t0Intro == null ? 0 : (performance.now() - t0Intro) / 1000;
    const y = clamp(window.scrollY / Math.max(1, hero.offsetHeight), 0, 1.2);
    const fine = ridotto || t > 3.4;
    mostraTemp(ridotto ? -18 : temperatura(t));
    const f = ridotto ? { x: 0, skew: 0, becc: 0, op: 1 } : furgoneIntro(t);
    furgone.style.transform = `translate3d(${(f.x + y * 30).toFixed(2)}vw, ${(y * -3).toFixed(2)}vh, 0) skewX(${f.skew.toFixed(2)}deg) rotate(${f.becc.toFixed(3)}deg)`;
    furgone.style.opacity = String(f.op);
    termometro.style.transform = `translate3d(0, ${(y * -14).toFixed(2)}vh, 0) scale(${(1 - y * 0.1).toFixed(4)})`;
    termometro.style.opacity = ((ridotto ? 1 : clamp((t - 0.05) / 0.3)) * (1 - y * 0.75)).toFixed(3);
    if (heroInVista && (!fine || t0Intro == null)) rafHero = requestAnimationFrame(cicloHero);
  }
  function richiediHero() { if (!rafHero && heroInVista) rafHero = requestAnimationFrame(cicloHero); }
  new IntersectionObserver((v) => { heroInVista = v[0].isIntersecting; if (heroInVista) richiediHero(); }).observe(hero);
  cicloHero();
  function avviaIntro() {
    if (t0Intro != null) return;
    doc.classList.add('avvio');
    t0Intro = performance.now();
    richiediHero();
  }
  let fontPronti = Promise.resolve();
  try { if (document.fonts && document.fonts.load) fontPronti = document.fonts.load('800 100px Archivo').catch(() => {}); } catch (e) { /* stringa non valida: si parte col timer */ }
  Promise.race([fontPronti, new Promise((ok) => setTimeout(ok, 650))]).then(avviaIntro, avviaIntro);
  setTimeout(avviaIntro, 1200);

  /* ---------- IL GIRO: palco sticky con quattro giri d'esempio ---------- */
  const pista = $('#giro-pista'), palco = $('#giro-palco');
  const esempi = $$('#giro-esempi .esempio'), passi = $$('.giro-passi span');
  function progressoGiro() {
    const r = pista.getBoundingClientRect();
    return -r.top / Math.max(1, pista.offsetHeight - palco.offsetHeight);
  }
  let esAttivo = 0;
  function aggiornaGiro() {
    const p = progressoGiro();
    const i = Math.min(esempi.length - 1, Math.floor(clamp(p, 0, 0.9999) * esempi.length));
    if (i !== esAttivo) {
      esempi[esAttivo].classList.remove('attivo'); passi[esAttivo] && passi[esAttivo].classList.remove('on');
      esAttivo = i;
      esempi[i].classList.add('attivo'); passi[i] && passi[i].classList.add('on');
    }
  }
  window.addEventListener('scroll', () => {
    if (tickScroll) return;
    tickScroll = true;
    requestAnimationFrame(() => { tickScroll = false; suScroll(); aggiornaGiro(); richiediHero(); });
  }, { passive: true });
  aggiornaGiro();

  let modulo3d = null;
  const carica3d = () => (modulo3d || (modulo3d = import('./3d.js')));
  function webglOk() {
    try { const c = document.createElement('canvas'); return !!(window.WebGL2RenderingContext && c.getContext('webgl2')); } catch (e) { return false; }
  }
  const puo3d = webglOk();
  if (puo3d) {
    const ioGiro = new IntersectionObserver((v) => {
      if (!v[0].isIntersecting) return;
      ioGiro.disconnect();
      carica3d().then((m) => m.creaMappa({ canvas: $('#giro-canvas'), etichette: $('#giro-etichette'), contenitore: palco, modo: 'giro', progresso: progressoGiro, ridotto, mobile: eMobile() }))
        .catch((e) => console.warn('Mappa 3D non disponibile:', e));
    }, { rootMargin: '900px 0px' });
    ioGiro.observe(pista);
    window.addEventListener('load', () => setTimeout(carica3d, 1500), { once: true });
  }

  /* ---------- PREVENTIVO ---------- */
  const TEL = '393501524136';
  const BASI = {
    candelu: { lat: 45.7364337, lon: 12.3721403, nome: 'Candelù' },
    treviso: { lat: 45.6658505, lon: 12.2455414, nome: 'Treviso' },
  };
  // Tariffe prese dai calcolatori di 360shoptrasporti.com (pallet, consegne multiple, pacchi)
  const MODI = {
    pallet: {
      titolo: 'Pallet, una consegna', base: 'candelu', unita: 'pallet', temp: 'Surgelato, −18 °C',
      misure: 'Pallet EPAL 120 × 80 cm, alti al massimo 200 cm.',
      prezzo(km, n) { const extra = Math.max(0, n - 1) * 30; const lordo = km * 0.369 + km * 0.246 + extra; return { imp: Math.max(lordo, 35), extra, minimo: lordo < 35 }; },
    },
    tappe: {
      titolo: 'Pallet, più consegne', base: 'candelu', unita: 'pallet', temp: 'Surgelato, −18 °C',
      misure: 'Fino a 5 consegne, nell’ordine in cui le scrivi. Pallet EPAL 120 × 80 cm, alti al massimo 200 cm.',
      prezzo(km, n) { const extra = Math.max(0, n - 1) * 30; return { imp: km * 0.45 + Math.floor(km / 60) * 18 + extra, extra }; },
    },
    pacchi: {
      titolo: 'Pacchi', base: 'treviso', unita: 'pacchi', temp: 'Temperatura ambiente',
      misure: 'Pacchi fino a 99 × 78 × 64 cm. Per oggetti più grandi scegli i pallet o scrivici.',
      prezzo(km) { return { imp: km * 0.185 + km * 0.3, extra: 0 }; },
    },
  };
  const euro = new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' });
  const kmF = new Intl.NumberFormat('it-IT', { maximumFractionDigits: 0 });

  const form = $('#prev-form'), consegne = $('#consegne'), btnAggiungi = $('#prev-aggiungi');
  const btnCalcola = $('#prev-calcola'), boxErrore = $('#prev-errore');
  let modo = 'pallet', quanti = 1, tempToccata = false;

  const oggi = new Date(); oggi.setMinutes(oggi.getMinutes() - oggi.getTimezoneOffset());
  $('#quando').min = oggi.toISOString().slice(0, 10);

  function errore(msg) { boxErrore.textContent = msg || ''; }

  /* autocompletamento con Photon (dati OpenStreetMap) */
  async function cercaLuoghi(q, limite, segnale) {
    const url = 'https://photon.komoot.io/api/?q=' + encodeURIComponent(q) + '&limit=' + limite + '&lang=default&lat=45.67&lon=12.24&bbox=6.6,36.6,18.6,47.1';
    const r = await fetch(url, { signal: segnale });
    if (!r.ok) throw new Error('photon ' + r.status);
    const d = await r.json();
    const visti = new Set(), out = [];
    for (const f of d.features || []) {
      const p = f.properties || {};
      if ((p.countrycode || '').toUpperCase() !== 'IT') continue;
      const citta = p.city || p.town || p.village || p.district || p.locality || '';
      let titolo;
      if (p.street && p.housenumber) titolo = p.street + ' ' + p.housenumber;
      else if (p.type === 'street') titolo = p.name || p.street;
      else titolo = p.name || p.street || citta;
      if (!titolo) continue;
      const luogo = citta && citta !== titolo ? citta : '';
      const prov = p.county && p.county !== titolo && p.county !== citta ? p.county : (p.state || '');
      const sotto = [p.postcode, luogo, prov ? '(' + prov + ')' : ''].filter(Boolean).join(' ');
      const etichetta = [titolo, luogo].filter(Boolean).join(', ');
      if (visti.has(etichetta + sotto)) continue;
      visti.add(etichetta + sotto);
      out.push({ lat: f.geometry.coordinates[1], lon: f.geometry.coordinates[0], titolo, sotto, etichetta, provincia: p.county || '', breve: luogo || titolo });
    }
    return out;
  }

  function collegaLuogo(campo) {
    const input = $('input', campo), lista = $('.suggerimenti', campo), box = $('.luogo', campo);
    let timer = 0, ctrl = null, risultati = [], indice = -1;
    input._luogo = null;
    function chiudi() { lista.hidden = true; input.setAttribute('aria-expanded', 'false'); input.removeAttribute('aria-activedescendant'); indice = -1; }
    function evidenzia(i) {
      const voci = $$('li[role="option"]', lista);
      voci.forEach((li, k) => li.setAttribute('aria-selected', String(k === i)));
      indice = i;
      if (voci[i]) { input.setAttribute('aria-activedescendant', voci[i].id); voci[i].scrollIntoView({ block: 'nearest' }); }
    }
    function scegli(i) {
      const r = risultati[i]; if (!r) return;
      input.value = r.etichetta; input._luogo = r; box.classList.add('ok'); chiudi();
    }
    function mostra() {
      lista.innerHTML = '';
      if (!risultati.length) {
        lista.innerHTML = '<li class="vuoto">Nessun indirizzo trovato. Prova ad aggiungere la città.</li>';
      } else {
        risultati.forEach((r, i) => {
          const li = document.createElement('li');
          li.id = input.id + '-opz-' + i; li.setAttribute('role', 'option'); li.setAttribute('aria-selected', 'false');
          li.innerHTML = '<b>' + esc(r.titolo) + '</b><small>' + esc(r.sotto) + '</small>';
          li.addEventListener('mousedown', (e) => { e.preventDefault(); scegli(i); });
          lista.appendChild(li);
        });
        const cr = document.createElement('li'); cr.className = 'crediti'; cr.textContent = 'Indirizzi © OpenStreetMap'; lista.appendChild(cr);
      }
      lista.hidden = false; input.setAttribute('aria-expanded', 'true'); indice = -1;
    }
    input.addEventListener('input', () => {
      input._luogo = null; box.classList.remove('ok');
      clearTimeout(timer);
      const q = input.value.trim();
      if (q.length < 3) { chiudi(); return; }
      timer = setTimeout(async () => {
        if (ctrl) ctrl.abort();
        ctrl = new AbortController();
        try { risultati = await cercaLuoghi(q, 7, ctrl.signal); if (document.activeElement === input) mostra(); }
        catch (e) { if (e.name !== 'AbortError') { risultati = []; chiudi(); } }
      }, 260);
    });
    input.addEventListener('keydown', (e) => {
      if (lista.hidden) return;
      const n = risultati.length;
      if (e.key === 'ArrowDown') { e.preventDefault(); evidenzia(n ? (indice + 1) % n : -1); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); evidenzia(n ? (indice - 1 + n) % n : -1); }
      else if (e.key === 'Enter' && indice >= 0) { e.preventDefault(); scegli(indice); }
      else if (e.key === 'Escape') chiudi();
    });
    input.addEventListener('blur', () => setTimeout(chiudi, 160));
    const togli = $('.luogo-togli', campo);
    if (togli) togli.addEventListener('click', () => { campo.remove(); numeraConsegne(); });
  }
  collegaLuogo($('#ritiro').closest('.campo-luogo'));
  collegaLuogo($('#consegne .campo-luogo'));

  function numeraConsegne() {
    const campi = $$('.campo-luogo', consegne);
    campi.forEach((c, i) => { $('label', c).textContent = modo === 'tappe' ? 'Consegna ' + (i + 1) : 'Consegna'; });
    btnAggiungi.hidden = modo !== 'tappe' || campi.length >= 5;
  }
  let progressivo = 1;
  function nuovaConsegna() {
    progressivo += 1;
    const id = 'consegna-' + progressivo;
    const div = document.createElement('div');
    div.className = 'campo campo-luogo';
    div.innerHTML = '<label for="' + id + '">Consegna</label><div class="luogo"><span class="luogo-punto" aria-hidden="true"></span>' +
      '<input id="' + id + '" type="text" inputmode="search" autocomplete="off" placeholder="Via e città della consegna" role="combobox" aria-autocomplete="list" aria-expanded="false" aria-controls="' + id + '-lista">' +
      '<button type="button" class="luogo-togli" aria-label="Togli questa consegna">×</button>' +
      '<ul class="suggerimenti" id="' + id + '-lista" role="listbox" hidden></ul></div>';
    consegne.appendChild(div);
    collegaLuogo(div);
    numeraConsegne();
    $('input', div).focus();
  }
  btnAggiungi.addEventListener('click', nuovaConsegna);

  function impostaModo(m) {
    if (!MODI[m]) return;
    modo = m;
    const M = MODI[m];
    $('#prev-misure').textContent = M.misure;
    $('#quanti-etichetta').textContent = M.unita === 'pallet' ? 'Quanti pallet' : 'Quanti pacchi';
    if (m !== 'tappe') $$('.campo-luogo', consegne).slice(1).forEach((c) => c.remove());
    numeraConsegne();
    if (!tempToccata) { const r = form.querySelector('input[name="temperatura"][value="' + M.temp + '"]'); if (r) r.checked = true; }
  }
  form.addEventListener('change', (e) => {
    if (e.target.name === 'modo') impostaModo(e.target.value);
    if (e.target.name === 'temperatura') tempToccata = true;
  });
  $$('[data-modo]').forEach((a) => a.addEventListener('click', () => {
    const r = form.querySelector('input[name="modo"][value="' + a.dataset.modo + '"]');
    if (r) { r.checked = true; impostaModo(r.value); }
  }));

  const uscita = $('#quanti'), bottoniPasso = $$('.contatore button');
  function aggiornaQuanti() { uscita.textContent = String(quanti); bottoniPasso[0].disabled = quanti <= 1; bottoniPasso[1].disabled = quanti >= 6; }
  bottoniPasso.forEach((b) => b.addEventListener('click', () => { quanti = clamp(quanti + Number(b.dataset.passo), 1, 6); aggiornaQuanti(); }));
  aggiornaQuanti();

  form.addEventListener('focusin', (e) => { if (e.target.matches('input[type="text"], input[type="date"]')) document.body.classList.add('digita'); });
  form.addEventListener('focusout', () => setTimeout(() => { if (!form.contains(document.activeElement)) document.body.classList.remove('digita'); }, 120));

  async function risolvi(input) {
    if (input._luogo) return input._luogo;
    const r = await cercaLuoghi(input.value.trim(), 1);
    if (r[0]) { input._luogo = r[0]; return r[0]; }
    return null;
  }
  function conTempo(ms) { const c = new AbortController(); setTimeout(() => c.abort(), ms); return c.signal; }
  async function percorso(punti) {
    const coord = punti.map((p) => p.lon.toFixed(5) + ',' + p.lat.toFixed(5)).join(';');
    const r = await fetch('https://router.project-osrm.org/route/v1/driving/' + coord + '?overview=simplified&geometries=geojson', { signal: conTempo(12000) });
    if (!r.ok) throw new Error('osrm ' + r.status);
    const d = await r.json();
    if (d.code !== 'Ok' || !d.routes || !d.routes[0]) throw new Error('osrm ' + d.code);
    return { km: d.routes[0].distance / 1000, linea: d.routes[0].geometry.coordinates };
  }
  function stimaKm(punti) {
    let s = 0;
    for (let i = 1; i < punti.length; i++) {
      const a = punti[i - 1], b = punti[i], R = 6371, rad = Math.PI / 180;
      const dl = (b.lat - a.lat) * rad, dg = (b.lon - a.lon) * rad;
      const h = Math.sin(dl / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dg / 2) ** 2;
      s += 2 * R * Math.asin(Math.sqrt(h));
    }
    return s * 1.3;
  }

  let mappaRis = null;
  function mappaRisultato() {
    if (!puo3d) return Promise.resolve(null);
    if (!mappaRis) {
      mappaRis = carica3d()
        .then((m) => m.creaMappa({ canvas: $('#ris-canvas'), etichette: $('#ris-etichette'), contenitore: $('#ris-mappa'), modo: 'risultato', ridotto, mobile: eMobile() }))
        .catch((e) => { console.warn('Mappa del preventivo non disponibile:', e); return null; });
    }
    return mappaRis;
  }
  if (puo3d) {
    const ioPrev = new IntersectionObserver((v) => { if (v[0].isIntersecting) { ioPrev.disconnect(); mappaRisultato(); } }, { rootMargin: '500px 0px' });
    ioPrev.observe($('#prev-risultato'));
  }

  function contaFino(el, valore) {
    if (ridotto) { el.textContent = euro.format(valore); return; }
    const t0 = performance.now(), dur = 700;
    (function f() {
      const k = clamp((performance.now() - t0) / dur);
      el.textContent = euro.format(valore * (1 - Math.pow(1 - k, 3)));
      if (k < 1) requestAnimationFrame(f);
    })();
  }

  let ultimo = null;
  function messaggioWa() {
    if (!ultimo) return '';
    const { M, luoghi, km, r, approssimato, sconto } = ultimo;
    const temp = (form.querySelector('input[name="temperatura"]:checked') || {}).value || '';
    const quando = $('#quando').value;
    const righe = [
      'Ciao 360 Shop, vorrei prenotare un trasporto.',
      'Servizio: ' + M.titolo + ' (' + quanti + ' ' + (M.unita === 'pallet' ? 'pallet' : quanti === 1 ? 'pacco' : 'pacchi') + ')',
      'Temperatura: ' + temp,
      'Ritiro: ' + luoghi[0].etichetta,
    ];
    luoghi.slice(1).forEach((l, i) => righe.push((luoghi.length > 2 ? 'Consegna ' + (i + 1) : 'Consegna') + ': ' + l.etichetta));
    if (quando) { const [a, m, g] = quando.split('-'); righe.push('Quando: ' + g + '/' + m + '/' + a); }
    righe.push('Stima dal sito: ' + euro.format(r.imp) + ' + IVA (' + euro.format(r.imp * 1.22) + ' IVA inclusa), giro di ' + (approssimato ? 'circa ' : '') + kmF.format(km) + ' km');
    if ($('#primo').checked) righe.push('Primo trasporto: sì' + (sconto ? ', destinazione in provincia di Treviso' : ''));
    return righe.join('\n');
  }

  async function mostraRisultato(dati) {
    ultimo = dati;
    const { M, luoghi, km, r, approssimato, linea } = dati;
    const iva = r.imp * 0.22, tot = r.imp + iva;
    $('#ris-vuoto').hidden = true; $('#ris-pieno').hidden = false;
    const temp = (form.querySelector('input[name="temperatura"]:checked') || {}).value || '';
    const TEMP_BREVE = { 'Surgelato, −18 °C': 'surgelato a −18 °C', 'Fresco, da 0 a +4 °C': 'fresco da 0 a +4 °C', 'Temperatura ambiente': 'a temperatura ambiente' };
    $('#ris-servizio').textContent = M.titolo + ': ' + quanti + ' ' + (M.unita === 'pallet' ? 'pallet' : quanti === 1 ? 'pacco' : 'pacchi') + ', ' + (TEMP_BREVE[temp] || temp);
    contaFino($('#ris-imponibile'), r.imp);
    $('#ris-totale').textContent = euro.format(tot);
    $('#ris-km').textContent = (approssimato ? 'circa ' : '') + kmF.format(km) + ' km';
    $('#ris-riga-extra').hidden = !r.extra;
    $('#ris-extra-nome').textContent = 'Pallet in più (30 € l’uno)';
    $('#ris-extra').textContent = euro.format(r.extra);
    $('#ris-imp2').textContent = euro.format(r.imp);
    $('#ris-iva').textContent = euro.format(iva);
    const boxSconto = $('#ris-sconto');
    dati.sconto = false;
    if ($('#primo').checked) {
      const tuttiTV = luoghi.slice(1).every((l) => /treviso/i.test(l.provincia || ''));
      dati.sconto = tuttiTV;
      boxSconto.innerHTML = tuttiTV
        ? 'Primo trasporto in provincia di Treviso: <strong>−20%</strong>, cioè <strong>' + euro.format(r.imp * 0.8) + ' + IVA</strong> (' + euro.format(tot * 0.8) + ' IVA inclusa). Ricordacelo nel messaggio.'
        : 'Lo sconto del 20% sul primo trasporto vale per le destinazioni in provincia di Treviso.';
      boxSconto.hidden = false;
    } else boxSconto.hidden = true;
    let nota = 'Stima indicativa e non vincolante, calcolata sul giro completo dalla nostra base (' + BASI[M.base].nome + ') con le tariffe del listino. ';
    if (r.minimo) nota += 'Per questo giro vale il minimo di 35 € + IVA. ';
    nota += approssimato ? 'Il servizio dei percorsi non ha risposto: i km sono stimati in linea d’aria. ' : 'I chilometri vengono da OpenStreetMap e possono scostarsi un po’ dal percorso reale. ';
    nota += 'Il prezzo definitivo te lo confermiamo noi.';
    $('#ris-nota').textContent = nota;
    $('#ris-wa').href = 'https://wa.me/' + TEL + '?text=' + encodeURIComponent(messaggioWa());
    if (eMobile()) $('#prev-risultato').scrollIntoView({ behavior: ridotto ? 'auto' : 'smooth', block: 'start' });
    const mappa = await mappaRisultato();
    if (mappa) {
      const tappe = luoghi.map((l) => ({ lon: l.lon, lat: l.lat, nome: l.breve }));
      const ok = mappa.mostraGiro(linea, tappe, M.base === 'candelu');
      if (!ok) $('#ris-nota').textContent = nota + ' Il giro esce dalla mappa del Veneto, ma il prezzo è calcolato sul percorso intero.';
    }
  }
  // il messaggio segue le scelte fatte dopo il calcolo (data, temperatura, primo trasporto)
  form.addEventListener('change', () => { if (ultimo) $('#ris-wa').href = 'https://wa.me/' + TEL + '?text=' + encodeURIComponent(messaggioWa()); });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errore('');
    const campi = [$('#ritiro'), ...$$('input', consegne)];
    const vuoto = campi.find((i) => !i.value.trim());
    if (vuoto) { errore(vuoto.id === 'ritiro' ? 'Scrivi l’indirizzo del ritiro.' : 'Scrivi l’indirizzo della consegna.'); vuoto.focus(); return; }
    btnCalcola.setAttribute('aria-busy', 'true'); btnCalcola.textContent = 'Calcolo in corso…';
    try {
      const luoghi = await Promise.all(campi.map((i) => risolvi(i).catch(() => null)));
      const manca = luoghi.findIndex((l) => !l);
      if (manca >= 0) { errore('Non troviamo “' + campi[manca].value.trim() + '”. Prova ad aggiungere la città.'); campi[manca].focus(); return; }
      const M = MODI[modo], base = BASI[M.base];
      const giro = [base, ...luoghi, base];
      let km, linea, approssimato = false;
      try { ({ km, linea } = await percorso(giro)); }
      catch (err) { km = stimaKm(giro); linea = giro.map((p) => [p.lon, p.lat]); approssimato = true; }
      await mostraRisultato({ M, luoghi, km, linea, r: M.prezzo(km, quanti), approssimato });
    } catch (err) {
      console.warn(err);
      errore('Il calcolo non è riuscito. Riprova tra poco o scrivici su WhatsApp.');
    } finally {
      btnCalcola.removeAttribute('aria-busy'); btnCalcola.textContent = 'Calcola il prezzo';
    }
  });
})();
