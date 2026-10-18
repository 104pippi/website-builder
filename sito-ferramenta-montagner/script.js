// Ferramenta Montagner — demo
(function () {
  const root = document.documentElement;
  const riduci = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Ingresso dell'hero: parte quando il font è pronto (al massimo dopo 700 ms)
  let partito = false;
  const parti = () => {
    if (partito) return;
    partito = true;
    requestAnimationFrame(() => requestAnimationFrame(() => root.classList.add('pronto')));
  };
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(parti);
  setTimeout(parti, 700);

  // Testata: diventa piena appena si scorre
  const testata = document.getElementById('testata');
  const aggiornaTestata = () => testata.classList.toggle('scuro', window.scrollY > 24);
  aggiornaTestata();

  // Menu mobile
  const btn = document.getElementById('menu-btn');
  const menu = document.getElementById('menu');
  const chiudiMenu = () => {
    menu.hidden = true;
    btn.setAttribute('aria-expanded', 'false');
    btn.textContent = 'Menu';
    document.body.style.overflow = '';
  };
  btn.addEventListener('click', () => {
    const apri = menu.hidden;
    if (!apri) return chiudiMenu();
    menu.hidden = false;
    btn.setAttribute('aria-expanded', 'true');
    btn.textContent = 'Chiudi';
    testata.classList.add('scuro');
    document.body.style.overflow = 'hidden';
  });
  menu.addEventListener('click', (e) => { if (e.target.closest('a')) chiudiMenu(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !menu.hidden) { chiudiMenu(); btn.focus(); } });

  // Comparse allo scorrimento
  const rivela = document.querySelectorAll('[data-rivela]');
  if ('IntersectionObserver' in window && !riduci) {
    const io = new IntersectionObserver((voci) => {
      voci.forEach((v) => { if (v.isIntersecting) { v.target.classList.add('in'); io.unobserve(v.target); } });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
    rivela.forEach((el) => io.observe(el));
  } else {
    rivela.forEach((el) => el.classList.add('in'));
  }

  // Barra mobile: compare quando i bottoni dell'hero escono dallo schermo
  const barra = document.getElementById('barra');
  const azioni = document.getElementById('hero-azioni');
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(([v]) => {
      barra.classList.toggle('vis', !v.isIntersecting && v.boundingClientRect.top < 0);
    }).observe(azioni);
  } else {
    barra.classList.add('vis');
  }

  // Storia: il metro si allunga mentre scorri e "misura" gli anni
  const linea = document.getElementById('linea');
  const nastro = document.getElementById('linea-nastro');
  const anni = linea.querySelectorAll('.linea__anni li');
  const misura = () => {
    const r = linea.getBoundingClientRect();
    const punta = window.innerHeight * 0.62;
    const p = riduci ? 1 : Math.min(1, Math.max(0, (punta - r.top) / r.height));
    nastro.style.setProperty('--p', p.toFixed(4));
    const fine = r.top + p * r.height;
    anni.forEach((li) => li.classList.toggle('ok', li.getBoundingClientRect().top + 14 <= fine));
  };

  let inCoda = false;
  const suScroll = () => {
    if (inCoda) return;
    inCoda = true;
    requestAnimationFrame(() => { aggiornaTestata(); misura(); inCoda = false; });
  };
  window.addEventListener('scroll', suScroll, { passive: true });
  window.addEventListener('resize', suScroll);
  misura();

  // Modulo "C'è questo prodotto?": compone l'email
  const form = document.getElementById('chiedi');
  const nota = document.getElementById('chiedi-nota');
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const d = new FormData(form);
    const nome = (d.get('nome') || '').trim();
    const prodotto = (d.get('prodotto') || '').trim();
    form.querySelectorAll('[required]').forEach((el) => el.setAttribute('aria-invalid', el.value.trim() ? 'false' : 'true'));
    if (!nome || !prodotto) {
      nota.textContent = 'Scrivi il tuo nome e cosa cerchi, poi premi di nuovo.';
      nota.classList.add('errore');
      form.querySelector('[aria-invalid="true"]').focus();
      return;
    }
    nota.classList.remove('errore');
    const tel = (d.get('telefono') || '').trim();
    const msg = (d.get('messaggio') || '').trim();
    const corpo = [
      'Buongiorno, vorrei sapere se avete disponibile:',
      prodotto,
      msg ? '\n' + msg : '',
      '\n' + nome + (tel ? '\nTel. ' + tel : ''),
    ].join('\n');
    const url = 'mailto:info@ferramentamontagner.it'
      + '?subject=' + encodeURIComponent('Disponibilità: ' + prodotto)
      + '&body=' + encodeURIComponent(corpo);
    nota.textContent = 'Si apre la tua app di posta con il messaggio già scritto: controlla e premi Invia.';
    window.location.href = url;
  });

  // Anno nel piede
  const anno = document.getElementById('anno');
  if (anno) anno.textContent = new Date().getFullYear();
})();
