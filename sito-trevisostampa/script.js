(() => {
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
  const riduci = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // anno nel footer
  const anno = $('#anno');
  if (anno) anno.textContent = new Date().getFullYear();

  // header e barra colore di avanzamento
  const header = $('#header');
  const prog = $('.progresso span');
  let tick = false;
  const suScroll = () => {
    const y = scrollY;
    header.classList.toggle('is-scrolled', y > 8);
    const h = document.documentElement.scrollHeight - innerHeight;
    if (prog) prog.style.setProperty('--p', h > 0 ? Math.min(1, y / h).toFixed(4) : 0);
    aggiornaFasi();
    tick = false;
  };
  addEventListener('scroll', () => { if (!tick) { tick = true; requestAnimationFrame(suScroll); } }, { passive: true });

  // menu mobile
  const btn = $('.menu-btn');
  const menu = $('#menu');
  const chiudi = () => { btn.setAttribute('aria-expanded', 'false'); btn.setAttribute('aria-label', 'Apri il menu'); menu.hidden = true; document.body.style.overflow = ''; };
  btn.addEventListener('click', () => {
    const aperto = btn.getAttribute('aria-expanded') === 'true';
    if (aperto) return chiudi();
    btn.setAttribute('aria-expanded', 'true'); btn.setAttribute('aria-label', 'Chiudi il menu');
    menu.hidden = false; document.body.style.overflow = 'hidden';
  });
  $$('a', menu).forEach(a => a.addEventListener('click', chiudi));
  addEventListener('keydown', e => { if (e.key === 'Escape' && !menu.hidden) { chiudi(); btn.focus(); } });
  matchMedia('(min-width: 1024px)').addEventListener('change', e => { if (e.matches) chiudi(); });

  // titoli a registro e foto che entrano come un foglio
  const daRivelare = $$('.reg, .rv');
  if ('IntersectionObserver' in window && !riduci) {
    const io = new IntersectionObserver(voci => voci.forEach(v => {
      if (v.isIntersecting) { v.target.classList.add('is-in'); io.unobserve(v.target); }
    }), { rootMargin: '0px 0px -12% 0px', threshold: 0.01 });
    daRivelare.forEach(el => io.observe(el));
  } else daRivelare.forEach(el => el.classList.add('is-in'));

  // processo: foto fissa che cambia con la fase e filo d'inchiostro che scende
  const fasi = $$('.fase');
  const foto = $$('.processo__pila img');
  const lista = $('.fasi');
  const desktop = matchMedia('(min-width: 1024px)');
  let attiva = 0;
  function aggiornaFasi() {
    if (!desktop.matches || !fasi.length) return;
    const centro = innerHeight * 0.5;
    let idx = 0;
    fasi.forEach((f, i) => { if (f.getBoundingClientRect().top < centro) idx = i; });
    if (idx !== attiva) {
      attiva = idx;
      fasi.forEach((f, i) => f.classList.toggle('is-on', i === idx));
      foto.forEach((im, i) => im.classList.toggle('is-on', i === idx));
    }
    const r = lista.getBoundingClientRect();
    const p = Math.max(0, Math.min(1, (centro - r.top) / r.height));
    lista.style.setProperty('--fp', p.toFixed(4));
  }
  // carica subito le foto della pila su desktop (sono sovrapposte, il lazy non basta)
  if (desktop.matches) foto.forEach(im => { im.loading = 'eager'; });

  // altri lavori
  const mostra = $('#mostra-lavori');
  const altri = $('#altri-lavori');
  if (mostra && altri) mostra.addEventListener('click', () => {
    const aperto = mostra.getAttribute('aria-expanded') === 'true';
    if (aperto) {
      altri.hidden = true; mostra.setAttribute('aria-expanded', 'false'); mostra.textContent = 'Mostra altri 6 lavori';
      $('#lavori').scrollIntoView({ behavior: riduci ? 'auto' : 'smooth' });
    } else {
      altri.hidden = false; mostra.setAttribute('aria-expanded', 'true'); mostra.textContent = 'Mostra meno lavori';
      attivaLenti(altri);
    }
  });

  // "Preventivo per un lavoro simile": precompila il modulo
  const selProdotto = $('#f-prodotto');
  const campoRif = $('#campo-rif');
  const inRif = $('#f-rif');
  $$('.lavoro__cta').forEach(b => b.addEventListener('click', () => {
    const prod = b.dataset.prodotto;
    if (prod) [...selProdotto.options].forEach(o => { if (o.text === prod) selProdotto.value = o.value; });
    campoRif.hidden = false;
    inRif.value = 'Come il lavoro ' + b.dataset.rif;
    $('#preventivo').scrollIntoView({ behavior: riduci ? 'auto' : 'smooth' });
    setTimeout(() => $('#f-formato').focus({ preventScroll: true }), riduci ? 0 : 700);
  }));

  // modulo: compone la mail di preventivo
  const modulo = $('#modulo');
  const errore = $('#modulo-errore');
  modulo.addEventListener('submit', e => {
    e.preventDefault();
    const d = Object.fromEntries(new FormData(modulo).entries());
    const nome = $('#f-nome'), email = $('#f-email');
    const problemi = [];
    [nome, email].forEach(c => c.removeAttribute('aria-invalid'));
    if (!d.nome || !d.nome.trim()) { problemi.push('il nome'); nome.setAttribute('aria-invalid', 'true'); }
    if (!email.value.trim() || !email.checkValidity()) { problemi.push('un indirizzo email valido'); email.setAttribute('aria-invalid', 'true'); }
    if (problemi.length) {
      errore.textContent = 'Per inviare la richiesta inserisci ' + problemi.join(' e ') + '.';
      errore.hidden = false;
      (nome.getAttribute('aria-invalid') ? nome : email).focus();
      return;
    }
    errore.hidden = true;
    const data = d.consegna ? new Date(d.consegna + 'T12:00:00').toLocaleDateString('it-IT') : '';
    const riga = (etichetta, valore) => (valore && String(valore).trim()) ? etichetta + ': ' + String(valore).trim() : null;
    const righe = [
      'Buongiorno,', '', 'vorrei un preventivo per: ' + d.prodotto,
      riga('Riferimento', d.riferimento),
      riga('Formato', d.formato),
      riga('Pagine', d.pagine),
      riga('Copie', d.copie),
      riga('Carta, lavorazioni e note', d.note),
      riga('Consegna entro', data),
      d.fsc ? 'Carta certificata FSC: sì' : null,
      '', riga('Nome', d.nome),
      riga('Azienda', d.azienda),
      riga('Email', d.email),
      riga('Telefono', d.telefono),
      '', 'Grazie.'
    ].filter(r => r !== null);
    const oggetto = 'Richiesta preventivo: ' + d.prodotto + (d.azienda ? ' per ' + d.azienda : '');
    location.href = 'mailto:info@trevisostampa.it?subject=' + encodeURIComponent(oggetto) + '&body=' + encodeURIComponent(righe.join('\n'));
  });

  // contafili: lente d'ingrandimento sulle foto dei lavori (mouse e schermi larghi)
  const puntatore = matchMedia('(hover: hover) and (pointer: fine) and (min-width: 1024px)');
  function attivaLenti(ctx = document) {
    if (!puntatore.matches) return;
    $$('.lavoro__foto:not(.ha-lente)', ctx).forEach(fig => {
      const img = $('img', fig);
      const lente = document.createElement('div');
      lente.className = 'lente'; lente.setAttribute('aria-hidden', 'true');
      fig.appendChild(lente); fig.classList.add('ha-lente');
      const Z = 2.4, R = 95;
      fig.addEventListener('mouseenter', () => { lente.style.backgroundImage = 'url("' + (img.currentSrc || img.src) + '")'; });
      fig.addEventListener('mousemove', e => {
        const r = fig.getBoundingClientRect();
        const x = e.clientX - r.left, y = e.clientY - r.top;
        lente.style.transform = 'translate(' + (x - R) + 'px,' + (y - R) + 'px)';
        lente.style.backgroundSize = (r.width * Z) + 'px ' + (r.height * Z) + 'px';
        lente.style.backgroundPosition = (R - x * Z) + 'px ' + (R - y * Z) + 'px';
      });
    });
  }
  attivaLenti();

  suScroll();
})();
