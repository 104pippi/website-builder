/* Scuole Bertolini: intro, testata, menu, orari, modulo e caricamento della scena 3D */
(() => {
  const html = document.documentElement;
  const ridotto = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // intro dell'hero: parte quando i font sono pronti, comunque entro 1,2 s
  let partita = false;
  const avvia = () => { if (partita) return; partita = true; requestAnimationFrame(() => html.classList.add('avvio')); };
  const fonts = document.fonts ? document.fonts.load('600 64px Lexend').catch(() => {}) : Promise.resolve();
  Promise.race([fonts, new Promise(r => setTimeout(r, 1200))]).then(avvia);
  setTimeout(avvia, 2000);

  // testata solida e barra mobile
  const testata = document.getElementById('testata');
  const barra = document.querySelector('.barra');
  const hero = document.querySelector('.hero');
  const aggiornaScroll = () => {
    const y = scrollY;
    testata.classList.toggle('solida', y > 24);
    barra.classList.toggle('visibile', y > hero.offsetHeight * .6);
  };
  addEventListener('scroll', aggiornaScroll, { passive: true });
  aggiornaScroll();

  // menu mobile
  const apri = document.querySelector('.menu-apri');
  const menu = document.getElementById('menu');
  const chiudiMenu = () => { menu.hidden = true; apri.setAttribute('aria-expanded', 'false'); document.body.style.overflow = ''; };
  apri.addEventListener('click', () => {
    const aperto = apri.getAttribute('aria-expanded') === 'true';
    if (aperto) return chiudiMenu();
    menu.hidden = false; apri.setAttribute('aria-expanded', 'true'); document.body.style.overflow = 'hidden';
  });
  menu.addEventListener('click', e => { if (e.target.closest('a')) chiudiMenu(); });
  addEventListener('keydown', e => { if (e.key === 'Escape' && !menu.hidden) { chiudiMenu(); apri.focus(); } });

  // foto e blocchi che si scoprono entrando nello schermo (si osserva il contenitore, mai l'elemento ritagliato)
  const osserva = new IntersectionObserver(voci => {
    for (const v of voci) if (v.isIntersecting) { v.target.classList.add('in'); osserva.unobserve(v.target); }
  }, { rootMargin: '0px 0px -12% 0px' });
  document.querySelectorAll('[data-rivela], .orari').forEach(el => osserva.observe(el));

  // la giornata: schede, e su mobile un giro automatico finché nessuno tocca
  const schede = [...document.querySelectorAll('.scheda')];
  const pannelli = schede.map(s => document.getElementById(s.getAttribute('aria-controls')));
  let toccato = false, giro = null;
  const mostra = (i, daUtente) => {
    schede.forEach((s, k) => { s.setAttribute('aria-selected', String(k === i)); s.tabIndex = k === i ? 0 : -1; });
    pannelli.forEach((p, k) => p.classList.toggle('attivo', k === i));
    if (daUtente) { toccato = true; clearTimeout(giro); }
  };
  schede.forEach((s, i) => {
    s.addEventListener('click', () => mostra(i, true));
    s.addEventListener('keydown', e => {
      const d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
      if (!d) return;
      const j = (i + d + schede.length) % schede.length; mostra(j, true); schede[j].focus();
    });
  });
  const orari = document.querySelector('.orari');
  if (!ridotto && orari) {
    let attiva = 0, inVista = false;
    const passo = () => {
      clearTimeout(giro);
      if (toccato || !inVista || innerWidth >= 900) return;
      giro = setTimeout(() => { if (toccato || !inVista) return; attiva = (attiva + 1) % schede.length; mostra(attiva, false); passo(); }, 2600);
    };
    new IntersectionObserver(([v]) => { inVista = v.isIntersecting; passo(); }, { threshold: .35 }).observe(orari);
  }

  // modulo: compone l'email per la segreteria
  const modulo = document.getElementById('modulo');
  modulo.addEventListener('submit', e => {
    e.preventDefault();
    const d = new FormData(modulo);
    const nome = (d.get('nome') || '').trim(), tel = (d.get('telefono') || '').trim();
    const errore = modulo.querySelector('.modulo__errore');
    if (!nome || !tel) { errore.hidden = false; modulo.querySelector(!nome ? '[name=nome]' : '[name=telefono]').focus(); return; }
    errore.hidden = true;
    const righe = [
      'Buongiorno,',
      `vorremmo prenotare una visita alla ${d.get('scuola')}.`,
      '',
      `Nome: ${nome}`,
      `Telefono: ${tel}`,
      (d.get('eta') || '').trim() ? `Età del bambino: ${d.get('eta').trim()}` : null,
      `Momento preferito: ${d.get('quando')}`,
      (d.get('note') || '').trim() ? `\n${d.get('note').trim()}` : null,
      '',
      'Grazie, a presto.'
    ].filter(r => r !== null);
    const oggetto = `Richiesta visita: ${d.get('scuola')}`;
    location.href = `mailto:info@scuolebertolini.it?subject=${encodeURIComponent(oggetto)}&body=${encodeURIComponent(righe.join('\n'))}`;
  });

  // anno nel piede
  document.querySelectorAll('.anno-corrente').forEach(el => { el.textContent = new Date().getFullYear(); });

  // scena 3D delle matite: si carica dopo la pagina o quando la sezione si avvicina
  const crescita = document.getElementById('crescita');
  let caricata = false;
  const carica3d = () => {
    if (caricata) return; caricata = true;
    import('./3d.js').then(m => m.avvia(crescita, { ridotto })).catch(err => console.warn('3D non disponibile', err));
  };
  new IntersectionObserver(([v]) => { if (v.isIntersecting) carica3d(); }, { rootMargin: '900px 0px' }).observe(crescita);
  addEventListener('load', () => setTimeout(carica3d, 400));

  // fasi della crescita senza 3D (fallback): segue lo scroll
  const fasi = [...crescita.querySelectorAll('.fase')];
  window.__faseCrescita = i => fasi.forEach((f, k) => f.classList.toggle('attiva', k === i));
  const faseDaScroll = () => {
    if (crescita.classList.contains('pronta')) return;
    const r = crescita.getBoundingClientRect();
    const p = Math.min(1, Math.max(0, -r.top / Math.max(1, crescita.offsetHeight - innerHeight)));
    window.__faseCrescita(p < .34 ? 0 : p < .67 ? 1 : 2);
  };
  addEventListener('scroll', faseDaScroll, { passive: true });
  faseDaScroll();
})();
