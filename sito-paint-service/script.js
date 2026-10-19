/* Paint Service — interazioni della pagina. Il 3D sta in 3d.js e arriva dopo il load. */
(function () {
  'use strict';
  var doc = document.documentElement;
  var riduci = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  window.PS = window.PS || {};

  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }

  document.addEventListener('DOMContentLoaded', function () {
    var testata = document.querySelector('[data-testata]');
    var hero = document.querySelector('[data-hero]');

    /* anno nel piede */
    var anno = document.querySelector('[data-anno]');
    if (anno) anno.textContent = new Date().getFullYear();

    /* menu su telefono */
    var bottoneMenu = document.querySelector('[data-menu]');
    var menu = document.getElementById('menu-mobile');
    function chiudiMenu() {
      if (!menu || menu.hidden) return;
      menu.hidden = true;
      bottoneMenu.setAttribute('aria-expanded', 'false');
      bottoneMenu.textContent = 'Menu';
      testata.classList.remove('testata--aperta');
      document.body.style.overflow = '';
    }
    if (bottoneMenu && menu) {
      bottoneMenu.addEventListener('click', function () {
        if (!menu.hidden) { chiudiMenu(); return; }
        menu.hidden = false;
        bottoneMenu.setAttribute('aria-expanded', 'true');
        bottoneMenu.textContent = 'Chiudi';
        testata.classList.add('testata--aperta');
        document.body.style.overflow = 'hidden';
      });
      menu.addEventListener('click', function (e) { if (e.target.closest('a')) chiudiMenu(); });
      document.addEventListener('keydown', function (e) { if (e.key === 'Escape') chiudiMenu(); });
    }

    /* privacy nel piede */
    var privacy = document.getElementById('privacy');
    document.querySelectorAll('[data-privacy]').forEach(function (a) {
      a.addEventListener('click', function () { privacy.hidden = false; });
    });
    if (location.hash === '#privacy' && privacy) privacy.hidden = false;

    /* hero: se il rullo 3D non parte in tempo, il colore arriva con una pennellata CSS */
    if (hero) {
      if (riduci) {
        hero.classList.add('hero--colorata');
      } else {
        var lenta = navigator.connection && (navigator.connection.saveData || /2g/.test(navigator.connection.effectiveType || ''));
        setTimeout(function () {
          if (!window.PS.heroPartito && !hero.classList.contains('hero--colorata')) {
            window.PS.heroSaltato = true;
            hero.classList.add('hero--pennellata');
          }
        }, lenta ? 0 : Math.max(600, 4500 - performance.now()));
      }
    }

    /* comparse: si osserva il contenitore, la classe va a lui (il figlio ha il clip-path) */
    var daRivelare = document.querySelectorAll('[data-rivela]');
    if ('IntersectionObserver' in window && !riduci) {
      var io = new IntersectionObserver(function (voci) {
        voci.forEach(function (v) {
          if (v.isIntersecting) { v.target.classList.add('in'); io.unobserve(v.target); }
        });
      }, { rootMargin: '0px 0px -12% 0px', threshold: 0.01 });
      daRivelare.forEach(function (el) { io.observe(el); });
    } else {
      daRivelare.forEach(function (el) { el.classList.add('in'); });
    }

    /* la mazzetta: parte chiusa a ventaglio e si apre in lista quando entra */
    var mazzetta = document.querySelector('[data-mazzetta]');
    if (mazzetta && 'IntersectionObserver' in window && !riduci) {
      var strisce = Array.prototype.slice.call(mazzetta.children);
      var misura = function () {
        if (!mazzetta.classList.contains('mazzetta--chiusa')) return;
        var base = strisce[0].offsetTop;
        strisce.forEach(function (s) { s.style.setProperty('--dy', (base - s.offsetTop) + 'px'); });
      };
      mazzetta.classList.add('mazzetta--chiusa');
      misura();
      window.addEventListener('resize', misura);
      var ioM = new IntersectionObserver(function (voci) {
        if (voci[0].isIntersecting) {
          mazzetta.classList.remove('mazzetta--chiusa');
          ioM.disconnect();
        }
      }, { rootMargin: '0px 0px -30% 0px', threshold: 0.01 });
      ioM.observe(mazzetta);
    }

    /* effetti legati allo scroll: un solo giro per fotogramma */
    var palco = document.querySelector('[data-palco]');
    var corsa = document.querySelector('[data-corsa]');
    var conScroll = document.querySelectorAll('[data-scroll]');
    var metodo = document.querySelector('.metodo__corpo');
    var inAttesa = false;

    function aggiorna() {
      inAttesa = false;
      var h = window.innerHeight;
      var y = window.scrollY;
      if (testata) testata.classList.toggle('testata--piena', y > h * 0.75);

      if (palco && corsa) {
        var r = corsa.getBoundingClientRect();
        var p = clamp(-r.top / Math.max(1, r.height - h), 0, 1);
        var s = Math.min(p * 7, 6.999);
        window.PS.pareteS = s;
        var passo = String(Math.floor(s));
        if (palco.dataset.passo !== passo) palco.dataset.passo = passo;
      }

      conScroll.forEach(function (el) {
        var rr = el.getBoundingClientRect();
        var pp = riduci ? 1 : clamp((h - rr.top) / (h * 0.85), 0, 1);
        el.style.setProperty('--p', pp.toFixed(4));
      });
      if (metodo) {
        var rm = metodo.getBoundingClientRect();
        var pm = riduci ? 1 : clamp((h * 0.8 - rm.top) / Math.max(1, rm.height * 0.9), 0, 1);
        metodo.style.setProperty('--p', pm.toFixed(4));
      }
    }
    function chiedi() { if (!inAttesa) { inAttesa = true; requestAnimationFrame(aggiorna); } }
    window.addEventListener('scroll', chiedi, { passive: true });
    window.addEventListener('resize', chiedi);
    aggiorna();

    /* colori della finitura: lo stato vive qui, il 3D lo legge */
    var bottoniColore = document.querySelectorAll('[data-colore]');
    window.PS.coloreFinitura = '#c99a45';
    bottoniColore.forEach(function (b) {
      b.addEventListener('click', function () {
        bottoniColore.forEach(function (x) { x.setAttribute('aria-pressed', 'false'); });
        b.setAttribute('aria-pressed', 'true');
        window.PS.coloreFinitura = b.dataset.colore;
      });
    });
  });

  /* il 3D arriva dopo l'HTML: foto e titolo sono già lì, three.js si è precaricato in parallelo */
  document.addEventListener('DOMContentLoaded', function () {
    var ok = false;
    try {
      var c = document.createElement('canvas');
      ok = !!(c.getContext('webgl2') || c.getContext('webgl'));
    } catch (e) { ok = false; }
    if (!ok) return;
    import('./3d.js').then(function (m) {
      m.avvia();
    }).catch(function (err) {
      console.warn('3D non disponibile:', err);
    });
  });
})();
