// Il vassoio di uscita: i fogli escono dalla fessura, si piegano in volo e si posano in pila.
// Lo guidano il tempo (rAF) e lo scroll; il puntatore aggiunge un extra solo su desktop.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { disegnaFogli } from './fogli.js';

const W = 0.84, H = 1.188;            // A4 in scala
const Z_FRONTE = 0, Y_FESSURA = 0.46, Y_VASSOIO = 0.031;
const SEG_X = 8, SEG_Z = 30, PASSI = 90;
const QUOTA = 0.58;                    // parte del percorso in cui il foglio esce dalla fessura

const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const liscio = (t) => t * t * (3 - 2 * t);
const dLiscio = (t) => 6 * t * (1 - t);
const morbido = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

export async function avvia({ palco, tela, progresso, ridotto }) {
  const renderer = new THREE.WebGLRenderer({ canvas: tela, antialias: true, alpha: true, powerPreference: 'high-performance' });
  const mobile = matchMedia('(max-width: 899px)').matches;
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, mobile ? 1.5 : 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 1.02;
  renderer.setClearColor(0x000000, 0);

  const scena = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scena.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scena.environmentIntensity = 0.55;

  const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 40);
  const mira = new THREE.Vector3(0, 0.2, 0.56);
  const direzione = new THREE.Vector3(0, 0.7, 0.72).normalize();

  const chiave = new THREE.DirectionalLight(0xffffff, 1.9);
  chiave.position.set(-2.4, 4.2, 2.6);
  scena.add(chiave);
  const controluce = new THREE.DirectionalLight(0xbfe8ff, 0.7);
  controluce.position.set(1.8, 2.2, -3);
  scena.add(controluce);
  const bagliore = new THREE.PointLight(0xc8f1ff, 0, 1.4, 1.6);
  bagliore.position.set(0, Y_FESSURA + 0.04, 0.16);
  scena.add(bagliore);

  // ---- la macchina: un monolite grafite con la fessura di luce ----
  const metallo = new THREE.MeshStandardMaterial({ color: 0x2f333a, roughness: 0.48, metalness: 0.25 });
  const coperchio = new THREE.MeshStandardMaterial({ color: 0x3b4048, roughness: 0.38, metalness: 0.2 });
  const nero = new THREE.MeshStandardMaterial({ color: 0x0c0d10, roughness: 0.7 });
  const corpo = new THREE.Mesh(new RoundedBoxGeometry(1.5, 0.74, 1.42, 5, 0.07), metallo);
  corpo.position.set(0, 0.37, -0.71);
  scena.add(corpo);
  const lid = new THREE.Mesh(new RoundedBoxGeometry(1.46, 0.09, 1.38, 4, 0.04), coperchio);
  lid.position.set(0, 0.785, -0.71);
  scena.add(lid);
  const bocca = new THREE.Mesh(new THREE.BoxGeometry(1.08, 0.05, 0.04), nero);
  bocca.position.set(0, Y_FESSURA + 0.012, 0.0);
  scena.add(bocca);
  for (const yy of [0.27, 0.13]) {          // i cassetti della carta
    const solco = new THREE.Mesh(new THREE.BoxGeometry(1.32, 0.008, 0.01), nero);
    solco.position.set(0, yy, 0.004);
    scena.add(solco);
    const maniglia = new THREE.Mesh(new RoundedBoxGeometry(0.28, 0.032, 0.02, 2, 0.008), nero);
    maniglia.position.set(0, yy + 0.065, 0.004);
    scena.add(maniglia);
  }
  const lineaMat = new THREE.MeshBasicMaterial({ color: 0xdff8ff, transparent: true, opacity: 0.6, toneMapped: false });
  const linea = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 0.007), lineaMat);
  linea.position.set(0, Y_FESSURA - 0.018, 0.021);
  scena.add(linea);

  const alone = (() => {
    const c = document.createElement('canvas'); c.width = 256; c.height = 64;
    const x = c.getContext('2d');
    const g = x.createRadialGradient(128, 32, 0, 128, 32, 128);
    g.addColorStop(0, 'rgba(200,240,255,1)'); g.addColorStop(0.25, 'rgba(142,222,255,0.45)'); g.addColorStop(1, 'rgba(142,222,255,0)');
    x.fillStyle = g; x.fillRect(0, 0, 256, 64);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
    const m = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 0.34), new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false, opacity: 0.4 }));
    m.position.set(0, Y_FESSURA - 0.016, 0.03);
    scena.add(m);
    return m;
  })();

  const ledMat = new THREE.MeshBasicMaterial({ color: 0x8edeff, toneMapped: false });
  const led = new THREE.Mesh(new THREE.CircleGeometry(0.014, 20), ledMat);
  led.position.set(0.6, 0.64, 0.002);
  scena.add(led);
  const schermo = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.12), new THREE.MeshStandardMaterial({ color: 0x0f1216, roughness: 0.15, metalness: 0.4, emissive: 0x1d4a5c, emissiveIntensity: 0.55 }));
  schermo.position.set(0.46, 0.835, -0.12);
  schermo.rotation.x = -1.1;
  scena.add(schermo);

  const vassoio = new THREE.Mesh(new RoundedBoxGeometry(1.16, 0.03, 1.5, 3, 0.012), coperchio);
  vassoio.position.set(0, Y_VASSOIO / 2, 0.74);
  scena.add(vassoio);

  const ombra = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 128;
    const x = c.getContext('2d');
    const g = x.createRadialGradient(64, 64, 10, 64, 64, 64);
    g.addColorStop(0, 'rgba(0,0,0,0.65)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = g; x.fillRect(0, 0, 128, 128);
    const m = new THREE.Mesh(new THREE.PlaneGeometry(W * 1.45, H * 1.3), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false, opacity: 0 }));
    m.rotation.x = -Math.PI / 2;
    m.position.set(0, Y_VASSOIO + 0.0008, Z_FRONTE + 0.09 + H / 2);
    scena.add(m);
    return m;
  })();

  // ---- i fogli ----
  const disegni = await disegnaFogli();
  const aniso = renderer.capabilities.getMaxAnisotropy();
  const angoli = [-0.035, 0.05, -0.02, 0.07, -0.055, 0.025];
  const spostamenti = [0.0, 0.02, -0.03, 0.01, 0.035, -0.015];
  const fogli = disegni.map((d, i) => {
    const w = W * d.larghezza;
    const geo = new THREE.PlaneGeometry(w, H, SEG_X, SEG_Z);
    geo.rotateX(-Math.PI / 2);
    const base = Float32Array.from(geo.attributes.position.array);
    const tex = new THREE.CanvasTexture(d.canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = aniso;
    const mat = new THREE.MeshStandardMaterial({
      map: tex, roughness: 0.86, metalness: 0, side: THREE.DoubleSide,
      emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 0.16,
      alphaTest: d.strappo ? 0.5 : 0,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.visible = false;
    mesh.renderOrder = 2 + i;
    scena.add(mesh);
    return { mesh, geo, base, w, q: 0, ultimo: -1, yLand: Y_VASSOIO + 0.0036 * (i + 1), yaw: angoli[i], ox: spostamenti[i] };
  });

  const tabS = new Float32Array(PASSI + 1), tabZ = new Float32Array(PASSI + 1), tabY = new Float32Array(PASSI + 1);

  function piega(f, q, t) {
    const pos = f.geo.attributes.position.array;
    const esce = clamp(q / QUOTA);
    const cade = morbido(clamp((q - QUOTA) / (1 - QUOTA)));
    const fuori = liscio(esce) * (H + 0.05) - 0.03;
    const yAlto = Y_FESSURA + (f.yLand - Y_FESSURA) * cade;
    const zInizio = Z_FRONTE + 0.09 * cade;
    const salto = yAlto - f.yLand;
    const L = 0.6;
    const ds = (H + 0.12) / PASSI;
    let z = zInizio, y = yAlto;
    tabS[0] = 0; tabZ[0] = z; tabY[0] = y;
    for (let k = 1; k <= PASSI; k++) {
      const u = clamp((z - zInizio) / L);
      const pend = -salto * dLiscio(u) / L;
      z += ds / Math.sqrt(1 + pend * pend);
      y = yAlto - salto * liscio(clamp((z - zInizio) / L));
      tabS[k] = k * ds; tabZ[k] = z; tabY[k] = y;
    }
    const volo = Math.sin(Math.PI * q);
    const yaw = f.yaw * cade, ox = f.ox * cade;
    const cy = Math.cos(yaw), sy = Math.sin(yaw);
    const zc = zInizio + H / 2;
    const meta = f.w / 2;
    for (let i = 0; i < pos.length; i += 3) {
      const xl = f.base[i], zl = f.base[i + 2];
      const sigma = fuori - (H / 2 - zl);
      let pz, py;
      if (sigma <= 0) { pz = zInizio + sigma; py = yAlto; }
      else {
        const k = Math.min(PASSI - 1, Math.floor(sigma / ds));
        const fr = clamp((sigma - tabS[k]) / ds);
        pz = tabZ[k] + (tabZ[k + 1] - tabZ[k]) * fr;
        py = tabY[k] + (tabY[k + 1] - tabY[k]) * fr;
        py += volo * (0.007 * Math.sin(t * 5.2 + zl * 6.5) + 0.022 * (xl / meta) * (xl / meta));
      }
      const dz = pz - zc;
      pos[i] = xl * cy + dz * sy + ox;
      pos[i + 1] = py;
      pos[i + 2] = zc - xl * sy + dz * cy;
    }
    f.geo.attributes.position.needsUpdate = true;
    f.geo.computeVertexNormals();
    f.geo.computeBoundingSphere();
  }

  // ---- inquadratura ----
  let larg = 1, alt = 1;
  function misura() {
    const r = tela.getBoundingClientRect();
    larg = Math.max(1, Math.round(r.width)); alt = Math.max(1, Math.round(r.height));
    renderer.setSize(larg, alt, false);
    camera.aspect = larg / alt;
    const metaFov = THREE.MathUtils.degToRad(camera.fov / 2);
    const serveV = Math.max(1.78, 1.62 / camera.aspect);
    camera.userData.dist = (serveV / 2) / Math.tan(metaFov);
    camera.updateProjectionMatrix();
  }
  misura();
  new ResizeObserver(misura).observe(tela);

  const puntatore = { x: 0, y: 0, tx: 0, ty: 0 };
  if (matchMedia('(hover: hover) and (pointer: fine)').matches) {
    addEventListener('pointermove', (e) => { puntatore.tx = e.clientX / innerWidth - 0.5; puntatore.ty = e.clientY / innerHeight - 0.5; }, { passive: true });
  }

  let attivo = false, giro = 0, prima = null, inizioIntro = null, mostrata = false;
  function disegna(ora) {
    const t = ora / 1000;
    const dt = prima === null ? 1 / 60 : Math.min(0.05, (ora - prima) / 1000);
    prima = ora;
    if (inizioIntro === null) inizioIntro = t;
    const { u } = progresso();
    const intro = morbido(clamp((t - inizioIntro) / 1.9));
    let stampa = 0, posati = 0;
    fogli.forEach((f, i) => {
      let p = clamp((u - i) * 1.9 + 0.38);
      if (i === 0) p = Math.max(p, intro);
      if (ridotto) p = 1;
      f.q = ridotto ? p : f.q + (p - f.q) * (1 - Math.exp(-dt * 6.5));
      if (Math.abs(f.q - p) < 0.0005) f.q = p;
      f.mesh.visible = f.q > 0.002;
      if (f.q > 0.002 && f.q < QUOTA) stampa = Math.max(stampa, Math.sin(Math.PI * f.q / QUOTA));
      if (f.q > 0.9) posati++;
      const vola = f.q > 0.002 && f.q < 0.999;
      if (f.mesh.visible && (vola || f.ultimo !== f.q)) { piega(f, f.q, t); f.ultimo = f.q; }
    });

    lineaMat.opacity = 0.45 + stampa * 0.55;
    alone.material.opacity = 0.18 + stampa * 0.75;
    bagliore.intensity = stampa * 1.6;
    ledMat.color.setHSL(0.54, 0.9, 0.55 + 0.2 * Math.sin(t * 3.2));
    ombra.material.opacity = Math.min(1, posati) * 0.75;

    puntatore.x += (puntatore.tx - puntatore.x) * 0.06;
    puntatore.y += (puntatore.ty - puntatore.y) * 0.06;
    const deriva = ridotto ? 0 : 1;
    const d = camera.userData.dist;
    camera.position.copy(mira).addScaledVector(direzione, d);
    camera.position.x += deriva * (Math.sin(t * 0.21) * 0.16 + puntatore.x * 0.5);
    camera.position.y += deriva * (Math.sin(t * 0.33) * 0.05 - puntatore.y * 0.25);
    camera.lookAt(mira);
    renderer.render(scena, camera);
    if (!mostrata) { mostrata = true; tela.classList.add('pronta'); }
    if (attivo && !ridotto) giro = requestAnimationFrame(disegna);
  }

  const parti = () => { if (!attivo) { attivo = true; prima = null; giro = requestAnimationFrame(disegna); } };
  const ferma = () => { attivo = false; cancelAnimationFrame(giro); };
  let inVista = false;
  new IntersectionObserver((voci) => {
    inVista = voci.some((v) => v.isIntersecting);
    if (inVista && !document.hidden) parti(); else ferma();
  }, { rootMargin: '120px 0px' }).observe(palco);
  document.addEventListener('visibilitychange', () => { if (document.hidden) ferma(); else if (inVista) parti(); });
  if (ridotto) {
    const una = () => requestAnimationFrame(disegna);
    una();
    addEventListener('resize', una);
  }
}
