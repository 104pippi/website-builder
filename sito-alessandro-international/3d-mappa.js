/* Mappa 3D dei centri autorizzati: l'Italia è una lastra laccata rouge noir,
   ogni centro è una goccia di smalto che cade partendo dalla sede di San Vendemiano. */
import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";

const S = 0.36;
const LON0 = 12.45, LAT0 = 41.9, COS = Math.cos(LAT0 * Math.PI / 180);
const SEDE = [45.889, 12.335];
const SPESSORE = 0.07, SMUSSO = 0.025;
const TOP = SPESSORE + SMUSSO;
const proietta = (lat, lon) => new THREE.Vector2((lon - LON0) * COS * S, (lat - LAT0) * S);

const easeOut = (t) => 1 - Math.pow(1 - t, 3);
const lerp = (a, b, t) => a + (b - a) * t;

export async function avvia(canvas, dati, opz = {}) {
  const mobile = matchMedia("(max-width: 767px)").matches;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, mobile ? 1.5 : 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NeutralToneMapping;

  const scena = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scena.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  const luce = new THREE.DirectionalLight(0xffffff, 1.3);
  luce.position.set(-3, -4, 6);
  scena.add(luce);

  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 80);
  camera.up.set(0, 0, 1);

  // lastra d'Italia
  const forme = dati.italia.map((anello) => new THREE.Shape(anello.map(([lon, lat]) => proietta(lat, lon))));
  const lastra = new THREE.Mesh(
    new THREE.ExtrudeGeometry(forme, { depth: SPESSORE, bevelEnabled: true, bevelThickness: SMUSSO, bevelSize: 0.02, bevelSegments: 4, curveSegments: 2 }),
    new THREE.MeshPhysicalMaterial({ color: 0x3d2930, roughness: 0.26, clearcoat: 1, clearcoatRoughness: 0.05 })
  );
  scena.add(lastra);

  // gocce
  const geoGoccia = new THREE.SphereGeometry(1, mobile ? 12 : 16, mobile ? 8 : 12);
  const centri = dati.centri.map((c, i) => {
    const p = proietta(c[1], c[2]);
    const dist = Math.hypot(c[1] - SEDE[0], (c[2] - SEDE[1]) * 0.72) * 111;
    const caso = Math.sin(i * 12.9898) * 43758.5453;
    return { i, x: p.x, y: p.y, oro: !!c[3], ritardo: 0.25 + dist / 1000 * 2.4 + (caso - Math.floor(caso)) * 0.35, evid: 0, evidT: 0 };
  });
  const normali = centri.filter((c) => !c.oro);
  const ori = centri.filter((c) => c.oro);
  const mNormali = new THREE.InstancedMesh(geoGoccia, new THREE.MeshPhysicalMaterial({ color: 0xf0cfd0, roughness: 0.14, clearcoat: 1, clearcoatRoughness: 0.04 }), normali.length);
  const mOri = new THREE.InstancedMesh(geoGoccia, new THREE.MeshPhysicalMaterial({ color: 0xd2a862, metalness: 1, roughness: 0.22 }), ori.length);
  [mNormali, mOri].forEach((m) => { m.instanceMatrix.setUsage(THREE.DynamicDrawUsage); scena.add(m); });

  // sede: goccia rossa con un anello che pulsa
  const pSede = proietta(SEDE[0], SEDE[1]);
  const sede = new THREE.Mesh(geoGoccia, new THREE.MeshPhysicalMaterial({ color: 0xc22b2c, roughness: 0.12, clearcoat: 1 }));
  sede.scale.set(0.04, 0.04, 0.028);
  sede.position.set(pSede.x, pSede.y, TOP + 0.02);
  const anello = new THREE.Mesh(new THREE.RingGeometry(0.9, 1, 48), new THREE.MeshBasicMaterial({ color: 0xc22b2c, transparent: true, depthWrite: false }));
  anello.position.set(pSede.x, pSede.y, TOP + 0.004);
  scena.add(sede, anello);

  // segnaposto della ricerca
  const tu = new THREE.Mesh(geoGoccia, new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.1, clearcoat: 1 }));
  tu.scale.set(0.034, 0.034, 0.034);
  tu.visible = false;
  const anelloTu = anello.clone();
  anelloTu.material = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, depthWrite: false });
  anelloTu.visible = false;
  scena.add(tu, anelloTu);

  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), pos = new THREE.Vector3(), sc = new THREE.Vector3();
  const ALTO = 1.1, CADUTA = 0.55;
  function aggiornaGocce(t, mesh, lista, r) {
    let cambiato = false;
    lista.forEach((c, k) => {
      const tt = t - c.ritardo;
      let z, sx = r, sz = r * 0.62;
      if (tt <= 0) { z = TOP + ALTO; sx = 0; sz = 0; }
      else if (tt < CADUTA) { const f = tt / CADUTA; z = TOP + ALTO * (1 - f * f); sz = r * 0.62 * (1 + 0.5 * f); sx = r * (1 - 0.15 * f); }
      else {
        const f = Math.min((tt - CADUTA) / 0.32, 1);
        const molla = Math.sin(f * Math.PI * 2.2) * Math.exp(-f * 4) * 0.45;
        z = TOP; sz = r * 0.62 * (1 - molla); sx = r * (1 + molla * 0.5);
      }
      c.evid += (c.evidT - c.evid) * 0.12;
      const e = 1 + c.evid * 0.9;
      pos.set(c.x, c.y, z + sz * 0.55 * e);
      sc.set(sx * e, sx * e, sz * e);
      m4.compose(pos, q, sc);
      mesh.setMatrixAt(k, m4);
      cambiato = true;
    });
    if (cambiato) mesh.instanceMatrix.needsUpdate = true;
  }

  // camera: vista da sud, inclinata, con una lenta oscillazione
  const fuoco = new THREE.Vector3(0, -0.05, 0), fuocoT = fuoco.clone();
  let raggio = 8, raggioT = 8, raggioBase = 8;
  function adatta() {
    const r = canvas.parentElement.getBoundingClientRect();
    const w = Math.max(r.width, 1), h = Math.max(r.height, 1);
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    const t = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    raggioBase = Math.max(3.55 / (2 * t), 3.7 / (2 * t * camera.aspect)) * 1.02;
    if (!cercato) { raggio = raggioT = raggioBase; }
    disegna(performance.now());
  }

  const puntatore = { x: 0, tx: 0 };
  if (matchMedia("(hover: hover) and (pointer: fine)").matches) {
    canvas.parentElement.addEventListener("pointermove", (e) => {
      const r = canvas.getBoundingClientRect();
      puntatore.tx = ((e.clientX - r.left) / r.width - 0.5) * 2;
    });
    canvas.parentElement.addEventListener("pointerleave", () => { puntatore.tx = 0; });
  }

  let t0 = -1;
  let cercato = false;
  function disegna(ora) {
    const t = t0 < 0 ? 0 : (ora - t0) / 1000;
    aggiornaGocce(opz.fermo ? 99 : t, mNormali, normali, mobile ? 0.019 : 0.017);
    aggiornaGocce(opz.fermo ? 99 : t, mOri, ori, mobile ? 0.026 : 0.024);
    const s = (ora / 1000) % 2.4 / 2.4;
    anello.scale.setScalar(0.04 + easeOut(s) * 0.16);
    anello.material.opacity = 0.7 * (1 - s);
    if (anelloTu.visible) { anelloTu.scale.setScalar(0.04 + easeOut(s) * 0.12); anelloTu.material.opacity = 0.9 * (1 - s); }

    fuoco.lerp(fuocoT, 0.06);
    raggio = lerp(raggio, raggioT, 0.06);
    puntatore.x += (puntatore.tx - puntatore.x) * 0.05;
    const tsec = ora / 1000;
    const az = Math.sin(tsec * 0.13) * 0.2 + puntatore.x * 0.25;
    const pol = 0.86 + Math.sin(tsec * 0.09) * 0.04;
    camera.position.set(
      fuoco.x + Math.sin(az) * raggio * Math.sin(pol),
      fuoco.y - Math.cos(az) * raggio * Math.sin(pol),
      raggio * Math.cos(pol)
    );
    camera.lookAt(fuoco);
    renderer.render(scena, camera);
  }

  let attivo = false, visibile = false;
  function ciclo() { if (!attivo) return; disegna(performance.now()); requestAnimationFrame(ciclo); }
  const avviaCiclo = () => { if (!attivo && visibile && !document.hidden && !opz.fermo) { attivo = true; requestAnimationFrame(ciclo); } };
  new IntersectionObserver((v) => {
    visibile = v[0].isIntersecting;
    if (visibile && t0 < 0) t0 = performance.now();
    if (visibile) { avviaCiclo(); if (opz.fermo) disegna(performance.now()); } else attivo = false;
  }, { threshold: 0.15 }).observe(canvas);
  document.addEventListener("visibilitychange", () => (document.hidden ? (attivo = false) : avviaCiclo()));
  new ResizeObserver(adatta).observe(canvas.parentElement);
  adatta();

  return {
    cerca(lat, lon, indici) {
      cercato = true;
      const p = proietta(lat, lon);
      fuocoT.set(p.x, p.y, 0);
      raggioT = raggioBase * 0.42;
      tu.position.set(p.x, p.y, TOP + 0.03);
      anelloTu.position.set(p.x, p.y, TOP + 0.006);
      tu.visible = anelloTu.visible = true;
      const scelti = new Set(indici);
      centri.forEach((c) => { c.evidT = scelti.has(c.i) ? 1 : 0; });
      if (t0 < 0) t0 = performance.now() - 10000;
      if (opz.fermo) { fuoco.copy(fuocoT); raggio = raggioT; centri.forEach((c) => { c.evid = c.evidT; }); disegna(performance.now()); }
    },
  };
}
