(function () {
  'use strict';
  var ridotto = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var lim = function (v, a, b) { return Math.min(b, Math.max(a, v)); };

  /* ---------- Testata: diventa piena dopo l'hero ---------- */
  var testata = document.getElementById('testata');
  function testataPiena() { testata.classList.toggle('solida', scrollY > 40); }
  testataPiena();
  addEventListener('scroll', testataPiena, { passive: true });

  /* ---------- Menu mobile ---------- */
  var bottone = document.querySelector('.testata__menu');
  var menu = document.getElementById('menu-mobile');
  function apriMenu(apri) {
    bottone.setAttribute('aria-expanded', String(apri));
    bottone.setAttribute('aria-label', apri ? 'Chiudi il menu' : 'Apri il menu');
    menu.hidden = !apri;
    document.body.style.overflow = apri ? 'hidden' : '';
    testata.classList.toggle('solida', apri || scrollY > 40);
  }
  bottone.addEventListener('click', function () { apriMenu(menu.hidden); });
  menu.addEventListener('click', function (e) { if (e.target.closest('a')) apriMenu(false); });
  addEventListener('keydown', function (e) { if (e.key === 'Escape' && !menu.hidden) { apriMenu(false); bottone.focus(); } });

  /* ---------- Anno nel piede ---------- */
  var anno = document.getElementById('anno');
  if (anno) anno.textContent = new Date().getFullYear();

  /* ---------- Braci che salgono dal fuoco dell'hero (canvas 2D, in profondità) ---------- */
  (function braci() {
    var hero = document.getElementById('hero');
    var cv = hero.querySelector('.hero__braci');
    var ctx = cv.getContext('2d');
    if (!ctx || ridotto) return;
    var W = 0, H = 0, fx = 0, fy = 0, fw = 200, n = innerWidth < 861 ? 56 : 96, lista = [];
    function misura() {
      var dpr = Math.min(window.devicePixelRatio || 1, innerWidth < 861 ? 1.5 : 2);
      var r = hero.getBoundingClientRect();
      W = r.width; H = r.height;
      cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (window.__fuocoHero) window.__fuocoHero();
      var cs = getComputedStyle(hero);
      fx = parseFloat(cs.getPropertyValue('--fx')) || W / 2;
      fy = parseFloat(cs.getPropertyValue('--fy')) || H * .3;
      fw = parseFloat(cs.getPropertyValue('--fw')) || 200;
    }
    function nasce(p, sparsa) {
      p.z = .35 + Math.random() * .95;
      p.x = fx + (Math.random() - .5) * fw * .85;
      p.y = fy + (Math.random() - .3) * fw * .16;
      p.vy = -(26 + Math.random() * 58) * p.z;
      p.vx = (Math.random() - .5) * 16;
      p.vita = 2.2 + Math.random() * 3.4;
      p.eta = sparsa ? Math.random() * p.vita : 0;
      if (sparsa) { p.x += p.vx * p.eta; p.y += p.vy * p.eta; }
      p.r = (.7 + Math.random() * 1.5) * p.z;
      p.tono = 16 + Math.random() * 26;
      p.seme = Math.random() * 6.283;
    }
    misura();
    for (var i = 0; i < n; i++) { var p = {}; nasce(p, true); lista.push(p); }
    addEventListener('resize', misura);

    var attivo = false, raf = 0, ultimo = performance.now();
    function ciclo() {
      raf = requestAnimationFrame(ciclo);
      var now = performance.now();
      var dt = Math.min(.05, (now - ultimo) / 1000); ultimo = now;
      var t = now / 1000;
      var entra = lim((t - 1.0) / 1.4, 0, 1);
      ctx.clearRect(0, 0, W, H);
      if (!entra) return;
      ctx.globalCompositeOperation = 'lighter';
      for (var i = 0; i < lista.length; i++) {
        var p = lista[i];
        p.eta += dt;
        if (p.eta > p.vita || p.y < -20) nasce(p, false);
        var k = p.eta / p.vita;
        var ondeggia = Math.sin(t * 1.6 + p.seme + p.eta * 2.2) * 14 * p.z;
        p.x += (p.vx + ondeggia) * dt;
        p.y += p.vy * dt;
        var a = entra * Math.min(1, k * 7) * Math.pow(1 - k, 1.3) * (.6 + .4 * Math.sin(t * 9 + p.seme * 3));
        if (a <= .01) continue;
        var luce = 66 - k * 22;
        ctx.fillStyle = 'hsla(' + p.tono + ',100%,' + luce + '%,' + (a * .16) + ')';
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r * (p.z > 1.05 ? 6 : 4), 0, 6.283); ctx.fill();
        ctx.fillStyle = 'hsla(' + (p.tono + 12) + ',100%,' + (luce + 14) + '%,' + a + ')';
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.283); ctx.fill();
      }
      ctx.globalCompositeOperation = 'source-over';
    }
    function parti() { if (!attivo && !document.hidden) { attivo = true; ultimo = performance.now(); raf = requestAnimationFrame(ciclo); } }
    function ferma() { attivo = false; cancelAnimationFrame(raf); }
    var inVista = true;
    new IntersectionObserver(function (e) { inVista = e[0].isIntersecting; inVista ? parti() : ferma(); }).observe(hero);
    document.addEventListener('visibilitychange', function () { document.hidden ? ferma() : (inVista && parti()); });
    parti();
  })();

  /* ---------- Le foto si "scaldano" quando entrano in vista ---------- */
  var daScaldare = document.querySelectorAll('.pezzo__foto, .muro figure, .storia__foto');
  if ('IntersectionObserver' in window && !ridotto) {
    var osservaCalore = new IntersectionObserver(function (voci) {
      voci.forEach(function (v) { if (v.isIntersecting) { v.target.classList.add('in'); osservaCalore.unobserve(v.target); } });
    }, { threshold: .3, rootMargin: '0px 0px -8% 0px' });
    daScaldare.forEach(function (el) { el.classList.add('riscalda'); osservaCalore.observe(el); });
  }

  /* ---------- Percorso: stadio 0..5 legato allo scroll dei passi ---------- */
  var passi = Array.prototype.slice.call(document.querySelectorAll('.passo'));
  var numero = document.querySelector('.percorso__n');
  var scena = document.getElementById('scena3d');
  var stadio = 0, attivoIdx = -1;
  function calcolaStadio() {
    var mob = innerWidth < 861;
    var lineaLettura = innerHeight * (mob ? .8 : .56);
    var s = 0;
    for (var i = 0; i < passi.length; i++) {
      var b = passi[i].getBoundingClientRect();
      if (lineaLettura >= b.top) s = i + Math.min(1, (lineaLettura - b.top) / b.height);
    }
    stadio = s;
    var idx = Math.min(passi.length - 1, Math.floor(s));
    if (idx !== attivoIdx) {
      if (attivoIdx >= 0) passi[attivoIdx].classList.remove('attivo');
      passi[idx].classList.add('attivo');
      attivoIdx = idx;
      if (numero) numero.textContent = String(idx + 1);
    }
  }
  if (passi.length) {
    calcolaStadio();
    addEventListener('scroll', calcolaStadio, { passive: true });
    addEventListener('resize', calcolaStadio);
  }

  /* la scena 3D arriva dopo: solo a pagina caricata e quando la sezione si avvicina */
  function carica3D() {
    import('./3d.js').then(function (m) {
      m.avvia(scena, function () { return stadio; });
    }).catch(function () { /* resta la foto statica */ });
  }
  if (scena && 'IntersectionObserver' in window) {
    var osserva3D = new IntersectionObserver(function (voci) {
      if (!voci[0].isIntersecting) return;
      osserva3D.disconnect();
      if (document.readyState === 'complete') carica3D();
      else addEventListener('load', carica3D, { once: true });
    }, { rootMargin: '120% 0px' });
    osserva3D.observe(scena);
  }

  /* ---------- Orari: aperto adesso? (ora di Roma) ---------- */
  (function orari() {
    var el = document.getElementById('stato-orari');
    if (!el || !window.Intl) return;
    var fasce = { 0: [], 1: [[930, 1140]], 2: [[510, 720], [930, 1140]], 3: [[510, 720], [930, 1140]], 4: [[510, 720], [930, 1140]], 5: [[510, 720], [930, 1140]], 6: [[510, 720], [930, 1140]] };
    var nomi = ['domenica', 'lunedì', 'martedì', 'mercoledì', 'giovedì', 'venerdì', 'sabato'];
    var giorniIt = { dom: 0, lun: 1, mar: 2, mer: 3, gio: 4, ven: 5, sab: 6 };
    var parti = new Intl.DateTimeFormat('it-IT', { timeZone: 'Europe/Rome', weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date());
    var get = function (tipo) { var p = parti.filter(function (x) { return x.type === tipo; })[0]; return p ? p.value : ''; };
    var giorno = giorniIt[get('weekday').toLowerCase().replace('.', '').slice(0, 3)];
    if (giorno === undefined) return;
    var min = parseInt(get('hour'), 10) * 60 + parseInt(get('minute'), 10);
    var hhmm = function (m) { return Math.floor(m / 60) + ':' + ('0' + (m % 60)).slice(-2); };

    document.querySelectorAll('.orari tr[data-giorni]').forEach(function (tr) {
      if (tr.getAttribute('data-giorni').split(' ').indexOf(String(giorno)) > -1) tr.classList.add('oggi');
    });

    var testo = '', aperto = false;
    var oggi = fasce[giorno];
    for (var i = 0; i < oggi.length; i++) {
      if (min >= oggi[i][0] && min < oggi[i][1]) { aperto = true; testo = 'Aperto adesso, chiude alle ' + hhmm(oggi[i][1]); break; }
      if (min < oggi[i][0]) { testo = 'Chiuso adesso, riapre alle ' + hhmm(oggi[i][0]); break; }
    }
    if (!testo) {
      for (var d = 1; d <= 7; d++) {
        var g = (giorno + d) % 7;
        if (fasce[g].length) { testo = 'Chiuso adesso, riapre ' + (d === 1 ? 'domani' : nomi[g]) + ' alle ' + hhmm(fasce[g][0][0]); break; }
      }
    }
    el.textContent = testo;
    el.classList.toggle('aperto', aperto);
    el.hidden = false;
  })();

  /* ---------- Modulo: prepara l'email per il sopralluogo ---------- */
  var modulo = document.getElementById('modulo');
  if (modulo) {
    var errore = document.getElementById('modulo-errore');
    modulo.addEventListener('submit', function (e) {
      e.preventDefault();
      var nome = modulo.nome.value.trim(), tel = modulo.telefono.value.trim();
      modulo.nome.setAttribute('aria-invalid', String(!nome));
      modulo.telefono.setAttribute('aria-invalid', String(!tel));
      if (!nome || !tel) { errore.hidden = false; (nome ? modulo.telefono : modulo.nome).focus(); return; }
      errore.hidden = true;
      var righe = [
        'Buongiorno, vorrei chiedere un sopralluogo.',
        '',
        'Nome: ' + nome,
        'Telefono: ' + tel,
        modulo.comune.value.trim() ? 'Comune: ' + modulo.comune.value.trim() : '',
        'Mi serve: ' + modulo.cosa.value,
        modulo.messaggio.value.trim() ? '\n' + modulo.messaggio.value.trim() : '',
        '',
        'Grazie'
      ].filter(function (r, i, a) { return r !== '' || (a[i - 1] !== '' && i > 0); });
      var url = 'mailto:cadelstufe@gmail.com?subject=' + encodeURIComponent('Richiesta sopralluogo – ' + modulo.cosa.value) +
        '&body=' + encodeURIComponent(righe.join('\n'));
      window.location.href = url;
    });
  }
})();
