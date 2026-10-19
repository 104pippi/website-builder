/* Studio Michelet: interazioni della pagina */
(function () {
  'use strict';

  var doc = document.documentElement;
  var ridotto = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Rete di sicurezza: se l'intro non finisce (scheda in background, errori), la pagina si mostra lo stesso
  setTimeout(function () { doc.classList.add('intro-fatta'); }, 2600);

  // Anno nel piede
  document.querySelectorAll('[data-anno]').forEach(function (el) { el.textContent = new Date().getFullYear(); });

  /* ---------- Testata solida allo scroll ---------- */
  var testata = document.querySelector('[data-testata]');
  function aggiornaTestata() { testata.classList.toggle('solida', window.scrollY > 40); }
  aggiornaTestata();
  window.addEventListener('scroll', aggiornaTestata, { passive: true });

  /* ---------- Menu mobile ---------- */
  var burger = document.querySelector('[data-burger]');
  var menu = document.querySelector('[data-menu]');
  function chiudiMenu() {
    burger.setAttribute('aria-expanded', 'false');
    menu.classList.remove('aperto');
    testata.classList.remove('menu-aperto');
    document.body.style.overflow = '';
  }
  burger.addEventListener('click', function () {
    var apri = burger.getAttribute('aria-expanded') !== 'true';
    burger.setAttribute('aria-expanded', String(apri));
    menu.classList.toggle('aperto', apri);
    testata.classList.toggle('menu-aperto', apri);
    document.body.style.overflow = apri ? 'hidden' : '';
  });
  menu.querySelectorAll('a').forEach(function (a) { a.addEventListener('click', chiudiMenu); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && menu.classList.contains('aperto')) { chiudiMenu(); burger.focus(); } });

  /* ---------- Rivelazioni ---------- */
  var rivela = document.querySelectorAll('[data-rivela]');
  if ('IntersectionObserver' in window && !ridotto) {
    var io = new IntersectionObserver(function (voci) {
      voci.forEach(function (v) { if (v.isIntersecting) { v.target.classList.add('in'); io.unobserve(v.target); } });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    rivela.forEach(function (el) { io.observe(el); });
  } else {
    rivela.forEach(function (el) { el.classList.add('in'); });
  }

  /* ---------- Schede delle matrici ---------- */
  var schede = Array.prototype.slice.call(document.querySelectorAll('.matrici [role="tab"]'));
  function attivaScheda(tab, focus) {
    schede.forEach(function (t) {
      var sel = t === tab;
      t.setAttribute('aria-selected', String(sel));
      t.tabIndex = sel ? 0 : -1;
      var pan = document.getElementById(t.getAttribute('aria-controls'));
      if (sel) {
        pan.hidden = false;
        pan.classList.remove('entra'); void pan.offsetWidth; pan.classList.add('entra');
      } else { pan.hidden = true; }
    });
    if (focus) tab.focus();
    var riga = tab.parentElement;
    if (riga.scrollWidth > riga.clientWidth) {
      riga.scrollTo({ left: tab.offsetLeft - 20, behavior: ridotto ? 'auto' : 'smooth' });
    }
  }
  schede.forEach(function (t, i) {
    t.addEventListener('click', function () { attivaScheda(t, false); });
    t.addEventListener('keydown', function (e) {
      var j = null;
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') j = (i + 1) % schede.length;
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') j = (i - 1 + schede.length) % schede.length;
      if (e.key === 'Home') j = 0;
      if (e.key === 'End') j = schede.length - 1;
      if (j !== null) { e.preventDefault(); attivaScheda(schede[j], true); }
    });
  });

  /* ---------- Ricerca dei parametri (vino) ---------- */
  var PARAMETRI = {
    'Analisi di base': ['Acetaldeide', 'Acidi organici con metodica enzimatica (malico, lattico, tartarico, citrico, acetico, gluconico, piruvico, succinico)', 'Acidità fissa', 'Acidità totale', 'Acido fumarico', 'Alcalinità delle ceneri', 'Alcoli superiori', 'Anidride carbonica', 'Anidride solforosa totale', 'Anidride solforosa libera', 'Anidride solforosa molecolare', 'Azoto alfa-amminico', 'Azoto ammoniacale', 'Azoto prontamente assimilabile', 'Bentonite minima da aggiungere', 'Ceneri', 'Cloruri', 'Densità relativa a 20 °C', 'Estratto secco non riduttore', 'Estratto secco totale', 'Glicerina', 'Glucosio + fruttosio', 'Glucosio + fruttosio + saccarosio', 'Massa volumica', 'Metanolo', 'pH', 'Saccarosio', 'Solfati', 'Sovrapressione', 'Stabilità tartarica (criteri di Ridomi e Usseglio-Tomasset)', 'Titolo alcolometrico volumico', 'Titolo alcolometrico volumico totale', 'Valori nutrizionali'],
    'Colore e polifenoli': ['Antociani', 'Polifenoli totali UV', 'Proantocianidine (leucoantociani)', 'Sostanze fenoliche ossidabili', 'Test pinking', 'Catechine', 'Profilo antocianico', 'Maturità fenolica', 'Intensità colorante rossi A420+520+620', 'Tonalità A420/A520', 'Forma dello spettro', 'Intensità colorante A320', 'Intensità colorante bianchi A420', 'Colore CieLab'],
    'Affinamento e durata': ['Riboflavina', 'Ossigeno disciolto', 'ICS test, indice di combinazione solforosa'],
    'Microbiologia': ['Lieviti, conta in piastra', 'Batteri aerobici, conta in piastra', 'Batteri lattici, conta in piastra', 'Brettanomyces, conta in piastra', 'Conta dei batteri in camera contaglobuli', 'Conta dei lieviti in camera contaglobuli'],
    'Gas disciolti': ['Anidride carbonica', 'Ossigeno disciolto'],
    'Metalli': ['Alluminio', 'Arsenico', 'Bario', 'Berillio', 'Boro', 'Calcio', 'Cromo', 'Ferro', 'Litio', 'Magnesio', 'Manganese', 'Mercurio', 'Molibdeno', 'Nichel', 'Piombo', 'Potassio', 'Rame', 'Rubidio', 'Sodio', 'Stronzio', 'Titanio', 'Vanadio', 'Zinco'],
    'Allergeni': ['Lisozima', 'Ovoalbumina', 'Caseina', 'Beta-lattoglobulina'],
    'Contaminanti e conservanti': ['Acido 4-idrossibenzoico', 'Acido ascorbico', 'Acido benzoico', 'Acido sorbico', 'Bisfenolo A', 'Glicole 1,2-propilenico', 'Glicole 1,3-propilenico', 'Glicole dietilenico', 'Glicole etilenico', 'Natamicina', 'Ocratossina', '4-etilfenolo', '4-etilguaiacolo'],
    'Fitofarmaci': ['Fitofarmaci (analisi multiresiduale)', 'Fitofarmaci polari: Fosetyl-Al, Fosetyl, acido fosfonico, Glyphosate, AMPA', 'Ditiocarbammati']
  };
  var gruppi = Object.keys(PARAMETRI);

  var input = document.querySelector('[data-cerca-input]');
  var boxFiltri = document.querySelector('[data-cerca-filtri]');
  var boxRis = document.querySelector('[data-cerca-risultati]');
  var esito = document.querySelector('[data-cerca-esito]');
  var filtro = 'Tutti';
  var aperti = {};

  function norm(s) { return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''); }
  function escapeHtml(s) { return s.replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function evidenzia(testo, q) {
    if (!q) return escapeHtml(testo);
    var n = norm(testo), i = n.indexOf(q);
    if (i < 0) return escapeHtml(testo);
    return escapeHtml(testo.slice(0, i)) + '<mark>' + escapeHtml(testo.slice(i, i + q.length)) + '</mark>' + escapeHtml(testo.slice(i + q.length));
  }

  ['Tutti'].concat(gruppi).forEach(function (g) {
    var b = document.createElement('button');
    b.type = 'button';
    b.textContent = g;
    b.setAttribute('aria-pressed', String(g === filtro));
    b.addEventListener('click', function () {
      filtro = g;
      boxFiltri.querySelectorAll('button').forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
      disegna();
    });
    boxFiltri.appendChild(b);
  });

  function disegna() {
    var q = norm(input.value.trim());
    var html = '', trovati = 0;
    gruppi.forEach(function (g) {
      if (filtro !== 'Tutti' && filtro !== g) return;
      var voci = PARAMETRI[g].filter(function (p) { return !q || norm(p).indexOf(q) >= 0; });
      if (!voci.length) return;
      trovati += voci.length;
      var limite = (q || filtro !== 'Tutti' || aperti[g]) ? voci.length : 6;
      html += '<section class="gruppo"><h3>' + escapeHtml(g) + ' <small>' + voci.length + (voci.length === 1 ? ' parametro' : ' parametri') + '</small></h3><ul>';
      voci.slice(0, limite).forEach(function (p) { html += '<li>' + evidenzia(p, q) + '</li>'; });
      if (voci.length > limite) html += '<li class="gruppo__altri"><button type="button" data-apri="' + escapeHtml(g) + '">e altri ' + (voci.length - limite) + '</button></li>';
      html += '</ul></section>';
    });
    boxRis.innerHTML = html;
    if (q && !trovati) {
      esito.innerHTML = 'Nessun parametro trovato per “' + escapeHtml(input.value.trim()) + '”. <a href="#richiesta" data-matrice="vino">Chiedici un protocollo su misura</a>.';
    } else if (q) {
      esito.textContent = trovati + (trovati === 1 ? ' parametro trovato' : ' parametri trovati');
    } else {
      esito.textContent = '';
    }
  }
  boxRis.addEventListener('click', function (e) {
    var b = e.target.closest('[data-apri]');
    if (b) { aperti[b.getAttribute('data-apri')] = true; disegna(); }
  });
  input.addEventListener('input', disegna);
  disegna();

  /* ---------- Link che precompilano il modulo ---------- */
  var modulo = document.querySelector('[data-modulo]');
  var selMatrice = modulo.querySelector('[name="matrice"]');
  var soloAnalisi = modulo.querySelector('[data-solo-analisi]');
  function aggiornaTipo() {
    var tipo = modulo.querySelector('[name="tipo"]:checked').value;
    soloAnalisi.hidden = tipo !== 'analisi';
    modulo.querySelector('.modulo__titolo').textContent = tipo === 'analisi' ? "Richiedi un'analisi" : 'Richiedi una consulenza';
  }
  modulo.querySelectorAll('[name="tipo"]').forEach(function (r) { r.addEventListener('change', aggiornaTipo); });
  document.addEventListener('click', function (e) {
    var a = e.target.closest('[data-matrice]');
    if (!a) return;
    var m = a.getAttribute('data-matrice');
    if (m) {
      modulo.querySelector('[name="tipo"][value="analisi"]').checked = true;
      selMatrice.value = m;
      aggiornaTipo();
    }
  });

  /* ---------- Invio: compone l'email ---------- */
  var errore = modulo.querySelector('[data-modulo-errore]');
  modulo.addEventListener('submit', function (e) {
    e.preventDefault();
    var f = modulo.elements;
    var mancanti = [];
    [f.nome, f.email].forEach(function (c) { c.removeAttribute('aria-invalid'); });
    if (!f.nome.value.trim()) { mancanti.push('il nome'); f.nome.setAttribute('aria-invalid', 'true'); }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email.value.trim())) { mancanti.push("un'email valida"); f.email.setAttribute('aria-invalid', 'true'); }
    if (!f.privacy.checked) mancanti.push("il consenso all'informativa");
    if (mancanti.length) {
      errore.textContent = 'Per inviare la richiesta servono ' + mancanti.join(', ') + '.';
      errore.hidden = false;
      var primo = modulo.querySelector('[aria-invalid="true"]') || f.privacy;
      primo.focus();
      return;
    }
    errore.hidden = true;
    var tipo = modulo.querySelector('[name="tipo"]:checked').value;
    var oggetto = tipo === 'analisi' ? 'Richiesta analisi: ' + f.matrice.value : 'Richiesta di consulenza enologica';
    var righe = [
      'Buongiorno,',
      '',
      tipo === 'analisi' ? 'vorrei richiedere un\'analisi (' + f.matrice.value + ').' : 'vorrei richiedere informazioni per una consulenza enologica.',
      '',
      f.messaggio.value.trim(),
      '',
      'Nome: ' + f.nome.value.trim(),
      f.azienda.value.trim() ? 'Azienda: ' + f.azienda.value.trim() : null,
      f.telefono.value.trim() ? 'Telefono: ' + f.telefono.value.trim() : null,
      'Email: ' + f.email.value.trim()
    ].filter(function (r) { return r !== null; });
    var corpo = righe.join('\n').replace(/\n{3,}/g, '\n\n').replace(/\n+$/, '');
    var url = 'mailto:info@studiomichelet.com?subject=' + encodeURIComponent(oggetto) + '&body=' + encodeURIComponent(corpo);
    window.location.href = url;
  });

  /* ---------- Dalla vigna al dato: passi, numeri e scena 3D ---------- */
  var dati = document.querySelector('[data-dati]');
  var passi = Array.prototype.slice.call(dati.querySelectorAll('[data-passo]'));
  var barra = dati.querySelector('[data-dati-barra]');
  var stato = window.SM_DATI = { p: 0 };
  var passoAttivo = -1;

  function formatta(n) { return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.'); }
  function conta(el) {
    var fine = +el.getAttribute('data-conta');
    if (ridotto) { el.textContent = formatta(fine); return; }
    var t0 = performance.now(), durata = 1100;
    (function giro() {
      var k = Math.min(1, (performance.now() - t0) / durata);
      var e = 1 - Math.pow(1 - k, 4);
      el.textContent = formatta(fine * e);
      if (k < 1) requestAnimationFrame(giro);
    })();
  }

  function aggiornaDati() {
    var r = dati.getBoundingClientRect();
    var corsa = r.height - window.innerHeight;
    var p = corsa > 0 ? Math.min(1, Math.max(0, -r.top / corsa)) : 0;
    stato.p = p;
    if (barra) barra.style.setProperty('--p', p.toFixed(4));
    var n = p < 0.22 ? 0 : p < 0.47 ? 1 : p < 0.72 ? 2 : 3;
    if (ridotto) { passi.forEach(function (el) { el.classList.add('attivo'); }); return; }
    if (n !== passoAttivo) {
      passoAttivo = n;
      passi.forEach(function (el, i) { el.classList.toggle('attivo', i === n); });
      var num = passi[n].querySelector('[data-conta]');
      if (num) conta(num);
    }
  }
  var inCoda = false;
  window.addEventListener('scroll', function () {
    if (inCoda) return;
    inCoda = true;
    requestAnimationFrame(function () { inCoda = false; aggiornaDati(); });
  }, { passive: true });
  window.addEventListener('resize', aggiornaDati);
  aggiornaDati();

  // La scena arriva dopo la pagina: si carica dopo il load o quando la sezione si avvicina
  var canvas = dati.querySelector('[data-dati-canvas]');
  var caricata = false;
  function senzaWebGL() { doc.classList.add('senza-webgl'); }
  function caricaScena() {
    if (caricata) return;
    caricata = true;
    var prova = document.createElement('canvas');
    var gl = null;
    try { gl = prova.getContext('webgl2'); } catch (err) { gl = null; }
    if (!gl) { senzaWebGL(); return; }
    import('./3d.js').then(function (m) {
      m.avvia(canvas, stato, { ridotto: ridotto });
    }).catch(function () { senzaWebGL(); });
  }
  if ('IntersectionObserver' in window) {
    var vicino = new IntersectionObserver(function (v) {
      if (v[0].isIntersecting) { caricaScena(); vicino.disconnect(); }
    }, { rootMargin: '1200px 0px' });
    vicino.observe(dati);
  }
  window.addEventListener('load', function () { setTimeout(caricaScena, 900); });
})();
