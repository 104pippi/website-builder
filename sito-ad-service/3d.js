// Caldaia murale in esploso: il mantello si apre, escono bruciatore e scambiatore,
// il vaso d'espansione, lo scarico fumi; alla fine si richiude e il display dice OK.
// Guidata dallo scroll della sezione #manutenzione e dal tempo (performance.now).
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const W = 0.86, H = 1.26, D = 0.4;
const liscio = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const mix = (a, b, t) => a + (b - a) * t;

export function avvia() {
  const tela = document.getElementById('tela3d');
  const canvas = document.getElementById('caldaia3d');
  if (!tela || !canvas || tela.dataset.avviata) return;
  tela.dataset.avviata = '1';

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  } catch (e) { return; }
  if (!renderer.getContext()) return;

  const ridotto = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const telefono = matchMedia('(max-width: 999px), (pointer: coarse)').matches;
  const puntatore = matchMedia('(pointer: fine)').matches;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, telefono ? 1.5 : 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.08;
  renderer.setClearColor(0x000000, 0);

  const scena = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scena.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scena.environmentIntensity = 0.9;

  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 60);
  const luceChiave = new THREE.DirectionalLight(0xfff0de, 1.7); luceChiave.position.set(2.6, 3.2, 4);
  const luceTaglio = new THREE.DirectionalLight(0x86bfff, 1.6); luceTaglio.position.set(-3.2, 1.4, -2.4);
  scena.add(luceChiave, luceTaglio, new THREE.HemisphereLight(0xe2ecf6, 0x13253a, 0.55));

  /* ---------- materiali ---------- */
  const smalto = new THREE.MeshPhysicalMaterial({ color: 0xf2f3f0, roughness: 0.3, metalness: 0, clearcoat: 0.8, clearcoatRoughness: 0.18 });
  const lamiera = new THREE.MeshStandardMaterial({ color: 0x9aa6b0, roughness: 0.42, metalness: 0.8 });
  const acciaio = new THREE.MeshStandardMaterial({ color: 0xd7dce0, roughness: 0.2, metalness: 1 });
  const rame = new THREE.MeshStandardMaterial({ color: 0xc8804f, roughness: 0.26, metalness: 1 });
  const ottone = new THREE.MeshStandardMaterial({ color: 0xcfa94e, roughness: 0.3, metalness: 1 });
  const rossoVaso = new THREE.MeshPhysicalMaterial({ color: 0xc8142f, roughness: 0.36, clearcoat: 0.6, clearcoatRoughness: 0.25 });
  const scuro = new THREE.MeshStandardMaterial({ color: 0x232d38, roughness: 0.5, metalness: 0.45 });
  const nero = new THREE.MeshStandardMaterial({ color: 0x0c1118, roughness: 0.35, metalness: 0.2 });
  const scheda = new THREE.MeshStandardMaterial({ color: 0x1d4a3a, roughness: 0.6, metalness: 0.1 });
  const bruciatoreMat = new THREE.MeshStandardMaterial({ color: 0x3a3330, roughness: 0.5, metalness: 0.7, emissive: 0xff4b14, emissiveIntensity: 0 });

  const caldaia = new THREE.Group();
  scena.add(caldaia);
  const mesh = (geo, mat, x = 0, y = 0, z = 0) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); return m; };

  /* ---------- telaio (fondo, fianchi, cielo, base) ---------- */
  const telaio = new THREE.Group();
  telaio.add(mesh(new THREE.BoxGeometry(W - 0.04, H - 0.04, 0.02), lamiera, 0, 0, -D / 2 + 0.012));
  const fianco = new RoundedBoxGeometry(0.03, H, D, 3, 0.012);
  telaio.add(mesh(fianco, smalto, -W / 2 + 0.015, 0, 0), mesh(fianco, smalto, W / 2 - 0.015, 0, 0));
  const piano = new RoundedBoxGeometry(W, 0.03, D, 3, 0.012);
  telaio.add(mesh(piano, smalto, 0, H / 2 - 0.015, 0), mesh(piano, smalto, 0, -H / 2 + 0.015, 0));
  caldaia.add(telaio);

  /* ---------- mantello frontale con display ---------- */
  const mantello = new THREE.Group();
  mantello.position.set(0, 0, D / 2 + 0.02);
  mantello.add(mesh(new RoundedBoxGeometry(W + 0.014, H + 0.014, 0.05, 5, 0.022), smalto));
  const cornice = mesh(new RoundedBoxGeometry(0.4, 0.12, 0.014, 3, 0.006), nero, 0, -H / 2 + 0.15, 0.027);
  mantello.add(cornice);
  const displayCanvas = document.createElement('canvas');
  displayCanvas.width = 512; displayCanvas.height = 144;
  const dctx = displayCanvas.getContext('2d');
  const displayTex = new THREE.CanvasTexture(displayCanvas);
  displayTex.colorSpace = THREE.SRGBColorSpace;
  const displayMat = new THREE.MeshBasicMaterial({ map: displayTex, toneMapped: false });
  mantello.add(mesh(new THREE.PlaneGeometry(0.36, 0.1), displayMat, 0, -H / 2 + 0.15, 0.0346));
  let statoDisplay = '';
  const disegnaDisplay = (stato) => {
    if (stato === statoDisplay) return;
    statoDisplay = stato;
    dctx.fillStyle = '#08111c'; dctx.fillRect(0, 0, 512, 144);
    dctx.strokeStyle = 'rgba(120,200,255,.18)'; dctx.lineWidth = 2; dctx.strokeRect(6, 6, 500, 132);
    dctx.font = '700 84px Archivo, system-ui, sans-serif'; dctx.textBaseline = 'middle';
    if (stato === 'ok') {
      dctx.fillStyle = '#7dffb5'; dctx.fillText('OK', 44, 76);
      dctx.lineWidth = 12; dctx.lineCap = 'round'; dctx.strokeStyle = '#7dffb5';
      dctx.beginPath(); dctx.moveTo(214, 76); dctx.lineTo(246, 106); dctx.lineTo(304, 42); dctx.stroke();
      dctx.font = '600 30px Archivo, system-ui, sans-serif'; dctx.fillStyle = 'rgba(125,255,181,.75)'; dctx.fillText('controllo fatto', 330, 76);
    } else {
      dctx.fillStyle = stato === 'spento' ? 'rgba(127,211,255,.35)' : '#7fd3ff';
      dctx.fillText(stato === 'spento' ? '--' : '52°', 44, 78);
      dctx.font = '600 30px Archivo, system-ui, sans-serif'; dctx.fillStyle = 'rgba(127,211,255,.7)';
      dctx.fillText(stato === 'spento' ? 'in manutenzione' : 'riscaldamento', 230, 60);
      dctx.fillText(stato === 'spento' ? '' : 'acqua calda', 230, 100);
    }
    displayTex.needsUpdate = true;
  };
  disegnaDisplay('acceso');
  const tasto = new THREE.CylinderGeometry(0.013, 0.013, 0.01, 20).rotateX(Math.PI / 2);
  [-0.26, 0.26].forEach((x) => mantello.add(mesh(tasto, scuro, x, -H / 2 + 0.15, 0.03)));
  caldaia.add(mantello);

  /* ---------- camera di combustione: scambiatore a spirale, bruciatore, ventola ---------- */
  const combustione = new THREE.Group();
  combustione.position.set(0.08, 0.1, 0);
  class Elica extends THREE.Curve {
    getPoint(t, v = new THREE.Vector3()) {
      const a = t * Math.PI * 2 * 6.5;
      return v.set(Math.cos(a) * 0.135, (t - 0.5) * 0.4, Math.sin(a) * 0.135);
    }
  }
  combustione.add(new THREE.Mesh(new THREE.TubeGeometry(new Elica(), telefono ? 260 : 420, 0.017, 10, false), acciaio));
  const anello = new THREE.TorusGeometry(0.135, 0.02, 10, 48).rotateX(Math.PI / 2);
  combustione.add(mesh(anello, acciaio, 0, 0.215, 0), mesh(anello, acciaio, 0, -0.215, 0));
  const bruciatore = new THREE.Group();
  bruciatore.add(mesh(new THREE.CylinderGeometry(0.056, 0.056, 0.3, 32), bruciatoreMat));
  bruciatore.add(mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.02, 32), scuro, 0, 0.16, 0));
  const bagliore = new THREE.Sprite(new THREE.SpriteMaterial({ map: macchia('#ff7a2a'), color: 0xffffff, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
  bagliore.scale.set(0.62, 0.7, 1);
  bruciatore.add(bagliore);
  const fiamma = new THREE.PointLight(0xff6a2a, 0, 1.4, 1.6);
  bruciatore.add(fiamma);
  combustione.add(bruciatore);

  const ventola = new THREE.Group();
  ventola.position.set(0, 0.33, 0.02);
  ventola.add(mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.075, 36).rotateX(Math.PI / 2), lamiera));
  const girante = new THREE.Group();
  girante.position.z = 0.04;
  const pala = new THREE.BoxGeometry(0.012, 0.07, 0.006).translate(0, 0.038, 0);
  for (let i = 0; i < 8; i++) { const p = mesh(pala, acciaio); p.rotation.z = (i / 8) * Math.PI * 2; p.rotation.y = 0.5; girante.add(p); }
  girante.add(mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.012, 20).rotateX(Math.PI / 2), scuro));
  ventola.add(girante);
  combustione.add(ventola);
  caldaia.add(combustione);

  /* ---------- vaso d'espansione ---------- */
  const vaso = new THREE.Group();
  vaso.position.set(-0.25, 0.25, -0.07);
  vaso.add(mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.08, 56).rotateX(Math.PI / 2), rossoVaso));
  vaso.add(mesh(new THREE.TorusGeometry(0.14, 0.008, 8, 56), rossoVaso, 0, 0, 0.04));
  vaso.add(mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.05, 12), ottone, 0, 0.16, 0));
  caldaia.add(vaso);

  /* ---------- gruppo idraulico, manometro, scheda ---------- */
  const idraulica = new THREE.Group();
  idraulica.add(mesh(new THREE.CylinderGeometry(0.058, 0.058, 0.1, 32).rotateX(Math.PI / 2), scuro, -0.07, -0.36, 0.02));
  idraulica.add(mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.012, 32).rotateX(Math.PI / 2), acciaio, -0.07, -0.36, 0.076));
  idraulica.add(mesh(new RoundedBoxGeometry(0.13, 0.07, 0.07, 2, 0.01), ottone, 0.17, -0.41, 0.02));
  idraulica.add(mesh(new RoundedBoxGeometry(0.22, 0.13, 0.016, 2, 0.004), scheda, 0.2, -0.2, -0.17));
  const chip = new THREE.BoxGeometry(0.03, 0.02, 0.008);
  [[0.13, -0.18], [0.2, -0.23], [0.26, -0.17], [0.17, -0.15]].forEach(([x, y]) => idraulica.add(mesh(chip, nero, x, y, -0.158)));
  const tubo = (punti, r = 0.013) => new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(punti.map((p) => new THREE.Vector3(...p))), 40, r, 10, false), rame);
  idraulica.add(tubo([[0.04, -0.13, 0], [0.02, -0.25, 0.02], [-0.04, -0.33, 0.02]]));
  idraulica.add(tubo([[0.13, -0.13, 0], [0.16, -0.25, 0.01], [0.17, -0.38, 0.02]]));
  idraulica.add(tubo([[-0.25, 0.12, -0.07], [-0.24, -0.1, -0.03], [-0.14, -0.33, 0.02]]));
  idraulica.add(tubo([[-0.07, -0.41, 0.02], [-0.15, -0.5, 0.02], [-0.3, -0.6, 0]]));
  idraulica.add(tubo([[0.17, -0.44, 0.02], [0.15, -0.52, 0.01], [0.15, -0.6, 0]]));

  const manometro = new THREE.Group();
  manometro.position.set(-0.27, -0.42, 0.11);
  manometro.add(mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.026, 40).rotateX(Math.PI / 2), nero));
  const facciaCanvas = document.createElement('canvas');
  facciaCanvas.width = facciaCanvas.height = 256;
  const fctx = facciaCanvas.getContext('2d');
  fctx.fillStyle = '#f7f7f4'; fctx.beginPath(); fctx.arc(128, 128, 124, 0, Math.PI * 2); fctx.fill();
  fctx.strokeStyle = '#d9001f'; fctx.lineWidth = 14; fctx.beginPath(); fctx.arc(128, 128, 100, -Math.PI * 0.25 - Math.PI * 0.375, -Math.PI * 0.25); fctx.stroke();
  fctx.strokeStyle = '#1b2430'; fctx.fillStyle = '#1b2430'; fctx.lineWidth = 4; fctx.font = '700 30px Archivo, sans-serif'; fctx.textAlign = 'center'; fctx.textBaseline = 'middle';
  for (let b = 0; b <= 4; b++) {
    const a = Math.PI * 0.75 + (b / 4) * Math.PI * 1.5;
    fctx.beginPath(); fctx.moveTo(128 + Math.cos(a) * 92, 128 + Math.sin(a) * 92); fctx.lineTo(128 + Math.cos(a) * 112, 128 + Math.sin(a) * 112); fctx.stroke();
    fctx.fillText(String(b), 128 + Math.cos(a) * 70, 128 + Math.sin(a) * 70);
  }
  fctx.font = '600 22px Archivo, sans-serif'; fctx.fillText('bar', 128, 182);
  const facciaTex = new THREE.CanvasTexture(facciaCanvas); facciaTex.colorSpace = THREE.SRGBColorSpace;
  manometro.add(mesh(new THREE.CircleGeometry(0.044, 40), new THREE.MeshBasicMaterial({ map: facciaTex }), 0, 0, 0.0135));
  const lancetta = new THREE.Group();
  lancetta.position.z = 0.016;
  lancetta.add(mesh(new THREE.BoxGeometry(0.004, 0.036, 0.002).translate(0, 0.016, 0), new THREE.MeshBasicMaterial({ color: 0xd9001f })));
  manometro.add(lancetta);
  idraulica.add(manometro);
  caldaia.add(idraulica);

  /* ---------- attacchi sotto la caldaia: rubinetti con le leve colorate ---------- */
  const attacchi = new THREE.Group();
  const tuboDritto = new THREE.CylinderGeometry(0.014, 0.014, 0.34, 16);
  const corpoValvola = new THREE.CylinderGeometry(0.024, 0.024, 0.055, 18);
  const leva = new THREE.BoxGeometry(0.075, 0.014, 0.018).translate(0.03, 0, 0);
  const colori = [0xd7262e, null, 0xe7b62a, 0x2f6fd6, 0xd7262e];
  [-0.3, -0.15, 0, 0.15, 0.3].forEach((x, i) => {
    attacchi.add(mesh(tuboDritto, rame, x, -H / 2 - 0.17, 0));
    attacchi.add(mesh(corpoValvola, ottone, x, -H / 2 - 0.13, 0));
    if (colori[i]) {
      const l = mesh(leva, new THREE.MeshStandardMaterial({ color: colori[i], roughness: 0.4, metalness: 0.1 }), x, -H / 2 - 0.13, 0.03);
      l.rotation.y = -0.4;
      attacchi.add(l);
    }
  });
  caldaia.add(attacchi);

  /* ---------- scarico fumi coassiale e fumo ---------- */
  const fumi = new THREE.Group();
  fumi.position.set(0.08, H / 2, -0.02);
  fumi.add(mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.04, 40), scuro, 0, 0.02, 0));
  fumi.add(mesh(new THREE.CylinderGeometry(0.064, 0.064, 0.34, 40), smalto, 0, 0.2, 0));
  fumi.add(mesh(new THREE.TorusGeometry(0.064, 0.006, 8, 40).rotateX(Math.PI / 2), lamiera, 0, 0.37, 0));
  const NF = telefono ? 26 : 40;
  const fumoGeo = new THREE.BufferGeometry();
  const fumoPos = new Float32Array(NF * 3);
  fumoGeo.setAttribute('position', new THREE.BufferAttribute(fumoPos, 3));
  const fumoMat = new THREE.PointsMaterial({ map: macchia('#ffffff'), size: 0.16, transparent: true, opacity: 0, depthWrite: false, color: 0xdfe8f2 });
  const fumo = new THREE.Points(fumoGeo, fumoMat);
  fumo.position.y = 0.38;
  fumi.add(fumo);
  caldaia.add(fumi);
  const semi = Array.from({ length: NF }, (_, i) => ({ fase: i / NF, x: (Math.random() - 0.5) * 0.06, z: (Math.random() - 0.5) * 0.06, giro: Math.random() * 6.28 }));

  /* posizioni di riposo, per l'esploso */
  const base = new Map([mantello, combustione, bruciatore, ventola, vaso, fumi].map((o) => [o, o.position.clone()]));

  /* ---------- ancore delle etichette ---------- */
  const etichette = [...document.querySelectorAll('#etichette .etichetta')];
  const ancore = [
    [mantello, new THREE.Vector3(-0.2, 0.28, 0.03)],
    [combustione, new THREE.Vector3(-0.1, 0.02, 0.15)],
    [vaso, new THREE.Vector3(-0.04, 0.04, 0.05)],
    [fumi, new THREE.Vector3(0.0, 0.22, 0.07)],
    [mantello, new THREE.Vector3(-0.21, -H / 2 + 0.15, 0.04), new THREE.Vector3(-0.06, -H / 2 + 0.2, 0.04)],
  ];
  const tmp = new THREE.Vector3();
  let larghe = [];

  /* ---------- dimensioni ---------- */
  let larg = 1, alt = 1;
  const ridimensiona = () => {
    larghe = [];
    const r = tela.getBoundingClientRect();
    larg = Math.max(1, Math.round(r.width)); alt = Math.max(1, Math.round(r.height));
    renderer.setSize(larg, alt, false);
    camera.aspect = larg / alt;
    camera.updateProjectionMatrix();
    chiediDisegno();
  };
  new ResizeObserver(ridimensiona).observe(tela);

  /* puntatore: un extra solo su desktop */
  const mira = { x: 0, y: 0 }, mano = { x: 0, y: 0 };
  if (puntatore && !ridotto) {
    tela.addEventListener('pointermove', (e) => {
      const r = tela.getBoundingClientRect();
      mira.x = ((e.clientX - r.left) / r.width - 0.5) * 2;
      mira.y = ((e.clientY - r.top) / r.height - 0.5) * 2;
    });
    tela.addEventListener('pointerleave', () => { mira.x = 0; mira.y = 0; });
  }

  const bersaglio = new THREE.Vector3();
  const progresso = () => (window.ADcaldaia ? window.ADcaldaia.progresso() : 0);

  function disegna(t) {
    const p = progresso();
    const chiude = 1 - liscio(0.82, 0.93, p);
    const e1 = liscio(0.06, 0.2, p) * chiude;
    const e2 = liscio(0.27, 0.39, p) * chiude;
    const e3 = liscio(0.45, 0.57, p) * chiude;
    const e4 = liscio(0.63, 0.75, p) * chiude;
    const aperto = Math.max(e1, e2, e3, e4);

    /* esploso */
    const mb = base.get(mantello);
    mantello.position.set(mb.x + 0.8 * e1, mb.y + 0.05 * e1, mb.z + 0.6 * e1);
    mantello.rotation.set(0.04 * e1, -0.95 * e1, 0);
    const cb = base.get(combustione);
    combustione.position.set(cb.x + 0.04 * e2, cb.y + 0.02 * e2, cb.z + 0.5 * e2);
    combustione.rotation.y = 0.35 * e2;
    const bb = base.get(bruciatore);
    bruciatore.position.set(bb.x, bb.y - 0.02 * e2, bb.z + 0.26 * e2);
    const vb = base.get(ventola);
    ventola.position.set(vb.x, vb.y + 0.14 * e2, vb.z + 0.06 * e2);
    const sb = base.get(vaso);
    vaso.position.set(sb.x - 0.4 * e3, sb.y + 0.06 * e3, sb.z + 0.42 * e3);
    vaso.rotation.y = 0.55 * e3;
    const fb = base.get(fumi);
    fumi.position.set(fb.x, fb.y + 0.32 * e4, fb.z);

    /* bruciatore acceso durante il passo 2 */
    const fuoco = liscio(0.3, 0.36, p) * (1 - liscio(0.42, 0.47, p));
    const tremolio = 0.85 + 0.15 * Math.sin(t * 17) * Math.sin(t * 7.3);
    bruciatoreMat.emissiveIntensity = 2.4 * fuoco * tremolio;
    bagliore.material.opacity = 0.9 * fuoco * tremolio;
    fiamma.intensity = 2.2 * fuoco * tremolio;
    girante.rotation.z = -t * (2 + 16 * Math.max(fuoco, e4));

    /* manometro: la pressione torna a 1,5 bar */
    const bar = 0.55 + 0.95 * liscio(0.5, 0.6, p);
    lancetta.rotation.z = -(Math.PI * 0.75 + (bar / 4) * Math.PI * 1.5) + Math.PI / 2 + Math.PI;

    /* fumo durante l'analisi */
    fumoMat.opacity = 0.5 * e4;
    if (e4 > 0.01) {
      for (let i = 0; i < NF; i++) {
        const s = semi[i];
        const f = (s.fase + t * 0.28) % 1;
        fumoPos[i * 3] = s.x + Math.sin(f * 6 + s.giro) * 0.05 * f;
        fumoPos[i * 3 + 1] = f * 0.7;
        fumoPos[i * 3 + 2] = s.z + Math.cos(f * 5 + s.giro) * 0.04 * f;
      }
      fumoGeo.attributes.position.needsUpdate = true;
    }

    disegnaDisplay(p > 0.9 ? 'ok' : aperto > 0.3 ? 'spento' : 'acceso');

    /* camera: orbita lenta nel tempo, giro guidato dallo scroll, dolly indietro quando si apre */
    mano.x += (mira.x - mano.x) * 0.06; mano.y += (mira.y - mano.y) * 0.06;
    const yaw = -0.5 + 0.09 * Math.sin(t * 0.25) + p * 0.75 + mano.x * 0.14;
    const pitch = 0.17 + 0.035 * Math.sin(t * 0.21 + 1) - mano.y * 0.06;
    const tanF = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    const meta = { w: mix(0.56, 1.0, aperto), h: mix(0.84, 1.1, aperto) };
    const dist = Math.max(meta.h / tanF, meta.w / (tanF * camera.aspect)) * 1.04;
    bersaglio.set(mix(0, 0.12, e1 * (1 - e3)) - 0.06 * e3, -0.08 + 0.18 * e4 - 0.02 * aperto, 0.12 * aperto);
    camera.position.set(
      bersaglio.x + Math.sin(yaw) * Math.cos(pitch) * dist,
      bersaglio.y + Math.sin(pitch) * dist,
      bersaglio.z + Math.cos(yaw) * Math.cos(pitch) * dist,
    );
    camera.lookAt(bersaglio);
    caldaia.position.y = ridotto ? 0 : 0.012 * Math.sin(t * 0.9);
    caldaia.rotation.z = ridotto ? 0 : 0.006 * Math.sin(t * 0.6);

    renderer.render(scena, camera);

    /* etichetta del passo attivo */
    const n = p < 0.26 ? 0 : p < 0.44 ? 1 : p < 0.62 ? 2 : p < 0.8 ? 3 : 4;
    const visibile = [e1 > 0.35, e2 > 0.35, e3 > 0.35, e4 > 0.35, p > 0.9][n];
    etichette.forEach((el, i) => {
      if (i !== n) { el.classList.remove('attiva'); return; }
      const [obj, loc, sopra] = ancore[i];
      tmp.copy(loc); obj.localToWorld(tmp); tmp.project(camera);
      let x = (tmp.x * 0.5 + 0.5) * larg, y = (-tmp.y * 0.5 + 0.5) * alt;
      /* la pillola va dal lato con più spazio; se non ci sta, la linea si accorcia */
      const w = larghe[i] || (larghe[i] = el.offsetWidth);
      const dx = larg - 8 - x - w, sx = x - 8 - w;
      /* il display non va coperto: se ai lati non c'è posto, l'etichetta sale sopra */
      const su = i === 4 && sx < 18;
      const aSx = !su && (i === 4 || (dx < 42 && sx > dx));
      if (su) { tmp.copy(sopra); obj.localToWorld(tmp); tmp.project(camera); x = (tmp.x * 0.5 + 0.5) * larg; y = (-tmp.y * 0.5 + 0.5) * alt; }
      el.style.setProperty('--x', x.toFixed(1) + 'px');
      el.style.setProperty('--y', y.toFixed(1) + 'px');
      el.style.setProperty('--g', su ? '34px' : Math.round(Math.max(16, Math.min(42, aSx ? sx : dx))) + 'px');
      el.classList.toggle('sx', aSx);
      el.classList.toggle('su', su);
      el.classList.toggle('attiva', visibile);
    });
  }

  /* ---------- ciclo: si ferma fuori schermo e con la scheda nascosta ---------- */
  let inVista = true, raf = 0, primo = true;
  const ciclo = () => {
    raf = 0;
    if (!inVista || document.hidden) return;
    disegna(ridotto ? 0 : performance.now() / 1000);
    if (primo) { primo = false; tela.classList.add('pronto'); }
    if (!ridotto) raf = requestAnimationFrame(ciclo);
  };
  function chiediDisegno() { if (!raf) raf = requestAnimationFrame(ciclo); }
  new IntersectionObserver((v) => { inVista = v[0].isIntersecting; if (inVista) chiediDisegno(); }, { rootMargin: '80px' }).observe(tela);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) chiediDisegno(); });
  if (ridotto) addEventListener('scroll', chiediDisegno, { passive: true });
  ridimensiona();
}

/* macchia morbida per bagliore e fumo */
function macchia(colore) {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  const r = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  r.addColorStop(0, colore); r.addColorStop(0.35, colore + 'aa'); r.addColorStop(1, colore + '00');
  g.fillStyle = r; g.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
