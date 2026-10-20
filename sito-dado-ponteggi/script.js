/* DaDo Ponteggi — interazioni della demo */
(() => {
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
  const ridotto = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
  const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };

  const anno = $('#anno');
  if (anno) anno.textContent = String(new Date().getFullYear());

  /* Testata e barra mobile */
  const testata = $('#testata');
  const barra = $('.barra');
  let ultimoY = -1;
  function suScroll(forza) {
    const y = window.scrollY;
    if (y === ultimoY && forza !== true) return;
    ultimoY = y;
    if (!document.body.classList.contains('menu-aperto')) testata.classList.toggle('is-scesa', y > 40);
    if (barra) barra.classList.toggle('is-visibile', y > 140);
  }
  addEventListener('scroll', suScroll, { passive: true });
  suScroll(true);

  /* Menu mobile */
  const bottone = $('.testata__menu');
  const menu = $('#menu-mobile');
  function chiudiMenu() {
    menu.hidden = true;
    bottone.setAttribute('aria-expanded', 'false');
    bottone.textContent = 'Menu';
    document.body.classList.remove('menu-aperto');
    suScroll(true);
  }
  bottone.addEventListener('click', () => {
    if (menu.hidden) {
      menu.hidden = false;
      bottone.setAttribute('aria-expanded', 'true');
      bottone.textContent = 'Chiudi';
      document.body.classList.add('menu-aperto');
      testata.classList.add('is-scesa');
    } else chiudiMenu();
  });
  $$('a', menu).forEach(a => a.addEventListener('click', chiudiMenu));
  addEventListener('keydown', e => { if (e.key === 'Escape' && !menu.hidden) { chiudiMenu(); bottone.focus(); } });

  /* Rivelazioni */
  const rivela = $$('[data-rivela]');
  if (ridotto || !('IntersectionObserver' in window)) {
    rivela.forEach(el => el.classList.add('in'));
  } else {
    $$('.galleria, .squadra, .voci, .scheda').forEach(g => {
      $$('[data-rivela]', g).forEach((el, i) => el.style.setProperty('--d', ((i % 4) * 0.08).toFixed(2) + 's'));
    });
    const io = new IntersectionObserver(voci => {
      voci.forEach(v => { if (v.isIntersecting) { v.target.classList.add('in'); io.unobserve(v.target); } });
    }, { rootMargin: '0px 0px -6% 0px', threshold: 0.06 });
    rivela.forEach(el => io.observe(el));
  }

  /* Pista 3D: i cinque passi seguono lo scroll */
  const pista = $('#progetto-3d');
  const passi = $$('.passo', pista);
  const fine = $('.palco__fine', pista);
  const testa = $('.palco__testa', pista);
  const barraPassi = $('.palco__barra', pista);
  const segmenti = $$('.palco__barra i', pista);
  const B = [0, 0.19, 0.37, 0.55, 0.73, 0.9];
  const mobile = matchMedia('(max-width: 899px)');

  function leggi() {
    const r = pista.getBoundingClientRect();
    const h = window.innerHeight;
    const corsa = r.height - h;
    return { p: corsa > 0 ? clamp(-r.top / corsa) : 0, pIn: clamp((h - r.top) / h) };
  }
  window.__pista = { leggi };

  let rafPassi = 0;
  let pistaInVista = false;
  function disegnaPassi() {
    rafPassi = 0;
    const { p } = leggi();
    const f = 0.024;
    passi.forEach((el, i) => {
      const entra = i === 0 ? 1 : smooth(B[i] - f, B[i] + f, p);
      const esce = 1 - smooth(B[i + 1] - f, B[i + 1] + f, p);
      const o = entra * esce;
      el.style.opacity = o.toFixed(3);
      el.style.visibility = o < 0.01 ? 'hidden' : 'visible';
      el.style.transform = 'translate3d(0,' + ((1 - entra) * 20 - (1 - esce) * 20).toFixed(1) + 'px,0)';
    });
    const of = smooth(B[5] - f, B[5] + f, p);
    fine.style.opacity = of.toFixed(3);
    fine.style.visibility = of < 0.01 ? 'hidden' : 'visible';
    fine.style.transform = 'translate3d(0,' + ((1 - of) * 20).toFixed(1) + 'px,0)';
    barraPassi.style.opacity = (1 - of).toFixed(3);
    segmenti.forEach((s, i) => s.style.setProperty('--f', clamp((p - B[i]) / (B[i + 1] - B[i])).toFixed(3)));
    testa.style.opacity = mobile.matches ? (1 - smooth(0.1, 0.17, p)).toFixed(3) : '';
    if (pistaInVista) rafPassi = requestAnimationFrame(disegnaPassi);
  }
  if (!ridotto) {
    new IntersectionObserver(([v]) => {
      pistaInVista = v.isIntersecting;
      if (pistaInVista && !rafPassi) rafPassi = requestAnimationFrame(disegnaPassi);
    }, { rootMargin: '150px 0px' }).observe(pista);
    disegnaPassi();
  }

  /* Scena 3D: si carica dopo la pagina, mai prima dell'hero */
  const scena = $('#scena3d');
  let caricato = false;
  function carica3d() {
    if (caricato) return;
    caricato = true;
    import('./3d.js')
      .then(m => m.avvia({ contenitore: scena, pista, leggi, ridotto, pronto: () => pista.classList.add('is-3d') }))
      .catch(err => console.warn('Scena 3D non disponibile:', err));
  }
  const io3 = new IntersectionObserver(([v]) => { if (v.isIntersecting) { io3.disconnect(); carica3d(); } }, { rootMargin: '1200px 0px' });
  io3.observe(pista);
  addEventListener('load', () => setTimeout(carica3d, 1800));

  /* Tecnico di zona */
  const TECNICI = {
    nord: { nome: 'Matteo Belvini', ruolo: 'Tecnico commerciale', zona: 'Segue i cantieri di Treviso, Belluno, Pordenone e Udine.', tel: '+393737537736', telTesto: 'Chiama Matteo', email: 'm.belvini@dadoponteggi.it', foto: 'assets/img/team/matteo-belvini.jpg' },
    est: { nome: 'Matteo Rossi', ruolo: 'Tecnico commerciale', zona: 'Segue i cantieri di Padova, Venezia, Vicenza e Rovigo.', tel: '+390422307911', telTesto: 'Chiama l’ufficio', email: 'm.rossi@dadoponteggi.it', foto: 'assets/img/team/matteo-rossi.jpg' },
    ovest: { nome: 'Filippo Pozzobon', ruolo: 'Direttore della filiale di Verona', zona: 'Segue i cantieri di Verona, Bergamo, Brescia, Mantova e Trento.', tel: '+393248274803', telTesto: 'Chiama Filippo', email: 'f.pozzobon@dadoponteggi.it', foto: 'assets/img/team/filippo-pozzobon.jpg' },
    ufficio: { nome: 'Ufficio di Istrana', ruolo: 'DaDo Ponteggi', zona: 'Ti mettiamo in contatto con il tecnico più vicino al tuo cantiere.', tel: '+390422307911', telTesto: 'Chiama 0422 307911', email: 'info@dadoponteggi.it', foto: 'assets/img/marchio.svg' }
  };
  const ZONE = { TV: 'nord', BL: 'nord', PN: 'nord', UD: 'nord', PD: 'est', VE: 'est', VI: 'est', RO: 'est', VR: 'ovest', BG: 'ovest', BS: 'ovest', MN: 'ovest', TN: 'ovest' };
  const selProv = $('#f-provincia');
  const card = $('#tecnico');
  let gruppoCorrente = '';
  function tecnicoPer(prov) { return TECNICI[ZONE[prov] || 'ufficio']; }
  function mostraTecnico() {
    const prov = selProv.value;
    const g = ZONE[prov] || 'ufficio';
    const t = TECNICI[g];
    $('#tecnico-nome').textContent = t.nome;
    $('#tecnico-ruolo').textContent = t.ruolo;
    $('#tecnico-zona').textContent = prov ? t.zona : 'Scegli la provincia del cantiere per vedere chi ti segue.';
    const tel = $('#tecnico-tel');
    tel.href = 'tel:' + t.tel;
    tel.textContent = t.telTesto;
    $('#tecnico-mail').href = 'mailto:' + t.email;
    const foto = $('#tecnico-foto');
    if (foto.getAttribute('src') !== t.foto) foto.src = t.foto;
    foto.alt = g === 'ufficio' ? '' : t.nome;
    $('#f-tecnico-riga').textContent = !prov ? 'Ti risponde il tecnico della zona del cantiere.'
      : g === 'ufficio' ? 'Ti risponde l\u2019ufficio di Istrana, che ti passa il tecnico giusto.'
      : 'Ti risponde ' + t.nome + ', ' + t.ruolo.toLowerCase() + '.';
    if (g !== gruppoCorrente) {
      gruppoCorrente = g;
      card.classList.add('is-cambiato');
      setTimeout(() => card.classList.remove('is-cambiato'), 700);
    }
  }
  selProv.addEventListener('change', mostraTecnico);
  mostraTecnico();

  /* Modulo: niente backend, compone l'email per il tecnico di zona */
  const modulo = $('#modulo');
  const errore = $('#modulo-errore');
  const nota = $('#modulo-nota');
  modulo.addEventListener('submit', e => {
    e.preventDefault();
    const d = new FormData(modulo);
    const val = k => String(d.get(k) || '').trim();
    const mancano = [];
    const segna = (id, ok, nome) => { const el = $(id); el.classList.toggle('is-errato', !ok); if (!ok) mancano.push([el, nome]); };
    segna('#f-provincia', !!val('provincia'), 'la provincia del cantiere');
    segna('#f-nome', !!val('nome'), 'nome e cognome');
    segna('#f-tel', val('telefono').replace(/\D/g, '').length >= 6, 'un telefono');
    const privacy = modulo.querySelector('[name="privacy"]');
    if (!privacy.checked) mancano.push([privacy, 'il consenso privacy']);
    if (mancano.length) {
      errore.hidden = false;
      errore.textContent = 'Per inviare la richiesta mancano: ' + mancano.map(m => m[1]).join(', ') + '.';
      mancano[0][0].focus();
      return;
    }
    errore.hidden = true;
    const prov = val('provincia');
    const provNome = selProv.options[selProv.selectedIndex].text;
    const t = tecnicoPer(prov);
    const cosa = d.getAll('cosa').join(', ') || 'da definire insieme';
    const righe = [
      'Buongiorno,',
      '',
      'vorrei un preventivo per un cantiere ' + (prov === 'ALTRO' ? 'fuori dalle vostre province principali.' : 'in provincia di ' + provNome + '.'),
      '',
      'Cosa serve: ' + cosa,
      'Formula: ' + val('formula'),
      val('messaggio') ? 'Il cantiere: ' + val('messaggio') : null,
      '',
      'Nome: ' + val('nome'),
      val('azienda') ? 'Azienda: ' + val('azienda') : null,
      'Telefono: ' + val('telefono'),
      val('email') ? 'Email: ' + val('email') : null,
      '',
      'Grazie.'
    ].filter(r => r !== null);
    const oggetto = 'Richiesta preventivo ponteggio' + (val('azienda') ? ' - ' + val('azienda') : '') + ' (' + (prov === 'ALTRO' ? 'altra provincia' : prov) + ')';
    const cc = t.email !== 'info@dadoponteggi.it' ? '&cc=info@dadoponteggi.it' : '';
    window.location.href = 'mailto:' + t.email + '?subject=' + encodeURIComponent(oggetto) + cc + '&body=' + encodeURIComponent(righe.join('\n'));
    nota.textContent = 'Richiesta pronta per ' + t.nome + ': controlla la tua app email e premi Invia. Se non si è aperta, chiama lo 0422 307911.';
    nota.classList.add('is-ok');
  });
  modulo.addEventListener('input', e => { if (e.target.classList) e.target.classList.remove('is-errato'); });

  /* Sedi e mappa */
  const mappa = $('#mappa');
  const indicazioni = $('#indicazioni');
  $$('.sede').forEach(b => b.addEventListener('click', () => {
    $$('.sede').forEach(x => { const on = x === b; x.classList.toggle('is-attiva', on); x.setAttribute('aria-pressed', String(on)); });
    const q = encodeURIComponent(b.dataset.mappa);
    mappa.src = 'https://www.google.com/maps?q=' + q + '&output=embed';
    indicazioni.href = 'https://www.google.com/maps/dir/?api=1&destination=' + q;
  }));
})();
