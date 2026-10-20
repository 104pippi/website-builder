/* B Life: il catalogo medicale in 3D che si sfoglia con lo scroll */
import * as THREE from 'three';

const PW = 1;            // larghezza pagina
const PH = 1.4144;       // altezza pagina (A4)
const SEG = 30;          // segmenti lungo la larghezza: la carta si curva
const EPS = 0.0045;      // spessore tra un foglio e l'altro
const FOV = 28;

const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const liscio = (t) => t * t * (3 - 2 * t);
const morbido = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const tratto = (p, a, b) => clamp((p - a) / (b - a));

export async function avvia({ scena, hero, stato }) {
  const mobile = () => !matchMedia('(min-width: 960px)').matches;
  const fine = matchMedia('(pointer: fine)').matches;

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
  if (!renderer.getContext()) throw new Error('niente WebGL');
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, mobile() ? 1.5 : 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.setClearColor(0x000000, 0);
  const tela = renderer.domElement;
  tela.setAttribute('aria-hidden', 'true');

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(FOV, 1, 0.1, 60);

  scene.add(new THREE.HemisphereLight(0xffffff, 0xd4e0ec, 2.35));
  const luce = new THREE.DirectionalLight(0xffffff, 1.15);
  luce.position.set(-2.2, 3, 4.5);
  scene.add(luce);

  /* ---------- texture ---------- */
  const caricatore = new THREE.TextureLoader();
  const anis = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  const bianca = () => {
    const t = new THREE.DataTexture(new Uint8Array([251, 252, 253, 255]), 1, 1);
    t.colorSpace = THREE.SRGBColorSpace;
    t.needsUpdate = true;
    return t;
  };
  function prepara(t, specchio) {
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = anis;
    if (specchio) { t.wrapS = THREE.RepeatWrapping; t.repeat.x = -1; t.offset.x = 1; }
    return t;
  }
  const carica = (nome) => new Promise((ok, ko) => caricatore.load(`assets/3d/pag-${nome}.jpg`, ok, undefined, ko));

  /* ---------- fogli ---------- */
  function materiale(specchio) {
    const m = new THREE.MeshStandardMaterial({ map: prepara(bianca(), specchio), roughness: 0.86, metalness: 0, side: specchio ? THREE.BackSide : THREE.FrontSide });
    return m;
  }
  function foglio(rigido) {
    const geo = new THREE.PlaneGeometry(PW, PH, SEG, 1);
    geo.translate(PW / 2, 0, 0);
    const fronte = materiale(false);
    const retro = materiale(true);
    const g = new THREE.Group();
    const a = new THREE.Mesh(geo, fronte);
    const b = new THREE.Mesh(geo, retro);
    a.frustumCulled = b.frustumCulled = false;
    g.add(a, b);
    return { g, geo, fronte, retro, rigido, f: 0 };
  }
  const xs = new Float32Array(SEG + 1);
  const zs = new Float32Array(SEG + 1);
  function piega(fo, f, zDx, zSx) {
    const k = (1 - fo.rigido) * 1.1;
    const s = Math.sin(f * Math.PI);
    const ds = PW / SEG;
    let x = 0, z = 0;
    xs[0] = 0; zs[0] = 0;
    for (let i = 1; i <= SEG; i++) {
      const u = (i - 0.5) / SEG;
      const th = Math.min(Math.PI, f * Math.PI + k * s * Math.pow(u, 1.7));
      x += Math.cos(th) * ds;
      z += Math.sin(th) * ds;
      xs[i] = x; zs[i] = z;
    }
    const zc = lerp(zDx, zSx, liscio(f));
    const pos = fo.geo.attributes.position;
    const n = SEG + 1;
    for (let r = 0; r < 2; r++) {
      for (let i = 0; i < n; i++) {
        pos.setX(r * n + i, xs[i]);
        pos.setZ(r * n + i, zs[i] + zc);
      }
    }
    pos.needsUpdate = true;
    fo.geo.computeVertexNormals();
  }

  const libro = new THREE.Group();
  libro.rotation.order = 'YXZ';
  const perno = new THREE.Group();
  libro.add(perno);
  scene.add(libro);

  // ombra morbida dietro il catalogo
  const cv = document.createElement('canvas');
  cv.width = cv.height = 128;
  const cx = cv.getContext('2d');
  const gr = cx.createRadialGradient(64, 64, 4, 64, 64, 64);
  gr.addColorStop(0, 'rgba(10,34,64,0.55)');
  gr.addColorStop(0.55, 'rgba(10,34,64,0.22)');
  gr.addColorStop(1, 'rgba(10,34,64,0)');
  cx.fillStyle = gr;
  cx.fillRect(0, 0, 128, 128);
  const texOmbra = new THREE.CanvasTexture(cv);
  const ombra = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: texOmbra, transparent: true, depthWrite: false, opacity: 0.85 }));
  ombra.renderOrder = -1;
  perno.add(ombra);

  // blocco delle pagine (si vede il bordo della carta)
  const matBordo = new THREE.MeshStandardMaterial({ color: 0xf3f6f9, roughness: 0.95 });
  const matDorso = new THREE.MeshStandardMaterial({ color: 0x0a7fca, roughness: 0.7 });
  const spessore = 0.03;
  const bloccoDx = new THREE.Mesh(new THREE.BoxGeometry(PW, PH, spessore), [matBordo, matDorso, matBordo, matBordo, matBordo, matDorso]);
  bloccoDx.position.set(PW / 2, 0, -spessore / 2 - 0.001);
  const bloccoSx = new THREE.Mesh(new THREE.BoxGeometry(PW, PH, spessore * 0.35), matBordo);
  bloccoSx.position.set(-PW / 2, 0, -spessore * 0.175 - 0.001);
  perno.add(bloccoDx, bloccoSx);

  // pagina fissa a destra in fondo
  const fondo = new THREE.Mesh(new THREE.PlaneGeometry(PW, PH), materiale(false));
  fondo.position.set(PW / 2, 0, 0);
  perno.add(fondo);

  const fogli = [foglio(0.78), foglio(0), foglio(0)];
  fogli.forEach((fo) => perno.add(fo.g));

  const imposta = (mat, tex, specchio) => {
    const vecchia = mat.map;
    mat.map = prepara(tex, specchio);
    vecchia.dispose();
  };
  // prima copertina, indice e Medicazione (si vedono subito), poi il resto
  const [tCop, tInd, tMed] = await Promise.all(['copertina', 'indice', 'medicazione'].map(carica));
  imposta(fogli[0].fronte, tCop, false);
  imposta(fogli[0].retro, tInd, true);
  imposta(fogli[1].fronte, tMed, false);
  Promise.all(['infusione', 'ginecologia', 'dermatologia', 'chirurgia'].map(carica)).then(([tInf, tGin, tDer, tChi]) => {
    imposta(fogli[1].retro, tInf, true);
    imposta(fogli[2].fronte, tGin, false);
    imposta(fogli[2].retro, tDer, true);
    imposta(fondo.material, tChi, false);
  }).catch(() => {});

  /* ---------- dimensioni ---------- */
  let L = 1, A = 1;
  function ridimensiona() {
    L = scena.clientWidth; A = scena.clientHeight;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, mobile() ? 1.5 : 2));
    renderer.setSize(L, A, false);
    camera.aspect = L / A;
    camera.updateProjectionMatrix();
  }
  ridimensiona();
  new ResizeObserver(ridimensiona).observe(scena);

  /* ---------- puntatore (solo desktop) ---------- */
  const punt = { x: 0, y: 0, vx: 0, vy: 0 };
  if (fine) {
    addEventListener('pointermove', (e) => {
      punt.x = (e.clientX / innerWidth) * 2 - 1;
      punt.y = (e.clientY / innerHeight) * 2 - 1;
    }, { passive: true });
  }

  /* ---------- stato animato ---------- */
  const v = { r: 0, o: 0, f1: 0, f2: 0 };
  let t0 = 0, ultimo = 0;
  const tg = Math.tan((FOV * Math.PI) / 360);

  function aggiorna(ora) {
    const dt = Math.min(0.05, ultimo ? (ora - ultimo) / 1000 : 0.016);
    ultimo = ora;
    const t = (ora - t0) / 1000;
    const p = stato.p || 0;

    // obiettivi dallo scroll: prima il catalogo si mette al centro (r), poi si apre (o)
    const rT = liscio(tratto(p, 0, 0.16));
    const oT = morbido(tratto(p, 0.08, 0.32));
    const f1T = morbido(tratto(p, 0.38, 0.62));
    const f2T = morbido(tratto(p, 0.68, 0.92));
    const a = 1 - Math.exp(-dt * 7);
    v.r += (rT - v.r) * a;
    v.o += (oT - v.o) * a;
    v.f1 += (f1T - v.f1) * a;
    v.f2 += (f2T - v.f2) * a;

    // sbirciata dell'intro: la copertina si socchiude da sola
    const sb = morbido(tratto(t, 0.35, 1.6)) * (0.13 + Math.sin(t * 1.3) * 0.012);
    const o = v.o, r = v.r;
    const fCop = lerp(sb, 1, o);
    const telefono = mobile();

    piega(fogli[0], fCop, 3 * EPS, 1 * EPS);
    piega(fogli[1], v.f1, 2 * EPS, 2 * EPS);
    piega(fogli[2], v.f2, 1 * EPS, 3 * EPS);
    bloccoSx.visible = fCop > 0.5;

    // regione sullo schermo: chiuso -> aperto. Sul telefono resta inquadrata la pagina di destra
    const c = stato.chiuso, ap = stato.aperto;
    const cxR = lerp(c.cx, ap.cx, r);
    const cyR = lerp(c.cy, ap.cy, r);
    const hR = lerp(c.h, ap.h, r);
    const wR = lerp(c.w, ap.w, r);
    const apertura = telefono ? 0 : Math.max(o, r);
    const largLibro = lerp(PW, 2 * PW * 1.02, apertura);
    const altLibro = PH * 1.02;
    const d = Math.max(altLibro / (hR * 2 * tg), largLibro / (wR * 2 * tg * camera.aspect));
    camera.position.set(0, 0, d);
    camera.lookAt(0, 0, 0);
    const visH = 2 * d * tg, visW = visH * camera.aspect;

    // posa
    const galleggia = Math.sin(t * 0.8) * 0.012 * (1 - r * 0.7);
    libro.position.set((cxR - 0.5) * visW, (0.5 - cyR) * visH + galleggia, 0);
    perno.position.x = telefono ? -PW / 2 : -PW / 2 * (1 - o);
    punt.vx += (punt.x - punt.vx) * a * 0.6;
    punt.vy += (punt.y - punt.vy) * a * 0.6;
    libro.rotation.y = lerp(-0.37, telefono ? 0.1 : 0, r) + Math.sin(t * 0.5) * 0.022 * (1 - r * 0.6) + punt.vx * 0.06;
    libro.rotation.x = lerp(-0.16, telefono ? -0.1 : -0.2, r) + punt.vy * 0.04;
    libro.rotation.z = lerp(0.05, 0, r);

    // ombra che segue la sagoma
    const ombraL = lerp(PW, 2 * PW, o) * 1.22;
    ombra.scale.set(ombraL, PH * 1.16, 1);
    ombra.position.set(lerp(PW / 2, 0, o) + 0.06, -0.07, -0.08);
    ombra.material.opacity = lerp(0.85, 0.6, o);
  }

  /* ---------- ciclo ---------- */
  let visibile = true, giro = 0;
  function ciclo() {
    giro = 0;
    if (!visibile || document.hidden) return;
    giro = requestAnimationFrame(ciclo);
    aggiorna(performance.now());
    renderer.render(scene, camera);
  }
  const sveglia = () => { if (!giro && visibile && !document.hidden) { ultimo = 0; giro = requestAnimationFrame(ciclo); } };
  new IntersectionObserver(([e]) => { visibile = e.isIntersecting; sveglia(); }, { rootMargin: '80px' }).observe(hero);
  document.addEventListener('visibilitychange', sveglia);

  // compila prima del primo fotogramma, poi parte l'orologio dell'intro
  aggiorna(performance.now());
  try { await renderer.compileAsync(scene, camera); } catch (e) { /* va bene lo stesso */ }
  scena.appendChild(tela);
  // aspetta che il poster sia atterrato prima della dissolvenza
  const attesa = Math.max(0, 1400 - performance.now());
  await new Promise((r) => setTimeout(r, attesa));
  t0 = performance.now();
  ultimo = 0;
  aggiorna(t0);
  renderer.render(scene, camera);
  requestAnimationFrame(() => scena.classList.add('pronta'));
  sveglia();
}
