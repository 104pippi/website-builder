/* Riello · "Una casa, quattro stagioni": la casa in sezione, costruita in codice.
   Il tempo (rAF) muove ventole, neve, calore e aria; lo scroll sceglie la stagione. */
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const liscio = (a, b, v) => { const t = clamp((v - a) / (b - a)); return t * t * (3 - 2 * t); };
const lerp = (a, b, t) => a + (b - a) * t;

/* le quattro stagioni: tutto quello che cambia sta qui */
const STAGIONI = [
  { nome: 'inverno', terra: '#E8EEF6', albero: '#E1E8F1', neve: 1, caldo: 1, caldaia: 1, pdc: .12, fresco: 0, sole: 0, ibrido: 0, vapore: 1, luci: 1, emi: .55, dir: .5, dirCol: '#AFC4FF', dirPos: [-7, 9, 5], vetro: '#1E2F63', esp: 1.0, az: 26, el: 19 },
  { nome: 'mezza', terra: '#9AA486', albero: '#A0904E', neve: 0, caldo: .5, caldaia: .65, pdc: 1, fresco: 0, sole: .12, ibrido: 1, vapore: .35, luci: .55, emi: .75, dir: 1.0, dirCol: '#FFB892', dirPos: [9, 4.5, 6], vetro: '#C9876F', esp: 1.02, az: 8, el: 18 },
  { nome: 'estate', terra: '#7FAD55', albero: '#4E8A3B', neve: 0, caldo: 0, caldaia: .05, pdc: .75, fresco: 1, sole: .45, ibrido: 0, vapore: 0, luci: 0, emi: 1.05, dir: 1.7, dirCol: '#FFF3DC', dirPos: [3, 14, 7], vetro: '#9CCBF2', esp: 1.0, az: -8, el: 21 },
  { nome: 'sole', terra: '#A0B060', albero: '#5D8D39', neve: 0, caldo: 0, caldaia: 0, pdc: .85, fresco: .25, sole: 1, ibrido: 0, vapore: 0, luci: .15, emi: .9, dir: 1.5, dirCol: '#FFC98C', dirPos: [10, 6.5, 8], vetro: '#F2B47A', esp: 1.0, az: -24, el: 33 }
];
const COLORI = ['terra', 'albero', 'dirCol', 'vetro'];
const col = h => new THREE.Color(h);
STAGIONI.forEach(s => COLORI.forEach(k => (s[k] = col(s[k]))));

/* rampa termica (ironbow) */
const RAMPA = [[0, '#160A4A'], [.25, '#5A1490'], [.45, '#B0187C'], [.62, '#E8433A'], [.78, '#FB8F25'], [.9, '#FFD24D'], [1, '#FFF6D8']].map(([p, c]) => [p, col(c)]);
function termico(v, out = new THREE.Color()) {
  v = clamp(v);
  for (let i = 1; i < RAMPA.length; i++) {
    if (v <= RAMPA[i][0]) { const [p0, c0] = RAMPA[i - 1], [p1, c1] = RAMPA[i]; return out.copy(c0).lerp(c1, (v - p0) / (p1 - p0)); }
  }
  return out.copy(RAMPA[RAMPA.length - 1][1]);
}

export function avvia(sezione, { ridotto = false } = {}) {
  const canvas = sezione.querySelector('canvas');
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  } catch (e) { sezione.classList.add('no-webgl'); return; }
  if (!renderer.getContext()) { sezione.classList.add('no-webgl'); return; }

  const mobile = () => innerWidth < 900;
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, mobile() ? 1.5 : 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), .04).texture;
  pmrem.dispose();

  const camera = new THREE.PerspectiveCamera(30, 1, .1, 300);

  /* ---------- materiali ---------- */
  const M = {
    muro: new THREE.MeshStandardMaterial({ color: '#EEF0F1', roughness: .88 }),
    taglio: new THREE.MeshStandardMaterial({ color: '#D4D9DD', roughness: .9 }),
    parquet: new THREE.MeshStandardMaterial({ color: '#D7C6AE', roughness: .72 }),
    piastrelle: new THREE.MeshStandardMaterial({ color: '#E3E8EB', roughness: .4 }),
    solaio: new THREE.MeshStandardMaterial({ color: '#C9CFD4', roughness: .9 }),
    tetto: new THREE.MeshStandardMaterial({ color: '#3A4149', roughness: .65 }),
    tettoBordo: new THREE.MeshStandardMaterial({ color: '#E6E9EB', roughness: .8 }),
    smalto: new THREE.MeshStandardMaterial({ color: '#F7F8F8', roughness: .32 }),
    scuro: new THREE.MeshStandardMaterial({ color: '#1F252B', roughness: .45 }),
    grigio: new THREE.MeshStandardMaterial({ color: '#9AA3AB', roughness: .5, metalness: .2 }),
    rosso: new THREE.MeshStandardMaterial({ color: '#E12121', roughness: .45 }),
    legno: new THREE.MeshStandardMaterial({ color: '#B98A5E', roughness: .6 }),
    tessuto: new THREE.MeshStandardMaterial({ color: '#7D8B96', roughness: .95 }),
    tappeto: new THREE.MeshStandardMaterial({ color: '#C7CDD2', roughness: 1 }),
    vaso: new THREE.MeshStandardMaterial({ color: '#E7E2DA', roughness: .7 }),
    foglie: new THREE.MeshStandardMaterial({ color: '#4E7F45', roughness: .8, flatShading: true }),
    tronco: new THREE.MeshStandardMaterial({ color: '#6B5443', roughness: .9 }),
    pedana: new THREE.MeshStandardMaterial({ color: '#2A3038', roughness: .8 }),
    terra: new THREE.MeshStandardMaterial({ color: '#E8EEF6', roughness: .95 }),
    albero: new THREE.MeshStandardMaterial({ color: '#E1E8F1', roughness: .85, flatShading: true }),
    vetro: new THREE.MeshBasicMaterial({ color: '#1E2F63' }),
    vetroFuori: new THREE.MeshBasicMaterial({ color: '#FFC874' }),
    radiatore: new THREE.MeshStandardMaterial({ color: '#F4F4F2', roughness: .4, emissive: '#000000' }),
    pannello: new THREE.MeshStandardMaterial({ color: '#1A2C55', roughness: .18, metalness: .55, emissive: '#2B57D9', emissiveIntensity: 0 }),
    acqua: new THREE.MeshStandardMaterial({ color: '#BFE3F2', roughness: .1, metalness: .1, emissive: '#000000' }),
    lampada: new THREE.MeshStandardMaterial({ color: '#FFF1D6', roughness: .6, emissive: '#FFC777', emissiveIntensity: 0 }),
    display: new THREE.MeshBasicMaterial({ color: '#203040' }),
    led: new THREE.MeshBasicMaterial({ color: '#2B3A2E' })
  };

  const box = (w, h, d, m, x, y, z, parent = scene) => { const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); o.position.set(x, y, z); parent.add(o); return o; };
  const rbox = (w, h, d, r, m, x, y, z, parent = scene) => { const o = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 3, r), m); o.position.set(x, y, z); parent.add(o); return o; };

  /* ---------- pedana e terreno ---------- */
  const R0 = 9.4;
  const pedana = new THREE.Mesh(new THREE.CylinderGeometry(R0, R0 * .97, .7, 72, 1), [M.pedana, M.terra, M.pedana]);
  pedana.position.y = -.35; scene.add(pedana);
  const bordo = new THREE.Mesh(new THREE.TorusGeometry(R0, .035, 6, 96), new THREE.MeshBasicMaterial({ color: '#FFFFFF', transparent: true, opacity: .25 }));
  bordo.rotation.x = Math.PI / 2; bordo.position.y = .005; scene.add(bordo);
  // vialetto
  const vialetto = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 5.2), new THREE.MeshStandardMaterial({ color: '#B7BDC2', roughness: .9 }));
  vialetto.rotation.x = -Math.PI / 2; vialetto.position.set(-1.2, .012, 5.6); scene.add(vialetto);

  /* ---------- casa ---------- */
  const H = 3, T = .18;
  box(8.2, .14, 6.2, M.solaio, 0, .07, 0);                                      // solaio
  const parquet = box(5.45, .02, 5.66, M.parquet, -1.32, .15, 0);               // soggiorno
  box(2.5, .02, 5.66, M.piastrelle, 2.73, .15, 0);                               // bagno / locale tecnico
  box(8, H, T, M.muro, 0, H / 2 + .14, -3 + T / 2);                              // muro di fondo
  box(T, H, 6, M.muro, -4 + T / 2, H / 2 + .14, 0);                              // muro sinistro
  box(T, H, 6, M.muro, 4 - T / 2, H / 2 + .14, 0);                               // muro destro
  box(.14, H, 2.1, M.muro, 1.42, H / 2 + .14, -1.95);                             // tramezzo
  // facce di taglio verso chi guarda: la casa è "in sezione"
  box(T + .01, H, .02, M.taglio, -4 + T / 2, H / 2 + .14, 3.005);
  box(T + .01, H, .02, M.taglio, 4 - T / 2, H / 2 + .14, 3.005);
  box(.15, H, .02, M.taglio, 1.42, H / 2 + .14, -.895);
  box(8, .3, T, M.muro, 0, .29, 3 - T / 2);                                     // zoccolo davanti
  // tetto piano con bordo
  const tetto = new THREE.Group(); scene.add(tetto);
  const bordoTaglio = box(8.7, .02, 6.7, new THREE.MeshBasicMaterial({ color: '#E12121', transparent: true, opacity: 0 }), 0, H + .14, 0, tetto);
  box(8.7, .26, 6.7, M.tettoBordo, 0, H + .27, 0, tetto);
  box(8.4, .04, 6.4, M.tetto, 0, H + .42, 0, tetto);

  // finestre sul muro di fondo (dentro) e sul muro destro (fuori)
  const finestra = (x, y, w, h) => {
    const g = new THREE.Group(); g.position.set(x, y, -3 + T + .006); scene.add(g);
    const v = new THREE.Mesh(new THREE.PlaneGeometry(w, h), M.vetro); g.add(v);
    const f = .05;
    box(w + f * 2, f, .04, M.smalto, 0, h / 2 + f / 2, .01, g); box(w + f * 2, f, .06, M.smalto, 0, -h / 2 - f / 2, .02, g);
    box(f, h, .04, M.smalto, -w / 2 - f / 2, 0, .01, g); box(f, h, .04, M.smalto, w / 2 + f / 2, 0, .01, g);
    box(.03, h, .03, M.smalto, 0, 0, .01, g);
  };
  finestra(-2.9, 1.78, 1.2, 1.3); finestra(-.45, 1.78, 1.2, 1.3); finestra(2.75, 2.25, .8, .55);
  const fuori = new THREE.Mesh(new THREE.PlaneGeometry(.9, 1.1), M.vetroFuori);
  fuori.rotation.y = Math.PI / 2; fuori.position.set(4.006, 1.85, .1); scene.add(fuori);
  box(.05, 1.2, 1.0, M.smalto, 4.0, 1.85, .1);
  fuori.position.x = 4.03;

  /* ---------- arredo ---------- */
  box(2.6, .012, 2.1, M.tappeto, -2.25, .165, .75);
  rbox(.95, .42, 2.2, .08, M.tessuto, -3.35, .38, .7);                      // divano
  rbox(.24, .78, 2.2, .08, M.tessuto, -3.78, .62, .7);
  rbox(.95, .62, .2, .08, M.tessuto, -3.35, .48, -.45);
  rbox(.95, .62, .2, .08, M.tessuto, -3.35, .48, 1.85);
  rbox(.8, .36, 1.05, .04, M.legno, -2.05, .36, .75);                        // tavolino
  const pianta = new THREE.Group(); pianta.position.set(.85, .16, -2.35); scene.add(pianta);
  const vaso = new THREE.Mesh(new THREE.CylinderGeometry(.22, .17, .45, 20), M.vaso); vaso.position.y = .22; pianta.add(vaso);
  [[0, .85, 0, .42], [.18, 1.15, .05, .3], [-.14, 1.05, -.08, .32]].forEach(([x, y, z, r]) => { const f = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 0), M.foglie); f.position.set(x, y, z); pianta.add(f); });
  const lampada = new THREE.Group(); lampada.position.set(-3.55, .16, -2.4); scene.add(lampada);
  const asta = new THREE.Mesh(new THREE.CylinderGeometry(.02, .02, 1.55, 8), M.scuro); asta.position.y = .78; lampada.add(asta);
  const paralume = new THREE.Mesh(new THREE.CylinderGeometry(.17, .26, .32, 24, 1, true), M.lampada); paralume.position.y = 1.62; lampada.add(paralume);
  const base = new THREE.Mesh(new THREE.CylinderGeometry(.16, .16, .03, 20), M.scuro); base.position.y = .02; lampada.add(base);
  // vasca
  rbox(1.6, .56, .82, .1, M.smalto, 2.62, .44, -2.33);
  const acqua = box(1.36, .02, .62, M.acqua, 2.62, .66, -2.33);

  /* ---------- prodotti Riello ---------- */
  // caldaia murale a condensazione con accumulo (Residence HM Aqua)
  const caldaia = new THREE.Group(); caldaia.position.set(4 - T - .17, 0, -1.55); caldaia.rotation.y = -Math.PI / 2; scene.add(caldaia);
  rbox(.48, .76, .3, .05, M.smalto, 0, 1.95, 0, caldaia);
  rbox(.48, .34, .3, .05, M.smalto, 0, 1.38, 0, caldaia);
  const schermo = box(.16, .08, .01, M.display, 0, 1.78, .151, caldaia);
  box(.07, .018, .012, M.rosso, .15, 2.27, .151, caldaia);
  const scarico = new THREE.Mesh(new THREE.CylinderGeometry(.055, .055, 1, 12), M.grigio); scarico.position.set(3.68, 2.85, -1.55); scene.add(scarico);
  const comignolo = new THREE.Mesh(new THREE.CylinderGeometry(.075, .075, .6, 12), M.smalto); comignolo.position.set(3.68, 3.72, -1.55); tetto.add(comignolo);

  // radiatori a elementi sotto le finestre
  const radiatori = [];
  [-2.9, -.45].forEach(x => {
    const g = new THREE.Group(); g.position.set(x, .62, -3 + T + .06); scene.add(g);
    for (let i = 0; i < 9; i++) box(.085, .54, .07, M.radiatore, -0.44 + i * .11, 0, 0, g);
    radiatori.push(g);
  });
  // scaldasalviette in bagno
  const scaldasalviette = new THREE.Group(); scaldasalviette.position.set(4 - T - .06, 1.25, 1.35); scene.add(scaldasalviette);
  for (let i = 0; i < 7; i++) box(.035, .035, .5, M.radiatore, 0, -.45 + i * .15, 0, scaldasalviette);
  box(.04, 1.0, .04, M.radiatore, 0, 0, -.27, scaldasalviette); box(.04, 1.0, .04, M.radiatore, 0, 0, .27, scaldasalviette);

  // climatizzatore a parete (Aaria Mono Plus I)
  const clima = new THREE.Group(); clima.position.set(-1.68, 2.72, -3 + T + .13); scene.add(clima);
  rbox(1.0, .3, .22, .07, M.smalto, 0, 0, 0, clima);
  box(.86, .025, .02, M.scuro, 0, -.11, .1, clima);
  box(.05, .012, .01, M.rosso, .38, .07, .111, clima);

  // pompa di calore monoblocco (NXHP) fuori, a destra
  const pdc = new THREE.Group(); pdc.position.set(5.25, .06, 2.4); scene.add(pdc);
  rbox(1.05, .86, .44, .05, M.smalto, 0, .45, 0, pdc);
  box(1.08, .05, .5, M.grigio, 0, .02, 0, pdc);
  const griglia = new THREE.Mesh(new THREE.CircleGeometry(.3, 40), M.scuro); griglia.position.set(-.16, .45, .225); pdc.add(griglia);
  const anello = new THREE.Mesh(new THREE.TorusGeometry(.3, .022, 8, 48), M.grigio); anello.position.set(-.16, .45, .23); pdc.add(anello);
  const ventola = new THREE.Group(); ventola.position.set(-.16, .45, .235); pdc.add(ventola);
  for (let i = 0; i < 4; i++) { const p = box(.05, .26, .01, M.grigio, 0, .13, 0, new THREE.Group()); const g = p.parent; g.rotation.z = i * Math.PI / 2; ventola.add(g); }
  box(.12, .035, .01, M.rosso, .34, .76, .226, pdc);

  // inverter ibrido e batterie (Helioflow, Heliocharge) sul muro destro, fuori
  const fv = new THREE.Group(); fv.position.set(4.12, .14, 1.85); scene.add(fv);
  rbox(.14, .5, .44, .03, M.smalto, 0, 1.75, 0, fv);
  box(.01, .06, .18, M.display, .072, 1.82, 0, fv);
  const led = [];
  for (let i = 0; i < 3; i++) {
    rbox(.18, .3, .56, .03, M.smalto, .02, .2 + i * .33, 0, fv);
    const l = box(.012, .025, .36, M.led.clone(), .115, .28 + i * .33, 0, fv); led.push(l);
  }

  // fotovoltaico sul tetto (Heliocell): due file di moduli inclinati
  const moduli = new THREE.Group(); tetto.add(moduli);
  const texModulo = (() => {
    const c = document.createElement('canvas'); c.width = 128; c.height = 192; const g = c.getContext('2d');
    g.fillStyle = '#0E1B3A'; g.fillRect(0, 0, 128, 192); g.strokeStyle = 'rgba(160,190,255,.35)'; g.lineWidth = 2;
    for (let x = 0; x <= 128; x += 21.3) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, 192); g.stroke(); }
    for (let y = 0; y <= 192; y += 16) { g.beginPath(); g.moveTo(0, y); g.lineTo(128, y); g.stroke(); }
    g.strokeStyle = '#C7CED6'; g.lineWidth = 6; g.strokeRect(0, 0, 128, 192);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
  })();
  M.pannello.map = texModulo;
  const modulo = new THREE.BoxGeometry(1.02, .035, 1.6);
  [[-1.55], [.95]].forEach(([z]) => {
    for (let i = 0; i < 5; i++) {
      const m = new THREE.Mesh(modulo, M.pannello);
      m.position.set(-3.1 + i * 1.12, H + .78, z); m.rotation.x = .38; moduli.add(m);
      const sost = box(.04, .4, .04, M.grigio, m.position.x, H + .58, z - .55); moduli.add(sost);
    }
  });

  /* ---------- alberi ---------- */
  const alberi = [];
  [[-6.6, -2.4, 1.25], [-5.6, 3.2, .95], [7.3, 3.7, 1.05], [-2.2, -5.6, 1.0], [5.9, -3.9, .95]].forEach(([x, z, s]) => {
    const g = new THREE.Group(); g.position.set(x, 0, z); g.scale.setScalar(s); scene.add(g);
    const tr = new THREE.Mesh(new THREE.CylinderGeometry(.09, .13, 1.0, 8), M.tronco); tr.position.y = .5; g.add(tr);
    const c1 = new THREE.Mesh(new THREE.IcosahedronGeometry(.95, 0), M.albero); c1.position.y = 1.6; g.add(c1);
    const c2 = new THREE.Mesh(new THREE.IcosahedronGeometry(.62, 0), M.albero); c2.position.set(.25, 2.3, .1); g.add(c2);
    alberi.push(g);
  });
  [[-4.8, 4.6], [3.2, 4.4], [6.4, .8], [-7.4, .6]].forEach(([x, z]) => { const c = new THREE.Mesh(new THREE.IcosahedronGeometry(.42, 0), M.albero); c.position.set(x, .25, z); c.scale.y = .7; scene.add(c); });

  /* ---------- impianto: tubi che si scaldano ---------- */
  const strisce = (() => {
    const c = document.createElement('canvas'); c.width = 256; c.height = 8; const g = c.getContext('2d');
    const gr = g.createLinearGradient(0, 0, 256, 0);
    gr.addColorStop(0, 'rgba(255,255,255,.25)'); gr.addColorStop(.45, 'rgba(255,255,255,1)'); gr.addColorStop(.55, 'rgba(255,255,255,1)'); gr.addColorStop(1, 'rgba(255,255,255,.25)');
    g.fillStyle = gr; g.fillRect(0, 0, 256, 8);
    const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
  })();
  const tubo = (punti, r, colore) => {
    const path = new THREE.CurvePath();
    for (let i = 0; i < punti.length - 1; i++) path.add(new THREE.LineCurve3(new THREE.Vector3(...punti[i]), new THREE.Vector3(...punti[i + 1])));
    const lung = path.getLength();
    const tex = strisce.clone(); tex.needsUpdate = true; tex.repeat.set(lung * 1.6, 1);
    const m = new THREE.MeshBasicMaterial({ color: colore, map: tex, transparent: true, opacity: 0, depthWrite: false, toneMapped: false });
    const mesh = new THREE.Mesh(new THREE.TubeGeometry(path, Math.max(24, Math.round(lung * 12)), r, 6, false), m);
    scene.add(mesh); return { mesh, m, tex, path };
  };
  const zb = -3 + T + .05;
  const mandata = tubo([[3.62, 1.2, -1.45], [3.62, .24, -1.45], [3.62, .24, zb], [-3.4, .24, zb], [-3.4, .45, zb]], .028, '#FF6A2B');
  const ritorno = tubo([[3.62, 1.2, -1.65], [3.55, .3, -1.65], [3.55, .3, zb + .06], [-.1, .3, zb + .06], [-.1, .45, zb + .06]], .022, '#E8433A');
  const linkIbrido = tubo([[4.72, .45, 2.4], [4.3, .26, 2.4], [3.7, .26, 2.4], [3.7, .26, -1.4], [3.7, 1.22, -1.48]], .034, '#5FB6FF');
  const cavo = tubo([[1.6, H + .5, 1.6], [3.85, H + .5, 1.6], [4.18, H + .1, 1.85], [4.18, 2.05, 1.85]], .02, '#FFD24D');
  const cavoPdc = tubo([[4.24, .9, 1.85], [4.45, .12, 1.95], [4.85, .12, 2.15], [4.9, .3, 2.25]], .02, '#FFD24D');

  // pavimento radiante: serpentina che si accende
  const serpentina = (() => {
    const c = document.createElement('canvas'); c.width = 512; c.height = 512; const g = c.getContext('2d');
    g.fillStyle = '#000'; g.fillRect(0, 0, 512, 512); g.strokeStyle = '#fff'; g.lineWidth = 9; g.lineCap = 'round'; g.lineJoin = 'round';
    g.shadowColor = '#fff'; g.shadowBlur = 18; g.beginPath();
    const p = 34, n = 12, passo = (512 - 2 * p) / (n - 1);
    for (let i = 0; i < n; i++) { const x = p + i * passo; if (i === 0) g.moveTo(x, p); g.lineTo(x, i % 2 ? p : 512 - p); g.lineTo(x + (i < n - 1 ? passo : 0), i % 2 ? p : 512 - p); }
    g.stroke();
    return new THREE.CanvasTexture(c);
  })();
  const pavRad = new THREE.Mesh(new THREE.PlaneGeometry(5.2, 5.4), new THREE.MeshBasicMaterial({ map: serpentina, color: '#FF7A2A', transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
  pavRad.rotation.x = -Math.PI / 2; pavRad.position.set(-1.32, .168, 0); scene.add(pavRad);

  const pozza = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d');
    const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, 'rgba(255,190,110,1)'); gr.addColorStop(.5, 'rgba(255,150,70,.35)'); gr.addColorStop(1, 'rgba(255,120,40,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
    const m = new THREE.Mesh(new THREE.PlaneGeometry(11, 6), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
    m.rotation.x = -Math.PI / 2; m.position.set(-.6, .02, 4.2); scene.add(m); return m;
  })();

  /* ---------- luci ---------- */
  const emi = new THREE.HemisphereLight('#DDE6F5', '#59606A', .6); scene.add(emi);
  const dir = new THREE.DirectionalLight('#FFFFFF', 1); scene.add(dir); scene.add(dir.target);
  const casaLuce = new THREE.PointLight('#FFB867', 0, 9, 1.6); casaLuce.position.set(-1.6, 2.4, -.2); scene.add(casaLuce);

  /* ---------- particelle (tutto il moto sta nello shader) ---------- */
  const uniPR = { value: renderer.getPixelRatio() };
  const uniH = { value: 800 };
  const uniT = { value: 0 };
  const vertBase = `
    uniform float uT; uniform float uSize; uniform float uH;
    attribute vec3 aBase; attribute float aSeed;
    varying float vA; varying float vU;
    #define PI 3.14159265
  `;
  const puntoFrag = `
    uniform vec3 uCol; uniform vec3 uCol2; uniform float uOp; varying float vA; varying float vU;
    void main(){ float d = length(gl_PointCoord - .5); float a = smoothstep(.5, .08, d) * vA * uOp; if (a < .004) discard; gl_FragColor = vec4(mix(uCol, uCol2, vU), a); }
  `;
  const sistema = (n, base, corpo, opz) => {
    const g = new THREE.BufferGeometry();
    const b = new Float32Array(n * 3), s = new Float32Array(n);
    for (let i = 0; i < n; i++) { const p = base(i); b[i * 3] = p[0]; b[i * 3 + 1] = p[1]; b[i * 3 + 2] = p[2]; s[i] = Math.random(); }
    g.setAttribute('position', new THREE.BufferAttribute(b.slice(), 3));
    g.setAttribute('aBase', new THREE.BufferAttribute(b, 3));
    g.setAttribute('aSeed', new THREE.BufferAttribute(s, 1));
    const m = new THREE.ShaderMaterial({
      uniforms: { uT: uniT, uH: uniH, uSize: { value: opz.size }, uOp: { value: 0 }, uCol: { value: col(opz.c1) }, uCol2: { value: col(opz.c2 || opz.c1) } },
      vertexShader: vertBase + `void main(){ vec3 p = aBase; ${corpo}
        vec4 mv = modelViewMatrix * vec4(p, 1.0); gl_Position = projectionMatrix * mv;
        gl_PointSize = uSize * uH * projectionMatrix[1][1] / (-mv.z) * .5; }`,
      fragmentShader: puntoFrag, transparent: true, depthWrite: false,
      blending: opz.add ? THREE.AdditiveBlending : THREE.NormalBlending
    });
    const pts = new THREE.Points(g, m); pts.frustumCulled = false; scene.add(pts); return m;
  };
  const fuoriCasa = () => { let x, z; do { x = (Math.random() * 2 - 1) * 13; z = (Math.random() * 2 - 1) * 11; } while (Math.abs(x) < 4.7 && Math.abs(z) < 3.7); return [x, Math.random() * 14, z]; };
  const neve = sistema(mobile() ? 650 : 1100, fuoriCasa, `
    float v = .7 + aSeed * .7; p.y = mod(aBase.y - uT * v, 14.0);
    p.x += sin(uT * .6 + aSeed * 30.0) * .35; p.z += cos(uT * .5 + aSeed * 17.0) * .25;
    vA = smoothstep(0.0, 1.2, p.y) * smoothstep(14.0, 11.0, p.y); vU = aSeed;`, { size: .085, c1: '#FFFFFF', c2: '#DCE8FF' });
  const caldoBase = i => {
    if (i % 3 === 0) { const r = (i / 3) % 2 ? -2.9 : -.45; return [r + (Math.random() - .5) * .95, .92, -2.72 + Math.random() * .12]; }
    return [-1.32 + (Math.random() - .5) * 5, .2, (Math.random() - .5) * 5.2];
  };
  const caldo = sistema(mobile() ? 220 : 340, caldoBase, `
    float L = 2.0 + aSeed * 1.2; float u = fract(uT / L + aSeed);
    p.y += u * (1.2 + aSeed * .9); p.x += sin(u * 6.28 + aSeed * 12.0) * .09;
    vA = sin(u * PI) * .75; vU = u;`, { size: .11, c1: '#FF9A2E', c2: '#C0207C', add: true });
  const frescoBase = () => [-1.68 + (Math.random() - .5) * .86, 2.6, -2.68];
  const fresco = sistema(mobile() ? 200 : 320, frescoBase, `
    float u = fract(uT * (.32 + aSeed * .18) + aSeed);
    vec3 d = normalize(vec3((aSeed - .5) * .9, -.42 - aSeed * .25, 1.0));
    p += d * u * 3.6; p.x += sin(u * 5.0 + aSeed * 20.0) * .12 * u;
    vA = sin(u * PI) * .85; vU = u;`, { size: .13, c1: '#1E9BEB', c2: '#8FDcFF' });
  const vaporeBase = () => [2.62 + (Math.random() - .5) * 1.1, .7, -2.33 + (Math.random() - .5) * .45];
  const pennacchioMat = sistema(mobile() ? 50 : 80, () => [3.68 + (Math.random() - .5) * .08, 4.05, -1.55], `
    float u = fract(uT * (.16 + aSeed * .1) + aSeed);
    p.y += u * 1.5; p.x += sin(u * 4.0 + aSeed * 9.0) * .25 * u; p.z += cos(u * 3.0 + aSeed * 7.0) * .15 * u;
    vA = sin(u * PI) * .35; vU = u;`, { size: .34, c1: '#FFFFFF', c2: '#E8F0FF' });
  const pennacchio = scene.children[scene.children.length - 1];
  const vapore = sistema(mobile() ? 90 : 140, vaporeBase, `
    float u = fract(uT * (.16 + aSeed * .1) + aSeed);
    p.y += u * 1.4; p.x += sin(u * 4.0 + aSeed * 9.0) * .22 * u; p.z += cos(u * 3.0 + aSeed * 7.0) * .15 * u;
    vA = sin(u * PI) * .35; vU = u;`, { size: .32, c1: '#FFFFFF', c2: '#E8F0FF' });

  // impulsi di energia lungo i cavi e il collegamento ibrido (posizioni calcolate qui)
  const impulsi = (curva, n, c1, size) => {
    const g = new THREE.BufferGeometry(); const pos = new Float32Array(n * 3);
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const m = new THREE.PointsMaterial({ color: c1, size, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true, toneMapped: false, map: (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d'); const gr = x.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(.35, 'rgba(255,255,255,.7)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = gr; x.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c); })() });
    const p = new THREE.Points(g, m); p.frustumCulled = false; scene.add(p);
    return { g, m, pos, n, curva };
  };
  const impSole = impulsi(cavo.path, 8, '#FFE07A', .32);
  const impPdc = impulsi(cavoPdc.path, 6, '#FFE07A', .3);
  const impIbrido = impulsi(linkIbrido.path, 7, '#9FD6FF', .34);
  const v3 = new THREE.Vector3();
  const muoviImpulsi = (I, t, vel) => {
    const L = I.curva.getLength();
    for (let i = 0; i < I.n; i++) { I.curva.getPointAt(((t * vel / L) + i / I.n) % 1, v3); I.pos[i * 3] = v3.x; I.pos[i * 3 + 1] = v3.y; I.pos[i * 3 + 2] = v3.z; }
    I.g.attributes.position.needsUpdate = true;
  };

  /* ---------- stato miscelato ---------- */
  const S = { terra: new THREE.Color(), albero: new THREE.Color(), dirCol: new THREE.Color(), vetro: new THREE.Color(), dirPos: new THREE.Vector3() };
  const NUM = ['neve', 'caldo', 'caldaia', 'pdc', 'fresco', 'sole', 'ibrido', 'vapore', 'luci', 'emi', 'dir', 'esp', 'az', 'el'];
  function miscela(c) {
    const i = clamp(Math.floor(c), 0, 3), f = clamp(c - i), j = Math.min(3, i + 1);
    const t = liscio(.62, 1, f);
    const A = STAGIONI[i], B = STAGIONI[j];
    NUM.forEach(k => (S[k] = lerp(A[k], B[k], t)));
    COLORI.forEach(k => S[k].copy(A[k]).lerp(B[k], t));
    S.dirPos.set(lerp(A.dirPos[0], B.dirPos[0], t), lerp(A.dirPos[1], B.dirPos[1], t), lerp(A.dirPos[2], B.dirPos[2], t));
    // la camera ruota con continuità per tutto lo scroll
    S.azC = lerp(-28, 30, clamp(c / 4));
    S.elC = lerp(A.el, B.el, liscio(0, 1, f));
    return S;
  }

  /* ---------- misura e inquadratura ---------- */
  const target = new THREE.Vector3(.5, 1.25, 0);
  let W = 1, Hh = 1;
  function misura() {
    W = canvas.clientWidth; Hh = canvas.clientHeight;
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, mobile() ? 1.5 : 2));
    renderer.setSize(W, Hh, false);
    camera.aspect = W / Hh;
    camera.fov = mobile() ? 34 : 28;
    // spazio per i pannelli: su telefono la casa sale, su desktop va a destra
    if (mobile()) camera.setViewOffset(W, Hh, 0, Hh * .15, W, Hh);
    else camera.setViewOffset(W, Hh, -W * .14, Hh * .02, W, Hh);
    camera.updateProjectionMatrix();
    uniH.value = renderer.domElement.height; uniPR.value = renderer.getPixelRatio();
  }
  function distanza() {
    const tf = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    const largo = mobile() ? 6.0 : 8.6, alto = mobile() ? 5.2 : 6.1;
    return Math.max(alto / tf, largo / (tf * camera.aspect));
  }

  /* ---------- puntatore (solo desktop) ---------- */
  let px = 0, py = 0, tx = 0, ty = 0;
  if (matchMedia('(hover: hover) and (pointer: fine)').matches) {
    addEventListener('pointermove', e => { tx = e.clientX / innerWidth - .5; ty = e.clientY / innerHeight - .5; }, { passive: true });
  }

  /* ---------- ciclo ---------- */
  const caldoCol = new THREE.Color(), tmp = new THREE.Color();
  let ultimo = 0, tempo = 0, vivo = false, idRaf = 0, inVista = true;
  const capitolo = () => (window.__rielloCapitolo ? window.__rielloCapitolo() : 0);

  function disegna(now) {
    idRaf = 0;
    const dt = ultimo ? Math.min(.05, (now - ultimo) / 1000) : 1 / 60; ultimo = now;
    if (!ridotto) tempo += dt;
    const c = capitolo();
    const s = miscela(Math.max(0, c));
    uniT.value = tempo;

    // terreno, alberi, cielo nei vetri
    M.terra.color.copy(s.terra); M.albero.color.copy(s.albero);
    M.vetro.color.copy(s.vetro);
    M.vetroFuori.color.setRGB(1, .78, .46).multiplyScalar(.25 + s.luci * .85).lerp(tmp.copy(s.vetro), 1 - s.luci);
    // luci
    emi.intensity = s.emi; scene.environmentIntensity = s.emi * .85; dir.intensity = s.dir; dir.color.copy(s.dirCol); dir.position.copy(s.dirPos);
    casaLuce.intensity = s.luci * 9; M.lampada.emissiveIntensity = s.luci * 1.6;
    renderer.toneMappingExposure = s.esp;

    // il tetto si alza come in una sezione esplosa e torna giù quando lavora il sole
    const alza = ridotto ? 1.1 : 1.15 * liscio(-.12, .4, c) * (1 - liscio(2.5, 2.95, c));
    tetto.position.y = alza + (ridotto ? 0 : Math.sin(tempo * .9) * .03 * alza);
    bordoTaglio.material.opacity = clamp(alza) * .9;
    scarico.scale.y = 1 + alza * .9; scarico.position.y = 2.35 + (1 + alza * .9) * .5;
    pennacchio.position.y = alza;
    pozza.material.opacity = s.luci * .55;

    // caldo: radiatori, scaldasalviette, pavimento, tubi
    const pulsa = .88 + .12 * Math.sin(tempo * 2.1);
    termico(.55 + s.caldo * .3, caldoCol);
    M.radiatore.emissive.copy(caldoCol); M.radiatore.emissiveIntensity = s.caldo * 1.25 * pulsa;
    pavRad.material.opacity = s.caldo * .55 * pulsa;
    mandata.m.opacity = ritorno.m.opacity = clamp(s.caldo * 1.2);
    mandata.tex.offset.x = -tempo * .9; ritorno.tex.offset.x = tempo * .9;
    M.display.color.copy(tmp.setRGB(.13, .19, .25)).lerp(termico(.8, caldoCol), s.caldaia * .9);
    M.acqua.emissive.copy(termico(.7, caldoCol)); M.acqua.emissiveIntensity = s.caldo * .5;

    // ibrido: la pompa di calore manda calore alla caldaia
    linkIbrido.m.opacity = s.ibrido; linkIbrido.tex.offset.x = -tempo * 1.2;
    impIbrido.m.opacity = s.ibrido; if (s.ibrido > .01) muoviImpulsi(impIbrido, tempo, 1.4);

    // ventola della pompa di calore
    ventola.rotation.z -= dt * (1.5 + s.pdc * 16) * (ridotto ? 0 : 1);

    // fotovoltaico
    M.pannello.emissiveIntensity = s.sole * (.18 + .1 * Math.sin(tempo * 1.7));
    const solTetto = s.sole * (1 - liscio(.1, .6, alza));
    cavo.m.opacity = solTetto; cavoPdc.m.opacity = s.sole; cavo.tex.offset.x = -tempo * 1.4; cavoPdc.tex.offset.x = -tempo * 1.4;
    impSole.m.opacity = solTetto; impPdc.m.opacity = s.sole;
    if (s.sole > .01) { muoviImpulsi(impSole, tempo, 1.6); muoviImpulsi(impPdc, tempo, 1.3); }
    const carica = s.sole > .02 ? ((tempo * .22) % 1.2) : 0;
    led.forEach((l, i) => l.material.color.setRGB(.17, .23, .18).lerp(tmp.setRGB(.45, 1, .55), s.sole * (carica > i / 3 ? 1 : .15)));

    // particelle
    neve.uniforms.uOp.value = s.neve;
    caldo.uniforms.uOp.value = s.caldo;
    fresco.uniforms.uOp.value = s.fresco;
    vapore.uniforms.uOp.value = s.vapore; pennacchioMat.uniforms.uOp.value = s.vapore;

    // camera
    px += (tx - px) * .05; py += (ty - py) * .05;
    const intro = 1 - liscio(-.21, .3, c);
    const az = THREE.MathUtils.degToRad(s.azC + Math.sin(tempo * .18) * 2.2 + px * 6 - intro * 10);
    const el = THREE.MathUtils.degToRad(s.elC + py * 3 + intro * 6);
    const d = distanza() * (1 + intro * .12);
    camera.position.set(target.x + Math.sin(az) * Math.cos(el) * d, target.y + Math.sin(el) * d, target.z + Math.cos(az) * Math.cos(el) * d);
    camera.lookAt(target);

    renderer.render(scene, camera);
    if (vivo) idRaf = requestAnimationFrame(disegna);
  }

  function aggiornaVita() {
    if (ridotto) return;
    const deve = inVista && !document.hidden;
    if (deve && !vivo) { vivo = true; ultimo = 0; if (!idRaf) idRaf = requestAnimationFrame(disegna); }
    else if (!deve && vivo) { vivo = false; if (idRaf) cancelAnimationFrame(idRaf); idRaf = 0; }
  }
  new IntersectionObserver(v => { inVista = v[0].isIntersecting; aggiornaVita(); }, { rootMargin: '25% 0px' }).observe(sezione);
  document.addEventListener('visibilitychange', aggiornaVita);
  addEventListener('resize', () => { misura(); if (!vivo) requestAnimationFrame(disegna); });
  if (ridotto) addEventListener('scroll', () => { if (!idRaf) idRaf = requestAnimationFrame(disegna); }, { passive: true });

  misura();
  if (ridotto) { vivo = false; requestAnimationFrame(disegna); }
  else aggiornaVita();
  requestAnimationFrame(() => sezione.classList.add('is-3d'));
}
