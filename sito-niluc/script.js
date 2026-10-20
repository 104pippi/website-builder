(() => {
  const html = document.documentElement;
  const ridotto = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // intro: parte con il font pronto (o dopo 900 ms al massimo)
  let partita = false;
  const avvia = () => { if (!partita) { partita = true; html.classList.add('avvio'); } };
  if (document.fonts && document.fonts.load) document.fonts.load('800 100px Archivo').catch(() => {}).then(avvia);
  setTimeout(avvia, 900);

  // anno nel piede
  document.querySelectorAll('[data-anno]').forEach((el) => { el.textContent = new Date().getFullYear(); });

  // menu mobile
  const apri = document.querySelector('[data-apri-menu]');
  const menu = document.querySelector('[data-menu-mobile]');
  const chiudiMenu = () => { menu.hidden = true; apri.setAttribute('aria-expanded', 'false'); apri.textContent = 'Menu'; document.body.style.overflow = ''; };
  apri.addEventListener('click', () => {
    const aperto = !menu.hidden;
    if (aperto) return chiudiMenu();
    menu.hidden = false; apri.setAttribute('aria-expanded', 'true'); apri.textContent = 'Chiudi'; document.body.style.overflow = 'hidden';
  });
  menu.addEventListener('click', (e) => { if (e.target.closest('a')) chiudiMenu(); });
  addEventListener('keydown', (e) => { if (e.key === 'Escape' && !menu.hidden) chiudiMenu(); });

  // testata piena dopo l'hero, barra mobile quando i bottoni dell'hero escono
  const testata = document.querySelector('[data-testata]');
  const barra = document.querySelector('[data-barra]');
  const azioniHero = document.querySelector('[data-azioni-hero]');
  new IntersectionObserver(([v]) => barra.classList.toggle('mostra', !v.isIntersecting && v.boundingClientRect.top < 0)).observe(azioniHero);

  // cartellini appesi allo stender: oscillano con la velocità dello scroll
  const cartellini = [...document.querySelectorAll('[data-cartellino]')].map((el, i) => ({
    el, ax: 0, vx: 0, az: 0, vz: 0, k: 1 + (i % 3) * 0.17, lato: i % 2 ? 1 : -1,
  }));
  let cartelliniVisti = false;
  const zonaCartellini = document.querySelector('[data-cartellini]');
  if (zonaCartellini) new IntersectionObserver(([v]) => { cartelliniVisti = v.isIntersecting; }, { rootMargin: '120px 0px' }).observe(zonaCartellini);

  // impuntura del metodo
  const metodo = document.querySelector('[data-metodo]');
  const corpo = metodo && metodo.querySelector('.metodo__corpo');
  const impuntura = metodo && metodo.querySelector('.impuntura');
  const passi = metodo ? [...metodo.querySelectorAll('[data-passo]')] : [];

  // parallasse della fascia
  const fascia = document.querySelector('[data-parallasse]');

  let ultimoY = window.scrollY;
  let ultimoT = performance.now();
  let velocita = 0;

  function aggiorna(ora) {
    const y = window.scrollY;
    const dt = Math.min(Math.max((ora - ultimoT) / 1000, 0.001), 0.05);
    ultimoT = ora;
    const vIstantanea = (y - ultimoY) / dt;
    ultimoY = y;
    velocita += (vIstantanea - velocita) * Math.min(dt * 12, 1);

    testata.classList.toggle('piena', y > 40);

    if (cartelliniVisti && !ridotto) {
      const spinta = Math.max(-1, Math.min(1, velocita / 1400));
      for (const c of cartellini) {
        // molla smorzata: la spinta dello scroll inclina il cartellino, poi torna a piombo dondolando
        const w = 7.5 * c.k;
        c.vx += (-w * w * c.ax - 2 * 0.22 * w * c.vx + spinta * 300 * c.k) * dt;
        c.ax += c.vx * dt;
        c.vz += (-w * w * 0.8 * c.az - 2 * 0.2 * w * c.vz + spinta * 160 * c.lato) * dt;
        c.az += c.vz * dt;
        const ax = Math.max(-18, Math.min(18, c.ax));
        const az = Math.max(-7, Math.min(7, c.az));
        c.el.style.transform = `perspective(700px) rotateX(${ax.toFixed(2)}deg) rotateZ(${az.toFixed(2)}deg)`;
      }
    }

    if (metodo) {
      const r = corpo.getBoundingClientRect();
      const vh = window.innerHeight;
      const p = Math.min(Math.max((vh * 0.78 - r.top) / (r.height + vh * 0.25), 0), 1);
      metodo.style.setProperty('--p', p.toFixed(4));
      const orizzontale = matchMedia('(min-width: 900px)').matches;
      const corsa = orizzontale ? impuntura.clientWidth : impuntura.clientHeight;
      metodo.style.setProperty('--corsa', corsa + 'px');
      passi.forEach((el, i) => {
        const soglia = orizzontale ? (i + 0.15) / passi.length : (el.offsetTop - 8) / Math.max(corpo.clientHeight, 1);
        el.classList.toggle('cucito', p >= soglia);
      });
    }

    if (fascia && !ridotto) {
      const r = fascia.parentElement.getBoundingClientRect();
      const vh = window.innerHeight;
      if (r.bottom > 0 && r.top < vh) {
        const q = (r.top + r.height / 2 - vh / 2) / (vh + r.height);
        fascia.style.transform = `translate3d(0, ${(q * -18).toFixed(2)}%, 0)`;
      }
    }

    requestAnimationFrame(aggiorna);
  }
  requestAnimationFrame(aggiorna);

  // la calandra 3D: dopo il caricamento della pagina, mai prima della foto e del titolo
  const host = document.querySelector('[data-calandra]');
  const carica3D = () => {
    if (!host) return;
    const poster = /[?&]poster\b/.test(location.search);
    import('./3d.js')
      .then((m) => m.avvia(host, { poster }))
      .catch((e) => console.warn('Calandra 3D non disponibile, resta l\'immagine:', e));
  };
  if (document.readyState === 'complete') setTimeout(carica3D, 50);
  else addEventListener('load', () => setTimeout(carica3D, 50));
})();
