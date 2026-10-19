// CO.G.IM. — scene WebGL: l'hero che si "intonaca" da solo e la capriata che si monta con lo scroll.
// Tutto è guidato da performance.now() e dallo scroll: niente mouse obbligatorio, gira uguale nel video.
import * as THREE from 'three';

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const easeInOut = (t) => (t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const easeOut = (t) => 1 - Math.pow(1 - t, 3);
const easeOutBack = (t) => { const c = 1.35; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); };
const mobile = () => matchMedia('(max-width: 899px)').matches;

function nuovoRenderer(canvas, opzioni) {
  try {
    const r = new THREE.WebGLRenderer({ canvas, powerPreference: 'high-performance', ...opzioni });
    if (!r.getContext()) return null;
    r.setPixelRatio(Math.min(devicePixelRatio || 1, mobile() ? 1.5 : 2));
    return r;
  } catch (e) {
    return null;
  }
}

// Ciclo di disegno che si ferma fuori schermo e con la scheda nascosta
function ciclo(elemento, disegna) {
  let visibile = false;
  let attivo = false;
  const giro = () => {
    if (!visibile || document.hidden) { attivo = false; return; }
    disegna(performance.now());
    requestAnimationFrame(giro);
  };
  const riprendi = () => { if (!attivo && visibile && !document.hidden) { attivo = true; requestAnimationFrame(giro); } };
  new IntersectionObserver(([v]) => { visibile = v.isIntersecting; riprendi(); }, { rootMargin: '80px 0px' }).observe(elemento);
  document.addEventListener('visibilitychange', riprendi);
  return riprendi;
}

/* ------------------------------------------------------------------ */
/* HERO: due foto vere, un'onda di calce fresca che passa dal prima al dopo */
/* ------------------------------------------------------------------ */
const vertHero = /* glsl */`
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;
const fragHero = /* glsl */`
  precision highp float;
  varying vec2 vUv;
  uniform sampler2D uPrima;
  uniform sampler2D uDopo;
  uniform vec2 uScala;
  uniform vec2 uScarto;
  uniform float uP;
  uniform float uScuro;

  float hash(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
  float noise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
  }
  float fbm(vec2 p) { float v = 0.0, a = 0.5; for (int i = 0; i < 5; i++) { v += a * noise(p); p *= 2.03; a *= 0.5; } return v; }

  void main() {
    vec2 uv = vUv * uScala + uScarto;
    // passate di frattazzo: fasce orizzontali irregolari, ognuna un po' in anticipo o in ritardo
    float fascia = floor(uv.y * 6.0 + fbm(vec2(uv.x * 1.5, uv.y * 2.0)) * 1.2);
    float sfasa = hash(vec2(fascia, 7.0)) * 0.16;
    float n = fbm(uv * vec2(3.5, 8.0)) * 0.24 + (noise(uv * vec2(40.0, 90.0)) - 0.5) * 0.03;
    float fronte = uP * 2.15 - 0.5;
    float d = uv.x * 0.82 + (1.0 - uv.y) * 0.22 + sfasa + n - fronte;
    float m = 1.0 - smoothstep(-0.012, 0.012, d);

    vec3 col = mix(texture2D(uPrima, uv).rgb, texture2D(uDopo, uv).rgb, m);
    // cresta di calce fresca sul fronte, con la sua grana
    float cresta = exp(-pow(d / 0.028, 2.0));
    float grana = 0.78 + 0.22 * noise(uv * vec2(260.0, 140.0));
    col = mix(col, vec3(0.95, 0.93, 0.88) * grana, cresta * 0.9);
    // ombra appena dietro la cresta e luce radente davanti
    col *= 1.0 - 0.28 * exp(-pow((d + 0.045) / 0.03, 2.0));
    col += vec3(1.0, 0.86, 0.66) * 0.16 * exp(-pow((d - 0.07) / 0.08, 2.0)) * step(0.0, d);
    col *= 1.0 - uScuro;
    gl_FragColor = vec4(col, 1.0);
  }
`;

async function pronta(img) {
  if (!img) return false;
  try {
    if (!img.complete || !img.naturalWidth) await new Promise((ok, ko) => { img.addEventListener('load', ok, { once: true }); img.addEventListener('error', ko, { once: true }); });
    if (img.decode) await img.decode();
    return img.naturalWidth > 0;
  } catch (e) {
    return false;
  }
}

export async function creaHero({ canvas, hero }) {
  const imgPrima = hero.querySelector('.hero__img--prima');
  const imgDopo = hero.querySelector('.hero__img--dopo');
  const [okA, okB] = await Promise.all([pronta(imgPrima), pronta(imgDopo)]);
  if (!okA || !okB) return null;

  const renderer = nuovoRenderer(canvas, { antialias: false, alpha: false });
  if (!renderer) return null;
  renderer.setClearColor(0x23272a, 1);

  const texture = (img) => {
    const t = new THREE.Texture(img);
    t.minFilter = THREE.LinearMipmapLinearFilter;
    t.magFilter = THREE.LinearFilter;
    t.anisotropy = 4;
    t.needsUpdate = true;
    return t;
  };
  const uniforms = {
    uPrima: { value: texture(imgPrima) },
    uDopo: { value: texture(imgDopo) },
    uScala: { value: new THREE.Vector2(1, 1) },
    uScarto: { value: new THREE.Vector2(0, 0) },
    uP: { value: 0 },
    uScuro: { value: 0 },
  };
  const scene = new THREE.Scene();
  const fov = 30;
  const camera = new THREE.PerspectiveCamera(fov, 1, 0.1, 100);
  const D = 10;
  camera.position.set(0, 0, D);
  const perno = new THREE.Group();
  const piano = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.ShaderMaterial({ vertexShader: vertHero, fragmentShader: fragHero, uniforms }));
  perno.add(piano);
  scene.add(perno);

  let largo = 1, alto = 1, sporco = true;
  const misura = () => {
    const w = canvas.clientWidth || innerWidth;
    const h = canvas.clientHeight || innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    alto = 2 * D * Math.tan(THREE.MathUtils.degToRad(fov / 2));
    largo = alto * camera.aspect;
    piano.scale.set(largo, alto, 1);
    piano.position.y = alto / 2;   // il piano ruota attorno al bordo in basso
    perno.position.y = -alto / 2;
    // stessa inquadratura di object-fit: cover, centrata
    const ia = imgPrima.naturalWidth / imgPrima.naturalHeight;
    const va = w / h;
    const s = va > ia ? [1, ia / va] : [va / ia, 1];
    uniforms.uScala.value.set(s[0], s[1]);
    uniforms.uScarto.value.set((1 - s[0]) / 2, (1 - s[1]) / 2);
    sporco = true;
  };
  misura();
  new ResizeObserver(misura).observe(canvas);

  let inizio = -1, durata = 2300, avvisa = null, finito = false;
  let ultimoTilt = -1;
  const disegna = (ora) => {
    if (inizio >= 0 && !finito) {
      const k = clamp((ora - inizio) / durata, 0, 1);
      const p = easeInOut(k);
      uniforms.uP.value = p;
      camera.position.z = D * (1 - 0.045 * easeOut(k));   // piccola carrellata in avanti mentre si intonaca
      avvisa && avvisa(p);
      if (k >= 1) finito = true;
      sporco = true;
    }
    // allo scroll il piano si inclina all'indietro e si scurisce
    const r = hero.getBoundingClientRect();
    const t = clamp(-r.top / r.height, 0, 1);
    if (Math.abs(t - ultimoTilt) > 0.0005) {
      ultimoTilt = t;
      perno.rotation.x = -t * 0.62;
      perno.position.z = -t * 1.2;
      uniforms.uScuro.value = t * 0.5;
      sporco = true;
    }
    if (sporco) { renderer.render(scene, camera); sporco = false; }
  };
  disegna(performance.now());
  const riprendi = ciclo(hero, disegna);
  addEventListener('scroll', riprendi, { passive: true });

  return {
    restaura(ms, cb) {
      durata = ms;
      avvisa = cb;
      inizio = performance.now();
      riprendi();
    },
  };
}

/* ------------------------------------------------------------------ */
/* CAPRIATA: dal disegno alle travi vere, pezzo per pezzo               */
/* ------------------------------------------------------------------ */
function trave(L, h, d) {
  const g = new THREE.BoxGeometry(L, h, d);
  const uv = g.attributes.uv;
  // sulle facce lunghe la venatura corre lungo la trave e si ripete ogni 2,4 m
  for (let i = 8; i < 24; i++) uv.setX(i, uv.getX(i) * (L / 2.4));
  uv.needsUpdate = true;
  return g;
}

function ombraMorbida() {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const x = c.getContext('2d');
  const g = x.createRadialGradient(64, 64, 4, 64, 64, 64);
  g.addColorStop(0, 'rgba(0,0,0,0.55)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  x.fillStyle = g;
  x.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(c);
}

export async function creaCapriata({ canvas, sezione, progresso, ridotto }) {
  const renderer = nuovoRenderer(canvas, { antialias: true, alpha: true });
  if (!renderer) return false;
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  const [{ RoomEnvironment }, mappa] = await Promise.all([
    import('three/addons/environments/RoomEnvironment.js'),
    new THREE.TextureLoader().loadAsync('assets/tex/trave.jpg'),
  ]);
  mappa.colorSpace = THREE.SRGBColorSpace;
  mappa.wrapS = mappa.wrapT = THREE.RepeatWrapping;
  mappa.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.55;
  const sole = new THREE.DirectionalLight(0xffdcb4, 2.4);
  sole.position.set(-5, 9, 7);
  scene.add(sole);
  const contro = new THREE.DirectionalLight(0x9fb6cc, 0.7);
  contro.position.set(6, 3, -7);
  scene.add(contro);

  const legni = [0xffffff, 0xf1e2cf, 0xe4cfb6].map((c) => new THREE.MeshStandardMaterial({ map: mappa, color: c, roughness: 0.82, metalness: 0 }));
  const ferro = new THREE.MeshStandardMaterial({ color: 0x2c2b2a, roughness: 0.42, metalness: 0.85 });
  const linea = new THREE.LineBasicMaterial({ color: 0xd29a62, transparent: true, opacity: 0.38 });

  const pezzi = [];
  // ogni pezzo: geometria, materiale, posa finale, da dove arriva, finestra di avanzamento [t0, t1]
  const aggiungi = (geo, mat, pos, rotZ, da, t0, t1, padre, scatto = false) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.copy(pos);
    m.rotation.z = rotZ;
    padre.add(m);
    const disegno = new THREE.LineSegments(new THREE.EdgesGeometry(geo), linea);
    disegno.position.copy(pos);
    disegno.rotation.z = rotZ;
    padre.add(disegno);
    pezzi.push({ m, disegno, fine: pos.clone(), rotZ, da, t0, t1, scatto });
    return m;
  };
  const v = (x, y, z = 0) => new THREE.Vector3(x, y, z);

  // geometria della capriata (metri): catena 8,6 m, colmo a 3,25 m
  const piedeX = 4.05, piedeY = 0.36, colmoY = 3.2;
  const ang = Math.atan2(colmoY - piedeY, piedeX);
  const Lp = Math.hypot(piedeX, colmoY - piedeY) + 0.35;
  const yPuntone = (x) => piedeY + ((piedeX - Math.abs(x)) / piedeX) * (colmoY - piedeY);

  function capriata(padre, t, conDisegno = true) {
    const off = t;   // sfasamento nel tempo (0 per la capriata principale)
    aggiungi(trave(8.7, 0.36, 0.3), legni[2], v(0, 0.18), 0, { p: v(0, -3.2, 0), r: 0.5 }, 0.02 + off, 0.17 + off, padre);
    aggiungi(trave(2.95, 0.3, 0.3), legni[1], v(0, 1.8), Math.PI / 2, { p: v(0, 6, 0), r: 0.4 }, 0.2 + off, 0.33 + off, padre);
    aggiungi(trave(Lp, 0.32, 0.28), legni[0], v(-piedeX / 2, (piedeY + colmoY) / 2 + 0.08), ang, { p: v(-6, 3.5, 1.5), r: -0.9 }, 0.36 + off, 0.49 + off, padre);
    aggiungi(trave(Lp, 0.32, 0.28), legni[0], v(piedeX / 2, (piedeY + colmoY) / 2 + 0.08), -ang, { p: v(6, 3.5, 1.5), r: 0.9 }, 0.4 + off, 0.53 + off, padre);
    const sa = Math.atan2(yPuntone(1.95) - 0.75, 1.8);
    const Ls = Math.hypot(1.8, yPuntone(1.95) - 0.75);
    aggiungi(trave(Ls, 0.24, 0.24), legni[1], v(-1.05, (0.75 + yPuntone(1.95)) / 2), Math.PI - sa, { p: v(-3, -2.5, 2), r: 0.8 }, 0.54 + off, 0.63 + off, padre);
    aggiungi(trave(Ls, 0.24, 0.24), legni[1], v(1.05, (0.75 + yPuntone(1.95)) / 2), sa, { p: v(3, -2.5, 2), r: -0.8 }, 0.57 + off, 0.66 + off, padre);
    // staffe in ferro ai nodi, davanti e dietro
    for (const z of [0.16, -0.16]) {
      aggiungi(new THREE.BoxGeometry(0.04, 0.7, 0.02), ferro, v(-0.17, 0.4, z), 0, { p: v(0, 0, 0), r: 0 }, 0.64 + off, 0.7 + off, padre, true);
      aggiungi(new THREE.BoxGeometry(0.04, 0.7, 0.02), ferro, v(0.17, 0.4, z), 0, { p: v(0, 0, 0), r: 0 }, 0.645 + off, 0.705 + off, padre, true);
      aggiungi(new THREE.BoxGeometry(0.62, 0.62, 0.02), ferro, v(0, colmoY - 0.12, z), Math.PI / 4, { p: v(0, 0, 0), r: 0 }, 0.65 + off, 0.71 + off, padre, true);
      aggiungi(new THREE.BoxGeometry(0.62, 0.26, 0.02), ferro, v(-piedeX + 0.4, 0.5, z), ang, { p: v(0, 0, 0), r: 0 }, 0.655 + off, 0.715 + off, padre, true);
      aggiungi(new THREE.BoxGeometry(0.62, 0.26, 0.02), ferro, v(piedeX - 0.4, 0.5, z), -ang, { p: v(0, 0, 0), r: 0 }, 0.66 + off, 0.72 + off, padre, true);
    }
    aggiungi(new THREE.BoxGeometry(0.4, 0.04, 0.34), ferro, v(0, -0.02, 0), 0, { p: v(0, 0, 0), r: 0 }, 0.64 + off, 0.7 + off, padre, true);
  }

  const tetto = new THREE.Group();
  scene.add(tetto);
  const principale = new THREE.Group();
  tetto.add(principale);
  capriata(principale, 0);

  // altre due capriate già montate che arrivano scorrendo in profondità
  const laterali = [-2.8, 2.8].map((z, i) => {
    const g = new THREE.Group();
    capriata(g, -1);   // pezzi già al loro posto
    g.userData = { z, t0: 0.73 + i * 0.03, t1: 0.86 + i * 0.03 };
    tetto.add(g);
    return g;
  });
  // arcarecci e colmo, lungo la profondità
  const arcarecci = [];
  const posArc = [-2.75, -1.4, 1.4, 2.75];
  posArc.forEach((x, i) => {
    const g = trave(7.4, 0.22, 0.2);
    const m = new THREE.Mesh(g, legni[i % 3]);
    m.rotation.y = Math.PI / 2;
    m.position.set(x, yPuntone(x) + 0.3, 0);
    tetto.add(m);
    arcarecci.push({ m, fine: m.position.clone(), t0: 0.8 + i * 0.025, t1: 0.9 + i * 0.025 });
  });
  {
    const m = new THREE.Mesh(trave(7.4, 0.26, 0.26), legni[2]);
    m.rotation.y = Math.PI / 2;
    m.position.set(0, colmoY + 0.22, 0);
    tetto.add(m);
    arcarecci.push({ m, fine: m.position.clone(), t0: 0.86, t1: 0.96 });
  }

  const ombra = new THREE.Mesh(new THREE.PlaneGeometry(12, 9), new THREE.MeshBasicMaterial({ map: ombraMorbida(), transparent: true, depthWrite: false }));
  ombra.rotation.x = -Math.PI / 2;
  ombra.position.y = -0.04;
  scene.add(ombra);

  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 200);
  const bersaglio = v(0, 1.55, 0);
  let raggio = 12, desktop = !mobile();
  const misura = () => {
    const w = canvas.clientWidth || innerWidth;
    const h = canvas.clientHeight || innerHeight;
    renderer.setSize(w, h, false);
    desktop = w >= 900;
    camera.fov = desktop ? 30 : 44;
    camera.aspect = w / h;
    const mezzaL = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.aspect;
    raggio = clamp(4.9 / mezzaL, 9, desktop ? 15 : 17.5);
    // su desktop la capriata sta a destra (a sinistra ci sono i testi), sul telefono in alto
    if (desktop) camera.setViewOffset(w, h, -w * 0.17, 0, w, h);
    else camera.setViewOffset(w, h, 0, h * 0.13, w, h);
    camera.updateProjectionMatrix();
  };
  misura();
  new ResizeObserver(misura).observe(canvas);

  let mx = 0, my = 0;
  if (matchMedia('(pointer: fine)').matches) {
    addEventListener('pointermove', (e) => { mx = e.clientX / innerWidth - 0.5; my = e.clientY / innerHeight - 0.5; }, { passive: true });
  }

  const posa = (p, ora) => {
    for (const z of pezzi) {
      if (z.t0 < 0) { z.disegno.visible = false; continue; }   // capriate laterali: già montate
      const k = clamp((p - z.t0) / (z.t1 - z.t0), 0, 1);
      z.m.visible = k > 0;
      z.disegno.visible = k < 1;
      if (z.scatto) {
        const s = k > 0 ? easeOutBack(k) : 0.001;
        z.m.scale.setScalar(Math.max(0.001, s));
        continue;
      }
      const e = easeOutBack(k);
      z.m.position.lerpVectors(z.fine.clone().add(z.da.p), z.fine, e);
      z.m.rotation.z = z.rotZ + z.da.r * (1 - easeOut(k));
      z.m.rotation.x = 0.35 * (1 - easeOut(k));
    }
    for (const g of laterali) {
      const { z, t0, t1 } = g.userData;
      const k = clamp((p - t0) / (t1 - t0), 0, 1);
      g.visible = k > 0;
      g.position.z = z + Math.sign(z) * 9 * (1 - easeOut(k));
    }
    for (const a of arcarecci) {
      const k = clamp((p - a.t0) / (a.t1 - a.t0), 0, 1);
      a.m.visible = k > 0;
      a.m.position.y = a.fine.y + 4 * (1 - easeOutBack(k));
    }
    ombra.material.opacity = 0.35 + 0.65 * clamp(p * 4, 0, 1);
    // la camera gira attorno alla capriata con lo scroll, e respira piano col tempo
    const respiro = ridotto ? 0 : Math.sin(ora * 0.00028) * 0.07;
    const az = -0.62 + p * 1.2 + respiro + mx * 0.18;
    const el = 0.16 + p * 0.2 + my * 0.06;
    const r = raggio * (1.06 - 0.08 * p);
    camera.position.set(
      bersaglio.x + r * Math.sin(az) * Math.cos(el),
      bersaglio.y + r * Math.sin(el),
      bersaglio.z + r * Math.cos(az) * Math.cos(el),
    );
    camera.lookAt(bersaglio);
    renderer.render(scene, camera);
  };

  if (ridotto) {
    posa(1, 0);
    addEventListener('resize', () => posa(1, 0));
    return true;
  }
  ciclo(sezione, (ora) => posa(progresso(), ora));
  posa(progresso(), performance.now());
  return true;
}
