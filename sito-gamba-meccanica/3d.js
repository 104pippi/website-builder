/* Gamba S.r.l. — demo. Il tornio: una barra grezza diventa la valvola in ETG 88 mentre si scorre.
   Fasi legate allo scroll (0→1): tornitura, fresatura dei fori, brunitura e rettifica, controllo. */
import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";

const L = 4.0;          // lunghezza del pezzo (200 mm)
const R0 = 0.78;        // raggio della barra grezza
const RB = 0.36;        // raggio del foro interno
const RIGHE_FORI = [2.69, 2.27, 1.64, 1.22];

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const tratto = (p, a, b) => clamp((p - a) / (b - a), 0, 1);
const liscio = (t) => t * t * (3 - 2 * t);
const avvicina = (v, obiettivo, dt, k) => v + (obiettivo - v) * (1 - Math.exp(-dt * k));

/* profilo esterno (r, y) dal mandrino all'estremità libera, poi faccia frontale e smusso del foro */
function profilo() {
  const p = [[0.62, 0], [0.66, 0.04]];
  let y = 0.04;
  for (let i = 0; i < 7; i++) {
    p.push([0.66, y + 0.07], [0.57, y + 0.07], [0.57, y + 0.125], [0.66, y + 0.125]);
    y += 0.125;
  }
  p.push([0.66, 0.96], [0.6, 0.96], [0.6, 1.9], [0.645, 1.9], [0.645, 2.04], [0.6, 2.04],
    [0.6, 2.92], [0.55, 2.92], [0.55, 3.0], [0.68, 3.0], [0.68, 3.92], [0.64, L],
    [0.4, L], [RB, L - 0.04]);
  return p;
}
const PROFILO = profilo();
const ESTERNO = PROFILO.slice(0, PROFILO.length - 2);

/* raggio finito alla quota y (il massimo, sui gradini) */
function raggioFinito(y) {
  y = clamp(y, 0, L);
  let r = 0;
  for (let i = 0; i < ESTERNO.length - 1; i++) {
    const [r1, y1] = ESTERNO[i], [r2, y2] = ESTERNO[i + 1];
    if (y < Math.min(y1, y2) - 1e-6 || y > Math.max(y1, y2) + 1e-6) continue;
    const v = y2 === y1 ? Math.max(r1, r2) : r1 + (r2 - r1) * (y - y1) / (y2 - y1);
    r = Math.max(r, v);
  }
  return r;
}
function raggioMassimo(y0, y1) {
  let r = 0;
  for (let i = 0; i <= 8; i++) r = Math.max(r, raggioFinito(y0 + (y1 - y0) * i / 8));
  return r;
}

function geometriaPezzo(S) {
  const righe = [];
  const capo = PROFILO.length - 3;
  for (let i = 0; i < PROFILO.length - 1; i++) {
    const [r1, y1] = PROFILO[i], [r2, y2] = PROFILO[i + 1];
    const dr = r2 - r1, dy = y2 - y1, len = Math.hypot(dr, dy);
    const nr = dy / len, ny = -dr / len;
    const n = Math.max(1, Math.ceil(Math.abs(dy) / 0.025));
    const faccia = i >= capo;
    for (let k = 0; k <= n; k++) {
      const t = k / n, r = r1 + dr * t;
      righe.push({ r, y: y1 + dy * t, nr, ny, seg: i, faccia, rs: faccia && !(i === capo && k === 0) ? r : R0 });
    }
  }
  const col = S + 1, nv = righe.length * col;
  const pos = new Float32Array(nv * 3), nor = new Float32Array(nv * 3);
  const grezzo = new Float32Array(nv), tipo = new Float32Array(nv);
  righe.forEach((g, a) => {
    for (let j = 0; j <= S; j++) {
      const th = (j / S) * Math.PI * 2, c = Math.cos(th), s = Math.sin(th), o = a * col + j;
      pos.set([g.r * c, g.y, g.r * s], o * 3);
      nor.set([g.nr * c, g.ny, g.nr * s], o * 3);
      grezzo[o] = g.rs;
      tipo[o] = g.faccia ? 1 : 0;
    }
  });
  const idx = [];
  for (let a = 0; a < righe.length - 1; a++) {
    if (righe[a].seg !== righe[a + 1].seg) continue;
    for (let j = 0; j < S; j++) {
      const p0 = a * col + j, p1 = p0 + 1, q0 = p0 + col, q1 = q0 + 1;
      idx.push(p0, q0, p1, p1, q0, q1);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  geo.setAttribute("normal", new THREE.BufferAttribute(nor, 3));
  geo.setAttribute("aGrezzo", new THREE.BufferAttribute(grezzo, 1));
  geo.setAttribute("aTipo", new THREE.BufferAttribute(tipo, 1));
  geo.setIndex(idx);
  geo.computeBoundingSphere();
  return geo;
}

function materialePezzo(uni) {
  const m = new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 1, roughness: 0.3, side: THREE.DoubleSide });
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, uni);
    sh.vertexShader = sh.vertexShader
      .replace("#include <common>", `#include <common>
        attribute float aGrezzo;
        attribute float aTipo;
        uniform float uToolY;
        varying vec3 vObj;`)
      .replace("#include <beginnormal_vertex>", `
        float tagliato = smoothstep(uToolY, uToolY + 0.06, position.y);
        vec2 dirXZ = normalize(position.xz + vec2(1e-6, 0.0));
        vec3 nRadiale = vec3(dirXZ.x, 0.0, dirXZ.y);
        vec3 objectNormal = normalize(mix(aTipo > 0.5 ? normal : nRadiale, normal, tagliato));
        #ifdef USE_TANGENT
          vec3 objectTangent = vec3(tangent.xyz);
        #endif`)
      .replace("#include <begin_vertex>", `
        vec3 transformed = vec3(position);
        transformed.xz = dirXZ * mix(aGrezzo, length(position.xz), tagliato);
        vObj = transformed;`);
    sh.fragmentShader = sh.fragmentShader
      .replace("#include <common>", `#include <common>
        uniform float uToolY;
        uniform float uGrindY;
        uniform float uOxide;
        uniform float uHoleT;
        varying vec3 vObj;
        float hsh(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
        float rum(vec2 p) {
          vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
          return mix(mix(hsh(i), hsh(i + vec2(1.0, 0.0)), f.x), mix(hsh(i + vec2(0.0, 1.0)), hsh(i + vec2(1.0, 1.0)), f.x), f.y);
        }`)
      .replace("#include <map_fragment>", `
        float gy = vObj.y;
        float gr = length(vObj.xz);
        float gang = atan(vObj.z, vObj.x);
        float taglio = step(uToolY, gy);
        float rett = step(uGrindY, gy) * taglio;
        float esterno = step(0.5, gr);
        float banda = esterno * (step(0.96, gy) * step(gy, 1.9) + step(2.04, gy) * step(gy, 2.92));
        float ossido = banda * uOxide * taglio;
        float bordo = 0.0;
        if (banda > 0.5 && uHoleT > 0.0) {
          float righe[4];
          righe[0] = ${RIGHE_FORI[0].toFixed(3)}; righe[1] = ${RIGHE_FORI[1].toFixed(3)};
          righe[2] = ${RIGHE_FORI[2].toFixed(3)}; righe[3] = ${RIGHE_FORI[3].toFixed(3)};
          for (int k = 0; k < 4; k++) {
            float ap = clamp(uHoleT * 4.0 - float(k), 0.0, 1.0);
            if (ap <= 0.0) continue;
            ap = 1.0 - pow(1.0 - ap, 3.0);
            float a = (gang / 6.2831853 + 0.5) * 10.0 + mod(float(k), 2.0) * 0.5;
            float du = (fract(a) - 0.5) * (6.2831853 * 0.6 / 10.0);
            float d = length(vec2(du, gy - righe[k]));
            float rr = 0.072 * ap;
            if (d < rr) discard;
            bordo = max(bordo, (1.0 - smoothstep(rr, rr * 1.5, d)) * ap);
          }
        }
        float macchia = rum(vec2(gang * 3.0, gy * 4.0)) * 0.5 + rum(vec2(gang * 34.0, gy * 1.6)) * 0.5;
        vec3 col = mix(vec3(0.2, 0.205, 0.215) * (0.7 + 0.55 * macchia), vec3(0.62, 0.63, 0.64), taglio);
        col = mix(col, vec3(0.88, 0.89, 0.9), rett);
        col = mix(col, vec3(0.018, 0.019, 0.022), ossido);
        col *= 1.0 - bordo * 0.85;
        diffuseColor.rgb = col;`)
      .replace("#include <roughnessmap_fragment>", `
        float roughnessFactor = mix(0.48 + 0.22 * macchia, 0.26 + 0.04 * rum(vec2(1.0, gy * 90.0)), taglio);
        roughnessFactor = mix(roughnessFactor, 0.06, rett);
        roughnessFactor = mix(roughnessFactor, 0.38, ossido);
        roughnessFactor = mix(roughnessFactor, 0.6, bordo);`)
      .replace("#include <metalnessmap_fragment>", `
        float metalnessFactor = mix(0.88, 1.0, taglio);`);
  };
  return m;
}

function texturaPuntini(colA, colB, w, h, n) {
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  const g = c.getContext("2d");
  g.fillStyle = colA; g.fillRect(0, 0, w, h);
  for (let i = 0; i < n; i++) {
    g.fillStyle = Math.random() < 0.5 ? colB : "rgba(255,255,255,0.35)";
    g.fillRect(Math.random() * w, Math.random() * h, 1 + Math.random() * 2, 1 + Math.random() * 2);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

function spritePunto() {
  const c = document.createElement("canvas");
  c.width = c.height = 32;
  const g = c.getContext("2d");
  const gr = g.createRadialGradient(16, 16, 0, 16, 16, 16);
  gr.addColorStop(0, "rgba(255,255,255,1)");
  gr.addColorStop(0.35, "rgba(255,255,255,0.6)");
  gr.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 32, 32);
  return new THREE.CanvasTexture(c);
}

export function avvia(contenitore, stato) {
  const telefono = Math.min(window.innerWidth, window.innerHeight) < 700;
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
  } catch (e) {
    return;
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, telefono ? 1.5 : 2));
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.domElement.setAttribute("aria-hidden", "true");
  contenitore.insertBefore(renderer.domElement, contenitore.firstChild);

  const scena = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scena.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  pmrem.dispose();

  const chiave = new THREE.DirectionalLight(0xffffff, 2.2);
  chiave.position.set(-3, 6, 6);
  const contro = new THREE.DirectionalLight(0xcfdcff, 1.5);
  contro.position.set(4, -3, -5);
  scena.add(chiave, contro);

  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
  const mondo = new THREE.Group();
  scena.add(mondo);

  /* pezzo, foro interno, codolo e mandrino: ruotano insieme */
  const uni = {
    uToolY: { value: L + 0.12 }, uGrindY: { value: L + 0.2 },
    uOxide: { value: 0 }, uHoleT: { value: 0 },
  };
  const mandrino = new THREE.Group();
  mondo.add(mandrino);
  const S = telefono ? 72 : 112;
  const pezzo = new THREE.Mesh(geometriaPezzo(S), materialePezzo(uni));
  mandrino.add(pezzo);

  const foro = new THREE.Mesh(
    new THREE.CylinderGeometry(RB, RB, L - 0.04, S, 1, true),
    new THREE.MeshStandardMaterial({ color: 0x24272a, metalness: 1, roughness: 0.45, side: THREE.BackSide })
  );
  foro.position.y = (L - 0.04) / 2;
  mandrino.add(foro);

  const matGrezzo = new THREE.MeshStandardMaterial({ map: texturaPuntini("#4a4e53", "#383b3f", 256, 64, 500), metalness: 0.88, roughness: 0.55 });
  const codolo = new THREE.Mesh(new THREE.CylinderGeometry(R0, R0, 0.38, S, 1, true), matGrezzo);
  codolo.position.y = -0.19;
  mandrino.add(codolo);

  const matMandrino = new THREE.MeshStandardMaterial({ color: 0x30353a, metalness: 0.9, roughness: 0.38 });
  const corpo = new THREE.Mesh(new THREE.CylinderGeometry(1.15, 1.15, 0.52, 72), matMandrino);
  corpo.position.y = -0.62;
  mandrino.add(corpo);
  const anello = new THREE.Mesh(new THREE.CylinderGeometry(1.02, 1.12, 0.04, 72), new THREE.MeshStandardMaterial({ color: 0x8a9095, metalness: 1, roughness: 0.25 }));
  anello.position.y = -0.345;
  mandrino.add(anello);
  for (let k = 0; k < 3; k++) {
    const griffa = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.34, 0.36), matMandrino);
    const a = (k / 3) * Math.PI * 2;
    griffa.position.set(Math.cos(a) * (R0 + 0.16), -0.17, Math.sin(a) * (R0 + 0.16));
    griffa.rotation.y = -a;
    mandrino.add(griffa);
  }

  /* utensile da tornio */
  const matScuro = new THREE.MeshStandardMaterial({ color: 0x2c3136, metalness: 0.85, roughness: 0.45 });
  const utensile = new THREE.Group();
  const stelo = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.22, 0.22), matScuro);
  stelo.position.set(0.86, 0.05, 0);
  const forma = new THREE.Shape();
  forma.moveTo(0, 0); forma.lineTo(0.17, 0.09); forma.lineTo(0.34, 0.0); forma.lineTo(0.17, -0.09); forma.closePath();
  const inserto = new THREE.Mesh(
    new THREE.ExtrudeGeometry(forma, { depth: 0.06, bevelEnabled: false }),
    new THREE.MeshStandardMaterial({ color: 0xc69a3c, metalness: 1, roughness: 0.32 })
  );
  inserto.position.set(0, 0, -0.03);
  utensile.add(stelo, inserto);
  utensile.rotation.z = -0.18;
  mondo.add(utensile);

  /* fresa */
  const fresa = new THREE.Group();
  const punta = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.62, 20), new THREE.MeshStandardMaterial({ color: 0xc7ccd0, metalness: 1, roughness: 0.2 }));
  punta.rotation.z = Math.PI / 2; punta.position.x = 0.31;
  const portautensile = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.26, 0.9, 32), matScuro);
  portautensile.rotation.z = Math.PI / 2; portautensile.position.x = 1.07;
  fresa.add(punta, portautensile);
  mondo.add(fresa);

  /* mola */
  const mola = new THREE.Group();
  const disco = new THREE.Mesh(
    new THREE.CylinderGeometry(0.9, 0.9, 0.42, 64),
    new THREE.MeshStandardMaterial({ map: texturaPuntini("#b7b3aa", "#6f6b63", 512, 64, 2600), metalness: 0, roughness: 0.95 })
  );
  const mozzo = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.5, 32), matScuro);
  mola.add(disco, mozzo);
  mondo.add(mola);

  /* tastatore della macchina di misura */
  const tastatore = new THREE.Group();
  const stilo = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.56, 12), new THREE.MeshStandardMaterial({ color: 0xd0d4d7, metalness: 1, roughness: 0.2 }));
  stilo.rotation.z = Math.PI / 2; stilo.position.x = 0.3;
  const rubino = new THREE.Mesh(new THREE.SphereGeometry(0.05, 24, 16), new THREE.MeshStandardMaterial({ color: 0xb3101e, metalness: 0.1, roughness: 0.15, emissive: 0x5a0008, emissiveIntensity: 0.6 }));
  rubino.position.x = 0.05;
  const testa = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 1.0, 32), new THREE.MeshStandardMaterial({ color: 0xdfe3e6, metalness: 0.3, roughness: 0.35 }));
  testa.rotation.z = Math.PI / 2; testa.position.x = 1.08;
  tastatore.add(stilo, rubino, testa);
  mondo.add(tastatore);

  /* trucioli e scintille */
  const MAX = 260;
  const pPos = new Float32Array(MAX * 3), pCol = new Float32Array(MAX * 3);
  const vel = new Float32Array(MAX * 3), base = new Float32Array(MAX * 3), vita = new Float32Array(MAX), vitaMax = new Float32Array(MAX).fill(1);
  pPos.fill(999);
  const geoP = new THREE.BufferGeometry();
  geoP.setAttribute("position", new THREE.BufferAttribute(pPos, 3));
  geoP.setAttribute("color", new THREE.BufferAttribute(pCol, 3));
  const punti = new THREE.Points(geoP, new THREE.PointsMaterial({
    size: telefono ? 0.085 : 0.07, map: spritePunto(), vertexColors: true, transparent: true,
    depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true,
  }));
  punti.frustumCulled = false;
  mondo.add(punti);
  let prossimo = 0;
  function emetti(x, y, z, vx, vy, vz, r, g, b, t) {
    const i = prossimo; prossimo = (prossimo + 1) % MAX;
    pPos.set([x, y, z], i * 3); vel.set([vx, vy, vz], i * 3); base.set([r, g, b], i * 3);
    vita[i] = vitaMax[i] = t;
  }
  const gravita = new THREE.Vector3();
  const quatInv = new THREE.Quaternion();
  function aggiornaParticelle(dt) {
    quatInv.copy(mondo.quaternion).invert();
    gravita.set(0, -6.5, 0).applyQuaternion(quatInv);
    for (let i = 0; i < MAX; i++) {
      if (vita[i] <= 0) { pCol[i * 3] = pCol[i * 3 + 1] = pCol[i * 3 + 2] = 0; continue; }
      vita[i] -= dt;
      const o = i * 3;
      vel[o] += gravita.x * dt; vel[o + 1] += gravita.y * dt; vel[o + 2] += gravita.z * dt;
      pPos[o] += vel[o] * dt; pPos[o + 1] += vel[o + 1] * dt; pPos[o + 2] += vel[o + 2] * dt;
      const f = Math.max(0, vita[i] / vitaMax[i]);
      pCol[o] = base[o] * f; pCol[o + 1] = base[o + 1] * f; pCol[o + 2] = base[o + 2] * f;
    }
    geoP.attributes.position.needsUpdate = true;
    geoP.attributes.color.needsUpdate = true;
  }

  /* inquadratura: verticale sul telefono, orizzontale su schermi larghi */
  let verticale = true, distanza = 16, larg = 1, alt = 1;
  function impagina() {
    larg = contenitore.clientWidth || window.innerWidth;
    alt = contenitore.clientHeight || window.innerHeight;
    renderer.setSize(larg, alt, false);
    camera.aspect = larg / alt;
    verticale = camera.aspect < 0.95;
    const t = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    if (verticale) {
      mondo.rotation.set(0, 0, 0);
      mondo.position.set(0, -1.45, 0);
      distanza = Math.max(5.3 / 0.6 / 2 / t, 3.2 / camera.aspect / 2 / t);
    } else {
      mondo.rotation.set(0, 0, Math.PI / 2);
      const largo = larg >= 1024;
      mondo.position.set(largo ? 2.55 : 1.6, -0.62, 0);
      distanza = Math.max(5.6 / (largo ? 0.56 : 0.72) / camera.aspect / 2 / t, 4.2 / 2 / t);
    }
    camera.updateProjectionMatrix();
  }
  impagina();
  if ("ResizeObserver" in window) new ResizeObserver(impagina).observe(contenitore);
  else window.addEventListener("resize", impagina);

  let puntX = 0, puntY = 0;
  if (window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
    window.addEventListener("pointermove", (e) => {
      puntX = e.clientX / window.innerWidth - 0.5;
      puntY = e.clientY / window.innerHeight - 0.5;
    }, { passive: true });
  }

  /* stato animato */
  let pS = stato.ridotto ? 1 : stato.p;
  let angolo = 0, vRot = 6, toolYPrima = L + 0.12;
  let px = 0, py = 0;
  const posUt = new THREE.Vector3(R0 + 2.5, L + 0.1, 0);
  const posFr = new THREE.Vector3(3.5, 2.5, 0);
  const posMo = new THREE.Vector3(4.5, L + 0.4, 0);
  const posTa = new THREE.Vector3(3.5, 3.4, 0);
  let tPrima = performance.now();
  let primo = true;

  function passo(ora, dt) {
    pS = stato.ridotto ? 1 : avvicina(pS, stato.p, dt, 7);
    const p = pS;

    /* fase 1: tornitura */
    const t1 = liscio(tratto(p, 0.02, 0.35));
    const toolY = L + 0.12 - t1 * (L + 0.14);
    uni.uToolY.value = toolY;
    const taglia = p < 0.36;
    let xUt = toolY > L - 0.005 ? R0 + 0.08 : raggioFinito(toolY);
    let obUt = taglia ? new THREE.Vector3(xUt, clamp(toolY, -0.02, L + 0.12), 0) : new THREE.Vector3(R0 + 2.8, 0.2, 0);
    if (p < 0.02) obUt.set(R0 + 0.6 - p * 20, L + 0.14, 0);
    posUt.x = avvicina(posUt.x, obUt.x, dt, 18);
    posUt.y = avvicina(posUt.y, obUt.y, dt, 22);
    utensile.position.copy(posUt);
    utensile.visible = posUt.x < R0 + 2.7;
    const velTaglio = Math.abs(toolY - toolYPrima) / Math.max(dt, 1e-3);
    toolYPrima = toolY;
    if (taglia && toolY < L && toolY > -0.01 && velTaglio > 0.02 && !stato.ridotto) {
      const n = Math.min(5, Math.floor(velTaglio * 2.2 + Math.random()));
      for (let i = 0; i < n; i++) {
        const caldo = Math.random() < 0.35;
        emetti(posUt.x + 0.02, posUt.y + 0.02, (Math.random() - 0.5) * 0.08,
          0.8 + Math.random() * 1.6, 0.6 + Math.random() * 1.8, 0.6 + Math.random() * 2.2,
          caldo ? 1.0 : 0.62, caldo ? 0.62 : 0.66, caldo ? 0.25 : 0.78, 0.5 + Math.random() * 0.5);
      }
    }

    /* fase 2: fresatura dei fori */
    const t2 = tratto(p, 0.4, 0.58);
    uni.uHoleT.value = t2;
    if (p > 0.385 && p < 0.6) {
      const k = Math.min(3, Math.floor(t2 * 4));
      const f = t2 * 4 - k;
      const affonda = Math.sin(Math.PI * clamp(f * 1.15, 0, 1));
      posFr.set(avvicina(posFr.x, 0.62 + 0.42 * (1 - affonda), dt, 14), avvicina(posFr.y, RIGHE_FORI[k], dt, 10), 0);
    } else {
      posFr.x = avvicina(posFr.x, 3.6, dt, 6);
    }
    fresa.position.copy(posFr);
    fresa.visible = posFr.x < 3.4;
    punta.rotation.x += dt * 40;

    /* fase 3: brunitura e rettifica */
    uni.uOxide.value = liscio(tratto(p, 0.59, 0.635));
    const t3 = tratto(p, 0.635, 0.8);
    const grindY = L + 0.25 - liscio(t3) * (L + 0.25 - 0.95);
    uni.uGrindY.value = t3 > 0 ? grindY : L + 0.3;
    const rettifica = p > 0.62 && p < 0.81;
    if (rettifica) {
      const rC = raggioMassimo(grindY - 0.2, grindY + 0.2);
      posMo.set(avvicina(posMo.x, rC + 0.9, dt, 12), avvicina(posMo.y, clamp(grindY, 0.95, L + 0.25), dt, 14), 0);
      if (t3 > 0 && t3 < 1 && !stato.ridotto) {
        for (let i = 0; i < 8; i++) {
          emetti(rC + 0.01, posMo.y + (Math.random() - 0.5) * 0.36, 0.02,
            -0.2 + Math.random() * 1.2, -0.5 + Math.random() * 1.6, 2.2 + Math.random() * 3.2,
            1.0, 0.55 + Math.random() * 0.3, 0.18, 0.35 + Math.random() * 0.45);
        }
      }
    } else {
      posMo.x = avvicina(posMo.x, 4.8, dt, 6);
    }
    mola.position.copy(posMo);
    mola.visible = posMo.x < 4.6;
    disco.rotation.y -= dt * 14;

    /* fase 4: controllo */
    const t4 = tratto(p, 0.82, 0.955);
    if (p > 0.81 && p < 0.965) {
      const quote = [3.45, 1.97, 0.5];
      const k = Math.min(2, Math.floor(t4 * 3));
      const f = t4 * 3 - k;
      const tocco = Math.sin(Math.PI * clamp(f * 1.1, 0, 1));
      const r = raggioFinito(quote[k]);
      posTa.set(avvicina(posTa.x, r + 0.05 + 0.5 * (1 - tocco), dt, 12), avvicina(posTa.y, quote[k], dt, 9), 0);
      rubino.material.emissiveIntensity = 0.5 + Math.pow(tocco, 8) * 2.5;
    } else {
      posTa.x = avvicina(posTa.x, 4.2, dt, 6);
    }
    tastatore.position.copy(posTa);
    tastatore.visible = posTa.x < 4.0;

    /* rotazione del pezzo: veloce quando si taglia, lenta quando si fora o si misura */
    const vOb = p < 0.37 ? 7 : p < 0.6 ? 0.45 : p < 0.81 ? 5 : 0.5;
    vRot = stato.ridotto ? 0 : avvicina(vRot, vOb, dt, 3);
    angolo += vRot * dt;
    mandrino.rotation.y = stato.ridotto ? 0.6 : angolo;

    /* camera: deriva lenta nel tempo, lo scroll la gira un poco, il mouse aggiunge un extra */
    const s = ora / 1000;
    px = avvicina(px, puntX, dt, 3); py = avvicina(py, puntY, dt, 3);
    const deriva = stato.ridotto ? 0 : 1;
    const phi = (verticale ? 0.38 : -0.32) + deriva * (0.12 * Math.sin(s * 0.17) + (p - 0.5) * 0.42) + px * 0.16;
    const theta = (verticale ? 0.2 : 0.16) + deriva * 0.05 * Math.sin(s * 0.11 + 1) + py * 0.08;
    const zoom = verticale ? 1 : 1 - 0.05 * liscio(tratto(p, 0.9, 1));
    camera.position.set(
      Math.sin(phi) * Math.cos(theta) * distanza * zoom,
      Math.sin(theta) * distanza * zoom,
      Math.cos(phi) * Math.cos(theta) * distanza * zoom
    );
    camera.lookAt(0, 0, 0);

    aggiornaParticelle(dt);
  }

  function disegna(ora) {
    const dt = Math.min(0.05, Math.max(0.001, (ora - tPrima) / 1000));
    tPrima = ora;
    passo(ora, dt);
    renderer.render(scena, camera);
    if (primo) { primo = false; contenitore.classList.add("pronto"); }
  }

  if (stato.ridotto) {
    const una = () => disegna(performance.now());
    una();
    if ("ResizeObserver" in window) new ResizeObserver(una).observe(contenitore);
    return;
  }

  let visibile = true, attivo = false;
  function ciclo() {
    if (!visibile || document.hidden) { attivo = false; return; }
    disegna(performance.now());
    requestAnimationFrame(ciclo);
  }
  function riparti() {
    if (attivo || !visibile || document.hidden) return;
    attivo = true;
    tPrima = performance.now();
    requestAnimationFrame(ciclo);
  }
  const sezione = contenitore.closest("section") || contenitore;
  if ("IntersectionObserver" in window) {
    new IntersectionObserver((voci) => {
      visibile = voci[0].isIntersecting;
      riparti();
    }, { rootMargin: "200px 0px" }).observe(sezione);
  }
  document.addEventListener("visibilitychange", riparti);
  disegna(performance.now());
  riparti();
}
