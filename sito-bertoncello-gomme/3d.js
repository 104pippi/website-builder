/* La ruota Bertoncello: costruita in codice, si smonta con lo scroll */
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const TAU = Math.PI * 2;
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const liscio = (a, b, v) => { const t = clamp((v - a) / (b - a)); return t * t * (3 - 2 * t); };
const mix = (a, b, t) => a + (b - a) * t;
const ROSSO = 0xD71513;

/* ---------- Materiali ---------- */
function creaMateriali() {
  return {
    gomma: new THREE.MeshPhysicalMaterial({ color: 0x16181b, roughness: 0.82, metalness: 0, sheen: 0.55, sheenRoughness: 0.7, sheenColor: new THREE.Color(0x3d444c), side: THREE.DoubleSide }),
    diamantato: new THREE.MeshPhysicalMaterial({ color: 0xd3d8de, metalness: 1, roughness: 0.24, clearcoat: 0.7, clearcoatRoughness: 0.14 }),
    canna: new THREE.MeshPhysicalMaterial({ color: 0x2b3037, metalness: 0.92, roughness: 0.33, clearcoat: 0.6, clearcoatRoughness: 0.22, side: THREE.DoubleSide }),
    cromo: new THREE.MeshStandardMaterial({ color: 0xf1f3f5, metalness: 1, roughness: 0.1 }),
    acciaio: new THREE.MeshStandardMaterial({ color: 0x7c828a, metalness: 1, roughness: 0.42 }),
    scuro: new THREE.MeshStandardMaterial({ color: 0x2c3137, metalness: 0.85, roughness: 0.46 }),
    pinza: new THREE.MeshPhysicalMaterial({ color: ROSSO, metalness: 0.1, roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.06, emissive: new THREE.Color(ROSSO), emissiveIntensity: 0 }),
    piombo: new THREE.MeshStandardMaterial({ color: 0xc0c6cc, metalness: 0.9, roughness: 0.26, emissive: new THREE.Color(0x7DB6EA), emissiveIntensity: 0 })
  };
}

/* ---------- Scritte sul fianco della gomma (texture disegnata su canvas) ---------- */
function scriviArco(ctx, testo, cx, cy, r, centro, sopra, size, peso, spazio) {
  ctx.font = `${peso} ${size}px Archivo, sans-serif`;
  try { ctx.fontStretch = 'expanded'; } catch (e) { /* non supportato */ }
  const larghezze = [...testo].map(ch => ctx.measureText(ch).width + spazio);
  const tot = larghezze.reduce((a, b) => a + b, 0) - spazio;
  const verso = sopra ? 1 : -1;
  let ang = centro - verso * tot / r / 2;
  [...testo].forEach((ch, i) => {
    const w = larghezze[i];
    const a = ang + verso * (w - spazio) / 2 / r;
    ctx.save();
    ctx.translate(cx + r * Math.cos(a), cy + r * Math.sin(a));
    ctx.rotate(a + (sopra ? Math.PI / 2 : -Math.PI / 2));
    ctx.fillText(ch, 0, 0);
    ctx.restore();
    ang += verso * w / r;
  });
}

function texFianco(esterno) {
  const S = 2048;
  const c = document.createElement('canvas');
  c.width = c.height = S;
  const x = c.getContext('2d');
  const px = r => r / esterno * (S / 2);
  x.fillStyle = '#fff';
  x.textAlign = 'center';
  x.textBaseline = 'middle';
  scriviArco(x, 'BERTONCELLO GOMME', S / 2, S / 2, px(0.83), -Math.PI / 2, true, 112, 850, 12);
  scriviArco(x, 'SAN MARTINO DI LUPARI · ASOLO', S / 2, S / 2, px(0.835), Math.PI / 2, false, 60, 700, 9);
  scriviArco(x, '225/45 R17 94W', S / 2, S / 2, px(0.83), 0, true, 54, 700, 6);
  scriviArco(x, 'M+S  TUBELESS', S / 2, S / 2, px(0.83), Math.PI, true, 46, 650, 6);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

/* ---------- Battistrada: scanalature a V calcolate pixel per pixel sulle UV del tornio ---------- */
function texBattistrada(profilo) {
  const W = 2048, H = 512, n = profilo.length - 1;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const x = c.getContext('2d');
  const img = x.createImageData(W, H);
  const d = img.data;
  const passi = 64;
  const bordo = (v, a, w) => clamp((v - a) / w + 0.5);   // gradino morbido
  for (let py = 0; py < H; py++) {
    const v = 1 - (py + 0.5) / H;                    // la texture è capovolta in verticale
    const j = Math.min(n - 1, Math.floor(v * n));
    const f = v * n - j;
    const z = mix(profilo[j].y, profilo[j + 1].y, f);
    const az = Math.abs(z);
    const sulBattistrada = j >= 6 && j < 14 && az < 0.252;
    for (let px = 0; px < W; px++) {
      let h = 1;
      if (sulBattistrada) {
        const s = (px + 0.5) / W * passi;
        const fase = ((s + 2.4 * az) % 1 + 1) % 1;
        const larg = az > 0.2 ? 0.2 : 0.15;
        let g = Math.min(bordo(fase, larg, 0.06), bordo(1 - fase, 0, 0.06));   // 0 nelle scanalature a V
        const circ = 1 - (bordo(az, 0.098, 0.008) * (1 - bordo(az, 0.118, 0.008)));
        g = Math.min(g, circ);
        if (az < 0.009) g = Math.min(g, 0.15);
        const lamella = ((s * 2 + 2.4 * az + 0.5) % 1 + 1) % 1;
        if (az > 0.02 && az < 0.2 && lamella < 0.035) g = Math.min(g, 0.55);
        h = mix(1, g, 1 - bordo(az, 0.244, 0.012));
      }
      const val = Math.round(mix(70, 255, h));
      const k = (py * W + px) * 4;
      d[k] = d[k + 1] = d[k + 2] = val; d[k + 3] = 255;
    }
  }
  x.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/* ---------- Gomma: profilo ruotato, battistrada in rilievo, scritte ---------- */
function creaGomma(M, maxAniso) {
  const g = new THREE.Group();
  const profilo = [
    [0.625, -0.265], [0.66, -0.281], [0.72, -0.295], [0.80, -0.302], [0.88, -0.300], [0.935, -0.288],
    [0.968, -0.268], [0.986, -0.240], [0.993, -0.200], [0.995, -0.120], [0.995, 0], [0.995, 0.120],
    [0.993, 0.200], [0.986, 0.240], [0.968, 0.268], [0.935, 0.288], [0.88, 0.300], [0.80, 0.302],
    [0.72, 0.295], [0.66, 0.281], [0.625, 0.265], [0.598, 0.24], [0.598, -0.24], [0.625, -0.265]
  ].map(([r, y]) => new THREE.Vector2(r, y));
  const corpo = new THREE.LatheGeometry(profilo, 168);
  corpo.rotateX(Math.PI / 2);
  g.add(new THREE.Mesh(corpo, M.gomma));

  // battistrada direzionale disegnato come rilievo: il profilo resta pulito
  const battistrada = texBattistrada(profilo);
  battistrada.anisotropy = Math.min(8, maxAniso);
  M.gomma.map = battistrada;
  M.gomma.bumpMap = battistrada;
  M.gomma.bumpScale = 5;
  M.gomma.needsUpdate = true;

  // scritte in rilievo sul fianco anteriore
  const esterno = 0.925;
  const tex = texFianco(esterno);
  tex.anisotropy = Math.min(8, maxAniso);
  const anello = new THREE.Mesh(
    new THREE.RingGeometry(0.73, esterno, 168, 1),
    new THREE.MeshStandardMaterial({ map: tex, color: 0xcfd4d9, roughness: 0.55, metalness: 0, transparent: true, alphaTest: 0.4 })
  );
  anello.position.z = 0.305;
  g.add(anello);
  return g;
}

/* ---------- Cerchio: canale, labbro diamantato, faccia a doppie razze concava ---------- */
function creaCerchio(M) {
  const g = new THREE.Group();
  const canale = new THREE.LatheGeometry([
    [0.545, -0.29], [0.6, -0.30], [0.642, -0.312], [0.655, -0.298], [0.645, -0.282], [0.605, -0.268],
    [0.568, -0.25], [0.56, -0.2], [0.56, 0.2], [0.568, 0.25], [0.605, 0.268], [0.645, 0.282],
    [0.655, 0.298], [0.642, 0.312], [0.6, 0.30], [0.545, 0.29], [0.54, 0.27], [0.54, -0.27], [0.545, -0.29]
  ].map(([r, y]) => new THREE.Vector2(r, y)), 144);
  canale.rotateX(Math.PI / 2);
  g.add(new THREE.Mesh(canale, M.canna));

  const labbro = new THREE.Mesh(new THREE.TorusGeometry(0.649, 0.012, 12, 168), M.diamantato);
  labbro.position.z = 0.303;
  g.add(labbro);

  // faccia: disco con 5 finestre grandi e 5 feritoie tra le doppie razze
  const R = 0.575;
  const forma = new THREE.Shape();
  forma.absarc(0, 0, R, 0, TAU, false);
  const foro = new THREE.Path();
  foro.absarc(0, 0, 0.046, 0, TAU, true);
  forma.holes.push(foro);
  const settore = TAU / 5;
  for (let s = 0; s < 5; s++) {
    const c = s * settore + settore / 2;
    const fin = new THREE.Path();
    const ri = 0.215, ro = 0.5, ai = 0.22, ao = 0.33;
    fin.moveTo(ri * Math.cos(c - ai), ri * Math.sin(c - ai));
    fin.absarc(0, 0, ri, c - ai, c + ai, false);
    fin.lineTo(ro * Math.cos(c + ao), ro * Math.sin(c + ao));
    fin.absarc(0, 0, ro, c + ao, c - ao, true);
    fin.closePath();
    forma.holes.push(fin);
    const cs = s * settore;
    const fer = new THREE.Path();
    const fi = 0.27, fo = 0.49, bi = 0.016 / fi, bo = 0.024 / fo;
    fer.moveTo(fi * Math.cos(cs - bi), fi * Math.sin(cs - bi));
    fer.absarc(0, 0, fi, cs - bi, cs + bi, false);
    fer.lineTo(fo * Math.cos(cs + bo), fo * Math.sin(cs + bo));
    fer.absarc(0, 0, fo, cs + bo, cs - bo, true);
    fer.closePath();
    forma.holes.push(fer);
  }
  const prof = 0.05;
  const faccia = new THREE.ExtrudeGeometry(forma, { depth: prof, bevelEnabled: true, bevelThickness: 0.012, bevelSize: 0.009, bevelSegments: 2, curveSegments: 22 });
  // concavità: il centro rientra, le normali dei piani seguono la curva
  const P = faccia.attributes.position, Nn = faccia.attributes.normal;
  const D = 0.07, a = 0.1, b = 0.565;
  for (let i = 0; i < P.count; i++) {
    const x = P.getX(i), y = P.getY(i), z = P.getZ(i);
    const r = Math.hypot(x, y);
    const t = clamp((r - a) / (b - a));
    const s = t * t * (3 - 2 * t);
    P.setZ(i, z - D * (1 - s));
    const nz = Nn.getZ(i);
    if (Math.abs(nz) > 0.99 && r > 1e-4) {
      const dfdr = D * 6 * t * (1 - t) / (b - a);
      const gx = dfdr * x / r, gy = dfdr * y / r;
      const v = new THREE.Vector3(-gx * Math.sign(nz), -gy * Math.sign(nz), Math.sign(nz)).normalize();
      Nn.setXYZ(i, v.x, v.y, v.z);
    }
  }
  P.needsUpdate = true; Nn.needsUpdate = true;
  faccia.translate(0, 0, 0.245 - prof - 0.012);
  g.add(new THREE.Mesh(faccia, [M.diamantato, M.canna]));

  // valvola
  const valvola = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.011, 0.07, 10), M.cromo);
  const av = 1.95;
  valvola.position.set(0.592 * Math.cos(av), 0.592 * Math.sin(av), 0.262);
  valvola.rotation.z = av - Math.PI / 2;
  valvola.rotateX(-0.5);
  g.add(valvola);
  return g;
}

function creaDadi(M) {
  const g = new THREE.Group();
  const geo = new THREE.CylinderGeometry(0.025, 0.025, 0.05, 6);
  geo.rotateX(Math.PI / 2);
  for (let i = 0; i < 5; i++) {
    const a = i * TAU / 5 + TAU / 10;
    const d = new THREE.Mesh(geo, M.cromo);
    d.position.set(0.112 * Math.cos(a), 0.112 * Math.sin(a), 0.193);
    g.add(d);
  }
  return g;
}

function creaCoprimozzo(M) {
  const g = new THREE.Group();
  const geo = new THREE.CylinderGeometry(0.058, 0.064, 0.03, 48);
  geo.rotateX(Math.PI / 2);
  const tappo = new THREE.Mesh(geo, M.scuro);
  tappo.position.z = 0.188;
  const anello = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.006, 8, 48), M.pinza);
  anello.position.z = 0.204;
  g.add(tappo, anello);
  return g;
}

function creaPesi(M) {
  const g = new THREE.Group();
  const geo = new THREE.BoxGeometry(0.085, 0.022, 0.03);
  const angoli = [3.62, 3.79, 0.46, 0.63];
  const pesi = angoli.map(a => {
    const p = new THREE.Mesh(geo, M.piombo);
    p.userData.a = a;
    p.rotation.z = a - Math.PI / 2;
    g.add(p);
    return p;
  });
  g.userData.pesi = pesi;
  return g;
}

function creaDisco(M) {
  const g = new THREE.Group();
  const forma = new THREE.Shape();
  forma.absarc(0, 0, 0.47, 0, TAU, false);
  const centro = new THREE.Path();
  centro.absarc(0, 0, 0.2, 0, TAU, true);
  forma.holes.push(centro);
  [[0.315, 0], [0.395, 0.5]].forEach(([r, sf]) => {
    for (let i = 0; i < 20; i++) {
      const a = (i + sf) * TAU / 20;
      const h = new THREE.Path();
      h.absarc(r * Math.cos(a), r * Math.sin(a), 0.013, 0, TAU, true);
      forma.holes.push(h);
    }
  });
  const geo = new THREE.ExtrudeGeometry(forma, { depth: 0.042, bevelEnabled: true, bevelThickness: 0.004, bevelSize: 0.004, bevelSegments: 1, curveSegments: 40 });
  geo.translate(0, 0, -0.021);
  const disco = new THREE.Mesh(geo, [M.acciaio, M.scuro]);
  disco.position.z = -0.07;
  const campana = new THREE.Mesh(new THREE.CylinderGeometry(0.205, 0.205, 0.085, 64), M.scuro);
  campana.rotation.x = Math.PI / 2;
  campana.position.z = -0.02;
  g.add(disco, campana);
  return g;
}

function creaPinza(M) {
  const g = new THREE.Group();
  const a0 = 0.17 * Math.PI, a1 = 0.43 * Math.PI, ri = 0.355, ro = 0.52;
  const s = new THREE.Shape();
  s.moveTo(ri * Math.cos(a0), ri * Math.sin(a0));
  s.lineTo(ro * Math.cos(a0), ro * Math.sin(a0));
  s.absarc(0, 0, ro, a0, a1, false);
  s.lineTo(ri * Math.cos(a1), ri * Math.sin(a1));
  s.absarc(0, 0, ri, a1, a0, true);
  const geo = new THREE.ExtrudeGeometry(s, { depth: 0.13, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.018, bevelSegments: 3, curveSegments: 24 });
  geo.translate(0, 0, -0.065 - 0.07);
  g.add(new THREE.Mesh(geo, M.pinza));
  // nome sulla pinza
  const c = document.createElement('canvas');
  c.width = 512; c.height = 96;
  const x = c.getContext('2d');
  x.fillStyle = '#fff';
  x.font = '850 64px Archivo, sans-serif';
  try { x.fontStretch = 'expanded'; } catch (e) { /* */ }
  x.textAlign = 'center'; x.textBaseline = 'middle';
  x.fillText('BERTONCELLO', 256, 50);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const am = (a0 + a1) / 2, rm = (ri + ro) / 2;
  const scritta = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 0.0375), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false }));
  scritta.position.set(rm * Math.cos(am), rm * Math.sin(am), -0.07 + 0.065 + 0.0205);
  scritta.rotation.z = am - Math.PI / 2;
  g.add(scritta);
  g.userData.dir = new THREE.Vector2(Math.cos(am), Math.sin(am));
  return g;
}

function creaMozzo(M) {
  const g = new THREE.Group();
  const geo = new THREE.CylinderGeometry(0.15, 0.175, 0.2, 48);
  geo.rotateX(Math.PI / 2);
  const mozzo = new THREE.Mesh(geo, M.scuro);
  mozzo.position.z = -0.17;
  g.add(mozzo);
  const geoP = new THREE.CylinderGeometry(0.011, 0.011, 0.13, 10);
  geoP.rotateX(Math.PI / 2);
  for (let i = 0; i < 5; i++) {
    const a = i * TAU / 5 + TAU / 10;
    const p = new THREE.Mesh(geoP, M.acciaio);
    p.position.set(0.112 * Math.cos(a), 0.112 * Math.sin(a), 0.0);
    g.add(p);
  }
  return g;
}

/* ---------- Avvio ---------- */
export async function avvia({ ruota, pista, palco, scena, progresso }) {
  const posterMode = /[?&]poster\b/.test(location.search);
  try { await document.fonts.load('850 100px Archivo'); } catch (e) { /* */ }

  const canvas = document.createElement('canvas');
  canvas.setAttribute('aria-hidden', 'true');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance', preserveDrawingBuffer: posterMode });
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.95;
  pmrem.dispose();

  const chiave = new THREE.DirectionalLight(0xffffff, 2.4);
  chiave.position.set(3, 4, 6);
  const controluce = new THREE.DirectionalLight(0x8cc4ff, 3.2);
  controluce.position.set(-5, 2.5, -3);
  const basso = new THREE.DirectionalLight(0xffffff, 0.6);
  basso.position.set(0, -4, 3);
  scene.add(chiave, controluce, basso);

  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);

  const M = creaMateriali();
  const radice = new THREE.Group();
  const orienta = new THREE.Group();
  const assetto = new THREE.Group();
  const centro = new THREE.Group();
  const rotanti = new THREE.Group();
  scene.add(radice);
  radice.add(orienta);
  orienta.add(assetto);
  assetto.add(centro);
  centro.add(rotanti);

  const gomma = creaGomma(M, renderer.capabilities.getMaxAnisotropy());
  const cerchio = creaCerchio(M);
  const dadi = creaDadi(M);
  const tappo = creaCoprimozzo(M);
  const pesi = creaPesi(M);
  const disco = creaDisco(M);
  const mozzo = creaMozzo(M);
  const pinza = creaPinza(M);
  rotanti.add(gomma, cerchio, dadi, tappo, pesi, disco, mozzo);
  centro.add(pinza);

  // linee laser del controllo assetto
  const matLaser = () => new THREE.MeshBasicMaterial({ color: 0xff5a4f, transparent: true, opacity: 0, depthTest: false, depthWrite: false, blending: THREE.AdditiveBlending });
  const laserV = new THREE.Mesh(new THREE.BoxGeometry(0.007, 2.9, 0.007), matLaser());
  const laserO = new THREE.Mesh(new THREE.BoxGeometry(2.9, 0.007, 0.007), matLaser());
  const mirino = new THREE.Mesh(new THREE.TorusGeometry(1.14, 0.0045, 6, 160), matLaser());
  [laserV, laserO, mirino].forEach(l => { l.renderOrder = 10; radice.add(l); });
  const coloreStorto = new THREE.Color(0xff5a4f), coloreDritto = new THREE.Color(0x3ee08f);

  /* ---------- Inquadratura ---------- */
  let W = 1, H = 1, verticale = true, dist = 8, puntatoreFine = window.matchMedia('(pointer: fine)').matches;
  const tanMezzo = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
  const inquadra = () => {
    W = Math.max(1, scena.clientWidth); H = Math.max(1, scena.clientHeight);
    verticale = W / H < 0.9;
    const dpr = Math.min(window.devicePixelRatio || 1, verticale || !puntatoreFine ? 1.5 : 2);
    renderer.setPixelRatio(dpr);
    renderer.setSize(W, H, false);
    camera.aspect = W / H;
    let diam, cx, cy;
    if (verticale) { diam = Math.min(0.84 * W, 0.47 * H); cx = 0.5 * W; cy = 0.34 * H; }
    else { diam = Math.min(0.46 * W, 0.7 * H); cx = 0.64 * W; cy = 0.5 * H; }
    dist = 2.06 * H / (diam * 2 * tanMezzo);
    camera.setViewOffset(W, H, -(cx - W / 2), (H / 2 - cy), W, H);
    camera.updateProjectionMatrix();
  };

  if (posterMode) {
    renderer.setPixelRatio(1);
    renderer.setSize(900, 900, false);
    canvas.style.cssText = 'position:fixed;left:0;top:0;width:900px;height:900px;opacity:1;z-index:999;background:transparent';
    document.body.appendChild(canvas);
    camera.aspect = 1;
    camera.clearViewOffset();
    dist = 2.06 / (0.88 * 2 * tanMezzo);
    camera.position.set(0, dist * Math.sin(0.13), dist * Math.cos(0.13));
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();
    orienta.rotation.set(-0.1, -0.52, 0);
    rotanti.rotation.z = -0.35;
    await renderer.compileAsync(scene, camera);
    renderer.render(scene, camera);
    window.__posterData = canvas.toDataURL('image/png');
    return;
  }

  scena.appendChild(canvas);
  inquadra();
  new ResizeObserver(inquadra).observe(scena);

  /* ---------- Puntatore (solo desktop) ---------- */
  let tx = 0, ty = 0, px = 0, py = 0;
  if (puntatoreFine) {
    palco.addEventListener('pointermove', e => {
      const r = palco.getBoundingClientRect();
      tx = ((e.clientX - r.left) / r.width - 0.5) * 2;
      ty = ((e.clientY - r.top) / r.height - 0.5) * 2;
    });
    palco.addEventListener('pointerleave', () => { tx = 0; ty = 0; });
  }

  /* ---------- Stato ---------- */
  let pS = progresso();
  let giro = 0;
  let xRotola = -7;
  let inizio = -1;
  let ultimo = performance.now();
  let attivo = false;
  let raf = 0;

  const aggiorna = (dt, ora) => {
    const p = progresso();
    pS += (p - pS) * (1 - Math.exp(-dt * 9));
    const q = pS;

    // entrata: la ruota arriva rotolando da sinistra
    if (inizio < 0) inizio = ora;
    const ti = clamp((ora - inizio) / 1700);
    const e = 1 - Math.pow(1 - ti, 3);
    const xPrima = xRotola;
    xRotola = mix(-7, 0, e);
    const dx = xRotola - xPrima;

    const R = 1 - liscio(0.75, 0.82, q);           // 1 = si può smontare, 0 = rimontata
    const e1 = liscio(0.09, 0.2, q) * R;            // gomma
    const e2 = liscio(0.26, 0.37, q) * R;           // cerchio
    const pIn = liscio(0.43, 0.53, q);              // contrappesi (restano montati)
    const e4 = liscio(0.6, 0.7, q) * R;             // freno e mozzo
    const X = liscio(0.08, 0.2, q) * R;             // vista "esploso"
    const fine = liscio(0.915, 1, q);

    gomma.position.z = (verticale ? 1.32 : 1.55) * e1;
    gomma.rotation.y = 0.22 * e1 * (1 - e2 * 0.6);
    cerchio.position.z = 0.56 * e2;
    dadi.position.z = 0.95 * e2;
    tappo.position.z = 1.1 * e2;
    pesi.position.z = 0.56 * e2;
    pesi.userData.pesi.forEach((p, i) => {
      const k = clamp(pIn * 1.25 - i * 0.08);
      const r = mix(1.9, 0.617, k * k * (3 - 2 * k));
      p.position.set(r * Math.cos(p.userData.a), r * Math.sin(p.userData.a), 0.292);
      p.scale.setScalar(k > 0.001 ? 1 : 0.0001);
    });
    M.piombo.emissiveIntensity = 0.9 * liscio(0.47, 0.53, q) * (1 - liscio(0.55, 0.6, q));
    disco.position.z = -0.4 * e4;
    mozzo.position.z = -0.92 * e4;
    pinza.position.set(pinza.userData.dir.x * 0.24 * e4, pinza.userData.dir.y * 0.24 * e4, -0.4 * e4);
    const pulsa = liscio(0.6, 0.66, q) * (1 - liscio(0.72, 0.76, q));
    M.pinza.emissiveIntensity = pulsa * (0.32 + 0.22 * Math.sin(ora / 160));
    centro.position.z = -0.28 * X;
    radice.position.y = verticale ? 0.1 * X : -0.12 * X;
    radice.position.x = xRotola + (verticale ? 0 : 0.55 * X);

    // equilibratura: la ruota sbanda finché i contrappesi non si agganciano
    const sbanda = 0.075 * liscio(0.4, 0.44, q) * (1 - liscio(0.5, 0.535, q));
    rotanti.rotation.x = sbanda * Math.sin(ora / 1000 * 7.5);
    rotanti.rotation.y = sbanda * Math.cos(ora / 1000 * 7.5);

    // assetto: la ruota si storce, poi torna dritta
    const storta = liscio(0.79, 0.83, q) * (1 - liscio(0.855, 0.9, q));
    assetto.rotation.x = 0.17 * storta;
    assetto.rotation.y = 0.24 * storta;
    const laser = liscio(0.785, 0.815, q) * (1 - liscio(0.905, 0.935, q));
    const dritto = liscio(0.86, 0.9, q);
    [laserV, laserO, mirino].forEach(l => {
      l.material.opacity = laser * (l === mirino ? 0.55 : 0.95);
      l.material.color.copy(coloreStorto).lerp(coloreDritto, dritto);
      l.visible = laser > 0.002;
    });

    // orientamento: tre quarti, poi esploso (di lato su desktop, in verticale su telefono)
    px += (tx - px) * (1 - Math.exp(-dt * 4));
    py += (ty - py) * (1 - Math.exp(-dt * 4));
    const baseX = -0.1, baseY = -0.52;
    const espX = verticale ? 0.95 : -0.42, espY = verticale ? -0.32 : -0.98;
    orienta.rotation.x = mix(baseX, espX, X) + py * 0.1;
    orienta.rotation.y = mix(baseY, espY, X) + px * 0.16 + 0.12 * fine;

    // rotolamento: lento sempre, veloce all'entrata (senza strisciare) e alla fine
    giro += -dx / 1.0 - (0.32 + 4.2 * fine * fine) * dt;
    rotanti.rotation.z = giro;

    // camera
    const d = dist * mix(1, verticale ? 1.36 : 1.45, X) * mix(1, 0.94, fine);
    const el = mix(0.13, 0.08, X);
    camera.position.set(0, d * Math.sin(el), d * Math.cos(el));
    camera.lookAt(0, 0, 0);
  };

  const fotogramma = () => {
    if (!attivo) return;
    raf = requestAnimationFrame(fotogramma);
    const ora = performance.now();
    const dt = Math.min(0.05, (ora - ultimo) / 1000);
    ultimo = ora;
    aggiorna(dt, ora);
    renderer.render(scene, camera);
  };
  const accendi = () => {
    if (attivo || document.hidden) return;
    attivo = true; ultimo = performance.now();
    raf = requestAnimationFrame(fotogramma);
  };
  const spegni = () => { attivo = false; cancelAnimationFrame(raf); };

  aggiorna(0, performance.now());
  inizio = -1;
  xRotola = -7;
  radice.position.x = -7;
  await renderer.compileAsync(scene, camera);
  renderer.render(scene, camera);
  canvas.classList.add('vivo');
  ruota.classList.add('viva');

  let visibile = false;
  new IntersectionObserver(v => {
    visibile = v.some(x => x.isIntersecting);
    if (visibile) accendi(); else spegni();
  }, { rootMargin: '10% 0px' }).observe(pista);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) spegni(); else if (visibile) accendi();
  });
}
