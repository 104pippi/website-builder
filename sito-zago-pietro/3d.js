// Scene 3D: l'alberino tornito dell'hero e la sezione "Dal rotolo al pezzo finito".
// Il pezzo è costruito in codice come sul tornio: un profilo che gira attorno all'asse,
// più filetto, zigrinatura e spianatura. Tutto si muove con il tempo e con lo scroll.
import * as THREE from 'three';
import { SOGLIE } from './script.js';

const html = document.documentElement;
const mobile = matchMedia('(max-width: 959px)').matches;
const tocco = matchMedia('(pointer: coarse)').matches;
const ridotto = matchMedia('(prefers-reduced-motion: reduce)').matches;
const PR = Math.min(window.devicePixelRatio || 1, mobile ? 1.5 : 2);

const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, t) => a + (b - a) * t;
const liscio = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const fuori3 = (t) => 1 - Math.pow(1 - t, 3);

/* ---------- il pezzo ---------- */
const L = 10;          // lunghezza in unità di scena
const GREZZO = 0.535;  // raggio del filo prima della tornitura
// profilo [posizione lungo l'asse, raggio]: smusso, filetto, gola, corpo rettificato, zigrinatura, codolo spianato
const PROFILO = [[0, .24], [.1, .37], [2.12, .37], [2.16, .29], [2.44, .29], [2.48, .42], [5.52, .42], [5.56, .5],
  [7, .5], [7.04, .42], [7.24, .42], [7.28, .3], [9.88, .3], [10, .2]];
const FILETTO = [0.16, 2.08], ZIGRINO = [5.62, 6.94], PIATTO = [7.8, 9.88];

function raggioBase(s) {
  for (let i = 1; i < PROFILO.length; i++) {
    const [s1, r1] = PROFILO[i];
    if (s <= s1) { const [s0, r0] = PROFILO[i - 1]; return r0 + (r1 - r0) * (s - s0) / (s1 - s0); }
  }
  return PROFILO[PROFILO.length - 1][1];
}
export const raggioFinito = (x) => raggioBase(clamp(x + L / 2, 0, L));
const dente = (u) => 1 - Math.abs(2 * (u - Math.floor(u)) - 1);   // 0 sulle righe, 1 a metà passo

function stazioni(passo) {
  const s = new Set();
  for (let x = 0; x <= L + 1e-9; x += passo) s.add(+x.toFixed(4));
  for (const [x] of PROFILO) s.add(x);
  [FILETTO[0], FILETTO[1], ZIGRINO[0], ZIGRINO[1], PIATTO[0], PIATTO[0] - 0.004].forEach((x) => s.add(x));
  return [...s].sort((a, b) => a - b);
}

function geometriaAlbero({ N, passo, dettagli }) {
  const S = stazioni(passo), M = S.length, giro = N + 1, nZig = mobile ? 14 : 18;
  const pos = [], uv = [], rawP = [], rawN = [], idx = [];
  for (let j = 0; j < M; j++) {
    const s = S[j], r0 = raggioBase(s), x = s - L / 2;
    for (let i = 0; i <= N; i++) {
      const t = (i / N) * Math.PI * 2, c = Math.cos(t), sn = Math.sin(t), u = t / (Math.PI * 2);
      let r = r0;
      if (dettagli) {
        if (s > FILETTO[0] && s < FILETTO[1]) {
          const k = liscio(FILETTO[0], FILETTO[0] + .1, s) * (1 - liscio(FILETTO[1] - .1, FILETTO[1], s));
          r -= .05 * k * (1 - dente(u + s / .19));
        }
        if (s > ZIGRINO[0] && s < ZIGRINO[1]) {
          const k = liscio(ZIGRINO[0], ZIGRINO[0] + .04, s) * (1 - liscio(ZIGRINO[1] - .04, ZIGRINO[1], s));
          r -= .034 * k * (1 - Math.min(dente(nZig * u + s / .16), dente(nZig * u - s / .16)));
        }
      }
      let y = r * c;
      const z = r * sn;
      if (dettagli && s >= PIATTO[0] && s <= PIATTO[1]) y = Math.min(y, r0 * .56);
      pos.push(x, y, z);
      uv.push(s / L, i / N);
      rawP.push(x, GREZZO * c, GREZZO * sn);
      rawN.push(0, c, sn);
    }
  }
  for (let j = 0; j < M - 1; j++) for (let i = 0; i < N; i++) {
    const a = j * giro + i, b = a + giro, c = b + 1, d = a + 1;
    idx.push(a, d, b, b, d, c);
  }
  const tappo = (j, verso) => {
    const base = pos.length / 3, x = S[j] - L / 2;
    pos.push(x, 0, 0); uv.push(S[j] / L, .5); rawP.push(x, 0, 0); rawN.push(verso, 0, 0);
    for (let i = 0; i <= N; i++) {
      const k = (j * giro + i) * 3;
      pos.push(pos[k], pos[k + 1], pos[k + 2]); uv.push(S[j] / L, i / N);
      rawP.push(rawP[k], rawP[k + 1], rawP[k + 2]); rawN.push(verso, 0, 0);
    }
    for (let i = 0; i < N; i++) { const a = base + 1 + i, b = a + 1; verso < 0 ? idx.push(base, b, a) : idx.push(base, a, b); }
  };
  tappo(0, -1);
  tappo(M - 1, 1);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setAttribute('aRawP', new THREE.Float32BufferAttribute(rawP, 3));
  g.setAttribute('aRawN', new THREE.Float32BufferAttribute(rawN, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  g.computeTangents();
  return g;
}

let geoPezzo = null;
const pezzoCondiviso = () => geoPezzo || (geoPezzo = geometriaAlbero({ N: mobile ? 104 : 144, passo: mobile ? .024 : .018, dettagli: true }));

/* ---------- luce da studio: strisce luminose riflesse sull'acciaio ---------- */
function studio(renderer, chiaro) {
  const sc = new THREE.Scene();
  const f = chiaro ? .4 : .045;
  sc.add(new THREE.Mesh(new THREE.BoxGeometry(30, 30, 30), new THREE.MeshBasicMaterial({ color: new THREE.Color(f, f * 1.03, f * 1.07), side: THREE.BackSide })));
  const pannello = (w, h, x, y, z, k, tinta = [1, 1, 1]) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(k * tinta[0], k * tinta[1], k * tinta[2]), side: THREE.DoubleSide }));
    m.position.set(x, y, z); m.lookAt(0, 0, 0); sc.add(m);
  };
  pannello(28, 2.4, 0, 11, 3, 7);                     // striscia lunga dall'alto
  pannello(2.2, 18, -12, 2, 4, 4.2);                  // verticale a sinistra
  pannello(1.4, 18, 12, 1, -3, 3.2);                  // controluce a destra
  pannello(22, 6, 0, 3, 13, chiaro ? 1.5 : .8);       // luce frontale morbida
  pannello(28, 7, 0, -11, 2, .1);                     // bandiera scura sotto: dà il contrasto all'acciaio
  pannello(10, 3, 7, -4, 10, 2.4, [1, .82, .55]);     // riflesso caldo, come l'olio da taglio
  if (!chiaro) pannello(26, 3, 2, 9, -12, 3.4);         // striscia alta dietro: il filo del rotolo prende luce sui dorsi
  const pm = new THREE.PMREMGenerator(renderer);
  const env = pm.fromScene(sc, .02).texture;
  pm.dispose();
  sc.traverse((o) => { o.geometry?.dispose(); o.material?.dispose(); });
  return env;
}

const acciaio = (opz = {}) => new THREE.MeshPhysicalMaterial({
  color: 0xd2d7db, metalness: 1, roughness: .17, anisotropy: .35, envMapIntensity: 1, ...opz,
});

function nuovoRenderer(canvas) {
  try {
    const r = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
    r.setPixelRatio(PR);
    r.toneMapping = THREE.NeutralToneMapping;
    return r;
  } catch (e) {
    return null;
  }
}

function texOmbra() {
  const c = document.createElement('canvas'); c.width = 256; c.height = 64;
  const g = c.getContext('2d');
  const gr = g.createRadialGradient(128, 32, 2, 128, 32, 126);
  gr.addColorStop(0, 'rgba(0,0,0,.75)'); gr.addColorStop(.45, 'rgba(0,0,0,.32)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
  g.setTransform(1, 0, 0, .25, 0, 24); g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function texPunto() {
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d');
  const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(.35, 'rgba(255,255,255,.7)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}

function texGrana() {
  const c = document.createElement('canvas'); c.width = 256; c.height = 64;
  const g = c.getContext('2d');
  const img = g.createImageData(256, 64);
  for (let i = 0; i < img.data.length; i += 4) { const v = 120 + Math.random() * 90; img.data[i] = v; img.data[i + 1] = v * 1.01; img.data[i + 2] = v * 1.04; img.data[i + 3] = 255; }
  g.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

/* il ciclo gira solo quando la scena è a schermo e la scheda è visibile */
function ciclo(disegna, elemento, margine = '0px') {
  let id = 0, visto = false;
  const vai = (ora) => { id = 0; disegna(ora); if (!ridotto && visto && !document.hidden) id = requestAnimationFrame(vai); };
  const riprendi = () => { if (!id && visto && !document.hidden) id = requestAnimationFrame(vai); };
  new IntersectionObserver(([v]) => { visto = v.isIntersecting; riprendi(); }, { rootMargin: margine }).observe(elemento);
  document.addEventListener('visibilitychange', riprendi);
  return { una: () => { if (!id) id = requestAnimationFrame(vai); } };
}

/* ======================= HERO ======================= */
function scenaHero() {
  const hero = document.querySelector('.hero');
  const canvas = hero?.querySelector('.hero-3d');
  const foto = hero?.querySelector('.hero-foto');
  const quota = hero?.querySelector('.quota');
  if (!canvas) return;
  const renderer = nuovoRenderer(canvas);
  if (!renderer) return;

  const scene = new THREE.Scene();
  scene.environment = studio(renderer, true);
  const camera = new THREE.PerspectiveCamera(26, 1, .1, 200);
  camera.position.set(0, 0, 40);

  const albero = new THREE.Mesh(pezzoCondiviso(), acciaio());
  const asse = new THREE.Group(); asse.add(albero);
  const perno = new THREE.Group(); perno.add(asse); scene.add(perno);
  const ombra = new THREE.Mesh(new THREE.PlaneGeometry(L * 1.2, 1.9), new THREE.MeshBasicMaterial({ map: texOmbra(), transparent: true, depthWrite: false, opacity: .55 }));
  ombra.position.set(.35, -.95, -1.4);
  asse.add(ombra);
  const ancora = new THREE.Object3D();
  ancora.position.set(mobile ? 2.8 - L / 2 : 6.3 - L / 2, mobile ? .5 : -.52, 0);   // da dove parte la quota: tratto liscio su mobile, zigrinatura su desktop
  perno.add(ancora);
  if (mobile) quota?.classList.add('su');

  const YAW = -.4;
  let W = 1, H = 1, kpx = 1, base = { x: 0, y: 0, ang: 0, scala: 1 };
  function misura() {
    const r = hero.getBoundingClientRect();
    W = r.width; H = r.height;
    renderer.setSize(W, H, false);
    camera.aspect = W / H; camera.updateProjectionMatrix();
    kpx = 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.position.z / H;
    const f = foto.getBoundingClientRect(), ox = f.left - r.left, oy = f.top - r.top;
    let cx, cy, lung, ang;
    if (W < 960) { cx = W * .5; cy = oy + f.height + 2; lung = Math.min(W * 1.0, 560); ang = .09; }
    else { cx = ox + f.width * .44; cy = oy + f.height * .9; lung = f.width * 1.06; ang = .1; }
    base = { x: (cx - W / 2) * kpx, y: -(cy - H / 2) * kpx, ang, scala: lung * kpx / (L * Math.cos(YAW)) };
  }
  misura();
  new ResizeObserver(() => { misura(); if (ridotto) loop.una(); }).observe(hero);

  const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
  if (!tocco && !mobile) addEventListener('pointermove', (e) => { mouse.tx = e.clientX / innerWidth * 2 - 1; mouse.ty = e.clientY / innerHeight * 2 - 1; }, { passive: true });

  const v = new THREE.Vector3();
  let t0 = null, ultimo = 0, giro = 0;
  function disegna(ora) {
    ora = performance.now();
    if (t0 === null) { t0 = ora; ultimo = ora; canvas.classList.add('pronto'); }
    const dt = Math.min(.05, (ora - ultimo) / 1000); ultimo = ora;
    const t = (ora - t0) / 1000;
    const e = ridotto ? 1 : fuori3(clamp(t / 2.1));
    giro += (1.05 + 16 * Math.pow(1 - e, 2)) * dt;
    mouse.x += (mouse.tx - mouse.x) * .06; mouse.y += (mouse.ty - mouse.y) * .06;
    const sc = clamp(scrollY / H, 0, 1.2);

    albero.rotation.x = giro;
    asse.position.x = (1 - e) * L * .8;
    perno.position.set(base.x + mouse.x * .25, base.y + Math.sin(t * .9) * .04 + sc * H * kpx * .22, 0);
    perno.rotation.set(-mouse.y * .07 + Math.sin(t * .55) * .02, YAW + sc * .3 + mouse.x * .08, base.ang + sc * .1);
    perno.scale.setScalar(base.scala);
    scene.environmentRotation.y = t * .16;
    renderer.render(scene, camera);

    if (quota) {
      ancora.getWorldPosition(v).project(camera);
      quota.style.setProperty('--qx', ((v.x * .5 + .5) * W).toFixed(1) + 'px');
      quota.style.setProperty('--qy', ((-v.y * .5 + .5) * H).toFixed(1) + 'px');
      if (e > .9) quota.classList.add('pronta');
    }
  }
  const loop = ciclo(disegna, hero);
  loop.una();
}

/* ======================= DAL ROTOLO AL PEZZO ======================= */
function morph(mat, u) {
  mat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, u);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', `#include <common>
        attribute vec3 aRawP; attribute vec3 aRawN; uniform float uTaglio; uniform float uMola; varying float vM; varying float vG;`)
      .replace('#include <beginnormal_vertex>', `
        vM = 1.0 - smoothstep(uTaglio - 0.035, uTaglio + 0.035, position.x);
        vG = 1.0 - smoothstep(uMola - 0.3, uMola + 0.3, position.x);
        vec3 objectNormal = normalize(mix(aRawN, normal, vM));
        #ifdef USE_TANGENT
          vec3 objectTangent = vec3(tangent.xyz);
        #endif`)
      .replace('#include <begin_vertex>', 'vec3 transformed = mix(aRawP, position, vM);');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>
        varying float vM; varying float vG;`)
      .replace('#include <color_fragment>', `#include <color_fragment>
        diffuseColor.rgb *= mix(0.72, 1.0, vM) * mix(1.0, 1.05, vG * vM);`)
      .replace('#include <roughnessmap_fragment>', 'float roughnessFactor = mix(mix(0.5, 0.3, vM), 0.1, vG * vM);');
  };
  mat.customProgramCacheKey = () => 'pezzo-morph';
}

function scenaProcesso() {
  const sez = document.querySelector('.processo');
  if (!sez || html.classList.contains('statico')) return;
  const canvas = sez.querySelector('.processo-3d');
  const pista = sez.querySelector('.processo-pista');
  const etichette = [...sez.querySelectorAll('.etichetta')];
  const renderer = nuovoRenderer(canvas);
  if (!renderer) { html.classList.add('statico'); return; }

  const scene = new THREE.Scene();
  scene.environment = studio(renderer, false);
  scene.fog = new THREE.Fog(0x1b2026, 34, 72);
  const camera = new THREE.PerspectiveCamera(34, 1, .1, 300);
  const banco = new THREE.Group();
  if (mobile) banco.rotation.z = .42;
  scene.add(banco);

  // il pezzo: grezzo a destra dell'utensile, finito a sinistra; lucido dove è passata la mola
  const U = { uTaglio: { value: -9 }, uMola: { value: -9 } };
  const matPezzo = acciaio({ roughness: .2 });
  morph(matPezzo, U);
  const pezzo = new THREE.Mesh(pezzoCondiviso(), matPezzo);
  banco.add(pezzo);

  // boccola guida del tornio a fantina mobile
  const scuro = new THREE.MeshPhysicalMaterial({ color: 0x323941, metalness: .9, roughness: .36 });
  const impianto = new THREE.Group(); banco.add(impianto);
  const boccola = new THREE.Mesh(new THREE.CylinderGeometry(1.05, 1.05, 1.4, 48), scuro);
  boccola.rotation.z = Math.PI / 2; boccola.position.x = L / 2 + .7; impianto.add(boccola);
  const flangia = new THREE.Mesh(new THREE.CylinderGeometry(1.7, 1.7, .3, 48), scuro);
  flangia.rotation.z = Math.PI / 2; flangia.position.x = L / 2 + 1.5; impianto.add(flangia);

  // il rotolo di filo e il filo che entra nella boccola
  const giri = 6, Rr = 2.8, passoR = 1.2, cx = 14.6, cz = -3.4, nG = 40, punti = [];
  for (let i = 0; i <= giri * nG; i++) {
    const a = i / nG * Math.PI * 2;
    punti.push(new THREE.Vector3(cx + Rr * Math.cos(a), -giri * passoR / 2 + i / (giri * nG) * giri * passoR, cz + Rr * Math.sin(a)));
  }
  [[17.2, 3.45, -1.2], [15.6, 2.7, .6], [12.2, 1.1, .35], [9.4, .12, 0], [7.8, 0, 0], [6.2, 0, 0]].forEach((p) => punti.push(new THREE.Vector3(...p)));
  const filo = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(punti, false, 'centripetal'), mobile ? 520 : 800, GREZZO, mobile ? 12 : 16), acciaio({ roughness: .3, color: 0xbcc3c9, envMapIntensity: mobile ? 1.3 : 2.6 }));
  impianto.add(filo);

  // utensile: portautensile scuro e placchetta rivestita color oro
  const utensile = new THREE.Group();
  const porta = new THREE.Mesh(new THREE.BoxGeometry(.62, 2.6, .62), scuro); porta.position.y = 1.62; utensile.add(porta);
  const placchetta = new THREE.Mesh(new THREE.ConeGeometry(.36, .55, 3), new THREE.MeshPhysicalMaterial({ color: 0xd2a851, metalness: 1, roughness: .3 }));
  placchetta.rotation.x = Math.PI; placchetta.position.y = .3; utensile.add(placchetta);
  banco.add(utensile);

  // mola della rettifica senza centri
  const mola = new THREE.Group();
  const ruota = new THREE.Mesh(new THREE.CylinderGeometry(3, 3, 1.3, 72), new THREE.MeshStandardMaterial({ color: 0x9aa0a6, roughness: .95, metalness: 0, map: texGrana() }));
  ruota.rotation.z = Math.PI / 2; mola.add(ruota);
  banco.add(mola);

  // anello di misura della sala metrologica
  const anello = new THREE.Mesh(new THREE.TorusGeometry(.64, .012, 8, 140), new THREE.MeshBasicMaterial({ color: new THREE.Color(.62, .9, 1), toneMapped: false, transparent: true }));
  anello.rotation.y = Math.PI / 2; banco.add(anello);

  // il lotto: tanti pezzi uguali
  const geoMini = geometriaAlbero({ N: mobile ? 16 : 22, passo: .25, dettagli: false });
  const colonne = mobile ? 5 : 6, righe = mobile ? 30 : 34, NUM = colonne * righe;
  const lotto = new THREE.InstancedMesh(geoMini, acciaio({ roughness: .22 }), NUM);
  lotto.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  lotto.frustumCulled = false;
  banco.add(lotto);
  const SCALA_LOTTO = .3, posti = [];
  for (let r = 0; r < righe; r++) for (let c = 0; c < colonne; c++) {
    const x = (c - (colonne - 1) / 2) * L * SCALA_LOTTO * 1.18 + (r % 2 ? L * SCALA_LOTTO * .3 : 0);
    const y = (r - (righe - 1) / 2) * .5;
    posti.push({ x, y, z: (Math.random() - .5) * .25, fase: Math.random() * 6.28, vel: .8 + Math.random() * .8, d: Math.hypot(x / 1.6, y) });
  }
  const dMax = Math.max(...posti.map((p) => p.d));
  const centro = posti.reduce((m, p) => (p.d < m.d ? p : m), posti[0]);
  const mtx = new THREE.Matrix4(), q = new THREE.Quaternion(), sc3 = new THREE.Vector3(), p3 = new THREE.Vector3(), eul = new THREE.Euler();

  // particelle: trucioli, scintille, bolle del lavaggio a ultrasuoni
  const MAXP = 420;
  const pPos = new Float32Array(MAXP * 3).fill(-999), pCol = new Float32Array(MAXP * 3), pVel = new Float32Array(MAXP * 3), pVita = new Float32Array(MAXP), pTipo = new Uint8Array(MAXP);
  const pGeo = new THREE.BufferGeometry();
  pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3).setUsage(THREE.DynamicDrawUsage));
  pGeo.setAttribute('color', new THREE.BufferAttribute(pCol, 3).setUsage(THREE.DynamicDrawUsage));
  const particelle = new THREE.Points(pGeo, new THREE.PointsMaterial({ size: mobile ? .11 : .085, map: texPunto(), vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  particelle.frustumCulled = false;
  banco.add(particelle);
  let pNext = 0;
  const COLORI = [[1.15, .9, .55], [2.2, 1.0, .35], [.45, .62, .75]];
  function emetti(tipo, x, y, z, vx, vy, vz, vita) {
    const i = pNext; pNext = (pNext + 1) % MAXP;
    pPos.set([x, y, z], i * 3); pVel.set([vx, vy, vz], i * 3); pVita[i] = vita; pTipo[i] = tipo;
  }
  function aggiornaParticelle(dt) {
    for (let i = 0; i < MAXP; i++) {
      if (pVita[i] <= 0) { pPos[i * 3 + 1] = -999; continue; }
      pVita[i] -= dt;
      const k = i * 3, tipo = pTipo[i];
      if (tipo === 2) { pVel[k] += Math.sin(pVita[i] * 9 + i) * .02; } else { pVel[k + 1] -= (tipo === 1 ? 9 : 6) * dt; }
      pPos[k] += pVel[k] * dt; pPos[k + 1] += pVel[k + 1] * dt; pPos[k + 2] += pVel[k + 2] * dt;
      const a = clamp(pVita[i] * (tipo === 2 ? .6 : 2.5)), col = COLORI[tipo];
      pCol[k] = col[0] * a; pCol[k + 1] = col[1] * a; pCol[k + 2] = col[2] * a;
    }
    pGeo.attributes.position.needsUpdate = true;
    pGeo.attributes.color.needsUpdate = true;
  }

  // inquadrature (coordinate del banco): una per fase, si fondono ai passaggi
  const B = [...SOGLIE, 1];
  const qf = (i, p) => clamp((p - B[i]) / (B[i + 1] - B[i]));
  const SPOSTA = mobile ? 1.55 : 1;
  const tmpP = new THREE.Vector3(), tmpT = new THREE.Vector3(), camP = new THREE.Vector3(), camT = new THREE.Vector3();
  function inquadra(p, xu, xm) {
    const stati = [
      [[6.4 + qf(0, p) * 1.6, 5.2, 16.5], [11.2, .6, -1.2]],
      [[xu - 1.9, 1.8, 7.4], [xu + .3, 0, 0]],
      [[xm * .7 - 2.6, 2.6, 11.5], [xm * .7, .7, -.4]],
      [[-4.5 + qf(3, p) * 8, 1.5, 12.5], [0, 0, 0]],
      [[.4, .7, 14.5], [.6, .15, 0]],
      [[0, 6.5 + qf(5, p) * 2, 30 + qf(5, p) * 4], [0, -.4, 0]],
    ];
    camP.set(...stati[0][0]); camT.set(...stati[0][1]);
    for (let i = 1; i < stati.length; i++) {
      const k = liscio(B[i] - .035, B[i] + .035, p);
      if (k <= 0) continue;
      camP.lerp(tmpP.set(...stati[i][0]), k); camT.lerp(tmpT.set(...stati[i][1]), k);
    }
    camP.sub(camT).multiplyScalar(SPOSTA).add(camT);
    banco.updateMatrixWorld();
    camera.position.copy(banco.localToWorld(camP.clone()));
    camera.lookAt(banco.localToWorld(camT.clone()));
  }

  let W = 1, H = 1;
  function misura() {
    W = canvas.clientWidth; H = canvas.clientHeight;
    renderer.setSize(W, H, false);
    camera.aspect = W / H;
    if (!mobile) camera.setViewOffset(W, H, -W * .14, 0, W, H); else camera.clearViewOffset();
    camera.updateProjectionMatrix();
    etichette.forEach((el, i) => { el._h = el.offsetHeight; el._w = el.offsetWidth; el.classList.toggle('giu', i % 2 === 1); });
  }
  misura();
  new ResizeObserver(misura).observe(canvas);

  const v = new THREE.Vector3();
  let p = 0, ultimo = null, giro = 0, t = 0, primo = true;
  function disegna(ora) {
    ora = performance.now();
    if (ultimo === null) ultimo = ora;
    const dt = Math.min(.05, (ora - ultimo) / 1000); ultimo = ora; t += dt;
    const r = pista.getBoundingClientRect();
    const meta = clamp(-r.top / Math.max(1, r.height - innerHeight));
    p = primo ? meta : p + (meta - p) * (1 - Math.exp(-dt * 7));
    if (primo) { primo = false; canvas.classList.add('pronto'); }

    // tornitura
    const q1 = qf(1, p), xu = lerp(-L / 2 - .4, L / 2 + .15, liscio(.04, .9, q1));
    U.uTaglio.value = p < B[1] ? -9 : xu;
    const vedUt = liscio(B[1] - .04, B[1] + .01, p) * (1 - liscio(B[2] - .01, B[2] + .04, p));
    utensile.position.set(xu, raggioFinito(xu) + .02 + (1 - vedUt) * 3.5, 0);
    utensile.visible = vedUt > .001;
    // rettifica
    const q2 = qf(2, p), xm = lerp(-L / 2 - .9, L / 2 + .9, liscio(.04, .9, q2));
    U.uMola.value = p < B[2] ? -9 : xm;
    const vedMo = liscio(B[2] - .04, B[2] + .01, p) * (1 - liscio(B[3] - .01, B[3] + .05, p));
    mola.position.set(xm, 3.0 + (1 - vedMo) * 6, -1.6);
    mola.rotation.x -= dt * 9;
    mola.visible = vedMo > .001;
    // controllo
    const q4 = qf(4, p), xl = lerp(-L / 2 - .4, L / 2 + .4, liscio(.04, .62, q4));
    const vedAn = liscio(B[4] - .02, B[4] + .02, p) * (1 - liscio(B[5] - .02, B[5] + .02, p));
    anello.position.x = xl; anello.material.opacity = vedAn; anello.visible = vedAn > .01;
    anello.scale.setScalar(raggioFinito(xl) / .5 + .25);
    // lotto
    const q5 = qf(5, p), lot = liscio(0, .75, q5);
    const sp = lerp(1, SCALA_LOTTO, liscio(0, .5, q5));
    pezzo.scale.setScalar(sp);
    pezzo.position.set(centro.x * liscio(0, .5, q5), centro.y * liscio(0, .5, q5), 0);
    impianto.visible = lot < .25;

    giro += (p > B[5] ? 3 : 5.5) * dt;
    pezzo.rotation.x = giro;
    lotto.visible = lot > 0;
    if (lot > 0) {
      for (let i = 0; i < NUM; i++) {
        const P = posti[i];
        const k = P === centro ? 0 : fuori3(clamp((lot * 1.35 - P.d / dMax) / .35));
        p3.set(P.x, P.y + (1 - k) * -1.5, P.z);
        q.setFromEuler(eul.set(P.fase + t * P.vel * 3, 0, 0));
        sc3.setScalar(SCALA_LOTTO * k + 1e-4);
        lotto.setMatrixAt(i, mtx.compose(p3, q, sc3));
      }
      lotto.instanceMatrix.needsUpdate = true;
    }

    // particelle della fase in corso
    if (!ridotto) {
      if (vedUt > .5 && q1 > .04 && q1 < .9) {
        const y0 = raggioFinito(xu);
        for (let n = 0; n < 3; n++) emetti(0, xu + .05, y0 + .05, .1, .6 + Math.random() * 1.2, 1.4 + Math.random() * 1.8, .6 + Math.random() * 1.6, .7 + Math.random() * .5);
      }
      if (vedMo > .5 && q2 > .04 && q2 < .9) {
        for (let n = 0; n < 5; n++) emetti(1, xm + (Math.random() - .5) * 1.1, .42, -.2, (Math.random() - .5) * 2, Math.random() * 1.5, 2.6 + Math.random() * 3, .35 + Math.random() * .35);
      }
      if (p > B[3] + .01 && p < B[4] - .005 && Math.random() < .9) {
        emetti(2, (Math.random() - .5) * 10.5, -.9 - Math.random() * .4, (Math.random() - .5) * 1.4, 0, .5 + Math.random() * .6, 0, 2 + Math.random());
      }
    }
    aggiornaParticelle(dt);

    scene.environmentRotation.y = t * .12 + (p > B[3] && p < B[4] ? qf(3, p) * 3 : 0);
    inquadra(p, xu, xm);
    renderer.render(scene, camera);

    // etichette degli strumenti, attaccate al pezzo
    etichette.forEach((el, i) => {
      const x = Number(el.dataset.x), rr = Number(el.dataset.r), giu = i % 2 === 1;
      const vista = vedAn > .5 && xl > x;
      el.classList.toggle('vista', vista);
      if (!vista) return;
      banco.localToWorld(v.set(x, giu ? -rr - .04 : rr + .04, 0)).project(camera);
      const sx = (v.x * .5 + .5) * W, sy = (-v.y * .5 + .5) * H;
      const sinistra = sx + el._w > W - 12;   // vicino al bordo destro: il testo passa a sinistra del filo
      el.classList.toggle('sx', sinistra);
      el.style.transform = `translate3d(${(sinistra ? sx - el._w : sx).toFixed(1)}px, ${(giu ? sy + 44 : sy - 44 - el._h).toFixed(1)}px, 0)`;
    });
  }
  const loop = ciclo(disegna, pista, '20% 0px');
  loop.una();
}

/* ---------- avvio: l'hero subito, la sezione quando si avvicina ---------- */
try { scenaHero(); } catch (e) { console.warn('Hero 3D:', e); }
const pistaProcesso = document.querySelector('.processo-pista');
if (pistaProcesso && !html.classList.contains('statico')) {
  const io = new IntersectionObserver(([v]) => {
    if (!v.isIntersecting) return;
    io.disconnect();
    try { scenaProcesso(); } catch (e) { console.warn('Processo 3D:', e); html.classList.add('statico'); }
  }, { rootMargin: '150% 0px' });
  io.observe(pistaProcesso);
}
