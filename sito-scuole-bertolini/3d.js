/* Il metro della crescita: dieci matite colorate, una per anno, che crescono sul foglio a quadretti */
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const CARTA = '#F5F7F4';
const LEGNO = '#E8C595';
const ANNI = [
  { fase: 0, col: '#86BD63' }, { fase: 0, col: '#4E8F3A' },
  { fase: 1, col: '#F6C64A' }, { fase: 1, col: '#F2A93B' }, { fase: 1, col: '#E6862B' },
  { fase: 2, col: '#6AA0DE' }, { fase: 2, col: '#4A86CF' }, { fase: 2, col: '#2C68B0' }, { fase: 2, col: '#22579A' }, { fase: 2, col: '#1A4580' },
];
const R = 0.17, CONO = 0.42, PUNTA = 0.13;
const PASSO = 0.62, STACCO = 0.42;

const smooth = t => { t = Math.min(1, Math.max(0, t)); return t * t * (3 - 2 * t); };
const lerp = (a, b, t) => a + (b - a) * t;

function tela(w, h, disegna) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  disegna(c.getContext('2d'), w, h);
  return c;
}

export async function avvia(sezione, { ridotto = false } = {}) {
  const palco = sezione.querySelector('.crescita__palco');
  const canvas = sezione.querySelector('.crescita__tela');
  const tacche = [...sezione.querySelectorAll('.tacca')];
  const mobile = matchMedia('(pointer: coarse)').matches || innerWidth < 900;

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' });
  } catch (e) { return; }
  if (!renderer.getContext()) return;
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, mobile ? 1.5 : 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 1.0;

  const scena = new THREE.Scene();
  scena.background = new THREE.Color(CARTA);
  scena.fog = new THREE.Fog(CARTA, 10, 26);
  const pmrem = new THREE.PMREMGenerator(renderer);
  scena.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scena.environmentIntensity = 0.55;

  const luce = new THREE.DirectionalLight(0xffffff, 2.3); luce.position.set(-4, 8, 6); scena.add(luce);
  const contro = new THREE.DirectionalLight(0xdde7ff, 0.45); contro.position.set(5, 3, -3); scena.add(contro);

  const camera = new THREE.PerspectiveCamera(36, 1, 0.3, 60);
  const maxAniso = renderer.capabilities.getMaxAnisotropy();

  // foglio a quadretti con il margine
  const quad = new THREE.CanvasTexture(tela(512, 512, (g, w, h) => {
    g.fillStyle = CARTA; g.fillRect(0, 0, w, h);
    g.strokeStyle = 'rgba(64, 118, 172, .38)'; g.lineWidth = 2.2;
    for (let i = 0; i <= 8; i++) {
      const p = i * 64; g.beginPath(); g.moveTo(p, 0); g.lineTo(p, h); g.stroke(); g.beginPath(); g.moveTo(0, p); g.lineTo(w, p); g.stroke();
    }
  }));
  quad.colorSpace = THREE.SRGBColorSpace; quad.wrapS = quad.wrapT = THREE.RepeatWrapping;
  quad.repeat.set(40, 40); quad.anisotropy = maxAniso;
  const foglio = new THREE.Mesh(new THREE.PlaneGeometry(64, 64), new THREE.MeshBasicMaterial({ map: quad, toneMapped: false }));
  foglio.rotation.x = -Math.PI / 2; foglio.position.set(3.2, 0, -10);
  scena.add(foglio);

  // posizioni: tre gruppi, uno per scuola
  const xs = []; let x = 0;
  ANNI.forEach((a, i) => { if (i > 0) x += PASSO + (ANNI[i - 1].fase !== a.fase ? STACCO : 0); xs.push(x); });
  const fine = xs[xs.length - 1];
  const margine = new THREE.Mesh(new THREE.PlaneGeometry(0.035, 64), new THREE.MeshBasicMaterial({ color: '#D9959B', toneMapped: false }));
  margine.rotation.x = -Math.PI / 2; margine.position.set(-0.85, 0.002, -10); scena.add(margine);

  // geometrie condivise
  const gCorpo = new THREE.CylinderGeometry(R, R, 1, 6, 1); gCorpo.translate(0, 0.5, 0); gCorpo.rotateY(Math.PI / 6);
  const gLegno = new THREE.CylinderGeometry(0.05, R * 0.94, CONO, 28, 1, true); gLegno.translate(0, CONO / 2, 0);
  const gPunta = new THREE.ConeGeometry(0.05, PUNTA, 24); gPunta.translate(0, PUNTA / 2, 0);
  const mLegno = new THREE.MeshStandardMaterial({ color: LEGNO, roughness: 0.82 });

  // scritta in oro sul corpo
  try { await document.fonts.load('600 60px Lexend'); } catch (e) { /* ripiega sul font di sistema */ }
  const scritta = new THREE.CanvasTexture(tela(1024, 112, (g, w, h) => {
    g.fillStyle = '#fff'; g.font = '600 50px Lexend, sans-serif'; g.textBaseline = 'middle';
    if ('letterSpacing' in g) g.letterSpacing = '6px';
    g.fillText('SCUOLE BERTOLINI · 1910', 16, h / 2 + 2);
  }));
  scritta.colorSpace = THREE.SRGBColorSpace; scritta.anisotropy = maxAniso;
  const gScritta = new THREE.PlaneGeometry(1, 0.075); gScritta.rotateZ(Math.PI / 2);
  const mScritta = new THREE.MeshStandardMaterial({ map: scritta, color: '#E2C07A', metalness: 0.75, roughness: 0.32, transparent: true, alphaTest: 0.25 });

  // ombre finte: contatto e ombra lunga lontano dalla luce
  const tContatto = new THREE.CanvasTexture(tela(128, 128, (g, w, h) => {
    const r = g.createRadialGradient(64, 64, 4, 64, 64, 62);
    r.addColorStop(0, 'rgba(28, 40, 70, .5)'); r.addColorStop(1, 'rgba(28, 40, 70, 0)');
    g.fillStyle = r; g.fillRect(0, 0, w, h);
  }));
  const tLunga = new THREE.CanvasTexture(tela(256, 64, (g, w, h) => {
    const img = g.createImageData(w, h);
    for (let y = 0; y < h; y++) for (let x2 = 0; x2 < w; x2++) {
      const u = x2 / w, v = (y / h - 0.5) * 2;
      const a = Math.pow(1 - u, 1.6) * Math.exp(-v * v * 3.2) * 0.34;
      const k = (y * w + x2) * 4; img.data[k] = 28; img.data[k + 1] = 40; img.data[k + 2] = 70; img.data[k + 3] = a * 255;
    }
    g.putImageData(img, 0, 0);
  }));
  const gContatto = new THREE.PlaneGeometry(0.95, 0.95); gContatto.rotateX(-Math.PI / 2);
  const gLunga = new THREE.PlaneGeometry(1, 1); gLunga.rotateX(-Math.PI / 2); gLunga.translate(0.5, 0, 0);
  const mContatto = new THREE.MeshBasicMaterial({ map: tContatto, transparent: true, depthWrite: false, toneMapped: false });
  const mLunga = new THREE.MeshBasicMaterial({ map: tLunga, transparent: true, depthWrite: false, toneMapped: false });
  const dirOmbra = Math.atan2(-luce.position.z, -luce.position.x); // verso opposto alla luce, sul piano

  const matite = ANNI.map((a, i) => {
    const col = new THREE.Color(a.col);
    const gruppo = new THREE.Group();
    const z = [0.05, -0.08, 0.04, -0.06, 0.07, -0.03, 0.06, -0.07, 0.02, -0.04][i];
    gruppo.position.set(xs[i], 0, z);
    const base = (i * 0.37) % 1 * 0.5 - 0.25;
    const corpo = new THREE.Mesh(gCorpo, new THREE.MeshPhysicalMaterial({ color: col, roughness: 0.42, clearcoat: 0.55, clearcoatRoughness: 0.28 }));
    const legno = new THREE.Mesh(gLegno, mLegno);
    const punta = new THREE.Mesh(gPunta, new THREE.MeshStandardMaterial({ color: col.clone().multiplyScalar(0.82), roughness: 0.55 }));
    const oro = new THREE.Mesh(gScritta, mScritta); oro.position.z = R * Math.cos(Math.PI / 6) + 0.003;
    const rotante = new THREE.Group(); rotante.add(corpo, legno, punta, oro);
    const contatto = new THREE.Mesh(gContatto, mContatto); contatto.position.y = 0.004; contatto.renderOrder = 1;
    const lunga = new THREE.Mesh(gLunga, mLunga); lunga.position.y = 0.003; lunga.rotation.y = dirOmbra; lunga.renderOrder = 1;
    gruppo.add(rotante, contatto, lunga);
    scena.add(gruppo);
    return { gruppo, rotante, corpo, legno, punta, oro, contatto, lunga, alt: 1.0 + i * 0.28, base, g: -1 };
  });

  // percorsi della telecamera: verticale (telefono) e orizzontale (computer)
  const percorsi = {
    verticale: {
      fov: 42,
      pos: [[-0.85, 2.3, 5.15], [0.5, 3.6, 7.2], [2.6, 4.8, 9.5], [16.3, 5.6, 7.9]],
      mira: [[0.45, 0.85, 0], [2.28, 1.6, 0], [5.0, 2.1, 0], [3.4, 1.65, 0]],
    },
    orizzontale: {
      fov: 30,
      pos: [[-1.0, 2.75, 6.2], [1.3, 4.2, 9.0], [4.35, 5.2, 11.4], [3.8, 5.8, 12.9]],
      mira: [[-0.36, 0.95, 0], [1.3, 1.4, 0], [3.76, 1.8, 0], [1.8, 1.9, 0]],
    },
  };
  let curva = null, curvaMira = null, kDist = 1;
  const impostaPercorso = (verticale) => {
    const p = verticale ? percorsi.verticale : percorsi.orizzontale;
    camera.fov = p.fov;
    curva = new THREE.CatmullRomCurve3(p.pos.map(v => new THREE.Vector3(...v)), false, 'centripetal');
    curvaMira = new THREE.CatmullRomCurve3(p.mira.map(v => new THREE.Vector3(...v)), false, 'centripetal');
  };

  let larg = 0, alt = 0;
  const ridimensiona = () => {
    const w = palco.clientWidth, h = palco.clientHeight;
    if (!w || !h || (w === larg && h === alt)) return;
    larg = w; alt = h;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    impostaPercorso(w / h < 1);
    const asp = w / h;
    kDist = asp >= 1 ? Math.min(1.45, Math.max(1, Math.pow(1.6 / asp, 0.9))) : 1;
    camera.updateProjectionMatrix();
  };
  ridimensiona();
  new ResizeObserver(ridimensiona).observe(palco);

  // stato
  let pVisto = 0, faseAttiva = -1;
  const puntatore = { x: 0, y: 0, vx: 0, vy: 0 };
  if (!mobile) addEventListener('pointermove', e => { puntatore.x = e.clientX / innerWidth - 0.5; puntatore.y = e.clientY / innerHeight - 0.5; }, { passive: true });
  const progresso = () => {
    const r = sezione.getBoundingClientRect();
    return Math.min(1, Math.max(0, -r.top / Math.max(1, sezione.offsetHeight - innerHeight)));
  };

  const pos = new THREE.Vector3(), mira = new THREE.Vector3(), v3 = new THREE.Vector3();
  const schermo = [];
  function aggiorna(t, dt) {
    const target = ridotto ? 1 : progresso();
    pVisto = ridotto ? 1 : lerp(pVisto, target, 1 - Math.exp(-dt * 7));
    const p = pVisto;

    // matite che crescono una dopo l'altra
    matite.forEach((m, i) => {
      const g = smooth((p * 1.02 + 0.2 - i * 0.079) / 0.2);
      const h = Math.max(0.0001, m.alt * g);
      m.corpo.scale.y = h;
      const k = smooth(g * 4);
      m.legno.position.y = h; m.punta.position.y = h + CONO * k;
      const vis = g > 0.002;
      m.rotante.visible = vis;
      m.legno.scale.setScalar(k);
      m.punta.scale.setScalar(k);
      const lungh = Math.min(0.9, h * 0.62);
      m.oro.visible = h > 0.55; m.oro.position.y = h * 0.5; m.oro.scale.set(1, Math.max(0.01, lungh), 1);
      m.contatto.scale.setScalar(0.5 + smooth(g * 3) * 0.5); m.contatto.visible = vis;
      m.lunga.scale.set((h + CONO) * 0.72, 1, 0.42); m.lunga.visible = vis;
      m.rotante.rotation.y = m.base + Math.sin(t * 0.00055 + i * 1.3) * 0.09 + (1 - g) * 1.6;
      m.g = g;
    });

    // telecamera lungo il percorso
    const s = smooth(p);
    curva.getPoint(s, pos); curvaMira.getPoint(s, mira);
    if (kDist !== 1) pos.sub(mira).multiplyScalar(kDist).add(mira);
    puntatore.vx = lerp(puntatore.vx, puntatore.x, 1 - Math.exp(-dt * 3));
    puntatore.vy = lerp(puntatore.vy, puntatore.y, 1 - Math.exp(-dt * 3));
    pos.x += Math.sin(t * 0.00023) * 0.12 + puntatore.vx * 0.6;
    pos.y += Math.cos(t * 0.00019) * 0.06 - puntatore.vy * 0.35;
    camera.position.copy(pos); camera.lookAt(mira);
    camera.updateMatrixWorld();
    const d = pos.distanceTo(mira);
    scena.fog.near = d + 2; scena.fog.far = d + 16;

    // fasi
    const f = s < 0.28 ? 0 : s < 0.55 ? 1 : 2;
    if (f !== faseAttiva) { faseAttiva = f; window.__faseCrescita && window.__faseCrescita(ridotto ? -1 : f); }

    // tacche scritte a mano davanti a ogni matita
    schermo.length = 0;
    matite.forEach((m, i) => {
      v3.set(xs[i] + 0.02, 0.0, m.gruppo.position.z + 0.36).project(camera);
      schermo.push({ x: (v3.x * 0.5 + 0.5) * larg, y: (-v3.y * 0.5 + 0.5) * alt, dentro: v3.z < 1 && v3.x > -1.05 && v3.x < 1.05 && v3.y > -1 && v3.y < 1 });
    });
    let ultimaX = Infinity;
    for (let i = matite.length - 1; i >= 0; i--) {
      const sp = schermo[i], m = matite[i];
      let o = sp.dentro ? smooth((m.g - 0.55) / 0.35) : 0;
      if (o > 0 && Math.abs(ultimaX - sp.x) < 30) o = 0; else if (o > 0) ultimaX = sp.x;
      const el = tacche[i];
      el.style.opacity = o.toFixed(3);
      el.style.transform = `translate(${(sp.x - 6).toFixed(1)}px, ${(sp.y - 4).toFixed(1)}px) rotate(-4deg)`;
    }
  }

  let ultimo = performance.now(), attivo = false, idRaf = 0;
  const giro = () => {
    idRaf = 0;
    if (!attivo || document.hidden) return;
    const ora = performance.now();
    const dt = Math.min(0.05, (ora - ultimo) / 1000); ultimo = ora;
    aggiorna(ora, dt);
    renderer.render(scena, camera);
    idRaf = requestAnimationFrame(giro);
  };
  const riparti = () => { if (!idRaf && attivo && !document.hidden) { ultimo = performance.now(); idRaf = requestAnimationFrame(giro); } };

  // prima immagine: compila gli shader prima di mostrarla
  pVisto = ridotto ? 1 : progresso();
  aggiorna(performance.now(), 1);
  if (renderer.compileAsync) { try { await renderer.compileAsync(scena, camera); } catch (e) { /* compila al primo render */ } }
  renderer.render(scena, camera);
  sezione.classList.add('pronta');
  if (ridotto) { sezione.querySelectorAll('.fase').forEach(el => el.classList.add('attiva')); return; }

  new IntersectionObserver(([v]) => { attivo = v.isIntersecting; riparti(); }, { rootMargin: '120px 0px' }).observe(sezione);
  document.addEventListener('visibilitychange', riparti);
}
