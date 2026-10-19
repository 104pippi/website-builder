// KVM Engineering — linea di profilatura in 3D. La bobina si svolge, il nastro forato passa in otto
// stazioni di rulli e diventa un profilo a C, la cesoia lo taglia e i pezzi finiti aspettano sul banco.
// All'avvio il nastro infila la linea; scorrendo la pagina la camera scende verso l'uscita.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { sezione, liscio, SVILUPPO } from './profilo.js';

const NOTTE = 0x0e2030;
const STAZIONI = 8, Z_PRIMA = -8.4, PASSO_ST = 1.5;   // stazioni da z -8.4 a z 2.1
const Z_BOBINA = -12.2, Z_TAGLIO = 5.6;
const R_BOBINA = 1.2, R_SOTTO = 0.45, R_SOPRA = 0.3;
const PAVIMENTO = -1.9, BANCO = -1.25;
const VEL = 0.6;          // velocità del nastro a regime, unità al secondo
const PASSO_FORI = 0.6;   // passo della foratura lungo il nastro
const INFILA = 3.4;       // secondi in cui il nastro infila la linea all'avvio
const CORSA = Z_TAGLIO + 0.25 - Z_BOBINA;
const SPINTA = (CORSA - VEL * INFILA) * 2 / INFILA;

const zStaz = k => Z_PRIMA + k * PASSO_ST;

// grado di piega alla quota z: cresce a gradini, uno per stazione
function piega(z) {
  let p = 0;
  for (let k = 0; k < STAZIONI; k++) p += liscio(zStaz(k) - 0.5, zStaz(k) + 0.05, z);
  return p / STAZIONI;
}

// metri di nastro passati al tempo t: spunto veloce mentre infila la linea, poi velocità costante
function avanzamento(t) {
  if (t <= 0) return 0;
  const u = Math.min(t, INFILA);
  let s = VEL * u + SPINTA * (u / 2 - INFILA / (4 * Math.PI) * Math.sin(2 * Math.PI * u / INFILA));
  if (t > INFILA) s += VEL * (t - INFILA);
  return s;
}

function geoNastro(z0, z1, fette, grado) {
  const meta = 24, n = meta * 2 + 1;
  const pos = new Float32Array(n * (fette + 1) * 3), uv = new Float32Array(n * (fette + 1) * 2), idx = [];
  for (let j = 0; j <= fette; j++) {
    const z = z0 + (z1 - z0) * j / fette;
    const pts = sezione(grado(z), meta);
    for (let i = 0; i < n; i++) {
      const o = j * n + i;
      pos[o * 3] = pts[i][0]; pos[o * 3 + 1] = pts[i][1]; pos[o * 3 + 2] = z;
      uv[o * 2] = i / (n - 1); uv[o * 2 + 1] = z / PASSO_FORI;
    }
  }
  for (let j = 0; j < fette; j++) for (let i = 0; i < n - 1; i++) {
    const a = j * n + i, c = a + n;
    idx.push(a, c, a + 1, a + 1, c, c + 1);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

// foratura del nastro (asole sull'anima, fori sulle ali), un passo per riquadro
function texFori() {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = '#fff'; g.fillRect(0, 0, 256, 256);
  g.fillStyle = '#000';
  const foro = (u, v, w, h) => {
    const W = w / SVILUPPO * 256, H = h / PASSO_FORI * 256;
    g.beginPath(); g.roundRect(u * 256 - W / 2, v * 256 - H / 2, W, H, Math.min(W, H) / 2); g.fill();
  };
  foro(0.5, 0.3, 0.11, 0.27);
  foro(0.5, 0.78, 0.09, 0.09);
  for (const u of [0.2, 0.8]) { foro(u, 0.3, 0.07, 0.07); foro(u, 0.76, 0.05, 0.15); }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

// spire della bobina sui fianchi, con il segno di gesso che fa vedere la rotazione
function texSpire() {
  const c = document.createElement('canvas');
  c.width = c.height = 512;
  const g = c.getContext('2d');
  g.fillStyle = '#9aa6ae'; g.fillRect(0, 0, 512, 512);
  for (let r = 256 * 0.35; r < 256; r += 2.2) {
    const v = 150 + Math.round(Math.random() * 60);
    g.strokeStyle = `rgb(${v},${v + 8},${v + 14})`;
    g.lineWidth = 1.4;
    g.beginPath(); g.arc(256, 256, r, 0, Math.PI * 2); g.stroke();
  }
  g.strokeStyle = 'rgba(255,255,255,.85)'; g.lineWidth = 7; g.lineCap = 'round';
  g.beginPath(); g.moveTo(256 + 256 * 0.42, 256); g.lineTo(256 + 250, 256); g.stroke();
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// rullo con mozzo e bulloni: gruppo 0 acciaio lucido, gruppo 1 brunito
function geoRullo(r, w) {
  const corpo = new THREE.CylinderGeometry(r, r, w, 56).rotateZ(Math.PI / 2);
  const scuri = [new THREE.CylinderGeometry(r * 0.36, r * 0.36, w + 0.14, 28).rotateZ(Math.PI / 2)];
  for (const s of [-1, 1]) for (let i = 0; i < 6; i++) {
    const a = i / 6 * Math.PI * 2;
    scuri.push(new THREE.CylinderGeometry(0.03, 0.03, 0.05, 10).rotateZ(Math.PI / 2)
      .translate(s * (w / 2 + 0.015), Math.cos(a) * r * 0.62, Math.sin(a) * r * 0.62));
  }
  return mergeGeometries([corpo, mergeGeometries(scuri)], true);
}

function istanze(geo, mat, matrici) {
  const m = new THREE.InstancedMesh(geo, mat, matrici.length);
  matrici.forEach((x, i) => m.setMatrixAt(i, x));
  return m;
}

const M = (x, y, z, sx = 1, sy = 1, sz = 1) =>
  new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion(), new THREE.Vector3(sx, sy, sz));

export function avvia(canvas, hero) {
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  } catch (e) { return false; }
  if (!renderer.getContext()) return false;

  const telefono = matchMedia('(max-width: 820px), (pointer: coarse)').matches;
  const fermo = matchMedia('(prefers-reduced-motion: reduce)').matches;
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, telefono ? 1.5 : 2));
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.localClippingEnabled = true;

  const scena = new THREE.Scene();
  scena.fog = new THREE.Fog(NOTTE, 14, 38);
  const pmrem = new THREE.PMREMGenerator(renderer);
  scena.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scena.environmentIntensity = 0.9;
  const chiave = new THREE.DirectionalLight(0xffffff, 1.7);
  chiave.position.set(5, 9, 7);
  const taglio = new THREE.DirectionalLight(0x7cc8ee, 1.4);
  taglio.position.set(-7, 3, -6);
  scena.add(chiave, taglio);

  // materiali
  const acciaio = new THREE.MeshStandardMaterial({ color: 0xe6ebef, metalness: 1, roughness: 0.17 });
  const brunito = new THREE.MeshStandardMaterial({ color: 0x2b333b, metalness: 0.7, roughness: 0.42 });
  const vernice = new THREE.MeshStandardMaterial({ color: 0x5f7180, metalness: 0.3, roughness: 0.5 });
  const bluKvm = new THREE.MeshStandardMaterial({ color: 0x0a6aa0, metalness: 0.25, roughness: 0.42 });
  const basamento = new THREE.MeshStandardMaterial({ color: 0x22384a, metalness: 0.2, roughness: 0.7 });
  const piano = new THREE.Plane(new THREE.Vector3(0, 0, -1), Z_BOBINA);
  const fori = texFori();
  const lamiera = new THREE.MeshStandardMaterial({
    color: 0xc7d1d8, metalness: 0.9, roughness: 0.3, side: THREE.DoubleSide,
    alphaMap: fori, alphaTest: 0.5, alphaToCoverage: true, clippingPlanes: [piano],
  });

  const linea = new THREE.Group();
  scena.add(linea);

  // nastro: dalla bobina alla cesoia
  linea.add(new THREE.Mesh(geoNastro(Z_BOBINA, Z_TAGLIO + 0.3, 300, piega), lamiera));

  // bobina sullo svolgitore
  const bobina = new THREE.Group();
  bobina.position.set(0, R_BOBINA, Z_BOBINA);
  bobina.add(new THREE.Mesh(new THREE.CylinderGeometry(R_BOBINA, R_BOBINA, SVILUPPO, 72, 1, true).rotateZ(Math.PI / 2),
    new THREE.MeshStandardMaterial({ color: 0xbcc6cd, metalness: 0.9, roughness: 0.28 })));
  const fianco = new THREE.MeshStandardMaterial({ map: texSpire(), metalness: 0.75, roughness: 0.38 });
  for (const s of [-1, 1]) {
    const f = new THREE.Mesh(new THREE.RingGeometry(0.42, R_BOBINA, 72, 1), fianco);
    f.rotation.y = s * Math.PI / 2;
    f.position.x = s * SVILUPPO / 2;
    bobina.add(f);
  }
  linea.add(bobina);
  const mandrino = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, SVILUPPO + 1, 32).rotateZ(Math.PI / 2), brunito);
  mandrino.position.copy(bobina.position);
  linea.add(mandrino);
  const hSvolg = R_BOBINA - PAVIMENTO + 0.25;
  linea.add(istanze(new THREE.BoxGeometry(0.34, 1, 1), bluKvm, [
    M(-(SVILUPPO / 2 + 0.62), PAVIMENTO + hSvolg / 2, Z_BOBINA, 1, hSvolg, 1),
    M(SVILUPPO / 2 + 0.62, PAVIMENTO + hSvolg / 2, Z_BOBINA, 1, hSvolg, 1),
  ]));
  linea.add(istanze(new THREE.BoxGeometry(1, 1, 1), basamento, [M(0, PAVIMENTO + 0.15, Z_BOBINA, 3.9, 0.3, 1.6)]));

  // basamento della profilatrice
  const z0 = zStaz(0) - 1, z1 = zStaz(STAZIONI - 1) + 1;
  linea.add(istanze(new THREE.BoxGeometry(1, 1, 1), basamento, [
    M(0, (BANCO + PAVIMENTO) / 2, (z0 + z1) / 2, 3.9, BANCO - PAVIMENTO, z1 - z0),
  ]));

  // stazioni: spalle, cappelli, supporti, alberi e rulli
  const ySopra = [], spalle = [], supporti = [], alberi = [];
  for (let k = 0; k < STAZIONI; k++) {
    const z = zStaz(k);
    const alto = Math.max(...sezione(piega(z + 0.05), 12).map(p => p[1]));
    const yS = alto + R_SOPRA + 0.012, yI = -R_SOTTO - 0.012;
    ySopra.push(yS);
    const top = yS + 0.24, h = top - BANCO;
    for (const s of [-1, 1]) {
      spalle.push(M(s * 1.68, BANCO + h / 2, z, 1, h, 1));
      supporti.push(M(s * 1.68, yS, z), M(s * 1.68, yI, z));
    }
    alberi.push(M(0, yS, z), M(0, yI, z));
  }
  linea.add(istanze(new THREE.BoxGeometry(0.22, 1, 0.5), vernice, spalle));
  linea.add(istanze(new THREE.BoxGeometry(0.4, 0.36, 0.5), bluKvm, supporti));
  linea.add(istanze(new THREE.CylinderGeometry(0.085, 0.085, 3.3, 20).rotateZ(Math.PI / 2), brunito, alberi));
  const rulliSotto = new THREE.InstancedMesh(geoRullo(R_SOTTO, 0.9), [acciaio, brunito], STAZIONI);
  const rulliSopra = new THREE.InstancedMesh(geoRullo(R_SOPRA, 0.62), [acciaio, brunito], STAZIONI);
  linea.add(rulliSotto, rulliSopra);

  // rulliera d'uscita e cesoia
  const zU0 = zStaz(STAZIONI - 1) + 0.8;
  const folli = [];
  for (let z = zU0; z < Z_TAGLIO - 0.5; z += 0.55) folli.push(M(0, -0.1, z));
  linea.add(istanze(new THREE.CylinderGeometry(0.09, 0.09, 1.25, 18).rotateZ(Math.PI / 2), acciaio, folli));
  const lu = Z_TAGLIO - zU0;
  linea.add(istanze(new THREE.BoxGeometry(1, 1, 1), basamento, [
    M(-0.72, -0.28, zU0 + lu / 2, 0.14, 0.2, lu), M(0.72, -0.28, zU0 + lu / 2, 0.14, 0.2, lu),
    M(-0.72, (PAVIMENTO - 0.38) / 2, zU0 + 0.3, 0.14, -0.38 - PAVIMENTO, 0.14),
    M(0.72, (PAVIMENTO - 0.38) / 2, zU0 + 0.3, 0.14, -0.38 - PAVIMENTO, 0.14),
    M(-0.72, (PAVIMENTO - 0.38) / 2, Z_TAGLIO - 0.5, 0.14, -0.38 - PAVIMENTO, 0.14),
    M(0.72, (PAVIMENTO - 0.38) / 2, Z_TAGLIO - 0.5, 0.14, -0.38 - PAVIMENTO, 0.14),
  ]));
  linea.add(istanze(new THREE.BoxGeometry(1, 1, 1), bluKvm, [
    M(-1.15, (PAVIMENTO + 1.5) / 2, Z_TAGLIO + 0.3, 0.38, 1.5 - PAVIMENTO, 0.8),
    M(1.15, (PAVIMENTO + 1.5) / 2, Z_TAGLIO + 0.3, 0.38, 1.5 - PAVIMENTO, 0.8),
    M(0, 1.3, Z_TAGLIO + 0.3, 2.68, 0.5, 0.8),
  ]));
  linea.add(istanze(new THREE.BoxGeometry(1, 1, 1), brunito, [M(0, 0.82, Z_TAGLIO + 0.3, 1.9, 0.46, 0.5)]));

  // pezzi finiti sul banco accanto alla linea
  const foriFermi = fori.clone();
  foriFermi.needsUpdate = true;
  const finito = new THREE.MeshStandardMaterial({
    color: 0xc7d1d8, metalness: 0.9, roughness: 0.3, side: THREE.DoubleSide,
    alphaMap: foriFermi, alphaTest: 0.5, alphaToCoverage: true,
  });
  const pezzo = geoNastro(0, 2.8, 2, () => 1);
  const xB = -2.75, zB = Z_TAGLIO - 2.2;
  linea.add(istanze(new THREE.BoxGeometry(1, 1, 1), basamento, [M(xB + 0.85, (PAVIMENTO - 0.62) / 2, zB + 1.4, 2.6, -0.62 - PAVIMENTO, 3.1)]));
  const posPezzi = [[0, 0], [0.85, 0], [1.7, 0], [0.42, 0.47], [1.27, 0.47]];
  linea.add(istanze(pezzo, finito, posPezzi.map(([dx, dy]) => M(xB + dx, -0.6 + dy, zB))));

  // pavimento a griglia, come un piano di lavoro CAD
  const griglia = new THREE.GridHelper(70, 70, 0x2f7aa6, 0x1c4562);
  griglia.position.y = PAVIMENTO;
  griglia.material.transparent = true;
  griglia.material.opacity = 0.42;
  scena.add(griglia);

  // camera: inquadratura per schermo verticale o orizzontale
  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 80);
  // segui: quanto l'inquadratura scende con lo scroll, così la linea resta nella parte di hero ancora visibile
  let posa, vw = 1, vh = 1;
  const v3 = a => new THREE.Vector3(...a);
  function misura() {
    const w = canvas.clientWidth || innerWidth, h = canvas.clientHeight || innerHeight;
    renderer.setSize(w, h, false);
    vw = w; vh = h;
    const verticale = w / h < 0.9;
    posa = verticale ? {
      da: v3([3.2, 9.6, 14.6]), a: v3([2.8, 6.4, 11.0]),
      miraDa: v3([0, -0.4, -3.6]), miraA: v3([0, -0.3, -1.0]), fov: 46, dx: 0, dy: 0.13, segui: 0.25,
    } : {
      da: v3([10.5, 7.6, 10.2]), a: v3([7.6, 5.0, 9.6]),
      miraDa: v3([-0.6, -0.6, -3.0]), miraA: v3([-0.3, -0.4, 0.4]), fov: 34, dx: -0.22, dy: 0.04, segui: 0.5,
    };
    camera.fov = posa.fov;
    camera.aspect = w / h;
    camera.setViewOffset(w, h, posa.dx * w, posa.dy * h, w, h);
  }
  misura();
  addEventListener('resize', misura);

  // scroll e puntatore (il puntatore solo con il mouse)
  let q = 0, qS = 0, px = 0, py = 0, pxS = 0, pyS = 0;
  const leggiScroll = () => { q = Math.min(1, Math.max(0, scrollY / Math.max(1, hero.offsetHeight))); };
  addEventListener('scroll', leggiScroll, { passive: true });
  leggiScroll();
  if (matchMedia('(pointer: fine)').matches) {
    addEventListener('pointermove', e => { px = e.clientX / innerWidth * 2 - 1; py = e.clientY / innerHeight * 2 - 1; }, { passive: true });
  }

  const tmp = new THREE.Object3D(), mira = new THREE.Vector3();
  const t0 = performance.now();
  let ultimo = t0, raf = 0, inVista = true, acceso = false;

  function disegna(t, dt) {
    const s = avanzamento(t);
    piano.constant = Math.min(Z_TAGLIO + 0.3, Z_BOBINA + s);
    fori.offset.y = -s / PASSO_FORI;
    bobina.rotation.x = -s / R_BOBINA;
    for (let k = 0; k < STAZIONI; k++) {
      tmp.position.set(0, -R_SOTTO - 0.012, zStaz(k)); tmp.rotation.set(s / R_SOTTO, 0, 0); tmp.updateMatrix();
      rulliSotto.setMatrixAt(k, tmp.matrix);
      tmp.position.set(0, ySopra[k], zStaz(k)); tmp.rotation.set(-s / R_SOPRA, 0, 0); tmp.updateMatrix();
      rulliSopra.setMatrixAt(k, tmp.matrix);
    }
    rulliSotto.instanceMatrix.needsUpdate = rulliSopra.instanceMatrix.needsUpdate = true;

    const k = Math.min(1, dt * 5);
    qS += (q - qS) * k; pxS += (px - pxS) * k; pyS += (py - pyS) * k;
    const e = qS * qS * (3 - 2 * qS);
    const deriva = Math.sin(t * 0.18) * 0.5;
    camera.position.lerpVectors(posa.da, posa.a, e);
    camera.position.x += deriva + pxS * 0.6;
    camera.position.y += -pyS * 0.35;
    mira.lerpVectors(posa.miraDa, posa.miraA, e);
    camera.lookAt(mira);
    camera.setViewOffset(vw, vh, posa.dx * vw, (posa.dy - e * posa.segui) * vh, vw, vh);
    renderer.render(scena, camera);
    if (!acceso) {
      acceso = true;
      canvas.classList.add('acceso');
      hero.classList.add('con-3d');
    }
  }

  function giro(ora) {
    raf = requestAnimationFrame(giro);
    const adesso = performance.now();
    const dt = Math.min(0.05, (adesso - ultimo) / 1000);
    ultimo = adesso;
    disegna((adesso - t0) / 1000, dt);
  }

  function gestisci() {
    const deve = inVista && !document.hidden;
    if (deve && !raf) { ultimo = performance.now(); raf = requestAnimationFrame(giro); }
    else if (!deve && raf) { cancelAnimationFrame(raf); raf = 0; }
  }

  if (fermo) {
    disegna(INFILA + 2, 1);
    addEventListener('resize', () => disegna(INFILA + 2, 1));
    return true;
  }
  new IntersectionObserver(([v]) => { inVista = v.isIntersecting; gestisci(); }).observe(hero);
  document.addEventListener('visibilitychange', gestisci);
  gestisci();
  return true;
}
