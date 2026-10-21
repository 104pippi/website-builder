/* TECO — demo: intro, menu, prodotti, MATRIX, fasi, linea del tempo, modulo. */
(() => {
  const doc = document.documentElement;
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const ridotto = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const WA = '393495705405';

  /* ---------- Intro: le parole del titolo si allargano fino alla loro sede ---------- */
  const titolo = $('#hero-titolo');
  const sotto = $('.hero__sotto');
  const azioni = $('.hero__azioni');
  const stato = $('#stato');
  let introPartita = false;

  function preparaTitolo() {
    const parole = titolo.textContent.trim().split(/\s+/);
    titolo.innerHTML = parole.map(p => `<span class="w"><span class="wi">${p}</span></span>`).join(' ');
  }

  function avviaIntro() {
    if (introPartita) return;
    introPartita = true;
    const w = $$('.w', titolo);
    // larghezza finale fissata prima di animare: le righe non si rompono mentre il testo si allarga
    w.forEach(el => { el.style.width = el.getBoundingClientRect().width + 'px'; });
    titolo.classList.add('ok');
    if (!ridotto) {
      w.forEach((el, i) => {
        el.firstChild.animate([
          { fontStretch: '62%', opacity: 0, transform: 'translateY(.18em)' },
          { fontStretch: '118%', opacity: 1, transform: 'none' }
        ], { duration: 1050, delay: 120 + i * 90, easing: 'cubic-bezier(.2,.7,.1,1)', fill: 'backwards' });
      });
    }
    const fine = ridotto ? 0 : 120 + w.length * 90 + 1050;
    setTimeout(() => { sotto.classList.add('ok'); }, ridotto ? 0 : 520);
    setTimeout(() => { azioni.classList.add('ok'); }, ridotto ? 0 : 700);
    setTimeout(() => { stato.classList.add('ok'); }, ridotto ? 0 : 1000);
    setTimeout(() => { w.forEach(el => { el.style.width = ''; }); }, fine + 60);
  }

  preparaTitolo();
  const fontPronto = document.fonts ? document.fonts.load('760 100px Archivo').catch(() => {}) : Promise.resolve();
  Promise.race([fontPronto, new Promise(r => setTimeout(r, 900))]).then(avviaIntro);
  setTimeout(avviaIntro, 1600);

  /* ---------- Testata e menu ---------- */
  const testata = $('#testata');
  const hero = $('#hero');
  const burger = $('#burger');
  const menu = $('#menu');

  function aggiornaTestata() {
    const limite = hero ? hero.offsetHeight - testata.offsetHeight - 10 : 40;
    testata.classList.toggle('solida', scrollY > limite);
    testata.classList.toggle('su-scena', scrollY > 8 && scrollY <= limite);
  }
  aggiornaTestata();
  addEventListener('scroll', aggiornaTestata, { passive: true });
  addEventListener('resize', aggiornaTestata);

  function chiudiMenu() {
    menu.hidden = true;
    burger.setAttribute('aria-expanded', 'false');
    burger.setAttribute('aria-label', 'Apri il menu');
    testata.classList.remove('menu-aperto');
    document.body.classList.remove('menu-aperto');
  }
  burger.addEventListener('click', () => {
    const apri = menu.hidden;
    if (!apri) return chiudiMenu();
    menu.hidden = false;
    burger.setAttribute('aria-expanded', 'true');
    burger.setAttribute('aria-label', 'Chiudi il menu');
    testata.classList.add('menu-aperto');
    document.body.classList.add('menu-aperto');
  });
  $$('a', menu).forEach(a => a.addEventListener('click', chiudiMenu));
  addEventListener('keydown', e => { if (e.key === 'Escape' && !menu.hidden) { chiudiMenu(); burger.focus(); } });

  /* ---------- Rivelazione delle foto ---------- */
  const rivela = $$('.rivela');
  if ('IntersectionObserver' in window && !ridotto) {
    const io = new IntersectionObserver(voci => voci.forEach(v => {
      if (v.isIntersecting) { v.target.classList.add('in'); io.unobserve(v.target); }
    }), { rootMargin: '0px 0px -12% 0px' });
    rivela.forEach(el => io.observe(el));
  } else rivela.forEach(el => el.classList.add('in'));

  /* ---------- Linee di prodotto ---------- */
  const schede = $$('.scheda');
  function mostraLinea(btn, focus) {
    schede.forEach(s => {
      const on = s === btn;
      s.setAttribute('aria-selected', on);
      s.tabIndex = on ? 0 : -1;
      const pannello = document.getElementById(s.getAttribute('aria-controls'));
      pannello.hidden = !on;
      if (on) {
        $$('.prodotto', pannello).forEach((p, i) => p.style.setProperty('--i', i));
        pannello.classList.remove('entra');
        void pannello.offsetWidth;
        pannello.classList.add('entra');
      }
    });
    if (focus) btn.focus();
  }
  schede.forEach((s, i) => {
    s.addEventListener('click', () => mostraLinea(s));
    s.addEventListener('keydown', e => {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      const n = (i + (e.key === 'ArrowRight' ? 1 : schede.length - 1)) % schede.length;
      mostraLinea(schede[n], true);
    });
  });

  /* ---------- Modulo: precompilato da prodotti e profili ---------- */
  const modulo = $('#modulo');
  const fProdotto = $('#f-prodotto');
  const fProfilo = $('#f-profilo');
  const errore = $('#modulo-errore');

  function vaiAlModulo(campo) {
    $('#contatti').scrollIntoView({ behavior: ridotto ? 'auto' : 'smooth', block: 'start' });
    const box = campo.closest('.campo');
    box.classList.remove('evidenzia'); void box.offsetWidth; box.classList.add('evidenzia');
    setTimeout(() => $('#f-nome').focus({ preventScroll: true }), 700);
  }
  $$('[data-prodotto]').forEach(b => b.addEventListener('click', () => {
    fProdotto.value = b.dataset.prodotto;
    vaiAlModulo(fProdotto);
  }));
  $$('[data-profilo]').forEach(b => b.addEventListener('click', () => {
    fProfilo.value = b.dataset.profilo;
    vaiAlModulo(fProfilo);
  }));

  function testoRichiesta() {
    const d = Object.fromEntries(new FormData(modulo));
    const righe = ['Buongiorno TECO, vorrei ricevere informazioni.'];
    if (d.profilo) righe.push(`Profilo: ${d.profilo}`);
    if (d.prodotto) righe.push(`Prodotto: ${d.prodotto}`);
    if (d.azienda) righe.push(`Azienda: ${d.azienda}`);
    righe.push(`Nome: ${d.nome}`);
    if (d.telefono) righe.push(`Telefono: ${d.telefono}`);
    if (d.email) righe.push(`Email: ${d.email}`);
    righe.push('', d.messaggio);
    return { testo: righe.join('\n'), d };
  }
  function valido() {
    const nome = $('#f-nome').value.trim();
    const msg = $('#f-messaggio').value.trim();
    if (!nome || !msg) {
      errore.textContent = !nome ? 'Scrivi nome e cognome per inviare la richiesta.' : 'Scrivi il messaggio: cosa ti serve sapere?';
      errore.hidden = false;
      (!nome ? $('#f-nome') : $('#f-messaggio')).focus();
      return false;
    }
    errore.hidden = true;
    return true;
  }
  modulo.addEventListener('submit', e => {
    e.preventDefault();
    if (!valido()) return;
    const { testo } = testoRichiesta();
    window.open(`https://wa.me/${WA}?text=${encodeURIComponent(testo)}`, '_blank', 'noopener');
  });
  $('#invia-email').addEventListener('click', () => {
    if (!valido()) return;
    const { testo, d } = testoRichiesta();
    const oggetto = `Richiesta informazioni${d.prodotto ? ' – ' + d.prodotto : ''}`;
    location.href = `mailto:info@tecosrl.it?subject=${encodeURIComponent(oggetto)}&body=${encodeURIComponent(testo)}`;
  });

  /* ---------- MATRIX: la placca si apre a ribalta e cambia finitura da sola ---------- */
  const matrix = $('#matrix-scena');
  const bottoniFinitura = $$('.finiture button');
  const giro = ['bianco', 'nero', 'inox'];
  let finitura = 0, timerMatrix = null, manuale = false, matrixVisibile = false;

  function impostaFinitura(nome) {
    matrix.dataset.finitura = nome;
    bottoniFinitura.forEach(b => b.setAttribute('aria-checked', b.dataset.f === nome));
  }
  function cicloMatrix() {
    // apre subito (primo movimento entro un secondo), richiude, poi cambia finitura
    clearTimeout(timerMatrix);
    if (!matrixVisibile || ridotto) return;
    timerMatrix = setTimeout(() => {
      matrix.classList.add('aperta');
      timerMatrix = setTimeout(() => {
        matrix.classList.remove('aperta');
        timerMatrix = setTimeout(() => {
          if (!manuale) { finitura = (finitura + 1) % giro.length; impostaFinitura(giro[finitura]); }
          timerMatrix = setTimeout(cicloMatrix, 900);
        }, 1050);
      }, 1700);
    }, 450);
  }
  bottoniFinitura.forEach(b => b.addEventListener('click', () => {
    manuale = true;
    finitura = giro.indexOf(b.dataset.f);
    impostaFinitura(b.dataset.f);
  }));
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(v => {
      const ora = v[0].isIntersecting;
      if (ora === matrixVisibile) return;
      matrixVisibile = ora;
      if (ora) cicloMatrix(); else { clearTimeout(timerMatrix); matrix.classList.remove('aperta'); }
    }, { threshold: .35 }).observe(matrix);
  }

  /* ---------- Fasi della produzione (fisarmonica su desktop) ---------- */
  const fasi = $$('.fase');
  const largo = matchMedia('(min-width: 900px)');
  let fase = 0, timerFasi = null, fasiVisibili = false, fasiFerme = false;
  function attivaFase(i) {
    fase = i;
    fasi.forEach((f, k) => f.toggleAttribute('data-attiva', k === i));
  }
  function giroFasi(primo) {
    clearTimeout(timerFasi);
    if (!fasiVisibili || fasiFerme || !largo.matches || ridotto) return;
    timerFasi = setTimeout(() => { attivaFase((fase + 1) % fasi.length); giroFasi(); }, primo ? 800 : 2300);
  }
  fasi.forEach((f, i) => {
    f.addEventListener('mouseenter', () => { if (largo.matches) { fasiFerme = true; clearTimeout(timerFasi); attivaFase(i); } });
    f.addEventListener('click', () => { if (largo.matches) { fasiFerme = true; clearTimeout(timerFasi); attivaFase(i); } });
  });
  $('#fasi').addEventListener('mouseleave', () => { fasiFerme = false; giroFasi(); });
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(v => {
      fasiVisibili = v[0].isIntersecting;
      if (fasiVisibili) giroFasi(true); else clearTimeout(timerFasi);
    }, { threshold: .4 }).observe($('#fasi'));
  }

  /* ---------- Linea del tempo che si riempie di ottone ---------- */
  const tempi = $('#tempi');
  const anni = $$('li', tempi);
  let rafTempi = 0;
  function aggiornaTempi() {
    rafTempi = 0;
    const r = tempi.getBoundingClientRect();
    const punto = innerHeight * 0.62;
    const p = Math.min(1, Math.max(0, (punto - r.top) / r.height));
    tempi.style.setProperty('--p', p.toFixed(4));
    anni.forEach(li => li.classList.toggle('passato', li.getBoundingClientRect().top + 14 < punto));
  }
  addEventListener('scroll', () => { if (!rafTempi) rafTempi = requestAnimationFrame(aggiornaTempi); }, { passive: true });
  aggiornaTempi();

  /* ---------- Video corporate: si carica solo al clic ---------- */
  const video = $('#video');
  $('.video__copertina', video).addEventListener('click', () => {
    video.innerHTML = '<iframe src="https://www.youtube-nocookie.com/embed/1LmukBqM5v0?autoplay=1&rel=0" title="Video corporate TECO" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen></iframe>';
  });

  /* ---------- Anno nel piede ---------- */
  $('#anno').textContent = new Date().getFullYear();

  /* ---------- Scena 3D: arriva dopo il caricamento, mai prima della pagina ---------- */
  function caricaScena() {
    const gl = document.createElement('canvas').getContext('webgl2');
    if (!gl) return;
    import('./3d.js').then(m => m.avvia({ ridotto })).catch(err => console.warn('3D non disponibile', err));
  }
  if (document.readyState === 'complete') setTimeout(caricaScena, 60);
  else addEventListener('load', () => setTimeout(caricaScena, 60), { once: true });
})();
