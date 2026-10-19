// Scena "Quick Gyro": un X13 sulla lamiera della sala macchine, che rolla con la barca. Scorrendo il carter
// si apre, il volano prende giri, la culla precessa e il rollio si spegne, poi il carter si richiude.
// Guidata dal tempo (performance.now) e dallo scroll della sezione.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

const morb = (t) => t * t * (3 - 2 * t);
const limita = (v, a, b) => Math.min(b, Math.max(a, v));
const rad = THREE.MathUtils.degToRad;

function tela(w, h, disegna, srgb = true) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  disegna(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

// Lamiera mandorlata, come il pavimento della sala macchine nella foto dell'X13: rilievi a ±45°, 2×2 per piastrella
function normaliMandorlata(n = 256) {
  const h = new Float32Array(n * n);
  const cella = n / 2;
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      const ci = Math.floor(x / cella);
      const cj = Math.floor(y / cella);
      let alto = 0;
      for (let oj = -1; oj <= 1; oj++) {
        for (let oi = -1; oi <= 1; oi++) {
          const i = ci + oi;
          const j = cj + oj;
          const s = (i + j) & 1 ? 1 : -1;
          const dx = (x + 0.5 - (i + 0.5) * cella) / cella;
          const dy = (y + 0.5 - (j + 0.5) * cella) / cella;
          const u = (dx + s * dy) * Math.SQRT1_2;
          const v = (dy - s * dx) * Math.SQRT1_2;
          const d = (u / 0.4) ** 2 + (v / 0.09) ** 2;
          if (d < 1) alto = Math.max(alto, Math.sqrt(1 - d));
        }
      }
      h[y * n + x] = alto;
    }
  }
  const t = tela(n, n, (ctx) => {
    const img = ctx.createImageData(n, n);
    for (let y = 0; y < n; y++) {
      for (let x = 0; x < n; x++) {
        const hx = h[y * n + ((x + 1) % n)] - h[y * n + ((x - 1 + n) % n)];
        const hy = h[((y + 1) % n) * n + x] - h[((y - 1 + n) % n) * n + x];
        const nx = -hx * 3.2;
        const ny = hy * 3.2;
        const l = Math.hypot(nx, ny, 1);
        const o = (y * n + x) * 4;
        img.data[o] = (nx / l * 0.5 + 0.5) * 255;
        img.data[o + 1] = (ny / l * 0.5 + 0.5) * 255;
        img.data[o + 2] = (1 / l * 0.5 + 0.5) * 255;
        img.data[o + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
  }, false);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

export async function avvia({ canvas, sezione: sezioneDom, statoRollio, progresso, ridotto, suFrame }) {
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  } catch (e) {
    return false;
  }
  if (!renderer.getContext()) return false;
  try { await document.fonts.load('800 80px Archivo'); } catch (e) { /* resta il font di sistema */ }

  const telefono = matchMedia('(max-width: 900px), (pointer: coarse)').matches;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, telefono ? 1.5 : 2));
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 1.0;

  const scena = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scena.environment = pmrem.fromScene(new RoomEnvironment(), 0.03).texture;
  scena.environmentIntensity = 0.8;
  pmrem.dispose();

  const camera = new THREE.PerspectiveCamera(32, 1, 0.05, 60);

  const luceChiave = new THREE.DirectionalLight(0xffffff, 1.7);
  luceChiave.position.set(-2.5, 4, 3);
  scena.add(luceChiave);
  const luceTaglio = new THREE.DirectionalLight(0x9fdcff, 1.3);
  luceTaglio.position.set(2.2, 2.4, -3.5);
  scena.add(luceTaglio);
  scena.add(new THREE.HemisphereLight(0x6f93ad, 0x05121c, 0.35));

  /* ---------- la barca: un pezzo di sala macchine che rolla attorno a un asse sotto il pavimento ---------- */
  const PERNO = 0.8;
  const bordo = new THREE.Group();
  bordo.position.y = -PERNO;
  scena.add(bordo);
  const piano = new THREE.Group();
  piano.position.y = PERNO;
  bordo.add(piano);

  const normali = normaliMandorlata();
  normali.repeat.set(70, 70);
  const pavimento = new THREE.Mesh(
    new THREE.PlaneGeometry(7, 7),
    new THREE.MeshStandardMaterial({
      color: 0x9aa3a9, metalness: 0.9, roughness: 0.42,
      normalMap: normali, normalScale: new THREE.Vector2(0.9, 0.9),
      transparent: true,
      alphaMap: tela(256, 256, (ctx, n) => {
        const g = ctx.createRadialGradient(n / 2, n / 2, 0, n / 2, n / 2, n / 2);
        g.addColorStop(0, '#fff');
        g.addColorStop(0.22, '#fff');
        g.addColorStop(0.62, '#333');
        g.addColorStop(1, '#000');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, n, n);
      }, false),
    }),
  );
  pavimento.rotation.x = -Math.PI / 2;
  piano.add(pavimento);

  const ombra = new THREE.Mesh(
    new THREE.PlaneGeometry(1.9, 1.9),
    new THREE.MeshBasicMaterial({
      transparent: true, depthWrite: false, toneMapped: false,
      map: tela(128, 128, (ctx, n) => {
        const img = ctx.createImageData(n, n);
        for (let y = 0; y < n; y++) {
          for (let x = 0; x < n; x++) {
            const qx = Math.abs(((x + 0.5) / n - 0.5) * 1.9) - 0.47;
            const qz = Math.abs(((y + 0.5) / n - 0.5) * 1.9) - 0.47;
            const d = Math.hypot(Math.max(qx, 0), Math.max(qz, 0)) + Math.min(Math.max(qx, qz), 0) - 0.05;
            img.data[(y * n + x) * 4 + 3] = 255 * 0.8 * Math.pow(1 - limita((d + 0.05) / 0.42, 0, 1), 2.4);
          }
        }
        ctx.putImageData(img, 0, 0);
      }),
    }),
  );
  ombra.rotation.x = -Math.PI / 2;
  ombra.position.y = 0.003;
  piano.add(ombra);

  /* ---------- Quick Gyro X13: proporzioni dalla foto del prodotto installato ---------- */
  const gyro = new THREE.Group();
  piano.add(gyro);
  const scatola = (w, h, d, r, mat) => new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 3, r), mat);

  const matBiancoLucido = new THREE.MeshPhysicalMaterial({ color: 0xf3f4f5, roughness: 0.3, clearcoat: 0.7, clearcoatRoughness: 0.18 });
  const matPannello = new THREE.MeshStandardMaterial({ color: 0xe8ebed, roughness: 0.42 });
  const matNero = new THREE.MeshStandardMaterial({ color: 0x15181b, roughness: 0.36, metalness: 0.1 });
  const matGrafite = new THREE.MeshStandardMaterial({ color: 0x4c5257, roughness: 0.36, metalness: 0.7 });
  const matAcciaio = new THREE.MeshStandardMaterial({ color: 0xaeb5ba, roughness: 0.3, metalness: 1.0 });
  const matGomma = new THREE.MeshStandardMaterial({ color: 0x0d0f11, roughness: 0.8 });
  const matScuro = new THREE.MeshStandardMaterial({ color: 0x23292e, roughness: 0.45, metalness: 0.6 });

  // basamento: guide, supporti antivibranti, zoccolo, fascia in acciaio
  [-0.36, 0.36].forEach((x) => {
    const guida = scatola(0.09, 0.04, 1.12, 0.008, matScuro);
    guida.position.set(x, 0.02, 0);
    gyro.add(guida);
    [-0.42, 0.42].forEach((z) => {
      const supporto = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.046, 0.04, 24), matGomma);
      supporto.position.set(x, 0.06, z);
      gyro.add(supporto);
    });
  });
  const zoccolo = scatola(1.0, 0.05, 1.0, 0.01, matGrafite);
  zoccolo.position.y = 0.105;
  gyro.add(zoccolo);
  const fasciaBassa = scatola(1.02, 0.03, 1.02, 0.008, matAcciaio);
  fasciaBassa.position.y = 0.145;
  gyro.add(fasciaBassa);
  const fondo = new THREE.Mesh(new THREE.BoxGeometry(0.86, 0.02, 0.86), matScuro);
  fondo.position.y = 0.17;
  gyro.add(fondo);

  // telaio: quattro montanti neri e una cornice in alto (aperta: da sopra si vede dentro)
  [[-1, -1], [-1, 1], [1, -1], [1, 1]].forEach(([sx, sz]) => {
    const montante = scatola(0.13, 0.66, 0.13, 0.03, matNero);
    montante.position.set(sx * 0.445, 0.49, sz * 0.445);
    gyro.add(montante);
  });
  [[1.0, 0.06, 0, 0.47], [1.0, 0.06, 0, -0.47], [0.06, 0.88, 0.47, 0], [0.06, 0.88, -0.47, 0]].forEach(([w, d, x, z]) => {
    const lato = new THREE.Mesh(new THREE.BoxGeometry(w, 0.025, d), matGrafite);
    lato.position.set(x, 0.8325, z);
    gyro.add(lato);
  });

  // pannelli: si allontanano lungo la loro normale quando il carter si apre
  const etichetta = new THREE.Mesh(
    new THREE.PlaneGeometry(0.3, 0.09),
    new THREE.MeshStandardMaterial({
      transparent: true, roughness: 0.5,
      map: tela(600, 180, (ctx, w, h) => {
        ctx.fillStyle = '#3b4146';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'alphabetic';
        ctx.font = '600 44px Archivo, "Helvetica Neue", Arial, sans-serif';
        ctx.fillText('QUICK GYRO', w - 8, 56);
        ctx.font = '800 118px Archivo, "Helvetica Neue", Arial, sans-serif';
        ctx.fillText('X13', w - 4, h - 12);
      }),
    }),
  );
  const pannelli = [];
  const viti = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.009, 0.009, 0.006, 12), matScuro, 16);
  let nVite = 0;
  const mVite = new THREE.Matrix4();
  [[0, 1], [0, -1], [1, 0], [-1, 0]].forEach(([nx, nz], i) => {
    const g = new THREE.Group();
    const lastra = scatola(0.76, 0.62, 0.024, 0.008, matPannello);
    g.add(lastra);
    g.userData.n = new THREE.Vector3(nx, 0, nz);
    g.userData.base = new THREE.Vector3(nx * 0.488, 0.49, nz * 0.488);
    g.position.copy(g.userData.base);
    g.lookAt(g.position.clone().add(g.userData.n));    // la faccia +z del gruppo guarda fuori
    gyro.add(g);
    pannelli.push(g);
    [[-1, -1], [-1, 1], [1, -1], [1, 1]].forEach(([a, b]) => {
      mVite.makeRotationX(Math.PI / 2).setPosition(a * 0.34, b * 0.27, 0.013);
      g.updateMatrix();
      viti.setMatrixAt(nVite++, new THREE.Matrix4().multiplyMatrices(g.matrix, mVite));
    });
    if (i === 0) {
      etichetta.position.set(0.17, -0.2, 0.0135);
      g.add(etichetta);
    }
  });
  gyro.add(viti);

  const cappello = scatola(1.04, 0.155, 1.04, 0.055, matBiancoLucido);
  const yCappello = 0.9225;
  cappello.position.y = yCappello;
  gyro.add(cappello);

  /* ---------- dentro: la culla che precessa e il volano su asse orizzontale ---------- */
  const culla = new THREE.Group();          // precessione: ruota attorno all'asse verticale
  culla.position.y = 0.21;
  gyro.add(culla);
  const piatto = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.03, 64), matGrafite);
  piatto.position.y = -0.015;
  culla.add(piatto);
  const matFusione = new THREE.MeshStandardMaterial({ color: 0xa9b1b7, roughness: 0.5, metalness: 0.85 });
  const Y_ASSE = 0.29;
  [-0.2, 0.2].forEach((x) => {
    const spalla = scatola(0.08, 0.3, 0.2, 0.012, matFusione);
    spalla.position.set(x, 0.15, 0);
    culla.add(spalla);
    const cuscinetto = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.1, 40), matFusione);
    cuscinetto.rotation.z = Math.PI / 2;
    cuscinetto.position.set(x, Y_ASSE, 0);
    culla.add(cuscinetto);
  });
  const motore = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.085, 0.11, 40), matScuro);
  motore.rotation.z = Math.PI / 2;
  motore.position.set(0.315, Y_ASSE, 0);
  culla.add(motore);

  const volano = new THREE.Group();         // gira attorno all'asse trasversale (x)
  volano.position.y = Y_ASSE;
  culla.add(volano);
  const matFianco = new THREE.MeshStandardMaterial({ color: 0xbcc3c8, roughness: 0.24, metalness: 1.0 });
  const matFaccia = new THREE.MeshStandardMaterial({
    roughness: 0.28, metalness: 1.0,
    map: tela(512, 512, (ctx, n) => {
      const c = n / 2;
      ctx.fillStyle = '#c4cacf';
      ctx.fillRect(0, 0, n, n);
      for (let r = 4; r < c; r += 1.6) {            // segni di tornitura
        const v = 176 + Math.round(Math.sin(r * 0.37) * 14 + Math.sin(r * 2.3) * 8);
        ctx.strokeStyle = `rgb(${v},${v + 5},${v + 9})`;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.arc(c, c, r, 0, Math.PI * 2);
        ctx.stroke();
      }
      [[0.34, 7, '#7d858b'], [0.82, 5, '#8a9298'], [0.97, 6, '#9aa2a8']].forEach(([f, lw, col]) => {
        ctx.strokeStyle = col;
        ctx.lineWidth = lw;
        ctx.beginPath();
        ctx.arc(c, c, f * c, 0, Math.PI * 2);
        ctx.stroke();
      });
    }),
  });
  const geoDisco = new THREE.CylinderGeometry(0.27, 0.27, 0.16, 96);
  geoDisco.rotateZ(Math.PI / 2);
  volano.add(new THREE.Mesh(geoDisco, [matFianco, matFaccia, matFaccia]));
  const geoAlbero = new THREE.CylinderGeometry(0.032, 0.032, 0.52, 24);
  geoAlbero.rotateZ(Math.PI / 2);
  volano.add(new THREE.Mesh(geoAlbero, matAcciaio));

  // fori, dado e segno di equilibratura: si vedono da fermo e spariscono nel mosso quando gira forte
  const matFori = new THREE.MeshStandardMaterial({
    transparent: true, depthWrite: false, roughness: 0.4, metalness: 0.6,
    polygonOffset: true, polygonOffsetFactor: -2,
    map: tela(512, 512, (ctx, n) => {
      const c = n / 2;
      for (let k = 0; k < 6; k++) {
        const a = (k * Math.PI) / 3;
        const x = c + Math.cos(a) * 0.56 * c;
        const y = c + Math.sin(a) * 0.56 * c;
        const g = ctx.createRadialGradient(x, y, 0, x, y, 0.075 * c);
        g.addColorStop(0, '#0b0e10');
        g.addColorStop(0.72, '#1c2125');
        g.addColorStop(1, '#646c72');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(x, y, 0.075 * c, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = '#3a4146';
      ctx.beginPath();
      for (let k = 0; k < 6; k++) {
        const a = (k * Math.PI) / 3 + Math.PI / 6;
        ctx.lineTo(c + Math.cos(a) * 0.17 * c, c + Math.sin(a) * 0.17 * c);
      }
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#8c949a';
      ctx.beginPath();
      ctx.arc(c, c, 0.07 * c, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#b3261e';
      ctx.fillRect(c + 0.86 * c - 5, c - 20, 10, 40);
    }),
  });
  const matMosso = new THREE.MeshStandardMaterial({
    color: 0x2b3236, transparent: true, opacity: 0, depthWrite: false, roughness: 0.5, metalness: 0.6,
    polygonOffset: true, polygonOffsetFactor: -1,
  });
  [1, -1].forEach((s) => {
    const fori = new THREE.Mesh(new THREE.CircleGeometry(0.265, 64), matFori);
    fori.rotation.y = (s * Math.PI) / 2;
    fori.position.x = s * 0.0805;
    volano.add(fori);
    const mosso = new THREE.Mesh(new THREE.RingGeometry(0.13, 0.168, 64), matMosso);
    mosso.rotation.y = (s * Math.PI) / 2;
    mosso.position.x = s * 0.0806;
    volano.add(mosso);
  });

  /* ---------- camera lungo lo scroll: angoli attorno al Gyro, distanza in multipli di "inquadra tutto" ---------- */
  const CHIAVI = [
    { p: 0.0, az: -38, el: 14, d: 1.6, mira: [0, 0.5, 0] },
    { p: 0.18, az: -30, el: 17, d: 1.45, mira: [0, 0.5, 0] },
    { p: 0.34, az: -60, el: 26, d: 1.25, mira: [0, 0.52, 0] },
    { p: 0.5, az: -74, el: 27, d: 1.02, mira: [0, 0.5, 0] },
    { p: 0.64, az: -22, el: 38, d: 1.2, mira: [0, 0.48, 0] },
    { p: 0.82, az: 26, el: 20, d: 1.45, mira: [0, 0.5, 0] },
    { p: 1.0, az: 36, el: 13, d: 1.6, mira: [0, 0.5, 0] },
  ];
  const vMira = new THREE.Vector3();
  const a3 = new THREE.Vector3();
  const b3 = new THREE.Vector3();
  let distanza = 3;
  const posaCamera = (p, t) => {
    let i = 0;
    while (i < CHIAVI.length - 2 && p > CHIAVI[i + 1].p) i++;
    const A = CHIAVI[i];
    const B = CHIAVI[i + 1];
    const u = morb(limita((p - A.p) / (B.p - A.p), 0, 1));
    const az = rad(A.az + (B.az - A.az) * u + Math.sin(t * 0.23) * 2.5);
    const el = rad(A.el + (B.el - A.el) * u + Math.sin(t * 0.31) * 1.2);
    const r = (A.d + (B.d - A.d) * u) * distanza;
    vMira.copy(a3.fromArray(A.mira)).lerp(b3.fromArray(B.mira), u);
    camera.position.set(
      vMira.x + r * Math.sin(az) * Math.cos(el),
      vMira.y + r * Math.sin(el),
      vMira.z + r * Math.cos(az) * Math.cos(el),
    );
    camera.lookAt(vMira);
  };

  const RAGGIO = 0.95;     // il Gyro con il carter aperto
  const ridimensiona = () => {
    const w = canvas.clientWidth || canvas.parentElement.clientWidth;
    const h = canvas.clientHeight || canvas.parentElement.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    const asp = w / h;
    camera.fov = asp < 1 ? 36 : 30;
    const tv = Math.tan(rad(camera.fov) / 2);
    let semi;
    if (asp >= 1) {
      // su schermo largo il Gyro sta a destra: a sinistra ci sono titolo e passi
      const largo = w * 1.26;
      camera.aspect = largo / h;
      camera.setViewOffset(largo, h, 0, 0, w, h);
      semi = Math.min(Math.atan(tv), Math.atan(tv * (0.74 * w) / h));
    } else {
      // su telefono il Gyro sta sotto il titolo e gli indicatori, sopra i passi: il carter aperto deve restare libero
      const alto = h * 1.1;
      camera.aspect = w / alto;
      camera.setViewOffset(w, alto, 0, 0, w, h);
      semi = Math.atan((tv * w) / alto);
    }
    // su telefono il carter aperto non deve salire fin sotto il titolo: si allontana un po' la camera
    distanza = (asp < 1 ? RAGGIO * 1.2 : RAGGIO) / Math.sin(semi);
    camera.updateProjectionMatrix();
  };
  ridimensiona();
  new ResizeObserver(ridimensiona).observe(canvas.parentElement);

  /* ---------- un fotogramma ---------- */
  const OMEGA = (2 * Math.PI) / 3.4;
  let ampiezza = statoRollio(progresso()).ampiezza;
  let giri = 0;
  let apertura = 0;
  let angoloVolano = 0;
  let pS = progresso();
  const fotogramma = (t, dt) => {
    pS += (progresso() - pS) * Math.min(1, dt * 5);
    const st = statoRollio(pS);
    ampiezza += (st.ampiezza - ampiezza) * Math.min(1, dt * 2.5);
    giri += (st.volano - giri) * Math.min(1, dt * 3);
    apertura += (st.apertura - apertura) * Math.min(1, dt * 6);

    const rollio = ampiezza * (0.82 * Math.sin(OMEGA * t) + 0.18 * Math.sin(1.63 * OMEGA * t + 1.1));
    bordo.rotation.z = rad(rollio);
    bordo.rotation.x = rad(0.6 * Math.sin(OMEGA * 0.7 * t + 0.6));
    bordo.position.y = -PERNO + 0.025 * Math.sin(OMEGA * 0.9 * t + 0.3);

    // il carter si apre come in una vista esplosa
    const a = morb(limita(apertura, 0, 1));
    cappello.position.y = yCappello + 0.62 * a;
    pannelli.forEach((g) => g.position.copy(g.userData.base).addScaledVector(g.userData.n, 0.55 * a));
    viti.visible = a < 0.02;

    // il volano prende giri, la culla precessa contro l'onda
    angoloVolano += dt * 42 * giri * giri;
    volano.rotation.x = angoloVolano;
    const mosso = morb(limita((giri - 0.22) / 0.3, 0, 1));
    matFori.opacity = 1 - mosso;
    matMosso.opacity = 0.55 * mosso;
    culla.rotation.y = 0.5 * giri * st.calma * Math.cos(OMEGA * t);

    posaCamera(pS, t);
    renderer.render(scena, camera);
    suFrame(rollio);
  };

  /* ---------- ciclo: solo quando la sezione è in vista e la scheda è visibile ---------- */
  let inVista = true;
  let attivo = false;
  let perso = false;
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
    const deve = !perso && inVista && !document.hidden && !ridotto;
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
  // se il browser toglie il contesto WebGL torna la foto, mai un riquadro vuoto
  canvas.addEventListener('webglcontextlost', (e) => {
    e.preventDefault();
    attivo = false;
    perso = true;
    sezioneDom.classList.remove('pronta');
  });

  if (ridotto) {
    // movimento ridotto: la scena si ridisegna solo quando si scorre, il tempo resta fermo
    const fermo = () => { apertura = statoRollio(progresso()).apertura; fotogramma(1.2, 1); };
    fermo();
    window.addEventListener('scroll', () => requestAnimationFrame(fermo), { passive: true });
  } else {
    fotogramma(0, 0.016);
    aggiornaCiclo();
  }
  return true;
}
