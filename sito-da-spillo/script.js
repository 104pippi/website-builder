/* Pizzeria da Spillo — interazioni della demo */
(() => {
  'use strict';
  const doc = document.documentElement;
  doc.classList.add('js');
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const ridotto = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));

  /* ---------- Orari e stato "aperta ora" (ora di Roma) ---------- */
  const SERA = [[1830, 2330]];
  const DUE = [[1200, 1430], [1830, 2330]];
  // indice giorno: 0 domenica … 6 sabato
  const ORARI = {
    felissent: { 0: DUE, 1: [], 2: SERA, 3: SERA, 4: SERA, 5: DUE, 6: DUE },
    mazzini: { 0: DUE, 1: [], 2: SERA, 3: SERA, 4: SERA, 5: DUE, 6: DUE },
    preganziol: { 0: SERA, 1: [[1830, 2300]], 2: [], 3: SERA, 4: SERA, 5: SERA, 6: SERA }
  };
  const GIORNI = ['domenica', 'lunedì', 'martedì', 'mercoledì', 'giovedì', 'venerdì', 'sabato'];
  const hhmm = (n) => `${Math.floor(n / 100)}:${String(n % 100).padStart(2, '0')}`;

  function oraRoma() {
    try {
      const parti = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Rome', weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date());
      const v = Object.fromEntries(parti.map((p) => [p.type, p.value]));
      const g = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(v.weekday);
      return { g, m: parseInt(v.hour, 10) * 100 + parseInt(v.minute, 10) };
    } catch (e) {
      const d = new Date();
      return { g: d.getDay(), m: d.getHours() * 100 + d.getMinutes() };
    }
  }

  function stato(sede) {
    const { g, m } = oraRoma();
    const oggi = ORARI[sede][g];
    for (const [a, b] of oggi) {
      if (m >= a && m < b) return { aperta: true, testo: `Aperta ora, chiude alle ${hhmm(b)}` };
    }
    const dopo = oggi.find(([a]) => a > m);
    if (dopo) {
      const giaAperta = oggi.some(([, b]) => b <= m);
      return { aperta: false, testo: `${giaAperta ? 'Riapre' : 'Apre'} oggi alle ${hhmm(dopo[0])}` };
    }
    for (let k = 1; k <= 7; k++) {
      const gg = (g + k) % 7;
      const fasce = ORARI[sede][gg];
      if (fasce.length) {
        const quando = k === 1 ? 'domani' : GIORNI[gg];
        return { aperta: false, testo: `Chiusa ora, apre ${quando} alle ${hhmm(fasce[0][0])}` };
      }
    }
    return { aperta: false, testo: 'Chiusa' };
  }

  function aggiornaStati() {
    $$('[data-stato]').forEach((el) => {
      const s = stato(el.dataset.stato);
      el.classList.toggle('is-aperta', s.aperta);
      el.innerHTML = `<span class="stato-punto" aria-hidden="true"></span>${s.testo}`;
    });
    const { g } = oraRoma();
    $$('.orari tr').forEach((tr) => tr.classList.toggle('is-oggi', Number(tr.dataset.g) === g));
    const riep = $('[data-riepilogo]');
    if (riep) {
      const DI = { felissent: 'viale Felissent', mazzini: 'Borgo Mazzini', preganziol: 'Preganziol' };
      const a = Object.keys(ORARI).filter((k) => stato(k).aperta).map((k) => DI[k]);
      const coda = ' Chiama la più vicina e prenota il tavolo.';
      if (a.length === 3) riep.textContent = 'Adesso sono aperte tutte e tre le pizzerie.' + coda;
      else if (a.length === 2) riep.textContent = `Adesso sono aperte le pizzerie di ${a[0]} e di ${a[1]}.` + coda;
      else if (a.length === 1) riep.textContent = `Adesso è aperta la pizzeria di ${a[0]}.` + coda;
      else riep.textContent = 'Scegli la pizzeria più vicina e chiama per prenotare il tavolo.';
    }
  }
  aggiornaStati();
  setInterval(aggiornaStati, 60000);

  /* ---------- Testata, barra mobile, menu mobile ---------- */
  const testata = $('[data-testata]');
  const barra = $('[data-barra]');
  const hero = $('[data-hero]');
  const burger = $('[data-burger]');
  const menuMobile = $('[data-menu-mobile]');

  function apriMenu(apri) {
    burger.setAttribute('aria-expanded', String(apri));
    menuMobile.hidden = !apri;
    document.body.style.overflow = apri ? 'hidden' : '';
    testata.classList.toggle('is-pieno', apri || scrollY > 30);
  }
  burger.addEventListener('click', () => apriMenu(menuMobile.hidden));
  menuMobile.addEventListener('click', (e) => { if (e.target.closest('a')) apriMenu(false); });

  /* ---------- Foglio "Prenota un tavolo" ---------- */
  const foglio = $('[data-foglio]');
  $$('[data-prenota]').forEach((b) => b.addEventListener('click', () => {
    aggiornaStati();
    if (!menuMobile.hidden) apriMenu(false);
    if (typeof foglio.showModal === 'function') foglio.showModal();
    else foglio.setAttribute('open', '');
  }));
  $('[data-chiudi]', foglio).addEventListener('click', () => foglio.close());
  foglio.addEventListener('click', (e) => { if (e.target === foglio) foglio.close(); });

  /* ---------- Menù ---------- */
  // [nome, ingredienti, prezzo Treviso (Felissent e Borgo Mazzini), prezzo Preganziol]
  // null = non c'è in quella pizzeria; array = due formati (piccola / media)
  const SQ = 's.q.';
  const MENU = [
    { id: 'tradizionali', nome: 'Tradizionali', voci: [
      ['4 Stagioni', 'pomodoro, fior di latte, prosciutto cotto, carciofi, salamino piccante, funghi', 11, 9.5],
      ['Bufala', 'pomodoro, mozzarella di bufala', 10, 9.5],
      ['Cafona', 'pomodoro, mozzarella di bufala affumicata, pancetta stufata', 12, 10.5],
      ['Calzone', 'pomodoro, fior di latte, prosciutto cotto, funghi', 10, 9.5],
      ['Capricciosa', 'pomodoro, fior di latte, prosciutto cotto, carciofi, funghi', 10, 9.5],
      ['Carciofi', 'pomodoro, fior di latte, carciofi', 9, 8.5],
      ['Cosacca', 'pomodoro, parmigiano', 6.5, 6.5],
      ['Diavola', 'pomodoro, fior di latte, salamino piccante', 9, 8.5],
      ['Fresca', 'pomodoro, fior di latte, ciliegino, brie', 10, 9.5],
      ['Funghi', 'pomodoro, fior di latte, funghi', 9, 8.5],
      ['Gorgonzola', 'pomodoro, fior di latte, gorgonzola', 9, 8.5],
      ['Gustosa', 'pomodoro, fior di latte, tonno, cipolla', 10, 9.5],
      ['Margherita', 'pomodoro, fior di latte', 8, 7],
      ['Marinara', 'pomodoro, aglio, origano', 6, 6],
      ['Napoletana', 'pomodoro, aglio, acciughe, origano', 8, 7.5],
      ['Parma', 'pomodoro, fior di latte, prosciutto crudo di Parma', 11, 9.5],
      ['Parmigiana', 'pomodoro, fior di latte, melanzane grigliate', 9, 8.5],
      ['Peperoni', 'pomodoro, fior di latte, peperoni', 9, 8.5],
      ['Porchetta', 'pomodoro, fior di latte, porchetta', 10, 9.5],
      ['Americana', 'pomodoro, fior di latte, wurstel, patate fritte*', 11, 10],
      ['Patatosa', 'pomodoro, fior di latte, patate fritte*', 10, 9.5],
      ['Prosciutto', 'pomodoro, fior di latte, prosciutto cotto', 9, 8.5],
      ['Prosciutto e funghi', 'pomodoro, fior di latte, prosciutto cotto, funghi', 10, 9],
      ['Cipolla', 'pomodoro, fior di latte, cipolla', 9, 8.5],
      ['Ripieno (calzone)', 'pomodoro, fior di latte, ricotta, salamino piccante', 11, 9.5],
      ['Romana', 'pomodoro, fior di latte, acciughe', 9, 8.5],
      ['Rucola e grana', 'pomodoro, fior di latte, rucola, scaglie di grana', 10, 9.5],
      ['Salsicciona', 'pomodoro, fior di latte, salsiccia', 9, 8.5],
      ['Siciliana', 'pomodoro, fior di latte, acciughe, olive nere, capperi', 10, 9.5],
      ['Speck', 'pomodoro, fior di latte, speck', 10, 9.5],
      ['Tirolese', 'pomodoro, fior di latte, funghi, speck', 11, 10.5],
      ['Tonno', 'pomodoro, fior di latte, tonno', 9, 8.5],
      ['Wurstel', 'pomodoro, fior di latte, wurstel', 9, 8.5],
      ['Radicchio', 'pomodoro, fior di latte, radicchio (solo in stagione)', 9, 8.5],
      ['Radicchio e porcini', 'pomodoro, fior di latte, porcini, radicchio (solo in stagione)', 11, 10],
      ['Gamberetti e rucola', 'pomodoro, fior di latte, gamberetti, rucola', 11, 9.5]
    ] },
    { id: 'bianche', nome: 'Bianche', voci: [
      ['Datterino giallo', 'datterino giallo, mozzarella di bufala, olio evo', 11, 10],
      ['Serena', 'datterino giallo, pesto alla genovese DOP, bufala affumicata, olio evo', 12, 11],
      ['Luciano', 'datterino giallo, fior di latte, olive, acciughe, olio evo', 12, 11.5],
      ['Amalfi', 'ciliegino, mozzarella di bufala affumicata', 10, 9.5],
      ['4 Formaggi', 'fior di latte, formaggi misti', 10, 9.5],
      ['Filetto', 'ciliegino, mozzarella di bufala', 10, 9.5],
      ['Fior di carciofi', 'ciliegino, fior di latte, carciofi, capperi, olive nere', 12, 10.5],
      ['Margherita DOP', 'mozzarella di bufala DOP, pomodorini del Piennolo del Vesuvio DOP, olio evo', 12, 11],
      ['Marinara bianca', 'aglio, origano, olio', 5, 5],
      ['Oro', 'ciliegino, fior di latte, tonno, olive nere', 10, 9.5],
      ['Porcini', 'ciliegino, fior di latte, porcini', 10, 9.5],
      ['Mare e monti', 'fior di latte, tonno, carciofi', 10, 9.5],
      ['Saporita', 'ciliegino, fior di latte, funghi, porchetta', 11, 10.5],
      ['Verdure', 'ciliegino, fior di latte, verdure miste fresche: peperoni, melanzane, zucchine', 10, 9.5],
      ['Zucchine', 'fior di latte, zucchine', 9, 8.5],
      ['Spillo', 'fior di latte, salsiccia, porcini', 11, 9.5],
      ['Estiva', 'ciliegino, fior di latte, pesto alla genovese', 10, 9.5],
      ['Salsiccia e friarielli', 'fior di latte, salsiccia, friarielli (solo in stagione)', 11, 10.5],
      ['Paola', 'fior di latte, tonno, porcini, olive nere', 11, 10.5],
      ['Sophie', 'fior di latte, pomodori confit, rucola, grana', 12, 10],
      ['Scarola', 'fior di latte, scarola, olive nere, capperi, acciughe', 11, 10.5],
      ['Mortadella e pistacchio', 'fior di latte, mortadella, pesto di pistacchio', 12, 11]
    ] },
    { id: 'scelte', nome: 'Le scelte', voci: [
      ['Norma', 'pomodoro, fior di latte, melanzane fritte, ricotta affumicata', 10, 9.5],
      ['Del giorno', 'pomodoro, melanzane fritte, mozzarella di bufala affumicata', 11, 10.5],
      ['Spianata', 'pomodoro, fior di latte, spianata calabra', 11, 9.5],
      ['Calabria', 'pomodoro, fior di latte, capperi, olive nere, pomodori secchi', 10, 9.5],
      ['Rodolfo', 'margherita con il bordo ripieno di ricotta, creata dal papà di Beppe, Rodolfo Sorbillo', 11, 10]
    ] },
    { id: 'fritte', nome: 'Pizze fritte', voci: [
      ['Napoletana', 'pomodoro, fior di latte, ricotta, cicoli (pancetta), pepe', 10, 9],
      ['Classica', 'pomodoro, fior di latte, prosciutto cotto', 9, 8],
      ['Pugliese', 'pomodoro, fior di latte, olive nere', 8, 8],
      ['Farcita', 'pomodoro, fior di latte, ricotta, salamino piccante', 10, 9],
      ['Montanara', 'base fritta, pomodoro, fior di latte, parmigiano, basilico', 9, 8],
      ['Cetara', 'pomodoro, fior di latte, acciughe', 8, 8]
    ] },
    { id: 'panozzi', nome: 'Panozzi', voci: [
      ['Semplice', 'ciliegino, fior di latte, basilico, origano', 9, 8.5],
      ['Sottobosco', 'ciliegino, fior di latte, porchetta, funghi', 11, 9.5],
      ['Montanaro', 'ciliegino, fior di latte, speck, funghi', 11, 9.5],
      ['Emiliano', 'ciliegino, fior di latte, prosciutto crudo di Parma, rucola', 11, 9.5],
      ['Vegetariano', 'ciliegino, fior di latte, verdure miste: peperoni, zucchine, melanzane', 10, 9.5],
      ['Jimmi', 'ciliegino, fior di latte, melanzane grigliate, prosciutto crudo di Parma', 11, 9.5],
      ['Americano', 'wurstel, patate fritte*, lattuga', 10, 9.5],
      ['Salsiccia e friarielli', 'fior di latte, salsiccia, friarielli (solo in stagione)', 11, 9.5],
      ['Goloso', 'ciliegino, mozzarella di bufala affumicata, pancetta stufata', 11, 9.5],
      ['Fantasia', 'ingredienti a scelta', SQ, SQ],
      ['Ciccio', 'fior di latte, salsiccia, funghi', 10, 9.5],
      ['Buono', 'ciliegino, fior di latte, tonno, olive nere', 10, 9.5],
      ['Gianni', 'fior di latte, salsiccia, peperoni', 10, 9.5]
    ] },
    { id: 'antipasti', nome: 'Antipasti e contorni', voci: [
      ['Antipasto della casa', 'misto fritto napoletano', 7, 7],
      ['Bruschetta', '2 pezzi, ingredienti a fantasia', 5, 4],
      ['Prosciutto crudo di Parma', '', 10, 9],
      ['Prosciutto crudo di Parma e mozzarella di bufala', '', 12, 10],
      ['Montanarine fritte', '2 pizzette fritte con pomodoro, parmigiano e basilico', 5, 4],
      ['Insalata mista', 'insalata, carote, ciliegino', 4, null],
      ['Zucchine ai ferri', '', 5, 4.5],
      ['Melanzane ai ferri', '', 5, 4.5],
      ['Peperoni ai ferri', '', 5, 4.5],
      ['Verdure miste ai ferri', '', 6, 5.5],
      ['Olive ascolane*', '', 5, 4.5],
      ['Verdure pastellate*', '', 5.5, 5.5],
      ['Patatine fritte*', '', 5, 4],
      ['Piatto unico', '', '13,00–14,00', null]
    ] },
    { id: 'insalatone', nome: 'Insalatone', solo: ['felissent'], nota: 'Base: insalata, ciliegino, carote.', voci: [
      ['Spillo', 'insalata mista, arancia, mais, scaglie di grana', 10, null],
      ['Mare Magnum', 'insalata mista, gamberetti, tonno, olive', 10, null],
      ['Parigina', 'insalata mista, pancetta calda, uova sode, crostini, vinaigrette', 12, null],
      ['Greca', 'insalata mista, tonno, olive, feta greca', 10, null],
      ['Contadina', 'insalata mista, pere, noci, montasio', 10, null],
      ['Caprese', 'bufala, pomodorini', 10, null],
      ['Fantasia', 'ingredienti a scelta', SQ, null]
    ] },
    { id: 'dolci', nome: 'Dolci', voci: [
      ['Tiramisù', 'fatto in casa', 6, 6],
      ['Babà', 'fatto in casa', 6, 6],
      ['Pastiera napoletana', 'fatta in casa', 6, 6],
      ['Delizia al limone', '', 6, 6],
      ['Cannolo siciliano con ricotta', '', 4, 4],
      ['Panna cotta', '', 6, 6],
      ['Semifreddi', '', 5.5, 5.5],
      ['Tartufo', '', 5.5, 5.5],
      ['Tartufo affogato al caffè', '', 6, 6],
      ['Tartufo affogato al liquore', '', 7, 7]
    ] },
    { id: 'bevande', nome: 'Bevande', voci: [
      ['Acqua minerale', 'bottiglia da 0,5 l', 2, 2],
      ['Pepsi Cola alla spina', 'piccola / media', [3.5, 5], [3.5, 4.5]],
      ['Pepsi Cola, Fanta', 'lattina da 0,33 l', 3.5, 3.5],
      ['Pepsi Cola, Pepsi Zero', 'bottiglia da 0,5 l', 5, 4.5],
      ['Stella Artois alla spina', 'bionda, piccola 0,20 l / media 0,40 l', [3.5, 6], [3.5, 5.5]],
      ['Leffe Rouge alla spina', 'rossa, piccola 0,20 l / media 0,40 l', [3.5, 6], [3.5, 6]],
      ['Franziskaner alla spina', 'weizen, piccola 0,20 l / media 0,40 l', [3.5, 6], [3.5, 5.5]],
      ['Birra artigianale non filtrata', 'bionda o rossa, bottiglia da 0,5 l', 7, 7],
      ['Vino della casa', 'bianco o rosso, ¼ di litro', 3, 3],
      ['Prosecco', 'bottiglia da 0,75 l', null, 14],
      ['Altri vini in bottiglia', '', SQ, SQ],
      ['Spritz', 'Aperol, Campari, Select o Cynar', 4, 3.5],
      ['Hugo', '', 4, 3],
      ['Caffè', 'normale / corretto', [1.5, 2], [1.5, 2]],
      ['Sgroppino', '', 2.5, 2.5],
      ['Amari e grappe', '', 4, [3.5, SQ]],
      ['Superalcolici riserva invecchiati', '', null, 4.5]
    ] }
  ];
  const NOTE_SEDE = {
    felissent: 'Aggiunte € 2,00. Affettati € 3,00. Bordo ripieno € 3,00. Burrata € 3,00. Doppio impasto € 2,00. Salsa di pomodoro € 1,00.',
    mazzini: 'Aggiunte € 2,00. Affettati € 3,00. Bordo ripieno € 3,00. Burrata € 3,00. Doppio impasto € 2,00. Salsa di pomodoro € 1,00.',
    preganziol: 'Aggiunte di gamberetti, porcini, affettati e mozzarella di bufala € 2,00. Salsa di pomodoro € 0,50. Burratina € 2,50.'
  };
  const PDF = {
    felissent: ['assets/menu/menu-spillo-viale-felissent.pdf', 'viale Felissent'],
    mazzini: ['assets/menu/menu-spillo-borgo-mazzini.pdf', 'Borgo Mazzini'],
    preganziol: ['assets/menu/menu-spillo-preganziol.pdf', 'Preganziol']
  };
  const PRIMI = 8;

  const eur = (v) => (typeof v === 'number' ? v.toFixed(2).replace('.', ',') : v);
  const fmtPrezzo = (p) => (Array.isArray(p) ? p.map(eur).join(' / ') : eur(p));
  const norm = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  let sede = 'felissent';
  try { sede = localStorage.getItem('spillo-sede') || 'felissent'; } catch (e) { /* niente */ }
  if (!ORARI[sede]) sede = 'felissent';
  let categoria = 'tradizionali';
  let tutto = false;
  let query = '';

  const elCat = $('[data-categorie]');
  const elLista = $('[data-lista]');
  const elAltro = $('[data-altro]');
  const elCerca = $('[data-cerca]');
  const elNote = $('[data-note-sede]');
  const elPdf = $('[data-pdf]');

  const prezzoDi = (v) => (sede === 'preganziol' ? v[3] : v[2]);
  const catVisibili = () => MENU.filter((c) => (!c.solo || c.solo.includes(sede)) && c.voci.some((v) => prezzoDi(v) !== null));
  const vociDi = (c) => c.voci.filter((v) => prezzoDi(v) !== null);

  function evidenzia(testo, q) {
    if (!q) return esc(testo);
    const n = norm(testo);
    const i = n.indexOf(q);
    if (i < 0) return esc(testo);
    return esc(testo.slice(0, i)) + '<mark>' + esc(testo.slice(i, i + q.length)) + '</mark>' + esc(testo.slice(i + q.length));
  }

  function voceHTML(v, k, cat) {
    const p = prezzoDi(v);
    return `<div class="voce" style="--k:${Math.min(k, 14)}">
      <div class="voce__riga"><span class="voce__nome">${evidenzia(v[0], query)}</span><span class="voce__punti" aria-hidden="true"></span><span class="voce__prezzo">${p === SQ ? 's.q.' : '€ ' + fmtPrezzo(p)}</span></div>
      ${v[1] ? `<p class="voce__desc">${evidenzia(v[1], query)}</p>` : ''}
      ${cat ? `<p class="voce__cat">${cat}</p>` : ''}
    </div>`;
  }

  function disegnaCategorie() {
    const cats = catVisibili();
    if (!cats.some((c) => c.id === categoria)) categoria = cats[0].id;
    elCat.innerHTML = cats.map((c) => `<button type="button" role="tab" aria-selected="${c.id === categoria && !query}" data-cat="${c.id}">${c.nome}<span>${vociDi(c).length}</span></button>`).join('');
  }

  function disegnaLista() {
    if (query) {
      const trovate = [];
      catVisibili().forEach((c) => vociDi(c).forEach((v) => {
        if (norm(v[0]).includes(query) || norm(v[1]).includes(query)) trovate.push([v, c.nome]);
      }));
      elLista.innerHTML = trovate.length
        ? trovate.map(([v, n], k) => voceHTML(v, k, n)).join('')
        : `<p class="menu__vuoto">Nessuna voce con “${esc(elCerca.value.trim())}”. Prova con un altro ingrediente, per esempio bufala o salsiccia.</p>`;
      elAltro.hidden = true;
      return;
    }
    const c = MENU.find((x) => x.id === categoria);
    const voci = vociDi(c);
    const mostra = tutto ? voci : voci.slice(0, PRIMI);
    elLista.innerHTML = (c.nota ? `<p class="voce__desc" style="grid-column:1/-1;margin-bottom:6px">${c.nota}</p>` : '') + mostra.map((v, k) => voceHTML(v, k)).join('');
    elAltro.hidden = voci.length <= PRIMI;
    elAltro.textContent = tutto ? 'Mostra meno' : `Mostra tutte le ${voci.length} voci di “${c.nome}”`;
  }

  function disegnaSede() {
    $$('[data-sede-btn]').forEach((b) => b.setAttribute('aria-checked', String(b.dataset.sedeBtn === sede)));
    elNote.textContent = NOTE_SEDE[sede];
    elPdf.href = PDF[sede][0];
    elPdf.textContent = `Scarica il menù in PDF di ${PDF[sede][1]}`;
  }

  function disegnaMenu() { disegnaSede(); disegnaCategorie(); disegnaLista(); }

  $$('[data-sede-btn]').forEach((b) => b.addEventListener('click', () => {
    sede = b.dataset.sedeBtn;
    try { localStorage.setItem('spillo-sede', sede); } catch (e) { /* niente */ }
    disegnaMenu();
  }));
  // frecce sinistra/destra nel gruppo delle pizzerie
  $('[data-sede-scelta]').addEventListener('keydown', (e) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    const ids = Object.keys(ORARI);
    sede = ids[(ids.indexOf(sede) + (e.key === 'ArrowRight' ? 1 : 2)) % 3];
    disegnaMenu();
    $(`[data-sede-btn="${sede}"]`).focus();
  });
  elCat.addEventListener('click', (e) => {
    const b = e.target.closest('[data-cat]');
    if (!b) return;
    categoria = b.dataset.cat; tutto = false; query = ''; elCerca.value = '';
    disegnaCategorie(); disegnaLista();
  });
  elAltro.addEventListener('click', () => {
    tutto = !tutto; disegnaLista();
    if (!tutto) elCat.scrollIntoView({ block: 'nearest', behavior: ridotto ? 'auto' : 'smooth' });
  });
  let tCerca;
  elCerca.addEventListener('input', () => {
    clearTimeout(tCerca);
    tCerca = setTimeout(() => { query = norm(elCerca.value.trim()); disegnaCategorie(); disegnaLista(); }, 120);
  });
  $$('[data-vai-categoria]').forEach((a) => a.addEventListener('click', () => {
    categoria = a.dataset.vaiCategoria; tutto = true; query = ''; elCerca.value = '';
    disegnaCategorie(); disegnaLista();
  }));
  disegnaMenu();

  /* ---------- Mappa: una sola iframe, tre pizzerie ---------- */
  const MAPPE = {
    felissent: 'Pizzeria Ristorantino da Spillo, Viale G. G. Felissent 18, 31100 Treviso',
    mazzini: 'Da Spillo, Borgo Giuseppe Mazzini 20, 31100 Treviso',
    preganziol: 'Pizzeria da Spillo, Via Gorizia 22, 31022 Preganziol'
  };
  const frame = $('[data-mappa-frame]');
  $$('[data-mappa]').forEach((b) => b.addEventListener('click', () => {
    $$('[data-mappa]').forEach((x) => x.setAttribute('aria-selected', String(x === b)));
    frame.src = `https://www.google.com/maps?q=${encodeURIComponent(MAPPE[b.dataset.mappa])}&output=embed`;
  }));

  /* ---------- Anno ---------- */
  const anno = $('[data-anno]');
  if (anno) anno.textContent = String(new Date().getFullYear());

  /* ---------- Intro: il titolo si stende come la pasta ---------- */
  const righe = $$('[data-riga]');
  const titolo = $('[data-stendi]');
  // ogni riga del titolo riempie esattamente la colonna, a larghezza del carattere 100%
  function adattaTitolo() {
    const W = titolo.clientWidth;
    if (!W) return;
    righe.forEach((r, i) => {
      const prima = [r.style.fontStretch, r.style.letterSpacing];
      r.style.fontStretch = '100%'; r.style.letterSpacing = '-0.015em'; r.style.fontSize = '100px';
      const w = r.getBoundingClientRect().width;
      const max = i === 0 ? 168 : 120;
      r.style.fontSize = Math.min(max, (W / w) * 100 * 0.985).toFixed(2) + 'px';
      r.style.fontStretch = prima[0]; r.style.letterSpacing = prima[1];
    });
  }
  // "fritta" si gonfia fino a peso 900 e larghezza 120%: la misura massima deve stare nella colonna
  const parolaFritta = $('[data-gonfia]');
  function adattaFritta() {
    if (!parolaFritta) return;
    const box = parolaFritta.parentElement.clientWidth;
    const st = parolaFritta.style;
    const prima = [st.getPropertyValue('--g-peso'), st.getPropertyValue('--g-larg')];
    st.setProperty('--g-peso', '900'); st.setProperty('--g-larg', '120%'); st.fontSize = '100px'; st.width = 'max-content';
    const w = parolaFritta.getBoundingClientRect().width;
    st.fontSize = Math.min(272, (box / w) * 100 * 0.97).toFixed(1) + 'px'; st.width = '';
    st.setProperty('--g-peso', prima[0] || '860'); st.setProperty('--g-larg', prima[1] || '118%');
  }
  let tAdatta;
  addEventListener('resize', () => { clearTimeout(tAdatta); tAdatta = setTimeout(() => { adattaTitolo(); adattaFritta(); }, 80); });
  function stendi() {
    adattaTitolo();
    adattaFritta();
    if (ridotto) { righe.forEach((r) => { r.style.fontStretch = '100%'; r.style.opacity = '1'; }); doc.classList.add('pronto'); return; }
    const t0 = performance.now();
    const DUR = 1350;
    // la pasta si apre: parte stretta (50%), supera appena la misura e si assesta a 100%
    const apri = (t) => { const s = 1.25, c = s + 1; return 1 + c * Math.pow(t - 1, 3) + s * Math.pow(t - 1, 2); };
    function passo() {
      const now = performance.now();
      let fine = true;
      righe.forEach((r, i) => {
        const t = clamp((now - t0 - 120 - i * 150) / DUR, 0, 1);
        if (t < 1) fine = false;
        const k = t <= 0 ? 0 : apri(t);
        r.style.fontStretch = (50 + 50 * k).toFixed(1) + '%';
        r.style.letterSpacing = ((1 - Math.min(1, k)) * 0.05 - 0.015).toFixed(3) + 'em';
        r.style.opacity = String(clamp(t * 5));
      });
      if (!fine) requestAnimationFrame(passo);
      else righe.forEach((r) => { r.style.fontStretch = '100%'; r.style.letterSpacing = ''; });
    }
    requestAnimationFrame(passo);
    setTimeout(() => doc.classList.add('pronto'), 120);
  }
  let partito = false;
  const via = () => { if (partito) return; partito = true; stendi(); };
  if (document.fonts && document.fonts.load) {
    Promise.race([
      Promise.all([document.fonts.load('900 100px Anybody'), document.fonts.load('400 20px Newsreader')]).catch(() => {}),
      new Promise((r) => setTimeout(r, 1400))
    ]).then(via);
  } else via();
  setTimeout(via, 2000);

  /* ---------- Scroll: un solo ciclo per tutti gli effetti ---------- */
  const linea = $('[data-linea]');
  const passi = $$('[data-inclina]');
  const gonfia = $('[data-gonfia]');
  const fritta = $('[data-fritta]');
  const fascia = $('[data-fascia]');
  const fasciaImg = fascia ? $('img', fascia) : null;
  let inCoda = false;

  function aggiornaScroll() {
    inCoda = false;
    const vh = innerHeight;
    const y = scrollY;
    testata.classList.toggle('is-pieno', y > 30 || !menuMobile.hidden);
    if (barra) barra.classList.toggle('is-su', y > Math.min(hero.offsetHeight * 0.55, 420));
    if (ridotto) return;

    if (linea) {
      const r = linea.getBoundingClientRect();
      linea.style.setProperty('--p', clamp((vh * 0.8 - r.top) / (r.height + vh * 0.25)).toFixed(3));
    }
    passi.forEach((p) => {
      const r = p.getBoundingClientRect();
      const t = clamp((vh * 0.98 - r.top) / (vh * 0.55));
      const e = 1 - Math.pow(1 - t, 3);
      p.firstElementChild.style.setProperty('--i', (1 - e).toFixed(3));
    });
    if (gonfia && fritta) {
      const r = fritta.getBoundingClientRect();
      const t = clamp((vh - r.top) / (vh * 0.9));
      const e = t * t * (3 - 2 * t);
      gonfia.style.setProperty('--g-peso', String(Math.round(300 + 600 * e)));
      gonfia.style.setProperty('--g-larg', (62 + 58 * e).toFixed(1) + '%');
    }
    if (fasciaImg) {
      const r = fascia.getBoundingClientRect();
      if (r.bottom > 0 && r.top < vh) {
        const t = (r.top + r.height / 2 - vh / 2) / vh;
        fasciaImg.style.setProperty('--sp', (t * -70).toFixed(1) + 'px');
      }
    }
  }
  const chiedi = () => { if (!inCoda) { inCoda = true; requestAnimationFrame(aggiornaScroll); } };
  addEventListener('scroll', chiedi, { passive: true });
  addEventListener('resize', chiedi);
  aggiornaScroll();
  if (!ridotto) {
    // stato iniziale coerente prima del primo scroll
    passi.forEach((p) => p.firstElementChild.style.setProperty('--i', '1'));
    aggiornaScroll();
  }

  /* ---------- Rivelazioni mirate ---------- */
  const daRivelare = $$('.storia__foto, .feste__foto, .citazione--grande');
  if ('IntersectionObserver' in window && !ridotto) {
    daRivelare.forEach((el) => el.setAttribute('data-rivela', ''));
    const io = new IntersectionObserver((voci) => voci.forEach((v) => {
      if (v.isIntersecting) { v.target.classList.add('is-dentro'); io.unobserve(v.target); }
    }), { rootMargin: '0px 0px -12% 0px' });
    daRivelare.forEach((el) => io.observe(el));
  }

  /* ---------- Scena 3D: lo spillo del logo (dopo il caricamento) ---------- */
  const canvas = $('[data-scena]');
  function webglOk() {
    try {
      const c = document.createElement('canvas');
      return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl')));
    } catch (e) { return false; }
  }
  function carica3d() {
    if (!canvas || !webglOk()) return;
    import('./3d.js').then((m) => m.avvia(canvas, hero, { ridotto })).catch((e) => console.warn('3D non disponibile', e));
  }
  if (document.readyState === 'complete') setTimeout(carica3d, 60);
  else addEventListener('load', () => setTimeout(carica3d, 60), { once: true });
})();
