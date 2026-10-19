// Pianca Serramenti: scene three.js
// 1) hero: tre ante in legno con maniglia in ottone si aprono davanti al vano illuminato e formano il logo
// 2) anatomia: una finestra si scompone nei suoi pezzi seguendo lo scroll, con il rivestimento in alluminio a richiesta
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

const piccolo = matchMedia('(max-width: 899px)').matches || matchMedia('(pointer: coarse)').matches;
const ridotto = matchMedia('(prefers-reduced-motion: reduce)').matches;
const PR = Math.min(window.devicePixelRatio || 1, piccolo ? 1.5 : 2);

const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const fase = (t, a, b) => clamp((t - a) / (b - a));
const morbido = x => x * x * (3 - 2 * x);
const entraEsce = x => (x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
const molla = x => { const c1 = 1.15, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); };

/* ---------- materiali ---------- */
function venature({ base, scuro, chiaro, seme = 3 }) {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 1024;
  const g = c.getContext('2d');
  let s = seme * 9301 + 49297;
  const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  g.fillStyle = base; g.fillRect(0, 0, 256, 1024);
  for (let i = 0; i < 10; i++) {
    g.fillStyle = r() < .5 ? scuro : chiaro; g.globalAlpha = .05 + r() * .09;
    g.fillRect(r() * 256, 0, 12 + r() * 46, 1024);
  }
  for (let i = 0; i < 70; i++) {
    const x0 = r() * 256, amp = 1.5 + r() * 5, f = .003 + r() * .006, f0 = r() * 6.28;
    g.strokeStyle = r() < .65 ? scuro : chiaro;
    g.globalAlpha = .07 + r() * .22;
    g.lineWidth = .6 + r() * 1.8;
    g.beginPath();
    for (let y = -8; y <= 1032; y += 8) {
      const x = x0 + Math.sin(y * f + f0) * amp + Math.sin(y * f * 2.7 + i) * amp * .35;
      if (y < 0) g.moveTo(x, y); else g.lineTo(x, y);
    }
    g.stroke();
  }
  g.globalAlpha = 1;
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 4;
  return t;
}

// riflesso del vetro: bande di luce diagonali che scorrono quando l'anta ruota
function texRiflesso() {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 64;
  const g = c.getContext('2d');
  const gr = g.createLinearGradient(0, 0, 512, 0);
  gr.addColorStop(0, 'rgba(255,255,255,0)');
  gr.addColorStop(.30, 'rgba(255,255,255,0)');
  gr.addColorStop(.36, 'rgba(255,240,220,.85)');
  gr.addColorStop(.42, 'rgba(255,255,255,.05)');
  gr.addColorStop(.47, 'rgba(255,240,220,.45)');
  gr.addColorStop(.52, 'rgba(255,255,255,0)');
  gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 512, 64);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = THREE.RepeatWrapping;
  t.center.set(.5, .5);
  t.rotation = -.5;
  t.repeat.set(1.2, 1);
  return t;
}

function materiali(tono) {
  const tv = venature(tono); tv.repeat.set(.22, 1);
  const th = venature({ ...tono, seme: tono.seme + 5 });
  th.center.set(.5, .5); th.rotation = Math.PI / 2; th.repeat.set(1, .22);
  return {
    legnoV: new THREE.MeshStandardMaterial({ map: tv, roughness: .52, metalness: 0 }),
    legnoH: new THREE.MeshStandardMaterial({ map: th, roughness: .52, metalness: 0 }),
    vetro: new THREE.MeshPhysicalMaterial({ color: 0xdde6e3, roughness: .05, metalness: 0, transparent: true, opacity: .14, envMapIntensity: 1.5, side: THREE.DoubleSide, depthWrite: false }),
    ottone: new THREE.MeshStandardMaterial({ color: 0xd6ad62, metalness: 1, roughness: .22 }),
    gomma: new THREE.MeshStandardMaterial({ color: 0x1a1715, roughness: .85 }),
    acciaio: new THREE.MeshStandardMaterial({ color: 0xa3a39e, metalness: 1, roughness: .32 }),
    alluminio: new THREE.MeshStandardMaterial({ color: 0x4f5458, metalness: .75, roughness: .4 })
  };
}

function ambiente(renderer, scene) {
  const pm = new THREE.PMREMGenerator(renderer);
  scene.environment = pm.fromScene(new RoomEnvironment(), .04).texture;
  pm.dispose();
}

function creaRenderer(canvas) {
  const r = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  r.setPixelRatio(PR);
  r.outputColorSpace = THREE.SRGBColorSpace;
  r.toneMapping = THREE.ACESFilmicToneMapping;
  r.toneMappingExposure = 1.08;
  r.setClearColor(0x000000, 0);
  return r;
}

/* ---------- pezzi ---------- */
// rettangolo di quattro listelli con gli spigoli arrotondati, centrato sull'origine
function telaio(w, h, b, d, mV, mH, raggio = .01) {
  const g = new THREE.Group();
  const montante = new RoundedBoxGeometry(b, h, d, 2, Math.min(raggio, b / 3, d / 3));
  const traverso = new RoundedBoxGeometry(w - 2 * b + .002, b, d * .94, 2, Math.min(raggio, b / 3, d / 3));
  for (const x of [-(w - b) / 2, (w - b) / 2]) { const m = new THREE.Mesh(montante, mV); m.position.x = x; g.add(m); }
  for (const y of [(h - b) / 2, -(h - b) / 2]) { const m = new THREE.Mesh(traverso, mH); m.position.y = y; g.add(m); }
  return g;
}

// maniglia da finestra: placca, perno e leva verso il basso
function maniglia(m, scala = 1) {
  const g = new THREE.Group();
  const placca = new THREE.Mesh(new RoundedBoxGeometry(.03, .085, .01, 2, .004), m);
  const perno = new THREE.Mesh(new THREE.CylinderGeometry(.0075, .0075, .03, 16), m);
  perno.rotation.x = Math.PI / 2; perno.position.set(0, .02, .018);
  const leva = new THREE.Mesh(new RoundedBoxGeometry(.017, .105, .015, 2, .006), m);
  leva.position.set(0, -.024, .035);
  g.add(placca, perno, leva);
  g.scale.setScalar(scala);
  return g;
}

// anta con la cerniera sul lato sinistro (l'origine del gruppo)
function anta(w, h, M, lucido) {
  const b = Math.min(.07, w * .15), d = .068;
  const perno = new THREE.Group();
  const corpo = telaio(w, h, b, d, M.legnoV, M.legnoH);
  corpo.position.x = w / 2;
  const fermavetro = telaio(w - 2 * b + .02, h - 2 * b + .02, .016, d * .55, M.legnoV, M.legnoH, .005);
  fermavetro.position.set(w / 2, 0, d * .18);
  const lastra = new THREE.Mesh(new THREE.PlaneGeometry(w - 2 * b + .006, h - 2 * b + .006), M.vetro);
  lastra.position.set(w / 2, 0, 0);
  const riflesso = new THREE.Mesh(lastra.geometry, lucido);
  riflesso.position.set(w / 2, 0, .003);
  const man = maniglia(M.ottone);
  man.position.set(w - b / 2, -.03, d / 2 + .002);
  perno.add(corpo, fermavetro, lastra, riflesso, man);
  return { perno, riflesso };
}

/* =====================================================================
   HERO
   ===================================================================== */
export function avviaHero({ hero, vano, canvas }) {
  const renderer = creaRenderer(canvas);
  const scene = new THREE.Scene();
  ambiente(renderer, scene);
  const camera = new THREE.PerspectiveCamera(40, 1, .05, 80);
  const M = materiali({ base: '#523726', scuro: '#25170e', chiaro: '#775439', seme: 4 });
  const riflessoBase = texRiflesso();

  const H = 1.6;
  const mondo = new THREE.Group();
  scene.add(mondo);
  let ante = [], W = 0;

  function costruisci(aspetto) {
    mondo.clear(); ante = [];
    W = H * aspetto;
    const tb = .06;
    const fisso = telaio(W + 2 * tb, H + 2 * tb, tb, .1, M.legnoV, M.legnoH);
    fisso.position.z = -.035;
    mondo.add(fisso);
    const n = 3, wa = W / n;
    for (let i = 0; i < n; i++) {
      const map = riflessoBase.clone(); map.needsUpdate = true;
      const lucido = new THREE.MeshBasicMaterial({ map, transparent: true, opacity: .5, blending: THREE.AdditiveBlending, depthWrite: false });
      const a = anta(wa - .01, H - .01, M, lucido);
      a.perno.position.x = -W / 2 + i * wa + .005;
      mondo.add(a.perno);
      ante.push(a);
    }
  }

  scene.add(new THREE.HemisphereLight(0xffe7c8, 0x2a201a, .5));
  const chiave = new THREE.DirectionalLight(0xfff0dc, 1.5);
  chiave.position.set(-2.4, 2.8, 4);
  scene.add(chiave);
  const stanza = new THREE.PointLight(0xffb469, 0, 8, 1.3);   // la luce della stanza, dietro il vano
  stanza.position.set(.15, .35, -1.3);
  scene.add(stanza);
  const scia = new THREE.PointLight(0xffd9a0, 0, 5, 1.5);      // la luce che attraversa le ante nell'intro
  scene.add(scia);

  function misura() {
    const rc = canvas.getBoundingClientRect(), rv = vano.getBoundingClientRect();
    const cw = Math.max(1, rc.width), ch = Math.max(1, rc.height);
    renderer.setSize(cw, ch, false);
    const asp = rv.width / Math.max(1, rv.height);
    if (!ante.length || Math.abs(asp - W / H) > .01) costruisci(asp);
    // la proiezione è centrata sul vano: le ante chiuse coprono esattamente la foto
    const pxU = rv.height / H;
    const cx = rv.left + rv.width / 2 - rc.left, cy = rv.top + rv.height / 2 - rc.top;
    const fw = 2 * Math.max(cx, cw - cx), fh = 2 * Math.max(cy, ch - cy);
    const D = (fh / pxU) / 2 / Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2);
    camera.position.set(0, 0, D);
    camera.lookAt(0, 0, 0);
    camera.aspect = fw / fh;
    camera.setViewOffset(fw, fh, fw / 2 - cx, fh / 2 - cy, cw, ch);
    camera.updateProjectionMatrix();
  }

  let inizio = null, puntX = 0, puntY = 0, px = 0, py = 0;
  function scroll() {
    const r = hero.getBoundingClientRect();
    return clamp(-r.top / Math.max(1, r.height * .85));
  }

  function disegna(ora) {
    if (inizio === null) inizio = ora;
    const t = ridotto ? 30 : (ora - inizio) / 1000;
    const s = ridotto ? 0 : scroll();
    ante.forEach((a, i) => {
      // si aprono a ventaglio, una dopo l'altra, con un piccolo rimbalzo della cerniera
      const k = molla(fase(t, .5 + i * .17, 2.3 + i * .17));
      const respiro = Math.sin(t * .8 + i * 1.1) * .03 * fase(t, 2.8, 4);
      a.perno.rotation.y = -(k * 1.18 + s * .4 + respiro);
      a.riflesso.material.map.offset.x = a.perno.rotation.y * .6 - i * .15 + .25;
    });
    const k0 = entraEsce(fase(t, .35, 2.7));
    px += (puntX - px) * .06; py += (puntY - py) * .06;
    mondo.rotation.x = -.15 * k0 - s * .15 + py * .05;
    mondo.rotation.y = .12 * k0 - s * .1 + px * .14;
    mondo.position.z = s * .5;
    const ls = fase(t, .55, 2.9);
    scia.position.set(-1.7 + ls * 3.6, .7 - ls * .6, .85);
    scia.intensity = Math.sin(ls * Math.PI) * 10;
    stanza.intensity = 2 + 8 * fase(t, .15, 1.8) + s * 6;
    renderer.render(scene, camera);
  }

  let idRaf = 0, inVista = true, primo = true;
  function ciclo() {
    idRaf = requestAnimationFrame(ciclo);
    disegna(performance.now());
    if (primo) { primo = false; canvas.classList.add('pronto'); }
  }
  function aggiorna() {
    cancelAnimationFrame(idRaf);
    if (ridotto) { disegna(performance.now()); canvas.classList.add('pronto'); return; }
    if (inVista && !document.hidden) idRaf = requestAnimationFrame(ciclo);
  }

  misura();
  new ResizeObserver(() => { misura(); if (ridotto) disegna(performance.now()); }).observe(hero);
  new IntersectionObserver(([v]) => { inVista = v.isIntersecting; aggiorna(); }).observe(hero);
  document.addEventListener('visibilitychange', aggiorna);
  if (!piccolo) {
    hero.addEventListener('pointermove', e => {
      const r = hero.getBoundingClientRect();
      puntX = (e.clientX - r.left) / r.width * 2 - 1;
      puntY = (e.clientY - r.top) / r.height * 2 - 1;
    });
    hero.addEventListener('pointerleave', () => { puntX = 0; puntY = 0; });
  }
  aggiorna();
}

/* =====================================================================
   ANATOMIA DI UNA FINESTRA
   ===================================================================== */
const ORDINE = ['telaio', 'anta', 'vetro', 'guarnizioni', 'maniglia', 'alu'];

export function avviaAnatomia({ palco, canvas, stato }) {
  const renderer = creaRenderer(canvas);
  const scene = new THREE.Scene();
  ambiente(renderer, scene);
  const camera = new THREE.PerspectiveCamera(32, 1, .05, 80);
  const base = materiali({ base: '#6b4a32', scuro: '#33211a', chiaro: '#94704f', seme: 11 });

  const modello = new THREE.Group();
  scene.add(modello);
  const parti = {};

  // ogni parte ha i suoi materiali, così si può mettere in trasparenza da sola
  function parte(nome, costruttore, zChiusa, zAperta) {
    const mats = {};
    for (const k in base) mats[k] = base[k].clone();
    const g = new THREE.Group();
    costruttore(g, mats);
    modello.add(g);
    const lista = Object.values(mats);
    lista.forEach(m => { m.userData.opacita = m.opacity; m.transparent = true; });
    parti[nome] = { g, lista, zChiusa, zAperta, vis: 1 };
  }

  const Wt = 1.0, Ht = 1.42, bt = .085, dt = .095;
  const Wa = Wt - 2 * bt + .03, Ha = Ht - 2 * bt + .03, ba = .078, da = .082;
  const Wv = Wa - 2 * ba + .012, Hv = Ha - 2 * ba + .012;

  parte('alu', (g, m) => {
    const c = telaio(Wt + .024, Ht + .024, bt + .012, .024, m.alluminio, m.alluminio, .006);
    const ca = telaio(Wt - 2 * bt - .004, Ht - 2 * bt - .004, ba, .02, m.alluminio, m.alluminio, .005);
    ca.position.z = .0225;
    g.add(c, ca);
  }, -dt / 2 - .014, -1.0);
  parte('telaio', (g, m) => { g.add(telaio(Wt, Ht, bt, dt, m.legnoV, m.legnoH, .012)); }, 0, -.52);
  parte('guarnizioni', (g, m) => {
    g.add(telaio(Wt - 2 * bt + .016, Ht - 2 * bt + .016, .012, .02, m.gomma, m.gomma, .004));
    for (const y of [Ht * .32, -Ht * .32]) {
      const c = new THREE.Mesh(new THREE.CylinderGeometry(.011, .011, .07, 16), m.acciaio);
      c.position.set(-(Wt / 2 - bt) - .004, y, .02);
      g.add(c);
    }
    const asta = new THREE.Mesh(new RoundedBoxGeometry(.012, Ht * .7, .012, 2, .004), m.acciaio);
    asta.position.set(Wt / 2 - bt + .004, 0, .02);
    g.add(asta);
  }, .01, -.2);
  parte('anta', (g, m) => {
    g.add(telaio(Wa, Ha, ba, da, m.legnoV, m.legnoH, .011));
    const fv = telaio(Wv + .02, Hv + .02, .016, da * .5, m.legnoV, m.legnoH, .005);
    fv.position.z = da * .2;
    g.add(fv);
  }, .012, .14);
  parte('vetro', (g, m) => {
    for (const z of [-.013, .013]) {
      const l = new THREE.Mesh(new THREE.PlaneGeometry(Wv, Hv), m.vetro);
      l.position.z = z;
      g.add(l);
    }
    g.add(telaio(Wv - .004, Hv - .004, .012, .024, m.acciaio, m.acciaio, .003));
  }, .012, .44);
  parte('maniglia', (g, m) => {
    const man = maniglia(m.ottone, 1.5);
    man.position.set(Wa / 2 - ba / 2, -.04, da / 2 + .004);
    g.add(man);
  }, .012, .76);

  scene.add(new THREE.HemisphereLight(0xffe9cf, 0x251c16, .55));
  const chiave = new THREE.DirectionalLight(0xfff1de, 1.7);
  chiave.position.set(2.2, 2.6, 3.2);
  scene.add(chiave);
  const taglio = new THREE.PointLight(0xffb76f, 9, 7, 1.4);
  taglio.position.set(-1.6, .9, -1.2);
  scene.add(taglio);

  function misura() {
    const w = Math.max(1, palco.clientWidth), h = Math.max(1, palco.clientHeight);
    renderer.setSize(w, h, false);
    const largo = w >= 900;
    const cx = largo ? w * .66 : w * .5;
    const cy = largo ? h * .53 : h * .47;
    const fw = 2 * Math.max(cx, w - cx), fh = 2 * Math.max(cy, h - cy);
    const spazio = largo ? Math.min(w * .5, h * .78) : Math.min(w * .96, h * .44);
    const pxU = spazio / (largo ? 1.9 : 1.55);
    const D = (fh / pxU) / 2 / Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2);
    camera.position.set(0, 0, D);
    camera.lookAt(0, 0, 0);
    camera.aspect = fw / fh;
    camera.setViewOffset(fw, fh, fw / 2 - cx, fh / 2 - cy, w, h);
    camera.updateProjectionMatrix();
  }

  let aluK = stato.alu ? 1 : 0, rotY = -.7, rotX = .1, ultimo = performance.now();
  const opac = Object.fromEntries(ORDINE.map(n => [n, 1]));

  function disegna(ora) {
    const dt = Math.min(.05, (ora - ultimo) / 1000); ultimo = ora;
    const segui = 1 - Math.pow(.0015, dt);          // inseguimento morbido, indipendente dai fps
    const p = stato.p;
    // si apre all'inizio, resta aperta mentre si spiegano le parti, si richiude all'ultimo passo
    const e = morbido(fase(p, .02, .13)) * (1 - morbido(fase(p, .84, .96)));
    const attiva = ORDINE[stato.passo];
    aluK += ((stato.alu ? 1 : 0) - aluK) * segui;

    ORDINE.forEach(nome => {
      const pt = parti[nome];
      let z = pt.zChiusa + (pt.zAperta - pt.zChiusa) * e;
      let vis = 1;
      if (nome === 'alu') { z -= (1 - aluK) * .55; vis = aluK; }
      // la parte di cui si parla resta piena, le altre si fanno da parte in trasparenza
      const fuoco = stato.passo < 5 && e > .3 && nome !== attiva ? .14 : 1;
      opac[nome] += (fuoco - opac[nome]) * segui;
      pt.g.position.z = z;
      pt.g.visible = vis > .01;
      const o = opac[nome] * vis;
      pt.lista.forEach(m => { m.opacity = m.userData.opacita * o; m.depthWrite = o > .98 && m.userData.opacita >= 1; });
    });

    const tempo = ora / 1000;
    // all'ultimo passo la finestra si gira e mostra il lato esterno, con l'alluminio
    const giro = morbido(fase(p, .84, .97));
    const rY = -.72 + Math.min(p, .84) * .55 - giro * 2.3 + (ridotto ? 0 : Math.sin(tempo * .45) * .04);
    rotY += (rY - rotY) * segui;
    rotX += ((.1 + e * .06) - rotX) * segui;
    modello.rotation.set(rotX, rotY, 0);
    renderer.render(scene, camera);
  }

  let idRaf = 0, inVista = false, primo = true;
  function ciclo() {
    idRaf = requestAnimationFrame(ciclo);
    disegna(performance.now());
    if (primo) { primo = false; canvas.classList.add('pronto'); }
  }
  function aggiorna() {
    cancelAnimationFrame(idRaf);
    if (inVista && !document.hidden) { ultimo = performance.now(); idRaf = requestAnimationFrame(ciclo); }
  }

  misura();
  new ResizeObserver(misura).observe(palco);
  new IntersectionObserver(([v]) => { inVista = v.isIntersecting; aggiorna(); }).observe(palco);
  document.addEventListener('visibilitychange', aggiorna);
  disegna(performance.now());
  canvas.classList.add('pronto');
  aggiorna();
}
