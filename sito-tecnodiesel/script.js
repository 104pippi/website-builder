(() => {
  const html = document.documentElement;
  const ridotto = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- intro dell'hero ---------- */
  let avviato = false;
  const avvia = () => {
    if (avviato) return;
    avviato = true;
    requestAnimationFrame(() => html.classList.add('avvio'));
  };
  if (document.fonts && document.fonts.load) {
    Promise.all([
      document.fonts.load('800 100px "Barlow Condensed"'),
      document.fonts.load('400 16px "Barlow"')
    ]).catch(() => {}).then(avvia);
  }
  setTimeout(avvia, 900);

  /* ---------- testata e barra mobile ---------- */
  const testata = document.getElementById('testata');
  const barra = document.getElementById('barra');
  const heroAzioni = document.getElementById('hero-azioni');
  let ctaHeroVisibile = true;
  new IntersectionObserver(([v]) => {
    ctaHeroVisibile = v.isIntersecting;
    barra.classList.toggle('visibile', !ctaHeroVisibile);
  }).observe(heroAzioni);

  /* ---------- palco del motore: avanzamento e passi ---------- */
  const motore = document.getElementById('motore');
  const passi = [...motore.querySelectorAll('.passo')];
  const ctaPasso = motore.querySelector('.passo .btn');
  const stato = (window.__motore = { p: 0 });
  let passoAttivo = 0;

  const aggiornaMotore = () => {
    const r = motore.getBoundingClientRect();
    const corsa = motore.offsetHeight - innerHeight;
    const p = corsa > 0 ? Math.min(1, Math.max(0, -r.top / corsa)) : 0;
    stato.p = p;
    motore.style.setProperty('--p', p.toFixed(4));
    const i = p < 0.22 ? 0 : p < 0.66 ? 1 : 2;
    if (i !== passoAttivo) {
      passoAttivo = i;
      passi.forEach((el, k) => el.classList.toggle('attivo', k === i));
      ctaPasso.tabIndex = i === 2 ? 0 : -1;
    }
  };

  let inCoda = false;
  const suScroll = () => {
    if (inCoda) return;
    inCoda = true;
    requestAnimationFrame(() => {
      inCoda = false;
      testata.classList.toggle('scorre', scrollY > 40);
      aggiornaMotore();
    });
  };
  addEventListener('scroll', suScroll, { passive: true });
  addEventListener('resize', suScroll);
  suScroll();

  /* ---------- scena 3D: si carica dopo la pagina ---------- */
  const scena = document.getElementById('motore-scena');
  const etichette = document.getElementById('motore-etichette');
  let caricato = false;
  const haWebGL = () => {
    try {
      const c = document.createElement('canvas');
      return !!(c.getContext('webgl2') || c.getContext('webgl'));
    } catch (e) { return false; }
  };
  const caricaMotore = () => {
    if (caricato) return;
    caricato = true;
    if (!haWebGL()) return;
    import('./3d.js')
      .then((m) => m.avvia({ sezione: motore, box: scena, etichette, stato, ridotto }))
      .catch((e) => console.warn('Scena 3D non disponibile:', e));
  };
  const osservaMotore = () => {
    const io = new IntersectionObserver((voci) => {
      if (voci.some((v) => v.isIntersecting)) { io.disconnect(); caricaMotore(); }
    }, { rootMargin: '150% 0px' });
    io.observe(motore);
    setTimeout(caricaMotore, 2500);
  };
  if (document.readyState === 'complete') osservaMotore();
  else addEventListener('load', osservaMotore, { once: true });

  /* ---------- comparse allo scroll ---------- */
  const rivela = new IntersectionObserver((voci) => {
    voci.forEach((v) => {
      if (v.isIntersecting) { v.target.classList.add('in'); rivela.unobserve(v.target); }
    });
  }, { rootMargin: '0px 0px -6% 0px', threshold: 0.01 });
  document.querySelectorAll('[data-rivela]').forEach((el) => rivela.observe(el));

  /* ---------- modulo "Descrivi il guasto" ---------- */
  const modulo = document.getElementById('modulo');
  const campoLuogo = document.getElementById('campo-luogo');
  const errore = document.getElementById('modulo-errore');
  const ok = document.getElementById('modulo-ok');
  modulo.addEventListener('change', (e) => {
    if (e.target.name === 'dove') campoLuogo.hidden = e.target.value !== "Serve l'officina mobile";
    if (e.target.getAttribute('aria-invalid')) e.target.removeAttribute('aria-invalid');
  });
  modulo.addEventListener('input', (e) => {
    if (e.target.getAttribute('aria-invalid')) e.target.removeAttribute('aria-invalid');
  });
  modulo.addEventListener('submit', (e) => {
    e.preventDefault();
    const f = modulo.elements;
    const dove = modulo.querySelector('input[name="dove"]:checked').value;
    const mobile = dove === "Serve l'officina mobile";
    const obbligatori = [f.mezzo, f.problema, f.nome, f.telefono];
    if (mobile) obbligatori.splice(2, 0, f.luogo);
    const mancanti = obbligatori.filter((c) => !c.value.trim());
    obbligatori.forEach((c) => c.toggleAttribute('aria-invalid', false));
    mancanti.forEach((c) => c.setAttribute('aria-invalid', 'true'));
    if (mancanti.length) {
      errore.textContent = 'Mancano alcuni dati: ' + mancanti.map((c) => modulo.querySelector(`label[for="${c.id}"]`).textContent.replace('?', '').toLowerCase()).join(', ') + '.';
      errore.hidden = false;
      ok.hidden = true;
      mancanti[0].focus();
      return;
    }
    errore.hidden = true;
    const v = (c) => c.value.trim();
    const oggetto = `Richiesta intervento: ${v(f.mezzo)}${v(f.modello) ? ' ' + v(f.modello) : ''}`;
    const righe = [
      'Buongiorno,',
      'vi scrivo dal sito per un guasto.',
      '',
      `Mezzo: ${v(f.mezzo)}`,
      `Marca e modello: ${v(f.modello) || 'non indicato'}`,
      `Riparazione: ${dove}`,
      ...(mobile ? [`Dove si trova: ${v(f.luogo)}`] : []),
      `Problema: ${v(f.problema)}`,
      '',
      `Nome: ${v(f.nome)}`,
      `Telefono: ${v(f.telefono)}`
    ];
    location.href = 'mailto:stefano@tecnodiesel.eu?subject=' + encodeURIComponent(oggetto) + '&body=' + encodeURIComponent(righe.join('\n'));
    ok.hidden = false;
  });

  /* ---------- galleria: foto ingrandita ---------- */
  const lente = document.getElementById('lente');
  const lenteImg = document.getElementById('lente-img');
  const lenteTesto = document.getElementById('lente-testo');
  if (lente && typeof lente.showModal === 'function') {
    document.querySelectorAll('[data-lente]').forEach((a) => {
      a.addEventListener('click', (e) => {
        e.preventDefault();
        const img = a.querySelector('img');
        lenteImg.src = a.getAttribute('href');
        lenteImg.alt = img.alt;
        lenteTesto.textContent = a.querySelector('span').textContent;
        lente.showModal();
      });
    });
    lente.querySelector('.lente-chiudi').addEventListener('click', () => lente.close());
    lente.addEventListener('click', (e) => { if (e.target === lente) lente.close(); });
  }

  /* ---------- anno ---------- */
  document.getElementById('anno').textContent = new Date().getFullYear();
})();
