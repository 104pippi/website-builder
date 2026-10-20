/* Gruppo Carollo — "Dal profilo alla finestra".
   Un profilo in alluminio a taglio termico (costruito in codice) si estrude con lo scroll,
   viene tagliato a 45°, quattro barre si chiudono in un telaio, entra il vetro, cambia il colore. */
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const MM = 0.001;
const W = 1.1;          // larghezza finestra (m)
const H = 1.4;          // altezza finestra (m)
const PROF = 80;        // profondità del profilo (mm)
const BATTUTA = 58;     // dove il vetro entra nel profilo (mm dal bordo esterno)

const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const liscio = (x) => { x = clamp(x); return x * x * (3 - 2 * x); };
const morbido = (x) => { x = clamp(x); return x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };
const tra = (q, a, b) => clamp((q - a) / (b - a));

/* ---- Sezione del profilo: u = dal bordo esterno verso il vetro, v = dall'esterno all'interno (mm) ---- */
const rett = (u0, v0, u1, v1) => [[u0, v0], [u1, v0], [u1, v1], [u0, v1]];
function forma(punti, buchi = []) {
  const s = new THREE.Shape(punti.map(([u, v]) => new THREE.Vector2(u * MM, (v - PROF / 2) * MM)));
  buchi.forEach((b) => s.holes.push(new THREE.Path(b.map(([u, v]) => new THREE.Vector2(u * MM, (v - PROF / 2) * MM)))));
  return s;
}
const SEZIONE = {
  guscioEsterno: forma(
    [[0, 0], [62, 0], [62, 13], [56, 13], [56, 27], [45, 27], [45, 31], [35, 31], [35, 27], [15, 27], [15, 31], [5, 31], [5, 27], [0, 27]],
    [rett(4, 4, 26, 23), rett(30, 4, 52, 23)]
  ),
  guscioInterno: forma(
    [[0, 80], [62, 80], [62, 67], [56, 67], [56, 53], [45, 53], [45, 49], [35, 49], [35, 53], [15, 53], [15, 49], [5, 49], [5, 53], [0, 53]],
    [rett(4, 57, 26, 76), rett(30, 57, 52, 76)]
  ),
  barretta1: forma(rett(7, 31, 13, 49)),
  barretta2: forma(rett(37, 31, 43, 49)),
  guarnizioneEsterna: forma(rett(58, 13, 62, 24)),
  guarnizioneInterna: forma(rett(58, 56, 62, 67)),
};

/* Geometria di una barra lunga L con taglio a 45° (m = 0 dritto, 1 a 45°) */
function barra(shape, L, m) {
  const g = new THREE.ExtrudeGeometry(shape, { depth: 1, steps: 1, bevelEnabled: false, curveSegments: 2 });
  g.userData.base = Float32Array.from(g.attributes.position.array);
  allunga(g, L, m);
  return g;
}
function allunga(g, L, m) {
  const base = g.userData.base;
  const a = g.attributes.position.array;
  for (let i = 0; i < a.length; i += 3) {
    const u = base[i];
    a[i + 2] = base[i + 2] > .5 ? L - m * u : m * u;
  }
  g.attributes.position.needsUpdate = true;
  g.computeVertexNormals();
  g.computeBoundingSphere();
}

export async function avvia(sezione, opzioni = {}) {
  const ridotto = !!opzioni.ridotto;
  const palco = sezione.querySelector('.profilo__palco');
  const tela = sezione.querySelector('.profilo__tela');
  const mobile = () => window.innerWidth < 760;

  const renderer = new THREE.WebGLRenderer({ canvas: tela, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  const scena = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scena.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  pmrem.dispose();

  const camera = new THREE.PerspectiveCamera(35, 1, 0.01, 60);

  const luce = new THREE.DirectionalLight(0xffffff, 2.4);
  scena.add(luce);
  const controluce = new THREE.DirectionalLight(0xa9c2d4, 1.2);
  controluce.position.set(-3, 1.5, -2.5);
  scena.add(controluce);

  /* Materiali: lati verniciati (cambiano colore), tagli in alluminio vivo, isolanti scuri, vetro */
  const COLORI = {
    grezzo: { c: new THREE.Color(0xc5cacd), metal: 1, rough: .27 },
    antracite: { c: new THREE.Color(0x454c51), metal: .62, rough: .3 },
    bianco: { c: new THREE.Color(0xe6e8e6), metal: .2, rough: .34 },
    bronzo: { c: new THREE.Color(0x5f4a3a), metal: .65, rough: .33 },
  };
  const lati = new THREE.MeshStandardMaterial({ color: COLORI.grezzo.c.clone(), metalness: 1, roughness: .27 });
  const taglio = new THREE.MeshStandardMaterial({ color: 0xe2e6e9, metalness: 1, roughness: .18 });
  const isolante = new THREE.MeshStandardMaterial({ color: 0x1f2123, metalness: 0, roughness: .72 });
  const vetroMat = new THREE.MeshPhysicalMaterial({
    color: 0xcfe2ea, metalness: 0, roughness: .03, transparent: true, opacity: 0,
    clearcoat: 1, clearcoatRoughness: .02, envMapIntensity: 1.5, side: THREE.DoubleSide, depthWrite: false,
  });

  /* Le quattro barre del telaio: [posizione, rotazione, lunghezza] */
  const POSTI = [
    [-W / 2, -H / 2, 0, W],          // sotto (è la barra che nasce davanti alla camera)
    [W / 2, -H / 2, Math.PI / 2, H], // destra
    [W / 2, H / 2, Math.PI, W],      // sopra
    [-W / 2, H / 2, -Math.PI / 2, H] // sinistra
  ];
  const BASE = new THREE.Matrix4().makeBasis(new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, 1), new THREE.Vector3(1, 0, 0));
  const finestra = new THREE.Group();
  scena.add(finestra);
  const barre = POSTI.map(([x, y, rz, L], k) => {
    const lato = new THREE.Group();
    lato.position.set(x, y, 0);
    lato.rotation.z = rz;
    const orienta = new THREE.Group();
    orienta.matrixAutoUpdate = false;
    orienta.matrix.copy(BASE);
    lato.add(orienta);
    const geometrie = [];
    const pezzi = [
      [SEZIONE.guscioEsterno, [taglio, lati]],
      [SEZIONE.guscioInterno, [taglio, lati]],
      [SEZIONE.barretta1, isolante],
      [SEZIONE.barretta2, isolante],
      [SEZIONE.guarnizioneEsterna, isolante],
      [SEZIONE.guarnizioneInterna, isolante],
    ];
    pezzi.forEach(([s, mat]) => {
      const g = barra(s, k === 0 ? 0.012 : L, k === 0 ? 0 : 1);
      geometrie.push(g);
      orienta.add(new THREE.Mesh(g, mat));
    });
    finestra.add(lato);
    return { lato, geometrie, L, x, y, rz, k };
  });

  const vetro = new THREE.Mesh(new THREE.BoxGeometry(W - 2 * BATTUTA * MM, H - 2 * BATTUTA * MM, 0.032), vetroMat);
  vetro.renderOrder = 2;
  finestra.add(vetro);
  // riflesso che scivola sul vetro, come nelle ante dell'intro
  const tc = document.createElement('canvas');
  tc.width = 256; tc.height = 16;
  const cx = tc.getContext('2d');
  const gr = cx.createLinearGradient(0, 0, 256, 0);
  gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(.42, 'rgba(255,255,255,0)');
  gr.addColorStop(.5, 'rgba(255,255,255,.9)'); gr.addColorStop(.56, 'rgba(255,255,255,.15)'); gr.addColorStop(.66, 'rgba(255,255,255,0)');
  cx.fillStyle = gr; cx.fillRect(0, 0, 256, 16);
  const tex = new THREE.CanvasTexture(tc);
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.center.set(.5, .5); tex.rotation = -.5;
  const riflessoMat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
  const riflesso = new THREE.Mesh(new THREE.PlaneGeometry(W - 2 * BATTUTA * MM, H - 2 * BATTUTA * MM), riflessoMat);
  riflesso.position.z = 0.0165;
  riflesso.renderOrder = 3;
  vetro.add(riflesso);

  /* Camera: inquadrature legate al progresso (bersaglio, direzione, misura da far stare nel quadro) */
  const SEZ = new THREE.Vector3(-W / 2, -H / 2 + 0.031, 0);
  const QUADRI = [
    { q: 0.00, t: SEZ.clone(), d: new THREE.Vector3(-1, .2, .46), s: .14 },
    { q: 0.20, t: new THREE.Vector3(-.2, -.66, 0), d: new THREE.Vector3(-.78, .34, .62), s: .78 },
    { q: 0.33, t: new THREE.Vector3(-.05, -.5, 0), d: new THREE.Vector3(-.42, .36, 1), s: 1.15 },
    { q: 0.50, t: new THREE.Vector3(0, 0, 0), d: new THREE.Vector3(-.4, .22, 1), s: 2.0 },
    { q: 0.74, t: new THREE.Vector3(0, 0, 0), d: new THREE.Vector3(.34, .12, 1), s: 1.86 },
    { q: 1.00, t: new THREE.Vector3(0, 0, 0), d: new THREE.Vector3(-.3, .1, 1), s: 1.8 },
  ];
  QUADRI.forEach((k) => k.d.normalize());
  const bersaglio = new THREE.Vector3();
  const dir = new THREE.Vector3();
  function inquadra(q, t, px) {
    let i = 0;
    while (i < QUADRI.length - 2 && q > QUADRI[i + 1].q) i++;
    const a = QUADRI[i], b = QUADRI[i + 1];
    const f = morbido(tra(q, a.q, b.q));
    bersaglio.lerpVectors(a.t, b.t, f);
    dir.lerpVectors(a.d, b.d, f);
    const dondolo = liscio(tra(q, .05, .3));
    dir.x += Math.sin(t * .33) * .05 * dondolo + px * .1;
    dir.y += Math.cos(t * .27) * .03 * dondolo;
    dir.normalize();
    const s = (a.s + (b.s - a.s) * f) * (camera.aspect > 1.2 ? 1.42 : 1);
    const fov = THREE.MathUtils.degToRad(camera.fov);
    const dist = s / (2 * Math.tan(fov / 2) * Math.min(camera.aspect, 1));
    camera.position.copy(bersaglio).addScaledVector(dir, dist);
    camera.lookAt(bersaglio);
  }

  /* Colore: grezzo, poi verniciato antracite, bianco, bronzo e di nuovo antracite */
  const TAPPE = [
    [0.58, 'grezzo'], [0.70, 'antracite'], [0.80, 'antracite'], [0.85, 'bianco'],
    [0.89, 'bianco'], [0.93, 'bronzo'], [0.955, 'bronzo'], [0.99, 'antracite'],
  ];
  function colora(q) {
    let a = TAPPE[0], b = TAPPE[0];
    if (q <= TAPPE[0][0]) { a = b = TAPPE[0]; }
    else if (q >= TAPPE[TAPPE.length - 1][0]) { a = b = TAPPE[TAPPE.length - 1]; }
    else { for (let i = 0; i < TAPPE.length - 1; i++) if (q >= TAPPE[i][0] && q <= TAPPE[i + 1][0]) { a = TAPPE[i]; b = TAPPE[i + 1]; break; } }
    const f = a === b ? 0 : liscio(tra(q, a[0], b[0]));
    const A = COLORI[a[1]], B = COLORI[b[1]];
    lati.color.copy(A.c).lerp(B.c, f);
    lati.metalness = A.metal + (B.metal - A.metal) * f;
    lati.roughness = A.rough + (B.rough - A.rough) * f;
  }

  /* Stato della scena dato il progresso q (0-1) e il tempo t */
  let ultimoL = -1, ultimoM = -1;
  function componi(q, t) {
    // 1. la prima barra si estrude e poi viene tagliata a 45°
    const L0 = 0.012 + (W - 0.012) * morbido(tra(q, 0.015, 0.22));
    const m0 = liscio(tra(q, 0.235, 0.31));
    if (Math.abs(L0 - ultimoL) > 1e-5 || Math.abs(m0 - ultimoM) > 1e-4) {
      barre[0].geometrie.forEach((g) => allunga(g, L0, m0));
      ultimoL = L0; ultimoM = m0;
    }
    // 2. le altre tre arrivano in volo e chiudono il telaio
    for (let k = 1; k < 4; k++) {
      const b = barre[k];
      const f = morbido(tra(q, 0.27 + 0.055 * k, 0.4 + 0.055 * k));
      b.lato.visible = f > 0.001;
      const fuori = 1 - f;
      const ox = Math.sign(b.x || 1) * (k === 2 ? .2 : .9), oy = k === 2 ? 1.1 : .25 * Math.sign(b.y);
      b.lato.position.set(b.x + ox * fuori, b.y + oy * fuori, .55 * fuori);
      b.lato.rotation.set(fuori * .7, fuori * -.5, b.rz + fuori * .9);
    }
    // 3. entra il vetro
    const fv = morbido(tra(q, 0.5, 0.66));
    vetro.visible = fv > 0.001;
    vetro.position.y = (1 - fv) * 1.7;
    vetroMat.opacity = .13 * fv;
    riflessoMat.opacity = .5 * fv;
    riflesso.material.map.offset.x = ((t * .09) % 1.6) - .8;
    // 4. colore e ultima rotazione della finestra
    colora(q);
    const giro = morbido(tra(q, 0.72, 1));
    finestra.rotation.y = Math.sin(giro * Math.PI) * -.26 - .14 * giro + Math.sin(t * .4) * .025 * liscio(tra(q, .5, .7));
    // la luce scivola sul metallo
    luce.position.set(Math.cos(t * .45) * 3.2, 2.2 + Math.sin(t * .3) * .6, 2.6 + Math.sin(t * .45) * 1.6);
  }

  /* Misure e inquadratura spostata (lascia spazio ai testi) */
  function misura() {
    const w = palco.clientWidth, h = palco.clientHeight;
    if (!w || !h) return;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, mobile() ? 1.5 : 2));
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    if (w >= 900) camera.setViewOffset(w, h, Math.round(w * .12), Math.round(h * -.05), w, h);
    else camera.setViewOffset(w, h, 0, Math.round(h * .07), w, h);
    camera.updateProjectionMatrix();
  }
  misura();
  if ('ResizeObserver' in window) new ResizeObserver(misura).observe(palco);
  else window.addEventListener('resize', misura);

  const progresso = window.__progressoProfilo || (() => 0);
  let qs = ridotto ? 0.8 : progresso();
  let t0 = performance.now(), prima = t0, attivo = true, px = 0, pxs = 0;

  if (!ridotto && window.matchMedia('(pointer: fine)').matches) {
    window.addEventListener('pointermove', (e) => { px = (e.clientX / window.innerWidth - .5) * 2; }, { passive: true });
  }

  function disegna(ora) {
    const dt = Math.min(.1, Math.max(0, (ora - prima) / 1000));
    prima = ora;
    const q = ridotto ? 0.8 : progresso();
    qs += (q - qs) * (1 - Math.exp(-dt * 7));
    pxs += (px - pxs) * (1 - Math.exp(-dt * 3));
    const t = (ora - t0) / 1000;
    componi(qs, t);
    inquadra(qs, t, pxs);
    renderer.render(scena, camera);
  }

  componi(qs, 0);
  inquadra(qs, 0, 0);
  if (renderer.compileAsync) { try { await renderer.compileAsync(scena, camera); } catch (e) { /* compila al primo render */ } }
  t0 = performance.now(); prima = t0;
  disegna(t0);
  if (ridotto) return;

  let rafId = 0;
  function ciclo() {
    rafId = 0;
    if (!attivo || document.hidden) return;
    disegna(performance.now());
    rafId = requestAnimationFrame(ciclo);
  }
  function riparti() { if (!rafId && attivo && !document.hidden) { prima = performance.now(); rafId = requestAnimationFrame(ciclo); } }
  if ('IntersectionObserver' in window) {
    new IntersectionObserver((v) => { attivo = v.some((x) => x.isIntersecting); if (attivo) riparti(); }, { rootMargin: '10% 0px' }).observe(sezione);
  }
  document.addEventListener('visibilitychange', riparti);
  riparti();
}
