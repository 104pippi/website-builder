/* Nol System — "Dal banco al cantiere": un miniescavatore costruito in codice.
   Parte esploso come sul banco dell'officina, si rimonta con lo scroll, poi scava.
   Tempo e scroll lo guidano; il puntatore aggiunge un extra solo su desktop. */
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

const V = (x, y, z = 0) => new THREE.Vector3(x, y, z);
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const liscia = (a, b, v) => { const t = clamp((v - a) / (b - a)); return t * t * (3 - 2 * t); };
const morbida = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const mix = (a, b, t) => a + (b - a) * t;

/* nastro: profilo laterale da una linea con spessori, estruso in z (braccio, avambraccio) */
function nastro(pts, ws, prof) {
  const P = pts.map(([x, y]) => new THREE.Vector2(x, y));
  const n = P.length, L = [], R = [], N = [];
  for (let i = 0; i < n; i++) {
    const a = P[Math.max(0, i - 1)], b = P[Math.min(n - 1, i + 1)];
    const t = b.clone().sub(a).normalize();
    const no = new THREE.Vector2(-t.y, t.x);
    N.push(no);
    L.push(P[i].clone().addScaledVector(no, ws[i] / 2));
    R.push(P[i].clone().addScaledVector(no, -ws[i] / 2));
  }
  const s = new THREE.Shape();
  s.moveTo(L[0].x, L[0].y);
  for (let i = 1; i < n; i++) s.lineTo(L[i].x, L[i].y);
  const aF = Math.atan2(N[n - 1].y, N[n - 1].x);
  s.absarc(P[n - 1].x, P[n - 1].y, ws[n - 1] / 2, aF, aF - Math.PI, true);
  for (let i = n - 2; i >= 0; i--) s.lineTo(R[i].x, R[i].y);
  const a0 = Math.atan2(N[0].y, N[0].x);
  s.absarc(P[0].x, P[0].y, ws[0] / 2, a0 - Math.PI, a0 - 2 * Math.PI, true);
  return estrudi(s, prof, 0.018);
}

function estrudi(shape, prof, smusso = 0.012) {
  const g = new THREE.ExtrudeGeometry(shape, {
    depth: Math.max(0.002, prof - 2 * smusso), bevelEnabled: true, bevelThickness: smusso, bevelSize: smusso * 0.8,
    bevelSegments: 2, curveSegments: 14
  });
  g.translate(0, 0, -(prof - 2 * smusso) / 2);
  g.computeVertexNormals();
  return g;
}

function stadio(lung, alt, prof, smusso = 0.02) {
  const r = alt / 2, a = lung / 2 - r;
  const s = new THREE.Shape();
  s.moveTo(-a, -r);
  s.lineTo(a, -r);
  s.absarc(a, 0, r, -Math.PI / 2, Math.PI / 2, false);
  s.lineTo(-a, r);
  s.absarc(-a, 0, r, Math.PI / 2, Math.PI * 1.5, false);
  return estrudi(s, prof, smusso);
}

/* pistone idraulico tra due punti (canna scura + stelo cromato) */
class Pistone {
  constructor(mCanna, mStelo, rCanna, rStelo, lCanna) {
    this.g = new THREE.Group();
    this.lc = lCanna;
    this.canna = new THREE.Mesh(new THREE.CylinderGeometry(rCanna, rCanna, 1, 18), mCanna);
    this.stelo = new THREE.Mesh(new THREE.CylinderGeometry(rStelo, rStelo, 1, 14), mStelo);
    const occhio = new THREE.CylinderGeometry(rCanna * 1.05, rCanna * 1.05, rCanna * 2.4, 16);
    occhio.rotateX(Math.PI / 2);
    this.o1 = new THREE.Mesh(occhio, mCanna);
    this.o2 = new THREE.Mesh(occhio, mCanna);
    this.g.add(this.canna, this.stelo, this.o1, this.o2);
    this._d = new THREE.Vector3();
    this._q = new THREE.Quaternion();
  }
  tra(a, b) {
    const d = this._d.subVectors(b, a);
    const lung = Math.max(0.05, d.length());
    d.normalize();
    this.g.position.copy(a);
    this._q.setFromUnitVectors(V(0, 1, 0), d);
    this.g.quaternion.copy(this._q);
    const lc = Math.min(this.lc, lung * 0.92);
    this.canna.scale.y = lc; this.canna.position.y = lc / 2;
    const ls = Math.max(0.02, lung - lc * 0.82);
    this.stelo.scale.y = ls; this.stelo.position.y = lung - ls / 2;
    this.o1.position.y = 0; this.o2.position.y = lung;
    // gli occhi restano allineati all'asse z del perno
    this.o1.quaternion.copy(this._q).invert(); this.o2.quaternion.copy(this.o1.quaternion);
  }
}

async function decalco() {
  try { await document.fonts.load('italic 900 100px Anybody'); } catch (e) { /* va bene anche il font di riserva */ }
  const c = document.createElement('canvas');
  c.width = 1024; c.height = 192;
  const x = c.getContext('2d');
  x.clearRect(0, 0, c.width, c.height);
  // le due barre del logo
  x.fillStyle = '#ffffff';
  x.save(); x.transform(1, 0, -0.26, 1, 0, 0);
  x.fillRect(70, 28, 30, 136); x.fillRect(122, 28, 30, 136);
  x.restore();
  x.font = "italic 900 118px Anybody, 'Arial Black', sans-serif";
  x.textBaseline = 'middle';
  x.fillText('NOL SYSTEM', 160, 100);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

function texturaPavimento() {
  const c = document.createElement('canvas');
  c.width = c.height = 1024;
  const x = c.getContext('2d');
  const g = x.createRadialGradient(512, 512, 40, 512, 512, 512);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.55, 'rgba(255,255,255,.55)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  // reticolo
  x.strokeStyle = 'rgba(255,255,255,.16)';
  x.lineWidth = 2;
  for (let i = 0; i <= 1024; i += 64) {
    x.beginPath(); x.moveTo(i, 0); x.lineTo(i, 1024); x.stroke();
    x.beginPath(); x.moveTo(0, i); x.lineTo(1024, i); x.stroke();
  }
  // anello del banco
  x.strokeStyle = 'rgba(232,68,41,.75)';
  x.lineWidth = 4;
  x.beginPath(); x.arc(512, 512, 250, 0, Math.PI * 2); x.stroke();
  x.setLineDash([10, 14]);
  x.strokeStyle = 'rgba(255,255,255,.35)';
  x.lineWidth = 2;
  x.beginPath(); x.arc(512, 512, 290, 0, Math.PI * 2); x.stroke();
  // sfumatura verso il bordo
  x.globalCompositeOperation = 'destination-in';
  x.fillStyle = g;
  x.fillRect(0, 0, 1024, 1024);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function texturaOmbra() {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const x = c.getContext('2d');
  const g = x.createRadialGradient(128, 128, 0, 128, 128, 128);
  g.addColorStop(0, 'rgba(0,0,0,.85)');
  g.addColorStop(0.45, 'rgba(0,0,0,.45)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  x.fillStyle = g; x.fillRect(0, 0, 256, 256);
  return new THREE.CanvasTexture(c);
}

export async function avvia(contenitore, { riduci = false } = {}) {
  const mobile = matchMedia('(max-width: 899px)').matches;
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, mobile ? 1.5 : 2));
  renderer.setClearColor(0x1E2023, 1);
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 1.0;
  contenitore.appendChild(renderer.domElement);

  const scena = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scena.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scena.fog = new THREE.Fog(0x1E2023, 9, 19);

  const camera = new THREE.PerspectiveCamera(mobile ? 38 : 30, 1, 0.1, 80);

  /* luci: chiave calda, contro fredda, niente ombre in tempo reale */
  const chiave = new THREE.DirectionalLight(0xFFF1E0, 2.4); chiave.position.set(3.5, 6, 4.5); scena.add(chiave);
  const contro = new THREE.DirectionalLight(0xBFD4FF, 1.6); contro.position.set(-4, 3, -5); scena.add(contro);
  scena.add(new THREE.HemisphereLight(0xE8ECF2, 0x1A1B1D, 0.45));
  const luceNeutra = new THREE.Color(0xFFF1E0), luceAlba = new THREE.Color(0xFFA864);

  /* materiali */
  const vernice = new THREE.MeshPhysicalMaterial({ color: 0xC0241A, roughness: 0.34, metalness: 0.1, clearcoat: 0.9, clearcoatRoughness: 0.16 });
  const grafite = new THREE.MeshStandardMaterial({ color: 0x25272B, roughness: 0.62, metalness: 0.3 });
  const gomma = new THREE.MeshStandardMaterial({ color: 0x18191B, roughness: 0.94, metalness: 0 });
  const ferro = new THREE.MeshStandardMaterial({ color: 0x55595F, roughness: 0.42, metalness: 0.75 });
  const cromo = new THREE.MeshStandardMaterial({ color: 0xF2F4F6, roughness: 0.1, metalness: 1 });
  const canna = new THREE.MeshStandardMaterial({ color: 0x232528, roughness: 0.35, metalness: 0.6 });
  const nero = new THREE.MeshStandardMaterial({ color: 0x141516, roughness: 0.65, metalness: 0.1 });
  const vetro = new THREE.MeshPhysicalMaterial({ color: 0x3A4E5A, roughness: 0.04, metalness: 0, transparent: true, opacity: 0.34, depthWrite: false, envMapIntensity: 1.6 });
  const giallo = new THREE.MeshStandardMaterial({ color: 0xF2B21B, roughness: 0.5, metalness: 0.1, emissive: 0xF2B21B, emissiveIntensity: 0 });

  const macchina = new THREE.Group();
  scena.add(macchina);
  const parti = [];
  const parte = (obj, off, rot, t0, t1) => {
    parti.push({ obj, casa: obj.position.clone(), rcasa: obj.rotation.clone(), off, rot: rot || V(0, 0, 0), t0, t1, fase: Math.random() * 6.28 });
    return obj;
  };
  const mesh = (geo, mat, x = 0, y = 0, z = 0) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); return m; };

  /* ---------------- carro ---------------- */
  const carro = new THREE.Group();
  macchina.add(carro);
  const cingolo = (lato) => {
    const g = new THREE.Group();
    g.add(mesh(stadio(1.55, 0.36, 0.23), gomma));
    // tasselli lungo il bordo
    const tass = new THREE.InstancedMesh(new THREE.BoxGeometry(0.045, 0.026, 0.235), gomma, 46);
    const r = 0.18, a = 1.55 / 2 - r, per = 4 * a + 2 * Math.PI * r;
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion();
    for (let i = 0; i < 46; i++) {
      let s = (i / 46) * per, x, y, ang;
      if (s < 2 * a) { x = -a + s; y = -r - 0.008; ang = 0; }
      else if ((s -= 2 * a) < Math.PI * r) { ang = -Math.PI / 2 + s / r; x = a + Math.cos(ang) * (r + 0.008); y = Math.sin(ang) * (r + 0.008); ang += Math.PI / 2; }
      else if ((s -= Math.PI * r) < 2 * a) { x = a - s; y = r + 0.008; ang = Math.PI; }
      else { s -= 2 * a; ang = Math.PI / 2 + s / r; x = -a + Math.cos(ang) * (r + 0.008); y = Math.sin(ang) * (r + 0.008); ang += Math.PI / 2; }
      q.setFromAxisAngle(V(0, 0, 1), ang);
      m4.compose(V(x, y, 0), q, V(1, 1, 1));
      tass.setMatrixAt(i, m4);
    }
    g.add(tass);
    // telaio laterale, ruote e rulli sul lato esterno
    const piatto = mesh(stadio(1.22, 0.22, 0.03, 0.008), grafite, 0, 0.005, lato * 0.118);
    g.add(piatto);
    const ruota = new THREE.CylinderGeometry(0.115, 0.115, 0.04, 28); ruota.rotateX(Math.PI / 2);
    g.add(mesh(ruota, ferro, 0.595, 0, lato * 0.13), mesh(ruota, ferro, -0.595, 0, lato * 0.13));
    const mozzo = new THREE.CylinderGeometry(0.05, 0.05, 0.06, 20); mozzo.rotateX(Math.PI / 2);
    g.add(mesh(mozzo, cromo, 0.595, 0, lato * 0.145), mesh(mozzo, cromo, -0.595, 0, lato * 0.145));
    const rullo = new THREE.CylinderGeometry(0.045, 0.045, 0.04, 18); rullo.rotateX(Math.PI / 2);
    [-0.25, 0, 0.25].forEach((x) => g.add(mesh(rullo, ferro, x, -0.1, lato * 0.135)));
    g.position.set(0, 0.18, lato * 0.375);
    return g;
  };
  const cingSx = cingolo(1), cingDx = cingolo(-1);
  carro.add(cingSx, cingDx);
  parte(cingSx, V(0, 0.12, 0.95), V(0.25, 0, 0), 0.0, 0.34);
  parte(cingDx, V(0, 0.12, -0.95), V(-0.25, 0, 0), 0.04, 0.38);

  const telaio = mesh(new RoundedBoxGeometry(0.92, 0.2, 0.54, 3, 0.04), grafite, 0, 0.3, 0);
  carro.add(telaio); parte(telaio, V(0, -0.34, 0), null, 0.06, 0.36);

  // lama apripista
  const lamaS = new THREE.Shape();
  lamaS.moveTo(0, 0); lamaS.lineTo(0.06, 0); lamaS.quadraticCurveTo(0.02, 0.16, 0.07, 0.3); lamaS.lineTo(0.02, 0.31);
  lamaS.quadraticCurveTo(-0.04, 0.16, 0, 0);
  const lama = new THREE.Group();
  lama.add(mesh(estrudi(lamaS, 1.0, 0.01), grafite, 0, 0, 0));
  const braccioLama = new RoundedBoxGeometry(0.46, 0.06, 0.07, 2, 0.02);
  const bl1 = mesh(braccioLama, grafite, -0.22, 0.17, 0.26), bl2 = mesh(braccioLama, grafite, -0.22, 0.17, -0.26);
  bl1.rotation.z = bl2.rotation.z = 0.28;
  lama.add(bl1, bl2);
  const pist = new THREE.CylinderGeometry(0.03, 0.03, 0.34, 14); pist.rotateZ(Math.PI / 2 - 0.5);
  lama.add(mesh(pist, cromo, -0.16, 0.22, 0));
  lama.position.set(0.93, 0.03, 0);
  carro.add(lama); parte(lama, V(0.75, -0.08, 0), V(0, 0, -0.35), 0.1, 0.44);

  const ralla = mesh(new THREE.CylinderGeometry(0.4, 0.42, 0.07, 40), ferro, 0, 0.435, 0);
  carro.add(ralla); parte(ralla, V(0, 0.28, 0), null, 0.18, 0.48);

  /* ---------------- torretta ---------------- */
  const torretta = new THREE.Group();
  torretta.position.set(0, 0.47, 0);
  macchina.add(torretta);
  parte(torretta, V(0, 0.5, 0), null, 0.2, 0.58);

  const piano = mesh(new RoundedBoxGeometry(1.24, 0.1, 0.96, 3, 0.03), grafite, -0.02, 0.05, 0);
  torretta.add(piano);

  // contrappeso: arco posteriore a raggio zero
  const cpS = new THREE.Shape();
  const a1 = THREE.MathUtils.degToRad(102), a2 = THREE.MathUtils.degToRad(258);
  cpS.moveTo(Math.cos(a1) * 0.5, Math.sin(a1) * 0.5);
  cpS.absarc(0, 0, 0.5, a1, a2, false);
  cpS.lineTo(Math.cos(a1) * 0.5, Math.sin(a1) * 0.5);
  const cpG = estrudi(cpS, 0.44, 0.03); cpG.translate(0, 0, 0.22); cpG.rotateX(-Math.PI / 2);
  const contrappeso = mesh(cpG, vernice, 0, 0.1, 0);
  torretta.add(contrappeso); parte(contrappeso, V(-0.85, 0.15, 0), V(0, 0, 0.25), 0.3, 0.64);

  // cofano motore, a destra della cabina
  const cofano = new THREE.Group();
  cofano.add(mesh(new RoundedBoxGeometry(0.56, 0.4, 0.42, 4, 0.06), vernice, 0, 0, 0));
  const griglia = new THREE.Group();
  for (let i = 0; i < 5; i++) griglia.add(mesh(new THREE.BoxGeometry(0.34, 0.012, 0.005), nero, 0, -0.1 + i * 0.05, 0));
  griglia.position.set(0, 0.02, -0.213); cofano.add(griglia);
  cofano.position.set(0.15, 0.3, -0.255);
  torretta.add(cofano); parte(cofano, V(0.05, 0.22, -0.62), V(-0.3, 0, 0), 0.32, 0.66);

  // cabina
  const cabina = new THREE.Group();
  cabina.add(mesh(new RoundedBoxGeometry(0.76, 0.1, 0.5, 2, 0.02), grafite, 0, 0.05, 0));
  cabina.add(mesh(new RoundedBoxGeometry(0.72, 1.1, 0.48, 3, 0.05), vetro, 0, 0.65, 0));
  const montante = new RoundedBoxGeometry(0.05, 1.14, 0.05, 2, 0.015);
  [[0.34, 0.22], [0.34, -0.22], [-0.34, 0.22], [-0.34, -0.22]].forEach(([x, z]) => cabina.add(mesh(montante, nero, x, 0.65, z)));
  const tetto = mesh(new RoundedBoxGeometry(0.82, 0.08, 0.55, 3, 0.03), grafite, 0.01, 1.24, 0);
  cabina.add(tetto);
  cabina.add(mesh(new RoundedBoxGeometry(0.28, 0.08, 0.3, 2, 0.02), nero, -0.08, 0.38, 0));
  cabina.add(mesh(new RoundedBoxGeometry(0.07, 0.42, 0.3, 2, 0.02), nero, -0.22, 0.6, 0));
  const leva = new THREE.CylinderGeometry(0.012, 0.012, 0.16, 8);
  cabina.add(mesh(leva, nero, 0.08, 0.5, 0.15), mesh(leva, nero, 0.08, 0.5, -0.15));
  const lampeggiante = mesh(new THREE.CylinderGeometry(0.035, 0.04, 0.07, 16), giallo, -0.25, 1.31, 0.18);
  cabina.add(lampeggiante);
  cabina.position.set(0.04, 0.1, 0.22);
  torretta.add(cabina); parte(cabina, V(-0.1, 0.55, 0.55), V(0.15, 0, 0), 0.36, 0.72);

  // supporto del braccio (brandeggio)
  const supporto = mesh(new RoundedBoxGeometry(0.22, 0.3, 0.28, 3, 0.04), grafite, 0.64, 0.17, 0);
  torretta.add(supporto); parte(supporto, V(0.4, 0, 0), null, 0.4, 0.7);

  /* ---------------- braccio, avambraccio, benna ---------------- */
  const perno = (lung) => { const g = new THREE.CylinderGeometry(0.032, 0.032, lung, 16); g.rotateX(Math.PI / 2); return g; };

  const braccioP = new THREE.Group();          // perno del braccio
  braccioP.position.set(0.7, 0.24, 0);
  torretta.add(braccioP);
  const braccio = new THREE.Group();
  braccio.add(mesh(nastro([[0, 0], [0.4, 0.8], [0.7, 1.0], [1.38, 0.86]], [0.2, 0.2, 0.19, 0.14], 0.17), vernice));
  braccio.add(mesh(perno(0.24), cromo, 0, 0, 0), mesh(perno(0.22), cromo, 1.38, 0.86, 0));
  braccioP.add(braccio);
  parte(braccioP, V(0.6, 0.4, 0), V(0, 0, 0.35), 0.48, 0.82);

  const avamP = new THREE.Group();
  avamP.position.set(1.38, 0.86, 0);
  braccio.add(avamP);
  const avam = new THREE.Group();
  avam.add(mesh(nastro([[-0.15, 0.2], [0, 0], [0.06, -0.5], [0.12, -1.0]], [0.13, 0.17, 0.15, 0.11], 0.13), vernice));
  avam.add(mesh(perno(0.2), cromo, 0.12, -1.0, 0));
  avamP.add(avam);
  parte(avamP, V(0.5, 0.18, 0), V(0, 0, -0.45), 0.56, 0.88);

  const bennaP = new THREE.Group();
  bennaP.position.set(0.12, -1.0, 0);
  avam.add(bennaP);
  const benna = new THREE.Group();
  const bS = new THREE.Shape();
  bS.moveTo(0.02, 0.07);
  bS.quadraticCurveTo(0.17, 0.02, 0.16, -0.18);
  bS.quadraticCurveTo(0.15, -0.38, -0.04, -0.4);
  bS.lineTo(-0.26, -0.36); bS.lineTo(-0.25, -0.31); bS.lineTo(-0.05, -0.335);
  bS.quadraticCurveTo(0.1, -0.33, 0.105, -0.18);
  bS.quadraticCurveTo(0.11, -0.04, -0.06, 0.0);
  bS.lineTo(-0.08, 0.04);
  bS.quadraticCurveTo(-0.04, 0.09, 0.02, 0.07);
  benna.add(mesh(estrudi(bS, 0.36, 0.008), grafite));
  const fS = new THREE.Shape();
  fS.moveTo(0.02, 0.07);
  fS.quadraticCurveTo(0.17, 0.02, 0.16, -0.18);
  fS.quadraticCurveTo(0.15, -0.38, -0.04, -0.4);
  fS.lineTo(-0.26, -0.36); fS.lineTo(-0.08, 0.04);
  fS.quadraticCurveTo(-0.04, 0.09, 0.02, 0.07);
  const fianco = estrudi(fS, 0.018, 0.004);
  benna.add(mesh(fianco, grafite, 0, 0, 0.187), mesh(fianco, grafite, 0, 0, -0.187));
  const dente = new THREE.ConeGeometry(0.022, 0.08, 4); dente.rotateZ(Math.PI / 2 + 0.18);
  [-0.12, -0.04, 0.04, 0.12].forEach((z) => benna.add(mesh(dente, ferro, -0.29, -0.345, z)));
  bennaP.add(benna);
  parte(bennaP, V(0.35, -0.35, 0), V(0, 0, 0.7), 0.62, 0.92);

  // decalco sul braccio, tutti e due i lati
  const tex = await decalco();
  const matDec = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, toneMapped: false });
  const dGeo = new THREE.PlaneGeometry(0.56, 0.105);
  const angDec = Math.atan2(0.86 - 1.0, 1.38 - 0.7);
  const d1 = mesh(dGeo, matDec, 1.03, 0.93, 0.0965); d1.rotation.z = angDec;
  const d2 = mesh(dGeo, matDec, 1.03, 0.93, -0.0965); d2.rotation.set(0, Math.PI, -angDec);
  braccio.add(d1, d2);

  /* ---------------- pistoni ---------------- */
  const pBraccio = new Pistone(canna, cromo, 0.05, 0.03, 0.5);
  const pAvam = new Pistone(canna, cromo, 0.045, 0.028, 0.46);
  const pBenna = new Pistone(canna, cromo, 0.04, 0.024, 0.4);
  const pistoni = [pBraccio, pAvam, pBenna];
  pistoni.forEach((p) => torretta.add(p.g));
  const ancore = {
    braccioA: V(0.82, 0.12, 0), braccioB: V(0.5, 0.48, 0),       // supporto -> pancia del braccio
    avamA: V(0.62, 1.16, 0), avamB: V(-0.15, 0.2, 0),            // dorso del braccio -> leva dell'avambraccio
    bennaA: V(0.1, -0.06, 0), bennaB: V(0.09, 0.09, 0)           // avambraccio -> leveraggio benna
  };
  const _a = new THREE.Vector3(), _b = new THREE.Vector3();
  const inTorretta = (obj, v, out) => { out.copy(v); obj.localToWorld(out); torretta.worldToLocal(out); return out; };
  let kPistoni = 1;
  const aggiornaPistoni = () => {
    macchina.updateMatrixWorld(true);
    const off = (1 - kPistoni) * 0.7;
    pBraccio.tra(inTorretta(torretta, ancore.braccioA, _a), inTorretta(braccio, ancore.braccioB, _b));
    pBraccio.g.position.z += off;
    pAvam.tra(inTorretta(braccio, ancore.avamA, _a), inTorretta(avam, ancore.avamB, _b));
    pAvam.g.position.z -= off;
    pBenna.tra(inTorretta(avam, ancore.bennaA, _a), inTorretta(benna, ancore.bennaB, _b));
    pBenna.g.position.z += off;
    pistoni.forEach((p) => { p.g.visible = kPistoni > 0.01; p.g.scale.setScalar(Math.max(0.001, kPistoni)); });
  };

  /* ---------------- pavimento e ombra ---------------- */
  const pav = new THREE.Mesh(new THREE.PlaneGeometry(12, 12), new THREE.MeshBasicMaterial({ map: texturaPavimento(), transparent: true, depthWrite: false, opacity: 0.55 }));
  pav.rotation.x = -Math.PI / 2; pav.position.y = 0.001;
  scena.add(pav);
  const ombraMat = new THREE.MeshBasicMaterial({ map: texturaOmbra(), transparent: true, depthWrite: false, opacity: 0.9 });
  const ombra = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 2.4), ombraMat);
  ombra.rotation.x = -Math.PI / 2; ombra.position.set(0.25, 0.004, 0);
  scena.add(ombra);

  /* ---------------- pose ---------------- */
  const POSE = [ // [w, rotazione torretta, braccio, avambraccio, benna]
    [0.00, 0.0, 0.22, -0.18, -0.55],
    [0.18, 0.0, 0.2, 0.52, 0.55],
    [0.42, -0.15, -0.36, 0.38, 0.45],
    [0.68, -0.15, -0.3, -0.38, -0.7],
    [0.86, -0.42, 0.34, -0.25, -0.95],
    [1.00, -0.55, 0.38, -0.2, -0.98]
  ];
  const posa = (w) => {
    let i = 0;
    while (i < POSE.length - 2 && w > POSE[i + 1][0]) i++;
    const A = POSE[i], B = POSE[i + 1];
    const t = morbida(clamp((w - A[0]) / (B[0] - A[0])));
    return [mix(A[1], B[1], t), mix(A[2], B[2], t), mix(A[3], B[3], t), mix(A[4], B[4], t)];
  };

  /* ---------------- dimensioni e camera ---------------- */
  let W = 1, H = 1;
  const dimensiona = () => {
    W = contenitore.clientWidth || innerWidth; H = contenitore.clientHeight || innerHeight;
    renderer.setSize(W, H, false);
    camera.aspect = W / H;
    if (contenitore.dataset.centrato) camera.clearViewOffset();
    else if (W < 900) camera.setViewOffset(W, H, 0, H * 0.1, W, H);
    else camera.setViewOffset(W, H, -W * 0.19, H * 0.05, W, H);
    camera.updateProjectionMatrix();
  };
  dimensiona();
  new ResizeObserver(dimensiona).observe(contenitore);

  const bersaglio = V(0.45, 0.85, 0);
  const posizionaCamera = (p, t, px, py) => {
    const vfov = THREE.MathUtils.degToRad(camera.fov);
    const hfov = 2 * Math.atan(Math.tan(vfov / 2) * camera.aspect);
    const stretto = camera.aspect < 0.8;
    // quanta macchina deve stare nello schermo (vista di 3/4: la lunghezza si accorcia)
    const largo = stretto ? mix(4.7, 4.1, liscia(0.05, 0.55, p)) : mix(7.8, 6.9, liscia(0.05, 0.55, p));
    const altoNec = stretto ? 2.6 : 3.2;
    const dist = Math.max(largo / 2 / Math.tan(hfov / 2), altoNec / 2 / Math.tan(vfov / 2)) + (stretto ? 0.4 : 1.2);
    scena.fog.near = dist - 1.5; scena.fog.far = dist + 10;
    const theta = stretto
      ? mix(1.0, 0.62, liscia(0, 0.6, p)) + mix(0, -0.32, liscia(0.6, 1, p)) + Math.sin(t * 0.25) * 0.04
      : mix(0.95, 0.3, liscia(0, 0.6, p)) + mix(0, -0.45, liscia(0.6, 1, p)) + Math.sin(t * 0.25) * 0.05 + px * 0.18;
    const phi = mix(0.5, 0.3, liscia(0, 1, p)) + py * 0.06;
    bersaglio.x = stretto ? 0.62 : 0.45;
    camera.position.set(
      bersaglio.x + Math.sin(theta) * Math.cos(phi) * dist,
      bersaglio.y + Math.sin(phi) * dist,
      bersaglio.z + Math.cos(theta) * Math.cos(phi) * dist
    );
    camera.lookAt(bersaglio);
  };

  /* ---------------- ciclo ---------------- */
  let pS = 0, tPrima = performance.now(), visibile = true, inPagina = !document.hidden;
  const puntatore = { x: 0, y: 0, tx: 0, ty: 0 };
  if (matchMedia('(pointer: fine)').matches) {
    addEventListener('pointermove', (e) => { puntatore.tx = (e.clientX / innerWidth - 0.5) * 2; puntatore.ty = (e.clientY / innerHeight - 0.5) * 2; }, { passive: true });
  }
  const leggiProgresso = () => (window.__nolProgresso ? window.__nolProgresso() : 0);

  const disegna = (t, p) => {
    const asse = liscia(0.02, 0.52, p);                 // montaggio
    const w = clamp((p - 0.55) / 0.45);                  // lavoro
    for (const q of parti) {
      const k = morbida(clamp((asse - q.t0) / (q.t1 - q.t0)));
      const e = 1 - k;
      const ondeggia = e * 0.035;
      q.obj.position.set(
        q.casa.x + q.off.x * e,
        q.casa.y + q.off.y * e + Math.sin(t * 1.3 + q.fase) * ondeggia,
        q.casa.z + q.off.z * e
      );
      q.obj.rotation.set(q.rcasa.x + q.rot.x * e, q.rcasa.y + q.rot.y * e, q.rcasa.z + q.rot.z * e + Math.sin(t * 0.9 + q.fase) * ondeggia * 0.6);
    }
    kPistoni = morbida(clamp((asse - 0.84) / 0.16));
    const [rt, rb, ra, rk] = posa(w);
    const respiro = asse > 0.99 ? Math.sin(t * 1.6) * 0.012 : 0;   // motore acceso: un filo di vibrazione
    torretta.rotation.y = rt;
    braccio.rotation.z = rb + respiro;
    avam.rotation.z = ra;
    benna.rotation.z = rk;
    aggiornaPistoni();
    ombraMat.opacity = 0.25 + 0.65 * asse;
    giallo.emissiveIntensity = asse > 0.99 ? 0.35 + 0.35 * Math.max(0, Math.sin(t * 6)) : 0;
    // all'ultima fase la luce diventa quella dell'alba: pronto alle 6:30
    const alba = liscia(0.62, 0.95, p);
    chiave.color.copy(luceNeutra).lerp(luceAlba, alba);
    chiave.intensity = 2.4 + alba * 0.8;
    contro.intensity = 1.6 - alba * 0.5;
    pav.material.opacity = 0.5 + 0.25 * asse;
    puntatore.x += (puntatore.tx - puntatore.x) * 0.05;
    puntatore.y += (puntatore.ty - puntatore.y) * 0.05;
    posizionaCamera(p, t, puntatore.x, puntatore.y);
    renderer.render(scena, camera);
  };

  // prima compilazione fuori dal ciclo: niente blocco al primo fotogramma
  posizionaCamera(0, 0, 0, 0);
  try { await renderer.compileAsync(scena, camera); } catch (e) { /* compila al primo render */ }
  const t0 = performance.now();

  if (riduci) {
    disegna(0, 0.62);
    renderer.domElement.classList.add('visibile');
    contenitore.classList.add('attiva');
    return;
  }

  const ciclo = () => {
    if (!visibile || !inPagina) { inCiclo = false; return; }
    requestAnimationFrame(ciclo);
    const ora = performance.now();
    const dt = Math.min(0.05, (ora - tPrima) / 1000); tPrima = ora;
    const p = leggiProgresso();
    pS += (p - pS) * (1 - Math.exp(-dt * 7));
    disegna((ora - t0) / 1000, pS);
  };
  let inCiclo = false;
  const riparti = () => { if (inCiclo) return; inCiclo = true; tPrima = performance.now(); requestAnimationFrame(ciclo); };

  new IntersectionObserver((v) => { visibile = v[0].isIntersecting; if (visibile) riparti(); }, { rootMargin: '10% 0px' }).observe(contenitore);
  document.addEventListener('visibilitychange', () => { inPagina = !document.hidden; if (inPagina) riparti(); });

  pS = leggiProgresso();
  disegna(0, pS);
  requestAnimationFrame(() => {
    renderer.domElement.classList.add('visibile');
    contenitore.classList.add('attiva');
  });
  riparti();
}
