// Ciclo di stampaggio a iniezione: i granuli cadono nella tramoggia, lo stampo si chiude,
// la linea di giunzione si accende (iniezione), lo stampo si apre e il pezzo esce verso chi guarda.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const T = 6.6; // durata di un ciclo, in secondi
const FASI = [
  ['Chiusura stampo', 0, 0.7],
  ['Iniezione', 0.7, 1.35],
  ['Raffreddamento', 1.35, 1.95],
  ['Apertura', 1.95, 2.55],
  ['Estrazione', 2.55, 3.3],
  ['Pezzo pronto', 3.3, T],
];
const INTRO = 0.85;   // l'ingresso dei due semistampi, solo al primo ciclo
const CORSA = 2.4;    // apertura del semistampo mobile
const YAW = 0.5;
const PITCH = 0.17;
const CENTRO = new THREE.Vector3(-0.3, 0.02, 0);
const SOGG_L = 5.1;   // ingombro del soggetto da far stare nel palco
const SOGG_A = 3.7;
const SP = 0.14;      // spessore degli ingranaggi

const seg = (t, a, b) => Math.min(1, Math.max(0, (t - a) / (b - a)));
const inOut = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
const easeIn = (x) => x * x * x;
const easeOut = (x) => 1 - Math.pow(1 - x, 3);
const back = (x) => { const c1 = 1.3, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); };

const INGRANAGGI = [
  { x: -0.55, y: 0.55, denti: 18, re: 0.4, ri: 0.345, foro: 0.085 },
  { x: 0.55, y: 0.55, denti: 13, re: 0.31, ri: 0.26, foro: 0.07 },
  { x: 0.55, y: -0.55, denti: 18, re: 0.4, ri: 0.345, foro: 0.085 },
  { x: -0.55, y: -0.55, denti: 13, re: 0.31, ri: 0.26, foro: 0.07 },
];

function profilo(g) {
  const pts = [];
  const passo = (Math.PI * 2) / g.denti;
  const add = (r, a) => pts.push(new THREE.Vector2(g.x + Math.cos(a) * r, g.y + Math.sin(a) * r));
  for (let i = 0; i < g.denti; i++) {
    const a = i * passo;
    add(g.ri, a);
    add(g.re, a + passo * 0.2);
    add(g.re, a + passo * 0.46);
    add(g.ri, a + passo * 0.66);
    add(g.ri, a + passo * 0.83);
  }
  return pts;
}

function cerchio(cx, cy, r) {
  const p = new THREE.Path();
  p.absarc(cx, cy, r, 0, Math.PI * 2, false);
  return p;
}

function geoPezzo() {
  const parti = [];
  for (const g of INGRANAGGI) {
    const s = new THREE.Shape(profilo(g));
    s.holes.push(cerchio(g.x, g.y, g.foro));
    const rl = g.ri * 0.58, rf = g.ri * 0.135;
    for (let k = 0; k < 4; k++) {
      const a = Math.PI / 4 + (k * Math.PI) / 2;
      s.holes.push(cerchio(g.x + Math.cos(a) * rl, g.y + Math.sin(a) * rl, rf));
    }
    const geo = new THREE.ExtrudeGeometry(s, {
      depth: SP, bevelEnabled: true, bevelThickness: 0.014, bevelSize: 0.012, bevelSegments: 2, curveSegments: 16,
    });
    geo.translate(0, 0, -SP / 2);
    parti.push(geo);

    // canale di colata dal centro all'ingranaggio
    const len = Math.hypot(g.x, g.y);
    const da = 0.06, a = len - g.ri + 0.03;
    const canale = new THREE.CylinderGeometry(0.042, 0.042, a - da, 14);
    canale.rotateZ(Math.atan2(g.y, g.x) - Math.PI / 2);
    const m = (da + a) / 2;
    canale.translate((g.x / len) * m, (g.y / len) * m, 0);
    parti.push(canale.toNonIndexed());
  }
  const mozzo = new THREE.SphereGeometry(0.088, 18, 12);
  parti.push(mozzo.toNonIndexed());
  // materozza: più larga sul pezzo, stretta verso l'ugello
  const materozza = new THREE.CylinderGeometry(0.048, 0.095, 0.56, 20);
  materozza.rotateX(-Math.PI / 2);
  materozza.translate(0, 0, -0.29);
  parti.push(materozza.toNonIndexed());
  return mergeGeometries(parti.map((g) => { g.deleteAttribute('uv'); return g; }), false);
}

function geoFacciaCavita() {
  const w = 1.1, h = 1.25, r = 0.05;
  const s = new THREE.Shape();
  s.moveTo(-w + r, -h);
  s.lineTo(w - r, -h); s.quadraticCurveTo(w, -h, w, -h + r);
  s.lineTo(w, h - r); s.quadraticCurveTo(w, h, w - r, h);
  s.lineTo(-w + r, h); s.quadraticCurveTo(-w, h, -w, h - r);
  s.lineTo(-w, -h + r); s.quadraticCurveTo(-w, -h, -w + r, -h);
  for (const g of INGRANAGGI) s.holes.push(new THREE.Path(profilo(g)));
  s.holes.push(cerchio(0, 0, 0.11));
  const geo = new THREE.ExtrudeGeometry(s, {
    depth: 0.14, bevelEnabled: true, bevelThickness: 0.01, bevelSize: 0.01, bevelSegments: 1, curveSegments: 12,
  });
  geo.rotateY(Math.PI / 2);
  geo.translate(-0.155, 0, 0);
  return geo;
}

function texturaMorbida(stop) {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const x = c.getContext('2d');
  const g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
  stop.forEach(([o, col]) => g.addColorStop(o, col));
  x.fillStyle = g;
  x.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function avvia({ canvas, hero, palco, hmi, riduci }) {
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  } catch (e) {
    return false;
  }
  if (!renderer.getContext()) return false;

  const mobile = () => innerWidth < 960;
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 1.02;

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.95;
  pmrem.dispose();

  const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 100);

  const luce = new THREE.DirectionalLight(0xffffff, 1.7);
  luce.position.set(4, 7, 6);
  scene.add(luce);
  const controluce = new THREE.DirectionalLight(0xdfe9ff, 0.7);
  controluce.position.set(-6, 3, -4);
  scene.add(controluce);
  const luceFuso = new THREE.PointLight(0x7dffa0, 0, 5, 1.6);
  luceFuso.position.set(0.15, 0, 1.45);
  scene.add(luceFuso);

  // materiali
  const acciaio = new THREE.MeshStandardMaterial({ color: 0xc6cdd2, metalness: 1, roughness: 0.32 });
  const acciaioFaccia = new THREE.MeshStandardMaterial({ color: 0xd6dce0, metalness: 1, roughness: 0.2 });
  const verniciato = new THREE.MeshStandardMaterial({ color: 0x3a464e, metalness: 0.55, roughness: 0.42 });
  const cromo = new THREE.MeshStandardMaterial({ color: 0xf1f4f6, metalness: 1, roughness: 0.1 });
  const brunito = new THREE.MeshStandardMaterial({ color: 0x2b3237, metalness: 0.8, roughness: 0.38 });
  const fasce = new THREE.MeshStandardMaterial({ color: 0x2f363b, metalness: 0.7, roughness: 0.45, emissive: 0xff6a1a, emissiveIntensity: 0.08 });
  const tubo = new THREE.MeshStandardMaterial({ color: 0x3f79b0, metalness: 0.05, roughness: 0.5 });
  const plastica = new THREE.MeshPhysicalMaterial({
    color: 0x3fc463, roughness: 0.3, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.12,
    emissive: 0x2fae58, emissiveIntensity: 0,
  });
  const tramoggiaMat = new THREE.MeshStandardMaterial({ color: 0xbfc7cc, metalness: 1, roughness: 0.3, side: THREE.DoubleSide });

  const radice = new THREE.Group();
  scene.add(radice);

  // ---------- semistampo fisso (lato iniezione) ----------
  const fisso = new THREE.Group();
  radice.add(fisso);
  fisso.add(new THREE.Mesh(geoFacciaCavita(), acciaioFaccia));
  const piastraF = new THREE.Mesh(new RoundedBoxGeometry(1.1, 2.5, 2.2, 2, 0.04), acciaio);
  piastraF.position.x = -0.16 - 0.55;
  fisso.add(piastraF);
  const staffaF = new THREE.Mesh(new RoundedBoxGeometry(0.3, 3.0, 2.6, 2, 0.03), verniciato);
  staffaF.position.x = -1.26 - 0.15;
  fisso.add(staffaF);

  const colonnaGeo = new THREE.CylinderGeometry(0.085, 0.085, 0.95, 24);
  colonnaGeo.rotateZ(Math.PI / 2);
  for (const [y, z] of [[1, 0.86], [1, -0.86], [-1, 0.86], [-1, -0.86]]) {
    const c = new THREE.Mesh(colonnaGeo, cromo);
    c.position.set(0.465, y, z);
    fisso.add(c);
  }

  // viti sulla staffa, lato visibile
  const viti = [];
  for (const y of [1.38, -1.38]) for (const z of [-0.95, -0.32, 0.32, 0.95]) {
    const v = new THREE.CylinderGeometry(0.065, 0.065, 0.05, 18);
    v.rotateZ(Math.PI / 2);
    v.translate(-1.26 + 0.025, y, z);
    viti.push(v);
  }
  fisso.add(new THREE.Mesh(mergeGeometries(viti), brunito));

  // golfari per il sollevamento
  const golfare = (x) => {
    const g = new THREE.Group();
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.1, 18), cromo);
    base.position.y = 0.05;
    const anello = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.036, 12, 32), cromo);
    anello.position.y = 0.1 + 0.15;
    g.add(base, anello);
    g.position.set(x, 1.25, 0);
    return g;
  };
  fisso.add(golfare(-0.71));

  // raccordi dell'acqua e tubo a ponticello sul fronte
  const raccordi = (x1, x2) => {
    const g = new THREE.Group();
    for (const x of [x1, x2]) {
      const r = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.16, 16), cromo);
      r.rotation.x = Math.PI / 2;
      r.position.set(x, -0.62, 1.18);
      g.add(r);
    }
    const curva = new THREE.CatmullRomCurve3([
      new THREE.Vector3(x1, -0.62, 1.25), new THREE.Vector3(x1, -0.7, 1.5),
      new THREE.Vector3((x1 + x2) / 2, -1.05, 1.62), new THREE.Vector3(x2, -0.7, 1.5), new THREE.Vector3(x2, -0.62, 1.25),
    ]);
    g.add(new THREE.Mesh(new THREE.TubeGeometry(curva, 40, 0.045, 10, false), tubo));
    return g;
  };
  fisso.add(raccordi(-0.42, -0.98));

  // gruppo iniezione: anello di centraggio, cilindro con le fasce riscaldanti, tramoggia
  const anelloC = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.06, 32), cromo);
  anelloC.rotation.z = Math.PI / 2;
  anelloC.position.x = -1.59;
  fisso.add(anelloC);
  const cilindroGeo = new THREE.CylinderGeometry(0.26, 0.26, 1.85, 32);
  cilindroGeo.rotateZ(Math.PI / 2);
  const cilindro = new THREE.Mesh(cilindroGeo, acciaio);
  cilindro.position.x = -1.62 - 0.925;
  fisso.add(cilindro);
  const fasciaGeo = new THREE.CylinderGeometry(0.29, 0.29, 0.16, 32);
  fasciaGeo.rotateZ(Math.PI / 2);
  for (const x of [-1.86, -2.55, -3.05]) {
    const f = new THREE.Mesh(fasciaGeo, fasce);
    f.position.x = x;
    fisso.add(f);
  }
  const TX = -2.18; // asse della tramoggia
  const gola = new THREE.Mesh(new RoundedBoxGeometry(0.4, 0.26, 0.4, 2, 0.03), brunito);
  gola.position.set(TX, 0.36, 0);
  fisso.add(gola);
  const tramoggia = new THREE.Mesh(new THREE.CylinderGeometry(0.52, 0.15, 0.85, 40, 1, true), tramoggiaMat);
  tramoggia.position.set(TX, 0.49 + 0.425, 0);
  fisso.add(tramoggia);
  const bordo = new THREE.Mesh(new THREE.TorusGeometry(0.52, 0.022, 10, 48), cromo);
  bordo.rotation.x = Math.PI / 2;
  bordo.position.set(TX, 1.34, 0);
  fisso.add(bordo);

  // ---------- semistampo mobile ----------
  const mobileG = new THREE.Group();
  radice.add(mobileG);
  const piastraM = new THREE.Mesh(new RoundedBoxGeometry(1.25, 2.5, 2.2, 2, 0.04), acciaio);
  piastraM.position.x = 0.63;
  mobileG.add(piastraM);
  const staffaM = new THREE.Mesh(new RoundedBoxGeometry(0.3, 3.0, 2.6, 2, 0.03), verniciato);
  staffaM.position.x = 1.255 + 0.15;
  mobileG.add(staffaM);
  const astaGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.9, 24);
  astaGeo.rotateZ(Math.PI / 2);
  const asta = new THREE.Mesh(astaGeo, cromo);
  asta.position.x = 1.555 + 0.45;
  mobileG.add(asta);
  mobileG.add(golfare(0.63));
  mobileG.add(raccordi(0.42, 0.98));

  // ---------- giunzione che si accende durante l'iniezione ----------
  const texBagliore = texturaMorbida([[0, 'rgba(235,255,240,1)'], [0.3, 'rgba(150,255,185,.75)'], [1, 'rgba(79,196,110,0)']]);
  const bagliMat = new THREE.MeshBasicMaterial({
    map: texBagliore, color: 0xffffff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false,
  });
  const bagliFronte = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 2.9), bagliMat);
  bagliFronte.position.set(0, 0, 1.115);
  const bagliSopra = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 2.6), bagliMat);
  bagliSopra.rotation.x = -Math.PI / 2;
  bagliSopra.position.set(0, 1.258, 0);
  radice.add(bagliFronte, bagliSopra);

  // ---------- pezzo stampato ----------
  const pezzo = new THREE.Mesh(geoPezzo(), plastica);
  pezzo.visible = false;
  radice.add(pezzo);

  // ---------- ombre a terra ----------
  const texOmbra = texturaMorbida([[0, 'rgba(28,34,38,.55)'], [0.55, 'rgba(28,34,38,.22)'], [1, 'rgba(28,34,38,0)']]);
  const ombra = (w, d, op) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshBasicMaterial({ map: texOmbra, transparent: true, depthWrite: false, opacity: op }));
    m.rotation.x = -Math.PI / 2;
    m.position.y = -1.53;
    m.renderOrder = -1;
    radice.add(m);
    return m;
  };
  const ombraF = ombra(5.6, 3.8, 0.85);
  ombraF.position.x = -1.3;
  const ombraM = ombra(2.6, 3.8, 0.85);
  const ombraP = ombra(2.2, 2.0, 0);

  // ---------- granuli ----------
  const NC = 64, NM = 46;
  const granulo = new THREE.CylinderGeometry(0.048, 0.048, 0.058, 12);
  const granuli = new THREE.InstancedMesh(granulo, plastica, NC + NM);
  granuli.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  fisso.add(granuli);
  const rnd = (() => { let s = 7; return () => ((s = (s * 16807) % 2147483647) / 2147483647); })();
  const cadute = Array.from({ length: NC }, () => ({
    fase: rnd(), x0: 0.35 + rnd() * 0.45, z0: (rnd() - 0.5) * 0.5, x1: (rnd() - 0.5) * 0.4, z1: (rnd() - 0.5) * 0.4,
    asse: new THREE.Vector3(rnd() - 0.5, rnd() - 0.5, rnd() - 0.5).normalize(), giri: 2 + rnd() * 5,
  }));
  const PER = 1.35, Y0 = 4.4, Y1 = 1.32;
  const G = (2 * (Y0 - Y1)) / (PER * PER);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), v3 = new THREE.Vector3(), sc = new THREE.Vector3();
  for (let i = 0; i < NM; i++) {
    const r = Math.sqrt(rnd()) * 0.44, a = rnd() * Math.PI * 2;
    v3.set(TX + Math.cos(a) * r, 1.26 + 0.14 * (1 - r / 0.44) + rnd() * 0.035, Math.sin(a) * r);
    q.setFromEuler(new THREE.Euler(rnd() * 3, rnd() * 3, rnd() * 3));
    sc.setScalar(1);
    granuli.setMatrixAt(NC + i, m4.compose(v3, q, sc));
  }
  const aggiornaGranuli = (s) => {
    for (let i = 0; i < NC; i++) {
      const c = cadute[i];
      const u = ((s / PER + c.fase) % 1 + 1) % 1;
      const tt = u * PER;
      const k = easeOut(u);
      v3.set(TX + c.x0 + (c.x1 - c.x0) * k, Y0 - 0.5 * G * tt * tt, c.z0 + (c.z1 - c.z0) * k);
      q.setFromAxisAngle(c.asse, s * c.giri + c.fase * 6);
      const vis = Math.min(seg(u, 0, 0.08), 1 - seg(u, 0.9, 1));
      sc.setScalar(Math.max(vis, 0.0001));
      granuli.setMatrixAt(i, m4.compose(v3, q, sc));
    }
    granuli.instanceMatrix.needsUpdate = true;
  };

  // ---------- inquadratura sul palco ----------
  let dist = 14;
  const mira = new THREE.Vector3();
  const inquadra = () => {
    const W = Math.max(1, hero.clientWidth), H = Math.max(1, hero.clientHeight);
    const pr = Math.min(devicePixelRatio || 1, mobile() ? 1.5 : 2);
    renderer.setPixelRatio(pr);
    renderer.setSize(W, H, false);
    const rh = hero.getBoundingClientRect(), rp = palco.getBoundingClientRect();
    const pw = Math.max(rp.width, 160), ph = Math.max(rp.height, 160);
    const cx = rp.left - rh.left + rp.width / 2, cy = rp.top - rh.top + rp.height / 2;
    camera.aspect = W / H;
    const tanV = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    dist = Math.max((SOGG_A * H) / (ph * 2 * tanV), (SOGG_L * H) / (pw * 2 * tanV));
    camera.setViewOffset(W, H, W / 2 - cx, H / 2 - cy, W, H);
    camera.updateProjectionMatrix();
  };

  // puntatore solo su desktop: sul telefono e nel video il 3D si muove da solo
  const puntatore = { x: 0, y: 0, sx: 0, sy: 0 };
  if (matchMedia('(hover: hover) and (pointer: fine)').matches) {
    addEventListener('pointermove', (e) => {
      puntatore.x = (e.clientX / innerWidth) * 2 - 1;
      puntatore.y = (e.clientY / innerHeight) * 2 - 1;
    }, { passive: true });
  }

  // ---------- HMI ----------
  const faseEl = hmi.querySelector('.hmi__fase');
  const barraEl = hmi.querySelector('.hmi__barra i');
  const contaEl = hmi.querySelector('.hmi__conta b');
  let faseCorrente = '', stampati = 0, tcPrima = -1;

  const scena = (s) => {
    const intro = s < INTRO;
    const tc = intro ? 0 : (((s - INTRO + FASI[1][1]) % T) + T) % T;

    // semistampi
    let corsa, spostaF = 0, urto = 0;
    if (intro) {
      spostaF = -2.2 * (1 - easeOut(seg(s, 0, 0.6)));
      corsa = 5.2 * (1 - easeIn(seg(s, 0.05, INTRO)));
    } else if (tc < 0.7) corsa = CORSA * (1 - easeIn(seg(tc, 0, 0.7)));
    else if (tc < 1.95) corsa = 0;
    else corsa = CORSA * inOut(seg(tc, 1.95, 2.55));
    const dopoUrto = intro ? -1 : tc - 0.7;
    if (dopoUrto >= 0 && dopoUrto < 0.35) urto = Math.exp(-dopoUrto * 13) * Math.sin(dopoUrto * 72) * 0.03;
    fisso.position.x = spostaF;
    mobileG.position.x = corsa;
    ombraM.position.x = 0.75 + corsa;

    // iniezione: la giunzione si accende e poi si raffredda
    let fuso = 0;
    if (!intro) {
      if (tc >= 0.7 && tc < 1.35) fuso = easeOut(seg(tc, 0.7, 1.0));
      else if (tc >= 1.35 && tc < 1.95) fuso = 1 - 0.75 * seg(tc, 1.35, 1.95);
      else if (tc >= 1.95 && tc < 2.6) fuso = 0.25 * (1 - seg(tc, 1.95, 2.6));
    }
    const chiuso = corsa < 0.02 ? 1 : 0;
    bagliMat.opacity = fuso * chiuso * (0.85 + 0.15 * Math.sin(s * 40));
    luceFuso.intensity = fuso * 7;
    luceFuso.position.x = 0.15 + corsa * 0.5;
    fasce.emissiveIntensity = 0.08 + fuso * 0.9;

    // pezzo
    const visibile = !intro && tc >= 1.95;
    pezzo.visible = visibile;
    let opOmbraP = 0;
    if (visibile) {
      plastica.emissiveIntensity = 0;
      if (tc < 2.55) {
        pezzo.position.set(corsa * 0.5, 0, 0);
        pezzo.rotation.set(0, Math.PI / 2, 0);
        pezzo.scale.setScalar(1);
      } else {
        const e = back(seg(tc, 2.55, 3.3));
        const e2 = inOut(seg(tc, 2.55, 3.3));
        const giro = inOut(seg(tc, 3.55, 5.6)) * Math.PI * 2;
        const ondeggia = Math.sin((tc - 3.3) * 2.4) * 0.05 * seg(tc, 3.3, 3.7);
        const uscita = easeIn(seg(tc, 5.95, 6.6));
        pezzo.position.set(
          CORSA * 0.5 + (1.5 - CORSA * 0.5) * e + uscita * 0.25,
          0.22 * e + ondeggia - uscita * 5,
          1.75 * e,
        );
        pezzo.rotation.set(-0.14 * e2 + uscita * 1.7, Math.PI / 2 + (YAW - Math.PI / 2) * e2 + giro, 0);
        pezzo.scale.setScalar(1 + 0.12 * e2);
        opOmbraP = 0.55 * e2 * (1 - uscita);
        ombraP.position.set(pezzo.position.x, -1.53, pezzo.position.z);
      }
    }
    ombraP.material.opacity = opOmbraP;
    plastica.emissiveIntensity = 0;

    aggiornaGranuli(s);

    // contatore: quattro ingranaggi per stampata
    if (!intro && tcPrima >= 0 && tcPrima < 2.55 && tc >= 2.55) {
      stampati += INGRANAGGI.length;
      contaEl.textContent = stampati;
    }
    tcPrima = intro ? -1 : tc;

    const nome = intro ? FASI[0][0] : FASI.find((f) => tc >= f[1] && tc < f[2])?.[0] || FASI[5][0];
    if (nome !== faseCorrente) { faseCorrente = nome; faseEl.textContent = nome; }
    barraEl.style.transform = `scaleX(${(intro ? s / INTRO * (0.7 / T) : tc / T).toFixed(4)})`;

    // camera: scroll della pagina, puntatore su desktop, piccolo respiro
    const rh = hero.getBoundingClientRect();
    const p = Math.min(1, Math.max(0, -rh.top / Math.max(rh.height, 1)));
    puntatore.sx += (puntatore.x - puntatore.sx) * 0.05;
    puntatore.sy += (puntatore.y - puntatore.sy) * 0.05;
    const yaw = YAW + Math.sin(s * 0.35) * 0.035 + puntatore.sx * 0.09 + p * 0.35;
    const pitch = PITCH + puntatore.sy * 0.045 + p * 0.22;
    mira.copy(CENTRO);
    camera.position.set(
      mira.x + Math.sin(yaw) * Math.cos(pitch) * dist,
      mira.y + Math.sin(pitch) * dist + urto,
      mira.z + Math.cos(yaw) * Math.cos(pitch) * dist,
    );
    camera.lookAt(mira.x, mira.y + urto, mira.z);
  };

  inquadra();

  let tempo = 0, ultimo = null, raf = 0, inVista = true, primo = false;
  const disegna = () => {
    renderer.render(scene, camera);
    if (!primo) { primo = true; hero.classList.add('is-3d'); }
  };

  // ?fotogramma=<secondi>: scena ferma su un istante (controlli e immagine di anteprima)
  const fermo = new URLSearchParams(location.search).get('fotogramma');
  if (fermo !== null && !Number.isNaN(parseFloat(fermo))) {
    for (let k = 0; k <= 20; k++) scena((parseFloat(fermo) * k) / 20);
    disegna();
    new ResizeObserver(() => { inquadra(); scena(parseFloat(fermo)); disegna(); }).observe(hero);
    return true;
  }

  if (riduci) {
    // una sola immagine ferma: stampo aperto e pezzo pronto
    tempo = INTRO + (3.45 - FASI[1][1]);
    scena(tempo);
    disegna();
    new ResizeObserver(() => { inquadra(); scena(tempo); disegna(); }).observe(hero);
    return true;
  }

  const ciclo = () => {
    raf = 0;
    const ora = performance.now() / 1000;
    const dt = ultimo === null ? 0 : Math.min(ora - ultimo, 0.1);
    ultimo = ora;
    tempo += dt;
    scena(tempo);
    disegna();
    raf = requestAnimationFrame(ciclo);
  };
  const riprendi = () => { if (!raf && inVista && !document.hidden) { ultimo = null; raf = requestAnimationFrame(ciclo); } };
  const ferma = () => { if (raf) { cancelAnimationFrame(raf); raf = 0; } };

  new IntersectionObserver((v) => { inVista = v[0].isIntersecting; inVista ? riprendi() : ferma(); }, { threshold: 0 }).observe(hero);
  document.addEventListener('visibilitychange', () => (document.hidden ? ferma() : riprendi()));
  new ResizeObserver(() => { inquadra(); if (!raf) { scena(tempo); disegna(); } }).observe(hero);
  riprendi();
  return true;
}
