/* SIPAM: menu, barra mobile, disegno animato, selettore porte, richiesta via email, catalogo. */
(function () {
  'use strict';
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var calmo = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var EMAIL = 'info@sipamenergy.com';
  var CAT = window.CATALOGO || [];

  var FAMIGLIE = {
    automatici: 'Paraspifferi automatici',
    adesivi: 'Paraspifferi in silicone e a spazzola',
    perimetrali: 'Guarnizioni perimetrali',
    spazzole: 'Spazzole strip',
    soglie: 'Soglie in alluminio',
    gocciolatoi: 'Gocciolatoi in alluminio'
  };
  var PORTE = [
    { id: 'interne', nome: 'Porte interne', voci: ['Porte interne'] },
    { id: 'blindate', nome: 'Porte blindate', voci: ['Porte blindate'] },
    { id: 'legno', nome: 'Porte e portoncini in legno', voci: ['Portoncini in legno', 'Porte in legno'] },
    { id: 'alluminio', nome: 'Porte in alluminio', voci: ['Porte in alluminio', 'Porte in alluminio con camera europea'] },
    { id: 'pvc', nome: 'Porte in PVC', voci: ['Porte in PVC', 'Porte in PVC con camera europea'] },
    { id: 'acciaio', nome: 'Porte in acciaio', voci: ['Porte in acciaio'] },
    { id: 'camera', nome: 'Profili con camera europea', voci: ['Porte in PVC con camera europea', 'Porte in alluminio con camera europea'] }
  ];

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function adatto(m, porta) {
    return (m.applicazioni || []).some(function (a) { return porta.voci.indexOf(a) > -1; });
  }

  /* anno nel piede */
  $$('[data-anno]').forEach(function (el) { el.textContent = new Date().getFullYear(); });

  /* testata e menu mobile */
  var testata = $('#testata');
  var apri = $('.apri-menu');
  var menu = $('#menu-mobile');
  function chiudiMenu() {
    if (!menu) return;
    menu.classList.remove('is-aperto');
    apri.setAttribute('aria-expanded', 'false');
  }
  if (apri && menu) {
    apri.addEventListener('click', function () {
      var aperto = menu.classList.toggle('is-aperto');
      apri.setAttribute('aria-expanded', aperto ? 'true' : 'false');
    });
    $$('a', menu).forEach(function (a) { a.addEventListener('click', chiudiMenu); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') chiudiMenu(); });
  }
  var barra = $('#barra-mobile');
  var heroAzioni = $('.hero-azioni');
  function suScroll() {
    var y = window.scrollY;
    if (testata) testata.classList.toggle('is-scesa', y > 8);
    if (barra && !heroAzioni) barra.classList.toggle('is-visibile', y > 120);
  }
  window.addEventListener('scroll', suScroll, { passive: true });
  suScroll();
  if (barra && heroAzioni && 'IntersectionObserver' in window) {
    new IntersectionObserver(function (voci) {
      barra.classList.toggle('is-visibile', !voci[0].isIntersecting && voci[0].boundingClientRect.top < 0);
    }).observe(heroAzioni);
  }

  /* comparse allo scroll: una sola volta per elemento.
     Si osserva il contenitore: un'immagine ritagliata del tutto con clip-path per il browser non è visibile. */
  var bersagli = $$('.appare, .parti');
  $$('img.estrudi').forEach(function (img) {
    if (bersagli.indexOf(img.parentElement) === -1) bersagli.push(img.parentElement);
  });
  var carica = function (el) { $$('img[loading="lazy"]', el).forEach(function (img) { img.loading = 'eager'; }); };
  var accendi = function (el) {
    el.classList.add('is-dentro');
    carica(el);
    $$('img.estrudi', el).forEach(function (img) {
      var via = function () { img.classList.add('is-dentro'); };
      if (img.complete && img.naturalWidth) via();
      else { img.addEventListener('load', via, { once: true }); img.addEventListener('error', via, { once: true }); }
    });
  };
  if ('IntersectionObserver' in window && !calmo) {
    var prima = new IntersectionObserver(function (voci) {
      voci.forEach(function (v) { if (v.isIntersecting) { carica(v.target); prima.unobserve(v.target); } });
    }, { rootMargin: '700px 0px' });
    var io = new IntersectionObserver(function (voci) {
      voci.forEach(function (v) { if (v.isIntersecting) { accendi(v.target); io.unobserve(v.target); } });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
    bersagli.forEach(function (el) { prima.observe(el); io.observe(el); });
  } else {
    bersagli.forEach(accendi);
  }

  /* disegno: la porta si chiude, il pulsante preme, la guarnizione scende */
  var tavola = $('#tavola');
  var interruttore = $('#interruttore');
  if (tavola && interruttore) {
    var stato = $('#tavola-stato');
    var testo = $('.interruttore-testo', interruttore);
    var imposta = function (chiusa) {
      tavola.classList.toggle('is-chiusa', chiusa);
      interruttore.setAttribute('aria-pressed', chiusa ? 'true' : 'false');
      testo.textContent = chiusa ? 'Apri la porta' : 'Chiudi la porta';
      stato.textContent = chiusa
        ? 'Porta chiusa: il pulsante preme sullo stipite e la guarnizione scende fino al pavimento.'
        : 'Porta aperta: la guarnizione resta nascosta nel profilo.';
    };
    interruttore.addEventListener('click', function () { imposta(!tavola.classList.contains('is-chiusa')); });
    if (calmo) imposta(true);
    else setTimeout(function () { imposta(true); }, 1100);
  }

  /* richiesta: compone l'email e la apre nel programma di posta */
  var modulo = $('#modulo');
  function precompila(codice) {
    if (!modulo || !codice) return;
    var msg = $('#f-messaggio');
    var riga = 'Codice: ' + codice + ' (quantità e lunghezza: )';
    if (msg.value.indexOf(codice) === -1) msg.value = (msg.value ? msg.value + '\n' : '') + riga;
    var prev = $('#f-preventivo');
    if (prev) prev.checked = true;
  }
  if (modulo) {
    var parametri = new URLSearchParams(location.search);
    if (parametri.get('codice')) precompila(parametri.get('codice').slice(0, 60));
    document.addEventListener('click', function (e) {
      var a = e.target.closest('[data-codice]');
      if (!a) return;
      e.preventDefault();
      precompila(a.getAttribute('data-codice'));
      $('#richiesta').scrollIntoView({ behavior: calmo ? 'auto' : 'smooth' });
      setTimeout(function () { $('#f-nome').focus({ preventScroll: true }); }, calmo ? 0 : 700);
    });
    modulo.addEventListener('submit', function (e) {
      e.preventDefault();
      var errore = $('#errore');
      var nome = $('#f-nome').value.trim();
      var email = $('#f-email').value.trim();
      var problemi = [];
      if (!nome) problemi.push('il nome');
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) problemi.push("un'email valida");
      if (!$('#f-consenso').checked) problemi.push('il consenso alla privacy');
      if (problemi.length) {
        errore.textContent = 'Per preparare la richiesta mancano: ' + problemi.join(', ') + '.';
        errore.hidden = false;
        return;
      }
      errore.hidden = true;
      var azienda = $('#f-azienda').value.trim();
      var serve = $$('input[name="serve"]:checked', modulo).map(function (i) { return i.value; });
      var righe = [
        'Buongiorno,',
        '',
        'vi scrivo dal sito per: ' + (serve.join(', ') || 'informazioni') + '.',
        '',
        'Nome: ' + nome,
        azienda ? 'Azienda: ' + azienda : '',
        'Chi sono: ' + $('#f-chi').value,
        'Email: ' + email,
        $('#f-tel').value.trim() ? 'Telefono: ' + $('#f-tel').value.trim() : '',
        '',
        $('#f-messaggio').value.trim(),
        '',
        'Grazie'
      ].filter(function (r, i, a) { return r !== '' || (a[i - 1] !== '' && i > 0); });
      var oggetto = 'Richiesta dal sito: ' + (serve[0] || 'informazioni') + (azienda ? ' - ' + azienda : '');
      window.location.href = 'mailto:' + EMAIL + '?subject=' + encodeURIComponent(oggetto) + '&body=' + encodeURIComponent(righe.join('\n'));
    });
  }

  /* selettore in home: quale paraspifferi per quale porta */
  var selettore = $('#selettore');
  if (selettore && CAT.length) {
    var scelte = $('#scelte-porta');
    var risultati = $('#risultati');
    var esito = $('#esito');
    var mostraTutti = $('#mostra-tutti');
    var automatici = CAT.filter(function (m) { return m.fam === 'automatici'; });
    var aperto = false;
    PORTE.forEach(function (p, i) {
      var l = document.createElement('label');
      l.className = 'scelta';
      l.innerHTML = '<input type="radio" name="porta" value="' + p.id + '"' + (i === 0 ? ' checked' : '') + '><span>' + esc(p.nome) + '</span>';
      scelte.appendChild(l);
    });
    var disegna = function () {
      var porta = PORTE.filter(function (p) { return p.id === $('input[name="porta"]:checked', selettore).value; })[0];
      var linea = $('input[name="linea"]:checked', selettore).value;
      var lista = automatici.filter(function (m) { return adatto(m, porta) && (linea === 'tutte' || m.linea === linea); });
      var max = aperto ? lista.length : 6;
      var codici = lista.reduce(function (n, m) { return n + m.varianti.length; }, 0);
      esito.innerHTML = lista.length
        ? '<strong>' + lista.length + (lista.length === 1 ? ' modello' : ' modelli') + '</strong> (' + codici + ' codici) per ' + esc(porta.nome.toLowerCase()) + (linea !== 'tutte' ? ', linea ' + linea : '') + '.'
        : 'Nessun modello di questa linea è indicato per ' + esc(porta.nome.toLowerCase()) + ': prova con tutte le linee o chiedici un consiglio.';
      risultati.innerHTML = lista.slice(0, max).map(function (m, i) {
        var v = m.varianti[0];
        var sigle = m.varianti.map(function (x) { return x.codice.replace(m.codice, ''); }).join(', ');
        return '<article class="mini" style="animation-delay:' + (i * 40) + 'ms">' +
          '<figure><img src="' + esc(v.img) + '" width="' + v.w + '" height="' + v.h + '" alt="' + esc(m.nome) + ', ' + esc(v.codice) + '" loading="lazy" decoding="async"></figure>' +
          '<div><h3>' + esc(m.linea) + ' ' + esc(m.dim) + ' mm</h3>' +
          '<span class="codice">' + esc(m.codice) + (sigle ? ' ' + esc(sigle) : '') + '</span>' +
          '<dl><dt>Corsa</dt><dd>' + esc(m.corsa || '-') + '</dd><dt>Lunghezza max</dt><dd>' + esc(m.lmax || '-') + '</dd><dt>Guarnizione</dt><dd>' + esc((m.guarnizione || '').replace(' autoestinguente', '')) + '</dd></dl>' +
          '<div class="azioni"><a href="' + esc(m.pdf) + '" target="_blank" rel="noopener">Scheda tecnica</a><a href="#richiesta" data-codice="' + esc(v.codice) + '">Richiedi prezzo</a></div></div>' +
          '</article>';
      }).join('');
      mostraTutti.hidden = aperto || lista.length <= max;
      mostraTutti.textContent = 'Mostra tutti i ' + lista.length + ' modelli';
    };
    selettore.addEventListener('change', function () { aperto = false; disegna(); });
    mostraTutti.addEventListener('click', function () { aperto = true; disegna(); });
    disegna();
  }

  /* pagina catalogo */
  var griglia = $('#catalogo');
  if (griglia && CAT.length) {
    var schede = $('#cat-schede');
    var cerca = $('#cerca');
    var selPorta = $('#cat-porta');
    var conta = $('#cat-conta');
    var stato2 = { fam: 'tutti', q: '', porta: '' };
    var fromHash = location.hash.replace('#', '');
    if (FAMIGLIE[fromHash]) stato2.fam = fromHash;

    var contaFam = function (f) {
      return CAT.filter(function (m) { return f === 'tutti' || m.fam === f; }).reduce(function (n, m) { return n + m.varianti.length; }, 0);
    };
    var bottoni = [['tutti', 'Tutti']].concat(Object.keys(FAMIGLIE).map(function (k) { return [k, FAMIGLIE[k]]; }));
    schede.innerHTML = bottoni.map(function (b) {
      return '<button type="button" data-fam="' + b[0] + '" aria-pressed="' + (stato2.fam === b[0]) + '">' + esc(b[1]) + '<span>' + contaFam(b[0]) + '</span></button>';
    }).join('');
    PORTE.forEach(function (p) {
      var o = document.createElement('option');
      o.value = p.id; o.textContent = p.nome;
      selPorta.appendChild(o);
    });

    var norm = function (s) { return String(s || '').toLowerCase().replace(/\s+/g, '').replace(/,/g, '.').replace(/×/g, 'x'); };
    var voce = function (k, v) { return v ? '<dt>' + k + '</dt><dd>' + esc(v) + '</dd>' : ''; };
    var scheda = function (m) {
      var v = m.varianti[0];
      var targa = m.linea ? '<span class="targa' + (m.linea === 'Standard' ? ' targa--standard' : '') + '">Linea ' + esc(m.linea) + '</span>' : '';
      var varianti = m.varianti.length > 1
        ? '<ul class="varianti" aria-label="Codici disponibili">' + m.varianti.map(function (x, i) {
            return '<li><button type="button" data-i="' + i + '" aria-pressed="' + (i === 0) + '">' + esc(x.codice) + '</button></li>';
          }).join('') + '</ul>'
        : '';
      return '<article class="modello" data-id="' + esc(m.id) + '">' +
        '<figure>' + targa + '<img src="' + esc(v.img) + '" width="' + v.w + '" height="' + v.h + '" alt="' + esc(m.nome) + ', codice ' + esc(v.codice) + '" loading="lazy" decoding="async"></figure>' +
        '<div class="corpo"><div><h2>' + esc(m.nome) + '</h2><span class="codice">' + esc(m.varianti.length > 1 ? m.codice : v.codice) + (m.varianti.length > 1 ? ', ' + m.varianti.length + ' codici' : '') + '</span></div>' +
        '<dl>' + voce('Sezione', m.dim ? m.dim + ' mm' : '') + voce('Corsa', m.corsa) + voce('Sporgenza', m.sporgenza) + voce('Guarnizione', m.guarnizione) +
        voce('Lunghezza std', m.lstd) + voce('Lunghezza max', m.lmax) + voce('Fissaggio', m.fissaggio) + voce('Drenaggio', m.drenaggio) +
        voce('Adatto a', (m.applicazioni || []).join(', ')) + voce('Inoltre', (m.extra || []).join(', ')) + '</dl>' +
        varianti + '<p class="variante-nota">' + esc(v.codice + ': ' + (v.dettaglio || '')) + '</p>' +
        '<div class="azioni"><a class="btn btn--linea" href="' + esc(m.pdf) + '" target="_blank" rel="noopener">Scheda tecnica</a>' +
        '<a class="btn btn--primario" data-richiesta href="index.html?codice=' + encodeURIComponent(v.codice) + '#richiesta">Richiedi prezzo</a></div>' +
        '</div></article>';
    };
    var disegnaCat = function () {
      var q = norm(stato2.q);
      var porta = PORTE.filter(function (p) { return p.id === stato2.porta; })[0];
      var lista = CAT.filter(function (m) {
        if (stato2.fam !== 'tutti' && m.fam !== stato2.fam) return false;
        if (porta && !adatto(m, porta)) return false;
        if (!q) return true;
        var testo = norm([m.nome, m.codice, m.dim, m.guarnizione, m.linea, (m.applicazioni || []).join(' ')].concat(m.varianti.map(function (x) { return x.codice + ' ' + (x.dettaglio || ''); })).join(' '));
        return testo.indexOf(q) > -1;
      });
      var codici = lista.reduce(function (n, m) { return n + m.varianti.length; }, 0);
      conta.textContent = lista.length + (lista.length === 1 ? ' modello' : ' modelli') + ', ' + codici + ' codici';
      griglia.innerHTML = lista.length
        ? lista.map(scheda).join('')
        : '<div class="vuoto"><h2>Nessun prodotto con questi filtri.</h2><p>Controlla il codice o togli un filtro. Se cerchi una misura che non trovi, scrivici: ti diciamo se esiste o qual è l\'alternativa.</p><p><a class="btn btn--primario" href="index.html#richiesta">Chiedi a SIPAM</a></p></div>';
    };
    schede.addEventListener('click', function (e) {
      var b = e.target.closest('button[data-fam]');
      if (!b) return;
      stato2.fam = b.getAttribute('data-fam');
      $$('button', schede).forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
      history.replaceState(null, '', stato2.fam === 'tutti' ? location.pathname : '#' + stato2.fam);
      disegnaCat();
    });
    var attesa;
    cerca.addEventListener('input', function () {
      clearTimeout(attesa);
      attesa = setTimeout(function () { stato2.q = cerca.value; disegnaCat(); }, 120);
    });
    selPorta.addEventListener('change', function () { stato2.porta = selPorta.value; disegnaCat(); });
    griglia.addEventListener('click', function (e) {
      var b = e.target.closest('.varianti button');
      if (!b) return;
      var card = b.closest('.modello');
      var m = CAT.filter(function (x) { return x.id === card.getAttribute('data-id'); })[0];
      var v = m.varianti[+b.getAttribute('data-i')];
      $$('.varianti button', card).forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
      var img = $('figure img', card);
      img.src = v.img; img.width = v.w; img.height = v.h; img.alt = m.nome + ', codice ' + v.codice;
      $('.variante-nota', card).textContent = v.codice + ': ' + (v.dettaglio || '');
      $('[data-richiesta]', card).href = 'index.html?codice=' + encodeURIComponent(v.codice) + '#richiesta';
    });
    window.addEventListener('hashchange', function () {
      var h = location.hash.replace('#', '');
      if (!FAMIGLIE[h]) return;
      stato2.fam = h;
      $$('button', schede).forEach(function (x) { x.setAttribute('aria-pressed', x.getAttribute('data-fam') === h ? 'true' : 'false'); });
      disegnaCat();
    });
    disegnaCat();
  }
})();
