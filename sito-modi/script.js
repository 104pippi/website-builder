(() => {
  'use strict';
  const RIDOTTO = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const ora = () => performance.now() / 1000;
  const lim = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const migliaia = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.');

  /* ---------- Menu mobile ---------- */
  const btnMenu = document.querySelector('.hamburger');
  const menuMobile = document.getElementById('menu-mobile');
  const chiudiMenu = () => {
    btnMenu.setAttribute('aria-expanded', 'false');
    btnMenu.setAttribute('aria-label', 'Apri il menu');
    menuMobile.hidden = true;
    document.body.style.overflow = '';
  };
  btnMenu.addEventListener('click', () => {
    if (btnMenu.getAttribute('aria-expanded') === 'true') return chiudiMenu();
    btnMenu.setAttribute('aria-expanded', 'true');
    btnMenu.setAttribute('aria-label', 'Chiudi il menu');
    menuMobile.hidden = false;
    document.body.style.overflow = 'hidden';
  });
  menuMobile.addEventListener('click', (e) => { if (e.target.closest('a')) chiudiMenu(); });
  addEventListener('keydown', (e) => { if (e.key === 'Escape' && !menuMobile.hidden) { chiudiMenu(); btnMenu.focus(); } });
  matchMedia('(min-width: 960px)').addEventListener('change', (e) => { if (e.matches) chiudiMenu(); });

  /* ---------- Testata, linea dei passi ---------- */
  const testata = document.getElementById('testata');
  const passi = document.querySelector('.passi');
  const voci = passi ? [...passi.querySelectorAll('.passo')] : [];
  let inCoda = false;
  const suScroll = () => {
    inCoda = false;
    testata.classList.toggle('staccata', scrollY > 8);
    if (!passi) return;
    const r = passi.getBoundingClientRect();
    const p = RIDOTTO ? 1 : lim((innerHeight * 0.62 - r.top) / r.height);
    passi.style.setProperty('--p', p.toFixed(4));
    const fin = r.top + p * r.height + 12;
    voci.forEach((v) => v.classList.toggle('fatto', v.getBoundingClientRect().top <= fin));
  };
  addEventListener('scroll', () => { if (!inCoda) { inCoda = true; requestAnimationFrame(suScroll); } }, { passive: true });
  addEventListener('resize', suScroll);
  suScroll();

  /* ---------- Rivela foto e mappa, contatore ---------- */
  const conta = (el) => {
    const fine = +el.dataset.conta, t0 = ora(), dur = 1.6;
    const passo = () => {
      const p = lim((ora() - t0) / dur), e = 1 - Math.pow(1 - p, 3);
      el.textContent = migliaia(Math.round(fine * e));
      if (p < 1) requestAnimationFrame(passo);
    };
    passo();
  };
  const daRivelare = [...document.querySelectorAll('[data-rivela]')];
  const contatori = [...document.querySelectorAll('[data-conta]')];
  if ('IntersectionObserver' in window && !RIDOTTO) {
    const io = new IntersectionObserver((voci) => {
      voci.forEach((v) => {
        if (!v.isIntersecting) return;
        io.unobserve(v.target);
        if (v.target.dataset.conta) conta(v.target); else v.target.classList.add('in');
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -6% 0px' });
    daRivelare.forEach((el) => io.observe(el));
    contatori.forEach((el) => { el.textContent = '0'; io.observe(el); });
  } else {
    daRivelare.forEach((el) => el.classList.add('in'));
  }

  /* ---------- Modulo preventivo: prepara l'email ---------- */
  const modulo = document.getElementById('modulo');
  const errore = document.getElementById('modulo-errore');
  const sceltaProdotto = document.getElementById('f-prodotto');
  document.querySelectorAll('[data-prodotto]').forEach((a) => a.addEventListener('click', () => { sceltaProdotto.value = a.dataset.prodotto; }));
  modulo.addEventListener('submit', (e) => {
    e.preventDefault();
    const obbligatori = [...modulo.querySelectorAll('[required]')];
    const mancanti = obbligatori.filter((c) => {
      const ok = c.value.trim() !== '' && (c.type !== 'email' || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c.value.trim()));
      c.setAttribute('aria-invalid', String(!ok));
      return !ok;
    });
    if (mancanti.length) {
      const nomi = mancanti.map((c) => modulo.querySelector(`label[for="${c.id}"]`).textContent.toLowerCase());
      errore.textContent = `Da completare: ${nomi.join(', ')}.`;
      errore.hidden = false;
      mancanti[0].focus();
      return;
    }
    errore.hidden = true;
    const d = new FormData(modulo);
    const righe = [
      `Nome: ${d.get('nome')}`,
      d.get('azienda') && `Azienda: ${d.get('azienda')}`,
      `Email: ${d.get('email')}`,
      d.get('telefono') && `Telefono: ${d.get('telefono')}`,
      `Richiesta: ${d.get('prodotto')}`,
      d.get('quantita') && `Quantità: ${d.get('quantita')}`,
      '',
      d.get('messaggio'),
      '',
      'Allego il disegno.',
    ].filter((r) => typeof r === 'string');
    location.href = `mailto:modi@modi-srl.it?subject=${encodeURIComponent('Richiesta di preventivo: ' + d.get('prodotto'))}&body=${encodeURIComponent(righe.join('\n'))}`;
  });
  modulo.addEventListener('input', (e) => { if (e.target.getAttribute('aria-invalid') === 'true' && e.target.value.trim()) e.target.setAttribute('aria-invalid', 'false'); });

  document.getElementById('anno').textContent = new Date().getFullYear();

  /* ---------- Fusto 3D ---------- */
  const tela = document.getElementById('fusto');
  if (tela && tela.getContext) fusto(tela);

  function fusto(cv) {
    const ctx = cv.getContext('2d');
    const hint = cv.parentElement.querySelector('.tavola__hint');
    const bottoni = [...document.querySelectorAll('[data-modello]')];
    const rnd = mulberry(23);
    const TX = texture(rnd);
    const PAT = {};
    for (const k in TX) PAT[k] = ctx.createPattern(TX[k], 'repeat');
    const LUCE = norm([-0.45, 0.8, 0.42]);
    const EPS = 0.01;

    /* modelli: scatole in cm, in ordine di montaggio */
    const B = (x0, x1, y0, y1, z0, z1, m, et) => ({ mn: [x0, y0, z0], mx: [x1, y1, z1], m, et: et || null });
    const piedi = (P, xz, h, s = 9) => xz.forEach(([x, z]) => P.push(B(x, x + s, 0, h, z, z + s, 'abete')));
    const traversi = (a, b) => { const n = Math.max(1, Math.round((b - a) / 66)), r = []; for (let i = 1; i < n; i++) r.push(a + (b - a) * i / n); return r; };
    const ET = { multi: 'Multistrato a 7–9 strati', truc: 'Truciolare di prima scelta', abete: 'Abete ben essiccato' };
    function schienale(P, a, b, xs, y0, y1, z0) {
      const cima = y1 - 6, pali = [[a, a + 4], ...xs.map((x) => [x - 2, x + 2]), [b - 4, b]];
      pali.forEach(([p0, p1]) => P.push(B(p0, p1, y0, cima, z0, z0 + 5, 'abete')));
      const ym = (y0 + cima) / 2;
      for (let i = 0; i < pali.length - 1; i++) P.push(B(pali[i][1], pali[i + 1][0], ym - 2, ym + 2, z0 + 0.5, z0 + 4.5, 'abete'));
      P.push(B(a, b, cima, y1, z0, z0 + 5, 'abete', ET.abete));
    }
    function divano(W) {
      const D = 92, h = W / 2, z0 = -D / 2, z1 = D / 2, t = 2.5, f = 8, sh = 38, ah = 64, bh = 86, a = -h + t, b = h - t, P = [];
      piedi(P, [[-h, z0], [h - 9, z0], [-h, z1 - 9], [h - 9, z1 - 9]], f);
      if (W > 150) piedi(P, [[-4.5, z0], [-4.5, z1 - 9]], f);
      P.push(B(a, b, f, sh, z0, z0 + t, 'truc'));
      P.push(B(a, b, f, sh, z1 - t, z1, 'truc', ET.truc));
      const xs = traversi(a, b);
      P.push(B(a, a + 4, sh - 8, sh, z0 + t, z1 - t, 'abete'));
      xs.forEach((x) => P.push(B(x - 2, x + 2, sh - 8, sh, z0 + t, z1 - t, 'abete')));
      P.push(B(b - 4, b, sh - 8, sh, z0 + t, z1 - t, 'abete'));
      P.push(B(-h, a, f, ah, z0, z1, 'multi', ET.multi));
      P.push(B(b, h, f, ah, z0, z1, 'multi'));
      P.push(B(-h, -h + 11, ah, ah + 5, z0 + 5, z1, 'abete'));
      P.push(B(h - 11, h, ah, ah + 5, z0 + 5, z1, 'abete'));
      schienale(P, a, b, xs, sh, bh, z0);
      return P;
    }
    function penisola() {
      const W = 252, D = 92, h = W / 2, z0 = -D / 2, z1 = D / 2, E = 74, ze = z1 + E, t = 2.5, f = 8, sh = 38, ah = 64, bh = 86;
      const a = -h + t, xp = h - 88, P = [];
      piedi(P, [[-h, z0], [-h, z1 - 9], [h - 9, z0], [h - 9, ze - 9], [xp, ze - 9]], f);
      P.push(B(a, h - t, f, sh, z0, z0 + t, 'truc'));
      P.push(B(a, xp, f, sh, z1 - t, z1, 'truc', ET.truc));
      P.push(B(xp, xp + t, f, sh, z1 - t, ze - t, 'truc'));
      P.push(B(xp, h - t, f, sh, ze - t, ze, 'truc'));
      P.push(B(h - t, h, f, sh, z0, ze, 'truc'));
      const xs = traversi(a, xp), xm = (xp + h) / 2;
      P.push(B(a, a + 4, sh - 8, sh, z0 + t, z1 - t, 'abete'));
      xs.forEach((x) => P.push(B(x - 2, x + 2, sh - 8, sh, z0 + t, z1 - t, 'abete')));
      P.push(B(xp + t, xp + t + 4, sh - 8, sh, z0 + t, ze - t, 'abete'));
      P.push(B(xm - 2, xm + 2, sh - 8, sh, z0 + t, ze - t, 'abete'));
      P.push(B(h - t - 4, h - t, sh - 8, sh, z0 + t, ze - t, 'abete'));
      P.push(B(-h, a, f, ah, z0, z1, 'multi', ET.multi));
      P.push(B(-h, -h + 11, ah, ah + 5, z0 + 5, z1, 'abete'));
      schienale(P, a, h, [...xs, xp + t + 2, xm], sh, bh, z0);
      return P;
    }
    function pouf() {
      const s = 36, t = 2.5, f = 8, ht = 40, P = [];
      piedi(P, [[-s, -s], [s - 9, -s], [-s, s - 9], [s - 9, s - 9]], f);
      P.push(B(-s, s, f, ht, -s, -s + t, 'truc'));
      P.push(B(-s, -s + t, f, ht, -s + t, s - t, 'truc'));
      P.push(B(s - t, s, f, ht, -s + t, s - t, 'truc'));
      P.push(B(-s, s, f, ht, s - t, s, 'truc', ET.truc));
      P.push(B(-s + t, s - t, ht - 8, ht, -2, 2, 'abete'));
      P.push(B(-2, 2, ht - 8, ht, -s + t, -2, 'abete'));
      P.push(B(-2, 2, ht - 8, ht, 2, s - t, 'abete'));
      P.push(B(-s, s, ht, ht + 2.5, -s, s, 'multi', ET.multi));
      return P;
    }
    function letto() {
      const w = 82, L = 104, t = 2.5, f = 10, hs = 34, P = [];
      piedi(P, [[-w, -L], [w - 8, -L], [-w, L - 8], [w - 8, L - 8], [-4, -4]], f, 8);
      P.push(B(-w, w, f, 116, -L - 4, -L, 'multi', ET.multi));
      P.push(B(-w + t, w - t, 62, 66, -L, -L + 3, 'abete'));
      P.push(B(-w + t, w - t, 94, 98, -L, -L + 3, 'abete'));
      P.push(B(-w, -w + t, f, hs, -L, L, 'truc', ET.truc));
      P.push(B(w - t, w, f, hs, -L, L, 'truc'));
      P.push(B(-w + t, w - t, f, hs, L - t, L, 'truc'));
      P.push(B(-3, 3, f, 26, -L, L - t, 'abete'));
      P.push(B(-w + t, -w + t + 4, 22, 26, -L, L - t, 'abete', 'Listelli in abete'));
      P.push(B(w - t - 4, w - t, 22, 26, -L, L - t, 'abete'));
      return P;
    }
    const MODELLI = { divano: () => divano(214), poltrona: () => divano(94), penisola, pouf, letto };

    /* stato */
    let W = 0, H = 0, DPR = 1;
    let parti = [], traccia = null, quota = null;
    let boxDa = null, boxA = null, boxT0 = 0;
    let yawIntro = 0, introT0 = -1e3, fineMontaggio = -1e3, fineTutto = -1e3;
    let yawUtente = 0, pitchUtente = 0, vel = 0, trascinando = false, px = 0, py = 0;
    let scrollYaw = 0, scrollYawMeta = 0;
    let raf = 0, visibile = true, partito = false, hintFatto = false, modello = 'divano';

    function scatolaModello(P) {
      const mn = [1e9, 1e9, 1e9], mx = [-1e9, -1e9, -1e9];
      P.forEach((p) => { for (let k = 0; k < 3; k++) { mn[k] = Math.min(mn[k], p.mn[k]); mx[k] = Math.max(mx[k], p.mx[k]); } });
      return { mn, mx };
    }

    function imposta(nome, primo) {
      const t = ora(), P = MODELLI[nome]();
      modello = nome;
      parti.forEach((p) => { if (!p.out) { p.out = true; p.t0 = t; } });
      const ritardo = primo ? 0.75 : 0.32, passo = Math.min(primo ? 0.05 : 0.035, (primo ? 1.25 : 0.8) / P.length), dur = primo ? 0.62 : 0.5;
      const salto = primo ? RIDOTTO ? -1e3 : 0 : 0;
      P.forEach((p, i) => parti.push({ ...p, t0: t + salto + ritardo + i * passo, dur, out: false, seme: rnd() }));
      traccia = { P, t0: t + salto, passo: primo ? 0.014 : 0.006, dur: primo ? 0.55 : 0.4 };
      const box = scatolaModello(P);
      boxDa = boxA ? boxCorrente(t) : box;
      boxA = box; boxT0 = t;
      quota = { box };
      fineMontaggio = t + salto + ritardo + P.length * passo + dur;
      fineTutto = Math.max(fineMontaggio + 0.7, t + 2.6);
      if (primo && !RIDOTTO) { introT0 = t; yawIntro = -0.6; }
      kick();
    }

    function boxCorrente(t) {
      const e = facile(lim((t - boxT0) / 0.7));
      const mix = (a, b) => a.map((v, k) => v + (b[k] - v) * e);
      return { mn: mix(boxDa.mn, boxA.mn), mx: mix(boxDa.mx, boxA.mx) };
    }

    /* vista */
    function vista(t) {
      const intro = introT0 > 0 ? yawIntro * (1 - facile(lim((t - introT0) / 2.6))) : 0;
      const th = 0.6 + yawUtente + scrollYaw + intro;
      const ph = lim(0.4 + pitchUtente, 0.12, 0.86);
      const cy = Math.cos(th), sy = Math.sin(th), cp = Math.cos(ph), sp = Math.sin(ph);
      return { cy, sy, cp, sp, d: [-cp * sy, sp, cp * cy] };
    }
    function adatta(V, box) {
      // estensione massima su tutte le rotazioni: la scala non cambia mentre il fusto gira
      const c = [(box.mn[0] + box.mx[0]) / 2, (box.mn[1] + box.mx[1]) / 2, (box.mn[2] + box.mx[2]) / 2];
      const hx = (box.mx[0] - box.mn[0]) / 2, hy = (box.mx[1] - box.mn[1]) / 2, hz = (box.mx[2] - box.mn[2]) / 2 + 12;
      const r = Math.hypot(hx, hz);
      let ex = r, ey = hy * V.cp + r * V.sp;
      ex = Math.max(ex, 98); ey = Math.max(ey, 64);
      const s = Math.min((W / 2 - W * 0.07) / ex, (H / 2 - H * 0.12) / ey);
      return { s, c, oy: H * 0.02 };
    }
    function proietta(p, V, F) {
      const x = p[0] - F.c[0], y = p[1] - F.c[1], z = p[2] - F.c[2];
      const x1 = x * V.cy + z * V.sy, z1 = -x * V.sy + z * V.cy;
      const y2 = y * V.cp - z1 * V.sp, z2 = y * V.sp + z1 * V.cp;
      return [W / 2 + x1 * F.s, H / 2 - y2 * F.s + F.oy, z2];
    }
    function ruota(n, V) {
      const x1 = n[0] * V.cy + n[2] * V.sy, z1 = -n[0] * V.sy + n[2] * V.cy;
      return [x1, n[1] * V.cp - z1 * V.sp, n[1] * V.sp + z1 * V.cp];
    }

    /* ordine di disegno: per scatole allineate che non si compenetrano c'è sempre un asse che le separa */
    function ordina(L, V) {
      const n = L.length, entra = new Array(n).fill(0), dopo = L.map(() => []);
      for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
        const a = L[i], b = L[j];
        if (a.r[2] <= b.r[0] || b.r[2] <= a.r[0] || a.r[3] <= b.r[1] || b.r[3] <= a.r[1]) continue;
        let migliore = 0, prima = 0;
        for (let k = 0; k < 3; k++) {
          const dk = V.d[k], ad = Math.abs(dk);
          if (ad < 1e-4 || ad <= migliore) continue;
          if (a.mx[k] <= b.mn[k] + EPS) { migliore = ad; prima = dk > 0 ? 1 : -1; }
          else if (b.mx[k] <= a.mn[k] + EPS) { migliore = ad; prima = dk > 0 ? -1 : 1; }
        }
        if (!prima) prima = a.dep < b.dep ? 1 : -1;
        if (prima > 0) { dopo[i].push(j); entra[j]++; } else { dopo[j].push(i); entra[i]++; }
      }
      const fatto = new Array(n).fill(false), out = [];
      for (let c = 0; c < n; c++) {
        let scelto = -1;
        for (let i = 0; i < n; i++) if (!fatto[i] && entra[i] === 0 && (scelto < 0 || L[i].dep < L[scelto].dep)) scelto = i;
        if (scelto < 0) for (let i = 0; i < n; i++) if (!fatto[i] && (scelto < 0 || L[i].dep < L[scelto].dep)) scelto = i;
        fatto[scelto] = true; out.push(L[scelto]);
        dopo[scelto].forEach((j) => entra[j]--);
      }
      return out;
    }

    function angoli(mn, mx, V, F) {
      const c = [];
      for (let i = 0; i < 8; i++) c.push(proietta([i & 1 ? mx[0] : mn[0], i & 2 ? mx[1] : mn[1], i & 4 ? mx[2] : mn[2]], V, F));
      return c;
    }

    function faccia(p, c, k, lato, V) {
      const i = (k + 1) % 3, j = (k + 2) % 3;
      const dim = [p.mx[0] - p.mn[0], p.mx[1] - p.mn[1], p.mx[2] - p.mn[2]];
      let u = dim[i] >= dim[j] ? i : j, v = u === i ? j : i, tex = 'truc', wu = 30, wv = 30, oy = true;
      if (p.m === 'abete') {
        const lungo = dim.indexOf(Math.max(...dim));
        if (lungo === k) { tex = 'testa'; wu = 12; wv = 12; }
        else { u = lungo; v = u === i ? j : i; tex = 'abete'; wu = 90; wv = 45; }
      } else if (p.m === 'multi') {
        const sottile = dim.indexOf(Math.min(...dim));
        if (sottile === k) { tex = 'multi'; wu = 100; wv = 50; }
        else { v = sottile; u = v === i ? j : i; tex = 'ply'; wu = 60; wv = dim[v]; oy = false; }
      }
      const bit = (ax) => 1 << ax, base = lato ? bit(k) : 0;
      const P0 = c[base], Pu = c[base | bit(u)], Pv = c[base | bit(v)], Puv = c[base | bit(u) | bit(v)];
      const T = TX[tex], sU = T.width * dim[u] / wu, sV = T.height * dim[v] / wv;
      const ax = Pu[0] - P0[0], ay = Pu[1] - P0[1], bx = Pv[0] - P0[0], by = Pv[1] - P0[1];
      if (Math.abs(ax * by - ay * bx) < 0.5) return;
      const ox = p.seme * T.width * 3, oyv = oy ? p.seme * T.height * 5 : 0;
      ctx.setTransform(ax / sU, ay / sU, bx / sV, by / sV, P0[0], P0[1]);
      ctx.translate(-ox, -oyv);
      ctx.fillStyle = PAT[tex];
      ctx.fillRect(ox, oyv, sU, sV);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      const n = [0, 0, 0]; n[k] = lato ? 1 : -1;
      const nv = ruota(n, V), l = Math.max(0, nv[0] * LUCE[0] + nv[1] * LUCE[1] + nv[2] * LUCE[2]);
      ctx.beginPath(); ctx.moveTo(P0[0], P0[1]); ctx.lineTo(Pu[0], Pu[1]); ctx.lineTo(Puv[0], Puv[1]); ctx.lineTo(Pv[0], Pv[1]); ctx.closePath();
      ctx.fillStyle = `rgba(46,30,14,${((1 - l) * 0.42).toFixed(3)})`;
      ctx.fill();
      ctx.strokeStyle = 'rgba(42,45,49,.62)';
      ctx.lineWidth = DPR * 0.9;
      ctx.stroke();
    }

    const SPIGOLI = [[0, 1], [2, 3], [4, 5], [6, 7], [0, 2], [1, 3], [4, 6], [5, 7], [0, 4], [1, 5], [2, 6], [3, 7]];

    function disegna(t) {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, W, H);
      if (!boxA) return;
      const V = vista(t), box = boxCorrente(t), F = adatta(V, box);

      // ombra a terra
      const montato = lim((t - (fineMontaggio - 0.8)) / 0.8);
      const terra = [0, 1, 4, 5].map((i) => proietta([i & 1 ? box.mx[0] : box.mn[0], 0, i & 4 ? box.mx[2] : box.mn[2]], V, F));
      const tx0 = Math.min(...terra.map((q) => q[0])), tx1 = Math.max(...terra.map((q) => q[0]));
      const ty0 = Math.min(...terra.map((q) => q[1])), ty1 = Math.max(...terra.map((q) => q[1]));
      const rx = (tx1 - tx0) * 0.6, ry = Math.max(8, (ty1 - ty0) * 0.62);
      ctx.save();
      ctx.translate((tx0 + tx1) / 2, (ty0 + ty1) / 2); ctx.scale(1, ry / rx);
      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, rx);
      g.addColorStop(0, `rgba(42,45,49,${(0.2 * montato).toFixed(3)})`); g.addColorStop(1, 'rgba(42,45,49,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, rx, 0, 6.2832); ctx.fill();
      ctx.restore();

      // tracciato a filo (il disegno tecnico)
      if (traccia) {
        ctx.strokeStyle = 'rgba(42,45,49,.34)'; ctx.lineWidth = DPR; ctx.beginPath();
        traccia.P.forEach((p, n) => {
          const q = lim((t - traccia.t0 - n * traccia.passo) / traccia.dur);
          if (q <= 0) return;
          const c = angoli(p.mn, p.mx, V, F), e = facile(q);
          SPIGOLI.forEach(([a, b]) => { ctx.moveTo(c[a][0], c[a][1]); ctx.lineTo(c[a][0] + (c[b][0] - c[a][0]) * e, c[a][1] + (c[b][1] - c[a][1]) * e); });
        });
        ctx.stroke();
      }

      // quota "su misura"
      if (quota) disegnaQuota(t, V, F);

      // pezzi
      const lista = [];
      parti = parti.filter((p) => !(p.out && t - p.t0 > 0.4));
      for (const p of parti) {
        let dy = 0, alfa = 1;
        if (p.out) { const q = lim((t - p.t0) / 0.38); dy = 46 * q * q; alfa = 1 - q; }
        else { const q = lim((t - p.t0) / p.dur); if (q <= 0) continue; const e = 1 - Math.pow(1 - q, 3); dy = 60 * (1 - e); alfa = lim(q * 3); }
        if (alfa <= 0) continue;
        const mn = [p.mn[0], p.mn[1] + dy, p.mn[2]], mx = [p.mx[0], p.mx[1] + dy, p.mx[2]];
        const c = angoli(mn, mx, V, F);
        const xs = c.map((q) => q[0]), ys = c.map((q) => q[1]);
        const cc = proietta([(mn[0] + mx[0]) / 2, (mn[1] + mx[1]) / 2, (mn[2] + mx[2]) / 2], V, F);
        lista.push({ p, mn, mx, c, alfa, r: [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)], dep: cc[2], cc });
      }
      for (const o of ordina(lista, V)) {
        ctx.globalAlpha = o.alfa;
        const pp = { ...o.p, mn: o.mn, mx: o.mx };
        for (let k = 0; k < 3; k++) {
          if (V.d[k] > 1e-4) faccia(pp, o.c, k, 1, V);
          else if (V.d[k] < -1e-4) faccia(pp, o.c, k, 0, V);
        }
      }
      ctx.globalAlpha = 1;

      // etichette dei materiali
      const a = lim((t - fineMontaggio - 0.1) / 0.5);
      if (a > 0) etichette(lista.filter((o) => o.p.et && !o.p.out), a);
    }

    function disegnaQuota(t, V, F) {
      const b = quota.box, q = lim((t - (traccia ? traccia.t0 : 0) - 0.35) / 0.9);
      if (q <= 0) return;
      const z = b.mx[2], zq = z + 16;
      const A = proietta([b.mn[0], 0, zq], V, F), Bq = proietta([b.mx[0], 0, zq], V, F);
      const A0 = proietta([b.mn[0], 0, z + 3], V, F), A1 = proietta([b.mn[0], 0, zq + 5], V, F);
      const B0 = proietta([b.mx[0], 0, z + 3], V, F), B1 = proietta([b.mx[0], 0, zq + 5], V, F);
      const e = facile(q), mx = (A[0] + Bq[0]) / 2, my = (A[1] + Bq[1]) / 2;
      ctx.strokeStyle = 'rgba(42,45,49,.7)'; ctx.lineWidth = DPR;
      ctx.beginPath();
      ctx.moveTo(A0[0], A0[1]); ctx.lineTo(A1[0], A1[1]); ctx.moveTo(B0[0], B0[1]); ctx.lineTo(B1[0], B1[1]);
      ctx.moveTo(mx + (A[0] - mx) * e, my + (A[1] - my) * e); ctx.lineTo(mx + (Bq[0] - mx) * e, my + (Bq[1] - my) * e);
      const ang = Math.atan2(Bq[1] - A[1], Bq[0] - A[0]), tk = 5 * DPR;
      if (e > 0.98) for (const P of [A, Bq]) { ctx.moveTo(P[0] - Math.cos(ang + 0.785) * tk, P[1] - Math.sin(ang + 0.785) * tk); ctx.lineTo(P[0] + Math.cos(ang + 0.785) * tk, P[1] + Math.sin(ang + 0.785) * tk); }
      ctx.stroke();
      let rot = ang; if (rot > Math.PI / 2) rot -= Math.PI; if (rot < -Math.PI / 2) rot += Math.PI;
      ctx.save();
      ctx.globalAlpha = lim((q - 0.5) * 2);
      ctx.translate(mx, my); ctx.rotate(rot);
      font(12.5, 600);
      ctx.textAlign = 'center'; ctx.textBaseline = 'top';
      const testo = 'L su misura', w = ctx.measureText(testo).width;
      ctx.fillStyle = 'rgba(245,246,243,.92)'; ctx.fillRect(-w / 2 - 5 * DPR, 4 * DPR, w + 10 * DPR, 17 * DPR);
      ctx.fillStyle = '#2A2D31'; ctx.fillText(testo, 0, 6 * DPR);
      ctx.restore();
    }

    function etichette(lista, a) {
      const stretto = W / DPR < 520;
      font(stretto ? 11.5 : 13, 600);
      const pad = 6 * DPR, h = (stretto ? 20 : 23) * DPR, mar = 10 * DPR;
      const voci = lista.map((o) => ({ o, x: o.cc[0], y: o.cc[1], w: ctx.measureText(o.p.et).width }));
      const sx = [], dx = [];
      voci.sort((p, q) => p.x - q.x).forEach((v, i, arr) => (i < arr.length / 2 ? sx : dx).push(v));
      for (const [gruppo, sinistra] of [[sx, true], [dx, false]]) {
        gruppo.sort((p, q) => p.y - q.y);
        let ultimo = -1e9;
        gruppo.forEach((v) => {
          v.ly = Math.max(lim(v.y - 34 * DPR, h, H - h * 1.6), ultimo + h + 6 * DPR);
          ultimo = v.ly;
          v.lx = sinistra ? mar : W - mar - v.w - pad * 2;
        });
        ctx.globalAlpha = a;
        gruppo.forEach((v) => {
          const ex = sinistra ? v.lx + v.w + pad * 2 : v.lx;
          ctx.strokeStyle = 'rgba(42,45,49,.75)'; ctx.lineWidth = DPR;
          ctx.beginPath(); ctx.moveTo(v.x, v.y); ctx.lineTo(ex + (sinistra ? 8 : -8) * DPR, v.ly + h / 2); ctx.lineTo(ex, v.ly + h / 2); ctx.stroke();
          ctx.fillStyle = '#2A2D31'; ctx.beginPath(); ctx.arc(v.x, v.y, 3 * DPR, 0, 6.2832); ctx.fill();
          ctx.fillStyle = 'rgba(245,246,243,.94)'; ctx.fillRect(v.lx, v.ly, v.w + pad * 2, h);
          ctx.strokeStyle = 'rgba(42,45,49,.5)'; ctx.strokeRect(v.lx + 0.5, v.ly + 0.5, v.w + pad * 2 - 1, h - 1);
          ctx.fillStyle = '#2A2D31'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
          ctx.fillText(v.o.p.et, v.lx + pad, v.ly + h / 2 + DPR);
        });
      }
      ctx.globalAlpha = 1;
    }

    function font(px, peso) {
      ctx.font = `${peso} ${px * DPR}px Archivo, "Helvetica Neue", Arial, sans-serif`;
      if ('fontStretch' in ctx) ctx.fontStretch = 'semi-condensed';
    }

    /* ciclo */
    function frame() {
      raf = 0;
      const t = ora();
      if (!trascinando && Math.abs(vel) > 0.0004) { yawUtente += vel; vel *= 0.92; }
      scrollYaw += (scrollYawMeta - scrollYaw) * 0.12;
      disegna(t);
      if (hint && !hintFatto && t > fineMontaggio + 0.4 && partito) hint.classList.add('vis');
      const vivo = t < fineTutto || Math.abs(vel) > 0.0004 || trascinando || Math.abs(scrollYawMeta - scrollYaw) > 0.0008;
      if (vivo && visibile) raf = requestAnimationFrame(frame);
    }
    function kick() { if (!raf) raf = requestAnimationFrame(frame); }

    function misura() {
      DPR = Math.min(2, window.devicePixelRatio || 1);
      const r = cv.getBoundingClientRect();
      W = Math.max(1, Math.round(r.width * DPR)); H = Math.max(1, Math.round(r.height * DPR));
      cv.width = W; cv.height = H;
      if (!raf) disegna(ora());
      kick();
    }
    new ResizeObserver(misura).observe(cv);
    misura();

    const nascondiHint = () => { hintFatto = true; if (hint) hint.classList.remove('vis'); };
    cv.addEventListener('pointerdown', (e) => {
      trascinando = true; px = e.clientX; py = e.clientY; vel = 0;
      try { cv.setPointerCapture(e.pointerId); } catch (_) { /* niente */ }
      nascondiHint(); kick();
    });
    cv.addEventListener('pointermove', (e) => {
      if (!trascinando) return;
      const dx = e.clientX - px, dy = e.clientY - py;
      px = e.clientX; py = e.clientY;
      yawUtente += dx * 0.009; vel = dx * 0.009;
      pitchUtente = lim(pitchUtente + dy * 0.004, -0.28, 0.46);
      kick();
    });
    ['pointerup', 'pointercancel', 'lostpointercapture'].forEach((ev) => cv.addEventListener(ev, () => { trascinando = false; kick(); }));

    bottoni.forEach((b) => b.addEventListener('click', () => {
      if (b.dataset.modello === modello) return;
      bottoni.forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
      cv.setAttribute('aria-label', `Disegno in 3D del fusto: ${b.textContent.toLowerCase()}`);
      imposta(b.dataset.modello, false);
    }));

    const hero = document.querySelector('.hero');
    addEventListener('scroll', () => {
      if (RIDOTTO) return;
      scrollYawMeta = lim(scrollY / Math.max(1, hero.offsetHeight)) * 0.75;
      if (visibile) kick();
    }, { passive: true });

    const avvia = () => { if (partito) return; partito = true; imposta('divano', true); };
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(([v]) => {
        visibile = v.isIntersecting;
        if (visibile) { avvia(); kick(); }
      }, { threshold: 0.1 }).observe(cv);
    } else avvia();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(kick);
  }

  /* ---------- utilità del disegno ---------- */
  function facile(x) { return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; }
  function norm(v) { const l = Math.hypot(...v); return v.map((x) => x / l); }
  function mulberry(a) {
    return () => {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function texture(rnd) {
    const tela = (w, h, f) => { const c = document.createElement('canvas'); c.width = w; c.height = h; f(c.getContext('2d'), w, h); return c; };
    const venature = (g, w, h, n, col, a0, a1, l0, l1) => {
      for (let i = 0; i < n; i++) {
        const y0 = rnd() * h, amp = 0.6 + rnd() * 2.8, k1 = 1 + Math.floor(rnd() * 2), k2 = 2 + Math.floor(rnd() * 3), f1 = rnd() * 6.28, f2 = rnd() * 6.28;
        g.strokeStyle = `rgba(${col},${(a0 + rnd() * (a1 - a0)).toFixed(3)})`;
        g.lineWidth = l0 + rnd() * (l1 - l0);
        for (const off of [-h, 0, h]) {
          g.beginPath();
          for (let x = 0; x <= w; x += 4) {
            const y = y0 + off + Math.sin((x / w) * 6.2832 * k1 + f1) * amp + Math.sin((x / w) * 6.2832 * k2 + f2) * amp * 0.35;
            if (x) g.lineTo(x, y); else g.moveTo(x, y);
          }
          g.stroke();
        }
      }
    };
    return {
      abete: tela(256, 128, (g, w, h) => {
        g.fillStyle = '#DDBF90'; g.fillRect(0, 0, w, h);
        for (let i = 0; i < 8; i++) { g.fillStyle = `rgba(${rnd() < 0.5 ? '255,240,210' : '170,120,60'},${(0.05 + rnd() * 0.08).toFixed(3)})`; g.fillRect(0, rnd() * h, w, 4 + rnd() * 18); }
        venature(g, w, h, 30, '150,98,46', 0.12, 0.42, 0.5, 1.8);
      }),
      multi: tela(256, 128, (g, w, h) => {
        g.fillStyle = '#E6D2AA'; g.fillRect(0, 0, w, h);
        for (let i = 0; i < 6; i++) { g.fillStyle = `rgba(190,150,95,${(0.04 + rnd() * 0.06).toFixed(3)})`; g.fillRect(0, rnd() * h, w, 6 + rnd() * 20); }
        venature(g, w, h, 18, '170,125,70', 0.06, 0.2, 0.5, 1.4);
      }),
      ply: tela(128, 70, (g, w, h) => {
        const n = 7, s = h / n;
        for (let i = 0; i < n; i++) {
          g.fillStyle = i % 2 ? '#C9A06A' : '#EAD7B0'; g.fillRect(0, i * s, w, s);
          if (i % 2) for (let x = 0; x < w; x += 3) { g.fillStyle = `rgba(120,80,40,${(0.1 + rnd() * 0.2).toFixed(2)})`; g.fillRect(x, i * s + 1, 1, s - 2); }
          g.fillStyle = 'rgba(110,78,40,.55)'; g.fillRect(0, i * s, w, 1);
        }
      }),
      truc: tela(128, 128, (g, w, h) => {
        g.fillStyle = '#DCCCA8'; g.fillRect(0, 0, w, h);
        const col = ['168,138,96', '242,232,208', '140,112,74', '206,186,146'];
        for (let i = 0; i < 1400; i++) { g.fillStyle = `rgba(${col[i % 4]},${(0.3 + rnd() * 0.35).toFixed(2)})`; g.fillRect(rnd() * w, rnd() * h, 1 + rnd() * 3, 1 + rnd() * 1.6); }
      }),
      testa: tela(64, 64, (g, w, h) => {
        g.fillStyle = '#C8A26A'; g.fillRect(0, 0, w, h);
        g.strokeStyle = 'rgba(120,78,36,.35)'; g.lineWidth = 1.2;
        for (let r = 6; r < 120; r += 5 + rnd() * 4) { g.beginPath(); g.arc(-20, 84, r, 0, 6.2832); g.stroke(); }
      }),
    };
  }
})();
