// Hero 3D: una cella filtrante plissettata con telaio zincato.
// La polvere entra da sinistra e resta sulle pieghe, l'aria esce pulita dall'altra parte.
// Tutto il moto delle particelle è calcolato nello shader dal tempo: nessun lavoro sulla CPU.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const CLASSI = {
  G4: { pieghe: 6, presa: 0.42, nome: 'Prefiltro, EN\u00a0779', nota: 'Ferma la polvere grossa: arrestanza media ≥ 90%.' },
  F7: { pieghe: 12, presa: 0.86, nome: 'Filtrazione fine, EN\u00a0779', nota: 'Efficienza media 80–90% sulle particelle da 0,4 µm.' },
  H14: { pieghe: 22, presa: 1.0, nome: 'Filtrazione assoluta, EN\u00a01822', nota: 'Efficienza ≥ 99,995% sulla particella più penetrante.' },
};
const LARG = 1.2, ALT = 1.2, AMP = 0.055, PROF = 0.17, BORDO = 0.045;

const rgb = hex => new THREE.Vector3(((hex >> 16) & 255) / 255, ((hex >> 8) & 255) / 255, (hex & 255) / 255);

const GLSL_COMUNE = /* glsl */`
  uniform float uT, uFreq, uScala;
  attribute vec4 aR;
  attribute float aQ;
  varying float vA;
  varying vec3 vC;
  const float X0 = -3.6;
  const float X1 = 3.4;
  const float MEZZA = 0.6;
  const float AMP = ${AMP.toFixed(3)};
  float tri(float t) { return 1.0 - 4.0 * abs(fract(t) - 0.5); }
`;

const VS_POLVERE = /* glsl */`
  ${GLSL_COMUNE}
  uniform float uPresa, uNascondi;
  uniform vec3 uC1, uC2;
  void main() {
    float L = X1 - X0;
    float vel = 0.42 + 0.25 * aR.w;
    float x = X0 + fract(uT * vel / L + aR.x) * L;
    float y0 = (aR.z - 0.5) * 2.0 * MEZZA * 0.92;
    float z0 = (aQ - 0.5) * 2.0 * MEZZA * 0.92;
    float taglia = aR.y;
    float faccia = AMP * tri(z0 * uFreq + 0.25) - 0.012;
    float a = 0.95;
    vec3 col = mix(uC1, uC2, fract(aR.x * 13.7));
    if (x > faccia) {
      if (taglia > 1.0 - uPresa) {
        float k = (x - faccia) / (X1 - faccia);
        x = faccia;
        a *= (1.0 - 0.72 * k) * (1.0 - uNascondi);
        col *= 0.82;
      } else {
        a *= 0.8;
      }
    }
    float su = smoothstep(0.0, 2.8, -x);
    float giu = smoothstep(0.0, 2.8, x);
    float sp = 1.0 + 1.25 * su + 0.45 * giu;
    float amp = 0.16 * su + 0.07 * giu;
    float y = y0 * sp + amp * sin(uT * 1.1 + aR.w * 31.0 + x * 1.7);
    float z = z0 * sp + amp * cos(uT * 0.9 + aR.z * 27.0 + x * 1.4);
    a *= smoothstep(X0, X0 + 1.0, x) * (1.0 - smoothstep(X1 - 1.0, X1, x));
    vec4 mv = modelViewMatrix * vec4(x, y, z, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = max(1.5, mix(0.014, 0.048, taglia * taglia) * uScala / -mv.z);
    vA = a;
    vC = col;
  }
`;

const VS_ARIA = /* glsl */`
  ${GLSL_COMUNE}
  uniform vec3 uSporca, uPulita;
  void main() {
    float L = X1 - X0;
    float vel = 0.75 + 0.45 * aR.y;
    float x = X0 + fract(uT * vel / L + aR.x) * L;
    float y0 = (aR.z - 0.5) * 2.0 * MEZZA * 0.95;
    float z0 = (aQ - 0.5) * 2.0 * MEZZA * 0.95;
    float su = smoothstep(0.0, 2.8, -x);
    float giu = smoothstep(0.0, 2.8, x);
    float sp = 1.0 + 1.25 * su + 0.6 * giu;
    float amp = 0.14 * su + 0.05 * giu;
    float y = y0 * sp + amp * sin(uT * 1.3 + aR.w * 29.0 + x * 1.9);
    float z = z0 * sp + amp * cos(uT * 1.0 + aR.z * 23.0 + x * 1.6);
    float pulita = smoothstep(-0.02, 0.3, x);
    vC = mix(uSporca, uPulita, pulita);
    float a = mix(0.2, 0.9, pulita);
    a *= smoothstep(X0, X0 + 1.0, x) * (1.0 - smoothstep(X1 - 1.2, X1, x));
    vA = a;
    vec4 mv = modelViewMatrix * vec4(x, y, z, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = max(1.2, mix(0.009, 0.021, aR.w) * mix(1.0, 1.3, pulita) * uScala / -mv.z);
  }
`;

const FS = /* glsl */`
  varying float vA;
  varying vec3 vC;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    float a = smoothstep(0.5, 0.12, d) * vA;
    if (a < 0.01) discard;
    gl_FragColor = vec4(vC, a);
  }
`;

function texturaFibre() {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = '#eceeed';
  g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 1500; i++) {
    const x = Math.random() * 256, y = Math.random() * 256, a = Math.random() * Math.PI, l = 5 + Math.random() * 20;
    const v = 200 + Math.floor(Math.random() * 55);
    g.strokeStyle = `rgba(${v},${v + (Math.random() < .5 ? 0 : -6)},${v},${0.25 + Math.random() * 0.4})`;
    g.lineWidth = 0.5 + Math.random() * 0.9;
    g.beginPath();
    g.moveTo(x, y);
    g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l);
    g.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

function nuvola(n) {
  const g = new THREE.BufferGeometry();
  const r = new Float32Array(n * 4);
  const q = new Float32Array(n);
  for (let i = 0; i < r.length; i++) r[i] = Math.random();
  for (let i = 0; i < n; i++) q[i] = Math.random();
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
  g.setAttribute('aR', new THREE.BufferAttribute(r, 4));
  g.setAttribute('aQ', new THREE.BufferAttribute(q, 1));
  g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 20);
  return g;
}

export async function avvia() {
  const host = document.querySelector('.hero__scena');
  const hero = document.querySelector('.hero');
  const hud = document.querySelector('.hud');
  if (!host || !hero) return;
  const ridotto = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const stretto = () => host.clientWidth < 761;

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
  } catch (e) {
    return;
  }
  if (!renderer.getContext()) return;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.setClearColor(0x000000, 0);
  host.appendChild(renderer.domElement);

  const scena = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(34, 1, 0.5, 30);
  const pmrem = new THREE.PMREMGenerator(renderer);
  scena.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  pmrem.dispose();

  const luce = new THREE.DirectionalLight(0xffffff, 2.3);
  luce.position.set(-1.4, 2.6, 3.4);
  scena.add(luce);
  const riempi = new THREE.DirectionalLight(0x9fc4e0, 0.55);
  riempi.position.set(0.6, -1.2, -3);
  scena.add(riempi);
  const controluce = new THREE.PointLight(0x58c4f5, 3.5, 0, 2);
  controluce.position.set(1.3, 0.5, 0.4);
  scena.add(controluce);

  const filtro = new THREE.Group();
  scena.add(filtro);

  // Telaio in acciaio zincato
  const zinco = new THREE.MeshStandardMaterial({ color: 0xe1e6ea, metalness: 0.85, roughness: 0.34 });
  const barra = (w, h, d, x, y, z) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), zinco);
    m.position.set(x, y, z);
    filtro.add(m);
  };
  barra(PROF, BORDO, LARG + 2 * BORDO, 0, ALT / 2 + BORDO / 2, 0);
  barra(PROF, BORDO, LARG + 2 * BORDO, 0, -ALT / 2 - BORDO / 2, 0);
  barra(PROF, ALT, BORDO, 0, 0, LARG / 2 + BORDO / 2);
  barra(PROF, ALT, BORDO, 0, 0, -LARG / 2 - BORDO / 2);

  // Setto plissettato: una striscia a zig-zag che cambia passo con la classe
  const NZ = 520;
  const pos = new Float32Array((NZ + 1) * 2 * 3);
  const uv = new Float32Array((NZ + 1) * 2 * 2);
  const idx = [];
  for (let i = 0; i <= NZ; i++) {
    for (let j = 0; j < 2; j++) {
      const k = i * 2 + j;
      uv[k * 2] = (i / NZ) * 3;
      uv[k * 2 + 1] = j * 3;
    }
    if (i < NZ) {
      const a = i * 2;
      idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  geo.setIndex(idx);
  const tri = t => 1 - 4 * Math.abs(t - Math.floor(t) - 0.5);
  const piega = freq => {
    for (let i = 0; i <= NZ; i++) {
      const z = -LARG / 2 + (LARG * i) / NZ;
      const x = AMP * tri(z * freq + 0.25);
      for (let j = 0; j < 2; j++) {
        const k = (i * 2 + j) * 3;
        pos[k] = x;
        pos[k + 1] = j ? ALT / 2 : -ALT / 2;
        pos[k + 2] = z;
      }
    }
    geo.attributes.position.needsUpdate = true;
    geo.computeVertexNormals();
  };
  const media = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({
    color: 0xe8ecee, map: texturaFibre(), roughness: 0.95, metalness: 0, side: THREE.DoubleSide, envMapIntensity: 0.32,
  }));
  filtro.add(media);

  // Rete di supporto sul lato uscita
  const linee = [];
  const xr = AMP + 0.014, passoRete = 0.075;
  for (let y = -ALT / 2; y <= ALT / 2 + 1e-6; y += passoRete) linee.push(xr, y, -LARG / 2, xr, y, LARG / 2);
  for (let z = -LARG / 2; z <= LARG / 2 + 1e-6; z += passoRete) linee.push(xr, -ALT / 2, z, xr, ALT / 2, z);
  const rg = new THREE.BufferGeometry();
  rg.setAttribute('position', new THREE.Float32BufferAttribute(linee, 3));
  filtro.add(new THREE.LineSegments(rg, new THREE.LineBasicMaterial({ color: 0xa9b5be, transparent: true, opacity: 0.45 })));

  // Particelle
  const comuni = { uT: { value: 0 }, uFreq: { value: 1 }, uScala: { value: 400 } };
  const molte = !stretto();
  const polvere = new THREE.Points(nuvola(molte ? 2600 : 1500), new THREE.ShaderMaterial({
    uniforms: { ...comuni, uPresa: { value: CLASSI.G4.presa }, uNascondi: { value: 0 }, uC1: { value: rgb(0xc9b28c) }, uC2: { value: rgb(0x8f7b5e) } },
    vertexShader: VS_POLVERE, fragmentShader: FS, transparent: true, depthWrite: false,
  }));
  const aria = new THREE.Points(nuvola(molte ? 3000 : 1700), new THREE.ShaderMaterial({
    uniforms: { ...comuni, uSporca: { value: rgb(0x7a8ba0) }, uPulita: { value: rgb(0x6fd2ff) } },
    vertexShader: VS_ARIA, fragmentShader: FS, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  }));
  polvere.frustumCulled = aria.frustumCulled = false;
  filtro.add(aria, polvere);

  const stato = { classe: 'G4', presa: CLASSI.G4.presa, freq: CLASSI.G4.pieghe / LARG, tempo: 0, manuale: false, fase: 0, t0: null, R: 4 };
  piega(stato.freq);
  comuni.uFreq.value = stato.freq;

  const nome = hud?.querySelector('[data-hud-nome]');
  const nota = hud?.querySelector('[data-hud-nota]');
  function classe(c, manuale) {
    stato.classe = c;
    if (manuale) stato.manuale = true;
    hud?.querySelectorAll('[data-classe]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.classe === c)));
    if (nome) nome.textContent = CLASSI[c].nome;
    if (nota) nota.textContent = CLASSI[c].nota;
  }

  const v2 = new THREE.Vector2();
  function adatta() {
    const w = host.clientWidth, h = host.clientHeight;
    if (!w || !h) return;
    const mob = stretto();
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, mob ? 1.5 : 2));
    renderer.setSize(w, h, false);
    const asp = w / h;
    camera.fov = mob ? 40 : 30;
    camera.aspect = asp;
    const t = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    const dW = 1.45 / ((mob ? 0.72 : 0.4) * 2 * t * asp);
    const dH = 1.45 / ((mob ? 0.32 : 0.6) * 2 * t);
    stato.R = Math.max(dW, dH);
    stato.w = w; stato.h = h; stato.mob = mob;
    inquadra(0);
    camera.near = Math.max(0.3, stato.R - 6);
    camera.far = stato.R + 8;
    camera.updateProjectionMatrix();
    renderer.getDrawingBufferSize(v2);
    comuni.uScala.value = v2.y / (2 * t);
  }

  function inquadra(e) {
    const { w, h } = stato;
    if (stato.mob) camera.setViewOffset(w, h, 0, -h * (0.2 - 0.16 * e), w, h);
    else camera.setViewOffset(w, h, -w * (0.19 - 0.05 * e), -h * 0.03, w, h);
  }

  function passo(dt, ora) {
    stato.tempo += dt;
    const tau = stato.t0 == null ? 0 : (ora - stato.t0) / 1000;
    if (!stato.manuale) {
      if (tau >= 1.4 && stato.fase < 1) { stato.fase = 1; classe('F7'); }
      if (tau >= 2.9 && stato.fase < 2) { stato.fase = 2; classe('H14'); }
    }
    const obiettivo = CLASSI[stato.classe];
    const k = dt > 0 ? 1 - Math.exp(-dt * 5) : 1;
    stato.presa += (obiettivo.presa - stato.presa) * k;
    const f = obiettivo.pieghe / LARG;
    if (Math.abs(f - stato.freq) > 1e-4) {
      stato.freq += (f - stato.freq) * k;
      piega(stato.freq);
    }
    comuni.uT.value = stato.tempo;
    comuni.uFreq.value = stato.freq;
    polvere.material.uniforms.uPresa.value = stato.presa;

    // Camera: entra con un carrello, poi lo scroll la porta sul lato uscita
    const p = Math.min(1, Math.max(0, window.__heroP || 0));
    const e = p * p * (3 - 2 * p);
    const ing = 1 - Math.pow(1 - Math.min(1, tau / 2.2), 3);
    const phi = THREE.MathUtils.lerp(-0.8, 0.95, e) + 0.06 * Math.sin(stato.tempo * 0.33);
    const el = 0.2 + 0.05 * Math.sin(stato.tempo * 0.27) - 0.07 * e;
    const R = stato.R * (1.3 - 0.3 * ing) * (1 - (stato.mob ? 0.2 : 0.08) * e);
    camera.position.set(R * Math.sin(phi) * Math.cos(el), R * Math.sin(el), R * Math.cos(phi) * Math.cos(el));
    camera.lookAt(0, 0, 0);
    inquadra(e);
    camera.updateProjectionMatrix();
    const lato = Math.sin(phi);
    polvere.material.uniforms.uNascondi.value = Math.min(1, Math.max(0, (lato - 0.05) / 0.35));
    filtro.rotation.x = 0.03 * Math.sin(stato.tempo * 0.4);
  }

  adatta();
  if (ridotto) {
    classe('H14');
    stato.presa = 1;
    stato.freq = CLASSI.H14.pieghe / LARG;
    piega(stato.freq);
    stato.tempo = 6;
    stato.t0 = performance.now() - 10000;
    stato.manuale = true;
  }
  passo(0, performance.now());
  try { await renderer.compileAsync(scena, camera); } catch (e) { /* compila al primo render */ }
  renderer.render(scena, camera);
  host.classList.add('pronto');
  hud?.classList.add('pronto');

  let attivo = false, visibile = true, ultimo = performance.now();
  function ciclo() {
    if (!attivo) return;
    requestAnimationFrame(ciclo);
    const ora = performance.now();
    const dt = Math.min(0.05, Math.max(0, (ora - ultimo) / 1000));
    ultimo = ora;
    passo(dt, ora);
    renderer.render(scena, camera);
  }
  const accendi = () => {
    if (attivo || ridotto) return;
    attivo = true;
    ultimo = performance.now();
    requestAnimationFrame(ciclo);
  };
  const spegni = () => { attivo = false; };
  const ridisegna = () => { if (!attivo) { passo(0, performance.now()); renderer.render(scena, camera); } };

  hud?.querySelectorAll('[data-classe]').forEach(b => b.addEventListener('click', () => {
    classe(b.dataset.classe, true);
    if (ridotto) {
      stato.presa = CLASSI[stato.classe].presa;
      stato.freq = CLASSI[stato.classe].pieghe / LARG;
      piega(stato.freq);
      ridisegna();
    }
  }));
  new ResizeObserver(() => { adatta(); ridisegna(); }).observe(host);
  new IntersectionObserver(v => {
    visibile = v[0].isIntersecting;
    if (visibile && !document.hidden) accendi(); else spegni();
  }).observe(hero);
  document.addEventListener('visibilitychange', () => { if (document.hidden || !visibile) spegni(); else accendi(); });
  if (ridotto) addEventListener('scroll', () => requestAnimationFrame(ridisegna), { passive: true });

  stato.t0 = ridotto ? stato.t0 : performance.now();
  accendi();
}
