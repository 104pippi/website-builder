// Scene 3D di Cadorin Carpenterie.
// 1) Hero: il marchio (finestra con le ante "CC" sopra un parapetto a bovindo) costruito pezzo per pezzo:
//    il muro sale, le bacchette crescono saldate alla base, il corrimano viene saldato tra le scintille,
//    le ante si chiudono sul marchio e poi si aprono su una luce calda.
// 2) Configuratore: un cancello in tre stili, nei colori RAL scelti, che si apre a comando.
// Tutto avanza con performance.now() e con lo scroll; i cicli si fermano fuori schermo.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const fase = (t, a, b) => clamp((t - a) / (b - a));
const esce = (x) => 1 - Math.pow(1 - x, 3);
const esceForte = (x) => 1 - Math.pow(1 - x, 5);
const dentroFuori = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
const molla = (x) => { const c1 = 1.15, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); };
const casuale = (a, b) => a + Math.random() * (b - a);
const eMobile = () => matchMedia('(max-width: 760px)').matches;

function creaRenderer(canvas) {
  const r = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  r.setPixelRatio(Math.min(devicePixelRatio || 1, eMobile() ? 1.5 : 2));
  r.outputColorSpace = THREE.SRGBColorSpace;
  r.toneMapping = THREE.NeutralToneMapping;
  r.toneMappingExposure = 1;
  r.setClearColor(0x000000, 0);
  return r;
}

function ambiente(renderer) {
  const pm = new THREE.PMREMGenerator(renderer);
  const tex = pm.fromScene(new RoomEnvironment(), 0.04).texture;
  pm.dispose();
  return tex;
}

// Rende il ciclo pigro: gira solo se l'elemento è in vista e la scheda è visibile
function ciclo(elemento, passo) {
  let vivo = false;
  let inVista = false;
  let id = 0;
  const giro = () => { if (!vivo) return; passo(performance.now()); id = requestAnimationFrame(giro); };
  const aggiorna = () => {
    const deve = inVista && !document.hidden;
    if (deve && !vivo) { vivo = true; id = requestAnimationFrame(giro); }
    if (!deve && vivo) { vivo = false; cancelAnimationFrame(id); }
  };
  new IntersectionObserver(([e]) => { inVista = e.isIntersecting; aggiorna(); }, { rootMargin: '60px' }).observe(elemento);
  document.addEventListener('visibilitychange', aggiorna);
}

function scatola(w, h, d, mat, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  return m;
}

// Texture disegnate a mano su canvas
function texturaRadiale(colori, w = 256, h = 256) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const x = c.getContext('2d');
  const g = x.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, Math.max(w, h) / 2);
  colori.forEach(([p, col]) => g.addColorStop(p, col));
  x.fillStyle = g;
  x.fillRect(0, 0, w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
function ombra(w, d, intensita = 0.5) {
  const tex = texturaRadiale([[0, `rgba(20,24,26,${intensita})`], [0.55, `rgba(20,24,26,${intensita * 0.45})`], [1, 'rgba(20,24,26,0)']]);
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, toneMapped: false }));
  m.rotation.x = -Math.PI / 2;
  m.renderOrder = -1;
  return m;
}

// La "C" del marchio: alta, con angoli tondi e aperta a destra
function formaC(w, h, s, r) {
  const ri = Math.max(r - s, 0.015);
  const p = new THREE.Shape();
  p.moveTo(w, h);
  p.lineTo(r, h);
  p.quadraticCurveTo(0, h, 0, h - r);
  p.lineTo(0, r);
  p.quadraticCurveTo(0, 0, r, 0);
  p.lineTo(w, 0);
  p.lineTo(w, s);
  p.lineTo(s + ri, s);
  p.quadraticCurveTo(s, s, s, s + ri);
  p.lineTo(s, h - s - ri);
  p.quadraticCurveTo(s, h - s, s + ri, h - s);
  p.lineTo(w, h - s);
  p.closePath();
  return p;
}

// Scintille di saldatura: teste luminose (Points) più scie (LineSegments), tutto additivo
function creaScintille(scene, n = 300) {
  const pos = new Float32Array(n * 3);
  const vel = new Float32Array(n * 3);
  const vita = new Float32Array(n).fill(-1);
  const durata = new Float32Array(n).fill(1);
  const aVita = new Float32Array(n).fill(-1);
  const scia = new Float32Array(n * 6);
  const sciaCol = new Float32Array(n * 6);
  for (let i = 0; i < n; i++) pos[i * 3 + 1] = -50;

  const gPunti = new THREE.BufferGeometry();
  gPunti.setAttribute('position', new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage));
  gPunti.setAttribute('aVita', new THREE.BufferAttribute(aVita, 1).setUsage(THREE.DynamicDrawUsage));
  const matPunti = new THREE.ShaderMaterial({
    uniforms: { uScala: { value: 400 } },
    vertexShader: `
      attribute float aVita;
      varying float vVita;
      uniform float uScala;
      void main() {
        vVita = aVita;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * mv;
        float s = aVita < 0.0 ? 0.0 : (1.0 - aVita * 0.75);
        gl_PointSize = s * uScala / -mv.z;
      }`,
    fragmentShader: `
      varying float vVita;
      void main() {
        if (vVita < 0.0) discard;
        float d = length(gl_PointCoord - 0.5);
        if (d > 0.5) discard;
        float a = pow(1.0 - d * 2.0, 1.6);
        vec3 c = mix(vec3(1.0, 0.97, 0.86), vec3(1.0, 0.58, 0.18), clamp(vVita * 1.5, 0.0, 1.0));
        c = mix(c, vec3(0.75, 0.2, 0.05), clamp((vVita - 0.55) * 2.2, 0.0, 1.0));
        gl_FragColor = vec4(c * a * 1.8, a * (1.0 - vVita));
      }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  });
  const punti = new THREE.Points(gPunti, matPunti);
  punti.frustumCulled = false;

  const gScia = new THREE.BufferGeometry();
  gScia.setAttribute('position', new THREE.BufferAttribute(scia, 3).setUsage(THREE.DynamicDrawUsage));
  gScia.setAttribute('color', new THREE.BufferAttribute(sciaCol, 3).setUsage(THREE.DynamicDrawUsage));
  const linee = new THREE.LineSegments(gScia, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }));
  linee.frustumCulled = false;
  scene.add(linee, punti);

  let prossima = 0;
  function emetti(p, quante, forza = 1) {
    for (let k = 0; k < quante; k++) {
      const i = prossima;
      prossima = (prossima + 1) % n;
      pos[i * 3] = p.x + casuale(-0.01, 0.01);
      pos[i * 3 + 1] = p.y + casuale(-0.005, 0.01);
      pos[i * 3 + 2] = p.z + casuale(-0.01, 0.01);
      const ang = casuale(0, Math.PI * 2);
      const ap = casuale(0.2, 1.25) * forza;
      vel[i * 3] = Math.cos(ang) * ap;
      vel[i * 3 + 1] = casuale(0.35, 2.1) * forza;
      vel[i * 3 + 2] = Math.sin(ang) * ap * 0.7 + 0.35 * forza;
      vita[i] = 0;
      durata[i] = casuale(0.32, 0.9);
    }
  }
  function aggiorna(dt, rimbalzo) {
    const g = 7.5;
    for (let i = 0; i < n; i++) {
      const j = i * 3;
      if (vita[i] < 0) { aVita[i] = -1; scia[i * 6 + 1] = scia[i * 6 + 4] = -50; continue; }
      vita[i] += dt / durata[i];
      if (vita[i] >= 1) { vita[i] = -1; aVita[i] = -1; pos[j + 1] = -50; continue; }
      vel[j + 1] -= g * dt;
      vel[j] *= 1 - 0.6 * dt;
      vel[j + 2] *= 1 - 0.6 * dt;
      pos[j] += vel[j] * dt;
      pos[j + 1] += vel[j + 1] * dt;
      pos[j + 2] += vel[j + 2] * dt;
      if (rimbalzo && rimbalzo(pos[j], pos[j + 1], pos[j + 2]) && vel[j + 1] < 0) {
        pos[j + 1] = 0.002;
        vel[j + 1] *= -0.32;
        vel[j] *= 0.55;
        vel[j + 2] *= 0.55;
      }
      aVita[i] = vita[i];
      const k = i * 6;
      const lungo = 0.032;
      scia[k] = pos[j]; scia[k + 1] = pos[j + 1]; scia[k + 2] = pos[j + 2];
      scia[k + 3] = pos[j] - vel[j] * lungo; scia[k + 4] = pos[j + 1] - vel[j + 1] * lungo; scia[k + 5] = pos[j + 2] - vel[j + 2] * lungo;
      const f = (1 - vita[i]) * 1.6;
      sciaCol[k] = 1.0 * f; sciaCol[k + 1] = 0.72 * f; sciaCol[k + 2] = 0.35 * f;
      sciaCol[k + 3] = 0; sciaCol[k + 4] = 0; sciaCol[k + 5] = 0;
    }
    gPunti.attributes.position.needsUpdate = true;
    gPunti.attributes.aVita.needsUpdate = true;
    gScia.attributes.position.needsUpdate = true;
    gScia.attributes.color.needsUpdate = true;
  }
  return { emetti, aggiorna, matPunti };
}

function adatta(renderer, camera, el, extra) {
  const w = Math.max(1, el.clientWidth);
  const h = Math.max(1, el.clientHeight);
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  if (extra) extra(w, h);
}

// Distanza della camera perché una sfera di raggio R stia nell'inquadratura
function distanzaPer(camera, R) {
  const v = THREE.MathUtils.degToRad(camera.fov);
  const o = 2 * Math.atan(Math.tan(v / 2) * camera.aspect);
  return R / Math.sin(Math.min(v, o) / 2);
}

/* ------------------------------------------------------------------ */
/* 1. Il marchio costruito                                             */
/* ------------------------------------------------------------------ */
export async function avviaMarchio(canvas, { ridotto = false } = {}) {
  const tavola = canvas.parentElement;
  const renderer = creaRenderer(canvas);
  renderer.localClippingEnabled = true;
  const scene = new THREE.Scene();
  scene.environment = ambiente(renderer);
  scene.environmentIntensity = 0.8;
  const camera = new THREE.PerspectiveCamera(eMobile() ? 34 : 30, 1, 0.5, 40);

  const sole = new THREE.DirectionalLight(0xfff3e6, 1.65);
  sole.position.set(-2.6, 4.6, 4.2);
  scene.add(sole, new THREE.HemisphereLight(0xf2f5f7, 0x8f8a82, 0.4));
  const luceSaldatura = new THREE.PointLight(0xffa24e, 0, 2.4, 2);
  scene.add(luceSaldatura);

  const taglioMuro = new THREE.Plane(new THREE.Vector3(0, -1, 0), -1);
  const taglioFinestra = new THREE.Plane(new THREE.Vector3(0, -1, 0), -1);
  const M = {
    muro: new THREE.MeshStandardMaterial({ color: '#F3EFE9', roughness: 0.93, clippingPlanes: [taglioMuro] }),
    pietra: new THREE.MeshStandardMaterial({ color: '#CFC9BF', roughness: 0.84, clippingPlanes: [taglioMuro] }),
    ferro: new THREE.MeshStandardMaterial({ color: '#383E42', metalness: 0.55, roughness: 0.36 }),
    anta: new THREE.MeshStandardMaterial({ color: '#3B4145', metalness: 0.45, roughness: 0.4, clippingPlanes: [taglioMuro] }),
    alluminio: new THREE.MeshStandardMaterial({ color: '#41474B', metalness: 0.62, roughness: 0.3, clippingPlanes: [taglioFinestra] }),
    vetro: new THREE.MeshStandardMaterial({ color: '#B9CBD0', metalness: 0.15, roughness: 0.04, transparent: true, opacity: 0.3, clippingPlanes: [taglioFinestra] }),
    arancio: new THREE.MeshStandardMaterial({ color: '#EC6622', metalness: 0.12, roughness: 0.45, clippingPlanes: [taglioMuro] }),
  };

  const LUCE_W = 1.24;
  const LUCE_H = 2.14;
  const MURO_D = 0.26;
  const ALTO = 2.82;
  const LARGO = 1.52;

  // Muro con la luce della portafinestra
  const facciata = new THREE.Group();
  scene.add(facciata);
  const lato = LARGO - LUCE_W / 2;
  facciata.add(
    scatola(lato, ALTO + 0.12, MURO_D, M.muro, -(LUCE_W / 2 + lato / 2), (ALTO - 0.12) / 2, -MURO_D / 2),
    scatola(lato, ALTO + 0.12, MURO_D, M.muro, LUCE_W / 2 + lato / 2, (ALTO - 0.12) / 2, -MURO_D / 2),
    scatola(LUCE_W, ALTO - LUCE_H, MURO_D, M.muro, 0, LUCE_H + (ALTO - LUCE_H) / 2, -MURO_D / 2),
  );
  // Contorni in pietra della portafinestra, come nelle case venete
  facciata.add(
    scatola(0.11, LUCE_H + 0.11, 0.035, M.pietra, -(LUCE_W / 2 + 0.055), (LUCE_H + 0.11) / 2, 0.0175),
    scatola(0.11, LUCE_H + 0.11, 0.035, M.pietra, LUCE_W / 2 + 0.055, (LUCE_H + 0.11) / 2, 0.0175),
    scatola(LUCE_W + 0.3, 0.12, 0.05, M.pietra, 0, LUCE_H + 0.06, 0.025),
  );
  // Interno caldo dietro il vetro
  const calda = texturaRadiale([[0, '#FFE6BC'], [0.45, '#F0A55F'], [1, '#4E3426']], 128, 256);
  const interno = new THREE.Mesh(new THREE.PlaneGeometry(2.8, 2.9), new THREE.MeshBasicMaterial({ map: calda, toneMapped: false, clippingPlanes: [taglioMuro] }));
  interno.position.set(0, 1.15, -0.62);
  interno.material.color.setScalar(0.1);
  facciata.add(interno);
  // Pavimento interno, così di sbieco non si vede il vuoto
  facciata.add(scatola(LUCE_W + 0.6, 0.02, 0.6, M.pietra, 0, -0.01, -0.5));

  // Soletta del balcone a bovindo
  const soletta = new THREE.Shape([
    new THREE.Vector2(-1.14, 0.12), new THREE.Vector2(-1.14, 0), new THREE.Vector2(-0.88, -0.82),
    new THREE.Vector2(0.88, -0.82), new THREE.Vector2(1.14, 0), new THREE.Vector2(1.14, 0.12),
  ]);
  const gSoletta = new THREE.ExtrudeGeometry(soletta, { depth: 0.13, bevelEnabled: true, bevelThickness: 0.012, bevelSize: 0.012, bevelSegments: 2 });
  gSoletta.rotateX(-Math.PI / 2);
  const mSoletta = new THREE.Mesh(gSoletta, M.pietra);
  mSoletta.position.y = -0.13;
  facciata.add(mSoletta);

  const ombraTerra = ombra(4.6, 2.6, 0.32);
  ombraTerra.position.set(0, -0.62, 0.2);
  ombraTerra.material.opacity = 0;
  scene.add(ombraTerra);

  // Serramento in alluminio dentro la luce
  const finestra = new THREE.Group();
  finestra.position.z = -0.1;
  facciata.add(finestra);
  const P = 0.065;
  finestra.add(
    scatola(P, LUCE_H, 0.07, M.alluminio, -LUCE_W / 2 + P / 2, LUCE_H / 2, 0),
    scatola(P, LUCE_H, 0.07, M.alluminio, LUCE_W / 2 - P / 2, LUCE_H / 2, 0),
    scatola(LUCE_W, P, 0.07, M.alluminio, 0, LUCE_H - P / 2, 0),
    scatola(LUCE_W, 0.04, 0.07, M.alluminio, 0, 0.02, 0),
    scatola(0.085, LUCE_H - 0.1, 0.07, M.alluminio, 0, LUCE_H / 2, 0),
    scatola(LUCE_W - 0.14, LUCE_H - 0.12, 0.012, M.vetro, 0, LUCE_H / 2, 0),
  );

  // Ante con la C
  const gC = new THREE.ExtrudeGeometry(formaC(0.34, 0.86, 0.088, 0.13), { depth: 0.018, bevelEnabled: true, bevelThickness: 0.004, bevelSize: 0.004, bevelSegments: 2, curveSegments: 6 });
  gC.center();
  const ante = [-1, 1].map((lato) => {
    const perno = new THREE.Group();
    perno.position.set(lato * LUCE_W / 2, 0, 0.032);
    const pannello = scatola(LUCE_W / 2 - 0.012, LUCE_H - 0.02, 0.04, M.anta, -lato * (LUCE_W / 4 - 0.006), LUCE_H / 2, 0.02);
    const bordo = new THREE.Group();
    const lw = LUCE_W / 2 - 0.012;
    const cx = -lato * (LUCE_W / 4 - 0.006);
    bordo.add(
      scatola(lw, 0.035, 0.012, M.anta, cx, LUCE_H - 0.05, 0.046),
      scatola(lw, 0.035, 0.012, M.anta, cx, 0.04, 0.046),
      scatola(0.035, LUCE_H - 0.1, 0.012, M.anta, cx - lw / 2 + 0.0175, LUCE_H / 2, 0.046),
      scatola(0.035, LUCE_H - 0.1, 0.012, M.anta, cx + lw / 2 - 0.0175, LUCE_H / 2, 0.046),
    );
    const c = new THREE.Mesh(gC, M.arancio);
    c.position.set(cx, LUCE_H * 0.56, 0.054);
    perno.add(pannello, bordo, c);
    facciata.add(perno);
    return { perno, lato };
  });
  const angoloAnte = (a) => { ante.forEach(({ perno, lato }) => { perno.rotation.y = lato < 0 ? -a : a; }); };

  // Parapetto a bovindo
  const vertici = [[-1.07, 0.0], [-0.83, 0.75], [0.83, 0.75], [1.07, 0.0]].map(([x, z]) => new THREE.Vector3(x, 0, z));
  const ringhiera = new THREE.Group();
  scene.add(ringhiera);
  const ALT_R = 1.0;
  const tratti = [];
  for (let i = 0; i < 3; i++) {
    const a = vertici[i];
    const b = vertici[i + 1];
    const d = new THREE.Vector3().subVectors(b, a);
    tratti.push({ a, b, L: d.length(), ang: Math.atan2(d.z, d.x), dir: d.normalize() });
  }
  const binario = (w, h, L) => { const g = new THREE.BoxGeometry(L, h, w); g.translate(L / 2, 0, 0); return g; };
  const corrimano = tratti.map((t) => {
    const m = new THREE.Mesh(binario(0.07, 0.024, t.L), M.ferro);
    m.position.set(t.a.x, ALT_R - 0.012, t.a.z);
    m.rotation.y = -t.ang;
    m.scale.x = 0.0001;
    ringhiera.add(m);
    return m;
  });
  const traversoBasso = tratti.map((t) => {
    const m = new THREE.Mesh(binario(0.04, 0.022, t.L), M.ferro);
    m.position.set(t.a.x, 0.1, t.a.z);
    m.rotation.y = -t.ang;
    m.scale.x = 0.0001;
    ringhiera.add(m);
    return m;
  });
  // Bacchette e montanti come istanze, in ordine lungo il percorso
  const basi = [];
  vertici.forEach((v, i) => {
    basi.push({ p: v, r: 1.9 });
    if (i < 3) {
      const t = tratti[i];
      const n = Math.max(2, Math.round(t.L / 0.098));
      for (let k = 1; k < n; k++) basi.push({ p: new THREE.Vector3().copy(t.a).addScaledVector(t.dir, (t.L * k) / n), r: 1 });
    }
  });
  const gBarra = new THREE.CylinderGeometry(0.0085, 0.0085, 1, 8);
  gBarra.translate(0, 0.5, 0);
  const barre = new THREE.InstancedMesh(gBarra, M.ferro, basi.length);
  barre.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  ringhiera.add(barre);
  const mx = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const sc = new THREE.Vector3();
  const nato = new Array(basi.length).fill(false);
  const posaBarre = (t) => {
    basi.forEach((b, i) => {
      const t0 = 0.3 + i * 0.021;
      const k = esce(fase(t, t0, t0 + 0.3));
      sc.set(b.r, Math.max(0.0001, k * (ALT_R - 0.01)), b.r);
      mx.compose(b.p, q, sc);
      barre.setMatrixAt(i, mx);
    });
    barre.instanceMatrix.needsUpdate = true;
  };

  const scintille = creaScintille(scene, eMobile() ? 220 : 320);
  const sullaSoletta = (x, y, z) => y < 0 && z > -0.05 && z < 0.82 && Math.abs(x) < 1.12 - Math.max(0, z) * 0.32;
  const testa = new THREE.Vector3();

  // Camera
  const bersaglio = new THREE.Vector3(0, 1.22, 0.2);
  let distanza = 6;
  const posa = (yaw, beccheggio, zoom) => {
    camera.position.set(
      bersaglio.x + Math.sin(yaw) * Math.cos(beccheggio) * distanza * zoom,
      bersaglio.y + Math.sin(beccheggio) * distanza * zoom,
      bersaglio.z + Math.cos(yaw) * Math.cos(beccheggio) * distanza * zoom,
    );
    camera.lookAt(bersaglio);
  };
  const ridimensiona = () => adatta(renderer, camera, tavola, (w, h) => {
    distanza = distanzaPer(camera, eMobile() ? 1.68 : 1.62);
    scintille.matPunti.uniforms.uScala.value = (0.026 * h * renderer.getPixelRatio()) / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2));
  });
  ridimensiona();
  new ResizeObserver(ridimensiona).observe(tavola);

  // Stato della scena al tempo t (secondi dall'inizio dell'intro)
  let ultimo = 0;
  let saldatura = 0;
  function stato(t, dt) {
    taglioMuro.constant = -0.2 + esceForte(fase(t, 0, 0.75)) * 3.2;
    taglioFinestra.constant = -0.2 + esce(fase(t, 0.45, 1.15)) * 2.5;
    ombraTerra.material.opacity = esce(fase(t, 0.1, 0.8));

    posaBarre(t);
    basi.forEach((b, i) => {
      if (!nato[i] && t >= 0.3 + i * 0.021) {
        nato[i] = true;
        if (!ridotto && dt > 0) scintille.emetti(new THREE.Vector3(b.p.x, 0.04, b.p.z), 4, 0.55);
      }
    });
    traversoBasso.forEach((m, i) => { m.scale.x = Math.max(0.0001, esce(fase(t, 0.32 + i * 0.16, 0.62 + i * 0.22))); });

    // Saldatura del corrimano, tratto per tratto
    const tempi = [[1.0, 1.24], [1.24, 1.74], [1.74, 1.98]];
    let attivo = -1;
    corrimano.forEach((m, i) => {
      const k = fase(t, tempi[i][0], tempi[i][1]);
      m.scale.x = Math.max(0.0001, k);
      if (k > 0 && k < 1) attivo = i;
    });
    if (attivo >= 0 && !ridotto) {
      const tr = tratti[attivo];
      testa.copy(tr.a).addScaledVector(tr.dir, tr.L * corrimano[attivo].scale.x);
      testa.y = ALT_R;
      if (dt > 0) {
        saldatura += dt * 260;
        const quante = Math.floor(saldatura);
        saldatura -= quante;
        scintille.emetti(testa, quante, 1);
      }
      luceSaldatura.position.copy(testa).add(new THREE.Vector3(0, 0.05, 0.08));
      luceSaldatura.intensity = 2.6 + Math.sin(t * 90) * 0.9 + Math.sin(t * 37) * 0.6;
    } else {
      luceSaldatura.intensity *= 0.82;
    }

    // Ante: aperte contro il muro, si chiudono sul marchio, poi si aprono
    let a = Math.PI * 0.94;
    if (t >= 1.25) a = Math.PI * 0.94 * (1 - dentroFuori(fase(t, 1.25, 2.0)));
    if (t >= 2.35) a = THREE.MathUtils.degToRad(38) * molla(fase(t, 2.35, 3.25));
    angoloAnte(a);
    const k = 0.1 + 0.9 * esce(fase(t, 2.35, 3.1));
    interno.material.color.setScalar(k);

    if (dt > 0) scintille.aggiorna(Math.min(dt, 1 / 30), sullaSoletta);
  }

  // Solo su desktop il mouse aggiunge un filo di rotazione; telefono e video non ce l'hanno
  const mouse = { x: 0, y: 0, sx: 0, sy: 0 };
  if (matchMedia('(hover: hover) and (pointer: fine)').matches && !ridotto) {
    addEventListener('pointermove', (e) => { mouse.x = e.clientX / innerWidth - 0.5; mouse.y = e.clientY / innerHeight - 0.5; }, { passive: true });
  }

  let t0 = 0;
  function disegna(ora) {
    const t = ridotto ? 12 : (ora - t0) / 1000;
    const dt = ultimo ? (ora - ultimo) / 1000 : 0;
    ultimo = ora;
    stato(t, ridotto ? 0 : dt);
    const scorri = clamp(scrollY / Math.max(1, innerHeight));
    const intro = dentroFuori(fase(t, 0, 3.3));
    const segui = 1 - Math.exp(-Math.min(dt, 0.1) * 4);
    mouse.sx += (mouse.x - mouse.sx) * segui;
    mouse.sy += (mouse.y - mouse.sy) * segui;
    const yaw = 0.04 + 0.18 * intro + (ridotto ? 0 : Math.sin(t * 0.32) * 0.07 * fase(t, 3.2, 5)) + scorri * 0.42 + mouse.sx * 0.22;
    const becc = 0.15 + scorri * 0.12 + mouse.sy * 0.08;
    posa(yaw, becc, 1.14 - 0.14 * intro);
    renderer.render(scene, camera);
  }

  // Pre-compila i materiali, poi parte l'orologio: la spinta iniziale si vede tutta
  stato(0, 0);
  posa(0.16, 0.15, 1.14);
  await renderer.compileAsync(scene, camera);
  renderer.render(scene, camera);
  tavola.classList.add('pronta');
  t0 = performance.now() + 120;

  if (ridotto) {
    disegna(performance.now());
    new ResizeObserver(() => disegna(performance.now())).observe(tavola);
    return;
  }
  ciclo(tavola, disegna);
}

/* ------------------------------------------------------------------ */
/* 2. Il cancello del configuratore                                    */
/* ------------------------------------------------------------------ */
const COLORI = {
  '7016': { c: '#383E42', m: 0.32, r: 0.42 },
  '9005': { c: '#0E0E10', m: 0.3, r: 0.36 },
  micaceo: { c: '#56585B', m: 0.66, r: 0.58 },
  '8017': { c: '#45322E', m: 0.28, r: 0.44 },
  '6005': { c: '#1F3A2D', m: 0.28, r: 0.44 },
  '3003': { c: '#8E1C24', m: 0.25, r: 0.42 },
  '7035': { c: '#C5C7C4', m: 0.22, r: 0.45 },
  '9016': { c: '#F1F0EA', m: 0.12, r: 0.42 },
};

export async function avviaCancello(contenitore, { ridotto = false, stato = { stile: 'doghe', colore: '7016', aperto: false } } = {}) {
  const canvas = contenitore.querySelector('canvas');
  const renderer = creaRenderer(canvas);
  const scene = new THREE.Scene();
  scene.environment = ambiente(renderer);
  scene.environmentIntensity = 0.8;
  const camera = new THREE.PerspectiveCamera(eMobile() ? 34 : 30, 1, 0.5, 60);

  const sole = new THREE.DirectionalLight(0xfff4ea, 1.45);
  sole.position.set(-3, 5.5, 4.5);
  scene.add(sole, new THREE.HemisphereLight(0xf4f6f7, 0x8d8a84, 0.45));

  const vernice = new THREE.MeshStandardMaterial({ color: COLORI['7016'].c, metalness: 0.32, roughness: 0.42 });
  const zinco = new THREE.MeshStandardMaterial({ color: '#AEB4B7', metalness: 1, roughness: 0.34 });
  const pietra = new THREE.MeshStandardMaterial({ color: '#8C877F', roughness: 0.95, envMapIntensity: 0.6 });
  const colTarget = new THREE.Color(COLORI['7016'].c);
  let metTarget = COLORI['7016'].m;
  let rugTarget = COLORI['7016'].r;

  // Terra che sfuma nel fondo della sezione
  const alfa = document.createElement('canvas');
  alfa.width = alfa.height = 256;
  const ax = alfa.getContext('2d');
  const ag = ax.createRadialGradient(128, 128, 20, 128, 128, 128);
  ag.addColorStop(0, '#fff'); ag.addColorStop(0.55, '#bbb'); ag.addColorStop(1, '#000');
  ax.fillStyle = ag; ax.fillRect(0, 0, 256, 256);
  const terra = new THREE.Mesh(new THREE.PlaneGeometry(13, 9), new THREE.MeshStandardMaterial({ color: '#D9DCDB', roughness: 0.96, alphaMap: new THREE.CanvasTexture(alfa), transparent: true, depthWrite: false }));
  terra.rotation.x = -Math.PI / 2;
  terra.position.set(-0.6, 0, 0.6);
  terra.renderOrder = -2;
  scene.add(terra);

  const W = 3.4;
  const H = 1.55;
  const PR = 0.06;

  // Pilastri in pietra con cappello
  const pilastri = new THREE.Group();
  [-1, 1].forEach((s) => {
    const x = s * (W / 2 + 0.23);
    pilastri.add(scatola(0.44, 1.95, 0.44, pietra, x, 0.975, 0), scatola(0.54, 0.07, 0.54, pietra, x, 1.985, 0));
    const om = ombra(1.0, 1.0, 0.4);
    om.position.set(x, 0.003, 0.05);
    pilastri.add(om);
  });
  scene.add(pilastri);

  // Binario per gli scorrevoli
  const binario = new THREE.Group();
  binario.add(scatola(W * 2.3, 0.025, 0.05, zinco, -W * 0.55 + 0.1, 0.0125, -0.36));
  scene.add(binario);

  // Targhetta CE sul cancello
  const tc = document.createElement('canvas');
  tc.width = 192; tc.height = 120;
  const tx = tc.getContext('2d');
  const tg = tx.createLinearGradient(0, 0, 0, 120);
  tg.addColorStop(0, '#E9ECEC'); tg.addColorStop(1, '#BFC6C8');
  tx.fillStyle = tg; tx.fillRect(0, 0, 192, 120);
  tx.fillStyle = '#2A2F32';
  tx.font = '700 46px Arial'; tx.fillText('CE', 120, 104);
  tx.font = '700 15px Arial'; tx.fillText('CADORIN', 12, 26); tx.fillText('CARPENTERIE', 12, 44);
  for (let i = 0; i < 4; i++) tx.fillRect(12, 60 + i * 13, 88 - i * 12, 4);
  const texTarga = new THREE.CanvasTexture(tc);
  texTarga.colorSpace = THREE.SRGBColorSpace;
  const matTarga = new THREE.MeshStandardMaterial({ map: texTarga, metalness: 0.5, roughness: 0.35 });

  const telaio = (g, w, h) => {
    g.add(
      scatola(w, PR, PR, vernice, 0, PR / 2, 0),
      scatola(w, PR, PR, vernice, 0, h - PR / 2, 0),
      scatola(PR, h, PR, vernice, -w / 2 + PR / 2, h / 2, 0),
      scatola(PR, h, PR, vernice, w / 2 - PR / 2, h / 2, 0),
    );
  };
  const targa = (g, x, y) => { const m = scatola(0.16, 0.1, 0.006, matTarga, x, y, PR / 2 + 0.004); g.add(m); };

  function costruisciDoghe() {
    const g = new THREE.Group();
    telaio(g, W, H);
    const hS = 0.1;
    const gap = 0.026;
    const y0 = PR + 0.02;
    const y1 = H - PR - 0.02;
    const n = Math.floor((y1 - y0 + gap) / (hS + gap));
    const resto = y1 - y0 - (n * hS + (n - 1) * gap);
    for (let i = 0; i < n; i++) g.add(scatola(W - PR * 2, hS, 0.024, vernice, 0, y0 + resto / 2 + hS / 2 + i * (hS + gap), 0));
    targa(g, W / 2 - 0.26, 0.2);
    return g;
  }

  function costruisciDiagonale() {
    const g = new THREE.Group();
    telaio(g, W, H);
    g.add(scatola(PR, H, PR, vernice, 0, H / 2, 0));
    const w = 0.085;
    const passo = 0.13 * Math.SQRT2;
    const pannelli = [[-W / 2 + PR, -PR / 2, 1], [PR / 2, W / 2 - PR, -1]];
    pannelli.forEach(([x0, x1, s]) => {
      const y0 = PR;
      const y1 = H - PR;
      const cMin = s > 0 ? y0 - x1 : y0 + x0;
      const cMax = s > 0 ? y1 - x0 : y1 + x1;
      for (let c = cMin + passo / 2; c < cMax; c += passo) {
        // tratto della retta y = s*x + c dentro il rettangolo
        let xa = (y0 - c) / s;
        let xb = (y1 - c) / s;
        if (xa > xb) [xa, xb] = [xb, xa];
        xa = Math.max(xa, x0);
        xb = Math.min(xb, x1);
        if (xb - xa < 0.02) continue;
        const L = (xb - xa) * Math.SQRT2 - w;
        if (L < 0.05) continue;
        const xm = (xa + xb) / 2;
        const m = scatola(L, w, 0.022, vernice, xm, s * xm + c, 0);
        m.rotation.z = s * Math.PI / 4;
        g.add(m);
      }
    });
    targa(g, W / 2 - 0.26, 0.2);
    return g;
  }

  const ARCO = 0.3;
  const cima = (gx) => H + ARCO * (1 - Math.pow(gx / (W / 2), 2));
  function antaClassica(s) {
    // s = -1 anta sinistra (cerniera a sinistra), +1 anta destra (specchiata)
    const anta = new THREE.Group();
    anta.position.x = s * (W / 2);
    anta.scale.x = -s;
    const lw = W / 2 - 0.01;
    const gx = (lx) => s * (W / 2 - lx);
    anta.add(
      scatola(PR, cima(gx(0)), PR, vernice, PR / 2, cima(gx(0)) / 2, 0),
      scatola(0.07, cima(gx(lw)) + 0.02, 0.07, vernice, lw - 0.035, (cima(gx(lw)) + 0.02) / 2, 0),
      scatola(lw, PR, PR, vernice, lw / 2, PR / 2, 0),
      scatola(lw, 0.045, 0.045, vernice, lw / 2, 0.44, 0),
      scatola(lw, 0.035, 0.035, vernice, lw / 2, 0.16, 0),
    );
    const punti = [];
    for (let i = 0; i <= 24; i++) { const lx = (lw * i) / 24; punti.push(new THREE.Vector3(lx, cima(gx(lx)), 0)); }
    anta.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(punti), 32, 0.026, 8, false), vernice));
    const xs = [];
    for (let lx = 0.13; lx < lw - 0.08; lx += 0.115) xs.push(lx);
    const gB = new THREE.CylinderGeometry(0.011, 0.011, 1, 8);
    gB.translate(0, 0.5, 0);
    const barre = new THREE.InstancedMesh(gB, vernice, xs.length);
    const lance = new THREE.InstancedMesh(new THREE.ConeGeometry(0.03, 0.11, 6), vernice, xs.length);
    const anelli = new THREE.InstancedMesh(new THREE.TorusGeometry(0.052, 0.009, 8, 22), vernice, Math.max(0, xs.length - 1));
    const m = new THREE.Matrix4();
    xs.forEach((lx, i) => {
      const alto = cima(gx(lx)) + 0.12;
      m.compose(new THREE.Vector3(lx, PR, 0), new THREE.Quaternion(), new THREE.Vector3(1, alto - PR, 1));
      barre.setMatrixAt(i, m);
      m.compose(new THREE.Vector3(lx, alto + 0.05, 0), new THREE.Quaternion(), new THREE.Vector3(1, 1, 1));
      lance.setMatrixAt(i, m);
      if (i < xs.length - 1) {
        m.compose(new THREE.Vector3(lx + 0.0575, 0.3, 0), new THREE.Quaternion(), new THREE.Vector3(1, 1, 1));
        anelli.setMatrixAt(i, m);
      }
    });
    anta.add(barre, lance, anelli);
    const om = ombra(lw * 1.1, 0.7, 0.42);
    om.position.set(lw / 2, 0.003, 0);
    anta.add(om);
    return anta;
  }
  function costruisciClassico() {
    const g = new THREE.Group();
    const sx = antaClassica(-1);
    const dx = antaClassica(1);
    g.add(sx, dx);
    g.userData.ante = [sx, dx];
    return g;
  }

  const costruttori = { doghe: costruisciDoghe, diagonale: costruisciDiagonale, classico: costruisciClassico };
  let cancello = null;
  let ombraCancello = null;
  let stileAttuale = '';
  let nascita = 0;
  let apertura = stato.aperto ? 1 : 0;

  function monta(stile, ora) {
    if (cancello) {
      scene.remove(cancello);
      cancello.traverse((o) => { if (o.geometry) o.geometry.dispose(); });
    }
    stileAttuale = stile;
    const radice = new THREE.Group();
    const corpo = costruttori[stile]();
    radice.add(corpo);
    radice.userData.corpo = corpo;
    if (stile === 'classico') {
      radice.position.set(0, 0, 0);
    } else {
      corpo.position.y = 0.06;
      radice.position.z = -0.36;
      [-1, 1].forEach((s) => {
        const ruota = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.04, 16), zinco);
        ruota.rotation.x = Math.PI / 2;
        ruota.position.set(s * W * 0.32, 0.05, 0);
        radice.add(ruota);
      });
      ombraCancello = ombra(W * 1.08, 0.8, 0.45);
      ombraCancello.position.y = 0.004;
      radice.add(ombraCancello);
    }
    scene.add(radice);
    cancello = radice;
    nascita = ora;
  }

  const bersaglio = new THREE.Vector3(-0.15, 0.95, -0.1);
  let distanza = 8;
  const ridimensiona = () => adatta(renderer, camera, contenitore, () => { distanza = distanzaPer(camera, 2.2); });
  ridimensiona();
  new ResizeObserver(ridimensiona).observe(contenitore);

  function applica(s) {
    if (COLORI[s.colore]) {
      colTarget.set(COLORI[s.colore].c);
      metTarget = COLORI[s.colore].m;
      rugTarget = COLORI[s.colore].r;
    }
    if (s.stile !== stileAttuale) monta(s.stile, performance.now());
    stato = s;
  }
  document.addEventListener('cancello', (e) => {
    applica(e.detail);
    if (ridotto) disegna(performance.now());
  });

  let ultimo = 0;
  let tInizio = 0;
  function disegna(ora) {
    const dt = ultimo ? Math.min((ora - ultimo) / 1000, 1 / 20) : 1;
    ultimo = ora;
    const t = (ora - tInizio) / 1000;
    const k = ridotto ? 1 : 1 - Math.exp(-dt * 7);
    vernice.color.lerp(colTarget, k);
    vernice.metalness += (metTarget - vernice.metalness) * k;
    vernice.roughness += (rugTarget - vernice.roughness) * k;

    const voluta = stato.aperto ? 1 : 0;
    apertura += (voluta - apertura) * (ridotto ? 1 : 1 - Math.exp(-dt * 2.6));
    const a = dentroFuori(clamp(apertura));
    if (stileAttuale === 'classico') {
      const [sx, dx] = cancello.userData.corpo.userData.ante;
      const ang = THREE.MathUtils.degToRad(78) * a;
      sx.rotation.y = ang;
      dx.rotation.y = -ang;
    } else {
      cancello.position.x = -W * 0.94 * a;
    }
    binario.visible = stileAttuale !== 'classico';

    // Il nuovo cancello sale dal basso quando cambi stile
    const crescita = ridotto ? 1 : molla(fase(ora, nascita, nascita + 600));
    cancello.userData.corpo.scale.y = Math.max(0.001, crescita);

    const scorri = clamp(1 - contenitore.getBoundingClientRect().top / Math.max(1, innerHeight));
    const yaw = 0.52 + (ridotto ? 0 : Math.sin(t * 0.3) * 0.08) - scorri * 0.22 + a * 0.08;
    const becc = 0.2 + scorri * 0.04;
    bersaglio.x = -0.15 - a * (stileAttuale === 'classico' ? 0 : 0.7);
    camera.position.set(
      bersaglio.x + Math.sin(yaw) * Math.cos(becc) * distanza,
      bersaglio.y + Math.sin(becc) * distanza,
      bersaglio.z + Math.cos(yaw) * Math.cos(becc) * distanza,
    );
    camera.lookAt(bersaglio);
    renderer.render(scene, camera);
  }

  monta(stato.stile, performance.now() - 2000);
  applica(stato);
  vernice.color.copy(colTarget);
  await renderer.compileAsync(scene, camera);
  tInizio = performance.now();
  disegna(performance.now());
  contenitore.classList.add('attiva');
  if (ridotto) {
    new ResizeObserver(() => disegna(performance.now())).observe(contenitore);
    return;
  }
  ciclo(contenitore, disegna);
}
