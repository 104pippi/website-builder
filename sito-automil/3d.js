/* Automil — "Alza il tetto": un Westfalia T4 California costruito in codice.
   Lo guida lo scroll della sezione (progresso 0..1) più un respiro legato al tempo di requestAnimationFrame. */
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const liscio = (t) => t * t * (3 - 2 * t);
const tratto = (p, a, b) => liscio(clamp((p - a) / (b - a)));

export async function avvia({ sezione, canvas, progresso, ridotto }) {
  const mobile = matchMedia('(max-width: 899px), (pointer: coarse)').matches;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  if (!renderer.getContext()) throw new Error('WebGL non disponibile');
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, mobile ? 1.5 : 2));
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.localClippingEnabled = true;

  const scena = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scena.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scena.environmentIntensity = 0.75;
  pmrem.dispose();

  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 80);

  /* ---------- luci ---------- */
  const cielo = new THREE.HemisphereLight('#d6ebe6', '#3a2e26', 0.9);
  const sole = new THREE.DirectionalLight('#fff4e6', 2.2); sole.position.set(5, 8, 6);
  const contro = new THREE.DirectionalLight('#9cd3cc', 0.9); contro.position.set(-6, 4, -5);
  const dentro = new THREE.PointLight('#ffb26b', 0, 4.5, 1.6); dentro.position.set(-0.2, 1.45, -0.1);
  const lanterna = new THREE.PointLight('#ffb36b', 0, 6, 1.5);
  scena.add(cielo, sole, contro);

  /* ---------- materiali ---------- */
  const taglio = new THREE.Plane(new THREE.Vector3(0, 0, -1), 4);
  const cp = [taglio];
  const M = (o, clip = true) => new THREE.MeshStandardMaterial({ ...o, ...(clip ? { clippingPlanes: cp } : {}) });
  const vernice = new THREE.MeshPhysicalMaterial({ color: '#A91F26', roughness: 0.32, metalness: 0.1, clearcoat: 1, clearcoatRoughness: 0.1, clippingPlanes: cp });
  const rivestimento = M({ color: '#7f8a87', roughness: 0.95, side: THREE.BackSide });
  const vetro = M({ color: '#0d171b', roughness: 0.06, metalness: 0.3, emissive: '#ffad62', emissiveIntensity: 0 });
  const nero = M({ color: '#1a1d1f', roughness: 0.65 });
  const gomma = M({ color: '#141516', roughness: 0.92 }, false);
  const cerchio = M({ color: '#c8ccd0', roughness: 0.28, metalness: 0.85 }, false);
  const mozzo = M({ color: '#1a1d1f', roughness: 0.5, metalness: 0.4 }, false);
  const passaruota = M({ color: '#0f1112', roughness: 1, side: THREE.DoubleSide });
  const faro = M({ color: '#e9edf0', roughness: 0.1, metalness: 0.2, emissive: '#fff3d6', emissiveIntensity: 0.05 });
  const freccia = M({ color: '#e88a2a', roughness: 0.3, emissive: '#e8691e', emissiveIntensity: 0.1 });
  const stop = M({ color: '#7d1015', roughness: 0.3, emissive: '#c0141c', emissiveIntensity: 0.05 });
  const pavimento = M({ color: '#5a4d40', roughness: 0.7, side: THREE.DoubleSide });
  const mobili = M({ color: '#d8cdb8', roughness: 0.55, side: THREE.DoubleSide });
  const ante = M({ color: '#c6b99f', roughness: 0.45 });
  const piano = M({ color: '#4c5455', roughness: 0.35, side: THREE.DoubleSide });
  const metallo = M({ color: '#b9bec2', roughness: 0.25, metalness: 0.9 });
  const tessuto = M({ color: '#3c454a', roughness: 0.95, side: THREE.DoubleSide });
  const cruscotto = M({ color: '#25292b', roughness: 0.7 });
  const cielino = M({ color: '#d8d5cc', roughness: 0.95, side: THREE.DoubleSide });
  // pezzi che si accendono quando il passo li indica
  const evidenza = (base) => { const m = base.clone(); m.emissive = new THREE.Color('#e8691e'); m.emissiveIntensity = 0; return m; };
  const matMaterasso = evidenza(M({ color: '#BFC4BC', roughness: 0.95, side: THREE.DoubleSide }));
  const matCucina = evidenza(M({ color: '#202426', roughness: 0.15, metalness: 0.4 }));
  const matFrigo = evidenza(M({ color: '#DADCD8', roughness: 0.35 }));
  const matStufa = evidenza(M({ color: '#2b2f31', roughness: 0.5, metalness: 0.4, side: THREE.DoubleSide }));
  const matBatteria = evidenza(M({ color: '#2a3036', roughness: 0.55, side: THREE.DoubleSide }));

  const mesh = (g, m, x = 0, y = 0, z = 0) => { const o = new THREE.Mesh(g, m); o.position.set(x, y, z); return o; };
  const box = (w, h, d, m, x, y, z, r = 0) => mesh(r ? new RoundedBoxGeometry(w, h, d, 2, r) : new THREE.BoxGeometry(w, h, d), m, x, y, z);

  /* ---------- pedana e furgone ---------- */
  const pedana = new THREE.Group();
  scena.add(pedana);
  const furgone = new THREE.Group();
  pedana.add(furgone);

  // carrozzeria: profilo laterale estruso sulla larghezza, spigoli arrotondati
  const B = 0.05, L2 = 2.34, W = 1.84, D = W - 2 * B;
  const s = new THREE.Shape();
  s.moveTo(-L2 + 0.04, 0.36);
  s.lineTo(-1.84, 0.33);
  s.absarc(-1.42, 0.36, 0.40, Math.PI, 0, true);
  s.lineTo(1.08, 0.33);
  s.absarc(1.48, 0.36, 0.40, Math.PI, 0, true);
  s.lineTo(2.22, 0.33);
  s.quadraticCurveTo(L2, 0.33, L2, 0.48);
  s.lineTo(L2, 0.93);
  s.quadraticCurveTo(L2, 1.02, 2.26, 1.04);
  s.lineTo(2.0, 1.12);
  s.lineTo(1.34, 1.74);
  s.quadraticCurveTo(1.27, 1.81, 1.14, 1.81);
  s.lineTo(-2.22, 1.81);
  s.quadraticCurveTo(-L2 + 0.02, 1.81, -L2, 1.70);
  s.lineTo(-L2, 0.48);
  s.quadraticCurveTo(-L2, 0.36, -L2 + 0.04, 0.36);
  const gCarr = new THREE.ExtrudeGeometry(s, { depth: D, bevelEnabled: true, bevelThickness: B, bevelSize: B, bevelSegments: 4, curveSegments: 22 });
  gCarr.translate(0, 0, -D / 2);
  furgone.add(new THREE.Mesh(gCarr, vernice), new THREE.Mesh(gCarr, rivestimento));

  // vetri laterali (a destra +z, a sinistra -z)
  const zLato = W / 2 + 0.004;
  const finestra = (pts, lato) => {
    const sh = new THREE.Shape(pts.map(([x, y]) => new THREE.Vector2(lato > 0 ? x : -x, y)));
    const m = new THREE.Mesh(new THREE.ShapeGeometry(sh), vetro);
    m.position.z = lato * zLato;
    if (lato < 0) m.rotation.y = Math.PI;
    furgone.add(m);
  };
  const tonda = (x0, x1, y0, y1, r = 0.05) => {
    const p = [];
    const ang = (cx, cy, a0) => { for (let i = 0; i <= 4; i++) { const a = a0 + (i / 4) * Math.PI / 2; p.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); } };
    ang(x1 - r, y0 + r, -Math.PI / 2); ang(x1 - r, y1 - r, 0); ang(x0 + r, y1 - r, Math.PI / 2); ang(x0 + r, y0 + r, Math.PI);
    return p;
  };
  for (const lato of [1, -1]) {
    finestra([[1.06, 1.15], [1.86, 1.15], [1.86, 1.2], [1.30, 1.67], [1.06, 1.67]], lato);
    finestra(tonda(0.02, 0.98, 1.15, 1.67), lato);
    finestra(tonda(-1.12, -0.08, 1.15, 1.67), lato);
    finestra(tonda(-2.14, -1.24, 1.15, 1.67), lato);
  }
  // parabrezza: segue l'inclinazione del profilo, spostato fuori dello smusso
  {
    const n = new THREE.Vector2(0.685, 0.729).multiplyScalar(B + 0.006);
    const a = [2.0 - 0.03 + n.x, 1.12 + 0.03 + n.y], b = [1.34 + 0.03 + n.x, 1.74 - 0.03 + n.y];
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute([
      a[0], a[1], -0.84, a[0], a[1], 0.84, b[0], b[1], 0.8, b[0], b[1], -0.8,
    ], 3));
    g.setIndex([0, 1, 2, 0, 2, 3]);
    g.computeVertexNormals();
    const m = new THREE.Mesh(g, vetro);
    m.material.side = THREE.DoubleSide;
    furgone.add(m);
  }
  // lunotto
  {
    const m = new THREE.Mesh(new THREE.ShapeGeometry(new THREE.Shape(tonda(-0.74, 0.74, 1.14, 1.66).map(([x, y]) => new THREE.Vector2(x, y)))), vetro);
    m.rotation.y = -Math.PI / 2; m.position.x = -L2 - B - 0.004;
    furgone.add(m);
  }

  // muso, paraurti, fari
  const xMuso = L2 + B;
  furgone.add(
    box(0.03, 0.13, 0.86, nero, xMuso + 0.005, 0.86, 0, 0.01),
    box(0.03, 0.13, 0.27, faro, xMuso + 0.008, 0.86, 0.62, 0.012),
    box(0.03, 0.13, 0.27, faro, xMuso + 0.008, 0.86, -0.62, 0.012),
    box(0.03, 0.13, 0.08, freccia, xMuso + 0.008, 0.86, 0.81, 0.01),
    box(0.03, 0.13, 0.08, freccia, xMuso + 0.008, 0.86, -0.81, 0.01),
    box(0.2, 0.25, W + 0.04, nero, L2 + 0.02, 0.43, 0, 0.06),
    box(0.2, 0.25, W + 0.04, nero, -L2 - 0.02, 0.43, 0, 0.06),
    box(0.03, 0.06, 0.6, nero, L2 + 0.13, 0.43, 0, 0.01),
    box(0.03, 0.38, 0.13, stop, -L2 - B - 0.006, 0.76, 0.8, 0.01),
    box(0.03, 0.38, 0.13, stop, -L2 - B - 0.006, 0.76, -0.8, 0.01),
  );
  for (const z of [1, -1]) {
    const sp = box(0.1, 0.17, 0.15, nero, 1.83, 1.32, z * (W / 2 + 0.12), 0.03);
    const braccio = box(0.05, 0.03, 0.14, nero, 1.86, 1.28, z * (W / 2 + 0.05));
    furgone.add(sp, braccio);
  }

  // fughe delle porte, binario della porta scorrevole, maniglie
  const fuga = M({ color: '#3a0d10', roughness: 0.6 });
  for (const lato of [1, -1]) {
    const z = lato * (W / 2 + 0.003);
    furgone.add(box(0.012, 1.28, 0.006, fuga, 1.02, 1.06, z), box(0.012, 0.66, 0.006, fuga, 1.98, 0.74, z));
    furgone.add(box(0.13, 0.03, 0.012, nero, 0.88, 1.05, z + lato * 0.004));
    if (lato > 0) furgone.add(box(0.012, 1.28, 0.006, fuga, -0.06, 1.06, z), box(1.2, 0.022, 0.01, nero, -0.7, 1.11, z + 0.003), box(0.13, 0.03, 0.012, nero, 0.1, 1.05, z + 0.004));
    else furgone.add(box(0.012, 1.28, 0.006, fuga, -0.06, 1.06, z));
  }
  // targhe come quelle vere del piazzale
  const tTarga = (() => { const c = document.createElement('canvas'); c.width = 512; c.height = 112; const x = c.getContext('2d');
    x.fillStyle = '#f4f4f0'; x.fillRect(0, 0, 512, 112); x.strokeStyle = '#1b1b1b'; x.lineWidth = 6; x.strokeRect(4, 4, 504, 104);
    x.fillStyle = '#151515'; x.font = '800 66px Archivo, Arial, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('AUTOMIL.IT', 256, 60);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t; })();
  const matTarga = M({ map: tTarga, roughness: 0.45 });
  const targa = new THREE.PlaneGeometry(0.52, 0.114);
  const tAnt = mesh(targa, matTarga, L2 + 0.125, 0.43, 0); tAnt.rotation.y = Math.PI / 2;
  const tPost = mesh(targa, matTarga, -L2 - 0.125, 0.43, 0); tPost.rotation.y = -Math.PI / 2;
  furgone.add(tAnt, tPost);

  // ruote e passaruota
  const gGomma = new THREE.CylinderGeometry(0.325, 0.325, 0.215, 36); gGomma.rotateX(Math.PI / 2);
  const gCerchio = new THREE.CylinderGeometry(0.19, 0.19, 0.222, 28); gCerchio.rotateX(Math.PI / 2);
  const gMozzo = new THREE.CylinderGeometry(0.06, 0.06, 0.232, 16); gMozzo.rotateX(Math.PI / 2);
  const gPassa = new THREE.CylinderGeometry(0.405, 0.405, W - 0.06, 28, 1, true, Math.PI / 2, Math.PI); gPassa.rotateX(Math.PI / 2);
  const ruoteVicine = [];   // lato destro: spariscono quando il furgone si apre in sezione
  for (const x of [-1.42, 1.48]) {
    furgone.add(mesh(gPassa, passaruota, x, 0.36, 0));
    for (const z of [1, -1]) {
      const zr = z * (W / 2 - 0.12);
      const r = new THREE.Group();
      r.add(mesh(gGomma, gomma, x, 0.325, zr), mesh(gCerchio, cerchio, x, 0.325, zr), mesh(gMozzo, mozzo, x, 0.325, zr));
      furgone.add(r);
      if (z > 0) ruoteVicine.push(r);
    }
  }

  /* ---------- tetto a soffietto ---------- */
  const yTetto = 1.81 + B;            // filo del tetto
  const xCerniera = -2.16;
  const cerniera = new THREE.Group();
  cerniera.position.set(xCerniera, yTetto, 0);
  furgone.add(cerniera);
  {
    const r = 0.14, x0 = -2.22, x1 = 1.14, z0 = -0.87, z1 = 0.87;
    const sh = new THREE.Shape();
    sh.moveTo(x0 + r, z0); sh.lineTo(x1 - r, z0); sh.quadraticCurveTo(x1, z0, x1, z0 + r); sh.lineTo(x1, z1 - r);
    sh.quadraticCurveTo(x1, z1, x1 - r, z1); sh.lineTo(x0 + r, z1); sh.quadraticCurveTo(x0, z1, x0, z1 - r); sh.lineTo(x0, z0 + r);
    sh.quadraticCurveTo(x0, z0, x0 + r, z0);
    const g = new THREE.ExtrudeGeometry(sh, { depth: 0.05, bevelEnabled: true, bevelThickness: 0.025, bevelSize: 0.025, bevelSegments: 3, curveSegments: 8 });
    g.rotateX(Math.PI / 2);              // spessore verso il basso, poi lo rialzo
    g.translate(-xCerniera, 0.075 + 0.004, 0);
    const coperchio = new THREE.Mesh(g, vernice);
    const fodera = box(3.2, 0.01, 1.62, cielino, (x0 + x1) / 2 - xCerniera, 0.004, 0);
    cerniera.add(coperchio, fodera);
  }
  const angoloMax = 0.30;

  // telo a fisarmonica tra il tetto e il coperchio: geometria ricalcolata quando il tetto si muove
  const giro = (() => {
    const x0 = -2.12, x1 = 1.06, z0 = -0.8, z1 = 0.8, r = 0.1, pts = [];
    const segmento = (ax, az, bx, bz, n) => { for (let i = 0; i < n; i++) { const t = i / n; pts.push([lerp(ax, bx, t), lerp(az, bz, t)]); } };
    const curva = (cx, cz, a0, n) => { for (let i = 0; i < n; i++) { const a = a0 + (i / n) * Math.PI / 2; pts.push([cx + Math.cos(a) * r, cz + Math.sin(a) * r]); } };
    segmento(x1, z0 + r, x1, z1 - r, 14); curva(x1 - r, z1 - r, 0, 3);          // davanti
    segmento(x1 - r, z1, x0 + r, z1, 26); curva(x0 + r, z1 - r, Math.PI / 2, 3); // lato destro
    segmento(x0, z1 - r, x0, z0 + r, 10); curva(x0 + r, z0 + r, Math.PI, 3);     // dietro
    segmento(x0 + r, z0, x1 - r, z0, 26); curva(x1 - r, z0 + r, -Math.PI / 2, 3); // lato sinistro
    pts.push(pts[0]);
    let lung = 0; const out = [];
    pts.forEach((p, i) => { if (i) lung += Math.hypot(p[0] - pts[i - 1][0], p[1] - pts[i - 1][1]); out.push({ x: p[0], z: p[1], s: lung }); });
    out.forEach((p) => { p.u = p.s / lung; const cx = (x0 + x1) / 2; const dx = p.x - cx, dz = p.z; const k = Math.hypot(dx / 1.6, dz / 0.8) || 1; p.nx = dx / 1.6 / k; p.nz = dz / 0.8 / k; });
    return out;
  })();
  const RIGHE = 10, NG = giro.length;
  const gTelo = new THREE.BufferGeometry();
  const posTelo = new Float32Array(NG * (RIGHE + 1) * 3);
  const uvTelo = new Float32Array(NG * (RIGHE + 1) * 2);
  const idxTelo = [];
  for (let j = 0; j <= RIGHE; j++) for (let i = 0; i < NG; i++) { uvTelo.set([giro[i].u, j / RIGHE], (j * NG + i) * 2); }
  for (let j = 0; j < RIGHE; j++) for (let i = 0; i < NG - 1; i++) {
    const a = j * NG + i, b = a + 1, c = a + NG, d = c + 1;
    idxTelo.push(a, b, d, a, d, c);
  }
  gTelo.setAttribute('position', new THREE.BufferAttribute(posTelo, 3));
  gTelo.setAttribute('uv', new THREE.BufferAttribute(uvTelo, 2));
  gTelo.setIndex(idxTelo);

  // trama del telo con le finestre a zip (la stessa mappa fa luce di notte)
  const trama = (() => {
    const cw = 2048, ch = 220, c = document.createElement('canvas'); c.width = cw; c.height = ch;
    const e = document.createElement('canvas'); e.width = cw; e.height = ch;
    const x = c.getContext('2d'), y = e.getContext('2d');
    x.fillStyle = '#4a5157'; x.fillRect(0, 0, cw, ch);
    for (let i = 0; i < 9000; i++) { x.fillStyle = `rgba(${Math.random() < .5 ? '255,255,255' : '0,0,0'},${Math.random() * 0.05})`; x.fillRect(Math.random() * cw, Math.random() * ch, 2, 1); }
    x.fillStyle = 'rgba(0,0,0,.22)'; x.fillRect(0, 0, cw, 10);
    x.fillStyle = 'rgba(255,255,255,.12)'; x.fillRect(0, ch - 8, cw, 3);
    y.fillStyle = '#000'; y.fillRect(0, 0, cw, ch);
    const uDi = (cond) => { const v = giro.filter(cond).map((p) => p.u); return [Math.min(...v), Math.max(...v)]; };
    const finestreTelo = [
      [...uDi((p) => p.x > 1.0 && Math.abs(p.z) < 0.62), 0.22, 0.86],
      [...uDi((p) => p.z > 0.79 && p.x > -0.15 && p.x < 0.85), 0.36, 0.86],
      [...uDi((p) => p.z < -0.79 && p.x > -0.15 && p.x < 0.85), 0.36, 0.86],
    ];
    for (const [u0, u1, v0, v1] of finestreTelo) {
      const X = u0 * cw + 6, Wd = (u1 - u0) * cw - 12, Y = (1 - v1) * ch, H = (v1 - v0) * ch;
      x.fillStyle = '#20262a'; x.beginPath(); x.roundRect(X, Y, Wd, H, 14); x.fill();
      x.strokeStyle = '#7a8389'; x.lineWidth = 4; x.setLineDash([6, 4]); x.stroke(); x.setLineDash([]);
      for (let k = 1; k < 9; k++) { x.fillStyle = 'rgba(255,255,255,.05)'; x.fillRect(X + (Wd / 9) * k, Y, 1, H); }
      y.fillStyle = '#fff'; y.beginPath(); y.roundRect(X + 4, Y + 4, Wd - 8, H - 8, 12); y.fill();
    }
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
    const te = new THREE.CanvasTexture(e); te.colorSpace = THREE.SRGBColorSpace;
    return { t, te };
  })();
  const matTelo = new THREE.MeshStandardMaterial({ map: trama.t, emissiveMap: trama.te, emissive: '#ffae66', emissiveIntensity: 0, roughness: 0.95, side: THREE.DoubleSide, clippingPlanes: cp });
  const telo = new THREE.Mesh(gTelo, matTelo);
  furgone.add(telo);

  let ultimaApertura = -1;
  const aggiornaTelo = (aperto) => {
    if (Math.abs(aperto - ultimaApertura) < 1e-4) return;
    ultimaApertura = aperto;
    const a = angoloMax * aperto, ca = Math.cos(a), sa = Math.sin(a);
    cerniera.rotation.z = a;
    const pieghe = 4;
    for (let j = 0; j <= RIGHE; j++) {
      const t = j / RIGHE;
      for (let i = 0; i < NG; i++) {
        const p = giro[i];
        const dx = p.x - xCerniera;
        const xt = xCerniera + dx * ca, yt = yTetto + dx * sa + 0.004;
        const h = Math.max(0, dx * sa);
        const amp = Math.min(0.055, h * 0.22) * (1 - aperto * 0.82);
        const piega = -Math.abs(Math.sin(t * Math.PI * pieghe)) * amp - Math.sin(t * Math.PI) * h * 0.035;
        const k = (j * NG + i) * 3;
        posTelo[k] = lerp(p.x, xt, t) + p.nx * piega;
        posTelo[k + 1] = lerp(yTetto - 0.01, yt, t);
        posTelo[k + 2] = p.z + p.nz * piega;
      }
    }
    gTelo.attributes.position.needsUpdate = true;
    gTelo.computeVertexNormals();
    gTelo.computeBoundingSphere();
  };

  /* ---------- interni ---------- */
  const interni = new THREE.Group();
  furgone.add(interni);
  interni.add(
    box(4.3, 0.04, 1.72, pavimento, -0.12, 0.44, 0),
    box(0.44, 0.24, 1.66, cruscotto, 2.0, 1.0, 0, 0.04),
  );
  // sedili anteriori: il destro nasconde il Webasto
  const sedile = (z, base) => {
    const g = new THREE.Group();
    g.add(box(0.52, 0.30, 0.52, base, 0, 0.62, 0), box(0.5, 0.1, 0.52, tessuto, 0.02, 0.82, 0, 0.04));
    const sch = box(0.12, 0.66, 0.5, tessuto, -0.26, 1.16, 0, 0.05); sch.rotation.z = 0.14; g.add(sch);
    g.add(box(0.1, 0.12, 0.3, tessuto, -0.31, 1.56, 0, 0.04));
    g.position.set(1.42, 0, z);
    return g;
  };
  const baseSedile = M({ color: '#2b3034', roughness: 0.8, side: THREE.DoubleSide });
  interni.add(sedile(-0.44, baseSedile), sedile(0.47, baseSedile));
  const volante = new THREE.Mesh(new THREE.TorusGeometry(0.19, 0.02, 10, 32), cruscotto);
  volante.position.set(1.84, 1.2, -0.44); volante.rotation.set(0, Math.PI / 2, 0.5, 'ZYX'); interni.add(volante);
  const stufa = box(0.34, 0.13, 0.15, matStufa, 1.42, 0.55, 0.33, 0.02);
  const griglia = box(0.01, 0.06, 0.11, M({ color: '#ff8a3a', emissive: '#ff6a1a', emissiveIntensity: 0.6 }), 1.6, 0.55, 0.33);
  interni.add(stufa, griglia);

  // blocco cucina sul lato sinistro, frigo in fondo
  interni.add(box(1.9, 0.78, 0.42, mobili, -0.05, 0.85, -0.65));
  interni.add(box(1.94, 0.035, 0.46, piano, -0.05, 1.258, -0.64));
  const fornello = box(0.44, 0.012, 0.32, matCucina, 0.55, 1.282, -0.64, 0.004);
  interni.add(fornello);
  for (const x of [0.44, 0.66]) {
    const f = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.009, 8, 24), metallo);
    f.rotation.x = Math.PI / 2; f.position.set(x, 1.292, -0.64); interni.add(f);
  }
  const lavello = box(0.3, 0.012, 0.26, matCucina, 0.02, 1.28, -0.64, 0.004);
  const rubinetto = mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.16, 10), metallo, -0.1, 1.35, -0.78);
  interni.add(lavello, rubinetto);
  for (const [x, w] of [[0.62, 0.52], [0.06, 0.5]]) {
    interni.add(box(w, 0.6, 0.01, ante, x, 0.84, -0.437), box(0.12, 0.018, 0.02, metallo, x, 1.08, -0.428));
  }
  const frigo = box(0.46, 0.66, 0.012, matFrigo, -0.72, 0.84, -0.436, 0.006);
  const maniglia = box(0.02, 0.22, 0.02, metallo, -0.53, 0.92, -0.425);
  interni.add(frigo, maniglia);
  interni.add(box(2.7, 0.22, 0.3, mobili, -0.62, 1.64, -0.74));
  // divano posteriore che diventa letto, con la batteria dei servizi sotto
  const baseDivano = box(0.62, 0.36, 1.66, M({ color: '#d9d2c3', roughness: 0.6, side: THREE.DoubleSide }), -1.72, 0.64, 0);
  interni.add(baseDivano, box(0.62, 0.13, 1.62, tessuto, -1.7, 0.885, 0, 0.05));
  const schienale = box(0.15, 0.66, 1.62, tessuto, -2.05, 1.24, 0, 0.06); schienale.rotation.z = 0.12; interni.add(schienale);
  const batteria = box(0.30, 0.2, 0.17, matBatteria, -1.74, 0.57, 0.27, 0.02);
  const poli = [M({ color: '#c0262b', roughness: 0.4 }), cruscotto].map((m, i) => mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.04, 10), m, -1.82 + i * 0.16, 0.69, 0.27));
  interni.add(batteria, ...poli);
  // letto nel tetto
  const materasso = box(1.98, 0.08, 1.46, matMaterasso, 0.03, yTetto + 0.045, 0, 0.03);
  interni.add(materasso);
  for (const z of [-0.35, 0.35]) interni.add(box(0.3, 0.05, 0.5, M({ color: '#ECEAE3', roughness: 0.9 }), 0.82, yTetto + 0.075, z, 0.02));
  dentro.position.set(-0.2, 1.45, -0.1);
  furgone.add(dentro);

  /* ---------- fuori: pedana, ombra, veranda, sedie ---------- */
  const tex = (w, h, draw) => { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; };
  const tPedana = tex(1024, 1024, (x, w) => {
    const g = x.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
    g.addColorStop(0, 'rgba(210,225,220,.20)'); g.addColorStop(0.75, 'rgba(210,225,220,.10)'); g.addColorStop(1, 'rgba(210,225,220,0)');
    x.fillStyle = g; x.fillRect(0, 0, w, w);
    x.strokeStyle = 'rgba(220,235,230,.16)'; x.lineWidth = 2;
    for (let r = 120; r < 480; r += 90) { x.beginPath(); x.arc(w / 2, w / 2, r, 0, Math.PI * 2); x.stroke(); }
    for (let a = 0; a < 24; a++) { const t = (a / 24) * Math.PI * 2; x.beginPath(); x.moveTo(w / 2 + Math.cos(t) * 400, w / 2 + Math.sin(t) * 400); x.lineTo(w / 2 + Math.cos(t) * 470, w / 2 + Math.sin(t) * 470); x.stroke(); }
    x.strokeStyle = 'rgba(232,105,30,.75)'; x.lineWidth = 5; x.beginPath(); x.arc(w / 2, w / 2, 486, 0, Math.PI * 2); x.stroke();
  });
  const disco = new THREE.Mesh(new THREE.CircleGeometry(3.9, 96), new THREE.MeshBasicMaterial({ map: tPedana, transparent: true, depthWrite: false }));
  disco.rotation.x = -Math.PI / 2; disco.position.y = 0.002;
  pedana.add(disco);
  const tOmbra = tex(512, 256, (x, w, h) => { x.filter = 'blur(26px)'; x.fillStyle = 'rgba(0,0,0,.85)'; x.beginPath(); x.roundRect(70, 60, w - 140, h - 120, 50); x.fill(); });
  const ombra = new THREE.Mesh(new THREE.PlaneGeometry(5.6, 2.6), new THREE.MeshBasicMaterial({ map: tOmbra, transparent: true, depthWrite: false, opacity: 0.75 }));
  ombra.rotation.x = -Math.PI / 2; ombra.position.y = 0.006;
  furgone.add(ombra);
  const tCalore = tex(256, 256, (x, w) => { const g = x.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2); g.addColorStop(0, 'rgba(255,170,90,.9)'); g.addColorStop(1, 'rgba(255,170,90,0)'); x.fillStyle = g; x.fillRect(0, 0, w, w); });
  const pozza = new THREE.Mesh(new THREE.PlaneGeometry(4.4, 4.4), new THREE.MeshBasicMaterial({ map: tCalore, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0 }));
  pozza.rotation.x = -Math.PI / 2; pozza.position.set(-0.3, 0.01, 2.0);
  furgone.add(pozza);

  // tenda veranda: si srotola dal binario sul lato destro
  const veranda = new THREE.Group();
  furgone.add(veranda);
  const cassonetto = box(2.7, 0.09, 0.1, M({ color: '#9ea4a6', roughness: 0.45, metalness: 0.3 }, false), -0.55, 1.79, W / 2 + 0.06, 0.03);
  veranda.add(cassonetto);
  const tTenda = tex(512, 256, (x, w, h) => { x.fillStyle = '#d6d0c1'; x.fillRect(0, 0, w, h); x.fillStyle = 'rgba(0,0,0,.05)'; for (let i = 0; i < w; i += 64) x.fillRect(i, 0, 32, h); x.fillStyle = '#2f5d5f'; x.fillRect(0, h - 26, w, 26); });
  const tenda = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 1), new THREE.MeshStandardMaterial({ map: tTenda, roughness: 0.9, side: THREE.DoubleSide }));
  const gamba = new THREE.CylinderGeometry(0.018, 0.018, 1, 8);
  const matGamba = M({ color: '#c9cdd0', roughness: 0.3, metalness: 0.8 }, false);
  const gambe = [mesh(gamba, matGamba), mesh(gamba, matGamba)];
  veranda.add(tenda, ...gambe);
  const aggiornaVeranda = (e) => {
    const prof = 0.02 + 2.15 * e, z0 = W / 2 + 0.08, y0 = 1.77, y1 = 1.77 - 0.17 * e;
    tenda.scale.set(1, prof, 1);
    tenda.position.set(-0.55, (y0 + y1) / 2, z0 + prof / 2);
    tenda.rotation.set(-Math.PI / 2 + Math.atan2(y0 - y1, prof), 0, 0);
    gambe.forEach((g, i) => { g.position.set(-0.55 + (i ? 1.2 : -1.2), y1 / 2, z0 + prof); g.scale.y = y1 * clamp(e * 3 - 2); g.position.y = (y1 * clamp(e * 3 - 2)) / 2; g.visible = e > 0.67; });
    tenda.visible = e > 0.001;
  };

  // sedie, tavolino e lanterna
  const campo = new THREE.Group();
  furgone.add(campo);
  const tela = M({ color: '#2f5d5f', roughness: 0.9, side: THREE.DoubleSide }, false);
  const tubo = M({ color: '#1d2224', roughness: 0.5, metalness: 0.6 }, false);
  const sediaDaCampo = (x, z, ry) => {
    const g = new THREE.Group();
    g.add(box(0.46, 0.03, 0.42, tela, 0, 0.44, 0));
    const sch = box(0.46, 0.42, 0.02, tela, 0, 0.7, -0.22); sch.rotation.x = -0.18; g.add(sch);
    const gt = new THREE.CylinderGeometry(0.012, 0.012, 0.62, 6);
    for (const sx of [-0.22, 0.22]) for (const sz of [-1, 1]) { const l = mesh(gt, tubo, sx, 0.23, 0); l.rotation.x = sz * 0.62; g.add(l); }
    g.position.set(x, 0, z); g.rotation.y = ry;
    return g;
  };
  const tavolo = new THREE.Group();
  tavolo.add(box(0.62, 0.025, 0.46, M({ color: '#e6e1d4', roughness: 0.6 }, false), 0, 0.62, 0, 0.01));
  for (const sx of [-0.27, 0.27]) for (const sz of [-0.19, 0.19]) tavolo.add(mesh(new THREE.CylinderGeometry(0.011, 0.011, 0.62, 6), tubo, sx, 0.31, sz));
  const luce = mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.15, 16), new THREE.MeshStandardMaterial({ color: '#ffd9a8', emissive: '#ffb066', emissiveIntensity: 0 }), 0.1, 0.71, 0);
  tavolo.add(luce);
  lanterna.position.set(0.1, 0.85, 0); tavolo.add(lanterna);
  tavolo.position.set(-0.35, 0, 2.15);
  const sedie = [sediaDaCampo(0.45, 2.05, -Math.PI / 2 - 0.35), sediaDaCampo(-1.15, 2.05, Math.PI / 2 + 0.35)];
  campo.add(tavolo, ...sedie);
  const pezziCampo = [sedie[0], tavolo, sedie[1]];

  /* ---------- camera: una tappa per passo ---------- */
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  const tappe = [
    { p: V(6.6, 2.3, 7.6), t: V(0, 1.1, 0) },          // ingresso
    { p: V(5.6, 3.7, 6.4), t: V(-0.3, 1.6, 0) },       // soffietto
    { p: V(1.0, 4.1, 5.0), t: V(-0.1, 1.85, -0.2) },   // letto
    { p: V(0.7, 2.0, 4.5), t: V(0.0, 1.05, -0.5) },    // cucina
    { p: V(-0.2, 1.55, 3.3), t: V(-0.75, 0.82, -0.5) },// frigo
    { p: V(2.7, 1.35, 3.3), t: V(1.42, 0.58, 0.25) },  // webasto
    { p: V(-0.5, 1.35, 3.3), t: V(-1.74, 0.6, 0.15) }, // batteria
    { p: V(5.8, 2.5, 8.8), t: V(0.45, 1.0, 0.8) },    // pronto per partire
  ];
  // le tappe dentro il furgone un po' più larghe: si vede il pezzo e il suo posto
  for (let i = 2; i <= 6; i++) tappe[i].p.sub(tappe[i].t).multiplyScalar(1.5).add(tappe[i].t);
  const punti = [V(1.05, 2.35, 0.45), V(0.1, 2.0, 0.0), V(0.55, 1.3, -0.6), V(-0.72, 0.86, -0.43), V(1.42, 0.6, 0.38), V(-1.74, 0.7, 0.3)];
  const etichette = ['Tetto a soffietto', 'Letto 200 cm', 'Cucina 2 fuochi', 'Frigo a compressore', 'Webasto', 'Batteria servizi'];
  const evidenziati = [null, matMaterasso, matCucina, matFrigo, matStufa, matBatteria];

  const INIZIO = 0.075, N = 7, PASSO = (1 - INIZIO) / N;
  const aPasso = (k) => INIZIO + k * PASSO;

  const pin = sezione.querySelector('[data-pin]');
  const pinTesto = sezione.querySelector('[data-pin-testo]');

  /* ---------- misure ---------- */
  let larg = 1, alt = 1, aspetto = 1;
  const misura = () => {
    const r = canvas.getBoundingClientRect();
    larg = Math.max(1, r.width); alt = Math.max(1, r.height); aspetto = larg / alt;
    renderer.setSize(larg, alt, false);
    camera.aspect = aspetto;
    camera.fov = aspetto < 1 ? 36 : 30;
    if (aspetto < 0.9) camera.setViewOffset(larg, alt, 0, alt * 0.17, larg, alt);
    else if (larg >= 900) camera.setViewOffset(larg, alt, -larg * 0.13, alt * 0.02, larg, alt);
    else camera.clearViewOffset();
    camera.updateProjectionMatrix();
  };
  new ResizeObserver(misura).observe(canvas);
  misura();

  /* ---------- un fotogramma ---------- */
  const tmpP = new THREE.Vector3(), tmpT = new THREE.Vector3(), proj = new THREE.Vector3();
  let pr = progresso(), ultimoT = null, tempo = 0;  // pr parte già dal punto giusto
  const fotogramma = (now) => {
    const dt = ultimoT === null ? 0 : Math.min(0.05, (now - ultimoT) / 1000);
    ultimoT = now;
    if (!ridotto) tempo += dt;
    const obiettivo = progresso();
    pr = ridotto ? obiettivo : pr + (obiettivo - pr) * (1 - Math.exp(-dt * 7));

    const a6 = aPasso(6);
    const aperto = tratto(pr, aPasso(0) - 0.035, aPasso(0) + PASSO * 0.7);
    const sezioneAperta = tratto(pr, aPasso(1) - 0.03, aPasso(1) + PASSO * 0.45) * (1 - tratto(pr, a6 - 0.02, a6 + PASSO * 0.4));
    const notte = tratto(pr, a6 + PASSO * 0.05, a6 + PASSO * 0.65);
    const srotola = tratto(pr, a6 + PASSO * 0.2, a6 + PASSO * 0.75);
    const arredo = tratto(pr, a6 + PASSO * 0.4, a6 + PASSO * 0.95);

    aggiornaTelo(aperto);
    taglio.constant = lerp(4, 0.45, sezioneAperta);
    ruoteVicine.forEach((r) => { r.visible = sezioneAperta < 0.3; });
    aggiornaVeranda(srotola);
    pezziCampo.forEach((g, i) => { const e = liscio(clamp(arredo * 1.6 - i * 0.3)); g.scale.setScalar(Math.max(0.001, e)); g.visible = e > 0.002; });

    // pedana: gira all'ingresso, poi si ferma; di notte ruota un poco per mostrare il campo
    const fermo = tratto(pr, 0, aPasso(0) + PASSO * 0.4);
    pedana.rotation.y = lerp(-1.05, 0, fermo) + (1 - fermo) * Math.sin(tempo * 0.4) * 0.08 + notte * 0.22;

    // notte: cielo, luci, fari, vetri caldi
    cielo.intensity = lerp(0.9, 0.18, notte);
    sole.intensity = lerp(2.2, 0.25, notte);
    contro.intensity = lerp(0.9, 0.5, notte);
    scena.environmentIntensity = lerp(0.75, 0.22, notte);
    dentro.intensity = notte * 3.2;
    lanterna.intensity = arredo * notte * 4;
    luce.material.emissiveIntensity = arredo * notte * 2.4;
    vetro.emissiveIntensity = notte * 0.55;
    matTelo.emissiveIntensity = notte * 0.9;
    faro.emissiveIntensity = lerp(0.05, 2.2, notte);
    stop.emissiveIntensity = lerp(0.05, 0.9, notte);
    pozza.material.opacity = notte * 0.5;
    disco.material.opacity = lerp(1, 0.45, notte);
    sezione.style.setProperty('--n', notte.toFixed(3));

    // passo attivo: pezzo acceso e spillo sullo schermo
    const k = pr < INIZIO ? -1 : Math.min(N - 1, Math.floor((pr - INIZIO) / PASSO));
    const battito = ridotto ? 0.7 : 0.55 + 0.45 * Math.sin(tempo * 4.2);
    evidenziati.forEach((m, i) => {
      if (!m) return;
      const on = i === k ? clamp(((pr - aPasso(i)) / PASSO) * 4) * (1 - clamp(((pr - aPasso(i)) / PASSO - 0.85) * 6)) : 0;
      m.emissiveIntensity = on * 0.55 * battito;
    });

    // camera: riposa su una tappa per passo, passa alla successiva a cavallo del cambio di passo
    const f = (pr - INIZIO) / PASSO;
    if (f < 0.5) {
      const m0 = liscio(clamp((pr - INIZIO * 0.2) / (aPasso(0) + PASSO * 0.5 - INIZIO * 0.2)));
      tmpP.lerpVectors(tappe[0].p, tappe[1].p, m0);
      tmpT.lerpVectors(tappe[0].t, tappe[1].t, m0);
    } else {
      const g = f - 0.75, i0 = Math.floor(g);
      const da = tappe[Math.min(7, Math.max(1, i0 + 1))], a = tappe[Math.min(7, Math.max(1, i0 + 2))];
      const mix = i0 < 0 ? 0 : liscio(clamp((g - i0) / 0.5));
      tmpP.lerpVectors(da.p, a.p, mix);
      tmpT.lerpVectors(da.t, a.t, mix);
    }
    if (!ridotto) { tmpP.x += Math.sin(tempo * 0.5) * 0.06; tmpP.y += Math.sin(tempo * 0.37) * 0.04; }
    if (aspetto < 1) tmpP.sub(tmpT).multiplyScalar(1 + (1 - aspetto) * 1.45).add(tmpT);
    camera.position.copy(tmpP);
    camera.lookAt(tmpT);

    renderer.render(scena, camera);

    // spillo
    if (k >= 0 && k < punti.length) {
      proj.copy(punti[k]);
      furgone.localToWorld(proj);
      proj.project(camera);
      const sx = (proj.x * 0.5 + 0.5) * larg, sy = (-proj.y * 0.5 + 0.5) * alt;
      const vis = proj.z < 1 && sx > 10 && sx < larg - 10 && sy > 60 && sy < alt - 10;
      pin.style.transform = `translate3d(${sx.toFixed(1)}px, ${sy.toFixed(1)}px, 0)`;
      if (pinTesto.textContent !== etichette[k]) pinTesto.textContent = etichette[k];
      pin.classList.toggle('is-visibile', vis && clamp(((pr - aPasso(k)) / PASSO) * 3) > 0.6);
    } else pin.classList.remove('is-visibile');
  };

  /* ---------- giro: solo quando la sezione è in vista e la scheda è visibile ---------- */
  let inVista = false, rafId = 0;
  const giroAnim = (now) => { rafId = 0; fotogramma(now); if (inVista && !document.hidden && !ridotto) rafId = requestAnimationFrame(giroAnim); };
  const parti = () => { if (!rafId && inVista && !document.hidden) rafId = requestAnimationFrame(giroAnim); };
  new IntersectionObserver((v) => { inVista = v.some((x) => x.isIntersecting); if (inVista) parti(); }, { rootMargin: '10% 0px' }).observe(sezione);
  document.addEventListener('visibilitychange', parti);
  if (ridotto) addEventListener('scroll', () => requestAnimationFrame(fotogramma), { passive: true });
  // shader compilati prima del primo fotogramma: niente scatti quando la sezione entra in vista
  aggiornaTelo(1); aggiornaVeranda(1); pezziCampo.forEach((g) => { g.visible = true; });
  try { await renderer.compileAsync(scena, camera); } catch (e) { renderer.compile(scena, camera); }
  ultimaApertura = -1;
  fotogramma(performance.now());
}
