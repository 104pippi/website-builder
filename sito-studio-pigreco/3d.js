// Studio Pigreco — ingranaggi in 3D: dal fil di ferro all'acciaio, ingranano tra loro e girano con il tempo e lo scroll
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

export function avvia({ canvas, scena, profilo, ZA, ZB, ridotto, mouse }) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, innerWidth < 900 ? 1.5 : 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const mondo = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  mondo.environment = pmrem.fromScene(new RoomEnvironment(), .04).texture;
  const luce = new THREE.DirectionalLight(0xffffff, 1.6);
  luce.position.set(-20, 30, 40);
  mondo.add(luce);

  const camera = new THREE.PerspectiveCamera(30, 4 / 3, 1, 400);
  camera.position.set(0, 0, 78);

  // m = 1: ruota grande Ø primitivo 28, piccola 14, interasse 21
  const m = 1;
  const forma = (z, foriN, foroR, mozzoR) => {
    const s = new THREE.Shape(profilo(z, m).map(([x, y]) => new THREE.Vector2(x, y)));
    const mozzo = new THREE.Path();
    mozzo.absarc(0, 0, mozzoR, 0, Math.PI * 2, true);
    s.holes.push(mozzo);
    for (let i = 0; i < foriN; i++) {
      const a = i * Math.PI * 2 / foriN + Math.PI / foriN;
      const f = new THREE.Path();
      f.absarc(Math.cos(a) * 7.8, Math.sin(a) * 7.8, foroR, 0, Math.PI * 2, true);
      s.holes.push(f);
    }
    return s;
  };
  const estrudi = (shape, spessore) => {
    const g = new THREE.ExtrudeGeometry(shape, { depth: spessore, bevelEnabled: true, bevelThickness: .22, bevelSize: .18, bevelSegments: 2, curveSegments: 28 });
    g.translate(0, 0, -spessore / 2);
    g.computeVertexNormals();
    return g;
  };

  const acciaio = new THREE.MeshStandardMaterial({ color: 0xc3cad1, metalness: 1, roughness: .3, transparent: true, opacity: 0 });
  const brunito = new THREE.MeshStandardMaterial({ color: 0x7f97ad, metalness: 1, roughness: .26, transparent: true, opacity: 0 });
  const albero = new THREE.MeshStandardMaterial({ color: 0x5d6b78, metalness: 1, roughness: .4, transparent: true, opacity: 0 });
  const tratto = new THREE.LineBasicMaterial({ color: 0xd6ecff, transparent: true, opacity: 0 });

  const ruota = (geo, mat, x) => {
    const g = new THREE.Group();
    const corpo = new THREE.Mesh(geo, mat);
    const linee = new THREE.LineSegments(new THREE.EdgesGeometry(geo, 28), tratto);
    g.add(corpo, linee);
    g.position.x = x;
    return g;
  };
  const gA = estrudi(forma(ZA, 5, 2.5, 2.4), 5);
  const gB = estrudi(forma(ZB, 0, 0, 1.4), 6);
  const xA = -9, xB = xA + m * (ZA + ZB) / 2;
  const ruotaA = ruota(gA, acciaio, xA);
  const ruotaB = ruota(gB, brunito, xB);

  const cilindro = (r, l, x) => {
    const c = new THREE.Mesh(new THREE.CylinderGeometry(r, r, l, 40), albero);
    c.rotation.x = Math.PI / 2;
    c.position.x = x;
    return c;
  };
  const insieme = new THREE.Group();
  insieme.add(ruotaA, ruotaB, cilindro(2.38, 16, xA), cilindro(1.38, 15, xB));
  insieme.position.x = -((xA - ZA / 2 - m) + (xB + ZB / 2 + m)) / 2;
  mondo.add(insieme);

  const faseB = Math.PI - Math.PI / ZB;
  let w = 0, h = 0;
  const misura = () => {
    const r = scena.getBoundingClientRect();
    if (!r.width || (r.width === w && r.height === h)) return;
    w = r.width; h = r.height;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.position.z = w / h < 1.2 ? 92 : 78;
    camera.updateProjectionMatrix();
  };
  misura();
  new ResizeObserver(misura).observe(scena);

  let px = 0, py = 0, qx = 0, qy = 0;
  if (mouse) {
    scena.addEventListener('pointermove', e => {
      const r = scena.getBoundingClientRect();
      px = (e.clientX - r.left) / r.width - .5;
      py = (e.clientY - r.top) / r.height - .5;
    });
    scena.addEventListener('pointerleave', () => { px = 0; py = 0; });
  }

  let inizio = null, visibile = false;
  const posa = t => {
    if (inizio === null && visibile) inizio = t;
    const s = inizio === null ? 0 : (t - inizio) / 1000;
    // dal disegno all'acciaio in 2,4 s
    const q = Math.min(1, Math.max(0, (s - .3) / 2.1));
    const k = q * q * (3 - 2 * q);
    tratto.opacity = Math.min(1, s * 2.5) * (1 - k * .88);
    acciaio.opacity = brunito.opacity = albero.opacity = k;
    const solido = k >= 1;
    if (acciaio.transparent === solido) {
      [acciaio, brunito, albero].forEach(x => { x.transparent = !solido; x.needsUpdate = true; });
    }

    const r = scena.getBoundingClientRect();
    const p = Math.min(1, Math.max(0, (innerHeight - r.top) / (innerHeight + r.height)));
    const giro = (ridotto ? 0 : s * .32) + p * 3.2;
    ruotaA.rotation.z = giro;
    ruotaB.rotation.z = -giro * ZA / ZB + faseB;

    qx += (px - qx) * .06;
    qy += (py - qy) * .06;
    insieme.rotation.x = -.62 + p * .38 + qy * .25;
    insieme.rotation.y = .5 - p * .62 + qx * .35;
    insieme.position.y = (1 - k) * -2 + (p - .5) * -3;
    renderer.render(mondo, camera);
  };

  let attivo = false;
  const ciclo = t => {
    if (!visibile || document.hidden) { attivo = false; return; }
    posa(t);
    requestAnimationFrame(ciclo);
  };
  const riparti = () => { if (visibile && !attivo && !ridotto) { attivo = true; requestAnimationFrame(ciclo); } };
  new IntersectionObserver(([e]) => { visibile = e.isIntersecting; riparti(); }, { rootMargin: '120px 0px' }).observe(scena);
  document.addEventListener('visibilitychange', riparti);
  if (ridotto) {
    inizio = -1e9;
    const fermo = () => posa(0);
    fermo();
    addEventListener('resize', () => requestAnimationFrame(fermo));
  }
  requestAnimationFrame(t => { posa(t); scena.classList.add('pronto'); });
}
