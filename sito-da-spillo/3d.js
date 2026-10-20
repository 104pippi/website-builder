/* Pizzeria da Spillo — lo spillo del logo in 3D.
   Uno stecco d'acciaio infilza basilico, pomodorino e mozzarella davanti alla bocca del forno,
   con la luce del fuoco alle spalle e le faville che salgono. Tutto guidato dal tempo
   (performance.now) e dallo scroll; il puntatore aggiunge un extra solo su desktop. */
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const PI = Math.PI;
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const mix = (a, b, t) => a + (b - a) * t;
const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
const easeOutQuart = (t) => 1 - Math.pow(1 - t, 4);
const easeOutBack = (t, s = 1.9) => { const c = s + 1; return 1 + c * Math.pow(t - 1, 3) + s * Math.pow(t - 1, 2); };
const smooth = (t) => t * t * (3 - 2 * t);

// generatore pseudo-casuale con seme: la scena è sempre la stessa
function semi(seed) {
  return () => {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ---------- Geometrie fatte a mano ---------- */
function geoPomodoro() {
  const g = new THREE.SphereGeometry(1, 96, 64);
  const p = g.attributes.position;
  const v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const y = v.y;
    const a = Math.atan2(v.z, v.x);
    const eq = 1 - y * y;
    const k = 1 + 0.034 * Math.cos(a * 5 + 0.4) * eq + 0.018 * Math.cos(a * 3 + 1.1) * eq;
    v.x *= k; v.z *= k;
    v.y *= 0.86;
    const t = Math.max(0, (y - 0.8) / 0.2); v.y -= 0.2 * t * t;     // fossetta del picciolo
    const b = Math.max(0, (-y - 0.86) / 0.14); v.y += 0.05 * b * b;  // fondo appena schiacciato
    p.setXYZ(i, v.x, v.y, v.z);
  }
  g.computeVertexNormals();
  return g;
}

function geoSepalo() {
  const N = 16, pos = [], idx = [];
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    const x = t * 0.6;
    const y = 0.075 * Math.sin(PI * t * 0.85) + 0.012 + 0.05 * Math.pow(t, 4);
    const w = 0.12 * Math.pow(Math.sin(PI * Math.min(1, t * 1.04 + 0.02)), 0.7) * (1 - 0.35 * t) + 0.003;
    pos.push(x, y, -w, x, y + 0.018, 0, x, y, w);
  }
  for (let i = 0; i < N; i++) {
    const a = i * 3;
    idx.push(a, a + 3, a + 1, a + 1, a + 3, a + 4, a + 1, a + 4, a + 2, a + 2, a + 4, a + 5);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

function geoMozzarella() {
  const g = new THREE.SphereGeometry(0.9, 96, 64);
  const p = g.attributes.position;
  const v = new THREE.Vector3(), n = new THREE.Vector3();
  const d = new THREE.Vector3(-0.3, 1, 0.2).normalize();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    n.copy(v).normalize();
    const c = n.dot(d);
    const k = Math.max(0, (c - 0.86) / 0.14);
    v.addScaledVector(d, 0.2 * k * k);                       // il nodino della mozzarella
    const tw = Math.max(0, (c - 0.55) / 0.45);
    const ang = Math.atan2(n.z, n.x);
    v.multiplyScalar(1 + 0.014 * Math.sin(ang * 9 + c * 6) * tw); // pieghe vicino al nodo
    v.y *= 0.94;
    p.setXYZ(i, v.x, v.y, v.z);
  }
  g.computeVertexNormals();
  return g;
}

function geoFoglia(len, wid, rnd) {
  const SL = 44, SW = 14, pos = [], uv = [], idx = [];
  const ond = 0.02 + rnd() * 0.02;
  for (let i = 0; i <= SL; i++) {
    const t = i / SL;
    const w = wid * Math.pow(Math.sin(PI * Math.pow(t, 0.72)), 0.9);
    for (let j = 0; j <= SW; j++) {
      const s = (j / SW) * 2 - 1;
      const x = t * len;
      const y = s * w;
      const z = Math.abs(s) * w * 0.55 - 0.3 * len * (t - 0.35) * (t - 0.35) + ond * Math.sin(t * 17 + s * 3) * Math.abs(s) * t;
      pos.push(x, y, z);
      uv.push(t, (s + 1) / 2);
    }
  }
  for (let i = 0; i < SL; i++) for (let j = 0; j < SW; j++) {
    const a = i * (SW + 1) + j, b = a + SW + 1;
    idx.push(a, b, a + 1, a + 1, b, b + 1);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

function texFoglia() {
  const rnd = semi(7);
  const c = document.createElement('canvas');
  c.width = 512; c.height = 256;
  const x = c.getContext('2d');
  const gr = x.createLinearGradient(0, 0, 512, 0);
  gr.addColorStop(0, '#2d6a22'); gr.addColorStop(0.45, '#3d8a2e'); gr.addColorStop(1, '#4b9734');
  x.fillStyle = gr; x.fillRect(0, 0, 512, 256);
  const lu = x.createRadialGradient(220, 128, 10, 220, 128, 260);
  lu.addColorStop(0, 'rgba(160,215,110,.22)'); lu.addColorStop(1, 'rgba(160,215,110,0)');
  x.fillStyle = lu; x.fillRect(0, 0, 512, 256);
  x.lineCap = 'round';
  x.strokeStyle = 'rgba(200,236,160,.6)'; x.lineWidth = 5;
  x.beginPath(); x.moveTo(0, 128); x.lineTo(512, 128); x.stroke();
  x.strokeStyle = 'rgba(190,230,150,.36)'; x.lineWidth = 2.2;
  for (let k = 1; k <= 8; k++) {
    const u = k * 54;
    for (const s of [-1, 1]) {
      x.beginPath(); x.moveTo(u - 12, 128);
      x.quadraticCurveTo(u + 24, 128 + s * 58, u + 66, 128 + s * 116);
      x.stroke();
    }
  }
  for (let i = 0; i < 1600; i++) {
    x.fillStyle = rnd() < 0.5 ? `rgba(15,45,12,${rnd() * 0.1})` : `rgba(140,190,90,${rnd() * 0.08})`;
    x.fillRect(rnd() * 512, rnd() * 256, 2, 2);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

/* ---------- La scena ---------- */
export async function avvia(canvas, hero, opz = {}) {
  const ridotto = !!opz.ridotto;
  const mobile = matchMedia('(max-width: 899px)').matches;

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  } catch (e) { return; }
  if (!renderer.getContext()) return;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, mobile ? 1.5 : 2));
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.08;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.55;

  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 200);

  // luci: chiave fredda davanti, fuoco caldo da dietro e da sotto
  const chiave = new THREE.DirectionalLight(0xfff3e4, 2.4);
  chiave.position.set(-4, 5, 8);
  scene.add(chiave);
  const fuoco = new THREE.PointLight(0xff7a2a, 60, 0, 1.6);
  fuoco.position.set(0.8, -3, -3.5);
  scene.add(fuoco);
  const fuoco2 = new THREE.PointLight(0xffa04a, 28, 0, 1.6);
  fuoco2.position.set(-3, 2.5, -4);
  scene.add(fuoco2);
  scene.add(new THREE.HemisphereLight(0xffe6cc, 0x1b120c, 0.45));

  const rnd = semi(1935);

  // contenitori: base (posizione nello schermo) > spiedino (movimento) > interno (centrato)
  const base = new THREE.Group();
  const spiedino = new THREE.Group();
  const interno = new THREE.Group();
  interno.position.x = 0.42;
  base.add(spiedino); spiedino.add(interno); scene.add(base);

  // lo spillo d'acciaio
  const acciaio = new THREE.MeshStandardMaterial({ color: 0xf0f0f2, metalness: 1, roughness: 0.17 });
  const stecco = new THREE.Group();
  const asta = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.042, 7.2, 24), acciaio);
  asta.rotation.z = PI / 2; asta.position.x = 0.1;
  const punta = new THREE.Mesh(new THREE.ConeGeometry(0.042, 0.36, 24), acciaio);
  punta.rotation.z = -PI / 2; punta.position.x = 3.7 + 0.18;
  const testa = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 24), acciaio);
  testa.scale.set(0.74, 0.31, 0.055); testa.position.x = -4.12;
  const collo = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.065, 0.5, 16), acciaio);
  collo.rotation.z = PI / 2; collo.position.x = -3.35;
  stecco.add(asta, punta, testa, collo);
  interno.add(stecco);

  // il pomodorino
  const pomodoro = new THREE.Group();
  const buccia = new THREE.MeshPhysicalMaterial({ color: 0xd2231a, roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.07, sheen: 0.25, sheenColor: new THREE.Color(0xff6a4a) });
  pomodoro.add(new THREE.Mesh(geoPomodoro(), buccia));
  const verde = new THREE.MeshStandardMaterial({ color: 0x2f7a26, roughness: 0.55, side: THREE.DoubleSide });
  const sepaloGeo = geoSepalo();
  const calice = new THREE.Group();
  for (let i = 0; i < 6; i++) {
    const s = new THREE.Mesh(sepaloGeo, verde);
    s.rotation.y = (i / 6) * PI * 2 + rnd() * 0.3;
    s.scale.setScalar(0.85 + rnd() * 0.35);
    calice.add(s);
  }
  const picciolo = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.05, 0.3, 10), verde);
  picciolo.position.y = 0.12; picciolo.rotation.z = 0.35;
  calice.add(picciolo);
  calice.position.y = 0.655;
  calice.rotation.z = -0.12;
  pomodoro.add(calice);

  // la mozzarella
  const latte = new THREE.MeshPhysicalMaterial({
    color: 0xf7f4ec, roughness: 0.36, clearcoat: 0.55, clearcoatRoughness: 0.22,
    sheen: 1, sheenColor: new THREE.Color(0xffffff), sheenRoughness: 0.55,
    emissive: new THREE.Color(0x2a2016), emissiveIntensity: 0.35
  });
  const mozzarella = new THREE.Mesh(geoMozzarella(), latte);

  // il basilico: quattro foglie a ventaglio, infilzate vicino al picciolo
  const basilico = new THREE.Group();
  const fogliaMat = new THREE.MeshStandardMaterial({ map: texFoglia(), roughness: 0.5, side: THREE.DoubleSide });
  const FOGLIE = [[1.95, 1.55, 0.42, -0.12], [1.18, 1.22, 0.36, 0.1], [-2.18, 1.36, 0.38, 0.05], [-1.3, 1.08, 0.32, -0.16]];
  FOGLIE.forEach(([ang, len, wid, z], i) => {
    const perno = new THREE.Group();
    perno.rotation.z = ang;
    perno.position.z = z;
    const f = new THREE.Mesh(geoFoglia(len, wid, rnd), fogliaMat);
    f.position.x = -0.12;
    f.rotation.x = (i % 2 ? -1 : 1) * (0.35 + rnd() * 0.25);
    perno.add(f);
    basilico.add(perno);
  });

  // ingredienti lungo lo spillo: [oggetto, x finale, mezza larghezza, scarto iniziale y, rotazione iniziale]
  const ING = [
    { o: basilico, x: -1.25, r: 0.35, dy: 0.95, rot: [0.6, -0.8, 0.5], ritardo: 0.0 },
    { o: pomodoro, x: 0.0, r: 1.0, dy: -0.9, rot: [-0.7, 0.9, -0.4], ritardo: 0.1 },
    { o: mozzarella, x: 1.95, r: 0.9, dy: 0.8, rot: [0.9, -0.5, 0.7], ritardo: 0.2 }
  ];
  ING.forEach((g) => { g.o.position.x = g.x; interno.add(g.o); });

  // faville che salgono dal forno
  const N = mobile ? 100 : 200;
  const pGeo = new THREE.BufferGeometry();
  const pPos = new Float32Array(N * 3), pSeed = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    pPos[i * 3] = (rnd() * 2 - 1);
    pPos[i * 3 + 1] = 0;
    pPos[i * 3 + 2] = rnd() * -6 + 2.5;
    pSeed[i] = rnd();
  }
  pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
  pGeo.setAttribute('seme', new THREE.BufferAttribute(pSeed, 1));
  const pMat = new THREE.ShaderMaterial({
    uniforms: { uT: { value: 0 }, uW: { value: 10 }, uH: { value: 10 }, uPR: { value: renderer.getPixelRatio() }, uS: { value: mobile ? 8 : 11 }, uA: { value: 0 } },
    vertexShader: `
      attribute float seme;
      uniform float uT, uW, uH, uPR, uS;
      varying float vA; varying float vM;
      void main(){
        float per = 3.4 + seme * 3.6;
        float ph = fract((uT + seme * 17.0) / per);
        vec3 p = position;
        p.x = p.x * uW * 0.55 + sin(uT * 0.8 + seme * 31.0) * 0.5 * ph + sin(uT * 2.1 + seme * 7.0) * 0.1;
        p.y = -uH * 0.55 + ph * uH * 1.05;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;
        float fl = 0.6 + 0.4 * sin(uT * (9.0 + seme * 8.0) + seme * 40.0);
        vA = smoothstep(0.0, 0.1, ph) * (1.0 - ph) * fl;
        vM = ph;
        gl_PointSize = uS * (0.55 + seme * 1.15) * (1.0 - ph * 0.55) * uPR * (24.0 / -mv.z);
      }`,
    fragmentShader: `
      uniform float uA;
      varying float vA; varying float vM;
      void main(){
        vec2 c = gl_PointCoord - 0.5;
        float d = length(c);
        float a = smoothstep(0.5, 0.0, d); a *= a;
        vec3 col = mix(vec3(1.0, 0.86, 0.5), vec3(1.0, 0.4, 0.1), vM);
        float al = a * vA * uA;
        gl_FragColor = vec4(col * al, al);
      }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending
  });
  const faville = new THREE.Points(pGeo, pMat);
  faville.frustumCulled = false;
  scene.add(faville);

  /* ---------- Inquadratura: lo spiedino si adatta allo schermo ---------- */
  const LUNG = 8.9;
  let pos = { x: 0, y: 0, rz: 0.5, s: 1 };
  function adatta() {
    const w = hero.clientWidth, h = hero.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    const desk = w >= 900;
    const tanH = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    const ang = desk ? 0.3 : 0.5;
    const quota = desk ? 0.46 : 0.94;
    let Z = (LUNG * Math.cos(ang)) / (quota * 2 * tanH * camera.aspect);
    // non troppo grande sugli schermi bassi
    Z = Math.max(Z, (LUNG * Math.sin(ang) + 2.4) / (2 * tanH * (desk ? 0.62 : 0.4)));
    camera.position.set(0, 0, Z);
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();
    const hW = 2 * Z * tanH, wW = hW * camera.aspect;
    pos = desk ? { x: wW * 0.215, y: hW * 0.0, rz: ang, s: 1 } : { x: 0, y: hW * 0.235, rz: ang, s: 1 };
    pMat.uniforms.uW.value = wW;
    pMat.uniforms.uH.value = hW;
    faville.position.set(desk ? wW * 0.12 : 0, 0, 0);
  }
  adatta();

  /* ---------- Animazione ---------- */
  const INTRO_PUNTA = [0.45, 1.75]; // finestra in cui lo spillo entra
  const PARTENZA = -12;
  let t0 = null;
  let ultimo = 0;
  const pt = { x: 0, y: 0, tx: 0, ty: 0 };

  function posa(t) {
    // ingresso dello spillo, punta in avanti, da sinistra verso destra
    const kStecco = easeOutQuart(clamp((t - INTRO_PUNTA[0]) / (INTRO_PUNTA[1] - INTRO_PUNTA[0])));
    const off = mix(PARTENZA, 0, kStecco);
    stecco.position.x = off;
    const puntaX = 3.88 + off;

    ING.forEach((g, i) => {
      // comparsa con un piccolo rimbalzo
      const kS = clamp((t - 0.05 - g.ritardo) / 0.6);
      const sc = kS <= 0 ? 0.0001 : easeOutBack(kS, 1.6);
      // quando la punta si avvicina, l'ingrediente si allinea sull'asse
      const kA = clamp((puntaX - (g.x - g.r - 1.3)) / (1.3 + g.r));
      const a = easeOutBack(kA, 1.4);
      const galleggia = (1 - a) * Math.sin(t * 2.2 + i * 1.7) * 0.08;
      g.o.position.y = (1 - a) * g.dy + galleggia;
      g.o.position.x = g.x + (1 - a) * (i - 1) * 0.35;
      const q = 1 - easeOutCubic(kA);
      g.o.rotation.set(g.rot[0] * q, g.rot[1] * q, g.rot[2] * q);
      g.o.scale.setScalar(Math.max(0.0001, sc));
    });

    // dopo l'intro: gli ingredienti girano piano attorno allo spillo
    const idle = Math.max(0, t - 1.9);
    const kIdle = smooth(clamp(idle / 1.2));
    pomodoro.rotation.x += idle * 0.32 * kIdle;
    mozzarella.rotation.x -= idle * 0.22 * kIdle;
    basilico.rotation.x += Math.sin(idle * 0.7) * 0.18 * kIdle;

    // tutto lo spiedino respira
    spiedino.rotation.x = 0.22 * Math.sin(t * 0.5) * kIdle;
    spiedino.rotation.y = -0.32 + 0.22 * Math.sin(t * 0.37) * kIdle + (1 - easeOutCubic(clamp(t / 2))) * 0.5;
    spiedino.position.y = 0.09 * Math.sin(t * 1.05) * kIdle;
  }

  function disegna(now) {
    if (t0 === null) t0 = now;
    const t = ridotto ? 30 : (now - t0) / 1000;
    const dt = Math.min(0.05, Math.max(0, (now - ultimo) / 1000));
    ultimo = now;

    posa(t);

    // scroll: lo spiedino sale e ruota mentre l'hero esce
    const sp = clamp(window.scrollY / Math.max(1, hero.offsetHeight));
    const e = smooth(sp);

    // puntatore (solo desktop)
    const kp = 1 - Math.exp(-dt * 4);
    pt.x += (pt.tx - pt.x) * kp; pt.y += (pt.ty - pt.y) * kp;

    base.position.set(pos.x, pos.y + e * 3.2, 0);
    base.rotation.set(pt.y * 0.25 - e * 0.35, pt.x * 0.35 + e * 0.9, pos.rz + e * 0.35);
    base.scale.setScalar(pos.s * (1 - e * 0.12));

    pMat.uniforms.uT.value = t;
    pMat.uniforms.uA.value = clamp((t - 0.2) / 1.2);
    fuoco.intensity = 60 * (0.9 + 0.1 * Math.sin(t * 7.3) + 0.06 * Math.sin(t * 13.1));

    canvas.style.opacity = String(ridotto ? 1 : easeOutCubic(clamp(t / 0.6)));
    renderer.render(scene, camera);
  }

  // prepara gli shader prima del primo fotogramma, poi parte l'orologio
  try { await renderer.compileAsync(scene, camera); } catch (e) { /* va bene anche senza */ }

  let attivo = true, visibile = true, inCorsa = false;
  function ciclo() {
    if (!attivo || !visibile || document.hidden) { inCorsa = false; return; }
    disegna(performance.now());
    requestAnimationFrame(ciclo);
  }
  function riparti() { if (!inCorsa && attivo && visibile && !document.hidden && !ridotto) { inCorsa = true; requestAnimationFrame(ciclo); } }

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(([v]) => { visibile = v.isIntersecting; riparti(); }, { rootMargin: '80px' }).observe(hero);
  }
  document.addEventListener('visibilitychange', riparti);
  new ResizeObserver(() => { adatta(); if (ridotto) disegna(performance.now()); }).observe(hero);

  if (!mobile && matchMedia('(pointer: fine)').matches) {
    window.addEventListener('pointermove', (ev) => {
      pt.tx = (ev.clientX / innerWidth) * 2 - 1;
      pt.ty = (ev.clientY / innerHeight) * 2 - 1;
    }, { passive: true });
  }

  if (ridotto) { disegna(performance.now()); return; }
  ultimo = performance.now();
  riparti();
}
