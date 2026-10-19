// Scena 3D della storia: il disco del tachigrafo che gira e lo stilo che scrive la traccia.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { disegnaDisco, statoTimeline, angoloDi, THETA0, R_ZERO, R_AMPIEZZA, SPAN } from './disco.js';

const ROSSO = 0xd62718;

function nastro(punti, larghezze, y) {
  // punti: [[x, z], ...] nel piano del disco; restituisce una geometria a striscia
  const n = punti.length;
  const pos = new Float32Array(n * 2 * 3);
  for (let i = 0; i < n; i++) {
    const a = punti[Math.max(0, i - 1)], b = punti[Math.min(n - 1, i + 1)];
    let tx = b[0] - a[0], tz = b[1] - a[1];
    const l = Math.hypot(tx, tz) || 1;
    tx /= l; tz /= l;
    const nx = -tz, nz = tx, w = larghezze[i] / 2;
    pos.set([punti[i][0] + nx * w, y, punti[i][1] + nz * w, punti[i][0] - nx * w, y, punti[i][1] - nz * w], i * 6);
  }
  const idx = new Uint32Array((n - 1) * 6);
  for (let i = 0; i < n - 1; i++) {
    const o = i * 2;
    idx.set([o, o + 1, o + 2, o + 1, o + 3, o + 2], i * 6);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setIndex(new THREE.BufferAttribute(idx, 1));
  return g;
}

const xz = (r, phi) => [r * Math.cos(phi), -r * Math.sin(phi)];

export async function avvia({ contenitore, tappe, stato }) {
  const prova = document.createElement('canvas');
  const gl = prova.getContext('webgl2') || prova.getContext('webgl');
  if (!gl) return false;

  const mobile = matchMedia('(max-width: 899px), (pointer: coarse)').matches;
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
  } catch (e) {
    return false;
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, mobile ? 1.5 : 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.setClearColor(0x000000, 0);
  const tela = renderer.domElement;
  tela.className = 'scena-3d';
  contenitore.appendChild(tela);

  const scena = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scena.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 60);

  const luce = new THREE.DirectionalLight(0xffffff, 1.5);
  luce.position.set(-2.5, 5, 3);
  scena.add(luce);
  const controluce = new THREE.DirectionalLight(0xffe8e0, 0.5);
  controluce.position.set(3, 2, -4);
  scena.add(controluce);

  // strumento: base, ghiera, ombra
  const strumento = new THREE.Group();
  scena.add(strumento);

  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(1.2, 1.24, 0.1, 128),
    new THREE.MeshStandardMaterial({ color: 0x23262c, roughness: 0.55, metalness: 0.35 })
  );
  base.position.y = -0.062;
  strumento.add(base);

  const ghiera = new THREE.Mesh(
    new THREE.TorusGeometry(1.19, 0.04, 20, 160),
    new THREE.MeshStandardMaterial({ color: 0xd9dce0, roughness: 0.22, metalness: 1 })
  );
  ghiera.rotation.x = -Math.PI / 2;
  ghiera.position.y = -0.006;
  strumento.add(ghiera);

  const ombraTela = document.createElement('canvas');
  ombraTela.width = ombraTela.height = 256;
  const oc = ombraTela.getContext('2d');
  const og = oc.createRadialGradient(128, 128, 30, 128, 128, 128);
  og.addColorStop(0, 'rgba(0,0,0,0.6)');
  og.addColorStop(0.55, 'rgba(0,0,0,0.25)');
  og.addColorStop(1, 'rgba(0,0,0,0)');
  oc.fillStyle = og; oc.fillRect(0, 0, 256, 256);
  const ombra = new THREE.Mesh(
    new THREE.PlaneGeometry(3.6, 3.6),
    new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(ombraTela), transparent: true, depthWrite: false })
  );
  ombra.rotation.x = -Math.PI / 2;
  ombra.position.y = -0.14;
  strumento.add(ombra);

  // disco stampato
  try {
    await Promise.race([
      Promise.all([document.fonts.load('900 expanded 40px Archivo'), document.fonts.load('700 expanded 40px Archivo')]),
      new Promise((r) => setTimeout(r, 1500)),
    ]);
  } catch (e) { /* si disegna col carattere di riserva */ }
  const lato = mobile ? 1536 : 2048;
  const faccia = document.createElement('canvas');
  faccia.width = faccia.height = lato;
  disegnaDisco(faccia, tappe);
  const trama = new THREE.CanvasTexture(faccia);
  trama.colorSpace = THREE.SRGBColorSpace;
  trama.anisotropy = renderer.capabilities.getMaxAnisotropy();

  const disco = new THREE.Group();
  strumento.add(disco);

  const anello = new THREE.RingGeometry(0.06, 1, 256, 1);
  anello.rotateX(-Math.PI / 2);
  const carta = new THREE.Mesh(anello, new THREE.MeshStandardMaterial({ map: trama, roughness: 0.85, metalness: 0, envMapIntensity: 0.9 }));
  disco.add(carta);
  const bordo = new THREE.Mesh(
    new THREE.CylinderGeometry(1, 1, 0.008, 256, 1, true),
    new THREE.MeshStandardMaterial({ color: 0xe9e9e4, roughness: 0.9 })
  );
  bordo.position.y = -0.004;
  disco.add(bordo);

  // tracce: velocità, attività, distanza
  const N = 2400;
  const pVel = [], wVel = [], pAtt = [], wAtt = [], pDist = [], wDist = [];
  let dist = 0, prec = 0;
  for (let i = 0; i < N; i++) {
    const p = i / (N - 1);
    const { v } = statoTimeline(p, tappe);
    const phi = angoloDi(p);
    pVel.push(xz(R_ZERO + R_AMPIEZZA * v, phi)); wVel.push(0.013);
    const guida = v > 0.06 ? 1 : 0;
    pAtt.push(xz(0.865, phi)); wAtt.push(guida ? 0.04 : 0.011);
    dist += v * (p - prec) * 120; prec = p;
    const tri = Math.abs(((dist % 2) + 2) % 2 - 1);
    pDist.push(xz(0.38 + 0.05 * tri, phi)); wDist.push(0.0085);
  }
  const inchiostro = new THREE.MeshBasicMaterial({ color: 0x1f2328, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  const inchiostroLieve = new THREE.MeshBasicMaterial({ color: 0x3a3f47, side: THREE.DoubleSide, transparent: true, opacity: 0.85, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  const tracce = [
    new THREE.Mesh(nastro(pVel, wVel, 0.0016), inchiostro),
    new THREE.Mesh(nastro(pAtt, wAtt, 0.0014), inchiostroLieve),
    new THREE.Mesh(nastro(pDist, wDist, 0.0014), inchiostroLieve),
  ];
  tracce.forEach((m) => disco.add(m));

  // perno e fermo
  const metallo = new THREE.MeshStandardMaterial({ color: 0xc9ccd1, roughness: 0.3, metalness: 1 });
  const fermo = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.02, 64), metallo);
  fermo.position.y = 0.01;
  strumento.add(fermo);
  const perno = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.036, 0.07, 32), metallo);
  perno.position.y = 0.045;
  strumento.add(perno);
  const cappuccio = new THREE.Mesh(new THREE.SphereGeometry(0.05, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), metallo);
  cappuccio.position.y = 0.078;
  cappuccio.scale.y = 0.55;
  strumento.add(cappuccio);

  // stilo rosso
  const phiPerno = THETA0 + 0.62;
  const pernoStilo = new THREE.Vector3(1.36 * Math.cos(phiPerno), 0.11, -1.36 * Math.sin(phiPerno));
  const colonna = new THREE.Mesh(
    new THREE.CylinderGeometry(0.055, 0.065, 0.2, 32),
    new THREE.MeshStandardMaterial({ color: 0x2c3037, roughness: 0.4, metalness: 0.8 })
  );
  colonna.position.set(pernoStilo.x, 0.01, pernoStilo.z);
  strumento.add(colonna);
  const testaColonna = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.03, 24), metallo);
  testaColonna.position.set(pernoStilo.x, 0.125, pernoStilo.z);
  strumento.add(testaColonna);
  const geoBraccio = new THREE.BoxGeometry(1, 0.014, 0.03);
  geoBraccio.translate(0.5, 0, 0);
  const braccio = new THREE.Mesh(geoBraccio, new THREE.MeshStandardMaterial({ color: ROSSO, roughness: 0.32, metalness: 0.3 }));
  braccio.position.copy(pernoStilo);
  strumento.add(braccio);
  const punta = new THREE.Mesh(new THREE.ConeGeometry(0.014, 0.05, 16), new THREE.MeshStandardMaterial({ color: 0x1b1d21, roughness: 0.3, metalness: 0.6 }));
  punta.rotation.x = Math.PI;
  strumento.add(punta);
  const asseX = new THREE.Vector3(1, 0, 0);
  const dir = new THREE.Vector3();
  const puntaPos = new THREE.Vector3();

  // inquadratura
  let L = 1, H = 1;
  const bersaglio = new THREE.Vector3(0, 0, 0);
  function misura() {
    L = contenitore.clientWidth || window.innerWidth;
    H = contenitore.clientHeight || window.innerHeight;
    renderer.setSize(L, H, false);
    camera.aspect = L / H;
    const largo = L >= 900;
    const cx = largo ? L * 0.7 : L * 0.47;
    const cy = largo ? H * 0.53 : H * 0.42;
    const raggioPx = largo ? Math.min(L * 0.235, H * 0.42) : Math.min(L * 0.43, H * 0.27);
    camera.userData.distanza = 1.22 * (H / 2) / (Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * raggioPx);
    camera.setViewOffset(L, H, -(cx - L / 2), -(cy - H / 2), L, H);
    camera.updateProjectionMatrix();
  }
  misura();
  window.addEventListener('resize', misura, { passive: true });

  // puntatore: solo desktop
  let px = 0, py = 0, spx = 0, spy = 0;
  if (!mobile) {
    window.addEventListener('pointermove', (e) => {
      px = e.clientX / window.innerWidth - 0.5;
      py = e.clientY / window.innerHeight - 0.5;
    }, { passive: true });
  }

  // animazione
  let sp = stato.p || 0, se = stato.e || 0, vLiscia = 0;
  let ultimo = performance.now();
  let visibile = true, inCorsa = false;
  const conteggio = (N - 1) * 6;

  function aggiorna(dt, ora) {
    const k = 1 - Math.exp(-dt * 6);
    sp += ((stato.p || 0) - sp) * k;
    se += ((stato.e || 0) - se) * (1 - Math.exp(-dt * 5));
    spx += (px - spx) * k; spy += (py - spy) * k;

    const ent = THREE.MathUtils.smootherstep(se, 0, 1);
    const st = statoTimeline(sp, tappe);
    vLiscia += (st.v - vLiscia) * (1 - Math.exp(-dt * 18));

    // disco che gira sotto lo stilo; all'ingresso arriva ruotando
    disco.rotation.y = sp * SPAN - (1 - ent) * 1.4;
    tracce.forEach((m) => m.geometry.setDrawRange(0, Math.max(0, Math.floor(sp * conteggio / 6) * 6)));

    strumento.rotation.x = (1 - ent) * -0.75;
    strumento.position.y = -(1 - ent) * 0.55 + Math.sin(ora * 0.0008) * 0.012;

    // stilo: la punta va al raggio della velocità registrata, con un tremolio leggero quando "guida"
    const r = R_ZERO + R_AMPIEZZA * vLiscia + Math.sin(ora * 0.05) * 0.0018 * vLiscia;
    puntaPos.set(r * Math.cos(THETA0), 0.028, -r * Math.sin(THETA0));
    punta.position.copy(puntaPos);
    dir.copy(puntaPos).setY(0.05).sub(pernoStilo);
    const lung = dir.length();
    braccio.quaternion.setFromUnitVectors(asseX, dir.normalize());
    braccio.scale.x = lung;

    // camera: alta all'inizio, gira un poco con la storia
    const el = THREE.MathUtils.degToRad(64 - sp * 12 + spy * 6);
    const az = THREE.MathUtils.degToRad(-16 + sp * 26 + spx * 10);
    const D = camera.userData.distanza * (1 - 0.06 * Math.sin(Math.PI * sp));
    camera.position.set(D * Math.cos(el) * Math.sin(az), D * Math.sin(el), D * Math.cos(el) * Math.cos(az));
    camera.lookAt(bersaglio);
  }

  function ciclo(ora) {
    if (!visibile || document.hidden) { inCorsa = false; return; }
    const dt = Math.min(0.05, Math.max(0, (ora - ultimo) / 1000));
    ultimo = ora;
    aggiorna(dt, ora);
    renderer.render(scena, camera);
    requestAnimationFrame(ciclo);
  }
  function parti() {
    if (inCorsa) return;
    inCorsa = true;
    ultimo = performance.now();
    requestAnimationFrame(ciclo);
  }

  if (!stato.fermo) {
    new IntersectionObserver(([v]) => { visibile = v.isIntersecting; if (visibile) parti(); }, { rootMargin: '120px 0px' }).observe(contenitore);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) parti(); });
  }

  if (stato.fermo) {
    sp = stato.p; se = 1;
    aggiorna(0, 0);
    renderer.render(scena, camera);
  } else {
    aggiorna(0, performance.now());
    renderer.render(scena, camera);
    parti();
  }
  requestAnimationFrame(() => tela.classList.add('pronta'));
  return true;
}
