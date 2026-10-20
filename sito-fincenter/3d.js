/* Fin Center — l'arco del logo diventa un anello di cromo che orbita intorno alla persona.
   La persona scontornata scrive solo la profondità: la metà lontana dell'anello le passa dietro. */
import * as THREE from 'three';

const SEG = 420;   // segmenti lungo l'arco
const LATI = 20;   // lati della sezione

const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const mix = (a, b, t) => a + (b - a) * t;

/* Arco ellittico aperto e rastremato come quello del logo: sottile alle punte, pieno in basso a sinistra. */
function geometriaArco({ a = 1, b = 0.74, inizio = 1.2, giro = Math.PI * 1.56, spessore = 0.052, piatto = 0.6 } = {}) {
  const nV = (SEG + 1) * (LATI + 1);
  const pos = new Float32Array(nV * 3);
  const nor = new Float32Array(nV * 3);
  const idx = new Uint32Array(SEG * LATI * 6);
  let v = 0;
  for (let i = 0; i <= SEG; i++) {
    const u = i / SEG;
    const th = inizio + u * giro;
    const cx = a * Math.cos(th), cy = b * Math.sin(th);
    let tx = -a * Math.sin(th), ty = b * Math.cos(th);
    const tl = Math.hypot(tx, ty); tx /= tl; ty /= tl;
    const nx = ty, ny = -tx;                                   // normale nel piano, verso l'esterno
    const profilo = Math.pow(Math.sin(Math.PI * Math.pow(u, 1.32)), 0.9);
    const w = spessore * Math.max(profilo, 0.015);
    const h = w * piatto;
    for (let j = 0; j <= LATI; j++) {
      const f = (j / LATI) * Math.PI * 2;
      const c = Math.cos(f), s = Math.sin(f);
      pos[v * 3] = cx + nx * c * w;
      pos[v * 3 + 1] = cy + ny * c * w;
      pos[v * 3 + 2] = s * h;
      let mx = nx * c * h, my = ny * c * h, mz = s * w;     // normale della sezione ellittica
      const ml = Math.hypot(mx, my, mz) || 1;
      nor[v * 3] = mx / ml; nor[v * 3 + 1] = my / ml; nor[v * 3 + 2] = mz / ml;
      v++;
    }
  }
  let k = 0;
  for (let i = 0; i < SEG; i++) {
    for (let j = 0; j < LATI; j++) {
      const p = i * (LATI + 1) + j, q = p + LATI + 1;
      idx[k++] = p; idx[k++] = q; idx[k++] = p + 1;
      idx[k++] = q; idx[k++] = q + 1; idx[k++] = p + 1;
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  g.setIndex(new THREE.BufferAttribute(idx, 1));
  return g;
}

/* Studio fotografico in bianco e nero: stanza scura e strisce di luce, per un cromo contrastato. */
function ambienteStudio(renderer) {
  const s = new THREE.Scene();
  s.add(new THREE.Mesh(
    new THREE.SphereGeometry(30, 32, 16),
    new THREE.MeshBasicMaterial({ color: new THREE.Color(0.05, 0.05, 0.05), side: THREE.BackSide })
  ));
  const luce = (w, h, x, y, z, i) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h),
      new THREE.MeshBasicMaterial({ color: new THREE.Color(i, i, i), side: THREE.DoubleSide }));
    m.position.set(x, y, z); m.lookAt(0, 0, 0); s.add(m);
  };
  luce(34, 3.2, 0, 14, 6, 7);      // striscia alta
  luce(3, 22, -16, 2, 8, 3.2);     // verticale a sinistra
  luce(3.5, 22, 17, -1, -6, 4.5);  // verticale a destra, dietro
  luce(40, 9, 0, -15, 10, 1.7);    // la scrivania bianca sotto
  luce(10, 10, 4, 4, 22, 1.1);     // morbida frontale
  const pm = new THREE.PMREMGenerator(renderer);
  const env = pm.fromScene(s, 0.03).texture;
  pm.dispose();
  return env;
}

export async function avvia({ canvas, hero, persona, ridotto }) {
  const mobile = window.innerWidth < 900;
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, mobile ? 1.5 : 2));
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.08;

  const scena = new THREE.Scene();
  scena.environment = ambienteStudio(renderer);

  const camera = new THREE.PerspectiveCamera(26, 1, 10, 30000);

  // maschera di profondità dalla foto scontornata (stessa immagine dell'HTML)
  if (persona.decode) await persona.decode().catch(() => {});
  const tex = await new THREE.TextureLoader().loadAsync(persona.currentSrc || persona.src);
  tex.colorSpace = THREE.SRGBColorSpace;
  const maschera = new THREE.Mesh(
    new THREE.PlaneGeometry(1, 1),
    new THREE.MeshBasicMaterial({ map: tex, alphaTest: 0.5, colorWrite: false })
  );
  maschera.renderOrder = -1;
  scena.add(maschera);

  const geo = geometriaArco();
  const anello = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 1, roughness: 0.12 }));
  const gruppo = new THREE.Group();
  gruppo.add(anello);
  scena.add(gruppo);

  // misure: tutto in pixel CSS, origine al centro del canvas
  let W = 1, H = 1, R = 100, cX = 0, cY = 0;
  function misura() {
    const box = hero.getBoundingClientRect();
    W = Math.max(1, box.width); H = Math.max(1, box.height);
    renderer.setSize(W, H, false);
    camera.aspect = W / H;
    camera.position.set(0, 0, (H / 2) / Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)));
    camera.near = 10; camera.far = camera.position.z * 4;
    camera.updateProjectionMatrix();

    // stessa geometria di object-fit: cover dell'immagine HTML
    const rq = persona.parentElement.getBoundingClientRect();
    const iw = persona.naturalWidth || 2200, ih = persona.naturalHeight || 1467;
    const op = getComputedStyle(persona).objectPosition.split(' ').map((s) => parseFloat(s) / 100);
    const px = isFinite(op[0]) ? op[0] : 0.5, py = isFinite(op[1]) ? op[1] : 0.5;
    const sc = Math.max(rq.width / iw, rq.height / ih);
    const dw = iw * sc, dh = ih * sc;
    const ox = rq.left - box.left + (rq.width - dw) * px;
    const oy = rq.top - box.top + (rq.height - dh) * py;
    maschera.position.set(ox + dw / 2 - W / 2, H / 2 - (oy + dh / 2), 0);
    maschera.scale.set(dw, dh, 1);

    // l'anello gira intorno al collo
    cX = ox + dw * 0.5 - W / 2;
    cY = H / 2 - (oy + dh * 0.44);
    R = dw * (window.innerWidth < 900 ? 0.31 : 0.27);
  }
  misura();

  let t0 = null;
  function disegna(now) {
    if (t0 === null) t0 = now;
    const t = (now - t0) / 1000;
    const d = ridotto ? 1 : clamp(t / 2.1);
    const de = 1 - Math.pow(1 - d, 3);
    geo.setDrawRange(0, Math.max(1, Math.round(de * SEG)) * LATI * 6);

    const q = ridotto ? 0 : clamp(window.scrollY / (H * 0.85));
    const qe = q * q * (3 - 2 * q);
    gruppo.position.set(cX, cY + qe * H * 0.05, qe * R * 0.5);
    gruppo.rotation.set(mix(-1.1 - 0.3 * (1 - de), -0.34, qe), 0, mix(0.15, -0.05, qe));
    gruppo.scale.setScalar(R * (0.84 + 0.16 * de) * (1 + 0.3 * qe));
    anello.rotation.z = ridotto ? 0.5 : -t * 0.42 - 2.6 * (1 - de);
    if (scena.environmentRotation) scena.environmentRotation.y = ridotto ? 0.4 : t * 0.22;
    renderer.render(scena, camera);
  }

  // attende la fine dell'entrata della foto, così maschera e immagine coincidono
  const attesa = Math.max(0, 1500 - performance.now());
  if (attesa) await new Promise((r) => setTimeout(r, attesa));
  if (renderer.compileAsync) await renderer.compileAsync(scena, camera).catch(() => {});

  let visibile = true, attivo = !document.hidden, raf = 0;
  const giro = () => {
    raf = 0;
    disegna(performance.now());
    if (!ridotto && visibile && attivo) raf = requestAnimationFrame(giro);
  };
  const riparti = () => { if (!raf && visibile && attivo) raf = requestAnimationFrame(giro); };

  new IntersectionObserver((v) => { visibile = v[0].isIntersecting; if (visibile) riparti(); }).observe(hero);
  document.addEventListener('visibilitychange', () => { attivo = !document.hidden; if (attivo) riparti(); });
  let rt = 0;
  window.addEventListener('resize', () => {
    clearTimeout(rt);
    rt = setTimeout(() => { misura(); if (ridotto) disegna(performance.now()); }, 120);
  });

  disegna(performance.now());
  canvas.classList.add('pronto');
  if (!ridotto) riparti();
}
