/* 360 Shop Trasporti — "Il giro": il rilievo vero della Marca trevigiana, dalle Prealpi alla laguna.
   Dati: altimetria AWS Terrain Tiles (Mapzen), coste, lagune e fiumi © OpenStreetMap (ODbL).
   Ogni giro parte dalla base di Candelù, passa dal ritiro e dalla consegna e torna: il prezzo segue questi km.
   Lo guidano lo scroll (progresso della sezione) e il tempo di requestAnimationFrame (performance.now). */
import * as THREE from 'three';

const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const liscio = (t) => { t = clamp(t); return t * t * (3 - 2 * t); };
const esce = (t) => 1 - Math.pow(1 - clamp(t), 3);

const DIR = new URL('./assets/3d/', import.meta.url).href;
const FONDO = 0x0C2340;
const FONDO_V = new THREE.Vector3(0x0C / 255, 0x23 / 255, 0x40 / 255);
const ESAGERA = 2.8;          // esagerazione verticale del rilievo
const ROSSO = new THREE.Vector3(1.0, 0.27, 0.21);

const ESEMPI = [
  { k: 'casale-paese', tappe: ['Casale sul Sile', 'Paese'] },
  { k: 'spresiano-jesolo', tappe: ['Spresiano', 'Jesolo'] },
  { k: 'quinto-pordenone', tappe: ['Quinto di Treviso', 'Pordenone'] },
  { k: 'treviso-castelfranco', tappe: ['Treviso', 'Castelfranco Veneto'], base: 'Treviso' },
];
const CITTA = ['Treviso', 'Venezia', 'Pordenone', 'Castelfranco Veneto', 'Conegliano', 'Jesolo', 'Padova', 'Bassano del Grappa', 'Vittorio Veneto', 'Oderzo', 'Montebelluna', 'San Donà di Piave', 'Mestre', 'Valdobbiadene', 'Portogruaro', 'Caorle', 'Belluno'];
const CITTA_MOBILE = ['Treviso', 'Venezia', 'Pordenone', 'Castelfranco Veneto', 'Conegliano', 'Jesolo', 'Padova', 'Montebelluna'];
const NATURA = [
  { nome: 'Monte Grappa', lat: 45.8734, lon: 11.7992 },
  { nome: 'Montello', lat: 45.812, lon: 12.115 },
  { nome: 'Laguna di Venezia', lat: 45.385, lon: 12.215 },
  { nome: 'Mare Adriatico', lat: 45.43, lon: 12.78 },
];
const FIUMI_NOMI = [{ nome: 'Piave', lon: 12.43 }, { nome: 'Sile', lon: 12.36 }];

/* ---------- dati condivisi ---------- */
let datiP = null;
export function caricaDati() {
  if (!datiP) {
    datiP = Promise.all([
      fetch(DIR + 'mappa.json').then((r) => { if (!r.ok) throw new Error('mappa.json'); return r.json(); }),
      new Promise((ok, ko) => { const im = new Image(); im.decoding = 'async'; im.onload = () => ok(im); im.onerror = () => ko(new Error('rilievo.png')); im.src = DIR + 'rilievo.png'; }),
    ]).then(([dati, img]) => {
      const W = img.naturalWidth, H = img.naturalHeight;
      const c = document.createElement('canvas'); c.width = W; c.height = H;
      const g = c.getContext('2d', { willReadFrequently: true });
      g.drawImage(img, 0, 0);
      const px = g.getImageData(0, 0, W, H).data;
      const alt = new Float32Array(W * H);
      for (let i = 0; i < W * H; i++) { const v = px[i * 4]; alt[i] = v === 0 ? 0 : dati.hmax * Math.pow((v - 1) / 254, 2); }
      return { dati, img, alt, W, H };
    });
    datiP.catch(() => { datiP = null; });
  }
  return datiP;
}

function quota(D, u, v) {
  const x = clamp(u) * (D.W - 1), y = (1 - clamp(v)) * (D.H - 1);
  const x0 = Math.floor(x), y0 = Math.floor(y);
  const x1 = Math.min(x0 + 1, D.W - 1), y1 = Math.min(y0 + 1, D.H - 1);
  const fx = x - x0, fy = y - y0, A = D.alt, W = D.W;
  return lerp(lerp(A[y0 * W + x0], A[y0 * W + x1], fx), lerp(A[y1 * W + x0], A[y1 * W + x1], fx), fy);
}

function lonlatUv(D, lon, lat) {
  const [L0, B0, L1, B1] = D.dati.bbox;
  return [(lon - L0) / (L1 - L0), (lat - B0) / (B1 - B0)];
}

function mondo(D, u, v, alza = 0, out = new THREE.Vector3()) {
  return out.set((u - 0.5) * D.dati.kmW, quota(D, u, v) / 1000 * ESAGERA + alza, (0.5 - v) * D.dati.kmH);
}

function bordoUv(u, v) { return liscio(Math.min(u, 1 - u, v, 1 - v) / 0.12); }

/* ---------- materiali ---------- */
function materialeTerreno(tex, D) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uAlt: { value: tex }, uHmax: { value: D.dati.hmax }, uFondo: { value: FONDO_V },
      uTempo: { value: 0 }, uNebbia: { value: new THREE.Vector2(70, 200) },
    },
    polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 2,
    vertexShader: /* glsl */`
      varying vec2 vUv; varying vec3 vN; varying vec3 vM;
      void main() {
        vUv = uv; vN = normal;
        vec4 w = modelMatrix * vec4(position, 1.0); vM = w.xyz;
        gl_Position = projectionMatrix * viewMatrix * w;
      }`,
    fragmentShader: /* glsl */`
      uniform sampler2D uAlt; uniform float uHmax; uniform vec3 uFondo; uniform float uTempo; uniform vec2 uNebbia;
      varying vec2 vUv; varying vec3 vN; varying vec3 vM;
      void main() {
        float r = texture2D(uAlt, vUv).r;
        float acqua = 1.0 - smoothstep(0.4 / 255.0, 1.1 / 255.0, r);
        float h = uHmax * pow(max(r * 255.0 - 1.0, 0.0) / 254.0, 2.0);
        vec3 n = normalize(vN);
        float dif = clamp(dot(n, normalize(vec3(-0.62, 0.6, -0.5))), 0.0, 1.0);
        vec3 col = mix(vec3(0.071, 0.165, 0.295), vec3(0.165, 0.29, 0.45), smoothstep(30.0, 480.0, h));
        col = mix(col, vec3(0.36, 0.50, 0.66), smoothstep(520.0, 1350.0, h));
        col = mix(col, vec3(0.82, 0.90, 0.97), smoothstep(1450.0, 2300.0, h) * (0.55 + 0.45 * n.y));
        col *= 0.6 + 0.68 * dif;
        float passo = h < 260.0 ? 20.0 : 100.0;
        float q = h / passo;
        float dq = abs(fract(q + 0.5) - 0.5);
        float linea = 1.0 - smoothstep(0.0, fwidth(q) * 1.25, dq);
        col = mix(col, vec3(0.6, 0.79, 0.93), linea * 0.26 * smoothstep(6.0, 16.0, h));
        vec3 mare = vec3(0.035, 0.1, 0.2) + vec3(0.01, 0.02, 0.035) * (0.5 + 0.5 * sin(vM.x * 0.09 - vM.z * 0.07 + uTempo * 0.35));
        col = mix(col, mare, acqua);
        col += vec3(0.25, 0.45, 0.65) * acqua * (1.0 - acqua) * 0.9;
        vec2 e = min(vUv, 1.0 - vUv);
        float bordo = smoothstep(0.0, 0.13, min(e.x, e.y));
        float neb = smoothstep(uNebbia.x, uNebbia.y, distance(vM, cameraPosition));
        gl_FragColor = vec4(mix(uFondo, col, bordo * (1.0 - neb)), 1.0);
      }`,
  });
}

function materialeLinee(colore, alfa) {
  return new THREE.ShaderMaterial({
    transparent: true, depthWrite: false,
    uniforms: { uColore: { value: colore }, uAlfa: { value: alfa }, uNebbia: { value: new THREE.Vector2(70, 200) } },
    vertexShader: /* glsl */`
      attribute float aBordo; varying float vB; varying vec3 vM;
      void main() { vB = aBordo; vec4 w = modelMatrix * vec4(position, 1.0); vM = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: /* glsl */`
      uniform vec3 uColore; uniform float uAlfa; uniform vec2 uNebbia; varying float vB; varying vec3 vM;
      void main() { float neb = smoothstep(uNebbia.x, uNebbia.y, distance(vM, cameraPosition)); gl_FragColor = vec4(uColore, uAlfa * vB * (1.0 - neb)); }`,
  });
}

function materialePercorso(alfa, coda, colore = ROSSO) {
  return new THREE.ShaderMaterial({
    transparent: true, depthWrite: alfa > 0.5, blending: alfa > 0.5 ? THREE.NormalBlending : THREE.AdditiveBlending,
    uniforms: {
      uDisegno: { value: 0 }, uTesta: { value: 0 }, uAlfa: { value: alfa }, uCoda: { value: coda },
      uColore: { value: colore }, uFondo: { value: FONDO_V }, uNebbia: { value: new THREE.Vector2(70, 200) }, uMostra: { value: 1 }, uRaggio: { value: 0.2 },
    },
    vertexShader: /* glsl */`
      uniform float uRaggio; varying vec2 vUv; varying vec3 vM;
      void main() { vUv = uv; vec3 p = position + normal * (uRaggio - 1.0); vec4 w = modelMatrix * vec4(p, 1.0); vM = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: /* glsl */`
      uniform float uDisegno, uTesta, uAlfa, uCoda, uMostra; uniform vec3 uColore, uFondo; uniform vec2 uNebbia;
      varying vec2 vUv; varying vec3 vM;
      void main() {
        if (vUv.x > uDisegno) discard;
        float dietro = uTesta - vUv.x; if (dietro < 0.0) dietro += 1.0;
        float cometa = exp(-dietro * uCoda);
        vec3 c = uColore * (0.72 + 0.85 * cometa) + vec3(1.0, 0.86, 0.8) * pow(cometa, 4.0) * 0.75;
        float neb = smoothstep(uNebbia.x, uNebbia.y, distance(vM, cameraPosition));
        gl_FragColor = vec4(mix(c, uFondo, neb * 0.55), uAlfa * uMostra);
      }`,
  });
}

function trama(colori) {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d'); const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  colori.forEach(([s, col]) => gr.addColorStop(s, col));
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

/* ---------- la mappa ---------- */
export async function creaMappa({ canvas, etichette, contenitore, modo = 'giro', progresso = () => 0, ridotto = false, mobile = false }) {
  const D = await caricaDati();
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' });
  if (!renderer.getContext()) throw new Error('webgl');
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, mobile ? 1.5 : 2));
  renderer.setClearColor(FONDO, 1);

  const scena = new THREE.Scene();
  scena.fog = new THREE.Fog(FONDO, 70, 200);
  const camera = new THREE.PerspectiveCamera(34, 1, 0.5, 600);

  // terreno
  const kmW = D.dati.kmW, kmH = D.dati.kmH;
  const sx = mobile ? 200 : 300, sy = Math.round(sx * kmH / kmW);
  const geo = new THREE.PlaneGeometry(kmW, kmH, sx, sy);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const u = pos.getX(i) / kmW + 0.5, v = 0.5 - pos.getZ(i) / kmH;
    pos.setY(i, quota(D, u, v) / 1000 * ESAGERA);
  }
  geo.computeVertexNormals();
  const tex = new THREE.Texture(D.img);
  tex.colorSpace = THREE.NoColorSpace; tex.minFilter = THREE.LinearFilter; tex.magFilter = THREE.LinearFilter; tex.generateMipmaps = false; tex.needsUpdate = true;
  const matT = materialeTerreno(tex, D);
  scena.add(new THREE.Mesh(geo, matT));

  // fiumi
  const fiumiMat = [materialeLinee(new THREE.Vector3(0.62, 0.82, 0.95), 0.85), materialeLinee(new THREE.Vector3(0.5, 0.7, 0.86), 0.42)];
  const buf = [[], []], bor = [[], []];
  const tmp = new THREE.Vector3();
  for (const f of D.dati.fiumi) {
    const k = (f.n === 'Piave' || f.n === 'Sile') ? 0 : 1;
    let prev = null;
    for (const [u, v] of f.p) {
      if (prev) {
        const n = Math.max(1, Math.ceil(Math.hypot((u - prev[0]) * kmW, (v - prev[1]) * kmH) / 0.35));
        for (let s = 0; s < n; s++) {
          const a = s / n, b = (s + 1) / n;
          const ua = lerp(prev[0], u, a), va = lerp(prev[1], v, a), ub = lerp(prev[0], u, b), vb = lerp(prev[1], v, b);
          mondo(D, ua, va, 0.07, tmp); buf[k].push(tmp.x, tmp.y, tmp.z); bor[k].push(bordoUv(ua, va));
          mondo(D, ub, vb, 0.07, tmp); buf[k].push(tmp.x, tmp.y, tmp.z); bor[k].push(bordoUv(ub, vb));
        }
      }
      prev = [u, v];
    }
  }
  for (let k = 0; k < 2; k++) {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(buf[k], 3));
    g.setAttribute('aBordo', new THREE.Float32BufferAttribute(bor[k], 1));
    scena.add(new THREE.LineSegments(g, fiumiMat[k]));
  }

  // base di Candelù: anello che pulsa
  const luoghi = D.dati.luoghi;
  const uvBase = luoghi['Candelù'];
  const pBase = mondo(D, uvBase[0], uvBase[1], 0.05);
  const anelli = [];
  for (let i = 0; i < 2; i++) {
    const m = new THREE.Mesh(new THREE.RingGeometry(0.62, 1, 48).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xE1251B, transparent: true, depthWrite: false, opacity: 0.8 }));
    m.position.copy(pBase); scena.add(m); anelli.push(m);
  }
  const alone = new THREE.Sprite(new THREE.SpriteMaterial({ map: trama([[0, 'rgba(255,90,70,1)'], [0.25, 'rgba(225,37,27,.55)'], [1, 'rgba(225,37,27,0)']]), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
  alone.position.copy(pBase).y += 0.3; alone.scale.set(3.2, 3.2, 1); scena.add(alone);

  // testa del furgone (punto luminoso che corre sul giro)
  const testa = new THREE.Group();
  const testaLuce = new THREE.Sprite(new THREE.SpriteMaterial({ map: trama([[0, 'rgba(255,255,255,1)'], [0.18, 'rgba(255,170,150,.9)'], [0.45, 'rgba(255,60,40,.35)'], [1, 'rgba(255,40,30,0)']]), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
  testaLuce.scale.set(3.4, 3.4, 1); testa.add(testaLuce);
  testa.visible = false; scena.add(testa);

  // fari sulle tappe (ritiro e consegna)
  const fari = [];
  const faroGeo = new THREE.CylinderGeometry(0.05, 0.05, 2.6, 8, 1, true).translate(0, 1.3, 0);
  for (let i = 0; i < 6; i++) {
    const f = new THREE.Mesh(faroGeo, new THREE.MeshBasicMaterial({ color: 0xFFFFFF, transparent: true, opacity: 0, depthWrite: false }));
    f.visible = false; scena.add(f); fari.push(f);
  }

  // percorsi
  function creaPercorso(uvPunti, raggio) {
    const punti = [];
    let prev = null;
    for (const [u, v] of uvPunti) {
      const p = mondo(D, clamp(u, 0.002, 0.998), clamp(v, 0.002, 0.998), 0.18);
      if (!prev || p.distanceTo(prev) > 0.08) { punti.push(p); prev = p; }
    }
    if (punti.length < 2) return null;
    const curva = new THREE.CatmullRomCurve3(punti, false, 'centripetal');
    const lung = curva.getLength();
    const seg = Math.round(clamp(lung * 7, 220, 1600));
    const tubo = new THREE.TubeGeometry(curva, seg, 1, 8, false);
    const nucleo = new THREE.Mesh(tubo, materialePercorso(1, 18));
    const bagliore = new THREE.Mesh(tubo, materialePercorso(0.2, 10));
    nucleo.userData.px = raggio; bagliore.userData.px = raggio * 3.2;
    bagliore.renderOrder = 2; nucleo.renderOrder = 3;
    const g = new THREE.Group(); g.add(bagliore, nucleo); scena.add(g);
    const box = new THREE.Box3().setFromPoints(punti);
    return {
      g, curva, box, lung,
      imposta(disegno, testaT, mostra = 1) {
        for (const m of [nucleo, bagliore]) { m.material.uniforms.uDisegno.value = disegno; m.material.uniforms.uTesta.value = testaT; m.material.uniforms.uMostra.value = mostra; }
        g.visible = mostra > 0.002 && disegno > 0.0005;
      },
      via() { scena.remove(g); tubo.dispose(); for (const m of [nucleo, bagliore]) m.material.dispose(); },
    };
  }

  // etichette HTML
  const elEtichette = new Map();
  function etichetta(chiave, testo, classe, u, v, alza = 0.35) {
    const el = document.createElement('div');
    el.className = 'etichetta spenta ' + classe;
    el.innerHTML = `<span>${testo}</span>`;
    etichette.appendChild(el);
    const e = { el, p: mondo(D, u, v, alza), u, v, vis: false, voluta: false };
    elEtichette.set(chiave, e);
    return e;
  }
  for (const nome of (mobile ? CITTA_MOBILE : CITTA)) {
    const uv = luoghi[nome]; if (!uv) continue;
    etichetta(nome, nome, nome === 'Treviso' || nome === 'Venezia' ? 'citta-forte' : '', uv[0], uv[1]);
  }
  for (const n of NATURA) { const [u, v] = lonlatUv(D, n.lon, n.lat); etichetta('n:' + n.nome, n.nome, 'natura', u, v, 0.2); }
  for (const fn of FIUMI_NOMI) {
    const [ut] = lonlatUv(D, fn.lon, 45.7);
    let best = null, bd = 1e9;
    for (const f of D.dati.fiumi) if (f.n === fn.nome) for (const [u, v] of f.p) { const d = Math.abs(u - ut); if (d < bd) { bd = d; best = [u, v]; } }
    if (best) etichetta('n:' + fn.nome, fn.nome, 'natura', best[0], best[1], 0.15);
  }
  const eBase = etichetta('base', 'Base 360<small>Candelù</small>', 'base', uvBase[0], uvBase[1], 0.4);
  eBase.el.innerHTML = '<span>Base 360<small>Candelù</small></span>';

  // stato camera
  const cam = { t: new THREE.Vector3(), d: 140, phi: 0.9, theta: 0 };
  const voluta = { t: new THREE.Vector3(), d: 140, phi: 0.9, theta: 0 };
  let riquadro = { x0: 0, x1: 1, y0: 0, y1: 1 };
  let W = 1, H = 1;

  function panoramica(out) {
    mondo(D, 0.5, 0.47, 0, out.t); out.t.y = 0;
    out.phi = 0.98; out.theta = 0;
    out.d = adatta(0.43 * kmW, out.phi);
    return out;
  }
  function adatta(raggio, phi) {
    const fov = THREE.MathUtils.degToRad(camera.fov);
    const fw = (riquadro.x1 - riquadro.x0) * W, fh = (riquadro.y1 - riquadro.y0) * H;
    const tv = Math.tan(fov / 2) * fh / H, th = Math.tan(fov / 2) * fw / H;
    const a = Math.atan(Math.min(tv / (0.55 + 0.45 * Math.cos(phi)), th));
    return clamp(raggio / Math.sin(a), 24, 260);
  }
  function inquadra(box, out, extra = 1.12) {
    const c = box.getCenter(new THREE.Vector3()), s = box.getSize(new THREE.Vector3());
    out.t.set(c.x, 0, c.z);
    out.phi = 0.92; out.theta = 0;
    out.d = adatta(Math.max(Math.hypot(s.x, s.z) / 2 * extra, 9), out.phi);
    return out;
  }

  function dimensiona() {
    const r = canvas.getBoundingClientRect();
    W = Math.max(1, Math.round(r.width)); H = Math.max(1, Math.round(r.height));
    renderer.setSize(W, H, false);
    camera.aspect = W / H;
    if (modo === 'giro') {
      riquadro = W >= 980 ? { x0: Math.min(0.42, (Math.max(24, (W - 1200) / 2 + 20) + 400) / W), x1: 0.98, y0: 0.08, y1: 0.94 } : { x0: 0.02, x1: 0.98, y0: 0.15, y1: 0.6 };
    } else {
      riquadro = { x0: 0.04, x1: 0.96, y0: 0.06, y1: 0.8 };
    }
    const cx = (riquadro.x0 + riquadro.x1) / 2 * W, cy = (riquadro.y0 + riquadro.y1) / 2 * H;
    camera.setViewOffset(W, H, W / 2 - cx, H / 2 - cy, W, H);
    camera.updateProjectionMatrix();
    ricalcola = true; visteSporche = true;
  }
  let ricalcola = true, visteSporche = true;
  const ro = new ResizeObserver(() => { dimensiona(); disegnaUnaVolta(); });
  ro.observe(canvas);
  dimensiona();

  /* ---- modalità giro: esempi guidati dallo scroll ---- */
  const giri = [];
  if (modo === 'giro') {
    for (const es of ESEMPI) {
      const dato = D.dati.esempi[es.k]; if (!dato) continue;
      const p = creaPercorso(dato.p, mobile ? 1.7 : 2.0);
      if (!p) continue;
      p.tappe = es.tappe; p.imposta(0, 0, 0);
      giri.push(p);
    }
  }
  let quadri = [], vista0 = null;
  function ricalcolaViste() {
    quadri = giri.map((g) => inquadra(g.box, { t: new THREE.Vector3(), d: 0, phi: 0, theta: 0 }, 1.3));
    vista0 = panoramica({ t: new THREE.Vector3(), d: 0, phi: 0, theta: 0 });
    visteSporche = false;
  }
  ricalcolaViste();

  /* ---- modalità risultato ---- */
  let mio = null, mioT0 = 0, mieTappe = [];

  function applicaCamera() {
    const sp = Math.sin(cam.phi);
    camera.position.set(cam.t.x + cam.d * sp * Math.sin(cam.theta), cam.t.y + cam.d * Math.cos(cam.phi), cam.t.z + cam.d * sp * Math.cos(cam.theta));
    camera.lookAt(cam.t);
    const n = cam.d * 0.7, f = cam.d * 2.3;
    for (const m of [matT, ...fiumiMat]) m.uniforms.uNebbia.value.set(n, f);
    const unitaPx = 2 * cam.d * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2) / H;
    for (const g of giri.concat(mio ? [mio] : [])) g.g.children.forEach((m) => { m.material.uniforms.uNebbia.value.set(n * 1.2, f * 1.2); m.material.uniforms.uRaggio.value = m.userData.px * unitaPx; });
    pxMondo = unitaPx;
    scena.fog.near = n; scena.fog.far = f;
  }

  const v3 = new THREE.Vector3();
  function aggiornaEtichette(attive, tappe) {
    for (const [k, e] of elEtichette) {
      let vuoi = attive.has(k) || (k === 'base' && (e.forza ?? 1) > 0.5);
      if (tappe.has(k)) vuoi = true;
      e.el.classList.toggle('tappa', tappe.has(k));
      if (vuoi) {
        v3.copy(e.p).project(camera);
        const x = (v3.x * 0.5 + 0.5) * W, y = (-v3.y * 0.5 + 0.5) * H;
        const dentro = v3.z < 1 && x > 8 && x < W - 8 && y > 8 && y < H - 8 && bordoUv(e.u, e.v) > 0.5;
        const dist = camera.position.distanceTo(e.p);
        vuoi = dentro && dist < scena.fog.far * 0.92;
        if (vuoi) {
          e.el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
          const sx = x > W - (e.el.offsetWidth || 90) - 22;
          if (sx !== e.sx) { e.sx = sx; e.el.classList.toggle('sinistra', sx); }
        }
      }
      if (vuoi !== e.vis) { e.vis = vuoi; e.el.classList.toggle('spenta', !vuoi); }
    }
  }

  function fariSu(lista, forza) {
    fari.forEach((f, i) => {
      const t = lista[i];
      if (!t || forza <= 0.001) { f.visible = false; return; }
      f.visible = true; f.position.copy(t); f.material.opacity = 0.75 * forza;
      f.scale.y = 0.2 + 0.8 * forza;
    });
  }

  let forzaBase = 1, pxMondo = 0.1;
  const attiveBase = new Set([...(mobile ? CITTA_MOBILE : CITTA), 'n:Monte Grappa', 'n:Montello', 'n:Laguna di Venezia', 'n:Mare Adriatico', 'n:Piave', 'n:Sile']);
  let tPrec = performance.now(), avvio = performance.now();

  function passo(adesso) {
    const dt = Math.min(0.1, Math.max(0, (adesso - tPrec) / 1000)); tPrec = adesso;
    const tempo = (adesso - avvio) / 1000;
    matT.uniforms.uTempo.value = ridotto ? 0 : tempo;
    if (visteSporche) ricalcolaViste();
    let tappe = new Set(), attive = attiveBase, puntiFari = [], forzaFari = 0;

    if (modo === 'giro') {
      const p = progresso();
      const N = giri.length;
      const s = clamp(p, 0, 0.9999) * N;
      const i = Math.floor(s), q = s - i;
      const preIntro = p < 0 ? clamp(1 + p * 1.6) : 1;
      // camera: dalla panoramica (o dal giro precedente) al giro attivo
      const da = i === 0 ? vista0 : quadri[i - 1];
      const a = quadri[i];
      const m = p <= 0 ? 0 : liscio(q / 0.38);
      voluta.t.lerpVectors(da.t, a.t, m);
      voluta.d = lerp(da.d, a.d, m);
      voluta.phi = lerp(da.phi, a.phi, m);
      if (p < 0) { voluta.t.copy(vista0.t); voluta.d = vista0.d * (1 + (1 - preIntro) * 0.12); voluta.phi = vista0.phi; }
      voluta.theta = ridotto ? 0 : Math.sin(tempo * 0.11) * 0.07 + (p - 0.5) * 0.18;
      giri.forEach((g, k) => {
        if (k === i && p > 0) {
          const dis = ridotto ? 1 : esce((q - 0.08) / 0.62);
          const testaT = dis < 1 ? dis : (tempo * 0.16) % 1;
          g.imposta(dis, testaT, 1);
          if (dis > 0.002) {
            testa.visible = true;
            g.curva.getPointAt(clamp(testaT, 0, 1), testa.position);
          }
        } else if (k === i - 1 && p > 0) {
          g.imposta(1, 1, clamp(1 - q / 0.25) * 0.6);
        } else g.imposta(0, 0, 0);
      });
      if (p <= 0) testa.visible = false;
      forzaBase = p > 0 && ESEMPI[i].base === 'Treviso' ? 1 - liscio(q / 0.2) : 1;
      if (p > 0) {
        const es = ESEMPI[i];
        tappe = new Set(es.tappe);
        for (const nome of es.tappe) { const uv = luoghi[nome]; if (uv) puntiFari.push(mondo(D, uv[0], uv[1], 0)); }
        forzaFari = liscio((q - 0.05) / 0.3);
        for (const nome of es.tappe) if (!elEtichette.has(nome)) { const uv = luoghi[nome]; if (uv) etichetta(nome, nome, '', uv[0], uv[1]); }
      }
    } else {
      // risultato
      if (mio) {
        const k = ridotto ? 1 : clamp((adesso - mioT0) / 1900);
        const dis = esce(k);
        const testaT = dis < 1 ? dis : ((adesso - mioT0) / 1000 - 1.9) * 0.14 % 1;
        mio.imposta(dis, testaT, 1);
        testa.visible = true;
        mio.curva.getPointAt(clamp(testaT, 0, 1), testa.position);
        puntiFari = mieTappe.map((t) => t.p); forzaFari = liscio(k * 2);
        tappe = new Set(mieTappe.map((t) => t.chiave));
        attive = new Set(['Treviso', 'Venezia', 'Padova', 'Pordenone', 'n:Piave']);
      } else {
        attive = new Set(['Treviso', 'Venezia', 'Pordenone', 'Castelfranco Veneto', 'Jesolo', 'n:Piave']);
        testa.visible = false;
      }
      voluta.theta = ridotto ? 0 : Math.sin(tempo * 0.13) * 0.06;
    }

    // inseguimento morbido della camera
    const k = ridotto || ricalcola ? 1 : 1 - Math.exp(-dt * 5.5);
    ricalcola = false;
    cam.t.lerp(voluta.t, k); cam.d = lerp(cam.d, voluta.d, k); cam.phi = lerp(cam.phi, voluta.phi, k); cam.theta = lerp(cam.theta, voluta.theta, k);
    applicaCamera();

    // base che pulsa
    anelli.forEach((m, j) => {
      const f = ridotto ? 0.5 : ((tempo * 0.55 + j * 0.5) % 1);
      const sc = (m.userData.k || 1) * (1 + f * 2.6); m.scale.set(sc, 1, sc); m.material.opacity = 0.85 * (1 - f) * forzaBase;
      m.visible = forzaBase > 0.01;
    });
    alone.material.opacity = forzaBase; alone.visible = forzaBase > 0.01;
    eBase.forza = forzaBase;
    const scalaAlone = 34 * pxMondo; alone.scale.set(scalaAlone, scalaAlone, 1);
    const st = 30 * pxMondo; testaLuce.scale.set(st, st, 1);
    anelli.forEach((m) => { m.userData.k = 9 * pxMondo; });
    fariSu(puntiFari, forzaFari);
    aggiornaEtichette(attive, tappe);
    renderer.render(scena, camera);
  }

  // ciclo: gira solo quando la mappa è in vista e la scheda è visibile
  let raf = 0, inVista = false;
  function ciclo(t) { raf = 0; passo(performance.now()); if (inVista && !document.hidden && !ridotto) raf = requestAnimationFrame(ciclo); }
  function riparti() { if (!raf && inVista && !document.hidden) raf = requestAnimationFrame(ciclo); }
  function disegnaUnaVolta() { if (!raf) passo(performance.now()); }
  const io = new IntersectionObserver((v) => { inVista = v[0].isIntersecting; if (inVista) { tPrec = performance.now(); riparti(); } }, { rootMargin: '120px' });
  io.observe(contenitore);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) { tPrec = performance.now(); riparti(); } });
  if (ridotto) window.addEventListener('scroll', () => { if (inVista) requestAnimationFrame(() => passo(performance.now())); }, { passive: true });

  // primo fotogramma: compila prima, poi mostra
  applicaCamera();
  try { await renderer.compileAsync(scena, camera); } catch (e) { /* alcuni browser non lo supportano */ }
  avvio = performance.now(); tPrec = avvio;
  cam.t.copy(modo === 'giro' ? vista0.t : panoramica({ t: new THREE.Vector3() }).t);
  const v0 = modo === 'giro' ? vista0 : panoramica({ t: new THREE.Vector3() });
  cam.d = v0.d; cam.phi = v0.phi; voluta.t.copy(v0.t); voluta.d = v0.d; voluta.phi = v0.phi;
  passo(performance.now());
  contenitore.classList.add('pronta');
  inVista = true; riparti();

  return {
    /* linea: [[lon,lat],...]; tappe: [{lon,lat,nome}] (la prima è il ritiro). Restituisce false se il giro esce dalla mappa. */
    mostraGiro(linea, tappe, conBase = true) {
      forzaBase = conBase ? 1 : 0;
      if (mio) { mio.via(); mio = null; }
      for (const t of mieTappe) if (t.chiave.startsWith('mia:')) { const e = elEtichette.get(t.chiave); if (e) { e.el.remove(); elEtichette.delete(t.chiave); } }
      mieTappe = [];
      const uv = linea.map(([lon, lat]) => lonlatUv(D, lon, lat));
      const fuori = uv.filter(([u, v]) => u < 0.01 || u > 0.99 || v < 0.01 || v > 0.99).length / Math.max(1, uv.length);
      if (fuori > 0.04) { testa.visible = false; panoramica(voluta); disegnaUnaVolta(); return false; }
      mio = creaPercorso(uv, mobile ? 1.8 : 2.0);
      if (!mio) return false;
      tappe.forEach((t, i) => {
        const [u, v] = lonlatUv(D, t.lon, t.lat);
        const chiave = 'mia:' + i;
        const e = etichetta(chiave, t.nome, '', u, v);
        mieTappe.push({ chiave, p: mondo(D, u, v, 0), e });
      });
      inquadra(mio.box, voluta, 1.18);
      mioT0 = performance.now();
      riparti(); disegnaUnaVolta();
      return true;
    },
    distruggi() { cancelAnimationFrame(raf); io.disconnect(); ro.disconnect(); renderer.dispose(); },
  };
}
