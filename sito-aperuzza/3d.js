// La bobina madre: un film trasparente si svolge, esce stampato e la taglierina lo divide in strisce.
// Guidata dallo scroll della sezione #mestiere e dal tempo (performance.now), così si muove anche nel video.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const liscio = (a, b, v) => { const t = clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const mix = (a, b, t) => a + (b - a) * t;

const STRISCE = 4;          // strisce dopo la taglierina
const STAZIONE = 0.075;     // punto del film (0 = bobina, 1 = fine) dove si stampa
const COLTELLI = 0.15;      // punto dove la taglierina divide il film

// impaginazioni: il telefono ha la bobina in alto e il film che scende verso chi guarda
const IMPAGINAZIONI = {
  telefono: {
    centro: new THREE.Vector3(-0.55, 0.95, -1.4), raggio: 0.95, altezza: 1.75, nucleo: 0.3,
    lunghezza: 11, curva: 0.17, onda: 0.3, caduta: 0.012,
    camera: [new THREE.Vector3(0.15, 2.4, 8.6), new THREE.Vector3(0.6, 1.6, 9.6)],
    mira: [new THREE.Vector3(0.35, 0.15, 0), new THREE.Vector3(0.45, 0.05, 0)], fov: 40,
  },
  schermo: {
    centro: new THREE.Vector3(0.7, 0.35, -0.9), raggio: 1.2, altezza: 2.3, nucleo: 0.36,
    lunghezza: 13, curva: 0.085, onda: 0.3, caduta: 0.002,
    camera: [new THREE.Vector3(-0.6, 2.2, 9.2), new THREE.Vector3(-1.0, 1.4, 10.4)],
    mira: [new THREE.Vector3(1.6, 0.0, 0), new THREE.Vector3(1.7, -0.1, 0)], fov: 34,
  },
};

function telaAnelli() {
  // il fianco di una bobina: centinaia di spire, verdine come il bordo di una pila di Cellofan
  const c = document.createElement('canvas'); c.width = c.height = 512;
  const g = c.getContext('2d');
  const r0 = 256;
  const grad = g.createRadialGradient(r0, r0, 40, r0, r0, r0);
  grad.addColorStop(0, '#9fbfb2'); grad.addColorStop(0.7, '#cfe3db'); grad.addColorStop(1, '#eef7f3');
  g.fillStyle = grad; g.fillRect(0, 0, 512, 512);
  let seme = 7; const caso = () => (seme = (seme * 16807) % 2147483647) / 2147483647;
  for (let r = 60; r < 256; r += 1.6 + caso() * 1.4) {
    g.strokeStyle = `rgba(${caso() < 0.5 ? '255,255,255' : '70,110,95'},${0.08 + caso() * 0.16})`;
    g.lineWidth = 0.6 + caso() * 0.8;
    g.beginPath(); g.arc(r0, r0, r, 0, Math.PI * 2); g.stroke();
  }
  // una giunta di nastro rosso: rende visibile la rotazione
  g.save(); g.translate(r0, r0); g.rotate(-0.4);
  g.fillStyle = 'rgba(214,37,45,.85)'; g.fillRect(150, -7, 100, 14);
  g.restore();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

function telaStampa(pathLogo) {
  // una prova di stampa: barre colore, crocini di registro e quattro soggetti in ripetizione
  const W = 2048, H = 512, c = document.createElement('canvas');
  c.width = W; c.height = H;
  const g = c.getContext('2d');
  const logo = pathLogo ? new Path2D(pathLogo) : null;
  const disegnaLogo = (x, y, larghezza, colore) => {
    if (!logo) return;
    const s = larghezza / 8252;
    g.save(); g.translate(x, y); g.scale(s, s); g.fillStyle = colore; g.fill(logo); g.restore();
  };
  const barre = ['#00a3e0', '#e4007c', '#ffe500', '#16161a', '#d6252d', '#c9a046'];
  for (let x = 14, i = 0; x < W; x += 34, i++) {
    g.fillStyle = barre[i % barre.length];
    g.fillRect(x, 14, 22, 22); g.fillRect(x + 6, H - 36, 22, 22);
  }
  const registro = (x, y) => {
    g.strokeStyle = '#16161a'; g.lineWidth = 2.5;
    g.beginPath(); g.arc(x, y, 13, 0, Math.PI * 2); g.moveTo(x - 22, y); g.lineTo(x + 22, y); g.moveTo(x, y - 22); g.lineTo(x, y + 22); g.stroke();
  };
  const tondo = (x, y, w, h, r) => { g.beginPath(); g.roundRect(x, y, w, h, r); };
  for (let k = 0; k < 4; k++) {
    const x0 = k * 512, px = x0 + 52, py = 66, pw = 408, ph = 380;
    registro(x0 + 24, 256);
    g.save(); tondo(px, py, pw, ph, 28); g.clip();
    if (k === 0) { // rosso marchio
      g.fillStyle = '#d6252d'; g.fillRect(px, py, pw, ph);
      g.fillStyle = 'rgba(255,255,255,.12)';
      for (let i = -ph; i < pw; i += 46) { g.beginPath(); g.moveTo(px + i, py + ph); g.lineTo(px + i + ph, py); g.lineTo(px + i + ph + 18, py); g.lineTo(px + i + 18, py + ph); g.fill(); }
      disegnaLogo(px + 34, py + 210, 340, '#fff');
      g.fillStyle = '#fff'; g.font = '600 30px Archivo, sans-serif'; g.fillText('Impresa familiare dal 1958', px + 36, py + 262);
    } else if (k === 1) { // carta da caramella a righe
      g.fillStyle = '#f4efe2'; g.fillRect(px, py, pw, ph);
      const righe = ['#1c2b4a', '#d6252d', '#c9a046'];
      for (let i = 0; i < 14; i++) { g.fillStyle = righe[i % 3]; g.fillRect(px + i * 30, py, 12, ph); }
      g.fillStyle = '#f4efe2'; g.beginPath(); g.arc(px + pw / 2, py + ph / 2, 110, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#1c2b4a'; g.font = '800 64px Archivo, sans-serif'; g.textAlign = 'center';
      g.fillText('1958', px + pw / 2, py + ph / 2 + 22); g.textAlign = 'left';
    } else if (k === 2) { // blu notte con lune, come l'incarto dei panettoni
      g.fillStyle = '#1c2b4a'; g.fillRect(px, py, pw, ph);
      g.fillStyle = '#c9a046';
      for (let i = 0; i < 9; i++) for (let j = 0; j < 6; j++) {
        const cx = px + 30 + i * 46 + (j % 2) * 23, cy = py + 34 + j * 64;
        g.beginPath(); g.arc(cx, cy, 11, 0.6, Math.PI * 1.6 + 0.6); g.arc(cx + 5, cy - 3, 9, Math.PI * 1.6 + 0.6, 0.6, true); g.fill();
      }
      g.fillStyle = 'rgba(28,43,74,.9)'; g.fillRect(px, py + 140, pw, 100);
      disegnaLogo(px + 44, py + 210, 320, '#c9a046');
    } else { // oro con fascia bianca
      const oro = g.createLinearGradient(px, py, px + pw, py + ph);
      oro.addColorStop(0, '#8f6d24'); oro.addColorStop(0.45, '#f1d27a'); oro.addColorStop(0.55, '#d9b452'); oro.addColorStop(1, '#7d5c1b');
      g.fillStyle = oro; g.fillRect(px, py, pw, ph);
      g.fillStyle = '#fff'; g.fillRect(px, py + 150, pw, 80);
      g.fillStyle = '#d6252d'; g.font = '800 46px Archivo, sans-serif'; g.fillText('Film flessibili', px + 30, py + 206);
    }
    g.restore();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace; t.wrapS = THREE.RepeatWrapping; t.wrapT = THREE.ClampToEdgeWrapping;
  return t;
}

export async function avvia({ sezione, tela, fermo = false }) {
  const renderer = new THREE.WebGLRenderer({ canvas: tela, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.setClearColor(0x000000, 0);

  const scena = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scena.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  pmrem.dispose();
  const luce = new THREE.DirectionalLight(0xffffff, 1.6); luce.position.set(4, 6, 5); scena.add(luce);
  const controluce = new THREE.DirectionalLight(0xffd6da, 0.9); controluce.position.set(-5, 2, -4); scena.add(controluce);

  const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 80);

  try { await document.fonts.load('800 46px Archivo'); } catch (e) { /* si stampa col font di sistema */ }
  const pathLogo = document.querySelector('#logo path')?.getAttribute('d');
  const stampa = telaStampa(pathLogo);
  stampa.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  const anelli = telaAnelli();

  // ---------- la bobina: quattro tronchi impilati che la taglierina separerà ----------
  const bobina = new THREE.Group(); scena.add(bobina);
  const matAvvolto = new THREE.MeshPhysicalMaterial({
    color: 0xd4e6df, roughness: 0.14, metalness: 0.05, clearcoat: 1, clearcoatRoughness: 0.06,
    iridescence: 0.75, iridescenceIOR: 1.45, iridescenceThicknessRange: [180, 620],
  });
  const matFianco = new THREE.MeshPhysicalMaterial({ map: anelli, roughness: 0.32, clearcoat: 0.7, clearcoatRoughness: 0.2 });
  const matAnima = new THREE.MeshStandardMaterial({ color: 0xa9804f, roughness: 0.88, side: THREE.DoubleSide });
  const tronchi = [];
  for (let k = 0; k < STRISCE; k++) {
    const g = new THREE.Group();
    const lato = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 1, 96, 1, true), matAvvolto);
    const sopra = new THREE.Mesh(new THREE.RingGeometry(0.3, 1, 96, 1), matFianco);
    const sotto = new THREE.Mesh(new THREE.RingGeometry(0.3, 1, 96, 1), matFianco);
    sopra.rotation.x = -Math.PI / 2; sotto.rotation.x = Math.PI / 2;
    const anima = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 1, 48, 1, true), matAnima);
    g.add(lato, sopra, sotto, anima);
    bobina.add(g);
    tronchi.push({ g, lato, sopra, sotto, anima });
  }

  // rullo di stampa e lame della taglierina
  const matCromo = new THREE.MeshStandardMaterial({ color: 0xdfe4e8, metalness: 1, roughness: 0.18 });
  const rullo = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 1, 40), matCromo); scena.add(rullo);
  const lame = [];
  for (let k = 0; k < STRISCE - 1; k++) {
    const l = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.012, 48), matCromo);
    scena.add(l); lame.push(l);
  }

  // ---------- il film: un nastro che si aggiorna a ogni fotogramma ----------
  const N = innerWidth < 960 ? 120 : 170, M = 2;
  const perStriscia = (N + 1) * (M + 1), totale = STRISCE * perStriscia;
  const pos = new Float32Array(totale * 3), nor = new Float32Array(totale * 3), uv = new Float32Array(totale * 2), aS = new Float32Array(totale);
  const indici = [];
  for (let k = 0; k < STRISCE; k++) {
    const base = k * perStriscia;
    for (let i = 0; i <= N; i++) for (let j = 0; j <= M; j++) {
      const v = base + i * (M + 1) + j;
      aS[v] = i / N;
      uv[v * 2 + 1] = (k * M + j) / (STRISCE * M);
      if (i < N && j < M) { const b = v + M + 1; indici.push(v, b, v + 1, b, b + 1, v + 1); }
    }
  }
  const geoFilm = new THREE.BufferGeometry();
  geoFilm.setAttribute('position', new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage));
  geoFilm.setAttribute('normal', new THREE.BufferAttribute(nor, 3).setUsage(THREE.DynamicDrawUsage));
  geoFilm.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  geoFilm.setAttribute('aS', new THREE.BufferAttribute(aS, 1));
  geoFilm.setIndex(indici);

  const uniformi = { uPrintA: { value: STAZIONE }, uPrintB: { value: STAZIONE }, uStation: { value: 0 }, uTaglio: { value: 0 } };
  const matFilm = new THREE.MeshPhysicalMaterial({
    color: 0xe9f5f0, map: stampa, transparent: true, opacity: 0.22, depthWrite: false, side: THREE.DoubleSide,
    roughness: 0.1, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.05,
    iridescence: 1, iridescenceIOR: 1.6, iridescenceThicknessRange: [220, 820], envMapIntensity: 1.5,
  });
  matFilm.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, uniformi);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nattribute float aS;\nvarying float vS;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvS = aS;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying float vS;\nuniform float uPrintA;\nuniform float uPrintB;\nuniform float uStation;\nuniform float uTaglio;')
      .replace('#include <map_fragment>', `
#ifdef USE_MAP
  vec4 tinta = texture2D( map, vMapUv );
  float stampato = smoothstep( uPrintA, uPrintA + 0.006, vS ) * ( 1.0 - smoothstep( uPrintB - 0.012, uPrintB, vS ) );
  float k = tinta.a * stampato;
  diffuseColor.rgb = mix( diffuseColor.rgb, tinta.rgb, k );
  diffuseColor.a = mix( diffuseColor.a, 0.97, k );
  float riga = ( 1.0 - smoothstep( 0.0, 0.0035, abs( vS - uPrintA ) ) ) * uStation;
  diffuseColor.rgb = mix( diffuseColor.rgb, vec3( 1.0, 0.22, 0.26 ), riga );
  diffuseColor.a = max( diffuseColor.a, riga );
  // i bordi del film (e, dopo i coltelli, i bordi di ogni striscia) prendono la luce
  float yv = vMapUv.y;
  float esterno = 1.0 - smoothstep( 0.0, 0.008, min( yv, 1.0 - yv ) );
  float interno = ( 1.0 - smoothstep( 0.0, 0.008, abs( fract( yv * 4.0 + 0.5 ) - 0.5 ) / 4.0 ) ) * uTaglio * smoothstep( ${COLTELLI.toFixed(3)}, ${(COLTELLI + 0.05).toFixed(3)}, vS );
  float filo = max( esterno, interno ) * smoothstep( 0.0, 0.02, vS );
  diffuseColor.rgb = mix( diffuseColor.rgb, vec3( 1.0 ), filo * 0.75 );
  diffuseColor.a = max( diffuseColor.a, filo * 0.8 );
#endif`);
  };
  const film = new THREE.Mesh(geoFilm, matFilm);
  film.frustumCulled = false;
  film.renderOrder = 2;
  scena.add(film);

  // ---------- stato ----------
  let imp = IMPAGINAZIONI.schermo, larghezza = 1, altezza = 1;
  let raggioCostruito = -1;
  const camPos = new THREE.Vector3(), camMira = new THREE.Vector3();
  const percorso = { x: new Float32Array(N + 1), y: new Float32Array(N + 1), z: new Float32Array(N + 1), th: new Float32Array(N + 1), dy: new Float32Array(N + 1) };
  const T = new THREE.Vector3(), Nh = new THREE.Vector3(), Wd = new THREE.Vector3(), No = new THREE.Vector3(), UP = new THREE.Vector3(0, 1, 0), P = new THREE.Vector3();

  function ridimensiona() {
    larghezza = tela.clientWidth || innerWidth; altezza = tela.clientHeight || innerHeight;
    const tel = larghezza < 960;
    imp = tel ? IMPAGINAZIONI.telefono : IMPAGINAZIONI.schermo;
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, tel ? 1.5 : 2));
    renderer.setSize(larghezza, altezza, false);
    camera.aspect = larghezza / altezza; camera.fov = imp.fov;
    // su schermi più stretti del previsto allontana un po' la camera
    camera.zoom = tel ? clamp((larghezza / altezza) / 0.46, 0.82, 1.15) : clamp((larghezza / altezza) / 1.6, 0.85, 1.1);
    camera.clearViewOffset();
    if (!tel) {
      // la bobina deve stare a destra della colonna di testo e alla sua altezza: si sposta l'inquadratura, non la scena
      const colonna = [...sezione.querySelectorAll('.mestiere__titolo, .passi')].map((e) => e.getBoundingClientRect());
      const base = tela.getBoundingClientRect();
      const bordo = Math.max(...colonna.map((r) => r.right)) - base.left;
      const mezzo = (colonna[0].top + colonna[colonna.length - 1].bottom) / 2 - base.top;
      camera.position.copy(imp.camera[0]); camera.lookAt(imp.mira[0]); camera.updateMatrixWorld();
      const sx = (P.set(imp.centro.x - imp.raggio, imp.centro.y + imp.altezza / 2, imp.centro.z).project(camera).x + 1) / 2 * larghezza;
      const sy = (1 - P.copy(imp.centro).project(camera).y) / 2 * altezza;
      const dx = clamp(bordo + 56 - sx, 0, larghezza * 0.3), dy = clamp(mezzo - sy, -altezza * 0.15, altezza * 0.15);
      if (dx || dy) camera.setViewOffset(larghezza, altezza, -dx, -dy, larghezza, altezza);
    }
    for (const t of tronchi) {
      const h = imp.altezza / STRISCE;
      t.anima.geometry.dispose(); t.anima.geometry = new THREE.CylinderGeometry(imp.nucleo, imp.nucleo, h * 1.002, 48, 1, true);
      t.lato.scale.y = h; t.sopra.position.y = h / 2; t.sotto.position.y = -h / 2;
    }
    rullo.scale.y = imp.altezza * 1.06;
    raggioCostruito = -1;
    geoFilm.userData.uvFatte = false;
  }

  function costruisciRaggio(R) {
    if (Math.abs(R - raggioCostruito) < 0.004) return;
    raggioCostruito = R;
    for (const t of tronchi) {
      t.lato.scale.x = t.lato.scale.z = R;
      for (const anello of [t.sopra, t.sotto]) { anello.geometry.dispose(); anello.geometry = new THREE.RingGeometry(imp.nucleo, R, 96, 1); }
    }
  }

  function progresso() {
    const r = sezione.getBoundingClientRect();
    const corsa = r.height - innerHeight;
    return corsa > 0 ? clamp(-r.top / corsa, 0, 1) : 0;
  }

  function aggiorna(t, p) {
    const { centro, raggio, altezza: W, lunghezza: L } = imp;
    const R = mix(raggio, raggio * 0.7, liscio(0.05, 0.95, p));
    costruisciRaggio(R);

    // avanzamento del film: lento da solo, molto di più con lo scroll
    const avanzato = t * 0.16 + p * 7.5;
    bobina.position.copy(centro);
    bobina.rotation.y = avanzato / R;

    const taglio = liscio(0.68, 0.9, p);
    const varco = taglio * W * 0.075;
    tronchi.forEach((tr, k) => { tr.g.position.y = (k - (STRISCE - 1) / 2) * (W / STRISCE + varco); });

    // percorso del film: la curvatura viaggia lungo il nastro come un'onda
    const du = L / N;
    let x = centro.x, z = centro.z + R, th = 0;
    for (let i = 0; i <= N; i++) {
      const u = i * du;
      const inv = liscio(0, 1.4, u);
      percorso.x[i] = x; percorso.z[i] = z; percorso.th[i] = th;
      const y = centro.y + inv * 0.16 * Math.sin(0.9 * u - t * 1.25) - imp.caduta * u * u;
      percorso.y[i] = y;
      const kappa = inv * (imp.curva + imp.onda * Math.sin(0.72 * u - t * 1.05 - avanzato * 0.35) + 0.1 * Math.sin(1.6 * u + t * 0.7));
      th += kappa * du;
      x += Math.cos(th) * du; z += Math.sin(th) * du;
    }
    for (let i = 0; i <= N; i++) {
      const a = Math.max(0, i - 1), b = Math.min(N, i + 1);
      percorso.dy[i] = (percorso.y[b] - percorso.y[a]) / ((b - a) * du);
    }

    const meta = W / STRISCE / 2;
    for (let k = 0; k < STRISCE; k++) {
      const centroStriscia = (k + 0.5) / STRISCE * W - W / 2;
      const scarto = (k - (STRISCE - 1) / 2);
      for (let i = 0; i <= N; i++) {
        const u = i * du, th = percorso.th[i];
        const inv = liscio(0, 2, u);
        const torsione = inv * (0.2 * Math.sin(0.55 * u - t * 0.9) + scarto * taglio * 0.05 * Math.sin(0.8 * u - t * 1.3 + k));
        T.set(Math.cos(th), percorso.dy[i], Math.sin(th)).normalize();
        Nh.set(-Math.sin(th), 0, Math.cos(th));
        Wd.copy(UP).multiplyScalar(Math.cos(torsione)).addScaledVector(Nh, Math.sin(torsione));
        No.crossVectors(T, Wd).normalize();
        // dopo i coltelli le strisce si allontanano e prendono ognuna la sua onda
        const dopo = liscio(COLTELLI, COLTELLI + 0.08, i / N);
        const apertura = scarto * varco * (1 + u * 0.12) * dopo;
        const sbandata = taglio * dopo * 0.12 * Math.sin(0.7 * u - t * 1.6 + k * 1.7);
        for (let j = 0; j <= M; j++) {
          const v = k * perStriscia + i * (M + 1) + j;
          const off = centroStriscia + (j / M * 2 - 1) * meta + apertura + scarto * varco * (1 - dopo);
          pos[v * 3] = percorso.x[i] + Wd.x * off + No.x * sbandata;
          pos[v * 3 + 1] = percorso.y[i] + Wd.y * off + No.y * sbandata;
          pos[v * 3 + 2] = percorso.z[i] + Wd.z * off + No.z * sbandata;
          nor[v * 3] = No.x; nor[v * 3 + 1] = No.y; nor[v * 3 + 2] = No.z;
          uv[v * 2] = (u + 0) / (W * 4);
        }
      }
    }
    geoFilm.attributes.position.needsUpdate = true;
    geoFilm.attributes.normal.needsUpdate = true;
    if (!geoFilm.userData.uvFatte) { geoFilm.attributes.uv.needsUpdate = true; geoFilm.userData.uvFatte = true; }
    stampa.offset.x = -avanzato / (W * 4);

    // stampa: il fronte stampato parte dalla stazione e corre verso la fine del film
    const fase2 = liscio(0.3, 0.66, p);
    uniformi.uPrintA.value = STAZIONE;
    uniformi.uPrintB.value = STAZIONE + fase2 * (1.05 - STAZIONE);
    uniformi.uStation.value = liscio(0.26, 0.36, p);
    matFilm.opacity = mix(0.22, 0.3, fase2);
    uniformi.uTaglio.value = taglio;

    // rullo di stampa accanto al film, alla stazione
    const iS = Math.round(STAZIONE * N);
    const thS = percorso.th[iS];
    const comparsa = liscio(0.25, 0.38, p);
    rullo.visible = comparsa > 0.01;
    rullo.position.set(percorso.x[iS] - Math.sin(thS) * 0.13, percorso.y[iS], percorso.z[iS] + Math.cos(thS) * 0.13);
    rullo.scale.x = rullo.scale.z = comparsa;
    rullo.rotation.y = -avanzato / 0.11;

    // lame della taglierina, tra una striscia e l'altra
    const iC = Math.round(COLTELLI * N), thC = percorso.th[iC];
    lame.forEach((l, k) => {
      const off = (k + 1) / STRISCE * W - W / 2;
      l.visible = taglio > 0.01;
      l.position.set(percorso.x[iC], percorso.y[iC] + off, percorso.z[iC]);
      l.scale.setScalar(taglio);
    });

    // camera: si allontana mentre il film si trasforma, con un respiro lento
    const q = liscio(0, 1, p);
    camPos.lerpVectors(imp.camera[0], imp.camera[1], q);
    camMira.lerpVectors(imp.mira[0], imp.mira[1], q);
    camPos.x += Math.sin(t * 0.21) * 0.25; camPos.y += Math.sin(t * 0.17) * 0.12;
    camera.position.copy(camPos); camera.lookAt(camMira);
  }

  ridimensiona();
  new ResizeObserver(() => { ridimensiona(); richiedi(); }).observe(tela);

  let tempo = 0, ultimo = performance.now(), raf = 0, visibile = true, pronta = false;
  function disegna() {
    aggiorna(tempo, progresso());
    renderer.render(scena, camera);
    if (!pronta) { pronta = true; sezione.classList.add('pronta'); }
  }
  function ciclo() {
    raf = 0;
    if (!visibile || document.hidden) return;
    const ora = performance.now();
    tempo += Math.min(0.05, (ora - ultimo) / 1000);
    ultimo = ora;
    disegna();
    raf = requestAnimationFrame(ciclo);
  }
  function richiedi() {
    if (fermo) { if (!raf) raf = requestAnimationFrame(() => { raf = 0; disegna(); }); return; }
    if (!raf && visibile && !document.hidden) { ultimo = performance.now(); raf = requestAnimationFrame(ciclo); }
  }
  new IntersectionObserver((voci) => {
    visibile = voci[0].isIntersecting;
    if (visibile) richiedi();
  }, { rootMargin: '120px 0px' }).observe(sezione);
  document.addEventListener('visibilitychange', richiedi);
  if (fermo) addEventListener('scroll', richiedi, { passive: true });
  richiedi();
  disegna();
}
