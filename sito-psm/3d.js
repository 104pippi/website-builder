/* PSM — il favo in 3D dell'hero.
   Celle esagonali che arrivano a onda e si accendono come spie di un quadro,
   al centro il marchio (ape nell'esagono) estruso in metallo lilla.
   Il tempo viene solo da performance.now(): funziona uguale nel video. */
import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { SVGLoader } from "three/addons/loaders/SVGLoader.js";

const hero = document.querySelector("[data-hero]");
const canvas = document.querySelector("[data-scena]");
const testo = hero.querySelector(".hero__testo");
const ridotto = matchMedia("(prefers-reduced-motion: reduce)").matches;
const conPuntatore = matchMedia("(hover: hover) and (pointer: fine)").matches;

const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const mix = (a, b, t) => a + (b - a) * t;
const esceCubica = (t) => 1 - Math.pow(1 - t, 3);
const esceMolla = (t) => {
  const c = 1.45;
  return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2);
};

let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "high-performance" });
} catch (e) {
  renderer = null;
}

if (renderer && renderer.getContext()) avvia();

function avvia() {
  const telefono = () => innerWidth < 760;
  renderer.setPixelRatio(Math.min(devicePixelRatio, telefono() ? 1.5 : 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.setClearColor(0x000000, 0);

  const scena = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scena.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  pmrem.dispose();
  scena.fog = new THREE.Fog(0x15113a, 15, 27);

  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 80);
  const CAM_Z = 16;
  camera.position.set(0, 0, CAM_Z);

  const luceChiave = new THREE.DirectionalLight(0xe8e0ff, 2.2);
  luceChiave.position.set(-8, 6, 10);
  scena.add(luceChiave);
  const luceLilla = new THREE.PointLight(0xb39cf0, 30, 18, 1.6);
  luceLilla.position.set(0, 0, 5);
  scena.add(luceLilla);
  scena.add(new THREE.AmbientLight(0x2e276e, 0.6));

  /* ---------- il favo ---------- */
  const gruppo = new THREE.Group();
  scena.add(gruppo);
  const favo = new THREE.Group();
  gruppo.add(favo);

  const esagono = (r) => {
    const s = new THREE.Shape();
    for (let i = 0; i < 6; i++) {
      const a = Math.PI / 2 + (i * Math.PI) / 3;
      const x = Math.cos(a) * r, y = Math.sin(a) * r;
      if (i === 0) s.moveTo(x, y);
      else s.lineTo(x, y);
    }
    s.closePath();
    return s;
  };
  const sagoma = esagono(0.95);
  sagoma.holes.push(new THREE.Path(esagono(0.79).getPoints()));
  const geoCornice = new THREE.ExtrudeGeometry(sagoma, {
    depth: 1, bevelEnabled: true, bevelThickness: 0.04, bevelSize: 0.035, bevelSegments: 1, curveSegments: 1,
  });
  geoCornice.translate(0, 0, -1);
  const geoFondo = new THREE.ShapeGeometry(esagono(0.8));

  const anelli = telefono() ? 8 : 11;
  const celle = [];
  let seme = 7;
  const caso = () => ((seme = (seme * 16807) % 2147483647) / 2147483647);
  const SQ3 = Math.sqrt(3);
  for (let q = -anelli; q <= anelli; q++) {
    for (let r = Math.max(-anelli, -q - anelli); r <= Math.min(anelli, -q + anelli); r++) {
      const x = SQ3 * (q + r / 2);
      const y = 1.5 * r;
      celle.push({
        x, y,
        d: Math.hypot(x, y),
        prof: 1.3 + caso() * 1.7,
        rilievo: (caso() - 0.5) * 0.5,
        fase: caso() * Math.PI * 2,
        accesa: -10,
      });
    }
  }
  const n = celle.length;
  const matCornice = new THREE.MeshStandardMaterial({ color: 0x3b3388, metalness: 0.6, roughness: 0.36, envMapIntensity: 0.85 });
  const cornici = new THREE.InstancedMesh(geoCornice, matCornice, n);
  const matFondo = new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false });
  const fondi = new THREE.InstancedMesh(geoFondo, matFondo, n);
  cornici.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  fondi.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  favo.add(cornici, fondi);

  const spento = new THREE.Color(0x1b1650);
  const acceso = new THREE.Color(0xd2c2ff);
  const tmpColore = new THREE.Color();
  const tmp = new THREE.Object3D();
  for (let i = 0; i < n; i++) fondi.setColorAt(i, spento);

  /* ---------- il marchio estruso ---------- */
  const marchio = new THREE.Group();
  gruppo.add(marchio);
  let marchioPronto = false;
  let marchioDa = 0;
  new SVGLoader().load("assets/3d/marchio-3d.svg", (dati) => {
    const forme = [];
    dati.paths.forEach((p) => forme.push(...p.toShapes()));
    const geo = new THREE.ExtrudeGeometry(forme, {
      depth: 900, bevelEnabled: true, bevelThickness: 80, bevelSize: 26, bevelSegments: 3, curveSegments: 7,
    });
    geo.computeBoundingBox();
    const bb = geo.boundingBox;
    geo.translate(-(bb.min.x + bb.max.x) / 2, -(bb.min.y + bb.max.y) / 2, -(bb.min.z + bb.max.z) / 2);
    const altezza = bb.max.y - bb.min.y;
    geo.scale(1 / altezza, 1 / altezza, 1 / altezza);
    const fronte = new THREE.MeshStandardMaterial({ color: 0xc4b3ec, metalness: 0.92, roughness: 0.22, envMapIntensity: 1.25 });
    const fianco = new THREE.MeshStandardMaterial({ color: 0x7a63b8, metalness: 0.85, roughness: 0.32, envMapIntensity: 1.0 });
    const mesh = new THREE.Mesh(geo, [fronte, fianco]);
    marchio.add(mesh);
    // l'arrivo parte quando il marchio statico sta già sparendo, così non si vedono due api
    marchioDa = (performance.now() - inizio) / 1000 + 0.3;
    marchioPronto = true;
    disegna(performance.now());
    hero.classList.add("hero--3d");
  });

  /* ---------- impaginazione: il marchio va nello spazio libero accanto al testo ---------- */
  const L = { mx: 0, my: 0, ms: 2 };
  const PIANO_MARCHIO = 2.2;
  const impagina = () => {
    const w = hero.clientWidth, h = hero.clientHeight;
    renderer.setPixelRatio(Math.min(devicePixelRatio, telefono() ? 1.5 : 2));
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    // in verticale celle un po' più piccole: si legge il favo, non un muro
    favo.scale.setScalar(w / h < 1 ? 0.8 : 1);
    const hb = hero.getBoundingClientRect();
    const tb = testo.getBoundingClientRect();
    const testata = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--testata")) || 64;
    let cx, cy, alt;
    if (w / h < 1 || w < 900) {
      const libero = tb.top - hb.top - testata;
      cx = w / 2;
      cy = testata + libero * 0.5;
      alt = Math.min(libero * 0.72, w * 0.5, 300);
    } else {
      const destra = Math.min(tb.left - hb.left + testo.querySelector(".hero__titolo").getBoundingClientRect().width, w * 0.55);
      cx = destra + (w - destra) * 0.5;
      cy = h * 0.52;
      alt = Math.min(h * 0.42, (w - destra) * 0.62, 420);
    }
    const dist = CAM_Z - PIANO_MARCHIO;
    const semiH = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * dist;
    const semiW = semiH * camera.aspect;
    L.mx = (cx / w - 0.5) * 2 * semiW;
    L.my = (0.5 - cy / h) * 2 * semiH;
    L.ms = (alt / h) * 2 * semiH;
  };

  /* ---------- puntatore (solo desktop) ---------- */
  const punt = { x: 0, y: 0, tx: 0, ty: 0 };
  if (conPuntatore) {
    addEventListener("pointermove", (e) => {
      punt.tx = (e.clientX / innerWidth) * 2 - 1;
      punt.ty = (e.clientY / innerHeight) * 2 - 1;
    }, { passive: true });
  }

  /* ---------- animazione ---------- */
  const inizio = performance.now();
  let ultimo = inizio;
  let prossimaScintilla = 0.9;
  let indiceScintilla = 3;

  function disegna(ora) {
    const t = ridotto ? 6 : (ora - inizio) / 1000;
    const dt = Math.min(0.05, (ora - ultimo) / 1000);
    ultimo = ora;

    const hb = hero.getBoundingClientRect();
    const s = clamp(-hb.top / Math.max(1, hb.height));

    punt.x += (punt.tx - punt.x) * Math.min(1, dt * 3);
    punt.y += (punt.ty - punt.y) * Math.min(1, dt * 3);

    // il favo si centra sul marchio, così l'onda parte da lì
    gruppo.position.set(L.mx, L.my, 0);
    favo.position.z = 0;
    favo.rotation.x = -0.32 - s * 0.45 + punt.y * 0.05;
    favo.rotation.y = 0.22 + Math.sin(t * 0.13) * 0.06 + punt.x * 0.08;

    // scintille: una cella alla volta si accende come una spia
    if (!ridotto) {
      while (t > prossimaScintilla) {
        indiceScintilla = (indiceScintilla * 7919 + 104729) % n;
        celle[indiceScintilla].accesa = prossimaScintilla;
        prossimaScintilla += 0.075;
      }
    }

    const ondaIntro = (t - 0.25) * 8.5;
    for (let i = 0; i < n; i++) {
      const c = celle[i];
      const e = ridotto ? 1 : esceCubica(clamp((t - 0.1 - c.d * 0.045) / 1.15));
      const nido = -1.1 * Math.exp(-(c.d * c.d) / 9);
      const onda = 0.3 * Math.sin(t * 0.9 - c.d * 0.5 + c.fase * 0.15);
      const z = mix(-10, c.rilievo + nido + onda, e);
      const sc = mix(0.35, 1, e);

      tmp.position.set(c.x, c.y, z);
      tmp.rotation.set(0, 0, 0);
      tmp.scale.set(sc, sc, c.prof);
      tmp.updateMatrix();
      cornici.setMatrixAt(i, tmp.matrix);

      tmp.position.set(c.x, c.y, z - c.prof * 0.94);
      tmp.scale.set(sc, sc, 1);
      tmp.updateMatrix();
      fondi.setMatrixAt(i, tmp.matrix);

      // luce: onda d'arrivo + spia accesa che si spegne piano
      const anello = t < 4 ? Math.exp(-Math.pow(c.d - ondaIntro, 2) / 1.6) * 0.95 : 0;
      const x = t - c.accesa;
      const spia = x < 0 ? 0 : x < 0.22 ? x / 0.22 : Math.exp(-(x - 0.22) * 1.7);
      const g = Math.min(1, Math.max(anello, spia) * e);
      tmpColore.copy(spento).lerp(acceso, g);
      fondi.setColorAt(i, tmpColore);
    }
    cornici.instanceMatrix.needsUpdate = true;
    fondi.instanceMatrix.needsUpdate = true;
    fondi.instanceColor.needsUpdate = true;

    // il marchio arriva di taglio e si gira verso di noi
    if (marchioPronto) {
      const m = ridotto ? 1 : clamp((t - marchioDa) / 1.7);
      const em = esceMolla(m);
      marchio.scale.setScalar(L.ms * mix(0.6, 1, esceCubica(m)));
      marchio.position.set(0, Math.sin(t * 1.15) * 0.06 + s * 1.6, mix(-4, PIANO_MARCHIO, esceCubica(m)));
      marchio.rotation.y = mix(-Math.PI * 0.62, 0, em) + Math.sin(t * 0.45) * 0.16 + punt.x * 0.3;
      marchio.rotation.x = Math.sin(t * 0.62) * 0.06 + punt.y * 0.18 - s * 0.7;
    }

    // la luce passa sul metallo durante l'arrivo, poi gira piano
    const giro = ridotto ? 1.2 : t;
    luceChiave.position.set(mix(-14, 9, clamp((giro - 0.2) / 2.2)) + Math.sin(giro * 0.35) * 3, 6 + Math.cos(giro * 0.3) * 2, 10);
    luceLilla.position.set(L.mx + punt.x * 3 + Math.sin(giro * 0.5) * 2.5, L.my - punt.y * 2 + Math.cos(giro * 0.4) * 1.5, 5);

    camera.position.set(0, -s * 1.2, CAM_Z - s * 3.5);
    camera.lookAt(0, -s * 1.2, 0);

    renderer.render(scena, camera);
  }

  /* ---------- ciclo: fermo fuori schermo e con la scheda nascosta ---------- */
  let visibile = true;
  let ciclo = 0;
  const gira = (ora) => {
    ciclo = 0;
    if (!visibile || document.hidden) return;
    disegna(performance.now());
    ciclo = requestAnimationFrame(gira);
  };
  const riparti = () => {
    if (ridotto) { disegna(performance.now()); return; }
    if (!ciclo && visibile && !document.hidden) ciclo = requestAnimationFrame(gira);
  };
  new IntersectionObserver((v) => {
    visibile = v[0].isIntersecting;
    if (visibile) riparti();
  }).observe(hero);
  document.addEventListener("visibilitychange", riparti);
  new ResizeObserver(() => { impagina(); disegna(performance.now()); }).observe(hero);

  impagina();
  disegna(performance.now());
  if (!ridotto) riparti();
  // se il marchio tarda, il favo compare lo stesso
  setTimeout(() => hero.classList.add("hero--3d"), 1400);
}
