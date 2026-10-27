// Pinta 3D del Blues Pub: bicchiere nonic con il logo stampato che si spilla da solo.
// Shader scritti a mano (niente luci in tempo reale): colori in sRGB direttamente nei uniform, alfa premoltiplicata.
import * as THREE from 'three';

const LIVELLO = 1.74;      // altezza finale della birra
const FONDO = 0.15;        // spessore del fondo del bicchiere
const SCHIUMA = 0.24;      // altezza finale della schiuma

// profilo esterno del bicchiere (raggio, altezza)
const PROFILO = [
  [0.0, 0.0], [0.284, 0.0], [0.298, 0.012], [0.304, 0.05], [0.31, 0.16], [0.328, 0.4], [0.352, 0.75],
  [0.378, 1.1], [0.398, 1.38], [0.41, 1.52], [0.426, 1.6], [0.431, 1.66], [0.424, 1.73], [0.416, 1.8],
  [0.417, 1.9], [0.421, 1.975], [0.418, 2.0], [0.404, 2.0],
];
function rEst(y) {
  for (let i = 1; i < PROFILO.length; i++) {
    const [r0, y0] = PROFILO[i - 1], [r1, y1] = PROFILO[i];
    if (y <= y1 && y1 > y0) return r0 + (r1 - r0) * (y - y0) / (y1 - y0);
  }
  return 0.42;
}
const rInt = y => rEst(y) - 0.017;

const VS = /* glsl */`
  varying vec3 vN; varying vec3 vV; varying vec3 vP; varying vec3 vW; varying vec2 vUv;
  void main() {
    vP = position; vUv = uv;
    vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz;
    vec4 mv = viewMatrix * w;
    vN = normalize(normalMatrix * normal);
    vV = normalize(-mv.xyz);
    gl_Position = projectionMatrix * mv;
  }`;

const FS_VETRO = /* glsl */`
  uniform float uOp; uniform float uRetro; uniform float uLivello;
  varying vec3 vN; varying vec3 vV; varying vec3 vP;
  void main() {
    vec3 n = normalize(vN); if (!gl_FrontFacing) n = -n;
    float ndv = clamp(abs(dot(n, vV)), 0.0, 1.0);
    float fr = pow(1.0 - ndv, 2.6);
    // due softbox verticali fissi rispetto alla camera
    float alto = smoothstep(0.05, 0.45, vP.y) * (1.0 - smoothstep(1.86, 2.0, vP.y));
    float s1 = smoothstep(0.5, 0.56, n.x) * (1.0 - smoothstep(0.66, 0.73, n.x)) * alto;
    float s2 = smoothstep(-0.88, -0.82, n.x) * (1.0 - smoothstep(-0.72, -0.66, n.x)) * alto;
    float bordo = smoothstep(1.955, 1.995, vP.y);
    float base = 1.0 - smoothstep(0.0, ${FONDO.toFixed(2)}, vP.y);
    float a = 0.05 + fr * 0.55 + s1 * 0.85 + s2 * 0.5 + bordo * 0.5 + base * 0.18;
    vec3 c = mix(vec3(0.86, 0.9, 1.0), vec3(1.0), clamp(s1 + s2 + bordo, 0.0, 1.0));
    // il fondo spesso prende il colore della birra
    c = mix(c, vec3(0.95, 0.62, 0.16), base * step(${(FONDO + 0.05).toFixed(2)}, uLivello) * 0.7);
    a *= uOp * mix(1.0, 0.55, uRetro);
    gl_FragColor = vec4(c * a, a);
  }`;

const FS_BIRRA = /* glsl */`
  uniform float uLivello; uniform float uT; uniform float uOp;
  varying vec3 vN; varying vec3 vV; varying vec3 vP;
  float h(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  void main() {
    if (vP.y > uLivello) discard;
    vec3 n = normalize(vN);
    float ndv = clamp(dot(n, vV), 0.0, 1.0);
    float bordo = pow(1.0 - ndv, 1.35);
    vec3 oro = vec3(0.98, 0.66, 0.13);
    vec3 scuro = vec3(0.42, 0.15, 0.02);
    vec3 c = mix(oro, scuro, pow(bordo, 1.15) * 0.94);
    float hy = clamp((vP.y - ${FONDO.toFixed(2)}) / 1.6, 0.0, 1.0);
    c *= 0.76 + 0.32 * hy;
    c += vec3(0.16, 0.09, 0.0) * pow(ndv, 6.0);
    // controluce: la softbox di destra rifratta sul lato sinistro della birra
    c += vec3(0.3, 0.2, 0.05) * smoothstep(-0.42, -0.26, n.x) * (1.0 - smoothstep(-0.18, -0.04, n.x));
    // bollicine che salgono lungo la parete
    float ang = atan(vP.z, vP.x);
    vec2 g = vec2(ang * 10.0, vP.y * 24.0 - uT * 2.6);
    vec2 id = floor(g); vec2 f = fract(g) - 0.5;
    vec2 o = vec2(h(id + 3.1), h(id + 7.7)) - 0.5;
    float sp = step(0.8, h(id)) * smoothstep(0.17, 0.02, length(f + o * 0.6));
    c += vec3(1.0, 0.92, 0.62) * sp * 0.5 * (0.4 + ndv);
    // menisco chiaro sotto la schiuma
    c = mix(c, vec3(1.0, 0.86, 0.48), smoothstep(uLivello - 0.035, uLivello, vP.y) * 0.45);
    float a = (0.88 + bordo * 0.1) * uOp;
    gl_FragColor = vec4(c * a, a);
  }`;

const FS_SCHIUMA = /* glsl */`
  uniform float uT; uniform float uOp;
  varying vec3 vN; varying vec3 vV; varying vec3 vP; varying vec3 vW;
  float h3(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
  float rum(vec3 x) {
    vec3 i = floor(x); vec3 f = fract(x); f = f * f * (3.0 - 2.0 * f);
    return mix(mix(mix(h3(i), h3(i + vec3(1,0,0)), f.x), mix(h3(i + vec3(0,1,0)), h3(i + vec3(1,1,0)), f.x), f.y),
               mix(mix(h3(i + vec3(0,0,1)), h3(i + vec3(1,0,1)), f.x), mix(h3(i + vec3(0,1,1)), h3(i + vec3(1,1,1)), f.x), f.y), f.z);
  }
  void main() {
    vec3 n = normalize(vN);
    vec3 L = normalize(vec3(0.45, 0.85, 0.55));
    float dif = clamp(dot(n, L), 0.0, 1.0) * 0.42 + 0.62;
    float b1 = rum(vW * 34.0 + vec3(0.0, uT * 0.12, 0.0));
    float b2 = rum(vW * 85.0 - vec3(uT * 0.05));
    float celle = smoothstep(0.45, 0.85, b1) * 0.1 + smoothstep(0.6, 0.95, b2) * 0.07;
    vec3 c = vec3(0.99, 0.96, 0.88) * dif - celle;
    float lato = 1.0 - smoothstep(0.0, 0.32, vP.y);
    c = mix(c, vec3(0.94, 0.8, 0.52), lato * 0.6);
    float ndv = clamp(dot(n, vV), 0.0, 1.0);
    c *= 0.86 + 0.14 * ndv;
    gl_FragColor = vec4(c * uOp, uOp);
  }`;

const VS_BOLLE = /* glsl */`
  attribute vec4 aSeme;
  uniform float uT; uniform float uLivello; uniform float uPix; uniform float uOp;
  varying float vA;
  void main() {
    float span = max(uLivello - 0.2, 0.001);
    float y = 0.19 + mod(aSeme.w + uT * aSeme.z, 1.0) * span;
    float r = (0.278 + (y - 0.15) * 0.072) * aSeme.y;
    vec3 p = vec3(cos(aSeme.x) * r, y, sin(aSeme.x) * r);
    p.x += sin(uT * 3.0 + aSeme.w * 20.0) * 0.008;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    vA = (1.0 - smoothstep(uLivello - 0.14, uLivello - 0.03, y)) * uOp * step(0.3, uLivello);
    gl_PointSize = uPix * (0.55 + aSeme.y * 0.8) * (5.0 / -mv.z);
  }`;
const FS_BOLLE = /* glsl */`
  varying float vA;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    float anello = smoothstep(0.5, 0.36, d) - smoothstep(0.3, 0.12, d) * 0.55;
    float a = anello * vA * 0.75;
    gl_FragColor = vec4(vec3(1.0, 0.95, 0.78) * a, a);
  }`;

const FS_LOGO = /* glsl */`
  uniform sampler2D uMappa; uniform float uOp; uniform float uPronto;
  varying vec2 vUv; varying vec3 vN; varying vec3 vV;
  void main() {
    float a = texture2D(uMappa, vUv).a * uPronto;
    float ndv = dot(normalize(vN), vV);
    a *= smoothstep(0.05, 0.4, ndv) * 0.93 * uOp;
    gl_FragColor = vec4(vec3(1.0, 0.98, 0.94) * a, a);
  }`;

const FS_FLUSSO = /* glsl */`
  uniform float uT; uniform float uOp;
  varying vec3 vN; varying vec3 vV; varying vec3 vP;
  void main() {
    float ndv = clamp(dot(normalize(vN), vV), 0.0, 1.0);
    float strisce = 0.5 + 0.5 * sin(vP.y * 60.0 + uT * 40.0 + atan(vP.z, vP.x) * 3.0);
    vec3 c = mix(vec3(0.62, 0.28, 0.04), vec3(1.0, 0.78, 0.3), ndv) + strisce * 0.08;
    float a = (0.7 + ndv * 0.3) * uOp;
    gl_FragColor = vec4(c * a, a);
  }`;

const FS_OMBRA = /* glsl */`
  uniform float uPieno; uniform float uOp;
  varying vec2 vUv;
  void main() {
    vec2 p = vUv - 0.5;
    float ombra = smoothstep(0.42, 0.0, length(p * vec2(1.0, 1.7))) * 0.6;
    float luce = smoothstep(0.5, 0.0, length((vUv - vec2(0.5, 0.33)) * vec2(2.4, 4.6))) * uPieno;
    vec3 c = vec3(1.0, 0.6, 0.12) * luce * 0.5;
    float a = (ombra * (1.0 - luce * 0.6) + luce * 0.22) * uOp;
    gl_FragColor = vec4(c * uOp, a);
  }`;

function materiale(fs, uniforms, extra = {}) {
  return new THREE.ShaderMaterial({
    vertexShader: VS, fragmentShader: fs, uniforms, transparent: true, premultipliedAlpha: true, depthWrite: false, ...extra,
  });
}

const facile = t => 1 - Math.pow(1 - t, 2.2);
const lisciata = t => t * t * (3 - 2 * t);
const tra = (t, a, b) => Math.min(1, Math.max(0, (t - a) / (b - a)));

export async function avvia({ hero, box, canvas, ridotto }) {
  const mobile = matchMedia('(max-width: 899px)').matches;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, premultipliedAlpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, mobile ? 1.5 : 2));
  renderer.setClearColor(0x000000, 0);

  const scena = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(26, 1, 0.1, 40);
  const pinta = new THREE.Group();
  scena.add(pinta);

  const U = { uOp: { value: 0 }, uLivello: { value: FONDO }, uT: { value: 0 } };

  // vetro: retro (pareti interne) e fronte
  const puntiVetro = PROFILO.map(([r, y]) => new THREE.Vector2(r, y));
  const geoVetro = new THREE.LatheGeometry(puntiVetro, mobile ? 56 : 80);
  const vetroRetro = new THREE.Mesh(geoVetro, materiale(FS_VETRO, { uOp: U.uOp, uLivello: U.uLivello, uRetro: { value: 1 } }, { side: THREE.BackSide }));
  const vetroFronte = new THREE.Mesh(geoVetro, materiale(FS_VETRO, { uOp: U.uOp, uLivello: U.uLivello, uRetro: { value: 0 } }, { side: THREE.FrontSide }));
  vetroRetro.renderOrder = 0; vetroFronte.renderOrder = 6;

  // birra
  const puntiBirra = [new THREE.Vector2(0, FONDO)];
  for (let y = FONDO; y <= 1.995; y += 0.05) puntiBirra.push(new THREE.Vector2(rInt(y), y));
  const birra = new THREE.Mesh(new THREE.LatheGeometry(puntiBirra, mobile ? 48 : 72), materiale(FS_BIRRA, U, { side: THREE.FrontSide }));
  birra.renderOrder = 1;

  // schiuma: cilindro normalizzato con la cupola, scalato sul livello
  const puntiSchiuma = [[0.0, 0.0], [1.0, 0.0], [1.0, 0.62], [0.985, 0.8], [0.93, 0.93], [0.8, 1.02], [0.55, 1.08], [0.26, 1.11], [0.0, 1.12]]
    .map(([r, y]) => new THREE.Vector2(r, y));
  const schiuma = new THREE.Mesh(new THREE.LatheGeometry(puntiSchiuma, mobile ? 48 : 72), materiale(FS_SCHIUMA, { uT: U.uT, uOp: { value: 0 } }, { transparent: false, depthWrite: true }));
  schiuma.renderOrder = 3;

  // bollicine
  const N = mobile ? 70 : 110;
  const semi = new Float32Array(N * 4), pos = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) semi.set([Math.random() * Math.PI * 2, 0.25 + Math.random() * 0.7, 0.12 + Math.random() * 0.26, Math.random()], i * 4);
  const geoBolle = new THREE.BufferGeometry();
  geoBolle.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geoBolle.setAttribute('aSeme', new THREE.BufferAttribute(semi, 4));
  const bolle = new THREE.Points(geoBolle, new THREE.ShaderMaterial({
    vertexShader: VS_BOLLE, fragmentShader: FS_BOLLE, transparent: true, premultipliedAlpha: true, depthWrite: false,
    uniforms: { uT: U.uT, uLivello: U.uLivello, uOp: U.uOp, uPix: { value: renderer.getPixelRatio() * 3.2 } },
  }));
  bolle.frustumCulled = false; bolle.renderOrder = 2;

  // logo stampato sul vetro
  const yL0 = 0.82, yL1 = 1.05, arco = 1.95;
  const geoLogo = new THREE.CylinderGeometry(rEst(yL1) + 0.0025, rEst(yL0) + 0.0025, yL1 - yL0, 64, 1, true, -arco / 2, arco);
  const uLogo = { uMappa: { value: null }, uOp: U.uOp, uPronto: { value: 0 } };
  const logo = new THREE.Mesh(geoLogo, materiale(FS_LOGO, uLogo, { side: THREE.FrontSide }));
  logo.position.y = (yL0 + yL1) / 2; logo.renderOrder = 5;
  caricaLogo().then(tex => { uLogo.uMappa.value = tex; uLogo.uPronto.value = 1; }).catch(() => {});

  // flusso dalla spina
  const geoFlusso = new THREE.CylinderGeometry(0.026, 0.03, 1, 16, 1, true);
  geoFlusso.translate(0, 0.5, 0);
  const uFlusso = { uT: U.uT, uOp: { value: 0 } };
  const flusso = new THREE.Mesh(geoFlusso, materiale(FS_FLUSSO, uFlusso));
  flusso.position.x = 0.07; flusso.renderOrder = 4; flusso.visible = false;

  // ombra e riflesso ambra sul bancone
  const uOmbra = { uPieno: { value: 0 }, uOp: U.uOp };
  const ombra = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 2.2), new THREE.ShaderMaterial({
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: FS_OMBRA, uniforms: uOmbra, transparent: true, premultipliedAlpha: true, depthWrite: false,
  }));
  ombra.rotation.x = -Math.PI / 2; ombra.position.y = -0.002; ombra.renderOrder = -1;

  pinta.add(ombra, vetroRetro, birra, bolle, schiuma, flusso, logo, vetroFronte);

  // inquadratura che dipende dalla forma del canvas
  function misura() {
    const w = box.clientWidth, h = box.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    const altezza = Math.max(2.32, 1.24 / camera.aspect);
    const d = (altezza / 2) / Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    camera.position.set(0, 1.02 + d * 0.13, d);
    camera.lookAt(0, 1.0, 0);
    camera.updateProjectionMatrix();
  }
  misura();
  new ResizeObserver(misura).observe(box);

  // stato della spillatura
  let t0 = -1, svuota = -1, livelloDa = FONDO;
  const stato = { livello: FONDO, schiuma: 0.0, flussoBasso: 3.2, flussoAlto: 3.2, flusso: false, pieno: 0 };
  function spilla(t) {
    const p = tra(t, 0.25, 2.45);
    stato.livello = FONDO + (LIVELLO - FONDO) * facile(p);
    const picco = SCHIUMA * 1.3;
    stato.schiuma = p < 1 ? Math.max(0.02, picco * lisciata(tra(p, 0.08, 1))) : picco - (picco - SCHIUMA) * lisciata(tra(t, 2.45, 3.6));
    stato.flusso = t > 0.08 && t < 2.75;
    stato.flussoAlto = 3.2 - (3.2 - stato.livello - stato.schiuma * 0.6) * lisciata(tra(t, 2.45, 2.72));
    stato.flussoBasso = Math.max(stato.livello + stato.schiuma * 0.5, 3.2 - 3.2 * lisciata(tra(t, 0.08, 0.3)));
    stato.pieno = lisciata(tra(t, 0.6, 2.6));
  }
  function applica() {
    U.uLivello.value = stato.livello;
    const raggio = Math.min(rInt(stato.livello), rInt(Math.min(1.99, stato.livello + stato.schiuma))) * 0.992;
    schiuma.visible = stato.schiuma > 0.004;
    schiuma.position.y = stato.livello - 0.004;
    schiuma.scale.set(raggio, Math.max(stato.schiuma, 0.001), raggio);
    schiuma.material.uniforms.uOp.value = U.uOp.value;
    flusso.visible = stato.flusso && stato.flussoAlto > stato.flussoBasso + 0.01;
    flusso.position.y = stato.flussoBasso;
    flusso.scale.y = Math.max(0.001, stato.flussoAlto - stato.flussoBasso);
    uFlusso.uOp.value = U.uOp.value;
    uOmbra.uPieno.value = stato.pieno;
  }

  // scroll dell'hero e puntatore (solo desktop)
  let avanzamento = 0, mx = 0, my = 0, rx = 0, ry = 0;
  const leggiScroll = () => { const r = hero.getBoundingClientRect(); avanzamento = Math.min(1, Math.max(0, -r.top / Math.max(1, r.height))); };
  addEventListener('scroll', leggiScroll, { passive: true });
  leggiScroll();
  if (matchMedia('(hover: hover) and (pointer: fine)').matches) {
    addEventListener('pointermove', e => { mx = e.clientX / innerWidth - 0.5; my = e.clientY / innerHeight - 0.5; }, { passive: true });
  }

  // tocco: si beve e se ne spilla un'altra
  canvas.addEventListener('click', () => {
    if (ridotto) return;
    const t = (performance.now() - t0) / 1000;
    if (t0 < 0 || t < 3.2 || svuota >= 0) return;
    svuota = performance.now(); livelloDa = stato.livello;
    accendi();
  });

  await renderer.compileAsync(scena, camera);

  let attivo = true, inVista = true, rafId = 0, ultimo = 0;
  function disegna(ora) {
    rafId = 0;
    const tempo = ora / 1000;
    U.uT.value = tempo;
    U.uOp.value = Math.min(1, U.uOp.value + 0.05);
    if (svuota >= 0) {
      const s = (ora - svuota) / 1000;
      const k = lisciata(tra(s, 0, 0.55));
      stato.livello = livelloDa + (FONDO - livelloDa) * k;
      stato.schiuma = SCHIUMA * (1 - k);
      stato.flusso = false; stato.pieno = 1 - k;
      if (s > 0.75) { svuota = -1; t0 = ora; }
    } else {
      spilla((ora - t0) / 1000);
    }
    applica();
    // movimento: lenta oscillazione, scroll che gira e alza, puntatore che inclina
    rx += (my * 0.12 - rx) * 0.06; ry += (mx * 0.5 - ry) * 0.06;
    pinta.rotation.y = Math.sin(tempo * 0.38) * 0.3 + avanzamento * 1.5 + ry;
    pinta.rotation.x = rx;
    pinta.position.y = avanzamento * 0.55;
    renderer.render(scena, camera);
    if (attivo && inVista && !ridotto) rafId = requestAnimationFrame(disegna);
  }
  function accendi() { if (!rafId && attivo && inVista) rafId = requestAnimationFrame(disegna); }

  if (ridotto) {
    U.uOp.value = 1; t0 = performance.now() - 10000;
    spilla(10); applica(); renderer.render(scena, camera);
    box.classList.add('pronta'); hero.classList.add('a-fuoco');
    new ResizeObserver(() => { misura(); renderer.render(scena, camera); }).observe(box);
    return;
  }

  new IntersectionObserver(([e]) => { inVista = e.isIntersecting; if (inVista) accendi(); }).observe(hero);
  document.addEventListener('visibilitychange', () => { attivo = !document.hidden; if (attivo) accendi(); });

  t0 = performance.now();
  box.classList.add('pronta');
  setTimeout(() => hero.classList.add('a-fuoco'), 250);
  accendi();
}

function caricaLogo() {
  return new Promise((ok, ko) => {
    const img = new Image();
    img.onload = () => {
      const c = document.createElement('canvas');
      c.width = 1024; c.height = 256;
      const g = c.getContext('2d');
      const w = 900, h = w * 70 / 280;
      g.drawImage(img, (c.width - w) / 2, (c.height - h) / 2, w, h);
      const tex = new THREE.CanvasTexture(c);
      tex.anisotropy = 4;
      ok(tex);
    };
    img.onerror = ko;
    img.src = 'assets/logo.svg';
  });
}
