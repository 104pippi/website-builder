(() => {
  const html = document.documentElement;
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const ridotto = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- intro dell'hero: parte quando la foto è pronta ---------- */
  const fotoHero = $('.hero__foto img');
  let partita = false;
  const parti = () => {
    if (partita) return;
    partita = true;
    requestAnimationFrame(() => html.classList.add('pronto'));
    setTimeout(() => html.classList.add('intro-finita'), 2100);
  };
  if (fotoHero && !(fotoHero.complete && fotoHero.naturalWidth)) {
    fotoHero.addEventListener('load', parti, { once: true });
    fotoHero.addEventListener('error', parti, { once: true });
    setTimeout(parti, 1500);
  } else {
    parti();
  }

  /* ---------- testata e menu ---------- */
  const testata = $('#testata');
  const bottoneMenu = $('.testata__menu');
  const menu = $('#menu-mobile');
  const chiudiMenu = () => {
    bottoneMenu.setAttribute('aria-expanded', 'false');
    menu.hidden = true;
    testata.classList.remove('is-aperta');
    html.classList.remove('menu-aperto');
  };
  bottoneMenu.addEventListener('click', () => {
    const apri = bottoneMenu.getAttribute('aria-expanded') !== 'true';
    if (!apri) return chiudiMenu();
    bottoneMenu.setAttribute('aria-expanded', 'true');
    menu.hidden = false;
    testata.classList.add('is-aperta');
    html.classList.add('menu-aperto');
  });
  $$('a', menu).forEach((a) => a.addEventListener('click', chiudiMenu));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !menu.hidden) { chiudiMenu(); bottoneMenu.focus(); } });

  /* ---------- foto che entrano attraverso i fori ---------- */
  const forate = $$('[data-rivela]');
  if (ridotto || !('IntersectionObserver' in window)) {
    forate.forEach((f) => f.classList.add('in', 'fatta'));
  } else {
    const oss = new IntersectionObserver((voci) => {
      voci.forEach((v) => {
        if (!v.isIntersecting) return;
        v.target.classList.add('in');
        setTimeout(() => v.target.classList.add('fatta'), 1800);
        oss.unobserve(v.target);
      });
    }, { threshold: .2 });
    forate.forEach((f) => oss.observe(f));
  }

  /* ---------- campionario: lo scroll sfoglia i campioni ---------- */
  const pista = $('#pista');
  const palco = $('#palco');
  const campioni = $$('.campione');
  const poster = $$('[data-poster]');
  const numero = $('#palco-num');
  const barra = $('#palco-barra');
  const N = campioni.length;
  const stato = { p: 0, attivo: -1 };
  window.BELLIENI = stato;
  const morbido = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

  const leggiPista = () => {
    const r = pista.getBoundingClientRect();
    const corsa = Math.max(1, r.height - palco.offsetHeight);
    const avanz = Math.min(1, Math.max(0, -r.top / corsa));
    const u = avanz * (N - 1);
    const i = Math.min(N - 2, Math.floor(u));
    const p = i + morbido(.28, .78, u - i);
    stato.p = Math.min(N - 1, p);
    const attivo = Math.min(N - 1, Math.round(stato.p));
    if (attivo !== stato.attivo) {
      stato.attivo = attivo;
      campioni.forEach((c, k) => c.classList.toggle('attivo', k === attivo));
      poster.forEach((img, k) => img.classList.toggle('attivo', k === attivo));
      numero.textContent = attivo + 1;
    }
    barra.style.transform = `scaleX(${(stato.p + 1) / N})`;
  };

  /* ---------- il filo di "Come si ordina" si stende con lo scroll ---------- */
  const corpoOrdine = $('.ordine__corpo');
  const filo = $('.ordine__filo');
  const passi = $$('.passi li');
  const leggiOrdine = () => {
    const r = corpoOrdine.getBoundingClientRect();
    const fine = innerHeight * .62;
    const t = Math.min(1, Math.max(0, (fine - r.top) / r.height));
    filo.style.clipPath = `inset(0 0 ${((1 - t) * 100).toFixed(2)}% 0)`;
    passi.forEach((li) => {
      const top = li.getBoundingClientRect().top;
      li.classList.toggle('raggiunto', top < fine);
    });
  };

  /* ---------- parallasse leggera della foto hero ---------- */
  const pictureHero = $('.hero__foto picture');
  const leggiHero = () => {
    if (ridotto) return;
    const y = scrollY;
    if (y > innerHeight * 1.2) return;
    pictureHero.style.transform = `translate3d(0, ${(y * .22).toFixed(1)}px, 0)`;
  };

  let inAttesa = false;
  const suScroll = () => {
    if (inAttesa) return;
    inAttesa = true;
    requestAnimationFrame(() => {
      inAttesa = false;
      testata.classList.toggle('is-piena', scrollY > 40);
      leggiHero();
      leggiPista();
      leggiOrdine();
    });
  };
  addEventListener('scroll', suScroll, { passive: true });
  addEventListener('resize', suScroll);
  testata.classList.toggle('is-piena', scrollY > 40);
  leggiPista();
  leggiOrdine();
  leggiHero();

  /* ---------- 3D: arriva dopo la pagina, solo se il WebGL c'è ---------- */
  const haWebGL = (() => {
    try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch (e) { return false; }
  })();
  if (haWebGL && palco) {
    palco.classList.add('palco--3d');
    const carica = () => import('./3d.js')
      .then((m) => m.avvia({ canvas: $('#tela3d'), palco, stato, ridotto }))
      .then(() => palco.classList.add('palco--pronto'))
      .catch((err) => { console.warn('Campionario 3D non disponibile:', err); palco.classList.remove('palco--3d'); });
    if (document.readyState === 'complete') setTimeout(carica, 150);
    else addEventListener('load', () => setTimeout(carica, 150), { once: true });
  }

  /* ---------- preventivo ---------- */
  const modulo = $('#preventivo');
  const selProdotto = $('#campo-prodotto');
  const errore = $('#modulo-errore');
  $$('[data-prodotto]').forEach((a) => a.addEventListener('click', () => { selProdotto.value = a.dataset.prodotto; }));
  modulo.addEventListener('submit', (e) => {
    e.preventDefault();
    const d = Object.fromEntries(new FormData(modulo).entries());
    for (const k in d) d[k] = String(d[k]).trim();
    if (!d.nome || !d.telefono) {
      errore.hidden = false;
      (d.nome ? modulo.telefono : modulo.nome).focus();
      return;
    }
    errore.hidden = true;
    const righe = [
      'Buongiorno,',
      '',
      `vorrei un preventivo per: ${d.prodotto}.`,
      d.misure ? `Misure e quantità: ${d.misure}` : '',
      d.messaggio ? `\n${d.messaggio}` : '',
      '',
      'Grazie,',
      d.nome + (d.azienda ? ` (${d.azienda})` : ''),
      `Telefono: ${d.telefono}`,
      d.citta ? `Città: ${d.citta}` : '',
    ].filter((r, k, a) => r !== '' || (a[k - 1] !== '' && k > 0));
    const oggetto = `Richiesta preventivo: ${d.prodotto}`;
    location.href = `mailto:bellienireti@tin.it?subject=${encodeURIComponent(oggetto)}&body=${encodeURIComponent(righe.join('\n'))}`;
  });

  const anno = $('#anno');
  if (anno) anno.textContent = new Date().getFullYear();
})();
