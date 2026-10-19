// La X di DOXON in 3D: i due chevron partono dalla bici e dall'auto, scorrono sulla linea di luce,
// si alzano e si incrociano. Sono di vetro turchese: rifrangono la foto della hero che sta dietro,
// poi una scia di luce li attraversa e lo scroll li porta via nella nebbia.
import * as THREE from 'three';

const B = 0.44;          // larghezza del braccio, in rapporto all'altezza (dal logo)
const SCARTO = 0.2625;   // distanza di ogni chevron dal centro della X
const DURATA = 1750;     // ms dell'arrivo
const PARTENZA = 1250;   // ms minimi dall'apertura: prima si disegna la linea

const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const outQuart = (t) => 1 - (1 - t) ** 4;
const inOutCubic = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
const outBack = (t) => { const c = 1.4; return 1 + (c + 1) * (t - 1) ** 3 + c * (t - 1) ** 2; };

function chevron(verso) {
  const s = new THREE.Shape();
  [[0, 0], [B, 0], [B + 0.5, 0.5], [B, 1], [0, 1], [0.5, 0.5]]
    .forEach(([x, y], i) => (i ? s.lineTo(x * verso, y) : s.moveTo(x * verso, y)));
  s.closePath();
  const g = new THREE.ExtrudeGeometry(s, {
    depth: 0.2, bevelEnabled: true, bevelThickness: 0.045, bevelSize: 0.03, bevelSegments: 6, curveSegments: 1,
  });
  g.center();
  return g;
}

const VERTEX = /* glsl */ `
  varying vec3 vNormale;
  varying vec3 vVista;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vVista = mv.xyz;
    vNormale = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * mv;
  }
`;

// Vetro finto ma convincente: rifrazione della foto in spazio schermo, tinta, fresnel, scia di luce
const FRAGMENT = /* glsl */ `
  uniform sampler2D uFoto;
  uniform vec4 uCopri;      // schermo -> uv della foto (come object-fit: cover)
  uniform vec2 uRis;
  uniform vec3 uTinta;
  uniform vec3 uBagliore;
  uniform float uLuce;       // intensità del bagliore mentre scorre sulla linea
  uniform float uScia;       // posizione della scia di luce
  uniform vec3 uCentro;      // centro della X in spazio vista
  uniform float uScala;
  uniform float uAlfa;
  varying vec3 vNormale;
  varying vec3 vVista;

  vec3 foto(vec2 suv) {
    vec2 uv = vec2(suv.x * uCopri.x + uCopri.y, 1.0 - ((1.0 - suv.y) * uCopri.z + uCopri.w));
    return texture2D(uFoto, clamp(uv, 0.001, 0.999)).rgb;
  }

  void main() {
    vec3 n = normalize(vNormale);
    if (!gl_FrontFacing) n = -n;
    vec3 v = normalize(-vVista);
    float facing = clamp(dot(n, v), 0.0, 1.0);
    vec2 suv = gl_FragCoord.xy / uRis;

    // rifrazione con un filo di aberrazione cromatica
    vec2 sp = n.xy * (0.045 + 0.05 * (1.0 - facing));
    vec3 dietro = vec3(foto(suv - sp * 1.12).r, foto(suv - sp).g, foto(suv - sp * 0.88).b);

    // vetro colorato: la foto filtrata dalla tinta, un po' di corpo sul colore
    vec3 col = mix(dietro * uTinta * 1.18, uTinta, 0.42);

    // luce dall'alto a sinistra per leggere le facce
    vec3 L = normalize(vec3(-0.45, 0.75, 0.55));
    float dif = max(dot(n, L), 0.0);
    col *= 0.78 + 0.32 * dif;
    float spec = pow(max(dot(reflect(-L, n), v), 0.0), 48.0);
    col += spec * 0.55;

    // bordi accesi (fresnel)
    float fr = pow(1.0 - facing, 2.6);
    col += fr * vec3(0.78, 1.0, 0.96) * 0.62;

    // scia di luce diagonale che attraversa tutta la X
    vec2 q = (vVista.xy - uCentro.xy) / uScala;
    float k = q.x * 0.82 + q.y * 0.57;
    float d = (k - uScia) * 6.5;
    col += exp(-d * d) * 0.5 * (0.5 + 0.5 * facing);

    // mentre scorre sulla linea è luce pura
    col = mix(col, uBagliore * 1.5, uLuce);

    gl_FragColor = vec4(col, uAlfa);
  }
`;

export function avvia({ hero, canvas, riduci }) {
  const mobile = matchMedia('(max-width: 759px)').matches;
  const puntatore = matchMedia('(pointer: fine)').matches;
  const imgFoto = hero.querySelector('.hero-foto');
  const scenaFoto = hero.querySelector('.hero-scena');

  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, mobile ? 1.5 : 2));
  renderer.setClearColor(0x000000, 0);
  let guasto = false; // se lo shader non compila resta la X statica
  renderer.debug.onShaderError = () => { guasto = true; };

  const scena = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 60);
  camera.position.set(0, 0, 9);

  const tex = new THREE.Texture();
  tex.colorSpace = THREE.NoColorSpace; // lavoro direttamente in sRGB, come la foto nel DOM
  tex.minFilter = THREE.LinearFilter;
  tex.generateMipmaps = false;

  const condivisi = {
    uFoto: { value: tex },
    uCopri: { value: new THREE.Vector4(1, 0, 1, 0) },
    uRis: { value: new THREE.Vector2(1, 1) },
    uScia: { value: -3 },
    uCentro: { value: new THREE.Vector3() },
    uScala: { value: 1 },
  };
  const materiale = (tinta, bagliore, alfa) => new THREE.ShaderMaterial({
    vertexShader: VERTEX,
    fragmentShader: FRAGMENT,
    transparent: alfa < 1,
    uniforms: {
      ...condivisi,
      uTinta: { value: tinta },
      uBagliore: { value: bagliore },
      uLuce: { value: 1 },
      uAlfa: { value: alfa },
    },
  });
  // tinte in sRGB così come sono: lo shader lavora nello stesso spazio della foto
  const crudo = (hex) => new THREE.Color().setRGB(((hex >> 16) & 255) / 255, ((hex >> 8) & 255) / 255, (hex & 255) / 255, THREE.LinearSRGBColorSpace);
  const sx = new THREE.Mesh(chevron(1), materiale(crudo(0x2fae9f), crudo(0x6fe9da), 1));
  const dx = new THREE.Mesh(chevron(-1), materiale(crudo(0xa9e6dd), crudo(0xb6fff4), 0.9));
  const x = new THREE.Group();
  x.add(sx, dx);
  scena.add(x);

  // Geometria della pagina: la X si appoggia sull'ancora HTML, i chevron partono dagli estremi della linea
  const ancora = hero.querySelector('[data-ancora="x"]');
  const capoSx = hero.querySelector('[data-ancora="sx"]');
  const capoDx = hero.querySelector('[data-ancora="dx"]');
  const g = { s: 1, x: 0, y: 0, sx: -2, dx: 2, ly: -0.8 };
  const buf = new THREE.Vector2();

  function layout() {
    const r = hero.getBoundingClientRect();
    const w = r.width, h = r.height;
    renderer.setSize(w, h, false);
    renderer.getDrawingBufferSize(buf);
    condivisi.uRis.value.copy(buf);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    const f = scenaFoto.getBoundingClientRect();
    condivisi.uCopri.value.set(w / f.width, (r.left - f.left) / f.width, h / f.height, (r.top - f.top) / f.height);
    const vista = 2 * camera.position.z * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    const mondo = (px, py) => [((px - r.left) / w - 0.5) * vista * camera.aspect, -((py - r.top) / h - 0.5) * vista];
    const a = ancora.getBoundingClientRect();
    g.s = (a.height / h) * vista;
    [g.x, g.y] = mondo(a.left + a.width / 2, a.top + a.height / 2);
    const c1 = capoSx.getBoundingClientRect();
    const [lx1, ly] = mondo(c1.left, c1.top);
    const [lx2] = mondo(capoDx.getBoundingClientRect().left, 0);
    g.sx = (lx1 - g.x) / g.s;
    g.dx = (lx2 - g.x) / g.s;
    g.ly = (ly - g.y) / g.s;
  }

  const inizio = Math.max(performance.now(), PARTENZA);
  let agganciata = false;
  let inclX = 0, inclY = 0, voluteX = 0, voluteY = 0;
  if (puntatore) {
    addEventListener('pointermove', (e) => {
      voluteX = (e.clientY / innerHeight - 0.5) * -0.22;
      voluteY = (e.clientX / innerWidth - 0.5) * 0.36;
    }, { passive: true });
  }

  function posa(m, verso, u, sep) {
    const corsa = outQuart(clamp(u / 0.88));
    const alza = inOutCubic(clamp((u - 0.32) / 0.68));
    const partenza = verso < 0 ? g.sx + 0.35 : g.dx - 0.35;
    m.position.x = lerp(partenza, verso * SCARTO, corsa) + verso * sep;
    m.position.y = lerp(g.ly, 0, alza);
    m.position.z = verso * 0.16 + (1 - alza) * 0.4;
    m.rotation.x = lerp(-Math.PI / 2, 0, outBack(alza));
    m.rotation.y = verso * 0.55 * (1 - alza);
    m.scale.setScalar(lerp(0.62, 1, alza));
    m.material.uniforms.uLuce.value = 1 - clamp(alza * 1.35);
  }

  const centro = new THREE.Vector3();
  let ultimaOp = -1;
  function disegna(t) {
    const u = riduci ? 1 : clamp((t - inizio) / DURATA);
    const p = clamp(scrollY / (hero.offsetHeight * 0.85));
    const sep = p * 0.5;
    posa(sx, -1, u, sep);
    posa(dx, 1, u, sep);

    const dopo = t - inizio - DURATA; // ms dall'aggancio
    if (!agganciata && (riduci || dopo > -260)) { agganciata = true; hero.classList.add('x-ok'); }

    // aggancio: un piccolo colpo, poi la scia di luce; dopo, una scia lenta ogni 6 secondi
    const colpo = dopo > 0 && dopo < 420 ? Math.sin((dopo / 420) * Math.PI) * 0.045 : 0;
    let scia = -3;
    if (!riduci && dopo > -150) {
      const ciclo = dopo + 150;
      scia = ciclo < 1300 ? lerp(-1.3, 1.3, inOutCubic(ciclo / 1300)) : lerp(-1.3, 1.3, ((ciclo - 1300) % 6000) / 1600);
    }
    condivisi.uScia.value = scia;

    // a riposo la X resta un po' girata, così si leggono spessore e bordi
    const ozio = riduci ? 1 : clamp(dopo / 1400);
    inclX += (voluteX - inclX) * 0.06;
    inclY += (voluteY - inclY) * 0.06;
    x.rotation.set(
      ozio * (-0.1 + Math.sin(t * 0.0007) * 0.05) + inclX - p * 0.35,
      ozio * (0.22 + Math.sin(t * 0.00045) * 0.2) + inclY + p * 1.7,
      ozio * Math.sin(t * 0.00031) * 0.025,
    );
    x.scale.setScalar(g.s * (1 + colpo));
    x.position.set(g.x, g.y + g.s * (ozio * Math.sin(t * 0.0011) * 0.035 + p * 1.3), -p * 4);
    x.updateMatrixWorld();
    centro.setFromMatrixPosition(x.matrixWorld).applyMatrix4(camera.matrixWorldInverse);
    condivisi.uCentro.value.copy(centro);
    condivisi.uScala.value = g.s;

    const op = 1 - clamp(p * 1.1, 0, 0.92);
    if (Math.abs(op - ultimaOp) > 0.004) { hero.style.setProperty('--op-3d', op.toFixed(3)); ultimaOp = op; }
    renderer.render(scena, camera);
  }

  let attivo = true, visibile = true, id = 0, pronto = false;
  const giro = () => {
    id = 0;
    if (!pronto || !attivo || !visibile) return;
    disegna(performance.now());
    if (!riduci) id = requestAnimationFrame(giro);
  };
  const riparti = () => { if (!id && pronto && attivo && visibile) id = requestAnimationFrame(giro); };

  new IntersectionObserver(([v]) => { visibile = v.isIntersecting; riparti(); }).observe(hero);
  document.addEventListener('visibilitychange', () => { attivo = !document.hidden; riparti(); });
  addEventListener('resize', () => { layout(); if (riduci && pronto) disegna(performance.now()); });
  if (riduci) addEventListener('scroll', () => requestAnimationFrame(() => pronto && disegna(performance.now())), { passive: true });

  // la foto è già in cache: la uso come "ciò che sta dietro al vetro"
  const parti = () => {
    tex.image = imgFoto;
    tex.needsUpdate = true;
    pronto = true;
    layout();
    disegna(performance.now());
    if (guasto) { hero.classList.add('no-3d'); renderer.dispose(); return; }
    hero.classList.add('con-3d');
    riparti();
  };
  if (imgFoto.complete && imgFoto.naturalWidth) parti();
  else imgFoto.addEventListener('load', parti, { once: true });
}
