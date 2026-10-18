(() => {
  const d = document;
  d.documentElement.classList.add('js');
  const calmo = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Anno nel piede
  const anno = d.getElementById('anno');
  if (anno) anno.textContent = new Date().getFullYear();

  // Testata: trasparente sull'hero, piena dopo
  const top = d.querySelector('.top');
  const pic = d.querySelector('.hero__media picture');
  let tick = false;
  const onScroll = () => {
    if (tick) return;
    tick = true;
    requestAnimationFrame(() => {
      const y = scrollY;
      top.classList.toggle('is-solid', y > 40);
      if (pic && !calmo && y < innerHeight * 1.2) pic.style.transform = `translate3d(0, ${(y * 0.22).toFixed(1)}px, 0)`;
      tick = false;
    });
  };
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // Menu mobile
  const btn = d.querySelector('.top__menu');
  const menu = d.getElementById('menu');
  const setMenu = (open) => {
    btn.setAttribute('aria-expanded', String(open));
    btn.querySelector('.sr').textContent = open ? 'Chiudi il menu' : 'Apri il menu';
    menu.hidden = !open;
    top.classList.toggle('menu-open', open);
    d.body.style.overflow = open ? 'hidden' : '';
  };
  btn.addEventListener('click', () => setMenu(btn.getAttribute('aria-expanded') !== 'true'));
  menu.addEventListener('click', (e) => { if (e.target.closest('a')) setMenu(false); });
  d.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !menu.hidden) { setMenu(false); btn.focus(); } });
  matchMedia('(min-width: 1000px)').addEventListener('change', (e) => { if (e.matches) setMenu(false); });

  // Barra Chiama/Preventivo: compare dopo l'hero, sparisce sul modulo
  const barra = d.querySelector('.barra');
  let dopoHero = false, sulModulo = false;
  const aggiornaBarra = () => barra.classList.toggle('is-su', dopoHero && !sulModulo);
  new IntersectionObserver(([e]) => { dopoHero = e.intersectionRatio < 0.98; aggiornaBarra(); }, { threshold: [0, 0.98] })
    .observe(d.querySelector('.hero__cta'));
  new IntersectionObserver(([e]) => { sulModulo = e.isIntersecting; aggiornaBarra(); }, { threshold: 0.15 })
    .observe(d.getElementById('preventivo'));

  // Sezioni del catalogo aperte su desktop
  const largo = matchMedia('(min-width: 960px)');
  const apriSezioni = () => d.querySelectorAll('.sezioni').forEach((x) => { x.open = largo.matches; });
  apriSezioni();
  largo.addEventListener('change', apriSezioni);

  // Testa portacoltelli: gira con lo scroll, rallenta e si ferma con un coltello in alto
  const disegno = d.querySelector('.disegno');
  const rotore = d.querySelector('.d-rotore');
  const richiamo = d.querySelector('.d-richiamo');
  let ang = 0, vel = 0, inVista = false, vivo = false, ultimoY = scrollY;
  const passo = () => {
    const y = scrollY;
    if (inVista) vel += (y - ultimoY) * 0.05;
    ultimoY = y;
    vel = Math.max(-16, Math.min(16, vel * 0.945));
    if (Math.abs(vel) < 0.12) {
      vel = 0;
      const meta = Math.round(ang / 90) * 90;
      ang += (meta - ang) * 0.14;
      if (Math.abs(meta - ang) < 0.05) ang = meta;
    } else {
      ang += vel;
    }
    const scarto = Math.abs(Math.round(ang / 90) * 90 - ang);
    rotore.setAttribute('transform', `rotate(${ang.toFixed(2)} 200 200)`);
    richiamo.style.opacity = Math.max(0, 1 - Math.abs(vel) * 0.6 - scarto / 12).toFixed(2);
    if (inVista || vel !== 0 || scarto > 0.05) requestAnimationFrame(passo);
    else vivo = false;
  };
  const avvia = () => { if (!vivo) { vivo = true; ultimoY = scrollY; requestAnimationFrame(passo); } };
  if (disegno && rotore) {
    if (calmo) {
      richiamo.style.opacity = 1;
    } else {
      new IntersectionObserver(([e]) => { inVista = e.isIntersecting; if (inVista) avvia(); }, { threshold: 0 }).observe(disegno);
    }
  }

  // Comparsa: quote sotto i titoli e disegno tecnico
  const io = new IntersectionObserver((voci) => voci.forEach((v) => {
    if (!v.isIntersecting) return;
    v.target.classList.add('is-in');
    io.unobserve(v.target);
    if (v.target === disegno && !calmo) { vel = 15; avvia(); }
  }), { threshold: 0.3 });
  d.querySelectorAll('[data-reveal]').forEach((el) => io.observe(el));

  // Precompila il preventivo da codici e sezioni
  const form = d.getElementById('form');
  const tipo = d.getElementById('f-tipo');
  const codice = d.getElementById('f-codice');
  const lampeggia = (el) => { el.classList.remove('flash'); void el.offsetWidth; el.classList.add('flash'); };
  d.addEventListener('click', (e) => {
    const l = e.target.closest('a[data-tipo]');
    if (!l) return;
    if (l.dataset.tipo) { tipo.value = l.dataset.tipo; lampeggia(tipo); }
    if ('codice' in l.dataset) { codice.value = l.dataset.codice; lampeggia(codice); }
  });

  // Invio: compone la mail per info@utensilea.com
  const stato = d.getElementById('form-stato');
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const f = form.elements;
    const mancanti = [];
    [['nome', f.nome.value.trim() !== ''], ['email', /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email.value.trim())]].forEach(([n, ok]) => {
      f[n].closest('.campo').classList.toggle('is-err', !ok);
      f[n].setAttribute('aria-invalid', String(!ok));
      if (!ok) mancanti.push(n);
    });
    if (mancanti.length) {
      stato.classList.add('is-err');
      stato.textContent = mancanti.length === 2
        ? 'Inserite nome ed email valida: servono per rispondervi.'
        : mancanti[0] === 'nome' ? 'Inserite il vostro nome.' : 'Controllate l\'indirizzo email.';
      f[mancanti[0]].focus();
      return;
    }
    const v = (n) => f[n].value.trim();
    const oggetto = `Richiesta preventivo: ${v('tipo')}${v('codice') ? ' – ' + v('codice') : ''}`;
    const righe = ['Buongiorno,', `vorrei un preventivo per: ${v('tipo')}.`];
    if (v('codice')) righe.push(`Codice o sezione del catalogo: ${v('codice')}`);
    if (v('messaggio')) righe.push(`Dettagli: ${v('messaggio')}`);
    righe.push('', ...['nome', 'azienda', 'email', 'telefono'].map(v).filter(Boolean));
    const corpo = righe.join('\n');
    stato.classList.remove('is-err');
    stato.textContent = 'Si apre la vostra email con la richiesta già scritta: controllate e premete Invia.';
    location.href = `mailto:info@utensilea.com?subject=${encodeURIComponent(oggetto)}&body=${encodeURIComponent(corpo)}`;
  });
})();
