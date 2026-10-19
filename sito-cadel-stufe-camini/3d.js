// Scena "Dalla stufa al tetto": la sezione di una casa disegnata a linee, la stufa e la canna fumaria
// che si monta pezzo per pezzo mentre si scorrono i 5 passi (stadio 0..5 letto da script.js).
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const L = 3, P = 2.2, H_PARETE = 2.8, H_COLMO = 4.6;     // casa: mezza larghezza, mezza profondità, altezze
const FX = 0.75, FZ = -0.45;                               // posizione di stufa e canna fumaria
const PENDENZA = Math.atan((H_COLMO - H_PARETE) / L);
const tetto = (x) => H_COLMO - (Math.abs(x) / L) * (H_COLMO - H_PARETE);
const R1 = 0.12, R2 = 0.155;                               // tubo interno smaltato, tubo inox doppia parete

const lim = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const liscio = (v) => { v = lim(v); return v * v * (3 - 2 * v); };
const mix = (a, b, k) => a + (b - a) * k;

function casuale(seme) { let s = seme >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }

function texFuoco() {
  const c = document.createElement('canvas'); c.width = 256; c.height = 192;
  const g = c.getContext('2d'); const rnd = casuale(7);
  let gr = g.createLinearGradient(0, 0, 0, 192); gr.addColorStop(0, '#160a05'); gr.addColorStop(1, '#3b1507');
  g.fillStyle = gr; g.fillRect(0, 0, 256, 192);
  gr = g.createRadialGradient(128, 168, 8, 128, 150, 160);
  gr.addColorStop(0, 'rgba(255,200,110,1)'); gr.addColorStop(.38, 'rgba(255,120,35,.8)'); gr.addColorStop(1, 'rgba(110,28,0,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 256, 192);
  g.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 16; i++) {
    const x = 34 + rnd() * 188, h = 56 + rnd() * 96, w = 16 + rnd() * 26, y = 176;
    const f = g.createLinearGradient(0, y, 0, y - h);
    f.addColorStop(0, 'rgba(255,245,200,.85)'); f.addColorStop(.35, 'rgba(255,170,60,.7)'); f.addColorStop(1, 'rgba(255,70,10,0)');
    g.fillStyle = f; g.beginPath(); g.moveTo(x - w, y);
    g.quadraticCurveTo(x - w * .9, y - h * .55, x + (rnd() - .5) * w, y - h);
    g.quadraticCurveTo(x + w * .9, y - h * .5, x + w, y); g.closePath(); g.fill();
  }
  g.globalCompositeOperation = 'source-over';
  g.fillStyle = '#1c0f09';
  [[70, 170, 92, 15, -.18], [150, 172, 100, 16, .2], [112, 160, 70, 13, .05]].forEach(([x, y, w, h, a]) => {
    g.save(); g.translate(x, y); g.rotate(a); g.fillRect(-w / 2, -h / 2, w, h); g.restore();
  });
  for (let i = 0; i < 70; i++) { g.fillStyle = `rgba(255,${120 + rnd() * 100 | 0},40,${.4 + rnd() * .6})`; g.fillRect(20 + rnd() * 216, 176 + rnd() * 14, 2, 2); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

function texTarga() {
  const c = document.createElement('canvas'); c.width = 512; c.height = 256;
  const g = c.getContext('2d');
  const gr = g.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, '#f4f6f7'); gr.addColorStop(.55, '#d6dbde'); gr.addColorStop(1, '#b9c1c6');
  g.fillStyle = gr; g.fillRect(0, 0, 512, 256);
  for (let x = 0; x < 512; x += 3) { g.fillStyle = `rgba(255,255,255,${.05 + (x * 7 % 11) / 90})`; g.fillRect(x, 0, 1, 256); }
  g.strokeStyle = 'rgba(40,46,50,.55)'; g.lineWidth = 6; g.strokeRect(14, 14, 484, 228);
  [[40, 40], [472, 40], [40, 216], [472, 216]].forEach(([x, y]) => {
    g.fillStyle = '#7d878d'; g.beginPath(); g.arc(x, y, 9, 0, 7); g.fill();
    g.fillStyle = '#eef1f2'; g.beginPath(); g.arc(x - 2, y - 2, 4, 0, 7); g.fill();
  });
  g.fillStyle = '#23282b'; g.font = '800 64px Archivo, Arial, sans-serif'; g.textAlign = 'center'; g.fillText('TARGA FUMI', 256, 112);
  g.fillStyle = 'rgba(35,40,43,.45)';
  [150, 176, 202].forEach((y, i) => g.fillRect(84, y, i === 2 ? 220 : 344, 9));
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}

function texMorbida(colore, forte = 1) {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d'); const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  gr.addColorStop(0, colore.replace('A', String(forte))); gr.addColorStop(1, colore.replace('A', '0'));
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

export function avvia(contenitore, leggiStadio) {
  const ridotto = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const mobile = matchMedia('(max-width: 860px)').matches;

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
  } catch (e) { return false; }
  if (!renderer.getContext()) return false;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, mobile ? 1.5 : 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.08;
  renderer.setClearColor(0x000000, 0);
  contenitore.appendChild(renderer.domElement);

  const scena = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scena.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  pmrem.dispose();
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);

  const luceFredda = new THREE.DirectionalLight(0xdfe8ff, 0.7); luceFredda.position.set(-4, 8, 6); scena.add(luceFredda);
  const luceFuoco = new THREE.PointLight(0xff7a2a, 0, 7, 1.6); luceFuoco.position.set(FX, 0.75, FZ + 0.75); scena.add(luceFuoco);

  // ---- la casa a linee (sezione tecnica) ----
  const pt = [];
  const linea = (a, b) => pt.push(new THREE.Vector3(...a), new THREE.Vector3(...b));
  const rett = (y) => { linea([-L, y, -P], [L, y, -P]); linea([L, y, -P], [L, y, P]); linea([L, y, P], [-L, y, P]); linea([-L, y, P], [-L, y, -P]); };
  rett(0); rett(H_PARETE);
  [[-L, -P], [L, -P], [L, P], [-L, P]].forEach(([x, z]) => linea([x, 0, z], [x, H_PARETE, z]));
  [-P, P].forEach((z) => { linea([-L, H_PARETE, z], [0, H_COLMO, z]); linea([L, H_PARETE, z], [0, H_COLMO, z]); });
  linea([0, H_COLMO, -P], [0, H_COLMO, P]);
  const geoCasa = new THREE.BufferGeometry().setFromPoints(pt);
  const casa = new THREE.LineSegments(geoCasa, new THREE.LineBasicMaterial({ color: 0xaab3b9, transparent: true, opacity: 0.42 }));
  scena.add(casa);

  // pavimento: alone scuro sotto la stufa e bagliore caldo quando il fuoco è acceso
  const ombra = new THREE.Mesh(new THREE.CircleGeometry(1.1, 48), new THREE.MeshBasicMaterial({ map: texMorbida('rgba(0,0,0,A)', .55), transparent: true, depthWrite: false }));
  ombra.rotation.x = -Math.PI / 2; ombra.position.set(FX, 0.002, FZ); scena.add(ombra);
  const bagliore = new THREE.Mesh(new THREE.CircleGeometry(1.8, 48), new THREE.MeshBasicMaterial({ map: texMorbida('rgba(255,120,40,A)'), transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }));
  bagliore.rotation.x = -Math.PI / 2; bagliore.position.set(FX, 0.004, FZ + 0.9); scena.add(bagliore);

  // tetto: una porzione di falda in sezione, con i coppi veri e il foro per il faldale
  const coppi = new THREE.Group();
  const xc = FX + 0.1, cx = (FX - xc) / Math.cos(PENDENZA);   // asse del comignolo lungo la falda
  coppi.position.set(xc, tetto(xc), FZ);
  coppi.rotation.z = -PENDENZA;
  const geoFalda = new THREE.BoxGeometry(2.08, .07, 1.84);
  const falda = new THREE.Mesh(geoFalda, new THREE.MeshStandardMaterial({ color: 0x4a2418, roughness: .9, metalness: 0 }));
  falda.position.set(.08, -.047, 0); coppi.add(falda);
  const bordo = new THREE.LineSegments(new THREE.EdgesGeometry(geoFalda), casa.material);
  bordo.position.copy(falda.position); coppi.add(bordo);
  const geoCoppo = new THREE.CylinderGeometry(.08, .088, .48, 14, 1, true, 0, Math.PI).rotateZ(Math.PI / 2);
  const posti = [];
  for (let i = 0; i < 5; i++) for (let j = 0; j < 10; j++) {
    const x = -.72 + i * .4, z = -.81 + j * .18;
    if (Math.hypot(Math.max(0, Math.abs(x - cx) - .24), Math.max(0, Math.abs(z) - .085)) < .4) continue;
    posti.push([x, z]);
  }
  const fila = new THREE.InstancedMesh(geoCoppo, new THREE.MeshStandardMaterial({ roughness: .68, metalness: 0, side: THREE.DoubleSide }), posti.length);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), .07), uno = new THREE.Vector3(1, 1, 1);
  const tinta = new THREE.Color(), rndCoppi = casuale(3);
  posti.forEach(([x, z], k) => {
    fila.setMatrixAt(k, m4.compose(new THREE.Vector3(x, -.012, z), q, uno));
    fila.setColorAt(k, tinta.setHSL(.035 + rndCoppi() * .025, .62, .3 + rndCoppi() * .08, THREE.SRGBColorSpace));
  });
  coppi.add(fila); scena.add(coppi);

  // ---- materiali ----
  const ghisa = new THREE.MeshStandardMaterial({ color: 0x2c3135, roughness: .42, metalness: .6 });
  const smalto = new THREE.MeshStandardMaterial({ color: 0x1e2225, roughness: .32, metalness: .55 });
  const inox = new THREE.MeshStandardMaterial({ color: 0xe4e8eb, roughness: .2, metalness: 1 });
  const inoxScuro = new THREE.MeshStandardMaterial({ color: 0x3a3f43, roughness: .5, metalness: .7, side: THREE.DoubleSide });

  // ---- la stufa ----
  const stufa = new THREE.Group(); stufa.position.set(FX, 0, FZ); scena.add(stufa);
  const box = (w, h, d, mat, x, y, z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); stufa.add(m); return m; };
  box(.82, .08, .62, ghisa, 0, .04, 0);
  box(.9, 1.12, .7, ghisa, 0, .64, 0);
  box(.98, .05, .78, smalto, 0, 1.225, 0);
  box(.7, .6, .02, smalto, 0, .74, .352);
  const fuocoTex = texFuoco();
  const vetro = new THREE.Mesh(new THREE.PlaneGeometry(.6, .5), new THREE.MeshBasicMaterial({ map: fuocoTex, toneMapped: false }));
  vetro.position.set(0, .74, .364); stufa.add(vetro);
  const maniglia = new THREE.Mesh(new THREE.CylinderGeometry(.018, .018, .26, 12), inox); maniglia.position.set(.39, .74, .39); stufa.add(maniglia);
  const uscita = new THREE.Mesh(new THREE.CylinderGeometry(R1 + .02, R1 + .03, .06, 32), smalto); uscita.position.set(0, 1.28, 0); stufa.add(uscita);

  // ---- la canna fumaria: 8 pezzi che cadono al loro posto ----
  const pezzi = [];
  const aggiungi = (oggetto, yFinale) => { oggetto.userData.y = yFinale; oggetto.visible = false; scena.add(oggetto); pezzi.push(oggetto); };
  const tubo = (y0, y1, r, mat, bicchiere) => {
    const g = new THREE.Group();
    const corpo = new THREE.Mesh(new THREE.CylinderGeometry(r, r, y1 - y0, 40, 1), mat); corpo.position.y = (y1 - y0) / 2; g.add(corpo);
    const giunto = new THREE.Mesh(new THREE.CylinderGeometry(r + bicchiere, r + bicchiere, .06, 40), mat); giunto.position.y = y1 - y0 - .03; g.add(giunto);
    g.position.set(FX, y0, FZ); return [g, y0];
  };
  aggiungi(...tubo(1.31, 2.05, R1, smalto, .012));
  aggiungi(...tubo(2.05, 2.8, R1, smalto, .012));
  const rosone = new THREE.Mesh(new THREE.CylinderGeometry(.32, .32, .03, 48), inox); rosone.position.set(FX, H_PARETE, FZ); aggiungi(rosone, H_PARETE);
  aggiungi(...tubo(2.8, 3.62, R2, inox, .014));
  aggiungi(...tubo(3.62, 4.44, R2, inox, .014));
  const yTetto = tetto(FX);
  const faldale = new THREE.Group(); faldale.position.set(FX, yTetto, FZ);
  const lastra = new THREE.Mesh(new THREE.CylinderGeometry(.46, .46, .02, 48), inox); lastra.rotation.z = -PENDENZA; faldale.add(lastra);
  const collare = new THREE.Mesh(new THREE.CylinderGeometry(R2 + .03, R2 + .09, .2, 40), inox); collare.position.y = .08; faldale.add(collare);
  aggiungi(faldale, yTetto);
  aggiungi(...tubo(4.44, 5.25, R2, inox, .014));
  const comignolo = new THREE.Group(); comignolo.position.set(FX, 5.25, FZ);
  const raccordo = new THREE.Mesh(new THREE.CylinderGeometry(.23, R2, .08, 40), inox); raccordo.position.y = .04; comignolo.add(raccordo);
  const barile = new THREE.Mesh(new THREE.CylinderGeometry(.23, .23, .3, 40, 1, true), inox); barile.position.y = .23; comignolo.add(barile);
  const interno = new THREE.Mesh(new THREE.CylinderGeometry(.22, .22, .29, 40, 1, true), inoxScuro); interno.position.y = .23; comignolo.add(interno);
  const cappello = new THREE.Mesh(new THREE.ConeGeometry(.3, .13, 40), inox); cappello.position.y = .5; comignolo.add(cappello);
  aggiungi(comignolo, 5.25);
  const Y_CIMA = 5.62;

  // ---- il sopralluogo: asse dei fumi tratteggiato e anelli di misura ----
  const asse = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, Y_CIMA - 1.31, 0)]),
    new THREE.LineDashedMaterial({ color: 0xffffff, dashSize: .1, gapSize: .07, transparent: true, opacity: 0 })
  );
  asse.computeLineDistances(); asse.position.set(FX, 1.31, FZ); scena.add(asse);
  const anelli = [1.31, 2.05, 2.8, 3.62, 4.44, 5.25, Y_CIMA].map((y, i) => {
    const r = (i < 2 ? R1 : R2) + .06;
    const pts = []; for (let k = 0; k <= 64; k++) { const a = k / 64 * Math.PI * 2; pts.push(new THREE.Vector3(Math.cos(a) * r, 0, Math.sin(a) * r)); }
    const anello = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0 }));
    anello.position.set(FX, y, FZ); scena.add(anello); return anello;
  });

  // ---- la targa fumi, curva sul tubo ----
  const angTarga = 0.35;
  const targaMat = new THREE.MeshStandardMaterial({ map: texTarga(), roughness: .35, metalness: .55, transparent: true, opacity: 0, side: THREE.FrontSide });
  const targa = new THREE.Mesh(new THREE.CylinderGeometry(R1 + .006, R1 + .006, .13, 32, 1, true, angTarga - .95, 1.9), targaMat);
  targa.position.set(FX, 1.72, FZ); scena.add(targa);

  // ---- il fumo del collaudo ----
  const N_FUMO = 34;
  const fumoGeo = new THREE.BufferGeometry();
  const fPos = new Float32Array(N_FUMO * 3), fAlpha = new Float32Array(N_FUMO), fTaglia = new Float32Array(N_FUMO);
  fumoGeo.setAttribute('position', new THREE.BufferAttribute(fPos, 3));
  fumoGeo.setAttribute('aAlpha', new THREE.BufferAttribute(fAlpha, 1));
  fumoGeo.setAttribute('aTaglia', new THREE.BufferAttribute(fTaglia, 1));
  const fumoMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false,
    uniforms: { uScala: { value: 300 } },
    vertexShader: `attribute float aAlpha; attribute float aTaglia; uniform float uScala; varying float vAlpha;
      void main(){ vec4 mv = modelViewMatrix * vec4(position,1.); vAlpha = aAlpha; gl_PointSize = aTaglia * uScala / -mv.z; gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `varying float vAlpha;
      void main(){ float d = length(gl_PointCoord - .5); float a = smoothstep(.5, .0, d) * vAlpha; gl_FragColor = vec4(vec3(.86,.89,.91), a); }`,
  });
  const fumo = new THREE.Points(fumoGeo, fumoMat); fumo.frustumCulled = false; scena.add(fumo);
  const semi = Array.from({ length: N_FUMO }, (_, i) => ({ fase: i / N_FUMO, dx: (Math.sin(i * 12.9898) * 43758.5453 % 1), dz: (Math.sin(i * 78.233) * 12345.678 % 1) }));

  // ---- dimensioni, camera, ciclo ----
  let larg = 1, alt = 1;
  const misura = () => {
    const r = contenitore.getBoundingClientRect();
    larg = Math.max(1, r.width); alt = Math.max(1, r.height);
    renderer.setSize(larg, alt, false);
    camera.aspect = larg / alt; camera.updateProjectionMatrix();
    fumoMat.uniforms.uScala.value = alt * renderer.getPixelRatio() * .9;
  };
  misura();
  new ResizeObserver(misura).observe(contenitore);

  let puntatore = 0;
  if (matchMedia('(hover: hover) and (pointer: fine)').matches) {
    addEventListener('pointermove', (e) => { puntatore = e.clientX / innerWidth - .5; }, { passive: true });
  }

  const tanMezzo = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
  const distanza = (h, w) => Math.max((h / 2) / tanMezzo, (w / 2) / (tanMezzo * camera.aspect));
  const bersaglio = new THREE.Vector3();
  let sVista = Math.max(0, leggiStadio()), ultimo = performance.now(), puntVista = 0;

  function disegna(now, s, t) {
    // 1. sopralluogo: si traccia l'asse dei fumi
    const traccia = liscio((s - .05) / .8);
    const svanisce = 1 - liscio((s - 2.05) / .9);
    asse.scale.y = Math.max(.001, traccia);
    asse.material.opacity = .75 * Math.min(1, traccia * 3) * svanisce;
    // 2. preventivo: compaiono gli anelli dei pezzi, uno alla volta
    anelli.forEach((a, i) => { a.material.opacity = .55 * liscio((s - 1 - i * .11) / .2) * svanisce; });
    // 3. installazione: i pezzi cadono dall'alto
    pezzi.forEach((p, i) => {
      const k = liscio((s - 2 - i * .1) / .24);
      p.visible = k > .001;
      p.position.y = p.userData.y + (1 - k) * 2.4;
      p.rotation.y = (1 - k) * 1.4;
    });
    // 4. collaudo: si accende il fuoco e il comignolo fuma
    const fuoco = liscio((s - 3.05) / .45);
    const tremolio = ridotto ? 1 : .82 + .1 * Math.sin(t * 13.1) + .08 * Math.sin(t * 23.7 + 1.3);
    vetro.material.color.setScalar(mix(.13, 1.15 * tremolio, fuoco));
    fuocoTex.offset.y = ridotto ? 0 : Math.sin(t * 3.1) * .015;
    luceFuoco.intensity = fuoco * 5.5 * tremolio;
    bagliore.material.opacity = fuoco * .5 * tremolio;
    const fumoOn = liscio((s - 3.25) / .4) * (1 - liscio((s - 4.6) / .4) * .4);
    for (let i = 0; i < N_FUMO; i++) {
      const sm = semi[i]; const v = (t * .16 + sm.fase) % 1;
      fPos[i * 3] = FX + sm.dx * .22 * v + Math.sin(t * .9 + i) * .05 * v + v * .35;
      fPos[i * 3 + 1] = Y_CIMA - .05 + v * 1.5;
      fPos[i * 3 + 2] = FZ + sm.dz * .22 * v;
      fAlpha[i] = fumoOn * Math.sin(Math.PI * v) * .32;
      fTaglia[i] = .16 + v * .5;
    }
    fumoGeo.attributes.position.needsUpdate = true; fumoGeo.attributes.aAlpha.needsUpdate = true; fumoGeo.attributes.aTaglia.needsUpdate = true;
    // 5. certificazione: la targa fumi sul tubo e la camera si avvicina
    const cert = liscio((s - 4.1) / .45);
    targaMat.opacity = cert;
    targa.position.y = 1.72 + (1 - cert) * .12;
    const vicino = liscio((s - 4.15) / .75);

    // camera
    const ampio = { y: 2.75, h: 6.9, w: 7.9 };
    const stretto = { y: 1.55, h: 2.5, w: 2.6 };
    const yB = mix(ampio.y, stretto.y, vicino);
    const d = mix(distanza(ampio.h, ampio.w), distanza(stretto.h, stretto.w), vicino);
    const az = -.62 + Math.min(s, 4) * .2 + (ridotto ? 0 : Math.sin(t * .13) * .16) + puntVista * .35 + vicino * .35;
    const el = mix(.2, .1, vicino);
    bersaglio.set(mix(.25, FX, vicino), yB, mix(0, FZ, vicino));
    camera.position.set(bersaglio.x + Math.sin(az) * Math.cos(el) * d, bersaglio.y + Math.sin(el) * d, bersaglio.z + Math.cos(az) * Math.cos(el) * d);
    camera.lookAt(bersaglio);
    renderer.render(scena, camera);
  }

  let attivo = false, idRaf = 0, primo = true;
  function ciclo(now) {
    idRaf = requestAnimationFrame(ciclo);
    now = performance.now();
    const dt = Math.min(.05, (now - ultimo) / 1000); ultimo = now;
    const sTarget = lim(leggiStadio(), 0, 5);
    sVista += (sTarget - sVista) * (1 - Math.exp(-dt * 5));
    puntVista += (puntatore - puntVista) * (1 - Math.exp(-dt * 3));
    disegna(now, sVista, now / 1000);
    if (primo) { primo = false; contenitore.classList.add('is-3d'); }
  }
  const parti = () => { if (!attivo && !document.hidden) { attivo = true; ultimo = performance.now(); idRaf = requestAnimationFrame(ciclo); } };
  const ferma = () => { attivo = false; cancelAnimationFrame(idRaf); };

  if (ridotto) {
    // movimento ridotto: un solo fotogramma con la canna fumaria montata e il fuoco acceso
    disegna(performance.now(), 3.6, 0);
    contenitore.classList.add('is-3d');
    new ResizeObserver(() => disegna(performance.now(), 3.6, 0)).observe(contenitore);
    return true;
  }

  let inVista = false;
  new IntersectionObserver(([e]) => { inVista = e.isIntersecting; inVista ? parti() : ferma(); }, { rootMargin: '100px 0px' }).observe(contenitore);
  document.addEventListener('visibilitychange', () => { document.hidden ? ferma() : (inVista && parti()); });
  return true;
}
