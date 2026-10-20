/* DaDo Ponteggi — "Il tuo ponteggio, prima del cantiere".
   Un campanile viene rilevato, quotato, disegnato e poi impalcato piano per piano
   con un ponteggio multidirezionale (montanti, rosette, traversi, diagonali, tavole).
   Lo guidano lo scroll della pista e il tempo di requestAnimationFrame. */
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const SFONDO = 0x0A1250;
const VERDE = 0x61CE85;

const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const lerp = (a, b, t) => a + (b - a) * t;
const fuori = t => 1 - Math.pow(1 - t, 3);
const dentroFuori = t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

/* Geometria del campanile (metri) */
const S = 2.3;                 // mezzo lato del fusto
const H_FUSTO = 18;
const A = S + 0.35;            // anello interno del ponteggio
const B = A + 0.73;            // anello esterno
const PASSO = 2;               // altezza di un piano di ponteggio
const N = 11;                  // piani: 22 m

export async function avvia({ contenitore, pista, leggi, ridotto, pronto }) {
  const canvas = document.createElement('canvas');
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  } catch (e) {
    return false;
  }
  const mobile = matchMedia('(max-width: 899px)').matches;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, mobile ? 1.5 : 2));
  renderer.setClearColor(SFONDO, 1);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.08;
  contenitore.appendChild(canvas);

  const scena = new THREE.Scene();
  scena.fog = new THREE.Fog(SFONDO, 48, 125);
  const pmrem = new THREE.PMREMGenerator(renderer);
  scena.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scena.environmentIntensity = 0.75;
  pmrem.dispose();

  const camera = new THREE.PerspectiveCamera(38, 1, 0.5, 300);
  scena.add(new THREE.HemisphereLight(0xd8e6ff, 0x101a5c, 1.15));
  const sole = new THREE.DirectionalLight(0xfff0dc, 2.4);
  sole.position.set(16, 34, 20);
  scena.add(sole);
  const controluce = new THREE.DirectionalLight(0x9db8ff, 0.9);
  controluce.position.set(-20, 12, -18);
  scena.add(controluce);

  /* Terreno: griglia da tavolo da disegno */
  const griglia = new THREE.GridHelper(90, 45, 0x3a4ca0, 0x22307a);
  griglia.material.transparent = true;
  griglia.material.opacity = 0.55;
  griglia.material.depthWrite = false;
  scena.add(griglia);

  /* ---------- Campanile ---------- */
  const mattone = new THREE.MeshStandardMaterial({ color: 0xA2573A, roughness: 0.86, metalness: 0, transparent: true, opacity: 0 });
  const pietra = new THREE.MeshStandardMaterial({ color: 0xD7C9B2, roughness: 0.8, metalness: 0, transparent: true, opacity: 0 });
  const coppi = new THREE.MeshStandardMaterial({ color: 0x7E3A26, roughness: 0.75, metalness: 0, transparent: true, opacity: 0 });
  const buio = new THREE.MeshStandardMaterial({ color: 0x0B103A, roughness: 1, metalness: 0, transparent: true, opacity: 0 });
  const intonaco = new THREE.MeshStandardMaterial({ color: 0xE2D6C2, roughness: 0.9, metalness: 0, transparent: true, opacity: 0 });
  const materialiTorre = [mattone, pietra, coppi, buio, intonaco];
  const torre = new THREE.Group();
  const pezziBordi = [];
  function pezzo(geo, mat, x, y, z, ry = 0, bordi = true) {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    m.rotation.y = ry;
    torre.add(m);
    if (bordi) pezziBordi.push(m);
    return m;
  }
  pezzo(new THREE.BoxGeometry(2 * S, H_FUSTO, 2 * S), mattone, 0, H_FUSTO / 2, 0);
  pezzo(new THREE.BoxGeometry(2 * S + 0.5, 0.7, 2 * S + 0.5), pietra, 0, 0.35, 0);
  for (const y of [6, 12, 18]) pezzo(new THREE.BoxGeometry(2 * S + 0.36, 0.34, 2 * S + 0.36), pietra, 0, y, 0);
  const lp = 1.0, hc = 4.1, yc = 18.17;
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) pezzo(new THREE.BoxGeometry(lp, hc, lp), mattone, sx * (S - lp / 2), yc + hc / 2, sz * (S - lp / 2));
  pezzo(new THREE.BoxGeometry(2 * S - 2 * lp + 0.02, hc, 2 * S - 2 * lp + 0.02), buio, 0, yc + hc / 2, 0, 0, false);
  pezzo(new THREE.BoxGeometry(2 * S, 0.7, 2 * S), mattone, 0, yc + hc + 0.35, 0);
  pezzo(new THREE.BoxGeometry(2 * S + 0.4, 0.32, 2 * S + 0.4), pietra, 0, yc + hc + 0.86, 0);
  const tetto = pezzo(new THREE.ConeGeometry(3.25, 5.2, 4, 1), coppi, 0, yc + hc + 1.02 + 2.6, 0, Math.PI / 4);
  tetto.geometry.computeVertexNormals();
  // feritoie sul fusto
  const feritoia = new THREE.BoxGeometry(0.34, 1.5, 0.12);
  for (const y of [4.2, 9.2, 14.6]) {
    pezzo(feritoia, buio, 0, y, S + 0.02, 0, false);
    pezzo(feritoia, buio, 0, y, -S - 0.02, 0, false);
    pezzo(feritoia, buio, S + 0.02, y, 0, Math.PI / 2, false);
    pezzo(feritoia, buio, -S - 0.02, y, 0, Math.PI / 2, false);
  }
  // navata della chiesa accanto al campanile
  const NX = -7.7, NZ = -6, NL = 16, NW = 6.4, NH = 8.6;
  pezzo(new THREE.BoxGeometry(NW, NH, NL), intonaco, NX, NH / 2, NZ);
  const falda = new THREE.Shape();
  falda.moveTo(-NW / 2 - 0.35, 0); falda.lineTo(NW / 2 + 0.35, 0); falda.lineTo(0, 2.7); falda.closePath();
  const geoFalda = new THREE.ExtrudeGeometry(falda, { depth: NL + 0.5, bevelEnabled: false });
  pezzo(geoFalda, coppi, NX, NH, NZ - (NL + 0.5) / 2);
  const finestra = new THREE.BoxGeometry(0.12, 2.6, 0.8);
  for (const z of [NZ - 5.2, NZ, NZ + 5.2]) {
    pezzo(finestra, buio, NX + NW / 2 + 0.02, 5.2, z, 0, false);
    pezzo(finestra, buio, NX - NW / 2 - 0.02, 5.2, z, 0, false);
  }
  pezzo(new THREE.BoxGeometry(1.5, 2.8, 0.12), buio, NX, 1.4, NZ + NL / 2 + 0.02, 0, false);
  const rosone = pezzo(new THREE.CylinderGeometry(0.85, 0.85, 0.12, 24), buio, NX, 6.2, NZ + NL / 2 + 0.02, 0, false);
  rosone.rotation.x = Math.PI / 2;
  scena.add(torre);

  // contorni del rilievo, ordinati dal basso: si disegnano salendo
  const segTorre = [];
  const va = new THREE.Vector3(), vb = new THREE.Vector3();
  torre.updateMatrixWorld(true);
  for (const m of pezziBordi) {
    const e = new THREE.EdgesGeometry(m.geometry, 20);
    const pos = e.attributes.position;
    for (let i = 0; i < pos.count; i += 2) {
      va.fromBufferAttribute(pos, i).applyMatrix4(m.matrixWorld);
      vb.fromBufferAttribute(pos, i + 1).applyMatrix4(m.matrixWorld);
      segTorre.push([va.x, va.y, va.z, vb.x, vb.y, vb.z]);
    }
    e.dispose();
  }
  segTorre.sort((s1, s2) => Math.min(s1[1], s1[4]) - Math.min(s2[1], s2[4]));
  const geoRilievo = new THREE.BufferGeometry();
  geoRilievo.setAttribute('position', new THREE.Float32BufferAttribute(segTorre.flat(), 3));
  const matRilievo = new THREE.LineBasicMaterial({ color: 0xE4ECFF, transparent: true, opacity: 0.85, depthWrite: false });
  const rilievo = new THREE.LineSegments(geoRilievo, matRilievo);
  scena.add(rilievo);

  // anello di scansione del sopralluogo
  const r0 = S + 0.6;
  const geoScan = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(-r0, 0, -r0), new THREE.Vector3(r0, 0, -r0), new THREE.Vector3(r0, 0, r0), new THREE.Vector3(-r0, 0, r0)
  ]);
  const matScan = new THREE.LineBasicMaterial({ color: VERDE, transparent: true, opacity: 0, depthWrite: false });
  const scan = new THREE.LineLoop(geoScan, matScan);
  scena.add(scan);
  const velo = new THREE.Mesh(new THREE.PlaneGeometry(2 * r0, 2 * r0).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({ color: VERDE, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide, toneMapped: false }));
  scan.add(velo);

  /* ---------- Quote ---------- */
  await Promise.race([document.fonts.load('800 90px Archivo'), new Promise(r => setTimeout(r, 1200))]);
  function etichetta(testo) {
    const c = document.createElement('canvas');
    c.width = 512; c.height = 160;
    const g = c.getContext('2d');
    g.font = '800 92px Archivo, "Arial Narrow", sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillStyle = '#ffffff';
    g.fillText(testo, 256, 84);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, opacity: 0, depthTest: false, depthWrite: false, toneMapped: false }));
    s.scale.set(3.6, 1.125, 1);
    s.renderOrder = 10;
    return s;
  }
  const HQ = N * PASSO;
  const xq = B + 1.5;
  const segQuote = [
    [B + 0.15, 0, B, xq + 0.35, 0, B], [B + 0.15, HQ, B, xq + 0.35, HQ, B],
    [xq, 0, B, xq, HQ, B],
    [xq - 0.3, -0.3, B, xq + 0.3, 0.3, B], [xq - 0.3, HQ - 0.3, B, xq + 0.3, HQ + 0.3, B],
    [-B, 0, B + 0.15, -B, 0, B + 1.85], [B, 0, B + 0.15, B, 0, B + 1.85],
    [-B, 0, B + 1.5, B, 0, B + 1.5],
    [-B - 0.3, 0, B + 1.2, -B + 0.3, 0, B + 1.8], [B - 0.3, 0, B + 1.2, B + 0.3, 0, B + 1.8]
  ];
  const geoQuote = new THREE.BufferGeometry();
  geoQuote.setAttribute('position', new THREE.Float32BufferAttribute(segQuote.flat(), 3));
  const matQuote = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false });
  scena.add(new THREE.LineSegments(geoQuote, matQuote));
  const qAltezza = etichetta('22,00 m');
  qAltezza.position.set(xq + 1.25, HQ * 0.52, B);
  const qLato = etichetta('6,76 m');
  qLato.position.set(0, 0.7, B + 2.4);
  scena.add(qAltezza, qLato);

  /* ---------- Ponteggio multidirezionale ---------- */
  const anello = r => [[r, r], [0, r], [-r, r], [-r, 0], [-r, -r], [0, -r], [r, -r], [r, 0]];
  const INT = anello(A), EST = anello(B);
  const tubi = [];      // { a:[x,y,z], b:[x,y,z], r, k }
  const nodi = [];      // rosette { p:[x,y,z], k }
  const lastre = [];    // tavole e fermapiedi { p, s, k }
  const montante = (P, y0, y1, k) => {
    tubi.push({ a: [P[0], y0, P[1]], b: [P[0], y1, P[1]], r: 0.06, k });
    for (let y = y0 + 0.5; y <= y1 + 0.001; y += 0.5) nodi.push({ p: [P[0], y, P[1]], k: k + 0.04 });
  };
  for (let k = 0; k < N; k++) {
    const y0 = k * PASSO, y1 = y0 + PASSO;
    for (const P of INT) montante(P, y0, y1, k);
    for (const P of EST) montante(P, y0, y1, k);
    if (k === 0) {
      for (let i = 0; i < 8; i++) {
        tubi.push({ a: [INT[i][0], 0.3, INT[i][1]], b: [INT[(i + 1) % 8][0], 0.3, INT[(i + 1) % 8][1]], r: 0.045, k: 0.2 });
        tubi.push({ a: [EST[i][0], 0.3, EST[i][1]], b: [EST[(i + 1) % 8][0], 0.3, EST[(i + 1) % 8][1]], r: 0.045, k: 0.2 });
      }
      for (const P of [...INT, ...EST]) lastre.push({ p: [P[0], 0.04, P[1]], s: [0.2, 0.08, 0.2], k: -0.05 });
    }
    for (let i = 0; i < 8; i++) {
      const j = (i + 1) % 8;
      tubi.push({ a: [INT[i][0], y1, INT[i][1]], b: [INT[j][0], y1, INT[j][1]], r: 0.048, k: k + 0.32 });
      tubi.push({ a: [EST[i][0], y1, EST[i][1]], b: [EST[j][0], y1, EST[j][1]], r: 0.048, k: k + 0.32 });
      tubi.push({ a: [INT[i][0], y1, INT[i][1]], b: [EST[i][0], y1, EST[i][1]], r: 0.045, k: k + 0.4 });
      const kp = k < N - 1 ? k + 1.06 : k + 0.86;
      tubi.push({ a: [EST[i][0], y1 + 0.5, EST[i][1]], b: [EST[j][0], y1 + 0.5, EST[j][1]], r: 0.04, k: kp });
      tubi.push({ a: [EST[i][0], y1 + 1, EST[i][1]], b: [EST[j][0], y1 + 1, EST[j][1]], r: 0.04, k: kp + 0.04 });
    }
    for (let lato = 0; lato < 4; lato++) {
      const campata = (k + lato) % 2;
      const i = lato * 2 + campata, j = (i + 1) % 8;
      const su = k % 2 === 0;
      tubi.push({ a: [EST[i][0], su ? y0 : y1, EST[i][1]], b: [EST[j][0], su ? y1 : y0, EST[j][1]], r: 0.042, k: k + 0.5 });
    }
    const zc = (A + B) / 2, prof = B - A;
    lastre.push({ p: [0, y1 - 0.035, zc], s: [2 * B, 0.07, prof], k: k + 0.6 });
    lastre.push({ p: [0, y1 - 0.035, -zc], s: [2 * B, 0.07, prof], k: k + 0.63 });
    lastre.push({ p: [zc, y1 - 0.035, 0], s: [prof, 0.07, 2 * A], k: k + 0.66 });
    lastre.push({ p: [-zc, y1 - 0.035, 0], s: [prof, 0.07, 2 * A], k: k + 0.69 });
    lastre.push({ p: [0, y1 + 0.075, B], s: [2 * B, 0.15, 0.03], k: k + 0.76 });
    lastre.push({ p: [0, y1 + 0.075, -B], s: [2 * B, 0.15, 0.03], k: k + 0.76 });
    lastre.push({ p: [B, y1 + 0.075, 0], s: [0.03, 0.15, 2 * B], k: k + 0.76 });
    lastre.push({ p: [-B, y1 + 0.075, 0], s: [0.03, 0.15, 2 * B], k: k + 0.76 });
  }
  // prolunga dei montanti per i parapetti dell'ultimo piano
  for (const P of [...INT, ...EST]) montante(P, N * PASSO, N * PASSO + 1.2, N - 1 + 0.78);

  const acciaio = new THREE.MeshStandardMaterial({ color: 0xCCD4DE, metalness: 0.78, roughness: 0.3 });
  const rosetta = new THREE.MeshStandardMaterial({ color: 0xE3E8EE, metalness: 0.7, roughness: 0.28 });
  const tavola = new THREE.MeshStandardMaterial({ color: 0x9AA5B4, metalness: 0.55, roughness: 0.48 });

  const Y = new THREE.Vector3(0, 1, 0);
  const tmpV = new THREE.Vector3(), tmpQ = new THREE.Quaternion(), tmpS = new THREE.Vector3(), tmpM = new THREE.Matrix4();
  function creaGruppo(geo, mat, elenco, base) {
    const n = elenco.length;
    const mesh = new THREE.InstancedMesh(geo, mat, n);
    mesh.frustumCulled = false;
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    const d = { mesh, n, pos: new Float32Array(n * 3), rot: new Float32Array(n * 4), scl: new Float32Array(n * 3), out: new Float32Array(n * 2), k: new Float32Array(n) };
    elenco.forEach((el, i) => {
      base(el, tmpV, tmpQ, tmpS);
      d.pos.set([tmpV.x, tmpV.y, tmpV.z], i * 3);
      d.rot.set([tmpQ.x, tmpQ.y, tmpQ.z, tmpQ.w], i * 4);
      d.scl.set([tmpS.x, tmpS.y, tmpS.z], i * 3);
      const l = Math.hypot(tmpV.x, tmpV.z) || 1;
      d.out[i * 2] = tmpV.x / l; d.out[i * 2 + 1] = tmpV.z / l;
      d.k[i] = el.k;
    });
    scena.add(mesh);
    return d;
  }
  const gTubi = creaGruppo(new THREE.CylinderGeometry(1, 1, 1, 10, 1), acciaio, tubi, (t, p, q, s) => {
    const a = new THREE.Vector3(...t.a), b = new THREE.Vector3(...t.b);
    p.addVectors(a, b).multiplyScalar(0.5);
    const dir = b.clone().sub(a);
    const len = dir.length();
    q.setFromUnitVectors(Y, dir.normalize());
    s.set(t.r, len, t.r);
  });
  const gNodi = creaGruppo(new THREE.CylinderGeometry(0.085, 0.085, 0.022, 12), rosetta, nodi, (n, p, q, s) => {
    p.set(...n.p); q.identity(); s.set(1, 1, 1);
  });
  const gLastre = creaGruppo(new THREE.BoxGeometry(1, 1, 1), tavola, lastre, (l, p, q, s) => {
    p.set(...l.p); q.identity(); s.set(...l.s);
  });
  const gruppi = [gTubi, gNodi, gLastre];

  // progetto in verde: le linee d'asse di tutti i tubi, dal basso
  const ordinati = tubi.slice().sort((t1, t2) => t1.k - t2.k);
  const geoProgetto = new THREE.BufferGeometry();
  geoProgetto.setAttribute('position', new THREE.Float32BufferAttribute(ordinati.flatMap(t => [...t.a, ...t.b]), 3));
  const matProgetto = new THREE.LineBasicMaterial({ color: VERDE, transparent: true, opacity: 0, depthWrite: false });
  const progetto = new THREE.LineSegments(geoProgetto, matProgetto);
  scena.add(progetto);
  const nProgetto = ordinati.length;

  /* ---------- Telo con il marchio ---------- */
  const ct = document.createElement('canvas');
  ct.width = 1024; ct.height = 400;
  const gt = ct.getContext('2d');
  gt.fillStyle = '#61CE85'; gt.fillRect(0, 0, 1024, 400);
  gt.save(); gt.translate(70, 92); gt.scale(3.55, 3.55); gt.fillStyle = '#050B43';
  ['M24.6248 0.515074C25.5902 0.406893 26.5681 0.836524 27.3467 1.37743L48.9879 22.7663C51.7939 25.9097 48.0599 30.4563 44.4722 28.1506L25.1231 9.09224C18.3682 15.1009 12.1053 21.8483 5.54664 28.1506C2.19566 30.3049 -1.61312 26.4042 0.716367 23.0723L22.5102 1.52888C23.0303 1.07761 23.9583 0.592345 24.6279 0.518164L24.6248 0.515074Z',
   'M3.44777 36.5396L46.0326 36.4592C50.0625 36.8858 51.5574 41.0801 47.976 43.3055C32.9713 43.8341 17.8202 43.4106 2.75951 43.5219C-1.20499 42.3473 -0.722271 37.0156 3.44466 36.5427L3.44777 36.5396Z',
   'M3.75896 53.4652L45.7178 53.3879C49.8349 53.5456 51.7284 57.8821 47.9757 60.228C32.971 60.7566 17.82 60.3331 2.75927 60.4444C-1.44814 59.0566 -0.523194 53.9165 3.75585 53.4652H3.75896Z'
  ].forEach(d => gt.fill(new Path2D(d)));
  gt.restore();
  gt.fillStyle = '#050B43';
  gt.font = '800 128px Archivo, "Arial Narrow", sans-serif';
  gt.textBaseline = 'alphabetic';
  gt.fillText('DaDo', 330, 196);
  gt.fillText('Ponteggi', 330, 318);
  const texTelo = new THREE.CanvasTexture(ct);
  texTelo.colorSpace = THREE.SRGBColorSpace;
  texTelo.anisotropy = 8;
  const telo = new THREE.Mesh(new THREE.PlaneGeometry(3.3, 1.29),
    new THREE.MeshBasicMaterial({ map: texTelo, transparent: true, opacity: 0, toneMapped: false, side: THREE.DoubleSide }));
  telo.position.set(-B / 2 - 0.05, 13.3, B + 0.09);
  scena.add(telo);

  /* ---------- Posa dei pezzi ---------- */
  let ultimaA = -1;
  function posa(Aliv) {
    if (Math.abs(Aliv - ultimaA) < 1e-4) return;
    ultimaA = Aliv;
    for (const g of gruppi) {
      for (let i = 0; i < g.n; i++) {
        const u = clamp((Aliv - g.k[i]) / 0.6);
        if (u <= 0) {
          tmpS.set(0, 0, 0);
          tmpV.set(g.pos[i * 3], g.pos[i * 3 + 1], g.pos[i * 3 + 2]);
          tmpQ.set(0, 0, 0, 1);
        } else {
          const e = fuori(u);
          const vola = 1 - e;
          tmpV.set(
            g.pos[i * 3] + g.out[i * 2] * vola * 1.6,
            g.pos[i * 3 + 1] + vola * 3.2,
            g.pos[i * 3 + 2] + g.out[i * 2 + 1] * vola * 1.6
          );
          tmpQ.set(g.rot[i * 4], g.rot[i * 4 + 1], g.rot[i * 4 + 2], g.rot[i * 4 + 3]);
          const pop = Math.min(1, u * 5);
          tmpS.set(g.scl[i * 3] * pop, g.scl[i * 3 + 1] * pop, g.scl[i * 3 + 2] * pop);
        }
        tmpM.compose(tmpV, tmpQ, tmpS);
        g.mesh.setMatrixAt(i, tmpM);
      }
      g.mesh.instanceMatrix.needsUpdate = true;
    }
  }

  /* ---------- Camera e stato ---------- */
  let L = 1, H = 1;
  function misura() {
    L = Math.max(1, contenitore.clientWidth);
    H = Math.max(1, contenitore.clientHeight);
    renderer.setSize(L, H, false);
    camera.aspect = L / H;
    const largo = L / H > 1.05;
    if (largo) camera.setViewOffset(L, H, -L * 0.2, 0, L, H);
    else camera.setViewOffset(L, H, 0, H * 0.15, L, H);
    camera.updateProjectionMatrix();
  }

  function aggiorna(p, pIn, t) {
    const largo = L / H > 1.05;
    const e = dentroFuori(clamp(p));
    // 1. sopralluogo: il rilievo si disegna mentre la sezione entra
    const fr = clamp(0.12 + smooth(0.05, 1, pIn) * 0.88);
    geoRilievo.setDrawRange(0, Math.floor(fr * segTorre.length) * 2);
    matRilievo.opacity = 0.85 - smooth(0.74, 0.92, p) * 0.7;
    const oScan = smooth(0.3, 0.9, pIn) * (1 - smooth(0.26, 0.36, p));
    matScan.opacity = oScan;
    velo.material.opacity = oScan * 0.07;
    const giro = (t * 0.32) % 1;
    scan.position.y = 0.2 + dentroFuori(giro < 0.5 ? giro * 2 : 2 - giro * 2) * 26.5;
    // massa del campanile: prima trasparente, poi mattone
    const oTorre = smooth(0.17, 0.34, p) * 0.2 + smooth(0.72, 0.9, p) * 0.8;
    for (const m of materialiTorre) m.opacity = oTorre;
    // 2. preventivo: le quote
    const oQ = smooth(0.18, 0.28, p) * (1 - smooth(0.6, 0.7, p));
    matQuote.opacity = oQ * 0.9;
    qAltezza.material.opacity = oQ;
    qLato.material.opacity = oQ;
    // 3. progetto: il disegno verde sale piano per piano
    const fp = smooth(0.36, 0.54, p);
    geoProgetto.setDrawRange(0, Math.floor(fp * nProgetto) * 2);
    matProgetto.opacity = 0.9 * (1 - smooth(0.74, 0.88, p));
    // 4-5. trasporto e montaggio: i pezzi arrivano e si posano
    posa(clamp((p - 0.55) / 0.33) * (N + 1.25));
    telo.material.opacity = smooth(0.85, 0.91, p);
    // camera: parte bassa e guarda in su, finisce sopra il ponteggio e guarda giù ("per chi punta in alto")
    const az = lerp(-0.8, 0.95, e) + Math.sin(t * 0.23) * 0.03;
    const dist = (largo ? 50 : 64) * lerp(1.0, 0.9, e);
    const yCam = lerp(1.6, 27, e) + Math.sin(t * 0.31) * 0.2;
    const yMira = largo ? lerp(11.2, 14.2, e) : lerp(11.4, 16.8, e);
    camera.position.set(Math.sin(az) * dist, yCam, Math.cos(az) * dist);
    camera.lookAt(0, yMira, 0);
  }

  misura();
  aggiorna(ridotto ? 1 : 0, 1, 0);
  try { await renderer.compileAsync(scena, camera); } catch (e) { /* compila al primo disegno */ }

  if (ridotto) {
    renderer.render(scena, camera);
    pronto();
    new ResizeObserver(() => { misura(); aggiorna(1, 1, 0); renderer.render(scena, camera); }).observe(contenitore);
    return true;
  }

  let attivo = false;
  let visibile = !document.hidden;
  let raf = 0;
  let tPrec = performance.now();
  let pLiscio = null;
  function fotogramma() {
    raf = 0;
    if (!attivo || !visibile) return;
    const ora = performance.now();
    const dt = Math.min(0.1, Math.max(0, (ora - tPrec) / 1000));
    tPrec = ora;
    const { p, pIn } = leggi();
    pLiscio = pLiscio === null ? p : pLiscio + (p - pLiscio) * (1 - Math.exp(-dt * 7.5));
    aggiorna(pLiscio, pIn, ora / 1000);
    renderer.render(scena, camera);
    raf = requestAnimationFrame(fotogramma);
  }
  function riparti() {
    if (!raf && attivo && visibile) { tPrec = performance.now(); raf = requestAnimationFrame(fotogramma); }
  }
  new IntersectionObserver(([v]) => { attivo = v.isIntersecting; riparti(); }, { rootMargin: '120px 0px' }).observe(pista);
  document.addEventListener('visibilitychange', () => { visibile = !document.hidden; riparti(); });
  new ResizeObserver(() => { misura(); if (!raf) { const { p, pIn } = leggi(); aggiorna(p, pIn, performance.now() / 1000); renderer.render(scena, camera); } }).observe(contenitore);

  const { p, pIn } = leggi();
  pLiscio = p;
  aggiorna(p, pIn, performance.now() / 1000);
  renderer.render(scena, camera);
  pronto();
  return true;
}
