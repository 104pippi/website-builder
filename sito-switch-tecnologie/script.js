/* SWITCH Tecnologie e Servizi — interazioni */
(() => {
  const html = document.documentElement;
  const riduci = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const desktop = matchMedia('(min-width: 1024px)');

  /* Intro: parte quando il font è pronto, con un timer di sicurezza */
  let avviata = false;
  const avvia = () => { if (avviata) return; avviata = true; html.classList.add('avvio'); };
  if (document.fonts && document.fonts.load) {
    Promise.race([
      document.fonts.load('800 100px Archivo').catch(() => {}),
      new Promise((r) => setTimeout(r, 900))
    ]).then(() => requestAnimationFrame(avvia));
  } else {
    avvia();
  }
  setTimeout(avvia, 1500);

  /* Testata */
  const testata = document.getElementById('testata');
  const menuBtn = testata.querySelector('.testata__menu');
  const menu = document.getElementById('menu-mobile');
  const chiudiMenu = () => {
    menu.hidden = true;
    menuBtn.setAttribute('aria-expanded', 'false');
    menuBtn.querySelector('.testata__menu-testo').textContent = 'Menu';
    document.body.style.overflow = '';
  };
  menuBtn.addEventListener('click', () => {
    const apri = menu.hidden;
    if (!apri) return chiudiMenu();
    menu.hidden = false;
    menuBtn.setAttribute('aria-expanded', 'true');
    menuBtn.querySelector('.testata__menu-testo').textContent = 'Chiudi';
    testata.classList.add('solida');
    document.body.style.overflow = 'hidden';
  });
  menu.addEventListener('click', (e) => { if (e.target.closest('a')) chiudiMenu(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !menu.hidden) chiudiMenu(); });
  desktop.addEventListener('change', () => { if (desktop.matches) chiudiMenu(); });

  /* Reveal */
  const rivela = document.querySelectorAll('[data-rivela]');
  if ('IntersectionObserver' in window && !riduci) {
    const io = new IntersectionObserver((voci) => {
      voci.forEach((v) => { if (v.isIntersecting) { v.target.classList.add('in'); io.unobserve(v.target); } });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    rivela.forEach((el) => io.observe(el));
  } else {
    rivela.forEach((el) => el.classList.add('in'));
  }

  /* Palco: dissolvenze dei testi e passo attivo per la scena 3D */
  const palco = document.querySelector('.palco');
  const heroTesto = document.querySelector('[data-hero]');
  const passi = [...document.querySelectorAll('.passo')];
  const parola = document.querySelector('.nome__parola');
  const nome = document.getElementById('nome');
  const stato = window.__palco = { attivo: -1, regione: 0, progresso: 0 };

  const liscio = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

  function aggiornaPalco() {
    const h = innerHeight;
    const r = palco.getBoundingClientRect();
    const corsa = Math.max(1, r.height - h);
    stato.progresso = Math.min(1, Math.max(0, -r.top / corsa));
    const scorso = -r.top;
    stato.regione = liscio(h * 0.05, h * 0.75, scorso);

    if (heroTesto && !riduci) {
      const o = 1 - liscio(h * 0.12, h * 0.5, scorso);
      heroTesto.style.opacity = o.toFixed(3);
      heroTesto.style.transform = `translate3d(0, ${(-scorso * 0.18).toFixed(1)}px, 0)`;
    }

    const largo = desktop.matches;
    let attivo = scorso > h * 0.35 ? 0 : -1;
    for (const el of passi) {
      const box = (el.querySelector('.strato__pannello, .fiducia__lista, .strati__titolo') || el).getBoundingClientRect();
      let o;
      if (largo) {
        o = liscio(h * 0.98, h * 0.7, box.top) * (1 - liscio(h * 0.32, h * 0.08, box.bottom));
        if (box.top < h * 0.62) attivo = Math.max(attivo, +el.dataset.passo);
      } else {
        o = liscio(h * 1.0, h * 0.8, box.top) * (1 - liscio(h * 0.46, h * 0.34, box.top));
        if (box.top < h * 0.86) attivo = Math.max(attivo, +el.dataset.passo);
      }
      if (!riduci) {
        el.style.opacity = o.toFixed(3);
        el.style.transform = `translate3d(0, ${((1 - o) * 14).toFixed(1)}px, 0)`;
      }
    }
    stato.attivo = attivo;
  }

  function aggiornaNome() {
    if (!parola) return;
    const r = nome.getBoundingClientRect();
    const p = liscio(innerHeight * 0.95, -innerHeight * 0.05, r.top);
    parola.style.setProperty('--p', p.toFixed(4));
  }

  let inCoda = false;
  function giro() {
    inCoda = false;
    testata.classList.toggle('solida', scrollY > 30 || !menu.hidden);
    aggiornaPalco();
    aggiornaNome();
  }
  const chiedi = () => { if (!inCoda) { inCoda = true; requestAnimationFrame(giro); } };
  addEventListener('scroll', chiedi, { passive: true });
  addEventListener('resize', chiedi);
  giro();

  /* Topologia del progetto: pacchetti sui cavi e giro dello snapshot */
  const topo = document.getElementById('topologia');
  if (topo) {
    const ns = 'http://www.w3.org/2000/svg';
    const gruppo = topo.querySelector('#pacchetti');
    const giroSnap = topo.querySelector('#giro-snapshot');
    const cavi = ['cavo-12a', 'cavo-12b', 'cavo-23a', 'cavo-23b'].map((id) => topo.querySelector('#' + id));
    const pacchetti = [];
    cavi.forEach((c, i) => {
      const L = c.getTotalLength();
      const n = i < 2 ? 4 : 3;
      for (let k = 0; k < n; k++) {
        const p = document.createElementNS(ns, 'rect');
        p.setAttribute('width', 9); p.setAttribute('height', 5); p.setAttribute('rx', 1.5);
        p.setAttribute('class', 'topo__pacchetto' + ((k + i) % 3 === 0 ? ' topo__pacchetto--v' : ''));
        gruppo.appendChild(p);
        pacchetti.push({ el: p, c, L, fase: k / n, vel: i < 2 ? 0.42 : 0.3, verso: i % 2 ? -1 : 1 });
      }
    });
    let attiva = false;
    let raf = 0;
    const t0 = performance.now();
    const passo = () => {
      const t = (performance.now() - t0) / 1000;
      for (const p of pacchetti) {
        let u = (p.fase + t * p.vel) % 1;
        if (p.verso < 0) u = 1 - u;
        const a = p.c.getPointAtLength(u * p.L);
        const b = p.c.getPointAtLength(Math.min(p.L, u * p.L + 1));
        const ang = Math.atan2(b.y - a.y, b.x - a.x) * 180 / Math.PI;
        p.el.setAttribute('transform', `translate(${a.x.toFixed(1)} ${a.y.toFixed(1)}) rotate(${ang.toFixed(1)}) translate(-4.5 -2.5)`);
      }
      const g = (t / 4) % 1;
      giroSnap.style.strokeDasharray = `${(g * 100).toFixed(2)} 100`;
      if (attiva) raf = requestAnimationFrame(passo);
    };
    if (riduci) {
      passo();
    } else if ('IntersectionObserver' in window) {
      new IntersectionObserver(([v]) => {
        attiva = v.isIntersecting;
        cancelAnimationFrame(raf);
        if (attiva) raf = requestAnimationFrame(passo);
      }, { rootMargin: '100px' }).observe(topo);
    }
  }

  /* Modulo: compone l'email */
  const modulo = document.getElementById('modulo');
  if (modulo) {
    const errore = document.getElementById('modulo-errore');
    modulo.addEventListener('submit', (e) => {
      e.preventDefault();
      const d = new FormData(modulo);
      const nomeV = (d.get('nome') || '').trim();
      const azienda = (d.get('azienda') || '').trim();
      const email = (d.get('email') || '').trim();
      const tel = (d.get('telefono') || '').trim();
      const temi = d.getAll('temi');
      const msg = (d.get('messaggio') || '').trim();
      const mancanti = [];
      modulo.querySelectorAll('[required]').forEach((i) => i.removeAttribute('aria-invalid'));
      if (!nomeV) mancanti.push('nome');
      if (!azienda) mancanti.push('azienda');
      if (!/^\S+@\S+\.\S+$/.test(email)) mancanti.push('email');
      if (mancanti.length) {
        mancanti.forEach((n) => modulo.elements[n].setAttribute('aria-invalid', 'true'));
        errore.textContent = 'Controlla i campi evidenziati: servono nome, azienda e un indirizzo email valido.';
        errore.hidden = false;
        modulo.elements[mancanti[0]].focus();
        return;
      }
      errore.hidden = true;
      const righe = [
        'Buongiorno,',
        '',
        `vorrei richiedere un'analisi della nostra infrastruttura IT.`,
        temi.length ? `Ci interessa: ${temi.join(', ')}.` : '',
        msg ? `\n${msg}\n` : '',
        `${nomeV}`,
        `${azienda}`,
        email,
        tel ? `Tel. ${tel}` : ''
      ].filter((r, i, a) => r !== '' || (i > 0 && a[i - 1] !== ''));
      const oggetto = `Richiesta di analisi da ${azienda}`;
      const indirizzo = `mailto:info@switch.it?subject=${encodeURIComponent(oggetto)}&body=${encodeURIComponent(righe.join('\n'))}`;
      if (window.__vaiTest) window.__vaiTest(indirizzo); else location.href = indirizzo;
    });
  }

  /* Anno */
  const anno = document.getElementById('anno');
  if (anno) anno.textContent = new Date().getFullYear();

  /* Scena 3D: dopo il caricamento, solo se serve */
  const canvas = document.getElementById('rack-canvas');
  const poster = document.querySelector('.hero__poster');
  const caricaScena = () => {
    const base = 'https://cdn.jsdelivr.net/npm/three@0.186.1/';
    ['build/three.module.min.js', 'build/three.core.min.js', 'examples/jsm/environments/RoomEnvironment.js', 'examples/jsm/geometries/RoundedBoxGeometry.js']
      .forEach((u) => { const l = document.createElement('link'); l.rel = 'modulepreload'; l.href = base + u; l.crossOrigin = 'anonymous'; document.head.appendChild(l); });
    import('./3d.js')
      .then((m) => m.avvia({ canvas, poster, palco, zonaA: document.getElementById('zona-a'), zonaB: document.getElementById('zona-b'), riduci }))
      .catch((err) => console.warn('Scena 3D non disponibile:', err));
  };
  if (canvas) {
    const dopo = () => setTimeout(caricaScena, 120);
    if (document.readyState === 'complete') dopo(); else addEventListener('load', dopo, { once: true });
  }
})();
