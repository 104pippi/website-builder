/* Rossi Mario — interazioni del sito (nessuna libreria) */
(function () {
  'use strict';

  var MAIL = 'info@rossimario.com';
  var riduci = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  /* ---------- Hero: si posano le tessere quando la foto è pronta ---------- */
  var hero = $('[data-hero]');
  if (hero) {
    var posata = false;
    var posa = function () { if (!posata) { posata = true; hero.classList.add('posa'); } };
    var foto = new Image();
    foto.src = 'assets/img/hero.jpg';
    (foto.decode ? foto.decode() : Promise.resolve()).then(posa, posa);
    setTimeout(posa, 1600);
  }

  /* ---------- Testata e barra contatti ---------- */
  var testata = $('[data-testata]');
  var barra = $('.barra');
  var aggiornaScroll = function () {
    var y = window.scrollY || window.pageYOffset;
    if (testata) testata.classList.toggle('solida', y > 40);
    if (barra) barra.classList.toggle('visibile', y > 420 && !document.documentElement.classList.contains('menu-aperto'));
  };
  window.addEventListener('scroll', aggiornaScroll, { passive: true });
  aggiornaScroll();

  /* ---------- Menu mobile ---------- */
  var menuBtn = $('[data-menu]');
  var menu = $('#menu');
  var menuTesto = menuBtn && $('.menu-apri-txt', menuBtn);
  var impostaMenu = function (aperto) {
    menu.classList.toggle('aperto', aperto);
    document.documentElement.classList.toggle('menu-aperto', aperto);
    menuBtn.setAttribute('aria-expanded', String(aperto));
    if (menuTesto) menuTesto.textContent = aperto ? 'Chiudi' : 'Menu';
    aggiornaScroll();
  };
  var chiudiMenu = function () { if (menu && menuBtn) impostaMenu(false); };
  if (menuBtn && menu) {
    menuBtn.addEventListener('click', function () { impostaMenu(!menu.classList.contains('aperto')); });
    $$('a', menu).forEach(function (a) { a.addEventListener('click', chiudiMenu); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') chiudiMenu(); });
  }

  /* ---------- Muro dei reparti: posa in diagonale quando entra in vista ---------- */
  var muro = $('[data-muro]');
  if (muro) {
    var posaMuro = function () {
      var colonne = getComputedStyle(muro).gridTemplateColumns.split(' ').length || 2;
      $$('.piastrella', muro).forEach(function (p, i) {
        p.style.setProperty('--d', Math.floor(i / colonne) + (i % colonne));
      });
      muro.classList.add('posa');
    };
    if ('IntersectionObserver' in window && !riduci) {
      var ioMuro = new IntersectionObserver(function (voci) {
        if (voci[0].isIntersecting) { posaMuro(); ioMuro.disconnect(); }
      }, { threshold: 0.18 });
      ioMuro.observe(muro);
    } else {
      posaMuro();
    }
  }

  /* ---------- Schede dei reparti ---------- */
  var apriScheda = function (d) {
    if (!d) return;
    if (typeof d.showModal === 'function') d.showModal(); else d.setAttribute('open', '');
    document.body.classList.add('bloccato');
  };
  $$('[data-apri]').forEach(function (b) {
    var d = document.getElementById(b.getAttribute('data-apri'));
    // al primo tocco o passaggio del mouse le foto della scheda iniziano a caricare
    var precarica = function () { if (d) $$('img[loading="lazy"]', d).forEach(function (i) { i.loading = 'eager'; }); };
    ['pointerenter', 'touchstart', 'focus'].forEach(function (ev) { b.addEventListener(ev, precarica, { once: true, passive: true }); });
    b.addEventListener('click', function () { precarica(); apriScheda(d); });
  });
  $$('dialog.reparto').forEach(function (d) {
    d.addEventListener('close', function () { document.body.classList.remove('bloccato'); });
    d.addEventListener('click', function (e) { if (e.target === d) d.close(); });
    $$('[data-chiudi]', d).forEach(function (b) { b.addEventListener('click', function () { d.close(); }); });
  });

  /* ---------- Preselezione dell'interesse nel modulo ---------- */
  var seleziona = function (valore) {
    $$('input[name="interessi"]').forEach(function (c) { if (c.value === valore) c.checked = true; });
  };
  $$('[data-interesse]').forEach(function (a) {
    a.addEventListener('click', function (e) {
      seleziona(a.getAttribute('data-interesse'));
      var d = a.closest('dialog');
      if (d) {
        e.preventDefault();
        d.close();
        var visita = document.getElementById('visita');
        if (visita) visita.scrollIntoView({ behavior: riduci ? 'auto' : 'smooth' });
      }
    });
  });

  /* ---------- Confronto render: scena neutra / soluzione scelta ---------- */
  var confronto = $('[data-confronto]');
  if (confronto) {
    var range = $('[data-range]', confronto);
    var imgPrima = $('[data-prima]', confronto);
    var imgDopo = $('[data-dopo]', confronto);
    var etichetta = $('[data-etichetta]', confronto);
    var invitoFatto = false;
    var timer = [];
    var imposta = function (v) { confronto.style.setProperty('--pos', v + '%'); range.value = v; };
    var fermaInvito = function () {
      timer.forEach(clearTimeout); timer = [];
      confronto.classList.remove('invito');
    };
    range.addEventListener('input', function () { fermaInvito(); confronto.style.setProperty('--pos', range.value + '%'); });
    range.addEventListener('pointerdown', fermaInvito);

    $$('[data-esempio]').forEach(function (b) {
      b.addEventListener('click', function () {
        var p = b.getAttribute('data-esempio').split('|');
        var nuove = [new Image(), new Image()];
        nuove[0].src = 'assets/img/' + p[0];
        nuove[1].src = 'assets/img/' + p[1];
        Promise.all(nuove.map(function (i) { return i.decode ? i.decode().catch(function () {}) : null; })).then(function () {
          imgPrima.src = nuove[0].src;
          imgDopo.src = nuove[1].src;
          etichetta.textContent = p[2];
          imgDopo.alt = 'Render del bagno: ' + p[2].toLowerCase();
        });
        $$('[data-esempio]').forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
        fermaInvito();
        imposta(50);
      });
    });

    var invito = function () {
      if (invitoFatto || riduci) return;
      invitoFatto = true;
      confronto.classList.add('invito');
      timer.push(setTimeout(function () { imposta(76); }, 150));
      timer.push(setTimeout(function () { imposta(26); }, 1150));
      timer.push(setTimeout(function () { imposta(50); }, 2150));
      timer.push(setTimeout(function () { confronto.classList.remove('invito'); }, 3100));
    };
    if ('IntersectionObserver' in window) {
      var ioConf = new IntersectionObserver(function (voci) {
        if (voci[0].isIntersecting) { invito(); ioConf.disconnect(); }
      }, { threshold: 0.6 });
      ioConf.observe(confronto);
    }
  }

  /* ---------- Aperto ora? (ora di Roma, festivi nazionali inclusi) ---------- */
  var ORARI = { 0: [], 1: [[510, 750], [900, 1140]], 2: [[510, 750], [900, 1140]], 3: [[510, 750], [900, 1140]], 4: [[510, 750], [900, 1140]], 5: [[510, 750], [900, 1140]], 6: [[510, 750]] };
  var GIORNI = ['domenica', 'lunedì', 'martedì', 'mercoledì', 'giovedì', 'venerdì', 'sabato'];
  var pasquetta = function (a) {
    var b = a % 19, c = Math.floor(a / 100), d = a % 100, e = Math.floor(c / 4), f = c % 4, g = Math.floor((c + 8) / 25),
      h = Math.floor((c - g + 1) / 3), i = (19 * b + c - e - h + 15) % 30, k = Math.floor(d / 4), l = d % 4,
      m = (32 + 2 * f + 2 * k - i - l) % 7, n = Math.floor((b + 11 * i + 22 * m) / 451),
      mese = Math.floor((i + m - 7 * n + 114) / 31), giorno = ((i + m - 7 * n + 114) % 31) + 1;
    var p = new Date(a, mese - 1, giorno + 1);
    return (p.getMonth() + 1) + '-' + p.getDate();
  };
  var festivo = function (dt) {
    var k = (dt.getMonth() + 1) + '-' + dt.getDate();
    return ['1-1', '1-6', '4-25', '5-1', '6-2', '8-15', '11-1', '12-8', '12-25', '12-26'].indexOf(k) > -1 || k === pasquetta(dt.getFullYear());
  };
  var hhmm = function (m) { return Math.floor(m / 60) + ':' + ('0' + (m % 60)).slice(-2); };
  var statoTesto = function () {
    var ora;
    try { ora = new Date(new Date().toLocaleString('en-US', { timeZone: 'Europe/Rome' })); } catch (e) { ora = new Date(); }
    if (isNaN(ora)) ora = new Date();
    var min = ora.getHours() * 60 + ora.getMinutes();
    var oggi = festivo(ora) ? [] : ORARI[ora.getDay()];
    for (var s = 0; s < oggi.length; s++) {
      if (min >= oggi[s][0] && min < oggi[s][1]) return { aperto: true, testo: 'Aperto ora, chiude alle ' + hhmm(oggi[s][1]) };
      if (min < oggi[s][0]) return { aperto: false, testo: 'Chiuso ora, ' + (s === 0 ? 'apre' : 'riapre') + ' alle ' + hhmm(oggi[s][0]) };
    }
    for (var k = 1; k < 9; k++) {
      var g = new Date(ora.getFullYear(), ora.getMonth(), ora.getDate() + k);
      var fasce = festivo(g) ? [] : ORARI[g.getDay()];
      if (fasce.length) {
        return { aperto: false, testo: 'Chiuso ora, riapre ' + (k === 1 ? 'domani' : GIORNI[g.getDay()]) + ' alle ' + hhmm(fasce[0][0]) };
      }
    }
    return null;
  };
  var stato = statoTesto();
  if (stato) {
    $$('[data-stato]').forEach(function (el) {
      $('[data-stato-testo]', el).textContent = stato.testo;
      el.classList.toggle('aperto', stato.aperto);
      el.hidden = false;
    });
  }

  /* ---------- Modulo: compone l'email di richiesta ---------- */
  var modulo = $('[data-modulo]');
  if (modulo) {
    var errore = $('[data-errore]', modulo);
    modulo.addEventListener('submit', function (e) {
      e.preventDefault();
      var nome = modulo.nome.value.trim();
      var tel = modulo.telefono.value.trim();
      var mancanti = [];
      modulo.nome.setAttribute('aria-invalid', String(!nome));
      var telOk = tel.replace(/\D/g, '').length >= 6;
      modulo.telefono.setAttribute('aria-invalid', String(!telOk));
      if (!nome) mancanti.push('il nome');
      if (!telOk) mancanti.push('un numero di telefono valido');
      if (mancanti.length) {
        errore.textContent = 'Per inviare la richiesta inserisci ' + mancanti.join(' e ') + '.';
        errore.hidden = false;
        (!nome ? modulo.nome : modulo.telefono).focus();
        return;
      }
      errore.hidden = true;
      var interessi = $$('input[name="interessi"]:checked', modulo).map(function (c) { return c.value; });
      var righe = [
        'Buongiorno,',
        'vorrei prenotare una visita nel vostro showroom di Staranzano.',
        '',
        'Nome: ' + nome,
        'Telefono: ' + tel,
        'Vorrei vedere: ' + (interessi.length ? interessi.join(', ') : 'da definire'),
        'Quando preferisco venire: ' + modulo.quando.value
      ];
      var note = modulo.note.value.trim();
      if (note) righe.push('Note: ' + note);
      righe.push('', 'Grazie, attendo una vostra chiamata per confermare.');
      var oggetto = 'Richiesta visita showroom - ' + nome;
      window.location.href = 'mailto:' + MAIL + '?subject=' + encodeURIComponent(oggetto) + '&body=' + encodeURIComponent(righe.join('\n'));
    });
  }

  /* ---------- Anno nel piede ---------- */
  $$('[data-anno]').forEach(function (el) { el.textContent = new Date().getFullYear(); });
})();
