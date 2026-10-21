// Il simbolo Ateikon in 3D: tre pezzi laccati che si incastrano, poi si aprono in un esploso da catalogo ricambi.
import * as THREE from 'three';
import { SVGLoader } from 'three/addons/loaders/SVGLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const lerp = (a, b, k) => a + (b - a) * k;
const easeInOut = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
const easeOutBack = (x) => { const c = 1.35; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); };

export async function avvia() {
  const html = document.documentElement;
  const canvas = document.getElementById('scena3d');
  const svgHero = document.getElementById('segno-hero');
  const svgPalco = document.getElementById('segno-palco');
  const { esploso, palco } = window.__palco;
  const richiami = [...document.querySelectorAll('#richiami .richiamo')];
  const posizioni = [...document.querySelectorAll('.posizione')];
  const mobile = matchMedia('(max-width: 999px)').matches;
  const ridotto = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const mouse = matchMedia('(hover: hover) and (pointer: fine)').matches;

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  } catch (err) {
    html.classList.add('no-webgl');
    return;
  }
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, mobile ? 1.5 : 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 0.8;
  renderer.setClearColor(0x000000, 0);

  const scena = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scena.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  pmrem.dispose();

  const camera = new THREE.PerspectiveCamera(30, 1, 1, 60);
  camera.position.set(0, 0, 12);

  const luce = new THREE.DirectionalLight(0xffffff, 2.3);
  luce.position.set(-6, 5, 7);
  scena.add(luce);
  const controluce = new THREE.DirectionalLight(0xfff1ec, 0.35);
  controluce.position.set(6, -4, 3);
  scena.add(controluce);

  /* geometria: gli stessi tracciati del poster SVG, così il passaggio piatto → solido non si vede */
  const tracciati = [...svgHero.querySelectorAll('path')].map((p) => `<path d="${p.getAttribute('d')}"/>`).join('');
  const dati = new SVGLoader().parse(`<svg xmlns="http://www.w3.org/2000/svg">${tracciati}</svg>`);
  const PROF = 34, BEV = 7;
  const ESPLOSO = mobile ? 54 : 66, SPINTA = mobile ? 14 : 20, AVANTI = mobile ? 30 : 42;
  const geometrie = dati.paths.map((p) => {
    const g = new THREE.ExtrudeGeometry(p.toShapes(true), {
      depth: PROF, bevelEnabled: true, bevelThickness: BEV, bevelSize: 4.5, bevelOffset: -2.5, bevelSegments: 6, curveSegments: 40,
    });
    g.computeBoundingBox();
    return g;
  });
  const tutto = new THREE.Box3();
  geometrie.forEach((g) => tutto.union(g.boundingBox));
  const C = tutto.getCenter(new THREE.Vector3());

  const rosso = new THREE.Color('#E20E18');
  const grigio = new THREE.Color('#B7B8B3');
  const segno = new THREE.Group();
  scena.add(segno);
  const pezzi = geometrie.map((g, i) => {
    const c = g.boundingBox.getCenter(new THREE.Vector3());
    const dim = g.boundingBox.getSize(new THREE.Vector3());
    g.translate(-c.x, -c.y, -PROF / 2);
    const mat = new THREE.MeshPhysicalMaterial({
      color: rosso.clone(), roughness: 0.4, metalness: 0.05, clearcoat: 0.55, clearcoatRoughness: 0.1, envMapIntensity: 0.24,
    });
    const m = new THREE.Mesh(g, mat);
    const base = new THREE.Vector3(c.x - C.x, c.y - C.y, 0);
    m.position.copy(base);
    segno.add(m);
    const dir = new THREE.Vector2(base.x, base.y).normalize();
    return {
      m, mat, base, dir,
      raggio: 0.5 * Math.hypot(dim.x, dim.y),
      z: [28, -16, 18][i],
      rot: [[0.32, -0.28, 0.1], [-0.26, 0.34, -0.12], [0.3, 0.22, 0.08]][i],
      enfasi: 0, spento: 0,
    };
  });

  /* misure delle due ancore (hero e palco) in coordinate SVG → schermo */
  let W = 1, H = 1, ancA = null, ancB = null;
  const leggi = (svg) => {
    const r = svg.getBoundingClientRect();
    const vb = svg.viewBox.baseVal;
    return { left: r.left, top: r.top, width: r.width, height: r.height, vb };
  };
  const misura = () => {
    W = canvas.clientWidth || innerWidth;
    H = canvas.clientHeight || innerHeight;
    renderer.setSize(W, H, false);
    camera.aspect = W / H;
    camera.updateProjectionMatrix();
    const a = leggi(svgHero);
    ancA = { ...a, top: a.top + scrollY };
    const b = leggi(svgPalco);
    const pr = palco.getBoundingClientRect();
    ancB = { ...b, left: b.left - pr.left, top: b.top - pr.top };
  };
  const mappa = (r, dx, dy) => {
    const k = Math.min(r.width / r.vb.width, r.height / r.vb.height);
    const ox = dx + r.left + (r.width - r.vb.width * k) / 2 - r.vb.x * k;
    const oy = dy + r.top + (r.height - r.vb.height * k) / 2 - r.vb.y * k;
    return { k, x: ox + C.x * k, y: oy + C.y * k };
  };

  let ultimaW = innerWidth, ultimaH = innerHeight;
  addEventListener('resize', () => {
    if (innerWidth === ultimaW && Math.abs(innerHeight - ultimaH) < 140) return;
    ultimaW = innerWidth; ultimaH = innerHeight;
    misura();
  });
  addEventListener('load', misura);
  misura();
  setTimeout(misura, 1200);

  /* puntatore: solo un extra su desktop */
  let pX = 0, pY = 0, mX = 0, mY = 0;
  if (mouse) addEventListener('pointermove', (e) => { pX = e.clientX / innerWidth - 0.5; pY = e.clientY / innerHeight - 0.5; }, { passive: true });

  await renderer.compileAsync(scena, camera);

  /* passaggio dal poster piatto al solido, finita l'intro CSS */
  let tGiro = Infinity;
  const intro = window.__introInizio ?? performance.now();
  setTimeout(() => {
    html.classList.add('webgl-pronto');
    tGiro = performance.now() + 220;
  }, Math.max(0, intro + 1550 - performance.now()));

  const prima = new THREE.Vector3();
  const v = new THREE.Vector3();
  let ultimo = performance.now();
  let e = 0, rotX = 0, rotY = 0;
  let acceso = true, raf = 0;

  const fotogramma = () => {
    raf = 0;
    const ora = performance.now();
    const dt = Math.min(0.05, (ora - ultimo) / 1000);
    ultimo = ora;
    const ammorbidisci = (k) => 1 - Math.exp(-dt * k);

    const st = window.__statoPalco();
    const pr = palco.getBoundingClientRect();

    /* dove sta il simbolo sullo schermo */
    const ma = mappa(ancA, 0, 0);
    let pos;
    if (st.t < 1) {
      const mb = mappa(ancB, pr.left, 0);
      const k = easeInOut(st.t);
      pos = { x: lerp(ma.x, mb.x, k), y: lerp(ma.y, mb.y, k), k: lerp(ma.k, mb.k, k) };
    } else {
      pos = mappa(ancB, pr.left, pr.top);
    }
    const wpp = (2 * camera.position.z * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2))) / H;
    segno.position.set((pos.x - W / 2) * wpp, -(pos.y - H / 2) * wpp, 0);
    const s = pos.k * wpp;
    segno.scale.set(s, -s, s);

    /* rotazione: giro iniziale, respiro, giro completo nel viaggio, vista di tre quarti nell'esploso */
    const tau = ora / 1000;
    const giro = ridotto ? 1 : clamp((ora - tGiro) / 1700, 0, 1);
    const g = ridotto ? (Number.isFinite(tGiro) ? 1 : 0) : easeOutBack(giro);
    const respiro = ridotto ? 0 : giro;
    e = lerp(e, st.e, ammorbidisci(9));
    const viaggio = easeInOut(st.t);
    mX = lerp(mX, pX, ammorbidisci(4));
    mY = lerp(mY, pY, ammorbidisci(4));
    const tY = g * -0.48 + respiro * 0.14 * Math.sin(tau * 0.55) + viaggio * Math.PI * 2 + e * 0.56 + mX * 0.35;
    const tX = g * 0.16 + respiro * 0.05 * Math.sin(tau * 0.8) - e * 0.06 + mY * 0.25;
    rotY = lerp(rotY, tY, ammorbidisci(10));
    rotX = lerp(rotX, tX, ammorbidisci(10));
    segno.rotation.set(rotX, rotY, 0);

    /* esploso: ogni pezzo esce lungo la sua direzione, quello del settore attivo viene avanti */
    pezzi.forEach((pz, i) => {
      const attivo = st.s >= 1 && st.s <= 3 && st.s - 1 === i;
      const altri = st.s >= 1 && st.s <= 3 && !attivo;
      pz.enfasi = lerp(pz.enfasi, attivo ? 1 : 0, ammorbidisci(7));
      pz.spento = lerp(pz.spento, altri ? 1 : 0, ammorbidisci(7));
      const fuori = e * ESPLOSO + pz.enfasi * SPINTA;
      pz.m.position.set(
        pz.base.x + pz.dir.x * fuori,
        pz.base.y + pz.dir.y * fuori,
        e * pz.z + pz.enfasi * AVANTI,
      );
      const vibra = respiro * e * 0.06 * Math.sin(tau * 0.9 + i * 2.1);
      pz.m.rotation.set(e * pz.rot[0] + vibra, e * pz.rot[1] - pz.enfasi * 0.2, e * pz.rot[2]);
      pz.mat.color.copy(rosso).lerp(grigio, pz.spento * 0.94);
      pz.mat.metalness = 0.05 + pz.spento * 0.5;
    });

    /* luce che scivola sulla lacca durante il giro */
    luce.position.x = lerp(-9, -4, giro) + Math.sin(tau * 0.3) * 1.5 * respiro;

    renderer.render(scena, camera);

    /* richiami e numeri di posizione, nel sistema del palco */
    const vis = clamp((e - 0.35) / 0.4, 0, 1);
    segno.updateMatrixWorld();
    pezzi.forEach((pz, i) => {
      pz.m.getWorldPosition(prima);
      prima.project(camera);
      const cx = (prima.x * 0.5 + 0.5) * W - pr.left;
      const cy = (-prima.y * 0.5 + 0.5) * H - pr.top;
      const L = pz.raggio * pos.k * 0.62 + 30;
      const dx = pz.dir.x, dy = pz.dir.y;
      const tx = clamp(cx + dx * L, ancB.left + 20, ancB.left + ancB.width - 20);
      const ty = clamp(cy + dy * L, ancB.top + 20, ancB.top + ancB.height - 20);
      const sx = cx + dx * pz.raggio * pos.k * 0.18, sy = cy + dy * pz.raggio * pos.k * 0.18;
      const el = posizioni[i];
      el.style.transform = `translate(${tx.toFixed(1)}px, ${ty.toFixed(1)}px)`;
      el.style.opacity = vis.toFixed(3);
      el.classList.toggle('attiva', st.s - 1 === i);
      const ln = richiami[i];
      ln.setAttribute('x1', sx.toFixed(1)); ln.setAttribute('y1', sy.toFixed(1));
      const lx = tx - sx, ly = ty - sy, ll = Math.hypot(lx, ly) || 1;
      ln.setAttribute('x2', (tx - lx / ll * 17).toFixed(1)); ln.setAttribute('y2', (ty - ly / ll * 17).toFixed(1));
      ln.style.opacity = (vis * 0.85).toFixed(3);
    });

    if (acceso) raf = requestAnimationFrame(fotogramma);
  };

  /* il ciclo gira solo finché hero e palco sono sullo schermo, e con la scheda visibile */
  const controlla = () => {
    const sotto = esploso.getBoundingClientRect().bottom > -40;
    const vuole = sotto && document.visibilityState === 'visible';
    canvas.classList.toggle('spenta', !sotto);
    if (vuole && !acceso) {
      acceso = true;
      ultimo = performance.now();
      if (!raf) raf = requestAnimationFrame(fotogramma);
    } else if (!vuole) {
      acceso = false;
    }
  };
  addEventListener('scroll', controlla, { passive: true });
  document.addEventListener('visibilitychange', controlla);
  controlla();
  raf = requestAnimationFrame(fotogramma);
}
