// Plastico di Donut (H-FARM Campus): dal luogo al costruito, guidato dallo scroll.
// La foto aerea vera (la stessa dell'hero) fa da base: all'inizio è "carta da plastico",
// alla fine torna fotografia, allineata all'anello costruito in 3D.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

// Misure prese dalla foto aerea (frazioni della larghezza, cy dell'altezza)
const FOTO = { cx: 0.52, cy: 0.496, r: 0.218, ri: 0.132, rapporto: 0.75 };
const R = 4;                                // raggio esterno dell'anello (unità scena)
const RI = R * FOTO.ri / FOTO.r;            // raggio della corte
const PW = R / FOTO.r;                      // larghezza della base = foto
const PH = PW * FOTO.rapporto;
const BX = (0.5 - FOTO.cx) * PW;            // centro della base rispetto all'anello
const BZ = (0.5 - FOTO.cy) * PH;
const ALTEZZA = 0.6;
const GIUNTI = [87, 207, 327];              // pensiline tra i tre edifici (gradi)
const VARCO = 7;                            // apertura di ogni pensilina (gradi)

// Alberi rilevati sulla foto: [x, z, raggio chioma]
const ALBERI = [[1.63,0.99,0.28],[5.74,-4.81,0.28],[1.26,1.38,0.28],[-6.76,5.05,0.28],[-6.68,6.1,0.28],[-8.1,3.97,0.28],[-4.59,-1.92,0.27],[-6.31,6.18,0.26],[6.79,3.71,0.26],[-8.86,1.67,0.26],[6.14,-3.94,0.26],[2.81,5.76,0.26],[-9.12,1.3,0.26],[8.1,-2.4,0.26],[-8.94,0.59,0.26],[-3.72,6.62,0.26],[3.3,-3.76,0.26],[-6.05,-4.02,0.25],[-8.12,-5.28,0.25],[7.97,-1.11,0.25],[4.3,-3.21,0.25],[6.69,-2.66,0.25],[-7.34,4.0,0.25],[3.67,-5.8,0.25],[-8.2,-4.18,0.25],[-8.52,1.61,0.25],[5.11,1.33,0.25],[-7.15,5.28,0.24],[1.29,6.59,0.24],[7.29,0.91,0.24],[-6.97,6.18,0.24],[2.7,-4.23,0.24],[-8.54,1.33,0.24],[-9.25,1.48,0.24],[7.79,-3.84,0.24],[-5.53,-3.71,0.24],[7.74,-3.42,0.24],[5.85,-4.02,0.24],[1.39,0.41,0.24],[7.03,-2.45,0.23],[8.52,-2.45,0.23],[2.57,-6.46,0.23],[7.08,-0.19,0.23],[8.26,-1.19,0.23],[-4.79,-1.01,0.23],[0.26,0.67,0.23],[7.55,-4.47,0.23],[7.32,-4.6,0.23],[6.32,0.23,0.23],[-2.54,4.13,0.23],[-5.4,-5.12,0.23],[-8.54,2.61,0.23],[-0.97,5.91,0.22],[-7.91,3.55,0.22],[6.4,-2.82,0.22],[1.03,4.81,0.22],[-5.14,-3.23,0.22],[5.9,3.53,0.22],[0.26,1.27,0.22],[5.32,1.04,0.22],[6.97,0.7,0.22],[0.0,0.59,0.22],[7.11,-5.65,0.22],[-8.59,2.3,0.22],[4.72,1.69,0.22],[5.8,-1.11,0.22],[8.34,-3.21,0.22],[4.59,4.55,0.22],[4.77,1.93,0.21],[-7.0,-4.28,0.21],[6.08,-6.2,0.21],[2.49,5.52,0.21],[1.94,5.47,0.21],[-7.28,4.94,0.21],[-4.74,-4.68,0.21],[-0.57,0.78,0.21],[7.37,-5.57,0.21],[2.13,5.7,0.21],[0.84,1.12,0.21],[-5.66,6.67,0.21],[3.65,5.36,0.21],[-2.86,-4.26,0.21],[5.06,-1.58,0.21],[-3.38,3.61,0.21],[8.0,-3.31,0.21],[-6.79,-4.13,0.21],[-6.39,-3.92,0.21],[-8.49,-3.29,0.21],[-3.74,-3.26,0.21],[6.87,-5.04,0.21],[7.24,-3.84,0.21],[4.98,-5.83,0.21],[-7.68,-4.7,0.21],[-7.31,-4.47,0.21],[6.84,-3.31,0.21],[-6.13,5.0,0.21],[-6.86,-2.5,0.2],[8.26,-4.13,0.2],[0.81,6.28,0.2],[-6.47,-0.09,0.2],[-2.7,5.55,0.2],[2.89,5.36,0.2],[4.64,4.08,0.2],[-6.42,-6.07,0.2],[-6.16,-2.0,0.2],[8.31,-5.88,0.2],[7.55,-2.16,0.2],[0.53,6.54,0.2],[6.19,2.43,0.2],[-6.39,-5.28,0.2],[-1.36,6.31,0.2],[6.74,-5.83,0.2],[1.26,6.15,0.2],[0.19,-0.3,0.2],[0.32,6.41,0.2],[5.98,-0.06,0.2],[6.14,-4.49,0.2],[-5.69,-4.86,0.2]];

// Inquadrature lungo la storia: az/el in gradi, S = misura della scena da far stare nello schermo
const CHIAVI = [
  { p: 0.00, az: -40, el: 33, S: 20 },
  { p: 0.20, az: -30, el: 40, S: 17.5 },
  { p: 0.30, az: -16, el: 60, S: 16 },
  { p: 0.47, az: -6, el: 66, S: 14.5 },
  { p: 0.56, az: 4, el: 38, S: 14 },
  { p: 0.72, az: 30, el: 28, S: 13.2 },
  { p: 0.83, az: 16, el: 62, S: 13.6 },
  { p: 0.95, az: 0, el: 89.2, S: 12.4 },
  { p: 1.00, az: 0, el: 89.2, S: 12.4 },
];

const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const tratto = (p, a, b) => clamp((p - a) / (b - a));
const morbido = (t) => t * t * (3 - 2 * t);
const esce = (t) => 1 - Math.pow(1 - t, 3);
const lerp = (a, b, t) => a + (b - a) * t;

function inquadratura(p) {
  let i = 0;
  while (i < CHIAVI.length - 2 && p > CHIAVI[i + 1].p) i++;
  const a = CHIAVI[i], b = CHIAVI[i + 1];
  const t = morbido(tratto(p, a.p, b.p));
  return { az: lerp(a.az, b.az, t), el: lerp(a.el, b.el, t), S: lerp(a.S, b.S, t) };
}

function settoreAnulare(a0, a1, rEst, rInt) {
  // forma nel piano XY con y = -z, così dopo rotateX(-90°) l'angolo coincide con quello della foto
  const s = new THREE.Shape();
  const passi = 40;
  for (let i = 0; i <= passi; i++) {
    const t = THREE.MathUtils.degToRad(lerp(a0, a1, i / passi));
    const x = Math.cos(t) * rEst, y = -Math.sin(t) * rEst;
    i === 0 ? s.moveTo(x, y) : s.lineTo(x, y);
  }
  for (let i = passi; i >= 0; i--) {
    const t = THREE.MathUtils.degToRad(lerp(a0, a1, i / passi));
    s.lineTo(Math.cos(t) * rInt, -Math.sin(t) * rInt);
  }
  return s;
}

function ombraAnello() {
  const c = document.createElement('canvas');
  c.width = c.height = 512;
  const g = c.getContext('2d');
  const k = 512 / (R * 2.9);
  g.translate(256 - 4000, 256);
  g.shadowColor = 'rgba(20,24,20,0.5)';
  g.shadowBlur = 34;
  g.shadowOffsetX = 4000;
  g.lineWidth = (R - RI) * k;
  g.strokeStyle = '#000';
  g.beginPath();
  g.arc(0, 0, ((R + RI) / 2) * k, 0, Math.PI * 2);
  g.stroke();
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function ombraBase() {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d');
  const gr = g.createRadialGradient(128, 128, 30, 128, 128, 128);
  gr.addColorStop(0, 'rgba(30,34,30,0.32)');
  gr.addColorStop(1, 'rgba(30,34,30,0)');
  g.fillStyle = gr;
  g.fillRect(0, 0, 256, 256);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

const VERT = /* glsl */`
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const FRAG = /* glsl */`
  uniform sampler2D uFoto;
  uniform float uMix, uDraw, uDraw2, uTagli, uInkA, uMaschera, uAsp, uR, uRi;
  uniform vec3 uCarta, uInk;
  uniform vec2 uC;
  uniform vec3 uGiunti;
  varying vec2 vUv;

  float linea(float d, float w) {
    float aa = fwidth(d) * 1.2;
    return 1.0 - smoothstep(w - aa, w + aa, abs(d));
  }

  float taglio(vec2 p, float gradi, float d) {
    float t = radians(gradi);
    vec2 dir = vec2(cos(t), sin(t));
    float lungo = dot(p, dir);
    float dentro = step(uRi - 0.004, lungo) * step(lungo, uR + 0.004);
    float dist = abs(p.x * dir.y - p.y * dir.x);
    return linea(dist, 0.0015) * dentro;
  }

  void main() {
    vec3 f = texture2D(uFoto, vUv).rgb;
    float l = dot(f, vec3(0.2126, 0.7152, 0.0722));
    float tono = floor(pow(clamp(l, 0.0, 1.0), 0.4545) * 5.0) / 5.0;
    vec3 carta = uCarta * mix(0.74, 1.0, smoothstep(0.12, 0.72, tono));
    float sentiero = smoothstep(0.02, 0.07, f.r - f.g);
    carta = mix(carta, uCarta * 0.66, sentiero);

    vec2 q = (vUv - uC) * vec2(1.0, uAsp);
    vec2 p = vec2(q.x, -q.y);                 // stesso verso degli angoli della foto
    float d = length(q);
    float anello = smoothstep(uRi - 0.012, uRi - 0.003, d) * (1.0 - smoothstep(uR + 0.035, uR + 0.06, d));
    carta = mix(carta, uCarta * 0.985, anello * uMaschera);

    // disegno a china: il compasso parte dall'ingresso sud (87°)
    float ang = fract((atan(p.y, p.x) - radians(87.0)) / 6.2831853 + 1.0);
    float esterno = linea(d - uR, 0.0019) * step(ang, uDraw);
    float interno = linea(d - uRi, 0.0019) * step(ang, uDraw2);
    float costruzione = linea(d - uR * 1.16, 0.0006) * step(0.5, fract(ang * 90.0)) * step(ang, uDraw) * 0.55;
    float croce = (linea(q.x, 0.0007) * step(abs(q.y), 0.018) + linea(q.y, 0.0007) * step(abs(q.x), 0.018)) * step(0.02, uDraw);
    float tagli = (taglio(p, uGiunti.x, d) + taglio(p, uGiunti.y, d) + taglio(p, uGiunti.z, d)) * uTagli;
    float china = clamp(esterno + interno + costruzione + croce + tagli, 0.0, 1.0);

    vec3 col = mix(carta, uInk, china * uInkA);
    col = mix(col, f, uMix);
    gl_FragColor = vec4(col, 1.0);
    #include <colorspace_fragment>
  }
`;

export async function avvia({ palco, scena, pista, fasi, fotoUrl, mobile }) {
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  } catch (e) {
    return null;
  }
  if (!renderer.getContext()) return null;

  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, mobile ? 1.5 : 2));
  renderer.toneMapping = THREE.NoToneMapping;
  renderer.domElement.className = 'metodo__canvas';
  renderer.domElement.setAttribute('aria-hidden', 'true');

  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#E6E8E2');
  const camera = new THREE.PerspectiveCamera(30, 1, 1, 160);

  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  pmrem.dispose();

  const sole = new THREE.DirectionalLight(0xffffff, 1.5);
  sole.position.set(-9, 12, 3);
  scene.add(sole);
  scene.add(new THREE.HemisphereLight(0xffffff, 0xcfd3c8, 0.55));

  // --- base del plastico: la foto aerea vera, letta come carta ---
  const foto = await new THREE.TextureLoader().loadAsync(fotoUrl);
  foto.colorSpace = THREE.SRGBColorSpace;
  foto.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());

  const uniforms = {
    uFoto: { value: foto },
    uMix: { value: 0 }, uDraw: { value: 0 }, uDraw2: { value: 0 }, uTagli: { value: 0 },
    uInkA: { value: 1 }, uMaschera: { value: 1 },
    uAsp: { value: FOTO.rapporto },
    uR: { value: FOTO.r }, uRi: { value: FOTO.ri },
    uC: { value: new THREE.Vector2(FOTO.cx, 1 - FOTO.cy) },
    uGiunti: { value: new THREE.Vector3(...GIUNTI) },
    uCarta: { value: new THREE.Color('#F1F2ED') },
    uInk: { value: new THREE.Color('#262A26') },
  };
  const suolo = new THREE.Mesh(
    new THREE.PlaneGeometry(PW, PH).rotateX(-Math.PI / 2),
    new THREE.ShaderMaterial({ uniforms, vertexShader: VERT, fragmentShader: FRAG })
  );
  suolo.position.set(BX, 0, BZ);
  scene.add(suolo);

  const spessore = 0.34;
  const base = new THREE.Mesh(
    new THREE.BoxGeometry(PW, spessore, PH),
    new THREE.MeshStandardMaterial({ color: '#E9EAE4', roughness: 0.92 })
  );
  base.position.set(BX, -spessore / 2 - 0.03, BZ);
  scene.add(base);

  const sotto = new THREE.Mesh(
    new THREE.PlaneGeometry(PW * 1.5, PH * 1.6).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({ map: ombraBase(), transparent: true, depthWrite: false })
  );
  sotto.position.set(BX + 0.6, -spessore - 0.06, BZ + 0.4);
  scene.add(sotto);

  // --- l'anello: tre edifici di uffici e tre pensiline ---
  const anello = new THREE.Group();
  scene.add(anello);
  const matTetto = new THREE.MeshStandardMaterial({ color: '#F6F6F2', roughness: 0.7 });
  const matMuro = new THREE.MeshStandardMaterial({ color: '#D4D7CF', roughness: 0.85 });
  const matFacciata = new THREE.MeshStandardMaterial({ color: '#59605B', roughness: 0.5, metalness: 0.1 });
  const matVetro = new THREE.MeshStandardMaterial({ color: '#6E7D7A', roughness: 0.12, metalness: 0.35, side: THREE.BackSide });
  const matLinee = new THREE.LineBasicMaterial({ color: '#2A2E2A', transparent: true, opacity: 0 });
  const materiali = [matTetto, matMuro, matFacciata, matVetro];

  for (let i = 0; i < 3; i++) {
    const a0 = GIUNTI[i] + VARCO / 2;
    const a1 = (GIUNTI[(i + 1) % 3] + (i === 2 ? 360 : 0)) - VARCO / 2;
    const geo = new THREE.ExtrudeGeometry(settoreAnulare(a0, a1, R, RI), { depth: ALTEZZA, bevelEnabled: false, curveSegments: 1 });
    geo.rotateX(-Math.PI / 2);
    const blocco = new THREE.Mesh(geo, [matTetto, matMuro]);
    anello.add(blocco);
    anello.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo, 25), matLinee));

    // fascia scura della facciata esterna e vetrata sulla corte
    const lung = THREE.MathUtils.degToRad(a1 - a0);
    // CylinderGeometry: theta 0 sta su +z e cresce verso +x, quindi theta = 90° - angolo della foto
    const inizio = Math.PI / 2 - THREE.MathUtils.degToRad(a1);
    const fasciaEst = new THREE.Mesh(new THREE.CylinderGeometry(R + 0.012, R + 0.012, ALTEZZA * 0.72, 48, 1, true, inizio, lung), matFacciata);
    fasciaEst.position.y = ALTEZZA * 0.42;
    anello.add(fasciaEst);
    const vetro = new THREE.Mesh(new THREE.CylinderGeometry(RI - 0.012, RI - 0.012, ALTEZZA * 0.7, 40, 1, true, inizio, lung), matVetro);
    vetro.position.y = ALTEZZA * 0.42;
    anello.add(vetro);

    // pensilina sottile nel varco
    const g = GIUNTI[i];
    const pens = new THREE.ExtrudeGeometry(settoreAnulare(g - VARCO / 2 - 0.4, g + VARCO / 2 + 0.4, R - 0.05, RI + 0.05), { depth: 0.05, bevelEnabled: false, curveSegments: 1 });
    pens.rotateX(-Math.PI / 2);
    const pm = new THREE.Mesh(pens, matTetto);
    pm.position.y = ALTEZZA - 0.05;
    anello.add(pm);
  }
  anello.scale.y = 0.001;
  anello.visible = false;

  const ombra = new THREE.Mesh(
    new THREE.PlaneGeometry(R * 2.9, R * 2.9).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({ map: ombraAnello(), transparent: true, opacity: 0, depthWrite: false })
  );
  ombra.position.set(0.55, 0.012, 0.25);
  scene.add(ombra);

  // --- alberi da plastico: sfere sfaccettate su uno stelo ---
  const n = ALBERI.length;
  const matChioma = new THREE.MeshStandardMaterial({ color: '#E4E7DE', roughness: 0.85, flatShading: true });
  const matStelo = new THREE.MeshStandardMaterial({ color: '#C9CCC4', roughness: 0.9 });
  const chiome = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 1), matChioma, n);
  const steli = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.022, 0.022, 1, 5).translate(0, 0.5, 0), matStelo, n);
  scene.add(chiome, steli);
  const ritardi = ALBERI.map(([x, z]) => clamp(Math.hypot(x, z) / 11) * 0.55 + ((x * 13.7 + z * 7.3) % 1 + 1) % 1 * 0.12);
  const m4 = new THREE.Matrix4(), qId = new THREE.Quaternion(), v3 = new THREE.Vector3(), sc = new THREE.Vector3();
  let crescitaFatta = -1;
  function crescita(g, sparire) {
    const chiave = Math.round(g * 400) + sparire * 1000;
    if (chiave === crescitaFatta) return;
    crescitaFatta = chiave;
    for (let i = 0; i < n; i++) {
      const [x, z, s] = ALBERI[i];
      const k = esce(tratto(g, ritardi[i], ritardi[i] + 0.33)) * (1 - sparire);
      const h = s * 0.95 * k;
      v3.set(x, h + s * k * 0.92, z);
      sc.setScalar(Math.max(0.0001, s * k));
      chiome.setMatrixAt(i, m4.compose(v3, qId, sc));
      v3.set(x, 0, z);
      sc.set(Math.max(0.0001, k), Math.max(0.0001, h + s * 0.3 * k), Math.max(0.0001, k));
      steli.setMatrixAt(i, m4.compose(v3, qId, sc));
    }
    chiome.instanceMatrix.needsUpdate = true;
    steli.instanceMatrix.needsUpdate = true;
  }
  crescita(0, 0);

  function opacita(lista, o) {
    for (const m of lista) {
      const t = o < 0.999;
      if (m.transparent !== t) { m.transparent = t; m.needsUpdate = true; }
      m.opacity = o;
      m.depthWrite = !t;
    }
  }

  // --- dimensioni, inquadratura, scroll ---
  let W = 1, H = 1;
  function dimensiona() {
    const r = palco.getBoundingClientRect();
    W = Math.max(1, Math.round(r.width));
    H = Math.max(1, Math.round(r.height));
    renderer.setSize(W, H, false);
    camera.aspect = W / H;
    // spazio per i testi: su telefono la scena sale, su desktop va a destra
    if (W >= 900) camera.setViewOffset(W, H, -Math.round(W * 0.19), 0, W, H);
    else camera.setViewOffset(W, H, 0, Math.round(H * 0.15), W, H);
    camera.updateProjectionMatrix();
  }
  dimensiona();
  const ro = new ResizeObserver(dimensiona);
  ro.observe(palco);

  const desktop = window.matchMedia('(pointer: fine)').matches;
  const mouse = { x: 0, y: 0, cx: 0, cy: 0 };
  if (desktop) {
    palco.addEventListener('pointermove', (e) => {
      const r = palco.getBoundingClientRect();
      mouse.x = (e.clientX - r.left) / r.width - 0.5;
      mouse.y = (e.clientY - r.top) / r.height - 0.5;
    });
    palco.addEventListener('pointerleave', () => { mouse.x = 0; mouse.y = 0; });
  }

  function progressoPista() {
    const r = pista.getBoundingClientRect();
    const corsa = pista.offsetHeight - window.innerHeight;
    return corsa > 0 ? clamp(-r.top / corsa) : 0;
  }

  const bersaglio = new THREE.Vector3(0, 0.25, 0);
  let pc = progressoPista();
  let faseAttiva = -1;
  let ultimo = performance.now();
  const t0 = ultimo;

  function disegna(adesso) {
    const dt = Math.min(0.1, (adesso - ultimo) / 1000);
    ultimo = adesso;
    const p = progressoPista();
    pc += (p - pc) * (1 - Math.exp(-dt * 7));
    const t = (adesso - t0) / 1000;

    // fasi della storia
    const g = tratto(pc, 0.0, 0.24);
    const fine = morbido(tratto(pc, 0.84, 0.94));
    crescita(g, fine);
    uniforms.uDraw.value = morbido(tratto(pc, 0.26, 0.4));
    uniforms.uDraw2.value = morbido(tratto(pc, 0.3, 0.44));
    uniforms.uTagli.value = tratto(pc, 0.42, 0.49);
    const e = esce(tratto(pc, 0.5, 0.67));
    anello.visible = e > 0.002;
    anello.scale.y = Math.max(0.001, e);
    uniforms.uMaschera.value = 1;
    uniforms.uInkA.value = 1 - morbido(tratto(pc, 0.78, 0.88));
    uniforms.uMix.value = morbido(tratto(pc, 0.84, 0.95));
    matLinee.opacity = tratto(pc, 0.55, 0.7) * 0.85 * (1 - fine);
    ombra.material.opacity = e * 0.6 * (1 - fine);
    opacita(materiali, 1 - fine);
    opacita([matChioma, matStelo], 1 - fine);
    anello.visible = anello.visible && fine < 0.999;

    // camera: inquadratura della fase + respiro lento + mouse su desktop
    const k = inquadratura(pc);
    const calma = 1 - fine;
    mouse.cx += (mouse.x - mouse.cx) * (1 - Math.exp(-dt * 4));
    mouse.cy += (mouse.y - mouse.cy) * (1 - Math.exp(-dt * 4));
    const az = THREE.MathUtils.degToRad(k.az + Math.sin(t * 0.32) * 4 * calma + mouse.cx * 10 * calma);
    const el = THREE.MathUtils.degToRad(Math.min(89.4, k.el + Math.sin(t * 0.21 + 1) * 1.6 * calma - mouse.cy * 6 * calma));
    const fov = THREE.MathUtils.degToRad(camera.fov);
    const dist = (k.S / (2 * Math.tan(fov / 2))) / Math.min(1, camera.aspect * (W >= 900 ? 0.62 : 1));
    bersaglio.y = lerp(0.25, 0, fine);
    camera.position.set(
      bersaglio.x + dist * Math.cos(el) * Math.sin(az),
      bersaglio.y + dist * Math.sin(el),
      bersaglio.z + dist * Math.cos(el) * Math.cos(az)
    );
    camera.lookAt(bersaglio);
    renderer.render(scene, camera);

    const f = pc < 0.25 ? 0 : pc < 0.5 ? 1 : pc < 0.78 ? 2 : 3;
    if (f !== faseAttiva) {
      faseAttiva = f;
      fasi.forEach((el, i) => el.classList.toggle('attiva', i === f));
      palco.dataset.fase = String(f);
    }
  }

  // primo fotogramma pronto prima di mostrarlo
  disegna(performance.now());
  if (renderer.compileAsync) await renderer.compileAsync(scene, camera);
  scena.appendChild(renderer.domElement);
  disegna(performance.now());
  requestAnimationFrame(() => scena.classList.add('pronta'));

  let attivo = false, giro = 0, visibile = true;
  function ciclo(ts) {
    if (!attivo) return;
    disegna(performance.now());
    giro = requestAnimationFrame(ciclo);
  }
  function aggiorna() {
    const dovrebbe = visibile && document.visibilityState === 'visible';
    if (dovrebbe && !attivo) { attivo = true; ultimo = performance.now(); giro = requestAnimationFrame(ciclo); }
    else if (!dovrebbe && attivo) { attivo = false; cancelAnimationFrame(giro); }
  }
  const io = new IntersectionObserver(([v]) => { visibile = v.isIntersecting; aggiorna(); }, { rootMargin: '120px 0px' });
  io.observe(pista);
  document.addEventListener('visibilitychange', aggiorna);
  aggiorna();

  return { renderer };
}
