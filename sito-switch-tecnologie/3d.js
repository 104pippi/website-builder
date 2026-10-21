/* SWITCH — rack 3D: si accende, poi allo scroll si apre a strati */
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

const W = 4.4;          // larghezza utile (19")
const D = 3.0;          // profondità
const U = 0.445;        // un'unità rack
const FRONTE = D / 2;
const BASE = 0.3;       // altezza dello zoccolo
const SALTO = 1.05;     // distanza tra gli strati aperti
const CASSETTO = 1.0;   // quanto esce lo strato attivo

const liscio = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const easeOut = (t) => 1 - Math.pow(1 - Math.min(1, Math.max(0, t)), 3);
const verso = (cur, tgt, dt, k) => cur + (tgt - cur) * (1 - Math.exp(-dt * k));
const rumore = (i, n) => { const x = Math.sin(i * 12.9898 + n * 78.233) * 43758.5453; return x - Math.floor(x); };

export async function avvia({ canvas, poster, palco, zonaA, zonaB, riduci }) {
  const modoPoster = new URLSearchParams(location.search).has('poster');
  if (riduci && !modoPoster) return false;

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance', preserveDrawingBuffer: modoPoster });
  } catch (e) { return false; }
  if (!renderer.getContext()) return false;

  const mobile = () => innerWidth < 768;
  renderer.setPixelRatio(modoPoster ? 1 : Math.min(devicePixelRatio || 1, mobile() ? 1.5 : 2));
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 1.0;

  const scena = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scena.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scena.environmentIntensity = 1.0;
  pmrem.dispose();

  scena.add(new THREE.HemisphereLight(0xffffff, 0xaab4c6, 0.7));
  const chiave = new THREE.DirectionalLight(0xffffff, 1.5);
  chiave.position.set(-5, 9, 8);
  scena.add(chiave);
  const taglio = new THREE.DirectionalLight(0xdfe8ff, 0.6);
  taglio.position.set(6, 4, -5);
  scena.add(taglio);

  const camera = new THREE.PerspectiveCamera(30, 1, 1, 220);

  /* Materiali */
  const M = {
    grafite: new THREE.MeshStandardMaterial({ color: 0x2f384b, metalness: 0.55, roughness: 0.4 }),
    lamiera: new THREE.MeshStandardMaterial({ color: 0xaeb7c5, metalness: 0.88, roughness: 0.36 }),
    grafiteOpaca: new THREE.MeshStandardMaterial({ color: 0x232a39, metalness: 0.25, roughness: 0.72 }),
    allu: new THREE.MeshStandardMaterial({ color: 0xc9d0da, metalness: 0.78, roughness: 0.32 }),
    alluScuro: new THREE.MeshStandardMaterial({ color: 0x8f99aa, metalness: 0.7, roughness: 0.38 }),
    foro: new THREE.MeshStandardMaterial({ color: 0x0a0e17, metalness: 0.1, roughness: 0.85 }),
    cavoBlu: new THREE.MeshStandardMaterial({ color: 0x56698f, metalness: 0.05, roughness: 0.55 }),
    cavoChiaro: new THREE.MeshStandardMaterial({ color: 0xdfe4ec, metalness: 0.05, roughness: 0.6 }),
    cavoNero: new THREE.MeshStandardMaterial({ color: 0x1b202b, metalness: 0.1, roughness: 0.6 }),
    argento: new THREE.MeshStandardMaterial({ color: 0xe6e9ee, metalness: 1, roughness: 0.22 }),
    telaio: new THREE.MeshStandardMaterial({ color: 0x313a4d, metalness: 0.5, roughness: 0.5, transparent: true }),
    luce: new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false })
  };

  const geoBox = new THREE.BoxGeometry(1, 1, 1);
  const geoPiano = new THREE.PlaneGeometry(1, 1);

  /* Texture disegnate al volo */
  try { await document.fonts.load('800 80px Archivo'); } catch (e) { /* va bene anche senza */ }
  const testo = (w, h, disegna) => {
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    disegna(c.getContext('2d'), w, h);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
    return t;
  };
  const texMarchio = testo(512, 128, (g, w, h) => {
    g.fillStyle = '#E3E9F3'; g.font = '800 86px Archivo, Arial, sans-serif'; g.textBaseline = 'alphabetic';
    g.fillText('SWITCH', 8, 84);
    g.fillStyle = '#EF7F1A'; g.font = '700 21px Archivo, Arial, sans-serif';
    g.fillText('TECNOLOGIE · E · SERVIZI', 10, 116);
  });
  const texLcd = testo(256, 96, (g) => {
    g.fillStyle = '#0d1b33'; g.fillRect(0, 0, 256, 96);
    g.fillStyle = '#9cc6ff'; g.font = '700 30px Archivo, Arial, sans-serif'; g.fillText('ONLINE', 14, 40);
    g.font = '600 18px Archivo, Arial, sans-serif'; g.fillStyle = '#6f97cf'; g.fillText('230 V  100%', 14, 68);
    for (let i = 0; i < 8; i++) { g.fillStyle = i < 7 ? '#7fb3ff' : '#284a7a'; g.fillRect(150 + i * 12, 52, 9, 22); }
  });
  const texOmbra = testo(256, 256, (g) => {
    const r = g.createRadialGradient(128, 128, 10, 128, 128, 128);
    r.addColorStop(0, 'rgba(23,34,58,0.42)'); r.addColorStop(0.5, 'rgba(23,34,58,0.16)'); r.addColorStop(1, 'rgba(23,34,58,0)');
    g.fillStyle = r; g.fillRect(0, 0, 256, 256);
  });

  /* Rack: gruppo che ruota, strati dentro */
  const rack = new THREE.Group();
  scena.add(rack);

  const ombra = new THREE.Mesh(geoPiano, new THREE.MeshBasicMaterial({ map: texOmbra, transparent: true, depthWrite: false, toneMapped: false }));
  ombra.rotation.x = -Math.PI / 2; ombra.position.y = -0.02; ombra.scale.set(W + 5, D + 5, 1);
  rack.add(ombra);

  const zoccolo = new THREE.Mesh(new RoundedBoxGeometry(W + 0.75, BASE - 0.02, D + 0.55, 2, 0.04), M.grafiteOpaca);
  zoccolo.position.y = BASE / 2;
  rack.add(zoccolo);

  /* Raccoglitori di istanze per strato */
  class Istanze {
    constructor() { this.v = []; }
    add(x, y, z, sx, sy, sz, extra) { this.v.push({ x, y, z, sx, sy, sz, ...extra }); return this.v.length - 1; }
    crea(geo, mat, conColore) {
      const m = new THREE.InstancedMesh(geo, mat, this.v.length);
      const o = new THREE.Object3D();
      this.v.forEach((p, i) => { o.position.set(p.x, p.y, p.z); o.scale.set(p.sx, p.sy, p.sz); o.updateMatrix(); m.setMatrixAt(i, o.matrix); });
      if (conColore) { const c = new THREE.Color(0, 0, 0); this.v.forEach((p, i) => m.setColorAt(i, c)); }
      m.instanceMatrix.needsUpdate = true;
      return m;
    }
  }

  const strati = [];
  const tutteLuci = [];
  const COLORI = {
    link: new THREE.Color('#38e08a'), att: new THREE.Color('#38e08a'), pwr: new THREE.Color('#38e08a'),
    blu: new THREE.Color('#5fa0ff'), disco: new THREE.Color('#5fa0ff'), ambra: new THREE.Color('#ffd27a')
  };

  function nuovoStrato(indice) {
    const g = new THREE.Group();
    rack.add(g);
    const s = { indice, g, fori: new Istanze(), vassoi: new Istanze(), luci: new Istanze(), cassetto: 0, altezza: 0, y0: 0 };
    strati.push(s);
    return s;
  }

  function corpo(s, y, unita, mat) {
    const h = unita * U - 0.02;
    const scocca = new THREE.Mesh(new RoundedBoxGeometry(W - 0.03, h - 0.01, D - 0.07, 2, 0.03), M.lamiera);
    scocca.position.set(0, y + h / 2, -0.035);
    const frontale = new THREE.Mesh(new RoundedBoxGeometry(W, h, 0.08, 2, 0.025), mat);
    frontale.position.set(0, y + h / 2, FRONTE - 0.04);
    s.g.add(scocca, frontale);
    // orecchie del rack con le viti
    for (const lato of [-1, 1]) {
      const o = new THREE.Mesh(geoBox, mat);
      o.scale.set(0.22, h, 0.05); o.position.set(lato * (W / 2 + 0.11), y + h / 2, FRONTE - 0.025);
      s.g.add(o);
      for (let k = 0; k < unita; k++) s.fori.add(lato * (W / 2 + 0.11), y + U * (k + 0.5) - 0.01, FRONTE + 0.002, 0.07, 0.07, 0.01);
    }
    return { y, h, cy: y + h / 2 };
  }

  /* 1 — Impiantistica: UPS 2U + PDU 1U + la spina */
  {
    const s = nuovoStrato(0);
    const ups = corpo(s, 0, 2, M.grafite);
    const lcd = new THREE.Mesh(geoPiano, new THREE.MeshBasicMaterial({ map: texLcd, toneMapped: false }));
    lcd.scale.set(1.0, 0.375, 1); lcd.position.set(-1.25, ups.cy + 0.05, FRONTE + 0.004);
    s.g.add(lcd);
    for (let r = 0; r < 6; r++) for (let c = 0; c < 9; c++) s.fori.add(0.15 + c * 0.2, ups.y + 0.17 + r * 0.1, FRONTE + 0.002, 0.15, 0.032, 0.01);
    s.luci.add(-1.95, ups.cy - 0.2, FRONTE + 0.008, 0.05, 0.05, 1, { tipo: 'pwr' });
    s.luci.add(-0.62, ups.cy + 0.18, FRONTE + 0.008, 0.035, 0.035, 1, { tipo: 'blu' });

    const pdu = corpo(s, 2 * U, 1, M.grafiteOpaca);
    for (let i = 0; i < 8; i++) {
      const x = -1.15 + i * 0.44;
      s.vassoi.add(x, pdu.cy, FRONTE + 0.006, 0.28, 0.28, 0.012);
      s.fori.add(x - 0.06, pdu.cy, FRONTE + 0.014, 0.04, 0.09, 0.01);
      s.fori.add(x + 0.06, pdu.cy, FRONTE + 0.014, 0.04, 0.09, 0.01);
    }
    s.vassoi.add(-1.85, pdu.cy, FRONTE + 0.006, 0.34, 0.2, 0.02);
    s.luci.add(-1.85, pdu.cy, FRONTE + 0.02, 0.09, 0.05, 1, { tipo: 'ambra' });

    // cavo con la spina
    const pts = [
      new THREE.Vector3(2.0, pdu.cy, FRONTE + 0.04),
      new THREE.Vector3(2.12, pdu.cy - 0.04, FRONTE + 0.3),
      new THREE.Vector3(2.62, pdu.cy - 0.3, FRONTE + 0.22),
      new THREE.Vector3(2.85, 0.35 - BASE, FRONTE - 0.25),
      new THREE.Vector3(2.92, 0.06 - BASE, FRONTE - 0.85),
      new THREE.Vector3(2.95, 0.06 - BASE, FRONTE - 1.35)
    ];
    const cavo = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 40, 0.045, 8), M.cavoNero);
    s.g.add(cavo);
    const spina = new THREE.Group();
    const corpoSpina = new THREE.Mesh(new RoundedBoxGeometry(0.34, 0.22, 0.42, 2, 0.06), M.grafiteOpaca);
    spina.add(corpoSpina);
    for (const dz of [-0.07, 0.07]) {
      const pin = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, 0.2, 10), M.argento);
      pin.rotation.z = Math.PI / 2; pin.position.set(0.25, 0, dz);
      spina.add(pin);
    }
    spina.position.set(2.97, 0.11 - BASE, FRONTE - 1.58);
    spina.rotation.y = Math.PI / 2 + 0.08;
    s.g.add(spina);
    s.altezza = 3 * U;
  }

  /* 2 — Networking: patch panel + switch 48 porte con cavi */
  {
    const s = nuovoStrato(1);
    const patch = corpo(s, 0, 1, M.allu);
    const xsPatch = [];
    for (let i = 0; i < 24; i++) {
      const x = -1.84 + i * 0.16;
      xsPatch.push(x);
      s.fori.add(x, patch.cy - 0.03, FRONTE + 0.004, 0.12, 0.11, 0.012);
      s.vassoi.add(x, patch.cy + 0.105, FRONTE + 0.004, 0.12, 0.035, 0.008);
    }
    const sw = corpo(s, U + 0.02, 1, M.grafite);
    const marchio = new THREE.Mesh(geoPiano, new THREE.MeshBasicMaterial({ map: texMarchio, transparent: true, toneMapped: false }));
    marchio.scale.set(0.98, 0.245, 1); marchio.position.set(-1.6, sw.cy, FRONTE + 0.004);
    s.g.add(marchio);
    const xsSw = [];
    let n = 0;
    for (let i = 0; i < 24; i++) {
      const x = -0.98 + i * 0.106 + Math.floor(i / 6) * 0.03;
      xsSw.push(x);
      for (const riga of [1, -1]) {
        s.fori.add(x, sw.cy + riga * 0.075, FRONTE + 0.004, 0.088, 0.07, 0.012);
        s.luci.add(x - 0.026, sw.cy + riga * 0.152, FRONTE + 0.008, 0.024, 0.016, 1, { tipo: (n++ % 5 === 2) ? 'ambra' : (i % 3 === 0 ? 'att' : 'link') });
      }
    }
    for (let i = 0; i < 4; i++) {
      const x = 1.8 + (i % 2) * 0.17, y = sw.cy + (i < 2 ? 0.07 : -0.07);
      s.fori.add(x, y, FRONTE + 0.004, 0.13, 0.055, 0.012);
      s.luci.add(x + 0.085, y, FRONTE + 0.008, 0.016, 0.016, 1, { tipo: 'att' });
    }
    s.luci.add(-2.05, sw.cy + 0.1, FRONTE + 0.008, 0.03, 0.03, 1, { tipo: 'pwr' });

    // cavi di permutazione
    const coppie = [[2, 0], [3, 1], [4, 2], [5, 3], [8, 6], [9, 7], [10, 9], [11, 11], [14, 13], [15, 15], [18, 18], [19, 20], [21, 22]];
    coppie.forEach(([p, q], k) => {
      const a = new THREE.Vector3(xsPatch[p], patch.cy - 0.03, FRONTE + 0.02);
      const b = new THREE.Vector3(xsSw[q], sw.cy + 0.075 - (k % 2) * 0.15, FRONTE + 0.02);
      const sporge = 0.2 + (k % 3) * 0.06;
      const curva = new THREE.CatmullRomCurve3([
        a, a.clone().add(new THREE.Vector3(0, -0.02, sporge * 0.8)),
        new THREE.Vector3((a.x + b.x) / 2, (a.y + b.y) / 2 - 0.05, FRONTE + sporge + 0.12),
        b.clone().add(new THREE.Vector3(0, 0.02, sporge * 0.8)), b
      ]);
      const m = new THREE.Mesh(new THREE.TubeGeometry(curva, 22, 0.022, 6), k % 3 === 1 ? M.cavoChiaro : M.cavoBlu);
      s.g.add(m);
    });
    s.altezza = 2 * U + 0.02;
  }

  /* 3 — Hardware: due server 2U con 12 dischi */
  {
    const s = nuovoStrato(2);
    for (let k = 0; k < 2; k++) {
      const sv = corpo(s, k * (2 * U + 0.02), 2, M.allu);
      for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) {
        const x = -1.5 + c * 0.82, y = sv.y + 0.155 + r * 0.272;
        s.fori.add(x, y, FRONTE + 0.003, 0.8, 0.25, 0.012);
        s.vassoi.add(x - 0.03, y, FRONTE + 0.01, 0.68, 0.19, 0.016);
        s.luci.add(x + 0.35, y + 0.05, FRONTE + 0.02, 0.03, 0.022, 1, { tipo: 'disco' });
        s.luci.add(x + 0.35, y - 0.05, FRONTE + 0.02, 0.03, 0.022, 1, { tipo: 'pwr' });
      }
      for (let r = 0; r < 5; r++) for (let c = 0; c < 3; c++) s.fori.add(1.66 + c * 0.16, sv.y + 0.2 + r * 0.11, FRONTE + 0.003, 0.11, 0.05, 0.01);
      s.luci.add(1.98, sv.cy + 0.3, FRONTE + 0.008, 0.045, 0.045, 1, { tipo: 'pwr' });
      s.luci.add(1.98, sv.cy + 0.18, FRONTE + 0.008, 0.045, 0.045, 1, { tipo: 'blu' });
    }
    s.altezza = 4 * U + 0.02;
  }

  /* 4 — Virtualizzazione: nodo converged + macchine virtuali */
  const vm = [];
  {
    const s = nuovoStrato(3);
    const nodo = corpo(s, 0, 2, M.grafite);
    for (let i = 0; i < 24; i++) {
      const x = -1.95 + i * 0.142;
      s.fori.add(x, nodo.cy - 0.04, FRONTE + 0.003, 0.125, 0.66, 0.012);
      s.vassoi.add(x, nodo.cy - 0.06, FRONTE + 0.01, 0.1, 0.56, 0.016);
      s.luci.add(x, nodo.cy + 0.25, FRONTE + 0.02, 0.026, 0.02, 1, { tipo: i % 4 === 0 ? 'disco' : 'blu' });
    }
    s.vassoi.add(1.74, nodo.cy, FRONTE + 0.006, 0.4, 0.6, 0.012);
    s.luci.add(1.66, nodo.cy + 0.18, FRONTE + 0.02, 0.04, 0.04, 1, { tipo: 'pwr' });
    s.luci.add(1.82, nodo.cy + 0.18, FRONTE + 0.02, 0.04, 0.04, 1, { tipo: 'blu' });

    const lato = 0.62;
    const geoVm = new THREE.BoxGeometry(lato, lato, lato);
    const bordi = new THREE.EdgesGeometry(geoVm);
    const matVm = new THREE.MeshStandardMaterial({ color: 0xd3def2, metalness: 0.05, roughness: 0.25, transparent: true, opacity: 0.5, depthWrite: false });
    const matBordo = new THREE.LineBasicMaterial({ color: 0x56698f, transparent: true });
    const matSchermo = new THREE.MeshBasicMaterial({ color: 0x5fa0ff, toneMapped: false, transparent: true });
    for (let r = 0; r < 2; r++) for (let c = 0; c < 3; c++) {
      const g = new THREE.Group();
      const cubo = new THREE.Mesh(geoVm, matVm);
      const linee = new THREE.LineSegments(bordi, matBordo);
      const schermo = new THREE.Mesh(geoPiano, matSchermo);
      schermo.scale.set(0.34, 0.2, 1); schermo.position.set(0, 0.04, lato / 2 + 0.002);
      const barra = new THREE.Mesh(geoPiano, matSchermo);
      barra.scale.set(0.34, 0.035, 1); barra.position.set(0, 0.19, lato / 2 + 0.002);
      g.add(cubo, linee, schermo, barra);
      g.userData = { x: -1.4 + c * 1.4, z: r ? -0.6 : 0.6, alto: r ? 0.62 : 0, fase: r * 3 + c };
      g.visible = false;
      s.g.add(g);
      vm.push(g);
    }
    s.vm = { matVm, matBordo, matSchermo };
    s.altezza = 2 * U;
  }

  // cornice di luce intorno allo strato attivo
  strati.forEach((s) => {
    const mat = new THREE.MeshBasicMaterial({ color: 0x5fa0ff, transparent: true, opacity: 0, toneMapped: false, depthWrite: false });
    const cornice = new THREE.InstancedMesh(geoBox, mat, 4);
    const fw = W + 0.66, fh = s.altezza + 0.14, t = 0.035, cy = s.altezza / 2 - 0.01, z = FRONTE + 0.08;
    [[0, cy + fh / 2, fw + t, t], [0, cy - fh / 2, fw + t, t], [-fw / 2, cy, t, fh], [fw / 2, cy, t, fh]].forEach(([x, y2, sx, sy], i) => {
      const o = new THREE.Object3D(); o.position.set(x, y2, z); o.scale.set(sx, sy, t); o.updateMatrix(); cornice.setMatrixAt(i, o.matrix);
    });
    cornice.visible = false;
    s.g.add(cornice);
    s.cornice = cornice;
  });

  // posizioni degli strati chiusi
  let y = BASE;
  strati.forEach((s) => { s.y0 = y; s.g.position.y = y; y += s.altezza + 0.02; });
  const CIMA = y;

  /* Istanze: fori, vassoi e LED di ogni strato */
  strati.forEach((s) => {
    if (s.fori.v.length) s.g.add(s.fori.crea(geoBox, M.foro));
    if (s.vassoi.v.length) s.g.add(s.vassoi.crea(geoBox, s.indice === 2 ? M.alluScuro : M.grafiteOpaca));
    if (s.luci.v.length) {
      const m = s.luci.crea(geoPiano, M.luce, true);
      s.g.add(m);
      s.luci.v.forEach((l, i) => tutteLuci.push({ m, i, s: s.indice, tipo: l.tipo, col: COLORI[l.tipo], seme: tutteLuci.length, x: l.x }));
    }
  });

  /* Telaio del rack */
  const telaio = new THREE.Group();
  rack.add(telaio);
  const hTel = CIMA - BASE + 0.18;
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const m = new THREE.Mesh(geoBox, M.telaio);
    m.scale.set(0.09, hTel, 0.09); m.position.set(sx * (W / 2 + 0.17), BASE + hTel / 2, sz * (FRONTE - 0.1));
    telaio.add(m);
  }
  for (const sz of [-1, 1]) {
    const m = new THREE.Mesh(geoBox, M.telaio);
    m.scale.set(W + 0.43, 0.09, 0.09); m.position.set(0, BASE + hTel, sz * (FRONTE - 0.1));
    telaio.add(m);
  }
  for (const sx of [-1, 1]) {
    const m = new THREE.Mesh(geoBox, M.telaio);
    m.scale.set(0.09, 0.09, D - 0.2); m.position.set(sx * (W / 2 + 0.17), BASE + hTel, 0);
    telaio.add(m);
  }

  /* 5 — Sicurezza: la gabbia che avvolge tutto */
  const gabbia = new THREE.Group();
  rack.add(gabbia);
  const matSpigoli = new THREE.MeshBasicMaterial({ color: 0x6f8fd0, transparent: true, opacity: 0, toneMapped: false, depthWrite: false });
  const spigoli = new THREE.InstancedMesh(geoBox, matSpigoli, 12);
  gabbia.add(spigoli);
  const matVetro = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, side: THREE.DoubleSide,
    uniforms: { uA: { value: 0 }, uC: { value: new THREE.Vector3(0x56 / 255, 0x69 / 255, 0x8f / 255) } },
    vertexShader: 'varying vec3 vN; varying vec3 vV; void main(){ vec4 mv = modelViewMatrix * vec4(position,1.0); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }',
    fragmentShader: 'uniform float uA; uniform vec3 uC; varying vec3 vN; varying vec3 vV; void main(){ float f = pow(1.0 - abs(dot(vN, vV)), 2.0); gl_FragColor = vec4(uC, (0.07 + 0.32 * f) * uA); }'
  });
  const vetro = new THREE.Mesh(geoBox, matVetro);
  gabbia.add(vetro);
  const matScan = new THREE.MeshBasicMaterial({ color: 0x5fa0ff, transparent: true, opacity: 0, toneMapped: false, depthWrite: false, side: THREE.DoubleSide });
  const scan = new THREE.Mesh(geoPiano, matScan);
  scan.rotation.x = -Math.PI / 2;
  gabbia.add(scan);
  const tmp = new THREE.Object3D();
  function dimensionaGabbia(h) {
    const gx = W + 1.0, gz = D + 1.0, gy = h + 0.5, t = 0.045;
    const cy = gy / 2 - 0.05;
    let i = 0;
    const metti = (x, y2, z, sx, sy, sz) => { tmp.position.set(x, y2, z); tmp.scale.set(sx, sy, sz); tmp.updateMatrix(); spigoli.setMatrixAt(i++, tmp.matrix); };
    for (const a of [-1, 1]) for (const b of [-1, 1]) {
      metti(a * gx / 2, cy, b * gz / 2, t, gy, t);
      metti(0, cy + a * gy / 2, b * gz / 2, gx, t, t);
      metti(a * gx / 2, cy + b * gy / 2, 0, t, t, gz);
    }
    spigoli.instanceMatrix.needsUpdate = true;
    vetro.scale.set(gx, gy, gz); vetro.position.y = cy;
    scan.scale.set(gx, gz, 1);
    return { cy, gy };
  }

  /* Inquadratura */
  const regioni = { a: { x: 0, y: 0, w: 1, h: 1 }, b: { x: 0, y: 0, w: 1, h: 1 } };
  let cw = 1, ch = 1;
  function misura() {
    const genitore = canvas.parentElement;
    cw = genitore.clientWidth; ch = genitore.clientHeight;
    if (modoPoster) { cw = 900; ch = 1000; canvas.style.width = cw + 'px'; canvas.style.height = ch + 'px'; }
    renderer.setPixelRatio(modoPoster ? 1 : Math.min(devicePixelRatio || 1, mobile() ? 1.5 : 2));
    renderer.setSize(cw, ch, false);
    camera.aspect = cw / ch;
    camera.fov = mobile() ? 34 : 28;
    camera.updateProjectionMatrix();
    if (modoPoster) {
      regioni.a = regioni.b = { x: 0, y: 0, w: cw, h: ch };
      return;
    }
    // la zona A scorre con la pagina: si misura rispetto all'inizio del palco (dove sta il canvas a scroll 0)
    const rc = canvas.getBoundingClientRect();
    const pr = palco.getBoundingClientRect();
    const ra = zonaA.getBoundingClientRect();
    regioni.a = { x: ra.left - rc.left, y: ra.top - pr.top, w: ra.width, h: ra.height };
    const rb = zonaB.getBoundingClientRect();
    regioni.b = { x: rb.left - rc.left, y: rb.top - rc.top, w: rb.width, h: rb.height };
  }
  misura();

  /* Stato animato */
  const st = {
    apertura: 0, gabbia: 0, yaw: -0.52, pitch: 0.3, dist: 30, regione: 0,
    cassetti: [0, 0, 0, 0], px: 0, py: 0, vm: 0
  };
  let puntX = 0, puntY = 0;
  if (matchMedia('(pointer: fine)').matches) {
    addEventListener('pointermove', (e) => { puntX = e.clientX / innerWidth - 0.5; puntY = e.clientY / innerHeight - 0.5; }, { passive: true });
  }

  const v3 = new THREE.Vector3();
  const angoli = [];
  for (let i = 0; i < 8; i++) angoli.push(new THREE.Vector3());
  function limiti() {
    const comp = liscio(0, 0.45, st.vm), grande = 1 + 0.35 * liscio(0.8, 1.2, st.vm);
    const top = CIMA + st.apertura * SALTO * 3 + (st.vm > 0.01 ? (0.45 + 0.2 + 0.7 * st.apertura + 0.62 + 0.45 * grande) * comp + st.cassetti[3] * 0.4 : 0) + st.gabbia * 0.35;
    const zMax = FRONTE + 0.4 + Math.max(...st.cassetti) * CASSETTO;
    return { x0: -(W / 2 + 0.45), x1: W / 2 + 0.95, y0: -0.05, y1: top, z0: -(FRONTE + 0.35), z1: zMax };
  }
  function proietta(b) {
    let i = 0;
    for (const x of [b.x0, b.x1]) for (const y2 of [b.y0, b.y1]) for (const z of [b.z0, b.z1]) angoli[i++].set(x, y2, z);
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const a of angoli) {
      v3.copy(a).applyMatrix4(rack.matrixWorld).project(camera);
      minX = Math.min(minX, v3.x); maxX = Math.max(maxX, v3.x); minY = Math.min(minY, v3.y); maxY = Math.max(maxY, v3.y);
    }
    return { minX, maxX, minY, maxY };
  }
  function piazzaCamera(dist, b) {
    const cy = (b.y0 + b.y1) / 2;
    camera.position.set(0, cy + Math.sin(st.pitch) * dist, Math.cos(st.pitch) * dist);
    camera.lookAt(0, cy, 0);
    camera.updateMatrixWorld();
  }
  function inquadra(dt, primo) {
    const r = st.regione;
    const A = regioni.a, B = regioni.b;
    const R = { x: A.x + (B.x - A.x) * r, y: A.y + (B.y - A.y) * r, w: A.w + (B.w - A.w) * r, h: A.h + (B.h - A.h) * r };
    const riempi = 0.9;
    rack.rotation.y = st.yaw;
    rack.updateMatrixWorld();
    const b = limiti();
    camera.clearViewOffset();
    let d = st.dist;
    for (let k = 0; k < 3; k++) {
      piazzaCamera(d, b);
      const e = proietta(b);
      const kx = ((e.maxX - e.minX) / 2 * cw) / (R.w * riempi);
      const ky = ((e.maxY - e.minY) / 2 * ch) / (R.h * riempi);
      d *= Math.max(kx, ky);
    }
    st.dist = primo ? d : verso(st.dist, d, dt, 6);
    piazzaCamera(st.dist, b);
    const e = proietta(b);
    const cxp = ((e.minX + e.maxX) / 2 + 1) / 2 * cw;
    const cyp = (1 - (e.minY + e.maxY) / 2) / 2 * ch;
    camera.setViewOffset(cw, ch, cxp - (R.x + R.w / 2), cyp - (R.y + R.h / 2), cw, ch);
  }

  /* Un fotogramma */
  let t0 = 0;
  let prima = 0;
  const colore = new THREE.Color();
  function aggiorna(ora) {
    const dt = prima ? Math.min(0.05, (ora - prima) / 1000) : 1 / 60;
    prima = ora;
    const t = modoPoster ? 0 : (ora - t0) / 1000;
    const p = window.__palco || { attivo: -1, regione: 0 };
    const attivo = modoPoster ? -1 : p.attivo;

    // obiettivi dallo scroll
    let apertura = 0, gab = 0, yaw = -0.52, pitch = 0.3;
    const cassetti = [0, 0, 0, 0];
    if (attivo === 0) { apertura = 0.55; yaw = -0.58; pitch = 0.26; }
    else if (attivo >= 1 && attivo <= 4) { apertura = 1; cassetti[attivo - 1] = 1; yaw = -0.68 + attivo * 0.07; pitch = 0.22; }
    else if (attivo >= 5) { apertura = 0.06; gab = 1; yaw = -0.42; pitch = 0.26; }

    // intro: il rack ruota in posizione e "respira" una volta
    const intro = easeOut(t / 2.6);
    yaw += (1 - intro) * -0.34;
    const respiro = t > 1.5 && t < 3.3 ? Math.sin(Math.PI * (t - 1.5) / 1.8) * 0.2 : 0;
    yaw += Math.sin(t * 0.45) * 0.045 * intro;
    yaw += puntX * 0.14; pitch += puntY * 0.06;

    const k = modoPoster ? 1 : 1 - Math.exp(-dt * 3.2);
    st.apertura += (apertura + (attivo < 0 ? respiro : 0) - st.apertura) * (modoPoster ? 1 : (1 - Math.exp(-dt * 3)));
    st.gabbia += (gab - st.gabbia) * k;
    st.yaw += (yaw - st.yaw) * (modoPoster ? 1 : (1 - Math.exp(-dt * 2.6)));
    st.pitch += (pitch - st.pitch) * k;
    st.regione = modoPoster ? 0 : p.regione;
    for (let i = 0; i < 4; i++) st.cassetti[i] += (cassetti[i] - st.cassetti[i]) * (modoPoster ? 1 : (1 - Math.exp(-dt * 4)));
    const vmTarget = attivo === 4 ? 1.2 : attivo >= 1 && attivo <= 3 ? 0.75 : attivo === 0 ? 0.55 : 0;
    st.vm += (vmTarget - st.vm) * k;

    // strati
    strati.forEach((s, i) => {
      s.g.position.y = s.y0 + i * SALTO * st.apertura;
      s.g.position.z = st.cassetti[i] * CASSETTO;
      s.cornice.material.opacity = liscio(0.15, 0.9, st.cassetti[i]) * (0.75 + 0.25 * Math.sin(t * 3.2));
      s.cornice.visible = st.cassetti[i] > 0.15;
    });
    M.telaio.opacity = 1 - liscio(0.02, 0.35, st.apertura) * 0.92;
    telaio.visible = M.telaio.opacity > 0.03;

    // macchine virtuali
    const sv = strati[3];
    const topNodo = sv.altezza;
    const grande = 1 + 0.35 * liscio(0.8, 1.2, st.vm);
    vm.forEach((g) => {
      const u = g.userData;
      const comp = liscio(0, 0.45, st.vm - u.fase * 0.03);
      g.visible = comp > 0.01;
      g.scale.setScalar(Math.max(0.001, comp * grande));
      g.position.set(u.x, topNodo + 0.45 + (0.2 + 0.7 * st.apertura) * comp + u.alto * comp + st.cassetti[3] * 0.4 + Math.sin(t * 1.3 + u.fase) * 0.05, u.z);
      g.rotation.y = Math.sin(t * 0.6 + u.fase) * 0.22 + st.cassetti[3] * Math.sin(t * 0.8 + u.fase) * 0.5;
    });
    sv.vm.matVm.opacity = 0.45 * Math.min(1, st.vm * 1.5);

    // gabbia
    const altezza = CIMA + st.apertura * SALTO * 3;
    const gd = dimensionaGabbia(altezza);
    gabbia.visible = st.gabbia > 0.01;
    matSpigoli.opacity = st.gabbia * 0.9;
    matVetro.uniforms.uA.value = st.gabbia;
    const ys = ((t * 0.32) % 1);
    scan.position.y = gd.cy - gd.gy / 2 + 0.1 + ys * (gd.gy - 0.2);
    matScan.opacity = st.gabbia * 0.22 * Math.sin(Math.PI * ys);

    // LED
    for (const l of tutteLuci) {
      const avvio = 0.35 + l.s * 0.32 + (l.x + 2.2) * 0.06;
      let b = 0.55;
      if (t > avvio) {
        const dopo = t - avvio;
        if (l.tipo === 'att') b = rumore(l.seme, Math.floor(t * 9 + l.seme)) > 0.45 ? 1 : 0.18;
        else if (l.tipo === 'disco') b = rumore(l.seme, Math.floor(t * 7 + l.seme * 0.5)) > 0.55 ? 1 : 0.3;
        else if (l.tipo === 'link') b = rumore(l.seme, Math.floor(t * 0.7 + l.seme)) > 0.08 ? 0.95 : 0.2;
        else if (l.tipo === 'blu') b = 0.7 + 0.3 * Math.sin(t * 2 + l.seme);
        else b = 0.95;
        if (dopo < 0.25) b = 1;
      }
      if (modoPoster) b = l.tipo === 'att' || l.tipo === 'disco' ? 0.75 : 0.9;
      const acceso = (attivo >= 1 && attivo <= 4) ? (l.s === attivo - 1 ? 1 : 0.55) : 1;
      colore.copy(l.col).multiplyScalar(0.06 + 0.94 * b * acceso);
      l.m.setColorAt(l.i, colore);
    }
    strati.forEach((s) => { s.g.children.forEach((c) => { if (c.isInstancedMesh && c.instanceColor) c.instanceColor.needsUpdate = true; }); });

    inquadra(dt, !prima || modoPoster);
    renderer.render(scena, camera);
  }

  /* Avvio */
  if ('compileAsync' in renderer) { try { await renderer.compileAsync(scena, camera); } catch (e) { /* ok */ } }

  if (modoPoster) {
    prima = 0;
    aggiorna(performance.now());
    window.__posterURL = canvas.toDataURL('image/png');
    return true;
  }

  let attivoLoop = false, raf = 0, visibile = true;
  const ciclo = (ora) => { aggiorna(ora); if (attivoLoop) raf = requestAnimationFrame(ciclo); };
  const accendi = () => {
    const devo = visibile && !document.hidden;
    if (devo && !attivoLoop) { attivoLoop = true; prima = 0; raf = requestAnimationFrame(ciclo); }
    else if (!devo && attivoLoop) { attivoLoop = false; cancelAnimationFrame(raf); }
  };
  new IntersectionObserver(([v]) => { visibile = v.isIntersecting; accendi(); }, { rootMargin: '80px' }).observe(palco);
  document.addEventListener('visibilitychange', accendi);
  new ResizeObserver(() => { misura(); }).observe(canvas.parentElement);
  addEventListener('resize', misura);

  t0 = performance.now();
  aggiorna(t0);
  canvas.classList.add('pronto');
  if (poster) poster.classList.add('via');
  accendi();
  return true;
}
