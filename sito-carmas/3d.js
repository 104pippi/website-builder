// Finestra in legno che si monta pezzo per pezzo mentre scorri, con l'essenza che cambia.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const ESSENZE = { larice: '#AE6F3B', rovere: '#A6845A', pino: '#D3AF77', grandis: '#8F4A30' };

function venature(seme) {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 1024;
  const g = c.getContext('2d');
  let s = seme;
  const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
  g.fillStyle = '#f6f1ea';
  g.fillRect(0, 0, 256, 1024);
  // fasce morbide di tono
  for (let i = 0; i < 10; i++) {
    const x = rnd() * 256, w = 20 + rnd() * 60;
    const gr = g.createLinearGradient(x - w, 0, x + w, 0);
    gr.addColorStop(0, 'rgba(120,70,30,0)');
    gr.addColorStop(.5, `rgba(120,70,30,${.04 + rnd() * .06})`);
    gr.addColorStop(1, 'rgba(120,70,30,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 256, 1024);
  }
  // venature
  for (let i = 0; i < 150; i++) {
    const x0 = rnd() * 276 - 10, amp = 1.5 + rnd() * 9, f = .0015 + rnd() * .005, ph = rnd() * 6.28;
    g.strokeStyle = `rgba(70,38,14,${.07 + rnd() * .24})`;
    g.lineWidth = .5 + rnd() * 2.2;
    g.beginPath();
    for (let y = -16; y <= 1040; y += 16) {
      const x = x0 + Math.sin(y * f + ph) * amp + Math.sin(y * f * 3.3 + ph * 2) * amp * .25;
      if (y < 0) g.moveTo(x, y); else g.lineTo(x, y);
    }
    g.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 4;
  return t;
}

function intonacoTex() {
  const c = document.createElement('canvas');
  c.width = c.height = 512;
  const g = c.getContext('2d');
  g.fillStyle = '#e3e2dc'; g.fillRect(0, 0, 512, 512);
  let s = 3;
  const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < 40; i++) {
    const x = rnd() * 512, y = rnd() * 512, r = 40 + rnd() * 120;
    const gr = g.createRadialGradient(x, y, 0, x, y, r);
    const a = rnd() * .05;
    gr.addColorStop(0, rnd() > .5 ? `rgba(255,255,255,${a})` : `rgba(120,110,90,${a})`);
    gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 512, 512);
  }
  const d = g.getImageData(0, 0, 512, 512);
  for (let i = 0; i < d.data.length; i += 4) { const n = (rnd() - .5) * 14; d.data[i] += n; d.data[i + 1] += n; d.data[i + 2] += n; }
  g.putImageData(d, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

function fuoriTex() {
  const c = document.createElement('canvas');
  c.width = 64; c.height = 256;
  const g = c.getContext('2d');
  const gr = g.createLinearGradient(0, 0, 0, 256);
  gr.addColorStop(0, '#fbf6ea');
  gr.addColorStop(.5, '#eef0e4');
  gr.addColorStop(.66, '#cfdcc4');
  gr.addColorStop(1, '#86a37e');
  g.fillStyle = gr; g.fillRect(0, 0, 64, 256);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

const clamp01 = v => Math.max(0, Math.min(1, v));
const morbido = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

export async function avvia(contenitore, sezione) {
  const prova = document.createElement('canvas');
  if (!(prova.getContext('webgl2') || prova.getContext('webgl'))) throw new Error('WebGL assente');

  const ridotto = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const mobile = matchMedia('(max-width: 700px)').matches;

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, mobile ? 1.5 : 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 1.02;
  contenitore.prepend(renderer.domElement);

  const scena = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scena.environment = pmrem.fromScene(new RoomEnvironment(), .04).texture;
  scena.environmentIntensity = .7;

  const sole = new THREE.DirectionalLight(0xfff7ee, 2.2);
  sole.position.set(-3.6, 2.6, 2.6);
  scena.add(sole);
  scena.add(new THREE.HemisphereLight(0xeef3ec, 0x1e3a2c, .55));

  const camera = new THREE.PerspectiveCamera(30, 1, .5, 40);

  // materiali
  const texV = venature(11);
  const texH = texV.clone();
  texH.center.set(.5, .5); texH.rotation = Math.PI / 2; texH.needsUpdate = true;
  const colore = new THREE.Color(ESSENZE[contenitore.dataset.essenza] || ESSENZE.larice);
  const legnoV = new THREE.MeshStandardMaterial({ map: texV, color: colore, roughness: .42, metalness: 0 });
  const legnoH = new THREE.MeshStandardMaterial({ map: texH, color: colore, roughness: .42, metalness: 0 });
  const vetro = new THREE.MeshStandardMaterial({ color: 0xd9e8e2, roughness: .04, metalness: 0, transparent: true, opacity: .2, envMapIntensity: 1.6, depthWrite: false });
  const ottone = new THREE.MeshStandardMaterial({ color: 0xd6a648, roughness: .28, metalness: 1 });
  const intTex = intonacoTex(); intTex.repeat.set(1.4, 1.4);
  const intonaco = new THREE.MeshStandardMaterial({ map: intTex, color: 0xffffff, roughness: .96 });
  const pietra = new THREE.MeshStandardMaterial({ color: 0xf0eee8, roughness: .55 });

  const box = (w, h, d, mat) => new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);

  // misure (metri)
  const W = 1.24, H = 1.52, a = .075, dT = .09;
  const Wi = W - 2 * a, Hi = H - 2 * a, wa = Wi / 2, b = .065, dA = .072;

  const finestra = new THREE.Group();
  scena.add(finestra);

  // muro con il vano e la soglia in pietra
  const muro = new THREE.Group();
  const M = 2.08, MH = 2.28, sp = .34;
  const lato = (M - W) / 2;
  const m1 = box(lato, MH, sp, intonaco); m1.position.set(-(W / 2 + lato / 2), 0, -sp / 2 + .02);
  const m2 = m1.clone(); m2.position.x *= -1;
  const sopra = (MH - H) / 2;
  const m3 = box(W, sopra, sp, intonaco); m3.position.set(0, H / 2 + sopra / 2, -sp / 2 + .02);
  const m4 = m3.clone(); m4.position.y *= -1;
  muro.add(m1, m2, m3, m4);
  const soglia = box(W + .1, .05, sp + .08, pietra);
  soglia.position.set(0, -H / 2 - .021, -sp / 2 + .06);
  muro.add(soglia);
  // fuori: la luce del giorno che si vede dal vetro
  const fuori = new THREE.Mesh(new THREE.PlaneGeometry(W + .5, H + .5), new THREE.MeshBasicMaterial({ map: fuoriTex(), toneMapped: false }));
  fuori.position.set(0, 0, -sp - .25);
  muro.add(fuori);
  finestra.add(muro);

  // pezzi da montare: [oggetto, spostamento iniziale, rotazione iniziale, inizio, fine]
  const pezzi = [];
  const pezzo = (obj, da, rot, t0, t1) => {
    obj.userData.casa = obj.position.clone();
    obj.userData.rotCasa = obj.rotation.clone();
    pezzi.push({ obj, da: new THREE.Vector3(...da), rot: new THREE.Euler(...rot), t0, t1 });
    finestra.add(obj);
    return obj;
  };

  // telaio fisso
  const tSx = box(a, H, dT, legnoV); tSx.position.set(-W / 2 + a / 2, 0, 0);
  const tDx = box(a, H, dT, legnoV); tDx.position.set(W / 2 - a / 2, 0, 0);
  const tSu = box(W - 2 * a, a, dT, legnoH); tSu.position.set(0, H / 2 - a / 2, 0);
  const tGiu = box(W - 2 * a, a, dT, legnoH); tGiu.position.set(0, -H / 2 + a / 2, 0);
  pezzo(tSx, [-1.1, .15, .9], [0, 0, .5], .0, .34);
  pezzo(tDx, [1.1, -.15, .9], [0, 0, -.5], .05, .38);
  pezzo(tSu, [.2, 1.1, .8], [.4, 0, .15], .1, .44);
  pezzo(tGiu, [-.2, -1.1, .8], [-.4, 0, -.15], .14, .48);

  // ante: il gruppo ruota sul lato della cerniera
  const anta = verso => {
    const g = new THREE.Group();
    const s = verso; // -1 sinistra (cerniera a sinistra), +1 destra
    const x = v => -s * v; // misura dalla cerniera verso il centro
    const montC = box(b, Hi, dA, legnoV); montC.position.set(x(b / 2), 0, 0);
    const montI = box(b, Hi, dA, legnoV); montI.position.set(x(wa - b / 2), 0, 0);
    const trSu = box(wa - 2 * b, b, dA, legnoH); trSu.position.set(x(wa / 2), Hi / 2 - b / 2, 0);
    const zoc = b * 1.45;
    const trGiu = box(wa - 2 * b, zoc, dA, legnoH); trGiu.position.set(x(wa / 2), -Hi / 2 + zoc / 2, 0);
    const luceH = Hi - b - zoc;
    const ingl = box(wa - 2 * b, .028, .03, legnoH); ingl.position.set(x(wa / 2), -Hi / 2 + zoc + luceH * .64, .012);
    const v = box(wa - 2 * b, luceH, .012, vetro); v.position.set(x(wa / 2), -Hi / 2 + zoc + luceH / 2, 0); v.renderOrder = 2;
    g.add(montC, montI, trSu, trGiu, ingl, v);
    g.position.set(s * Wi / 2, 0, .006);
    return g;
  };
  const antaSx = anta(-1), antaDx = anta(1);
  // maniglia sull'anta destra, lato centrale, verso l'interno (verso la camera)
  const maniglia = new THREE.Group();
  const placca = box(.028, .1, .012, ottone);
  const leva = new THREE.Mesh(new THREE.CylinderGeometry(.009, .009, .11, 16), ottone);
  leva.rotation.z = Math.PI / 2; leva.position.set(.045, .018, .032);
  const collo = new THREE.Mesh(new THREE.CylinderGeometry(.01, .01, .03, 16), ottone);
  collo.rotation.x = Math.PI / 2; collo.position.set(0, .018, .02);
  maniglia.add(placca, collo, leva);
  maniglia.position.set(-(wa - b / 2), .02, dA / 2 + .006);
  antaDx.add(maniglia);

  pezzo(antaSx, [-.7, .1, 1.5], [0, -.9, .12], .36, .76);
  pezzo(antaDx, [.7, -.05, 1.6], [0, .9, -.1], .44, .84);

  // camera inquadrata in base alle proporzioni del riquadro
  let larg = 1, alt = 1;
  const inquadra = () => {
    const r = contenitore.getBoundingClientRect();
    larg = Math.max(1, r.width); alt = Math.max(1, r.height - (mobile ? 22 : 0));
    renderer.setSize(larg, alt, false);
    renderer.domElement.style.height = alt + 'px';
    camera.aspect = larg / alt;
    const t = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    const dH = (MH * .55) / t, dW = (M * .58) / (t * camera.aspect);
    const d = Math.max(dH, dW) + .3;
    camera.position.set(0, .2, d);
    camera.lookAt(0, -.02, 0);
    camera.updateProjectionMatrix();
  };
  inquadra();
  new ResizeObserver(inquadra).observe(contenitore);

  // progresso dallo scroll: parte quando la sezione arriva al 60% dello schermo, finisce a fine corsa del palco
  const progresso = () => {
    const r = sezione.getBoundingClientRect();
    const corsa = Math.max(1, sezione.offsetHeight - innerHeight);
    return clamp01((innerHeight * .32 - r.top) / (innerHeight * .32 + corsa * .9));
  };

  // cambio essenza con dissolvenza di colore
  let daColore = colore.clone(), aColore = colore.clone(), tCol = 1;
  window.carmas3d = {
    essenza(nome) {
      daColore = legnoV.color.clone();
      aColore = new THREE.Color(ESSENZE[nome] || ESSENZE.larice);
      tCol = 0;
      if (ridotto || !attivo) { legnoV.color.copy(aColore); legnoH.color.copy(aColore); tCol = 1; disegna(performance.now()); }
    }
  };

  let p = ridotto ? 1 : progresso();
  let ultimo = performance.now();
  const disegna = ora => {
    const dt = Math.min(.05, (ora - ultimo) / 1000);
    ultimo = ora;
    const obiettivo = ridotto ? 1 : progresso();
    p += (obiettivo - p) * (1 - Math.exp(-dt * 7));
    const t = ora / 1000;

    for (const z of pezzi) {
      const k = morbido(clamp01((p - z.t0) / (z.t1 - z.t0)));
      const q = 1 - k;
      z.obj.position.copy(z.obj.userData.casa).addScaledVector(z.da, q);
      z.obj.rotation.set(
        z.obj.userData.rotCasa.x + z.rot.x * q,
        z.obj.userData.rotCasa.y + z.rot.y * q,
        z.obj.userData.rotCasa.z + z.rot.z * q
      );
    }
    // a montaggio finito le ante si aprono verso la stanza e respirano piano
    const ap = morbido(clamp01((p - .86) / .14));
    const respiro = ridotto ? 0 : Math.sin(t * .7) * .06 * ap;
    antaSx.rotation.y = pezzi[4].obj.userData.rotCasa.y + (pezzi[4].rot.y * (1 - morbido(clamp01((p - .36) / .4)))) - (.55 * ap + respiro);
    antaDx.rotation.y = pezzi[5].obj.userData.rotCasa.y + (pezzi[5].rot.y * (1 - morbido(clamp01((p - .44) / .4)))) + (.42 * ap + respiro);
    maniglia.scale.setScalar(.001 + .999 * morbido(clamp01((p - .78) / .1)));
    vetro.opacity = .2 * morbido(clamp01((p - .5) / .3));

    // la finestra gira piano su se stessa: si muove anche senza toccarla
    const giro = ridotto ? 0 : Math.sin(t * .32) * .16;
    finestra.rotation.y = -.34 + (1 - p) * .42 + giro;
    finestra.rotation.x = .05 - (1 - p) * .08;
    finestra.position.y = ridotto ? 0 : Math.sin(t * .5) * .015;

    if (tCol < 1) {
      tCol = Math.min(1, tCol + dt / .6);
      legnoV.color.copy(daColore).lerp(aColore, morbido(tCol));
      legnoH.color.copy(legnoV.color);
    }
    renderer.render(scena, camera);
  };

  // in pausa fuori schermo e con la scheda nascosta
  let attivo = false, id = 0, visibile = false;
  const ciclo = ora => { disegna(ora); id = requestAnimationFrame(ciclo); };
  const accendi = () => {
    if (attivo || ridotto || !visibile || document.hidden) return;
    attivo = true; ultimo = performance.now(); id = requestAnimationFrame(ciclo);
  };
  const spegni = () => { attivo = false; cancelAnimationFrame(id); };
  new IntersectionObserver(es => {
    visibile = es[0].isIntersecting;
    if (visibile) accendi(); else spegni();
  }, { rootMargin: '120px 0px' }).observe(contenitore);
  document.addEventListener('visibilitychange', () => { if (document.hidden) spegni(); else accendi(); });
  if (ridotto) addEventListener('resize', () => disegna(performance.now()));

  await renderer.compileAsync(scena, camera).catch(() => {});
  ultimo = performance.now();
  disegna(ultimo);
  contenitore.classList.add('pronta');
  accendi();
}
