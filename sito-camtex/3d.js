// Il telaio: un tessuto jacquard che si tesse allo scroll e disegna il rombo del marchio Camtex.
// Ordito e trama sono tubi deformati nello shader: la geometria è una sola, il movimento lo calcola la GPU.
import * as THREE from 'three';

const N = 96;          // fili d'ordito
const M = 56;          // trame del disegno
const PRE = 8;         // trame di testata, già tessute in tela
const H = 0.2;         // ondulazione all'incrocio
const PASSO = 2.1;     // apertura del passo
const LICCI = 7.0;     // distanza fronte del tessuto - licci, in trame
const LB = 2.6;        // dove corre la trama nuova prima della battuta
const OLTRE = 26;      // ordito oltre il fronte del tessuto

// Il disegno: i quattro rombi del marchio (coordinate del logo 924x488) e la C bianca nel rombo rosso
function disegno() {
  const dati = new Uint8Array(N * M * 4);
  const LW = 88, LH = LW * 488 / 924;
  const ox = (N - LW) / 2, oy = (M - LH) / 2;
  const rombi = [
    { cx: 462, cy: 115, c: 1 }, { cx: 218, cy: 243, c: 2 },
    { cx: 462, cy: 372, c: 1 }, { cx: 707, cy: 247, c: 1 }
  ];
  for (let j = 0; j < M; j++) for (let i = 0; i < N; i++) {
    const X = (i + 0.5 - ox) / LW * 924;
    const Y = (M - 1 - j + 0.5 - oy) / LH * 488;
    let c = 0;
    for (const r of rombi) if (Math.abs(X - r.cx) / 206 + Math.abs(Y - r.cy) / 109 <= 1) c = r.c;
    if (c === 2) {
      const e = Math.hypot((X - 212) / 128, (Y - 246) / 62);
      const apertura = X > 290 && Y > 214 && Y < 266;
      if (e > 0.74 && e <= 1 && !apertura) c = 3;
    }
    // fondo in tela, figure in raso da 8 (come un damasco): la trama colorata copre quasi tutto
    const sopra = c === 0 ? (i + j) % 2 === 0 : (3 * i + j) % 8 === 0;
    const k = (j * N + i) * 4;
    dati[k] = sopra ? 255 : 0;
    dati[k + 1] = c * 80;
    dati[k + 3] = 255;
  }
  const t = new THREE.DataTexture(dati, N, M, THREE.RGBAFormat, THREE.UnsignedByteType);
  t.magFilter = t.minFilter = THREE.NearestFilter;
  t.needsUpdate = true;
  return t;
}

// Un tubo "vuoto": lunghezza e angolo come attributi, la forma la decide lo shader
function tubo(da, a, segmenti, radiali, istanze) {
  const g = new THREE.InstancedBufferGeometry();
  const nv = (segmenti + 1) * radiali;
  const aT = new Float32Array(nv), aTh = new Float32Array(nv);
  let k = 0;
  for (let s = 0; s <= segmenti; s++) {
    const t = da + (a - da) * s / segmenti;
    for (let r = 0; r < radiali; r++) { aT[k] = t; aTh[k] = r / radiali * Math.PI * 2; k++; }
  }
  const idx = new Uint32Array(segmenti * radiali * 6);
  let q = 0;
  for (let s = 0; s < segmenti; s++) for (let r = 0; r < radiali; r++) {
    const p0 = s * radiali + r, p1 = s * radiali + (r + 1) % radiali, p2 = p0 + radiali, p3 = p1 + radiali;
    idx[q++] = p0; idx[q++] = p2; idx[q++] = p1; idx[q++] = p1; idx[q++] = p2; idx[q++] = p3;
  }
  g.setIndex(new THREE.BufferAttribute(idx, 1));
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(nv * 3), 3));
  g.setAttribute('aT', new THREE.BufferAttribute(aT, 1));
  g.setAttribute('aTh', new THREE.BufferAttribute(aTh, 1));
  g.setAttribute('aFilo', new THREE.InstancedBufferAttribute(Float32Array.from(istanze), 1));
  g.instanceCount = istanze.length;
  return g;
}

const comune = /* glsl */`
  precision highp float;
  precision highp int;
  uniform highp sampler2D uDisegno;
  uniform float uC, uApri, uBatti, uTempo, uOnda;
  const int N = ${N};
  const int M = ${M};
  const float H = ${H.toFixed(3)};
  const float PASSO = ${PASSO.toFixed(3)};
  const float LICCI = ${LICCI.toFixed(3)};

  int bitA(int i, int j) {
    if (j < 0) return ((i + j) & 1) == 0 ? 1 : 0;
    if (j >= M || i < 0 || i >= N) return 0;
    return texelFetch(uDisegno, ivec2(i, j), 0).r > 0.5 ? 1 : 0;
  }
  int coloreA(int i, int j) {
    if (j < 0 || j >= M || i < 0 || i >= N) return 0;
    return int(texelFetch(uDisegno, ivec2(i, j), 0).g * 255.0 / 80.0 + 0.5);
  }
  float stato(float j) { return j < uC ? 1.0 : (j < uC + 0.5 ? uBatti : 0.0); }
  float onda(float x, float y) {
    float peso = 1.0 - smoothstep(uC - 9.0, uC - 2.0, y);
    return uOnda * peso * (0.6 * sin(x * 0.13 + uTempo * 0.7) + 0.4 * sin(y * 0.17 - uTempo * 0.5 + x * 0.05));
  }
  vec3 tinta(int c) {
    if (c == 1) return vec3(0.115, 0.112, 0.112);
    if (c == 2) return vec3(0.80, 0.075, 0.10);
    if (c == 3) return vec3(0.96, 0.945, 0.91);
    return vec3(0.77, 0.715, 0.615);
  }
`;

const vertOrdito = /* glsl */`
  ${comune}
  attribute float aT;
  attribute float aTh;
  attribute float aFilo;
  varying vec3 vN; varying vec3 vP; varying vec3 vCol;
  varying float vAO; varying float vT; varying float vTh; varying float vVedi;

  float incrocio(int i, int j) {
    float jf = float(j);
    float st = stato(jf);
    float intreccio = bitA(i, j) == 1 ? H : -H;
    if (st >= 1.0) return intreccio;
    float lato = bitA(i, int(uC)) == 1 ? 1.0 : -1.0;
    float d = jf - (uC - 1.0);
    float rampa = smoothstep(0.0, LICCI, d) * (1.0 - 0.7 * smoothstep(LICCI + 3.0, LICCI + 30.0, d));
    return mix(lato * PASSO * uApri * rampa, intreccio, st);
  }

  void main() {
    int i = int(aFilo);
    float y = aT;
    float j0 = floor(y);
    float f = y - j0;
    float a = incrocio(i, int(j0));
    float b = incrocio(i, int(j0) + 1);
    float s = f * f * (3.0 - 2.0 * f);
    float z = mix(a, b, s);
    float dz = (b - a) * 6.0 * f * (1.0 - f);
    float x = float(i);
    vec3 centro = vec3(x, y, z + onda(x, y));
    vec3 T = normalize(vec3(0.0, 1.0, dz));
    vec3 B = vec3(1.0, 0.0, 0.0);
    vec3 S = normalize(cross(B, T));
    float rx = 0.36, rz = 0.2;
    vec3 off = B * cos(aTh) * rx + S * sin(aTh) * rz;
    vN = normalize(B * cos(aTh) / rx + S * sin(aTh) / rz);
    vec3 p = centro + off;
    vP = p;
    vCol = (i == 1 || i == N - 2) ? vec3(0.78, 0.08, 0.1) : vec3(0.87, 0.835, 0.765);
    vAO = mix(0.55, 1.0, smoothstep(-H * 1.2, H, z));
    vT = y; vTh = aTh; vVedi = 1.0;
    gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
  }
`;

const vertTrama = /* glsl */`
  ${comune}
  uniform float uNavetta, uVerso, uLB;
  attribute float aT;
  attribute float aTh;
  attribute float aFilo;
  varying vec3 vN; varying vec3 vP; varying vec3 vCol;
  varying float vAO; varying float vT; varying float vTh; varying float vVedi;

  void main() {
    float jf = aFilo;
    if (jf > uC + 0.5) { gl_Position = vec4(0.0, 0.0, 2.0, 1.0); return; }
    bool corrente = jf > uC - 0.5;
    int j = int(jf);
    float x = aT;
    float i0 = floor(x);
    float f = x - i0;
    float a = bitA(int(i0), j) == 1 ? -H : H;
    float b = bitA(int(i0) + 1, j) == 1 ? -H : H;
    float s = f * f * (3.0 - 2.0 * f);
    float k = corrente ? uBatti : 1.0;
    float z = mix(a, b, s) * k;
    float dz = (b - a) * 6.0 * f * (1.0 - f) * k;
    float y = jf + (corrente ? (1.0 - uBatti) * uLB : 0.0);
    vec3 centro = vec3(x, y, z + onda(x, y));
    vec3 T = normalize(vec3(1.0, 0.0, dz));
    vec3 B = vec3(0.0, 1.0, 0.0);
    vec3 S = normalize(cross(T, B));
    float ry = 0.38, rz = 0.2;
    vec3 off = B * cos(aTh) * ry + S * sin(aTh) * rz;
    vN = normalize(B * cos(aTh) / ry + S * sin(aTh) / rz);
    vec3 p = centro + off;
    vP = p;
    vCol = tinta(coloreA(int(floor(x + 0.5)), j));
    vAO = mix(0.55, 1.0, smoothstep(-H * 1.2, H, z));
    vT = x; vTh = aTh;
    vVedi = corrente ? (uVerso > 0.0 ? uNavetta - x : x - uNavetta) : 1.0;
    gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
  }
`;

const frag = /* glsl */`
  precision highp float;
  uniform vec3 uCam, uFondo;
  uniform float uNebbiaDa, uNebbiaA;
  varying vec3 vN; varying vec3 vP; varying vec3 vCol;
  varying float vAO; varying float vT; varying float vTh; varying float vVedi;
  void main() {
    if (vVedi < 0.0) discard;
    vec3 n = normalize(vN);
    vec3 V = normalize(uCam - vP);
    if (dot(n, V) < 0.0) n = -n;
    vec3 L = normalize(vec3(-0.45, -0.4, 0.8));
    float dif = max(dot(n, L), 0.0);
    float cielo = 0.5 + 0.5 * n.z;
    float lucido = pow(max(dot(reflect(-L, n), V), 0.0), 16.0) * 0.16;
    float torsione = 0.5 + 0.5 * sin(vT * 9.0 + vTh * 2.0);
    float bordo = pow(1.0 - max(dot(n, V), 0.0), 3.0) * 0.1;
    vec3 c = vCol * (0.3 + 0.36 * cielo + 0.56 * dif) * (0.9 + 0.1 * torsione) * vAO + lucido + bordo;
    float d = length(uCam - vP);
    c = mix(c, uFondo, smoothstep(uNebbiaDa, uNebbiaA, d));
    gl_FragColor = vec4(c, 1.0);
  }
`;

const easeInOut = t => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
const easeOut = t => 1 - Math.pow(1 - t, 3);
const clamp01 = v => Math.min(1, Math.max(0, v));
const fase = (v, a, b) => clamp01((v - a) / (b - a));
const liscio = (a, b, v) => { const t = fase(v, a, b); return t * t * (3 - 2 * t); };
const mix = (a, b, t) => a + (b - a) * t;

export function avvia() {
  const sezione = document.getElementById('telaio');
  const intro = sezione.querySelector('.telaio__intro');
  const palco = document.getElementById('palco');
  const scena = document.getElementById('scena');
  const barra = document.getElementById('avanzamento');
  const telefono = matchMedia('(max-width: 959px)').matches || matchMedia('(pointer: coarse)').matches;

  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  if (!renderer.getContext()) throw new Error('webgl');
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, telefono ? 1.5 : 2));
  scena.appendChild(renderer.domElement);

  const fondo = new THREE.Color('#1A1C20');
  const scene = new THREE.Scene();
  scene.background = fondo;
  const camera = new THREE.PerspectiveCamera(34, 1, 0.5, 600);
  camera.up.set(0, 0, 1);

  const uniformi = {
    uDisegno: { value: disegno() },
    uC: { value: 0 }, uApri: { value: 0 }, uBatti: { value: 0 }, uTempo: { value: 0 }, uOnda: { value: 0 },
    uNavetta: { value: -20 }, uVerso: { value: 1 }, uLB: { value: LB },
    // lo shader scrive i colori così come sono (sRGB): il fondo va passato in sRGB, non nei valori lineari di THREE.Color
    uCam: { value: new THREE.Vector3() }, uFondo: { value: new THREE.Vector3(0x1A / 255, 0x1C / 255, 0x20 / 255) },
    uNebbiaDa: { value: 30 }, uNebbiaA: { value: 90 }
  };
  const seg = telefono ? 3 : 4, rad = telefono ? 4 : 6;
  const orditi = Array.from({ length: N }, (_, i) => i);
  const trame = Array.from({ length: M + PRE }, (_, j) => j - PRE);
  const gOrdito = tubo(-PRE - 1.5, M + OLTRE, Math.round((M + OLTRE + PRE + 1.5) * seg), rad, orditi);
  const gTrama = tubo(-0.9, N - 0.1, Math.round((N + 0.8) * seg), rad, trame);
  const mOrdito = new THREE.ShaderMaterial({ uniforms: uniformi, vertexShader: vertOrdito, fragmentShader: frag, side: THREE.DoubleSide });
  const mTrama = new THREE.ShaderMaterial({ uniforms: uniformi, vertexShader: vertTrama, fragmentShader: frag, side: THREE.DoubleSide });
  const ordito = new THREE.Mesh(gOrdito, mOrdito);
  const trama = new THREE.Mesh(gTrama, mTrama);
  ordito.frustumCulled = trama.frustumCulled = false;
  scene.add(ordito, trama);

  // Navetta in legno con le punte di metallo
  scene.add(new THREE.HemisphereLight(0xf2ece0, 0x202226, 1.6));
  const sole = new THREE.DirectionalLight(0xffffff, 1.8);
  sole.position.set(-30, -40, 60);
  scene.add(sole);
  const profilo = [];
  for (let k = 0; k <= 24; k++) {
    const t = -1 + 2 * k / 24;
    profilo.push(new THREE.Vector2(0.58 * Math.pow(1 - Math.pow(Math.abs(t), 2.6), 0.62) + 0.001, t * 4.6));
  }
  const gNavetta = new THREE.LatheGeometry(profilo, telefono ? 12 : 20);
  gNavetta.rotateZ(-Math.PI / 2);
  gNavetta.scale(1, 1, 0.78);
  const navetta = new THREE.Mesh(gNavetta, new THREE.MeshLambertMaterial({ color: 0x8a5a31 }));
  const spola = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 3.6, 12).rotateZ(Math.PI / 2), new THREE.MeshLambertMaterial({ color: 0xc8141c }));
  spola.position.z = 0.32;
  navetta.add(spola);
  scene.add(navetta);

  // Pettine: denti sottili fra un filo e l'altro, con due traverse
  const gDente = new THREE.BoxGeometry(0.07, 0.12, PASSO * 2 + 1.4);
  const denti = new THREE.InstancedMesh(gDente, new THREE.MeshLambertMaterial({ color: 0x9aa0a8 }), N + 1);
  const mtx = new THREE.Matrix4();
  for (let i = 0; i <= N; i++) { mtx.makeTranslation(i - 0.5, 0, 0); denti.setMatrixAt(i, mtx); }
  const traversa = new THREE.BoxGeometry(N + 5, 0.42, 0.34);
  const mTraversa = new THREE.MeshLambertMaterial({ color: 0x3b3f45 });
  const sopraT = new THREE.Mesh(traversa, mTraversa), sottoT = new THREE.Mesh(traversa, mTraversa);
  sopraT.position.set(N / 2 - 0.5, 0, PASSO + 0.75);
  sottoT.position.set(N / 2 - 0.5, 0, -PASSO - 0.75);
  const pettine = new THREE.Group();
  pettine.add(denti, sopraT, sottoT);
  scene.add(pettine);

  // Stato
  let P = 0, sLiscio = 0, attivo = false, visibileDa = 0, ultimo = performance.now(), primo = true, raf = 0;
  const bersaglio = new THREE.Vector3(), vista = new THREE.Vector3();

  const dimensiona = () => {
    const w = palco.clientWidth, h = palco.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.fov = w / h < 0.8 ? 50 : 34;
    camera.updateProjectionMatrix();
  };
  dimensiona();
  new ResizeObserver(dimensiona).observe(palco);

  const progressoScroll = () => {
    const r = sezione.getBoundingClientRect();
    const corsa = r.height - intro.offsetHeight - innerHeight;
    return clamp01((-r.top - intro.offsetHeight) / Math.max(1, corsa));
  };

  function aggiorna(dt, adesso) {
    const sT = progressoScroll();
    sLiscio += (sT - sLiscio) * (1 - Math.exp(-dt * 5));
    if (Math.abs(sT - sLiscio) < 0.0005) sLiscio = sT;

    // quante trame tessere: lo scroll guida, all'inizio il telaio parte da solo
    let obiettivo = M * Math.pow(fase(sLiscio, 0, 0.8), 2.1);
    if (sLiscio < 0.08) obiettivo = Math.max(obiettivo, Math.min(2, Math.max(0, (adesso - visibileDa) / 1000 - 0.4) * 0.8));
    const diff = obiettivo - P;
    const vel = Math.max(0.8, Math.abs(diff) * 3);
    P += Math.sign(diff) * Math.min(Math.abs(diff), vel * dt);
    if (P >= M) P = M;

    const c = Math.min(M, Math.floor(P));
    const phi = c >= M ? 0 : P - c;
    const verso = c % 2 === 0 ? 1 : -1;
    const apri = c >= M ? 0 : easeInOut(fase(phi, 0, 0.2)) * (1 - easeInOut(fase(phi, 0.8, 1)));
    const corsa = easeInOut(fase(phi, 0.16, 0.68));
    const batti = easeInOut(fase(phi, 0.68, 0.85));
    const ritorno = easeInOut(fase(phi, 0.85, 1));
    const xNav = verso > 0 ? mix(-12, N + 11, corsa) : mix(N + 11, -12, corsa);

    uniformi.uC.value = c;
    uniformi.uApri.value = apri;
    uniformi.uBatti.value = c >= M ? 0 : batti;
    uniformi.uNavetta.value = phi < 0.16 ? (verso > 0 ? -12 : N + 11) : xNav;
    uniformi.uVerso.value = verso;
    uniformi.uTempo.value = adesso / 1000;
    uniformi.uOnda.value = 0.12 + 0.5 * liscio(0.7, 1, sLiscio);

    navetta.visible = c < M && phi > 0.15 && phi < 0.7;
    navetta.position.set(xNav, c + LB, 0);
    navetta.rotation.z = verso > 0 ? 0 : Math.PI;

    const forma = phi < 0.85 ? batti : 1 - ritorno;
    pettine.position.y = mix(c + phi + LB + 1.1, c + 0.42, forma);
    pettine.visible = sLiscio < 0.8;

    // fase da mostrare
    let n = 1;
    if (sLiscio > 0.5 || c >= M) n = 4;
    else if (phi >= 0.68) n = 3;
    else if (phi >= 0.16) n = 2;
    if (palco.dataset.fase !== String(n)) palco.dataset.fase = String(n);
    barra.style.transform = `scaleX(${sLiscio.toFixed(4)})`;

    // camera: radente sul passo, poi sale fino alla vista dall'alto del tessuto finito
    const fronte = P - 1;
    const verticale = camera.aspect < 0.8;
    const vfov = THREE.MathUtils.degToRad(camera.fov);
    const hfov = 2 * Math.atan(Math.tan(vfov / 2) * camera.aspect);
    // su desktop il tessuto finito sta nella parte destra: a sinistra restano le fasi, sul fondo scuro
    const quota = verticale ? 1 : 0.58;
    const tanH = Math.tan(hfov / 2);
    const distFin = Math.max((N / 2 + 4) / (tanH * quota), (M / 2 + 4) / Math.tan(vfov / 2)) * 1.06;
    const spostaX = verticale ? 0 : 0.35 * distFin * tanH;
    const a1 = liscio(0.06, 0.5, sLiscio), a2 = liscio(0.45, 0.92, sLiscio);
    const tx = mix(mix(N * 0.5 + (verticale ? 0 : 5), N * 0.5, a1), N / 2 - 0.5 - spostaX, a2);
    const ty = mix(mix(fronte + 3.2, fronte + 1, a1), M / 2 - 1.5 - (verticale ? 4 : 0), a2);
    const dist = mix(mix(verticale ? 22 : 15, verticale ? 52 : 44, a1), distFin, a2);
    const el = THREE.MathUtils.degToRad(mix(mix(21, 42, a1), 76, a2));
    const az = mix(mix(-0.42, -0.2, a1), 0, a2) + Math.sin(adesso / 4200) * 0.03 * (1 - a2);
    bersaglio.set(tx, ty, 0);
    vista.set(Math.sin(az) * Math.cos(el), -Math.cos(az) * Math.cos(el), Math.sin(el)).multiplyScalar(dist);
    camera.position.copy(bersaglio).add(vista);
    camera.lookAt(bersaglio);
    uniformi.uCam.value.copy(camera.position);
    uniformi.uNebbiaDa.value = dist * 0.95;
    uniformi.uNebbiaA.value = dist * 2.4;
  }

  function ciclo() {
    raf = 0;
    if (!attivo) return;
    const adesso = performance.now();
    const dt = Math.min(0.05, (adesso - ultimo) / 1000);
    ultimo = adesso;
    aggiorna(dt, adesso);
    renderer.render(scene, camera);
    if (primo) { primo = false; scena.classList.add('pronta'); }
    raf = requestAnimationFrame(ciclo);
  }
  const avviaCiclo = () => {
    if (attivo || document.hidden) return;
    attivo = true;
    ultimo = performance.now();
    if (!raf) raf = requestAnimationFrame(ciclo);
  };
  const ferma = () => { attivo = false; if (raf) { cancelAnimationFrame(raf); raf = 0; } };

  let inVista = false;
  new IntersectionObserver(v => {
    inVista = v[0].isIntersecting;
    if (inVista) { if (!visibileDa) visibileDa = performance.now(); avviaCiclo(); } else ferma();
  }, { rootMargin: '200px 0px' }).observe(sezione);
  document.addEventListener('visibilitychange', () => { if (document.hidden) ferma(); else if (inVista) avviaCiclo(); });

  // primo fotogramma subito, così il canvas non parte vuoto
  aggiorna(0, performance.now());
  renderer.render(scene, camera);
}
