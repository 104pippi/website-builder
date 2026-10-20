/* Lafarmacia. — "Un punto che diventa 669".
   Il punto rosso del logo (una sfera lucida) nasce sopra Milano, dove nel 2020 è partita la rete,
   e si apre in 669 punti che volano fino alle coordinate vere di ogni farmacia.
   Tempo da performance.now(), scroll per l'inclinazione; il puntatore solo su desktop. */
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const mix = (a, b, t) => a + (b - a) * t;
const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
const easeInOutCubic = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const easeOutBack = (t, s = 1.7) => { const c = s + 1; return 1 + c * Math.pow(t - 1, 3) + s * Math.pow(t - 1, 2); };
const smooth = (t) => t * t * (3 - 2 * t);

function semi(seed) {
  return () => {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export async function avvia(canvas, hero, opz = {}) {
  const ridotto = !!opz.ridotto;
  const mobile = matchMedia('(max-width: 959px)').matches;
  const [italia, D] = await Promise.all([
    fetch('assets/dati/italia.json').then((r) => r.json()),
    window.__datiFarmacie
  ]);

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  } catch (e) { document.documentElement.classList.add('no-webgl'); return; }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, mobile ? 1.5 : 2));
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.7;
  scene.add(new THREE.AmbientLight(0xbfe6e3, 0.35));
  const luce = new THREE.DirectionalLight(0xffffff, 1.6);
  luce.position.set(-3, 6, 8);
  scene.add(luce);

  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 200);
  const C = italia.c, LAT0 = italia.lat0, LNG0 = italia.lng0;
  const proj = (lat, lng) => [(lng - LNG0) * C, lat - LAT0];

  // contenitori: base (inquadratura) > mappa (inclinazione e movimento)
  const base = new THREE.Group();
  const mappa = new THREE.Group();
  base.add(mappa);
  scene.add(base);

  /* --- confini delle regioni, a filo --- */
  const seg = [];
  italia.linee.forEach((l) => {
    for (let i = 0; i + 3 < l.length; i += 2) seg.push(l[i], l[i + 1], 0, l[i + 2], l[i + 3], 0);
  });
  const geoConfini = new THREE.BufferGeometry();
  geoConfini.setAttribute('position', new THREE.Float32BufferAttribute(seg, 3));
  const matConfini = new THREE.LineBasicMaterial({ color: 0x6aaeaa, transparent: true, opacity: 0 });
  mappa.add(new THREE.LineSegments(geoConfini, matConfini));

  /* --- le farmacie --- */
  const F = D.farmacie;
  const N = F.length;
  const rnd = semi(620);
  const MILANO = proj(45.4642, 9.19);
  const fine = new Float32Array(N * 2);
  const ritardo = new Float32Array(N);
  const arco = new Float32Array(N);
  const aperta = new Uint8Array(N);
  const fase = new Float32Array(N);
  let distMax = 0;
  F.forEach((f, i) => {
    const [x, y] = proj(f.lat, f.lng);
    fine[i * 2] = x; fine[i * 2 + 1] = y;
    const d = Math.hypot(x - MILANO[0], y - MILANO[1]);
    distMax = Math.max(distMax, d);
    arco[i] = d;
    fase[i] = rnd() * Math.PI * 2;
  });
  F.forEach((f, i) => {
    const dn = arco[i] / distMax;
    ritardo[i] = dn * 0.95 + rnd() * 0.22;
    arco[i] = 0.5 + dn * 1.6;
  });
  const aggiornaAperte = () => {
    const stato = window.__statoFarmacia;
    if (!stato) return;
    F.forEach((f, i) => { aperta[i] = stato(f).aperta ? 1 : 0; });
  };
  aggiornaAperte();
  setInterval(aggiornaAperte, 60000);

  const puntoGeo = new THREE.SphereGeometry(mobile ? 0.048 : 0.046, 14, 10);
  const puntoMat = new THREE.MeshStandardMaterial({ color: 0xd80a24, emissive: 0x9a0014, emissiveIntensity: 0.85, roughness: 0.38, metalness: 0, toneMapped: false });
  const punti = new THREE.InstancedMesh(puntoGeo, puntoMat, N);
  punti.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  punti.frustumCulled = false;
  const col = new THREE.Color();
  for (let i = 0; i < N; i++) punti.setColorAt(i, col.set(0xffffff));
  mappa.add(punti);

  // alone luminoso (sprite additivi), più forte sulle farmacie aperte adesso
  const pos = new Float32Array(N * 3);
  const alone = new Float32Array(N);
  const geoAlone = new THREE.BufferGeometry();
  geoAlone.setAttribute('position', new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage));
  geoAlone.setAttribute('alone', new THREE.BufferAttribute(alone, 1).setUsage(THREE.DynamicDrawUsage));
  const matAlone = new THREE.ShaderMaterial({
    uniforms: { uPR: { value: renderer.getPixelRatio() }, uS: { value: mobile ? 26 : 30 } },
    vertexShader: `
      attribute float alone; uniform float uPR, uS; varying float vA;
      void main(){ vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_Position = projectionMatrix * mv;
        vA = alone; gl_PointSize = uS * (0.35 + alone) * uPR * (22.0 / -mv.z); }`,
    fragmentShader: `
      varying float vA;
      void main(){ float d = length(gl_PointCoord - 0.5); float a = smoothstep(0.5, 0.0, d); a = a * a * 0.55 * vA;
        gl_FragColor = vec4(vec3(1.0, 0.16, 0.24) * a, a); }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending
  });
  const aloni = new THREE.Points(geoAlone, matAlone);
  aloni.frustumCulled = false;
  mappa.add(aloni);

  /* --- il punto del logo --- */
  const sfera = new THREE.Mesh(
    new THREE.SphereGeometry(0.8, 64, 48),
    new THREE.MeshPhysicalMaterial({ color: 0xc8001a, roughness: 0.24, clearcoat: 1, clearcoatRoughness: 0.05, toneMapped: false })
  );
  sfera.position.set(MILANO[0], MILANO[1], 1.4);
  mappa.add(sfera);

  /* --- inquadratura: la zona con le farmacie riempie la tela --- */
  const BOX = { x0: -4.7, x1: 2.6, y0: -3.7, y1: 4.9 };
  const TILT = -0.6;
  let inq = { x: 0, y: 0 };
  function adatta() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    const tanH = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    const bw = BOX.x1 - BOX.x0, bh = (BOX.y1 - BOX.y0) * Math.cos(TILT);
    const Z = Math.max(bw / (2 * tanH * camera.aspect), bh / (2 * tanH)) * (mobile ? 0.84 : 1.08);
    camera.position.set(0, 0, Z);
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();
    inq = { x: -(BOX.x0 + BOX.x1) / 2 + (mobile ? 0.45 : 0), y: -(BOX.y0 + BOX.y1) / 2 * Math.cos(TILT) + (mobile ? 0.75 : 0) };
  }
  adatta();

  /* --- animazione --- */
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(), p3 = new THREE.Vector3();
  const T_SFERA = 0.75;   // la sfera è cresciuta
  const T_SCOPPIO = 1.05; // si apre
  const VOLO = 0.95;
  let t0 = null, ultimo = 0;
  const pt = { x: 0, y: 0, tx: 0, ty: 0 };

  function posa(t) {
    // la sfera: cresce, si comprime un attimo, poi si apre
    const kS = easeOutBack(clamp(t / T_SFERA), 1.6);
    const comp = smooth(clamp((t - T_SFERA) / (T_SCOPPIO - T_SFERA)));
    const via = clamp((t - T_SCOPPIO) / 0.14);
    const s = Math.max(0.0001, kS * (1 - via));
    sfera.scale.set(s * (1 + comp * 0.12), s * (1 - comp * 0.14), s * (1 + comp * 0.12));
    sfera.position.z = 1.4 + Math.sin(t * 2.4) * 0.05 * (1 - comp);
    sfera.visible = via < 1;

    const ora = t - T_SCOPPIO;
    for (let i = 0; i < N; i++) {
      const u = clamp((ora - ritardo[i]) / VOLO);
      let x, y, z, k;
      if (u <= 0) { x = MILANO[0]; y = MILANO[1]; z = 1.4; k = 0; }
      else {
        const e = easeInOutCubic(u);
        x = mix(MILANO[0], fine[i * 2], e);
        y = mix(MILANO[1], fine[i * 2 + 1], e);
        z = mix(1.4, 0, e) + Math.sin(Math.PI * e) * arco[i] * 0.5;
        // atterraggio: un piccolo "plop"
        const atterra = clamp((u - 0.86) / 0.14);
        k = u < 0.86 ? 0.75 : mix(1.45, 1, easeOutCubic(atterra));
      }
      const fermo = u >= 1 ? 1 : 0;
      const puls = fermo ? (aperta[i] ? 1 + 0.22 * Math.sin(t * 2.2 + fase[i]) : 0.82) : 1;
      const r = k * puls;
      sc.set(r, r, r);
      p3.set(x, y, z);
      m4.compose(p3, q, sc);
      punti.setMatrixAt(i, m4);
      pos[i * 3] = x; pos[i * 3 + 1] = y; pos[i * 3 + 2] = z;
      alone[i] = u <= 0 ? 0 : fermo ? (aperta[i] ? 0.75 + 0.25 * Math.sin(t * 2.2 + fase[i]) : 0.28) : 0.6;
      if (fermo) punti.setColorAt(i, col.setRGB(aperta[i] ? 1 : 0.62, aperta[i] ? 1 : 0.55, aperta[i] ? 1 : 0.58));
    }
    punti.instanceMatrix.needsUpdate = true;
    if (punti.instanceColor) punti.instanceColor.needsUpdate = true;
    geoAlone.attributes.position.needsUpdate = true;
    geoAlone.attributes.alone.needsUpdate = true;
    matConfini.opacity = 0.34 * smooth(clamp((t - 0.2) / 1.6));
  }

  function disegna(now) {
    if (t0 === null) t0 = now;
    const t = ridotto ? 20 : (now - t0) / 1000;
    const dt = Math.min(0.05, Math.max(0, (now - ultimo) / 1000));
    ultimo = now;
    posa(t);

    const sp = clamp(window.scrollY / Math.max(1, hero.offsetHeight));
    const e = smooth(sp);
    const kp = 1 - Math.exp(-dt * 3);
    pt.x += (pt.tx - pt.x) * kp; pt.y += (pt.ty - pt.y) * kp;

    const intro = 1 - easeOutCubic(clamp(t / 3.2));
    base.position.set(0, e * 1.6, 0);
    mappa.position.set(inq.x, inq.y, 0);
    mappa.rotation.set(TILT - e * 0.32 + pt.y * 0.06 + intro * 0.25, pt.x * 0.08 + Math.sin(t * 0.21) * 0.035, 0.05 * Math.sin(t * 0.17) + e * 0.12 - intro * 0.08);
    canvas.style.opacity = String(ridotto ? 1 : easeOutCubic(clamp(t / 0.4)));
    renderer.render(scene, camera);
  }

  try { await renderer.compileAsync(scene, camera); } catch (e) { /* niente */ }

  let visibile = true, inCorsa = false;
  function ciclo() {
    if (!visibile || document.hidden) { inCorsa = false; return; }
    disegna(performance.now());
    requestAnimationFrame(ciclo);
  }
  function riparti() { if (!inCorsa && visibile && !document.hidden && !ridotto) { inCorsa = true; requestAnimationFrame(ciclo); } }
  if ('IntersectionObserver' in window) new IntersectionObserver(([v]) => { visibile = v.isIntersecting; riparti(); }, { rootMargin: '60px' }).observe(hero);
  document.addEventListener('visibilitychange', riparti);
  new ResizeObserver(() => { adatta(); if (ridotto) disegna(performance.now()); }).observe(canvas);
  if (!mobile && matchMedia('(pointer: fine)').matches) {
    addEventListener('pointermove', (ev) => { pt.tx = (ev.clientX / innerWidth) * 2 - 1; pt.ty = (ev.clientY / innerHeight) * 2 - 1; }, { passive: true });
  }
  if (ridotto) { disegna(performance.now()); return; }
  ultimo = performance.now();
  riparti();
}
