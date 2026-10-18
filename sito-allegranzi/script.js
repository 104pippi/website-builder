(() => {
  const html = document.documentElement;
  const fermo = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

  /* Menu mobile */
  const menu = $('#menu');
  const apri = $('#menu-apri');
  const chiudiMenu = () => { menu.classList.remove('is-aperto'); apri.setAttribute('aria-expanded', 'false'); document.body.style.overflow = ''; };
  apri.addEventListener('click', () => {
    const aperto = apri.getAttribute('aria-expanded') === 'true';
    if (aperto) return chiudiMenu();
    menu.classList.add('is-aperto');
    apri.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';
  });
  $$('a', menu).forEach(a => a.addEventListener('click', chiudiMenu));
  document.addEventListener('keydown', e => { if (e.key === 'Escape') chiudiMenu(); });

  /* Il piatto: scelta del colore Oriente Italiano */
  const tavola = $('#tavola');
  const piatto = $('#piatto');
  const lustro = $('.piatto-lustro');
  const nomeColore = $('#colore-attivo');
  const src = c => `assets/img/piatto-${c}.webp`;
  let colore = 'iris';
  let inCorso = false;

  piatto.addEventListener('animationend', function primo(e) {
    if (e.animationName !== 'piatto-gira') return;
    piatto.classList.add('is-pronto');
    piatto.removeEventListener('animationend', primo);
  });

  const precarica = () => $$('.colore').forEach(b => { const i = new Image(); i.src = src(b.dataset.colore); });
  ('requestIdleCallback' in window) ? requestIdleCallback(precarica, { timeout: 3000 }) : setTimeout(precarica, 2000);

  const cambia = (btn) => {
    const nuovo = btn.dataset.colore;
    if (nuovo === colore || inCorso) return;
    colore = nuovo;
    $$('.colore').forEach(b => b.setAttribute('aria-pressed', String(b === btn)));
    nomeColore.textContent = btn.dataset.nome;
    tavola.style.setProperty('--tinta', getComputedStyle(btn).getPropertyValue('--c'));
    const metti = () => {
      piatto.src = src(nuovo);
      piatto.alt = `Piatto Ginori 1735 Oriente Italiano, colore ${btn.dataset.nome}, visto dall'alto`;
      lustro.style.setProperty('--maschera', `url("${src(nuovo)}")`);
    };
    if (fermo) return metti();
    inCorso = true;
    piatto.classList.add('is-pronto');
    piatto.classList.remove('is-entra');
    piatto.classList.add('is-esce');
    piatto.addEventListener('animationend', function esce() {
      piatto.removeEventListener('animationend', esce);
      const pronto = () => {
        metti();
        piatto.classList.remove('is-esce');
        piatto.classList.add('is-entra');
        lustro.style.animation = 'none';
        void lustro.offsetWidth;
        lustro.style.animation = 'lustro 1.4s ease-in-out .45s both';
        inCorso = false;
      };
      const img = new Image();
      img.onload = img.onerror = pronto;
      img.src = src(nuovo);
      if (img.complete) { img.onload = img.onerror = null; pronto(); }
    });
  };
  $$('.colore').forEach(b => b.addEventListener('click', () => cambia(b)));

  /* Testata, barra in basso, piatto che gira con lo scroll, linea del tempo */
  const testata = $('#testata');
  const hero = $('.hero');
  const barra = $('#barra-cta');
  const modulo = $('#appuntamento');
  const anni = $('#anni');
  const voci = anni ? $$('li', anni) : [];
  let moduloInVista = false;

  if ('IntersectionObserver' in window && modulo) {
    new IntersectionObserver(([e]) => { moduloInVista = e.isIntersecting; aggiorna(); }, { threshold: 0.15 }).observe(modulo);
  }

  let attesa = false;
  function aggiorna() {
    attesa = false;
    const y = window.scrollY;
    const h = hero.offsetHeight;
    const vh = window.innerHeight;
    testata.classList.toggle('is-solida', y > h - 90);
    barra.classList.toggle('is-visibile', y > h * 0.55 && !moduloInVista);

    if (!fermo && y < h * 1.2) {
      const s = Math.min(1, Math.max(0, y / h));
      tavola.style.setProperty('--rot', (s * 75).toFixed(2) + 'deg');
      tavola.style.setProperty('--apri', (s * 34).toFixed(1));
    }

    if (anni) {
      const r = anni.getBoundingClientRect();
      const linea = vh * 0.62;
      const p = Math.min(1, Math.max(0, (linea - r.top) / r.height));
      anni.style.setProperty('--prog', p.toFixed(3));
      voci.forEach(li => li.classList.toggle('is-passato', li.getBoundingClientRect().top + 14 < linea));
    }
  }
  const alloScroll = () => { if (!attesa) { attesa = true; requestAnimationFrame(aggiorna); } };
  window.addEventListener('scroll', alloScroll, { passive: true });
  window.addEventListener('resize', alloScroll);
  aggiorna();

  /* Foto che si svelano */
  const svela = $$('.svela');
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(es => es.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add('in-vista'); io.unobserve(e.target); }
    }), { threshold: 0.18, rootMargin: '0px 0px -6% 0px' });
    svela.forEach(el => io.observe(el));
  } else {
    svela.forEach(el => el.classList.add('in-vista'));
  }

  /* Indice della casa: la vetrina segue la voce */
  const vociCasa = $$('.voce');
  const pezzi = $$('.vetrina-pezzo');
  const attiva = k => {
    vociCasa.forEach(v => v.classList.toggle('is-on', v.dataset.k === k));
    pezzi.forEach(p => p.classList.toggle('is-on', p.dataset.k === k));
  };
  vociCasa.forEach(v => {
    v.addEventListener('mouseenter', () => attiva(v.dataset.k));
    v.addEventListener('focusin', () => attiva(v.dataset.k));
  });
  if ('IntersectionObserver' in window) {
    const ioCasa = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) attiva(e.target.dataset.k); }),
      { rootMargin: '-45% 0px -50% 0px' });
    vociCasa.forEach(v => ioCasa.observe(v));
  }

  /* Orari: aperto adesso? (ora di Conegliano) */
  const stato = $('#stato');
  try {
    const ora = new Date(new Date().toLocaleString('en-US', { timeZone: 'Europe/Rome' }));
    const g = ora.getDay();
    const dicembre = ora.getMonth() === 11;
    const pieno = [[555, 750], [930, 1170]];
    const fasce = d => d === 0 ? (dicembre ? pieno : []) : d === 1 ? [[930, 1170]] : pieno;
    const hhmm = m => `${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}`;
    const nomi = ['domenica', 'lunedì', 'martedì', 'mercoledì', 'giovedì', 'venerdì', 'sabato'];
    const min = ora.getHours() * 60 + ora.getMinutes();
    const riga = $(`.orari tr[data-g="${g}"]`);
    if (riga) riga.classList.add('is-oggi');
    const aperta = fasce(g).find(([a, c]) => min >= a && min < c);
    if (aperta) {
      stato.textContent = `Aperto adesso, fino alle ${hhmm(aperta[1])}`;
      stato.classList.add('is-aperto');
    } else {
      let testo = '';
      for (let i = 0; i < 8 && !testo; i++) {
        const d = (g + i) % 7;
        const prossima = fasce(d).find(([a]) => i > 0 || a > min);
        if (prossima) testo = `Chiuso adesso. Riapriamo ${i === 0 ? 'oggi' : i === 1 ? 'domani' : nomi[d]} alle ${hhmm(prossima[0])}`;
      }
      stato.textContent = testo || 'Chiuso adesso';
    }
    stato.hidden = false;
  } catch (e) { /* gli orari restano comunque in tabella */ }

  /* Modulo lista nozze: compone l'email */
  const errore = $('#modulo-errore');
  modulo.addEventListener('submit', e => {
    e.preventDefault();
    const f = modulo.elements;
    const mancanti = ['nomi', 'telefono'].filter(n => !f[n].value.trim());
    ['nomi', 'telefono'].forEach(n => f[n].setAttribute('aria-invalid', String(mancanti.includes(n))));
    if (mancanti.length) {
      errore.textContent = mancanti.length === 2
        ? 'Scrivete i vostri nomi e un numero di telefono: servono per richiamarvi.'
        : mancanti[0] === 'nomi' ? 'Scrivete i vostri nomi.' : 'Scrivete un numero di telefono per richiamarvi.';
      errore.hidden = false;
      f[mancanti[0]].focus();
      return;
    }
    errore.hidden = true;
    let data = f.data.value;
    if (data) { const [a, m, gg] = data.split('-'); data = `${gg}/${m}/${a}`; }
    const email = f.email.value.trim();
    const note = f.note.value.trim();
    const righe = [
      'Buongiorno, vorremmo fissare un appuntamento per la lista nozze.',
      '',
      `Nomi: ${f.nomi.value.trim()}`,
      data ? `Data del matrimonio: ${data}` : null,
      `Telefono: ${f.telefono.value.trim()}`,
      email ? `Email: ${email}` : null,
      note ? '' : null,
      note ? `Cosa ci piacerebbe vedere: ${note}` : null,
      '',
      'Grazie!'
    ].filter(r => r !== null);
    const oggetto = `Appuntamento lista nozze: ${f.nomi.value.trim()}`;
    window.location.href = `mailto:info@allegranzi.com?subject=${encodeURIComponent(oggetto)}&body=${encodeURIComponent(righe.join('\n'))}`;
  });

  const anno = $('#anno');
  if (anno) anno.textContent = new Date().getFullYear();
})();
