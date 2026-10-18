/* Wildkart — demo. JS minimo: entrata hero, menu, testata, barra mobile,
   richiami sul telaio, comparse allo scroll, motto, modulo WhatsApp. */
(function () {
  'use strict';
  var doc = document.documentElement;
  var ridotto = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var WA = '393929741377';

  /* 1. Entrata hero: parte quando il font è pronto (al massimo dopo 900 ms) */
  var partito = false;
  function parti() { if (!partito) { partito = true; doc.classList.add('pronto'); } }
  if (document.fonts && document.fonts.ready) {
    document.fonts.load('620 1em Archivo').then(parti, parti);
    document.fonts.ready.then(parti, parti);
  }
  setTimeout(parti, 900);

  /* 2. Menu mobile */
  var hamburger = document.getElementById('hamburger');
  var menu = document.getElementById('menu');
  function chiudiMenu() {
    menu.classList.remove('aperto');
    hamburger.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
  }
  hamburger.addEventListener('click', function () {
    var aperto = menu.classList.toggle('aperto');
    hamburger.setAttribute('aria-expanded', aperto ? 'true' : 'false');
    document.body.style.overflow = aperto ? 'hidden' : '';
  });
  menu.addEventListener('click', function (e) { if (e.target.closest('a')) chiudiMenu(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && menu.classList.contains('aperto')) { chiudiMenu(); hamburger.focus(); } });

  /* 3. Testata solida, barra mobile, leggera parallasse sulla foto hero, motto */
  var testata = document.getElementById('testata');
  var barra = document.getElementById('barra');
  var heroAzioni = document.getElementById('hero-azioni');
  var heroImg = document.querySelector('.hero-media img');
  var motto = document.getElementById('motto-testo');
  var mottoNativo = window.CSS && CSS.supports && CSS.supports('animation-timeline: view()');
  var inAttesa = false;

  function aggiorna() {
    inAttesa = false;
    var y = window.scrollY || 0;
    testata.classList.toggle('solida', y > 24);
    if (!ridotto && heroImg && y < window.innerHeight * 1.2 && doc.classList.contains('pronto')) {
      heroImg.style.translate = '0 ' + (y * 0.22).toFixed(1) + 'px';
    }
    if (!ridotto && motto && !mottoNativo) {
      var r = motto.getBoundingClientRect();
      var h = window.innerHeight;
      var p = Math.min(1, Math.max(0, (h - r.top) / (h + r.height)));
      motto.style.transform = 'translateX(' + (8 - 46 * p).toFixed(2) + '%)';
    }
  }
  window.addEventListener('scroll', function () { if (!inAttesa) { inAttesa = true; requestAnimationFrame(aggiorna); } }, { passive: true });
  aggiorna();

  if ('IntersectionObserver' in window && heroAzioni) {
    new IntersectionObserver(function (voci) {
      voci.forEach(function (v) {
        var sotto = !v.isIntersecting && v.boundingClientRect.top < 0;
        barra.classList.toggle('visibile', sotto);
      });
    }).observe(heroAzioni);
  } else {
    barra.classList.add('visibile');
  }

  /* 4. Comparse allo scroll: una volta sola */
  var daVedere = document.querySelectorAll('[data-vivo], #anatomia');
  if ('IntersectionObserver' in window && !ridotto) {
    var oss = new IntersectionObserver(function (voci) {
      voci.forEach(function (v) {
        if (v.isIntersecting) { v.target.classList.add('vivo'); oss.unobserve(v.target); }
      });
    }, { threshold: 0.22, rootMargin: '0px 0px -8% 0px' });
    daVedere.forEach(function (el) { oss.observe(el); });
  } else {
    daVedere.forEach(function (el) { el.classList.add('vivo'); });
  }

  /* 5. Conteggio del numero di codici */
  var conta = document.querySelector('[data-conta]');
  if (conta && 'IntersectionObserver' in window && !ridotto) {
    var fine = parseInt(conta.getAttribute('data-conta'), 10);
    var ossC = new IntersectionObserver(function (voci) {
      if (!voci[0].isIntersecting) return;
      ossC.disconnect();
      var t0 = null;
      function passo(t) {
        if (!t0) t0 = t;
        var k = Math.min(1, (t - t0) / 1100);
        var e = 1 - Math.pow(1 - k, 4);
        conta.textContent = Math.round(fine * e);
        if (k < 1) requestAnimationFrame(passo);
      }
      requestAnimationFrame(passo);
    }, { threshold: 0.6 });
    ossC.observe(conta);
  }

  /* 6. Richiami sul telaio K1 Race: punto e voce dell'elenco si accendono insieme */
  var punti = document.querySelectorAll('.punto');
  var voci = document.querySelectorAll('#specifiche li');
  function accendi(n) {
    punti.forEach(function (p) { p.setAttribute('aria-pressed', p.getAttribute('data-n') === n ? 'true' : 'false'); });
    voci.forEach(function (v) { v.classList.toggle('attiva', v.getAttribute('data-n') === n); });
  }
  punti.forEach(function (p) {
    p.setAttribute('aria-pressed', 'false');
    p.addEventListener('click', function () {
      var n = p.getAttribute('data-n');
      accendi(p.getAttribute('aria-pressed') === 'true' ? '' : n);
    });
    p.addEventListener('mouseenter', function () { if (window.matchMedia('(hover: hover)').matches) accendi(p.getAttribute('data-n')); });
  });
  voci.forEach(function (v) {
    v.addEventListener('click', function () { accendi(v.getAttribute('data-n')); });
    v.addEventListener('mouseenter', function () { if (window.matchMedia('(hover: hover)').matches) accendi(v.getAttribute('data-n')); });
  });

  /* 7. Modulo: compone il messaggio e apre WhatsApp */
  var modulo = document.getElementById('modulo');
  if (modulo) {
    var errore = document.getElementById('modulo-errore');
    modulo.addEventListener('submit', function (e) {
      e.preventDefault();
      var nome = modulo.nome.value.trim();
      if (!nome) {
        errore.hidden = false;
        modulo.nome.setAttribute('aria-invalid', 'true');
        modulo.nome.focus();
        return;
      }
      errore.hidden = true;
      modulo.nome.removeAttribute('aria-invalid');
      var righe = ['Ciao Wildkart, sono ' + nome + '.', 'Richiesta: ' + modulo.tipo.value + '.'];
      var codice = modulo.codice.value.trim();
      if (codice) righe.push('Codice pezzo: ' + codice + '.');
      var msg = modulo.messaggio.value.trim();
      if (msg) righe.push(msg);
      window.open('https://wa.me/' + WA + '?text=' + encodeURIComponent(righe.join('\n')), '_blank', 'noopener');
    });
    modulo.nome.addEventListener('input', function () { if (modulo.nome.value.trim()) { errore.hidden = true; modulo.nome.removeAttribute('aria-invalid'); } });
  }

  /* 8. Anno nel piede */
  var anno = document.getElementById('anno');
  if (anno) anno.textContent = new Date().getFullYear();
})();
