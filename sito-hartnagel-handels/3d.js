/* Hartnagel Handels — il container che si arreda.
   Container da 20 piedi in sezione dentro il magazzino con i portali blu. Gli arredi sono i prodotti veri del
   catalogo, costruiti in codice sulle loro misure (cm): calano dall'alto e cambiano con lo scroll
   (spogliatoio, ufficio, mensa, dormitorio). Tempo da requestAnimationFrame + performance.now(), niente ombre vere. */
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const sstep = (a, b, v) => { const t = clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const easeOut = (t) => 1 - Math.pow(1 - t, 3);
const easeIn = (t) => t * t * t;
const lerp = (a, b, t) => a + (b - a) * t;

/* ---------- materiali ---------- */
const std = (color, roughness = 0.5, metalness = 0, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness, metalness, ...extra });
function materiali() {
  return {
    ral: std('#C9CECB', 0.52, 0.25),
    ralAnta: std('#D6DAD7', 0.46, 0.22),
    fessura: std('#4A5157', 0.7, 0.1),
    antracite: std('#41484F', 0.46, 0.35),
    nero: std('#202226', 0.55, 0.25),
    argento: std('#BAC0C6', 0.34, 0.75),
    legno: std('#CC9C67', 0.62, 0),
    piano: std('#DEDDD6', 0.48, 0),
    bianco: std('#F2F2EE', 0.4, 0),
    biancoInt: std('#F1F0EB', 0.75, 0),
    pavimento: std('#B5B2AA', 0.7, 0),
    materasso: std('#2F63AE', 0.82, 0),
    lenzuolo: std('#EEF1F4', 0.88, 0),
    tessuto: std('#3E444A', 0.92, 0),
    guscio: std('#363C44', 0.42, 0.05),
    inox: std('#D2D6D9', 0.22, 0.9),
    piastra: std('#2B2D30', 0.5, 0.4),
    blu: std('#1F55A6', 0.42, 0.35),
    pannello: std('#E1E5E6', 0.7, 0.05),
    cartone: std('#C8AE86', 0.85, 0),
    pallet: std('#B89466', 0.8, 0),
    vetro: std('#DCEAF5', 0.08, 0, { emissive: new THREE.Color('#CFE2F2'), emissiveIntensity: 0.55 }),
  };
}

/* ---------- kit: pezzi uniti per materiale (poche draw call) ---------- */
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _v = new THREE.Vector3(), _s = new THREE.Vector3(1, 1, 1);
class Kit {
  constructor() { this.parti = new Map(); }
  metti(mat, geo, x, y, z, rx = 0, ry = 0, rz = 0) {
    if (geo.index) geo = geo.toNonIndexed();
    _e.set(rx, ry, rz); _q.setFromEuler(_e); _v.set(x, y, z);
    geo.applyMatrix4(_m.compose(_v, _q, _s));
    if (!this.parti.has(mat)) this.parti.set(mat, []);
    this.parti.get(mat).push(geo);
    return this;
  }
  box(mat, w, h, d, x, y, z, ry = 0, rx = 0, rz = 0) { return this.metti(mat, new THREE.BoxGeometry(w, h, d), x, y, z, rx, ry, rz); }
  tondo(mat, w, h, d, r, x, y, z, ry = 0, rx = 0, rz = 0) { return this.metti(mat, new RoundedBoxGeometry(w, h, d, 2, Math.min(r, w / 2, h / 2, d / 2)), x, y, z, rx, ry, rz); }
  cil(mat, r, h, x, y, z, rx = 0, rz = 0, seg = 12, r2) { return this.metti(mat, new THREE.CylinderGeometry(r, r2 ?? r, h, seg, 1), x, y, z, rx, 0, rz); }
  tubo(mat, r, a, b, seg = 10) {
    const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b), d = B.clone().sub(A);
    let geo = new THREE.CylinderGeometry(r, r, d.length(), seg, 1);
    if (geo.index) geo = geo.toNonIndexed();
    _q.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
    _v.copy(A).add(B).multiplyScalar(0.5);
    geo.applyMatrix4(_m.compose(_v, _q, _s));
    if (!this.parti.has(mat)) this.parti.set(mat, []);
    this.parti.get(mat).push(geo);
    return this;
  }
  monta() {
    const g = new THREE.Group();
    for (const [mat, geos] of this.parti) {
      const uniti = mergeGeometries(geos, false);
      geos.forEach((x) => x.dispose());
      const mesh = new THREE.Mesh(uniti, mat);
      mesh.matrixAutoUpdate = false;
      g.add(mesh);
    }
    return g;
  }
}

/* ---------- texture disegnate al volo ---------- */
function canvasTex(w, h, disegna, srgb = true) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  disegna(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}
const texOmbra = () => canvasTex(256, 256, (g, w, h) => {
  g.clearRect(0, 0, w, h);
  g.filter = 'blur(26px)';
  g.fillStyle = 'rgba(18,26,34,1)';
  g.fillRect(56, 56, w - 112, h - 112);
});
const texPavimento = (rip) => {
  const t = canvasTex(1024, 1024, (g, w, h) => {
    g.fillStyle = '#CFD3D3'; g.fillRect(0, 0, w, h);
    let seme = 7; const rnd = () => ((seme = (seme * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < 260; i++) {
      const x = rnd() * w, y = rnd() * h, r = 20 + rnd() * 120;
      const gr = g.createRadialGradient(x, y, 0, x, y, r);
      const chiaro = rnd() > 0.5;
      gr.addColorStop(0, chiaro ? 'rgba(255,255,255,.07)' : 'rgba(80,90,96,.06)');
      gr.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2);
    }
    g.strokeStyle = 'rgba(70,80,86,.28)'; g.lineWidth = 2;
    for (let i = 0; i <= 4; i++) {
      g.beginPath(); g.moveTo(i * w / 4, 0); g.lineTo(i * w / 4, h); g.stroke();
      g.beginPath(); g.moveTo(0, i * h / 4); g.lineTo(w, i * h / 4); g.stroke();
    }
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rip, rip);
  return t;
};
const texSerranda = () => canvasTex(64, 256, (g, w, h) => {
  g.fillStyle = '#D9DDDA'; g.fillRect(0, 0, w, h);
  for (let y = 0; y < h; y += 8) { g.fillStyle = 'rgba(60,66,70,.35)'; g.fillRect(0, y, w, 1.5); g.fillStyle = 'rgba(255,255,255,.5)'; g.fillRect(0, y + 2, w, 1); }
});
const texPortone = () => canvasTex(256, 256, (g, w, h) => {
  g.fillStyle = '#E9ECED'; g.fillRect(0, 0, w, h);
  g.fillStyle = 'rgba(80,90,96,.25)';
  for (let y = 0; y < h; y += 42) g.fillRect(0, y, w, 2);
  g.fillStyle = 'rgba(48,58,66,.85)';
  for (let i = 0; i < 4; i++) { g.beginPath(); g.roundRect(22 + i * 58, 92, 40, 20, 8); g.fill(); }
});
const texParete = () => {
  const t = canvasTex(64, 512, (g, w, h) => {
    g.fillStyle = '#E3E7E8'; g.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 64) { g.fillStyle = 'rgba(80,90,96,.16)'; g.fillRect(0, y, w, 2); }
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
};

/* ---------- il container (20 piedi: 606 x 244 x 259 cm) ---------- */
const L = 6.06, W = 2.44, H = 2.59, PAV = 0.2;
const IX = L / 2 - 0.16, IZ = W / 2 - 0.12; // limiti interni

function lamieraOndulata(len, alt, passo = 0.29, prof = 0.042) {
  const s = new THREE.Shape(); s.moveTo(0, 0);
  for (let x = 0; x < len - 1e-6; x += passo) {
    const p = Math.min(passo, len - x);
    s.lineTo(x + p * 0.28, 0); s.lineTo(x + p * 0.4, prof); s.lineTo(x + p * 0.78, prof); s.lineTo(x + p * 0.9, 0); s.lineTo(x + p, 0);
  }
  s.lineTo(len, -0.006); s.lineTo(0, -0.006); s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth: alt, bevelEnabled: false, steps: 1 });
  g.rotateX(-Math.PI / 2); // altezza lungo +y, ondulazione verso -z
  return g;
}

function costruisciContainer(M) {
  const k = new Kit();
  const P = 0.16; // profili del telaio
  // telaio
  k.box(M.antracite, L, P, P, 0, P / 2, W / 2 - P / 2).box(M.antracite, L, P, P, 0, P / 2, -W / 2 + P / 2);
  k.box(M.antracite, P, P, W, -L / 2 + P / 2, P / 2, 0).box(M.antracite, P, P, W, L / 2 - P / 2, P / 2, 0);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) k.box(M.antracite, P, H, P, sx * (L / 2 - P / 2), H / 2, sz * (W / 2 - P / 2));
  k.box(M.antracite, L, P, P, 0, H - P / 2, -W / 2 + P / 2);
  k.box(M.antracite, P, P, W, -L / 2 + P / 2, H - P / 2, 0).box(M.antracite, P, P, W, L / 2 - P / 2, H - P / 2, 0);
  // blocchi d'angolo
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) for (const y of [0.08, H - 0.08]) k.box(M.nero, 0.18, 0.12, 0.18, sx * (L / 2 - 0.09), y, sz * (W / 2 - 0.09));
  // pavimento interno
  k.box(M.pavimento, L - 0.2, 0.04, W - 0.18, 0, PAV - 0.02, 0);
  // parete di fondo: lamiera ondulata fuori, pannello bianco dentro
  const hp = H - 2 * P;
  k.metti(M.antracite, lamieraOndulata(L - 2 * P, hp), -(L - 2 * P) / 2, P, -W / 2 + 0.05);
  k.box(M.biancoInt, L - 2 * P, hp - (PAV - P), 0.03, 0, PAV + (hp - (PAV - P)) / 2, -IZ);
  // parete sinistra
  const fianco = lamieraOndulata(W - 2 * P, hp);
  k.metti(M.antracite, fianco, -L / 2 + 0.05, P, (W - 2 * P) / 2, 0, -Math.PI / 2, 0);
  k.box(M.biancoInt, 0.03, hp - (PAV - P), W - 2 * P, -IX, PAV + (hp - (PAV - P)) / 2, 0);
  // parete destra con finestra
  const fz = 0.55, fy0 = 1.05, fy1 = 2.02, xw = IX, top = H - P;
  const fasce = (mat, x, sp) => {
    k.box(mat, sp, fy0 - PAV, W - 2 * P, x, PAV + (fy0 - PAV) / 2, 0);
    k.box(mat, sp, top - fy1, W - 2 * P, x, fy1 + (top - fy1) / 2, 0);
    const lato = (W - 2 * P) / 2 - fz;
    k.box(mat, sp, fy1 - fy0, lato, x, (fy0 + fy1) / 2, -(fz + lato / 2));
    k.box(mat, sp, fy1 - fy0, lato, x, (fy0 + fy1) / 2, fz + lato / 2);
  };
  fasce(M.biancoInt, xw, 0.03);
  fasce(M.antracite, L / 2 - 0.05, 0.05);
  // telaio finestra e vetro
  const tf = 0.05;
  k.box(M.bianco, 0.12, tf, 2 * fz + 2 * tf, xw + 0.03, fy0 - tf / 2 + 0.01, 0).box(M.bianco, 0.12, tf, 2 * fz + 2 * tf, xw + 0.03, fy1 + tf / 2 - 0.01, 0);
  k.box(M.bianco, 0.12, fy1 - fy0, tf, xw + 0.03, (fy0 + fy1) / 2, -fz - tf / 2 + 0.01).box(M.bianco, 0.12, fy1 - fy0, tf, xw + 0.03, (fy0 + fy1) / 2, fz + tf / 2 - 0.01);
  k.box(M.bianco, 0.1, fy1 - fy0, 0.04, xw + 0.03, (fy0 + fy1) / 2, 0);
  k.box(M.bianco, 0.16, 0.03, 2 * fz + 0.1, xw - 0.04, fy0 - 0.03, 0);
  k.box(M.vetro, 0.012, fy1 - fy0, 2 * fz, xw + 0.06, (fy0 + fy1) / 2, 0);
  // battiscopa
  k.box(M.antracite, L - 2 * P - 0.02, 0.06, 0.012, 0, PAV + 0.03, -IZ + 0.02);
  return k.monta();
}

/* ---------- arredi (origine: centro della base, fronte verso +z) ---------- */
function anta(k, M, w, h, x, y, z, { feritoie = true, serratura = 'centro', etichetta = true } = {}) {
  k.box(M.ralAnta, w, h, 0.018, x, y, z);
  const fz = z + 0.011;
  if (feritoie) for (const base of [y + h / 2 - 0.1, y - h / 2 + 0.08]) for (let i = 0; i < 3; i++) k.box(M.fessura, w * 0.42, 0.011, 0.004, x, base - i * 0.028, fz);
  if (etichetta) k.box(M.argento, Math.min(0.075, w * 0.5), 0.04, 0.004, x, y + h / 2 - 0.2, fz);
  if (serratura) k.cil(M.argento, 0.013, 0.012, x + (serratura === 'lato' ? w / 2 - 0.05 : w * 0.28), y + 0.05, fz + 0.002, Math.PI / 2, 0, 10);
}
function armadioSpogliatoio(M, w = 1.2, ante = 4) {
  const k = new Kit(), d = 0.5, h = 1.8, z = 0.1;
  k.box(M.ral, w - 0.04, z, d - 0.06, 0, z / 2, -0.01);
  k.tondo(M.ral, w, h - z, d, 0.008, 0, z + (h - z) / 2, 0);
  const dw = (w - 0.03) / ante;
  for (let i = 0; i < ante; i++) anta(k, M, dw - 0.008, h - z - 0.05, -w / 2 + 0.015 + dw * (i + 0.5), z + (h - z) / 2, d / 2 + 0.006);
  return k.monta();
}
function casellario(M) {
  const k = new Kit(), w = 0.7, d = 0.5, h = 1.8, z = 0.1;
  k.box(M.ral, w - 0.04, z, d - 0.06, 0, z / 2, -0.01);
  k.tondo(M.ral, w, h - z, d, 0.008, 0, z + (h - z) / 2, 0);
  const cw = (w - 0.03) / 2, ch = (h - z - 0.04) / 5;
  for (let c = 0; c < 2; c++) for (let r = 0; r < 5; r++)
    anta(k, M, cw - 0.008, ch - 0.01, -w / 2 + 0.015 + cw * (c + 0.5), z + 0.02 + ch * (r + 0.5), d / 2 + 0.006, { feritoie: false, serratura: 'centro' });
  return k.monta();
}
function pancaGuardaroba(M) {
  const k = new Kit(), w = 2.0, t = 0.03;
  for (const x of [-w / 2 + 0.03, 0, w / 2 - 0.03]) {
    k.box(M.ral, t, 1.8, t, x, 0.9, -0.16);
    k.box(M.ral, t, 0.42, t, x, 0.21, 0.15);
    k.box(M.ral, t, t, 0.34, x, 0.41, 0);
    k.box(M.ral, t, t, 0.34, x, 0.1, 0);
  }
  for (let i = 0; i < 3; i++) k.box(M.legno, w, 0.022, 0.095, 0, 0.44, -0.11 + i * 0.11);
  for (let i = 0; i < 4; i++) k.box(M.ral, w, 0.016, 0.016, 0, 0.12, -0.12 + i * 0.08);
  k.box(M.legno, w, 0.09, 0.022, 0, 1.18, -0.15).box(M.legno, w, 0.09, 0.022, 0, 1.34, -0.15);
  k.box(M.ral, w, t, t, 0, 1.78, -0.16);
  for (let i = 0; i < 8; i++) {
    const x = -w / 2 + 0.16 + i * ((w - 0.32) / 7);
    k.box(M.argento, 0.014, 0.014, 0.1, x, 1.66, -0.11);
    k.box(M.argento, 0.014, 0.05, 0.014, x, 1.69, -0.06);
  }
  return k.monta();
}
function panca(M, w = 1.2) {
  const k = new Kit();
  for (const x of [-w / 2 + 0.12, w / 2 - 0.12]) {
    k.box(M.ral, 0.03, 0.42, 0.03, x, 0.21, 0.14).box(M.ral, 0.03, 0.42, 0.03, x, 0.21, -0.14).box(M.ral, 0.03, 0.03, 0.34, x, 0.41, 0).box(M.ral, 0.03, 0.03, 0.3, x, 0.06, 0);
  }
  for (let i = 0; i < 3; i++) k.box(M.legno, w, 0.022, 0.1, 0, 0.44, -0.12 + i * 0.12);
  return k.monta();
}
function scrivania(M) {
  const k = new Kit(), w = 1.6, d = 0.8, h = 0.72;
  k.tondo(M.piano, w, 0.025, d, 0.006, 0, h - 0.0125, 0);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) k.box(M.ral, 0.04, h - 0.025, 0.03, sx * (w / 2 - 0.05), (h - 0.025) / 2, sz * (d / 2 - 0.05));
  k.box(M.ral, w - 0.12, 0.05, 0.02, 0, h - 0.06, -d / 2 + 0.05);
  // cassettiera appesa a sinistra: 3 cassetti
  const cx = -w / 2 + 0.3;
  k.box(M.ral, 0.42, 0.42, d - 0.12, cx, h - 0.025 - 0.21, 0);
  for (let i = 0; i < 3; i++) {
    k.box(M.ralAnta, 0.4, 0.125, 0.012, cx, h - 0.1 - i * 0.135, d / 2 - 0.054);
    k.box(M.argento, 0.12, 0.012, 0.012, cx, h - 0.08 - i * 0.135, d / 2 - 0.042);
  }
  return k.monta();
}
function sediaGirevole(M) {
  const k = new Kit();
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    k.box(M.nero, 0.3, 0.035, 0.045, Math.cos(a) * 0.15, 0.065, Math.sin(a) * 0.15, -a);
    k.cil(M.nero, 0.025, 0.035, Math.cos(a) * 0.3, 0.025, Math.sin(a) * 0.3, Math.PI / 2, 0, 10);
  }
  k.cil(M.nero, 0.04, 0.06, 0, 0.08, 0, 0, 0, 12);
  k.cil(M.argento, 0.022, 0.32, 0, 0.26, 0, 0, 0, 10);
  k.box(M.nero, 0.3, 0.03, 0.3, 0, 0.43, 0);
  k.tondo(M.tessuto, 0.47, 0.085, 0.46, 0.035, 0, 0.48, 0.01);
  k.box(M.nero, 0.05, 0.36, 0.025, 0, 0.62, -0.235);
  k.tondo(M.tessuto, 0.43, 0.44, 0.075, 0.035, 0, 0.86, -0.25, 0, -0.1);
  return k.monta();
}
function serrandina(M, serr) {
  const k = new Kit(), w = 1.2, h = 1.05, d = 0.42;
  k.tondo(M.ral, w, h, d, 0.008, 0, h / 2, 0);
  k.box(serr, w - 0.07, h - 0.12, 0.012, 0, h / 2 + 0.01, d / 2 + 0.004);
  k.box(M.ral, w - 0.07, 0.03, 0.03, 0, h * 0.62, d / 2 + 0.015);
  k.box(M.argento, 0.2, 0.012, 0.012, 0, h * 0.62 - 0.026, d / 2 + 0.03);
  return k.monta();
}
function cassettiera(M) {
  const k = new Kit(), w = 0.39, h = 0.56, d = 0.6;
  k.tondo(M.nero, w, h - 0.06, d, 0.008, 0, 0.06 + (h - 0.06) / 2, 0);
  k.box(M.argento, w, 0.012, d, 0, h + 0.006, 0);
  for (let i = 0; i < 3; i++) k.box(M.fessura, w - 0.02, 0.005, 0.004, 0, 0.2 + i * 0.13, d / 2 + 0.002);
  for (let i = 0; i < 3; i++) k.box(M.argento, 0.1, 0.01, 0.012, 0, 0.17 + i * 0.13, d / 2 + 0.008);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) k.cil(M.nero, 0.024, 0.03, sx * 0.15, 0.025, sz * 0.24, Math.PI / 2, 0, 10);
  return k.monta();
}
function armadio(M, w = 0.92, h = 1.95, d = 0.42) {
  const k = new Kit();
  k.box(M.ral, w - 0.04, 0.06, d - 0.04, 0, 0.03, 0);
  k.tondo(M.ral, w, h - 0.06, d, 0.008, 0, 0.06 + (h - 0.06) / 2, 0);
  const dw = (w - 0.03) / 2;
  for (let i = 0; i < 2; i++) k.box(M.ralAnta, dw - 0.006, h - 0.1, 0.018, -w / 2 + 0.015 + dw * (i + 0.5), 0.06 + (h - 0.06) / 2, d / 2 + 0.006);
  k.box(M.argento, 0.018, 0.16, 0.02, 0.04, 0.06 + (h - 0.06) * 0.52, d / 2 + 0.024);
  k.cil(M.nero, 0.014, 0.012, 0.04, 0.06 + (h - 0.06) * 0.52 + 0.11, d / 2 + 0.018, Math.PI / 2, 0, 10);
  return k.monta();
}
function tavolo(M, w = 1.6, d = 0.8) {
  const k = new Kit(), h = 0.72;
  k.tondo(M.piano, w, 0.025, d, 0.006, 0, h - 0.0125, 0);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    k.box(M.ral, 0.035, h - 0.04, 0.035, sx * (w / 2 - 0.05), (h - 0.04) / 2, sz * (d / 2 - 0.05));
    k.cil(M.nero, 0.02, 0.012, sx * (w / 2 - 0.05), 0.006, sz * (d / 2 - 0.05), 0, 0, 8);
  }
  k.box(M.ral, w - 0.12, 0.05, 0.02, 0, h - 0.055, d / 2 - 0.05).box(M.ral, w - 0.12, 0.05, 0.02, 0, h - 0.055, -d / 2 + 0.05);
  k.box(M.ral, 0.02, 0.05, d - 0.12, w / 2 - 0.05, h - 0.055, 0).box(M.ral, 0.02, 0.05, d - 0.12, -w / 2 + 0.05, h - 0.055, 0);
  return k.monta();
}
function sediaImpilabile(M) {
  const k = new Kit(), r = 0.011;
  k.tubo(M.ralAnta, r, [-0.21, 0, 0.22], [-0.2, 0.44, 0.17]).tubo(M.ralAnta, r, [0.21, 0, 0.22], [0.2, 0.44, 0.17]);
  k.tubo(M.ralAnta, r, [-0.21, 0, -0.22], [-0.2, 0.44, -0.16]).tubo(M.ralAnta, r, [0.21, 0, -0.22], [0.2, 0.44, -0.16]);
  k.tubo(M.ralAnta, r, [-0.2, 0.44, 0.17], [-0.2, 0.44, -0.16]).tubo(M.ralAnta, r, [0.2, 0.44, 0.17], [0.2, 0.44, -0.16]);
  k.tubo(M.ralAnta, r, [-0.2, 0.44, -0.16], [-0.19, 0.84, -0.24]).tubo(M.ralAnta, r, [0.2, 0.44, -0.16], [0.19, 0.84, -0.24]);
  k.tondo(M.guscio, 0.44, 0.03, 0.42, 0.012, 0, 0.47, 0.01);
  k.tondo(M.guscio, 0.43, 0.3, 0.025, 0.012, 0, 0.74, -0.215, 0, -0.2);
  return k.monta();
}
function cucina(M) {
  const k = new Kit(), w = 1.0, h = 0.9, d = 0.6;
  k.tondo(M.bianco, w, h - 0.04, d, 0.008, 0, (h - 0.04) / 2, 0);
  k.box(M.inox, w + 0.01, 0.04, d + 0.01, 0, h - 0.02, 0);
  k.box(M.piastra, 0.34, 0.012, 0.3, -0.24, h + 0.001, 0.02);
  k.cil(M.piastra, 0.09, 0.016, 0.16, h + 0.004, -0.08, 0, 0, 18).cil(M.piastra, 0.075, 0.016, 0.34, h + 0.004, 0.1, 0, 0, 18);
  k.box(M.inox, 0.03, 0.2, 0.03, -0.24, h + 0.1, -0.24).box(M.inox, 0.03, 0.03, 0.14, -0.24, h + 0.2, -0.18);
  k.box(M.fessura, 0.006, h - 0.12, 0.004, 0, (h - 0.04) / 2, d / 2 + 0.002);
  k.box(M.argento, 0.012, 0.18, 0.016, -0.04, h - 0.25, d / 2 + 0.01).box(M.argento, 0.012, 0.18, 0.016, 0.04, h - 0.25, d / 2 + 0.01);
  return k.monta();
}
function frigo(M) {
  const k = new Kit(), w = 0.48, h = 0.85, d = 0.43;
  k.tondo(M.bianco, w, h, d, 0.012, 0, h / 2, 0);
  k.box(M.fessura, w - 0.02, 0.004, 0.004, 0, h - 0.06, d / 2 + 0.002);
  k.box(M.argento, 0.014, 0.2, 0.018, w / 2 - 0.05, h - 0.2, d / 2 + 0.01);
  return k.monta();
}
function lettoCastello(M) {
  // lunghezza lungo x (200 cm), larghezza lungo z (90 cm)
  const k = new Kit(), Lx = 2.0, Wz = 0.9, H1 = 1.6, r = 0.02;
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) k.cil(M.argento, r, H1, sx * (Lx / 2), H1 / 2, sz * (Wz / 2), 0, 0, 12);
  for (const y of [0.32, 1.17]) {
    for (const sz of [-1, 1]) k.tubo(M.argento, 0.016, [-Lx / 2, y, sz * Wz / 2], [Lx / 2, y, sz * Wz / 2]);
    for (const sx of [-1, 1]) k.tubo(M.argento, 0.016, [sx * Lx / 2, y, -Wz / 2], [sx * Lx / 2, y, Wz / 2]);
    for (let i = 1; i < 3; i++) k.tubo(M.argento, 0.008, [-Lx / 2 + i * Lx / 3, y, -Wz / 2], [-Lx / 2 + i * Lx / 3, y, Wz / 2]);
  }
  for (const sx of [-1, 1]) for (const y of [0.62, 1.45]) k.tubo(M.argento, 0.016, [sx * Lx / 2, y, -Wz / 2], [sx * Lx / 2, y, Wz / 2]);
  for (const sz of [-1, 1]) k.tubo(M.argento, 0.014, [-Lx / 2, 1.45, sz * Wz / 2], [Lx / 2, 1.45, sz * Wz / 2]);
  // scaletta sul lato lungo davanti
  const xs = Lx / 2 - 0.42;
  k.tubo(M.argento, 0.012, [xs - 0.17, 0.32, Wz / 2 + 0.02], [xs - 0.17, 1.45, Wz / 2 + 0.02]).tubo(M.argento, 0.012, [xs + 0.17, 0.32, Wz / 2 + 0.02], [xs + 0.17, 1.45, Wz / 2 + 0.02]);
  for (const y of [0.62, 0.9, 1.18]) k.tubo(M.argento, 0.01, [xs - 0.17, y, Wz / 2 + 0.02], [xs + 0.17, y, Wz / 2 + 0.02]);
  // materassi, lenzuola e cuscini
  for (const y of [0.33, 1.18]) {
    k.tondo(M.materasso, 1.9, 0.1, 0.86, 0.035, 0.02, y + 0.06, 0);
    k.tondo(M.lenzuolo, 1.2, 0.03, 0.88, 0.012, 0.32, y + 0.115, 0);
    k.tondo(M.lenzuolo, 0.26, 0.09, 0.56, 0.04, -0.78, y + 0.15, 0);
  }
  return k.monta();
}
function comodino(M) {
  const k = new Kit(), w = 0.4, h = 0.5, d = 0.5;
  k.tondo(M.ral, w, h, d, 0.006, 0, h / 2, 0);
  k.box(M.fessura, w - 0.04, 0.26, 0.02, 0, 0.17, d / 2 - 0.005);
  k.box(M.ral, w - 0.04, 0.012, d - 0.04, 0, 0.17, 0.0);
  k.box(M.argento, 0.1, 0.012, 0.012, 0, h - 0.07, d / 2 + 0.008);
  k.box(M.fessura, w - 0.02, 0.004, 0.004, 0, h - 0.13, d / 2 + 0.002);
  return k.monta();
}

/* ---------- magazzino: pavimento, portali blu, parete con portoni, scorte ---------- */
function costruisciMagazzino(M, tex) {
  const g = new THREE.Group();
  const pav = new THREE.Mesh(new THREE.PlaneGeometry(140, 140), new THREE.MeshStandardMaterial({ color: '#D3D6D6', roughness: 0.58, metalness: 0, map: tex.pavimento }));
  pav.rotation.x = -Math.PI / 2; pav.matrixAutoUpdate = true; g.add(pav);
  const k = new Kit();
  const zFila = -10, hCol = 7.2, passo = 7.5;
  for (let x = -37.5; x <= 37.5; x += passo) {
    k.box(M.blu, 0.36, hCol, 0.2, x, hCol / 2, zFila).box(M.blu, 0.06, hCol, 0.48, x, hCol / 2, zFila);
    k.box(M.blu, 0.42, 0.3, 0.6, x, 0.15, zFila);
    // capriata verso il colmo
    const a = [x, hCol, zFila], b = [x, hCol + 1.6, zFila + 11];
    k.tubo(M.blu, 0.2, a, b, 4);
    k.tubo(M.blu, 0.08, [x, hCol - 0.6, zFila], [x, hCol + 0.4, zFila + 3.4], 4);
    // colonne di mezzo, lontane e sui lati
    if (Math.abs(x) >= 15) k.box(M.blu, 0.36, hCol + 0.8, 0.3, x, (hCol + 0.8) / 2, zFila + 9);
  }
  for (const [z, y] of [[zFila, hCol], [zFila + 4, hCol + 0.6], [zFila + 8, hCol + 1.15]]) k.box(M.blu, 80, 0.26, 0.16, 0, y + 0.1, z);
  g.add(k.monta());
  // parete di fondo
  const tp = tex.parete; tp.repeat.set(1, 8 / 4);
  const parete = new THREE.Mesh(new THREE.PlaneGeometry(90, 9.5), new THREE.MeshStandardMaterial({ color: '#E2E6E7', roughness: 0.75, map: tp }));
  parete.position.set(0, 4.75, zFila - 1.6); g.add(parete);
  const portoneMat = new THREE.MeshStandardMaterial({ color: '#F0F2F2', roughness: 0.6, map: tex.portone });
  for (const x of [-26, -12, 9, 23]) {
    const p = new THREE.Mesh(new THREE.BoxGeometry(4.2, 4.6, 0.12), portoneMat);
    p.position.set(x, 2.3, zFila - 1.52); g.add(p);
  }
  // scorte imballate su bancali (magazzino sempre fornito)
  const s = new Kit();
  const pila = (x, z, file, ry = 0) => {
    s.box(M.pallet, 1.2, 0.14, 0.8, x, 0.07, z, ry);
    for (let i = 0; i < file; i++) s.box(i % 2 ? M.cartone : M.ral, 1.16, 0.32, 0.76, x, 0.14 + 0.16 + i * 0.33, z, ry);
  };
  pila(-9.5, -6.5, 5); pila(-8.1, -6.4, 3, 0.05); pila(-9.4, -5.3, 4, -0.04);
  pila(10.5, -7.2, 6); pila(11.9, -7.1, 4); pila(13.6, -6.0, 2, 0.3);
  pila(-15, -2, 3, 0.2);
  g.add(s.monta());
  return g;
}

/* ---------- allestimenti ---------- */
function allestimenti(M, serr) {
  const zr = (d) => -IZ + d / 2 + 0.01; // contro la parete di fondo
  const fila = [];
  // 1. spogliatoio
  fila.push([
    { fa: () => armadioSpogliatoio(M, 1.2, 4), x: -2.25, z: zr(0.5), w: 1.2, d: 0.5 },
    { fa: () => armadioSpogliatoio(M, 1.2, 4), x: -1.0, z: zr(0.5), w: 1.2, d: 0.5 },
    { fa: () => casellario(M), x: -0.02, z: zr(0.5), w: 0.7, d: 0.5 },
    { fa: () => armadioSpogliatoio(M, 0.6, 2), x: 0.68, z: zr(0.5), w: 0.6, d: 0.5 },
    { fa: () => pancaGuardaroba(M), x: 1.88, z: zr(0.38), w: 2.0, d: 0.38 },
    { fa: () => panca(M, 1.2), x: -1.6, z: 0.05, w: 1.2, d: 0.38 },
    { fa: () => panca(M, 1.2), x: 0.05, z: 0.05, w: 1.2, d: 0.38 },
  ]);
  // 2. ufficio di cantiere
  fila.push([
    { fa: () => armadio(M), x: -2.42, z: zr(0.42), w: 0.92, d: 0.42 },
    { fa: () => scrivania(M), x: -1.05, z: zr(0.8), w: 1.6, d: 0.8 },
    { fa: () => sediaGirevole(M), x: -1.15, z: 0.02, ry: Math.PI + 0.25, w: 0.6, d: 0.6 },
    { fa: () => cassettiera(M), x: 0.0, z: zr(0.6) + 0.02, w: 0.39, d: 0.6 },
    { fa: () => serrandina(M, serr), x: 1.0, z: zr(0.42), w: 1.2, d: 0.42 },
    { fa: () => armadio(M), x: 2.35, z: zr(0.42), w: 0.92, d: 0.42 },
    { fa: () => sediaGirevole(M), x: 1.25, z: 0.55, ry: -0.7, w: 0.6, d: 0.6 },
  ]);
  // 3. mensa
  const sedie = [];
  for (const x of [-2.25, -1.45, -0.65, 0.15]) {
    sedie.push({ fa: () => sediaImpilabile(M), x, z: -0.62, ry: 0, w: 0.45, d: 0.45 });
    sedie.push({ fa: () => sediaImpilabile(M), x, z: 0.62, ry: Math.PI, w: 0.45, d: 0.45 });
  }
  fila.push([
    { fa: () => tavolo(M, 1.6, 0.8), x: -1.85, z: 0, w: 1.6, d: 0.8 },
    { fa: () => tavolo(M, 1.6, 0.8), x: -0.25, z: 0, w: 1.6, d: 0.8 },
    ...sedie,
    { fa: () => cucina(M), x: IX - 0.31, z: -0.48, ry: -Math.PI / 2, w: 1.0, d: 0.6 },
    { fa: () => frigo(M), x: IX - 0.25, z: 0.42, ry: -Math.PI / 2, w: 0.48, d: 0.43 },
  ]);
  // 4. dormitorio
  fila.push([
    { fa: () => lettoCastello(M), x: -1.9, z: zr(0.9), w: 2.0, d: 0.9 },
    { fa: () => lettoCastello(M), x: 0.3, z: zr(0.9), w: 2.0, d: 0.9 },
    { fa: () => comodino(M), x: 1.6, z: zr(0.5), w: 0.4, d: 0.5 },
    { fa: () => armadio(M, 0.8, 1.8, 0.38), x: 2.45, z: zr(0.38), w: 0.8, d: 0.38 },
    { fa: () => armadio(M, 0.8, 1.8, 0.38), x: -2.45, z: 0.62, ry: Math.PI / 2, w: 0.8, d: 0.38 },
  ]);
  return fila;
}

/* ---------- regia ---------- */
export async function avvia({ canvas, palco, ridotto = false, pronto = () => {} }) {
  const mobile = matchMedia('(max-width: 760px)').matches || matchMedia('(pointer: coarse)').matches;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, mobile ? 1.5 : 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 1.0;

  const FONDO = new THREE.Color('#E5E9EB');
  const scena = new THREE.Scene();
  scena.background = FONDO;
  scena.fog = new THREE.Fog(FONDO, 17, 52);
  const pmrem = new THREE.PMREMGenerator(renderer);
  scena.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scena.environmentIntensity = 0.55;
  pmrem.dispose();
  scena.add(new THREE.HemisphereLight('#F6F9FC', '#A7ADB2', 1.15));
  const sole = new THREE.DirectionalLight('#FFFFFF', 1.55); sole.position.set(6, 12, 9); scena.add(sole);
  const contro = new THREE.DirectionalLight('#DCE6F3', 0.45); contro.position.set(-9, 6, -5); scena.add(contro);

  const M = materiali();
  const serr = std('#D9DDDA', 0.5, 0.2, { map: texSerranda() });
  const tex = { pavimento: texPavimento(140 / 24), portone: texPortone(), parete: texParete() };
  const ombraTex = texOmbra();
  const ombraMat = (op) => new THREE.MeshBasicMaterial({ map: ombraTex, transparent: true, opacity: op, depthWrite: false, color: '#ffffff' });

  scena.add(costruisciMagazzino(M, tex));

  // container sospeso: cala dalla gru all'avvio
  const container = new THREE.Group();
  const guscio = costruisciContainer(M);
  container.add(guscio);
  scena.add(container);
  const ombraCont = new THREE.Mesh(new THREE.PlaneGeometry(L * 1.55, W * 2.2), ombraMat(0.62));
  ombraCont.rotation.x = -Math.PI / 2; ombraCont.position.y = 0.004; scena.add(ombraCont);
  // ombra morbida alla base delle pareti interne
  const aoTex = canvasTex(8, 64, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, 'rgba(20,26,32,0)'); gr.addColorStop(1, 'rgba(20,26,32,.55)'); g.fillStyle = gr; g.fillRect(0, 0, w, h); });
  const ao = new THREE.Mesh(new THREE.PlaneGeometry(L - 0.34, 0.5), new THREE.MeshBasicMaterial({ map: aoTex, transparent: true, depthWrite: false, opacity: 0.55 }));
  ao.position.set(0, PAV + 0.25, -IZ + 0.017); container.add(ao);

  // arredi
  const pezzi = [];
  allestimenti(M, serr).forEach((set, si) => {
    set.forEach((p, i) => {
      const g = p.fa();
      const radice = new THREE.Group();
      radice.add(g);
      radice.position.set(p.x, PAV, p.z);
      radice.rotation.y = p.ry || 0;
      radice.visible = false;
      container.add(radice);
      const ombra = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), ombraMat(0.5));
      ombra.rotation.x = -Math.PI / 2;
      const ruota = Math.abs(Math.sin(p.ry || 0)) > 0.7;
      const sx = (ruota ? p.d : p.w) * 1.9, sy = (ruota ? p.w : p.d) * 1.9;
      ombra.scale.set(sx, sy, 1);
      ombra.position.set(p.x, PAV + 0.003, p.z);
      ombra.visible = false;
      container.add(ombra);
      pezzi.push({ radice, ombra, sx, sy, set: si + 1, i, n: set.length, ry: p.ry || 0, segno: i % 2 ? 1 : -1 });
    });
  });

  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 120);
  const bersaglio = new THREE.Vector3(0, 1.0, 0);

  /* inquadratura: regìa per passo (0 = hero) */
  const REGIA = [
    { az: -0.6, el: 0.47, k: 1.0 },
    { az: -0.36, el: 0.5, k: 0.92 },
    { az: -0.52, el: 0.58, k: 0.9 },
    { az: -0.26, el: 0.66, k: 0.92 },
    { az: -0.44, el: 0.5, k: 0.92 },
  ];
  let largh = 1, alt = 1;
  const ridimensiona = () => {
    largh = canvas.clientWidth || innerWidth; alt = canvas.clientHeight || innerHeight;
    renderer.setSize(largh, alt, false);
    camera.aspect = largh / alt;
    camera.updateProjectionMatrix();
  };
  ridimensiona();
  new ResizeObserver(ridimensiona).observe(canvas);

  const inquadra = (s) => {
    const a = camera.aspect;
    const ritratto = clamp((1.15 - a) / 0.55, 0, 1); // 1 = telefono in verticale
    const hero = 1 - sstep(0.15, 0.85, s);
    // dove sta il container sullo schermo (frazioni) e quanto spazio ha
    const fx = lerp(lerp(0.67, 0.68, 1 - hero), lerp(0.5, 0.535, hero), ritratto);
    const fy = lerp(lerp(0.56, 0.5, 1 - hero), lerp(0.355, 0.7, hero), ritratto);
    const semiW = lerp(lerp(0.4, 0.44, 1 - hero), lerp(0.86, 0.82, hero), ritratto);
    const semiH = lerp(lerp(0.6, 0.66, 1 - hero), lerp(0.36, 0.38, hero), ritratto);
    // regìa interpolata
    const i0 = clamp(Math.floor(s), 0, 4), i1 = clamp(i0 + 1, 0, 4), f = sstep(0, 1, s - i0);
    const r0 = REGIA[i0], r1 = REGIA[i1];
    return { fx, fy, semiW, semiH, az: lerp(r0.az, r1.az, f), el: lerp(r0.el, r1.el, f), k: lerp(r0.k, r1.k, f) };
  };

  const cam = { az: -0.75, el: 0.62, dist: 30, fx: 0.5, fy: 0.5 };
  let primo = true;
  const tanV = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
  const piazzaCamera = (q, dt, extraAz, extraEl, zoom) => {
    const tanH = tanV * camera.aspect;
    const rH = 3.35, rV = 2.1;
    const dist = Math.max(rH / (q.semiW * tanH), rV / (q.semiH * tanV)) * q.k * zoom;
    const a = primo ? 1 : 1 - Math.exp(-dt * 5);
    cam.az += (q.az + extraAz - cam.az) * a;
    cam.el += (q.el + extraEl - cam.el) * a;
    cam.dist += (dist - cam.dist) * a;
    cam.fx += (q.fx - cam.fx) * a; cam.fy += (q.fy - cam.fy) * a;
    primo = false;
    const c = Math.cos(cam.el);
    camera.position.set(bersaglio.x + Math.sin(cam.az) * c * cam.dist, bersaglio.y + Math.sin(cam.el) * cam.dist, bersaglio.z + Math.cos(cam.az) * c * cam.dist);
    camera.lookAt(bersaglio);
    camera.updateProjectionMatrix();
    const e = camera.projectionMatrix.elements;
    e[8] = -(2 * cam.fx - 1); e[9] = -(1 - 2 * cam.fy);
    camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert();
  };

  // puntatore (solo desktop): un filo di parallasse
  let px = 0, py = 0, pxS = 0, pyS = 0;
  if (matchMedia('(pointer: fine)').matches && !ridotto) addEventListener('pointermove', (e) => { px = e.clientX / innerWidth - 0.5; py = e.clientY / innerHeight - 0.5; }, { passive: true });

  /* ---------- animazione dei pezzi ---------- */
  const DROP = 3.4;
  const aggiornaPezzi = (s, tIntro) => {
    for (const p of pezzi) {
      const stag = p.i * Math.min(0.045, 0.3 / p.n);
      let ing;
      if (p.set === 1) ing = ridotto ? 1 : clamp((tIntro - 1.15 - p.i * 0.14) / 0.95, 0, 1);
      else ing = clamp((s - (p.set - 0.5) - stag) / 0.3, 0, 1);
      const usc = p.set === 4 ? 0 : clamp((s - (p.set + 0.12) - stag) / 0.3, 0, 1);
      const vis = ing > 0.001 && usc < 0.999;
      p.radice.visible = vis; p.ombra.visible = vis;
      if (!vis) continue;
      const ei = easeOut(ing), eu = easeIn(usc);
      p.radice.position.y = PAV + DROP * (1 - ei) + (DROP + 0.6) * eu;
      p.radice.rotation.y = p.ry + p.segno * (0.5 * (1 - ei) + 0.35 * eu);
      p.radice.rotation.z = p.segno * 0.12 * (1 - ei);
      const pres = ei * (1 - eu);
      p.ombra.material.opacity = 0.48 * pres * pres;
      const sc = 1 + 0.9 * (1 - pres);
      p.ombra.scale.set(p.sx * sc, p.sy * sc, 1);
    }
  };

  /* ---------- ciclo ---------- */
  await renderer.compileAsync(scena, camera).catch(() => {});
  let t0 = -1, ultimo = performance.now(), sS = window.HH ? window.HH.s : 0, attivo = true, visibile = true;
  const disegna = () => {
    const ora = performance.now();
    const dt = Math.min(0.05, (ora - ultimo) / 1000); ultimo = ora;
    if (t0 < 0) t0 = ora;
    const t = (ora - t0) / 1000;
    const tIntro = ridotto ? 99 : t;
    const s = window.HH ? window.HH.s : 0;
    sS += (s - sS) * (1 - Math.exp(-dt * 9));
    if (Math.abs(s - sS) < 0.0005) sS = s;
    // il container cala dalla gru
    const cal = ridotto ? 1 : easeOut(clamp(t / 1.3, 0, 1));
    container.position.y = 7.5 * (1 - cal);
    ombraCont.material.opacity = 0.62 * cal * cal;
    ombraCont.scale.setScalar(1 + 0.8 * (1 - cal));
    aggiornaPezzi(sS, tIntro);
    pxS += (px - pxS) * (1 - Math.exp(-dt * 3)); pyS += (py - pyS) * (1 - Math.exp(-dt * 3));
    const deriva = ridotto ? 0 : Math.sin(t * 0.16) * 0.05;
    const intro = ridotto ? 1 : easeOut(clamp(t / 2.6, 0, 1));
    const q = inquadra(sS);
    piazzaCamera(q, dt, deriva + pxS * 0.08 - (1 - intro) * 0.25, -pyS * 0.04 + (1 - intro) * 0.12, 1 + (1 - intro) * 0.22);
    renderer.render(scena, camera);
  };
  const giro = () => { if (!attivo) return; disegna(); requestAnimationFrame(giro); };
  const riprendi = () => { if (!attivo && visibile && !document.hidden) { attivo = true; ultimo = performance.now(); requestAnimationFrame(giro); } };

  new IntersectionObserver((v) => {
    visibile = v[0].isIntersecting;
    if (visibile) riprendi(); else attivo = false;
  }, { rootMargin: '80px' }).observe(canvas);
  document.addEventListener('visibilitychange', () => { if (document.hidden) attivo = false; else riprendi(); });

  disegna();
  pronto();
  t0 = performance.now();
  requestAnimationFrame(giro);
}
