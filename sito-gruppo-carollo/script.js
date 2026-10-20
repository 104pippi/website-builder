/* Gruppo Carollo — demo. Intro, menu, tapparelle, profilo 3D, modulo preventivo. */
(function () {
  'use strict';
  var doc = document.documentElement;
  var ridotto = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* Intro: le ante si aprono quando il font è pronto (al massimo dopo 900 ms) */
  var partito = false;
  function avvia() {
    if (partito) return;
    partito = true;
    doc.classList.add('avvio');
    var hero = document.querySelector('.hero');
    setTimeout(function () { if (hero) hero.classList.add('aperta'); }, ridotto ? 0 : 2400);
  }
  if (document.fonts && document.fonts.load) {
    document.fonts.load('850 italic 64px Saira').then(avvia, avvia);
  }
  setTimeout(avvia, 900);

  /* Testata piena dopo il primo scroll */
  var testata = document.getElementById('testata');
  function aggiornaTestata() { testata.classList.toggle('piena', window.scrollY > 24); }

  /* Menu mobile */
  var bottoneMenu = document.querySelector('.testata__menu');
  var menu = document.getElementById('menu-mobile');
  function chiudiMenu() {
    menu.hidden = true;
    bottoneMenu.setAttribute('aria-expanded', 'false');
    bottoneMenu.querySelector('.testata__menu-testo').textContent = 'Menu';
    doc.style.overflow = '';
  }
  bottoneMenu.addEventListener('click', function () {
    var aperto = bottoneMenu.getAttribute('aria-expanded') === 'true';
    if (aperto) { chiudiMenu(); return; }
    menu.hidden = false;
    bottoneMenu.setAttribute('aria-expanded', 'true');
    bottoneMenu.querySelector('.testata__menu-testo').textContent = 'Chiudi';
    doc.style.overflow = 'hidden';
    testata.classList.add('piena');
  });
  menu.addEventListener('click', function (e) { if (e.target.closest('a')) chiudiMenu(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !menu.hidden) { chiudiMenu(); bottoneMenu.focus(); } });

  /* Tapparelle: la foto si scopre quando entra nello schermo */
  var tapparelle = document.querySelectorAll('[data-tapparella]');
  if ('IntersectionObserver' in window && !ridotto) {
    var io = new IntersectionObserver(function (voci) {
      voci.forEach(function (v) {
        if (v.isIntersecting) { v.target.classList.add('in'); io.unobserve(v.target); }
      });
    }, { rootMargin: '0px 0px 6% 0px', threshold: 0 });
    tapparelle.forEach(function (el) { io.observe(el); });
  } else {
    tapparelle.forEach(function (el) { el.classList.add('in'); });
  }

  /* Profilo: passi e barra seguono lo scroll; la scena 3D arriva dopo */
  var profilo = document.getElementById('profilo');
  var passi = profilo ? Array.prototype.slice.call(profilo.querySelectorAll('.passo')) : [];
  var barra = profilo ? profilo.querySelector('.profilo__barra') : null;
  function progressoProfilo() {
    var r = profilo.getBoundingClientRect();
    var corsa = profilo.offsetHeight - window.innerHeight;
    if (corsa <= 0) return 0;
    return Math.min(1, Math.max(0, -r.top / corsa));
  }
  window.__progressoProfilo = progressoProfilo;
  function aggiornaProfilo() {
    if (!profilo || ridotto) return;
    var p = progressoProfilo();
    barra.style.setProperty('--p', p.toFixed(4));
    var attivo = 0;
    passi.forEach(function (el, i) { if (p >= parseFloat(el.getAttribute('data-da'))) attivo = i; });
    passi.forEach(function (el, i) { el.classList.toggle('attivo', i === attivo); });
  }

  /* Linea del tempo che si riempie */
  var linea = document.querySelector('.linea');
  function aggiornaLinea() {
    if (!linea) return;
    var r = linea.getBoundingClientRect();
    var a = (window.innerHeight * 0.6 - r.top) / r.height;
    linea.style.setProperty('--avanzamento', Math.min(1, Math.max(0, a)).toFixed(4));
  }

  var inCoda = false;
  function alloScroll() {
    if (inCoda) return;
    inCoda = true;
    requestAnimationFrame(function () {
      inCoda = false;
      aggiornaTestata();
      aggiornaProfilo();
      aggiornaLinea();
    });
  }
  window.addEventListener('scroll', alloScroll, { passive: true });
  window.addEventListener('resize', alloScroll);
  aggiornaTestata(); aggiornaProfilo(); aggiornaLinea();

  function webglOk() {
    try {
      var c = document.createElement('canvas');
      return !!(window.WebGL2RenderingContext && c.getContext('webgl2'));
    } catch (e) { return false; }
  }
  function caricaScena() {
    if (!profilo) return;
    if (!webglOk()) { profilo.classList.add('senza-3d'); return; }
    import('./3d.js').then(function (m) {
      return m.avvia(profilo, { ridotto: ridotto });
    }).then(function () {
      profilo.classList.add('pronto');
    }).catch(function (err) {
      console.warn('Scena 3D non disponibile:', err);
      profilo.classList.add('senza-3d');
    });
  }
  function quandoServe() {
    if (!profilo) return;
    if (!('IntersectionObserver' in window)) { caricaScena(); return; }
    var vicino = new IntersectionObserver(function (voci) {
      if (voci.some(function (v) { return v.isIntersecting; })) { vicino.disconnect(); caricaScena(); }
    }, { rootMargin: '120% 0px 120% 0px' });
    vicino.observe(profilo);
  }
  if (document.readyState === 'complete') quandoServe();
  else window.addEventListener('load', quandoServe);

  /* "Chiedi un preventivo per…": spunta già il tipo di lavoro nel modulo */
  document.querySelectorAll('[data-tipo]').forEach(function (a) {
    a.addEventListener('click', function () {
      var tipo = a.getAttribute('data-tipo');
      document.querySelectorAll('#tipi input').forEach(function (inp) {
        if (inp.value === tipo) inp.checked = true;
      });
    });
  });

  /* Modulo: compone la mail per l'ufficio con tutti i dati */
  var modulo = document.getElementById('modulo');
  var errore = document.getElementById('modulo-errore');
  var ok = document.getElementById('modulo-ok');
  modulo.addEventListener('submit', function (e) {
    e.preventDefault();
    var f = modulo.elements;
    var mancanti = [];
    modulo.querySelectorAll('.campo').forEach(function (c) { c.classList.remove('errore'); });
    if (!f.nome.value.trim()) { mancanti.push('nome'); f.nome.closest('.campo').classList.add('errore'); }
    var tel = f.telefono.value.replace(/[^\d+]/g, '');
    if (tel.length < 6) { mancanti.push('telefono'); f.telefono.closest('.campo').classList.add('errore'); }
    if (!f.privacy.checked) mancanti.push('consenso privacy');
    if (mancanti.length) {
      errore.textContent = 'Manca: ' + mancanti.join(', ') + '.';
      errore.hidden = false;
      ok.hidden = true;
      return;
    }
    errore.hidden = true;
    var tipi = Array.prototype.slice.call(modulo.querySelectorAll('input[name="tipo"]:checked')).map(function (i) { return i.value; });
    var per = modulo.querySelector('input[name="per"]:checked');
    var righe = [
      'Buongiorno, vorrei un preventivo.',
      '',
      'Lavoro: ' + (tipi.length ? tipi.join(', ') : 'da definire'),
      'Per: ' + (per ? per.value : '-'),
      'Comune del cantiere: ' + (f.comune.value.trim() || '-'),
      'Quantità indicativa: ' + (f.quanti.value || '-'),
      'Tempi: ' + (f.quando.value || '-'),
      '',
      'Note: ' + (f.note.value.trim() || '-'),
      '',
      'Nome: ' + f.nome.value.trim(),
      'Telefono: ' + f.telefono.value.trim(),
      'Email: ' + (f.email.value.trim() || '-'),
      '',
      '(Richiesta inviata dal sito)'
    ];
    var oggetto = 'Richiesta preventivo' + (tipi.length ? ': ' + tipi[0] : '') + (f.comune.value.trim() ? ' a ' + f.comune.value.trim() : '');
    var url = 'mailto:info@gruppocarollo.it?subject=' + encodeURIComponent(oggetto) + '&body=' + encodeURIComponent(righe.join('\n'));
    ok.hidden = false;
    window.location.href = url;
  });

  var anno = document.getElementById('anno');
  if (anno) anno.textContent = new Date().getFullYear();
})();
