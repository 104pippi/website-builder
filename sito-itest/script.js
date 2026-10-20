/* ITEST — interazioni della pagina */
(() => {
  const doc = document.documentElement;
  const ridotto = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* Testata: fondo pieno dopo l'hero, menu mobile */
  const testata = document.querySelector('[data-testata]');
  const menu = document.getElementById('menu-mobile');
  const apri = document.querySelector('[data-menu-apri]');
  const scure = [...document.querySelectorAll('[data-scuro]')];
  const aggiornaTestata = () => {
    testata.classList.toggle('scorre', scrollY > 40);
    const scuro = scure.some((el) => { const r = el.getBoundingClientRect(); return r.top <= 32 && r.bottom >= 32; });
    testata.classList.toggle('scuro', scuro);
  };
  aggiornaTestata();
  addEventListener('scroll', aggiornaTestata, { passive: true });

  const chiudiMenu = () => {
    menu.hidden = true;
    testata.classList.remove('aperta');
    apri.setAttribute('aria-expanded', 'false');
    apri.querySelector('.testata__menu-testo').textContent = 'Menu';
    document.body.style.overflow = '';
  };
  apri.addEventListener('click', () => {
    if (!menu.hidden) return chiudiMenu();
    menu.hidden = false;
    testata.classList.add('aperta');
    apri.setAttribute('aria-expanded', 'true');
    apri.querySelector('.testata__menu-testo').textContent = 'Chiudi';
    document.body.style.overflow = 'hidden';
  });
  menu.addEventListener('click', (e) => { if (e.target.closest('a')) chiudiMenu(); });
  addEventListener('keydown', (e) => { if (e.key === 'Escape' && !menu.hidden) chiudiMenu(); });

  /* Comparsa: la classe va sul genitore osservato (mai su un elemento ritagliato) */
  const rivela = document.querySelectorAll('[data-rivela], .settori__lista');
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((voci) => {
      voci.forEach((v) => {
        if (v.isIntersecting) { v.target.classList.add('in'); io.unobserve(v.target); }
      });
    }, { rootMargin: '0px 0px -18% 0px', threshold: 0.01 });
    rivela.forEach((el) => io.observe(el));
  } else {
    rivela.forEach((el) => el.classList.add('in'));
  }

  /* Contatori dei numeri */
  const conta = document.querySelectorAll('[data-conta]');
  const avviaConta = (el) => {
    const fine = +el.dataset.conta;
    if (ridotto) { el.textContent = fine; return; }
    const t0 = performance.now(), durata = 1400;
    const passo = () => {
      const t = Math.min(1, (performance.now() - t0) / durata);
      el.textContent = Math.round(fine * (1 - Math.pow(1 - t, 3)));
      if (t < 1) requestAnimationFrame(passo);
    };
    passo();
  };
  if ('IntersectionObserver' in window) {
    const ioc = new IntersectionObserver((voci) => {
      voci.forEach((v) => { if (v.isIntersecting) { avviaConta(v.target); ioc.unobserve(v.target); } });
    }, { threshold: 0.6 });
    conta.forEach((el) => { el.textContent = '0'; ioc.observe(el); });
  }

  /* Tubi di mandata e ritorno: si riempiono con lo scroll */
  const percorso = document.querySelector('[data-percorso]');
  let inCoda = false;
  const aggiornaTubi = () => {
    inCoda = false;
    const r = percorso.getBoundingClientRect();
    const vh = innerHeight;
    const p = (vh * 0.62 - r.top) / r.height;
    percorso.style.setProperty('--flusso', Math.max(0, Math.min(1, p)).toFixed(4));
  };
  const chiediTubi = () => { if (!inCoda) { inCoda = true; requestAnimationFrame(aggiornaTubi); } };
  addEventListener('scroll', chiediTubi, { passive: true });
  addEventListener('resize', chiediTubi);
  aggiornaTubi();

  /* Barra mobile: si toglie di mezzo sul modulo dei contatti */
  const barra = document.querySelector('[data-barra]');
  const modulo = document.querySelector('[data-modulo]');
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(([v]) => barra.classList.toggle('via', v.isIntersecting), { threshold: 0.15 }).observe(modulo);
  }

  /* Modulo: compone l'email per itest@itest.it */
  const errore = document.querySelector('[data-modulo-errore]');
  modulo.addEventListener('submit', (e) => {
    e.preventDefault();
    const f = new FormData(modulo);
    const v = (k) => (f.get(k) || '').toString().trim();
    const mancano = ['nome', 'telefono'].filter((k) => !v(k));
    modulo.querySelectorAll('input').forEach((i) => i.removeAttribute('aria-invalid'));
    if (mancano.length) {
      mancano.forEach((k) => modulo.elements[k].setAttribute('aria-invalid', 'true'));
      errore.hidden = false;
      modulo.elements[mancano[0]].focus();
      return;
    }
    errore.hidden = true;
    const righe = [
      'Buongiorno,',
      'vorrei richiedere un sopralluogo.',
      '',
      `Nome: ${v('nome')}`,
      v('azienda') ? `Azienda: ${v('azienda')}` : null,
      `Telefono: ${v('telefono')}`,
      v('email') ? `Email: ${v('email')}` : null,
      `Settore: ${v('settore')}`,
      `Impianto: ${v('impianto')}`,
      v('luogo') ? `Stabilimento: ${v('luogo')}` : null,
      v('messaggio') ? '' : null,
      v('messaggio') || null,
    ].filter((r) => r !== null);
    const oggetto = `Richiesta sopralluogo${v('azienda') ? ' - ' + v('azienda') : ''}`;
    const url = `mailto:itest@itest.it?subject=${encodeURIComponent(oggetto)}&body=${encodeURIComponent(righe.join('\n'))}`;
    window.__mailto = url;
    location.href = url;
  });

  /* Anno nel piede */
  const anno = document.querySelector('[data-anno]');
  if (anno) anno.textContent = new Date().getFullYear();

  /* Scanner termico dell'hero: arriva dopo il caricamento */
  const avviaTermico = () => {
    if (ridotto) return;
    import('./termico.js').catch((err) => console.warn('termico', err));
  };
  if (document.readyState === 'complete') setTimeout(avviaTermico, 60);
  else addEventListener('load', () => setTimeout(avviaTermico, 60), { once: true });

  /* Mappa 3D: si carica quando la sezione si avvicina */
  const mappa = document.querySelector('[data-mappa]');
  let mappaChiesta = false;
  const caricaMappa = () => {
    if (mappaChiesta) return;
    mappaChiesta = true;
    import('./mappa3d.js').catch((err) => console.warn('mappa3d', err));
  };
  if ('IntersectionObserver' in window) {
    const iom = new IntersectionObserver(([v]) => { if (v.isIntersecting) { caricaMappa(); iom.disconnect(); } }, { rootMargin: '180% 0px 180% 0px' });
    iom.observe(mappa);
  } else {
    caricaMappa();
  }

  /* Passo della mappa (anche senza 3D): dipende dallo scroll nel palco */
  const aggiornaPasso = () => {
    const r = mappa.getBoundingClientRect();
    const corsa = r.height - innerHeight;
    const p = Math.max(0, Math.min(1, -r.top / corsa));
    mappa.style.setProperty('--p', p.toFixed(4));
    const n = p < 0.36 ? 0 : p < 0.7 ? 1 : 2;
    if (mappa.dataset.passo !== String(n)) mappa.dataset.passo = n;
  };
  addEventListener('scroll', aggiornaPasso, { passive: true });
  addEventListener('resize', aggiornaPasso);
  aggiornaPasso();
  doc.classList.add('pronto');
})();
