// Il cubo del logo PMC: sei lastre d'acciaio stese come una fustella si piegano,
// il coperchio si chiude e il cubo si ferma nella posa isometrica del logo (P, M, C).
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, t) => a + (b - a) * t;
const fase = (t, a, b) => clamp((t - a) / (b - a));
const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const easeOut = (t) => 1 - Math.pow(1 - t, 3);
const easeBack = (t, s = 1.7) => { const c = s + 1; return 1 + c * Math.pow(t - 1, 3) + s * Math.pow(t - 1, 2); };

const LATO = 1.94;          // lastra
const SPESS = 0.08;
const ISO_ALTEZZA = 3.27;   // altezza a schermo del cubo di lato 2 in vista isometrica

// lettere disegnate sulla faccia (0..1000, y verso il basso), ricavate dal logo raddrizzato
const LETTERE = {
  P: [['M', 130, 70], ['L', 770, 70], ['Q', 945, 70, 945, 245], ['L', 945, 445], ['Q', 945, 620, 770, 620], ['L', 280, 620], ['L', 280, 845], ['L', 130, 845], ['L', 130, 420], ['L', 745, 420], ['Q', 775, 420, 775, 390], ['L', 775, 280], ['Q', 775, 250, 745, 250], ['L', 130, 250]],
  C: [['M', 880, 70], ['L', 880, 245], ['L', 290, 245], ['Q', 240, 245, 240, 295], ['L', 240, 625], ['Q', 240, 675, 290, 675], ['L', 880, 675], ['L', 880, 850], ['L', 250, 850], ['Q', 60, 850, 60, 660], ['L', 60, 260], ['Q', 60, 70, 250, 70]],
  M: [['M', 120, 80], ['L', 960, 80], ['L', 960, 250], ['L', 545, 250], ['L', 965, 525], ['L', 545, 800], ['L', 960, 800], ['L', 960, 970], ['L', 120, 970], ['L', 120, 800], ['L', 660, 525], ['L', 120, 250]],
};

function forma(cmd) {
  const s = new THREE.Shape();
  const X = (x) => (x / 1000 - 0.5) * LATO;
  const Y = (y) => (0.5 - y / 1000) * LATO;
  for (const c of cmd) {
    if (c[0] === 'M') s.moveTo(X(c[1]), Y(c[2]));
    else if (c[0] === 'L') s.lineTo(X(c[1]), Y(c[2]));
    else s.quadraticCurveTo(X(c[1]), Y(c[2]), X(c[3]), Y(c[4]));
  }
  s.closePath();
  return s;
}

function texSpazzolato() {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 512;
  const g = c.getContext('2d');
  g.fillStyle = '#8a8a8a'; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 2600; i++) {
    const y = Math.random() * 512, v = 100 + Math.random() * 90;
    g.fillStyle = `rgba(${v},${v},${v},${0.25 + Math.random() * 0.35})`;
    g.fillRect(Math.random() * 512 - 200, y, 120 + Math.random() * 420, 1);
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 4;
  return t;
}

function texOmbra() {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d');
  const r = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  r.addColorStop(0, 'rgba(5,10,16,0.75)');
  r.addColorStop(0.5, 'rgba(5,10,16,0.32)');
  r.addColorStop(1, 'rgba(5,10,16,0)');
  g.fillStyle = r; g.fillRect(0, 0, 256, 256);
  return new THREE.CanvasTexture(c);
}

export function avvia(canvas, opzioni = {}) {
  const ridotto = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const mobile = matchMedia('(max-width: 759px)').matches;
  const puntatoreFine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const hero = canvas.closest('.hero');
  const testo = hero.querySelector('.hero-testo');

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, mobile ? 1.5 : 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 1.1;
  scene.environmentRotation = new THREE.Euler(0, -1.4, 0);

  const luce = new THREE.DirectionalLight(0xfff4e0, 1.6);
  luce.position.set(-3, 6, 4);
  scene.add(luce);
  const controluce = new THREE.DirectionalLight(0x7fb2ff, 1.1);
  controluce.position.set(4, 2, -5);
  scene.add(controluce);

  const camera = new THREE.PerspectiveCamera(20, 1, 0.1, 200);
  const DIR = new THREE.Vector3(1, 1, 1).normalize();

  // materiali
  const spazzolato = texSpazzolato();
  const acciaio = new THREE.MeshPhysicalMaterial({ color: 0xdfe4e9, metalness: 1, roughness: 0.34, roughnessMap: spazzolato, clearcoat: 0.35, clearcoatRoughness: 0.25 });
  const smalto = new THREE.MeshPhysicalMaterial({ color: 0x13202f, metalness: 0.25, roughness: 0.3, clearcoat: 0.6, clearcoatRoughness: 0.15 });

  const lastraGeo = new RoundedBoxGeometry(LATO, LATO, SPESS, 4, 0.035);
  const estrudi = { depth: 0.03, bevelEnabled: true, bevelThickness: 0.012, bevelSize: 0.009, bevelSegments: 2, curveSegments: 14 };

  function lastra(lettera) {
    const g = new THREE.Group();
    g.add(new THREE.Mesh(lastraGeo, acciaio));
    if (lettera) {
      const geo = new THREE.ExtrudeGeometry(forma(LETTERE[lettera]), estrudi);
      const m = new THREE.Mesh(geo, smalto);
      m.position.z = SPESS / 2 - 0.006;
      g.add(m);
    }
    return g;
  }

  // struttura: fluttua (posizione, scala) > cubo (rotazione) > fondo + cerniere
  const fluttua = new THREE.Group();
  const cubo = new THREE.Group();
  fluttua.add(cubo);
  scene.add(fluttua);

  const fondo = lastra(null);
  fondo.position.set(0, -1, 0);
  fondo.rotation.x = Math.PI / 2;
  cubo.add(fondo);

  function cerniera(pos, plate, rot) {
    const pivot = new THREE.Group();
    pivot.position.copy(pos);
    plate.position.set(0, 1, 0);
    if (rot) plate.rotation.set(rot[0], rot[1], rot[2]);
    pivot.add(plate);
    cubo.add(pivot);
    return pivot;
  }
  const davanti = cerniera(new THREE.Vector3(0, -1, 1), lastra('P'));                       // +Z: P
  const destra = cerniera(new THREE.Vector3(1, -1, 0), lastra('C'), [0, Math.PI / 2, 0]);   // +X: C
  const sinistra = cerniera(new THREE.Vector3(-1, -1, 0), lastra(null), [0, -Math.PI / 2, 0]);
  const dietro = cerniera(new THREE.Vector3(0, -1, -1), lastra(null), [0, Math.PI, 0]);
  // coperchio incernierato sul bordo alto della lastra dietro
  const coperchio = new THREE.Group();
  coperchio.position.set(0, 2, 0);
  const lastraM = lastra('M');
  lastraM.position.set(0, 0, 1);
  lastraM.rotation.x = -Math.PI / 2;
  coperchio.add(lastraM);
  dietro.add(coperchio);

  // contorno esagonale del logo, fermo davanti alla camera
  const R = new THREE.Vector3(1, 0, -1).normalize();
  const U = new THREE.Vector3(-1, 2, -1).normalize();
  const sil = [[-1, 1, -1], [1, 1, -1], [1, -1, -1], [1, -1, 1], [-1, -1, 1], [-1, 1, 1]].map(([x, y, z]) => {
    const v = new THREE.Vector3(x, y, z);
    return new THREE.Vector2(v.dot(R), v.dot(U)).multiplyScalar(1.14);
  });
  const punti = [];
  sil.forEach((p, i) => {
    const prima = sil[(i + 5) % 6], dopo = sil[(i + 1) % 6];
    const arrot = i === 2 || i === 4 ? 0.34 : 0.1;
    const a = p.clone().lerp(prima, arrot), b = p.clone().lerp(dopo, arrot);
    for (let k = 0; k <= 8; k++) {
      const t = k / 8;
      const q = new THREE.Vector2(
        (1 - t) * (1 - t) * a.x + 2 * (1 - t) * t * p.x + t * t * b.x,
        (1 - t) * (1 - t) * a.y + 2 * (1 - t) * t * p.y + t * t * b.y);
      punti.push(R.clone().multiplyScalar(q.x).add(U.clone().multiplyScalar(q.y)));
    }
  });
  const contornoMat = new THREE.MeshBasicMaterial({ color: 0xe9eef2, transparent: true, opacity: 0, depthWrite: false });
  const contorno = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(punti, true), 220, 0.022, 6, true), contornoMat);
  fluttua.add(contorno);

  const ombraMat = new THREE.MeshBasicMaterial({ map: texOmbra(), transparent: true, depthWrite: false, opacity: 0 });
  const ombra = new THREE.Mesh(new THREE.PlaneGeometry(4.4, 4.4), ombraMat);
  ombra.rotation.x = -Math.PI / 2;
  ombra.position.y = -1.75;
  scene.add(ombra);

  // impaginazione: dove sta il cubo nello schermo
  let W = 1, H = 1;
  function impagina() {
    W = canvas.clientWidth || hero.clientWidth;
    H = canvas.clientHeight || hero.clientHeight;
    renderer.setSize(W, H, false);
    camera.aspect = W / H;
    let cx, cy, hp;
    if (W < 760) {
      const alto = 76;
      const basso = testo.getBoundingClientRect().top - hero.getBoundingClientRect().top - 6;
      const fascia = Math.max(96, basso - alto);
      hp = Math.min(fascia * 0.86, W * 0.62 * 1.155);
      cx = W * 0.5;
      cy = alto + fascia * 0.5;
    } else {
      hp = Math.min(H * 0.56, W * 0.34);
      cx = W * (W > 1200 ? 0.72 : 0.74);
      cy = H * 0.5;
    }
    const d = (ISO_ALTEZZA * H / hp) / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)));
    camera.position.copy(DIR).multiplyScalar(d);
    camera.lookAt(0, 0, 0);
    camera.setViewOffset(W, H, W / 2 - cx, H / 2 - cy, W, H);
    camera.updateProjectionMatrix();
  }
  impagina();
  addEventListener('resize', impagina);

  // stato per fotogramma
  const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
  if (puntatoreFine) {
    addEventListener('pointermove', (e) => {
      mouse.tx = (e.clientX / innerWidth - 0.5) * 2;
      mouse.ty = (e.clientY / innerHeight - 0.5) * 2;
    }, { passive: true });
  }

  function posa(t) {
    // t in secondi dall'avvio
    const piega = (a, b, rimbalzo) => {
      const f = fase(t, a, b);
      return 1 - (rimbalzo ? easeBack(f, rimbalzo) : easeInOut(f));
    };
    davanti.rotation.x = (Math.PI / 2) * piega(0.12, 0.62, 1.2);
    destra.rotation.z = (-Math.PI / 2) * piega(0.26, 0.76, 1.2);
    sinistra.rotation.z = (Math.PI / 2) * piega(0.38, 0.86, 1.2);
    dietro.rotation.x = (-Math.PI / 2) * piega(0.5, 0.98, 1.2);
    coperchio.rotation.x = (-Math.PI / 2) * piega(0.92, 1.42, 2.2);

    const crescita = easeInOut(fase(t, 0, 1.55));
    const colpo = fase(t, 1.38, 1.78);
    const pulsa = colpo > 0 && colpo < 1 ? Math.sin(colpo * Math.PI) * 0.045 * (1 - colpo) : 0;
    fluttua.scale.setScalar(lerp(0.46, 1, crescita) + pulsa);

    const giro = easeInOut(fase(t, 0.2, 1.9));
    cubo.rotation.set(lerp(0.62, 0, giro), lerp(-1.25, 0, giro), lerp(0.1, 0, giro));
    fluttua.position.y = lerp(-0.35, 0, easeOut(fase(t, 0, 1.6)));

    scene.environmentRotation.y = lerp(-1.6, 0.55, easeInOut(fase(t, 1.2, 2.8)));
    contornoMat.opacity = 0.9 * easeOut(fase(t, 1.75, 2.5));
    ombraMat.opacity = 0.55 * easeOut(fase(t, 0.1, 1.2));
  }

  // la piega parte quando le ganasce dell'intro si sono aperte
  const ritardo = Math.max(0, 1.3 - performance.now() / 1000);
  let t0 = null, ultimo = 0, attivo = true, visibile = true, inCorsa = false;
  function fotogramma(ora) {
    inCorsa = false;
    if (t0 === null) t0 = ora;
    const t = Math.max(0, (ora - t0) / 1000 - ritardo);
    const dt = Math.min(0.05, (ora - ultimo) / 1000 || 0.016);
    ultimo = ora;
    posa(t);

    // dopo l'intro: respiro lento + scroll + puntatore
    const dopo = easeInOut(fase(t, 1.9, 3.2));
    const sp = clamp(scrollY / Math.max(1, hero.offsetHeight));
    mouse.x += (mouse.tx - mouse.x) * Math.min(1, dt * 3);
    mouse.y += (mouse.ty - mouse.y) * Math.min(1, dt * 3);
    cubo.rotation.y += dopo * (Math.sin(t * 0.55) * 0.14 + mouse.x * 0.22) + sp * 1.3;
    cubo.rotation.x += dopo * (Math.sin(t * 0.4 + 1) * 0.05 + mouse.y * 0.12) - sp * 0.25;
    fluttua.position.y += dopo * Math.sin(t * 0.9) * 0.06 + sp * 1.2;
    contornoMat.opacity *= 1 - clamp(sp * 2.2);

    renderer.render(scene, camera);
    if (attivo && visibile && !ridotto) { inCorsa = true; requestAnimationFrame(fotogramma); }
  }

  function riparti() {
    if (ridotto) { posa(10); renderer.render(scene, camera); return; }
    if (inCorsa) return;
    ultimo = performance.now();
    inCorsa = true;
    requestAnimationFrame(fotogramma);
  }

  const io = new IntersectionObserver(([e]) => {
    const prima = visibile;
    visibile = e.isIntersecting;
    if (visibile && !prima && attivo) riparti();
  }, { threshold: 0 });
  io.observe(hero);
  document.addEventListener('visibilitychange', () => {
    const prima = attivo;
    attivo = !document.hidden;
    if (attivo && !prima && visibile) riparti();
  });
  addEventListener('resize', () => { if (ridotto) { posa(10); renderer.render(scene, camera); } });

  if (ridotto) { posa(10); renderer.render(scene, camera); }
  else riparti();
  canvas.classList.add('pronto');
  return { renderer };
}
