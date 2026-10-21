// Dieffe Macchine — la centrifuga in particelle.
// Polvere di vetro torbida che si avvita nel cestello, si compatta sulla parete per la forza g,
// l'acqua pulita sale al centro, il fango esce secco. Tutto calcolato nello shader: il JS muove solo pochi numeri.
import * as THREE from 'three';

const H = 0.62; // mezza altezza del cestello

const VERT = /* glsl */ `
  uniform float uTime, uAngle, uIntro, uSep, uRise, uDrop, uPix, uRef, uAlpha, uAcqua, uForma, uSpin, uDens;
  uniform vec2 uWide;
  uniform vec2 uRes;
  attribute vec4 aA; // r0, angolo, quota, peso
  attribute vec4 aB; // posizione nella nuvola iniziale (xyz), ritardo
  attribute float aKind; // 0 polvere di vetro, 1 acqua
  varying vec3 vCol;
  varying float vAlpha;
  varying float vSpark;
  varying vec2 vDir;
  varying float vLen;
  varying float vSize;
  varying float vRad;
  const float H = ${H.toFixed(2)};
  float parete(float y) { return mix(0.74, 1.0, clamp((y + H) / (2.0 * H), 0.0, 1.0)); }
  mat2 ruota(float a) { float c = cos(a), s = sin(a); return mat2(c, -s, s, c); }

  // dove sta il granello, dA radianti fa (serve per la scia)
  vec3 posizione(float dA, out float a, out float sp) {
    float sol = 1.0 - aKind;
    float k = aA.w;
    float y0 = mix(-H, H, aA.z);
    float wr = mix(0.97 + 0.03 * aA.z, parete(y0), uForma);
    float giroAng = uAngle - dA;

    // acqua torbida: tutto mescolato e in lento movimento
    float rT = aA.x * (wr - 0.04);
    float yT = y0 + sin(uTime * 0.55 + aA.y * 3.0 + k * 17.0) * 0.05;
    float giro = sin(uTime * 0.7 + k * 31.0) * 0.08;

    // separazione: i grani più pesanti arrivano prima alla parete
    sp = smoothstep(k * 0.55, k * 0.55 + 0.45, uSep);
    float strato = 0.02 + (1.0 - aA.x) * 0.11 * (0.7 + 0.6 * (1.0 - aA.z));
    float rS = wr - strato * mix(2.0, 1.0, uForma);
    float rW = aA.x * 0.6 * wr;
    float r = mix(rT, mix(rW, rS, sol), sp);
    float y = mix(yT, y0, sp * sol) * mix(0.16, 1.0, uForma);
    float ang = aA.y + giroAng * mix(0.5, 1.0, sp) + giro * (1.0 - sp);
    vec3 p = vec3(cos(ang) * r, y, sin(ang) * r);
    a = sol > 0.5 ? mix(0.6, 0.92, sp) : mix(0.12, 0.7, sp) * uAcqua;

    if (aKind > 0.5) {
      // l'acqua pulita sale al centro ed esce dall'alto
      float f = fract(k * 7.31 + aA.x * 3.1 + uTime * 0.2 - dA * 0.05);
      float yS = mix(-H * 0.85, H + 1.45, f);
      float sopra = max(0.0, yS - H - 0.05);
      float rc = 0.03 + 0.05 * aA.x + sopra * sopra * 0.32;
      float a2 = aA.y + giroAng * 0.2;
      vec3 ps = vec3(cos(a2) * rc, yS, sin(a2) * rc);
      float q = smoothstep(aB.w * 0.5, aB.w * 0.5 + 0.5, uRise);
      p = mix(p, ps, q);
      a = mix(a, 0.9 * (1.0 - smoothstep(0.78, 1.0, f)), q);
    } else {
      // il fango secco scende ed esce dal fondo
      float d = smoothstep(aA.z * 0.4, aA.z * 0.4 + 0.6, uDrop);
      p.y -= d * (2.1 + (1.0 - aA.z) * 0.9);
      p.xz *= 1.0 - d * 0.42;
      a *= 1.0 - smoothstep(0.55, 1.0, d) * 0.9;
    }

    // apertura: una nuvola torbida che riempie lo schermo e si avvita nel cestello
    float ip = smoothstep(aB.w * 0.45, aB.w * 0.45 + 0.55, uIntro);
    vec3 w = vec3(aB.x * uWide.x, aB.y * uWide.y, aB.z * 2.4);
    w.xz = ruota((1.0 - ip) * 2.6 + giroAng * 0.12) * w.xz;
    p = mix(w, p, ip);
    a *= mix(0.55, 1.0, ip);
    return p;
  }

  void main() {
    float sol = 1.0 - aKind;
    float k = aA.w;
    float a, sp, a2, sp2;
    vec3 p = posizione(0.0, a, sp);
    float ip0 = smoothstep(aB.w * 0.45, aB.w * 0.45 + 0.55, uIntro);
    vec3 q = posizione(min(uSpin * 0.055, 0.2), a2, sp2);
    mat4 mvp = projectionMatrix * modelViewMatrix;
    vec4 c1 = mvp * vec4(p, 1.0);
    vec4 c2 = mvp * vec4(q, 1.0);
    vec2 d = (c1.xy / c1.w - c2.xy / c2.w) * 0.5 * uRes;
    float len = min(length(d), 30.0 * uPix);
    vDir = len > 0.01 ? normalize(d) : vec2(1.0, 0.0);
    vLen = len;
    gl_Position = mix(c1, c2, 0.5);

    float zv = -(modelViewMatrix * vec4(p, 1.0)).z;
    float base = sol > 0.5 ? mix(1.4, 3.9, k * k) : mix(1.2, 2.4, aA.x);
    float bokeh = step(0.985, fract(k * 7.7 + aA.z)) * sol;
    base *= 1.0 + bokeh * 2.4;
    a *= 1.0 - bokeh * 0.6;
    float size = base * uPix * clamp(uRef / zv, 0.6, 2.2);
    vRad = size * 0.5;
    vSize = size + len;
    gl_PointSize = vSize;

    vec3 polvere = mix(vec3(0.80, 0.82, 0.74), vec3(0.94, 0.95, 0.91), k);
    vec3 torbida = vec3(0.60, 0.66, 0.64);
    vec3 pulita = vec3(0.52, 0.85, 1.0);
    vCol = sol > 0.5 ? polvere : mix(torbida, pulita, max(sp, uRise));
    float tw = 0.5 + 0.5 * sin(uTime * (1.4 + k * 3.0) + k * 40.0);
    vSpark = step(0.92, fract(k * 13.7 + aA.x)) * tw;
    vAlpha = a * uAlpha * mix(uDens, 1.0, 1.0 - ip0);
  }
`;

const FRAG = /* glsl */ `
  precision highp float;
  varying vec3 vCol;
  varying float vAlpha;
  varying float vSpark;
  varying vec2 vDir;
  varying float vLen;
  varying float vSize;
  varying float vRad;
  void main() {
    vec2 q = (gl_PointCoord - 0.5) * vSize;
    q.y = -q.y;
    float t = clamp(dot(q, vDir), -vLen * 0.5, vLen * 0.5);
    float d = length(q - vDir * t);
    if (d > vRad) discard;
    float g = smoothstep(vRad, vRad * 0.2, d);
    float testa = vLen > 0.5 ? mix(0.25, 1.0, t / vLen + 0.5) : 1.0;
    gl_FragColor = vec4(vCol + vSpark * 0.55, g * vAlpha * testa);
  }
`;

const VERT_GUSCIO = /* glsl */ `
  varying vec3 vN;
  varying vec3 vV;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vN = normalize(normalMatrix * normal);
    vV = normalize(-mv.xyz);
    gl_Position = projectionMatrix * mv;
  }
`;
const FRAG_GUSCIO = /* glsl */ `
  precision highp float;
  uniform vec3 uCol;
  uniform float uOp;
  varying vec3 vN;
  varying vec3 vV;
  void main() {
    float f = pow(1.0 - abs(dot(normalize(vN), normalize(vV))), 2.4);
    gl_FragColor = vec4(uCol, (0.03 + f) * uOp);
  }
`;

// stati chiave: 0 hero, 1 torbida, 2 forza g, 3 acqua pulita, 4 fango secco
const CHIAVI = [
  { elev: 19, sep: 0.82, rise: 0, drop: 0, guscio: 0, spin: 1.15, velo: 0.08, guarda: 0, acqua: 0.3, forma: 0, dens: 0.22 },
  { elev: 26, sep: 0.0, rise: 0, drop: 0, guscio: 1, spin: 0.5, velo: 0.75, guarda: 0, acqua: 1, forma: 1, dens: 0.42 },
  { elev: 21, sep: 1.0, rise: 0, drop: 0, guscio: 1, spin: 3.2, velo: 0.28, guarda: 0, acqua: 1, forma: 1, dens: 0.3 },
  { elev: 16, sep: 1.0, rise: 1, drop: 0, guscio: 1, spin: 2.4, velo: 0.04, guarda: 0.32, acqua: 1, forma: 1, dens: 0.36 },
  { elev: 30, sep: 1.0, rise: 1, drop: 1, guscio: 0.85, spin: 0.55, velo: 0, guarda: -0.35, acqua: 1, forma: 1, dens: 0.5 },
];

const lerp = (a, b, t) => a + (b - a) * t;
const liscio = (e0, e1, x) => { const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0))); return t * t * (3 - 2 * t); };

export async function avvia({ canvas, velo, vasca, macchina, fasi, fermo }) {
  const telefono = Math.min(window.innerWidth, window.innerHeight) < 700 || window.matchMedia('(pointer: coarse)').matches;
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: false, powerPreference: 'high-performance' });
  const pr = Math.min(window.devicePixelRatio || 1, telefono ? 1.5 : 2);
  renderer.setPixelRatio(pr);
  renderer.setClearColor(0x000000, 0);

  const scena = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 80);
  const tanMezzo = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));

  // particelle
  const NS = telefono ? 6000 : 14000;
  const NW = telefono ? 2400 : 5200;
  const N = NS + NW;
  const aA = new Float32Array(N * 4);
  const aB = new Float32Array(N * 4);
  const aKind = new Float32Array(N);
  let seme = 20021;
  const rnd = () => { seme = (seme * 16807) % 2147483647; return (seme - 1) / 2147483646; };
  for (let i = 0; i < N; i++) {
    const acqua = i >= NS;
    aA[i * 4] = Math.sqrt(rnd());
    aA[i * 4 + 1] = rnd() * Math.PI * 2;
    aA[i * 4 + 2] = rnd();
    aA[i * 4 + 3] = rnd();
    // nuvola iniziale: più densa verso il centro, ma fino ai bordi dello schermo
    const u = rnd() * 2 - 1, v = rnd() * 2 - 1;
    aB[i * 4] = Math.sign(u) * Math.pow(Math.abs(u), 0.8);
    aB[i * 4 + 1] = Math.sign(v) * Math.pow(Math.abs(v), 0.8);
    aB[i * 4 + 2] = rnd() * 2 - 1;
    aB[i * 4 + 3] = rnd();
    aKind[i] = acqua ? 1 : 0;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(N * 3), 3));
  geo.setAttribute('aA', new THREE.BufferAttribute(aA, 4));
  geo.setAttribute('aB', new THREE.BufferAttribute(aB, 4));
  geo.setAttribute('aKind', new THREE.BufferAttribute(aKind, 1));
  const uni = {
    uTime: { value: 0 }, uAngle: { value: 0 }, uIntro: { value: fermo ? 1 : 0 },
    uSep: { value: 0.42 }, uRise: { value: 0 }, uDrop: { value: 0 },
    uPix: { value: pr }, uRef: { value: 5 }, uAlpha: { value: telefono ? 0.85 : 0.95 }, uAcqua: { value: 0.25 }, uForma: { value: 0 }, uSpin: { value: 1 }, uDens: { value: 0.16 },
    uRes: { value: new THREE.Vector2(1, 1) },
    uWide: { value: new THREE.Vector2(4, 3) },
  };
  const mat = new THREE.ShaderMaterial({
    uniforms: uni, vertexShader: VERT, fragmentShader: FRAG,
    transparent: true, depthWrite: false, depthTest: true, blending: THREE.AdditiveBlending,
  });
  const punti = new THREE.Points(geo, mat);
  punti.frustumCulled = false;
  scena.add(punti);

  // il cestello: un guscio di luce, nervature che girano, il tubo centrale
  const profilo = [
    new THREE.Vector2(0.02, -H), new THREE.Vector2(0.72, -H), new THREE.Vector2(0.75, -H + 0.04),
    new THREE.Vector2(0.87, 0), new THREE.Vector2(1.0, H), new THREE.Vector2(1.08, H + 0.01), new THREE.Vector2(1.08, H + 0.05),
  ];
  const uGuscio = { uCol: { value: new THREE.Color(0.62, 0.78, 0.95) }, uOp: { value: 0 } };
  const matGuscio = new THREE.ShaderMaterial({
    uniforms: uGuscio, vertexShader: VERT_GUSCIO, fragmentShader: FRAG_GUSCIO,
    transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending,
  });
  const cestello = new THREE.Group();
  scena.add(cestello);
  const guscio = new THREE.Mesh(new THREE.LatheGeometry(profilo, telefono ? 48 : 72), matGuscio);
  cestello.add(guscio);

  const matLinee = new THREE.LineBasicMaterial({ color: 0x9fc6ee, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending });
  const nervature = [];
  const meridiani = 18;
  for (let m = 0; m < meridiani; m++) {
    const a = (m / meridiani) * Math.PI * 2;
    const pts = profilo.slice(1, 5).map((p) => new THREE.Vector3(Math.cos(a) * p.x, p.y, Math.sin(a) * p.x));
    nervature.push(...pts.slice(0, -1).flatMap((p, i) => [p, pts[i + 1]]));
  }
  const geoNerv = new THREE.BufferGeometry().setFromPoints(nervature);
  cestello.add(new THREE.LineSegments(geoNerv, matLinee));
  [[-H, 0.72], [0, 0.87], [H, 1.0], [H + 0.05, 1.08]].forEach(([y, r]) => {
    const anello = [];
    for (let i = 0; i <= 96; i++) { const a = (i / 96) * Math.PI * 2; anello.push(new THREE.Vector3(Math.cos(a) * r, y, Math.sin(a) * r)); }
    cestello.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(anello), matLinee));
  });
  const uTubo = { uCol: { value: new THREE.Color(0.55, 0.88, 1.0) }, uOp: { value: 0 } };
  const tubo = new THREE.Mesh(
    new THREE.CylinderGeometry(0.06, 0.06, 2 * H + 0.3, 24, 1, true),
    new THREE.ShaderMaterial({ uniforms: uTubo, vertexShader: VERT_GUSCIO, fragmentShader: FRAG_GUSCIO, transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending })
  );
  tubo.position.y = 0.15;
  scena.add(tubo);

  const maschera = new THREE.Mesh(
    new THREE.PlaneGeometry(1, 1),
    new THREE.MeshBasicMaterial({ alphaTest: 0.5, colorWrite: false, depthWrite: true, transparent: false })
  );
  maschera.renderOrder = -1;
  scena.add(maschera);
  const destra = new THREE.Vector3(), su = new THREE.Vector3();
  try {
    const tex = await Promise.race([
      new THREE.TextureLoader().loadAsync('assets/img/render-dfl-250-a-s.webp'),
      new Promise((_, no) => setTimeout(() => no(new Error('lenta')), 4000)),
    ]);
    maschera.material.map = tex;
    maschera.material.needsUpdate = true;
  } catch (err) { /* senza sagoma la polvere resta dietro la pagina */ }

  // misure e ancore di scroll
  let W = 1, Hh = 1, ancore = [0, 1, 2, 3, 4];
  function misura() {
    W = canvas.clientWidth || window.innerWidth;
    Hh = canvas.clientHeight || window.innerHeight;
    renderer.setSize(W, Hh, false);
    uni.uRes.value.set(W * pr, Hh * pr);
    camera.aspect = W / Hh;
    const sy = window.scrollY;
    ancore = [0].concat(fasi.map((f) => {
      const r = f.getBoundingClientRect();
      return r.top + sy + r.height / 2 - window.innerHeight / 2;
    }));
  }
  function progresso() {
    const y = window.scrollY;
    if (y <= ancore[0]) return 0;
    for (let k = 0; k < ancore.length - 1; k++) {
      if (y < ancore[k + 1]) return k + (y - ancore[k]) / Math.max(1, ancore[k + 1] - ancore[k]);
    }
    return ancore.length - 1;
  }
  function stato(s) {
    const k = Math.min(CHIAVI.length - 2, Math.floor(s));
    const t = liscio(0.18, 0.82, s - k);
    const a = CHIAVI[k], b = CHIAVI[k + 1];
    const o = {};
    for (const key in a) o[key] = lerp(a[key], b[key], t);
    return o;
  }

  // puntatore: solo un tocco in più su desktop
  let px = 0, pxT = 0;
  if (!telefono) window.addEventListener('pointermove', (e) => { pxT = (e.clientX / window.innerWidth) * 2 - 1; }, { passive: true });

  let attiva = true, visibile = true, ultimo = 0, t0 = -1, intro = fermo ? 1 : 0, spin = 1;
  let rafId = 0;

  function disegna(ts) {
    if (t0 < 0) t0 = ts;
    const dt = ultimo ? Math.min(0.05, (ts - ultimo) / 1000) : 1 / 60;
    ultimo = ts;
    const tempo = fermo ? 0 : (ts - t0) / 1000;

    const s = progresso();
    const st = stato(s);
    if (!fermo) intro = liscio(0.15, 2.9, tempo);

    // inquadratura: nell'hero segue la macchina, nelle fasi va al suo posto
    const mobile = W < 960;
    const rm = macchina.getBoundingClientRect();
    const cxH = rm.left + rm.width / 2;
    const cyH = rm.top + rm.height * 0.6;
    const dH = mobile ? Math.max(W * 1.25, rm.width * 1.9) : rm.width * 1.75;
    const cxF = mobile ? W / 2 : W * 0.68;
    const cyF = mobile ? Hh * 0.28 : Hh * 0.5;
    const dF = mobile ? Math.min(W * 0.7, Hh * 0.36) : Math.min(Hh * 0.64, W * 0.42);
    const f = liscio(0, 1, s);
    const cx = lerp(cxH, cxF, f), cy = lerp(cyH, cyF, f), diam = lerp(dH, dF, f);
    const dist = Hh / (Math.max(120, diam) * tanMezzo);

    px += (pxT - px) * 0.04;
    const elev = THREE.MathUtils.degToRad(st.elev);
    const az = px * 0.12;
    camera.position.set(Math.sin(az) * Math.cos(elev) * dist, Math.sin(elev) * dist + st.guarda, Math.cos(az) * Math.cos(elev) * dist);
    camera.lookAt(0, st.guarda, 0);
    camera.setViewOffset(W, Hh, W / 2 - cx, Hh / 2 - cy, W, Hh);
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld();

    // la sagoma della macchina scrive solo la profondità: la polvere le passa davanti e dietro
    const nellHero = s < 0.6;
    maschera.visible = nellHero && !!maschera.material.map;
    if (maschera.visible) {
      const wpp = (2 * dist * tanMezzo) / Hh;
      destra.setFromMatrixColumn(camera.matrixWorld, 0);
      su.setFromMatrixColumn(camera.matrixWorld, 1);
      maschera.position.set(0, st.guarda, 0)
        .addScaledVector(destra, (rm.left + rm.width / 2 - cx) * wpp)
        .addScaledVector(su, -(rm.top + rm.height / 2 - cy) * wpp);
      maschera.quaternion.copy(camera.quaternion);
      maschera.scale.set(rm.width * wpp, rm.height * wpp, 1);
    }
    canvas.classList.toggle('davanti', s < 0.55);

    spin += (st.spin - spin) * Math.min(1, dt * 2.5);
    if (!fermo) uni.uAngle.value += spin * dt;
    uni.uTime.value = tempo;
    uni.uIntro.value = intro;
    uni.uSep.value = st.sep;
    uni.uRise.value = st.rise;
    uni.uDrop.value = st.drop;
    uni.uAcqua.value = st.acqua;
    uni.uForma.value = st.forma;
    uni.uDens.value = st.dens;
    uni.uSpin.value = fermo ? 0 : spin;
    uni.uRef.value = dist;
    const mezzaW = dist * tanMezzo * camera.aspect, mezzaH = dist * tanMezzo;
    uni.uWide.value.set(mezzaW * 1.9, mezzaH * 1.7);

    cestello.rotation.y = -uni.uAngle.value;
    uGuscio.uOp.value = st.guscio * 0.55;
    matLinee.opacity = st.guscio * 0.22;
    uTubo.uOp.value = st.rise * 0.7;
    tubo.visible = st.rise > 0.01;

    // velo torbido: pieno all'apertura, poi segue le fasi
    const v = Math.max((1 - intro) * 0.95 * (fermo ? 0 : liscio(0, 0.6, tempo)), st.velo);
    velo.style.opacity = v.toFixed(3);
    velo.style.setProperty('--tx', `${((cx / W) * 100).toFixed(1)}%`);
    velo.style.setProperty('--ty', `${((cy / Hh) * 100).toFixed(1)}%`);

    renderer.render(scena, camera);
  }

  function ciclo(ts) {
    rafId = 0;
    if (!attiva || !visibile) return;
    disegna(ts);
    if (!fermo) rafId = requestAnimationFrame(ciclo);
  }
  function riparti() {
    if (!rafId && attiva && visibile) { ultimo = 0; rafId = requestAnimationFrame(ciclo); }
  }

  misura();
  disegna(performance.now());
  canvas.classList.add('pronta');
  riparti();

  let timerMisura = 0;
  window.addEventListener('resize', () => {
    clearTimeout(timerMisura);
    timerMisura = setTimeout(() => { misura(); if (fermo) riparti(); }, 120);
  });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(misura);
  window.addEventListener('load', misura);
  if (fermo) window.addEventListener('scroll', riparti, { passive: true });

  // fermo quando la vasca è fuori schermo o la scheda è nascosta
  new IntersectionObserver(([e]) => {
    attiva = e.isIntersecting;
    canvas.classList.toggle('nascosta', !attiva);
    velo.classList.toggle('nascosta', !attiva);
    if (attiva) { misura(); riparti(); }
  }, { rootMargin: '0px 0px 0px 0px' }).observe(vasca);
  document.addEventListener('visibilitychange', () => {
    visibile = document.visibilityState === 'visible';
    if (visibile) riparti();
  });
}
