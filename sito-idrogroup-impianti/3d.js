// Casa in sezione: i quattro impianti partono dalla centrale termica e si accendono scorrendo.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const liscio = (t) => t * t * (3 - 2 * t);
const fuori = (t) => 1 - Math.pow(1 - t, 3);
const molla = (t) => { const c1 = 1.5, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); };

// la casa è disegnata in coordinate di pianta: x 0..12 (est), z 0..8 (sud), y in alto
const W = (x, y, z) => new THREE.Vector3(x - 6, y, z - 4);

// [inizio, fine] del disegno di ogni impianto lungo la pista (stessi tagli dei testi in script.js)
const TRATTI = [[0.03, 0.2], [0.27, 0.42], [0.47, 0.62], [0.67, 0.82]];

export async function avvia({ canvas, pista, palco }) {
  const ridotto = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const poster = new URLSearchParams(location.search).has('poster');

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance', preserveDrawingBuffer: poster });
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 1.05;

  const scena = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scena.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scena.environmentIntensity = 0.75;
  pmrem.dispose();

  const sole = new THREE.DirectionalLight(0xffffff, 1.7);
  sole.position.set(-7, 14, 9);
  scena.add(sole);
  scena.add(new THREE.HemisphereLight(0xd8e8ff, 0x0b1e38, 0.55));

  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 200);

  const uTempo = { value: 0 };
  const sistemi = ['riscaldamento', 'acqua', 'clima', 'energia'].map((nome) => ({
    nome, uLuce: { value: 0 }, tubi: [], extra: [], disegno: 0, luce: 0,
  }));
  const [RISC, ACQUA, CLIMA, ENERGIA] = sistemi;

  // ---------- materiali ----------
  const matMuro = new THREE.MeshStandardMaterial({ color: 0xEEF2F6, roughness: 0.8 });
  const matTaglio = new THREE.MeshStandardMaterial({ color: 0x9FB6D6, roughness: 0.7 });
  const matSoletta = new THREE.MeshStandardMaterial({ color: 0x132B50, roughness: 0.95 });
  const matPavimento = new THREE.MeshStandardMaterial({ color: 0x163461, roughness: 0.92 });
  const matTecnico = new THREE.MeshStandardMaterial({ color: 0x1F477E, roughness: 0.88 });
  const matBianco = new THREE.MeshStandardMaterial({ color: 0xF4F6F9, roughness: 0.38 });
  const matScuro = new THREE.MeshStandardMaterial({ color: 0x2A3B52, roughness: 0.6 });
  const matRosso = new THREE.MeshStandardMaterial({ color: 0xD8452F, roughness: 0.45, metalness: 0.2 });
  const matBlu = new THREE.MeshStandardMaterial({ color: 0x2F6FE4, roughness: 0.45, metalness: 0.2 });
  const matPannello = new THREE.MeshStandardMaterial({ color: 0x173B85, roughness: 0.22, metalness: 0.45 });

  function materialeTubo(colore, sistema) {
    const m = new THREE.MeshStandardMaterial({ color: 0xDCE4EE, roughness: 0.4, side: THREE.DoubleSide });
    m.defines = { USE_UV: '' };
    const u = {
      uTempo,
      uLuce: sistema.uLuce,
      uDisegno: { value: 0 },
      uLun: { value: 1 },
      uFase: { value: Math.random() * 2 },
      uColore: { value: new THREE.Color(colore) },
    };
    m.userData.u = u;
    m.onBeforeCompile = (sh) => {
      Object.assign(sh.uniforms, u);
      sh.fragmentShader = sh.fragmentShader
        .replace('#include <common>', `#include <common>
uniform float uTempo, uLuce, uDisegno, uLun, uFase;
uniform vec3 uColore;`)
        .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
float sTubo = vUv.x * uLun;
if (vUv.x > uDisegno) discard;
float fase = fract((sTubo - uTempo * 1.55 + uFase) / 1.9);
float impulso = smoothstep(0.0, 0.1, fase) * (1.0 - smoothstep(0.1, 0.55, fase));
float punta = (1.0 - smoothstep(0.0, 0.6, (uDisegno - vUv.x) * uLun)) * (1.0 - step(0.999, uDisegno));
totalEmissiveRadiance += uColore * (uLuce * (0.55 + impulso * 3.6) + punta * 3.0);
diffuseColor.rgb = mix(diffuseColor.rgb, mix(diffuseColor.rgb, uColore, 0.6), clamp(uLuce, 0.0, 1.0));
diffuseColor.rgb *= mix(0.36, 1.0, clamp(uLuce * 1.6, 0.0, 1.0));`);
    };
    m.customProgramCacheKey = () => 'tubo-idrogroup';
    return m;
  }

  // percorso a gomiti raccordati, come un tubo vero
  function percorso(punti, raggio = 0.2) {
    const P = [];
    for (const p of punti) {
      const v = W(p[0], p[1], p[2]);
      if (!P.length || v.distanceTo(P[P.length - 1]) > 1e-4) P.push(v);
    }
    const cp = new THREE.CurvePath();
    let cur = P[0].clone();
    for (let i = 1; i < P.length; i++) {
      const a = P[i - 1], b = P[i];
      if (i < P.length - 1) {
        const c = P[i + 1];
        const d1 = b.clone().sub(a), d2 = c.clone().sub(b);
        const r = Math.min(raggio, d1.length() * 0.5, d2.length() * 0.5);
        const p1 = b.clone().sub(d1.normalize().multiplyScalar(r));
        const p2 = b.clone().add(d2.normalize().multiplyScalar(r));
        if (cur.distanceTo(p1) > 1e-4) cp.add(new THREE.LineCurve3(cur.clone(), p1));
        if (d1.dot(d2) > 0.9999) { cur = p1; continue; }
        cp.add(new THREE.QuadraticBezierCurve3(p1, b.clone(), p2));
        cur = p2;
      } else {
        cp.add(new THREE.LineCurve3(cur.clone(), b.clone()));
      }
    }
    return cp;
  }

  const casa = new THREE.Group();
  scena.add(casa);

  // alone: un tubo più largo, additivo, che si accende con gli impulsi (bloom finto, leggero)
  function materialeAlone(colore, sistema, uDisegno, uLun, uFase) {
    const c = new THREE.Color(colore); // valori sRGB passati a mano: lo shader scrive diretto
    return new THREE.ShaderMaterial({
      uniforms: { uTempo, uLuce: sistema.uLuce, uDisegno, uLun, uFase, uColore: { value: new THREE.Vector3(c.r, c.g, c.b) } },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexShader: `
        varying vec2 vUv; varying float vBordo;
        void main() {
          vUv = uv;
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          vec3 n = normalize(normalMatrix * normal);
          vBordo = abs(dot(n, normalize(-mv.xyz)));
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: `
        uniform float uTempo, uLuce, uDisegno, uLun, uFase; uniform vec3 uColore;
        varying vec2 vUv; varying float vBordo;
        void main() {
          if (vUv.x > uDisegno) discard;
          float s = vUv.x * uLun;
          float fase = fract((s - uTempo * 1.55 + uFase) / 1.9);
          float impulso = smoothstep(0.0, 0.1, fase) * (1.0 - smoothstep(0.1, 0.6, fase));
          float punta = (1.0 - smoothstep(0.0, 0.8, (uDisegno - vUv.x) * uLun)) * (1.0 - step(0.999, uDisegno));
          float a = (uLuce * (0.16 + impulso * 0.85) + punta * 0.9) * pow(vBordo, 1.6);
          gl_FragColor = vec4(uColore * a, a);
        }`,
    });
  }

  function tubo(sistema, punti, colore, { r = 0.034, raggio = 0.2, ritardo = 0 } = {}) {
    const curva = percorso(punti, raggio);
    const lun = curva.getLength();
    const seg = Math.max(10, Math.ceil(lun * 12));
    const geo = new THREE.TubeGeometry(curva, seg, r, 7, false);
    const mat = materialeTubo(colore, sistema);
    mat.userData.u.uLun.value = lun;
    const mesh = new THREE.Mesh(geo, mat);
    mesh.userData.ritardo = ritardo;
    mesh.visible = false;
    const u = mat.userData.u;
    const alone = new THREE.Mesh(new THREE.TubeGeometry(curva, Math.ceil(seg * 0.6), r * 3.4, 6, false), materialeAlone(colore, sistema, u.uDisegno, u.uLun, u.uFase));
    alone.renderOrder = 2;
    mesh.add(alone);
    casa.add(mesh);
    sistema.tubi.push(mesh);
    return mesh;
  }

  function scatola(mat, [sx, sy, sz], [x, y, z], { r = 0.06, ry = 0, sistema = null } = {}) {
    const geo = r > 0 ? new RoundedBoxGeometry(sx, sy, sz, 2, r) : new THREE.BoxGeometry(sx, sy, sz);
    const m = new THREE.Mesh(geo, mat);
    m.position.copy(W(x, y, z));
    m.rotation.y = ry;
    if (sistema) {
      const g = new THREE.Group();
      g.position.copy(m.position);
      m.position.set(0, 0, 0);
      g.add(m);
      g.userData.base = g.position.clone();
      g.scale.setScalar(0.001);
      g.visible = false;
      casa.add(g);
      sistema.extra.push(g);
      return g;
    }
    casa.add(m);
    return m;
  }

  // ---------- soletta e pavimenti ----------
  const soletta = new THREE.Mesh(new THREE.BoxGeometry(12.6, 0.26, 8.6), matSoletta);
  soletta.position.copy(W(6, -0.13, 4));
  casa.add(soletta);
  const pav = new THREE.Mesh(new THREE.PlaneGeometry(12, 8), matPavimento);
  pav.rotation.x = -Math.PI / 2;
  pav.position.copy(W(6, 0.002, 4));
  casa.add(pav);
  const pavTec = new THREE.Mesh(new THREE.PlaneGeometry(3, 3), matTecnico);
  pavTec.rotation.x = -Math.PI / 2;
  pavTec.position.copy(W(5, 0.004, 6.5));
  casa.add(pavTec);

  // reticolo di tracciamento sul massetto
  {
    const pts = [];
    for (let x = 0.5; x < 12; x += 0.5) pts.push(W(x, 0.006, 0), W(x, 0.006, 8));
    for (let z = 0.5; z < 8; z += 0.5) pts.push(W(0, 0.006, z), W(12, 0.006, z));
    const g = new THREE.BufferGeometry().setFromPoints(pts);
    const l = new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: 0x5F86BE, transparent: true, opacity: 0.16 }));
    casa.add(l);
  }

  // ombra morbida sotto la casa
  {
    const c = document.createElement('canvas');
    c.width = c.height = 128;
    const g = c.getContext('2d');
    const grd = g.createRadialGradient(64, 64, 10, 64, 64, 64);
    grd.addColorStop(0, 'rgba(3,10,22,0.75)');
    grd.addColorStop(1, 'rgba(3,10,22,0)');
    g.fillStyle = grd;
    g.fillRect(0, 0, 128, 128);
    const t = new THREE.CanvasTexture(c);
    const o = new THREE.Mesh(new THREE.PlaneGeometry(19, 14), new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false }));
    o.rotation.x = -Math.PI / 2;
    o.position.set(0, -0.27, 0);
    casa.add(o);
  }

  // ---------- muri (tagliati bassi, come un plastico) ----------
  const H = 0.8;
  const muri = [];
  const segmenti = [
    // perimetro, con le aperture delle portefinestre e dell'ingresso
    [0, 0, 1.2, 0, 0.26], [2.9, 0, 12, 0, 0.26],
    [12, 0, 12, 8, 0.26],
    [0, 8, 7.6, 8, 0.26], [8.6, 8, 12, 8, 0.26],
    [0, 0, 0, 2.0, 0.26], [0, 3.0, 0, 8, 0.26],
    // interni
    [6.5, 0, 6.5, 3.6, 0.14], [6.5, 4.5, 6.5, 5, 0.14],
    [0, 5, 0.9, 5, 0.14], [3.5, 5, 4.0, 5, 0.14], [4.9, 5, 6.5, 5, 0.14],
    [3.5, 5, 3.5, 8, 0.14],
    [6.5, 3, 7.3, 3, 0.14], [8.1, 3, 9, 3, 0.14],
    [9, 0, 9, 3.4, 0.14], [9, 4.3, 9, 5, 0.14],
    [6.5, 5, 7.2, 5, 0.14], [8.1, 5, 12, 5, 0.14],
    [6.5, 5, 6.5, 8, 0.14],
  ];
  const centroTec = W(5, 0, 6.5);
  for (const [x1, z1, x2, z2, sp] of segmenti) {
    const orizz = z1 === z2;
    const sx = orizz ? Math.abs(x2 - x1) + sp : sp;
    const sz = orizz ? sp : Math.abs(z2 - z1) + sp;
    const g = new THREE.Group();
    const corpo = new THREE.Mesh(new THREE.BoxGeometry(sx, H, sz), matMuro);
    corpo.position.y = H / 2;
    const taglio = new THREE.Mesh(new THREE.BoxGeometry(sx + 0.004, 0.02, sz + 0.004), matTaglio);
    taglio.position.y = H + 0.01;
    g.add(corpo, taglio);
    g.position.copy(W((x1 + x2) / 2, 0, (z1 + z2) / 2));
    g.userData.ritardo = g.position.distanceTo(centroTec) * 0.06;
    g.scale.y = 0.001;
    casa.add(g);
    muri.push(g);
  }

  // ---------- 1. riscaldamento: collettore, caldaia, pavimento radiante ----------
  scatola(matRosso, [0.09, 0.09, 1.25], [6.27, 0.34, 5.95], { r: 0.03 });
  scatola(matBlu, [0.09, 0.09, 1.25], [6.27, 0.2, 5.95], { r: 0.03 });
  scatola(matBianco, [0.48, 0.66, 0.3], [5.75, 0.45, 7.72], { r: 0.05, sistema: RISC });

  function serpentina(xa, xb, za, zb, righe) {
    const pts = [];
    const passo = (zb - za) / (righe - 1);
    for (let i = 0; i < righe; i++) {
      const z = za + passo * i;
      if (i % 2 === 0) pts.push([xa, 0.05, z], [xb, 0.05, z]);
      else pts.push([xb, 0.05, z], [xa, 0.05, z]);
    }
    return pts;
  }
  const RAD = { raggio: 0.21, r: 0.042 };
  const caldo = 0xFF7A3D;
  // soggiorno
  tubo(RISC, [[6.27, 0.34, 5.52], [6.27, 0.05, 5.52], [5.95, 0.05, 5.52], [5.95, 0.05, 4.55],
    ...serpentina(5.95, 0.45, 4.55, 0.55, 10), [6.15, 0.05, 0.55], [6.15, 0.05, 5.4], [6.27, 0.05, 5.4], [6.27, 0.2, 5.4]], caldo, { ...RAD, ritardo: 0 });
  // cucina
  tubo(RISC, [[6.27, 0.34, 5.64], [6.27, 0.05, 5.64], [3.2, 0.05, 5.64],
    ...serpentina(3.2, 0.42, 5.64, 7.2, 4).slice(1), [3.36, 0.05, 7.2], [3.36, 0.05, 5.76], [6.27, 0.05, 5.76], [6.27, 0.2, 5.76]], caldo, { ...RAD, ritardo: 0.12 });
  // bagno
  tubo(RISC, [[6.27, 0.34, 5.88], [6.27, 0.05, 5.88], [6.62, 0.05, 5.88], [6.62, 0.05, 0.42], [8.68, 0.05, 0.42],
    [8.68, 0.05, 0.82], [6.78, 0.05, 0.82], [6.78, 0.05, 1.22], [8.68, 0.05, 1.22], [8.68, 0.05, 1.62], [6.78, 0.05, 1.62],
    [6.78, 0.05, 2.02], [8.68, 0.05, 2.02], [8.68, 0.05, 2.42], [6.78, 0.05, 2.42],
    [6.78, 0.05, 6.0], [6.27, 0.05, 6.0], [6.27, 0.2, 6.0]], caldo, { ...RAD, ritardo: 0.2 });
  // camera
  tubo(RISC, [[6.27, 0.34, 6.12], [6.27, 0.05, 6.12], [6.95, 0.05, 6.12], [6.95, 0.05, 4.75], [11.65, 0.05, 4.75],
    ...serpentina(11.65, 9.38, 4.32, 0.4, 10), [11.82, 0.05, 0.4], [11.82, 0.05, 4.9], [7.1, 0.05, 4.9], [7.1, 0.05, 6.24], [6.27, 0.05, 6.24], [6.27, 0.2, 6.24]], caldo, { ...RAD, ritardo: 0.3 });
  // camera 2
  tubo(RISC, [[6.27, 0.34, 6.48], [6.27, 0.05, 6.48], [6.72, 0.05, 6.48], [6.72, 0.05, 7.66],
    [11.65, 0.05, 7.66], [11.65, 0.05, 7.26], [7.0, 0.05, 7.26], [7.0, 0.05, 6.86], [11.65, 0.05, 6.86], [11.65, 0.05, 6.46], [7.0, 0.05, 6.46],
    [7.0, 0.05, 6.36], [6.27, 0.05, 6.36], [6.27, 0.2, 6.36]], caldo, { ...RAD, ritardo: 0.38 });

  // ---------- 2. acqua: lavello, bagno, doccia ----------
  const fredda = 0x5CD6FF, calda = 0xFF5A4A;
  scatola(matBianco, [0.6, 0.62, 1.5], [0.43, 0.31, 6.3], { r: 0.04, sistema: ACQUA });
  scatola(matBianco, [0.4, 0.42, 0.56], [7.05, 0.21, 0.42], { r: 0.1, sistema: ACQUA });
  scatola(matBianco, [0.6, 0.14, 0.44], [8.12, 0.6, 0.36], { r: 0.05, sistema: ACQUA });
  scatola(matBianco, [0.9, 0.06, 0.9], [8.48, 0.03, 2.5], { r: 0.02, sistema: ACQUA });
  const AQ = { r: 0.06, raggio: 0.18 };
  tubo(ACQUA, [[3.64, 0.28, 6.7], [3.64, 0.28, 7.42], [0.95, 0.28, 7.42], [0.95, 0.28, 6.9], [0.74, 0.28, 6.9]], fredda, { ...AQ, ritardo: 0 });
  tubo(ACQUA, [[3.76, 0.28, 6.7], [3.76, 0.28, 7.3], [1.07, 0.28, 7.3], [1.07, 0.28, 6.74], [0.74, 0.28, 6.74]], calda, { ...AQ, ritardo: 0.06 });
  tubo(ACQUA, [[6.3, 0.28, 5.12], [8.8, 0.28, 5.12], [8.8, 0.28, 0.66], [7.05, 0.28, 0.66], [7.05, 0.28, 0.72]], fredda, { ...AQ, ritardo: 0.12 });
  tubo(ACQUA, [[6.3, 0.28, 5.24], [8.68, 0.28, 5.24], [8.68, 0.28, 0.78], [8.12, 0.28, 0.78], [8.12, 0.28, 0.6]], calda, { ...AQ, ritardo: 0.18 });
  tubo(ACQUA, [[8.8, 0.28, 3.3], [8.5, 0.28, 3.3], [8.5, 0.28, 2.98]], fredda, { ...AQ, ritardo: 0.45 });
  tubo(ACQUA, [[8.68, 0.28, 3.44], [8.36, 0.28, 3.44], [8.36, 0.28, 2.98]], calda, { ...AQ, ritardo: 0.5 });

  // ---------- 3. clima: unità esterna, split, aria ----------
  const ghiaccio = 0x9FE6FF;
  scatola(matBianco, [0.4, 0.82, 0.95], [12.72, 0.41, 6.4], { r: 0.05, sistema: CLIMA });
  const split = [
    { pos: [3.0, 0.68, 0.27], ry: 0, dir: new THREE.Vector3(0, -0.3, 1) },
    { pos: [11.73, 0.68, 2.4], ry: Math.PI / 2, dir: new THREE.Vector3(-1, -0.3, 0) },
    { pos: [9.6, 0.68, 7.73], ry: 0, dir: new THREE.Vector3(0, -0.3, -1) },
  ];
  for (const s of split) scatola(matBianco, [0.95, 0.28, 0.2], s.pos, { r: 0.06, ry: s.ry, sistema: CLIMA });
  const CL = { r: 0.045, raggio: 0.22 };
  tubo(CLIMA, [[12.72, 0.82, 6.2], [12.72, 1.05, 6.2], [12.72, 1.05, 2.4], [11.78, 1.05, 2.4], [11.78, 0.83, 2.4]], ghiaccio, { ...CL, ritardo: 0 });
  tubo(CLIMA, [[12.72, 0.82, 6.6], [12.72, 1.05, 6.6], [9.6, 1.05, 6.6], [9.6, 1.05, 7.7], [9.6, 0.83, 7.7]], ghiaccio, { ...CL, ritardo: 0.1 });
  tubo(CLIMA, [[12.72, 0.82, 6.4], [12.72, 1.15, 6.4], [7.8, 1.15, 6.4], [7.8, 1.15, 0.5], [3.0, 1.15, 0.5], [3.0, 0.83, 0.3]], ghiaccio, { ...CL, ritardo: 0.2 });

  // aria che esce dagli split
  const aria = (() => {
    const N = 42;
    const pos = [], seme = [], dir = [], lat = [];
    for (const s of split) {
      const o = W(...s.pos);
      const d = s.dir.clone().normalize();
      const l = new THREE.Vector3(0, 1, 0).cross(d).normalize();
      for (let i = 0; i < N; i++) {
        pos.push(o.x + d.x * 0.14, o.y - 0.08, o.z + d.z * 0.14);
        seme.push(Math.random());
        dir.push(d.x, d.y, d.z);
        lat.push(l.x * (Math.random() - 0.5) * 0.9, 0, l.z * (Math.random() - 0.5) * 0.9);
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('aSeme', new THREE.Float32BufferAttribute(seme, 1));
    g.setAttribute('aDir', new THREE.Float32BufferAttribute(dir, 3));
    g.setAttribute('aLat', new THREE.Float32BufferAttribute(lat, 3));
    const m = new THREE.ShaderMaterial({
      uniforms: { uTempo, uLuce: CLIMA.uLuce, uScala: { value: 300 } },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexShader: `
        attribute float aSeme; attribute vec3 aDir; attribute vec3 aLat;
        uniform float uTempo, uScala; varying float vA;
        void main() {
          float t = fract(uTempo * 0.42 + aSeme);
          vec3 p = position + aDir * t * 1.5 + aLat * t + vec3(0.0, -t * t * 0.35, 0.0);
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          gl_Position = projectionMatrix * mv;
          gl_PointSize = uScala * (0.05 + t * 0.09) / -mv.z;
          vA = smoothstep(0.0, 0.12, t) * (1.0 - t);
        }`,
      fragmentShader: `
        uniform float uLuce; varying float vA;
        void main() {
          float d = length(gl_PointCoord - 0.5);
          float a = smoothstep(0.5, 0.0, d) * vA * uLuce * 0.55;
          gl_FragColor = vec4(0.66, 0.9, 1.0, a);
        }`,
    });
    const punti = new THREE.Points(g, m);
    punti.frustumCulled = false;
    casa.add(punti);
    return m;
  })();

  // ---------- 4. energie alternative: pompa di calore, solare termico, accumulo ----------
  const verde = 0x45E0A0;
  const pdc = scatola(matBianco, [1.15, 0.95, 0.44], [5.0, 0.475, 8.78], { r: 0.06, sistema: ENERGIA });
  {
    const grata = new THREE.Mesh(new THREE.CircleGeometry(0.3, 32), matScuro);
    grata.position.set(-0.18, 0.02, 0.225);
    pdc.add(grata);
  }
  const accumulo = new THREE.Group();
  {
    const corpo = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 1.7, 40), matBianco);
    corpo.position.y = 0.85;
    const fascia = new THREE.Mesh(new THREE.CylinderGeometry(0.385, 0.385, 0.06, 40), matBlu);
    fascia.position.y = 1.35;
    accumulo.add(corpo, fascia);
    accumulo.position.copy(W(4.3, 0, 7.35));
    casa.add(accumulo);
  }
  const pannelli = new THREE.Group();
  for (const x of [1.25, 2.9, 4.55]) {
    const p = new THREE.Group();
    const vetro = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.05, 1.0), matPannello);
    const telaio = new THREE.Mesh(new THREE.BoxGeometry(1.56, 0.04, 1.06), matBianco);
    telaio.position.y = -0.02;
    p.add(telaio, vetro);
    p.position.copy(W(x, 2.6, 1.7));
    p.rotation.x = 0.5;
    pannelli.add(p);
  }
  {
    const g = new THREE.Group();
    g.add(pannelli);
    g.userData.base = new THREE.Vector3(0, 0, 0);
    g.userData.cala = true;
    g.visible = false;
    casa.add(g);
    ENERGIA.extra.push(g);
  }
  const EN = { r: 0.05, raggio: 0.22 };
  tubo(ENERGIA, [[5.0, 0.6, 8.55], [5.0, 0.6, 7.86], [4.4, 0.6, 7.86], [4.4, 0.6, 7.6]], verde, { ...EN, ritardo: 0 });
  tubo(ENERGIA, [[5.2, 0.4, 8.55], [5.2, 0.4, 7.72], [4.5, 0.4, 7.72], [4.42, 0.4, 7.5]], verde, { ...EN, ritardo: 0.06 });
  tubo(ENERGIA, [[5.32, 2.52, 1.95], [6.2, 2.52, 1.95], [6.2, 1.82, 1.95], [6.2, 1.82, 7.35], [4.3, 1.82, 7.35], [4.3, 1.72, 7.35]], verde, { ...EN, ritardo: 0.25 });
  tubo(ENERGIA, [[5.32, 2.4, 2.15], [6.06, 2.4, 2.15], [6.06, 1.7, 2.15], [6.06, 1.7, 7.0], [4.45, 1.7, 7.0], [4.45, 1.4, 7.03]], verde, { ...EN, ritardo: 0.3 });

  // ---------- inquadratura ----------
  const base = { dist: 30, mobile: false };
  function inquadra() {
    const w = canvas.clientWidth || 1, h = canvas.clientHeight || 1;
    const asp = w / h;
    base.mobile = asp < 0.9;
    const dpr = Math.min(window.devicePixelRatio || 1, base.mobile ? 1.5 : 2);
    renderer.setPixelRatio(dpr);
    renderer.setSize(w, h, false);
    camera.fov = base.mobile ? 40 : 29;
    camera.aspect = asp;
    const vf = THREE.MathUtils.degToRad(camera.fov) / 2;
    const hf = Math.atan(Math.tan(vf) * asp);
    base.dist = 7.4 / Math.sin(Math.min(vf, hf)) * (base.mobile ? 0.98 : 1.17);
    if (poster) camera.clearViewOffset();
    else if (base.mobile) camera.setViewOffset(w, h, 0, h * 0.17, w, h);
    else camera.setViewOffset(w, h, -w * 0.205, h * 0.015, w, h);
    camera.updateProjectionMatrix();
    aria.uniforms.uScala.value = h * dpr * 0.5 / Math.tan(vf);
  }

  // dove guarda la camera in ogni passo: punto, distanza e angolo dalla verticale
  const FUOCHI = [
    { t: 0.0, p: new THREE.Vector3(0, 0, 0.2), d: 1.0, f: 0.74 },
    { t: 0.12, p: new THREE.Vector3(-0.4, 0, 0.3), d: 0.92, f: 0.7 },
    { t: 0.36, p: new THREE.Vector3(0.3, 0, 0.1), d: 0.9, f: 0.52 },
    { t: 0.56, p: new THREE.Vector3(1.2, 0.3, 0.2), d: 0.93, f: 0.78 },
    { t: 0.76, p: new THREE.Vector3(-0.6, 0.7, 0.8), d: 0.98, f: 0.84 },
    { t: 0.94, p: new THREE.Vector3(0, 0.4, 0.2), d: 1.04, f: 0.8 },
  ];
  let fiFuoco = 0.74;
  const fuoco = new THREE.Vector3();
  function fuocoA(p) {
    let a = FUOCHI[0], b = FUOCHI[FUOCHI.length - 1];
    for (let i = 0; i < FUOCHI.length - 1; i++) {
      if (p >= FUOCHI[i].t && p <= FUOCHI[i + 1].t) { a = FUOCHI[i]; b = FUOCHI[i + 1]; break; }
    }
    if (p > b.t) a = b;
    const k = a === b ? 0 : liscio(clamp((p - a.t) / (b.t - a.t)));
    fuoco.lerpVectors(a.p, b.p, k).multiplyScalar(base.mobile ? 0.45 : 1);
    const d = lerp(a.d, b.d, k);
    fiFuoco = lerp(a.f, b.f, k);
    return base.mobile ? 1 + (d - 1) * 0.5 : d;
  }

  // ---------- stato ----------
  let pLiscio = 0;
  let tIntro = -1;
  let tPrec = performance.now();
  let attivo = false;

  function progresso() {
    if (window.__pista) return window.__pista.p;
    const r = pista.getBoundingClientRect();
    return clamp(-r.top / Math.max(1, r.height - innerHeight));
  }
  function passo(p) {
    if (window.__pista) return window.__pista.passo;
    return p < 0.26 ? 0 : p < 0.46 ? 1 : p < 0.66 ? 2 : p < 0.85 ? 3 : 4;
  }

  function aggiorna(ora, dt, forzaFine = false) {
    uTempo.value = ora / 1000;
    const pv = forzaFine ? 1 : progresso();
    pLiscio = forzaFine ? 1 : pLiscio + (pv - pLiscio) * (1 - Math.exp(-dt * 5));
    const p = pLiscio;
    const ps = forzaFine ? 4 : passo(pv);

    // muri che si alzano
    if (tIntro < 0) {
      const r = pista.getBoundingClientRect();
      if (forzaFine || r.top < innerHeight * 0.9) tIntro = ora;
    }
    const ti = forzaFine ? 99 : tIntro < 0 ? 0 : (ora - tIntro) / 1000;
    for (const m of muri) {
      const k = fuori(clamp((ti - m.userData.ritardo) / 0.9));
      m.scale.y = Math.max(0.001, k);
    }

    // impianti
    sistemi.forEach((s, i) => {
      const [a, b] = TRATTI[i];
      s.disegno = forzaFine ? 1 : clamp((p - a) / (b - a));
      const bersaglio = ps === 4 ? 0.85 : ps === i ? 1 : s.disegno > 0 ? 0.05 : 0;
      s.luce = forzaFine ? bersaglio : s.luce + (bersaglio - s.luce) * (1 - Math.exp(-dt * 4));
      s.uLuce.value = s.luce;
      for (const t of s.tubi) {
        const rit = t.userData.ritardo;
        const d = clamp((s.disegno - rit * 0.5) / (1 - rit * 0.5));
        t.visible = d > 0.001;
        t.material.userData.u.uDisegno.value = d >= 0.999 ? 1.0 : d;
      }
      for (const g of s.extra) {
        const k = clamp((s.disegno - 0.05) / 0.45);
        g.visible = k > 0.001;
        if (g.userData.cala) {
          g.position.y = (1 - fuori(k)) * 3.2;
          g.scale.setScalar(1);
        } else {
          g.scale.setScalar(Math.max(0.001, molla(k)));
        }
      }
    });

    // camera
    const k = fuocoA(p);
    const theta = lerp(-0.6, 0.36, liscio(p)) + Math.sin(ora * 0.00022) * 0.025;
    const phi = fiFuoco;
    const d = base.dist * k * (1 + Math.sin(ora * 0.00031) * 0.006);
    camera.position.set(
      fuoco.x + d * Math.sin(phi) * Math.sin(theta),
      fuoco.y + d * Math.cos(phi),
      fuoco.z + d * Math.sin(phi) * Math.cos(theta),
    );
    camera.lookAt(fuoco);
  }

  function disegna(ora) {
    const dt = Math.min(0.1, (ora - tPrec) / 1000);
    tPrec = ora;
    aggiorna(ora, dt, poster || ridotto);
    renderer.render(scena, camera);
  }

  function ciclo() {
    if (!attivo) return;
    disegna(performance.now());
    requestAnimationFrame(ciclo);
  }
  function accendi() {
    if (attivo || poster || ridotto || document.hidden) return;
    attivo = true;
    tPrec = performance.now();
    requestAnimationFrame(ciclo);
  }
  function spegni() { attivo = false; }

  inquadra();
  new ResizeObserver(() => { inquadra(); if (!attivo) disegna(performance.now()); }).observe(canvas);

  // compila anche quello che compare dopo, così non scatta a metà pista
  const nascosti = [];
  casa.traverse((o) => { if (!o.visible) { nascosti.push(o); o.visible = true; } });
  await renderer.compileAsync(scena, camera);
  for (const o of nascosti) o.visible = false;
  aggiorna(performance.now(), 0, poster || ridotto);
  disegna(performance.now());
  canvas.classList.add('pronta');
  palco.classList.add('palco--3d');

  if (poster || ridotto) return { renderer };

  let inVista = false;
  new IntersectionObserver(([e]) => {
    inVista = e.isIntersecting;
    if (inVista) accendi(); else spegni();
  }, { rootMargin: '20% 0px' }).observe(pista);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) spegni(); else if (inVista) accendi();
  });

  window.__scena3d = { renderer, scena, camera };
  return { renderer };
}
