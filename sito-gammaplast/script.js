(() => {
  const html = document.documentElement;
  const riduci = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

  // intro del titolo: parte quando Archivo è pronto (con il fallback l'asse larghezza non c'è)
  let partito = false;
  const parti = () => { if (!partito) { partito = true; html.classList.add('pronto'); } };
  if (document.fonts && document.fonts.load) {
    document.fonts.load('800 1em Archivo').then(parti, parti);
    setTimeout(parti, 1200);
  } else parti();

  // testata
  const testata = document.getElementById('testata');
  const hamburger = document.querySelector('.hamburger');
  const menuMobile = document.getElementById('menu-mobile');
  const chiudiMenu = () => {
    menuMobile.hidden = true;
    hamburger.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
  };
  hamburger.addEventListener('click', () => {
    const apri = menuMobile.hidden;
    menuMobile.hidden = !apri;
    hamburger.setAttribute('aria-expanded', String(apri));
    document.body.style.overflow = apri ? 'hidden' : '';
  });
  menuMobile.addEventListener('click', (e) => { if (e.target.closest('a')) chiudiMenu(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !menuMobile.hidden) { chiudiMenu(); hamburger.focus(); } });

  // comparse: quote e foto del reparto
  const daRivelare = document.querySelectorAll('.quota-item, .foto');
  if ('IntersectionObserver' in window && !riduci) {
    const io = new IntersectionObserver((voci) => {
      voci.forEach((v) => { if (v.isIntersecting) { v.target.classList.add('in'); io.unobserve(v.target); } });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
    daRivelare.forEach((el) => io.observe(el));
  } else daRivelare.forEach((el) => el.classList.add('in'));

  // scroll: canale che si riempie, settori che si allargano, parallasse del panorama
  const linea = document.querySelector('.ciclo__linea');
  const passi = [...document.querySelectorAll('.passo')];
  const settori = [...document.querySelectorAll('.settori__lista li')];
  const panorama = document.querySelector('.panorama__cornice');
  const panoramaImg = panorama && panorama.querySelector('img');

  // per ogni settore: larghezza massima del font che sta nella riga
  let maxStretch = [];
  const misuraSettori = () => {
    maxStretch = settori.map((li) => {
      const prima = li.style.fontStretch;
      li.style.fontStretch = '100%';
      const span = document.createElement('span');
      span.textContent = li.textContent;
      span.style.cssText = 'display:inline-block;white-space:nowrap';
      li.textContent = '';
      li.appendChild(span);
      const w = span.getBoundingClientRect().width;
      li.textContent = span.textContent;
      li.style.fontStretch = prima;
      const disponibile = li.clientWidth - 4;
      return clamp(100 * disponibile / Math.max(w, 1) * 0.97, 62, 125);
    });
  };

  const aggiorna = () => {
    const vh = innerHeight;
    testata.classList.toggle('scorsa', scrollY > 8);

    if (linea) {
      const r = linea.getBoundingClientRect();
      const p = clamp((vh * 0.62 - r.top) / r.height, 0, 1);
      linea.style.setProperty('--p', p.toFixed(4));
      const livello = p * r.height;
      passi.forEach((li) => li.classList.toggle('pieno', li.offsetTop + 22 <= livello));
    }

    if (!riduci) {
      settori.forEach((li, i) => {
        const r = li.getBoundingClientRect();
        if (r.bottom < -50 || r.top > vh + 50) return;
        const d = Math.abs((r.top + r.height / 2) - vh * 0.5) / (vh * 0.5);
        const k = Math.pow(1 - clamp(d, 0, 1), 1.6);
        const max = maxStretch[i] || 100;
        li.style.fontStretch = (62 + (max - 62) * k).toFixed(1) + '%';
        li.style.setProperty('--k', k.toFixed(3));
      });

      if (panorama) {
        const r = panorama.getBoundingClientRect();
        if (r.bottom > 0 && r.top < vh) {
          const p = (r.top + r.height / 2 - vh / 2) / (vh / 2 + r.height / 2);
          panoramaImg.style.setProperty('--py', (p * r.height * -0.07).toFixed(1) + 'px');
        }
      }
    } else {
      settori.forEach((li) => { li.style.fontStretch = Math.min(100, (maxStretch[settori.indexOf(li)] || 100)) + '%'; li.style.setProperty('--k', 1); });
    }
  };

  let inCoda = false;
  const richiedi = () => { if (!inCoda) { inCoda = true; requestAnimationFrame(() => { inCoda = false; aggiorna(); }); } };
  addEventListener('scroll', richiedi, { passive: true });
  addEventListener('resize', () => { misuraSettori(); richiedi(); });
  const pronti = () => { misuraSettori(); aggiorna(); };
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(pronti);
  pronti();

  // modulo preventivo: compone l'email
  const modulo = document.getElementById('modulo');
  const stato = document.getElementById('modulo-stato');
  modulo.addEventListener('submit', (e) => {
    e.preventDefault();
    const f = modulo.elements;
    const obbligatori = [f.nome, f.email, f.messaggio];
    let primo = null;
    obbligatori.forEach((el) => {
      const vuoto = !el.value.trim() || (el.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(el.value.trim()));
      el.setAttribute('aria-invalid', vuoto ? 'true' : 'false');
      if (vuoto && !primo) primo = el;
    });
    if (primo) {
      stato.textContent = 'Compilate nome, email valida e descrizione del pezzo.';
      stato.className = 'modulo__nota errore';
      primo.focus();
      return;
    }
    if (!f.privacy.checked) {
      stato.textContent = 'Per inviare la richiesta serve il consenso alla privacy.';
      stato.className = 'modulo__nota errore';
      f.privacy.focus();
      return;
    }
    const servizi = [...modulo.querySelectorAll('input[name="servizi"]:checked')].map((c) => c.value);
    const v = (el) => el.value.trim();
    const righe = [
      'Buongiorno, vorrei un preventivo.',
      '',
      'Nome: ' + v(f.nome),
      v(f.azienda) ? 'Azienda: ' + v(f.azienda) : null,
      'Email: ' + v(f.email),
      v(f.telefono) ? 'Telefono: ' + v(f.telefono) : null,
      servizi.length ? 'Mi serve: ' + servizi.join(', ') : null,
      v(f.quantita) ? 'Quantità indicativa: ' + v(f.quantita) : null,
      v(f.materiale) ? 'Materiale: ' + v(f.materiale) : null,
      '',
      'Il pezzo:',
      v(f.messaggio),
      '',
      'Allego i disegni del pezzo.',
    ].filter((r) => r !== null);
    const oggetto = 'Richiesta preventivo' + (v(f.azienda) ? ' da ' + v(f.azienda) : ' da ' + v(f.nome));
    location.href = 'mailto:gammaplastiche@libero.it?subject=' + encodeURIComponent(oggetto) + '&body=' + encodeURIComponent(righe.join('\n'));
    stato.textContent = 'Si è aperta l\'email con la richiesta: allegate i disegni e inviatela.';
    stato.className = 'modulo__nota ok';
  });
  modulo.addEventListener('input', (e) => { if (e.target.getAttribute('aria-invalid') === 'true' && e.target.value.trim()) e.target.setAttribute('aria-invalid', 'false'); });

  document.getElementById('anno').textContent = new Date().getFullYear();

  // scena 3D: dopo il load, così titolo e CTA arrivano prima
  const hero = document.querySelector('.hero');
  const avvia3D = () => {
    import('./3d.js')
      .then((m) => m.avvia({
        canvas: hero.querySelector('.hero__scena'),
        hero,
        palco: hero.querySelector('.hero__palco'),
        hmi: hero.querySelector('.hmi'),
        riduci,
      }))
      .catch(() => { /* resta il disegno tecnico */ });
  };
  if (document.readyState === 'complete') setTimeout(avvia3D, 60);
  else addEventListener('load', () => setTimeout(avvia3D, 60), { once: true });
})();
