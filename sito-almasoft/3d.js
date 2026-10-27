// Palco 3D di Alma: dal rilievo laser al gemello digitale.
// La pagina è già leggibile senza questo modulo: qui arriva solo la scena, in dissolvenza sopra il poster.
import * as THREE from 'three';
import { MeshSurfaceSampler } from 'three/addons/math/MeshSurfaceSampler.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const PIANO = 3.4;
const GRONDA = 6.8;
const FALDA = THREE.MathUtils.degToRad(38);
const SPESS = 0.3;
const FRONT = 4 * Math.tan(FALDA);       // frontone del corpo principale
const FRONT_ALA = 2.5 * Math.tan(FALDA); // frontone dell'ala
const COLMO = GRONDA + FRONT;
const COLMO_ALA = GRONDA + FRONT_ALA;
const SCANNER = new THREE.Vector3(-12, 1.5, 14);

const clamp01 = (v) => Math.min(1, Math.max(0, v));
const liscio = (a, b, v) => { const t = clamp01((v - a) / (b - a)); return t * t * (3 - 2 * t); };
const mix = (a, b, t) => a + (b - a) * t;
const rgb = (h) => { const n = parseInt(h.slice(1), 16); return [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255]; };

/* ---------- Edificio ---------- */

function finestre(len, quante, o = {}) {
  const w = o.w ?? 1.1, h = o.h ?? 1.55, davanzale = o.davanzale ?? 0.95;
  const buchi = [];
  for (let f = 0; f < 2; f++) {
    for (let i = 0; i < quante; i++) {
      const cx = (i + 0.5) * len / quante;
      if (f === 0 && o.porta === i) { buchi.push([cx - 0.75, 0.2, 1.5, 2.4]); continue; }
      buchi.push([cx - w / 2, f * PIANO + davanzale, w, h]);
    }
  }
  if (o.soffitta) buchi.push([len / 2 - 0.42, GRONDA + 0.5, 0.84, 0.84]);
  return buchi;
}

function muro(len, frontone, buchi) {
  const s = new THREE.Shape();
  s.moveTo(0, 0); s.lineTo(len, 0); s.lineTo(len, GRONDA);
  if (frontone) s.lineTo(len / 2, GRONDA + frontone);
  s.lineTo(0, GRONDA); s.closePath();
  for (const [x, y, w, h] of buchi) {
    const p = new THREE.Path();
    p.moveTo(x, y); p.lineTo(x, y + h); p.lineTo(x + w, y + h); p.lineTo(x + w, y); p.closePath();
    s.holes.push(p);
  }
  return new THREE.ExtrudeGeometry(s, { depth: SPESS, bevelEnabled: false, curveSegments: 1 });
}
// muro lungo X: da x0 per len, spessore da z0 a z0+SPESS
const muroX = (g, x0, z0) => g.translate(x0, 0, z0);
// muro lungo Z: da z0 per len, spessore da x0-SPESS a x0
const muroZ = (g, x0, z0) => g.rotateY(-Math.PI / 2).translate(x0, 0, z0);

function lastra(w, h, d, x, y, z, rx = 0, rz = 0) {
  const g = new THREE.BoxGeometry(w, h, d);
  if (rx) g.rotateX(rx);
  if (rz) g.rotateZ(rz);
  return g.translate(x, y, z).toNonIndexed();
}

function costruisciEdificio() {
  const muri = [
    muroX(muro(9, 0, finestre(9, 4, { porta: 1 })), -7, 4 - SPESS),           // fronte
    muroX(muro(14, 0, finestre(14, 6)), -7, -4),                               // retro
    muroZ(muro(8, FRONT, finestre(8, 2, { soffitta: true })), 7, -4),          // testata est
    muroZ(muro(8, FRONT, finestre(8, 2, { soffitta: true })), -7 + SPESS, -4), // testata ovest
    muroX(muro(5, FRONT_ALA, finestre(5, 2, { porta: 1, soffitta: true })), 2, 10 - SPESS), // fronte dell'ala
    muroZ(muro(6, 0, finestre(6, 2)), 2 + SPESS, 4),                           // fianco ovest dell'ala
    muroZ(muro(6, 0, finestre(6, 2)), 7, 4),                                   // fianco est dell'ala
  ];

  const rise = 0.14;
  const run = 4.45, L = run / Math.cos(FALDA);
  const runA = 2.95, LA = runA / Math.cos(FALDA);
  const tetti = [
    lastra(14.8, 0.22, L, 0, COLMO - (run / 2) * Math.tan(FALDA) + rise, run / 2, FALDA),
    lastra(14.8, 0.22, L, 0, COLMO - (run / 2) * Math.tan(FALDA) + rise, -run / 2, -FALDA),
    lastra(LA, 0.22, 7.25, 4.5 + runA / 2, COLMO_ALA - (runA / 2) * Math.tan(FALDA) + rise, 6.825, 0, -FALDA),
    lastra(LA, 0.22, 7.25, 4.5 - runA / 2, COLMO_ALA - (runA / 2) * Math.tan(FALDA) + rise, 6.825, 0, FALDA),
  ];
  const camino = [lastra(0.7, 2.2, 0.7, -4, 9.2, -1.6)];
  const solai = [];
  for (const y of [0.0, PIANO, GRONDA]) {
    solai.push(lastra(14, 0.25, 8, 0, y, 0));
    solai.push(lastra(5, 0.25, 6, 4.5, y, 7));
  }
  return { muri, tetti, camino, solai };
}

function colora(g, hex) {
  const [r, gg, b] = rgb(hex);
  const n = g.attributes.position.count;
  const c = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { c[i * 3] = r; c[i * 3 + 1] = gg; c[i * 3 + 2] = b; }
  g.setAttribute('color', new THREE.BufferAttribute(c, 3));
  return g;
}

/* ---------- Nuvola di punti ---------- */

function nuvola(ed, quanti) {
  const scansione = mergeGeometries([
    ...ed.muri.map((g) => colora(g.clone(), '#B38C66')),
    ...ed.tetti.map((g) => colora(g.clone(), '#7E4636')),
    ...ed.camino.map((g) => colora(g.clone(), '#663B2F')),
  ]);
  const sampler = new MeshSurfaceSampler(new THREE.Mesh(scansione)).build();
  const pos = [], col = [], tipo = [];
  const p = new THREE.Vector3(), n = new THREE.Vector3(), c = new THREE.Color();
  for (let i = 0; i < quanti.edificio; i++) {
    sampler.sample(p, n, c);
    const k = 0.86 + Math.random() * 0.24;
    pos.push(p.x + (Math.random() - 0.5) * 0.03, p.y + (Math.random() - 0.5) * 0.03, p.z + (Math.random() - 0.5) * 0.03);
    col.push(c.r * k, c.g * k, c.b * k);
    tipo.push(0);
  }
  // terreno rilevato intorno all'edificio (non sotto)
  const erba = rgb('#93A189'), ghiaia = rgb('#B3AA98');
  for (let i = 0; i < quanti.terreno; i++) {
    const r = 15.5 * Math.sqrt(Math.random()), a = Math.random() * Math.PI * 2;
    const x = Math.cos(a) * r, z = 3 + Math.sin(a) * r;
    const dentro = (x > -7.1 && x < 7.1 && z > -4.1 && z < 4.1) || (x > 1.9 && x < 7.1 && z > 3.9 && z < 10.1);
    if (dentro) { i--; continue; }
    const vialetto = x > 3.7 && x < 5.3 && z > 10;
    const t = vialetto ? 1 : clamp01(0.25 + 0.5 * Math.sin(x * 0.7) * Math.cos(z * 0.5));
    const base = vialetto ? ghiaia : [mix(erba[0], ghiaia[0], t * 0.5), mix(erba[1], ghiaia[1], t * 0.5), mix(erba[2], ghiaia[2], t * 0.5)];
    const k = 0.85 + Math.random() * 0.25;
    pos.push(x, 0.02 + Math.random() * 0.04, z);
    col.push(base[0] * k, base[1] * k, base[2] * k);
    tipo.push(1);
  }
  // alberi: il rilievo vede tutto, il modello tiene solo l'edificio
  const alberi = [[-11.5, 3, 2.4], [10.6, -5.6, 2.1], [-8.6, -8.2, 2.6]];
  const verdi = [rgb('#5B7A4C'), rgb('#4A6740'), rgb('#6E8C5A')], tronco = rgb('#5E4C3E');
  const perAlbero = Math.floor(quanti.alberi / alberi.length);
  for (const [ax, az, ar] of alberi) {
    for (let i = 0; i < perAlbero; i++) {
      const sulTronco = i < perAlbero * 0.12;
      if (sulTronco) {
        const a = Math.random() * Math.PI * 2, y = Math.random() * 3.2;
        pos.push(ax + Math.cos(a) * 0.24, y, az + Math.sin(a) * 0.24);
        col.push(...tronco);
      } else {
        const u = Math.random() * 2 - 1, a = Math.random() * Math.PI * 2, s = Math.sqrt(1 - u * u);
        const rr = ar * (0.72 + Math.random() * 0.28);
        pos.push(ax + s * Math.cos(a) * rr, 3.9 + ar * 0.25 + u * rr * 0.85, az + s * Math.sin(a) * rr);
        const v = verdi[(Math.random() * 3) | 0], k = 0.8 + Math.random() * 0.35;
        col.push(v[0] * k, v[1] * k, v[2] * k);
      }
      tipo.push(2);
    }
  }
  // ordine della spazzata: angolo visto dallo scanner
  const N = tipo.length, ordine = new Float32Array(N), caso = new Float32Array(N);
  let min = Infinity, max = -Infinity;
  for (let i = 0; i < N; i++) {
    const a = Math.atan2(pos[i * 3 + 2] - SCANNER.z, pos[i * 3] - SCANNER.x);
    ordine[i] = a; if (a < min) min = a; if (a > max) max = a;
  }
  for (let i = 0; i < N; i++) { ordine[i] = (ordine[i] - min) / (max - min) + (Math.random() - 0.5) * 0.012; caso[i] = Math.random(); }

  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setAttribute('aOrdine', new THREE.BufferAttribute(ordine, 1));
  g.setAttribute('aCaso', new THREE.BufferAttribute(caso, 1));
  g.setAttribute('aTipo', new THREE.Float32BufferAttribute(tipo, 1));
  scansione.dispose();
  return { geometria: g, angoli: [min, max] };
}

const puntiVert = /* glsl */`
  uniform float uScan, uTaglio, uSvanisci, uDim, uPR, uScala, uTempo;
  uniform vec3 uScanner;
  attribute float aOrdine, aCaso, aTipo;
  varying vec3 vCol;
  varying float vAlfa;
  void main() {
    float l = clamp((uScan - aOrdine) * 7.0, 0.0, 1.0);
    float e = 1.0 - pow(1.0 - l, 3.0);
    vec3 p = mix(uScanner, position, e);
    float sopra = smoothstep(uTaglio - 0.35, uTaglio + 0.25, position.y);
    float banda = (1.0 - smoothstep(0.0, 0.7, abs(position.y - uTaglio))) * step(0.01, uTaglio + 0.5) * (1.0 - step(10.9, uTaglio));
    float vivo = aTipo < 0.5 ? sopra : (1.0 - uSvanisci);
    float fresco = (1.0 - l) * step(0.001, l);
    vCol = mix(color, vec3(0.62, 0.86, 0.98), max(fresco, banda * (aTipo < 0.5 ? 1.0 : 0.0)));
    vAlfa = l * vivo;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    float s = uDim * uPR * (0.65 + 0.7 * aCaso) * (uScala / -mv.z) * (1.0 + fresco * 1.6 + banda * 0.8);
    gl_PointSize = vAlfa > 0.002 ? s : 0.0;
    gl_Position = projectionMatrix * mv;
  }`;
const puntiFrag = /* glsl */`
  varying vec3 vCol;
  varying float vAlfa;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    if (d > 0.5) discard;
    gl_FragColor = vec4(vCol, vAlfa * smoothstep(0.5, 0.32, d));
  }`;

/* ---------- Impianti ---------- */

const IMPIANTI = [
  { colore: '#4FB2E3', raggio: 0.2, da: 0.0, a: 0.55, linee: [
    [[5.6, 0.4, -2.9], [5.6, 8.35, -2.9]],
    [[5.6, 2.9, -2.9], [5.6, 2.9, 0], [-6.0, 2.9, 0]],
    [[5.6, 6.3, -2.9], [5.6, 6.3, 0], [-6.0, 6.3, 0]],
  ] },
  { colore: '#4FB2E3', raggio: 0.11, da: 0.25, a: 0.7, linee: [
    [[-3.5, 2.9, 0], [-3.5, 2.9, -3.0]], [[0, 2.9, 0], [0, 2.9, 3.0]], [[4.5, 2.9, 0], [4.5, 2.9, 8.8]],
    [[-3.5, 6.3, 0], [-3.5, 6.3, 3.0]], [[0.5, 6.3, 0], [0.5, 6.3, -3.0]], [[4.5, 6.3, 0], [4.5, 6.3, 8.8]],
  ] },
  { colore: '#2E6BD0', raggio: 0.07, da: 0.12, a: 0.72, linee: [
    [[-5.8, 0.2, -3.3], [-5.8, 6.0, -3.3]],
    [[-5.8, 0.7, -3.3], [6.3, 0.7, -3.3], [6.3, 0.7, 9.3]],
    [[-5.8, 0.95, -3.05], [6.05, 0.95, -3.05], [6.05, 0.95, 9.1]],
    [[-5.8, 4.1, -3.3], [3.0, 4.1, -3.3]],
  ] },
  { colore: '#2F9E6C', raggio: 0.11, da: 0.3, a: 0.85, linee: [
    [[-2.2, -0.6, -3.45], [-2.2, 8.4, -3.45]],
    [[6.2, -0.6, 9.25], [6.2, 8.0, 9.25]],
    [[-6.0, 0.32, -3.45], [-2.2, 0.16, -3.45]],
    [[-5.0, 3.72, -3.45], [-2.2, 3.56, -3.45]],
    [[3.0, 0.32, 9.25], [6.2, 0.16, 9.25]],
  ] },
  { colore: '#E3A126', raggio: 0.05, da: 0.42, a: 1.0, linee: [
    [[6.3, 0.3, 2.9], [6.3, 6.6, 2.9]],
    [[-6.2, 3.15, 2.4], [6.0, 3.15, 2.4], [6.0, 3.15, 9.0]],
    [[-6.2, 6.55, 2.4], [6.0, 6.55, 2.4], [6.0, 6.55, 9.0]],
  ] },
];

function costruisciImpianti(gruppo) {
  const tubi = [];
  for (const d of IMPIANTI) {
    const mat = new THREE.MeshStandardMaterial({ color: d.colore, roughness: 0.42, metalness: 0.08, emissive: d.colore, emissiveIntensity: 0.18 });
    for (const linea of d.linee) {
      const percorso = new THREE.CurvePath();
      let lung = 0;
      for (let i = 0; i < linea.length - 1; i++) {
        const a = new THREE.Vector3(...linea[i]), b = new THREE.Vector3(...linea[i + 1]);
        percorso.add(new THREE.LineCurve3(a, b));
        lung += a.distanceTo(b);
      }
      const seg = Math.max(8, Math.round(lung * 5));
      const g = new THREE.TubeGeometry(percorso, seg, d.raggio, 10, false);
      const m = new THREE.Mesh(g, mat);
      m.userData = { totale: g.index.count, da: d.da, a: d.a };
      g.setDrawRange(0, 0);
      m.visible = false;
      gruppo.add(m);
      tubi.push(m);
      // giunti alle curve, per non vedere i tubi spezzati
      for (let i = 1; i < linea.length - 1; i++) {
        const s = new THREE.Mesh(new THREE.SphereGeometry(d.raggio * 1.04, 12, 8), mat);
        s.position.set(...linea[i]);
        s.userData = { giunto: true, soglia: i / (linea.length - 1), padre: m };
        s.visible = false;
        gruppo.add(s);
        tubi.push(s);
      }
    }
  }
  return tubi;
}

/* ---------- Avvio ---------- */

export function avvia(palco) {
  const tela = palco.querySelector('.modello__tela');
  const sezione = palco.parentElement;
  const etichette = [...palco.querySelectorAll('.sensore')];
  const fermo = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const telefono = matchMedia('(max-width: 899px)').matches;

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas: tela, antialias: true, alpha: true, powerPreference: 'high-performance' });
  } catch (e) { return null; }
  if (!renderer.getContext()) return null;
  const pr = Math.min(window.devicePixelRatio || 1, telefono ? 1.5 : 2);
  renderer.setPixelRatio(pr);
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.localClippingEnabled = true;

  const scena = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scena.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  pmrem.dispose();
  const sole = new THREE.DirectionalLight(0xffffff, 1.1);
  sole.position.set(-8, 16, 10);
  scena.add(sole);

  const camera = new THREE.PerspectiveCamera(telefono ? 42 : 32, 1, 0.5, 400);

  /* griglia dello spazio modello */
  const griglia = new THREE.Mesh(
    new THREE.PlaneGeometry(90, 90).rotateX(-Math.PI / 2).translate(0, -0.01, 3),
    new THREE.ShaderMaterial({
      transparent: true, depthWrite: false,
      vertexShader: `varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position,1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
      fragmentShader: `varying vec3 vW;
        float linea(vec2 c){ vec2 g = abs(fract(c - 0.5) - 0.5) / fwidth(c); return 1.0 - min(min(g.x, g.y), 1.0); }
        void main(){
          float r = length(vW.xz - vec2(0.0, 3.0)) / 30.0;
          float a = (linea(vW.xz) * 0.07 + linea(vW.xz / 5.0) * 0.16) * (1.0 - smoothstep(0.3, 1.0, r));
          gl_FragColor = vec4(0.09, 0.13, 0.17, a);
        }`,
    })
  );
  scena.add(griglia);

  /* ombra di contatto */
  const ombraTela = document.createElement('canvas');
  ombraTela.width = ombraTela.height = 128;
  const oc = ombraTela.getContext('2d');
  const grad = oc.createRadialGradient(64, 64, 8, 64, 64, 64);
  grad.addColorStop(0, 'rgba(23,33,43,0.55)'); grad.addColorStop(1, 'rgba(23,33,43,0)');
  oc.fillStyle = grad; oc.fillRect(0, 0, 128, 128);
  const ombra = new THREE.Mesh(
    new THREE.PlaneGeometry(26, 22).rotateX(-Math.PI / 2).translate(0.5, 0.005, 3),
    new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(ombraTela), transparent: true, depthWrite: false, opacity: 0 })
  );
  scena.add(ombra);

  /* edificio */
  const ed = costruisciEdificio();
  const taglio = new THREE.Plane(new THREE.Vector3(0, -1, 0), -1);
  const matInvolucro = new THREE.MeshStandardMaterial({ color: '#F2F4F6', roughness: 0.88, metalness: 0, transparent: true, opacity: 1, clippingPlanes: [taglio], side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 });
  const matSolai = new THREE.MeshStandardMaterial({ color: '#DCE1E5', roughness: 0.9, transparent: true, opacity: 1, clippingPlanes: [taglio], polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 });
  const matSpigoli = new THREE.LineBasicMaterial({ color: '#2A3642', transparent: true, opacity: 0, clippingPlanes: [taglio] });
  const involucroGeo = mergeGeometries([...ed.muri, ...ed.tetti, ...ed.camino]);
  const solaiGeo = mergeGeometries(ed.solai);
  const involucro = new THREE.Mesh(involucroGeo, matInvolucro);
  const solai = new THREE.Mesh(solaiGeo, matSolai);
  const spigoli = new THREE.LineSegments(new THREE.EdgesGeometry(involucroGeo, 25), matSpigoli);
  const spigoliSolai = new THREE.LineSegments(new THREE.EdgesGeometry(solaiGeo, 25), matSpigoli);
  const modello = new THREE.Group();
  modello.add(solai, involucro, spigoli, spigoliSolai);
  modello.visible = false;
  scena.add(modello);

  /* nuvola */
  const quanti = telefono ? { edificio: 34000, terreno: 8000, alberi: 5400 } : { edificio: 64000, terreno: 16000, alberi: 9600 };
  const { geometria: nuvolaGeo, angoli } = nuvola(ed, quanti);
  const uni = {
    uScan: { value: fermo ? 1.2 : 0 }, uTaglio: { value: -1 }, uSvanisci: { value: 0 },
    uDim: { value: telefono ? 2.75 : 2.9 }, uPR: { value: pr }, uScala: { value: 40 }, uTempo: { value: 0 },
    uScanner: { value: SCANNER.clone() },
  };
  const punti = new THREE.Points(nuvolaGeo, new THREE.ShaderMaterial({
    uniforms: uni, vertexShader: puntiVert, fragmentShader: puntiFrag, vertexColors: true, transparent: true, depthWrite: false,
  }));
  punti.frustumCulled = false;
  scena.add(punti);

  /* scanner */
  const scanner = new THREE.Group();
  const matScanner = new THREE.MeshStandardMaterial({ color: '#17212B', roughness: 0.5, metalness: 0.3, transparent: true });
  const testa = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.5, 0.36), matScanner);
  testa.position.y = 1.55;
  scanner.add(testa);
  for (let i = 0; i < 3; i++) {
    const a = i * Math.PI * 2 / 3;
    const gamba = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 1.45, 6), matScanner);
    gamba.position.set(Math.cos(a) * 0.32, 0.68, Math.sin(a) * 0.32);
    gamba.lookAt(0, 1.4, 0); gamba.rotateX(Math.PI / 2);
    scanner.add(gamba);
  }
  scanner.position.set(SCANNER.x, 0, SCANNER.z);
  scena.add(scanner);
  // raggi laser: dalla testa dello scanner ai punti appena rilevati
  const ordinati = Array.from({ length: nuvolaGeo.attributes.aOrdine.count }, (_, i) => i)
    .sort((x, y) => nuvolaGeo.attributes.aOrdine.array[x] - nuvolaGeo.attributes.aOrdine.array[y]);
  const RAGGI = telefono ? 14 : 22;
  const raggiPos = new Float32Array(RAGGI * 6);
  const raggiGeo = new THREE.BufferGeometry();
  raggiGeo.setAttribute('position', new THREE.BufferAttribute(raggiPos, 3));
  const matRaggi = new THREE.LineBasicMaterial({ color: '#4FB2E3', transparent: true, opacity: 0, depthWrite: false });
  const raggi = new THREE.LineSegments(raggiGeo, matRaggi);
  raggi.frustumCulled = false;
  scena.add(raggi);
  const posNuvola = nuvolaGeo.attributes.position.array;
  const ordNuvola = nuvolaGeo.attributes.aOrdine.array;
  function aggiornaRaggi(scan) {
    // punto della spazzata: il primo indice con ordine >= scan - 1/14
    const soglia = scan - 1 / 14;
    let lo = 0, hi = ordinati.length - 1;
    while (lo < hi) { const m = (lo + hi) >> 1; if (ordNuvola[ordinati[m]] < soglia) lo = m + 1; else hi = m; }
    for (let r = 0; r < RAGGI; r++) {
      const j = ordinati[Math.max(0, Math.min(ordinati.length - 1, lo - ((Math.random() * 900) | 0)))];
      raggiPos.set([SCANNER.x, 1.62, SCANNER.z, posNuvola[j * 3], posNuvola[j * 3 + 1], posNuvola[j * 3 + 2]], r * 6);
    }
    raggiGeo.attributes.position.needsUpdate = true;
  }

  /* impianti */
  const gruppoImpianti = new THREE.Group();
  const tubi = costruisciImpianti(gruppoImpianti);
  scena.add(gruppoImpianti);

  /* sensori del gemello digitale */
  const posSensori = [new THREE.Vector3(-3.2, 1.6, 1.4), new THREE.Vector3(3.8, 5.0, -1.4), new THREE.Vector3(0, COLMO + 0.35, 0)];
  const sensori = posSensori.map((p) => {
    const g = new THREE.Group();
    g.position.copy(p);
    const nucleo = new THREE.Mesh(new THREE.SphereGeometry(0.2, 16, 12), new THREE.MeshBasicMaterial({ color: '#4FB2E3' }));
    const anello = new THREE.Mesh(new THREE.RingGeometry(0.3, 0.38, 40), new THREE.MeshBasicMaterial({ color: '#4FB2E3', transparent: true, depthWrite: false, side: THREE.DoubleSide }));
    g.add(nucleo, anello);
    g.userData.anello = anello;
    g.visible = false;
    scena.add(g);
    return g;
  });

  /* stato */
  const bersaglio = new THREE.Vector3(0, 3.8, 3);
  const st = { p: 0, solido: 0, xray: 0, mep: 0, gemello: 0, cornice: 0, az: 0.62, el: 0.28, df: 1 };
  let W = 1, H = 1, vivo = true, visibile = true, t0 = 0, ultimo = 0, scanFine = fermo;
  const puntatore = { x: 0, y: 0, tx: 0, ty: 0 };

  function progresso() {
    const r = sezione.getBoundingClientRect();
    const corsa = sezione.offsetHeight - palco.offsetHeight;
    return corsa > 0 ? clamp01(-r.top / corsa) : 0;
  }

  function dimensiona() {
    W = palco.clientWidth; H = palco.clientHeight;
    renderer.setSize(W, H, false);
  }

  function obiettivi(p) {
    const o = {};
    o.solido = liscio(0.25, 0.42, p);
    o.svanisci = liscio(0.3, 0.44, p);
    o.xray = liscio(0.5, 0.58, p);
    o.mep = clamp01((p - 0.53) / 0.2);
    o.gemello = liscio(0.75, 0.82, p);
    o.cornice = liscio(0.0, 0.07, p);
    // camera per fase: rilievo, modello, impianti, gemello
    const k2 = liscio(0.27, 0.42, p), k3 = liscio(0.5, 0.62, p), k4 = liscio(0.74, 0.86, p);
    o.az = mix(mix(mix(0.62, 0.8, k2), 0.95, k3), 0.5, k4);
    o.el = mix(mix(mix(0.27, 0.33, k2), 0.6, k3), 0.42, k4);
    o.df = mix(mix(mix(1.0, 0.97, k2), 0.93, k3), 0.95, k4);
    return o;
  }

  function inquadra() {
    const aspetto = W / H;
    const vfov = THREE.MathUtils.degToRad(camera.fov);
    // area utile del canvas e centro del modello, in frazioni
    let fx, fy, cx, cy;
    if (W >= 900) { fx = 0.56; fy = 0.8; cx = mix(0.69, 0.665, st.cornice); cy = mix(0.55, 0.54, st.cornice); }
    else {
      const testo = Math.min(0.56, 0.5 + (430 - W) / 2000);
      fx = 0.96;
      fy = mix(1 - testo - 0.1, 0.58, st.cornice);
      cy = mix(testo + (1 - testo - 0.16) / 2, 0.39, st.cornice);
      cx = 0.48;
    }
    const R = W >= 900 ? mix(10.0, 10.9, st.cornice) : mix(9.3, 10.9, st.cornice);
    const mezzaV = Math.atan(Math.tan(vfov / 2) * fy);
    const mezzaH = Math.atan(Math.tan(vfov / 2) * aspetto * fx);
    const d = (R / Math.sin(Math.min(mezzaV, mezzaH))) * st.df;
    camera.aspect = aspetto;
    camera.setViewOffset(W, H, -(cx - 0.5) * W, -(cy - 0.5) * H, W, H);
    camera.updateProjectionMatrix();
    return d;
  }

  function disegna(adesso) {
    const t = (adesso - t0) / 1000;
    const dt = Math.min(0.05, (adesso - (ultimo || adesso)) / 1000);
    ultimo = adesso;

    if (!fermo) {
      uni.uScan.value = Math.min(1.2, t / 2.6 * 1.2);
      if (uni.uScan.value >= 1.2) scanFine = true;
    }
    const o = obiettivi(progresso());
    const k = fermo ? 1 : 1 - Math.exp(-dt * 5.5);
    for (const c of ['solido', 'svanisci', 'xray', 'mep', 'gemello', 'cornice', 'az', 'el', 'df']) st[c] += (o[c] - st[c]) * k;

    // nuvola e modello
    const taglioY = mix(-0.6, 11.4, st.solido);
    taglio.constant = taglioY;
    uni.uTaglio.value = st.solido > 0.001 ? taglioY : -5;
    uni.uSvanisci.value = st.svanisci;
    modello.visible = st.solido > 0.002;
    matSpigoli.opacity = Math.min(1, st.solido * 3) * mix(1, 0.4, st.xray);
    matInvolucro.opacity = mix(1, 0.07, st.xray);
    matInvolucro.depthWrite = st.xray < 0.05;
    matSolai.opacity = mix(1, 0.5, st.xray);
    matSolai.depthWrite = st.xray < 0.05;
    ombra.material.opacity = 0.32 * st.solido;
    punti.visible = st.solido < 0.995 || st.svanisci < 0.995;

    // scanner
    const scanAttivo = clamp01(uni.uScan.value) < 1 ? 1 : 0;
    const angolo = mix(angoli[0], angoli[1], clamp01(uni.uScan.value / 1.05));
    const alfaRaggi = scanAttivo ? 0.55 : 0;
    matRaggi.opacity += (alfaRaggi - matRaggi.opacity) * (fermo ? 1 : 1 - Math.exp(-dt * 8));
    raggi.visible = matRaggi.opacity > 0.01;
    if (raggi.visible) aggiornaRaggi(uni.uScan.value);
    matScanner.opacity = 1 - st.svanisci;
    scanner.visible = matScanner.opacity > 0.01;
    testa.rotation.y = -angolo;

    // impianti
    for (const m of tubi) {
      if (m.userData.giunto) {
        const padre = m.userData.padre.userData;
        const f = clamp01((st.mep - padre.da) / (padre.a - padre.da));
        m.visible = f > m.userData.soglia;
        continue;
      }
      const f = clamp01((st.mep - m.userData.da) / (m.userData.a - m.userData.da));
      const n = Math.floor(f * m.userData.totale / 6) * 6;
      m.geometry.setDrawRange(0, n);
      m.visible = n > 0;
    }

    // camera
    const oscilla = fermo ? 0 : Math.sin(t * 0.13) * 0.1;
    if (!telefono) { puntatore.x += (puntatore.tx - puntatore.x) * 0.05; puntatore.y += (puntatore.ty - puntatore.y) * 0.05; }
    const az = st.az + oscilla + puntatore.x * 0.12;
    const el = st.el + puntatore.y * 0.05;
    const d = inquadra();
    camera.position.set(
      bersaglio.x + d * Math.sin(az) * Math.cos(el),
      bersaglio.y + d * Math.sin(el),
      bersaglio.z + d * Math.cos(az) * Math.cos(el)
    );
    camera.lookAt(bersaglio);
    camera.updateMatrixWorld();
    uni.uScala.value = d * 0.62;

    // sensori
    const g = st.gemello;
    sensori.forEach((s, i) => {
      s.visible = g > 0.01;
      if (!s.visible) return;
      s.scale.setScalar(g);
      const a = s.userData.anello;
      a.quaternion.copy(camera.quaternion);
      const f = fermo ? 0.3 : (t * 0.55 + i * 0.33) % 1;
      a.scale.setScalar(1 + f * 2.6);
      a.material.opacity = (1 - f) * g;
    });
    if (g > 0.4) {
      const v = new THREE.Vector3();
      etichette.forEach((el, i) => {
        v.copy(posSensori[i]).project(camera);
        const davanti = v.z < 1;
        const x = (v.x * 0.5 + 0.5) * W, y = (-v.y * 0.5 + 0.5) * H;
        const w = el.offsetWidth || 120;
        const gx = x + 16 + w > W - 12 ? x - 16 - w : x + 16;
        el.style.transform = `translate3d(${gx.toFixed(1)}px, ${(y - 14).toFixed(1)}px, 0)`;
        el.classList.toggle('vista', davanti && x > 8 && x < W - 8);
      });
    } else {
      etichette.forEach((el) => el.classList.remove('vista'));
    }

    renderer.render(scena, camera);
  }

  let rafId = 0;
  function ciclo(adesso) {
    rafId = 0;
    if (!vivo || !visibile) return;
    disegna(adesso);
    rafId = requestAnimationFrame(ciclo);
  }
  function riparti() { if (!rafId && vivo && visibile) { ultimo = 0; rafId = requestAnimationFrame(ciclo); } }

  dimensiona();
  t0 = performance.now();
  disegna(t0);
  requestAnimationFrame(() => palco.classList.add('pronto'));

  if (fermo) {
    // movimento ridotto: si ridisegna solo quando cambia lo scroll, senza animazioni
    const unaVolta = () => { if (!rafId) rafId = requestAnimationFrame((a) => { rafId = 0; disegna(a); }); };
    addEventListener('scroll', unaVolta, { passive: true });
    addEventListener('resize', () => { dimensiona(); unaVolta(); });
  } else {
    new IntersectionObserver(([e]) => { visibile = e.isIntersecting; riparti(); }, { rootMargin: '80px' }).observe(palco);
    document.addEventListener('visibilitychange', () => { vivo = !document.hidden; riparti(); });
    addEventListener('resize', dimensiona);
    if (!telefono) {
      palco.addEventListener('pointermove', (e) => {
        puntatore.tx = (e.clientX / W - 0.5) * 2;
        puntatore.ty = (e.clientY / H - 0.5) * 2;
      });
    }
    riparti();
  }

  window.__almaPalco = { renderer, stato: st, scan: () => scanFine };
  return true;
}
