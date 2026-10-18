(() => {
  const doc = document.documentElement;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const canHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  // Anno nel footer
  document.querySelectorAll('[data-year]').forEach((el) => { el.textContent = new Date().getFullYear(); });

  // Header pieno dopo lo scroll, barra fissa mobile dopo l'hero
  const header = document.querySelector('.top');
  const dock = document.querySelector('.dock');
  const hero = document.querySelector('.hero');
  const onScroll = () => {
    const y = window.scrollY;
    header.classList.toggle('is-solid', y > 24);
    if (dock && hero) dock.classList.toggle('is-on', y > hero.offsetHeight * 0.55);
  };
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  // Menu mobile
  const toggle = document.querySelector('.top__toggle');
  const menu = document.getElementById('menu');
  const setMenu = (open) => {
    doc.classList.toggle('menu-open', open);
    toggle.setAttribute('aria-expanded', String(open));
    toggle.querySelector('.top__toggle-label').textContent = open ? 'Chiudi' : 'Menu';
  };
  toggle.addEventListener('click', () => setMenu(!doc.classList.contains('menu-open')));
  menu.addEventListener('click', (e) => { if (e.target.closest('a')) setMenu(false); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && doc.classList.contains('menu-open')) { setMenu(false); toggle.focus(); } });

  // Video delle macchine nell'hero: solo se il movimento è consentito e non c'è risparmio dati
  const video = document.querySelector('.hero__video');
  const saveData = navigator.connection && navigator.connection.saveData;
  if (video && !reduceMotion && !saveData) {
    video.src = video.dataset.src;
    video.play().catch(() => {});
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(([entry]) => {
        if (entry.isIntersecting) video.play().catch(() => {}); else video.pause();
      }).observe(hero);
    }
  }

  // Le tre separazioni del titolo seguono il puntatore: fuori registro di qualche pixel
  const sep = document.querySelector('.sep');
  if (sep && canHover && !reduceMotion) {
    let tx = 0, ty = 0, cx = 0, cy = 0, raf = 0;
    const tick = () => {
      cx += (tx - cx) * 0.12;
      cy += (ty - cy) * 0.12;
      sep.style.setProperty('--rx', cx.toFixed(2));
      sep.style.setProperty('--ry', cy.toFixed(2));
      raf = Math.abs(tx - cx) > 0.02 || Math.abs(ty - cy) > 0.02 ? requestAnimationFrame(tick) : 0;
    };
    const kick = () => { if (!raf) raf = requestAnimationFrame(tick); };
    setTimeout(() => {
      hero.addEventListener('pointermove', (e) => {
        const r = hero.getBoundingClientRect();
        tx = ((e.clientX - r.left) / r.width - 0.5) * 7;
        ty = ((e.clientY - r.top) / r.height - 0.5) * 5;
        kick();
      });
      hero.addEventListener('pointerleave', () => { tx = 0; ty = 0; kick(); });
    }, 1800);
  }

  // Immagini che entrano con la passata di racla
  const wipes = document.querySelectorAll('[data-wipe]');
  if ('IntersectionObserver' in window && !reduceMotion) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        // anche ciò che è già passato sopra (scroll veloce) va rivelato
        if (entry.isIntersecting || entry.boundingClientRect.top < 0) { entry.target.classList.add('is-in'); io.unobserve(entry.target); }
      });
    }, { threshold: [0, 0.18], rootMargin: '0px 0px -5% 0px' });
    wipes.forEach((el) => io.observe(el));
  } else {
    wipes.forEach((el) => el.classList.add('is-in'));
  }

  // Linea d'inchiostro lungo i sei reparti
  const steps = document.querySelector('.steps');
  if (steps) {
    const items = [...steps.querySelectorAll('.step')];
    let pending = false;
    const update = () => {
      pending = false;
      const vh = window.innerHeight;
      const r = steps.getBoundingClientRect();
      const p = Math.min(1, Math.max(0, (vh * 0.62 - r.top) / r.height));
      steps.style.setProperty('--p', p.toFixed(4));
      items.forEach((li) => li.classList.toggle('is-on', li.getBoundingClientRect().top < vh * 0.62));
    };
    window.addEventListener('scroll', () => { if (!pending) { pending = true; requestAnimationFrame(update); } }, { passive: true });
    window.addEventListener('resize', update);
    update();
  }

  // Lightbox dei lavori
  const lb = document.getElementById('lightbox');
  if (lb && typeof lb.showModal === 'function') {
    const lbImg = lb.querySelector('.lightbox__img');
    const lbCap = lb.querySelector('.lightbox__cap');
    document.querySelectorAll('.work').forEach((btn) => {
      btn.addEventListener('click', () => {
        const img = btn.querySelector('img');
        lbImg.src = img.currentSrc || img.src;
        lbImg.alt = img.alt;
        lbCap.textContent = btn.querySelector('span').textContent;
        lb.showModal();
      });
    });
    lb.addEventListener('click', (e) => { if (e.target === lb) lb.close(); });
  }

  // Modulo preventivo: compone l'email e apre il programma di posta
  const form = document.getElementById('form-preventivo');
  if (form) {
    const err = document.getElementById('form-err');
    const showError = (msg, field) => {
      err.textContent = msg;
      err.hidden = false;
      // il messaggio va subito sotto il campo da correggere, così si vede insieme al campo
      (field.closest('.form__row') || field.closest('label')).insertAdjacentElement('afterend', err);
      field.setAttribute('aria-invalid', 'true');
      field.setAttribute('aria-describedby', 'form-err');
      field.focus();
    };
    form.addEventListener('input', (e) => { e.target.removeAttribute('aria-invalid'); e.target.removeAttribute('aria-describedby'); });
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      err.hidden = true;
      const f = form.elements;
      const val = (name) => f[name].value.trim();
      if (!val('nome')) return showError('Scrivi nome e cognome.', f.nome);
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val('email'))) return showError("Controlla l'indirizzo email: serve per mandarti il preventivo.", f.email);
      if (!val('messaggio')) return showError('Descrivi in due righe il lavoro da stampare.', f.messaggio);
      if (!f.privacy.checked) return showError("Spunta la casella dell'informativa privacy per continuare.", f.privacy);

      const chi = val('azienda') || val('nome');
      const subject = `Richiesta preventivo: ${val('tipo')} (${chi})`;
      const body = [
        'Buongiorno,',
        'vorrei un preventivo per questo lavoro.',
        '',
        `Lavorazione: ${val('tipo')}`,
        `Quantità indicativa: ${val('quantita') || 'da definire'}`,
        '',
        val('messaggio'),
        '',
        `${val('nome')}${val('azienda') ? ' – ' + val('azienda') : ''}`,
        `Email: ${val('email')}`,
        val('telefono') ? `Telefono: ${val('telefono')}` : '',
        '',
        '(Allego la grafica / le foto del pezzo)'
      ].join('\n');
      window.location.href = `mailto:info@itd-serigrafia.it?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      form.querySelector('.form__note').textContent = "Email pronta. Se il programma di posta non si è aperto, scrivici a info@itd-serigrafia.it o chiama lo 0423 490262.";
    });
  }
})();
