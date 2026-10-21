// First Bosphorus Bridge come gemello digitale: pendini che vibrano, sensori, traffico, link wireless tra le torri.
// Scala: 1 unità = 10 m. x lungo il ponte (Europa a sinistra), y in alto, z di traverso.
import * as THREE from 'three';

const FONDO = 0x0F1A33;
const ACCIAIO = 0xA4C1CB;
const CHIARO = 0xDCEAF0;
const rgb = (hex) => new Float32Array([((hex >> 16) & 255) / 255, ((hex >> 8) & 255) / 255, (hex & 255) / 255]);

const META = 54.5;          // metà della campata centrale (1090 m)
const TORRE_H = 16.5;       // antenne da 165 m
const IMPALCATO_Y = 6.4;
const CAVO_ALTO = 16.2;
const CAVO_BASSO = 7.0;
const CAVO_Z = 1.75;
const LARGO = 1.65;
const FINE = 86;
const ANCORA_X = 82;
const ANCORA_Y = 6.2;

const cavoY = (x) => CAVO_BASSO + (CAVO_ALTO - CAVO_BASSO) * (x / META) * (x / META);
const liscia = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

export function avvia({ pista, palco, ridotto }) {
  const canvas = palco.querySelector('.bosforo__scena');
  const grafico = palco.querySelector('.grafico');
  const telaG = palco.querySelector('.grafico__tela');
  const mobile = matchMedia('(max-width: 900px)').matches;

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  } catch (e) { return false; }
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, mobile ? 1.5 : 2));
  renderer.setClearColor(FONDO, 1);

  const scena = new THREE.Scene();
  scena.background = new THREE.Color(FONDO);
  scena.fog = new THREE.Fog(FONDO, 60, 300);
  const camera = new THREE.PerspectiveCamera(40, 1, 1, 520);

  scena.add(new THREE.HemisphereLight(0xA4C1CB, 0x0F1A33, 1.25));
  const sole = new THREE.DirectionalLight(0xffffff, 1.1);
  sole.position.set(-40, 80, 60);
  scena.add(sole);

  const matTorre = new THREE.MeshLambertMaterial({ color: 0x2C4178 });
  const matImpalcato = new THREE.MeshLambertMaterial({ color: 0x223563 });
  const matSpigoli = new THREE.LineBasicMaterial({ color: ACCIAIO, transparent: true, opacity: 0.5 });
  const matCavo = new THREE.MeshBasicMaterial({ color: ACCIAIO });

  const scatola = (w, h, d, x, y, z, mat) => {
    const g = new THREE.BoxGeometry(w, h, d);
    const m = new THREE.Mesh(g, mat);
    m.position.set(x, y, z);
    const e = new THREE.LineSegments(new THREE.EdgesGeometry(g), matSpigoli);
    m.add(e);
    scena.add(m);
    return m;
  };

  // impalcato a cassone
  scatola(FINE * 2, 0.34, LARGO * 2, 0, IMPALCATO_Y - 0.17, 0, matImpalcato);
  // spartitraffico e bordi
  {
    const pts = [];
    for (const z of [0, LARGO - 0.05, -LARGO + 0.05]) pts.push(-FINE, IMPALCATO_Y + 0.01, z, FINE, IMPALCATO_Y + 0.01, z);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    scena.add(new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: ACCIAIO, transparent: true, opacity: 0.35 })));
  }

  // torri: due gambe e tre traversi
  for (const s of [-1, 1]) {
    const x = s * META;
    for (const z of [-CAVO_Z, CAVO_Z]) scatola(0.72, TORRE_H, 0.56, x, TORRE_H / 2, z, matTorre);
    for (const y of [IMPALCATO_Y - 0.9, 11.4, TORRE_H - 0.3]) scatola(0.56, 0.5, CAVO_Z * 2, x, y, 0, matTorre);
    scatola(1.6, 0.6, CAVO_Z * 2 + 1.2, x, 0.3, 0, matTorre);
    // pile delle campate laterali
    for (const d of [9, 18]) scatola(0.5, IMPALCATO_Y - 0.34, 1.6, s * (META + d), (IMPALCATO_Y - 0.34) / 2, 0, matTorre);
  }

  // cavi principali (campata e stralli di riva)
  const curvaCavo = (z) => {
    const p = [];
    for (let i = 0; i <= 14; i++) {
      const u = i / 14, x = -ANCORA_X + (ANCORA_X - META) * u;
      p.push(new THREE.Vector3(x, ANCORA_Y + (CAVO_ALTO - ANCORA_Y) * u - Math.sin(Math.PI * u) * 0.6, z));
    }
    for (let i = 1; i <= 80; i++) { const x = -META + (2 * META) * (i / 80); p.push(new THREE.Vector3(x, cavoY(x), z)); }
    for (let i = 1; i <= 14; i++) {
      const u = i / 14, x = META + (ANCORA_X - META) * u;
      p.push(new THREE.Vector3(x, CAVO_ALTO + (ANCORA_Y - CAVO_ALTO) * u - Math.sin(Math.PI * u) * 0.6, z));
    }
    return new THREE.CatmullRomCurve3(p, false, 'centripetal');
  };
  for (const z of [-CAVO_Z, CAVO_Z]) scena.add(new THREE.Mesh(new THREE.TubeGeometry(curvaCavo(z), 360, 0.055, 6, false), matCavo));

  // acqua: superficie scura con la griglia di rilievo
  {
    const acqua = new THREE.Mesh(new THREE.PlaneGeometry(900, 900), new THREE.MeshBasicMaterial({ color: 0x14244A }));
    acqua.rotation.x = -Math.PI / 2;
    acqua.position.y = -0.18;
    scena.add(acqua);
    const pts = [];
    for (let i = -60; i <= 60; i++) {
      const v = i * 4;
      pts.push(-240, 0, v, 240, 0, v, v, 0, -240, v, 0, 240);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    scena.add(new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: ACCIAIO, transparent: true, opacity: 0.07 })));
  }

  // rive (Europa e Asia) in fil di ferro
  for (const s of [-1, 1]) {
    const g = new THREE.PlaneGeometry(90, 150, 36, 50);
    g.rotateX(-Math.PI / 2);
    const pos = g.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const lx = pos.getX(i), z = pos.getZ(i);
      const x = s * (48 + 45 + lx * s);
      const d = Math.abs(x);
      const onda = Math.sin(x * 0.11 + z * 0.07) * 1.4 + Math.sin(z * 0.19 - x * 0.05) * 0.9;
      const h = liscia(46, 86, d) * (IMPALCATO_Y - 0.6) + liscia(70, 130, d) * 6 + liscia(52, 110, d) * onda;
      pos.setXYZ(i, x, Math.max(0, h), z);
    }
    const filo = new THREE.LineSegments(new THREE.WireframeGeometry(g), new THREE.LineBasicMaterial({ color: ACCIAIO, transparent: true, opacity: 0.13 }));
    scena.add(filo);
  }

  // pendini inclinati a zig-zag
  const N = 58, K = 8;
  const pendini = [];
  for (const lato of [1, -1]) {
    for (let i = 0; i < N; i++) {
      const xa = -META + 1.6 + i * ((2 * META - 3.2) / (N - 1));
      const xb = Math.min(META - 0.6, Math.max(-META + 0.6, xa + (i % 2 ? -0.85 : 0.85)));
      const ya = cavoY(xa), yb = IMPALCATO_Y + 0.04;
      const L = ya - yb;
      pendini.push({
        lato, i, xa, ya, xb, yb, z: lato * CAVO_Z, L,
        f: Math.min(3.2, Math.max(0.75, 0.7 + 5 / Math.max(L, 0.6))),
        fase: (i * 1.7 + (lato > 0 ? 0 : 2.3)) % 6.283,
        eccita: 0,
        strumentato: i >= 8 && i <= 17,
      });
    }
  }
  const strum = pendini.filter((p) => p.strumentato);
  const normali = pendini.filter((p) => !p.strumentato);
  const lineePendini = (lista, mat) => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(lista.length * (K - 1) * 6), 3));
    const o = new THREE.LineSegments(g, mat);
    o.frustumCulled = false;
    scena.add(o);
    return o;
  };
  // la scansione: una banda di luce che corre lungo il ponte e accende i pendini
  const scan = { uScan: { value: -80 }, uScanA: { value: 0 } };
  const conScansione = (mat) => {
    mat.onBeforeCompile = (sh) => {
      sh.uniforms.uScan = scan.uScan;
      sh.uniforms.uScanA = scan.uScanA;
      sh.vertexShader = 'varying float vX;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n vX = position.x;');
      sh.fragmentShader = 'uniform float uScan;\nuniform float uScanA;\nvarying float vX;\n' + sh.fragmentShader.replace('#include <color_fragment>',
        '#include <color_fragment>\n float b = uScanA * exp(-pow((vX - uScan) / 2.2, 2.0));\n diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.92, 0.97, 1.0), b);\n diffuseColor.a = min(1.0, diffuseColor.a + b);');
    };
    return mat;
  };
  const oNormali = lineePendini(normali, conScansione(new THREE.LineBasicMaterial({ color: ACCIAIO, transparent: true, opacity: 0.6 })));
  const oStrum = lineePendini(strum, conScansione(new THREE.LineBasicMaterial({ color: CHIARO })));

  // quote da tavola tecnica: luce della campata e altezza delle antenne
  const matQuote = new THREE.LineBasicMaterial({ color: CHIARO, transparent: true, opacity: 0, fog: false });
  let quotaV;
  {
    const zq = 5, yq = 2.6;
    const linee = (pts) => {
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
      const l = new THREE.LineSegments(g, matQuote);
      l.frustumCulled = false;
      scena.add(l);
      return l;
    };
    linee([
      -META, yq, zq, META, yq, zq,
      -META, 0.4, zq, -META, yq + 0.9, zq, META, 0.4, zq, META, yq + 0.9, zq,
      -META - 0.5, yq - 0.5, zq, -META + 0.5, yq + 0.5, zq, META - 0.5, yq - 0.5, zq, META + 0.5, yq + 0.5, zq,
    ]);
    // quota verticale: sull'antenna asiatica in orizzontale, su quella europea in verticale
    quotaV = [1, -1].map((s) => {
      const xq = s * (META + 4.5), xt = s * (META + 0.6);
      return linee([
        xq, 0, zq, xq, TORRE_H, zq,
        xq - 0.9, 0, zq, xq + 0.9, 0, zq, xq - s * 0.9, TORRE_H, zq, xt, TORRE_H, zq,
        xq - 0.5, -0.5, zq, xq + 0.5, 0.5, zq, xq - 0.5, TORRE_H - 0.5, zq, xq + 0.5, TORRE_H + 0.5, zq,
      ]);
    });
  }
  const etichetta = (testo) => {
    const c = document.createElement('canvas');
    c.width = 512; c.height = 128;
    const x = c.getContext('2d');
    x.font = '600 84px Archivo, system-ui, sans-serif';
    x.fillStyle = '#DCEAF0';
    x.textAlign = 'center'; x.textBaseline = 'middle';
    x.fillText(testo, 256, 68);
    const tx = new THREE.CanvasTexture(c);
    tx.colorSpace = THREE.SRGBColorSpace;
    tx.anisotropy = 4;
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tx, transparent: true, opacity: 0, depthWrite: false, fog: false }));
    scena.add(sp);
    return sp;
  };
  const q1 = etichetta('1090 m');
  const q2 = etichetta('165 m');

  // sensori e luci: un unico sistema di punti luminosi
  const matPunti = new THREE.ShaderMaterial({
    uniforms: { uPix: { value: renderer.getPixelRatio() } },
    vertexShader: `
      attribute float aSize; attribute vec3 aColor; attribute float aGlow;
      uniform float uPix; varying vec3 vC; varying float vG;
      void main() {
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = clamp(aSize * uPix * (42.0 / -mv.z), 1.5 * uPix, 46.0 * uPix);
        vC = aColor; vG = aGlow;
      }`,
    fragmentShader: `
      varying vec3 vC; varying float vG;
      void main() {
        float d = length(gl_PointCoord - 0.5) * 2.0;
        if (d > 1.0) discard;
        float nucleo = smoothstep(0.42, 0.0, d);
        float alone = exp(-d * d * 5.0) * 0.75 * vG;
        gl_FragColor = vec4(vC * (nucleo + alone) * (0.35 + vG * 0.65), 1.0);
      }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  });
  const punti = [];
  const aggiungiPunto = (x, y, z, size, color, glow) => { punti.push({ x, y, z, size, color: rgb(color), glow, base: glow }); return punti.length - 1; };

  // accelerometri sui pendini e strain gauge sugli ancoraggi
  strum.forEach((p) => {
    p.sensore = aggiungiPunto(0, 0, 0, 5.6, CHIARO, 1);
    p.ancoraggio = aggiungiPunto(p.xb, p.yb + 0.05, p.z, 3.8, ACCIAIO, 0.8);
  });
  // unità di acquisizione: due per torre, alla quota dell'impalcato
  const unita = [];
  for (const s of [-1, 1]) for (const z of [-CAVO_Z, CAVO_Z]) {
    scatola(0.42, 0.6, 0.34, s * META + s * 0.62, IMPALCATO_Y + 0.62, z, new THREE.MeshLambertMaterial({ color: 0x3E5A9A }));
    unita.push(aggiungiPunto(s * META + s * 0.62, IMPALCATO_Y + 1.05, z, 6.5, CHIARO, 1));
  }
  // 8 sonde di temperatura
  const sonde = [];
  [-48, -34, -20, -6, 6, 20, 34, 48].forEach((x, k) => sonde.push(aggiungiPunto(x, IMPALCATO_Y - 0.2, (k % 2 ? -1 : 1) * (LARGO + 0.05), 2.6, ACCIAIO, 0.6)));
  // pacchetti sul link wireless
  const pacchetti = [0, 1, 2].map(() => aggiungiPunto(0, 0, 0, 5, CHIARO, 0));

  // traffico: 6 corsie, fari bianchi e luci rosse
  const corsie = [0.38, 0.8, 1.22].flatMap((z) => [z, -z]);
  const auto = [];
  corsie.forEach((z, c) => {
    const verso = z > 0 ? 1 : -1;
    const v = 2.1 + (c % 3) * 0.35;
    for (let j = 0; j < 9; j++) {
      const camion = (j + c) % 4 === 0;
      auto.push({
        z, verso, v, x0: j * (2 * FINE / 9) + c * 3.7, camion,
        fronte: aggiungiPunto(0, 0, 0, camion ? 2.6 : 2.1, 0xFFF4DC, 0.7),
        retro: aggiungiPunto(0, 0, 0, camion ? 2.4 : 1.9, 0xE5483C, 0.55),
      });
    }
  });

  const gP = new THREE.BufferGeometry();
  const aPos = new Float32Array(punti.length * 3), aCol = new Float32Array(punti.length * 3);
  const aSize = new Float32Array(punti.length), aGlow = new Float32Array(punti.length);
  punti.forEach((p, i) => { aPos.set([p.x, p.y, p.z], i * 3); aCol.set(p.color, i * 3); aSize[i] = p.size; aGlow[i] = p.glow; });
  gP.setAttribute('position', new THREE.BufferAttribute(aPos, 3));
  gP.setAttribute('aColor', new THREE.BufferAttribute(aCol, 3));
  gP.setAttribute('aSize', new THREE.BufferAttribute(aSize, 1));
  gP.setAttribute('aGlow', new THREE.BufferAttribute(aGlow, 1));
  const oPunti = new THREE.Points(gP, matPunti);
  oPunti.frustumCulled = false;
  scena.add(oPunti);
  const setPunto = (i, x, y, z) => { aPos[i * 3] = x; aPos[i * 3 + 1] = y; aPos[i * 3 + 2] = z; };

  // link wireless tra le torri
  const arco = new THREE.QuadraticBezierCurve3(
    new THREE.Vector3(-META, TORRE_H + 0.4, 0), new THREE.Vector3(0, TORRE_H + 22, 0), new THREE.Vector3(META, TORRE_H + 0.4, 0));
  const matArco = new THREE.ShaderMaterial({
    uniforms: { uT: { value: 0 }, uVis: { value: 0 }, uC: { value: rgb(ACCIAIO) } },
    vertexShader: `attribute float aU; varying float vU; void main() { vU = aU; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `uniform float uT; uniform float uVis; uniform vec3 uC; varying float vU;
      void main() {
        float tratto = step(0.5, fract(vU * 90.0));
        float onda = smoothstep(0.86, 1.0, fract(vU * 3.0 - uT * 0.6));
        gl_FragColor = vec4(uC * uVis * (0.22 * tratto + onda), 1.0);
      }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  });
  {
    const pts = arco.getPoints(240);
    const g = new THREE.BufferGeometry().setFromPoints(pts);
    g.setAttribute('aU', new THREE.BufferAttribute(new Float32Array(pts.map((_, i) => i / (pts.length - 1))), 1));
    const l = new THREE.Line(g, matArco);
    l.frustumCulled = false;
    scena.add(l);
  }
  // cavo LAN dalla torre ai pendini strumentati
  const matLan = new THREE.LineBasicMaterial({ color: CHIARO, transparent: true, opacity: 0 });
  {
    const pts = [];
    for (const z of [-CAVO_Z, CAVO_Z]) {
      const xa = -META + 0.62, xb = strum[strum.length - 1].xb;
      pts.push(xa, IMPALCATO_Y + 0.12, z * 0.94, xb, IMPALCATO_Y + 0.12, z * 0.94);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    scena.add(new THREE.LineSegments(g, matLan));
  }

  // ---------- inquadrature per passo ----------
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  const chiavi = {
    largo: [
      { p: V(-50, 29, 80), t: V(5, 8.5, 0), fov: 38 },
      { p: V(-67, 21.5, 15), t: V(-18, 15.5, -2), fov: 44 },
      { p: V(-36.5, 9.4, 8.6), t: V(-29.5, 8.8, 0), fov: 46 },
      { p: V(-47, 7.7, 3.3), t: V(-20, 7.6, 0.2), fov: 50 },
    ],
    stretto: [
      { p: V(-104, 21, 40), t: V(-10, 4.5, 0), fov: 50 },
      { p: V(-65, 20, 10), t: V(-30, 17.5, -1), fov: 60 },
      { p: V(-35.5, 10, 7.8), t: V(-30.5, 9.8, 0), fov: 60 },
      { p: V(-43, 7.6, 2.9), t: V(-22, 8.6, 0.2), fov: 62 },
    ],
  };
  let serie = chiavi.largo;
  const desPos = new THREE.Vector3(), desTgt = new THREE.Vector3(), tgt = new THREE.Vector3();
  let desFov = 40, primo = true;

  const progresso = () => {
    const r = pista.getBoundingClientRect();
    const corsa = r.height - innerHeight;
    return corsa > 0 ? Math.min(1, Math.max(0, -r.top / corsa)) : 0;
  };
  const inquadra = (p, t) => {
    const k = p * 3;
    const a = Math.min(2, Math.floor(k));
    const f = liscia(0.18, 0.82, k - a);
    const A = serie[a], B = serie[a + 1];
    desPos.lerpVectors(A.p, B.p, f);
    desTgt.lerpVectors(A.t, B.t, f);
    desFov = A.fov + (B.fov - A.fov) * f;
    const d = desPos.distanceTo(desTgt);
    const amp = Math.min(2.2, d * 0.03);
    desPos.x += Math.sin(t * 0.13) * amp;
    desPos.y += Math.sin(t * 0.09 + 1) * amp * 0.4;
    desPos.z += Math.cos(t * 0.11) * amp;
    return k;
  };

  // ---------- grafico del pendino strumentato ----------
  const ctxG = telaG.getContext('2d');
  let gw = 0, gh = 0, gdpr = 1;
  const storia = new Float32Array(240);
  let testa = 0, ultimoCampione = -1, eventoFino = 0;
  const scelto = strum[4];

  const misura = () => {
    const w = palco.clientWidth, h = palco.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    serie = camera.aspect < 0.9 ? chiavi.stretto : chiavi.largo;
    camera.updateProjectionMatrix();
    gdpr = Math.min(devicePixelRatio || 1, 2);
    gw = telaG.clientWidth; gh = telaG.clientHeight;
    telaG.width = Math.round(gw * gdpr); telaG.height = Math.round(gh * gdpr);
  };
  misura();
  new ResizeObserver(misura).observe(palco);

  const disegnaGrafico = () => {
    ctxG.setTransform(gdpr, 0, 0, gdpr, 0, 0);
    ctxG.clearRect(0, 0, gw, gh);
    ctxG.strokeStyle = 'rgba(164,193,203,.18)';
    ctxG.lineWidth = 1;
    ctxG.beginPath(); ctxG.moveTo(0, gh / 2); ctxG.lineTo(gw, gh / 2); ctxG.stroke();
    ctxG.beginPath();
    const n = storia.length;
    for (let k = 0; k < n; k++) {
      const v = storia[(testa + k) % n];
      const x = (k / (n - 1)) * gw, y = gh / 2 - v * gh * 0.42;
      k ? ctxG.lineTo(x, y) : ctxG.moveTo(x, y);
    }
    ctxG.strokeStyle = '#DCEAF0';
    ctxG.lineWidth = 1.3;
    ctxG.stroke();
  };

  // ---------- simulazione ----------
  const posN = oNormali.geometry.attributes.position.array;
  const posS = oStrum.geometry.attributes.position.array;
  const scriviPendino = (arr, idx, p, t) => {
    const amp = (0.012 + p.eccita * 0.3) * Math.min(1, p.L / 6 + 0.25);
    const osc = Math.sin(6.283 * p.f * t + p.fase);
    let o = idx * (K - 1) * 6;
    let px = p.xa, py = p.ya, pz = p.z;
    for (let k = 1; k < K; k++) {
      const u = k / (K - 1);
      const x = p.xa + (p.xb - p.xa) * u, y = p.ya + (p.yb - p.ya) * u;
      const z = p.z + Math.sin(Math.PI * u) * amp * osc;
      arr[o++] = px; arr[o++] = py; arr[o++] = pz;
      arr[o++] = x; arr[o++] = y; arr[o++] = z;
      px = x; py = y; pz = z;
    }
    return amp * osc;
  };
  const passoPendini = 2 * META - 3.2;
  const indicePendino = (x) => Math.round((x + META - 1.6) / (passoPendini / (N - 1)));

  let tSim = 0, ultimo = performance.now(), attivo = true, pronto = false;
  const aggiorna = (ora) => {
    const dt = Math.min(0.05, Math.max(0, (ora - ultimo) / 1000));
    ultimo = ora;
    if (!ridotto) tSim += dt;
    const t = tSim;
    const p = progresso();
    const k = inquadra(p, t);
    const passo = Math.min(3, Math.floor(k + 0.5));

    // traffico ed eccitazione dei pendini
    pendini.forEach((q) => { q.eccita *= Math.exp(-dt * 1.1); });
    auto.forEach((a) => {
      const corsa = 2 * FINE;
      const s = (((a.x0 + a.v * t) % corsa) + corsa) % corsa;
      const x = a.verso > 0 ? -FINE + s : FINE - s;
      const y = IMPALCATO_Y + 0.1;
      setPunto(a.fronte, x + a.verso * 0.1, y, a.z);
      setPunto(a.retro, x - a.verso * 0.12, y, a.z);
      if (Math.abs(x) < META) {
        const c = indicePendino(x);
        for (let i = c - 1; i <= c + 1; i++) {
          if (i < 0 || i >= N) continue;
          const q = pendini[(a.z > 0 ? 0 : N) + i];
          if (Math.abs(q.xb - x) < 0.5) {
            const forza = a.camion ? 1 : 0.35;
            if (q === scelto && a.camion && q.eccita < 0.6) eventoFino = t + 1.3;
            q.eccita = Math.max(q.eccita, forza);
          }
        }
      }
    });

    normali.forEach((q, i) => scriviPendino(posN, i, q, t));
    let valoreScelto = 0;
    strum.forEach((q, i) => {
      const v = scriviPendino(posS, i, q, t);
      if (q === scelto) valoreScelto = v;
      const u = 0.78;
      setPunto(q.sensore, q.xa + (q.xb - q.xa) * u, q.ya + (q.yb - q.ya) * u, q.z + Math.sin(Math.PI * u) * v);
      aGlow[q.sensore] = 0.55 + 0.25 * Math.sin(t * 3 + q.i) + q.eccita * 0.8;
      aGlow[q.ancoraggio] = 0.45 + q.eccita * 0.7;
    });
    oNormali.geometry.attributes.position.needsUpdate = true;
    oStrum.geometry.attributes.position.needsUpdate = true;

    // unità di acquisizione, sonde, link wireless
    const visLink = liscia(0.5, 1.0, k) * (1 - liscia(2.3, 2.9, k) * 0.6);
    unita.forEach((i, j) => { aGlow[i] = 0.5 + 0.5 * visLink + 0.2 * Math.sin(t * 5 + j); });
    sonde.forEach((i, j) => { aGlow[i] = 0.3 + 0.3 * liscia(1.6, 2.2, k) + 0.1 * Math.sin(t * 1.3 + j); });
    pacchetti.forEach((i, j) => {
      const u = (t * 0.32 + j / 3) % 1;
      const q = arco.getPoint(j % 2 ? 1 - u : u);
      setPunto(i, q.x, q.y, q.z);
      aGlow[i] = visLink * 0.9;
      aSize[i] = 5 * visLink;
    });
    const visQuote = 1 - liscia(0.25, 0.6, k);
    matQuote.opacity = 0.75 * visQuote;
    const grande = camera.aspect < 0.9 ? 1.7 : 1;
    q1.material.opacity = q2.material.opacity = visQuote;
    q1.position.set(0, 4.6 * (grande > 1 ? 1.15 : 1), 5);
    const stretto = grande > 1;
    quotaV[0].visible = !stretto;
    quotaV[1].visible = stretto;
    q2.material.rotation = stretto ? Math.PI / 2 : 0;
    if (stretto) q2.position.set(-META - 4.5 - 2.2, TORRE_H * 0.5, 5);
    else q2.position.set(META + 4.5 + 5.2, TORRE_H * 0.55, 5);
    q1.scale.set(10 * grande, 2.5 * grande, 1);
    q2.scale.set(10 * grande, 2.5 * grande, 1);
    scan.uScan.value = -64 + ((t * 26) % 128);
    scan.uScanA.value = 0.85 * (1 - liscia(0.3, 0.75, k)) + 0.35 * liscia(2.3, 2.9, k);
    matArco.uniforms.uT.value = t;
    matArco.uniforms.uVis.value = visLink;
    matLan.opacity = 0.5 * liscia(0.6, 1.2, k);
    gP.attributes.position.needsUpdate = true;
    gP.attributes.aGlow.needsUpdate = true;
    gP.attributes.aSize.needsUpdate = true;

    // camera con inseguimento morbido
    const a = primo ? 1 : 1 - Math.exp(-dt * 3.2);
    camera.position.lerp(desPos, a);
    tgt.lerp(desTgt, a);
    camera.fov += (desFov - camera.fov) * a;
    camera.updateProjectionMatrix();
    camera.lookAt(tgt);
    if (primo) { tgt.copy(desTgt); camera.lookAt(tgt); primo = false; }
    const dist = camera.position.distanceTo(tgt);
    scena.fog.near = dist * 0.85;
    scena.fog.far = dist * 3.4 + 50;

    // grafico
    const campione = Math.floor(t * 60);
    if (ultimoCampione < 0) ultimoCampione = campione - 1;
    for (let c = ultimoCampione + 1; c <= campione; c++) {
      storia[testa] = Math.max(-1, Math.min(1, valoreScelto * 5 + Math.sin(c * 1.9) * 0.025));
      testa = (testa + 1) % storia.length;
    }
    ultimoCampione = campione;
    if (passo >= 2) {
      disegnaGrafico();
      grafico.classList.toggle('evento', t < eventoFino);
    }

    renderer.render(scena, camera);
  };

  let inCorsa = false;
  const ciclo = () => {
    if (!attivo) { inCorsa = false; return; }
    aggiorna(performance.now());
    requestAnimationFrame(ciclo);
  };
  const avviaCiclo = () => {
    if (inCorsa || ridotto || !pronto) return;
    inCorsa = true;
    ultimo = performance.now();
    requestAnimationFrame(ciclo);
  };

  new IntersectionObserver(([v]) => {
    attivo = v.isIntersecting && !document.hidden;
    if (attivo) avviaCiclo();
  }).observe(pista);
  document.addEventListener('visibilitychange', () => {
    const r = pista.getBoundingClientRect();
    attivo = !document.hidden && r.bottom > 0 && r.top < innerHeight;
    if (attivo) avviaCiclo();
  });
  if (ridotto) addEventListener('scroll', () => requestAnimationFrame(() => aggiorna(performance.now())), { passive: true });

  const parti = () => {
    aggiorna(performance.now());
    pronto = true;
    palco.classList.add('pronto');
    avviaCiclo();
  };
  inquadra(progresso(), 0);
  camera.position.copy(desPos); camera.lookAt(desTgt);
  (renderer.compileAsync ? renderer.compileAsync(scena, camera) : Promise.resolve()).then(parti, parti);

  window.__akron3d = { renderer, scena, camera };
  return true;
}
