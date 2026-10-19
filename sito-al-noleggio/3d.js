/* AL Noleggio — l'espositore girevole: cartellini "a noleggio" con le foto vere del catalogo.
   Gira da solo, accelera con lo scroll (o trascinando), i cartellini oscillano per inerzia. */
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const NOMI = [
  'Riscaldatore a infrarossi', 'Betoniera compatta 134 lt', 'Piattaforma a forbice 15 m', 'Troncatrice 13 cm',
  'Biotrituratore Eliet', 'Martello perforatore 8 kg', 'Demolitore esagonale 30 kg', 'Costipatore 70 kg',
  'Piastra vibrante 400 kg', 'Motopompa acque luride', 'Riempifughe per autobloccanti', 'E-Dingo 500 con raschiatore',
  'Lisciatrice a elicottero', 'Micro escavatore 12 q', 'Piattaforma a montante', 'Biotrituratore Major 4s',
  'Fresaceppi Toro 26 CV', 'Motosega forestale', 'Motozappa', 'Trattorino a raggio zero', 'Trattore rasaerba',
  'Piattaforma semovente 8 m', 'Pantografo 14 m', 'Articolata 15 m', 'Ibrida a braccio 20,8 m',
  'Elevatore industriale 2,90 m', 'Minipala multifunzione', 'Idropulitrice Kränzle B270',
  'Idropulitrice ad acqua calda', 'Spazzatrice grandi aree'
];
const COLS = 6, ROWS = 5, CW = 320, CH = 424;          // celle dell'atlante dei cartellini
const TW = 0.78, TH = TW * CH / CW, SMUSSO = 0.12;     // misure del cartellino
const FORO_Y = TH / 2 - TH * 40 / CH, FORO_R = 0.03;
const PIANI = [1.32, 0, -1.32], PER_PIANO = 10, R = 1.55;
const ARANCIO = '#ea6c25', CARTA = '#fbfaf7';

const carica = (src) => new Promise((ok, ko) => { const i = new Image(); i.decoding = 'async'; i.onload = () => ok(i); i.onerror = ko; i.src = src; });

function testoACapo(ctx, testo, x, y, larg, riga, max) {
  const parole = testo.split(' '); let linea = '', n = 0;
  for (let i = 0; i < parole.length; i++) {
    const prova = linea ? linea + ' ' + parole[i] : parole[i];
    if (ctx.measureText(prova).width > larg && linea) {
      ctx.fillText(linea, x, y + n * riga); n++; linea = parole[i];
      if (n === max - 1) { linea = parole.slice(i).join(' '); break; }
    } else linea = prova;
  }
  while (ctx.measureText(linea).width > larg && linea.length > 3) linea = linea.slice(0, -2) + '…';
  ctx.fillText(linea, x, y + n * riga);
}

function disegnaFronti(atlante) {
  const c = document.createElement('canvas'); c.width = COLS * CW; c.height = ROWS * CH;
  const x = c.getContext('2d');
  x.fillStyle = CARTA; x.fillRect(0, 0, c.width, c.height);
  NOMI.forEach((nome, k) => {
    const ox = (k % COLS) * CW, oy = Math.floor(k / COLS) * CH;
    x.save(); x.translate(ox, oy);
    // rinforzo del foro
    x.fillStyle = ARANCIO; x.beginPath(); x.arc(CW / 2, 40, 25, 0, Math.PI * 2); x.fill();
    // foto del prodotto
    x.drawImage(atlante, (k % 6) * 256, Math.floor(k / 6) * 256, 256, 256, 34, 76, 252, 252);
    // filo di separazione e nome
    x.fillStyle = '#e4e1da'; x.fillRect(24, 336, CW - 48, 2);
    x.fillStyle = '#17181b'; x.font = '600 25px Archivo, Arial, sans-serif'; x.textBaseline = 'alphabetic';
    testoACapo(x, nome, 24, 368, CW - 48, 28, 2);
    x.fillStyle = ARANCIO; x.font = 'italic 800 19px Archivo, Arial, sans-serif';
    x.fillText('a noleggio', 24, 412);
    x.restore();
  });
  return c;
}

function disegnaRetro(logo) {
  const c = document.createElement('canvas'); c.width = CW; c.height = CH;
  const x = c.getContext('2d');
  const g = x.createLinearGradient(0, 0, CW, CH); g.addColorStop(0, '#f07a33'); g.addColorStop(1, '#d95c1b');
  x.fillStyle = g; x.fillRect(0, 0, CW, CH);
  x.fillStyle = '#16171a'; x.beginPath(); x.arc(CW / 2, 40, 25, 0, Math.PI * 2); x.fill();
  // fascia bianca e nera come la livrea dei camion
  x.save(); x.translate(CW / 2, CH * .62); x.rotate(-0.42);
  x.fillStyle = '#16171a'; x.fillRect(-300, -36, 600, 72);
  x.fillStyle = '#fff'; x.fillRect(-300, 40, 600, 8);
  x.restore();
  const lw = 250, lh = lw * logo.height / logo.width;
  x.save(); x.translate(CW / 2, CH * .62); x.rotate(-0.42); x.drawImage(logo, -lw / 2, -lh / 2 - 6, lw, lh); x.restore();
  x.fillStyle = '#16171a'; x.font = '700 22px Archivo, Arial, sans-serif'; x.textAlign = 'center';
  x.fillText('0422 1834001', CW / 2, CH - 26);
  return c;
}

function formaCartellino() {
  const w = TW / 2, h = TH / 2, s = SMUSSO, r = 0.05;
  const f = new THREE.Shape();
  f.moveTo(-w + r, -h); f.lineTo(w - r, -h); f.quadraticCurveTo(w, -h, w, -h + r);
  f.lineTo(w, h - s); f.lineTo(w - s, h); f.lineTo(-w + s, h); f.lineTo(-w, h - s);
  f.lineTo(-w, -h + r); f.quadraticCurveTo(-w, -h, -w + r, -h);
  const foro = new THREE.Path(); foro.absarc(0, FORO_Y, FORO_R, 0, Math.PI * 2, true);
  f.holes.push(foro);
  return f;
}

// geometria del cartellino con UV sull'atlante e una leggera curvatura della carta
function geometria(forma, cella, retro) {
  const g = new THREE.ShapeGeometry(forma, 10);
  const p = g.attributes.position, uv = g.attributes.uv;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i);
    let u = (x + TW / 2) / TW, v = (y + TH / 2) / TH;
    if (cella != null) { const c = cella % COLS, rr = Math.floor(cella / COLS); u = (c + u) / COLS; v = 1 - (rr + 1 - v) / ROWS; }
    uv.setXY(i, u, v);
    const curva = 0.05 * Math.pow(x / (TW / 2), 2);
    p.setZ(i, retro ? curva + 0.004 : -curva);
  }
  g.computeVertexNormals();
  return g;
}

export async function avvia(el, { ridotto = false } = {}) {
  const poster = location.hash === '#poster';
  const mobile = matchMedia('(max-width: 999px)').matches;
  await Promise.all([document.fonts.load('600 25px Archivo'), document.fonts.load('italic 800 19px Archivo')]).catch(() => {});
  const [atlante, logo] = await Promise.all([carica('assets/3d/espositore.webp'), carica('assets/img/logo-al-noleggio.png')]);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance', preserveDrawingBuffer: poster });
  renderer.setPixelRatio(Math.min(devicePixelRatio, poster ? 2 : mobile ? 1.5 : 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.08;
  renderer.setClearColor(0x000000, 0);
  el.appendChild(renderer.domElement);

  const scena = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scena.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scena.fog = new THREE.Fog(0x1b1c1f, 8, 13);
  const luce = new THREE.DirectionalLight(0xfff4e8, 1.6); luce.position.set(-3, 5, 6); scena.add(luce);
  const controluce = new THREE.PointLight(0xff7a30, 14, 9, 1.6); controluce.position.set(2.6, 1.2, -2.5); scena.add(controluce);

  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 60);

  // texture
  const anis = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  const texF = new THREE.CanvasTexture(disegnaFronti(atlante)); texF.colorSpace = THREE.SRGBColorSpace; texF.anisotropy = anis;
  const texR = new THREE.CanvasTexture(disegnaRetro(logo)); texR.colorSpace = THREE.SRGBColorSpace; texR.anisotropy = anis;
  const matF = new THREE.MeshStandardMaterial({ map: texF, roughness: 0.62, metalness: 0, envMapIntensity: 0.85 });
  const matR = new THREE.MeshStandardMaterial({ map: texR, roughness: 0.5, metalness: 0, envMapIntensity: 0.85 });
  const metallo = new THREE.MeshStandardMaterial({ color: 0xb4bac2, metalness: 1, roughness: 0.26 });
  const scuro = new THREE.MeshStandardMaterial({ color: 0x24262a, metalness: 0.6, roughness: 0.45 });

  // espositore
  const espositore = new THREE.Group(); scena.add(espositore);
  const palo = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 6.4, 24), metallo); palo.position.y = -0.7; espositore.add(palo);
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 1.05, 0.12, 48), scuro); base.position.y = -3.9; espositore.add(base);

  // insegna in cima con il logo, come gli espositori da ferramenta
  const ins = document.createElement('canvas'); ins.width = 2048; ins.height = 220;
  const ix = ins.getContext('2d'); ix.fillStyle = ARANCIO; ix.fillRect(0, 0, 2048, 220);
  ix.fillStyle = '#16171a'; ix.fillRect(0, 178, 2048, 42); ix.fillStyle = '#fff'; ix.fillRect(0, 170, 2048, 8);
  for (let i = 0; i < 3; i++) { const lw = 440, lh = lw * logo.height / logo.width; ix.drawImage(logo, i * 682 + 120, 36, lw, lh); }
  const texI = new THREE.CanvasTexture(ins); texI.colorSpace = THREE.SRGBColorSpace; texI.anisotropy = anis;
  const insegna = new THREE.Mesh(new THREE.CylinderGeometry(0.72, 0.72, 0.4, 64, 1, true), new THREE.MeshStandardMaterial({ map: texI, roughness: 0.4, side: THREE.DoubleSide }));
  insegna.position.y = 2.38; espositore.add(insegna);
  const tappo = new THREE.Mesh(new THREE.CylinderGeometry(0.73, 0.73, 0.04, 64), scuro); tappo.position.y = 2.6; espositore.add(tappo);
  const tappo2 = tappo.clone(); tappo2.position.y = 2.16; espositore.add(tappo2);

  // bracci (instanced) e cartellini
  const nBracci = PIANI.length * PER_PIANO;
  const geoBraccio = new THREE.CylinderGeometry(0.014, 0.014, R - 0.05, 8); geoBraccio.rotateX(Math.PI / 2); geoBraccio.translate(0, 0, (R - 0.05) / 2 + 0.05);
  const geoPunta = new THREE.CylinderGeometry(0.014, 0.014, 0.12, 8); geoPunta.translate(0, 0.06, R);
  const bracci = new THREE.InstancedMesh(geoBraccio, metallo, nBracci);
  const punte = new THREE.InstancedMesh(geoPunta, metallo, nBracci);
  const anelli = new THREE.InstancedMesh(new THREE.TorusGeometry(0.13, 0.022, 8, 32).rotateX(Math.PI / 2), metallo, PIANI.length);
  espositore.add(bracci, punte, anelli);
  const forma = formaCartellino();
  const geoRetro = geometria(forma, null, true);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), asseY = new THREE.Vector3(0, 1, 0), uno = new THREE.Vector3(1, 1, 1);
  const cartellini = [];
  let k = 0;
  PIANI.forEach((py, t) => {
    m.compose(new THREE.Vector3(0, py + 0.02, 0), q.identity(), uno); anelli.setMatrixAt(t, m);
    for (let j = 0; j < PER_PIANO; j++, k++) {
      const ang = (j + (t % 2) * 0.5) / PER_PIANO * Math.PI * 2;
      q.setFromAxisAngle(asseY, ang);
      m.compose(new THREE.Vector3(0, py, 0), q, uno);
      bracci.setMatrixAt(k, m); punte.setMatrixAt(k, m);
      const braccio = new THREE.Group(); braccio.rotation.y = ang; espositore.add(braccio);
      const perno = new THREE.Group(); perno.position.set(0, py + 0.03, R); braccio.add(perno);
      const carta = new THREE.Group(); carta.position.y = -FORO_Y; perno.add(carta);
      const fronte = new THREE.Mesh(geometria(forma, k, false), matF);
      const retro = new THREE.Mesh(geoRetro, matR); retro.rotation.y = Math.PI;
      carta.add(fronte, retro);
      cartellini.push({ perno, fuori: 0, vf: 0, lato: 0, vl: 0, fase: k * 1.7, raggio: R });
    }
  });

  // inquadratura: su telefono i due piani alti, su desktop tutto l'espositore
  const inquadra = () => {
    const w = el.clientWidth, h = el.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    const altezza = mobile ? 4.4 : 6.3, larghezza = 4.3;
    const tanV = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    const d = Math.max((altezza / 2) / tanV, (larghezza / 2) / (tanV * camera.aspect));
    const cy = mobile ? 0.78 : -0.15;
    camera.userData = { d, cy };
    camera.position.set(0, cy + 0.9, d);
    camera.lookAt(0, cy, 0);
    camera.updateProjectionMatrix();
    scena.fog.near = d - 0.6; scena.fog.far = d + 4.2;
  };
  inquadra();
  new ResizeObserver(inquadra).observe(el);
  // shader compilati prima del primo fotogramma: niente scatto quando la scena compare
  if (renderer.compileAsync) await renderer.compileAsync(scena, camera).catch(() => {});

  // stato del movimento
  const W_BASE = 0.3;
  let angolo = poster ? 0.28 : -0.9, w = W_BASE, wPrima = W_BASE, wScroll = 0, wTrascina = 0;
  let ultimoY = scrollY, t0 = performance.now(), prima = t0, attivo = true, visibile = true;
  let px = 0, pxT = 0;

  const passo = (now) => {
    const dt = Math.min(0.05, (now - prima) / 1000); prima = now;
    const t = (now - t0) / 1000;
    // intro: l'espositore prende la spinta e rallenta
    const intro = (ridotto || poster) ? 0 : 2.6 * (t / 0.65) * Math.exp(1 - t / 0.65);
    const y = scrollY; const dy = y - ultimoY; ultimoY = y;
    wScroll = Math.max(-2.4, Math.min(2.4, wScroll * Math.exp(-dt * 2.2) + dy * 0.003));
    wTrascina *= Math.exp(-dt * 1.6);
    w = (ridotto || poster) ? 0 : W_BASE + intro + wScroll + wTrascina;
    const acc = (w - wPrima) / Math.max(dt, 1e-3); wPrima = w;
    angolo += w * dt;
    espositore.rotation.y = angolo;
    const salita = (ridotto || poster) ? 1 : 1 - Math.pow(1 - Math.min(1, t / 1.3), 3);
    espositore.position.y = -0.35 * (1 - salita);
    // fisica dei cartellini: forza centrifuga verso fuori, ritardo laterale quando accelera
    for (const c of cartellini) {
      const fuoriT = -Math.min(0.65, Math.atan((w * w * c.raggio) / 15));
      const latoT = Math.max(-0.35, Math.min(0.35, -Math.atan((acc * c.raggio) / 16))) + Math.sin(t * 1.25 + c.fase) * 0.035;
      c.vf += (30 * (fuoriT - c.fuori) - 5.0 * c.vf) * dt; c.fuori += c.vf * dt;
      c.vl += (26 * (latoT - c.lato) - 3.6 * c.vl) * dt; c.lato += c.vl * dt;
      c.perno.rotation.set(c.fuori, 0, c.lato);
    }
    // parallasse del puntatore (solo desktop)
    px += (pxT - px) * Math.min(1, dt * 3);
    const { d, cy } = camera.userData;
    camera.position.set(px * 0.7, cy + 0.9 - px * 0.05, d);
    camera.lookAt(0, cy, 0);
    renderer.render(scena, camera);
  };

  const ciclo = (now) => {
    if (!attivo || !visibile) { loopAcceso = false; return; }
    passo(now);
    requestAnimationFrame(ciclo);
  };
  let loopAcceso = false;
  const accendi = () => { if (!loopAcceso && attivo && visibile && !ridotto && !poster) { loopAcceso = true; prima = performance.now(); requestAnimationFrame(ciclo); } };

  if (ridotto || poster) {
    for (let i = 0; i < 3; i++) passo(performance.now());
  } else {
    new IntersectionObserver(([v]) => { attivo = v.isIntersecting; accendi(); }).observe(el);
    document.addEventListener('visibilitychange', () => { visibile = !document.hidden; accendi(); });
    accendi();
    // trascina per girare (anche col dito, in orizzontale)
    let trascino = null;
    el.addEventListener('pointerdown', (e) => { trascino = { x: e.clientX, t: performance.now() }; });
    addEventListener('pointerup', () => { trascino = null; });
    el.addEventListener('pointermove', (e) => {
      if (e.pointerType === 'mouse') pxT = (e.clientX / innerWidth - 0.5) * 2;
      if (!trascino) return;
      const now = performance.now();
      const v = (e.clientX - trascino.x) / Math.max(8, now - trascino.t);
      wTrascina = Math.max(-6, Math.min(6, wTrascina + v * 1.4));
      trascino = { x: e.clientX, t: now };
    });
  }

  requestAnimationFrame(() => el.classList.add('vivo'));
  if (poster) window.__poster = () => { passo(performance.now()); return renderer.domElement.toDataURL('image/webp', 0.86); };
}
