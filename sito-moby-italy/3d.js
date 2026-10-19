// Il gioco a molla in 3D: sagoma vera del Cavallo pikpak (ricavata dalla foto del catalogo Moby),
// pannello bicolore con l'anima gialla sullo spessore, molla che si piega, fisica smorzata.
// Hero: cade dall'alto e oscilla. Sezione "Com'è fatto": si smonta e si rimonta con lo scroll.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

// Contorno in decimetri, origine sull'asse della molla a terra (dalla foto art. 4010, 73 cm di lunghezza)
const SAGOMA = [-3.137,8.195,-3.486,8.138,-3.635,8.094,-3.738,8.039,-3.798,7.993,-3.851,7.938,-3.894,7.877,-3.932,7.776,-3.932,7.671,-3.912,7.601,-3.806,7.363,-3.793,7.29,-3.797,7.178,-3.831,7.025,-3.924,6.719,-4.091,6.279,-4.116,6.167,-4.129,6.051,-4.131,5.935,-4.117,5.82,-4.081,5.712,-4.045,5.646,-3.997,5.588,-3.91,5.516,-3.809,5.467,-3.736,5.448,-3.626,5.445,-3.555,5.461,-3.487,5.49,-3.363,5.581,-3.132,5.795,-3.037,5.857,-2.97,5.883,-2.875,5.891,-2.821,5.871,-2.782,5.832,-2.759,5.777,-2.75,5.711,-2.754,5.603,-2.791,5.416,-2.899,5.123,-3.206,4.217,-3.364,3.681,-3.524,3.204,-3.548,3.095,-3.553,3.021,-3.544,2.907,-3.492,2.722,-3.412,2.592,-3.36,2.536,-3.27,2.463,-3.143,2.382,-3.054,2.343,-2.971,2.344,-2.892,2.391,-2.645,2.632,-2.54,2.747,-2.395,2.965,-2.262,3.144,-2.132,3.372,-2.063,3.464,-1.952,3.575,-1.802,3.701,-1.709,3.764,-1.643,3.792,-1.538,3.809,-1.272,3.806,-0.957,3.828,-0.718,3.833,1.682,3.832,1.882,3.826,2.199,3.799,2.357,3.802,2.549,3.841,2.693,3.904,2.853,4.018,2.984,4.164,3.079,4.335,3.117,4.447,3.138,4.563,3.144,4.681,3.134,4.799,3.083,4.988,3.032,5.094,2.967,5.193,2.889,5.281,2.801,5.359,2.702,5.424,2.596,5.475,2.406,5.525,2.249,5.534,2.093,5.516,1.98,5.484,1.838,5.417,1.74,5.351,1.626,5.243,1.552,5.15,1.405,4.919,1.357,4.862,1.27,4.797,1.166,4.761,1.051,4.746,0.892,4.741,-1.027,4.742,-1.219,4.757,-1.285,4.775,-1.337,4.805,-1.367,4.845,-1.373,4.894,-1.303,5.083,-1.304,5.309,-1.25,5.555,-1.247,5.66,-1.397,6.259,-1.573,6.743,-1.594,6.894,-1.588,7.114,-1.61,7.214,-1.688,7.335,-1.851,7.505,-1.925,7.596,-1.984,7.696,-2.103,7.939,-2.147,7.999,-2.2,8.05,-2.294,8.107,-2.678,8.264,-2.783,8.288,-2.854,8.285];
const MANIGLIA = [-2.565, 7.683];
const POGGIAPIEDI = [-3.006, 2.834];
const OCCHIO = [-3.23, 6.9, 0.12];
const H_MOLLA = 3.6;        // altezza della molla a riposo (dm)
const SPESSORE = 0.19;      // pannello da 19 mm

const COL = {
  rosso: 0xc8121e, giallo: 0xffc21a, blu: 0x1b55c4, grigio: 0xc9ced6, zinco: 0x9aa3ad,
};

const mobile = matchMedia('(max-width: 760px)').matches;
const fermo = matchMedia('(prefers-reduced-motion: reduce)').matches;

export function avvia() {
  const ospiteHero = document.querySelector('[data-3d="hero"]');
  const ospitePalco = document.querySelector('[data-3d="palco"]');
  if (!ospiteHero) return;

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    if (!renderer.getContext()) throw new Error('no gl');
  } catch (e) {
    document.documentElement.classList.add('no-3d');
    return;
  }
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, mobile ? 1.5 : 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.setClearColor(0x000000, 0);
  const tela = renderer.domElement;
  tela.className = 'tela-3d';
  tela.setAttribute('aria-hidden', 'true');

  const scena = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scena.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scena.environmentIntensity = 0.62;
  const sole = new THREE.DirectionalLight(0xfff6e8, 2.1);
  sole.position.set(-4, 9, 7);
  scena.add(sole);
  scena.add(new THREE.HemisphereLight(0xdcecff, 0x3b7a3a, 0.35));

  const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 400);

  // ---------- materiali ----------
  const plastica = (c, extra = {}) => new THREE.MeshPhysicalMaterial({
    color: c, roughness: 0.42, metalness: 0, clearcoat: 0.55, clearcoatRoughness: 0.35, ...extra,
  });
  const matFaccia = plastica(COL.rosso);
  // spessore del pannello: rosso fuori, anima gialla al centro (linea SDW)
  const matBordo = plastica(COL.rosso);
  const uCuore = { value: 0 };   // 0 = cuore normale, 1 = evidenziato (step bicolore)
  matBordo.onBeforeCompile = (s) => {
    s.uniforms.uCuore = uCuore;
    s.vertexShader = s.vertexShader
      .replace('#include <common>', '#include <common>\nvarying float vZ;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvZ = position.z;');
    s.fragmentShader = s.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying float vZ;\nuniform float uCuore;')
      .replace('#include <color_fragment>', `#include <color_fragment>
        float meta = ${(SPESSORE / 2).toFixed(3)};
        float cuore = 1.0 - smoothstep(meta * 0.56, meta * 0.62, abs(vZ));
        vec3 giallo = vec3(1.0, 0.62, 0.02) * (1.0 + 0.25 * uCuore);
        diffuseColor.rgb = mix(diffuseColor.rgb, giallo, cuore);`);
  };
  const matGiallo = plastica(COL.giallo);
  const matBlu = plastica(COL.blu);
  const matStaffa = new THREE.MeshPhysicalMaterial({ color: COL.grigio, roughness: 0.32, metalness: 0.55, clearcoat: 0.3 });
  const matZinco = new THREE.MeshStandardMaterial({ color: COL.zinco, roughness: 0.38, metalness: 0.85 });

  // molla: si comprime e si piega sul vertice, così segue il dondolio senza rifare la geometria
  const uMolla = { uTilt: { value: new THREE.Vector2() }, uComp: { value: 1 }, uH: { value: H_MOLLA } };
  const matMolla = new THREE.MeshPhysicalMaterial({ color: COL.giallo, roughness: 0.3, metalness: 0.1, clearcoat: 0.8, clearcoatRoughness: 0.2 });
  matMolla.onBeforeCompile = (s) => {
    Object.assign(s.uniforms, uMolla);
    const piega = `
      uniform vec2 uTilt; uniform float uComp; uniform float uH;
      vec3 piega(vec3 p, float k, bool comprimi) {
        if (comprimi) p.y *= uComp;
        float a = uTilt.x * k, b = uTilt.y * k;
        p = vec3(p.x * cos(a) - p.y * sin(a), p.x * sin(a) + p.y * cos(a), p.z);
        p = vec3(p.x, p.y * cos(b) - p.z * sin(b), p.y * sin(b) + p.z * cos(b));
        return p;
      }`;
    s.vertexShader = s.vertexShader
      .replace('#include <common>', '#include <common>\n' + piega)
      .replace('#include <beginnormal_vertex>', `#include <beginnormal_vertex>
        objectNormal = piega(objectNormal, clamp(position.y / uH, 0.0, 1.0), false);`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        transformed = piega(transformed, clamp(position.y / uH, 0.0, 1.0), true);`);
  };

  // ---------- geometrie ----------
  const forma = new THREE.Shape();
  for (let i = 0; i < SAGOMA.length; i += 2) {
    i ? forma.lineTo(SAGOMA[i], SAGOMA[i + 1]) : forma.moveTo(SAGOMA[i], SAGOMA[i + 1]);
  }
  const foro = (x, y, r) => { const h = new THREE.Path(); h.absarc(x, y, r, 0, Math.PI * 2, true); return h; };
  forma.holes.push(foro(MANIGLIA[0], MANIGLIA[1], 0.15), foro(POGGIAPIEDI[0], POGGIAPIEDI[1], 0.15), foro(OCCHIO[0], OCCHIO[1], OCCHIO[2]));
  const geoPannello = new THREE.ExtrudeGeometry(forma, {
    depth: SPESSORE - 0.06, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.03, bevelSegments: 3, curveSegments: 16,
  });
  geoPannello.translate(0, 0, -(SPESSORE - 0.06) / 2);

  class Elica extends THREE.Curve {
    getPoint(t, v = new THREE.Vector3()) {
      const giri = 6.25, r = 0.78, e = 0.6 / giri, alzo = 0.26, y0 = 0.12, y1 = H_MOLLA - 0.12;
      const a = t * giri * Math.PI * 2;
      // spire finali chiuse come in una molla vera, passo costante nel mezzo
      let y;
      if (t < e) y = y0 + alzo * (t / e);
      else if (t > 1 - e) y = y1 - alzo * ((1 - t) / e);
      else y = y0 + alzo + (y1 - y0 - 2 * alzo) * ((t - e) / (1 - 2 * e));
      return v.set(Math.cos(a) * r, y, Math.sin(a) * r);
    }
  }
  const elica = new Elica();
  const geoMolla = new THREE.TubeGeometry(elica, mobile ? 420 : 640, 0.115, mobile ? 10 : 14, false);
  const tappiMolla = [0, 1].map((t) => {
    const g = new THREE.SphereGeometry(0.115, 14, 10);
    const q = elica.getPoint(t);
    g.translate(q.x, q.y, q.z);
    return g;
  });

  const tondo = (r, h, seg = 40) => new THREE.CylinderGeometry(r, r, h, seg);
  const rettArrotondato = (x0, y0, x1, y1, r) => {
    const s = new THREE.Shape();
    s.moveTo(x0 + r, y0); s.lineTo(x1 - r, y0); s.quadraticCurveTo(x1, y0, x1, y0 + r);
    s.lineTo(x1, y1 - r); s.quadraticCurveTo(x1, y1, x1 - r, y1); s.lineTo(x0 + r, y1);
    s.quadraticCurveTo(x0, y1, x0, y1 - r); s.lineTo(x0, y0 + r); s.quadraticCurveTo(x0, y0, x0 + r, y0);
    return s;
  };

  // ---------- montaggio ----------
  const radice = new THREE.Group();          // tutto il gioco (serve per la caduta)
  scena.add(radice);
  const base = new THREE.Group();
  const piastra = new THREE.Mesh(tondo(1.02, 0.1, 48), matZinco);
  piastra.position.y = -0.05;
  base.add(piastra);
  for (let i = 0; i < 4; i++) {
    const b = new THREE.Mesh(new THREE.SphereGeometry(0.07, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), matZinco);
    const a = Math.PI / 4 + i * Math.PI / 2;
    b.position.set(Math.cos(a) * 0.84, 0, Math.sin(a) * 0.84);
    base.add(b);
  }
  radice.add(base);

  const molla = new THREE.Mesh(geoMolla, matMolla);
  tappiMolla.forEach((g) => molla.add(new THREE.Mesh(g, matMolla)));
  radice.add(molla);

  const perno = new THREE.Group();           // ruota con il dondolio, attorno alla base
  radice.add(perno);
  const sopra = new THREE.Group();           // si abbassa quando la molla si comprime
  perno.add(sopra);

  const tazza = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.88, 0.36, 40), matStaffa);
  tazza.position.y = H_MOLLA + 0.08;
  sopra.add(tazza);

  const pannello = new THREE.Mesh(geoPannello, [matFaccia, matBordo]);
  sopra.add(pannello);

  const staffa = new THREE.Mesh(new THREE.ExtrudeGeometry(rettArrotondato(-1.5, 3.86, 1.78, 4.86, 0.16),
    { depth: 0.5, bevelEnabled: true, bevelThickness: 0.05, bevelSize: 0.05, bevelSegments: 3 }), matStaffa);
  staffa.position.z = -0.25;
  sopra.add(staffa);
  const bulloni = new THREE.Group();
  for (const x of [-1.2, -0.62, 0.95, 1.45]) {
    for (const z of [-0.31, 0.31]) {
      const b = new THREE.Mesh(new THREE.SphereGeometry(0.1, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), matGiallo);
      b.rotation.x = z > 0 ? Math.PI / 2 : -Math.PI / 2;
      b.position.set(x, 4.32, z);
      b.userData.dir = Math.sign(z);
      bulloni.add(b);
    }
  }
  sopra.add(bulloni);

  const formaSella = new THREE.Shape();
  formaSella.moveTo(-1.6, 0);
  formaSella.bezierCurveTo(-1.6, 0.62, -0.9, 0.9, 0.2, 1.02);
  formaSella.bezierCurveTo(1.5, 1.08, 2.02, 0.7, 2.02, 0);
  formaSella.bezierCurveTo(2.02, -0.7, 1.5, -1.08, 0.2, -1.02);
  formaSella.bezierCurveTo(-0.9, -0.9, -1.6, -0.62, -1.6, 0);
  const geoSella = new THREE.ExtrudeGeometry(formaSella, { depth: 0.16, bevelEnabled: true, bevelThickness: 0.08, bevelSize: 0.08, bevelSegments: 4, curveSegments: 24 });
  geoSella.rotateX(-Math.PI / 2);
  const sella = new THREE.Mesh(geoSella, matGiallo);
  sella.position.y = 4.94;
  sopra.add(sella);

  const manopola = (x, y) => {
    const g = new THREE.Group();
    g.position.set(x, y, 0);
    const tubo = new THREE.Mesh(tondo(0.13, 2.3, 24), matBlu);
    tubo.rotation.x = Math.PI / 2;
    g.add(tubo);
    for (const z of [-1, 1]) {
      const pomo = new THREE.Mesh(new THREE.CapsuleGeometry(0.27, 0.16, 6, 20), matBlu);
      pomo.rotation.x = Math.PI / 2;
      pomo.position.z = z * 1.2;
      g.add(pomo);
      const tappo = new THREE.Mesh(new THREE.SphereGeometry(0.11, 16, 10), matGiallo);
      tappo.position.z = z * 1.47;
      g.add(tappo);
    }
    sopra.add(g);
    return g;
  };
  const maniglia = manopola(MANIGLIA[0], MANIGLIA[1]);
  const poggiapiedi = manopola(POGGIAPIEDI[0], POGGIAPIEDI[1]);

  // ombra morbida a terra, senza ombre in tempo reale
  const cOmbra = document.createElement('canvas');
  cOmbra.width = cOmbra.height = 128;
  const gx = cOmbra.getContext('2d');
  const gr = gx.createRadialGradient(64, 64, 4, 64, 64, 64);
  gr.addColorStop(0, 'rgba(0,18,48,0.55)'); gr.addColorStop(0.55, 'rgba(0,18,48,0.2)'); gr.addColorStop(1, 'rgba(0,18,48,0)');
  gx.fillStyle = gr; gx.fillRect(0, 0, 128, 128);
  const ombra = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(cOmbra), transparent: true, depthWrite: false }));
  ombra.rotation.x = -Math.PI / 2;
  ombra.position.y = -0.1;
  ombra.renderOrder = -1;
  scena.add(ombra);

  // ---------- fisica del dondolio ----------
  const f = {
    a: 0, va: 0,          // beccheggio (avanti/indietro)
    b: 0, vb: 0,          // rollio (di lato)
    c: 0, vc: 0,          // compressione della molla
    y: fermo ? 0 : 42, vy: 0, atterrato: fermo, partito: false,
  };
  const passo = (dt) => {
    if (!f.partito) return;
    if (!f.atterrato) {
      f.vy -= 130 * dt; f.y += f.vy * dt;
      if (f.y <= 0) {
        f.y = 0; f.atterrato = true;
        f.vc = f.vy * 0.085; f.va = -1.9; f.vb = 0.55;
        document.dispatchEvent(new CustomEvent('moby:atterrato'));
      }
      return;
    }
    const molla = (x, v, w, z) => -w * w * x - 2 * z * w * v;
    f.va += molla(f.a, f.va, 8.6, 0.075) * dt; f.a += f.va * dt;
    f.vb += molla(f.b, f.vb, 10.5, 0.1) * dt; f.b += f.vb * dt;
    f.vc += molla(f.c, f.vc, 15, 0.13) * dt; f.c += f.vc * dt;
    f.a = THREE.MathUtils.clamp(f.a, -0.42, 0.42);
    f.b = THREE.MathUtils.clamp(f.b, -0.2, 0.2);
    f.c = THREE.MathUtils.clamp(f.c, -1.5, 0.9);
  };
  const spinta = (forza = 1) => {
    if (!f.atterrato) return;
    f.va += (Math.random() > 0.35 ? -1 : 1) * forza * (0.9 + Math.random() * 0.5);
    f.vb += (Math.random() - 0.5) * 0.5 * forza;
    f.vc -= 3.2 * forza;
  };

  // ---------- inquadrature ----------
  // az: angolo attorno al gioco (negativo = dal lato della testa); el: altezza dello sguardo
  // span: quanti dm devono stare nel lato corto dello schermo (mobile / desktop)
  // cx, cy: dove sta il gioco sullo schermo (mobile / desktop); e: quanto è smontato; ec: anima gialla in evidenza
  const K = {
    hero:   { az: -0.62, el: 0.16, span: [13.2, 12.6], t: [-0.35, 4.3, 0], cx: [0.5, 0.71], cy: [0.7, 0.55], e: 0, ec: 0 },
    sagoma: { az: -0.2, el: 0.1, span: [12.6, 14.2], t: [-0.4, 2.7, 0], cx: [0.5, 0.67], cy: [0.36, 0.5], e: 1, ec: 0 },
    cuore:  { az: -1.0, el: 0.38, span: [4.4, 4.9], t: [-2.95, 6.95, 0], cx: [0.5, 0.66], cy: [0.34, 0.5], e: 1, ec: 1 },
    molla:  { az: -0.55, el: 0.2, span: [7.4, 9.2], t: [0, -0.2, 0], cx: [0.5, 0.67], cy: [0.36, 0.5], e: 1.2, ec: 0 },
    pronto: { az: -0.72, el: 0.14, span: [11.6, 13.2], t: [-0.35, 4.3, 0], cx: [0.5, 0.67], cy: [0.38, 0.52], e: 0, ec: 0 },
  };
  const SEQ = [K.sagoma, K.cuore, K.molla, K.pronto];
    const lerpK = (A, B, s, m) => ({
    az: THREE.MathUtils.lerp(A.az, B.az, s), el: THREE.MathUtils.lerp(A.el, B.el, s),
    span: Math.exp(THREE.MathUtils.lerp(Math.log(A.span[m]), Math.log(B.span[m]), s)),
    t: new THREE.Vector3().fromArray(A.t).lerp(new THREE.Vector3().fromArray(B.t), s),
    cx: THREE.MathUtils.lerp(A.cx[m], B.cx[m], s), cy: THREE.MathUtils.lerp(A.cy[m], B.cy[m], s),
    e: THREE.MathUtils.lerp(A.e, B.e, s), ec: THREE.MathUtils.lerp(A.ec, B.ec, s),
  });

  // ---------- dove sta la tela ----------
  let modo = 'hero';
  let W = 1, H = 1, larg = false;
  const misura = () => {
    const ospite = modo === 'hero' ? ospiteHero : ospitePalco;
    const r = ospite.getBoundingClientRect();
    W = Math.max(1, Math.round(r.width)); H = Math.max(1, Math.round(r.height));
    larg = W > 760;
    renderer.setSize(W, H, false);
    camera.aspect = W / H;
    camera.updateProjectionMatrix();
  };
  const sposta = (nuovo) => {
    if (nuovo === modo && tela.parentNode) return;
    modo = nuovo;
    (modo === 'hero' ? ospiteHero : ospitePalco).appendChild(tela);
    misura();
    if (modo === 'palco') { f.a = f.va = f.b = f.vb = f.c = f.vc = 0; }
  };
  sposta('hero');
  addEventListener('resize', misura);

  // quanto della sezione "Com'è fatto" è stato percorso (0..1)
  const palco = ospitePalco ? ospitePalco.closest('[data-palco]') : null;
  const avanzamento = () => {
    if (!palco) return 0;
    const r = palco.getBoundingClientRect();
    const corsa = r.height - innerHeight;
    return THREE.MathUtils.clamp(-r.top / Math.max(1, corsa), 0, 1);
  };
  let ultimoPasso = -1, spintaFinale = false;
  const etichette = palco ? [...palco.querySelectorAll('[data-pin]')] : [];
  const passi = palco ? [...palco.querySelectorAll('[data-passo]')] : [];

  const inquadra = (k) => {
    const tan = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    const dist = k.span / (2 * tan * Math.min(1, camera.aspect));
    camera.position.set(
      k.t.x + Math.sin(k.az) * Math.cos(k.el) * dist,
      k.t.y + Math.sin(k.el) * dist,
      k.t.z + Math.cos(k.az) * Math.cos(k.el) * dist,
    );
    camera.lookAt(k.t);
    camera.setViewOffset(W, H, (0.5 - k.cx) * W, (0.5 - k.cy) * H, W, H);
  };

  const smonta = (e) => {
    sella.position.y = 4.94 + e * 1.7;
    maniglia.position.z = -e * 1.9;
    poggiapiedi.position.z = e * 1.9;
    bulloni.children.forEach((b) => { b.position.z = b.userData.dir * (0.31 + e * 0.9); });
    staffa.position.y = e * 0.0;
    tazza.position.y = H_MOLLA + 0.08 - e * 0.5;
    radice.position.y = f.y;
    // la molla e la base scendono sotto il pannello
    molla.position.y = -e * 1.9;
    base.position.y = -e * 3.1;
    tazza.visible = true;
  };

  // ---------- disegno ----------
  let tPrec = 0, attivo = true, visibile = true, tempoInattivo = 0, prossimaSpinta = 3.5;
  let puntX = 0, puntY = 0;
  const v = new THREE.Vector3();

  let cExtra = 0;
  const disegna = (dt, tempo) => {
    let k;
    cExtra = 0;
    if (modo === 'hero') {
      k = lerpK(K.hero, K.hero, 0, larg ? 1 : 0);
      k.az += Math.sin(tempo * 0.35) * 0.08 + puntX * 0.18;
      k.el += puntY * 0.06;
      uCuore.value = 0;
      tempoInattivo += dt;
      if (f.atterrato && !fermo && tempoInattivo > prossimaSpinta) {
        tempoInattivo = 0; prossimaSpinta = 3.2 + Math.random() * 2.6;
        spinta(0.7);
      }
    } else {
      const p = avanzamento() * (SEQ.length - 1);
      const i = Math.min(SEQ.length - 2, Math.floor(p));
      let s = p - i;
      s = fermo ? Math.round(s) : THREE.MathUtils.smootherstep(s, 0.18, 0.82);
      k = lerpK(SEQ[i], SEQ[i + 1], s, larg ? 1 : 0);
      k.az += Math.sin(tempo * 0.3) * 0.05;
      const att = Math.round(p);
      if (att !== ultimoPasso) {
        ultimoPasso = att;
        palco.dataset.passo = att;
        passi.forEach((el) => el.classList.toggle('attivo', Number(el.dataset.passo) === att));
        if (att === SEQ.length - 1 && !spintaFinale) { spintaFinale = true; f.va = -2.2; f.vc = -5; }
        if (att < SEQ.length - 1) spintaFinale = false;
      }
      uCuore.value = k.ec;
      // nella pagina della molla, la molla respira con lo scroll
      const respiro = THREE.MathUtils.clamp(1 - Math.abs(p - 2) * 1.6, 0, 1);
      cExtra = -0.7 * respiro * (0.5 + 0.5 * Math.sin(p * Math.PI * 6));
      if (att !== SEQ.length - 1) { f.a *= 0.9; f.b *= 0.9; }
    }
    passo(Math.min(dt, 1 / 30));
    smonta(k.e);
    perno.rotation.set(f.b, 0, f.a);
    sopra.position.y = f.c + cExtra * Math.max(0, 1 - k.e);
    uMolla.uTilt.value.set(f.a, f.b);
    uMolla.uComp.value = (H_MOLLA + f.c + cExtra) / H_MOLLA;
    const caduta = THREE.MathUtils.clamp(1 - f.y / 20, 0, 1);
    ombra.scale.set(6.2 * (0.55 + 0.45 * caduta), 3.4 * (0.55 + 0.45 * caduta), 1);
    ombra.material.opacity = 0.25 + 0.75 * caduta;
    ombra.position.x = -Math.sin(f.a) * 2.2;
    ombra.position.y = -0.1 + base.position.y;
    inquadra(k);
    renderer.render(scena, camera);

    if (etichette.length && modo === 'palco') {
      etichette.forEach((el) => {
        const quale = el.dataset.pin;
        if (quale === 'cuore') v.set(-2.32, 8.05, SPESSORE * 0.5).applyMatrix4(pannello.matrixWorld);
        else if (quale === 'molla') v.set(0.78, H_MOLLA * 0.55, 0).applyMatrix4(molla.matrixWorld);
        else v.set(-1.6, 5.4, 0.1).applyMatrix4(pannello.matrixWorld);
        v.project(camera);
        el.style.transform = `translate(${((v.x + 1) / 2 * W).toFixed(1)}px, ${((1 - v.y) / 2 * H).toFixed(1)}px)`;
      });
    }
  };

  const ciclo = (ora) => {
    if (!attivo) return;
    requestAnimationFrame(ciclo);
    if (!visibile || !scegli()) { tPrec = ora; return; }
    const dt = tPrec ? (ora - tPrec) / 1000 : 1 / 60;
    tPrec = ora;
    disegna(Math.max(0, dt), ora / 1000);
  };

  // il video di presentazione chiama questa funzione a ogni fotogramma
  window.__fotogramma = () => { if (scegli()) disegna(0, performance.now() / 1000); };

  // ---------- quando disegnare ----------
  // si guarda ogni volta dove sono le due scene: niente da disegnare se nessuna è sullo schermo
  const quota = (el) => {
    if (!el) return 0;
    const r = el.getBoundingClientRect();
    return Math.max(0, Math.min(r.bottom, innerHeight) - Math.max(r.top, 0)) / innerHeight;
  };
  const scegli = () => {
    const vh = quota(ospiteHero), vp = quota(ospitePalco);
    if (vp > 0 && vp >= vh) sposta('palco'); else if (vh > 0) sposta('hero');
    return vh > 0 || vp > 0;
  };
  document.addEventListener('visibilitychange', () => { visibile = !document.hidden; });

  if (fermo) {
    f.partito = true;
    if (scegli()) disegna(0, 0);
    addEventListener('scroll', () => { if (scegli()) disegna(0, 0); }, { passive: true });
  } else {
    requestAnimationFrame(ciclo);
  }

  // ---------- interazioni ----------
  let yPrec = scrollY;
  addEventListener('scroll', () => {
    const d = scrollY - yPrec; yPrec = scrollY;
    if (modo === 'hero' && f.atterrato) { f.va -= THREE.MathUtils.clamp(d * 0.006, -0.5, 0.5); tempoInattivo = 0; }
  }, { passive: true });
  const sezioneHero = ospiteHero.closest('section') || ospiteHero;
  sezioneHero.addEventListener('pointerdown', (e) => {
    if (e.target.closest('a, button, input, select, textarea')) return;
    spinta(1.6); tempoInattivo = 0;
  });
  if (matchMedia('(hover: hover)').matches) {
    addEventListener('pointermove', (e) => {
      puntX = (e.clientX / innerWidth - 0.5) * 2;
      puntY = (e.clientY / innerHeight - 0.5) * 2;
    }, { passive: true });
  }

  // parte: prima la pagina, poi il gioco che cade
  requestAnimationFrame(() => {
    document.documentElement.classList.add('si-3d');
    setTimeout(() => { f.partito = true; }, 250);
  });
}
