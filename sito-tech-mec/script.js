(() => {
  const doc = document.documentElement;
  doc.classList.add('js');
  const ridotto = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

  $('#anno').textContent = new Date().getFullYear();

  /* Testata e menu mobile */
  const testata = $('#testata');
  const menu = $('#menu');
  const hamburger = $('#hamburger');
  const chiudiMenu = () => {
    menu.classList.remove('is-aperto');
    testata.classList.remove('menu-aperto');
    hamburger.setAttribute('aria-expanded', 'false');
    hamburger.setAttribute('aria-label', 'Apri il menu');
    document.body.style.overflow = '';
  };
  hamburger.addEventListener('click', () => {
    const aperto = menu.classList.toggle('is-aperto');
    hamburger.setAttribute('aria-expanded', String(aperto));
    hamburger.setAttribute('aria-label', aperto ? 'Chiudi il menu' : 'Apri il menu');
    document.body.style.overflow = aperto ? 'hidden' : '';
    testata.classList.toggle('menu-aperto', aperto);
  });
  $$('a', menu).forEach((a) => a.addEventListener('click', chiudiMenu));
  addEventListener('keydown', (e) => { if (e.key === 'Escape') chiudiMenu(); });

  /* Video hero: fermo se l'utente preferisce meno movimento o se è fuori schermo */
  const video = $('#hero-video');
  if (ridotto) { video.removeAttribute('autoplay'); video.pause(); }
  else {
    new IntersectionObserver(([e]) => {
      if (e.isIntersecting) video.play().catch(() => {}); else video.pause();
    }).observe(video);
  }

  /* Barra mobile: compare dopo la hero, sparisce sul modulo */
  const barra = $('#barra');
  let heroVisibile = true, moduloVisibile = false;
  const aggiornaBarra = () => barra.classList.toggle('is-visibile', !heroVisibile && !moduloVisibile);
  new IntersectionObserver(([e]) => { heroVisibile = e.isIntersecting; aggiornaBarra(); })
    .observe($('.hero__azioni'));
  new IntersectionObserver(([e]) => { moduloVisibile = e.isIntersecting; aggiornaBarra(); }, { threshold: 0.15 })
    .observe($('#preventivo'));

  /* Galleria: ogni foto entra con un taglio dal basso */
  const foto = $$('.g');
  foto.forEach((g, i) => g.style.setProperty('--d', `${(i % 4) * 0.08}s`));
  const ioFoto = new IntersectionObserver((voci) => voci.forEach((e) => {
    if (e.isIntersecting) { e.target.classList.add('is-vista'); ioFoto.unobserve(e.target); }
  }), { rootMargin: '0px 0px -12% 0px' });
  foto.forEach((g) => ioFoto.observe(g));

  /* Fasi, valori e linea del tempo: un solo giro di calcolo per scroll */
  const fasi = $$('.fase');
  const immagini = $$('.fasi__img');
  const squadreFasi = $('.squadre--fasi');
  const numero = $('#fase-num');
  const nome = $('#fase-nome');
  const calibro = $('#calibro');
  const nomi = ['Progettazione', 'Prototipi e stampa 3D', 'Meccanica di precisione', 'Carpenteria', 'Assemblaggio', 'Assistenza'];
  let faseAttiva = -1;

  const attivaFase = (i) => {
    if (i === faseAttiva) return;
    faseAttiva = i;
    immagini.forEach((img, k) => img.classList.toggle('is-attiva', k === i));
    fasi.forEach((f, k) => f.classList.toggle('is-attiva', k === i));
    numero.textContent = i + 1;
    nome.textContent = nomi[i];
    calibro.style.setProperty('--i', i);
    if (!ridotto) {
      squadreFasi.classList.remove('stringi');
      void squadreFasi.offsetWidth;
      squadreFasi.classList.add('stringi');
    }
  };

  const valori = $$('.valori li');
  const linea = $('#linea');
  const tappe = $$('.linea__tappa');
  const largo = matchMedia('(min-width: 1000px)');

  const calcola = () => {
    const vh = innerHeight;
    testata.classList.toggle('is-scuro', scrollY > 30);

    // fase attiva: quella più vicina alla linea di lettura (sotto la foto fissa su mobile)
    const lettura = largo.matches ? vh * 0.5 : vh * 0.74;
    let migliore = 0, distanza = Infinity;
    fasi.forEach((f, i) => {
      const r = f.getBoundingClientRect();
      const d = Math.abs((r.top + r.bottom) / 2 - lettura);
      if (d < distanza) { distanza = d; migliore = i; }
    });
    attivaFase(migliore);

    // valori: il peso del carattere cresce verso il centro dello schermo
    valori.forEach((li) => {
      const r = li.getBoundingClientRect();
      if (r.bottom < -50 || r.top > vh + 50) return;
      const t = clamp(1 - Math.abs((r.top + r.height / 2) - vh / 2) / (vh * 0.42), 0, 1);
      const peso = ridotto ? 760 : Math.round(300 + 520 * t * t * (3 - 2 * t));
      li.firstElementChild.style.setProperty('--w', peso);
      li.classList.toggle('is-centro', t > 0.7);
    });

    // linea del tempo che si riempie
    const r = linea.getBoundingClientRect();
    const p = clamp((vh * 0.72 - r.top) / (r.height || 1), 0, 1);
    linea.style.setProperty('--p', p.toFixed(3));
    tappe.forEach((t) => t.classList.toggle('is-passata', t.getBoundingClientRect().top < vh * 0.72));
  };

  let inCoda = false;
  const suScroll = () => {
    if (inCoda) return;
    inCoda = true;
    requestAnimationFrame(() => { inCoda = false; calcola(); });
  };
  addEventListener('scroll', suScroll, { passive: true });
  addEventListener('resize', suScroll);
  calcola();

  /* Modulo: compone l'email con la richiesta */
  const modulo = $('#preventivo');
  const errore = $('#modulo-errore');
  modulo.addEventListener('submit', (e) => {
    e.preventDefault();
    const dati = new FormData(modulo);
    const obbligatori = ['nome', 'email', 'descrizione'];
    let primo = null;
    obbligatori.forEach((n) => {
      const campo = modulo.elements[n];
      const valido = campo.value.trim() !== '' && (n !== 'email' || campo.checkValidity());
      campo.closest('.campo').classList.toggle('is-errore', !valido);
      if (!valido && !primo) primo = campo;
    });
    if (primo) {
      errore.hidden = false;
      errore.textContent = 'Compilate nome, un indirizzo email valido e la descrizione del lavoro.';
      primo.focus();
      return;
    }
    errore.hidden = true;
    const v = (n) => (dati.get(n) || '').toString().trim();
    const tipo = v('tipo');
    const corpo = [
      'Buongiorno,',
      '',
      `vorrei un preventivo per: ${tipo}.`,
      '',
      v('descrizione'),
      '',
      `Nome: ${v('nome')}`,
      v('azienda') ? `Azienda: ${v('azienda')}` : null,
      `Email: ${v('email')}`,
      v('telefono') ? `Telefono: ${v('telefono')}` : null,
      '',
      'Grazie.'
    ].filter((r) => r !== null).join('\n');
    const oggetto = `Richiesta preventivo: ${tipo}${v('azienda') ? ` (${v('azienda')})` : ''}`;
    location.href = `mailto:info@tech-mec.com?subject=${encodeURIComponent(oggetto)}&body=${encodeURIComponent(corpo)}`;
  });
  $$('.campo input, .campo textarea', modulo).forEach((c) =>
    c.addEventListener('input', () => c.closest('.campo').classList.remove('is-errore')));
})();
