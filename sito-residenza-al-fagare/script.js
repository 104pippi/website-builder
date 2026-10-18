(() => {
  const doc = document.documentElement;
  const calmo = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Titolo hero: parola per parola
  document.querySelectorAll('[data-words]').forEach((el) => {
    const parole = el.textContent.trim().split(/\s+/);
    el.textContent = '';
    parole.forEach((p, i) => {
      const s = document.createElement('span');
      s.className = 'w';
      s.style.setProperty('--i', i);
      s.textContent = p;
      el.append(s, i < parole.length - 1 ? ' ' : '');
    });
    el.classList.add('is-split');
  });

  // Header e menu mobile
  const top = document.querySelector('.top');
  const btn = document.querySelector('.menu-btn');
  const chiudi = () => { doc.classList.remove('menu-open'); btn.setAttribute('aria-expanded', 'false'); };
  btn.addEventListener('click', () => {
    const aperto = doc.classList.toggle('menu-open');
    btn.setAttribute('aria-expanded', String(aperto));
  });
  document.querySelectorAll('.nav a').forEach((a) => a.addEventListener('click', chiudi));
  addEventListener('keydown', (e) => { if (e.key === 'Escape') chiudi(); });

  // Comparse allo scroll
  document.querySelectorAll('.mosaic, .tavola').forEach((g) => {
    g.querySelectorAll('.develop').forEach((f, i) => f.style.setProperty('--d', `${(i % 2) * 0.18}s`));
  });
  const daMostrare = document.querySelectorAll('.reveal, .develop');
  if ('IntersectionObserver' in window && !calmo) {
    const io = new IntersectionObserver((voci) => {
      voci.forEach((v) => { if (v.isIntersecting) { v.target.classList.add('in'); io.unobserve(v.target); } });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
    daMostrare.forEach((el) => io.observe(el));
  } else {
    daMostrare.forEach((el) => el.classList.add('in'));
  }

  // Barra in basso: compare quando la call to action dell'hero esce dallo schermo
  const dock = document.querySelector('.dock');
  const heroCta = document.getElementById('hero-cta');
  if ('IntersectionObserver' in window && heroCta) {
    new IntersectionObserver(([v]) => {
      dock.classList.toggle('is-on', !v.isIntersecting && v.boundingClientRect.top < innerHeight);
    }, { threshold: 0 }).observe(heroCta);
  } else {
    dock.classList.add('is-on');
  }

  // Linea dei passi che si riempie mentre si scorre + header con bordo
  const passi = document.querySelector('.steps');
  let attesa = false;
  const aggiorna = () => {
    attesa = false;
    top.classList.toggle('is-scrolled', scrollY > 8);
    if (passi && !calmo) {
      const r = passi.getBoundingClientRect();
      const p = Math.min(1, Math.max(0, (innerHeight * 0.62 - r.top) / r.height));
      passi.style.setProperty('--p', p.toFixed(3));
    }
  };
  addEventListener('scroll', () => { if (!attesa) { attesa = true; requestAnimationFrame(aggiorna); } }, { passive: true });
  aggiorna();

  // Modulo: compone l'email con i dati inseriti
  const form = document.getElementById('form-visita');
  const errore = form.querySelector('.form__error');
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const d = new FormData(form);
    const nome = String(d.get('nome') || '').trim();
    const tel = String(d.get('telefono') || '').trim();
    const mancanti = [];
    form.nome.setAttribute('aria-invalid', String(!nome));
    form.telefono.setAttribute('aria-invalid', String(tel.replace(/\D/g, '').length < 6));
    if (!nome) mancanti.push('il nome');
    if (tel.replace(/\D/g, '').length < 6) mancanti.push('un numero di telefono');
    if (!form.privacy.checked) mancanti.push('la conferma dell\'informativa privacy');
    if (mancanti.length) {
      errore.textContent = `Manca ${mancanti.join(', ')}.`;
      errore.hidden = false;
      return;
    }
    errore.hidden = true;
    const servizio = d.get('servizio');
    const righe = [
      'Buongiorno,',
      'vorrei prenotare una visita alla Residenza Anziani Al Fagarè.',
      '',
      `Nome: ${nome}`,
      `Telefono: ${tel}`,
      `Mi serve: ${servizio}`,
    ];
    const perchi = String(d.get('perchi') || '').trim();
    const msg = String(d.get('messaggio') || '').trim();
    if (perchi) righe.push(`Per chi: ${perchi}`);
    if (msg) righe.push('', msg);
    righe.push('', 'Grazie, attendo una vostra chiamata.');
    const oggetto = `Richiesta di visita: ${servizio}`;
    location.href = `mailto:residenzaanzianialfagare@gmail.com?subject=${encodeURIComponent(oggetto)}&body=${encodeURIComponent(righe.join('\n'))}`;
  });

  // Informativa privacy
  const privacy = document.getElementById('privacy');
  document.querySelectorAll('[data-open-privacy]').forEach((b) => b.addEventListener('click', () => {
    if (privacy.showModal) privacy.showModal(); else privacy.setAttribute('open', '');
  }));
  privacy.addEventListener('click', (e) => { if (e.target === privacy) privacy.close(); });

  document.querySelectorAll('[data-year]').forEach((el) => { el.textContent = new Date().getFullYear(); });
})();
