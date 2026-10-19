// "Dalla bobina alla busta": una confezionatrice verticale con pesatrice multitesta,
// costruita in codice. Il tempo fa girare la macchina, lo scroll muove la camera passo per passo.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, t) => a + (b - a) * t;
const fase = (t, a, b) => clamp((t - a) / (b - a));
const liscia = (t) => t * t * (3 - 2 * t);
const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

const Z0 = 0.13;            // asse del tubo formatore
const TUBO_R = 0.13;
const FILM_R = 0.145;
const BUSTA_L = 0.4;
const BUSTA_W = Math.PI * FILM_R;
const BUSTA_T = 0.1;
const GANASCE_Y = 0.9;
const BUSTA_TOP = GANASCE_Y - 0.045;
const NASTRO_Y = 0.36;
const NASTRO_V = 0.55;
const PERIODO = 1.4;
const GIALLO = new THREE.Color(0xffc81e);

// ---------- texture disegnate ----------
function canvasTex(w, h, disegna) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  disegna(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

function disegnaFilm(g, w, h, logo) {
  g.fillStyle = '#eef1f4'; g.fillRect(0, 0, w, h);
  // fronte (u 0..0.5, centro a 0.25)
  g.fillStyle = '#13202f';
  g.beginPath(); g.roundRect(44, 64, 424, 384, 22); g.fill();
  g.fillStyle = '#ffc81e'; g.fillRect(44, 352, 424, 64);
  g.fillStyle = '#13202f';
  for (let i = 0; i < 5; i++) g.fillRect(70 + i * 70, 374, 46, 20);
  if (logo) g.drawImage(logo, 96, 140, 320, 87);
  else { g.fillStyle = '#ffffff'; g.font = '700 84px sans-serif'; g.fillText('PMC', 160, 230); }
  g.fillStyle = 'rgba(255,255,255,.55)'; g.fillRect(96, 262, 220, 12); g.fillRect(96, 290, 160, 12);
  // retro
  g.fillStyle = '#dde3e8'; g.fillRect(512, 30, 512, 452);
  g.fillStyle = '#c7d0d8'; g.fillRect(760, 30, 16, 452); // saldatura longitudinale
  g.fillStyle = '#13202f';
  for (let i = 0; i < 34; i++) { const x = 820 + i * 4.4; if (Math.sin(i * 7.3) > -0.2) g.fillRect(x, 300, i % 3 ? 2 : 3.4, 90); }
  g.fillStyle = '#9aa7b4';
  for (let i = 0; i < 6; i++) g.fillRect(560, 110 + i * 26, 160 - (i % 2) * 40, 10);
  // tacca per la fotocellula
  g.fillStyle = '#05080c'; g.fillRect(990, 34, 26, 52);
  // zigrinatura delle saldature
  for (const y of [0, h - 30]) {
    g.fillStyle = '#d4dbe1'; g.fillRect(0, y, w, 30);
    g.fillStyle = 'rgba(19,32,47,.18)';
    for (let x = 0; x < w; x += 7) g.fillRect(x, y + 4, 2, 22);
  }
}

function texRadiale(stops, size = 256) {
  return canvasTex(size, size, (g) => {
    const r = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    stops.forEach(([o, c]) => r.addColorStop(o, c));
    g.fillStyle = r; g.fillRect(0, 0, size, size);
  });
}

// ---------- geometrie ----------
function geoCuscino(W, L, T, nu = 40, nv = 18) {
  const pos = [], uv = [], idx = [];
  for (let j = 0; j <= nv; j++) {
    const s = j / nv;
    const f = Math.pow(Math.sin(Math.PI * s), 0.55);
    const ws = 1 - 0.07 * Math.sin(Math.PI * s);
    for (let i = 0; i <= nu; i++) {
      const th = (i / nu) * Math.PI * 2;
      pos.push(Math.cos(th) * (W / 2) * ws, -s * L, Math.sin(th) * (T / 2) * f);
      uv.push(1 - i / nu, 1 - s);
    }
  }
  for (let j = 0; j < nv; j++) for (let i = 0; i < nu; i++) {
    const a = j * (nu + 1) + i, b = a + nu + 1;
    idx.push(a, b, a + 1, b, b + 1, a + 1);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

export function avvia(canvas) {
  const ridotto = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const mobile = matchMedia('(max-width: 759px)').matches;
  const corsa = canvas.closest('[data-linea]');
  const palco = canvas.parentElement;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, mobile ? 1.5 : 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  const fondo = new THREE.Color(0x13202f);
  scene.background = fondo;
  scene.fog = new THREE.Fog(fondo, 9, 20);
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.85;

  const key = new THREE.DirectionalLight(0xfff1dc, 1.5);
  key.position.set(3, 6, 4);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0x6fa8ff, 1.2);
  rim.position.set(-4, 3, -4);
  scene.add(rim);

  const camera = new THREE.PerspectiveCamera(32, 1, 0.05, 60);

  // ---------- materiali ----------
  const acciaio = new THREE.MeshStandardMaterial({ color: 0xc9d0d6, metalness: 0.9, roughness: 0.3 });
  const acciaioScuro = new THREE.MeshStandardMaterial({ color: 0x7f8a95, metalness: 0.85, roughness: 0.42 });
  const vernice = new THREE.MeshStandardMaterial({ color: 0x223448, metalness: 0.3, roughness: 0.55 });
  const giallo = new THREE.MeshStandardMaterial({ color: 0xffc81e, roughness: 0.5 });
  const gomma = new THREE.MeshStandardMaterial({ color: 0x1a222b, roughness: 0.85 });
  const mBobina = acciaio.clone(), mTubo = acciaio.clone(), mGanasce = acciaio.clone();
  const mPesa = new THREE.MeshStandardMaterial({ color: 0xa9b3bd, metalness: 0.95, roughness: 0.26 });

  let logoImg = null;
  const filmBase = canvasTex(1024, 512, (g, w, h) => disegnaFilm(g, w, h, null));
  const sorgente = document.getElementById('logo-oriz');
  if (sorgente) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 3956 1078" fill="#ffffff">${sorgente.innerHTML}</svg>`;
    const img = new Image();
    img.onload = () => {
      logoImg = img;
      const c = filmBase.image;
      disegnaFilm(c.getContext('2d'), c.width, c.height, logoImg);
      [filmBase, filmManica, filmSu, filmPiano, filmBusta].forEach((t) => { t.needsUpdate = true; });
    };
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  }
  function filmTex(rx, ry, ox = 0, oy = 0) {
    const t = filmBase.clone();
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(rx, ry); t.offset.set(ox, oy);
    return t;
  }
  const filmManica = filmTex(-1, 0.92 / BUSTA_L, 0.25, 0);
  const filmSu = filmTex(1, 1.42 / BUSTA_L);
  const filmPiano = filmTex(1, 0.64 / BUSTA_L);
  const filmBusta = filmTex(1, 1, 0.5, 0);
  const mFilm = (map) => new THREE.MeshStandardMaterial({ map, metalness: 0.15, roughness: 0.32, side: THREE.DoubleSide });
  const mManica = mFilm(filmManica), mSu = mFilm(filmSu), mPiano = mFilm(filmPiano), mBusta = mFilm(filmBusta);

  const mProdotto = new THREE.MeshStandardMaterial({ color: 0xf1bf3a, roughness: 0.62, metalness: 0 });

  const box = (w, h, d, m, x, y, z, parent = scene) => {
    const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
    o.position.set(x, y, z);
    parent.add(o);
    return o;
  };
  const cil = (r, h, m, x, y, z, parent = scene, seg = 32, asseX = false) => {
    const g = new THREE.CylinderGeometry(r, r, h, seg);
    if (asseX) g.rotateZ(Math.PI / 2);
    const o = new THREE.Mesh(g, m);
    o.position.set(x, y, z);
    parent.add(o);
    return o;
  };

  // ---------- pavimento ----------
  const pav = new THREE.Mesh(new THREE.CircleGeometry(10, 64), new THREE.MeshBasicMaterial({ map: texRadiale([[0, '#22364b'], [0.55, '#172638'], [1, '#13202f']]) }));
  pav.rotation.x = -Math.PI / 2;
  scene.add(pav);
  const griglia = new THREE.GridHelper(16, 40, 0x2c4157, 0x223448);
  griglia.position.y = 0.002;
  griglia.material.transparent = true; griglia.material.opacity = 0.55;
  scene.add(griglia);
  const ombra = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 3.4), new THREE.MeshBasicMaterial({ map: texRadiale([[0, 'rgba(4,8,13,.8)'], [0.6, 'rgba(4,8,13,.35)'], [1, 'rgba(4,8,13,0)']]), transparent: true, depthWrite: false }));
  ombra.rotation.x = -Math.PI / 2; ombra.position.set(0.5, 0.004, -0.1);
  scene.add(ombra);

  // ---------- telaio della confezionatrice ----------
  for (const x of [-0.66, 0.66]) {
    box(0.06, 1.66, 0.06, acciaio, x, 1.13, 0.5);
    box(0.06, 1.66, 0.06, acciaio, x, 1.13, -0.2);
    box(0.06, 0.06, 0.76, acciaio, x, 1.96, 0.15);
    box(0.07, 0.07, 1.3, acciaioScuro, x, 0.1, -0.1);
    cil(0.05, 0.08, gomma, x, 0.04, 0.48);
    cil(0.05, 0.08, gomma, x, 0.04, -0.7);
  }
  box(1.38, 0.06, 0.06, acciaio, 0, 1.96, 0.5);
  box(1.38, 0.07, 0.07, acciaioScuro, 0, 0.1, -0.72);
  const armadio = box(1.36, 1.6, 0.42, vernice, 0, 1.0, -0.52);
  box(1.3, 0.05, 0.5, acciaio, 0, 1.83, -0.5);
  box(1.38, 0.05, 0.6, acciaio, 0, 1.96, -0.45);
  // pannello frontale dell'armadio con targhetta gialla
  box(0.5, 0.36, 0.01, acciaio, -0.32, 1.3, -0.305);
  box(0.16, 0.14, 0.012, giallo, 0.4, 1.45, -0.305);
  // pannello operatore
  box(0.3, 0.04, 0.04, acciaio, 0.81, 1.55, 0.52);
  const hmiCanvas = document.createElement('canvas');
  hmiCanvas.width = 256; hmiCanvas.height = 176;
  const hmiTex = new THREE.CanvasTexture(hmiCanvas);
  hmiTex.colorSpace = THREE.SRGBColorSpace;
  const hmi = new THREE.Group();
  hmi.position.set(0.96, 1.55, 0.55);
  hmi.rotation.y = 0.55;
  scene.add(hmi);
  box(0.42, 0.3, 0.04, acciaioScuro, 0, 0, 0, hmi);
  const schermo = new THREE.Mesh(new THREE.PlaneGeometry(0.37, 0.25), new THREE.MeshStandardMaterial({ map: hmiTex, emissive: 0xffffff, emissiveMap: hmiTex, emissiveIntensity: 0.9, roughness: 0.25 }));
  schermo.position.z = 0.021;
  hmi.add(schermo);
  let buste = 0;
  function disegnaHmi() {
    const g = hmiCanvas.getContext('2d');
    g.fillStyle = '#0d1824'; g.fillRect(0, 0, 256, 176);
    g.fillStyle = '#ffc81e'; g.fillRect(0, 0, 256, 30);
    g.fillStyle = '#13202f'; g.font = '700 18px sans-serif'; g.fillText('PMC  VFFS', 12, 21);
    g.fillStyle = '#9dafc0'; g.font = '600 16px sans-serif'; g.fillText('BUSTE', 14, 62);
    g.fillStyle = '#ffffff'; g.font = '700 54px sans-serif'; g.fillText(String(buste).padStart(5, '0'), 12, 116);
    g.fillStyle = '#3ad18a'; g.beginPath(); g.arc(236, 62, 8, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#1e3044';
    for (let i = 0; i < 4; i++) g.fillRect(12 + i * 60, 134, 52, 30);
    hmiTex.needsUpdate = true;
  }
  disegnaHmi();

  // ---------- bobina e percorso del film ----------
  const bobina = new THREE.Group();
  bobina.position.set(0, 0.78, -1.15);
  scene.add(bobina);
  const anelli = canvasTex(256, 256, (g) => {
    g.fillStyle = '#e8ecef'; g.fillRect(0, 0, 256, 256);
    for (let r = 120; r > 30; r -= 3) { g.strokeStyle = r % 2 ? '#cfd6dd' : '#f4f6f8'; g.lineWidth = 2; g.beginPath(); g.arc(128, 128, r, 0, Math.PI * 2); g.stroke(); }
    g.fillStyle = '#7f8a95'; g.beginPath(); g.arc(128, 128, 30, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#13202f'; g.beginPath(); g.arc(128, 128, 12, 0, Math.PI * 2); g.fill();
  });
  const latoBobina = filmTex(6, 1);
  const rotolo = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.48, 56, 1).rotateZ(Math.PI / 2), [
    new THREE.MeshStandardMaterial({ map: latoBobina, roughness: 0.3, metalness: 0.15 }),
    new THREE.MeshStandardMaterial({ map: anelli, roughness: 0.4 }),
    new THREE.MeshStandardMaterial({ map: anelli, roughness: 0.4 }),
  ]);
  bobina.add(rotolo);
  cil(0.03, 0.72, mBobina, 0, 0, 0, bobina, 16, true);
  for (const x of [-0.33, 0.33]) box(0.03, 0.1, 0.44, mBobina, x, 0.78, -0.94);
  cil(0.035, 0.56, mBobina, 0, 2.2, -0.845, scene, 20, true);
  const su = new THREE.Mesh(new THREE.PlaneGeometry(0.46, 1.42), mSu);
  su.position.set(0, 1.49, -0.808);
  scene.add(su);
  const piano = new THREE.Mesh(new THREE.PlaneGeometry(0.46, 0.64), mPiano);
  piano.rotation.x = -Math.PI / 2;
  piano.position.set(0, 2.237, -0.52);
  scene.add(piano);
  // fotocellula che legge la tacca
  box(0.07, 0.07, 0.07, acciaioScuro, 0.29, 1.9, -0.84);
  const led = new THREE.Mesh(new THREE.SphereGeometry(0.014, 12, 8), new THREE.MeshBasicMaterial({ color: 0xff3b2f }));
  led.position.set(0.25, 1.9, -0.84);
  scene.add(led);

  // ---------- tubo formatore, colletto, saldatura verticale ----------
  const colletto = new THREE.Mesh(new THREE.LatheGeometry([new THREE.Vector2(0.146, 1.86), new THREE.Vector2(0.17, 1.96), new THREE.Vector2(0.27, 2.1), new THREE.Vector2(0.34, 2.22)], 48), new THREE.MeshStandardMaterial({ color: 0xd8dee3, metalness: 0.92, roughness: 0.22, side: THREE.DoubleSide }));
  colletto.position.z = Z0;
  scene.add(colletto);
  const mColletto = colletto.material;
  cil(TUBO_R, 1.62, mTubo, 0, 1.76, Z0, scene, 40);
  const manica = new THREE.Mesh(new THREE.CylinderGeometry(FILM_R, FILM_R, 0.92, 48, 1, true), mManica);
  manica.position.set(0, 1.4, Z0);
  scene.add(manica);
  const barraV = new THREE.Group();
  scene.add(barraV);
  box(0.07, 0.6, 0.05, mTubo, 0, 1.42, Z0 + FILM_R + 0.03, barraV);
  box(0.04, 0.04, 0.42, mTubo, 0, 1.42, Z0 + FILM_R + 0.25, barraV);
  box(0.02, 0.56, 0.008, new THREE.MeshStandardMaterial({ color: 0x3a2a1a, emissive: 0xff6a1a, emissiveIntensity: 0 }), 0, 1.42, Z0 + FILM_R + 0.004, barraV);
  const resistenzaV = barraV.children[2].material;

  // ---------- ganasce ----------
  const resistenza = new THREE.MeshStandardMaterial({ color: 0x3a2a1a, emissive: 0xff6a1a, emissiveIntensity: 0, roughness: 0.4 });
  function ganascia(segno) {
    const g = new THREE.Group();
    box(0.6, 0.085, 0.075, mGanasce, 0, 0, 0, g);
    box(0.56, 0.05, 0.012, resistenza, 0, 0, -segno * 0.043, g);
    for (const x of [-0.24, 0.24]) box(0.028, 0.028, 0.5, mGanasce, x, 0, segno * 0.28, g);
    g.position.set(0, GANASCE_Y, Z0);
    scene.add(g);
    return g;
  }
  const gDavanti = ganascia(1), gDietro = ganascia(-1);

  // ---------- nastro di uscita ----------
  const nastroTex = canvasTex(128, 32, (g) => { g.fillStyle = '#1d2a37'; g.fillRect(0, 0, 128, 32); g.fillStyle = '#33475c'; for (let x = 0; x < 128; x += 32) g.fillRect(x, 0, 6, 32); });
  nastroTex.wrapS = nastroTex.wrapT = THREE.RepeatWrapping;
  nastroTex.repeat.set(14, 1);
  const nastro = box(2.8, 0.04, 0.42, new THREE.MeshStandardMaterial({ map: nastroTex, roughness: 0.8 }), 1.0, NASTRO_Y - 0.02, Z0);
  for (const s of [-1, 1]) box(2.8, 0.07, 0.025, acciaio, 1.0, NASTRO_Y + 0.005, Z0 + s * 0.225);
  for (const x of [-0.3, 1.0, 2.3]) for (const s of [-1, 1]) box(0.04, NASTRO_Y - 0.04, 0.04, acciaioScuro, x, (NASTRO_Y - 0.04) / 2, Z0 + s * 0.2);
  cil(0.03, 0.44, acciaio, 2.4, NASTRO_Y - 0.02, Z0, scene, 16).rotation.x = Math.PI / 2;

  // ---------- pesatrice multitesta ----------
  const pesa = new THREE.Group();
  pesa.position.set(0, 0, Z0);
  scene.add(pesa);
  for (const [x, z] of [[-0.52, -0.45], [0.52, -0.45], [-0.52, 0.35], [0.52, 0.35]]) {
    box(0.05, 0.72, 0.05, mPesa, x, 2.3, z, pesa);
  }
  for (const z of [-0.45, 0.35]) box(1.1, 0.05, 0.05, mPesa, 0, 2.66, z, pesa);
  for (const x of [-0.52, 0.52]) box(0.05, 0.05, 0.85, mPesa, x, 2.66, -0.05, pesa);
  const imbuto = new THREE.Mesh(new THREE.LatheGeometry([new THREE.Vector2(0.135, 2.56), new THREE.Vector2(0.2, 2.63), new THREE.Vector2(0.56, 2.78), new THREE.Vector2(0.6, 2.81)], 48), new THREE.MeshStandardMaterial({ color: 0xd2d9df, metalness: 0.9, roughness: 0.28, side: THREE.DoubleSide }));
  pesa.add(imbuto);
  const mImbuto = imbuto.material;
  cil(0.24, 0.36, mPesa, 0, 3.04, 0, pesa, 40);
  const cono = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.14, 40), mPesa);
  cono.position.y = 3.29;
  pesa.add(cono);
  const N = 14;
  const secchiGeo = new THREE.BoxGeometry(0.1, 0.15, 0.13);
  const secchi = new THREE.InstancedMesh(secchiGeo, mPesa, N * 2);
  const vaschette = new THREE.InstancedMesh(new THREE.BoxGeometry(0.24, 0.018, 0.075), mPesa, N);
  const porte = new THREE.InstancedMesh(new THREE.BoxGeometry(0.012, 0.1, 0.12), mPesa, N);
  pesa.add(secchi, vaschette, porte);
  const tmp = new THREE.Object3D();
  const angoli = [];
  for (let i = 0; i < N; i++) {
    const a = (i / N) * Math.PI * 2;
    angoli.push(a);
    tmp.position.set(Math.cos(a) * 0.5, 2.88, Math.sin(a) * 0.5); tmp.rotation.set(0, -a, 0); tmp.scale.setScalar(1); tmp.updateMatrix();
    secchi.setMatrixAt(i, tmp.matrix);
    tmp.position.set(Math.cos(a) * 0.52, 3.07, Math.sin(a) * 0.52); tmp.scale.set(0.9, 0.8, 0.9); tmp.updateMatrix();
    secchi.setMatrixAt(N + i, tmp.matrix);
    tmp.scale.setScalar(1);
    tmp.position.set(Math.cos(a) * 0.37, 3.2, Math.sin(a) * 0.37); tmp.rotation.set(0, -a, -0.16, 'YZX'); tmp.updateMatrix();
    vaschette.setMatrixAt(i, tmp.matrix);
    tmp.rotation.set(0, 0, 0, 'XYZ');
  }
  const aperture = new Float32Array(N);
  const padre = new THREE.Object3D(), cerniera = new THREE.Object3D(), porta = new THREE.Object3D();
  padre.add(cerniera); cerniera.add(porta);
  cerniera.position.set(-0.056, -0.075, 0);
  porta.position.set(0, 0.05, 0);
  function aggiornaPorte() {
    for (let i = 0; i < N; i++) {
      const a = angoli[i];
      padre.position.set(Math.cos(a) * 0.5, 2.88, Math.sin(a) * 0.5);
      padre.rotation.set(0, -a, 0);
      cerniera.rotation.set(0, 0, aperture[i] * 1.1);
      padre.updateMatrixWorld(true);
      porte.setMatrixAt(i, porta.matrixWorld);
    }
    porte.instanceMatrix.needsUpdate = true;
  }
  aggiornaPorte();

  // ---------- prodotto (pasta corta) ----------
  const NP_FERMI = 90, NP_CADE = 72;
  const pezzi = new THREE.InstancedMesh(new THREE.CapsuleGeometry(0.011, 0.032, 2, 6), mProdotto, NP_FERMI + NP_CADE);
  pezzi.frustumCulled = false;
  pesa.add(pezzi);
  const q = new THREE.Quaternion(), e3 = new THREE.Euler(), uno = new THREE.Vector3(1, 1, 1), zero = new THREE.Vector3(0, 0, 0);
  const m4 = new THREE.Matrix4(), v3 = new THREE.Vector3();
  const caso = (() => { let s = 7; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();
  for (let i = 0; i < NP_FERMI; i++) {
    if (i < 46) {
      const r = 0.04 + caso() * 0.25, a = caso() * Math.PI * 2;
      v3.set(Math.cos(a) * r, 3.22 + (1 - r / 0.3) * 0.14 + 0.014, Math.sin(a) * r);
    } else {
      const k = Math.floor(caso() * N), a = angoli[k] + (caso() - 0.5) * 0.12, r = 0.28 + caso() * 0.2;
      v3.set(Math.cos(a) * r, 3.23 - (r - 0.25) * 0.16, Math.sin(a) * r);
    }
    q.setFromEuler(e3.set(caso() * 3, caso() * 3, caso() * 3));
    pezzi.setMatrixAt(i, m4.compose(v3, q, uno));
  }
  const cadute = [];
  for (let i = 0; i < NP_CADE; i++) { cadute.push({ attivo: false, t0: 0, a: 0, dur: 0.4, rot: new THREE.Euler() }); pezzi.setMatrixAt(NP_FERMI + i, m4.compose(zero, q, new THREE.Vector3(0, 0, 0))); }

  // ---------- buste ----------
  const cuscinoGeo = geoCuscino(BUSTA_W, BUSTA_L, BUSTA_T);
  const formante = new THREE.Mesh(cuscinoGeo, mBusta);
  formante.position.set(0, BUSTA_TOP, Z0);
  scene.add(formante);
  const cadenti = [];
  for (let i = 0; i < 7; i++) {
    const b = new THREE.Mesh(cuscinoGeo, mBusta);
    b.visible = false;
    scene.add(b);
    cadenti.push({ mesh: b, attiva: false, t: 0 });
  }

  // ---------- evidenziazione per passo ----------
  const gruppi = [
    [mBobina],
    [mTubo, mColletto],
    [mPesa, mImbuto],
    [mGanasce],
  ];
  const intensita = [0, 0, 0, 0];
  for (const g of gruppi) for (const m of g) { m.emissive = GIALLO.clone(); m.emissiveIntensity = 0; }

  // ---------- camera ----------
  const K = [
    { p: [4.7, 3.0, 5.6], t: [0.45, 1.7, 0] },     // panoramica, prima del palco
    { p: [3.05, 2.05, -2.95], t: [0.05, 1.3, -0.8] }, // bobina
    { p: [1.75, 2.0, 2.35], t: [0, 1.6, 0.12] },    // tubo formatore
    { p: [1.85, 4.35, 2.3], t: [0, 2.95, 0.12] },   // pesatrice
    { p: [1.95, 1.1, 2.45], t: [0.4, 0.72, 0.12] }, // ganasce e nastro
  ];
  const camP = new THREE.Vector3(...K[0].p), camT = new THREE.Vector3(...K[0].t);
  const vP = new THREE.Vector3(), vT = new THREE.Vector3(), aP = new THREE.Vector3(), aT = new THREE.Vector3();
  function bersaglio(pre, s) {
    // s: 0..4 lungo il palco; pre: 1 quando il palco è ancora sotto lo schermo
    const i = Math.min(3, Math.floor(s));
    const f = s - i;
    const da = K[i + 1], a = K[Math.min(4, i + 2)];
    const k = i < 3 ? liscia(fase(f, 0.58, 1)) : 0;
    vP.set(...da.p).lerp(aP.set(...a.p), k);
    vT.set(...da.t).lerp(aT.set(...a.t), k);
    const e = liscia(pre);
    vP.lerp(aP.set(...K[0].p), e);
    vT.lerp(aT.set(...K[0].t), e);
  }

  let W = 1, H = 1, ritratto = false;
  function impagina() {
    W = palco.clientWidth; H = palco.clientHeight;
    renderer.setSize(W, H, false);
    camera.aspect = W / H;
    ritratto = W / H < 0.9;
    camera.fov = ritratto ? 38 : 32;
    if (W < 900) camera.setViewOffset(W, H, 0, H * (ritratto ? 0.17 : 0.1), W, H);
    else camera.setViewOffset(W, H, -W * 0.2, 0, W, H);
    camera.updateProjectionMatrix();
  }
  impagina();
  addEventListener('resize', impagina);

  function statoScroll() {
    const r = corsa.getBoundingClientRect();
    const vh = innerHeight;
    const corsaUtile = Math.max(1, r.height - vh);
    const p = clamp(-r.top / corsaUtile);
    const pre = clamp(r.top / vh);
    return { p, pre, s: p * 4 * 0.999 };
  }

  // ---------- ciclo della macchina ----------
  let filmV = 0, ultimoCiclo = -1, scelti = [];
  function macchina(t, dt) {
    const ciclo = Math.floor(t / PERIODO);
    const c = (t % PERIODO) / PERIODO;
    if (ciclo !== ultimoCiclo) {
      ultimoCiclo = ciclo;
      buste++; disegnaHmi();
      scelti = [];
      while (scelti.length < 3) { const k = Math.floor(caso() * N); if (!scelti.includes(k)) scelti.push(k); }
      let n = 0;
      for (const p of cadute) {
        if (n >= 24) break;
        if (!p.attivo) {
          p.attivo = true; p.t0 = t + caso() * 0.16; p.dur = 0.34 + caso() * 0.1;
          const k = scelti[n % 3];
          p.a = angoli[k] + (caso() - 0.5) * 0.18; p.r = 0.47 + caso() * 0.06;
          p.rot.set(caso() * 3, caso() * 3, caso() * 3);
          n++;
        }
      }
    }
    // traino del film
    const tiro = easeInOut(fase(c, 0, 0.38));
    const v = ciclo + tiro;
    const dv = v - filmV; filmV = v;
    filmManica.offset.y = filmV % 100;
    filmSu.offset.y = -(filmV % 100);
    filmPiano.offset.y = filmV % 100;
    rotolo.rotation.x -= dv * (BUSTA_L / 0.34);
    led.material.color.setHex(c > 0.16 && c < 0.24 ? 0x4cff8a : 0xff3b2f);

    // busta che si forma sotto le ganasce
    formante.scale.y = lerp(0.12, 1, tiro);
    formante.scale.z = lerp(0.55, 1, fase(c, 0.1, 0.5));

    // ganasce
    const chiudi = liscia(fase(c, 0.38, 0.5)) * (1 - liscia(fase(c, 0.72, 0.86)));
    gDavanti.position.z = Z0 + lerp(0.24, 0.045, chiudi);
    gDietro.position.z = Z0 - lerp(0.24, 0.045, chiudi);
    const calore = Math.sin(Math.PI * fase(c, 0.46, 0.76));
    resistenza.emissiveIntensity = 2.4 * calore;
    resistenzaV.emissiveIntensity = 1.8 * calore;
    barraV.position.z = -0.02 * chiudi;

    // taglio: la busta piena cade
    if (c >= 0.72 && formante.userData.ultimoTaglio !== ciclo) {
      formante.userData.ultimoTaglio = ciclo;
      const libera = cadenti.find((b) => !b.attiva);
      if (libera) { libera.attiva = true; libera.t = 0; libera.mesh.visible = true; }
    }
    if (c >= 0.72) formante.scale.y = lerp(1, 0.12, liscia(fase(c, 0.72, 0.8)));

    for (const b of cadenti) {
      if (!b.attiva) continue;
      b.t += dt;
      const m = b.mesh;
      const k = clamp(b.t / 0.32);
      m.position.y = lerp(BUSTA_TOP, NASTRO_Y + BUSTA_T / 2 + 0.002, k * k);
      m.rotation.x = lerp(0, -Math.PI / 2, easeInOut(k));
      m.position.z = lerp(Z0, Z0 - BUSTA_L / 2, easeInOut(k));
      if (b.t < 0.32) m.position.x = 0;
      else m.position.x += NASTRO_V * dt;
      const fine = fase(m.position.x, 2.05, 2.35);
      m.scale.setScalar(1 - fine);
      if (fine >= 1) { b.attiva = false; m.visible = false; m.position.x = 0; m.scale.setScalar(1); }
    }
    nastroTex.offset.x -= NASTRO_V * dt / 0.2;

    // porte dei secchi
    for (let i = 0; i < N; i++) {
      const target = scelti.includes(i) ? Math.sin(Math.PI * fase(c, 0.0, 0.42)) : 0;
      aperture[i] += (target - aperture[i]) * Math.min(1, dt * 18);
    }
    aggiornaPorte();

    // pezzi che cadono nell'imbuto
    for (let i = 0; i < NP_CADE; i++) {
      const p = cadute[i];
      let s = 0;
      if (p.attivo) {
        const k = (t - p.t0) / p.dur;
        if (k >= 1) p.attivo = false;
        else if (k >= 0) {
          const r = lerp(p.r, 0, k * k), y = lerp(2.82, 2.5, k * k * 0.9 + k * 0.1);
          v3.set(Math.cos(p.a) * r, y, Math.sin(p.a) * r);
          p.rot.x += dt * 9; p.rot.y += dt * 6;
          q.setFromEuler(p.rot);
          s = y > 2.57 ? 1 : 0;
        }
      }
      pezzi.setMatrixAt(NP_FERMI + i, m4.compose(v3, q, s ? uno : zero));
    }
    pezzi.instanceMatrix.needsUpdate = true;
    cono.rotation.y = t * 0.4;
  }

  // ---------- fotogramma ----------
  let t0 = null, ultimo = 0, attivo = true, visibile = false, inCorsa = false;
  function disegna(t, dt) {
    const st = statoScroll();
    bersaglio(st.pre, st.s);
    if (ritratto) {
      // da telefono la camera si allontana un po' per far stare la macchina in verticale
      vP.sub(vT).multiplyScalar(1.38).add(vT);
    }
    const k = dt > 0 ? 1 - Math.exp(-dt * 7) : 1;
    camP.lerp(vP, k); camT.lerp(vT, k);
    camera.position.copy(camP);
    camera.lookAt(camT);
    const passo = st.pre > 0.5 ? -1 : Math.min(3, Math.floor(st.s));
    for (let g = 0; g < 4; g++) {
      const target = g === passo ? 0.07 + 0.05 * Math.sin(t * 4.2) : 0;
      intensita[g] += (target - intensita[g]) * Math.min(1, dt * 6 || 1);
      for (const m of gruppi[g]) m.emissiveIntensity = intensita[g];
    }
    renderer.render(scene, camera);
  }
  function fotogramma(ora) {
    inCorsa = false;
    if (t0 === null) { t0 = ora; ultimo = ora; }
    const dt = Math.min(0.05, Math.max(0, (ora - ultimo) / 1000));
    ultimo = ora;
    const t = (ora - t0) / 1000;
    macchina(t, dt);
    disegna(t, dt);
    if (attivo && visibile) { inCorsa = true; requestAnimationFrame(fotogramma); }
  }
  function riparti() {
    if (ridotto) { macchina(0.6, 0); disegna(0, 0); return; }
    if (inCorsa) return;
    ultimo = performance.now();
    inCorsa = true;
    requestAnimationFrame(fotogramma);
  }
  if (ridotto) {
    addEventListener('scroll', () => { if (visibile) disegna(0, 0); }, { passive: true });
  }
  const io = new IntersectionObserver(([e]) => {
    visibile = e.isIntersecting;
    if (visibile && attivo) riparti();
  }, { rootMargin: '10% 0px' });
  io.observe(palco);
  document.addEventListener('visibilitychange', () => {
    attivo = !document.hidden;
    if (attivo && visibile) riparti();
  });

  macchina(0.6, 0);
  disegna(0, 0);
  corsa.closest('.linea').classList.add('pronta');
  return { renderer };
}
