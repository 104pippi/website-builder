// Paint Service — i due momenti 3D: il rullo che colora l'hero e la parete in sezione.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const RIDUCI = matchMedia('(prefers-reduced-motion: reduce)').matches;
const telefono = () => innerWidth < 760;
const dpr = () => Math.min(devicePixelRatio || 1, telefono() ? 1.5 : 2);
const ora = () => performance.now() / 1000;
const clamp = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
const facile = (x) => 0.5 - 0.5 * Math.cos(Math.PI * clamp(x));
const esce = (x) => 1 - Math.pow(1 - clamp(x), 3);
const PS = (window.PS = window.PS || {});

/* ---------- pezzi comuni ---------- */

function texturaRumore(w, h, punti, chiaro = 150, scuro = 90, base = '#808080') {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d');
  g.fillStyle = base; g.fillRect(0, 0, w, h);
  for (let i = 0; i < punti; i++) {
    const v = (scuro + Math.random() * (chiaro - scuro)) | 0;
    g.fillStyle = `rgb(${v},${v},${v})`;
    g.fillRect(Math.random() * w, Math.random() * h, 1 + Math.random() * 1.6, 1 + Math.random() * 2.4);
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

// Rullo da pittore: manicotto, tappi, telaio a gabbia e manico blu con l'anello lime del logo.
function creaRullo(L, taglia = L, colore = 0xf2f0ea) {
  const r = taglia * 0.135;
  const gruppo = new THREE.Group();
  const rotante = new THREE.Group();
  const pelo = texturaRumore(256, 64, 2600, 230, 70);
  pelo.repeat.set(Math.max(2, Math.round(L / taglia * 5)), 2);
  const manicotto = new THREE.Mesh(
    new THREE.CylinderGeometry(r, r, L, 40, 1),
    new THREE.MeshStandardMaterial({ color: colore, roughness: 0.93, bumpMap: pelo, bumpScale: 2.2 })
  );
  manicotto.rotation.z = Math.PI / 2;
  rotante.add(manicotto);
  const tappoG = new THREE.CylinderGeometry(r * 0.5, r * 0.5, taglia * 0.025, 24);
  const tappoM = new THREE.MeshStandardMaterial({ color: 0x9aa3ad, roughness: 0.35, metalness: 0.7 });
  for (const s of [-1, 1]) {
    const t = new THREE.Mesh(tappoG, tappoM);
    t.rotation.z = Math.PI / 2;
    t.position.x = s * (L / 2 + taglia * 0.012);
    rotante.add(t);
  }
  gruppo.add(rotante);

  const k = taglia;
  const attacco = new THREE.Vector3(0, -r * 3.2, r * 2.7);
  const curva = new THREE.CatmullRomCurve3([
    new THREE.Vector3(L / 2 + k * 0.02, 0, 0),
    new THREE.Vector3(L / 2 + k * 0.1, 0, 0),
    new THREE.Vector3(L / 2 + k * 0.12, -r * 1.4, r * 0.7),
    new THREE.Vector3(Math.max(L * 0.2, k * 0.12), -r * 2.6, r * 2.1),
    attacco,
  ]);
  const metallo = new THREE.MeshStandardMaterial({ color: 0xd2d7dd, metalness: 1, roughness: 0.26 });
  gruppo.add(new THREE.Mesh(new THREE.TubeGeometry(curva, 48, k * 0.013, 8), metallo));

  const dir = new THREE.Vector3(0, -0.6, 0.8).normalize();
  const lungh = k * 0.62;
  const manico = new THREE.Mesh(
    new THREE.CylinderGeometry(k * 0.036, k * 0.044, lungh, 24),
    new THREE.MeshStandardMaterial({ color: 0x0d4295, roughness: 0.42 })
  );
  manico.position.copy(attacco).addScaledVector(dir, lungh / 2 + k * 0.03);
  manico.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
  gruppo.add(manico);
  const anello = new THREE.Mesh(
    new THREE.CylinderGeometry(k * 0.047, k * 0.047, k * 0.05, 24),
    new THREE.MeshStandardMaterial({ color: 0xaac917, roughness: 0.5 })
  );
  anello.position.copy(attacco).addScaledVector(dir, k * 0.07);
  anello.quaternion.copy(manico.quaternion);
  gruppo.add(anello);
  return { gruppo, rotante, r };
}

function ambiente(renderer) {
  const pm = new THREE.PMREMGenerator(renderer);
  const env = pm.fromScene(new RoomEnvironment(), 0.04).texture;
  pm.dispose();
  return env;
}

/* ---------- HERO: il rullo porta il colore ---------- */

const VS_SCHERMO = /* glsl */`
varying vec2 vUv;
void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;

const FS_PARETE_HERO = /* glsl */`
precision highp float;
uniform sampler2D uTex;
uniform vec2 uRes, uImg, uPos;
uniform float uT, uN, uTB, uTS, uFine;
varying vec2 vUv;
float h21(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float rumore(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(h21(i), h21(i + vec2(1.0, 0.0)), f.x), mix(h21(i + vec2(0.0, 1.0)), h21(i + vec2(1.0, 1.0)), f.x), f.y); }
float facile(float x){ return 0.5 - 0.5 * cos(3.14159265 * clamp(x, 0.0, 1.0)); }
vec2 copri(vec2 uv){
  float ra = uRes.x / uRes.y, ri = uImg.x / uImg.y;
  vec2 s = ra > ri ? vec2(1.0, ri / ra) : vec2(ra / ri, 1.0);
  return uv * s + (1.0 - s) * vec2(uPos.x, 1.0 - uPos.y);
}
float banda(float b, float xb, float yd, out float fresco){
  fresco = 0.0;
  if (b < 0.0 || b > uN - 1.0) return 0.0;
  float loc = clamp((uT - b * (uTB + uTS)) / uTB, 0.0, 1.0);
  if (uT < b * (uTB + uTS)) return 0.0;
  float testa = mix(-0.14, 1.14, facile(loc));
  float yt = mod(b, 2.0) < 0.5 ? yd : 1.0 - yd;
  float dietro = testa - yt;
  float n = rumore(vec2(yd * uRes.y * 0.05, b * 7.13));
  float bordoX = 0.535 + 0.035 * (n - 0.5) - abs(xb - (b + 0.5));
  float my = smoothstep(-0.003, 0.006, dietro + 0.006 * (rumore(vec2(xb * 30.0, b)) - 0.5));
  float m = smoothstep(0.0, 0.02, bordoX) * my;
  fresco = m * exp(-max(dietro, 0.0) * 4.0) * (1.0 - uFine);
  return m;
}
void main(){
  vec2 uv = vUv;
  vec3 c = texture2D(uTex, copri(uv)).rgb;
  float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
  vec3 fondo = vec3(clamp((l * 1.15 - 0.5) * 0.8 + 0.5, 0.0, 1.0));
  float yd = 1.0 - uv.y;
  float xb = uv.x * uN;
  float b = floor(xb);
  float f1, f2, f3;
  float m = max(banda(b, xb, yd, f1), max(banda(b - 1.0, xb, yd, f2), banda(b + 1.0, xb, yd, f3)));
  float fresco = max(f1, max(f2, f3));
  float grana = 0.55 * rumore(uv * uRes * 0.33) + 0.45 * rumore(uv * uRes * 0.09);
  float copre = m * mix(1.0, 0.8 + 0.2 * grana, fresco);
  vec3 col = mix(fondo, c, copre);
  col += fresco * 0.09 * (0.5 + 0.5 * grana);
  col = mix(col, c, uFine);
  gl_FragColor = vec4(col, 1.0);
}`;

function avviaHero() {
  const hero = document.querySelector('[data-hero]');
  if (!hero) return;
  const tela = hero.querySelector('.hero__tela');
  const img = hero.querySelector('.hero__foto--primer');
  if (RIDUCI) { hero.classList.add('hero--colorata'); return; }
  if (PS.heroSaltato || hero.classList.contains('hero--colorata')) return;
  if (window.scrollY > innerHeight * 0.6) { hero.classList.add('hero--colorata'); return; }

  // copia senza srcset: con i descrittori "w" naturalWidth è corretto per la densità e la texture verrebbe allocata storta
  const fonte = new Image();
  const pronta = (img.complete && img.naturalWidth ? Promise.resolve() : img.decode().catch(() => {}))
    .then(() => { fonte.src = img.currentSrc || img.src; return fonte.decode(); });
  pronta.catch(() => {}).then(() => {
    if (PS.heroSaltato || !fonte.naturalWidth) { if (!PS.heroSaltato) hero.classList.add('hero--pennellata'); return; }
    PS.heroPartito = true;
    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ canvas: tela, antialias: true, alpha: false, powerPreference: 'high-performance' });
    } catch (e) { hero.classList.add('hero--pennellata'); return; }
    renderer.setPixelRatio(dpr());
    const box = tela.parentElement;
    const W = box.clientWidth, H = box.clientHeight;
    renderer.setSize(W, H, false);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.NeutralToneMapping;

    const scena = new THREE.Scene();
    scena.environment = ambiente(renderer);
    const cam = new THREE.PerspectiveCamera(30, W / H, 0.1, 50);
    const D = 10;
    cam.position.set(0, 0, D);
    const Hm = 2 * D * Math.tan(THREE.MathUtils.degToRad(15));
    const Wm = Hm * W / H;
    const sole = new THREE.DirectionalLight(0xfff4e6, 2.2);
    sole.position.set(-3, 5, 7);
    scena.add(sole, new THREE.HemisphereLight(0xffffff, 0x6d7890, 0.6));

    const op = getComputedStyle(img).objectPosition.split(' ').map((v) => parseFloat(v) / 100);
    const aspetto = W / H;
    const N = aspetto > 1.7 ? 5 : aspetto > 1.05 ? 4 : 3;
    const TB = N === 3 ? 0.52 : 0.42, TS = 0.13;
    const tex = new THREE.Texture(fonte);
    tex.colorSpace = THREE.NoColorSpace;
    tex.minFilter = THREE.LinearFilter;
    tex.generateMipmaps = false;
    tex.needsUpdate = true;
    const uni = {
      uTex: { value: tex },
      uRes: { value: new THREE.Vector2(W, H) },
      uImg: { value: new THREE.Vector2(fonte.naturalWidth, fonte.naturalHeight) },
      uPos: { value: new THREE.Vector2(isNaN(op[0]) ? 0.5 : op[0], isNaN(op[1]) ? 0.5 : op[1]) },
      uT: { value: -1 }, uN: { value: N }, uTB: { value: TB }, uTS: { value: TS }, uFine: { value: 0 },
    };
    const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({
      uniforms: uni, vertexShader: VS_SCHERMO, fragmentShader: FS_PARETE_HERO, depthTest: false, depthWrite: false,
    }));
    quad.frustumCulled = false;
    quad.renderOrder = -1;
    scena.add(quad);

    // il rullo è lungo quanto una banda, sul piano z = r davanti alla parete
    const larghBanda = Wm / N;
    const taglia = Math.min(larghBanda * 1.04, Hm * 0.26);
    const rullo = creaRullo(larghBanda * 1.04, taglia);
    const zr = rullo.r;
    const scala = (D - zr) / D;
    rullo.gruppo.scale.setScalar(scala);
    rullo.gruppo.position.z = zr;
    scena.add(rullo.gruppo);

    const ciclo = TB + TS;
    const fineRullo = N * ciclo - TS + 0.25;
    function posa(t) {
      const b = Math.floor(t / ciclo);
      if (t < 0) return { x: 0.5 / N, yd: -0.3 };
      if (b >= N) return { x: (N - 0.5) / N, yd: (N - 1) % 2 === 0 ? 1.4 : -0.4 };
      const dentro = t - b * ciclo;
      if (dentro <= TB) {
        const testa = -0.14 + 1.28 * facile(dentro / TB);
        return { x: (b + 0.5) / N, yd: b % 2 === 0 ? testa : 1 - testa };
      }
      const k = (dentro - TB) / TS;
      return { x: (b + 0.5 + facile(k)) / N, yd: b % 2 === 0 ? 1.14 + 0.08 * Math.sin(Math.PI * k) : -0.14 - 0.08 * Math.sin(Math.PI * k) };
    }

    let t0 = -1, yPrima = null, finito = false;
    renderer.compile(scena, cam);
    function fotogramma() {
      if (finito) return;
      const adesso = ora();
      if (t0 < 0) t0 = adesso + 0.3;
      const t = adesso - t0;
      uni.uT.value = t;
      uni.uFine.value = clamp((t - fineRullo) / 0.4);
      const p = posa(t);
      const X = (p.x - 0.5) * Wm * scala;
      const Y = (0.5 - p.yd) * Hm * scala;
      rullo.gruppo.position.x = X;
      rullo.gruppo.position.y = Y;
      if (yPrima !== null) rullo.rotante.rotation.x += (Y - yPrima) / (rullo.r * scala);
      yPrima = Y;
      rullo.gruppo.rotation.z = Math.sin(t * 5.2) * 0.025;
      rullo.gruppo.rotation.y = Math.sin(t * 3.1) * 0.04;
      renderer.render(scena, cam);
      if (t > fineRullo + 0.45) {
        finito = true;
        hero.classList.add('hero--colorata');
        setTimeout(() => {
          renderer.dispose();
          tex.dispose();
          tela.remove();
        }, 700);
        return;
      }
      requestAnimationFrame(fotogramma);
    }
    renderer.render(scena, cam);
    hero.classList.add('hero--rullo');
    requestAnimationFrame(fotogramma);
    // se la finestra cambia misura durante l'intro, il colore arriva subito
    addEventListener('resize', () => { if (!finito && Math.abs(box.clientWidth - W) > 40) { finito = true; hero.classList.add('hero--colorata'); } }, { once: true });
  });
}

/* ---------- LA PARETE IN SEZIONE ---------- */

const FS_BARRIERA = /* glsl */`
uniform float uSpread, uTempo;
varying vec3 vP;
void main(){
  float passo = 0.33;
  float d = abs(mod(vP.x + 1.32 + passo * 0.5, passo) - passo * 0.5);
  float a = smoothstep(uSpread * passo * 0.52 + 0.01, uSpread * passo * 0.52 - 0.01, d);
  if (uSpread >= 0.999) a = 1.0;
  float onda = 0.82 + 0.18 * sin(uTempo * 3.0 + vP.x * 4.0);
  vec3 col = vec3(0.09, 0.72, 0.82) * (1.15 * onda);
  if (a < 0.02) discard;
  gl_FragColor = vec4(col, a * 0.92);
}`;
const VS_LOCALE = /* glsl */`
varying vec3 vP;
void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;

function avviaParete() {
  const sez = document.querySelector('#parete');
  if (!sez) return;
  const palco = sez.querySelector('[data-palco]');
  const corsa = sez.querySelector('[data-corsa]');
  const tela = sez.querySelector('.parete__tela');
  const etichette = [...sez.querySelectorAll('[data-etichetta]')];

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas: tela, antialias: true, alpha: true, powerPreference: 'high-performance' });
  } catch (e) { return; }
  renderer.setPixelRatio(dpr());
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.setClearColor(0x0a1b40, 0);
  renderer.setClearAlpha(0);

  const scena = new THREE.Scene();
  scena.environment = ambiente(renderer);
  scena.environmentIntensity = 0.75;
  const cam = new THREE.PerspectiveCamera(34, 1, 0.1, 60);
  const luce = new THREE.DirectionalLight(0xfff1e0, 2.4);
  luce.position.set(4, 6, 5);
  const contro = new THREE.DirectionalLight(0x7fb8ff, 0.9);
  contro.position.set(-5, 2, -3);
  scena.add(luce, contro, new THREE.HemisphereLight(0xdfe8ff, 0x1a2440, 0.5));

  // pavimento tecnico: griglia sottile da disegno
  const griglia = new THREE.GridHelper(14, 28, 0x2f5fb0, 0x1d3d7a);
  griglia.position.y = -1.205;
  griglia.material.transparent = true;
  griglia.material.opacity = 0.45;
  scena.add(griglia);

  const LARGH = 3.0, ALT = 2.4, Y0 = -1.2, SX = -LARGH / 2;
  // ogni strato è un gruppo con il perno sul bordo sinistro: alla fine si aprono a ventaglio, come il logo
  const strati = [];
  function strato() {
    const g = new THREE.Group();
    g.position.set(SX, 0, 0);
    scena.add(g);
    strati.push(g);
    return g;
  }

  /* 0. muratura */
  const gMuro = strato();
  const malta = new THREE.Mesh(
    new THREE.BoxGeometry(LARGH - 0.006, ALT - 0.004, 0.47),
    new THREE.MeshStandardMaterial({ color: 0xb9b2a5, roughness: 1, map: texturaRumore(128, 128, 900, 200, 120, '#a8a194') })
  );
  malta.position.set(LARGH / 2, Y0 + ALT / 2, -0.25);
  gMuro.add(malta);
  const M = { l: 0.46, h: 0.15, p: 0.22, g: 0.02 };
  const mattoni = [];
  const corsi = Math.floor(ALT / (M.h + M.g));
  for (let c = 0; c < corsi; c++) {
    const y = Y0 + M.g / 2 + c * (M.h + M.g) + M.h / 2;
    const off = (c % 2) * (M.l + M.g) / 2;
    for (let x0 = -off; x0 < LARGH; x0 += M.l + M.g) {
      const a = Math.max(x0, 0), b = Math.min(x0 + M.l, LARGH);
      if (b - a < 0.05) continue;
      for (const z of [-0.12, -0.37]) mattoni.push({ x: (a + b) / 2, y, z, l: b - a });
    }
  }
  const matMattone = new THREE.MeshStandardMaterial({ roughness: 0.88, map: texturaRumore(64, 32, 300, 210, 110, '#9a9a9a') });
  const istMattoni = new THREE.InstancedMesh(new THREE.BoxGeometry(1, M.h, M.p), matMattone, mattoni.length);
  const basi = [];
  const tmp = new THREE.Object3D();
  const col = new THREE.Color();
  mattoni.forEach((m, i) => {
    tmp.position.set(m.x, m.y, m.z);
    tmp.scale.set(m.l, 1, 1);
    tmp.updateMatrix();
    istMattoni.setMatrixAt(i, tmp.matrix);
    const c = new THREE.Color().setHSL(0.035 + Math.random() * 0.018, 0.5 + Math.random() * 0.12, 0.36 + Math.random() * 0.08);
    basi.push(c);
    istMattoni.setColorAt(i, c);
  });
  gMuro.add(istMattoni);

  // umidità che sale: punti azzurri sulla faccia del muro
  const NP = telefono() ? 150 : 260;
  const posU = new Float32Array(NP * 3);
  const velU = new Float32Array(NP);
  for (let i = 0; i < NP; i++) {
    posU[i * 3] = 0.05 + Math.random() * (LARGH - 0.1);
    posU[i * 3 + 1] = Y0 + Math.random() * 0.8;
    posU[i * 3 + 2] = 0.006;
    velU[i] = 0.12 + Math.random() * 0.25;
  }
  const geoU = new THREE.BufferGeometry();
  geoU.setAttribute('position', new THREE.BufferAttribute(posU, 3));
  const sprite = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 64;
    const g = c.getContext('2d');
    const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.35, 'rgba(255,255,255,.75)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
    return new THREE.CanvasTexture(c);
  })();
  const matU = new THREE.PointsMaterial({ color: 0x6fd6ea, size: telefono() ? 0.075 : 0.06, map: sprite, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.9 });
  const umido = new THREE.Points(geoU, matU);
  gMuro.add(umido);

  // barriera chimica: iniettori e fascia di resina
  const YB = -0.94;
  const iniettori = new THREE.Group();
  const corpoG = new THREE.CylinderGeometry(0.02, 0.02, 0.2, 12);
  const tappoG = new THREE.CylinderGeometry(0.045, 0.045, 0.06, 16);
  const corpoM = new THREE.MeshStandardMaterial({ color: 0xdfe5ea, metalness: 0.6, roughness: 0.3 });
  const tappoM = new THREE.MeshStandardMaterial({ color: 0x17b7d2, roughness: 0.4, emissive: 0x0b5866, emissiveIntensity: 0.6 });
  const listaIniettori = [];
  for (let i = 0; i < 9; i++) {
    const g = new THREE.Group();
    const cpo = new THREE.Mesh(corpoG, corpoM); cpo.rotation.x = Math.PI / 2;
    const tp = new THREE.Mesh(tappoG, tappoM); tp.rotation.x = Math.PI / 2; tp.position.z = 0.12;
    g.add(cpo, tp);
    g.position.set(0.18 + i * 0.33, YB, 0.6);
    iniettori.add(g);
    listaIniettori.push(g);
  }
  gMuro.add(iniettori);
  const uniB = { uSpread: { value: 0 }, uTempo: { value: 0 } };
  const fascia = new THREE.Mesh(
    new THREE.BoxGeometry(LARGH + 0.006, 0.075, 0.5),
    new THREE.ShaderMaterial({ uniforms: uniB, vertexShader: VS_LOCALE, fragmentShader: FS_BARRIERA, transparent: true, depthWrite: false })
  );
  fascia.position.set(LARGH / 2, YB, -0.245);
  gMuro.add(fascia);

  /* 1. intonaco deumidificante */
  const gInt = strato();
  const LI = 2.72, HI = 2.32;
  const geoInt = new THREE.BoxGeometry(LI, HI, 0.06);
  geoInt.translate(LI / 2, 0, 0);
  const intonaco = new THREE.Mesh(geoInt, new THREE.MeshStandardMaterial({
    color: 0xdcd8cf, roughness: 1, map: texturaRumore(256, 256, 7000, 230, 150, '#d0ccc2'), bumpMap: texturaRumore(256, 256, 5000, 255, 0), bumpScale: 1.5,
  }));
  intonaco.position.set(0, Y0 + HI / 2, 0.03);
  gInt.add(intonaco);

  /* 2. cappotto */
  const gCap = strato();
  const PW = 0.6, PH = 0.4, CX = 2.36, CY0 = -1.02, CY1 = 1.0, CZ = 0.06 + 0.08;
  const pannelli = [];
  for (let r = 0; Math.round((CY0 + r * PH) * 1000) < Math.round(CY1 * 1000); r++) {
    const y = CY0 + r * PH + PH / 2;
    const off = (r % 2) * PW / 2;
    for (let x0 = -off; x0 < CX - 0.01; x0 += PW) {
      const a = Math.max(x0, 0), b = Math.min(x0 + PW, CX);
      if (b - a < 0.06) continue;
      pannelli.push({ x: (a + b) / 2, y, l: b - a, k: 0 });
    }
  }
  pannelli.forEach((p, i) => { p.k = i / pannelli.length; });
  const istPannelli = new THREE.InstancedMesh(
    new THREE.BoxGeometry(1, PH - 0.008, 0.16),
    new THREE.MeshStandardMaterial({ color: 0x585e66, roughness: 0.95, map: texturaRumore(128, 128, 1800, 255, 160, '#8c8c8c') }),
    pannelli.length
  );
  gCap.add(istPannelli);
  const tasselli = [];
  pannelli.forEach((p, i) => {
    if (p.l < PW * 0.7) tasselli.push({ i, dx: 0 });
    else { tasselli.push({ i, dx: -p.l * 0.28 }); tasselli.push({ i, dx: p.l * 0.28 }); }
  });
  const tasselloG = new THREE.CylinderGeometry(0.042, 0.042, 0.014, 16);
  tasselloG.rotateX(Math.PI / 2);
  const istTasselli = new THREE.InstancedMesh(tasselloG, new THREE.MeshStandardMaterial({ color: 0xf1f1ee, roughness: 0.6 }), tasselli.length);
  gCap.add(istTasselli);

  /* 3. rasatura armata: rete e rasante */
  const gRas = strato();
  const RX = 2.0, RY0 = -1.02, RY1 = 0.86;
  const reteTex = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 64;
    const g = c.getContext('2d');
    g.clearRect(0, 0, 64, 64);
    g.fillStyle = '#ffffff';
    g.fillRect(0, 0, 64, 9); g.fillRect(0, 0, 9, 64);
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set((RX + 0.2) / 0.085, (RY1 - RY0) / 0.085);
    t.anisotropy = 4;
    return t;
  })();
  const geoRete = new THREE.PlaneGeometry(RX + 0.2, RY1 - RY0);
  geoRete.translate((RX + 0.2) / 2, -(RY1 - RY0) / 2, 0);
  const rete = new THREE.Mesh(geoRete, new THREE.MeshStandardMaterial({ color: 0xf0d870, roughness: 0.6, alphaMap: reteTex, transparent: true, alphaTest: 0.35, side: THREE.DoubleSide }));
  rete.position.set(0, RY1, 0.232);
  gRas.add(rete);
  const geoRasante = new THREE.BoxGeometry(RX, RY1 - RY0, 0.026);
  geoRasante.translate(RX / 2, 0, 0);
  const rasante = new THREE.Mesh(geoRasante, new THREE.MeshStandardMaterial({ color: 0xecebe5, roughness: 0.92, map: texturaRumore(256, 256, 3000, 255, 205, '#eeeeea') }));
  rasante.position.set(0, (RY0 + RY1) / 2, 0.233);
  gRas.add(rasante);

  /* 4. finitura, stesa col rullo */
  const gFin = strato();
  const FX = 1.64, FY0 = -1.02, FY1 = 0.76;
  const geoFin = new THREE.BoxGeometry(FX, FY1 - FY0, 0.014);
  geoFin.translate(FX / 2, -(FY1 - FY0) / 2, 0);
  const matFin = new THREE.MeshStandardMaterial({ color: new THREE.Color(PS.coloreFinitura || '#c99a45'), roughness: 0.72, map: texturaRumore(256, 256, 4000, 255, 215, '#f2f2f2') });
  const finitura = new THREE.Mesh(geoFin, matFin);
  finitura.position.set(0, FY1, 0.253);
  gFin.add(finitura);
  const rulloFin = creaRullo(FX + 0.02, 0.62);
  rulloFin.gruppo.position.set(FX / 2, FY1, 0.26 + rulloFin.r);
  gFin.add(rulloFin.gruppo);

  /* ancore delle etichette (coordinate locali di ogni gruppo) */
  const ancore = [
    { g: gMuro, p: new THREE.Vector3(LARGH, Y0 + ALT, -0.25) },
    { g: gMuro, p: new THREE.Vector3(LARGH, YB, 0) },
    { g: gInt, p: new THREE.Vector3(LI, Y0 + HI, 0.06) },
    { g: gCap, p: new THREE.Vector3(CX, CY1, 0.22) },
    { g: gRas, p: new THREE.Vector3(RX, RY1, 0.245) },
    { g: gFin, p: new THREE.Vector3(FX, FY1, 0.26) },
  ];
  const largEt = etichette.map(() => 0);

  /* inquadrature per passo */
  const POSE = [
    { p: [2.5, 0.25, 4.7], t: [0.15, -0.12, 0] },
    { p: [2.1, -0.55, 3.3], t: [0.45, -0.85, 0] },
    { p: [3.1, 0.6, 4.5], t: [0.05, -0.05, 0] },
    { p: [3.5, 1.15, 4.9], t: [0.05, 0, 0.1] },
    { p: [2.7, 0.75, 3.8], t: [0.35, 0.1, 0.2] },
    { p: [1.7, 0.35, 5.0], t: [-0.2, -0.05, 0.2] },
    { p: [5.6, 2.1, 6.2], t: [0.35, -0.1, 1.25] },
  ].map((o) => ({ p: new THREE.Vector3(...o.p), t: new THREE.Vector3(...o.t) }));
  // su telefono la camera si allontana, di più dove serve vedere tutta la parete
  const LONTANO = [1.45, 1.25, 1.5, 1.55, 1.45, 1.5, 1.5];
  const LONTANO_PC = [1.3, 1.08, 1.15, 1.26, 1.36, 1.14, 1.0];
  const camPos = new THREE.Vector3().copy(POSE[0].p);
  const camTgt = new THREE.Vector3().copy(POSE[0].t);
  const vPos = new THREE.Vector3(), vTgt = new THREE.Vector3(), vTmp = new THREE.Vector3();

  let W = 1, H = 1;
  function misura() {
    W = palco.clientWidth; H = palco.clientHeight;
    renderer.setPixelRatio(dpr());
    renderer.setSize(W, H, false);
    cam.aspect = W / H;
    cam.fov = W / H < 0.8 ? 46 : 34;
    if (W >= 960) cam.setViewOffset(W, H, -W * 0.17, 0, W, H);
    else cam.setViewOffset(W, H, 0, H * 0.13, W, H);
    cam.updateProjectionMatrix();
  }
  misura();
  addEventListener('resize', misura);

  const coloreAttuale = new THREE.Color(matFin.color);
  const coloreMeta = new THREE.Color();
  let ultimoBagnato = -9;
  let attiva = false, tPrima = ora(), tempo = 0, primo = true;

  function avanzamento() {
    const r = corsa.getBoundingClientRect();
    const p = clamp(-r.top / Math.max(1, r.height - innerHeight));
    return Math.min(p * 7, 6.999);
  }

  function aggiorna(s, dt) {
    /* umidità: sale nel passo 0, si ferma sotto la barriera nel passo 1 */
    const sale = Y0 + 0.25 + 1.15 * facile(s / 0.75);
    const asciuga = facile((s - 1.4) / 0.5);
    const linea = THREE.MathUtils.lerp(sale, YB - 0.02, asciuga);
    if (Math.abs(linea - ultimoBagnato) > 0.004) {
      ultimoBagnato = linea;
      mattoni.forEach((m, i) => {
        const bag = 1 - THREE.MathUtils.smoothstep(m.y, linea - 0.3, linea + 0.06);
        col.copy(basi[i]).multiplyScalar(1 - 0.42 * bag);
        istMattoni.setColorAt(i, col);
      });
      istMattoni.instanceColor.needsUpdate = true;
    }
    const pos = geoU.attributes.position.array;
    for (let i = 0; i < NP; i++) {
      let y = pos[i * 3 + 1] + velU[i] * dt * (RIDUCI ? 0 : 1);
      if (y > linea) y = Y0 + Math.random() * 0.15;
      pos[i * 3 + 1] = y;
    }
    geoU.attributes.position.needsUpdate = true;
    matU.opacity = 0.9 * (1 - facile((s - 2.0) / 0.4));
    umido.visible = matU.opacity > 0.01;

    /* barriera chimica */
    listaIniettori.forEach((g, i) => {
      const entra = esce((s - 1.0 - i * 0.025) / 0.3);
      const via = facile((s - 1.85) / 0.25);
      g.position.z = THREE.MathUtils.lerp(0.75, 0.06, entra);
      g.scale.setScalar(Math.max(0.0001, (entra > 0 ? 1 : 0) * (1 - via)));
      g.visible = entra > 0.001 && via < 0.999;
    });
    uniB.uSpread.value = facile((s - 1.2) / 0.55);
    uniB.uTempo.value = tempo;
    fascia.visible = uniB.uSpread.value > 0.001;

    /* intonaco: steso da sinistra a destra */
    const qi = facile((s - 2.0) / 0.6);
    intonaco.scale.x = Math.max(0.0001, qi);
    intonaco.visible = qi > 0.001;

    /* cappotto: pannelli dal basso verso l'alto, poi i tasselli */
    pannelli.forEach((p, i) => {
      const q = esce((s - 3.0 - p.k * 0.55) / 0.32);
      tmp.position.set(p.x, p.y, CZ + (1 - q) * 1.7);
      tmp.rotation.set((1 - q) * -0.5, (1 - q) * 0.7, 0);
      tmp.scale.set(q > 0 ? p.l - 0.008 : 0.0001, q > 0 ? 1 : 0.0001, q > 0 ? 1 : 0.0001);
      tmp.updateMatrix();
      istPannelli.setMatrixAt(i, tmp.matrix);
    });
    istPannelli.instanceMatrix.needsUpdate = true;
    tasselli.forEach((t, j) => {
      const p = pannelli[t.i];
      const q = esce((s - 3.0 - p.k * 0.55 - 0.3) / 0.15);
      tmp.position.set(p.x + t.dx, p.y, CZ + 0.087);
      tmp.rotation.set(0, 0, 0);
      tmp.scale.setScalar(Math.max(0.0001, q));
      tmp.updateMatrix();
      istTasselli.setMatrixAt(j, tmp.matrix);
    });
    istTasselli.instanceMatrix.needsUpdate = true;

    /* rasatura armata: la rete si srotola dall'alto, poi il rasante */
    const qr = facile((s - 4.0) / 0.45);
    rete.scale.y = Math.max(0.0001, qr);
    rete.visible = qr > 0.001;
    const qs = facile((s - 4.4) / 0.5);
    rasante.scale.x = Math.max(0.0001, qs);
    rasante.visible = qs > 0.001;

    /* finitura: il rullo la stende dall'alto */
    const qf = facile((s - 5.0) / 0.6);
    finitura.scale.y = Math.max(0.0001, qf);
    finitura.visible = qf > 0.001;
    const altF = FY1 - FY0;
    const yR = FY1 - altF * qf;
    const vis = qf > 0.001 && s < 5.95;
    rulloFin.gruppo.visible = vis;
    rulloFin.gruppo.position.y = yR;
    rulloFin.rotante.rotation.x = (yR - FY1) / rulloFin.r;
    rulloFin.gruppo.position.z = 0.26 + rulloFin.r + facile((s - 5.62) / 0.3) * 0.9;
    coloreMeta.set(PS.coloreFinitura || '#c99a45');
    coloreAttuale.lerp(coloreMeta, 1 - Math.exp(-dt * 7));
    matFin.color.copy(coloreAttuale);

    /* esploso: gli strati si aprono a ventaglio dal bordo sinistro */
    const qe = facile((s - 6.0) / 0.55);
    strati.forEach((g, i) => {
      g.rotation.y = -i * 0.07 * qe;
      g.position.z = i * 0.55 * qe;
      g.position.x = SX + i * 0.06 * qe;
    });

    /* camera */
    const i = Math.min(6, Math.floor(s));
    const f = s - i;
    const k = THREE.MathUtils.smoothstep(f, 0.55, 1.0);
    const j = Math.min(6, i + 1);
    vPos.lerpVectors(POSE[i].p, POSE[j].p, k);
    vTgt.lerpVectors(POSE[i].t, POSE[j].t, k);
    {
      const tab = W / H < 0.8 ? LONTANO : LONTANO_PC;
      const fl = THREE.MathUtils.lerp(tab[i], tab[j], k) * (W < 960 && W / H >= 0.8 ? 1.1 : 1);
      vTmp.subVectors(vPos, vTgt).multiplyScalar(fl);
      vPos.copy(vTgt).add(vTmp);
    }
    if (!RIDUCI) {
      vPos.x += Math.sin(tempo * 0.35) * 0.12;
      vPos.y += Math.cos(tempo * 0.27) * 0.06;
    }
    const morb = primo ? 1 : 1 - Math.exp(-dt * 4.5);
    camPos.lerp(vPos, morb);
    camTgt.lerp(vTgt, morb);
    cam.position.copy(camPos);
    cam.lookAt(camTgt);
    primo = false;
  }

  function etichetteAggiorna(s) {
    const o = clamp((s - 6.15) / 0.3);
    if (o <= 0) {
      etichette.forEach((el) => { if (el.style.opacity !== '0') el.style.opacity = '0'; });
      return;
    }
    cam.updateMatrixWorld();
    // posizioni proiettate, poi si allontanano in verticale quelle che si toccano
    const pos = ancore.map((a, i) => {
      a.g.updateMatrixWorld();
      vTmp.copy(a.p).applyMatrix4(a.g.matrixWorld).project(cam);
      if (!largEt[i]) largEt[i] = etichette[i].offsetWidth || 120;
      return { i, x: clamp((vTmp.x * 0.5 + 0.5) * W, 10, W - largEt[i] - 10), y: clamp((-vTmp.y * 0.5 + 0.5) * H, 90, H - 40) };
    });
    pos.sort((a, b) => a.y - b.y);
    for (let n = 1; n < pos.length; n++) {
      const a = pos[n - 1], b = pos[n];
      const siToccano = b.x < a.x + largEt[a.i] + 8 && a.x < b.x + largEt[b.i] + 8;
      if (siToccano && b.y - a.y < 30) b.y = a.y + 30;
    }
    pos.forEach((q) => {
      const el = etichette[q.i];
      el.style.setProperty('--x', q.x.toFixed(1) + 'px');
      el.style.setProperty('--y', q.y.toFixed(1) + 'px');
      el.style.opacity = o.toFixed(3);
    });
  }

  function fotogramma() {
    if (!attiva) return;
    const adesso = ora();
    const dt = Math.min(0.05, adesso - tPrima);
    tPrima = adesso;
    tempo += dt;
    const s = avanzamento();
    aggiorna(s, dt);
    renderer.render(scena, cam);
    etichetteAggiorna(s);
    requestAnimationFrame(fotogramma);
  }

  function accendi() {
    if (attiva) return;
    attiva = true;
    tPrima = ora();
    requestAnimationFrame(fotogramma);
  }
  function spegni() { attiva = false; }

  const io = new IntersectionObserver((v) => { v[0].isIntersecting ? accendi() : spegni(); }, { rootMargin: '10% 0px' });
  io.observe(palco);
  document.addEventListener('visibilitychange', () => { if (document.hidden) spegni(); else if (palco.getBoundingClientRect().bottom > 0 && palco.getBoundingClientRect().top < innerHeight) accendi(); });

  renderer.compile(scena, cam);
  aggiorna(avanzamento(), 0);
  renderer.render(scena, cam);
  sez.classList.add('parete--3d');
  PS.pareteFoto = () => { aggiorna(avanzamento(), 1 / 60); renderer.render(scena, cam); etichetteAggiorna(avanzamento()); };
}

export function avvia() {
  avviaHero();
  // la parete si prepara quando ci si avvicina
  const sez = document.querySelector('#parete');
  if (!sez) return;
  let fatto = false;
  const prepara = () => { if (fatto) return; fatto = true; avviaParete(); };
  const io = new IntersectionObserver((v) => { if (v[0].isIntersecting) { io.disconnect(); prepara(); } }, { rootMargin: '150% 0px' });
  io.observe(sez);
}
