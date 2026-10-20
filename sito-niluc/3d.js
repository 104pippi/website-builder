// La calandra: un tessuto denim stropicciato che un rullo d'acciaio stira passando.
// Il tempo (performance.now) porta il rullo a metà schermo, lo scroll finisce il lavoro.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const RAGGIO = 0.26;
const LARGO = 13;      // tessuto in x
const LUNGO = 18;      // tessuto in z
const Z0 = -11;        // bordo lontano del tessuto

// ---------- rumore simplex 2D (Gustavson), solo per la mappa delle pieghe ----------
const G = [[1, 1], [-1, 1], [1, -1], [-1, -1], [1, 0], [-1, 0], [0, 1], [0, -1]];
const perm = new Uint8Array(512);
{
  const p = new Uint8Array(256);
  for (let i = 0; i < 256; i++) p[i] = i;
  let s = 20040113; // seme fisso: stessa stoffa a ogni visita (e nel poster)
  for (let i = 255; i > 0; i--) {
    s = (s * 1664525 + 1013904223) >>> 0;
    const j = s % (i + 1);
    [p[i], p[j]] = [p[j], p[i]];
  }
  for (let i = 0; i < 512; i++) perm[i] = p[i & 255];
}
const F2 = 0.5 * (Math.sqrt(3) - 1), G2 = (3 - Math.sqrt(3)) / 6;
function n2(x, y) {
  const s = (x + y) * F2;
  const i = Math.floor(x + s), j = Math.floor(y + s);
  const t = (i + j) * G2;
  const x0 = x - i + t, y0 = y - j + t;
  const i1 = x0 > y0 ? 1 : 0, j1 = 1 - i1;
  const x1 = x0 - i1 + G2, y1 = y0 - j1 + G2;
  const x2 = x0 - 1 + 2 * G2, y2 = y0 - 1 + 2 * G2;
  const ii = i & 255, jj = j & 255;
  let n = 0, tt, g;
  tt = 0.5 - x0 * x0 - y0 * y0;
  if (tt > 0) { g = G[perm[ii + perm[jj]] & 7]; tt *= tt; n += tt * tt * (g[0] * x0 + g[1] * y0); }
  tt = 0.5 - x1 * x1 - y1 * y1;
  if (tt > 0) { g = G[perm[ii + i1 + perm[jj + j1]] & 7]; tt *= tt; n += tt * tt * (g[0] * x1 + g[1] * y1); }
  tt = 0.5 - x2 * x2 - y2 * y2;
  if (tt > 0) { g = G[perm[ii + 1 + perm[jj + 1]] & 7]; tt *= tt; n += tt * tt * (g[0] * x2 + g[1] * y2); }
  return 70 * n;
}

// Pieghe: ampie ondulazioni + creste vive allungate (la stoffa ammucchiata) + macchie di tinta.
function mappaPieghe(w, h) {
  const alt = new Float32Array(w * h);
  const mac = new Float32Array(w * h);
  for (let j = 0; j < h; j++) {
    const z = Z0 + (j / (h - 1)) * LUNGO;
    for (let i = 0; i < w; i++) {
      const x = -LARGO / 2 + (i / (w - 1)) * LARGO;
      const wx = x + 0.55 * n2(x * 0.3 + 11.3, z * 0.3 - 4.1);
      const wz = z + 0.55 * n2(x * 0.3 - 7.7, z * 0.3 + 9.2);
      const ampie = n2(wx * 0.38, wz * 0.38) * 0.5 + 0.5;
      const pieghe = n2(wx * 0.95 + 3.1, wz * 0.62 - 1.7);
      const r1 = 1 - Math.abs(pieghe);
      const r2 = 1 - Math.abs(n2(wx * 1.9 - 5.2, wz * 1.45 + 2.4));
      alt[j * w + i] = ampie * 0.9 + (r1 * r1 * 0.75 + pieghe * 0.25) * 0.85 + r2 * r2 * r2 * 0.28;
      mac[j * w + i] = n2(x * 2.6, z * 2.6) * 0.5 + n2(x * 8.0 + 3.0, z * 8.0) * 0.25;
    }
  }
  // versione sfocata per spostare i vertici: le creste vive restano solo nelle normali per pixel
  const R = 5, tmp = new Float32Array(w * h), morb = new Float32Array(w * h);
  for (let pass = 0; pass < 2; pass++) {
    const da = pass ? morb : alt;
    for (let j = 0; j < h; j++) {
      let acc = 0;
      for (let i = -R; i <= R; i++) acc += da[j * w + Math.min(Math.max(i, 0), w - 1)];
      for (let i = 0; i < w; i++) {
        tmp[j * w + i] = acc / (2 * R + 1);
        acc += da[j * w + Math.min(i + R + 1, w - 1)] - da[j * w + Math.max(i - R, 0)];
      }
    }
    for (let i = 0; i < w; i++) {
      let acc = 0;
      for (let j = -R; j <= R; j++) acc += tmp[Math.min(Math.max(j, 0), h - 1) * w + i];
      for (let j = 0; j < h; j++) {
        morb[j * w + i] = acc / (2 * R + 1);
        acc += tmp[Math.min(j + R + 1, h - 1) * w + i] - tmp[Math.max(j - R, 0) * w + i];
      }
    }
  }
  const half = THREE.DataUtils.toHalfFloat;
  const dati = new Uint16Array(w * h * 4);
  for (let k = 0; k < w * h; k++) {
    dati[k * 4] = half(alt[k]);
    dati[k * 4 + 1] = half(mac[k]);
    dati[k * 4 + 2] = half(morb[k]);
    dati[k * 4 + 3] = half(1);
  }
  const tex = new THREE.DataTexture(dati, w, h, THREE.RGBAFormat, THREE.HalfFloatType);
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearFilter;
  tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.needsUpdate = true;
  return tex;
}

const ALTEZZA_GLSL = /* glsl */`
  uniform sampler2D uMappa;
  uniform float uPressa;   // fin dove il rullo è già passato (z, solo in avanti)
  uniform float uRullo;    // z attuale del rullo
  uniform float uAmp;
  uniform float uTempo;
  vec2 uvDi(vec2 p) { return vec2((p.x + ${(LARGO / 2).toFixed(1)}) / ${LARGO.toFixed(1)}, (p.y - (${Z0.toFixed(1)})) / ${LUNGO.toFixed(1)}); }
  float stirato(float z) { return 1.0 - smoothstep(uPressa - 0.55, uPressa + 0.06, z); }
  float altezza(vec2 p) {
    float z = p.y;
    float st = stirato(z);
    float h = texture2D(uMappa, uvDi(p)).CANALE * uAmp;
    float d = z - uRullo;
    h *= smoothstep(0.06, 0.5, abs(d));                       // sotto il rullo la stoffa è schiacciata
    float onda = exp(-pow((d - 0.52) / 0.24, 2.0)) * uAmp * 0.42; // la stoffa spinta davanti al rullo
    h += onda * step(0.0, d) * (1.0 - stirato(z - 0.5));
    float liscio = 0.006 * sin(p.x * 2.1 + z * 1.3 + uTempo * 0.5);
    return mix(h, liscio, st);
  }
`;

const VERT_TESSUTO = /* glsl */`
  #define CANALE b
  ${ALTEZZA_GLSL}
  varying vec2 vP;
  varying vec3 vMondo;
  varying float vVista;
  void main() {
    vec2 p = vec2(position.x, position.z);
    vec3 pos = vec3(p.x, altezza(p), p.y);
    vP = p;
    vec4 mondo = modelMatrix * vec4(pos, 1.0);
    vMondo = mondo.xyz;
    vec4 mv = viewMatrix * mondo;
    vVista = -mv.z;
    gl_Position = projectionMatrix * mv;
  }
`;

const FRAG_TESSUTO = /* glsl */`
  #define CANALE r
  ${ALTEZZA_GLSL}
  uniform vec3 uTinta;
  uniform vec3 uTrama;
  uniform vec3 uFondo;
  uniform vec3 uLuce;
  uniform vec2 uNebbia;
  uniform vec3 uDirLuce;
  uniform float uCalore;
  uniform float uDettaglio;
  varying vec2 vP;
  varying vec3 vMondo;
  varying float vVista;
  void main() {
    float e = 0.025;
    float h0 = altezza(vP);
    float hx = altezza(vP + vec2(e, 0.0));
    float hz = altezza(vP + vec2(0.0, e));
    float dx = (hx - h0) / e;
    float dz = (hz - h0) / e;

    // trama twill: costine diagonali + fili di ordito, sfumate dove diventerebbero moiré
    vec2 g = vP * 110.0;
    float fw = fwidth(g.x + g.y);
    float k = (1.0 - smoothstep(0.22, 0.55, fw)) * uDettaglio;
    float fase = (g.x + g.y) * 3.14159;
    float costa = sin(fase);
    float filo = sin(g.x * 6.28318);
    dx += k * 0.0018 * 110.0 * (cos(fase) * 3.14159 * 0.6 + cos(g.x * 6.28318) * 6.28318 * 0.2);
    dz += k * 0.0018 * 110.0 * (cos(fase) * 3.14159 * 0.6);
    vec3 N = normalize(vec3(-dx, 1.0, -dz));

    float st = stirato(vP.y);
    vec2 mc = texture2D(uMappa, uvDi(vP)).rg;
    vec3 base = uTinta * (0.86 + mc.g * 0.22);
    base = mix(base, uTrama, (0.5 + 0.5 * costa) * 0.10 * k + max(filo, 0.0) * 0.03 * k + 0.035);

    vec3 V = normalize(cameraPosition - vMondo);
    vec3 L = normalize(uDirLuce);
    float wrap = max((dot(N, L) + 0.4) / 1.4, 0.0);
    vec3 L2 = normalize(vec3(0.75, 0.45, 0.7));
    float riemp = max(dot(N, L2), 0.0);
    float nv = max(dot(N, V), 0.0);
    // occlusione: le valli delle pieghe e la striscia sotto il rullo restano in ombra
    float valle = mix(0.55 + 0.45 * smoothstep(0.0, 1.1 * uAmp, h0), 1.0, st);
    float sottoRullo = 1.0 - 0.6 * exp(-pow((vP.y - uRullo) / 0.33, 2.0));
    vec3 col = base * (uLuce * wrap * 1.15 + vec3(0.30, 0.36, 0.55) * riemp * 0.45 + 0.10) * valle * sottoRullo;
    col += uTrama * pow(1.0 - nv, 4.0) * 0.2 * (1.0 - st * 0.85);  // velluto del cotone sui bordi delle pieghe
    vec3 H = normalize(L + V);
    float lucido = pow(max(dot(N, H), 0.0), mix(12.0, 34.0, st)) * mix(0.04, 0.16, st);
    col += mix(uLuce, uTinta * 3.2, 0.55) * lucido;                // la stoffa stirata prende un lucido satinato, nel suo colore
    col *= mix(1.0, 1.12, st);
    float calore = exp(-pow((vP.y - uRullo + 0.42) / 0.22, 2.0)) * uCalore;
    col += vec3(1.0, 0.72, 0.42) * calore * 0.22;
    float nebbia = smoothstep(uNebbia.x, uNebbia.y, vVista);
    col = mix(col, uFondo, nebbia);
    gl_FragColor = vec4(col, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

const VERT_VAPORE = /* glsl */`
  attribute vec3 aSeme;
  uniform float uTempo;
  uniform float uRullo;
  uniform float uScala;
  uniform float uVapore;
  varying float vAlfa;
  void main() {
    float vita = fract(uTempo * 0.28 * aSeme.z + aSeme.y);
    vec3 p = vec3(aSeme.x * 6.0, 0.2 + vita * 0.75, uRullo - 0.28 - vita * 0.3);
    p.x += sin(vita * 5.0 + aSeme.y * 31.0) * 0.22 * vita;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = uScala * (0.9 + vita * 2.4) / -mv.z;
    vAlfa = uVapore * smoothstep(0.0, 0.12, vita) * pow(1.0 - vita, 1.6);
  }
`;
const FRAG_VAPORE = /* glsl */`
  varying float vAlfa;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    float a = smoothstep(0.5, 0.0, d);
    gl_FragColor = vec4(vec3(0.92, 0.94, 1.0), a * a * vAlfa * 0.05);
  }
`;

export async function avvia(host, { poster = false } = {}) {
  const mobile = matchMedia('(max-width: 760px)').matches;
  const ridotto = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance', preserveDrawingBuffer: poster });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, mobile ? 1.5 : 2));
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const canvas = renderer.domElement;
  canvas.className = 'calandra-canvas';
  canvas.setAttribute('aria-hidden', 'true');

  const FONDO = new THREE.Color('#0f172b');
  const scena = new THREE.Scene();
  scena.background = FONDO;
  scena.fog = new THREE.Fog(FONDO, 7, 15);

  const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 60);
  const pmrem = new THREE.PMREMGenerator(renderer);
  scena.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

  // tessuto
  const mappa = mappaPieghe(mobile ? 448 : 640, mobile ? 620 : 880);
  const uni = {
    uMappa: { value: mappa },
    uPressa: { value: -20 },
    uRullo: { value: -20 },
    uAmp: { value: 0.135 },
    uTempo: { value: 0 },
    uTinta: { value: new THREE.Color('#26386b') },
    uTrama: { value: new THREE.Color('#9fb0d6') },
    uFondo: { value: FONDO },
    uLuce: { value: new THREE.Color('#fff4e6') },
    uNebbia: { value: new THREE.Vector2(7, 15) },
    uDirLuce: { value: new THREE.Vector3(-0.4, 0.55, -0.85) },
    uCalore: { value: 0 },
    uDettaglio: { value: 1 },
  };
  const geo = new THREE.PlaneGeometry(LARGO, LUNGO, mobile ? 110 : 170, mobile ? 160 : 240);
  geo.rotateX(-Math.PI / 2);
  geo.translate(0, 0, Z0 + LUNGO / 2);
  const tessuto = new THREE.Mesh(geo, new THREE.ShaderMaterial({
    uniforms: uni, vertexShader: VERT_TESSUTO, fragmentShader: FRAG_TESSUTO,
  }));
  tessuto.frustumCulled = false;
  scena.add(tessuto);

  // rullo d'acciaio della calandra
  const rullo = new THREE.Mesh(
    new THREE.CylinderGeometry(RAGGIO, RAGGIO, LARGO + 2, 72, 1, false),
    new THREE.MeshStandardMaterial({ color: '#d4d8de', metalness: 1, roughness: 0.14, envMapIntensity: 1.25 })
  );
  rullo.rotation.z = Math.PI / 2;
  const asse = new THREE.Group();
  asse.add(rullo);
  scena.add(asse);
  // una luce che fa scorrere il riflesso sull'acciaio
  const luceRullo = new THREE.DirectionalLight('#fff1dd', 2.2);
  luceRullo.position.set(-3, 5, -2);
  scena.add(luceRullo);
  scena.add(new THREE.AmbientLight('#7d8fc4', 0.35));

  // vapore
  const N_VAP = mobile ? 240 : 420;
  const semi = new Float32Array(N_VAP * 3);
  for (let i = 0; i < N_VAP; i++) {
    semi[i * 3] = Math.random() * 2 - 1;
    semi[i * 3 + 1] = Math.random();
    semi[i * 3 + 2] = 0.7 + Math.random() * 0.6;
  }
  const geoVap = new THREE.BufferGeometry();
  geoVap.setAttribute('position', new THREE.BufferAttribute(new Float32Array(N_VAP * 3), 3));
  geoVap.setAttribute('aSeme', new THREE.BufferAttribute(semi, 3));
  const uniVap = {
    uTempo: uni.uTempo, uRullo: uni.uRullo,
    uScala: { value: 1 }, uVapore: { value: 0 },
  };
  const vapore = new THREE.Points(geoVap, new THREE.ShaderMaterial({
    uniforms: uniVap, vertexShader: VERT_VAPORE, fragmentShader: FRAG_VAPORE,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  }));
  vapore.frustumCulled = false;
  scena.add(vapore);

  // inquadratura: dove il pavimento entra in basso e sparisce in alto, per ogni formato
  let zVicino = 3, zLontano = -6, zSosta = -2, ritratto = false;
  const piano = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  const ray = new THREE.Raycaster();
  const punto = new THREE.Vector3();
  function zSulloSchermo(ndcY) {
    ray.setFromCamera({ x: 0, y: ndcY }, camera);
    return ray.ray.intersectPlane(piano, punto) ? punto.z : -9;
  }
  function inquadra() {
    const w = host.clientWidth, h = host.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    ritratto = camera.aspect < 0.9;
    if (ritratto) { camera.fov = 44; camera.position.set(0, 5.4, 3.4); camera.lookAt(0, 0, -1.6); }
    else { camera.fov = 32; camera.position.set(0, 3.3, 4.8); camera.lookAt(0, 0, -0.9); }
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld();
    zVicino = zSulloSchermo(-1);
    zLontano = Math.max(zSulloSchermo(1), -9);
    // il rullo si ferma sopra il titolo, qualunque sia l'altezza dello schermo
    let ySosta = h * 0.4;
    const titolo = document.querySelector('.hero__titolo');
    if (titolo) ySosta = Math.min(ySosta, titolo.getBoundingClientRect().top - host.getBoundingClientRect().top - h * 0.07);
    ySosta = Math.max(ySosta, h * 0.17);
    zSosta = zSulloSchermo(1 - (2 * ySosta) / h);
    uniVap.uScala.value = h * renderer.getPixelRatio() * 0.28;
  }
  inquadra();
  const camBase = camera.position.clone();

  const molla = (x, v, bersaglio, dt, w = 4.2) => {
    // molla critica: arriva senza rimbalzi
    const f = 1 + 2 * dt * w, oo = w * w, hoo = dt * oo, hhoo = dt * hoo;
    const det = 1 / (f + hhoo);
    const nx = det * (f * x + dt * v + hhoo * bersaglio);
    const nv = det * (v + hoo * (bersaglio - x));
    return [nx, nv];
  };

  let zRullo = zLontano - 1.6, vRullo = 0, zPressa = zRullo;
  let t0 = 0, ultimo = 0, attivo = false, raf = 0, pronto = false;
  const puntatore = { x: 0, y: 0, tx: 0, ty: 0 };
  if (!mobile && matchMedia('(pointer: fine)').matches) {
    addEventListener('pointermove', (e) => {
      puntatore.tx = (e.clientX / innerWidth) * 2 - 1;
      puntatore.ty = (e.clientY / innerHeight) * 2 - 1;
    }, { passive: true });
  }

  function stato(ora) {
    const t = (ora - t0) / 1000;
    const dt = Math.min(Math.max((ora - ultimo) / 1000, 0), 0.05);
    ultimo = ora;
    // intro: il rullo entra da lontano e si ferma a metà schermo (in 2,6 s)
    const zMeta = zSosta;
    const a = Math.min(t / 2.6, 1);
    const intro = (zLontano - 1.6) + (zMeta - (zLontano - 1.6)) * (1 - Math.pow(1 - a, 3));
    // scroll: finisce la stiratura e porta il rullo fuori dal bordo basso
    const corsa = Math.max(host.offsetHeight * 0.8, 1);
    const s = Math.min(Math.max(window.scrollY / corsa, 0), 1);
    const sl = s * s * (3 - 2 * s);
    const zFine = zVicino + 1.4;
    let bersaglio = Math.max(intro, zMeta + (zFine - zMeta) * sl);
    if (a >= 1 && s < 0.02) bersaglio += Math.sin(t * 1.4) * 0.05 * Math.min((t - 2.6) / 1.5, 1); // il rullo lavora avanti e indietro
    if (a < 1) { zRullo = intro; vRullo = 0; }
    else [zRullo, vRullo] = molla(zRullo, vRullo, bersaglio, dt);
    zPressa = Math.max(zPressa, zRullo);
    uni.uRullo.value = zRullo;
    uni.uPressa.value = zPressa;
    uni.uTempo.value = t;
    asse.position.set(0, RAGGIO, zRullo);
    asse.rotation.x = zRullo / RAGGIO; // gira quanto avanza
    const velocita = Math.abs(a < 1 ? (zMeta - zLontano) * 3 * Math.pow(1 - a, 2) / 2.6 : vRullo);
    uniVap.uVapore.value += ((0.3 + Math.min(velocita * 0.7, 1.0)) - uniVap.uVapore.value) * Math.min(dt * 3, 1);
    uni.uCalore.value = Math.min(0.35 + velocita * 0.5, 1.2);
    // la luce scivola piano sulla stoffa stirata; col mouse segue il puntatore
    puntatore.x += (puntatore.tx - puntatore.x) * Math.min(dt * 3, 1);
    puntatore.y += (puntatore.ty - puntatore.y) * Math.min(dt * 3, 1);
    uni.uDirLuce.value.set(-0.4 + Math.sin(t * 0.25) * 0.3 + puntatore.x * 0.35, 0.55, -0.85 + puntatore.y * 0.2);
    camera.position.set(camBase.x + puntatore.x * 0.18, camBase.y + sl * 0.5, camBase.z - sl * 0.6);
    camera.lookAt(0, 0, ritratto ? -1.6 : -0.9);
  }

  function disegna(ora) {
    stato(ora);
    renderer.render(scena, camera);
  }
  function giro(ora) {
    if (!attivo) return;
    disegna(ora);
    raf = requestAnimationFrame(giro);
  }
  function accendi() {
    if (attivo || ridotto || !pronto) return;
    attivo = true;
    ultimo = performance.now();
    raf = requestAnimationFrame(giro);
  }
  function spegni() { attivo = false; cancelAnimationFrame(raf); }

  await renderer.compileAsync(scena, camera);
  host.appendChild(canvas);
  pronto = true;

  if (poster) {
    // fotogramma del poster: stoffa tutta stropicciata, rullo ancora fuori campo
    t0 = performance.now(); ultimo = t0;
    disegna(t0);
    canvas.classList.add('si-vede');
    window.__posterPronto = true;
    return;
  }
  if (ridotto) {
    // niente movimento: si vede il lavoro finito
    zRullo = zPressa = zVicino + 1.4;
    uni.uRullo.value = zRullo; uni.uPressa.value = zPressa; uni.uCalore.value = 0;
    asse.position.set(0, RAGGIO, zRullo);
    uniVap.uVapore.value = 0;
    renderer.render(scena, camera);
    canvas.classList.add('si-vede');
    return;
  }

  new ResizeObserver(() => { inquadra(); if (!attivo) renderer.render(scena, camera); }).observe(host);
  new IntersectionObserver(([v]) => (v.isIntersecting ? accendi() : spegni())).observe(host);
  document.addEventListener('visibilitychange', () => (document.hidden ? spegni() : accendi()));

  t0 = performance.now();
  ultimo = t0;
  disegna(t0);
  canvas.classList.add('si-vede');
  accendi();
}
