/* Due Esse Srl — demo: menu, comparse, servizi, metodo, parallasse, modulo preventivo e caricamento della scena 3D. */
(() => {
  const doc = document.documentElement;
  const fermo = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Anno nel piede
  document.querySelectorAll('[data-anno]').forEach((el) => { el.textContent = new Date().getFullYear(); });

  // Testata: sfondo dopo i primi pixel di scroll
  const testata = document.querySelector('[data-testata]');

  // Menu mobile
  const bottone = document.querySelector('[data-apri-menu]');
  const menu = document.querySelector('[data-menu]');
  const testoMenu = bottone.querySelector('.testata__menu-testo');
  const chiudiMenu = () => {
    menu.hidden = true; menu.classList.remove('aperto');
    bottone.setAttribute('aria-expanded', 'false'); testoMenu.textContent = 'Menu';
    document.body.style.overflow = '';
  };
  bottone.addEventListener('click', () => {
    if (!menu.hidden) { chiudiMenu(); return; }
    menu.hidden = false; requestAnimationFrame(() => menu.classList.add('aperto'));
    bottone.setAttribute('aria-expanded', 'true'); testoMenu.textContent = 'Chiudi';
    document.body.style.overflow = 'hidden';
    testata.classList.add('scorsa');
  });
  menu.addEventListener('click', (e) => { if (e.target.closest('a')) chiudiMenu(); });
  addEventListener('keydown', (e) => { if (e.key === 'Escape' && !menu.hidden) { chiudiMenu(); bottone.focus(); } });

  // Comparse allo scroll: si osserva l'elemento stesso, che non è mai ritagliato
  const rivela = document.querySelectorAll('[data-rivela]');
  if ('IntersectionObserver' in window && !fermo) {
    const io = new IntersectionObserver((voci) => {
      voci.forEach((v) => { if (v.isIntersecting) { v.target.classList.add('in'); io.unobserve(v.target); } });
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0.12 });
    rivela.forEach((el) => io.observe(el));
  } else {
    rivela.forEach((el) => el.classList.add('in'));
  }

  // Servizi: la voce al centro dello schermo sceglie la foto nella cornice (desktop)
  const servizi = [...document.querySelectorAll('[data-servizio]')];
  const foto = [...document.querySelectorAll('[data-foto]')];
  const attiva = (i) => {
    servizi.forEach((s, k) => s.classList.toggle('attivo', k === i));
    foto.forEach((f, k) => f.classList.toggle('attiva', k === i));
  };
  const largo = matchMedia('(min-width: 1024px)');
  let attivo = 0;

  // Metodo: ogni passo si accende quando arriva a tre quarti dello schermo
  const passi = document.querySelectorAll('[data-passo]');
  if ('IntersectionObserver' in window && !fermo) {
    const ioP = new IntersectionObserver((voci) => {
      voci.forEach((v) => { if (v.isIntersecting) { v.target.classList.add('attivo'); ioP.unobserve(v.target); } });
    }, { rootMargin: '0px 0px -28% 0px', threshold: 0.2 });
    passi.forEach((p) => ioP.observe(p));
  } else {
    passi.forEach((p) => p.classList.add('attivo'));
  }

  // Scroll: testata, parallasse delle foto dei settori, avanzamento della scena 3D
  const parallasse = [...document.querySelectorAll('[data-parallasse]')];
  const hero = document.querySelector('[data-hero]');
  let inCoda = false;
  const suScroll = () => {
    inCoda = false;
    const y = scrollY, h = innerHeight;
    testata.classList.toggle('scorsa', y > 12 || !menu.hidden);
    if (largo.matches) {
      // la voce che ha passato la metà dello schermo sceglie la foto
      let k = 0;
      servizi.forEach((s, i) => { if (s.getBoundingClientRect().top < h * 0.5) k = i; });
      if (k !== attivo) { attivo = k; attiva(k); }
    }
    if (!fermo) {
      for (const img of parallasse) {
        const r = img.parentElement.getBoundingClientRect();
        if (r.bottom < -50 || r.top > h + 50) continue;
        const p = (r.top + r.height / 2 - h / 2) / (h / 2 + r.height / 2);   // -1 sopra, 1 sotto
        img.style.setProperty('--py', `${(p * -7).toFixed(2)}%`);
      }
    }
    doc.style.setProperty('--hero-p', Math.min(1, Math.max(0, y / Math.max(1, hero.offsetHeight))).toFixed(4));
  };
  addEventListener('scroll', () => { if (!inCoda) { inCoda = true; requestAnimationFrame(suScroll); } }, { passive: true });
  addEventListener('resize', suScroll, { passive: true });
  suScroll();

  // Modulo preventivo: compone l'email e apre il programma di posta
  const modulo = document.querySelector('[data-modulo]');
  const errore = modulo.querySelector('[data-errore]');
  const esito = modulo.querySelector('[data-esito]');
  modulo.addEventListener('submit', (e) => {
    e.preventDefault();
    const d = new FormData(modulo);
    const v = (k) => String(d.get(k) || '').trim();
    const nome = v('nome'), tel = v('telefono'), email = v('email');
    const campoNome = modulo.elements.nome, campoTel = modulo.elements.telefono;
    campoNome.removeAttribute('aria-invalid'); campoTel.removeAttribute('aria-invalid');
    let msg = '';
    if (!nome) { msg = 'Scrivete il vostro nome, così sappiamo chi ricontattare.'; campoNome.setAttribute('aria-invalid', 'true'); campoNome.focus(); }
    else if (!tel && !email) { msg = 'Lasciate un telefono o un\'email per la risposta.'; campoTel.setAttribute('aria-invalid', 'true'); campoTel.focus(); }
    if (msg) { errore.textContent = msg; errore.hidden = false; return; }
    errore.hidden = true;

    const tipo = v('tipo') || 'Serramenti metallici', comune = v('comune'), testo = v('messaggio');
    const oggetto = `Richiesta preventivo: ${tipo}${comune ? ` a ${comune}` : ''}`;
    const righe = [
      'Buongiorno,',
      `vorrei un preventivo per: ${tipo.toLowerCase()}.`,
      comune ? `Cantiere a: ${comune}` : '',
      '',
      testo,
      '',
      `Nome: ${nome}`,
      tel ? `Telefono: ${tel}` : '',
      email ? `Email: ${email}` : '',
    ];
    const corpo = righe.join('\n').replace(/\n{3,}/g, '\n\n').trim();
    const href = `mailto:info@2-esse.com?subject=${encodeURIComponent(oggetto)}&body=${encodeURIComponent(corpo)}`;
    window.location.href = href;
    esito.textContent = 'Email pronta nel vostro programma di posta: controllate e premete Invia. Se non si è aperto nulla, scrivete a info@2-esse.com o chiamate lo 0422 445613.';
    esito.classList.add('fatto');
  });

  // Scena 3D: arriva dopo la pagina, solo se il dispositivo regge WebGL
  const scena = document.querySelector('[data-scena]');
  const canvas = scena && scena.querySelector('[data-canvas]');
  const webgl = (() => {
    try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch (_) { return false; }
  })();
  const risparmio = navigator.connection && navigator.connection.saveData;
  const carica3d = () => {
    if (!canvas || !webgl || risparmio) return;
    import('./3d.js')
      .then((m) => m.avvia({ scena, canvas, hero, fermo }))
      .catch(() => { /* resta il disegno tecnico */ });
  };
  if (document.readyState === 'complete') setTimeout(carica3d, 120);
  else addEventListener('load', () => setTimeout(carica3d, 120), { once: true });
})();
