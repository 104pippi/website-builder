/* Rui Sistemi di Sicurezza — scena 3D dell'hero.
   La planimetria si disegna dall'alto, i muri si alzano, la camera si inclina,
   poi sbocciano rilevatori volumetrici, telecamere e barriere perimetrali.
   Scorrendo la pagina l'impianto si inserisce e la casa ruota. */
import * as THREE from 'three';

const PIANTA = window.RUI_PIANTA;
const INQ = window.RUI_INQ;
const scenaEl = document.querySelector('.hero__scena');
const hero = document.querySelector('.hero');
const ridotto = matchMedia('(prefers-reduced-motion: reduce)').matches;
const tocco = matchMedia('(hover: none), (pointer: coarse)').matches;

// Colori in sRGB: gli shader scritti a mano li scrivono così come sono.
const v3 = (hex) => new THREE.Vector3(((hex >> 16) & 255) / 255, ((hex >> 8) & 255) / 255, (hex & 255) / 255);
const COL = {
  lente: v3(0xb5d5e6),
  chiaro: v3(0xeaf4fb),
  blu: v3(0x3f9ff0),
  azzurro: v3(0x7cc4ff),
  caldo: v3(0xffc77a),
};

const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, tocco ? 1.5 : 2));
renderer.setClearColor(new THREE.Color().setRGB(20 / 255, 35 / 255, 92 / 255, THREE.SRGBColorSpace), 1);
const tela = renderer.domElement;
tela.className = 'hero__canvas';
tela.setAttribute('aria-hidden', 'true');
scenaEl.appendChild(tela);

const scena = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(32, 1, 0.5, 700);
const BERSAGLIO = new THREE.Vector3(1, 0, 1.5);

const U = {
  tempo: { value: 0 },
  rivela: { value: 0 },
  centro: { value: new THREE.Vector2(1, 1.5) },
  arma: { value: 0 },
  onda: { value: 0 },
};

const VERT_W = /* glsl */ `
  varying vec3 vW;
  void main() {
    vec4 w = modelMatrix * vec4(position, 1.0);
    vW = w.xyz;
    gl_Position = projectionMatrix * viewMatrix * w;
  }`;

function geometria(pos, attributi = {}) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  for (const [nome, [dati, dim]] of Object.entries(attributi)) g.setAttribute(nome, new THREE.Float32BufferAttribute(dati, dim));
  return g;
}

/* ---------- Materiali ---------- */
function matLinee(col, op) {
  return new THREE.ShaderMaterial({
    uniforms: { uCol: { value: col }, uOp: { value: op }, uRivela: U.rivela, uCentro: U.centro },
    vertexShader: VERT_W,
    fragmentShader: /* glsl */ `
      uniform vec3 uCol; uniform float uOp; uniform float uRivela; uniform vec2 uCentro;
      varying vec3 vW;
      void main() {
        float d = length(vW.xz - uCentro);
        float r = 1.0 - smoothstep(uRivela - 2.5, uRivela, d);
        float fronte = smoothstep(uRivela - 3.5, uRivela - 1.2, d) * r;
        gl_FragColor = vec4(mix(uCol, vec3(1.0), fronte * 0.8), min(1.0, uOp * r * (1.0 + fronte * 1.5)));
      }`,
    transparent: true,
    depthWrite: false,
  });
}

function matFacce(col, opBase) {
  return new THREE.ShaderMaterial({
    uniforms: { uCol: { value: col }, uOp: { value: opBase } },
    vertexShader: /* glsl */ `
      attribute float aV; attribute float aE;
      varying float vV; varying float vE;
      void main() { vV = aV; vE = aE; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uCol; uniform float uOp;
      varying float vV; varying float vE;
      void main() {
        float a = mix(0.17, 0.03, vV) * vE + smoothstep(0.9, 1.0, vV) * 0.1 * vE;
        gl_FragColor = vec4(uCol, a * uOp);
      }`,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
}

function matRaggio(col, op, { superficie = false, fase = 0 } = {}) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uCol: { value: col }, uOp: { value: op }, uTempo: U.tempo, uArma: U.arma, uFase: { value: fase },
    },
    vertexShader: /* glsl */ `
      attribute float aD; varying float vD;
      void main() { vD = aD; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: superficie
      ? /* glsl */ `
      uniform vec3 uCol; uniform float uOp; uniform float uTempo; uniform float uArma; uniform float uFase;
      varying float vD;
      void main() {
        float base = pow(1.0 - vD, 1.7) * 0.3 + 0.03;
        float onda = fract(vD * 1.3 - uTempo * 0.45 + uFase);
        float anello = smoothstep(0.0, 0.05, onda) * (1.0 - smoothstep(0.05, 0.24, onda));
        float a = (base + anello * 0.26 * (1.0 - vD * 0.5)) * uOp * (0.5 + 0.5 * uArma);
        gl_FragColor = vec4(uCol, a);
      }`
      : /* glsl */ `
      uniform vec3 uCol; uniform float uOp; uniform float uArma;
      varying float vD;
      void main() { gl_FragColor = vec4(uCol, uOp * (0.75 - 0.55 * vD) * (0.55 + 0.45 * uArma)); }`,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  });
}

/* ---------- Terreno: griglia da carta millimetrata e onda di inserimento ---------- */
const terreno = new THREE.Mesh(
  new THREE.PlaneGeometry(160, 160),
  new THREE.ShaderMaterial({
    uniforms: { uCol: { value: COL.lente }, uRivela: U.rivela, uCentro: U.centro, uOnda: U.onda },
    vertexShader: VERT_W,
    fragmentShader: /* glsl */ `
      uniform vec3 uCol; uniform float uRivela; uniform vec2 uCentro; uniform float uOnda;
      varying vec3 vW;
      float riga(vec2 p, float passo, float spess) {
        vec2 q = p / passo;
        vec2 g = abs(fract(q - 0.5) - 0.5) / fwidth(q);
        return 1.0 - smoothstep(spess - 0.5, spess + 0.5, min(g.x, g.y));
      }
      void main() {
        float d = length(vW.xz - uCentro);
        float svan = 1.0 - smoothstep(12.0, 42.0, d);
        float r = 1.0 - smoothstep(uRivela + 2.0, uRivela + 5.0, d);
        float g = riga(vW.xz, 1.0, 0.5) * 0.09 + riga(vW.xz, 5.0, 0.7) * 0.2;
        float rr = uOnda * 48.0;
        float anello = exp(-pow((d - rr) / 1.3, 2.0)) * (1.0 - uOnda) * step(0.001, uOnda);
        float a = (g * (1.0 + anello * 5.0) + anello * 0.2) * svan * r;
        gl_FragColor = vec4(mix(uCol, vec3(0.55, 0.82, 1.0), anello), a);
      }`,
    transparent: true,
    depthWrite: false,
  })
);
terreno.rotation.x = -Math.PI / 2;
terreno.renderOrder = 0;
scena.add(terreno);

/* ---------- Planimetria a terra ---------- */
const perPeso = {};
for (const [x1, z1, x2, z2, p] of PIANTA.linee) (perPeso[p] ||= []).push(x1, 0.02, z1, x2, 0.02, z2);
const OP_PESO = { 1: 0.95, 0.6: 0.62, 0.45: 0.48, 0.4: 0.4 };
for (const [p, pos] of Object.entries(perPeso)) {
  const l = new THREE.LineSegments(geometria(pos), matLinee(Number(p) === 1 ? COL.chiaro : COL.lente, OP_PESO[p] ?? 0.5));
  l.renderOrder = 1;
  scena.add(l);
}

function matTesto(tex, op) {
  return new THREE.ShaderMaterial({
    uniforms: { uMap: { value: tex }, uCol: { value: COL.lente }, uOp: { value: op }, uRivela: U.rivela, uCentro: U.centro },
    vertexShader: /* glsl */ `
      varying vec2 vUv; varying vec3 vW;
      void main() { vUv = uv; vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: /* glsl */ `
      uniform sampler2D uMap; uniform vec3 uCol; uniform float uOp; uniform float uRivela; uniform vec2 uCentro;
      varying vec2 vUv; varying vec3 vW;
      void main() {
        float a = texture2D(uMap, vUv).a;
        float r = 1.0 - smoothstep(uRivela - 2.5, uRivela, length(vW.xz - uCentro));
        gl_FragColor = vec4(uCol, a * uOp * r);
      }`,
    transparent: true,
    depthWrite: false,
  });
}

function etichetta(e) {
  const px = 96;
  const c = document.createElement('canvas');
  const ctx = c.getContext('2d');
  const font = `${e.peso < 1 ? 500 : 600} ${px}px Archivo, system-ui, sans-serif`;
  ctx.font = font;
  const larg = Math.ceil(ctx.measureText(e.t).width) + 24;
  c.width = larg;
  c.height = Math.ceil(px * 1.35);
  ctx.font = font;
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(e.t, larg / 2, c.height / 2 + px * 0.04);
  const tex = new THREE.CanvasTexture(c);
  tex.anisotropy = 4;
  const alt = e.h * 1.35;
  const m = new THREE.Mesh(new THREE.PlaneGeometry((alt * larg) / c.height, alt), matTesto(tex, e.peso < 1 ? 0.6 : 0.85));
  m.rotation.set(-Math.PI / 2, 0, e.rot ? (-e.rot * Math.PI) / 180 : 0);
  m.position.set(e.x, 0.03, e.z);
  m.renderOrder = 2;
  return m;
}

/* ---------- Muri (si alzano) ---------- */
const H = PIANTA.altezza;
const muri = new THREE.Group();
scena.add(muri);
{
  const pos = [], aV = [], aE = [];
  for (const [x1, z1, x2, z2, sp] of PIANTA.muri) {
    pos.push(x1, 0, z1, x2, 0, z2, x2, H, z2, x1, 0, z1, x2, H, z2, x1, H, z1);
    aV.push(0, 0, 1, 0, 1, 1);
    const e = sp > 0.2 ? 1 : 0.45;
    aE.push(e, e, e, e, e, e);
  }
  var matMuri = matFacce(COL.lente, 1);
  const facce = new THREE.Mesh(geometria(pos, { aV: [aV, 1], aE: [aE, 1] }), matMuri);
  facce.renderOrder = 3;
  muri.add(facce);

  const ln = [];
  const linea = (a, b) => ln.push(...a, ...b);
  for (const [x1, z1, x2, z2, sp] of PIANTA.muri) {
    linea([x1, H, z1], [x2, H, z2]);
    if (sp > 0.2) { linea([x1, 0, z1], [x1, H, z1]); linea([x2, 0, z2], [x2, H, z2]); }
  }
  const vetri = [], caldi = [];
  const eCalda = (o) => (o.x1 === 1 && o.z1 === 3 && o.a === 4.2) || (o.x1 === 9 && o.z1 === 7 && o.a === 4.4) || (o.x1 === -7 && o.z1 === 3);
  for (const o of PIANTA.aperture) {
    const p = (d, y) => [o.x1 + o.ux * d, y, o.z1 + o.uz * d];
    let y0 = 0, y1 = 2.15;
    if (o.tipo === 'f') { y0 = 0.9; y1 = 2.25; }
    if (o.tipo === 'g') y1 = 2.5;
    const A = p(o.a, y0), B = p(o.b, y0), C = p(o.b, y1), D = p(o.a, y1);
    if (o.tipo === 'f') linea(A, B);
    linea(B, C); linea(C, D); linea(D, A);
    if (o.tipo === 'g') for (let y = 0.5; y < 2.5; y += 0.5) linea(p(o.a, y), p(o.b, y));
    if (o.tipo === 'f' && o.esterno) (eCalda(o) ? caldi : vetri).push(...A, ...B, ...C, ...A, ...C, ...D);
  }
  const lineeMuri = new THREE.LineSegments(geometria(ln), matLinee(COL.chiaro, 0.85));
  lineeMuri.renderOrder = 4;
  muri.add(lineeMuri);

  const matVetro = (col, op, additivo) => new THREE.ShaderMaterial({
    uniforms: { uCol: { value: col }, uOp: { value: op } },
    vertexShader: /* glsl */ `void main() { gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */ `uniform vec3 uCol; uniform float uOp; void main() { gl_FragColor = vec4(uCol, uOp); }`,
    transparent: true, depthWrite: false, side: THREE.DoubleSide,
    blending: additivo ? THREE.AdditiveBlending : THREE.NormalBlending,
  });
  const v1 = new THREE.Mesh(geometria(vetri), matVetro(COL.lente, 0.07));
  const v2 = new THREE.Mesh(geometria(caldi), matVetro(COL.caldo, 0.66, false));
  v1.renderOrder = v2.renderOrder = 3;
  muri.add(v1, v2);
}

/* ---------- Tetto a capanna (lo stesso triangolo del marchio RUI) ---------- */
const tetto = new THREE.Group();
tetto.position.y = H;
scena.add(tetto);
{
  const xa = -7.35, xb = 5.35, za = -4.35, zb = 3.35, zc = -0.5, hc = 2.5;
  const ln = [];
  const L2 = (a, b) => ln.push(...a, ...b);
  L2([xa, 0, za], [xb, 0, za]); L2([xa, 0, zb], [xb, 0, zb]); L2([xa, hc, zc], [xb, hc, zc]);
  for (const x of [xa, xb]) { L2([x, 0, za], [x, hc, zc]); L2([x, 0, zb], [x, hc, zc]); L2([x, 0, za], [x, 0, zb]); }
  for (let x = xa + 1.27; x < xb - 0.2; x += 1.27) { L2([x, 0, za], [x, hc, zc]); L2([x, 0, zb], [x, hc, zc]); }
  // tetto piano del garage con parapetto
  const yp = 0.32;
  for (const [a, b] of [[[1, 3], [9, 3]], [[9, 3], [9, 7]], [[9, 7], [1, 7]], [[1, 7], [1, 3]]]) {
    L2([a[0], yp, a[1]], [b[0], yp, b[1]]);
  }
  for (const [x, z] of [[9, 3], [9, 7], [1, 7]]) L2([x, 0, z], [x, yp, z]);
  var matTettoLinee = matLinee(COL.chiaro, 0.9);
  const l = new THREE.LineSegments(geometria(ln), matTettoLinee);
  l.renderOrder = 4;
  tetto.add(l);

  const pos = [], aV = [], aE = [];
  const tri = (a, b, c, va, vb, vc) => { pos.push(...a, ...b, ...c); aV.push(va, vb, vc); aE.push(1, 1, 1); };
  tri([xa, 0, za], [xb, 0, za], [xb, hc, zc], 0, 0, 1); tri([xa, 0, za], [xb, hc, zc], [xa, hc, zc], 0, 1, 1);
  tri([xa, 0, zb], [xb, 0, zb], [xb, hc, zc], 0, 0, 1); tri([xa, 0, zb], [xb, hc, zc], [xa, hc, zc], 0, 1, 1);
  for (const x of [xa, xb]) tri([x, 0, za], [x, 0, zb], [x, hc, zc], 0, 0, 1);
  var matTetto = matFacce(COL.azzurro, 0.7);
  const f = new THREE.Mesh(geometria(pos, { aV: [aV, 1], aE: [aE, 1] }), matTetto);
  f.renderOrder = 3;
  tetto.add(f);
}

/* ---------- Rilevatori volumetrici: tre tende come nel diagramma di una lente PIR ---------- */
function ventaglio(raggio, alt, apertura, fase) {
  const g = new THREE.Group();
  const tende = [[1, 0.9], [0.62, 0.55], [0.3, 0.35]];
  const n = 26;
  const supPos = [], supD = [], linPos = [], linD = [];
  for (const [fr] of tende) {
    const r = raggio * fr;
    const pts = [];
    for (let i = 0; i <= n; i++) {
      const a = -apertura / 2 + (apertura * i) / n;
      pts.push([Math.cos(a) * r, -alt, Math.sin(a) * r]);
    }
    for (let i = 0; i < n; i++) { supPos.push(0, 0, 0, ...pts[i], ...pts[i + 1]); supD.push(0, 1, 1); }
    for (let i = 0; i <= n; i += fr === 1 ? 2 : 4) { linPos.push(0, 0, 0, ...pts[i]); linD.push(0, 1); }
    for (let i = 0; i < n; i++) { linPos.push(...pts[i], ...pts[i + 1]); linD.push(1, 1); }
  }
  const s = new THREE.Mesh(geometria(supPos, { aD: [supD, 1] }), matRaggio(COL.blu, 0.9, { superficie: true, fase }));
  const l = new THREE.LineSegments(geometria(linPos, { aD: [linD, 1] }), matRaggio(COL.azzurro, 0.5));
  s.renderOrder = 5; l.renderOrder = 6;
  g.add(s, l);
  const corpo = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.3, 0.22), new THREE.MeshBasicMaterial({ color: 0xeaf4fb }));
  corpo.renderOrder = 7;
  g.add(corpo);
  return g;
}
const PIR = [
  [-6.75, -3.75, 45, 6.2], [4.75, -3.75, 135, 4.6], [-0.75, 2.75, -45, 3.8],
  [1.25, 6.75, -45, 4.2], [8.75, 6.75, -135, 4.4],
];
const pirs = PIR.map(([x, z, yaw, r], i) => {
  const contenitore = new THREE.Group();
  contenitore.position.set(x, 2.6, z);
  contenitore.rotation.y = (-yaw * Math.PI) / 180;
  const v = ventaglio(r, 2.6, Math.PI / 2, i * 0.37);
  contenitore.add(v);
  scena.add(contenitore);
  return v;
});

/* ---------- Telecamere esterne con il loro campo visivo ---------- */
function campoVisivo(fase) {
  const g = new THREE.Group();
  const alt = 2.8, lungMax = 12.5;
  const dirs = [[-32, -9], [32, -9], [32, -48], [-32, -48]].map(([yaw, pitch]) => {
    const y = (yaw * Math.PI) / 180, p = (pitch * Math.PI) / 180;
    return new THREE.Vector3(Math.cos(p) * Math.cos(y), Math.sin(p), Math.cos(p) * Math.sin(y));
  });
  const fine = dirs.map((d) => {
    const t = d.y < -0.02 ? Math.min(lungMax, alt / -d.y) : lungMax;
    return d.clone().multiplyScalar(t);
  });
  const pos = [], dd = [], lin = [], ld = [];
  for (let i = 0; i < 4; i++) {
    const a = fine[i], b = fine[(i + 1) % 4];
    pos.push(0, 0, 0, a.x, a.y, a.z, b.x, b.y, b.z); dd.push(0, 1, 1);
    lin.push(0, 0, 0, a.x, a.y, a.z); ld.push(0, 1);
    lin.push(a.x, a.y, a.z, b.x, b.y, b.z); ld.push(1, 1);
  }
  const s = new THREE.Mesh(geometria(pos, { aD: [dd, 1] }), matRaggio(COL.blu, 0.65, { superficie: true, fase }));
  const l = new THREE.LineSegments(geometria(lin, { aD: [ld, 1] }), matRaggio(COL.azzurro, 0.75));
  s.renderOrder = 5; l.renderOrder = 6;
  const corpo = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.22, 0.22), new THREE.MeshBasicMaterial({ color: 0xeaf4fb }));
  corpo.position.x = 0.1;
  corpo.renderOrder = 7;
  g.add(s, l, corpo);
  return g;
}
const TELECAMERE = [[5.2, -4.2, -45], [9.2, 7.2, 45], [-7.2, 3.2, 135], [-7.2, -4.2, -135]];
const telecamere = TELECAMERE.map(([x, z, yaw], i) => {
  const c = campoVisivo(i * 0.5);
  c.position.set(x, 2.8, z);
  c.userData.yaw = (-yaw * Math.PI) / 180;
  c.rotation.y = c.userData.yaw;
  scena.add(c);
  return c;
});

/* ---------- Barriere a infrarossi sul perimetro ---------- */
const [lx1, lz1, lx2, lz2] = PIANTA.lotto;
const COLONNE = [[lx1, lz1], [1, lz1], [lx2, lz1], [lx2, 1], [lx2, lz2], [1, lz2], [lx1, lz2], [lx1, 1]];
let TOT = 0;
const matBarriera = new THREE.ShaderMaterial({
  uniforms: {
    uCol: { value: COL.azzurro }, uTempo: U.tempo, uArma: U.arma, uDisegna: { value: 0 }, uTot: { value: 1 }, uOp: { value: 1 },
  },
  vertexShader: /* glsl */ `
    attribute float aS; varying float vS;
    void main() { vS = aS; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: /* glsl */ `
    uniform vec3 uCol; uniform float uTempo; uniform float uArma; uniform float uDisegna; uniform float uTot; uniform float uOp;
    varying float vS;
    void main() {
      float vis = 1.0 - smoothstep(uDisegna * uTot - 1.5, uDisegna * uTot, vS);
      float p = mod(uTempo * 12.0 - vS, uTot);
      float cometa = exp(-p * 0.2);
      float a = vis * (0.2 + 0.34 * uArma + cometa * 1.2 * uArma);
      gl_FragColor = vec4(mix(uCol, vec3(1.0), cometa * uArma * 0.7), a * uOp);
    }`,
  transparent: true,
  depthWrite: false,
  blending: THREE.AdditiveBlending,
});
{
  const pos = [], aS = [], col = [];
  let s = 0;
  for (let i = 0; i < COLONNE.length; i++) {
    const [ax, az] = COLONNE[i], [bx, bz] = COLONNE[(i + 1) % COLONNE.length];
    const L = Math.hypot(bx - ax, bz - az);
    for (const y of [0.35, 0.75, 1.15]) { pos.push(ax, y, az, bx, y, bz); aS.push(s, s + L); }
    s += L;
  }
  TOT = s;
  matBarriera.uniforms.uTot.value = TOT;
  const b = new THREE.LineSegments(geometria(pos, { aS: [aS, 1] }), matBarriera);
  b.renderOrder = 6;
  scena.add(b);
  for (const [x, z] of COLONNE) col.push(x, 0, z, x, 1.4, z, x - 0.15, 1.4, z, x + 0.15, 1.4, z);
  const c = new THREE.LineSegments(geometria(col), matLinee(COL.chiaro, 0.75));
  c.renderOrder = 4;
  scena.add(c);
}

/* ---------- Contatti su porte e finestre, che lampeggiano ---------- */
const matPunti = new THREE.ShaderMaterial({
  uniforms: { uCol: { value: COL.chiaro }, uTempo: U.tempo, uArma: U.arma, uOp: { value: 0 }, uPR: { value: 1 }, uScala: { value: 50 } },
  vertexShader: /* glsl */ `
    attribute float aF; attribute float aS;
    uniform float uPR; uniform float uScala;
    varying float vF;
    void main() {
      vF = aF;
      vec4 mv = modelViewMatrix * vec4(position, 1.0);
      gl_PointSize = aS * uPR * uScala / -mv.z;
      gl_Position = projectionMatrix * mv;
    }`,
  fragmentShader: /* glsl */ `
    uniform vec3 uCol; uniform float uTempo; uniform float uArma; uniform float uOp;
    varying float vF;
    void main() {
      float d = length(gl_PointCoord - 0.5);
      float disco = 1.0 - smoothstep(0.12, 0.5, d);
      float lampo = 0.45 + 0.55 * (0.5 + 0.5 * sin(uTempo * 2.4 + vF));
      gl_FragColor = vec4(uCol, disco * uOp * mix(0.55, lampo, uArma));
    }`,
  transparent: true,
  depthWrite: false,
  blending: THREE.AdditiveBlending,
});
{
  const pos = [], aF = [], aS = [];
  for (const o of PIANTA.aperture) {
    if (!o.esterno) continue;
    const m = (o.a + o.b) / 2;
    const y = o.tipo === 'f' ? 2.42 : o.tipo === 'g' ? 2.68 : 2.32;
    pos.push(o.x1 + o.ux * m, y, o.z1 + o.uz * m);
    aF.push(Math.random() * 6.28);
    aS.push(7);
  }
  const p = new THREE.Points(geometria(pos, { aF: [aF, 1], aS: [aS, 1] }), matPunti);
  p.renderOrder = 8;
  scena.add(p);
}

/* ---------- Etichette (dopo che il font è pronto) ---------- */
try {
  await Promise.race([document.fonts.load('600 96px Archivo'), new Promise((r) => setTimeout(r, 1500))]);
} catch (e) { /* si usa il font di sistema */ }
for (const e of PIANTA.etichette) scena.add(etichetta(e));

/* ---------- Inquadratura ---------- */
let inq = INQ(1, 1);
function ridimensiona() {
  const w = scenaEl.clientWidth, h = scenaEl.clientHeight;
  if (!w || !h) return;
  renderer.setSize(w, h, false);
  inq = INQ(w, h);
  camera.fov = inq.fov;
  camera.aspect = w / h;
  camera.setViewOffset(w, h, w / 2 - inq.cx, h / 2 - inq.cy, w, h);
  camera.updateProjectionMatrix();
  matPunti.uniforms.uPR.value = renderer.getPixelRatio();
  matPunti.uniforms.uScala.value = inq.R34 * 0.9;
}
ridimensiona();

const lerp = (a, b, t) => a + (b - a) * t;
const k = (t, a, b) => Math.min(1, Math.max(0, (t - a) / (b - a)));
const fuori = (t) => 1 - Math.pow(1 - t, 3);
const dentroFuori = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const liscio = (a, b, x) => { const t = k(x, a, b); return t * t * (3 - 2 * t); };

function progresso() {
  const corsa = hero.offsetHeight - innerHeight;
  return Math.min(1, Math.max(0, -hero.getBoundingClientRect().top / Math.max(1, corsa)));
}

const puntatore = { x: 0, obiettivo: 0 };
if (!tocco) addEventListener('pointermove', (e) => { puntatore.obiettivo = (e.clientX / innerWidth - 0.5) * 2; }, { passive: true });

let ondaDa = -1;
function posa(t, p) {
  U.tempo.value = t;
  U.rivela.value = ridotto ? 90 : 0.5 + fuori(k(t, 0, 2.0)) * 46;

  const alza = ridotto ? 1 : dentroFuori(k(t, 1.15, 2.7));
  muri.scale.y = Math.max(0.0001, alza);
  matMuri.uniforms.uOp.value = alza;

  const tet = ridotto ? 1 : fuori(k(t, 2.4, 3.3));
  tetto.scale.y = Math.max(0.0001, tet);
  matTetto.uniforms.uOp.value = 1.15 * tet;
  matTettoLinee.uniforms.uOp.value = 0.9 * tet;

  pirs.forEach((v, i) => {
    const b = ridotto ? 1 : fuori(k(t, 2.9 + i * 0.14, 3.8 + i * 0.14));
    v.scale.setScalar(Math.max(0.0001, b));
  });
  telecamere.forEach((c, i) => {
    const b = ridotto ? 1 : fuori(k(t, 3.1 + i * 0.12, 3.9 + i * 0.12));
    c.scale.setScalar(Math.max(0.0001, b));
    c.rotation.y = c.userData.yaw + (ridotto ? 0 : Math.sin(t * 0.33 + i * 1.7) * 0.32 * b);
  });
  matBarriera.uniforms.uDisegna.value = ridotto ? 1 : dentroFuori(k(t, 3.3, 4.8));
  matPunti.uniforms.uOp.value = ridotto ? 1 : k(t, 3.5, 4.2);

  const arma = liscio(0.3, 0.55, p) * (ridotto ? 1 : k(t, 3.6, 4.4));
  U.arma.value = arma;
  if (arma > 0.6 && ondaDa < 0) ondaDa = t;
  if (p < 0.15) ondaDa = -1;
  U.onda.value = ondaDa >= 0 && !ridotto ? Math.max(0.0001, k(t, ondaDa, ondaDa + 2.4)) : 0;

  // camera: dall'alto (come la planimetria) a tre quarti, poi gira con lo scroll
  puntatore.x += (puntatore.obiettivo - puntatore.x) * 0.04;
  const vista = ridotto ? 1 : dentroFuori(k(t, 0.85, 3.2));
  const el = lerp(89.3, 30, vista) - 7 * p;
  const az = lerp(0, 36, vista) + 66 * p + (ridotto ? 0 : Math.sin(t * 0.16) * 3.2 * vista) + puntatore.x * 5 * vista;
  const R = lerp(inq.Rtop, inq.R34, vista) * (1 - 0.1 * p);
  const e = (el * Math.PI) / 180, a = (az * Math.PI) / 180;
  camera.position.set(BERSAGLIO.x + R * Math.cos(e) * Math.sin(a), R * Math.sin(e), BERSAGLIO.z + R * Math.cos(e) * Math.cos(a));
  camera.lookAt(BERSAGLIO);
}

/* ---------- Avvio ---------- */
posa(0, progresso());
try { await renderer.compileAsync(scena, camera); } catch (e) { /* compila al primo render */ }

let t0 = performance.now();
let visibile = true, attivo = !document.hidden, raf = 0;
function giro() {
  raf = 0;
  if (!visibile || !attivo) return;
  posa((performance.now() - t0) / 1000, progresso());
  renderer.render(scena, camera);
  raf = requestAnimationFrame(giro);
}
const avvia = () => { if (!raf && visibile && attivo) raf = requestAnimationFrame(giro); };

new ResizeObserver(() => { ridimensiona(); if (ridotto) disegnaFermo(); }).observe(scenaEl);
function disegnaFermo() { posa(10, progresso()); renderer.render(scena, camera); }

if (ridotto) {
  disegnaFermo();
  addEventListener('scroll', () => requestAnimationFrame(disegnaFermo), { passive: true });
} else {
  new IntersectionObserver(([v]) => { visibile = v.isIntersecting; avvia(); }).observe(hero);
  document.addEventListener('visibilitychange', () => { attivo = !document.hidden; avvia(); });
  t0 = performance.now();
  avvia();
}
tela.classList.add('on');
hero.classList.add('tre-d');
