(() => {
  const doc = document.documentElement;
  const ridotto = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

  const anno = $('#anno');
  if (anno) anno.textContent = new Date().getFullYear();

  // ---------- titolo: parole che salgono ----------
  const titolo = $('[data-parole]');
  if (titolo && !ridotto) {
    const parole = titolo.textContent.trim().split(/\s+/);
    titolo.setAttribute('aria-label', titolo.textContent.trim());
    titolo.innerHTML = parole
      .map((p, i) => `<span class="parola" aria-hidden="true"><span style="--i:${i}">${p}</span></span>`)
      .join(' ');
  }

  // ---------- intro ----------
  let tAvvio = 0;
  const avvia = () => {
    if (doc.classList.contains('avvio')) return;
    requestAnimationFrame(() => {
      doc.classList.add('avvio');
      tAvvio = performance.now();
    });
  };
  const fotoHero = $$('.hero__quadro img').find((i) => i.offsetParent !== null || getComputedStyle(i.closest('.hero__quadro')).display !== 'none');
  if (fotoHero && !fotoHero.complete) {
    fotoHero.addEventListener('load', avvia, { once: true });
    fotoHero.addEventListener('error', avvia, { once: true });
    setTimeout(avvia, 900);
  } else {
    avvia();
  }

  // ---------- testata, menu, barra ----------
  const testata = $('#testata');
  const burger = $('#burger');
  const menuMobile = $('#menu-mobile');
  const barra = $('.barra');

  const chiudiMenu = () => {
    menuMobile.hidden = true;
    burger.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
  };
  burger.addEventListener('click', () => {
    const apri = menuMobile.hidden;
    menuMobile.hidden = !apri;
    burger.setAttribute('aria-expanded', String(apri));
    document.body.style.overflow = apri ? 'hidden' : '';
    testata.classList.add('testata--solida');
  });
  $$('a', menuMobile).forEach((a) => a.addEventListener('click', chiudiMenu));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !menuMobile.hidden) chiudiMenu(); });

  // ---------- scie di luce nei tubi della foto ----------
  // i tracciati SVG seguono i tubi veri; le scie si disegnano su un canvas sopra la foto
  function sprite(stops) {
    const c = document.createElement('canvas');
    c.width = c.height = 128;
    const g = c.getContext('2d');
    const r = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    stops.forEach(([o, col]) => r.addColorStop(o, col));
    g.fillStyle = r;
    g.fillRect(0, 0, 128, 128);
    return c;
  }
  const SCIA = {
    caldo: sprite([[0, 'rgba(255,244,232,1)'], [0.16, 'rgba(255,176,120,.9)'], [0.42, 'rgba(255,112,52,.36)'], [1, 'rgba(255,90,30,0)']]),
    freddo: sprite([[0, 'rgba(238,250,255,1)'], [0.16, 'rgba(130,210,255,.9)'], [0.42, 'rgba(48,150,255,.36)'], [1, 'rgba(40,120,255,0)']]),
  };
  const BASE = { caldo: 'rgba(255,140,80,.075)', freddo: 'rgba(110,190,255,.08)' };

  const luci = $$('.hero__luci').map((cv) => {
    const per = cv.dataset.per;
    const svg = $(`.hero__quadro--${per}:not(canvas) [data-flusso]`);
    return { cv, ctx: cv.getContext('2d'), per, svg, vb: svg.viewBox.baseVal, tubi: null, vel: per === 'orizzontale' ? 820 : 640, visibile: false };
  });

  function preparaLuce(l) {
    l.visibile = getComputedStyle(l.cv).display !== 'none';
    if (!l.visibile) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 1.25);
    l.cv.width = Math.round(l.cv.clientWidth * dpr);
    l.cv.height = Math.round(l.cv.clientHeight * dpr);
    if (!l.tubi) creaTubi(l);
    // l'alone fisso dei tubi si disegna una volta sola, poi si copia
    l.base = document.createElement('canvas');
    l.base.width = l.cv.width;
    l.base.height = l.cv.height;
    const g = l.base.getContext('2d');
    const s = l.cv.width / l.vb.width;
    g.setTransform(s, 0, 0, s, 0, 0);
    g.lineCap = 'round';
    g.lineWidth = l.per === 'orizzontale' ? 34 : 30;
    for (const tb of l.tubi) {
      g.strokeStyle = BASE[tb.c];
      g.stroke(tb.forma);
    }
  }
  function creaTubi(l) {
    l.tubi = $$('path[data-tubo]', l.svg).map((p, i) => {
      const L = p.getTotalLength();
      const passo = 5;
      const n = Math.ceil(L / passo);
      const pts = new Float32Array((n + 1) * 2);
      for (let k = 0; k <= n; k++) {
        const q = p.getPointAtLength(Math.min(L, k * passo));
        pts[k * 2] = q.x;
        pts[k * 2 + 1] = q.y;
      }
      return {
        L, pts, passo, n, c: p.dataset.tubo,
        forma: new Path2D(p.getAttribute('d')),
        giro: L * 0.52 + 260 + ((i * 3) % 4) * 130,
        ritardo: [0, 150, 300, 80, 230, 380][i % 6],
      };
    });
  }
  const preparaTutte = () => luci.forEach(preparaLuce);
  preparaTutte();
  new ResizeObserver(preparaTutte).observe(document.querySelector('.hero'));

  function misura(l, y) {
    // i tubi in primo piano sono più grossi di quelli in fondo
    return l.per === 'orizzontale' ? 86 : 20 + y * 0.068;
  }

  function aggiornaFlussi(ora) {
    if (!tAvvio || ridotto) return;
    const t0 = tAvvio + 850;
    for (const l of luci) {
      if (!l.visibile || !l.tubi) continue;
      const { ctx, cv } = l;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, cv.width, cv.height);
      const s = cv.width / l.vb.width;
      ctx.setTransform(s, 0, 0, s, 0, 0);
      ctx.globalCompositeOperation = 'lighter';
      // dopo il primo passaggio i tubi restano appena accesi
      const acceso = clamp(((ora - t0) / 1000 * l.vel - 700) / 900);
      if (acceso > 0) {
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.globalAlpha = acceso;
        ctx.drawImage(l.base, 0, 0);
        ctx.setTransform(s, 0, 0, s, 0, 0);
      }
      for (const tb of l.tubi) {
        const t = (ora - t0 - tb.ritardo) / 1000;
        if (t < 0) continue;
        const percorsi = t * l.vel;
        const K = 22, coda = l.per === 'orizzontale' ? 420 : 360;
        // più scie per tubo, una dietro l'altra; la prima parte con l'intro
        for (let testa = percorsi % tb.giro; testa <= Math.min(percorsi, tb.L + coda); testa += tb.giro) {
          for (let k = K; k >= 0; k--) {
            const d = testa - k * (coda / K);
            if (d < 0 || d > tb.L) continue;
            const idx = Math.min(tb.n, Math.round(d / tb.passo));
            const x = tb.pts[idx * 2], y = tb.pts[idx * 2 + 1];
            const f = 1 - k / K;
            const dim = misura(l, y) * (0.62 + 0.38 * f);
            ctx.globalAlpha = Math.pow(f, 1.7) * 0.95;
            ctx.drawImage(SCIA[tb.c], x - dim / 2, y - dim / 2, dim, dim);
          }
        }
      }
      ctx.globalAlpha = 1;
    }
  }

  // ---------- impianti: pista sticky ----------
  const pista = $('#pista');
  const palco = $('#palco');
  const passi = $$('.passo');
  const avanzamento = $('#avanzamento');
  const coloriPasso = ['#FF8A4C', '#5CD6FF', '#9ED8FF', '#5FE0B0', '#FFFFFF'];
  window.__pista = { p: 0, passo: 0 };
  let passoAttivo = -1;

  function aggiornaPista(vh) {
    const r = pista.getBoundingClientRect();
    const p = clamp(-r.top / Math.max(1, r.height - vh));
    const n = p < 0.26 ? 0 : p < 0.46 ? 1 : p < 0.66 ? 2 : p < 0.85 ? 3 : 4;
    window.__pista.p = p;
    window.__pista.passo = n;
    if (n !== passoAttivo) {
      passi.forEach((el, i) => el.classList.toggle('attivo', i === n));
      avanzamento.style.setProperty('--c', coloriPasso[n]);
      passoAttivo = n;
    }
    avanzamento.style.setProperty('--p', p.toFixed(4));
  }

  // il 3D arriva solo quando la sezione si avvicina
  let caricato = false;
  const caricaScena = () => {
    if (caricato) return;
    caricato = true;
    const canvas = $('#casa');
    const prova = document.createElement('canvas');
    const gl = prova.getContext('webgl2') || prova.getContext('webgl');
    if (!gl) return;
    import('./3d.js')
      .then((m) => m.avvia({ canvas, pista, palco }))
      .catch((e) => console.warn('Scena 3D non disponibile:', e));
  };
  new IntersectionObserver((voci) => {
    if (voci.some((v) => v.isIntersecting)) caricaScena();
  }, { rootMargin: '150% 0px' }).observe(pista);

  // ---------- galleria: le foto si posano ----------
  const foto = $$('.foto');
  const tappe = $('[data-tappe]');
  const tappeVoci = $$('.tappa');

  function aggiornaGalleria(vh) {
    for (const f of foto) {
      const r = f.getBoundingClientRect();
      if (r.top > vh + 80 || r.bottom < -80) continue;
      const t = clamp((vh - r.top) / (vh * 0.42));
      const e = 1 - Math.pow(1 - t, 3);
      f.style.setProperty('--t', e.toFixed(3));
    }
  }

  function aggiornaTappe(vh) {
    const r = tappe.getBoundingClientRect();
    if (r.top > vh || r.bottom < 0) return;
    const fine = vh * 0.62;
    const riempi = clamp((fine - r.top) / r.height);
    tappe.style.setProperty('--riempi', riempi.toFixed(4));
    const livello = r.top + riempi * r.height;
    tappeVoci.forEach((t) => {
      const n = t.querySelector('.tappa__n').getBoundingClientRect();
      t.classList.toggle('piena', livello >= n.top + n.height / 2);
    });
  }

  // ---------- ciclo unico ----------
  const hero = $('.hero');
  const heroFoto = $('.hero__foto');
  const heroTesto = $('.hero__testo');
  let heroVisibile = true;
  new IntersectionObserver(([e]) => { heroVisibile = e.isIntersecting; }).observe(hero);

  let ultimoY = -1, ultimaH = -1;
  function ciclo(ora) {
    const y = window.scrollY;
    const vh = window.innerHeight;
    if (heroVisibile) aggiornaFlussi(ora);
    if (tAvvio && !barra.classList.contains('barra--su') && ora - tAvvio > 1900) barra.classList.add('barra--su');
    if (y !== ultimoY || vh !== ultimaH) {
      testata.classList.toggle('testata--solida', y > 30 || !menuMobile.hidden);
      barra.classList.toggle('barra--su', y > vh * 0.55 || (tAvvio && ora - tAvvio > 1900));
      if (heroVisibile && !ridotto) {
        heroFoto.style.transform = `translate3d(0, ${(y * 0.28).toFixed(1)}px, 0)`;
        heroTesto.style.transform = `translate3d(0, ${(y * -0.1).toFixed(1)}px, 0)`;
        heroTesto.style.opacity = String(clamp(1 - y / (vh * 0.75)));
      }
      aggiornaPista(vh);
      if (!ridotto) aggiornaGalleria(vh);
      aggiornaTappe(vh);
      ultimoY = y;
      ultimaH = vh;
    }
    requestAnimationFrame(ciclo);
  }
  requestAnimationFrame(ciclo);

  // ---------- modulo → WhatsApp ----------
  const modulo = $('#modulo');
  const errore = $('#modulo-errore');
  modulo.addEventListener('submit', (e) => {
    e.preventDefault();
    const dati = new FormData(modulo);
    const nome = String(dati.get('nome') || '').trim();
    const campoNome = $('#f-nome').closest('.campo');
    if (!nome) {
      errore.hidden = false;
      campoNome.classList.add('campo--invalido');
      $('#f-nome').focus();
      return;
    }
    errore.hidden = true;
    campoNome.classList.remove('campo--invalido');
    const comune = String(dati.get('comune') || '').trim();
    const tipo = String(dati.get('tipo') || '');
    const messaggio = String(dati.get('messaggio') || '').trim();
    const righe = [
      `Buongiorno, sono ${nome}.`,
      `Vorrei un sopralluogo per: ${tipo.toLowerCase()}.`,
      comune ? `Comune del lavoro: ${comune}.` : '',
      messaggio ? `Il lavoro in breve: ${messaggio}` : '',
    ].filter(Boolean);
    const url = `https://wa.me/393357570707?text=${encodeURIComponent(righe.join('\n'))}`;
    window.open(url, '_blank', 'noopener');
  });
})();
