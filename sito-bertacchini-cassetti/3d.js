import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

/* Cassetto in rovere con code di rondine passanti: i fianchi portano le code,
   frontale e retro i perni. Misure in decimetri: 46 × 42 × 14 cm, legno da 16 mm. */
const W = 4.6, D = 4.2, H = 1.4, T = 0.16, TF = 0.16;
const N = 3, A = 0.5 * H / N, B = 0.8 * H / N;
const ZI = D / 2 - TF, ZF = D / 2;
const FORO = { y: H * 0.58, r: 0.3 };

const lerp = (a, b, t) => a + (b - a) * t;
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const fase = (t, a, b) => clamp((t - a) / (b - a));
const inOut = t => (t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const fuori = t => 1 - Math.pow(1 - t, 3);
const liscio = t => t * t * (3 - 2 * t);

/* fianco visto di lato: x = profondità, y = altezza, con le code alle due estremità */
function profiloFianco() {
  const s = new THREE.Shape();
  s.moveTo(-ZI, 0);
  s.lineTo(ZI, 0);
  for (let i = 0; i < N; i++) {
    const c = H * (i + .5) / N;
    s.lineTo(ZI, c - A / 2); s.lineTo(ZF, c - B / 2); s.lineTo(ZF, c + B / 2); s.lineTo(ZI, c + A / 2);
  }
  s.lineTo(ZI, H);
  s.lineTo(-ZI, H);
  for (let i = N - 1; i >= 0; i--) {
    const c = H * (i + .5) / N;
    s.lineTo(-ZI, c + A / 2); s.lineTo(-ZF, c + B / 2); s.lineTo(-ZF, c - B / 2); s.lineTo(-ZI, c - A / 2);
  }
  s.closePath();
  return s;
}

/* perni del frontale nello stesso piano: il complemento delle code, u da 0 (faccia interna) a TF */
function profiliPerni() {
  const poli = [];
  const c = i => H * (i + .5) / N;
  poli.push([[0, 0], [TF, 0], [TF, c(0) - B / 2], [0, c(0) - A / 2]]);
  for (let i = 0; i < N - 1; i++) poli.push([[0, c(i) + A / 2], [TF, c(i) + B / 2], [TF, c(i + 1) - B / 2], [0, c(i + 1) - A / 2]]);
  poli.push([[0, c(N - 1) + A / 2], [TF, c(N - 1) + B / 2], [TF, H], [0, H]]);
  return poli.map(p => {
    const s = new THREE.Shape();
    s.moveTo(p[0][0], p[0][1]);
    p.slice(1).forEach(([x, y]) => s.lineTo(x, y));
    s.closePath();
    return s;
  });
}

function profiloFrontale(conForo) {
  const x = W / 2 - T;
  const s = new THREE.Shape();
  s.moveTo(-x, 0); s.lineTo(x, 0); s.lineTo(x, H); s.lineTo(-x, H); s.closePath();
  if (conForo) {
    const f = new THREE.Path();
    f.absarc(0, FORO.y, FORO.r, 0, Math.PI * 2, true);
    s.holes.push(f);
  }
  return s;
}

/* griglia millimetrata del pavimento, sfumata ai bordi */
function texturePavimento() {
  const n = 1024, c = document.createElement('canvas');
  c.width = c.height = n;
  const g = c.getContext('2d');
  const passi = 36, passo = n / passi;
  for (let i = 0; i <= passi; i++) {
    const forte = i % 6 === 0;
    g.strokeStyle = forte ? 'rgba(196, 218, 240, .5)' : 'rgba(196, 218, 240, .2)';
    g.lineWidth = forte ? 2 : 1.2;
    const p = Math.round(i * passo) + .5;
    g.beginPath(); g.moveTo(p, 0); g.lineTo(p, n); g.stroke();
    g.beginPath(); g.moveTo(0, p); g.lineTo(n, p); g.stroke();
  }
  g.globalCompositeOperation = 'destination-in';
  const r = g.createRadialGradient(n / 2, n / 2, 0, n / 2, n / 2, n / 2);
  r.addColorStop(0, 'rgba(0,0,0,1)'); r.addColorStop(.55, 'rgba(0,0,0,.55)'); r.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = r; g.fillRect(0, 0, n, n);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

function textureOmbra() {
  const n = 512, c = document.createElement('canvas');
  c.width = c.height = n;
  const g = c.getContext('2d');
  g.shadowColor = 'rgba(6, 11, 18, 1)';
  g.shadowBlur = 70;
  g.shadowOffsetX = 2000;
  g.fillStyle = '#000';
  g.fillRect(n * .2 - 2000, n * .2, n * .6, n * .6);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/* bordo del multistrato: strati chiari e scuri */
function textureStrati() {
  const c = document.createElement('canvas');
  c.width = 64; c.height = 64;
  const g = c.getContext('2d');
  const strati = 5;
  for (let i = 0; i < strati; i++) {
    g.fillStyle = i % 2 ? '#C9A57A' : '#EBDDC6';
    g.fillRect(0, i * 64 / strati, 64, 64 / strati + 1);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export async function avvia(palco, etichette, opzioni = {}) {
  const fermo = !!opzioni.fermo;
  const mobile = () => palco.clientWidth < 700;

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, mobile() ? 1.5 : 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 1.04;
  renderer.localClippingEnabled = true;
  renderer.setClearColor(0x000000, 0);
  const canvas = renderer.domElement;
  canvas.className = 'palco__canvas';
  canvas.setAttribute('aria-hidden', 'true');

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), .04).texture;
  pmrem.dispose();

  const luce = new THREE.DirectionalLight(0xfff1df, 1.7);
  luce.position.set(4, 8, 6);
  scene.add(luce);
  const controluce = new THREE.DirectionalLight(0xbfd5ff, .45);
  controluce.position.set(-6, 3, -4);
  scene.add(controluce);

  const camera = new THREE.PerspectiveCamera(32, 1, .5, 80);

  /* materiali: la loro foto del rovere come venatura */
  const loader = new THREE.TextureLoader();
  const [rovere, betulla] = await Promise.all([
    loader.loadAsync('assets/3d/rovere.webp'),
    loader.loadAsync('assets/3d/betulla.webp')
  ]);
  const aniso = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  for (const t of [rovere, betulla]) {
    t.colorSpace = THREE.SRGBColorSpace;
    t.wrapS = t.wrapT = THREE.MirroredRepeatWrapping;
    t.anisotropy = aniso;
  }
  const venatura = (ox, oy) => {
    const t = rovere.clone();
    t.repeat.set(1 / 3.6, 1 / 2.8);
    t.offset.set(ox, oy);
    return t;
  };
  const taglio = new THREE.Plane(new THREE.Vector3(0, -1, 0), fermo ? 99 : -2);
  const materiale = (map, colore, ruvido) => new THREE.MeshStandardMaterial({
    map, color: colore, roughness: ruvido, metalness: 0, envMapIntensity: .55, clippingPlanes: [taglio]
  });
  const faccia = (ox, oy) => materiale(venatura(ox, oy), 0xfff6ec, .64);
  const bordo = materiale(venatura(.3, .1), 0xd2b693, .72);
  const testa = materiale(venatura(.6, .4), 0xa98463, .8);

  const linee = new THREE.LineBasicMaterial({ color: 0xd8e7f6, transparent: true, opacity: 1, depthTest: false, depthWrite: false });

  const cassetto = new THREE.Group();
  scene.add(cassetto);
  const pezzi = {};
  const nuovoPezzo = (nome, esploso) => {
    const g = new THREE.Group();
    g.userData.esploso = esploso;
    cassetto.add(g);
    pezzi[nome] = g;
    return g;
  };
  const metti = (gruppo, geo, mats, x, y, z, ry = 0) => {
    const m = new THREE.Mesh(geo, mats);
    m.position.set(x, y, z);
    m.rotation.y = ry;
    const l = new THREE.LineSegments(new THREE.EdgesGeometry(geo, 28), linee);
    l.renderOrder = 10;
    m.add(l);
    gruppo.add(m);
    return m;
  };

  const opz = { depth: T, bevelEnabled: false, curveSegments: 28 };
  const geoFianco = new THREE.ExtrudeGeometry(profiloFianco(), opz);
  const geoPerni = new THREE.ExtrudeGeometry(profiliPerni(), opz);
  const geoFronte = new THREE.ExtrudeGeometry(profiloFrontale(true), { ...opz, depth: TF });
  const geoRetro = new THREE.ExtrudeGeometry(profiloFrontale(false), { ...opz, depth: TF });
  const geoFondo = new THREE.BoxGeometry(W - 2 * T + .08, .08, D - 2 * TF + .08);

  const E = mobile() ? .78 : 1;
  const sx = nuovoPezzo('sx', new THREE.Vector3(-1.7 * E, .3 * E, 0));
  const dx = nuovoPezzo('dx', new THREE.Vector3(1.7 * E, .3 * E, 0));
  const fronte = nuovoPezzo('fronte', new THREE.Vector3(0, .14 * E, 1.6 * E));
  const retro = nuovoPezzo('retro', new THREE.Vector3(0, .14 * E, -1.6 * E));
  const fondo = nuovoPezzo('fondo', new THREE.Vector3(0, -1.05 * E, 0));

  // fianchi: profilo x → z del mondo, estrusione verso -x
  metti(sx, geoFianco, [faccia(0, 0), bordo], -W / 2 + T, 0, 0, -Math.PI / 2);
  metti(dx, geoFianco, [faccia(.45, .2), bordo], W / 2, 0, 0, -Math.PI / 2);
  // frontale con foro maniglia e perni agli angoli
  const facciaFronte = faccia(.2, .55);
  metti(fronte, geoFronte, [facciaFronte, bordo], 0, 0, ZI);
  metti(fronte, geoPerni, [testa, facciaFronte], -W / 2 + T, 0, ZI, -Math.PI / 2);
  metti(fronte, geoPerni, [testa, facciaFronte], W / 2, 0, ZI, -Math.PI / 2);
  // retro
  const facciaRetro = faccia(.7, .3);
  metti(retro, geoRetro, [facciaRetro, bordo], 0, 0, -ZF);
  metti(retro, geoPerni, [testa, facciaRetro], -W / 2, 0, -ZI, Math.PI / 2);
  metti(retro, geoPerni, [testa, facciaRetro], W / 2 - T, 0, -ZI, Math.PI / 2);
  // fondo in multistrato nel canale
  const strati = textureStrati();
  const betullaFondo = betulla.clone();
  betullaFondo.repeat.set(1, 1);
  const latoFondo = new THREE.MeshStandardMaterial({ map: strati, roughness: .8, envMapIntensity: .7, clippingPlanes: [taglio] });
  const pianoFondo = new THREE.MeshStandardMaterial({ map: betullaFondo, color: 0xfff6ea, roughness: .7, envMapIntensity: .7, clippingPlanes: [taglio] });
  metti(fondo, geoFondo, [latoFondo, latoFondo, pianoFondo, pianoFondo, latoFondo, latoFondo], 0, .16, 0);

  /* pavimento a griglia e ombra di contatto */
  const pavimento = new THREE.Mesh(
    new THREE.PlaneGeometry(18, 18),
    new THREE.MeshBasicMaterial({ map: texturePavimento(), transparent: true, depthWrite: false, opacity: 0, toneMapped: false })
  );
  pavimento.rotation.x = -Math.PI / 2;
  pavimento.position.y = -.06;
  scene.add(pavimento);
  const ombra = new THREE.Mesh(
    new THREE.PlaneGeometry(W + 2.6, D + 2.6),
    new THREE.MeshBasicMaterial({ map: textureOmbra(), transparent: true, depthWrite: false, opacity: 0, toneMapped: false })
  );
  ombra.rotation.x = -Math.PI / 2;
  ombra.position.y = -.04;
  ombra.renderOrder = 1;

  /* ingombri per l'inquadratura: smontato e montato */
  const sfera = new THREE.Sphere();
  const scatola = new THREE.Box3();
  const ingombro = k => {
    for (const g of Object.values(pezzi)) g.position.copy(g.userData.esploso).multiplyScalar(1 - k);
    cassetto.rotation.set(0, 0, 0);
    cassetto.updateMatrixWorld(true);
    scatola.setFromObject(cassetto);
    return scatola.getBoundingSphere(sfera.clone());
  };
  const sferaSmontato = ingombro(0);
  const sferaMontato = ingombro(1);
  cassetto.add(ombra);

  /* etichette HTML: richiami durante il montaggio, quote alla fine */
  const NS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(NS, 'svg');
  const pathRichiami = document.createElementNS(NS, 'path');
  const pathQuote = document.createElementNS(NS, 'path');
  pathRichiami.setAttribute('class', 'richiami');
  pathQuote.setAttribute('class', 'quote');
  svg.append(pathRichiami, pathQuote);
  etichette.append(svg);
  const div = (testo, classe = '') => {
    const d = document.createElement('span');
    d.className = 'etichetta ' + classe;
    d.textContent = testo;
    etichette.append(d);
    return d;
  };
  const richiami = [
    { testo: 'Fianco in massello', pezzo: sx, p: new THREE.Vector3(-W / 2, H * .72, -D * .16), dir: [-1, -1] },
    { testo: 'Incastro a coda di rondine', pezzo: dx, p: new THREE.Vector3(W / 2, H * .7, ZI + TF / 2), dir: [1, -1] },
    { testo: 'Fondo in multistrato', pezzo: fondo, p: new THREE.Vector3(W * .16, .2, D * .18), dir: [1, 1] },
    { testo: 'Foro maniglia', pezzo: fronte, p: new THREE.Vector3(-FORO.r * .75, FORO.y - FORO.r * .7, ZF), dir: [-1, 1] }
  ].map(r => ({ ...r, el: div(r.testo) }));
  const quote = [
    { lettera: 'L', a: new THREE.Vector3(-W / 2, 0, ZF + .5), b: new THREE.Vector3(W / 2, 0, ZF + .5), ea: new THREE.Vector3(-W / 2, 0, ZF + .1), eb: new THREE.Vector3(W / 2, 0, ZF + .1) },
    { lettera: 'P', a: new THREE.Vector3(W / 2 + .5, 0, ZF), b: new THREE.Vector3(W / 2 + .5, 0, -ZF), ea: new THREE.Vector3(W / 2 + .1, 0, ZF), eb: new THREE.Vector3(W / 2 + .1, 0, -ZF) },
    { lettera: 'H', a: new THREE.Vector3(W / 2 + .5, 0, -ZF), b: new THREE.Vector3(W / 2 + .5, H, -ZF), ea: new THREE.Vector3(W / 2 + .1, 0, -ZF), eb: new THREE.Vector3(W / 2 + .1, H, -ZF) }
  ].map(q => ({ ...q, el: div(q.lettera, 'etichetta--quota') }));

  let larg = 1, alt = 1;
  const v = new THREE.Vector3();
  const schermo = (obj, p) => {
    v.copy(p);
    obj.localToWorld(v);
    v.project(camera);
    return [(v.x + 1) / 2 * larg, (1 - v.y) / 2 * alt];
  };
  const centroSchermo = new THREE.Vector3();

  function disegnaEtichette(t) {
    const pic = mobile();
    let d = '', massimo = 0;
    richiami.forEach((r, i) => {
      const op = fase(t, .5 + i * .14, .85 + i * .14) * (1 - fase(t, 1.65, 1.95));
      r.el.style.opacity = op.toFixed(3);
      if (op <= 0) return;
      massimo = Math.max(massimo, op);
      const [x, y] = schermo(r.pezzo, r.p);
      const lung = pic ? 24 : 40;
      const x1 = x + r.dir[0] * lung, y1 = y + r.dir[1] * lung * .8;
      const x2 = x1 + r.dir[0] * (pic ? 10 : 16);
      const w = r.w || (r.w = r.el.offsetWidth), h = r.h || (r.h = r.el.offsetHeight);
      let lx = r.dir[0] > 0 ? x2 + 4 : x2 - 4 - w;
      lx = clamp(lx, 4, larg - w - 4);
      const ly = clamp(y1 - h / 2, 4, alt - h - 4);
      r.el.style.transform = `translate3d(${lx.toFixed(1)}px, ${ly.toFixed(1)}px, 0)`;
      d += `M${x.toFixed(1)} ${y.toFixed(1)}L${x1.toFixed(1)} ${y1.toFixed(1)}L${x2.toFixed(1)} ${y1.toFixed(1)}`;
      d += `M${(x - 2.5).toFixed(1)} ${y.toFixed(1)}a2.5 2.5 0 1 0 5 0a2.5 2.5 0 1 0 -5 0`;
    });
    pathRichiami.setAttribute('d', d);
    pathRichiami.style.opacity = massimo.toFixed(3);

    const opQ = fermo ? 1 : fase(t, 2.5, 3.1);
    let q = '';
    if (opQ > 0) {
      v.set(0, H / 2, 0);
      cassetto.localToWorld(v);
      v.project(camera);
      centroSchermo.set((v.x + 1) / 2 * larg, (1 - v.y) / 2 * alt, 0);
      quote.forEach(k => {
        const [ax, ay] = schermo(cassetto, k.a), [bx, by] = schermo(cassetto, k.b);
        const [eax, eay] = schermo(cassetto, k.ea), [ebx, eby] = schermo(cassetto, k.eb);
        const dxs = bx - ax, dys = by - ay, l = Math.hypot(dxs, dys) || 1;
        const ux = dxs / l, uy = dys / l;
        // linee di richiamo, linea di quota e trattini obliqui alle estremità
        const ox = (ax - eax), oy = (ay - eay), ol = Math.hypot(ox, oy) || 1;
        const sx_ = ox / ol * 5, sy_ = oy / ol * 5;
        q += `M${eax.toFixed(1)} ${eay.toFixed(1)}L${(ax + sx_).toFixed(1)} ${(ay + sy_).toFixed(1)}`;
        q += `M${ebx.toFixed(1)} ${eby.toFixed(1)}L${(bx + sx_).toFixed(1)} ${(by + sy_).toFixed(1)}`;
        const lx = ax + dxs * opQ, ly = ay + dys * opQ;
        q += `M${ax.toFixed(1)} ${ay.toFixed(1)}L${lx.toFixed(1)} ${ly.toFixed(1)}`;
        const tx = (ux - uy) * 4.5, ty = (uy + ux) * 4.5;
        for (const [px, py] of [[ax, ay], [bx, by]]) q += `M${(px - tx).toFixed(1)} ${(py - ty).toFixed(1)}L${(px + tx).toFixed(1)} ${(py + ty).toFixed(1)}`;
        // lettera dal lato lontano dal cassetto
        const mx = (ax + bx) / 2, my = (ay + by) / 2;
        let nx = -uy, ny = ux;
        if ((mx - centroSchermo.x) * nx + (my - centroSchermo.y) * ny < 0) { nx = -nx; ny = -ny; }
        const w = k.el.offsetWidth, h = k.el.offsetHeight;
        k.el.style.opacity = opQ.toFixed(3);
        k.el.style.transform = `translate3d(${(mx + nx * 13 - w / 2).toFixed(1)}px, ${(my + ny * 13 - h / 2).toFixed(1)}px, 0)`;
      });
    } else quote.forEach(k => { k.el.style.opacity = '0'; });
    pathQuote.setAttribute('d', q);
    palco.classList.toggle('palco--misure', opQ >= 1);
  }

  /* il racconto nel tempo */
  const hero = palco.closest('.hero') || palco;
  const bersaglio = new THREE.Vector3();
  let fov = 32;
  function scena(t) {
    const kFR = inOut(fase(t, 1.0, 1.7));
    const kFondo = inOut(fase(t, 1.2, 1.9));
    const kFianchi = fuori(fase(t, 1.75, 2.35));
    fronte.position.copy(fronte.userData.esploso).multiplyScalar(1 - kFR);
    retro.position.copy(retro.userData.esploso).multiplyScalar(1 - kFR);
    fondo.position.copy(fondo.userData.esploso).multiplyScalar(1 - kFondo);
    sx.position.copy(sx.userData.esploso).multiplyScalar(1 - kFianchi);
    dx.position.copy(dx.userData.esploso).multiplyScalar(1 - kFianchi);
    // lo scatto degli incastri
    const scatto = Math.sin(fase(t, 2.3, 2.62) * Math.PI) * (1 - fase(t, 2.3, 2.62));
    cassetto.scale.setScalar(1 + scatto * .018);

    taglio.constant = fermo ? 99 : lerp(-1.6, H + 1.4, inOut(fase(t, .25, 1.3)));
    linee.opacity = fermo ? 0 : 1 - fase(t, 1.25, 2.5);
    const conLinee = linee.opacity > .002;
    cassetto.traverse(o => { if (o.isLineSegments) o.visible = conLinee; });

    pavimento.material.opacity = .9 * fase(t, 0, .8);
    ombra.material.opacity = lerp(.2, .8, liscio(fase(t, 1.2, 2.4)));

    const r = hero.getBoundingClientRect();
    const p = clamp(-r.top / Math.max(1, r.height));
    const avvio = liscio(fase(t, 2.6, 4.4));
    const giro = lerp(-1.12, -.62, inOut(fase(t, 0, 2.6))) + Math.sin((t - 2.6) * .34) * .24 * avvio + p * .55;
    cassetto.rotation.y = giro;

    const k = inOut(fase(t, 1.55, 2.7));
    const raggio = lerp(sferaSmontato.radius * .98, sferaMontato.radius * (mobile() ? 1.0 : 1.04), k);
    bersaglio.set(0, lerp(sferaSmontato.center.y, sferaMontato.center.y, k), 0);
    const vfov = THREE.MathUtils.degToRad(fov);
    const hfov = 2 * Math.atan(Math.tan(vfov / 2) * camera.aspect);
    const dist = raggio / Math.sin(Math.min(vfov, hfov) / 2);
    const elev = THREE.MathUtils.degToRad(lerp(25, 50, p) - 3 * (1 - k));
    camera.position.set(0, bersaglio.y + dist * Math.sin(elev), dist * Math.cos(elev));
    camera.lookAt(bersaglio);
    camera.updateMatrixWorld();
  }

  function dimensiona() {
    larg = Math.max(1, palco.clientWidth);
    alt = Math.max(1, palco.clientHeight);
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, mobile() ? 1.5 : 2));
    renderer.setSize(larg, alt, false);
    camera.aspect = larg / alt;
    fov = mobile() ? 34 : 30;
    camera.fov = fov;
    camera.updateProjectionMatrix();
  }

  palco.prepend(canvas);
  dimensiona();
  scena(fermo ? 9 : 0);
  await renderer.compileAsync(scene, camera);

  const t0 = performance.now();
  const tempo = now => (fermo ? 9 : (now - t0) / 1000);
  const disegna = now => {
    const t = tempo(now);
    scena(t);
    renderer.render(scene, camera);
    disegnaEtichette(t);
  };

  disegna(performance.now());
  palco.classList.add('palco--3d');

  /* loop solo quando serve */
  let visibile = true, giroId = 0;
  const controlla = () => {
    const deve = visibile && !document.hidden && !fermo;
    if (deve) {
      const id = ++giroId;
      const passo = now => { if (id !== giroId) return; disegna(now); requestAnimationFrame(passo); };
      requestAnimationFrame(passo);
    } else giroId++;
  };
  new IntersectionObserver(([e]) => { visibile = e.isIntersecting; controlla(); }).observe(palco);
  document.addEventListener('visibilitychange', controlla);
  new ResizeObserver(() => { dimensiona(); if (fermo || !visibile) disegna(performance.now()); }).observe(palco);
  window.__cassetto = { scena, renderer };
}
