// Quadro elettrico aperto: scatta il generale, gli interruttori salgono a cascata, la corrente scorre nei fili.
// Unità: centimetri. Origine al centro del quadro, z = 0 sul bordo dell'apertura.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const liscio = (t) => t * t * (3 - 2 * t);
const fuori = (t) => 1 - Math.pow(1 - t, 3);
const scatto = (t) => { const c1 = 2.2, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); };

// carpenteria
const L = 36, A = 54, P = 11, S = 1.2;
const PIASTRA = -9.5;              // fronte della piastra di fondo
const BASE = PIASTRA + 0.75;       // retro dei moduli, appoggiati sulla guida DIN
const NASO = BASE + 6.85;          // fronte dei moduli (con lo smusso)
const PASSO = 1.8;                 // larghezza di un modulo DIN

// quote verticali (centri)
const Y_CANALE_SU = 23.4, Y_FILA1 = 15.5, Y_CANALE2 = 7.6, Y_FILA2 = -0.3, Y_CANALE3 = -8.2, Y_FILA3 = -15.1, Y_CANALE_GIU = -22.0;
const H_CANALE = 3.2;

// colori dei conduttori: [isolante, caldo]
const FILI = {
  marrone: ['#6B3F25', '#FF9A45'],
  nero: ['#25282B', '#FFD27A'],
  grigio: ['#8B9095', '#FFE6A8'],
  blu: ['#2C63B0', '#6FC3FF'],
  terra: ['#D3BD1E', '#E4FF7A'],
  guaina: ['#7E8489', '#FFF1C9'],
};

export async function avvia({ canvas, hero }) {
  const qs = new URLSearchParams(location.search);
  const poster = qs.get('poster') || (qs.get('scatto') ? 'on' : null);   // 'off' | 'on' per generare le immagini statiche
  const ravvicinato = qs.get('scatto');       // '1' | '2': inquadrature ravvicinate per le foto delle sezioni
  const ridotto = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const giaAcceso = document.documentElement.classList.contains('acceso');
  const statico = !!poster || ridotto;
  const mobile = matchMedia('(max-width: 767px), (pointer: coarse)').matches;

  // le etichette disegnate nelle texture usano i font della pagina
  if (document.fonts) {
    await Promise.race([
      Promise.all(['800 40px "Sofia Sans Extra Condensed"', '600 30px "Sofia Sans Extra Condensed"', '500 26px "Sofia Sans"'].map((f) => document.fonts.load(f).catch(() => {}))),
      new Promise((r) => setTimeout(r, 1500)),
    ]);
  }

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance', preserveDrawingBuffer: !!poster });
  renderer.setClearColor(0x000000, 0);
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, poster ? 2 : (mobile ? 1.5 : 2)));
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 1.0;

  const scena = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scena.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  pmrem.dispose();

  const chiave = new THREE.DirectionalLight(0xfff3e4, 0);
  chiave.position.set(-46, 52, 38);
  scena.add(chiave);
  const controluce = new THREE.DirectionalLight(0xcfe0ff, 0);
  controluce.position.set(34, 8, -18);
  scena.add(controluce);
  const lampo = new THREE.PointLight(0xffd9a0, 0, 26, 2);
  scena.add(lampo);

  const camera = new THREE.PerspectiveCamera(28, 1, 20, 400);
  const quadro = new THREE.Group();
  scena.add(quadro);

  const uT = { value: 0 };
  const uOn = { value: 0 };

  // ---------- materiali ----------
  const matCarpenteria = new THREE.MeshStandardMaterial({ color: '#BCC0BC', roughness: 0.56, metalness: 0.08 });
  const matPiastra = new THREE.MeshStandardMaterial({ color: '#868C91', roughness: 0.5, metalness: 0.65 });
  const matGuida = new THREE.MeshStandardMaterial({ color: '#D3D7DB', roughness: 0.3, metalness: 0.9 });
  const matModulo = new THREE.MeshStandardMaterial({ color: '#ECEDE8', roughness: 0.4, metalness: 0 });
  const matFessura = new THREE.MeshStandardMaterial({ color: '#33383D', roughness: 0.7 });
  const matLeva = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.38 });
  const matVite = new THREE.MeshStandardMaterial({ color: '#B9BEC3', roughness: 0.3, metalness: 0.95 });
  const matSegno = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.45 });

  // ---------- carpenteria ----------
  const scatola = new THREE.Group();
  quadro.add(scatola);
  const parete = (w, h, d, x, y, z) => {
    const m = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 3, 0.35), matCarpenteria);
    m.position.set(x, y, z);
    scatola.add(m);
  };
  parete(L, A, S, 0, 0, -P + S / 2);
  parete(S, A, P, -L / 2 + S / 2, 0, -P / 2);
  parete(S, A, P, L / 2 - S / 2, 0, -P / 2);
  parete(L - 2 * S + 0.2, S, P, 0, A / 2 - S / 2, -P / 2);
  parete(L - 2 * S + 0.2, S, P, 0, -A / 2 + S / 2, -P / 2);
  const piastra = new THREE.Mesh(new RoundedBoxGeometry(L - 2 * S - 0.6, A - 2 * S - 0.6, 0.3, 2, 0.1), matPiastra);
  piastra.position.z = PIASTRA - 0.15;
  scatola.add(piastra);

  // ombra morbida sul muro
  {
    const c = document.createElement('canvas');
    c.width = c.height = 256;
    const g = c.getContext('2d');
    const r = g.createRadialGradient(128, 128, 30, 128, 128, 128);
    r.addColorStop(0, 'rgba(0,0,0,0.55)');
    r.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = r;
    g.fillRect(0, 0, 256, 256);
    const t = new THREE.CanvasTexture(c);
    const ombra = new THREE.Mesh(new THREE.PlaneGeometry(L * 1.7, A * 1.45), new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false }));
    ombra.position.set(2.2, -3.5, -P - 0.2);
    quadro.add(ombra);
  }

  // ---------- guide DIN ----------
  for (const y of [Y_FILA1, Y_FILA2, Y_FILA3]) {
    const g = new THREE.Mesh(new THREE.BoxGeometry(L - 2 * S - 2.2, 3.5, 0.75), matGuida);
    g.position.set(0, y, PIASTRA + 0.375);
    quadro.add(g);
  }

  // ---------- canaline forate ----------
  function texCanalina(lung, etichette) {
    const c = document.createElement('canvas');
    c.width = 2048; c.height = 128;
    const g = c.getContext('2d');
    g.fillStyle = '#A1A6AA'; g.fillRect(0, 0, 2048, 128);
    g.fillStyle = 'rgba(0,0,0,0.18)'; g.fillRect(0, 10, 2048, 4); g.fillRect(0, 114, 2048, 4);
    g.fillStyle = 'rgba(255,255,255,0.18)'; g.fillRect(0, 14, 2048, 2); g.fillRect(0, 118, 2048, 2);
    if (etichette) {
      const sx = 2048 / lung;
      g.font = '600 30px "Sofia Sans Extra Condensed", "Arial Narrow", sans-serif';
      g.textBaseline = 'middle'; g.textAlign = 'center';
      for (const [x0, x1, testo] of etichette) {
        const a = (x0 + lung / 2) * sx + 3, b = (x1 + lung / 2) * sx - 3;
        g.fillStyle = '#F4F3EC'; g.fillRect(a, 40, b - a, 48);
        g.fillStyle = 'rgba(0,0,0,0.12)'; g.fillRect(a, 86, b - a, 2);
        g.fillStyle = '#1D2023'; g.fillText(testo, (a + b) / 2, 65, b - a - 8);
      }
    }
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
    return t;
  }
  function texDenti(lung) {
    const c = document.createElement('canvas');
    c.width = 1024; c.height = 64;
    const g = c.getContext('2d');
    g.fillStyle = '#A1A6AA'; g.fillRect(0, 0, 1024, 64);
    const n = Math.round(lung / 0.9);
    const w = 1024 / n;
    g.fillStyle = '#3B4044';
    for (let i = 0; i < n; i++) g.fillRect(i * w + w * 0.62, 0, w * 0.38, 64);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }
  function canalina(x0, x1, y, etichette) {
    const lung = x1 - x0;
    const m = new THREE.MeshStandardMaterial({ color: '#D6D6D6', roughness: 0.66, map: texCanalina(lung, etichette) });
    const denti = new THREE.MeshStandardMaterial({ color: '#C8C8C8', roughness: 0.75, map: texDenti(lung) });
    const piano = new THREE.MeshStandardMaterial({ color: '#8E9397', roughness: 0.75 });
    const box = new THREE.Mesh(new THREE.BoxGeometry(lung, H_CANALE, 6), [piano, piano, denti, denti, m, piano]);
    box.position.set((x0 + x1) / 2, y, PIASTRA + 3);
    quadro.add(box);
  }

  // ---------- moduli ----------
  const geoModuli = new Map();
  function geoModulo(n) {
    if (geoModuli.has(n)) return geoModuli.get(n);
    const s = new THREE.Shape();
    const p = [[0, -4.5], [4.5, -4.5], [4.5, -2.25], [6.8, -2.25], [6.8, 2.25], [4.5, 2.25], [4.5, 4.5], [0, 4.5]];
    s.moveTo(...p[0]);
    for (const q of p.slice(1)) s.lineTo(...q);
    s.closePath();
    const w = n * PASSO - 0.12;
    const g = new THREE.ExtrudeGeometry(s, { depth: w, bevelEnabled: true, bevelSize: 0.05, bevelThickness: 0.05, bevelSegments: 2, curveSegments: 1 });
    g.rotateY(-Math.PI / 2);
    g.translate(w / 2, 0, BASE);
    geoModuli.set(n, g);
    return g;
  }
  function geoMorsetto() {
    const s = new THREE.Shape();
    const p = [[0, -3.5], [3.2, -3.5], [3.2, -2.7], [4.7, -1.3], [4.7, 1.3], [3.2, 2.7], [3.2, 3.5], [0, 3.5]];
    s.moveTo(...p[0]);
    for (const q of p.slice(1)) s.lineTo(...q);
    s.closePath();
    const w = 0.92;
    const g = new THREE.ExtrudeGeometry(s, { depth: w, bevelEnabled: true, bevelSize: 0.03, bevelThickness: 0.03, bevelSegments: 1, curveSegments: 1 });
    g.rotateY(-Math.PI / 2);
    g.translate(w / 2, 0, BASE);
    return g;
  }

  // ogni dispositivo: { tipo, n moduli, leva, stampa, fili su/giù }
  const FILA1 = [
    { tipo: 'generale', n: 4, stampa: 'I-0  63 A', poli: ['marrone', 'nero', 'grigio', 'blu'] },
    { tipo: 'differenziale', n: 4, stampa: 'IΔn 0,03 A', poli: ['marrone', 'nero', 'grigio', 'blu'] },
    { tipo: 'spia', n: 1, luce: '#5CFF8A' }, { tipo: 'spia', n: 1, luce: '#5CFF8A' }, { tipo: 'spia', n: 1, luce: '#5CFF8A' },
    { tipo: 'spd', n: 2, stampa: 'SPD T2' },
    { tipo: 'mt', n: 1, stampa: 'C10', poli: ['marrone'] },
    { tipo: 'mt', n: 1, stampa: 'C16', poli: ['nero'] },
    { tipo: 'mt', n: 1, stampa: 'C16', poli: ['grigio'] },
  ];
  const FILA2 = [
    { tipo: 'mt', n: 2, stampa: 'C32', poli: ['marrone', 'blu'] },
    { tipo: 'mt', n: 2, stampa: 'C25', poli: ['nero', 'blu'] },
    { tipo: 'mt', n: 1, stampa: 'C16', poli: ['marrone'] },
    { tipo: 'mt', n: 1, stampa: 'C16', poli: ['nero'] },
    { tipo: 'mt', n: 1, stampa: 'C16', poli: ['grigio'] },
    { tipo: 'mt', n: 1, stampa: 'C10', poli: ['marrone'] },
    { tipo: 'mt', n: 1, stampa: 'C10', poli: ['nero'] },
    { tipo: 'mt', n: 1, stampa: 'C10', poli: ['grigio'] },
    { tipo: 'mt', n: 1, stampa: 'C20', poli: ['marrone'] },
    { tipo: 'mt', n: 1, stampa: 'C20', poli: ['nero'] },
    { tipo: 'mt', n: 2, stampa: 'C16', poli: ['grigio', 'blu'] },
    { tipo: 'mt', n: 2, stampa: 'C6', poli: ['marrone', 'blu'] },
  ];
  const ETICHETTE1 = ['Generale', 'Differenziale', 'Spie rete', 'Scaricatore', 'Luci', 'Prese', 'Uffici'];
  const ETICHETTE2 = ['Compressore', 'Carroponte', 'FM 1', 'FM 2', 'FM 3', 'Luci 1', 'Luci 2', 'Luci est.', 'Prese banco', 'Prese uff.', 'Clima', 'Cancello'];

  const larghezzaFila = 16 * PASSO;
  const dispositivi = [];
  function posa(fila, y, etichette) {
    let x = -larghezzaFila / 2;
    let e = 0;
    const etic = [];
    for (const d of fila) {
      const w = d.n * PASSO;
      d.x = x + w / 2; d.y = y; d.w = w;
      dispositivi.push(d);
      if (d.tipo !== 'spia' || d === fila.find((f) => f.tipo === 'spia')) {
        const fine = d.tipo === 'spia' ? x + 3 * PASSO : x + w;
        if (etichette[e]) etic.push([x, fine, etichette[e].toUpperCase()]);
        e++;
      }
      x += w;
    }
    return etic;
  }
  const etic1 = posa(FILA1, Y_FILA1, ETICHETTE1);
  const etic2 = posa(FILA2, Y_FILA2, ETICHETTE2);

  // canaline: quella in alto lascia libero il generale, dove scendono i cavi d'arrivo
  const xFila0 = -larghezzaFila / 2;
  canalina(xFila0 + 4 * PASSO + 0.3, L / 2 - S - 0.6, Y_CANALE_SU);
  canalina(-L / 2 + S + 0.6, L / 2 - S - 0.6, Y_CANALE2, etic1.map(([a, b, t]) => [a, b, t]));
  canalina(-L / 2 + S + 0.6, L / 2 - S - 0.6, Y_CANALE3, etic2.map(([a, b, t]) => [a, b, t]));
  canalina(-L / 2 + S + 0.6, L / 2 - S - 0.6, Y_CANALE_GIU);

  // corpi dei moduli, instanziati per larghezza
  const perN = new Map();
  for (const d of dispositivi) {
    if (!perN.has(d.n)) perN.set(d.n, []);
    perN.get(d.n).push(d);
  }
  const m4 = new THREE.Matrix4();
  for (const [n, lista] of perN) {
    const im = new THREE.InstancedMesh(geoModulo(n), matModulo, lista.length);
    lista.forEach((d, i) => { m4.makeTranslation(d.x, d.y, 0); im.setMatrixAt(i, m4); });
    quadro.add(im);
  }

  // stampe sul fronte dei moduli (una texture per fila)
  function stampe(fila, y) {
    const c = document.createElement('canvas');
    c.width = 2048; c.height = 320;
    const g = c.getContext('2d');
    const sx = 2048 / larghezzaFila, sy = 320 / 4.5;
    g.textAlign = 'center'; g.textBaseline = 'middle';
    for (const d of fila) {
      const cx = (d.x + larghezzaFila / 2) * sx;
      if (d.stampa) {
        g.fillStyle = '#2A2E33';
        g.font = `700 ${d.n > 1 ? 46 : 42}px "Sofia Sans Extra Condensed", "Arial Narrow", sans-serif`;
        g.fillText(d.stampa, cx, 4.0 * sy, d.w * sx - 10);
      }
      if (d.n >= 2 && (d.tipo === 'mt' || d.tipo === 'generale' || d.tipo === 'differenziale')) {
        g.fillStyle = '#5A6066';
        g.font = '700 30px "Sofia Sans", Arial, sans-serif';
        g.fillText('I', cx - (d.w * sx) * 0.34, 0.55 * sy);
        g.fillText('O', cx - (d.w * sx) * 0.34, 2.85 * sy);
      }
    }
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
    const m = new THREE.Mesh(new THREE.PlaneGeometry(larghezzaFila, 4.5), new THREE.MeshStandardMaterial({ map: t, transparent: true, roughness: 0.5, depthWrite: false }));
    m.position.set(0, y, NASO + 0.012);
    quadro.add(m);
  }
  stampe(FILA1, Y_FILA1);
  stampe(FILA2, Y_FILA2);

  // leve, fessure, bandierine
  const conLeva = dispositivi.filter((d) => d.tipo === 'mt' || d.tipo === 'generale' || d.tipo === 'differenziale');
  const geoLeva = new RoundedBoxGeometry(1, 0.62, 1.55, 2, 0.14);
  geoLeva.translate(0, 0, 0.72);
  const leve = new THREE.InstancedMesh(geoLeva, matLeva, conLeva.length);
  const fessure = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), matFessura, conLeva.length);
  const bandiere = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.35 }), conLeva.length);
  const colLeva = { generale: '#C42B22', differenziale: '#3E4F62', mt: '#30353A' };
  const ROSSO = new THREE.Color('#D3262B'), VERDE = new THREE.Color('#2F9E55');
  conLeva.forEach((d, i) => {
    leve.setColorAt(i, new THREE.Color(colLeva[d.tipo]));
    const lw = d.tipo === 'mt' ? Math.min(d.w * 0.5, 1.0) * (d.n > 1 ? 1.9 : 1) : d.w * 0.62;
    d.leva = { i, lw, ang: 0.62 };
    m4.compose(new THREE.Vector3(d.x, d.y + 0.55, NASO + 0.008), new THREE.Quaternion(), new THREE.Vector3(lw + 0.3, 2.2, 1));
    fessure.setMatrixAt(i, m4);
    m4.compose(new THREE.Vector3(d.x + (d.n > 1 ? d.w * 0.3 : 0), d.y - 0.95, NASO + 0.014), new THREE.Quaternion(), new THREE.Vector3(d.n > 1 ? 0.9 : 0.55, 0.36, 1));
    bandiere.setMatrixAt(i, m4);
    bandiere.setColorAt(i, VERDE);
  });
  quadro.add(fessure, leve, bandiere);
  const qLeva = new THREE.Quaternion(), asseX = new THREE.Vector3(1, 0, 0);
  function aggiornaLeva(d) {
    qLeva.setFromAxisAngle(asseX, d.leva.ang);
    m4.compose(new THREE.Vector3(d.x, d.y + 0.55, NASO - 0.25), qLeva, new THREE.Vector3(d.leva.lw, 1, 1));
    leve.setMatrixAt(d.leva.i, m4);
  }
  conLeva.forEach(aggiornaLeva);

  // tasto di prova del differenziale
  {
    const d = FILA1[1];
    const t = new THREE.Mesh(new RoundedBoxGeometry(0.9, 0.9, 0.5, 2, 0.12), new THREE.MeshStandardMaterial({ color: '#E2BE22', roughness: 0.4 }));
    t.position.set(d.x + d.w * 0.3, d.y + 1.0, NASO + 0.1);
    quadro.add(t);
  }

  // spie: lente che si accende + alone
  const spie = [];
  const texAlone = (() => {
    const c = document.createElement('canvas');
    c.width = c.height = 128;
    const g = c.getContext('2d');
    const r = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    r.addColorStop(0, 'rgba(255,255,255,1)');
    r.addColorStop(0.25, 'rgba(255,255,255,0.45)');
    r.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = r; g.fillRect(0, 0, 128, 128);
    return new THREE.CanvasTexture(c);
  })();
  for (const d of dispositivi.filter((x) => x.tipo === 'spia')) {
    const mat = new THREE.MeshStandardMaterial({ color: '#2B4A35', emissive: new THREE.Color(d.luce), emissiveIntensity: 0, roughness: 0.15 });
    const lente = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.62, 0.45, 24), mat);
    lente.rotation.x = Math.PI / 2;
    lente.position.set(d.x, d.y + 0.35, NASO + 0.2);
    const ghiera = new THREE.Mesh(new THREE.TorusGeometry(0.66, 0.09, 8, 28), matVite);
    ghiera.position.set(d.x, d.y + 0.35, NASO + 0.38);
    const alone = new THREE.Sprite(new THREE.SpriteMaterial({ map: texAlone, color: d.luce, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
    alone.position.set(d.x, d.y + 0.35, NASO + 0.9);
    alone.scale.setScalar(3.8);
    quadro.add(lente, ghiera, alone);
    spie.push({ d, mat, alone });
  }
  // scaricatore: finestre verdi delle cartucce
  {
    const d = FILA1.find((x) => x.tipo === 'spd');
    for (const k of [-0.5, 0.5]) {
      const f = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 0.5), new THREE.MeshStandardMaterial({ color: '#2F9E55', roughness: 0.3 }));
      f.position.set(d.x + k * PASSO, d.y + 0.6, NASO + 0.012);
      quadro.add(f);
    }
  }

  // morsettiera
  const morsetti = [];
  {
    const sequenza = [];
    for (let i = 0; i < 8; i++) sequenza.push('grigio', 'blu', 'terra');
    sequenza.push('grigio', 'grigio', 'grigio', 'grigio');
    const geo = geoMorsetto();
    const colori = { grigio: '#8E959B', blu: '#2E69B3', terra: '#B9BE24' };
    const im = new THREE.InstancedMesh(geo, new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.5 }), sequenza.length);
    const x0 = -(sequenza.length - 1) * 0.5;
    sequenza.forEach((c, i) => {
      const x = x0 + i * 1.0;
      m4.makeTranslation(x, Y_FILA3, 0);
      im.setMatrixAt(i, m4);
      im.setColorAt(i, new THREE.Color(colori[c]));
      morsetti.push({ x, colore: c, i });
    });
    quadro.add(im);
    // testate di chiusura
    for (const x of [x0 - 0.75, x0 + (sequenza.length - 1) + 0.75]) {
      const f = new THREE.Mesh(new THREE.BoxGeometry(0.5, 8, 5.2), matFessura);
      f.position.set(x, Y_FILA3, BASE + 2.6);
      quadro.add(f);
    }
  }

  // viti dei morsetti (sulle spalle dei moduli)
  {
    const pos = [];
    for (const d of dispositivi) {
      if (d.tipo === 'spia') { pos.push([d.x, d.y + 3.4], [d.x, d.y - 3.4]); continue; }
      for (let k = 0; k < d.n; k++) {
        const x = d.x - d.w / 2 + PASSO * (k + 0.5);
        pos.push([x, d.y + 3.4], [x, d.y - 3.4]);
      }
    }
    const v = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.34, 0.34, 0.2, 14), matVite, pos.length);
    const q = new THREE.Quaternion().setFromAxisAngle(asseX, Math.PI / 2);
    pos.forEach(([x, y], i) => { m4.compose(new THREE.Vector3(x, y, BASE + 4.55), q, new THREE.Vector3(1, 1, 1)); v.setMatrixAt(i, m4); });
    quadro.add(v);
  }

  // ---------- fili ----------
  // ogni filo: curva, colore, raggio, istante in cui riceve corrente
  const fili = [];
  const zFilo = BASE + 2.4;
  function filo(punti, colore, raggio = 0.16, quando = 1, seme = Math.random()) {
    fili.push({ curva: new THREE.CatmullRomCurve3(punti.map((p) => new THREE.Vector3(...p)), false, 'centripetal'), colore, raggio, quando, seme });
  }
  const yBordo = (riga, su) => riga + (su ? 4.5 : -4.5);
  const yCanale = (c, su) => c + (su ? -H_CANALE / 2 : H_CANALE / 2);

  // istanti di accensione (secondi dall'inizio dell'intro)
  const T_GENERALE = 0.45;
  const T_DIFF = 0.72;
  FILA1[0].quando = T_GENERALE;
  FILA1[1].quando = T_DIFF;
  let tk = 0.95;
  for (const d of [...FILA1.slice(2), ...FILA2]) {
    d.quando = tk;
    tk += d.tipo === 'spia' ? 0.06 : 0.075;
  }
  const T_FINE = tk + 0.3;

  // arrivo linea: quattro cavi dal tubo in alto al generale
  {
    const d = FILA1[0];
    const xs = [-1.5, -0.5, 0.5, 1.5].map((k) => d.x + k * PASSO * 0.95);
    d.poli.forEach((c, i) => {
      const x = xs[i];
      filo([[d.x - 0.9 + i * 0.6, 34, -6.4], [d.x - 0.9 + i * 0.6, A / 2 + 0.5, -6.4], [x * 0.7 + d.x * 0.3, 23.6, -5.4 + (i % 2) * 0.4], [x, yBordo(d.y, true) + 0.4, zFilo]], c, 0.27, 0.0, i * 0.17);
    });
  }
  // fila 1 e fila 2: fili corti dentro le canaline
  function fili1e2(fila, canaleSu, canaleGiu) {
    for (const d of fila) {
      if (d.tipo === 'spia') {
        filo([[d.x, yBordo(d.y, true), zFilo], [d.x, yBordo(d.y, true) + 0.7, zFilo + 0.2], [d.x + 0.3, yCanale(canaleSu, true) + 0.2, zFilo - 0.6]], 'marrone', 0.14, d.quando);
        filo([[d.x, yBordo(d.y, false), zFilo], [d.x, yBordo(d.y, false) - 0.7, zFilo + 0.2], [d.x - 0.3, yCanale(canaleGiu, false) - 0.2, zFilo - 0.6]], 'blu', 0.14, d.quando);
        continue;
      }
      if (d.tipo === 'spd') {
        for (const k of [-0.5, 0.5]) filo([[d.x + k * PASSO, yBordo(d.y, true), zFilo], [d.x + k * PASSO, yBordo(d.y, true) + 0.7, zFilo + 0.25], [d.x + k * PASSO * 1.3, yCanale(canaleSu, true) + 0.2, zFilo - 0.6]], k < 0 ? 'marrone' : 'blu', 0.16, d.quando);
        filo([[d.x, yBordo(d.y, false), zFilo], [d.x, yBordo(d.y, false) - 0.8, zFilo + 0.3], [d.x + 0.6, yCanale(canaleGiu, false) - 0.2, zFilo - 0.6]], 'terra', 0.2, d.quando);
        continue;
      }
      const poli = d.poli || ['marrone'];
      poli.forEach((c, k) => {
        const x = d.x - d.w / 2 + (d.w / poli.length) * (k + 0.5);
        const devia = (k - (poli.length - 1) / 2) * 0.35;
        if (!(d.tipo === 'generale')) {
          filo([[x, yBordo(d.y, true), zFilo], [x, yBordo(d.y, true) + 0.75, zFilo + 0.25], [x + devia, yCanale(canaleSu, true) + 0.25, zFilo - 0.7]], c, d.n > 2 ? 0.22 : 0.16, d.quando);
        }
        filo([[x, yBordo(d.y, false), zFilo], [x, yBordo(d.y, false) - 0.75, zFilo + 0.25], [x - devia, yCanale(canaleGiu, false) - 0.25, zFilo - 0.7]], c, d.n > 2 ? 0.22 : 0.16, d.quando + 0.08);
      });
    }
  }
  fili1e2(FILA1, Y_CANALE_SU, Y_CANALE2);
  fili1e2(FILA2, Y_CANALE2, Y_CANALE3);

  // morsettiera: dalla canalina sopra al morsetto, dal morsetto alla canalina sotto
  const colFilo = { grigio: ['marrone', 'nero', 'grigio'], blu: ['blu'], terra: ['terra'] };
  morsetti.forEach((m, i) => {
    const c = colFilo[m.colore][i % colFilo[m.colore].length];
    const t = T_FINE - 0.2 + i * 0.018;
    filo([[m.x, Y_FILA3 + 3.5, zFilo - 0.3], [m.x, Y_FILA3 + 4.2, zFilo], [m.x + 0.15, yCanale(Y_CANALE3, false) - 0.2, zFilo - 0.8]], c, 0.15, t);
    filo([[m.x, Y_FILA3 - 3.5, zFilo - 0.3], [m.x, Y_FILA3 - 4.2, zFilo], [m.x - 0.15, yCanale(Y_CANALE_GIU, true) + 0.2, zFilo - 0.8]], c, 0.15, t + 0.05);
  });

  // cavi in uscita: dalla canalina in basso giù fuori dal quadro
  const xUscite = [-11, -6.5, -2, 2.5, 7, 11.5];
  const T_USCITA = T_FINE + 0.15;
  xUscite.forEach((x, i) => {
    filo([[x + 0.6, Y_CANALE_GIU - H_CANALE / 2 + 0.2, -6.6], [x + 0.2, -24.6, -6.2], [x, -A / 2 - 0.4, -6.0], [x - 0.3, -A / 2 - 6, -6.0], [x - 0.6 - i * 0.3, -60, -6.2]], 'guaina', 0.48, T_USCITA + i * 0.05, i * 0.21);
  });

  // ---------- tubi corrugati e pressacavi ----------
  {
    const c = document.createElement('canvas');
    c.width = 64; c.height = 8;
    const g = c.getContext('2d');
    for (let x = 0; x < 64; x++) { const v = 128 + 127 * Math.sin((x / 64) * Math.PI * 2); g.fillStyle = `rgb(${v},${v},${v})`; g.fillRect(x, 0, 1, 8); }
    const bump = new THREE.CanvasTexture(c);
    bump.wrapS = bump.wrapT = THREE.RepeatWrapping;
    const tubo = (x, x2, raggio) => {
      const curva = new THREE.CatmullRomCurve3([new THREE.Vector3(x2, 70, -6.4), new THREE.Vector3(x2 * 0.6 + x * 0.4, 46, -6.4), new THREE.Vector3(x, 33, -6.4), new THREE.Vector3(x, A / 2 + 0.8, -6.4)]);
      const lung = curva.getLength();
      const b = bump.clone();
      b.repeat.set(lung / 0.9, 1);
      b.needsUpdate = true;
      const m = new THREE.Mesh(new THREE.TubeGeometry(curva, 64, raggio, 20, false), new THREE.MeshStandardMaterial({ color: '#7A8086', roughness: 0.55, bumpMap: b, bumpScale: 1.6 }));
      quadro.add(m);
      const p = new THREE.Mesh(new THREE.CylinderGeometry(raggio + 0.45, raggio + 0.45, 1.4, 6), new THREE.MeshStandardMaterial({ color: '#5A6066', roughness: 0.5 }));
      p.position.set(x, A / 2 + 0.3, -6.4);
      quadro.add(p);
    };
    tubo(FILA1[0].x, FILA1[0].x - 4, 1.35);
    tubo(6, 14, 1.15);
    tubo(12.5, 22, 0.95);
    for (const x of xUscite) {
      const p = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.85, 1.4, 6), new THREE.MeshStandardMaterial({ color: '#5A6066', roughness: 0.5 }));
      p.position.set(x, -A / 2 - 0.3, -6.0);
      quadro.add(p);
    }
  }

  // targhetta dell'installatore
  {
    const c = document.createElement('canvas');
    c.width = 512; c.height = 112;
    const g = c.getContext('2d');
    g.fillStyle = '#F5F4EE'; g.fillRect(0, 0, 512, 112);
    g.fillStyle = '#F5C400'; g.fillRect(0, 0, 14, 112);
    g.fillStyle = '#23282C';
    g.font = '800 46px "Sofia Sans Extra Condensed", "Arial Narrow", sans-serif';
    g.textBaseline = 'middle';
    g.fillText('TH IMPIANTI S.R.L.', 32, 40);
    g.font = '500 26px "Sofia Sans", Arial, sans-serif';
    g.fillStyle = '#4A5056';
    g.fillText('Castagnole di Paese (TV)', 32, 84);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    const m = new THREE.Mesh(new THREE.PlaneGeometry(7.6, 1.66), new THREE.MeshStandardMaterial({ map: t, roughness: 0.5 }));
    m.position.set(L / 2 - S - 5.2, -A / 2 + S + 1.45, PIASTRA + 0.02);
    quadro.add(m);
  }

  // ---------- materiale dei fili con la corrente che scorre ----------
  function materialeFilo(nome) {
    const [isolante, caldo] = FILI[nome];
    const m = new THREE.MeshStandardMaterial({ color: isolante, roughness: nome === 'guaina' ? 0.6 : 0.34, metalness: 0 });
    const u = { uT, uOn, uCaldo: { value: new THREE.Color(caldo) }, uGiallo: { value: new THREE.Color('#D3BD1E') }, uVerde: { value: new THREE.Color('#2E8F3F') } };
    m.onBeforeCompile = (sh) => {
      Object.assign(sh.uniforms, u);
      sh.vertexShader = sh.vertexShader
        .replace('#include <common>', '#include <common>\nattribute float aQuando;\nattribute float aLung;\nattribute float aSeme;\nvarying float vQuando;\nvarying float vS;\nvarying float vSeme;\nvarying float vGiro;')
        .replace('#include <begin_vertex>', '#include <begin_vertex>\nvQuando = aQuando;\nvS = uv.x * aLung;\nvSeme = aSeme;\nvGiro = uv.y;');
      sh.fragmentShader = sh.fragmentShader
        .replace('#include <common>', '#include <common>\nuniform float uT;\nuniform float uOn;\nuniform vec3 uCaldo;\nuniform vec3 uGiallo;\nuniform vec3 uVerde;\nvarying float vQuando;\nvarying float vS;\nvarying float vSeme;\nvarying float vGiro;')
        .replace('#include <color_fragment>', nome === 'terra'
          ? '#include <color_fragment>\ndiffuseColor.rgb = mix(uGiallo, uVerde, step(0.5, fract(vS * 0.38 + vGiro)));'
          : '#include <color_fragment>')
        .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
          float acceso = step(vQuando, uT);
          float lampo = acceso * exp(-max(0.0, uT - vQuando - vS * 0.012) * 3.2) * step(vS * 0.012, uT - vQuando);
          float onda = pow(0.5 + 0.5 * cos(6.28318 * (vS * 0.085 - uT * 0.55 + vSeme)), 28.0);
          totalEmissiveRadiance += uCaldo * (lampo * 2.4 + onda * 1.2 * uOn * acceso + 0.06 * uOn * acceso);`);
    };
    m.customProgramCacheKey = () => 'filo-' + nome;
    return m;
  }
  const perColore = new Map();
  for (const f of fili) {
    const lung = f.curva.getLength();
    const g = new THREE.TubeGeometry(f.curva, Math.max(6, Math.round(lung * 1.6)), f.raggio, f.raggio > 0.4 ? 12 : 7, false);
    const n = g.attributes.position.count;
    g.setAttribute('aQuando', new THREE.Float32BufferAttribute(new Float32Array(n).fill(f.quando), 1));
    g.setAttribute('aLung', new THREE.Float32BufferAttribute(new Float32Array(n).fill(lung), 1));
    g.setAttribute('aSeme', new THREE.Float32BufferAttribute(new Float32Array(n).fill(f.seme), 1));
    if (!perColore.has(f.colore)) perColore.set(f.colore, []);
    perColore.get(f.colore).push(g);
  }
  for (const [nome, geos] of perColore) {
    quadro.add(new THREE.Mesh(mergeGeometries(geos), materialeFilo(nome)));
    geos.forEach((g) => g.dispose());
  }

  // aloni: la corrente che corre nei cavi d'arrivo e d'uscita
  {
    const srgb = (hex) => { const c = new THREE.Color(); c.setHex(parseInt(hex.slice(1), 16), THREE.SRGBColorSpace); return c.convertLinearToSRGB(); };
    const lunghi = fili.filter((f) => f.raggio >= 0.27);
    const perC = new Map();
    for (const f of lunghi) {
      const lung = f.curva.getLength();
      const g = new THREE.TubeGeometry(f.curva, Math.max(12, Math.round(lung * 1.4)), f.raggio * 3.4, 10, false);
      const n = g.attributes.position.count;
      g.setAttribute('aQuando', new THREE.Float32BufferAttribute(new Float32Array(n).fill(f.quando), 1));
      g.setAttribute('aLung', new THREE.Float32BufferAttribute(new Float32Array(n).fill(lung), 1));
      g.setAttribute('aSeme', new THREE.Float32BufferAttribute(new Float32Array(n).fill(f.seme), 1));
      if (!perC.has(f.colore)) perC.set(f.colore, []);
      perC.get(f.colore).push(g);
    }
    for (const [nome, geos] of perC) {
      const m = new THREE.ShaderMaterial({
        uniforms: { uT, uOn, uCol: { value: srgb(FILI[nome][1]) }, uVerso: { value: nome === 'guaina' ? 1 : 1 } },
        vertexShader: `attribute float aQuando; attribute float aLung; attribute float aSeme;
          varying float vQ; varying float vS; varying float vSeme; varying float vF;
          void main() {
            vQ = aQuando; vS = uv.x * aLung; vSeme = aSeme;
            vec4 mv = modelViewMatrix * vec4(position, 1.0);
            vec3 n = normalize(normalMatrix * normal);
            vF = abs(dot(n, normalize(-mv.xyz)));
            gl_Position = projectionMatrix * mv;
          }`,
        fragmentShader: `uniform float uT; uniform float uOn; uniform vec3 uCol;
          varying float vQ; varying float vS; varying float vSeme; varying float vF;
          void main() {
            float acceso = step(vQ, uT);
            float fronte = uT - vQ - vS * 0.02;
            float lampo = step(0.0, fronte) * exp(-fronte * 2.6);
            float onda = pow(0.5 + 0.5 * cos(6.28318 * (vS * 0.045 - uT * 0.62 + vSeme)), 9.0);
            float a = (lampo * 1.1 + onda * 0.85 * uOn) * acceso * pow(vF, 2.2);
            gl_FragColor = vec4(uCol * a, a);
          }`,
        transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      });
      const mesh = new THREE.Mesh(mergeGeometries(geos), m);
      mesh.renderOrder = 2;
      quadro.add(mesh);
      geos.forEach((g) => g.dispose());
    }
  }

  // ---------- inquadratura ----------
  const vista = { dist: 150, cx: 0.5, cy: 0.5 };
  function inquadra() {
    const w = canvas.clientWidth || innerWidth, h = canvas.clientHeight || innerHeight;
    renderer.setSize(w, h, false);
    const asp = w / h;
    camera.aspect = asp;
    const tan = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    let fillH, fillW;
    if (asp < 0.8) { vista.cx = 0.5; vista.cy = 0.335; fillH = 0.5; fillW = 0.78; }
    else if (asp < 1.25) { vista.cx = 0.5; vista.cy = 0.36; fillH = 0.56; fillW = 0.6; }
    else { vista.cx = 0.71; vista.cy = 0.54; fillH = 0.76; fillW = 0.4; }
    const dH = 58 / (fillH * 2 * tan);
    const dW = 40 / (fillW * 2 * tan * asp);
    vista.dist = Math.max(dH, dW);
    camera.setViewOffset(w, h, (0.5 - vista.cx) * w, (0.5 - vista.cy) * h, w, h);
    camera.updateProjectionMatrix();
  }

  // ---------- tempo e stato ----------
  let t0 = null;            // inizio dell'intro (ms)
  let segnalato = giaAcceso;
  let mouseX = 0, mouseY = 0, mx = 0, my = 0;
  if (!mobile) addEventListener('pointermove', (e) => { mouseX = e.clientX / innerWidth - 0.5; mouseY = e.clientY / innerHeight - 0.5; }, { passive: true });

  function statoA(tau) {
    // tau: secondi dall'inizio dell'intro
    uT.value = tau;
    uOn.value = clamp((tau - T_GENERALE) / 0.6);
    const luce = liscio(clamp((tau - T_GENERALE + 0.05) / 0.9));
    scena.environmentIntensity = lerp(0.06, 0.5, luce);
    chiave.intensity = lerp(0.2, 2.9, luce);
    controluce.intensity = lerp(0.05, 0.9, luce);
    const dl = tau - T_GENERALE;
    lampo.intensity = dl > 0 ? 70 * Math.exp(-dl * 7) : 0;
    for (const d of conLeva) {
      const k = clamp((tau - d.quando) / 0.2);
      d.leva.ang = lerp(0.62, -0.62, k > 0 ? scatto(k) : 0);
      aggiornaLeva(d);
      const on = tau >= d.quando + 0.08;
      if (d.on !== on) { d.on = on; bandiere.setColorAt(d.leva.i, on ? ROSSO : VERDE); bandiere.instanceColor.needsUpdate = true; }
    }
    leve.instanceMatrix.needsUpdate = true;
    for (const s of spie) {
      const k = clamp((tau - s.d.quando) / 0.12);
      s.mat.emissiveIntensity = 2.4 * k;
      s.alone.material.opacity = 0.75 * k;
    }
    if (!segnalato && tau >= T_GENERALE) {
      segnalato = true;
      document.documentElement.classList.add('acceso');
      document.dispatchEvent(new CustomEvent('quadro:acceso'));
    }
  }

  const fuoco = new THREE.Vector3(0, 0, -4);
  function aggiorna(ora, tau, p) {
    const ingresso = statico ? 1 : fuori(clamp(tau / 2.6));
    mx += (mouseX - mx) * 0.06; my += (mouseY - my) * 0.06;
    const s = ora * 0.001;
    const rotY = lerp(0.46, mobile ? 0.2 : 0.24, ingresso) + Math.sin(s * 0.35) * 0.05 * ingresso + mx * 0.22 - liscio(p) * 1.05;
    const rotX = lerp(-0.1, -0.05, ingresso) + Math.sin(s * 0.27) * 0.02 + my * 0.1 + liscio(p) * 0.28;
    const d = vista.dist * lerp(1.16, 1, ingresso) * lerp(1, 0.74, liscio(p));
    camera.position.set(
      fuoco.x + d * Math.sin(rotY) * Math.cos(rotX),
      fuoco.y - d * Math.sin(rotX) + liscio(p) * -6,
      fuoco.z + d * Math.cos(rotY) * Math.cos(rotX),
    );
    camera.lookAt(fuoco.x, fuoco.y + liscio(p) * -6, fuoco.z);
    lampo.position.set(FILA1[0].x, FILA1[0].y + 3, NASO + 4);
  }

  function avanzamento() {
    const r = hero.getBoundingClientRect();
    return clamp(-r.top / Math.max(1, r.height * 0.95));
  }

  const SCATTI = {
    1: { da: [17, 23, 30], a: [-1.5, 10.5, -5], fov: 30 },
    2: { da: [-30, 40, 30], a: [-8, 17, -6], fov: 30 },
  };
  function disegna(ora) {
    if (ravvicinato && SCATTI[ravvicinato]) {
      const c = SCATTI[ravvicinato];
      statoA(T_USCITA + 3.2);
      camera.clearViewOffset();
      camera.fov = c.fov;
      camera.aspect = canvas.clientWidth / canvas.clientHeight;
      camera.updateProjectionMatrix();
      camera.position.set(...c.da);
      camera.lookAt(...c.a);
      lampo.intensity = 0;
      renderer.render(scena, camera);
      return;
    }
    let tau;
    if (poster === 'off') tau = 0;
    else if (statico) tau = T_USCITA + 3.2;
    else { if (t0 === null) t0 = ora - (giaAcceso ? (T_USCITA + 1) * 1000 : 0); tau = (ora - t0) / 1000; }
    statoA(tau);
    aggiorna(ora, statico ? 99 : tau, poster ? 0 : avanzamento());
    renderer.render(scena, camera);
  }

  let attivo = false;
  function ciclo() {
    if (!attivo) return;
    disegna(performance.now());
    requestAnimationFrame(ciclo);
  }
  function accendi() {
    if (attivo || statico || document.hidden) return;
    attivo = true;
    requestAnimationFrame(ciclo);
  }
  function spegni() { attivo = false; }

  inquadra();
  new ResizeObserver(() => { inquadra(); if (!attivo) disegna(performance.now()); }).observe(canvas);

  await renderer.compileAsync(scena, camera);
  statoA(0);
  disegna(performance.now());
  canvas.classList.add('pronta');
  hero.classList.add('hero--3d');
  window.__quadro = { renderer, scena, camera };

  if (statico) {
    if (ridotto && !segnalato) { segnalato = true; document.documentElement.classList.add('acceso'); }
    return { renderer };
  }

  t0 = null;
  let inVista = true;
  new IntersectionObserver(([e]) => {
    inVista = e.isIntersecting;
    if (inVista) accendi(); else spegni();
  }, { rootMargin: '10% 0px' }).observe(hero);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) spegni(); else if (inVista) accendi();
  });
  accendi();
  return { renderer };
}
