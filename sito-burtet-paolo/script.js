/* Burtet Paolo srl — interazioni */
(() => {
  const WA = '393291299844';
  const fermo = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const clamp = (x, a, b) => Math.min(b, Math.max(a, x));

  /* anno nel piede */
  const anno = $('#anno');
  if (anno) anno.textContent = new Date().getFullYear();

  /* menu mobile */
  const menu = $('#menu'), hamburger = $('#hamburger');
  const chiudiMenu = () => {
    menu.classList.remove('aperto');
    hamburger.setAttribute('aria-expanded', 'false');
    hamburger.setAttribute('aria-label', 'Apri il menu');
    document.body.style.overflow = '';
  };
  hamburger.addEventListener('click', () => {
    const apri = !menu.classList.contains('aperto');
    menu.classList.toggle('aperto', apri);
    hamburger.setAttribute('aria-expanded', String(apri));
    hamburger.setAttribute('aria-label', apri ? 'Chiudi il menu' : 'Apri il menu');
    document.body.style.overflow = apri ? 'hidden' : '';
  });
  $$('a', menu).forEach((a) => a.addEventListener('click', chiudiMenu));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && menu.classList.contains('aperto')) { chiudiMenu(); hamburger.focus(); } });

  /* interventi a fisarmonica */
  $$('.voce__testa').forEach((b) => b.addEventListener('click', () => {
    const voce = b.closest('.voce');
    const apri = !voce.classList.contains('aperta');
    voce.classList.toggle('aperta', apri);
    b.setAttribute('aria-expanded', String(apri));
  }));

  /* WhatsApp con il messaggio già scritto per ogni intervento */
  $$('[data-servizio]').forEach((a) => {
    const testo = `Buongiorno, vorrei un preventivo per: ${a.dataset.servizio}. Il lavoro si trova a: `;
    a.href = `https://wa.me/${WA}?text=${encodeURIComponent(testo)}`;
  });

  /* titoli che si aprono quando entrano */
  const daMostrare = $$('.titolo-sezione');
  if (!fermo && 'IntersectionObserver' in window) {
    daMostrare.forEach((el) => el.classList.add('appare'));
    const io = new IntersectionObserver((voci) => voci.forEach((v) => {
      if (v.isIntersecting) { v.target.classList.add('vista'); io.unobserve(v.target); }
    }), { rootMargin: '0px 0px -12% 0px' });
    daMostrare.forEach((el) => io.observe(el));
  }

  /* barra in basso: compare quando i pulsanti dell'hero escono dallo schermo */
  const barra = $('#barra'), azioni = $('.hero__azioni');
  if (barra && azioni && 'IntersectionObserver' in window) {
    new IntersectionObserver(([v]) => barra.classList.toggle('vista', !v.isIntersecting && v.boundingClientRect.top < 0))
      .observe(azioni);
  }

  /* segatura che schizza dalla linea del taglio */
  const taglio = $('.taglio');
  if (taglio && !fermo && taglio.animate) {
    const w = innerWidth;
    for (let i = 0; i < 34; i++) {
      const s = document.createElement('i');
      s.className = 'segatura';
      const x = Math.random() * w;
      const grande = Math.random() < 0.3;
      s.style.left = `${x}px`;
      s.style.width = s.style.height = grande ? '4px' : '2px';
      taglio.appendChild(s);
      const dx = (Math.random() - 0.3) * 60, su = 10 + Math.random() * 46, giu = 40 + Math.random() * 120;
      s.animate([
        { transform: 'translate(0,0)', opacity: 0 },
        { transform: `translate(${dx * 0.4}px, ${-su}px)`, opacity: 1, offset: 0.25 },
        { transform: `translate(${dx}px, ${giu}px)`, opacity: 0 },
      ], { duration: 900 + Math.random() * 900, delay: 300 + (x / w) * 720, easing: 'cubic-bezier(.2,.6,.45,1)', fill: 'both' });
    }
  }

  /* curve di livello, come sulle carte forestali */
  const hash = (x, y, s) => {
    let h = Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(s, 1442695041);
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
  };
  const rumore = (x, y, s) => {
    const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
    const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    const a = hash(xi, yi, s), b = hash(xi + 1, yi, s), c = hash(xi, yi + 1, s), d = hash(xi + 1, yi + 1, s);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  };
  function curve(svg, seme, cimaX, cimaY) {
    const W = 1200, H = 900, nx = 64, ny = 48, sx = W / nx, sy = H / ny;
    const f = (x, y) => {
      const px = x / W, py = y / H;
      const cima = Math.exp(-((px - cimaX) ** 2 * 3.2 + (py - cimaY) ** 2 * 4.2)) * 1.35;
      const cima2 = Math.exp(-((px - cimaX + 0.55) ** 2 * 5 + (py - cimaY - 0.45) ** 2 * 6)) * 0.7;
      return cima + cima2 + rumore(px * 4, py * 4, seme) * 0.42 + rumore(px * 9, py * 9, seme + 7) * 0.14;
    };
    const g = [];
    for (let j = 0; j <= ny; j++) { g[j] = []; for (let i = 0; i <= nx; i++) g[j][i] = f(i * sx, j * sy); }
    const livelli = 22, min = 0.15, max = 1.75;
    let html = '';
    for (let k = 0; k < livelli; k++) {
      const L = min + (k / livelli) * (max - min);
      let d = '';
      for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
        const a = g[j][i], b = g[j][i + 1], c = g[j + 1][i + 1], e = g[j + 1][i];
        const idx = (a > L ? 8 : 0) | (b > L ? 4 : 0) | (c > L ? 2 : 0) | (e > L ? 1 : 0);
        if (idx === 0 || idx === 15) continue;
        const x = i * sx, y = j * sy;
        const T = [x + sx * (L - a) / (b - a), y], Rr = [x + sx, y + sy * (L - b) / (c - b)];
        const B = [x + sx * (L - e) / (c - e), y + sy], Lf = [x, y + sy * (L - a) / (e - a)];
        const seg = {
          1: [Lf, B], 2: [B, Rr], 3: [Lf, Rr], 4: [T, Rr], 5: [Lf, T, B, Rr], 6: [T, B], 7: [Lf, T],
          8: [Lf, T], 9: [T, B], 10: [T, Rr, Lf, B], 11: [T, Rr], 12: [Lf, Rr], 13: [B, Rr], 14: [Lf, B],
        }[idx];
        for (let q = 0; q < seg.length; q += 2) d += `M${seg[q][0].toFixed(1)} ${seg[q][1].toFixed(1)}L${seg[q + 1][0].toFixed(1)} ${seg[q + 1][1].toFixed(1)}`;
      }
      if (d) html += `<path${k % 5 === 0 ? ' class="maestra"' : ''} d="${d}"/>`;
    }
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    svg.innerHTML = html;
  }
  const svgCurve = [['#curve-comelico', 3, 0.72, 0.38], ['#curve-contatti', 11, 0.2, 0.7]];
  const ioCurve = 'IntersectionObserver' in window ? new IntersectionObserver((v) => v.forEach((x) => {
    if (x.isIntersecting) { x.target.classList.add('vista'); ioCurve.unobserve(x.target); }
  }), { rootMargin: '0px 0px -20% 0px' }) : null;
  svgCurve.forEach(([sel, s, cx, cy]) => {
    const svg = $(sel);
    if (!svg) return;
    const fai = () => { curve(svg, s, cx, cy); if (ioCurve) ioCurve.observe(svg); else svg.classList.add('vista'); };
    ('requestIdleCallback' in window) ? requestIdleCallback(fai, { timeout: 1500 }) : setTimeout(fai, 300);
  });

  /* scroll: testata, parallasse dell'hero, testi degli anelli, cartello del cantiere */
  const testata = $('#testata'), fotoHero = $('.hero__foto'), anelli = $('#anelli');
  const passi = $$('#passi-anelli li'), cartello = $('#cartello');
  let passoAttivo = 0, inCoda = false;
  function scorri() {
    inCoda = false;
    const y = scrollY, h = innerHeight;
    testata.classList.toggle('solida', y > 40);
    if (fotoHero && !fermo && y < h * 1.2) fotoHero.style.transform = `translate3d(0, ${(y * 0.32).toFixed(1)}px, 0)`;
    if (anelli && passi.length) {
      const r = anelli.getBoundingClientRect();
      const p = clamp(-r.top / (r.height - h), 0, 1);
      const n = p < 0.3 ? 0 : p < 0.84 ? 1 : 2;
      if (n !== passoAttivo) { passi[passoAttivo].classList.remove('attivo'); passi[n].classList.add('attivo'); passoAttivo = n; }
    }
    if (cartello && !fermo) {
      const r = cartello.getBoundingClientRect();
      const t = clamp((h - r.top) / (h * 0.85), 0, 1);
      const e = 1 - Math.pow(1 - t, 3);
      cartello.style.setProperty('--ry', `${(-24 + 20 * e).toFixed(2)}deg`);
      cartello.style.setProperty('--rx', `${(12 - 9 * e).toFixed(2)}deg`);
    }
  }
  const chiedi = () => { if (!inCoda) { inCoda = true; requestAnimationFrame(scorri); } };
  addEventListener('scroll', chiedi, { passive: true });
  addEventListener('resize', chiedi);
  scorri();

  /* scena 3D degli anelli: si carica dopo la pagina, quando serve */
  const tela = $('#tela-anelli');
  if (anelli && tela) {
    let caricata = false;
    const carica = () => {
      if (caricata) return;
      caricata = true;
      const prova = document.createElement('canvas');
      const gl = prova.getContext('webgl2') || prova.getContext('webgl');
      if (!gl) return; // resta l'immagine ferma
      import('./3d.js')
        .then((m) => m.avvia({ sezione: anelli, tela, segno: $('#segno-anello') }))
        .catch(() => {});
    };
    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver((v) => { if (v.some((x) => x.isIntersecting)) { io.disconnect(); carica(); } }, { rootMargin: '120% 0px' });
      io.observe(anelli);
    }
    addEventListener('load', () => setTimeout(carica, 1500));
  }

  /* modulo: compone il messaggio e apre WhatsApp (o l'email) */
  const modulo = $('#modulo'), errore = $('#errore');
  function leggi() {
    const d = Object.fromEntries(new FormData(modulo));
    const manca = [];
    $$('.campo', modulo).forEach((c) => c.classList.remove('errore'));
    ['tipo', 'luogo', 'nome'].forEach((k) => {
      if (!String(d[k] || '').trim()) { manca.push(k); modulo.elements[k].closest('.campo').classList.add('errore'); }
    });
    if (manca.length) {
      errore.textContent = 'Mancano alcuni dati: scegli il tipo di lavoro e scrivi località e nome.';
      errore.hidden = false;
      modulo.elements[manca[0]].focus();
      return null;
    }
    errore.hidden = true;
    let t = `Buongiorno, sono ${d.nome.trim()}.\nVorrei un preventivo per: ${d.tipo}.\nLocalità: ${d.luogo.trim()}.`;
    if (String(d.descrizione || '').trim()) t += `\nIl lavoro: ${d.descrizione.trim()}`;
    if (String(d.telefono || '').trim()) t += `\nTelefono: ${d.telefono.trim()}`;
    return { testo: t, tipo: d.tipo };
  }
  modulo.addEventListener('submit', (e) => {
    e.preventDefault();
    const m = leggi();
    if (!m) return;
    window.open(`https://wa.me/${WA}?text=${encodeURIComponent(m.testo + '\nVi mando qualche foto qui sotto.')}`, '_blank', 'noopener');
  });
  $('#via-email').addEventListener('click', () => {
    const m = leggi();
    if (!m) return;
    location.href = `mailto:burtet.paolo@gmail.com?subject=${encodeURIComponent('Richiesta di preventivo: ' + m.tipo)}&body=${encodeURIComponent(m.testo)}`;
  });
})();
