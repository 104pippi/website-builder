(() => {
  'use strict';

  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const ridotto = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const puntatoreFine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const euro = new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' });
  const soldi = (n) => euro.format(n);
  const limita = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  /* ---------- menù (dal menù cartaceo Da Matteo) ---------- */
  const PF = 'Pomodoro di San Marzano, fior di latte di Roncade';
  const FL = 'Fior di latte di Roncade';
  const CATEGORIE = [
    { id: 'classiche', nome: 'Classiche', tipo: 'pizza', voci: [
      ['marinara', 'Marinara', 5, 'Pomodoro di San Marzano, aglio, origano, basilico, olio EVO', 1],
      ['margherita', 'Margherita', 6, PF + ', basilico', 1],
      ['bufalina', 'Bufalina DOP', 8, 'Pomodoro di San Marzano, mozzarella di bufala DOP, basilico', 1],
      ['siciliana', 'Siciliana', 8.5, PF + ', filetti di acciughe, capperi, olive leccino pugliesi, basilico'],
      ['capricciosa', 'Capricciosa', 8, PF + ', prosciutto cotto, funghi champignon, carciofini'],
      ['quattrostagioni', 'Quattro stagioni', 8.5, PF + ', prosciutto cotto, funghi champignon, carciofini, olive leccino pugliesi'],
      ['quattroformaggi', 'Quattro formaggi', 8.5, PF + ', gorgonzola DOP, brie, provola affumicata', 1],
      ['prosciuttofunghi', 'Prosciutto e funghi', 7.5, PF + ', prosciutto cotto, funghi champignon'],
      ['verdure', 'Verdure', 8, PF + ', verdure trifolate al forno (melanzane, zucchine, peperoni), basilico', 1],
      ['ciliegino', 'Ciliegino', 7, PF + ', pomodoro ciliegino a fine cottura, basilico', 1],
      ['diavola', 'Diavola', 7, PF + ', salamino piccante'],
      ['briezucchine', 'Brie e zucchine', 8, PF + ', brie, zucchine trifolate al forno', 1],
      ['parmigiana', 'Parmigiana', 8, PF + ', melanzane trifolate al forno, Grana Padano in cottura', 1],
      ['tonnocipolla', 'Tonno e cipolla', 8, PF + ', tonno, cipolla al forno'],
      ['wurstelpatate', 'Würstel e patate', 8, PF + ', würstel 100% suino, patate novelle al forno'],
      ['viennese', 'Viennese', 7, PF + ', würstel 100% suino'],
    ] },
    { id: 'consiglia', nome: 'Matteo consiglia', tipo: 'pizza', voci: [
      ['gorgonzolaspeck', 'Gorgonzola e speck', 8.5, PF + ', gorgonzola DOP, speck'],
      ['gorgonzolanoci', 'Gorgonzola e noci', 8.5, PF + ', gorgonzola DOP, noci', 1],
      ['salsicciannovelle', 'Salsiccia e novelle', 8.5, PF + ', salsiccia nostrana fresca, patate novelle al forno'],
      ['treviso', 'Treviso', 10.5, PF + ', casatella trevigiana DOP, porcini, porchetta trevigiana'],
      ['reginadelsud', 'Regina del Sud', 10, 'Pomodoro di San Marzano, mozzarella di bufala DOP, spianata calabra, pomodoro ciliegino a fine cottura'],
      ['rustica', 'Rustica', 9, PF + ', salsiccia nostrana fresca, peperoni trifolati al forno, cipolla al forno'],
      ['saporita', 'Saporita', 9, PF + ', melanzane trifolate al forno, salamino piccante, olive leccino pugliesi, cipolla al forno'],
      ['saporicampani', 'Sapori campani', 10.5, 'Pomodoro di San Marzano, mozzarella di bufala DOP, pomodori secchi, olive leccino pugliesi, basilico', 1],
      ['piccadolce', 'Piccadolce', 9.5, PF + ', brie, chiodini, salamino piccante'],
      ['ortolana', 'Ortolana', 9.5, PF + ', tonno, peperoni trifolati al forno, zucchine trifolate al forno, olive leccino pugliesi'],
      ['alberto', 'Alberto', 10.5, PF + ', mozzarella di bufala DOP, pomodoro ciliegino in cottura, porchetta trevigiana'],
      ['valtellina', 'Valtellina', 9.5, PF + ', bresaola, rucola, Grana Padano'],
    ] },
    { id: 'bianche', nome: 'Bianche', tipo: 'pizza', voci: [
      ['salsicciafriarielli', 'Salsiccia e friarielli', 10, FL + ', provola affumicata, salsiccia nostrana fresca, friarielli'],
      ['morlaccosopressa', 'Morlacco e sopressa', 10.5, FL + ', morlacco del Grappa, funghi champignon, sopressa trevigiana'],
      ['casatellasalmone', 'Casatella e salmone', 10.5, FL + ', casatella trevigiana DOP, zucchine trifolate al forno, salmone affumicato dopo cottura'],
      ['crudoburrata', 'Crudo e burrata', 10.5, FL + ', prosciutto crudo, burrata, zucchine trifolate al forno'],
      ['cottonovelle', 'Cotto e novelle', 9, FL + ', prosciutto cotto, olive leccino pugliesi, patate novelle al forno'],
      ['porcinisalsiccia', 'Porcini e salsiccia', 9, FL + ', porcini, salsiccia nostrana fresca, provola affumicata'],
      ['mortadellapistacchio', 'Mortadella e pistacchio', 10.5, FL + ', mozzarella di bufala DOP, mortadella, crema di pistacchio'],
      ['carbonara', 'La Carbonara', 9, FL + ', guanciale, uovo, pecorino romano, pepe nero'],
    ] },
    { id: 'incappucciate', nome: 'Incappucciate', tipo: 'speciale',
      intro: '<b>L\'originale pizza dei frati.</b> Una farcitura ricca e sfiziosa racchiusa tra due dischi di pasta sottile e croccante.', voci: [
      ['framartino', 'Frà Martino', 11, FL + ', insalata, prosciutto crudo, pomodoro ciliegino'],
      ['frapasquale', 'Frà Pasquale', 10, FL + ', verdure trifolate al forno (melanzane, zucchine, peperoni)', 1],
      ['franicolo', 'Frà Nicolò', 12, FL + ', morlacco del Grappa, porchetta trevigiana, peperoni trifolati al forno, cipolla al forno'],
      ['framatteo', 'Frà Matteo', 10.5, FL + ', brie, speck, pomodoro ciliegino'],
      ['fracristoforo', 'Frà Cristoforo', 10.5, FL + ', provola affumicata, salame, ricotta'],
      ['fragaldino', 'Frà Galdino', 11, FL + ', provola affumicata, salsiccia nostrana fresca, friarielli'],
      ['frabartolomeo', 'Frà Bartolomeo', 11.5, FL + ', stracciatella, mortadella, crema di pistacchio'],
      ['fracamillo', 'Frà Camillo', 10.5, FL + ', salmone affumicato, zucchine trifolate al forno'],
    ] },
    { id: 'schiacciate', nome: 'Schiacciate', tipo: 'speciale',
      intro: '<b>Leggere e croccanti.</b> Base pizza con ingredienti di prima qualità aggiunti fuori cottura.', voci: [
      ['amalfi', 'Amalfi', 10.5, 'Burrata, pomodoro ciliegino, filetti di acciughe, zest di limone'],
      ['positano', 'Positano', 10, 'Mozzarella di bufala DOP, pomodoro ciliegino, prosciutto crudo'],
      ['maiori', 'Maiori', 11, 'Stracciatella, salmone affumicato, zucchine trifolate al forno, pomodoro ciliegino'],
      ['praiano', 'Praiano', 10, 'Stracciatella, pomodoro ciliegino, olive leccino pugliesi, origano', 1],
      ['ravello', 'Ravello', 10, 'Burrata, mortadella, crema di pistacchio'],
      ['tramonti', 'Tramonti', 11, 'Feta greca, peperoni e cipolla al forno in cottura, pomodoro ciliegino, olive leccino pugliesi, menta', 1],
      ['furore', 'Furore', 11, 'Stracciatella, salmone affumicato, rucola, olive leccino pugliesi'],
    ] },
    { id: 'plant', nome: 'Plant based', tipo: 'pizza',
      intro: '<b>La linea plant based</b>, con mozzarella di riso e grattugiato vegano.', voci: [
      ['mandorla', 'Mandorla', 8.5, 'Pomodoro di San Marzano, cipolla al forno, patate novelle al forno. Fuori cottura: scaglie di mandorle', 1],
      ['ginestra', 'Ginestra', 11, 'Crema di pesto al basilico, mozzarella di riso, olive leccino pugliesi, pomodori secchi. Fuori cottura: noci', 1],
      ['gardenia', 'Gardenia', 11.5, 'Pomodoro di San Marzano, mozzarella di riso, pomodoro ciliegino, melanzane trifolate al forno, grattugiato vegano', 1],
      ['camelia', 'Camelia', 12, 'Mozzarella di riso, carciofini, friarielli, melanzane trifolate al forno. Fuori cottura: pomodori secchi, olive leccino pugliesi', 1],
    ] },
    { id: 'calzoni', nome: 'Calzoni', tipo: 'speciale', voci: [
      ['calzoneclassico', 'Calzone classico', 8, PF + ', prosciutto cotto, funghi champignon'],
      ['calzonenapoli', 'Calzone Napoli', 8.5, PF + ', ricotta, salame'],
      ['calzoneveg', 'Calzone vegetariano', 8, PF + ', verdure trifolate al forno (melanzane, zucchine, peperoni)', 1],
    ] },
    { id: 'metro', nome: 'Mezzo metro', tipo: 'metro',
      intro: '<b>Pizza party.</b> Crea la tua pizza a mezzo metro con un gusto o combinandone due. Consigliata per 2 persone, perfetta per le cene in famiglia o con gli amici.', voci: [
      ['metromargherita', 'Margherita mezzo metro', 15.5, PF + ', basilico. Per 2 persone', 1],
      ['metrogusti', 'Mezzo metro a due gusti', 15.5, 'Scegli uno o due gusti dal menù nel riepilogo. Il prezzo si calcola in base ai gusti scelti', 0, { da: true }],
    ] },
    { id: 'fritti', nome: 'Fritti e dolci', tipo: 'altro',
      intro: '<b>Specialità napoletane.</b> I fritti si preparano solo nella pizzeria di Carbonera.', voci: [
      ['frittatina', 'Frittatina di pasta', 3.5, 'Pasta mista, patate novelle, provola affumicata, pepe nero, Grana Padano', 1, { carbonera: true }],
      ['crocche', 'Crocchè di patate (2 pezzi)', 3.5, 'Patate novelle, fior di latte di Roncade, prosciutto cotto, Grana Padano', 0, { carbonera: true }],
      ['patatine', 'Patatine fritte', 4, 'Una vaschetta di patatine fritte', 1, { carbonera: true }],
      ['pastiera', 'L\'autentica pastiera napoletana', 4.5, 'Dolce partenopeo di pasta frolla con crema di grano, ricotta e canditi', 1],
    ] },
    { id: 'bevande', nome: 'Bevande', tipo: 'altro', voci: [
      ['acqua', 'Acqua 50 cl', 1, ''],
      ['lattina', 'Bibita in lattina', 2, ''],
      ['coca15', 'Coca-Cola 1,5 l', 3.5, ''],
      ['birra33', 'Birra 33 cl', 2, ''],
      ['birra66', 'Birra 66 cl', 3, ''],
    ] },
  ];
  const INDICE = {};
  CATEGORIE.forEach((c) => c.voci.forEach((v) => {
    INDICE[v[0]] = { id: v[0], nome: v[1], prezzo: v[2], ing: v[3], veg: !!v[4], extra: v[5] || {}, tipo: c.tipo, cat: c.id };
  }));
  const GUSTI = CATEGORIE.filter((c) => ['classiche', 'consiglia', 'bianche', 'plant'].includes(c.id)).flatMap((c) => c.voci.map((v) => v[1]));
  const IMPASTI = { classico: ['Impasto classico', 0], cereali: ['7 cereali', 2], integrale: ['Integrale', 2], lowcarb: ['Low carb', 0] };
  const FORMATI = { normale: ['Formato normale', 0], baby: ['Baby', -0.5], battuta: ['Battuta Ø 40 cm', 2] };
  const SEDI = {
    carbonera: { nome: 'Carbonera', ind: 'Viale Brigata Marche 257, Carbonera', tel: '0422 307124', chiuso: [1], fasce: [[18 * 60, 22 * 60]] },
    fontane: { nome: 'Fontane di Villorba', ind: 'Via Trieste 6, Fontane di Villorba', tel: '351 486 9683', chiuso: [], fasce: [[12 * 60, 14 * 60], [18 * 60, 22 * 60]] },
  };

  /* ---------- stato (il carrello resta solo in questo browser) ---------- */
  const CHIAVE = 'damatteo-prenotazione';
  const stato = { righe: [], sede: 'carbonera', modo: 'ritiro', giorno: null, ora: null, impPref: 'classico' };
  try {
    const s = JSON.parse(localStorage.getItem(CHIAVE) || 'null');
    if (s && Array.isArray(s.righe)) {
      stato.righe = s.righe.filter((r) => INDICE[r.id] && r.q > 0);
      if (SEDI[s.sede]) stato.sede = s.sede;
      if (s.modo === 'consegna') stato.modo = 'consegna';
    }
  } catch (e) { /* niente memoria: si parte vuoti */ }
  const salva = () => {
    try { localStorage.setItem(CHIAVE, JSON.stringify({ righe: stato.righe, sede: stato.sede, modo: stato.modo })); } catch (e) { /* ok */ }
  };
  let progressivo = 1;
  const nuovaChiave = () => 'r' + Date.now().toString(36) + (progressivo++);

  const prezzoRiga = (r) => {
    const v = INDICE[r.id];
    let p = v.prezzo;
    if (r.imp && IMPASTI[r.imp]) p += IMPASTI[r.imp][1];
    if (r.fmt && FORMATI[r.fmt]) p += FORMATI[r.fmt][1];
    return p * r.q;
  };
  const totale = () => stato.righe.reduce((t, r) => t + prezzoRiga(r), 0);
  const pezzi = () => stato.righe.reduce((t, r) => t + r.q, 0);
  const haDa = () => stato.righe.some((r) => INDICE[r.id].extra.da);

  /* ---------- menù: categorie e voci ---------- */
  const barraCat = $('#cat-barra');
  const pannelli = $('#cat-pannelli');
  function disegnaMenu() {
    barraCat.innerHTML = CATEGORIE.map((c, i) =>
      `<button class="cat" type="button" role="tab" id="tab-${c.id}" aria-controls="pan-${c.id}" aria-selected="${i === 0}" tabindex="${i === 0 ? 0 : -1}">${c.nome}</button>`).join('');
    pannelli.innerHTML = CATEGORIE.map((c, i) => `
      <div class="pannello" id="pan-${c.id}" role="tabpanel" aria-labelledby="tab-${c.id}" ${i === 0 ? '' : 'hidden'}>
        ${c.intro ? `<p class="pannello-intro">${c.intro}</p>` : ''}
        <ul class="voci">${c.voci.map((v) => {
          const x = INDICE[v[0]];
          return `<li class="voce">
            <h3 class="voce-nome">${esc(x.nome)}${x.veg ? '<svg class="foglia" role="img" aria-label="vegetariana"><use href="#i-foglia"/></svg>' : ''}</h3>
            ${x.ing ? `<p class="voce-ing">${esc(x.ing)}</p>` : ''}
            <div class="voce-dx"><span class="voce-prezzo">${x.extra.da ? 'da ' : ''}${soldi(x.prezzo)}</span>
            <button class="aggiungi" type="button" data-id="${x.id}" aria-label="Aggiungi ${esc(x.nome)}">+<span class="qta"></span></button></div>
          </li>`;
        }).join('')}</ul>
      </div>`).join('');
  }
  disegnaMenu();

  function scegliCat(btn, focus) {
    $$('.cat', barraCat).forEach((b) => { const on = b === btn; b.setAttribute('aria-selected', on); b.tabIndex = on ? 0 : -1; });
    $$('.pannello', pannelli).forEach((p) => { p.hidden = p.id !== btn.getAttribute('aria-controls'); });
    btn.scrollIntoView({ block: 'nearest', inline: 'center', behavior: ridotto ? 'auto' : 'smooth' });
    if (focus) btn.focus();
    const menuTop = $('#menu').getBoundingClientRect().top;
    const barraTop = barraCat.getBoundingClientRect().top;
    if (menuTop < 0 && barraTop <= parseFloat(getComputedStyle(barraCat).top) + 1) {
      window.scrollTo({ top: window.scrollY + pannelli.getBoundingClientRect().top - barraCat.offsetHeight - parseFloat(getComputedStyle(barraCat).top) - 8 });
    }
  }
  barraCat.addEventListener('click', (e) => { const b = e.target.closest('.cat'); if (b) scegliCat(b); });
  barraCat.addEventListener('keydown', (e) => {
    if (!['ArrowRight', 'ArrowLeft', 'Home', 'End'].includes(e.key)) return;
    const tabs = $$('.cat', barraCat); const i = tabs.indexOf(document.activeElement);
    let j = e.key === 'ArrowRight' ? i + 1 : e.key === 'ArrowLeft' ? i - 1 : e.key === 'Home' ? 0 : tabs.length - 1;
    j = (j + tabs.length) % tabs.length; e.preventDefault(); scegliCat(tabs[j], true);
  });

  pannelli.addEventListener('click', (e) => {
    const b = e.target.closest('.aggiungi');
    if (b) aggiungi(b.dataset.id, b);
  });

  function aggiungi(id, origine) {
    const v = INDICE[id];
    const conImpasto = v.tipo !== 'altro';
    const imp = conImpasto ? stato.impPref : null;
    const fmt = v.tipo === 'pizza' ? 'normale' : null;
    const r = v.extra.da ? null : stato.righe.find((x) => x.id === id && x.imp === imp && x.fmt === fmt);
    if (r) r.q += 1;
    else stato.righe.push({ k: nuovaChiave(), id, q: 1, imp, fmt, g1: '', g2: '' });
    salva();
    aggiornaConteggi(true);
    if (origine) vola(origine);
  }

  function aggiornaConteggi(saltello) {
    $$('.aggiungi', pannelli).forEach((b) => {
      const n = stato.righe.filter((r) => r.id === b.dataset.id).reduce((t, r) => t + r.q, 0);
      b.querySelector('.qta').textContent = n ? n : '';
      b.classList.toggle('preso', n > 0);
    });
    const n = pezzi();
    const bc = $('#apri-carrello');
    bc.hidden = n === 0;
    $('.barra-base').hidden = n > 0;
    $('#bc-conteggio').textContent = n === 1 ? '1 nel cartone' : `${n} nel cartone`;
    $('#bc-totale').textContent = (haDa() ? 'da ' : '') + soldi(totale());
    $('#barra').classList.toggle('desktop-carrello', n > 0);
    aggiornaBarra();
    if (saltello && n > 0) {
      bc.classList.remove('salta-su'); void bc.offsetWidth; bc.classList.add('salta-su');
    }
  }

  function vola(origine) {
    if (ridotto) return;
    const a = origine.getBoundingClientRect();
    const meta = $('#apri-carrello').hidden ? null : $('.mini-cartone').getBoundingClientRect();
    const x0 = a.left + a.width / 2 - 17, y0 = a.top + a.height / 2 - 17;
    const x1 = meta ? meta.left : innerWidth / 2 - 17, y1 = meta ? meta.top : innerHeight - 50;
    const d = document.createElement('div'); d.className = 'volo'; document.body.appendChild(d);
    const mx = (x0 + x1) / 2, my = Math.min(y0, y1) - 90;
    const an = d.animate([
      { transform: `translate(${x0}px, ${y0}px) scale(.6) rotate(0deg)`, opacity: 0 },
      { transform: `translate(${mx}px, ${my}px) scale(1.15) rotate(200deg)`, opacity: 1, offset: .45 },
      { transform: `translate(${x1}px, ${y1}px) scale(.5) rotate(380deg)`, opacity: .9 },
    ], { duration: 650, easing: 'cubic-bezier(.3,.7,.4,1)' });
    an.onfinish = () => d.remove();
    setTimeout(() => d.remove(), 900);
  }

  /* low carb come preferenza */
  const avviso = $('#avviso-impasto');
  $('#prenota-lowcarb').addEventListener('click', () => {
    stato.impPref = 'lowcarb';
    avviso.hidden = false;
    $('#menu').scrollIntoView({ behavior: ridotto ? 'auto' : 'smooth' });
  });
  $('#annulla-lowcarb').addEventListener('click', () => { stato.impPref = 'classico'; avviso.hidden = true; });

  /* ---------- barra in basso ---------- */
  const barra = $('#barra');
  let dialogoAperto = false;
  function aggiornaBarra() {
    const lontano = window.scrollY > 140 || pezzi() > 0;
    barra.classList.toggle('nascosta', dialogoAperto || !lontano);
  }

  /* ---------- dialoghi ---------- */
  const foglio = $('#foglio');
  const chiamaDlg = $('#chiama-dlg');
  function apri(d) {
    if (typeof d.showModal === 'function') d.showModal(); else d.setAttribute('open', '');
    dialogoAperto = true; document.documentElement.style.overflow = 'hidden'; aggiornaBarra();
  }
  function chiudi(d) {
    if (typeof d.close === 'function') d.close(); else d.removeAttribute('open');
  }
  [foglio, chiamaDlg].forEach((d) => {
    d.addEventListener('close', () => { dialogoAperto = false; document.documentElement.style.overflow = ''; aggiornaBarra(); });
    d.addEventListener('click', (e) => {
      if (e.target === d || e.target.closest('[data-chiudi]')) chiudi(d);
      const vai = e.target.closest('[data-chiudi-vai]');
      if (vai) { e.preventDefault(); chiudi(d); $('#menu').scrollIntoView(); }
    });
  });
  $$('[data-chiama]').forEach((b) => b.addEventListener('click', () => apri(chiamaDlg)));
  $$('[data-prenota]').forEach((a) => a.addEventListener('click', () => {
    if (a.dataset.modo === 'consegna') { stato.modo = 'consegna'; salva(); }
  }));
  $('#apri-carrello').addEventListener('click', apriFoglio);

  /* ---------- foglio di prenotazione ---------- */
  const form = $('#foglio-form');
  const ricevuta = $('#ricevuta');
  const elRighe = $('#righe');
  const GG = ['dom', 'lun', 'mar', 'mer', 'gio', 'ven', 'sab'];
  const isoGiorno = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const hhmm = (m) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;

  function apriFoglio() {
    form.hidden = false; ricevuta.hidden = true; ricevuta.classList.remove('chiude');
    form.sede.value = stato.sede; form.modo.value = stato.modo;
    $('#errori').hidden = true;
    disegnaRighe(); disegnaGiorni(); aggiornaModo(); aggiornaTotale();
    apri(foglio);
  }

  function opzioni(mappa, scelto) {
    return Object.entries(mappa).map(([k, [nome, d]]) =>
      `<option value="${k}" ${k === scelto ? 'selected' : ''}>${nome}${d > 0 ? ` +${soldi(d)}` : d < 0 ? ` −${soldi(-d)}` : ''}</option>`).join('');
  }
  function disegnaRighe(fuoco) {
    $('#vuoto').hidden = stato.righe.length > 0;
    elRighe.innerHTML = stato.righe.map((r) => {
      const v = INDICE[r.id];
      const solo = v.extra.carbonera ? '<small>Solo a Carbonera</small>' : '';
      let opz = '';
      if (r.imp) opz += `<select data-k="${r.k}" data-campo="imp" aria-label="Impasto per ${esc(v.nome)}">${opzioni(IMPASTI, r.imp)}</select>`;
      if (r.fmt) opz += `<select data-k="${r.k}" data-campo="fmt" aria-label="Formato per ${esc(v.nome)}">${opzioni(FORMATI, r.fmt)}</select>`;
      if (v.extra.da) {
        const g = (campo, val, et) => `<select data-k="${r.k}" data-campo="${campo}" aria-label="${et}"><option value="">${et}</option>${GUSTI.map((n) => `<option ${n === val ? 'selected' : ''}>${esc(n)}</option>`).join('')}</select>`;
        opz += g('g1', r.g1, 'Primo gusto') + g('g2', r.g2, 'Secondo gusto (facoltativo)');
      }
      return `<li class="riga">
        <div class="riga-nome">${esc(v.nome)}${solo}</div>
        <div class="riga-prezzo" data-prezzo="${r.k}">${v.extra.da ? 'da ' : ''}${soldi(prezzoRiga(r))}</div>
        <div class="riga-opz">${opz}
          <span class="passo"><button type="button" data-k="${r.k}" data-az="meno" aria-label="Togli una ${esc(v.nome)}">−</button><span aria-live="polite">${r.q}</span><button type="button" data-k="${r.k}" data-az="piu" aria-label="Aggiungi una ${esc(v.nome)}">+</button></span>
        </div>
      </li>`;
    }).join('');
    if (fuoco) { const f = elRighe.querySelector(fuoco); if (f) f.focus(); }
  }
  elRighe.addEventListener('click', (e) => {
    const b = e.target.closest('button[data-az]'); if (!b) return;
    const r = stato.righe.find((x) => x.k === b.dataset.k); if (!r) return;
    r.q += b.dataset.az === 'piu' ? 1 : -1;
    if (r.q <= 0) stato.righe = stato.righe.filter((x) => x !== r);
    salva(); disegnaRighe(`[data-k="${r.k}"][data-az="${b.dataset.az}"]`); aggiornaTotale(); aggiornaConteggi(false);
  });
  elRighe.addEventListener('change', (e) => {
    const s = e.target.closest('select[data-k]'); if (!s) return;
    const r = stato.righe.find((x) => x.k === s.dataset.k); if (!r) return;
    r[s.dataset.campo] = s.value; salva();
    const p = elRighe.querySelector(`[data-prezzo="${r.k}"]`);
    if (p) p.textContent = (INDICE[r.id].extra.da ? 'da ' : '') + soldi(prezzoRiga(r));
    aggiornaTotale(); aggiornaConteggi(false);
  });

  function giorniDisponibili() {
    const sede = SEDI[stato.sede];
    const ora = new Date();
    const minimo = ora.getHours() * 60 + ora.getMinutes() + 20;
    const out = [];
    for (let i = 0; i < 7; i += 1) {
      const d = new Date(ora.getFullYear(), ora.getMonth(), ora.getDate() + i);
      let slot = [];
      if (!sede.chiuso.includes(d.getDay())) {
        sede.fasce.forEach(([a, b], fi) => { for (let m = a; m < b; m += 15) if (i > 0 || m >= minimo) slot.push({ m, fi }); });
      }
      out.push({ d, i, iso: isoGiorno(d), slot, chiuso: sede.chiuso.includes(d.getDay()) });
    }
    return out;
  }
  function disegnaGiorni() {
    const gg = giorniDisponibili();
    if (!gg.some((g) => g.iso === stato.giorno && g.slot.length)) {
      const primo = gg.find((g) => g.slot.length); stato.giorno = primo ? primo.iso : null; stato.ora = null;
    }
    $('#giorni').innerHTML = gg.map((g) => {
      const et = g.i === 0 ? 'Oggi' : g.i === 1 ? 'Domani' : GG[g.d.getDay()];
      const sotto = !g.slot.length ? (g.chiuso ? 'chiuso' : 'finito') : g.d.toLocaleDateString('it-IT', { day: 'numeric', month: 'short' });
      return `<button class="giorno" type="button" role="radio" data-giorno="${g.iso}" aria-checked="${g.iso === stato.giorno}" ${g.slot.length ? '' : 'disabled'}>${et}<small>${sotto}</small></button>`;
    }).join('');
    disegnaOrari(gg);
  }
  function disegnaOrari(gg = giorniDisponibili()) {
    const g = gg.find((x) => x.iso === stato.giorno);
    const el = $('#orari');
    if (!g || !g.slot.length) { el.innerHTML = '<p class="niente">Nessun orario libero in questo giorno: scegline un altro.</p>'; return; }
    if (!g.slot.some((s) => hhmm(s.m) === stato.ora)) stato.ora = null;
    const doppie = SEDI[stato.sede].fasce.length > 1;
    let html = ''; let fascia = -1;
    g.slot.forEach((s) => {
      if (doppie && s.fi !== fascia) { fascia = s.fi; html += `<h3>${s.fi === 0 ? 'A pranzo' : 'La sera'}</h3>`; }
      const t = hhmm(s.m);
      html += `<button class="ora" type="button" role="radio" data-ora="${t}" aria-checked="${t === stato.ora}">${t}</button>`;
    });
    el.innerHTML = html;
  }
  $('#giorni').addEventListener('click', (e) => {
    const b = e.target.closest('.giorno'); if (!b || b.disabled) return;
    stato.giorno = b.dataset.giorno; stato.ora = null;
    $$('.giorno', $('#giorni')).forEach((x) => x.setAttribute('aria-checked', x === b));
    disegnaOrari();
  });
  $('#orari').addEventListener('click', (e) => {
    const b = e.target.closest('.ora'); if (!b) return;
    stato.ora = b.dataset.ora;
    $$('.ora', $('#orari')).forEach((x) => x.setAttribute('aria-checked', x === b));
  });
  form.addEventListener('change', (e) => {
    if (e.target.name === 'sede') { stato.sede = e.target.value; salva(); disegnaRighe(); disegnaGiorni(); aggiornaTotale(); }
    if (e.target.name === 'modo') { stato.modo = e.target.value; salva(); aggiornaModo(); aggiornaTotale(); }
  });
  function aggiornaModo() { $('#campo-ind').hidden = stato.modo !== 'consegna'; }
  function aggiornaTotale() {
    $('#totale').textContent = (haDa() ? 'da ' : '') + soldi(totale());
    const note = [];
    if (stato.modo === 'consegna') note.push('Più la consegna, da 2 a 3 € in base alla distanza.');
    if (stato.righe.some((r) => r.imp === 'lowcarb')) note.push('Il supplemento per il low carb te lo diciamo alla conferma.');
    if (haDa()) note.push('Il mezzo metro farcito si calcola in base ai gusti.');
    $('#totale-nota').textContent = note.join(' ');
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const err = []; let primo = null;
    const segna = (msg, el) => { err.push(msg); if (!primo && el) primo = el; };
    if (!stato.righe.length) segna('Aggiungi almeno una pizza dal menù.');
    if (stato.sede === 'fontane' && stato.righe.some((r) => INDICE[r.id].extra.carbonera)) segna('I fritti si preparano solo a Carbonera: scegli Carbonera o toglili.', form.querySelector('input[name="sede"][value="carbonera"]'));
    if (stato.righe.some((r) => INDICE[r.id].extra.da && !r.g1)) segna('Scegli almeno un gusto per il mezzo metro.', elRighe.querySelector('select[data-campo="g1"]'));
    if (!stato.giorno || !stato.ora) segna('Scegli il giorno e l\'orario.', $('#orari .ora') || $('#giorni .giorno'));
    if (stato.modo === 'consegna' && !form.ind.value.trim()) segna('Scrivi l\'indirizzo di consegna.', form.ind);
    if (!form.nome.value.trim()) segna('Scrivi il nome per la prenotazione.', form.nome);
    if (form.tel.value.replace(/\D/g, '').length < 6) segna('Scrivi un numero di telefono, ti serve per la conferma.', form.tel);
    const box = $('#errori');
    if (err.length) {
      box.textContent = err.join(' '); box.hidden = false;
      if (primo) { primo.scrollIntoView({ block: 'center' }); primo.focus({ preventScroll: true }); }
      return;
    }
    box.hidden = true;
    mostraRicevuta();
  });

  function mostraRicevuta() {
    const sede = SEDI[stato.sede];
    const numero = 100 + Math.floor(Math.random() * 900);
    const d = new Date(stato.giorno + 'T12:00');
    const oggi = isoGiorno(new Date());
    const domani = isoGiorno(new Date(Date.now() + 864e5));
    const quando = stato.giorno === oggi ? 'Oggi' : stato.giorno === domani ? 'Domani' : d.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' }).replace(/^./, (c) => c.toUpperCase());
    const dove = stato.modo === 'ritiro' ? `Ritiro a ${sede.nome}` : 'Consegna a casa';
    const luogo = stato.modo === 'ritiro' ? sede.ind : `${form.ind.value.trim()}, da ${sede.nome}`;
    const voci = stato.righe.map((r) => {
      const v = INDICE[r.id];
      const dett = [];
      if (r.imp && r.imp !== 'classico') dett.push(IMPASTI[r.imp][0]);
      if (r.fmt && r.fmt !== 'normale') dett.push(FORMATI[r.fmt][0]);
      if (v.extra.da) dett.push([r.g1, r.g2].filter(Boolean).join(' e '));
      return `<li><span>${r.q} × ${esc(v.nome)}${dett.length ? `<small>${esc(dett.join(', '))}</small>` : ''}</span><span>${v.extra.da ? 'da ' : ''}${soldi(prezzoRiga(r))}</span></li>`;
    }).join('');
    const note = form.note.value.trim();
    $('#comanda').innerHTML = `
      <h3>${dove}</h3>
      <p class="quando">${quando} alle ${stato.ora}</p>
      <p class="dati">${esc(luogo)}</p>
      <ul>${voci}</ul>
      <div class="tot"><span>Totale</span><span>${haDa() ? 'da ' : ''}${soldi(totale())}</span></div>
      <p class="dati">A nome di ${esc(form.nome.value.trim())}, ${esc(form.tel.value.trim())}.${stato.modo === 'consegna' ? ' Consegna da 2 a 3 € in base alla distanza.' : ''} Si paga ${stato.modo === 'consegna' ? 'alla consegna' : 'al ritiro'}.</p>
      ${note ? `<p class="dati">Note: ${esc(note)}</p>` : ''}`;
    $('#rc-adesivo').textContent = `n. ${numero}`;
    form.hidden = true; ricevuta.hidden = false;
    ricevuta.classList.remove('chiude'); void ricevuta.offsetWidth; ricevuta.classList.add('chiude');
    ricevuta.scrollTop = 0; ricevuta.focus();
    stato.righe = []; stato.ora = null; salva(); aggiornaConteggi(false);
  }
  $('#nuova').addEventListener('click', () => { chiudi(foglio); $('#menu').scrollIntoView(); });

  /* ---------- regia: cartone 3D, scacchi, parallasse ---------- */
  const hero = $('.hero');
  const cartone = $('#cartone');
  const scena = $('.hero-scena');
  const scacchi = $$('.scacchi i');
  const mtFoto = $('.mt-foto');
  const mtImg = $('.mt-foto img');
  const mtImpasto = $('#mt-impasto');
  const csFoto = $('.cs-foto');
  const csImg = $('.cs-foto img');
  const easeOutCubic = (x) => 1 - Math.pow(1 - x, 3);
  const easeOutBack = (x) => { const c1 = 1.5, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); };
  let inizio = null;
  let mx = 0, my = 0, tx = 0, ty = 0;
  let richiesto = false;

  function fotogramma(ora) {
    richiesto = false;
    if (inizio === null) inizio = ora;
    const t = (ora - inizio) / 1000;
    let continua = false;

    // cartone: intro a tempo + scroll
    const r = hero.getBoundingClientRect();
    if (r.bottom > -50 && r.top < innerHeight) {
      const a = ridotto ? 1 : limita(t / 0.95);
      const e1 = easeOutCubic(a);
      const e2 = easeOutBack(a);
      const tl = t - 0.75;
      const aperto = innerWidth < 980 ? 80 : 92;
      const lidIntro = ridotto ? aperto : (tl <= 0 ? 0 : aperto * (1 - Math.exp(-6.5 * tl) * Math.cos(11 * tl)));
      const p = limita(-r.top / Math.max(1, r.height * 0.75));
      mx += (tx - mx) * 0.08; my += (ty - my) * 0.08;
      const rx = 56 + (1 - e1) * 16 - p * 14 + my * 4;
      const rz = (innerWidth < 980 ? -4 : -9) - (1 - e1) * 16 + p * 10 + mx * 7;
      const s = (0.84 + 0.16 * e2) * (1 + p * 0.06);
      const st = cartone.style;
      st.setProperty('--rx', rx.toFixed(2) + 'deg');
      st.setProperty('--rz', rz.toFixed(2) + 'deg');
      st.setProperty('--lid', (lidIntro + p * 22).toFixed(2) + 'deg');
      st.setProperty('--s', s.toFixed(4));
      st.setProperty('--ty', ((1 - e1) * 60 - p * 30).toFixed(1) + 'px');
      st.setProperty('--lift', (p * 26).toFixed(1) + 'px');
      st.setProperty('--vap', (limita((t - 1.25) / 0.8) * (1 - p) * 0.9).toFixed(3));
      scena.style.opacity = limita(t / 0.3).toFixed(3);
      if (!ridotto && (t < 2.4 || Math.abs(tx - mx) > 0.002 || Math.abs(ty - my) > 0.002)) continua = true;
    }

    // scacchi che scorrono come un nastro
    const sy = window.scrollY;
    scacchi.forEach((el, i) => {
      const b = el.parentElement.getBoundingClientRect();
      if (b.bottom < 0 || b.top > innerHeight) return;
      const v = ((sy * 0.35) % 64) * (i % 2 ? 1 : -1);
      el.style.setProperty('--sx', v.toFixed(1) + 'px');
    });

    // l'impasto del logo che vola sopra le mani di Matteo
    if (mtFoto) {
      const b = mtFoto.getBoundingClientRect();
      if (b.bottom > 0 && b.top < innerHeight) {
        const q = limita((innerHeight - b.top) / (innerHeight + b.height));
        if (!ridotto) {
          mtImg.style.setProperty('--py', ((q - 0.5) * -40).toFixed(1) + 'px');
          mtImpasto.style.setProperty('--iy', (Math.sin(q * Math.PI) * -46).toFixed(1) + 'px');
          mtImpasto.style.setProperty('--irx', (62 - q * 62).toFixed(1) + 'deg');
          mtImpasto.style.setProperty('--irz', (q * 300 - 150).toFixed(1) + 'deg');
        }
      }
    }
    if (csFoto && !ridotto) {
      const b = csFoto.getBoundingClientRect();
      if (b.bottom > 0 && b.top < innerHeight) {
        const q = limita((innerHeight - b.top) / (innerHeight + b.height));
        csImg.style.setProperty('--py', ((q - 0.5) * -36).toFixed(1) + 'px');
      }
    }

    if (continua) chiedi();
  }
  function chiedi() { if (!richiesto) { richiesto = true; requestAnimationFrame(fotogramma); } }

  let ultimoScroll = 0;
  addEventListener('scroll', () => {
    $('#testata').classList.toggle('scorsa', window.scrollY > 8);
    if (Math.abs(window.scrollY - ultimoScroll) > 40 || window.scrollY < 150) { ultimoScroll = window.scrollY; aggiornaBarra(); }
    chiedi();
  }, { passive: true });
  addEventListener('resize', chiedi, { passive: true });
  if (puntatoreFine && !ridotto) {
    hero.addEventListener('pointermove', (e) => {
      const r = hero.getBoundingClientRect();
      tx = ((e.clientX - r.left) / r.width - 0.5) * 2;
      ty = ((e.clientY - r.top) / r.height - 0.5) * 2;
      chiedi();
    });
    hero.addEventListener('pointerleave', () => { tx = 0; ty = 0; chiedi(); });
  }
  document.addEventListener('visibilitychange', () => { if (!document.hidden) chiedi(); });

  // l'etichetta nutrizionale si "attacca" quando entra in vista
  const et = $('#etichetta');
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((voci) => voci.forEach((v) => { if (v.isIntersecting) { et.classList.add('vista'); io.disconnect(); } }), { threshold: 0.25 });
    io.observe(et);
  } else et.classList.add('vista');

  $('#anno').textContent = new Date().getFullYear();
  aggiornaConteggi(false);
  aggiornaBarra();
  chiedi();
})();
