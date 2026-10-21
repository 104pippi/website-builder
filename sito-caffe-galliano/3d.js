/* Caffè Galliano: scene 3D (chicchi nell'hero, tamburo della tostatrice). Caricato da script.js dopo il load. */
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const mobile = matchMedia('(max-width: 760px)').matches;
const ridotto = matchMedia('(prefers-reduced-motion: reduce)').matches;
const pixel = Math.min(window.devicePixelRatio || 1, mobile ? 1.5 : 2);
const liscia = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const casuale = (a, b) => a + Math.random() * (b - a);

/* Chicco di caffè: ellissoide con la faccia piatta e il solco a S */
function geometriaChicco(seg) {
  const g = new THREE.SphereGeometry(1, seg, Math.round(seg * 0.7));
  const pos = g.attributes.position;
  const col = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) {
    let x = pos.getX(i);
    const y = pos.getY(i);
    let z = pos.getZ(i);
    const piatto = z > 0;
    x *= 0.74 * (1 + 0.05 * y);
    z *= piatto ? 0.28 : 0.58;
    let scuro = 0;
    if (piatto) {
      const centro = 0.07 * Math.sin(y * 2.3);
      const dx = x - centro;
      const lungo = Math.max(0, 1 - Math.pow(Math.abs(y), 2.6));
      const s = Math.exp(-(dx * dx) / 0.013) * lungo;
      z -= s * 0.19;
      scuro = s;
    }
    pos.setXYZ(i, x, y, z);
    const c = 1 - scuro * 0.72;
    col[i * 3] = c; col[i * 3 + 1] = c * 0.96; col[i * 3 + 2] = c * 0.92;
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g.computeVertexNormals();
  return g;
}

function ambiente(renderer, scene, intensita) {
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = intensita;
  pmrem.dispose();
}

/* Loop che si ferma fuori schermo e con la scheda nascosta */
function cicloSu(elemento, passo) {
  let inVista = false;
  let gira = false;
  const giro = () => {
    if (!inVista || document.hidden) { gira = false; return; }
    requestAnimationFrame(giro);
    passo(performance.now());
  };
  const riparti = () => { if (!gira && inVista && !document.hidden) { gira = true; requestAnimationFrame(giro); } };
  new IntersectionObserver(v => { inVista = v[0].isIntersecting; riparti(); }, { rootMargin: '120px 0px' }).observe(elemento);
  document.addEventListener('visibilitychange', riparti);
  return riparti;
}

/* ================= HERO: chicchi tostati che cadono in profondità ================= */
async function hero() {
  const canvas = document.querySelector('.hero__chicchi');
  if (!canvas) return;
  const sezione = canvas.closest('.hero');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(pixel);
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 1.05;
  const scene = new THREE.Scene();
  ambiente(renderer, scene, 0.55);
  scene.fog = new THREE.Fog(0x1d130d, 10, 24);
  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 60);
  camera.position.set(0, 0, 12);

  const luce = new THREE.DirectionalLight(0xffe4c4, 3.2);
  luce.position.set(-4, 6, 7);
  const controluce = new THREE.DirectionalLight(0xffa860, 2.4);
  controluce.position.set(6, 1, -3);
  scene.add(luce, controluce, new THREE.HemisphereLight(0xffe8d0, 0x1a0e08, 0.35));

  const N = mobile ? 16 : 30;
  const materiale = new THREE.MeshPhysicalMaterial({
    color: 0x55301a, vertexColors: true, roughness: 0.36, metalness: 0,
    clearcoat: 0.75, clearcoatRoughness: 0.28,
  });
  const chicchi = new THREE.InstancedMesh(geometriaChicco(56), materiale, N);
  chicchi.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  chicchi.frustumCulled = false;
  scene.add(chicchi);

  const tan = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
  const semiAltezza = z => tan * (camera.position.z - z);
  const dati = [];
  const tinta = new THREE.Color();
  for (let i = 0; i < N; i++) {
    const z = casuale(-8, 3);
    const hh = semiAltezza(z);
    dati.push({
      z, y: casuale(-hh, hh * 1.4), xr: casuale(-1, 1),
      vel: casuale(0.5, 0.95), scala: casuale(0.24, 0.34),
      rx: casuale(0, 6.28), ry: casuale(0, 6.28), rz: casuale(0, 6.28),
      wx: casuale(-0.9, 0.9), wy: casuale(-1.2, 1.2), wz: casuale(-0.6, 0.6),
      par: casuale(0.6, 1.2),
    });
    chicchi.setColorAt(i, tinta.setScalar(casuale(0.72, 1.12)));
  }

  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const e = new THREE.Euler();
  const p = new THREE.Vector3();
  const s = new THREE.Vector3();
  let aspetto = 1;
  const inquadra = () => {
    const w = canvas.clientWidth || innerWidth;
    const h = canvas.clientHeight || innerHeight;
    renderer.setSize(w, h, false);
    aspetto = w / h;
    camera.aspect = aspetto;
    camera.updateProjectionMatrix();
  };
  inquadra();
  new ResizeObserver(inquadra).observe(canvas);

  const puntatore = { x: 0, y: 0, tx: 0, ty: 0 };
  if (matchMedia('(hover: hover) and (pointer: fine)').matches) {
    addEventListener('pointermove', ev => {
      puntatore.tx = (ev.clientX / innerWidth - 0.5) * 2;
      puntatore.ty = (ev.clientY / innerHeight - 0.5) * 2;
    }, { passive: true });
  }

  await renderer.compileAsync(scene, camera);
  let t0 = 0;
  let prima = 0;
  const passo = ora => {
    if (!t0) { t0 = ora; prima = ora; canvas.classList.add('visibile'); }
    const dt = Math.min(0.05, (ora - prima) / 1000);
    prima = ora;
    const tempo = (ora - t0) / 1000;
    const spinta = ridotto ? 0 : 1 + 2.2 * Math.exp(-tempo / 0.7);
    const scorri = Math.min(scrollY, innerHeight * 1.2) / innerHeight;
    puntatore.x += (puntatore.tx - puntatore.x) * Math.min(1, dt * 3);
    puntatore.y += (puntatore.ty - puntatore.y) * Math.min(1, dt * 3);
    camera.position.x = puntatore.x * 0.5;
    camera.position.y = -puntatore.y * 0.35;
    camera.lookAt(0, 0, 0);
    for (let i = 0; i < N; i++) {
      const d = dati[i];
      const hh = semiAltezza(d.z);
      d.y -= d.vel * dt * spinta * (ridotto ? 0 : 1);
      if (d.y < -hh - 1.2) { d.y = hh + 1.2; d.xr = casuale(-1, 1); }
      const giro = ridotto ? 0 : tempo;
      e.set(d.rx + giro * d.wx, d.ry + giro * d.wy, d.rz + giro * d.wz);
      q.setFromEuler(e);
      p.set(d.xr * hh * aspetto * 0.98, d.y + scorri * hh * 1.1 * d.par, d.z);
      s.setScalar(d.scala);
      chicchi.setMatrixAt(i, m.compose(p, q, s));
    }
    chicchi.instanceMatrix.needsUpdate = true;
    renderer.render(scene, camera);
  };
  cicloSu(sezione, passo)();
}

/* ================= TOSTATURA: il tamburo visto dall'oblò ================= */
function textureFondo(caldo) {
  const c = document.createElement('canvas');
  c.width = c.height = 512;
  const g = c.getContext('2d');
  if (!caldo) {
    const r = g.createRadialGradient(256, 256, 20, 256, 256, 256);
    r.addColorStop(0, '#4a403a'); r.addColorStop(1, '#1d1916');
    g.fillStyle = r; g.fillRect(0, 0, 512, 512);
  }
  // lamiera forata: i fori si accendono col calore
  for (let y = 18; y < 512; y += 22) {
    for (let x = 18 + ((y / 22) % 2) * 11; x < 512; x += 22) {
      const dx = x - 256, dy = y - 256;
      const dist = Math.hypot(dx, dy);
      if (dist > 236) continue;
      g.beginPath();
      g.arc(x, y, 5.2, 0, Math.PI * 2);
      if (caldo) {
        const a = 0.95 * (1 - dist / 260);
        g.fillStyle = `rgba(255, ${Math.round(120 + 70 * (1 - dist / 260))}, 40, ${a.toFixed(3)})`;
      } else {
        g.fillStyle = '#0d0907';
      }
      g.fill();
    }
  }
  if (caldo) {
    const r = g.createRadialGradient(256, 300, 10, 256, 300, 250);
    r.addColorStop(0, 'rgba(255,150,60,0.55)'); r.addColorStop(1, 'rgba(255,90,20,0)');
    g.fillStyle = r; g.fillRect(0, 0, 512, 512);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
function textureRiflesso() {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d');
  const l = g.createLinearGradient(0, 0, 256, 256);
  l.addColorStop(0.0, 'rgba(255,255,255,0)');
  l.addColorStop(0.36, 'rgba(255,255,255,0)');
  l.addColorStop(0.44, 'rgba(255,255,255,0.22)');
  l.addColorStop(0.5, 'rgba(255,255,255,0.05)');
  l.addColorStop(0.56, 'rgba(255,255,255,0.12)');
  l.addColorStop(0.62, 'rgba(255,255,255,0)');
  l.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = l; g.fillRect(0, 0, 256, 256);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
function texturePellicina() {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  const r = g.createRadialGradient(32, 32, 2, 32, 32, 30);
  r.addColorStop(0, 'rgba(255,240,215,1)'); r.addColorStop(0.5, 'rgba(235,205,160,0.6)'); r.addColorStop(1, 'rgba(235,205,160,0)');
  g.fillStyle = r;
  g.beginPath(); g.ellipse(32, 32, 30, 16, 0.5, 0, Math.PI * 2); g.fill();
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

async function tostatrice() {
  const canvas = document.querySelector('.tostatura__canvas');
  if (!canvas) return;
  const sezione = canvas.closest('.tostatura');
  const pista = sezione.querySelector('.tostatura__pista');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(pixel);
  renderer.setClearColor(0x110b08, 1);
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 1.0;
  const scene = new THREE.Scene();
  ambiente(renderer, scene, 0.45);
  const camera = new THREE.PerspectiveCamera(30, 1, 0.5, 80);
  const gruppo = new THREE.Group();
  scene.add(gruppo);

  const R = 2.3;
  const L = 3.0;

  // tamburo
  const tamburo = new THREE.Mesh(
    new THREE.CylinderGeometry(R, R, L, 72, 1, true),
    new THREE.MeshStandardMaterial({ color: 0x4a423c, metalness: 0.8, roughness: 0.45, side: THREE.BackSide }),
  );
  tamburo.rotation.x = Math.PI / 2;
  gruppo.add(tamburo);
  const pale = new THREE.Group();
  const matPala = new THREE.MeshStandardMaterial({ color: 0x6d655e, metalness: 0.9, roughness: 0.32 });
  const geoPala = new THREE.BoxGeometry(0.05, 0.36, L * 0.94);
  for (let k = 0; k < 4; k++) {
    const a = k * Math.PI / 2;
    const pala = new THREE.Mesh(geoPala, matPala);
    pala.position.set(Math.cos(a) * (R - 0.18), Math.sin(a) * (R - 0.18), 0);
    pala.rotation.z = a - Math.PI / 2;
    pale.add(pala);
  }
  gruppo.add(pale);

  // fondo forato e bagliore del fuoco
  const fondo = new THREE.Mesh(new THREE.CircleGeometry(R, 72), new THREE.MeshStandardMaterial({ map: textureFondo(false), metalness: 0.6, roughness: 0.55 }));
  fondo.position.z = -L / 2;
  const bagliore = new THREE.Mesh(
    new THREE.CircleGeometry(R * 0.99, 72),
    new THREE.MeshBasicMaterial({ map: textureFondo(true), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }),
  );
  bagliore.position.z = -L / 2 + 0.01;
  gruppo.add(fondo, bagliore);

  // frontale della macchina, cornice cromata, bulloni, vetro
  const frontale = new THREE.Mesh(
    new THREE.RingGeometry(R + 0.06, 16, 96, 1),
    new THREE.MeshStandardMaterial({ color: 0x2c2723, metalness: 0.55, roughness: 0.6 }),
  );
  frontale.position.z = L / 2;
  const cromo = new THREE.MeshStandardMaterial({ color: 0xd9d4ce, metalness: 1, roughness: 0.22 });
  const cornice = new THREE.Mesh(new THREE.TorusGeometry(R + 0.1, 0.17, 28, 128), cromo);
  cornice.position.z = L / 2 + 0.04;
  const flangia = new THREE.Mesh(new THREE.RingGeometry(R + 0.2, R + 0.62, 96, 1), new THREE.MeshStandardMaterial({ color: 0x8d8780, metalness: 0.95, roughness: 0.34 }));
  flangia.position.z = L / 2 + 0.01;
  gruppo.add(frontale, flangia, cornice);
  const geoBullone = new THREE.CylinderGeometry(0.075, 0.075, 0.08, 18);
  for (let k = 0; k < 10; k++) {
    const a = k / 10 * Math.PI * 2 + 0.31;
    const b = new THREE.Mesh(geoBullone, cromo);
    b.rotation.x = Math.PI / 2;
    b.position.set(Math.cos(a) * (R + 0.42), Math.sin(a) * (R + 0.42), L / 2 + 0.05);
    gruppo.add(b);
  }
  const vetro = new THREE.Mesh(
    new THREE.CircleGeometry(R + 0.08, 96),
    new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 1, roughness: 0.06, transparent: true, opacity: 0.09, depthWrite: false }),
  );
  vetro.position.z = L / 2 + 0.02;
  const riflesso = new THREE.Mesh(
    new THREE.CircleGeometry(R + 0.08, 96),
    new THREE.MeshBasicMaterial({ map: textureRiflesso(), transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false }),
  );
  riflesso.position.z = L / 2 + 0.03;
  gruppo.add(vetro, riflesso);

  // luci
  const chiave = new THREE.DirectionalLight(0xfff1e2, 2.6);
  chiave.position.set(-3, 5, 9);
  const dentro = new THREE.PointLight(0xfff3e6, 5, 7, 1.5);
  dentro.position.set(-0.6, 1.2, L / 2 - 0.4);
  const fuoco = new THREE.PointLight(0xff7a2e, 0, 7, 1.4);
  fuoco.position.set(0.3, -0.6, -L / 2 + 0.5);
  scene.add(chiave, new THREE.HemisphereLight(0xfff0dc, 0x140b06, 0.45));
  gruppo.add(dentro, fuoco);

  // chicchi
  const N = mobile ? 250 : 400;
  const matChicco = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.78, metalness: 0 });
  const chicchi = new THREE.InstancedMesh(geometriaChicco(mobile ? 28 : 36), matChicco, N);
  chicchi.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  chicchi.frustumCulled = false;
  gruppo.add(chicchi);
  const dati = [];
  const tinta = new THREE.Color();
  for (let i = 0; i < N; i++) {
    const strato = Math.pow(Math.random(), 0.85);
    dati.push({
      rho: 0.5 + strato * 0.46, k: strato,
      fase: Math.random(), vel: casuale(0.86, 1.14),
      z: casuale(-L / 2 + 0.22, L / 2 - 0.3),
      rx: casuale(0, 6.28), ry: casuale(0, 6.28), rz: casuale(0, 6.28),
      wx: casuale(-2, 2), wy: casuale(-2.6, 2.6), wz: casuale(-1.4, 1.4),
      scala: casuale(0.125, 0.15), crack: casuale(0.64, 0.79), sc: Math.random(),
    });
    chicchi.setColorAt(i, tinta.setScalar(casuale(0.8, 1.12)));
  }

  // pellicine del primo crack
  const NP = mobile ? 70 : 150;
  const posP = new Float32Array(NP * 3);
  const velP = [];
  const nuovaPellicina = (j, ovunque) => {
    const a = casuale(-1.9, -0.2);
    const r = casuale(0.6, 1.7);
    posP[j * 3] = Math.cos(a) * r;
    posP[j * 3 + 1] = ovunque ? casuale(-1.6, 1.6) : Math.sin(a) * r;
    posP[j * 3 + 2] = casuale(-L / 2 + 0.3, L / 2 - 0.3);
    velP[j] = { vx: casuale(-0.5, 0.2), vy: casuale(0.35, 0.9), ph: casuale(0, 6.28) };
  };
  for (let j = 0; j < NP; j++) nuovaPellicina(j, true);
  const geoP = new THREE.BufferGeometry();
  geoP.setAttribute('position', new THREE.BufferAttribute(posP, 3));
  const matP = new THREE.PointsMaterial({ size: mobile ? 0.13 : 0.11, map: texturePellicina(), color: 0xf0dcc0, transparent: true, opacity: 0, depthWrite: false, sizeAttenuation: true });
  const pellicine = new THREE.Points(geoP, matP);
  gruppo.add(pellicine);

  // colori della tostatura: dal verde al bruno scuro
  const tappe = [
    [0, '#8F9B6B'], [0.16, '#A6A576'], [0.3, '#BBA97A'], [0.42, '#B8935F'],
    [0.54, '#9A6A43'], [0.66, '#7A4C2E'], [0.8, '#5A3520'], [1, '#402517'],
  ].map(([p, c]) => [p, new THREE.Color(c)]);
  const colore = new THREE.Color();
  const coloreTostatura = p => {
    for (let k = 1; k < tappe.length; k++) {
      if (p <= tappe[k][0]) {
        const u = (p - tappe[k - 1][0]) / (tappe[k][0] - tappe[k - 1][0]);
        return colore.lerpColors(tappe[k - 1][1], tappe[k][1], u);
      }
    }
    return colore.copy(tappe[tappe.length - 1][1]);
  };

  // inquadratura: oblò al centro sul telefono, a destra su desktop
  let largo = false;
  let distanza = 14;
  const raggioVisto = R + 0.7;
  const inquadra = () => {
    const w = canvas.clientWidth || innerWidth;
    const h = canvas.clientHeight || innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    const tan = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    largo = w >= 960;
    if (largo) {
      distanza = raggioVisto / (0.72 * tan);
      const semiL = tan * distanza * camera.aspect;
      gruppo.position.set(semiL * 0.42, 0, 0);
    } else {
      distanza = Math.max(raggioVisto / (0.9 * tan * camera.aspect), raggioVisto / (0.4 * tan));
      gruppo.position.set(0, tan * distanza * 0.02, 0);
    }
    camera.updateProjectionMatrix();
  };
  inquadra();
  new ResizeObserver(inquadra).observe(canvas);

  const puntatore = { x: 0, y: 0, tx: 0, ty: 0 };
  if (matchMedia('(hover: hover) and (pointer: fine)').matches) {
    addEventListener('pointermove', ev => {
      puntatore.tx = (ev.clientX / innerWidth - 0.5) * 2;
      puntatore.ty = (ev.clientY / innerHeight - 0.5) * 2;
    }, { passive: true });
  }

  const progresso = () => {
    const r = pista.getBoundingClientRect();
    const corsa = pista.offsetHeight - innerHeight;
    return Math.min(1, Math.max(0, -r.top / Math.max(1, corsa)));
  };

  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const e = new THREE.Euler();
  const pv = new THREE.Vector3();
  const sv = new THREE.Vector3();
  const PERIODO = 1.9;
  const TH0 = -2.3;
  let pS = progresso();
  let t0 = 0;
  let prima = 0;
  let tempo = 0;

  // primo fotogramma già con i chicchi al loro posto
  await renderer.compileAsync(scene, camera);

  const passo = ora => {
    if (!t0) { t0 = ora; prima = ora; canvas.classList.add('visibile'); sezione.classList.add('con3d'); }
    const dt = Math.min(0.05, (ora - prima) / 1000);
    prima = ora;
    if (!ridotto) tempo += dt;
    const p = progresso();
    pS += (p - pS) * Math.min(1, dt * 7);
    if (ridotto) pS = p;

    // camera: leggermente dall'alto a sinistra, si avvicina durante la tostatura
    puntatore.x += (puntatore.tx - puntatore.x) * Math.min(1, dt * 3);
    puntatore.y += (puntatore.ty - puntatore.y) * Math.min(1, dt * 3);
    // la camera guarda quasi dritta: l'oblò resta dove lo mette inquadra()
    const dist = distanza * (1 - 0.07 * pS) + L / 2;
    const cx = -0.9 - puntatore.x * 0.6;
    const cy = 1.1 + puntatore.y * 0.45;
    camera.position.set(cx, cy, dist);
    camera.lookAt(cx + 0.75, cy - 0.95, 0);

    // calore
    const caldo = liscia(0.05, 0.95, pS);
    bagliore.material.opacity = 0.12 + caldo * 0.85 + (ridotto ? 0 : Math.sin(tempo * 7.3) * 0.04 * caldo);
    fuoco.intensity = 1 + caldo * 7;
    pale.rotation.z = tempo * (Math.PI * 2 / PERIODO) * 0.55;
    riflesso.rotation.z = -0.4 + pS * 0.8;

    // chicchi: colore, lucentezza, gonfiore
    matChicco.color.copy(coloreTostatura(pS));
    matChicco.roughness = 0.8 - 0.4 * liscia(0.55, 1, pS);
    const gonfio = 1 + 0.3 * liscia(0.35, 0.85, pS);
    const scoppi = pS > 0.62 && pS < 0.84 && !ridotto;
    const scatto = Math.floor(tempo * 9);
    for (let i = 0; i < N; i++) {
      const d = dati[i];
      const t = (d.fase + tempo * d.vel / PERIODO) % 1;
      const r = R * d.rho - 0.14;
      const th1 = -1.0 + 0.9 * d.k;
      let x;
      let y;
      let volo = 0;
      if (t < 0.6) {
        const u = t / 0.6;
        const th = TH0 + (th1 - TH0) * u;
        x = Math.cos(th) * r;
        y = Math.sin(th) * r;
      } else {
        const u = Math.pow((t - 0.6) / 0.4, 1.15);
        volo = 1;
        const x1 = Math.cos(th1) * r;
        const y1 = Math.sin(th1) * r;
        const lancio = 0.8 + 1.1 * d.k;
        let cx = x1 - Math.sin(th1) * lancio;
        let cy = y1 + Math.cos(th1) * lancio;
        const rc = Math.hypot(cx, cy);
        if (rc > R * 0.92) { cx *= R * 0.92 / rc; cy *= R * 0.92 / rc; }
        const x0 = Math.cos(TH0) * r;
        const y0 = Math.sin(TH0) * r;
        const a = (1 - u) * (1 - u);
        const b = 2 * (1 - u) * u;
        const c = u * u;
        x = a * x1 + b * cx + c * x0;
        y = a * y1 + b * cy + c * y0;
      }
      const w = 1 + volo * 1.6;
      e.set(d.rx + tempo * d.wx * w, d.ry + tempo * d.wy * w, d.rz + tempo * d.wz);
      q.setFromEuler(e);
      let sc = d.scala * gonfio;
      if (scoppi && Math.abs(pS - d.crack) < 0.06) {
        const h = Math.sin((i * 12.9898 + scatto * 78.233)) * 43758.5453;
        if (h - Math.floor(h) < 0.06) { sc *= 1.18; y += 0.08; }
      }
      pv.set(x, y, d.z);
      sv.set(sc, sc, sc);
      chicchi.setMatrixAt(i, m.compose(pv, q, sv));
    }
    chicchi.instanceMatrix.needsUpdate = true;

    // pellicine
    const quante = liscia(0.63, 0.7, pS) * (1 - 0.6 * liscia(0.92, 1, pS));
    matP.opacity = quante * 0.9;
    if (quante > 0.01 && !ridotto) {
      for (let j = 0; j < NP; j++) {
        const v = velP[j];
        posP[j * 3] += (v.vx + Math.sin(tempo * 2 + v.ph) * 0.25) * dt;
        posP[j * 3 + 1] += v.vy * dt;
        posP[j * 3 + 2] += Math.cos(tempo * 1.7 + v.ph) * 0.2 * dt;
        if (Math.hypot(posP[j * 3], posP[j * 3 + 1]) > R * 0.94 || posP[j * 3 + 1] > 1.8) nuovaPellicina(j, false);
      }
      geoP.attributes.position.needsUpdate = true;
    }
    renderer.render(scene, camera);
  };
  const riparti = cicloSu(sezione, passo);
  riparti();
}

hero().catch(err => console.warn('Hero 3D:', err));
const tamburo = document.querySelector('.tostatura');
if (tamburo) {
  const oss = new IntersectionObserver(v => {
    if (v[0].isIntersecting) { oss.disconnect(); tostatrice().catch(err => console.warn('Tostatrice 3D:', err)); }
  }, { rootMargin: '900px 0px' });
  oss.observe(tamburo);
}
