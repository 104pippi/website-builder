// Tecnodiesel: un 6 cilindri in linea diesel (come quelli dei camion) costruito in codice.
// Gira al minimo, allo scroll si smonta in esploso con le etichette, poi si ricompone e sale di giri.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const N = 6;          // cilindri
const PASSO = 1.0;    // interasse
const R = 0.3;        // raggio di manovella
const L = 1.0;        // lunghezza biella
const PR = 0.355;     // raggio pistone
const PH = 0.46;      // altezza pistone
// manovelle a 120°: coppie 1-6, 2-5, 3-4 (ordine di scoppio 1-5-3-6-2-4)
const OFFS = [0, 240, 120, 120, 240, 0].map((d) => (d * Math.PI) / 180);
const XS = Array.from({ length: N }, (_, i) => (i - 2.5) * PASSO);

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const liscio = (a, b, v) => { const t = clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const mix = (a, b, t) => a + (b - a) * t;

// quanto è smontato il motore in funzione dell'avanzamento della sezione (0..1)
const esploso = (p) => liscio(0.22, 0.48, p) * (1 - liscio(0.66, 0.86, p));
// giri al secondo (lenti, per leggere il movimento)
const giri = (p, e) => mix(0.85, 0.28, e) + liscio(0.72, 1, p) * 1.9;

const cilX = (r, l, seg = 32) => { const g = new THREE.CylinderGeometry(r, r, l, seg); g.rotateZ(Math.PI / 2); return g; };

export async function avvia({ sezione, box, etichette, stato, ridotto }) {
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
  } catch (err) {
    console.warn('WebGL non disponibile:', err);
    return;
  }
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.06;
  renderer.setClearColor(0x000000, 0);
  box.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.8;
  pmrem.dispose();

  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);

  const luceChiave = new THREE.DirectionalLight(0xffffff, 1.9);
  luceChiave.position.set(3, 7, 6);
  const luceBordo = new THREE.DirectionalLight(0x6f96ff, 3.2);
  luceBordo.position.set(-6, 2.5, -5);
  const luceBassa = new THREE.DirectionalLight(0xbfd0ff, 0.55);
  luceBassa.position.set(0, -3, 6);
  scene.add(luceChiave, luceBordo, luceBassa);

  /* ---------- materiali ---------- */
  const acciaio = new THREE.MeshStandardMaterial({ color: 0xc6ccd5, metalness: 0.92, roughness: 0.28 });
  const forgiato = new THREE.MeshStandardMaterial({ color: 0x8e98a7, metalness: 0.88, roughness: 0.4 });
  const alluminio = new THREE.MeshStandardMaterial({ color: 0xe3e7ec, metalness: 0.7, roughness: 0.3 });
  const scuro = new THREE.MeshStandardMaterial({ color: 0x262b33, metalness: 0.55, roughness: 0.55 });
  const brunito = new THREE.MeshStandardMaterial({ color: 0x7d8693, metalness: 0.86, roughness: 0.33 });
  const vernice = new THREE.MeshStandardMaterial({ color: 0x1446c8, metalness: 0.35, roughness: 0.38 });
  const linee = new THREE.LineBasicMaterial({ color: 0x7ea2ff, transparent: true, opacity: 0.6, depthWrite: false });

  const motore = new THREE.Group();
  scene.add(motore);

  /* ---------- albero motore ---------- */
  const albero = new THREE.Group();
  motore.add(albero);
  const gBanco = cilX(0.17, 0.46, 32);
  for (let j = 0; j <= N; j++) {
    const m = new THREE.Mesh(gBanco, acciaio);
    m.position.x = (j - 3) * PASSO;
    albero.add(m);
  }
  const coda = new THREE.Mesh(cilX(0.15, 0.3, 28), acciaio);
  coda.position.x = -3.3;
  const naso = new THREE.Mesh(cilX(0.13, 0.36, 28), acciaio);
  naso.position.x = 3.32;
  albero.add(coda, naso);

  // spalla con contrappeso: forma 2D estrusa lungo l'asse dell'albero
  const forma = new THREE.Shape();
  const w = 0.205;
  forma.moveTo(-0.02, w);
  forma.lineTo(R, w);
  forma.absarc(R, 0, w, Math.PI / 2, -Math.PI / 2, true);
  forma.lineTo(-0.02, -w);
  const RC = 0.48, a0 = -2.15, a1 = -4.13;
  forma.lineTo(RC * Math.cos(a0), RC * Math.sin(a0));
  forma.absarc(0, 0, RC, a0, a1, true);
  forma.lineTo(-0.02, w);
  const SP = 0.11;
  const gSpalla = new THREE.ExtrudeGeometry(forma, { depth: SP, bevelEnabled: true, bevelThickness: 0.012, bevelSize: 0.012, bevelSegments: 2, curveSegments: 20 });
  // (x, y, z) della forma -> (asse, raggio, laterale)
  gSpalla.applyMatrix4(new THREE.Matrix4().set(0, 0, 1, -SP / 2, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1));

  const gPerno = cilX(0.155, 0.32, 28);
  OFFS.forEach((off, i) => {
    const g = new THREE.Group();
    g.position.x = XS[i];
    g.rotation.x = off;
    const perno = new THREE.Mesh(gPerno, acciaio);
    perno.position.y = R;
    g.add(perno);
    for (const s of [-1, 1]) {
      const spalla = new THREE.Mesh(gSpalla, brunito);
      spalla.position.x = s * 0.215;
      g.add(spalla);
    }
    albero.add(g);
  });

  /* ---------- volano con corona dentata ---------- */
  const volano = new THREE.Group();
  motore.add(volano);
  volano.add(new THREE.Mesh(cilX(0.95, 0.2, 80), forgiato));
  const mozzo = new THREE.Mesh(cilX(0.34, 0.27, 40), acciaio);
  volano.add(mozzo);
  const gBullone = cilX(0.045, 0.3, 12);
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2;
    const b = new THREE.Mesh(gBullone, scuro);
    b.position.set(0, Math.cos(a) * 0.23, Math.sin(a) * 0.23);
    volano.add(b);
  }
  const gForo = cilX(0.07, 0.21, 16);
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * Math.PI * 2 + 0.3;
    const f = new THREE.Mesh(gForo, scuro);
    f.position.set(0, Math.cos(a) * 0.62, Math.sin(a) * 0.62);
    volano.add(f);
  }
  const DENTI = 112;
  const denti = new THREE.InstancedMesh(new THREE.BoxGeometry(0.15, 0.075, 0.042), acciaio, DENTI);
  const fantoccio = new THREE.Object3D();
  for (let k = 0; k < DENTI; k++) {
    const a = (k / DENTI) * Math.PI * 2;
    fantoccio.position.set(0, Math.cos(a) * 0.985, Math.sin(a) * 0.985);
    fantoccio.rotation.set(a, 0, 0);
    fantoccio.updateMatrix();
    denti.setMatrixAt(k, fantoccio.matrix);
  }
  volano.add(denti);

  /* ---------- smorzatore e puleggia (blu Tecnodiesel) ---------- */
  const puleggia = new THREE.Group();
  motore.add(puleggia);
  const smorzatore = new THREE.Mesh(cilX(0.44, 0.13, 56), vernice);
  const gola = new THREE.Mesh(cilX(0.33, 0.2, 48), brunito);
  gola.position.x = 0.15;
  const corona = new THREE.Mesh(cilX(0.37, 0.05, 48), brunito);
  corona.position.x = 0.27;
  puleggia.add(smorzatore, gola, corona);

  /* ---------- pistoni e bielle ---------- */
  const gPistone = new THREE.CylinderGeometry(PR, PR, PH, 48);
  const gCielo = new THREE.CircleGeometry(0.2, 40);
  gCielo.rotateX(-Math.PI / 2);
  const gFascia = new THREE.CylinderGeometry(PR + 0.004, PR + 0.004, 0.018, 48, 1, true);
  const gSpinotto = cilX(0.072, PR * 1.9, 20);
  const gTesta = cilX(0.2, 0.2, 36);
  const gPiede = cilX(0.105, 0.17, 24);
  const gFusto = new THREE.BoxGeometry(0.1, L - 0.26, 0.075);
  gFusto.translate(0, L / 2, 0);

  const pistoni = [], bielle = [];
  for (let i = 0; i < N; i++) {
    const p = new THREE.Group();
    p.add(new THREE.Mesh(gPistone, alluminio));
    const cielo = new THREE.Mesh(gCielo, scuro);
    cielo.position.y = PH / 2 + 0.002;
    p.add(cielo);
    for (const y of [0.055, 0.095, 0.135]) {
      const f = new THREE.Mesh(gFascia, scuro);
      f.position.y = PH / 2 - y;
      p.add(f);
    }
    const sp = new THREE.Mesh(gSpinotto, acciaio);
    sp.position.y = -0.07;
    p.add(sp);
    p.position.x = XS[i];
    motore.add(p);
    pistoni.push(p);

    const b = new THREE.Group();
    b.add(new THREE.Mesh(gTesta, forgiato), new THREE.Mesh(gFusto, forgiato));
    const piede = new THREE.Mesh(gPiede, forgiato);
    piede.position.y = L;
    b.add(piede);
    b.position.x = XS[i];
    motore.add(b);
    bielle.push(b);
  }

  /* ---------- basamento e canne disegnati a filo (come un disegno tecnico) ---------- */
  const puntiCanne = [], puntiTesta = [];
  // cerchi orizzontali: piano xz
  const cerchioXZ = (arr, cx, y, r, seg = 48) => {
    for (let k = 0; k < seg; k++) {
      const a = (k / seg) * Math.PI * 2, b = ((k + 1) / seg) * Math.PI * 2;
      arr.push(new THREE.Vector3(cx + Math.cos(a) * r, y, Math.sin(a) * r), new THREE.Vector3(cx + Math.cos(b) * r, y, Math.sin(b) * r));
    }
  };
  const scatola = (arr, x0, x1, y0, y1, z0, z1) => {
    const v = [[x0, y0, z0], [x1, y0, z0], [x1, y1, z0], [x0, y1, z0], [x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]].map((q) => new THREE.Vector3(...q));
    [[0, 1], [1, 2], [2, 3], [3, 0], [4, 5], [5, 6], [6, 7], [7, 4], [0, 4], [1, 5], [2, 6], [3, 7]].forEach(([a, b]) => arr.push(v[a], v[b]));
  };
  const RCANNA = PR + 0.035, Y0 = 0.48, Y1 = 1.74;
  XS.forEach((x) => {
    cerchioXZ(puntiCanne, x, Y1, RCANNA);
    cerchioXZ(puntiCanne, x, Y0, RCANNA);
    for (let k = 0; k < 4; k++) {
      const a = (k / 4) * Math.PI * 2 + Math.PI / 4;
      puntiCanne.push(new THREE.Vector3(x + Math.cos(a) * RCANNA, Y0, Math.sin(a) * RCANNA), new THREE.Vector3(x + Math.cos(a) * RCANNA, Y1, Math.sin(a) * RCANNA));
    }
  });
  scatola(puntiCanne, -3.08, 3.08, 0.4, 1.8, -0.52, 0.52);
  scatola(puntiTesta, -3.04, 3.04, 1.86, 2.2, -0.48, 0.48);
  XS.forEach((x) => cerchioXZ(puntiTesta, x, 2.2, 0.12, 24));
  const canne = new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(puntiCanne), linee);
  const testata = new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(puntiTesta), linee);
  motore.add(canne, testata);

  /* ---------- posa: cinematica di manovelle, bielle e pistoni ---------- */
  const posa = (theta, e) => {
    albero.rotation.x = theta;
    volano.rotation.x = theta;
    puleggia.rotation.x = theta;
    volano.position.x = -3.5 - 1.0 * e;
    puleggia.position.x = 3.5 + 0.8 * e;
    for (let i = 0; i < N; i++) {
      const phi = theta + OFFS[i];
      const yP = R * Math.cos(phi), zP = R * Math.sin(phi);
      const ySp = yP + Math.sqrt(L * L - zP * zP);
      const b = bielle[i];
      b.position.set(XS[i], yP + 0.58 * e, zP);
      b.rotation.x = Math.atan2(-zP, ySp - yP);
      pistoni[i].position.set(XS[i], ySp + 0.07 + 1.15 * e, 0);
    }
    canne.position.y = 1.55 * e;
    testata.position.y = 2.25 * e;
    linee.opacity = mix(0.6, 0.42, e);
    motore.position.y = ridotto ? 0 : Math.sin(theta * 3) * 0.004 * (1 - e);
  };

  /* ---------- camera ---------- */
  const bersaglio = new THREE.Vector3();
  const puntatore = { x: 0, y: 0, tx: 0, ty: 0 };
  let tLayout = 1, largo = true;
  const posaCamera = (e, tempo) => {
    const t = tLayout;
    const az = mix(-1.0, 0.5, t) + mix(0.38, -0.16, t) * e + (ridotto ? 0 : Math.sin(tempo * 0.21) * 0.05) + puntatore.x * 0.12;
    const el = mix(0.36, 0.3, t) + 0.07 * e + puntatore.y * 0.05;
    const rag = mix(11.8, 13.2, t) * (1 + 0.15 * e);
    bersaglio.set(mix(-0.45, 0.1, t), mix(0.6, 0.52, t) + 0.6 * e, 0);
    camera.position.set(
      bersaglio.x + rag * Math.sin(az) * Math.cos(el),
      bersaglio.y + rag * Math.sin(el),
      bersaglio.z + rag * Math.cos(az) * Math.cos(el)
    );
    camera.lookAt(bersaglio);
    camera.updateMatrixWorld();
  };

  const ridimensiona = () => {
    const wB = box.clientWidth, hB = box.clientHeight;
    if (!wB || !hB) return;
    largo = innerWidth >= 960;
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, largo ? 2 : 1.5));
    renderer.setSize(wB, hB, false);
    camera.aspect = wB / hB;
    tLayout = clamp((camera.aspect - 0.55) / (1.5 - 0.55), 0, 1);
    camera.fov = mix(40, 30, tLayout);
    camera.setViewOffset(wB, hB, largo ? -wB * 0.2 : 0, largo ? 0 : -hB * 0.045, wB, hB);
    camera.updateProjectionMatrix();
  };
  ridimensiona();
  new ResizeObserver(ridimensiona).observe(box);

  if (matchMedia('(pointer: fine)').matches && !ridotto) {
    addEventListener('pointermove', (ev) => {
      puntatore.tx = (ev.clientX / innerWidth) * 2 - 1;
      puntatore.ty = (ev.clientY / innerHeight) * 2 - 1;
    }, { passive: true });
  }

  /* ---------- etichette dei pezzi ---------- */
  const tag = {};
  etichette.querySelectorAll('[data-parte]').forEach((el) => { tag[el.dataset.parte] = el; });
  const v = new THREE.Vector3();
  const ancora = (nome, e) => {
    const vicino = tLayout < 0.5; // telefono: camera dal lato del volano
    switch (nome) {
      case 'pistone': { const p = pistoni[vicino ? 1 : 4]; return v.set(p.position.x, p.position.y + PH / 2, PR); }
      case 'biella': { const b = bielle[vicino ? 2 : 3]; return v.set(0, L * 0.5, 0.04).applyMatrix4(b.matrixWorld); }
      case 'albero': return v.set(vicino ? 1 : -1, -0.18, 0.2);
      case 'volano': return v.set(volano.position.x, 0.98, 0);
      case 'canna': return v.set(XS[vicino ? 0 : 5], Y1 + canne.position.y, RCANNA);
      default: return v.set(0, 0, 0);
    }
  };
  const aggiornaEtichette = (e) => {
    const vis = liscio(0.55, 0.9, e);
    const wB = box.clientWidth, hB = box.clientHeight;
    for (const nome in tag) {
      const el = tag[nome];
      if (vis <= 0.001) { el.style.opacity = '0'; continue; }
      ancora(nome, e).project(camera);
      const x = (v.x * 0.5 + 0.5) * wB, y = (-v.y * 0.5 + 0.5) * hB;
      const larg = el.offsetWidth || 120;
      const sx = x + 10 + larg > wB - 8 ? x - 10 - larg : x + 10;
      const dentro = v.z < 1 && sx > 6 && x < wB - 4 && y > 40 && y < hB - 30;
      el.style.opacity = dentro ? vis.toFixed(3) : '0';
      el.style.transform = `translate(${sx.toFixed(1)}px, ${(y - 14).toFixed(1)}px)`;
    }
  };

  /* ---------- ciclo ---------- */
  let theta = 0.4, eLiscio = 0, ultimo = performance.now(), t0 = null;
  let visibile = false, attivo = false, vivo = false;

  const disegna = () => {
    const ora = performance.now();
    const dt = Math.min(0.05, Math.max(0, (ora - ultimo) / 1000));
    ultimo = ora;
    if (t0 === null) t0 = ora;
    const p = stato.p;
    eLiscio += (esploso(p) - eLiscio) * Math.min(1, dt * 8);
    const e = eLiscio;
    if (!ridotto) theta += dt * Math.PI * 2 * giri(p, e) * liscio(0, 1.5, (ora - t0) / 1000);
    puntatore.x += (puntatore.tx - puntatore.x) * Math.min(1, dt * 3);
    puntatore.y += (puntatore.ty - puntatore.y) * Math.min(1, dt * 3);
    posa(theta, e);
    posaCamera(e, ora / 1000);
    renderer.render(scene, camera);
    aggiornaEtichette(e);
  };

  const ciclo = () => {
    if (!attivo) { vivo = false; return; }
    requestAnimationFrame(ciclo);
    disegna();
  };
  const aggiornaAttivo = () => {
    attivo = visibile && !document.hidden;
    if (attivo && !vivo) {
      vivo = true;
      ultimo = performance.now();
      requestAnimationFrame(ciclo);
    }
  };

  posa(theta, 0);
  posaCamera(0, 0);
  try { await renderer.compileAsync(scene, camera); } catch (err) { /* compila al primo fotogramma */ }
  renderer.render(scene, camera);
  box.classList.add('pronta');
  sezione.classList.add('con-3d');
  ultimo = performance.now();

  new IntersectionObserver(([voce]) => { visibile = voce.isIntersecting; aggiornaAttivo(); }, { rootMargin: '10% 0px' }).observe(sezione);
  document.addEventListener('visibilitychange', aggiornaAttivo);

  // solo per generare le immagini statiche di riserva (?poster)
  if (location.search.includes('poster')) {
    window.__posterMotore = () => {
      posa(0.4, 0);
      posaCamera(0, 0);
      renderer.render(scene, camera);
      return renderer.domElement.toDataURL('image/png');
    };
  }
}
