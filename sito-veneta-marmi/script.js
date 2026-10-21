/* Veneta Marmi: hero a macchia aperta, richiesta materiali, finiture, palco delle lastre */
(() => {
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const ridotto = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const VM = (window.VM = window.VM || {});

  /* ---------- testata e menu ---------- */
  const testata = $('#testata');
  const bottoneMenu = $('.apri-menu');
  const menu = $('#menu-mobile');
  const barra = $('.barra-mobile');
  const apriMenu = (si) => {
    menu.hidden = !si;
    bottoneMenu.setAttribute('aria-expanded', String(si));
    document.body.classList.toggle('menu-aperto', si);
    bottoneMenu.querySelector('.sr').textContent = si ? 'Chiudi il menu' : 'Apri il menu';
  };
  bottoneMenu.addEventListener('click', () => apriMenu(menu.hidden));
  menu.addEventListener('click', (e) => { if (e.target.closest('a')) apriMenu(false); });
  addEventListener('keydown', (e) => { if (e.key === 'Escape' && !menu.hidden) apriMenu(false); });

  /* ---------- hero: due lastre che si aprono a libro ---------- */
  const hero = $('.hero');
  const libro = $('#libro');
  const su = $('#lastra-su');
  const lustroGiu = $('.lastra-giu .lustro');
  const lustroSu = $('.lastra-su .fronte .lustro');
  const buioGiu = $('.lastra-giu .buio');
  const buioSu = $('.lastra-su .fronte .buio');
  const buioRetro = $('.lastra-su .retro .buio');
  const ombra = $('.libro-ombra');
  const imgHero = $('.lastra-giu img');
  const easeIO = (u) => (u < .5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2);
  const easeO = (u) => 1 - Math.pow(1 - u, 3);
  const seg = (t, a, b) => clamp((t - a) / (b - a), 0, 1);
  let t0 = null, heroVisibile = true, heroH = innerHeight;

  function posaLibro(now) {
    const t = t0 === null ? 0 : (now - t0) / 1000;
    const T = Math.max(0, t - 2.9);
    const p = clamp(scrollY / (heroH * .85), 0, 1);
    // apertura: da chiuso (-180°) a una V leggera, con un piccolo assestamento
    const u = seg(t, .2, 2.4);
    let ap = -180 + 166 * easeIO(u);
    ap += 3.5 * Math.sin(Math.PI * seg(t, 2.4, 3.1));
    ap += -3 * (0.5 - 0.5 * Math.cos(T * .55));
    ap += -40 * p;
    const k = easeO(seg(t, 0, 2.7));
    const rx = 38 - 18 * k + 1.6 * Math.sin(T * .42) + 18 * p;
    const ry = -44 + 14 * k + 4 * Math.sin(T * .31);
    const rz = 7 - 4 * k;
    const sc = (.86 + .14 * k) * (1 - .1 * p);
    // riflesso: passa da sinistra a destra durante l'apertura, poi resta a respirare
    const sweep = seg(t, 1.1, 2.9);
    const lx = sweep < 1 ? 78 - 70 * easeIO(sweep) : 43 + 24 * Math.sin(T * .33 + 4.2);
    const rad = ap * Math.PI / 180;
    libro.style.setProperty('--rx', rx.toFixed(2) + 'deg');
    libro.style.setProperty('--ry', ry.toFixed(2) + 'deg');
    libro.style.setProperty('--rz', rz.toFixed(2) + 'deg');
    libro.style.setProperty('--sc', sc.toFixed(4));
    su.style.setProperty('--ap', ap.toFixed(2) + 'deg');
    lustroGiu.style.setProperty('--lx', (lx - p * 30).toFixed(1) + '%');
    lustroSu.style.setProperty('--lx', (lx - p * 30 + ap * .35).toFixed(1) + '%');
    buioGiu.style.setProperty('--b', (.04 + .14 * p).toFixed(3));
    buioSu.style.setProperty('--b', clamp(.42 * Math.abs(Math.sin(rad)) * (ap > -90 ? 1 : 0) + .04, 0, .6).toFixed(3));
    buioRetro.style.setProperty('--b', clamp(.12 + .5 * (1 + Math.cos(rad)) / 2, 0, .7).toFixed(3));
    ombra.style.setProperty('--om', (.65 * (1 - .5 * p)).toFixed(3));
  }
  function cicloHero(now) {
    if (heroVisibile && !document.hidden) posaLibro(now);
    requestAnimationFrame(cicloHero);
  }
  function avviaHero() {
    if (t0 !== null) return;
    t0 = performance.now();
    hero.classList.add('pronto');
    setTimeout(() => barra.classList.add('vista'), 2600);
    if (ridotto) { t0 = performance.now() - 6000; posaLibro(performance.now()); }
  }
  if (ridotto) {
    avviaHero();
    addEventListener('scroll', () => posaLibro(performance.now()), { passive: true });
  } else {
    posaLibro(0);
    requestAnimationFrame(cicloHero);
    const pronta = () => requestAnimationFrame(avviaHero);
    if (imgHero.complete) pronta();
    else { imgHero.addEventListener('load', pronta, { once: true }); setTimeout(pronta, 900); }
  }
  new IntersectionObserver(([e]) => { heroVisibile = e.isIntersecting; }).observe(hero);
  addEventListener('resize', () => { heroH = innerHeight; });

  const aggiornaTestata = () => {
    const sopra = scrollY > heroH * .82 && !document.body.classList.contains('menu-aperto');
    testata.classList.toggle('solida', sopra);
    testata.classList.toggle('su-hero', !sopra && scrollY > 24);
    if (scrollY > 140) barra.classList.add('vista');
  };
  addEventListener('scroll', aggiornaTestata, { passive: true });
  aggiornaTestata();

  /* ---------- richiesta: materiali scelti ---------- */
  const scelti = new Map(); // nome -> immagine
  const CHIAVE = 'vm-richiesta';
  try { (JSON.parse(localStorage.getItem(CHIAVE)) || []).forEach(([n, i]) => scelti.set(n, i)); } catch (e) {}
  const salva = () => { try { localStorage.setItem(CHIAVE, JSON.stringify([...scelti])); } catch (e) {} };
  const listaScelti = $('#scelti');
  const vuoto = $('#scelti-vuoto');
  const stato = $('#campionario-stato');

  function disegnaScelti() {
    const n = scelti.size;
    $$('[data-conta]').forEach((c) => { c.hidden = n === 0; c.textContent = n; });
    $$('.campione button').forEach((b) => b.setAttribute('aria-pressed', String(scelti.has(b.dataset.materiale))));
    listaScelti.replaceChildren(...[...scelti].map(([nome, img]) => {
      const li = document.createElement('li');
      li.innerHTML = `${img ? `<img src="${img}" alt="" width="30" height="30">` : ''}<span></span><button type="button" aria-label="Togli ${nome}">×</button>`;
      li.querySelector('span').textContent = nome;
      li.querySelector('button').addEventListener('click', () => { scelti.delete(nome); salva(); disegnaScelti(); });
      return li;
    }));
    vuoto.hidden = n > 0;
    stato.textContent = n === 0 ? 'Nessun materiale nella richiesta.' : n === 1 ? '1 materiale nella richiesta: ' + [...scelti.keys()][0] + '.' : `${n} materiali nella richiesta.`;
    VM.aggiornaSfoglia && VM.aggiornaSfoglia();
  }
  VM.scelti = scelti;
  VM.alterna = (nome, img) => {
    if (scelti.has(nome)) scelti.delete(nome); else scelti.set(nome, img);
    salva(); disegnaScelti();
  };

  /* ---------- campionario ---------- */
  $('#campioni').addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return;
    VM.alterna(b.dataset.materiale, b.querySelector('img').getAttribute('src'));
  });
  const note = {
    tutti: 'Marmi, travertini, limestone, onici, agglomerati di marmo e cemento o resina, quarziti, ardesie e Flexislate: lastre, marmette e lavorati.',
    Marmi: 'Il marmo nasce da un processo metamorfico: minerali diversi, mescolandosi, creano le sfumature e le venature che da millenni arricchiscono case e palazzi.',
    Travertino: 'Pietra porosa che assorbe gli ossidi che ne definiscono il colore: per questo ogni lastra ha sfumature e venature sue.',
    Limestone: 'Roccia sedimentaria di carbonato di calcio, elegante e versatile: pavimenti, rivestimenti e facciate, in ogni ambiente contemporaneo.',
    Onice: 'Varietà di calcedonio, quarzo formato da strati paralleli di colori diversi: un materiale pregiato per ambienti eleganti e ricercati.',
    Agglomerati: 'Agglomarmo: graniglie di marmo e cemento, si lavora come il marmo e posato in opera ricorda la veneziana. Aggloresina: marmo e resina, in colori vari e omogenei.',
    Quarzite: 'Roccia metamorfica composta soprattutto da quarzo, molto resistente: sempre più scelta per pavimenti e rivestimenti esterni.',
    Ardesia: 'Pietra compatta nata da una sedimentazione progressiva, per pavimenti interni ed esterni, in architetture moderne e classiche.',
    Flexislate: 'Un velo di vera ardesia o mica su resina e fibra di vetro: 122 × 61 cm, circa 2 mm, circa 1,5 kg/m². Si posa su cartongesso, legno, metallo e anche su superfici curve.',
  };
  const notaEl = $('#famiglia-nota');
  $('.filtri').addEventListener('click', (e) => {
    const f = e.target.closest('.filtro'); if (!f) return;
    $$('.filtro').forEach((x) => { const si = x === f; x.classList.toggle('attivo', si); x.setAttribute('aria-pressed', String(si)); });
    const fam = f.dataset.famiglia;
    $$('.campione').forEach((c) => { c.hidden = fam !== 'tutti' && c.dataset.famiglia !== fam; });
    notaEl.textContent = note[fam] || '';
  });

  /* ---------- finiture ---------- */
  const FINITURE = [
    ['lucidatura', 'Lucidatura', 'Superficie liscia e brillante, a specchio: fa risaltare venature e sfumature del materiale.', 'Ideale per interni'],
    ['levigatura', 'Levigatura', 'Superficie liscia e opaca, dall\'effetto naturale: colore e venature risaltano meno che nel lucido.', 'Ideale per interni'],
    ['spazzolatura', 'Spazzolatura', 'Superficie leggermente ondulata e opaca, dall\'effetto anticato.', 'Per interni ed esterni'],
    ['sabbiatura', 'Sabbiatura', 'Superficie leggermente ruvida e puntiforme: colori e venature diventano più uniformi.', 'Per esterni, antiscivolo'],
    ['martellinatura', 'Martellinatura', 'Superficie ruvida e puntiforme, con colori e venature molto uniformati.', 'Per esterni, antiscivolo'],
    ['bocciardatura', 'Bocciardatura', 'Superficie molto ruvida e puntiforme, con colori e venature molto uniformati.', 'Per esterni, antiscivolo'],
    ['fiammatura', 'Fiammatura', 'Superficie molto ruvida e irregolare.', 'Per esterni, antiscivolo'],
    ['spacco-naturale', 'Spacco naturale', 'Superficie molto ruvida e irregolare, tipica dell\'ardesia e delle quarziti.', 'Per esterni, antiscivolo'],
    ['dune', 'Dune', 'Superficie ondulata, pensata per le pareti d\'arredo.', 'Per pareti interne'],
    ['piano-sega', 'Piano sega', 'Superficie grezza, così come esce dal taglio del blocco.', 'Per pavimenti esterni'],
    ['burattatura', 'Burattatura', 'Superficie ruvida dall\'effetto consumato, con lati irregolari e angoli arrotondati.', 'Per interni ed esterni'],
    ['laser', 'Laser', 'Il laser incide la superficie con disegni unici, su pavimenti e rivestimenti.', 'Su disegno'],
  ];
  const finFoto = $('#fin-foto'), finNome = $('#fin-nome'), finTesto = $('#fin-testo'), finUso = $('#fin-uso'), finScelta = $('#fin-scelta');
  let finIdx = 0, finAuto = true, finTimer = null, finInVista = false;
  FINITURE.forEach(([id, nome], i) => {
    const b = document.createElement('button');
    b.type = 'button'; b.role = 'tab'; b.textContent = nome; b.id = 'tab-' + id;
    b.setAttribute('aria-selected', String(i === 0)); b.setAttribute('aria-controls', 'fin-foto');
    b.addEventListener('click', () => { finAuto = false; clearInterval(finTimer); mostraFinitura(i); });
    finScelta.append(b);
  });
  function mostraFinitura(i) {
    if (i === finIdx && finFoto.querySelector('img')) { /* già mostrata */ }
    finIdx = i;
    const [id, nome, testo, uso] = FINITURE[i];
    $$('button', finScelta).forEach((b, j) => b.setAttribute('aria-selected', String(j === i)));
    const img = new Image(640, 480);
    img.src = `assets/img/finiture/${id}.jpg`; img.alt = `Superficie in pietra con finitura ${nome.toLowerCase()}`; img.decoding = 'async';
    img.className = 'nuova';
    const vecchie = $$('img', finFoto);
    finFoto.append(img);
    finFoto.classList.remove('passa'); void finFoto.offsetWidth; finFoto.classList.add('passa');
    setTimeout(() => vecchie.forEach((v) => v.remove()), 1050);
    finNome.textContent = nome; finTesto.textContent = testo; finUso.textContent = uso;
    if (!finAuto) return;
    const tab = $$('button', finScelta)[i];
    if (finInVista && matchMedia('(max-width: 959px)').matches) finScelta.scrollTo({ left: tab.offsetLeft - 20, behavior: 'smooth' });
  }
  new IntersectionObserver(([e]) => {
    finInVista = e.isIntersecting;
    clearInterval(finTimer);
    if (finInVista && finAuto && !ridotto) {
      setTimeout(() => finAuto && finInVista && mostraFinitura((finIdx + 1) % FINITURE.length), 700);
      finTimer = setInterval(() => { if (finAuto) mostraFinitura((finIdx + 1) % FINITURE.length); }, 2200);
    }
  }, { threshold: .35 }).observe($('.finitura-vista'));
  // precarica le foto delle finiture quando la sezione si avvicina
  new IntersectionObserver(([e], o) => {
    if (!e.isIntersecting) return;
    FINITURE.forEach(([id]) => { const im = new Image(); im.src = `assets/img/finiture/${id}.jpg`; });
    o.disconnect();
  }, { rootMargin: '600px' }).observe($('#finiture'));

  /* ---------- foto dei prodotti che escono come una lastra dal taglio ---------- */
  const io = new IntersectionObserver((voci) => voci.forEach((v) => {
    if (v.isIntersecting) { v.target.classList.add('visto'); io.unobserve(v.target); }
  }), { rootMargin: '0px 0px -12% 0px' });
  $$('.prodotto').forEach((p) => io.observe(p));

  /* ---------- vista aerea in parallasse ---------- */
  const aerea = $('#aerea');
  const blocco = $('.azienda-aerea');
  const parallasse = () => {
    const r = blocco.getBoundingClientRect();
    if (r.bottom < 0 || r.top > innerHeight) return;
    const q = (r.top + r.height) / (innerHeight + r.height);
    aerea.style.transform = `translate3d(0, ${(-q * 15).toFixed(2)}%, 0)`;
  };
  if (!ridotto) { addEventListener('scroll', parallasse, { passive: true }); parallasse(); }

  /* ---------- sfoglia le lastre ---------- */
  const LASTRE = [
    ['calacatta-corchia', 'Calacatta Corchia', 'Marmo bianco, lucidato', 'Fondo bianco con brecce e venature grigio scuro: il disegno cambia da una lastra all\'altra.'],
    ['verde-alpi', 'Verde Alpi', 'Marmo verde, lucidato', 'Verde scuro attraversato da una rete fitta di vene chiare.'],
    ['rosso-levanto', 'Rosso Levanto', 'Marmo rosso, lucidato', 'Rosso vinaccia tagliato da larghe vene bianche.'],
    ['onice-miele', 'Onice Miele', 'Onice, lucidato', 'Quarzo a strati di colori diversi, dal miele all\'ambra: un materiale pregiato per ambienti ricercati.'],
    ['sahara-noir', 'Sahara Noir', 'Marmo nero, lucidato', 'Nero profondo segnato da sottili vene oro e bianche.'],
    ['arabescato-orobico', 'Arabescato Orobico', 'Marmo grigio, lucidato', 'Onde di grigio e nero con venature chiare.'],
    ['royal-brown', 'Royal Brown', 'Marmo marrone, lucidato', 'Marrone caldo con una rete di vene beige.'],
  ];
  VM.LASTRE = LASTRE;
  const sezSfoglia = $('#lastre');
  const pista = $('#pista');
  const tacche = $('#sf-tacche');
  const sfN = $('#sf-n'), sfNome = $('#sf-nome'), sfFam = $('#sf-fam'), sfTesto = $('#sf-testo'), sfBtn = $('#sf-aggiungi');
  const scheda = $('.sfoglia-scheda');
  $('#sf-tot').textContent = LASTRE.length;
  LASTRE.forEach(() => tacche.append(document.createElement('li')));
  let sfIdx = -1;
  VM.sfogliaF = 0;
  function progressoSfoglia() {
    const r = pista.getBoundingClientRect();
    const corsa = pista.offsetHeight - innerHeight;
    const p = clamp(-r.top / corsa, 0, 1);
    VM.sfogliaF = clamp((p - .04) / .9, 0, 1) * (LASTRE.length - 1);
    const i = Math.round(VM.sfogliaF);
    if (i !== sfIdx) mostraLastra(i);
  }
  function mostraLastra(i) {
    const prima = sfIdx >= 0;
    sfIdx = i;
    const [id, nome, fam, testo] = LASTRE[i];
    sfN.textContent = i + 1; sfNome.textContent = nome; sfFam.textContent = fam; sfTesto.textContent = testo;
    sfBtn.dataset.materiale = nome; sfBtn.dataset.img = `assets/img/campioni/${id}.jpg`;
    VM.aggiornaSfoglia();
    $$('li', tacche).forEach((t, j) => t.classList.toggle('qui', j === i));
    if (prima && !ridotto) { scheda.classList.remove('cambia'); void scheda.offsetWidth; scheda.classList.add('cambia'); }
  }
  VM.aggiornaSfoglia = () => {
    const si = scelti.has(sfBtn.dataset.materiale);
    sfBtn.setAttribute('aria-pressed', String(si));
    sfBtn.textContent = si ? 'Nella richiesta' : 'Aggiungi alla richiesta';
  };
  sfBtn.addEventListener('click', () => VM.alterna(sfBtn.dataset.materiale, sfBtn.dataset.img));
  addEventListener('scroll', progressoSfoglia, { passive: true });
  addEventListener('resize', progressoSfoglia);
  progressoSfoglia();

  function sfogliaStatica() {
    sezSfoglia.classList.add('statica');
    const lista = $('#sfoglia-lista');
    lista.hidden = false;
    lista.innerHTML = '<h2>Sfoglia le lastre</h2><div class="sfoglia-riga">' + LASTRE.map(([id, nome, fam, testo]) =>
      `<article><img src="assets/img/lastre/${id}.jpg" width="1000" height="600" alt="Lastra di ${nome}" loading="lazy" decoding="async"><h3>${nome}</h3><p>${fam}. ${testo}</p><button class="bottone bottone-chiaro" type="button" data-materiale="${nome}" data-img="assets/img/campioni/${id}.jpg">Aggiungi alla richiesta</button></article>`).join('') + '</div>';
    lista.addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) VM.alterna(b.dataset.materiale, b.dataset.img); });
  }
  const webgl = (() => { try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch (e) { return false; } })();
  if (!webgl || ridotto) sfogliaStatica();
  else {
    let caricato = false;
    const carica = () => {
      if (caricato) return; caricato = true;
      import('./lastre3d.js')
        .then((m) => m.avvia({ canvas: $('#lastre3d'), sezione: sezSfoglia, pista }))
        .catch((err) => { console.warn('Lastre 3D non disponibili', err); });
    };
    new IntersectionObserver(([e], o) => { if (e.isIntersecting) { carica(); o.disconnect(); } }, { rootMargin: '150% 0px' }).observe(pista);
    addEventListener('load', () => setTimeout(carica, 1200));
  }

  /* ---------- modulo di richiesta: compone l'email ---------- */
  const modulo = $('#modulo');
  const errore = $('#errore');
  modulo.addEventListener('submit', (e) => {
    e.preventDefault();
    const d = new FormData(modulo);
    const nome = (d.get('nome') || '').trim();
    const mancano = [];
    if (!nome) mancano.push('il tuo nome');
    if (!d.get('privacy')) mancano.push('la conferma dell\'informativa privacy');
    if (mancano.length) {
      errore.hidden = false;
      errore.textContent = 'Manca ' + mancano.join(' e ') + '.';
      (!nome ? modulo.nome : modulo.privacy).focus();
      return;
    }
    errore.hidden = true;
    const azienda = (d.get('azienda') || '').trim();
    const righe = ['Buongiorno, vorrei un preventivo.', ''];
    if (scelti.size) righe.push('Materiali: ' + [...scelti.keys()].join(', '));
    const cosa = d.getAll('cosa');
    if (cosa.length) righe.push('Mi serve: ' + cosa.join(', '));
    if (d.get('misure')) righe.push('Misure, quantità, finitura: ' + d.get('misure'));
    if (d.get('messaggio')) righe.push('', d.get('messaggio'));
    righe.push('', nome + (azienda ? ' - ' + azienda : '') + (d.get('profilo') ? ' (' + d.get('profilo') + ')' : ''));
    if (d.get('telefono')) righe.push('Telefono: ' + d.get('telefono'));
    const oggetto = 'Richiesta preventivo dal sito' + (azienda ? ' - ' + azienda : ' - ' + nome);
    location.href = `mailto:info@venetamarmi.it?subject=${encodeURIComponent(oggetto)}&body=${encodeURIComponent(righe.join('\n'))}`;
  });

  disegnaScelti();
})();
