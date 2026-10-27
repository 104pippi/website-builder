// Prova la posa: un pavimento che si posa da solo, piastrella dopo piastrella.
// Tutte le piastrelle sono un solo InstancedMesh; materiali e venature li disegna lo shader.
import * as THREE from 'three';

const MATERIALI = {
  legno:   { id: 0, nome: 'Rovere naturale',     fuga: [0.29, 0.22, 0.16], giunto: 0.0015, pezzo: 'listoni' },
  marmo:   { id: 1, nome: 'Marmo bianco venato', fuga: [0.80, 0.79, 0.76], giunto: 0.002,  pezzo: 'lastre' },
  pietra:  { id: 2, nome: 'Pietra naturale',     fuga: [0.55, 0.51, 0.44], giunto: 0.003,  pezzo: 'lastre' },
  cemento: { id: 3, nome: 'Effetto cemento',     fuga: [0.43, 0.44, 0.43], giunto: 0.002,  pezzo: 'lastre' }
};
// formati in metri: [lunghezza, larghezza]; nella spina la lunghezza è un multiplo intero della larghezza
const FORMATI = {
  legno:   { dritta: [1.2, 0.2], sfalsata: [1.2, 0.2], spina: [0.72, 0.12] },
  marmo:   { dritta: [0.6, 0.6], sfalsata: [1.2, 0.6], spina: [0.6, 0.15] },
  pietra:  { dritta: [0.6, 0.6], sfalsata: [0.8, 0.4], spina: [0.6, 0.2] },
  cemento: { dritta: [0.8, 0.8], sfalsata: [1.2, 0.6], spina: [0.8, 0.2] }
};
const NOMI_POSA = { dritta: 'Dritta', sfalsata: 'Sfalsata', spina: 'Spina di pesce' };
const DEMO = [
  ['legno', 'spina'], ['marmo', 'dritta'], ['pietra', 'sfalsata'],
  ['cemento', 'dritta'], ['legno', 'sfalsata'], ['marmo', 'spina']
];

const R = 3.4;            // raggio della pozza di luce, in metri
const SPESSORE = 0.012;   // 12 mm
const CAPIENZA = 1400;
const DURATA_PEZZO = 0.62;
const SFONDO = [28 / 255, 33 / 255, 37 / 255];

const NOISE = /* glsl */ `
vec3 mod289(vec3 x){return x-floor(x*(1.0/289.0))*289.0;}
vec2 mod289(vec2 x){return x-floor(x*(1.0/289.0))*289.0;}
vec3 permute(vec3 x){return mod289(((x*34.0)+10.0)*x);}
float snoise(vec2 v){
  const vec4 C=vec4(0.211324865405187,0.366025403784439,-0.577350269189626,0.024390243902439);
  vec2 i=floor(v+dot(v,C.yy));
  vec2 x0=v-i+dot(i,C.xx);
  vec2 i1=(x0.x>x0.y)?vec2(1.0,0.0):vec2(0.0,1.0);
  vec4 x12=x0.xyxy+C.xxzz;
  x12.xy-=i1;
  i=mod289(i);
  vec3 p=permute(permute(i.y+vec3(0.0,i1.y,1.0))+i.x+vec3(0.0,i1.x,1.0));
  vec3 m=max(0.5-vec3(dot(x0,x0),dot(x12.xy,x12.xy),dot(x12.zw,x12.zw)),0.0);
  m=m*m; m=m*m;
  vec3 x=2.0*fract(p*C.www)-1.0;
  vec3 h=abs(x)-0.5;
  vec3 ox=floor(x+0.5);
  vec3 a0=x-ox;
  m*=1.79284291400159-0.85373472095314*(a0*a0+h*h);
  vec3 g;
  g.x=a0.x*x0.x+h.x*x0.y;
  g.yz=a0.yz*x12.xz+h.yz*x12.yw;
  return 130.0*dot(m,g);
}
float fbm(vec2 p){
  float s=0.0, a=0.5;
  for(int i=0;i<OTTAVE;i++){ s+=a*snoise(p); p=p*2.03+vec2(1.7,9.2); a*=0.5; }
  return s;
}
`;

const LUCE = /* glsl */ `
uniform vec3 uSfondo;
float pozza(vec2 xz){ return 1.0 - smoothstep(0.0, ${R.toFixed(2)} * 1.08, length(xz)) * 0.62; }
float bordo(vec2 xz){ return smoothstep(${R.toFixed(2)} * 0.99, ${R.toFixed(2)} * 0.5, length(xz)); }
`;

const VERT_PEZZI = /* glsl */ `
attribute float aSeme;
attribute float aRitardo;
attribute vec2 aMisura;
uniform float uT;
uniform float uVia;
varying vec2 vP;
varying vec2 vMisura;
varying vec3 vN;
varying vec3 vW;
varying float vSopra;
varying float vSeme;
varying float vVia;
mat3 rotX(float a){ float c=cos(a), s=sin(a); return mat3(1.,0.,0., 0.,c,s, 0.,-s,c); }
mat3 rotZ(float a){ float c=cos(a), s=sin(a); return mat3(c,s,0., -s,c,0., 0.,0.,1.); }
void main(){
  float p = clamp((uT - aRitardo) / ${DURATA_PEZZO.toFixed(2)}, 0.0, 1.0);
  float e = 1.0 - pow(1.0 - p, 3.0);
  float atterra = 1.0 - e;
  float via = clamp(uVia * 1.7 - aSeme * 0.7, 0.0, 1.0);
  vVia = via;

  vec3 centro = (instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
  vec3 loc = (instanceMatrix * vec4(position, 1.0)).xyz - centro;
  vec3 nor = normalize(mat3(instanceMatrix) * normal);

  // il pezzo arriva inclinato dall'alto e si appoggia
  mat3 inclina = rotX(atterra * (0.55 + aSeme * 0.4)) * rotZ(atterra * (aSeme - 0.5) * 0.7);
  loc = inclina * loc;
  nor = inclina * nor;
  float compare = step(0.0001, p);
  loc *= compare * (1.0 - via * 0.35);
  centro.y += atterra * atterra * 0.95 - via * 0.01;

  vec4 mondo = modelMatrix * vec4(centro + loc, 1.0);
  vW = mondo.xyz;
  vN = normalize(mat3(modelMatrix) * nor);
  vP = position.xz * aMisura;
  vMisura = aMisura;
  vSopra = step(0.5, normal.y);
  vSeme = aSeme;
  gl_Position = projectionMatrix * viewMatrix * mondo;
}
`;

const FRAG_PEZZI = /* glsl */ `
uniform int uMat;
uniform vec3 uFuga;
varying vec2 vP;
varying vec2 vMisura;
varying vec3 vN;
varying vec3 vW;
varying float vSopra;
varying float vSeme;
varying float vVia;
${NOISE}
${LUCE}

vec3 legno(vec2 p, float s){
  vec2 q = vec2(p.x * 1.1, p.y * 8.0) + vec2(s * 31.7, s * 7.3);
  float g = fbm(vec2(q.x * 0.55, q.y * 2.2));
  float anelli = sin((q.y * 5.0 + g * 5.0 + snoise(q * vec2(0.35, 0.9)) * 1.6) * 3.14159);
  float fibra = snoise(vec2(p.x * 2.4, p.y * 150.0) + s * 9.0) * 0.5 + 0.5;
  vec3 chiaro = vec3(0.78, 0.62, 0.45);
  vec3 scuro = vec3(0.58, 0.43, 0.29);
  vec3 c = mix(chiaro, scuro, smoothstep(-0.3, 1.0, anelli) * 0.5 + fibra * 0.22 + g * 0.18);
  vec2 dn = (p - vec2((fract(s * 3.7) - 0.5) * vMisura.x * 0.7, (fract(s * 5.1) - 0.5) * vMisura.y * 0.5)) * vec2(1.0, 2.2);
  float nodo = smoothstep(0.035, 0.0, length(dn)) * step(0.55, fract(s * 11.3));
  c = mix(c, vec3(0.36, 0.25, 0.16), nodo * 0.8);
  return c * (0.86 + 0.24 * fract(s * 7.13));
}
vec3 marmo(vec2 p, float s){
  // calacatta: poche venature lunghe in diagonale, deformate dal rumore, più fili sottili e un fondo nuvoloso
  vec2 q = p + vec2(s * 13.1, s * 4.7);
  float deforma = snoise(q * 0.42) * 1.15 + snoise(q * 1.05 + 7.0) * 0.32 + snoise(q * 3.1 + 2.0) * 0.035;
  float t = (q.x * 0.82 + q.y * 0.42) + deforma;
  float d = abs(fract(t * 0.62) - 0.5) * 2.0;
  float spessore = 0.012 + 0.05 * pow(snoise(q * 0.9 + 3.0) * 0.5 + 0.5, 2.0);
  float vena = 1.0 - smoothstep(spessore * 0.15, spessore * 1.3, d);
  float alone = (1.0 - smoothstep(spessore, spessore * 6.0, d)) * 0.3;
  float t2 = (q.x * -0.35 + q.y * 0.9) + snoise(q * 0.6 + 4.0) * 0.9 + snoise(q * 1.9) * 0.12;
  float d2 = abs(fract(t2 * 1.1) - 0.5) * 2.0;
  float filo = (1.0 - smoothstep(0.004, 0.014, d2)) * smoothstep(0.35, 0.75, snoise(q * 0.8 + 11.0) * 0.5 + 0.5);
  float nuvola = fbm(q * 2.2 + 2.0) * 0.5 + 0.5;
  vec3 c = vec3(0.945, 0.94, 0.928) - nuvola * 0.045;
  c = mix(c, vec3(0.74, 0.75, 0.76), alone);
  c = mix(c, vec3(0.50, 0.52, 0.56), vena * 0.62);
  c = mix(c, vec3(0.68, 0.60, 0.46), filo * 0.55);
  return c;
}
vec3 pietra(vec2 p, float s){
  vec2 q = p * 1.35 + vec2(s * 17.0, s * 3.1);
  float n = fbm(q * 2.0) * 0.5 + 0.5;
  float m = fbm(q * 6.5 + 3.0) * 0.5 + 0.5;
  float grana = smoothstep(0.62, 0.86, snoise(q * 34.0) * 0.5 + 0.5);
  vec3 c = mix(vec3(0.80, 0.73, 0.61), vec3(0.60, 0.54, 0.45), n * 0.65 + m * 0.35);
  c -= grana * 0.09;
  c += smoothstep(0.7, 0.95, m) * vec3(0.06, 0.04, 0.0);
  return c * (0.9 + 0.16 * fract(s * 5.3));
}
vec3 cemento(vec2 p, float s){
  vec2 q = p + vec2(s * 7.0, s * 2.3);
  float n = fbm(q * 1.4) * 0.5 + 0.5;
  float m = fbm(q * 8.0) * 0.5 + 0.5;
  float pori = smoothstep(0.84, 0.93, snoise(q * 58.0) * 0.5 + 0.5);
  vec3 c = vec3(0.56, 0.57, 0.56) + n * 0.09 + m * 0.035 - pori * 0.09;
  return c * (0.95 + 0.08 * fract(s * 9.1));
}

void main(){
  vec3 albedo; float lucido;
  if (uMat == 0)      { albedo = legno(vP, vSeme);   lucido = 0.42; }
  else if (uMat == 1) { albedo = marmo(vP, vSeme);   lucido = 0.95; }
  else if (uMat == 2) { albedo = pietra(vP, vSeme);  lucido = 0.12; }
  else                { albedo = cemento(vP, vSeme); lucido = 0.35; }

  vec3 N = normalize(vN);
  vec3 V = normalize(cameraPosition - vW);
  vec3 L = normalize(vec3(-0.55, 0.95, -0.25));
  float dif = max(dot(N, L), 0.0);
  vec3 H = normalize(L + V);
  float spec = pow(max(dot(N, H), 0.0), mix(18.0, 220.0, lucido)) * mix(0.05, 0.55, lucido);

  // riflesso di una finestra alta sul fondo: lo vedono bene marmo e legno lucido
  vec3 Rf = reflect(-V, N);
  float az = atan(Rf.x, -Rf.z);
  float el = Rf.y;
  float morb = mix(0.16, 0.025, lucido);
  vec2 rugo = vec2(snoise(vW.xz * 9.0), snoise(vW.zx * 9.0 + 3.0)) * (1.0 - lucido) * 0.06;
  az += rugo.x; el += rugo.y;
  float fin = smoothstep(-0.5 - morb, -0.5 + morb, az) * smoothstep(-0.12 + morb, -0.12 - morb, az)
            * smoothstep(0.36 - morb, 0.36 + morb, el) * smoothstep(0.66 + morb, 0.66 - morb, el);
  float montante = smoothstep(0.012 + morb * 0.3, 0.0, abs(az + 0.31)) * 0.6;
  fin *= 1.0 - montante;
  float riflesso = fin * mix(0.05, 0.3, lucido) * vSopra;

  // smusso: il bordo di ogni pezzo prende un filo d'ombra
  vec2 d = vMisura * 0.5 - abs(vP);
  float smusso = smoothstep(0.0, 0.0035, min(d.x, d.y));
  vec3 col;
  if (vSopra > 0.5) {
    col = albedo * (0.34 + 0.8 * dif) * mix(0.62, 1.0, smusso);
  } else {
    col = albedo * 0.42;
  }
  float pz = pozza(vW.xz);
  col = col * pz + (spec + riflesso) * pz;
  col = mix(col, vec3(0.36, 0.365, 0.36) * pz, vVia);
  gl_FragColor = vec4(mix(uSfondo, col, bordo(vW.xz)), 1.0);
}
`;

const VERT_FONDO = /* glsl */ `
varying vec3 vW;
void main(){
  vec4 m = modelMatrix * vec4(position, 1.0);
  vW = m.xyz;
  gl_Position = projectionMatrix * viewMatrix * m;
}
`;
const FRAG_FONDO = /* glsl */ `
uniform vec3 uFuga;
varying vec3 vW;
${LUCE}
void main(){
  vec3 c = vec3(0.36, 0.365, 0.36) * pozza(vW.xz);
  gl_FragColor = vec4(mix(uSfondo, c, bordo(vW.xz)), 1.0);
}
`;

/* ---------- geometria della posa ---------- */
function rand(seme) {
  let s = seme >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ogni pezzo: centro (x, z), lunghezza lungo l'asse locale x, larghezza, rotazione attorno a y
function calcolaPosa(materiale, disegno) {
  const [lung, larg] = FORMATI[materiale][disegno];
  const pezzi = [];
  const lim = R + lung;
  const tieni = (x, z, l, w, rot) => { if (Math.hypot(x, z) < lim) pezzi.push({ x, z, l, w, rot }); };

  if (disegno === 'spina') {
    const giro = Math.PI / 4;
    const c = Math.cos(giro), s = Math.sin(giro);
    const N = Math.ceil((2 * lim + 2 * lung) / larg);
    const M = Math.ceil((2 * lim) / lung) + 3;
    const mette = (u, v, l, w, rot) => tieni(u * c - v * s, u * s + v * c, l, w, rot + giro);
    for (let n = -N; n <= N; n++) {
      for (let m = -M; m <= M; m++) {
        // orizzontale in (n w + m L, n w - m L), verticale accanto: insieme coprono il piano senza buchi
        const hx = n * larg + m * lung, hy = n * larg - m * lung;
        mette(hx + lung / 2, hy + larg / 2, lung, larg, 0);
        const vx = n * larg + lung + m * lung, vy = n * larg - lung + larg - m * lung;
        mette(vx + larg / 2, vy + lung / 2, lung, larg, Math.PI / 2);
      }
    }
  } else {
    const righe = Math.ceil((2 * lim) / larg);
    const colonne = Math.ceil((2 * lim) / lung) + 1;
    const scarto = disegno === 'sfalsata' ? (materiale === 'legno' ? 1 / 3 : 1 / 2) : 0;
    for (let j = -righe; j <= righe; j++) {
      const off = ((((j * scarto) % 1) + 1) % 1) * lung;
      for (let i = -colonne; i <= colonne; i++) {
        tieni(i * lung + off, j * larg + larg / 2, lung, larg, 0);
      }
    }
  }
  return pezzi;
}

function testoFormato(materiale, disegno) {
  const [l, w] = FORMATI[materiale][disegno];
  const cm = (v) => Math.round(v * 100);
  const pezzo = MATERIALI[materiale].pezzo;
  return `${NOMI_POSA[disegno]}, ${pezzo} ${cm(w)}×${cm(l)} cm`;
}

/* ---------- avvio ---------- */
export async function avvia(palco, { ridotto = false } = {}) {
  const canvas = palco.querySelector('canvas');
  const telefono = matchMedia('(max-width: 699px)').matches;
  const tocco = matchMedia('(hover: none)').matches;

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  } catch (e) {
    palco.classList.add('senza-3d');
    return;
  }
  if (!renderer.getContext()) { palco.classList.add('senza-3d'); return; }
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, telefono ? 1.5 : 2));
  renderer.setClearColor(0x000000, 0);

  const scena = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 40);
  const pavimento = new THREE.Group();
  scena.add(pavimento);

  const ottave = telefono ? 3 : 4;
  const uniFuga = { value: new THREE.Vector3(...MATERIALI.legno.fuga) };
  const uniSfondo = { value: new THREE.Vector3(...SFONDO) };

  const fondo = new THREE.Mesh(
    new THREE.PlaneGeometry(R * 2.4, R * 2.4).rotateX(-Math.PI / 2),
    new THREE.ShaderMaterial({ vertexShader: VERT_FONDO, fragmentShader: FRAG_FONDO, uniforms: { uFuga: uniFuga, uSfondo: uniSfondo } })
  );
  pavimento.add(fondo);

  const geo = new THREE.BoxGeometry(1, 1, 1);
  const aSeme = new THREE.InstancedBufferAttribute(new Float32Array(CAPIENZA), 1);
  const aRitardo = new THREE.InstancedBufferAttribute(new Float32Array(CAPIENZA), 1);
  const aMisura = new THREE.InstancedBufferAttribute(new Float32Array(CAPIENZA * 2), 2);
  geo.setAttribute('aSeme', aSeme);
  geo.setAttribute('aRitardo', aRitardo);
  geo.setAttribute('aMisura', aMisura);
  const mat = new THREE.ShaderMaterial({
    vertexShader: VERT_PEZZI,
    fragmentShader: FRAG_PEZZI,
    defines: { OTTAVE: ottave },
    uniforms: {
      uT: { value: 0 }, uVia: { value: 0 }, uMat: { value: 0 },
      uFuga: uniFuga, uSfondo: uniSfondo
    }
  });
  const pezzi = new THREE.InstancedMesh(geo, mat, CAPIENZA);
  pezzi.frustumCulled = false;
  pezzi.count = 0;
  pavimento.add(pezzi);

  const m4 = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const asseY = new THREE.Vector3(0, 1, 0);
  const pos = new THREE.Vector3();
  const sca = new THREE.Vector3();
  let fineposa = 0;

  function costruisci(materiale, disegno) {
    const lista = calcolaPosa(materiale, disegno).slice(0, CAPIENZA);
    const giunto = MATERIALI[materiale].giunto;
    const r = rand(materiale.length * 977 + disegno.length * 131);
    // il posatore parte dal fondo della stanza e viene verso chi guarda
    const dx = 0.32, dz = 0.95;
    let max = 0;
    lista.forEach((p, i) => {
      q.setFromAxisAngle(asseY, p.rot);
      pos.set(p.x, 0.001 + SPESSORE / 2, p.z);
      sca.set(p.l - giunto, SPESSORE, p.w - giunto);
      m4.compose(pos, q, sca);
      pezzi.setMatrixAt(i, m4);
      aSeme.array[i] = r();
      const lungo = (p.x * dx + p.z * dz + R) / (2 * R);
      const ritardo = Math.max(0, lungo) * 1.9 + r() * 0.12;
      aRitardo.array[i] = ritardo;
      max = Math.max(max, ritardo);
      aMisura.array[i * 2] = p.l - giunto;
      aMisura.array[i * 2 + 1] = p.w - giunto;
    });
    pezzi.count = lista.length;
    pezzi.instanceMatrix.needsUpdate = true;
    aSeme.needsUpdate = aRitardo.needsUpdate = aMisura.needsUpdate = true;
    mat.uniforms.uMat.value = MATERIALI[materiale].id;
    uniFuga.value.set(...MATERIALI[materiale].fuga);
    fineposa = max + DURATA_PEZZO;
  }

  /* ---------- stato e comandi ---------- */
  const comandi = document.getElementById('posa-comandi');
  const elMat = document.getElementById('posa-materiale');
  const elDis = document.getElementById('posa-disegno');
  const stato = { materiale: 'legno', disegno: 'spina' };
  let tPosa = 0;          // secondi dall'inizio della posa
  let tVia = -1;          // secondi dall'inizio della rimozione, -1 = ferma
  let prossimo = null;
  let demo = !ridotto;
  let attesaDemo = 0;
  let indiceDemo = 0;

  const segna = () => {
    comandi.querySelectorAll('[data-materiale]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.materiale === stato.materiale)));
    comandi.querySelectorAll('[data-disegno]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.disegno === stato.disegno)));
    elMat.textContent = MATERIALI[stato.materiale].nome;
    elDis.textContent = testoFormato(stato.materiale, stato.disegno);
  };

  const cambia = (materiale, disegno) => {
    if (materiale === stato.materiale && disegno === stato.disegno && !prossimo) return;
    stato.materiale = materiale;
    stato.disegno = disegno;
    segna();
    if (ridotto) {
      costruisci(materiale, disegno);
      tPosa = 999;
      disegna();
      return;
    }
    prossimo = [materiale, disegno];
    if (tVia < 0) tVia = 0;
    sveglia();
  };

  comandi.addEventListener('click', (e) => {
    const b = e.target.closest('button[data-materiale], button[data-disegno]');
    if (!b) return;
    demo = false;
    cambia(b.dataset.materiale || stato.materiale, b.dataset.disegno || stato.disegno);
  });

  /* ---------- camera, scroll, puntatore ---------- */
  let larghezza = 1, altezza = 1;
  const ridimensiona = () => {
    const r = palco.getBoundingClientRect();
    larghezza = Math.max(1, r.width);
    altezza = Math.max(1, r.height);
    renderer.setSize(larghezza, altezza, false);
    camera.aspect = larghezza / altezza;
    camera.updateProjectionMatrix();
    if (ridotto) disegna();
  };
  new ResizeObserver(ridimensiona).observe(palco);
  ridimensiona();

  let scorri = 0.5;
  const leggiScroll = () => {
    const r = palco.getBoundingClientRect();
    scorri = Math.min(1, Math.max(0, (innerHeight - r.top) / (innerHeight + r.height)));
  };
  addEventListener('scroll', leggiScroll, { passive: true });
  leggiScroll();

  const punt = { x: 0, y: 0, tx: 0, ty: 0 };
  if (!tocco) {
    palco.addEventListener('pointermove', (e) => {
      const r = palco.getBoundingClientRect();
      punt.tx = ((e.clientX - r.left) / r.width - 0.5) * 2;
      punt.ty = ((e.clientY - r.top) / r.height - 0.5) * 2;
    });
    palco.addEventListener('pointerleave', () => { punt.tx = 0; punt.ty = 0; });
  }

  const guarda = new THREE.Vector3(0, 0, 0.15);
  function piazzaCamera(t) {
    const asp = camera.aspect;
    const k = Math.min(1, Math.max(0, (1.35 - asp) / 0.8));       // 0 = largo, 1 = telefono in verticale
    punt.x += (punt.tx - punt.x) * 0.05;
    punt.y += (punt.ty - punt.y) * 0.05;
    const ang = Math.sin(t * 0.13) * 0.32 + (scorri - 0.5) * 0.7 + punt.x * 0.18;
    const alto = THREE.MathUtils.lerp(3.5, 6.3, k) + (0.5 - scorri) * 0.9 - punt.y * 0.35;
    const dist = THREE.MathUtils.lerp(5.4, 3.3, k);
    camera.position.set(Math.sin(ang) * dist, alto, Math.cos(ang) * dist);
    camera.lookAt(guarda);
    pavimento.rotation.y = Math.sin(t * 0.07) * 0.08;
  }

  /* ---------- ciclo ---------- */
  let attivo = false, visibile = false, ultimo = 0, rafId = 0;
  const t0 = performance.now();

  function disegna() {
    piazzaCamera(ridotto ? 0 : (performance.now() - t0) / 1000);
    mat.uniforms.uT.value = tPosa;
    mat.uniforms.uVia.value = tVia < 0 ? 0 : Math.min(1, tVia / 0.5);
    renderer.render(scena, camera);
  }

  function giro(ora) {
    rafId = 0;
    if (!attivo) return;
    const dt = Math.min(0.05, (ora - (ultimo || ora)) / 1000);
    ultimo = ora;
    if (tVia >= 0) {
      tVia += dt;
      if (tVia >= 0.55 && prossimo) {
        costruisci(prossimo[0], prossimo[1]);
        prossimo = null;
        tVia = -1;
        tPosa = 0;
      }
    } else {
      tPosa += dt;
      if (demo && tPosa > fineposa) {
        attesaDemo += dt;
        if (attesaDemo > 2.6) {
          attesaDemo = 0;
          indiceDemo = (indiceDemo + 1) % DEMO.length;
          cambia(...DEMO[indiceDemo]);
        }
      }
    }
    disegna();
    rafId = requestAnimationFrame(giro);
  }

  function sveglia() {
    attivo = visibile && !document.hidden && !ridotto;
    if (attivo && !rafId) { ultimo = 0; rafId = requestAnimationFrame(giro); }
  }

  new IntersectionObserver(([v]) => { visibile = v.isIntersecting; sveglia(); }, { rootMargin: '80px 0px' }).observe(palco);
  document.addEventListener('visibilitychange', sveglia);

  costruisci(stato.materiale, stato.disegno);
  segna();
  if (ridotto) tPosa = 999;
  try { await renderer.compileAsync(scena, camera); } catch (e) { /* compila al primo frame */ }
  disegna();
  palco.classList.add('pronto');
  sveglia();
}
