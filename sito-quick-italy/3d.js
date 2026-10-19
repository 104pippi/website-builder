// Scena "Rollio": una barca al traverso dell'onda, il volano del Quick Gyro che prende giri,
// il rollio che si spegne. Guidata dal tempo (performance.now) e dallo scroll della sezione.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

const COLORI = {
  zenit: 0x03101a,
  orizzonte: 0x15405b,
  profondo: 0x061a28,
  cresta: 0x1f5878,
  ciano: 0x74e4de,
  scafo: 0xf3f5f6,
  teak: 0x9c7a55,
  vetro: 0x0a1722,
};

// Onde: direzione (x, z), ampiezza, lunghezza d'onda, velocità di fase. Viaggiano lungo x: arrivano di lato.
const ONDE = [
  [1.0, 0.16, 0.36, 10.0, 2.6],
  [0.88, -0.48, 0.15, 5.6, 2.1],
  [0.5, 0.86, 0.08, 3.2, 1.7],
].map(([dx, dz, a, l, c]) => {
  const n = Math.hypot(dx, dz);
  const k = (2 * Math.PI) / l;
  return { dx: dx / n, dz: dz / n, a, k, w: k * c };
});
const quota = (x, z, t) => ONDE.reduce((h, o) => h + o.a * Math.sin(o.k * (o.dx * x + o.dz * z) - o.w * t), 0);

const L = 12;     // lunghezza
const B = 3.9;    // baglio
const F = 1.25;   // bordo libero
const D = 0.75;   // pescaggio
const semiBaglio = (s) => Math.max(0.015, (B / 2) * (1 - Math.pow(Math.max(0, (s - 0.42) / 0.58), 2.1)));

// Sezione trasversale dello scafo alla stazione s (0 poppa, 1 prua): 9 punti da murata a murata.
function sezione(s) {
  const hb = semiBaglio(s);
  const coperta = F + 0.42 * s * s;
  const salita = Math.pow(Math.max(0, (s - 0.55) / 0.45), 1.6);
  const chiglia = -D * (1 - salita) + salita * F * 0.6;
  const spigolo = chiglia * 0.22 + 0.06;
  const meta = [
    [hb, coperta],
    [hb * 0.995, coperta * 0.55 + spigolo * 0.45],
    [hb * 0.965, spigolo],
    [hb * 0.6, (spigolo + chiglia) / 2 - 0.06],
    [0, chiglia],
  ];
  const punti = meta.slice();
  for (let j = 3; j >= 0; j--) punti.push([-meta[j][0], meta[j][1]]);
  return { punti, coperta, hb };
}

function geometriaScafo(N = 44) {
  const pos = [];
  const idx = [];
  const anello = 9;
  for (let i = 0; i <= N; i++) {
    const s = i / N;
    const z = -L / 2 + s * L;
    sezione(s).punti.forEach(([x, y]) => pos.push(x, y, z));
  }
  for (let i = 0; i < N; i++) {
    for (let j = 0; j < anello - 1; j++) {
      const a = i * anello + j;
      const b = (i + 1) * anello + j;
      idx.push(a, b, a + 1, b, b + 1, a + 1);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

function geometriaCoperta(N = 44) {
  const pos = [];
  const idx = [];
  for (let i = 0; i <= N; i++) {
    const s = i / N;
    const { hb, coperta } = sezione(s);
    const z = -L / 2 + s * L;
    pos.push(-hb * 0.985, coperta - 0.01, z, hb * 0.985, coperta - 0.01, z);
  }
  for (let i = 0; i < N; i++) {
    const a = i * 2;
    idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

function geometriaSpecchio() {
  const { punti } = sezione(0);
  const forma = new THREE.Shape(punti.map(([x, y]) => new THREE.Vector2(x, y)));
  const g = new THREE.ShapeGeometry(forma);
  g.translate(0, 0, -L / 2);
  return g;
}

function estrudi(profilo, profondita, smusso) {
  const forma = new THREE.Shape(profilo.map(([z, y]) => new THREE.Vector2(z, y)));
  const g = new THREE.ExtrudeGeometry(forma, {
    depth: profondita,
    bevelEnabled: !!smusso,
    bevelThickness: smusso || 0,
    bevelSize: smusso || 0,
    bevelSegments: 3,
    curveSegments: 6,
  });
  g.rotateY(-Math.PI / 2);          // il profilo (z, y) diventa la fiancata, l'estrusione va lungo il baglio
  g.translate(profondita / 2, 0, 0);
  return g;
}

function costole() {
  const gruppo = [];
  for (let s = 0.06; s < 0.97; s += 0.1) {
    const { punti } = sezione(s);
    const z = -L / 2 + s * L;
    const v = punti.map(([x, y]) => new THREE.Vector3(x * 1.002, y, z));
    gruppo.push(new THREE.BufferGeometry().setFromPoints(v.concat([v[0]])));
  }
  return gruppo;
}

export async function avvia({ canvas, sezione: sezioneDom, statoRollio, progresso, ridotto, suFrame }) {
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  } catch (e) {
    return false;
  }
  if (!renderer.getContext()) return false;

  const telefono = matchMedia('(max-width: 900px), (pointer: coarse)').matches;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, telefono ? 1.5 : 2));
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 1.05;

  const scena = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scena.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scena.environmentIntensity = 0.85;
  pmrem.dispose();

  const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 400);

  /* ---------- cielo ---------- */
  const cielo = new THREE.Mesh(
    new THREE.SphereGeometry(220, 32, 16),
    new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      toneMapped: false,
      uniforms: {
        uZenit: { value: new THREE.Color(COLORI.zenit) },
        uOrizzonte: { value: new THREE.Color(COLORI.orizzonte) },
      },
      vertexShader: /* glsl */ `
        varying vec3 vDir;
        void main() {
          vDir = normalize(position);
          vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          gl_Position = p.xyww;
        }`,
      fragmentShader: /* glsl */ `
        uniform vec3 uZenit; uniform vec3 uOrizzonte;
        varying vec3 vDir;
        void main() {
          float h = vDir.y;
          vec3 c = mix(uOrizzonte, uZenit, smoothstep(0.0, 0.42, h));
          c = mix(c, uOrizzonte * 0.55, 1.0 - smoothstep(-0.4, -0.1, h));
          c += uOrizzonte * 0.35 * exp(-abs(h) * 28.0);
          gl_FragColor = vec4(c, 1.0);
          #include <colorspace_fragment>
        }`,
    }),
  );
  cielo.renderOrder = -1;
  scena.add(cielo);

  /* ---------- mare a isolinee ---------- */
  const geoMare = new THREE.PlaneGeometry(150, 150, telefono ? 150 : 200, telefono ? 150 : 200);
  geoMare.rotateX(-Math.PI / 2);
  const uMare = {
    uT: { value: 0 },
    uCam: { value: new THREE.Vector3() },
    uBarcaInv: { value: new THREE.Matrix4() },
    uOnde: { value: ONDE.map((o) => new THREE.Vector4(o.dx, o.dz, o.a, o.k)) },
    uW: { value: ONDE.map((o) => o.w) },
    uProfondo: { value: new THREE.Color(COLORI.profondo) },
    uCresta: { value: new THREE.Color(COLORI.cresta) },
    uFondo: { value: new THREE.Color(COLORI.orizzonte) },
    uLinea: { value: new THREE.Color(COLORI.ciano) },
  };
  const mare = new THREE.Mesh(
    geoMare,
    new THREE.ShaderMaterial({
      uniforms: uMare,
      toneMapped: false,
      vertexShader: /* glsl */ `
        uniform float uT;
        uniform vec4 uOnde[3];
        uniform float uW[3];
        varying float vH;
        varying vec3 vPos;
        varying vec3 vN;
        void main() {
          vec3 p = position;
          float h = 0.0;
          vec2 g = vec2(0.0);
          for (int i = 0; i < 3; i++) {
            vec2 d = uOnde[i].xy;
            float f = uOnde[i].w * dot(d, p.xz) - uW[i] * uT;
            h += uOnde[i].z * sin(f);
            g += uOnde[i].z * uOnde[i].w * cos(f) * d;
          }
          p.y += h;
          vH = h;
          vN = normalize(vec3(-g.x, 1.0, -g.y));
          vec4 wp = modelMatrix * vec4(p, 1.0);
          vPos = wp.xyz;
          gl_Position = projectionMatrix * viewMatrix * wp;
        }`,
      fragmentShader: /* glsl */ `
        uniform vec3 uCam; uniform mat4 uBarcaInv;
        uniform vec3 uProfondo; uniform vec3 uCresta; uniform vec3 uFondo; uniform vec3 uLinea;
        varying float vH; varying vec3 vPos; varying vec3 vN;
        float semiBaglio(float s) {
          float k = max(0.0, (s - 0.42) / 0.58);
          return max(0.015, 1.95 * (1.0 - pow(k, 2.1)));
        }
        void main() {
          // dentro l'impronta dello scafo il mare non si disegna: con lo scafo trasparente non sembra allagato
          vec3 l = (uBarcaInv * vec4(vPos, 1.0)).xyz;
          float s = (l.z + 6.0) / 12.0;
          if (s > 0.0 && s < 1.0 && abs(l.x) < semiBaglio(s) * 0.96) discard;

          vec3 v = normalize(uCam - vPos);
          vec3 n = normalize(vN);
          float fres = pow(1.0 - max(dot(n, v), 0.0), 3.0);
          vec3 c = mix(uProfondo, uCresta, smoothstep(-0.35, 0.45, vH) * 0.6);
          c = mix(c, uFondo * 1.3, fres * 0.7);

          float dist = length(vPos.xz - uCam.xz);
          float q = vH * 7.0;
          float w = fwidth(q);
          float fq = fract(q);
          float linea = 1.0 - smoothstep(0.0, w * 1.3, min(fq, 1.0 - fq));
          c += uLinea * linea * 0.42 * (1.0 - smoothstep(14.0, 55.0, dist));

          vec2 gq = vPos.xz / 4.0;
          vec2 gw = fwidth(gq);
          vec2 gf = abs(fract(gq - 0.5) - 0.5) / gw;
          float griglia = 1.0 - min(min(gf.x, gf.y), 1.0);
          c += uLinea * griglia * 0.07 * (1.0 - smoothstep(10.0, 40.0, dist));

          c = mix(c, uFondo, smoothstep(26.0, 68.0, dist));
          gl_FragColor = vec4(c, 1.0);
          #include <colorspace_fragment>
        }`,
    }),
  );
  scena.add(mare);

  /* ---------- barca ---------- */
  const barca = new THREE.Group();
  scena.add(barca);
  const materialiXray = [];
  const conXray = (m) => { m.transparent = true; materialiXray.push(m); return m; };

  const matScafo = conXray(new THREE.MeshStandardMaterial({ color: COLORI.scafo, roughness: 0.22, metalness: 0.0, side: THREE.DoubleSide }));
  matScafo.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying float vYl;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvYl = position.y;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying float vYl;')
      .replace('#include <color_fragment>', '#include <color_fragment>\ndiffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.006, 0.022, 0.04), step(vYl, 0.2));');
  };
  const geoScafo = geometriaScafo();
  barca.add(new THREE.Mesh(geoScafo, matScafo));
  barca.add(new THREE.Mesh(geometriaSpecchio(), matScafo));

  const matTeak = conXray(new THREE.MeshStandardMaterial({ color: COLORI.teak, roughness: 0.75, side: THREE.DoubleSide }));
  barca.add(new THREE.Mesh(geometriaCoperta(), matTeak));
  const plancetta = new THREE.Mesh(new THREE.BoxGeometry(3.5, 0.08, 0.75), matTeak);
  plancetta.position.set(0, 0.3, -L / 2 - 0.36);
  barca.add(plancetta);

  const matTuga = conXray(new THREE.MeshStandardMaterial({ color: COLORI.scafo, roughness: 0.18 }));
  const matVetro = conXray(new THREE.MeshStandardMaterial({ color: COLORI.vetro, roughness: 0.05, metalness: 0.6 }));
  const W = 3.0;
  const yTuga = F + 0.06;
  const geoTuga = estrudi([[-3.2, 0], [-3.2, 1.05], [-2.9, 1.15], [1.6, 1.15], [3.6, 0.15], [3.6, 0]], W, 0.06);
  const tuga = new THREE.Mesh(geoTuga, matTuga);
  tuga.position.y = yTuga;
  barca.add(tuga);
  const vetri = new THREE.Mesh(estrudi([[-3.0, 0.5], [-3.0, 0.86], [1.7, 0.86], [2.6, 0.5]], W + 0.16), matVetro);
  vetri.position.y = yTuga;
  barca.add(vetri);
  const portaPoppa = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.82, 0.04), matVetro);
  portaPoppa.position.set(0, yTuga + 0.6, -3.29);
  barca.add(portaPoppa);
  const hardtop = new THREE.Mesh(new RoundedBoxGeometry(3.3, 0.08, 5.4, 2, 0.035), matTuga);
  hardtop.position.set(0, yTuga + 1.27, -1.95);
  barca.add(hardtop);
  [-1.45, 1.45].forEach((x) => {
    const montante = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 1.25, 8), matTuga);
    montante.position.set(x, yTuga + 0.62, -4.4);
    barca.add(montante);
  });

  /* linee da progetto: spigoli e costole, visibili solo in trasparenza */
  const matLinee = new THREE.LineBasicMaterial({ color: COLORI.ciano, transparent: true, opacity: 0, depthWrite: false });
  const linee = new THREE.Group();
  linee.add(new THREE.LineSegments(new THREE.EdgesGeometry(geoScafo, 16), matLinee));
  const spigoliTuga = new THREE.LineSegments(new THREE.EdgesGeometry(geoTuga, 30), matLinee);
  spigoliTuga.position.y = yTuga;
  linee.add(spigoliTuga);
  costole().forEach((g) => linee.add(new THREE.Line(g, matLinee)));
  barca.add(linee);

  /* ---------- Quick Gyro ---------- */
  const gyro = new THREE.Group();
  gyro.position.set(0, -0.05, -0.8);
  barca.add(gyro);
  const matBianco = new THREE.MeshStandardMaterial({ color: 0xf6f7f8, roughness: 0.3, transparent: true });
  const matScuro = new THREE.MeshStandardMaterial({ color: 0x1a2630, roughness: 0.5, metalness: 0.3 });
  const matAcciaio = new THREE.MeshStandardMaterial({ color: 0xc8d0d6, roughness: 0.28, metalness: 1.0 });
  const basamento = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.07, 1.15), matScuro);
  basamento.position.y = -0.55;
  gyro.add(basamento);
  const carter = new THREE.Mesh(new RoundedBoxGeometry(1.0, 0.92, 1.0, 4, 0.08), matBianco);
  gyro.add(carter);
  const matSpigoliGyro = new THREE.LineBasicMaterial({ color: COLORI.ciano, transparent: true, opacity: 0 });
  gyro.add(new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(1.0, 0.92, 1.0)), matSpigoliGyro));

  const culla = new THREE.Group();         // precessione: ruota attorno all'asse verticale
  gyro.add(culla);
  [-0.17, 0.17].forEach((x) => {
    const staffa = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.7, 0.18), matScuro);
    staffa.position.x = x * 1.45;
    culla.add(staffa);
  });
  const volano = new THREE.Group();         // il volano gira su asse orizzontale (trasversale)
  culla.add(volano);
  const disco = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.2, 56), matAcciaio);
  disco.rotation.z = Math.PI / 2;
  volano.add(disco);
  const matSegni = new THREE.MeshBasicMaterial({ color: 0x0b1a26, transparent: true });
  for (let k = 0; k < 3; k++) {
    const segno = new THREE.Mesh(new THREE.BoxGeometry(0.212, 0.05, 0.3), matSegni);
    segno.rotation.x = (k * Math.PI) / 3;
    volano.add(segno);
  }
  const matScia = new THREE.MeshBasicMaterial({ color: COLORI.ciano, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending });
  const anello = new THREE.Mesh(new THREE.TorusGeometry(0.345, 0.02, 8, 72), matScia);
  anello.rotation.y = Math.PI / 2;
  [-0.1, 0.1].forEach((x) => { const a = anello.clone(); a.position.x = x; volano.add(a); });
  const luceGyro = new THREE.PointLight(COLORI.ciano, 0, 3.2, 1.6);
  gyro.add(luceGyro);

  const luceSole = new THREE.DirectionalLight(0xdfeaf2, 1.4);
  luceSole.position.set(-6, 10, -8);
  scena.add(luceSole);
  scena.add(new THREE.HemisphereLight(0x5b88a8, 0x04131f, 0.6));

  /* ---------- camera lungo lo scroll ---------- */
  const CHIAVI = [
    { p: 0.0, pos: [8.0, 4.6, -13.5], mira: [0, 1.0, 0.5] },
    { p: 0.2, pos: [6.6, 4.1, -11.2], mira: [0, 0.9, 0.2] },
    { p: 0.36, pos: [3.9, 3.7, -6.4], mira: [0, 0.35, -0.6] },
    { p: 0.6, pos: [-4.2, 3.4, -6.9], mira: [0, 0.4, -0.5] },
    { p: 0.82, pos: [-9.0, 4.3, -13.0], mira: [0, 1.0, 0.8] },
    { p: 1.0, pos: [-11.0, 5.0, -15.5], mira: [0, 1.1, 1.2] },
  ];
  const vPos = new THREE.Vector3();
  const vMira = new THREE.Vector3();
  const a3 = new THREE.Vector3();
  const b3 = new THREE.Vector3();
  const morb = (t) => t * t * (3 - 2 * t);
  let moltiplica = 1;
  const posaCamera = (p, t) => {
    let i = 0;
    while (i < CHIAVI.length - 2 && p > CHIAVI[i + 1].p) i++;
    const A = CHIAVI[i];
    const Bk = CHIAVI[i + 1];
    const u = morb(Math.min(1, Math.max(0, (p - A.p) / (Bk.p - A.p))));
    vMira.copy(a3.fromArray(A.mira)).lerp(b3.fromArray(Bk.mira), u);
    vPos.copy(a3.fromArray(A.pos)).lerp(b3.fromArray(Bk.pos), u);
    vPos.sub(vMira).multiplyScalar(moltiplica).add(vMira);
    vPos.y += Math.sin(t * 0.5) * 0.12;
    vPos.x += Math.sin(t * 0.31) * 0.15;
    camera.position.copy(vPos);
    camera.lookAt(vMira);
  };

  const ridimensiona = () => {
    const w = canvas.clientWidth || canvas.parentElement.clientWidth;
    const h = canvas.clientHeight || canvas.parentElement.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    const asp = w / h;
    camera.aspect = asp;
    camera.fov = asp < 1 ? 44 : 34;
    moltiplica = asp < 1 ? 1 + Math.min(0.85, (1 - asp) * 1.55) : 1;
    camera.updateProjectionMatrix();
  };
  ridimensiona();
  new ResizeObserver(ridimensiona).observe(canvas.parentElement);

  /* ---------- un fotogramma ---------- */
  const OMEGA = (2 * Math.PI) / 3.4;
  let ampiezza = statoRollio(progresso()).ampiezza;
  let volanoGiri = 0;
  let angoloVolano = 0;
  let pS = progresso();
  const fotogramma = (t, dt) => {
    const pVero = progresso();
    pS += (pVero - pS) * Math.min(1, dt * 5);
    const st = statoRollio(pS);
    ampiezza += (st.ampiezza - ampiezza) * Math.min(1, dt * 2.5);
    volanoGiri += (st.volano - volanoGiri) * Math.min(1, dt * 3);

    const rollio = ampiezza * (0.82 * Math.sin(OMEGA * t) + 0.18 * Math.sin(1.63 * OMEGA * t + 1.1));
    barca.rotation.z = THREE.MathUtils.degToRad(rollio);
    barca.rotation.x = THREE.MathUtils.degToRad(0.9 * Math.sin(OMEGA * 0.7 * t + 0.6));
    barca.position.y = quota(0, 0, t) * 0.75 - 0.05;
    barca.updateMatrixWorld();

    // trasparenza da progetto
    const x = st.xray;
    materialiXray.forEach((m) => {
      m.opacity = 1 - 0.86 * x;
      m.depthWrite = x < 0.4;
    });
    matLinee.opacity = x * 0.75;
    matBianco.opacity = 1 - 0.8 * x;
    matBianco.depthWrite = x < 0.4;
    matSpigoliGyro.opacity = x * 0.9;

    // il volano prende giri e la culla precessa contro l'onda
    angoloVolano += dt * (1.5 + 30 * volanoGiri) * volanoGiri;
    volano.rotation.x = angoloVolano;
    matSegni.opacity = 1 - morb(Math.min(1, Math.max(0, (volanoGiri - 0.45) / 0.45)));
    matScia.opacity = volanoGiri * 0.9;
    luceGyro.intensity = volanoGiri * 2.2 * (0.4 + 0.6 * x);
    culla.rotation.y = 0.55 * volanoGiri * st.calma * Math.cos(OMEGA * t);

    posaCamera(pS, t);
    uMare.uT.value = t;
    uMare.uCam.value.copy(camera.position);
    uMare.uBarcaInv.value.copy(barca.matrixWorld).invert();
    renderer.render(scena, camera);
    suFrame(rollio);
  };

  /* ---------- ciclo: solo quando la sezione è in vista e la scheda è visibile ---------- */
  let inVista = true;
  let attivo = false;
  let t = 0;
  let precedente = 0;
  const ciclo = () => {
    if (!attivo) return;
    const ora = performance.now();
    const dt = Math.min(0.05, Math.max(0, (ora - precedente) / 1000));
    precedente = ora;
    t += dt;
    fotogramma(t, dt);
    requestAnimationFrame(ciclo);
  };
  const aggiornaCiclo = () => {
    const deve = inVista && !document.hidden && !ridotto;
    if (deve && !attivo) {
      attivo = true;
      precedente = performance.now();
      requestAnimationFrame(ciclo);
    } else if (!deve) {
      attivo = false;
    }
  };
  new IntersectionObserver((v) => { inVista = v[0].isIntersecting; aggiornaCiclo(); }).observe(sezioneDom);
  document.addEventListener('visibilitychange', aggiornaCiclo);

  if (ridotto) {
    // movimento ridotto: la scena si ridisegna solo quando si scorre, il tempo resta fermo
    const fermo = () => fotogramma(1.2, 1);
    fermo();
    window.addEventListener('scroll', () => requestAnimationFrame(fermo), { passive: true });
  } else {
    fotogramma(0, 0.016);
    aggiornaCiclo();
  }
  return true;
}
