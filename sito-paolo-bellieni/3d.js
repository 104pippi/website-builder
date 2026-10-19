// Il campionario Bellieni in 3D: sei campioni di metallo a rombo, come nel logo,
// impilati in profondità. Lo scroll li sfoglia; il tempo li fa respirare e ci fa scivolare la luce.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const S = 3.2;                 // lato del campione
const H = S / 2;
const D = S * Math.SQRT1_2;    // mezza diagonale del rombo
const PASSO_Z = 1.3;           // distanza tra un campione e l'altro nella pila
const SFONDO = '#1D252D';
const INCLINAZIONE = .38;     // i campioni stanno girati come pagine socchiuse
const VENTAGLIO = { x: .46, y: .22 }; // la pila si apre a ventaglio: si vedono i bordi dei campioni dietro

const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const easeInOut = (x) => x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
const easeOut = (x) => 1 - Math.pow(1 - x, 3);

/* ---------- geometrie ---------- */

// filo ondulato: passa sopra e sotto i fili dell'altra direzione
class Ondulato extends THREE.Curve {
  constructor(asse, pos, passo, amp, fase, profilo) {
    super();
    Object.assign(this, { asse, pos, passo, amp, fase, profilo });
  }
  getPoint(t, v = new THREE.Vector3()) {
    const s = -H + S * t;
    let z = Math.cos(Math.PI * (s + H - this.passo / 2) / this.passo + this.fase);
    if (this.profilo !== 1) z = Math.sign(z) * Math.pow(Math.abs(z), this.profilo);
    z *= this.amp;
    return this.asse === 0 ? v.set(s, this.pos, z) : v.set(this.pos, s, z);
  }
}

function tessuto({ passo, r, amp, seg = 8, rad = 6, profilo = 1 }) {
  const n = Math.round(S / passo);
  const geos = [];
  for (let asse = 0; asse < 2; asse++) {
    for (let i = 0; i < n; i++) {
      const pos = -H + passo * (i + .5);
      const curva = new Ondulato(asse, pos, passo, amp, Math.PI * i + (asse ? Math.PI : 0), profilo);
      geos.push(new THREE.TubeGeometry(curva, n * seg, r, rad, false));
    }
  }
  const g = mergeGeometries(geos);
  geos.forEach((x) => x.dispose());
  return g;
}

function lamieraForata() {
  const forma = new THREE.Shape();
  forma.moveTo(-H, -H); forma.lineTo(H, -H); forma.lineTo(H, H); forma.lineTo(-H, H); forma.closePath();
  const p = .3, r = .108, dy = p * Math.sqrt(3) / 2;
  let riga = 0;
  for (let y = -H + .2; y < H - .14; y += dy, riga++) {
    for (let x = -H + .2 + (riga % 2 ? p / 2 : 0); x < H - .14; x += p) {
      const foro = new THREE.Path();
      foro.absarc(x, y, r, 0, Math.PI * 2, true);
      forma.holes.push(foro);
    }
  }
  const g = new THREE.ExtrudeGeometry(forma, { depth: .05, bevelEnabled: false, curveSegments: 9 });
  g.translate(0, 0, -.025);
  return g;
}

function lamieraStirata() {
  // maglia romboidale: trefoli inclinati sul proprio asse, come esce dalla stiratrice
  const ax = .25, ay = .135, w = .07, t = .028, incl = .62;
  const L = Math.hypot(ax, ay), ang = Math.atan2(ay, ax);
  const nx = Math.floor(S / ax), ny = Math.floor(S / ay);
  const pezzi = [];
  for (let i = 0; i < nx; i++) {
    for (let j = 0; j <= ny; j++) {
      if ((i + j) % 2) continue;
      const x = -H + i * ax, y = -H + j * ay;
      for (const s of [1, -1]) {
        const y2 = y + s * ay;
        if (y2 < -H - 1e-6 || y2 > H + 1e-6) continue;
        pezzi.push([x + ax / 2, (y + y2) / 2, s * ang, s]);
      }
    }
  }
  const box = new THREE.BoxGeometry(L + w * .7, w, t);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), qx = new THREE.Quaternion(), qz = new THREE.Quaternion();
  const unit = new THREE.Vector3(1, 1, 1), pos = new THREE.Vector3();
  const geos = pezzi.map(([x, y, a, s]) => {
    qz.setFromAxisAngle(new THREE.Vector3(0, 0, 1), a);
    qx.setFromAxisAngle(new THREE.Vector3(1, 0, 0), incl * s);
    q.multiplyQuaternions(qz, qx);
    m.compose(pos.set(x, y, 0), q, unit);
    return box.clone().applyMatrix4(m);
  });
  const g = mergeGeometries(geos);
  geos.forEach((x) => x.dispose()); box.dispose();
  return g;
}

function pannelloLario() {
  // pannello elettrosaldato con le nervature a V che lo irrigidiscono
  const nv = 13, dx = S / nv, r = .04, prof = .15, larg = .18;
  const orizzontali = [];
  for (let k = 0; k < 8; k++) orizzontali.push(-H + .2 + k * .4);
  const nervature = [orizzontali[1], orizzontali[6]];
  const zN = (y) => {
    let z = 0;
    for (const yb of nervature) { const d = Math.abs(y - yb); if (d < larg) z = Math.max(z, prof * (1 - d / larg)); }
    return z;
  };
  class Verticale extends THREE.Curve {
    constructor(x) { super(); this.x = x; }
    getPoint(t, v = new THREE.Vector3()) { const y = -H + S * t; return v.set(this.x, y, zN(y)); }
  }
  const geos = [];
  for (let i = 0; i < nv; i++) geos.push(new THREE.TubeGeometry(new Verticale(-H + dx * (i + .5)), 140, r, 7, false));
  for (const y of orizzontali) {
    const c = new THREE.CylinderGeometry(r * 1.05, r * 1.05, S, 8, 1, true);
    c.rotateZ(Math.PI / 2);
    c.translate(0, y, zN(y) - r * 1.7);
    geos.push(c);
  }
  const g = mergeGeometries(geos);
  geos.forEach((x) => x.dispose());
  return g;
}

function grigliato() {
  const geos = [];
  const nb = 11, alto = .24;
  for (let i = 0; i < nb; i++) {
    const b = new THREE.BoxGeometry(.034, S, alto);
    b.translate(-H + S * (i + .5) / nb, 0, 0);
    geos.push(b);
  }
  for (let y = -H + .2; y < H - .1; y += .4) {
    const c = new THREE.BoxGeometry(S, .046, .046);
    c.rotateX(Math.PI / 4);
    c.translate(0, y, alto / 2 - .01);
    geos.push(c);
  }
  const g = mergeGeometries(geos);
  geos.forEach((x) => x.dispose());
  return g;
}

function cornice(profondita) {
  const b = .085, geos = [];
  const lati = [[S + b * 2, b, 0, H + b / 2], [S + b * 2, b, 0, -H - b / 2], [b, S, H + b / 2, 0], [b, S, -H - b / 2, 0]];
  for (const [w, h, x, y] of lati) {
    const g = new THREE.BoxGeometry(w, h, profondita);
    g.translate(x, y, 0);
    geos.push(g);
  }
  const g = mergeGeometries(geos);
  geos.forEach((x) => x.dispose());
  return g;
}

/* ---------- materiali ---------- */
const metallo = (colore, ruvido) => new THREE.MeshStandardMaterial({ color: colore, metalness: 1, roughness: ruvido });
const MATERIALI = {
  ottone: metallo('#CFA24A', .26),
  zinco: metallo('#B9C1C7', .36),
  acciaio: metallo('#B4BBC1', .2),
  stirata: metallo('#A9B1B8', .2),
  antracite: new THREE.MeshPhysicalMaterial({ color: '#4B525A', metalness: .45, roughness: .42, clearcoat: .7, clearcoatRoughness: .35 }),
  grigliato: metallo('#B5BBBF', .42),
  rosso: new THREE.MeshPhysicalMaterial({ color: '#8C0F18', metalness: .1, roughness: .55, clearcoat: .35, clearcoatRoughness: .45 }),
};

const CAMPIONI = [
  { geo: () => tessuto({ passo: .16, r: .027, amp: .03, seg: 8, rad: 6 }), mat: 'ottone', prof: .12 },
  { geo: () => tessuto({ passo: .4, r: .052, amp: .06, seg: 14, rad: 8, profilo: .55 }), mat: 'zinco', prof: .16 },
  { geo: lamieraForata, mat: 'acciaio', prof: .12 },
  { geo: lamieraStirata, mat: 'stirata', prof: .12 },
  { geo: pannelloLario, mat: 'antracite', prof: .24 },
  { geo: grigliato, mat: 'grigliato', prof: .27 },
];

/* ---------- scena ---------- */
export async function avvia({ canvas, palco, stato, ridotto }) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' });
  if (!renderer.getContext()) throw new Error('WebGL assente');
  renderer.setClearColor(SFONDO, 1);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  const scena = new THREE.Scene();
  scena.fog = new THREE.Fog(SFONDO, 10, 16);
  const pmrem = new THREE.PMREMGenerator(renderer);
  scena.environment = pmrem.fromScene(new RoomEnvironment(), .04).texture;
  scena.environmentIntensity = .7;

  const camera = new THREE.PerspectiveCamera(30, 1, .1, 60);
  const luce = new THREE.DirectionalLight('#ffffff', 3);
  const contro = new THREE.DirectionalLight('#A9C1D6', 1.3);
  contro.position.set(-6, 3, -8);
  scena.add(luce, contro, luce.target);

  const pagine = CAMPIONI.map((c, i) => {
    const perno = new THREE.Group();        // il cardine sul vertice sinistro del rombo
    const corpo = new THREE.Group();
    const rombo = new THREE.Group();
    rombo.rotation.z = Math.PI / 4;
    const lastra = new THREE.Mesh(c.geo(), MATERIALI[c.mat]);
    const telaio = new THREE.Mesh(cornice(c.prof), MATERIALI.rosso);
    rombo.add(lastra, telaio);
    corpo.position.x = D;
    corpo.add(rombo);
    perno.add(corpo);
    perno.position.set(-D + i * VENTAGLIO.x, i * VENTAGLIO.y, -i * PASSO_Z);
    scena.add(perno);
    return { perno, corpo, i };
  });

  // inquadratura
  let larghezza = 1, altezza = 1, mobile = true, distanza = 12;
  const misura = () => {
    const r = palco.getBoundingClientRect();
    larghezza = Math.max(1, Math.round(r.width));
    altezza = Math.max(1, Math.round(r.height));
    mobile = larghezza < 960;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, larghezza < 700 ? 1.5 : 2));
    renderer.setSize(larghezza, altezza, false);
    camera.aspect = larghezza / altezza;
    const tanMezzo = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    // quanto spazio occupa il rombo: in alto sul telefono (sotto c'è il testo), a destra sul desktop
    const altUtile = mobile ? .62 : .82, largUtile = mobile ? .9 : .5;
    const perAltezza = (D * 2.25) / (2 * tanMezzo * altUtile);
    const perLarghezza = (D * 2.25) / (2 * tanMezzo * camera.aspect * largUtile);
    distanza = Math.max(perAltezza, perLarghezza);
    if (mobile) camera.setViewOffset(larghezza, altezza, 0, altezza * .17, larghezza, altezza);
    else camera.setViewOffset(larghezza, altezza, -larghezza * .2, 0, larghezza, altezza);
    camera.updateProjectionMatrix();
    scena.fog.near = distanza + .6;
    scena.fog.far = distanza + PASSO_Z * 5.4;
    sporco = true;
  };

  // il puntatore aggiunge un extra solo su desktop
  const puntatore = { x: 0, y: 0, vx: 0, vy: 0 };
  if (matchMedia('(pointer: fine)').matches && !ridotto) {
    window.addEventListener('pointermove', (e) => {
      puntatore.x = (e.clientX / innerWidth) * 2 - 1;
      puntatore.y = (e.clientY / innerHeight) * 2 - 1;
    }, { passive: true });
  }

  let pVis = stato.p, tempo = 0, prima = performance.now(), visibile = false, inCorsa = false, sporco = true;
  let entrata0 = -1;

  const aggiorna = (ora, dt) => {
    if (!ridotto) tempo += dt;
    pVis = ridotto ? stato.p : pVis + (stato.p - pVis) * (1 - Math.exp(-dt * 8));
    puntatore.vx += (puntatore.x - puntatore.vx) * (1 - Math.exp(-dt * 3));
    puntatore.vy += (puntatore.y - puntatore.vy) * (1 - Math.exp(-dt * 3));

    const fuoco = -pVis * PASSO_Z;
    const ondeggia = ridotto ? 0 : Math.sin(tempo * .21);
    const vx = pVis * VENTAGLIO.x, vy = pVis * VENTAGLIO.y;
    camera.position.set(vx + .1 + ondeggia * .5 + puntatore.vx * .8, vy + .55 + Math.sin(tempo * .17) * .22 - puntatore.vy * .5, fuoco + distanza);
    camera.lookAt(vx - .1, vy + .1, fuoco - .9);

    // la luce gira lenta intorno ai campioni e ci scivola sopra
    const a = ridotto ? .9 : tempo * .32;
    luce.position.set(Math.cos(a) * 7, 3.5 + Math.sin(a * .7) * 2, fuoco + 5 + Math.sin(a) * 3);
    luce.target.position.set(vx, vy, fuoco);

    const entrata = ridotto ? 1 : entrata0 < 0 ? 0 : clamp((ora - entrata0) / 1700);
    for (const pg of pagine) {
      const f = easeInOut(clamp(pVis - pg.i));
      const e = easeOut(clamp(entrata * 1.6 - pg.i * .11));
      pg.perno.visible = f < .999 && pg.i - pVis < 5.2;
      if (!pg.perno.visible) continue;
      // sfogliata: il campione gira sul cardine verso chi guarda ed esce a sinistra
      pg.perno.rotation.y = INCLINAZIONE - f * 2.6 + (1 - e) * .9;
      pg.perno.position.x = -D + pg.i * VENTAGLIO.x - f * 2.4;
      pg.perno.position.y = pg.i * VENTAGLIO.y + f * .5;
      pg.perno.position.z = -pg.i * PASSO_Z - (1 - e) * 9;
      const respiro = ridotto ? 0 : 1;
      pg.corpo.rotation.x = Math.sin(tempo * .5 + pg.i * 1.7) * .05 * respiro + (1 - e) * .6;
      pg.corpo.rotation.y = Math.sin(tempo * .37 + pg.i * 1.3) * .09 * respiro;
      pg.corpo.rotation.z = Math.sin(tempo * .29 + pg.i) * .025 * respiro;
    }
  };

  const disegna = () => renderer.render(scena, camera);

  const ciclo = () => {
    if (!inCorsa) return;
    requestAnimationFrame(ciclo);
    const ora = performance.now();
    const dt = Math.min(.05, Math.max(0, (ora - prima) / 1000));
    prima = ora;
    if (ridotto && !sporco && Math.abs(stato.p - pVis) < 1e-4) return;
    sporco = false;
    aggiorna(ora, dt);
    disegna();
  };
  const accendi = () => {
    if (inCorsa || !visibile || document.hidden) return;
    inCorsa = true;
    prima = performance.now();
    if (entrata0 < 0) entrata0 = prima;
    requestAnimationFrame(ciclo);
  };
  const spegni = () => { inCorsa = false; };

  misura();
  new ResizeObserver(misura).observe(palco);
  new IntersectionObserver(([v]) => { visibile = v.isIntersecting; visibile ? accendi() : spegni(); }, { rootMargin: '120px 0px' }).observe(palco);
  document.addEventListener('visibilitychange', () => (document.hidden ? spegni() : accendi()));
  window.addEventListener('scroll', () => { sporco = true; }, { passive: true });

  aggiorna(performance.now(), 0);
  if (renderer.compileAsync) await renderer.compileAsync(scena, camera);
  disegna();
  canvas.classList.add('pronta');
  // l'entrata parte quando il palco si vede davvero
  if (visibile) { entrata0 = performance.now(); accendi(); }
  return { renderer, scena, camera };
}
