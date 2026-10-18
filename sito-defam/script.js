/* DEFAM — script unico: intro, catalogo, finiture, metodo, form */
(function () {
  'use strict';

  var root = document.documentElement;
  var meno = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  /* ---------- dati del catalogo (generati dalle gallerie del sito originale) ---------- */
  /*DATI-INIZIO*/
  var LAVORI = {"cancelli":{"classico":{"n":264,"voci":[["cc119","CC119","Cancello classico",1280,807],["cc005","CC005","Cancello classico",1280,907],["cc008","CC008","Cancello classico",1280,857],["cc044","CC044","Cancello classico",1280,754],["cc056-cc056c","CC056 / CC056C","Cancello classico",1280,809],["cc145-cc145c-a","CC145 / CC145C","Cancello classico",853,1209],["cc048c","CC048C","Cancello classico",857,1209],["cc010","CC010","Cancello classico",1280,809]]},"moderno":{"n":175,"voci":[["cm092","CM092","Cancello moderno",1280,807],["cm003","CM003","Cancello moderno",1280,809],["cm013c","CM013C","Cancello moderno",1280,809],["cm031","CM031","Cancello moderno",1280,907],["cm062","CM062","Cancello moderno",1280,807],["cm082","CM082","Cancello moderno",1280,807],["cm103c","CM103C","Cancello moderno",1280,806],["cm108","CM108","Cancello moderno",1280,807]]}},"recinzioni":{"classico":{"n":90,"voci":[["rc048","RC048","Recinzione classica",1280,807],["rc005","RC005","Recinzione classica",1280,907],["rc008","RC008","Recinzione classica",1280,809],["rc014","RC014","Recinzione classica",960,1209],["rc026","RC026","Recinzione classica",1280,907],["rc043","RC043","Recinzione classica",1280,809],["rc023","RC023","Recinzione classica",1280,907],["rc034","RC034","Recinzione classica",1280,809]]},"moderno":{"n":56,"voci":[["rm040","RM040","Recinzione moderna",1175,1209],["rm011","RM011","Recinzione moderna",1280,907],["rm026","RM026","Recinzione moderna",1280,809],["rm029","RM029","Recinzione moderna",1280,842],["rm035","RM035","Recinzione moderna",1280,807],["rm050","RM050","Recinzione moderna",1280,807],["rm058","RM058","Recinzione moderna",1280,807],["rm055","RM055","Recinzione moderna",1280,807]]}},"poggioli":{"classico":{"n":70,"voci":[["pc033","PC033","Poggiolo classico",1280,907],["pc007","PC007","Poggiolo classico",1280,907],["pc010","PC010","Poggiolo classico",1280,809],["pc029","PC029","Poggiolo classico",1280,809],["pc036","PC036","Poggiolo classico",1280,809],["pc054","PC054","Poggiolo classico",960,1209],["pc066-b","PC066","Poggiolo classico",1280,807],["pc056","PC056","Poggiolo classico",1280,807]]},"moderno":{"n":64,"voci":[["pm018","PM018","Poggiolo moderno",1280,907],["pm004","PM004","Poggiolo moderno",1280,809],["pm008","PM008","Poggiolo moderno",1280,907],["pm011","PM011","Poggiolo moderno",1280,809],["pm024","PM024","Poggiolo moderno",857,1209],["pm037","PM037","Poggiolo moderno",1280,720],["pm041","PM041","Poggiolo moderno",1280,819],["pm047","PM047","Poggiolo moderno",1280,807]]}},"inferriate":{"classico":{"n":62,"voci":[["iac004","IAC004","Inferriata classica",1280,970],["iac007","IAC007","Inferriata classica",925,1209],["iac010","IAC010","Inferriata classica",854,1209],["ic006","IC006","Inferriata classica",925,1209],["ic018","IC018","Inferriata classica",1280,907],["ic021","IC021","Inferriata classica",1280,809],["ic033","IC033","Inferriata classica",1280,807],["ic012","IC012","Inferriata classica",960,1209]]},"moderno":{"n":18,"voci":[["im004","IM004","Inferriata moderna",1280,889],["iam011","IAM011","Inferriata moderna",738,1209],["iam017","IAM017","Inferriata moderna",865,1209],["im001","IM001","Inferriata moderna",1280,809],["im002","IM002","Inferriata moderna",960,1209],["im003","IM003","Inferriata moderna",960,1209],["im006","IM006","Inferriata moderna",976,1209],["im005","IM005","Inferriata moderna",1137,1209]]}},"scale":{"classico":{"n":100,"voci":[["sc095","SC095","Scala classica",960,1209],["sc004","SC004","Scala classica",1280,809],["sc017","SC017","Scala classica",857,1209],["sc033","SC033","Scala classica",857,1209],["sc035","SC035","Scala classica",1280,809],["sc037","SC037","Scala classica",857,1209],["sc089","SC089","Scala classica",956,1209],["sc067","SC067","Scala classica",1280,807]]},"moderno":{"n":61,"voci":[["sm016","SM016","Scala moderna",1280,907],["sm001","SM001","Scala moderna",1280,809],["sm005","SM005","Scala moderna",857,1209],["sm019","SM019","Scala moderna",1280,907],["sm023","SM023","Scala moderna",886,1209],["sm039","SM039","Scala moderna",1280,940],["sm051","SM051","Scala moderna",1280,865],["sm036","SM036","Scala moderna",960,1209]]}},"tettoie":{"unico":{"n":64,"voci":[["te1164","TE1164","Tettoia",1280,807],["te1136","TE1136","Tettoia",1280,809],["te1160","TE1160","Tettoia",1280,807],["te1214","TE1214","Tettoia",854,1209],["te1221-b","TE1221 B","Tettoia",1280,807],["pe1134","PE1134","Pensilina",1280,1106],["pe1185","PE1185","Pensilina",1280,807],["te1226","TE1226","Tettoia",1280,807]]}},"complementi":{"unico":{"n":180,"voci":[["ce1069","CE1069","Arredo da esterno",1280,809],["pp1004","PP1004","Portalettere",857,1209],["il1036","IL1036","Lanterna",1280,809],["il1038","IL1038","Lanterna",1280,809],["ce1065","CE1065","Arredo da esterno",1280,807],["ci1080","CI1080","Complemento d'arredo",1280,782],["cb1100","CB1100","Accessorio per caminetto",1106,1209],["pp1019","PP1019","Portalettere",1280,809]]}}};
  /*DATI-FINE*/

  // nome al plurale e genere, per concordare "dei/delle" e "fotografati/fotografate"
  var NOMI = {
    cancelli: { classico: 'cancelli classici', moderno: 'cancelli moderni', f: false },
    recinzioni: { classico: 'recinzioni classiche', moderno: 'recinzioni moderne', f: true },
    poggioli: { classico: 'poggioli classici', moderno: 'poggioli moderni', f: false },
    inferriate: { classico: 'inferriate classiche', moderno: 'inferriate moderne', f: true },
    scale: { classico: 'scale classiche', moderno: 'scale moderne', f: true },
    tettoie: { unico: 'tettoie e pensiline', f: true },
    complementi: { unico: 'complementi e accessori', f: false }
  };

  /* ---------- hero: titolo parola per parola, poi il ferro si raffredda ---------- */
  var titolo = $('[data-titolo]');
  if (titolo) {
    var parole = titolo.textContent.trim().split(/\s+/);
    titolo.setAttribute('aria-label', titolo.textContent.trim());
    titolo.innerHTML = parole.map(function (p, i) {
      return '<span class="parola" aria-hidden="true" style="--i:' + i + '">' + p + '</span>';
    }).join(' ');
  }

  function avviaIntro() {
    if (root.classList.contains('via-js')) return;
    var giaPartita = root.classList.contains('via'); // la rete di sicurezza in testa è arrivata prima
    root.classList.add('via-js', 'via');
    if (giaPartita) return;
    if (!meno) setTimeout(scintille, 380);
  }
  if (root.classList.contains('intro')) {
    var foto = $('[data-hero-foto]');
    var pronta = foto && foto.complete ? Promise.resolve() : new Promise(function (ok) { foto.addEventListener('load', ok, { once: true }); foto.addEventListener('error', ok, { once: true }); });
    Promise.race([pronta, new Promise(function (ok) { setTimeout(ok, 1400); })]).then(avviaIntro);
  }

  // scintille: due colpi di martello, poi il canvas si ferma
  function scintille() {
    var c = $('[data-scintille]');
    if (!c || !c.getContext) return;
    var ctx = c.getContext('2d');
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var w = c.clientWidth, h = c.clientHeight;
    c.width = w * dpr; c.height = h * dpr;
    ctx.scale(dpr, dpr);
    var piccolo = w < 760;
    var p = [];
    function colpo(n, cx, cy) {
      for (var i = 0; i < n; i++) {
        var a = -Math.PI / 2 + (Math.random() - .5) * Math.PI * 1.25;
        var v = (piccolo ? 3 : 4.2) * (0.35 + Math.random());
        p.push({ x: cx + (Math.random() - .5) * w * .1, y: cy + (Math.random() - .5) * h * .06, vx: Math.cos(a) * v, vy: Math.sin(a) * v, vita: 0, max: 38 + Math.random() * 46, s: .8 + Math.random() * 1.3 });
      }
    }
    colpo(piccolo ? 46 : 80, w * (piccolo ? .5 : .6), h * (piccolo ? .46 : .5));
    setTimeout(function () { colpo(piccolo ? 30 : 52, w * (piccolo ? .46 : .44), h * (piccolo ? .52 : .56)); }, 420);
    var prima = null, fine = performance.now() + 2600;
    function giro(t) {
      if (prima === null) prima = t;
      var dt = Math.min((t - prima) / 16.67, 3); prima = t;
      ctx.clearRect(0, 0, w, h);
      ctx.globalCompositeOperation = 'lighter';
      for (var i = p.length - 1; i >= 0; i--) {
        var s = p[i];
        var x0 = s.x, y0 = s.y;
        s.vx *= Math.pow(.985, dt); s.vy = s.vy * Math.pow(.985, dt) + .13 * dt;
        s.x += s.vx * dt; s.y += s.vy * dt; s.vita += dt;
        var k = s.vita / s.max;
        if (k >= 1) { p.splice(i, 1); continue; }
        var r = 255, g = Math.round(235 - 175 * k), b = Math.round(170 * (1 - k * 1.6));
        ctx.strokeStyle = 'rgba(' + r + ',' + g + ',' + Math.max(b, 0) + ',' + (1 - k * k).toFixed(3) + ')';
        ctx.lineWidth = s.s;
        ctx.beginPath(); ctx.moveTo(x0 - s.vx * 1.6, y0 - s.vy * 1.6); ctx.lineTo(s.x, s.y); ctx.stroke();
      }
      if (p.length || t < fine) requestAnimationFrame(giro);
      else ctx.clearRect(0, 0, w, h);
    }
    requestAnimationFrame(giro);
  }

  /* ---------- testata, menu mobile, barra in basso ---------- */
  var testata = $('[data-testata]');
  var barra = $('[data-barra]');
  var hero = $('.hero');
  var prev = $('#preventivo');
  var menu = $('[data-menu]');
  var apri = $('[data-menu-apri]');

  function alloScroll() {
    var y = window.scrollY;
    if (testata) testata.classList.toggle('solida', y > 30 || (menu && !menu.hidden));
    if (barra && hero) {
      var dopoHero = y > hero.offsetHeight * .6;
      var r = prev ? prev.getBoundingClientRect() : null;
      var sulModulo = r && r.top < window.innerHeight * .75 && r.bottom > 0;
      barra.classList.toggle('su', dopoHero && !sulModulo);
    }
    aggiornaPassi();
  }

  function chiudiMenu() {
    if (!menu || menu.hidden) return;
    menu.hidden = true;
    apri.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
    alloScroll();
  }
  if (apri && menu) {
    apri.addEventListener('click', function () {
      var aperto = !menu.hidden;
      if (aperto) { chiudiMenu(); apri.focus(); return; }
      menu.hidden = false;
      apri.setAttribute('aria-expanded', 'true');
      document.body.style.overflow = 'hidden';
      alloScroll();
      var primo = $('a', menu); if (primo) primo.focus();
    });
    $$('a', menu).forEach(function (a) { a.addEventListener('click', chiudiMenu); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') chiudiMenu(); });
  }

  /* ---------- gruppi radio accessibili (stili, tipi, campioni) ---------- */
  function gruppoRadio(contenitore, alCambio) {
    function voci() { return $$('[role="radio"]', contenitore).filter(function (b) { return b.getAttribute('aria-disabled') !== 'true'; }); }
    function seleziona(b, focus) {
      $$('[role="radio"]', contenitore).forEach(function (x) {
        var si = x === b;
        x.setAttribute('aria-checked', si ? 'true' : 'false');
        x.tabIndex = si ? 0 : -1;
      });
      if (focus) b.focus();
      alCambio(b);
    }
    $$('[role="radio"]', contenitore).forEach(function (b) {
      b.tabIndex = b.getAttribute('aria-checked') === 'true' ? 0 : -1;
      b.addEventListener('click', function () {
        if (b.getAttribute('aria-disabled') === 'true' || b.getAttribute('aria-checked') === 'true') return;
        seleziona(b, false);
      });
    });
    contenitore.addEventListener('keydown', function (e) {
      var tasti = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 };
      if (!(e.key in tasti)) return;
      var v = voci(); var i = v.indexOf(document.activeElement);
      if (i < 0) return;
      e.preventDefault();
      seleziona(v[(i + tasti[e.key] + v.length) % v.length], true);
    });
    return { seleziona: seleziona };
  }

  /* ---------- catalogo ---------- */
  var griglia = $('[data-griglia]');
  var conteggio = $('[data-conteggio]');
  var stato = { tipo: 'cancelli', stile: 'classico' };
  var stiliBox = $('[data-stili]');
  var corrente = [];

  function insieme() {
    var t = LAVORI[stato.tipo];
    if (!t) return null;
    return t.unico ? { chiave: 'unico', dati: t.unico } : { chiave: stato.stile, dati: t[stato.stile] };
  }

  function disegnaGriglia() {
    var s = insieme();
    if (!s || !griglia) return;
    corrente = s.dati.voci;
    griglia.innerHTML = corrente.map(function (v, i) {
      return '<li class="lavoro" style="view-transition-name:l' + i + '"><button class="lavoro-btn" type="button" data-i="' + i + '" aria-label="Apri ' + v[2] + ' ' + v[1] + '">' +
        '<img src="assets/img/g/' + v[0] + '.jpg" width="560" height="560" loading="lazy" decoding="async" alt="' + v[2] + ' in ferro, modello ' + v[1] + '">' +
        '<span class="lavoro-codice">' + v[1] + '</span></button></li>';
    }).join('');
    var nome = NOMI[stato.tipo];
    conteggio.innerHTML = 'Stai guardando <strong>' + corrente.length + '</strong> ' + (nome.f ? 'delle' : 'dei') + ' <strong>' + s.dati.n + '</strong> ' + nome[s.chiave] + (nome.f ? ' fotografate' : ' fotografati') + ' in archivio.';
  }

  function cambiaCatalogo() {
    var t = LAVORI[stato.tipo];
    var senzaStile = !!(t && t.unico);
    $$('[role="radio"]', stiliBox).forEach(function (b) {
      if (senzaStile) b.setAttribute('aria-disabled', 'true'); else b.removeAttribute('aria-disabled');
    });
    if (document.startViewTransition && !meno) document.startViewTransition(disegnaGriglia);
    else disegnaGriglia();
  }

  if (griglia && stiliBox) {
    gruppoRadio(stiliBox, function (b) { stato.stile = b.dataset.stile; cambiaCatalogo(); });
    gruppoRadio($('[data-tipi]'), function (b) { stato.tipo = b.dataset.tipo; cambiaCatalogo(); });
    corrente = insieme() ? insieme().dati.voci : [];
    griglia.addEventListener('click', function (e) {
      var b = e.target.closest('.lavoro-btn');
      if (b) apriLb(+b.dataset.i);
    });
  }

  /* ---------- lightbox ---------- */
  var lb = $('[data-lb]');
  var lbImg = $('[data-lb-img]');
  var lbI = 0;

  function mostraLb(i) {
    lbI = (i + corrente.length) % corrente.length;
    var v = corrente[lbI];
    lbImg.src = 'assets/img/xl/' + v[0] + '.jpg';
    lbImg.width = v[3]; lbImg.height = v[4];
    lbImg.alt = v[2] + ' in ferro, modello ' + v[1];
    $('[data-lb-tipo]').textContent = v[2];
    $('[data-lb-codice]').textContent = v[1];
    $('[data-lb-cta]').textContent = 'Chiedi un preventivo per ' + v[1].split(' / ')[0];
  }
  function apriLb(i) {
    if (!lb || !corrente.length) return;
    mostraLb(i);
    if (typeof lb.showModal === 'function') lb.showModal(); else lb.setAttribute('open', '');
    root.style.overflow = 'hidden';
  }
  function chiudiLb() { if (lb.open) lb.close(); }
  if (lb) {
    lb.addEventListener('close', function () { root.style.overflow = ''; });
    $('[data-lb-prec]').addEventListener('click', function () { mostraLb(lbI - 1); });
    $('[data-lb-succ]').addEventListener('click', function () { mostraLb(lbI + 1); });
    $('[data-lb-chiudi]').addEventListener('click', chiudiLb);
    lb.addEventListener('click', function (e) { if (e.target.classList.contains('lb-in') || e.target === lb || e.target.classList.contains('lb-figura')) chiudiLb(); });
    lb.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowLeft') mostraLb(lbI - 1);
      if (e.key === 'ArrowRight') mostraLb(lbI + 1);
    });
    var x0 = null;
    lbImg.addEventListener('pointerdown', function (e) { x0 = e.clientX; });
    lbImg.addEventListener('pointerup', function (e) {
      if (x0 === null) return;
      var dx = e.clientX - x0; x0 = null;
      if (Math.abs(dx) > 45) mostraLb(lbI + (dx < 0 ? 1 : -1));
    });
    $('[data-lb-cta]').addEventListener('click', function (e) {
      e.preventDefault();
      precompila(corrente[lbI]);
      chiudiLb();
      var dest = $('#preventivo');
      dest.scrollIntoView({ behavior: meno ? 'auto' : 'smooth' });
      setTimeout(function () { var n = $('#f-nome'); if (n) n.focus({ preventScroll: true }); }, meno ? 0 : 700);
    });
  }

  // dal lavoro scelto al form: modello, tipo e stile già compilati
  function precompila(v) {
    var mod = $('[data-campo-modello]');
    if (mod) mod.value = v[1] + ' (' + v[2].toLowerCase() + ')';
    var codice = v[1];
    var voluti = [];
    if (stato.tipo === 'cancelli') {
      var pedonale = /C\b/.test(codice.replace(/ \/ .*/, '')) || /C$/.test(codice);
      var entrambi = codice.indexOf(' / ') > -1;
      if (entrambi) voluti = ['Cancello carrabile', 'Cancello pedonale'];
      else voluti = [pedonale ? 'Cancello pedonale' : 'Cancello carrabile'];
    } else {
      voluti = [{ recinzioni: 'Recinzione', poggioli: 'Poggiolo', inferriate: 'Inferriate', scale: 'Scala', tettoie: 'Tettoia o pensilina', complementi: 'Complementi' }[stato.tipo]];
    }
    voluti.forEach(function (val) { var c = $('[data-scelte-tipo] input[value="' + val + '"]'); if (c) c.checked = true; });
    if (!LAVORI[stato.tipo].unico) {
      var r = $('input[name="stile"][value="' + (stato.stile === 'classico' ? 'Classico' : 'Moderno') + '"]');
      if (r) r.checked = true;
    }
  }

  /* ---------- finiture: la texture vera dentro le lettere ---------- */
  var FINITURE = [
    { s: 'base-nera-forgia-oro', base: 'Nera Forgia', tocco: 'Oro', g: 'nera' },
    { s: 'base-nera-forgia-oro-rame', base: 'Nera Forgia', tocco: 'Oro e rame', g: 'nera' },
    { s: 'base-nera-forgia-rame-argento', base: 'Nera Forgia', tocco: 'Rame e argento', g: 'nera' },
    { s: 'base-nera-forgia-argento', base: 'Nera Forgia', tocco: 'Argento', g: 'nera' },
    { s: 'base-nera-forgia-canna-di-fucile', base: 'Nera Forgia', tocco: 'Canna di fucile', g: 'nera' },
    { s: 'base-bianco-veneziano-oro', base: 'Bianco Veneziano', tocco: 'Oro', g: 'bianca' },
    { s: 'base-bianco-veneziano-oro-rame', base: 'Bianco Veneziano', tocco: 'Oro e rame', g: 'bianca' },
    { s: 'base-bianco-veneziano-rame', base: 'Bianco Veneziano', tocco: 'Rame', g: 'bianca' },
    { s: 'base-bianco-veneziano-argento', base: 'Bianco Veneziano', tocco: 'Argento', g: 'bianca' },
    { s: 'base-bianco-ghiaccio-antracite', base: 'Bianco Ghiaccio', tocco: 'Antracite', g: 'bianca' }
  ];
  var prova = $('[data-fin-prova]');
  var sezFin = $('[data-finiture]');

  function preparaFiniture() {
    if (!prova || prova.dataset.pronta) return;
    prova.dataset.pronta = '1';
    FINITURE.forEach(function (f, i) {
      var b = document.createElement('button');
      b.type = 'button'; b.className = 'campione';
      b.setAttribute('role', 'radio');
      b.setAttribute('aria-checked', i === 0 ? 'true' : 'false');
      b.setAttribute('aria-label', 'Base ' + f.base + ', tocco ' + f.tocco.toLowerCase());
      b.dataset.i = i;
      b.style.backgroundImage = 'url(assets/img/finiture/' + f.s + '.jpg)';
      $('[data-campioni="' + f.g + '"]', prova).appendChild(b);
    });
    applicaFinitura(0, false);
    // un unico gruppo logico per la tastiera, anche se diviso in due righe
    gruppoRadio(prova, function (b) { applicaFinitura(+b.dataset.i, true); });
  }

  function applicaFinitura(i, anima) {
    var f = FINITURE[i];
    prova.style.setProperty('--texture', 'url(assets/img/finiture/' + f.s + '.jpg)');
    prova.dataset.base = f.g;
    $('[data-fin-base]').textContent = f.base;
    $('[data-fin-tocco]').textContent = f.tocco;
    if (anima && !meno) {
      prova.classList.remove('cambio'); void prova.offsetWidth; prova.classList.add('cambio');
      $$('.fin-nome span', prova).forEach(function (s) { s.style.backgroundPosition = (Math.random() * 300 | 0) + 'px 50%'; });
    }
  }

  if (sezFin && 'IntersectionObserver' in window) {
    var ioFin = new IntersectionObserver(function (voci) {
      if (voci.some(function (v) { return v.isIntersecting; })) { preparaFiniture(); ioFin.disconnect(); }
    }, { rootMargin: '700px 0px' });
    ioFin.observe(sezFin);
  } else preparaFiniture();

  /* ---------- metodo: il calore corre lungo la barra ---------- */
  var passi = $('[data-passi]');
  var listaPassi = passi ? $$('.passo', passi) : [];
  if (passi) passi.style.setProperty('--p', '0');
  function aggiornaPassi() {
    if (!passi) return;
    var r = passi.getBoundingClientRect();
    var linea = window.innerHeight * .62;
    var p = Math.max(0, Math.min(1, (linea - r.top - 22) / Math.max(r.height - 44, 1)));
    passi.style.setProperty('--p', p.toFixed(4));
    passi.style.setProperty('--punta', p > 0 && p < 1 ? '1' : '0');
    listaPassi.forEach(function (li) {
      var n = $('.passo-n', li).getBoundingClientRect();
      li.classList.toggle('acceso', n.top + n.height / 2 < linea);
    });
  }

  var inCoda = false;
  window.addEventListener('scroll', function () {
    if (inCoda) return; inCoda = true;
    requestAnimationFrame(function () { inCoda = false; alloScroll(); });
  }, { passive: true });
  window.addEventListener('resize', alloScroll);
  alloScroll();

  /* ---------- form: compone l'email per info@defam.it ---------- */
  var modulo = $('[data-modulo]');
  if (modulo) {
    var errore = $('[data-errore]');
    var nota = $('[data-nota]');
    modulo.addEventListener('submit', function (e) {
      e.preventDefault();
      var f = modulo.elements;
      var mancanti = [];
      [['nome', 'nome e cognome'], ['telefono', 'telefono'], ['comune', 'comune del lavoro']].forEach(function (c) {
        var el = f[c[0]];
        var vuoto = !el.value.trim() || (c[0] === 'telefono' && el.value.replace(/\D/g, '').length < 6);
        el.setAttribute('aria-invalid', vuoto ? 'true' : 'false');
        if (vuoto) mancanti.push(c);
      });
      if (mancanti.length) {
        errore.textContent = 'Per richiamarti ci servono: ' + mancanti.map(function (c) { return c[1]; }).join(', ') + '.';
        errore.hidden = false;
        f[mancanti[0][0]].focus();
        return;
      }
      errore.hidden = true;
      var tipi = $$('input[name="tipo"]:checked', modulo).map(function (c) { return c.value; });
      var stile = ($('input[name="stile"]:checked', modulo) || {}).value || 'Da decidere';
      var righe = [
        'Buongiorno,',
        'vorrei prenotare un sopralluogo gratuito.',
        '',
        'Nome: ' + f.nome.value.trim(),
        'Telefono: ' + f.telefono.value.trim(),
        'Comune del lavoro: ' + f.comune.value.trim(),
        'Cosa mi serve: ' + (tipi.length ? tipi.join(', ') : 'da definire'),
        'Stile: ' + stile
      ];
      if (f.modello.value.trim()) righe.push('Modello visto nel catalogo: ' + f.modello.value.trim());
      if (f.note.value.trim()) righe.push('', 'Note: ' + f.note.value.trim());
      righe.push('', 'Grazie, attendo una vostra chiamata.');
      var oggetto = 'Richiesta sopralluogo gratuito - ' + f.nome.value.trim();
      window.location.href = 'mailto:info@defam.it?subject=' + encodeURIComponent(oggetto) + '&body=' + encodeURIComponent(righe.join('\n'));
      nota.textContent = 'Si è aperta la tua app di posta con il messaggio pronto: controlla e premi Invia. Se non si è aperta, chiamaci allo 0423 723441.';
      nota.classList.add('ok');
    });
    $$('input[required]', modulo).forEach(function (el) {
      el.addEventListener('input', function () { if (el.getAttribute('aria-invalid') === 'true' && el.value.trim()) el.setAttribute('aria-invalid', 'false'); });
    });
  }

  /* ---------- anno nel piede ---------- */
  $$('[data-anno]').forEach(function (el) { el.textContent = new Date().getFullYear(); });
})();
