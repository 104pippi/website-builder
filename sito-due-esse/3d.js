/* Due Esse Srl — la porta-finestra in acciaio dell'hero.
   Il disegno tecnico (SVG) e la scena hanno la stessa proiezione: 300 unità del disegno = 1 metro della scena,
   e la camera inquadra in verticale esattamente l'altezza del viewBox. I profili escono dalle linee del disegno,
   poi la finestra ruota, l'anta si apre e dentro il vano si vede un cielo vero (portale con stencil buffer).
   Tempo: solo performance.now() e requestAnimationFrame, così il video a 60 fps lo scandisce esatto. */
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

const U = 1 / 300;
const VH = 860 * U;            // altezza del viewBox del disegno
const FOV = 30;
const INIZIO_MIN = 1300;          // ms dal caricamento: prima il disegno si traccia tutto

const chiudi = (x) => Math.min(1, Math.max(0, x));
const easeOut = (x) => 1 - Math.pow(1 - chiudi(x), 4);
const easeInOut = (x) => { x = chiudi(x); return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };
const fase = (t, da, durata) => (t - da) / durata;

export function avvia({ scena, canvas, hero, fermo }) {
  const mobile = matchMedia('(max-width: 1023px)').matches;
  const puntatore = matchMedia('(hover: hover) and (pointer: fine)').matches;

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, stencil: true, powerPreference: 'high-performance' });
  } catch (_) { return false; }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, mobile ? 1.5 : 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  pmrem.dispose();

  const D = (VH / 2) / Math.tan(THREE.MathUtils.degToRad(FOV / 2));
  const camera = new THREE.PerspectiveCamera(FOV, 1, 0.1, 40);
  camera.position.set(0, 0, D);
  camera.lookAt(0, 0, 0);

  const luce = new THREE.DirectionalLight(0xffffff, 1.7);
  luce.position.set(2.5, 3, 4);
  scene.add(luce);
  const luce2 = new THREE.DirectionalLight(0xffeedd, 0.55);
  luce2.position.set(-3, 1, 2);
  scene.add(luce2);

  // ---------- Materiali ----------
  const acciaio = new THREE.MeshStandardMaterial({ color: 0x3b3e42, metalness: 0.92, roughness: 0.28, envMapIntensity: 1.55 });
  const satinato = new THREE.MeshStandardMaterial({ color: 0xa4a9ad, metalness: 1, roughness: 0.25, envMapIntensity: 1.1 });

  const vetro = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, side: THREE.DoubleSide,
    uniforms: { uScia: { value: -4 }, uAlfa: { value: 0 } },
    vertexShader: /* glsl */`
      varying vec3 vMondo; varying vec3 vN;
      void main() {
        vec4 m = modelMatrix * vec4(position, 1.0);
        vMondo = m.xyz;
        vN = normalize(mat3(modelMatrix) * normal);
        gl_Position = projectionMatrix * viewMatrix * m;
      }`,
    fragmentShader: /* glsl */`
      uniform float uScia; uniform float uAlfa;
      varying vec3 vMondo; varying vec3 vN;
      void main() {
        vec3 v = normalize(cameraPosition - vMondo);
        float fres = pow(1.0 - abs(dot(normalize(vN), v)), 3.0);
        float d = vMondo.x * 0.62 + vMondo.y * 0.38 - uScia;
        float banda = exp(-d * d * 70.0) * 0.5 + exp(-(d + 0.17) * (d + 0.17) * 520.0) * 0.32;
        float base = 0.06 + 0.05 * smoothstep(-1.2, 1.2, vMondo.y);
        float a = clamp(base + fres * 0.4 + banda, 0.0, 0.9) * uAlfa;
        vec3 col = mix(vec3(0.80, 0.86, 0.90), vec3(1.0), clamp(banda * 1.7, 0.0, 1.0));
        gl_FragColor = vec4(col, a);
      }`,
  });

  // ---------- Costruzione ----------
  const finestra = new THREE.Group();
  finestra.rotation.order = 'YXZ';
  scene.add(finestra);

  const membri = [];   // { mesh, ritardo, durata }
  // un profilo nasce dalla sua base e cresce lungo la sua lunghezza, nella direzione indicata
  const profilo = (padre, lunghezza, faccia, profondita, x, y, z, direzione, ritardo, durata = 0.6) => {
    const g = new RoundedBoxGeometry(faccia, lunghezza, profondita, 2, Math.min(faccia, profondita) * 0.14);
    g.translate(0, lunghezza / 2, 0);
    const m = new THREE.Mesh(g, acciaio);
    m.position.set(x, y, z);
    m.rotation.z = { su: 0, giu: Math.PI, destra: -Math.PI / 2, sinistra: Math.PI / 2 }[direzione];
    m.scale.y = 0.0001; m.visible = false;
    padre.add(m);
    membri.push({ mesh: m, ritardo, durata });
    return m;
  };

  // Telaio fisso: 420 × 690 unità, faccia 18, profondità 7,5 cm. Si traccia in senso orario.
  const F = 18 * U, DT = 0.075;
  const X0 = 210 * U, Y0 = 345 * U, XI = 192 * U, YI = 327 * U;
  profilo(finestra, 2 * Y0, F, DT, -X0 + F / 2, -Y0, 0, 'su', 0.0);
  profilo(finestra, 2 * XI, F, DT, -XI, Y0 - F / 2, 0, 'destra', 0.14);
  profilo(finestra, 2 * Y0, F, DT, X0 - F / 2, Y0, 0, 'giu', 0.28);
  profilo(finestra, 2 * XI, F, DT, XI, -Y0 + F / 2, 0, 'sinistra', 0.42);

  // Ante: cerniera sul bordo interno del telaio, a filo della faccia esterna
  const S = 15 * U, DA = 0.06, ZA = DT / 2, LA = XI, HA = YI;
  const vetri = [];
  const costruisciAnta = (segno, ritardo) => {
    const anta = new THREE.Group();
    anta.position.set(-segno * XI, 0, ZA);
    finestra.add(anta);
    const z = -DA / 2;
    const dir = segno > 0 ? 'destra' : 'sinistra';
    profilo(anta, 2 * HA, S, DA, segno * S / 2, -HA, z, 'su', ritardo);
    profilo(anta, 2 * HA, S, DA, segno * (LA - S / 2), HA, z, 'giu', ritardo + 0.1);
    profilo(anta, LA - 2 * S, S, DA, segno * S, HA - S / 2, z, dir, ritardo + 0.05);
    profilo(anta, LA - 2 * S, S, DA, segno * S, -HA + S / 2, z, dir, ritardo + 0.15);
    const T = 8 * U;
    profilo(anta, LA - 2 * S, T, 0.042, segno * S, 104 * U, z, dir, ritardo + 0.3, 0.5);
    profilo(anta, LA - 2 * S, T, 0.042, segno * S, -104 * U, z, dir, ritardo + 0.36, 0.5);
    // tre lastre per anta, infilate di 1 cm nei profili
    const g0 = 312 * U, g1 = 108 * U, g2 = 100 * U, w = LA - 2 * S + 0.02;
    [[-g0, -g1], [-g2, g2], [g1, g0]].forEach(([a, b]) => {
      const lastra = new THREE.Mesh(new THREE.PlaneGeometry(w, b - a + 0.02), vetro);
      lastra.position.set(segno * LA / 2, (a + b) / 2, z);
      lastra.renderOrder = 4;
      anta.add(lastra);
      vetri.push(lastra);
    });
    return anta;
  };
  const antaSinistra = costruisciAnta(1, 0.38);
  const antaDestra = costruisciAnta(-1, 0.5);

  // Maniglia sul montante centrale dell'anta destra e cerniere
  const maniglia = new THREE.Group();
  maniglia.add(new THREE.Mesh(new RoundedBoxGeometry(0.024, 0.1, 0.012, 2, 0.004), satinato));
  const collo = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.032, 16), satinato);
  collo.rotation.x = Math.PI / 2; collo.position.set(0, 0.026, 0.018);
  maniglia.add(collo);
  const leva = new THREE.Mesh(new RoundedBoxGeometry(0.018, 0.13, 0.014, 2, 0.006), satinato);
  leva.position.set(0, -0.034, 0.034);
  maniglia.add(leva);
  maniglia.position.set(-(LA - S / 2), 0.03, 0.006);
  antaDestra.add(maniglia);
  const cerniere = [];
  [[-XI, 0.78], [-XI, -0.78], [XI, 0.78], [XI, -0.78]].forEach(([x, y]) => {
    const c = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.011, 0.085, 16), satinato);
    c.position.set(x, y, ZA + 0.004);
    finestra.add(c);
    cerniere.push(c);
  });
  [maniglia, ...cerniere].forEach((m) => { m.scale.setScalar(0.0001); });

  // Portale: il vano scrive nello stencil, il cielo si disegna solo lì dentro
  const maschera = new THREE.Mesh(
    new THREE.PlaneGeometry(2 * XI, 2 * YI),
    new THREE.MeshBasicMaterial({
      colorWrite: false, depthWrite: false, side: THREE.DoubleSide,
      stencilWrite: true, stencilRef: 1, stencilFunc: THREE.AlwaysStencilFunc, stencilZPass: THREE.ReplaceStencilOp,
    }),
  );
  maschera.position.z = -0.02;
  maschera.renderOrder = 1;
  finestra.add(maschera);

  const oltreMat = new THREE.MeshBasicMaterial({
    transparent: true, opacity: 0, depthWrite: false, toneMapped: false, color: 0xffffff,
    stencilWrite: true, stencilRef: 1, stencilFunc: THREE.EqualStencilFunc,
    stencilFail: THREE.KeepStencilOp, stencilZFail: THREE.KeepStencilOp, stencilZPass: THREE.KeepStencilOp,
  });
  const oltre = new THREE.Mesh(new THREE.PlaneGeometry(5.2, 5.2 / 1.5), oltreMat);
  oltre.position.set(0, 0.05, -1.0);
  oltre.renderOrder = 2;
  finestra.add(oltre);

  // Ombra morbida a terra
  const ombraTela = document.createElement('canvas');
  ombraTela.width = 128; ombraTela.height = 128;
  const ctx = ombraTela.getContext('2d');
  const grad = ctx.createRadialGradient(64, 64, 2, 64, 64, 62);
  grad.addColorStop(0, 'rgba(35,31,32,0.55)'); grad.addColorStop(0.5, 'rgba(35,31,32,0.18)'); grad.addColorStop(1, 'rgba(35,31,32,0)');
  ctx.fillStyle = grad; ctx.fillRect(0, 0, 128, 128);
  const ombraMat = new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(ombraTela), transparent: true, opacity: 0, depthWrite: false });
  const ombra = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 0.9), ombraMat);
  ombra.rotation.x = -Math.PI / 2;
  ombra.position.set(0, -Y0 - 0.01, 0.05);
  finestra.add(ombra);

  // ---------- Dimensioni ----------
  const misura = () => {
    const w = scena.clientWidth, h = scena.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };
  misura();
  if ('ResizeObserver' in window) new ResizeObserver(() => { misura(); if (!inCorsa) disegna(); }).observe(scena);

  // ---------- Movimento ----------
  const YAW = mobile ? 0.36 : 0.42;
  const APERTURA = 0.62;
  let t0 = null;
  let px = 0, py = 0, tx = 0, ty = 0;
  if (puntatore && !fermo) {
    hero.addEventListener('pointermove', (e) => {
      const r = hero.getBoundingClientRect();
      tx = ((e.clientX - r.left) / r.width) * 2 - 1;
      ty = ((e.clientY - r.top) / r.height) * 2 - 1;
    }, { passive: true });
    hero.addEventListener('pointerleave', () => { tx = 0; ty = 0; }, { passive: true });
  }

  const posa = (t) => {
    membri.forEach(({ mesh, ritardo, durata }) => {
      const k = easeOut(fase(t, ritardo, durata));
      mesh.visible = k > 0.001;
      mesh.scale.y = Math.max(0.0001, k);
    });
    const kd = easeOut(fase(t, 1.05, 0.5));
    [maniglia, ...cerniere].forEach((m) => m.scale.setScalar(Math.max(0.0001, kd)));
    vetro.uniforms.uAlfa.value = easeOut(fase(t, 0.85, 0.8));
    oltreMat.opacity = easeOut(fase(t, 1.0, 1.0));
    oltre.scale.setScalar(1.08 - 0.08 * easeOut(fase(t, 1.0, 1.6)));
    ombraMat.opacity = easeOut(fase(t, 0.6, 1.2));

    // passata di luce sul vetro: la prima a 2,4 s, poi ogni 7 s
    const ciclo = t < 2.4 ? -1 : (t - 2.4) % 7;
    vetro.uniforms.uScia.value = ciclo < 0 ? -4 : -2.4 + ciclo * 3.6;

    const intro = easeInOut(fase(t, 1.15, 2.0));
    const vivo = chiudi((t - 3.2) / 2);
    const p = chiudi(window.scrollY / Math.max(1, hero.offsetHeight));
    px += (tx - px) * 0.05; py += (ty - py) * 0.05;

    finestra.rotation.y = YAW * intro + Math.sin((t - 3.2) * 0.5) * 0.05 * vivo + 0.5 * p + px * 0.14;
    camera.position.z = D * (1 + (mobile ? 0.05 : 0.1) * intro);
    finestra.rotation.x = 0.06 * intro + 0.1 * p + py * 0.05;
    finestra.position.y = 0.3 * p;
    antaDestra.rotation.y = (APERTURA * easeInOut(fase(t, 1.9, 1.6)) + Math.sin((t - 3.5) * 0.7) * 0.03 * vivo) * (1 - 0.6 * p);
    antaSinistra.rotation.y = -0.12 * easeInOut(fase(t, 2.3, 1.4)) * (1 - p);
    luce.position.x = 2.5 + Math.sin(t * 0.35) * 2.2;
  };

  const disegna = () => renderer.render(scene, camera);

  // ---------- Ciclo ----------
  let inCorsa = false, visibile = true, raf = 0;
  const giro = () => {
    raf = 0;
    if (!inCorsa) return;
    posa((performance.now() - t0) / 1000);
    disegna();
    raf = requestAnimationFrame(giro);
  };
  const avviaCiclo = () => {
    if (inCorsa || fermo || t0 === null || !visibile || document.hidden) return;
    inCorsa = true;
    raf = requestAnimationFrame(giro);
  };
  const fermaCiclo = () => { inCorsa = false; if (raf) cancelAnimationFrame(raf); raf = 0; };
  // Video di presentazione: ridisegna all'istante esatto di ogni fotogramma catturato
  window.__fotogramma = () => { if (inCorsa) { posa((performance.now() - t0) / 1000); disegna(); } };

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(([v]) => { visibile = v.isIntersecting; visibile ? avviaCiclo() : fermaCiclo(); }).observe(scena);
  }
  document.addEventListener('visibilitychange', () => { document.hidden ? fermaCiclo() : avviaCiclo(); });

  // ---------- Partenza: dopo il disegno e con il cielo caricato ----------
  const parti = () => {
    if (t0 !== null) return;
    if (fermo) {
      t0 = performance.now() - 6000;
      posa(6);
      disegna();
      scena.classList.add('scena--3d');
      addEventListener('scroll', () => { posa(6); disegna(); }, { passive: true });
      return;
    }
    t0 = performance.now();
    posa(0);
    disegna();
    scena.classList.add('scena--3d');
    avviaCiclo();
  };

  const carico = new THREE.TextureLoader().loadAsync(new URL('assets/img/portale-3d.jpg', document.baseURI).href)
    .then((tex) => {
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
      oltreMat.map = tex; oltreMat.needsUpdate = true;
    })
    .catch(() => { oltreMat.color.set(0xb9cad6); });
  Promise.race([carico, new Promise((r) => setTimeout(r, 2500))])
    .then(() => new Promise((r) => setTimeout(r, Math.max(0, INIZIO_MIN - performance.now()))))
    .then(parti);

  return true;
}
