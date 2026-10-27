// Il cappotto, strato per strato: parete in three.js guidata dallo scroll (window.cappotto.p)
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const W = 3, H = 2;
const T_MUR = 0.62, T_COL = 0.05, T_PAN = 0.4, T_RAS = 0.026, T_FIN = 0.02;
const Z_PAN_FRONT = T_COL + T_PAN;
// tempi dei passi (stessi di script.js)
const PASSI = [0, 0.12, 0.26, 0.42, 0.56, 0.70, 0.85, 1];
// distanza di ogni strato nell'esploso finale
const ESPLOSO = { muratura: 0, collante: 0.42, pannelli: 0.9, tasselli: 1.42, rete: 1.88, rasante: 2.16, finitura: 2.58 };

const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const smooth = (t) => t * t * (3 - 2 * t);
const easeOut = (t) => 1 - Math.pow(1 - t, 3);
const fase = (p, i) => clamp((p - PASSI[i]) / (PASSI[i + 1] - PASSI[i]));

function tela(w, h, disegna) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  disegna(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}
function rumore(g, w, h, n, colori, rMax = 1.4) {
  for (let i = 0; i < n; i++) {
    g.fillStyle = colori[(Math.random() * colori.length) | 0];
    g.globalAlpha = 0.25 + Math.random() * 0.5;
    g.beginPath();
    g.arc(Math.random() * w, Math.random() * h, Math.random() * rMax + 0.3, 0, 6.283);
    g.fill();
  }
  g.globalAlpha = 1;
}

// facce frontali: il materiale vero
const texMattoni = () => tela(900, 600, (g, w, h) => {
  g.fillStyle = '#C9C0B2'; g.fillRect(0, 0, w, h);
  const righe = 12, rh = h / righe, bw = 112, m = 5;
  const toni = ['#B65A36', '#A84F2E', '#C2653F', '#9E4A2C', '#B9603A', '#AD5532'];
  for (let r = 0; r < righe; r++) {
    const off = r % 2 ? -bw / 2 : 0;
    for (let x = off; x < w; x += bw) {
      g.fillStyle = toni[(Math.random() * toni.length) | 0];
      g.fillRect(x + m / 2, r * rh + m / 2, bw - m, rh - m);
    }
  }
  rumore(g, w, h, 5000, ['#7E3A22', '#D98C66', '#E3D7C8'], 1.2);
});
const texEps = () => tela(256, 256, (g, w, h) => {
  g.fillStyle = '#ECEDE8'; g.fillRect(0, 0, w, h);
  rumore(g, w, h, 1600, ['#D6D8D2', '#FFFFFF', '#CFD2CB'], 2.2);
});
const texGrana = (base, chiaro, scuro) => tela(512, 512, (g, w, h) => {
  g.fillStyle = base; g.fillRect(0, 0, w, h);
  rumore(g, w, h, 9000, [chiaro, scuro], 1.1);
});
const texRete = () => {
  const t = tela(512, 512, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    g.strokeStyle = '#E9C25A'; g.lineWidth = 4;
    const passo = 512 / 14;
    for (let i = 0; i <= 14; i++) {
      g.beginPath(); g.moveTo(i * passo, 0); g.lineTo(i * passo, h); g.stroke();
      g.beginPath(); g.moveTo(0, i * passo); g.lineTo(w, i * passo); g.stroke();
    }
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(3, 2);
  return t;
};
// facce tagliate: retini da tavola tecnica
function texSezione(tipo, wU, hU) {
  const px = 220;
  return tela(Math.max(32, Math.round(wU * px)), Math.max(32, Math.round(hU * px)), (g, w, h) => {
    if (tipo === 'muratura') {
      g.fillStyle = '#E6D9CC'; g.fillRect(0, 0, w, h);
      g.strokeStyle = '#A4502F'; g.lineWidth = 2.2;
      for (let x = -h; x < w + h; x += 15) { g.beginPath(); g.moveTo(x, h); g.lineTo(x + h, 0); g.stroke(); }
    } else if (tipo === 'isolante') {
      g.fillStyle = '#F3F3EE'; g.fillRect(0, 0, w, h);
      g.strokeStyle = '#5E8790'; g.lineWidth = 2;
      const verticale = h >= w, lato = verticale ? w : h, lungo = verticale ? h : w, passo = lato * 0.55;
      g.beginPath();
      for (let s = 0, k = 0; s <= lungo + passo; s += passo / 2, k++) {
        const a = k % 2 ? lato * 0.1 : lato * 0.9;
        if (verticale) { k ? g.lineTo(a, s) : g.moveTo(a, s); } else { k ? g.lineTo(s, a) : g.moveTo(s, a); }
      }
      g.stroke();
    } else {
      g.fillStyle = tipo; g.fillRect(0, 0, w, h);
      rumore(g, w, h, (w * h) / 40, ['#ffffff', '#00000033'], 0.9);
    }
  });
}
function materialiBox(fronte, sezLato, sezSopra, opz = {}) {
  const f = new THREE.MeshStandardMaterial({ roughness: 0.92, metalness: 0, ...opz, map: fronte });
  const lato = new THREE.MeshStandardMaterial({ roughness: 0.95, map: sezLato });
  const sopra = new THREE.MeshStandardMaterial({ roughness: 0.95, map: sezSopra });
  // ordine BoxGeometry: +x, -x, +y, -y, +z, -z
  return [lato, lato, sopra, sopra, f, f];
}

export function avvia(canvas, stato, etichetteEl) {
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  } catch (e) { return false; }
  if (!renderer.getContext()) return false;

  const mobile = matchMedia('(max-width: 899px)').matches;
  const ridotto = matchMedia('(prefers-reduced-motion: reduce)').matches;
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, mobile ? 1.5 : 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 1.05;

  const scena = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(mobile ? 36 : 30, 1, 0.5, 60);

  scena.add(new THREE.HemisphereLight(0xf3f6f2, 0x24383b, 1.35));
  const sole = new THREE.DirectionalLight(0xffffff, 2.3);
  sole.position.set(-3, 4.5, 6);
  scena.add(sole);
  const bordo = new THREE.DirectionalLight(0x9fd6e2, 0.9);
  bordo.position.set(5, 1.5, -2);
  scena.add(bordo);

  const parete = new THREE.Group();
  scena.add(parete);

  // 1. muratura
  const muratura = new THREE.Mesh(
    new THREE.BoxGeometry(W, H, T_MUR),
    materialiBox(texMattoni(), texSezione('muratura', T_MUR, H), texSezione('muratura', W, T_MUR))
  );
  muratura.position.z = -T_MUR / 2;
  parete.add(muratura);

  // 2. collante a cordolo e punti, pannello per pannello
  const pannelliPos = [
    [-1, 0.5, 1], [0, 0.5, 1], [1, 0.5, 1],
    [-1.25, -0.5, 0.5], [-0.5, -0.5, 1], [0.5, -0.5, 1], [1.25, -0.5, 0.5],
  ];
  const pezzi = [];
  const bordoC = 0.07, gap = 0.012;
  for (const [x, y, lw] of pannelliPos) {
    const w = lw - gap, h = 1 - gap;
    const lati = [
      [w - 0.16, bordoC, x, y + h / 2 - 0.1], [w - 0.16, bordoC, x, y - h / 2 + 0.1],
      [bordoC, h - 0.2, x - w / 2 + 0.1, y], [bordoC, h - 0.2, x + w / 2 - 0.1, y],
    ];
    for (const [bw, bh, bx, by] of lati) {
      const g = new THREE.BoxGeometry(bw, bh, T_COL);
      g.translate(bx, by, T_COL / 2);
      pezzi.push(g);
    }
    const punti = lw > 0.6 ? [[-0.2, 0.15], [0.2, -0.15], [0.18, 0.2]] : [[0, 0.12], [0, -0.18]];
    for (const [px, py] of punti) {
      const g = new THREE.CylinderGeometry(0.075, 0.09, T_COL, 14);
      g.rotateX(Math.PI / 2);
      g.translate(x + px * lw, y + py, T_COL / 2);
      pezzi.push(g);
    }
  }
  const collante = new THREE.Mesh(
    mergeGeometries(pezzi),
    new THREE.MeshStandardMaterial({ color: 0xd3cfc4, roughness: 1, map: texGrana('#D3CFC4', '#E8E5DD', '#B7B2A6') })
  );
  parete.add(collante);

  // 3. pannelli isolanti sfalsati
  const matEps = materialiBox(texEps(), texSezione('isolante', T_PAN, 1), texSezione('isolante', 1, T_PAN), { color: 0xffffff });
  const pannelli = pannelliPos.map(([x, y, lw]) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(lw - gap, 1 - gap, T_PAN), matEps);
    m.position.set(x, y, T_COL + T_PAN / 2);
    m.userData.base = m.position.clone();
    parete.add(m);
    return m;
  });

  // 4. tasselli: testa a disco e gambo che entra nel muro
  const lungo = T_PAN + T_COL + 0.26;
  const gTesta = new THREE.CylinderGeometry(0.06, 0.06, 0.014, 20); gTesta.rotateX(Math.PI / 2); gTesta.translate(0, 0, 0.007);
  const gGambo = new THREE.CylinderGeometry(0.014, 0.014, lungo, 8); gGambo.rotateX(Math.PI / 2); gGambo.translate(0, 0, -lungo / 2);
  const gTassello = mergeGeometries([gTesta, gGambo]);
  const matTassello = new THREE.MeshStandardMaterial({ color: 0xf0f0ea, roughness: 0.55 });
  const tasselliPos = [[-1, 0], [-0.5, 0], [0, 0], [0.5, 0], [1, 0], [-1, 0.5], [0, 0.5], [1, 0.5], [-0.5, -0.5], [0.5, -0.5]];
  const tasselli = tasselliPos.map(([x, y]) => {
    const m = new THREE.Mesh(gTassello, matTassello);
    m.position.set(x, y, Z_PAN_FRONT);
    parete.add(m);
    return m;
  });

  // 5. rete in fibra di vetro e rasante (srotolati dall'alto)
  const gRete = new THREE.PlaneGeometry(W, H); gRete.translate(0, -H / 2, 0);
  const rete = new THREE.Mesh(gRete, new THREE.MeshStandardMaterial({ map: texRete(), transparent: true, alphaTest: 0.3, side: THREE.DoubleSide, roughness: 0.8 }));
  rete.position.set(0, H / 2, Z_PAN_FRONT + T_RAS * 0.45);
  parete.add(rete);
  const gRas = new THREE.BoxGeometry(W, H, T_RAS); gRas.translate(0, -H / 2, 0);
  const rasante = new THREE.Mesh(gRas, materialiBox(texGrana('#A4AAA5', '#C3C8C2', '#8C928C'), texSezione('#A4AAA5', T_RAS, H), texSezione('#A4AAA5', W, T_RAS)));
  rasante.position.set(0, H / 2, Z_PAN_FRONT + T_RAS / 2);
  parete.add(rasante);

  // 6. finitura a calce, stesa da sinistra a destra con la spatola
  const grana = tela(512, 512, (g, w, h) => {
    g.fillStyle = '#808080'; g.fillRect(0, 0, w, h);
    rumore(g, w, h, 14000, ['#ffffff', '#000000'], 1.3);
  });
  grana.colorSpace = THREE.NoColorSpace;
  const coloreFin = new THREE.Color(stato.colore || '#ECE7DC');
  const matFin = new THREE.MeshStandardMaterial({ color: coloreFin.clone(), roughness: 0.96, bumpMap: grana, bumpScale: 1.6 });
  const gFin = new THREE.BoxGeometry(W, H, T_FIN); gFin.translate(W / 2, 0, 0);
  const finitura = new THREE.Mesh(gFin, matFin);
  finitura.position.set(-W / 2, 0, Z_PAN_FRONT + T_RAS + T_FIN / 2);
  parete.add(finitura);

  const spatola = new THREE.Group();
  const lama = new THREE.Mesh(new THREE.BoxGeometry(0.74, 0.3, 0.01), new THREE.MeshStandardMaterial({ color: 0xc7ced2, metalness: 0.35, roughness: 0.28 }));
  const perno = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.18, 0.08), new THREE.MeshStandardMaterial({ color: 0x9aa3a8, metalness: 0.3, roughness: 0.4 }));
  perno.position.set(0, 0, 0.04);
  const manico = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.036, 0.42, 14), new THREE.MeshStandardMaterial({ color: 0x8a5a3c, roughness: 0.7 }));
  manico.rotation.z = Math.PI / 2;
  manico.position.set(0, 0, 0.115);
  spatola.add(lama, perno, manico);
  spatola.visible = false;
  parete.add(spatola);

  // etichette numerate dell'esploso
  const strati = [
    { nome: 'Muratura', mesh: muratura, z: () => 0 },
    { nome: 'Collante', mesh: collante, z: () => T_COL },
    { nome: 'Isolante', mesh: pannelli[2], z: () => T_COL + T_PAN },
    { nome: 'Tasselli', mesh: tasselli[4], z: () => Z_PAN_FRONT },
    { nome: 'Rasatura armata', mesh: rete, z: () => Z_PAN_FRONT },
    { nome: 'Finitura', mesh: finitura, z: () => Z_PAN_FRONT + T_RAS + T_FIN },
  ];
  const etichette = strati.map((s, i) => {
    const el = document.createElement('span');
    el.className = 'etichetta';
    el.innerHTML = `<b>${i + 1}</b><span class="etichetta-nome">${s.nome}</span>`;
    etichetteEl.appendChild(el);
    return el;
  });
  const tmp = new THREE.Vector3();

  let larg = 1, alt = 1;
  function misura() {
    const r = canvas.parentElement.getBoundingClientRect();
    larg = Math.max(1, r.width); alt = Math.max(1, r.height);
    renderer.setSize(larg, alt, false);
    camera.aspect = larg / alt;
    camera.updateProjectionMatrix();
    disegna(performance.now(), true);
  }

  let pS = stato.p || 0, ultimo = performance.now(), tempo = 0;
  let puntX = 0, puntXS = 0;
  if (!mobile) {
    addEventListener('pointermove', (e) => { puntX = (e.clientX / innerWidth) * 2 - 1; }, { passive: true });
  }

  function disegna(ora, forza) {
    const dt = Math.min(0.05, (ora - ultimo) / 1000);
    ultimo = ora;
    if (!ridotto) tempo += dt;
    const obiettivo = stato.p || 0;
    pS = ridotto || forza ? obiettivo : pS + (obiettivo - pS) * (1 - Math.exp(-dt * 7));
    puntXS += (puntX - puntXS) * (1 - Math.exp(-dt * 3));
    const p = pS;

    const kCol = easeOut(fase(p, 1));
    const kPan = fase(p, 2);
    const kTas = fase(p, 3);
    const kRas = fase(p, 4);
    const kFin = fase(p, 5);
    const e = smooth(clamp((p - 0.86) / 0.1));

    // collante che esce dal muro
    collante.visible = kCol > 0.001;
    collante.scale.set(0.9 + 0.1 * kCol, 0.9 + 0.1 * kCol, Math.max(0.001, kCol));
    collante.position.z = ESPLOSO.collante * e;

    // pannelli in arrivo uno dopo l'altro
    pannelli.forEach((m, j) => {
      const t = easeOut(clamp((kPan - j * 0.075) / 0.5));
      m.visible = t > 0.001;
      m.position.z = m.userData.base.z + (1 - t) * 1.5 + ESPLOSO.pannelli * e;
      m.rotation.x = (1 - t) * -0.18;
      const s = 0.8 + 0.2 * t;
      m.scale.set(s, s, s);
    });

    // tasselli piantati
    tasselli.forEach((m, j) => {
      const t = clamp((kTas - j * 0.06) / 0.4);
      const avanti = t < 0.6 ? easeOut(t / 0.6) * 0.75 : 0.75 + smooth((t - 0.6) / 0.4) * 0.25;
      m.visible = t > 0.001;
      m.position.z = Z_PAN_FRONT + (1 - avanti) * 1.5 + ESPLOSO.tasselli * e;
      m.rotation.z = (1 - avanti) * 4;
    });

    // rete e rasante srotolati dall'alto
    const kR = easeOut(clamp(kRas / 0.6));
    const kRs = easeOut(clamp((kRas - 0.35) / 0.65));
    rete.visible = kR > 0.001;
    rete.scale.y = Math.max(0.001, kR);
    rete.position.z = Z_PAN_FRONT + T_RAS * 0.45 + ESPLOSO.rete * e + (1 - kR) * 0.15;
    rasante.visible = kRs > 0.001;
    rasante.scale.y = Math.max(0.001, kRs);
    rasante.position.z = Z_PAN_FRONT + T_RAS / 2 + ESPLOSO.rasante * e;

    // finitura con la spatola
    const kF = smooth(kFin);
    finitura.visible = kF > 0.001;
    finitura.scale.x = Math.max(0.001, kF);
    finitura.position.z = Z_PAN_FRONT + T_RAS + T_FIN / 2 + ESPLOSO.finitura * e;
    coloreFin.set(stato.colore || '#ECE7DC');
    matFin.color.lerp(coloreFin, ridotto || forza ? 1 : 1 - Math.exp(-dt * 6));
    spatola.visible = kFin > 0.01 && kFin < 0.99 && e < 0.01;
    if (spatola.visible) {
      const bordoX = -W / 2 + W * kF;
      const onda = Math.sin(kFin * Math.PI * 7);
      spatola.position.set(bordoX - 0.24, onda * (H / 2 - 0.22), Z_PAN_FRONT + T_RAS + T_FIN + 0.006);
      spatola.rotation.z = Math.cos(kFin * Math.PI * 7) * 0.22;
      const comparsa = smooth(clamp(Math.min(kFin, 1 - kFin) / 0.06));
      spatola.scale.setScalar(comparsa);
    }

    // camera: tre quarti mentre si costruisce, di fianco nell'esploso
    const idle = Math.sin(tempo * 0.45) * 0.07;
    const az = 0.58 + 0.12 * smooth(clamp(p / 0.3)) + 0.47 * e + idle + puntXS * 0.1;
    const el = 0.2 + 0.1 * e + Math.sin(tempo * 0.31) * 0.02;
    const zC = -0.06 + 0.06 * smooth(clamp(p / 0.45)) + 1.24 * e;
    const raggio = Math.sqrt((W / 2) ** 2 + (H / 2) ** 2 + ((0.9 + 2.6 * e) / 2) ** 2);
    const vfov = THREE.MathUtils.degToRad(camera.fov);
    const hfov = 2 * Math.atan(Math.tan(vfov / 2) * camera.aspect);
    const dist = (raggio / Math.sin(Math.min(vfov, hfov) / 2)) * ((mobile ? 0.96 : 0.96) + 0.06 * e);
    camera.position.set(Math.sin(az) * Math.cos(el) * dist, Math.sin(el) * dist, zC + Math.cos(az) * Math.cos(el) * dist);
    camera.lookAt(0, -0.05, zC);
    camera.updateMatrixWorld();

    renderer.render(scena, camera);

    // etichette
    const visEt = e;
    strati.forEach((s, i) => {
      const off = [ESPLOSO.muratura, ESPLOSO.collante, ESPLOSO.pannelli, ESPLOSO.tasselli, ESPLOSO.rete, ESPLOSO.finitura][i] * e;
      const sotto = !mobile && i % 2 === 1;
      tmp.set(W / 2, sotto ? -H / 2 - 0.06 : H / 2 + 0.06, s.z() + off - 0.01);
      tmp.project(camera);
      const x = (tmp.x * 0.5 + 0.5) * larg, y = (-tmp.y * 0.5 + 0.5) * alt;
      const el = etichette[i];
      el.style.transform = `translate(${x.toFixed(1)}px, ${(sotto ? y + 6 : y - 26).toFixed(1)}px) translateX(-50%)`;
      el.style.opacity = visEt.toFixed(3);
    });
  }

  // loop solo quando la sezione è in vista e la scheda è visibile
  let attivo = false, raf = 0, inVista = false;
  const ciclo = (ora) => { disegna(ora); raf = requestAnimationFrame(ciclo); };
  const aggiorna = () => {
    const deve = inVista && !document.hidden && !ridotto;
    if (deve && !attivo) { attivo = true; ultimo = performance.now(); raf = requestAnimationFrame(ciclo); }
    if (!deve && attivo) { attivo = false; cancelAnimationFrame(raf); }
  };
  new IntersectionObserver(([v]) => { inVista = v.isIntersecting; aggiorna(); }).observe(canvas.parentElement);
  document.addEventListener('visibilitychange', aggiorna);
  if (ridotto) stato.ridisegna = () => disegna(performance.now(), true);

  new ResizeObserver(misura).observe(canvas.parentElement);

  return renderer.compileAsync(scena, camera).catch(() => {}).then(() => {
    misura();
    disegna(performance.now(), true);
    return true;
  });
}
