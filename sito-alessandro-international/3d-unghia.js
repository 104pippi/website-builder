/* Unghia 3D: lo strato di Striplac si solleva dalla cuticola, si arriccia e vola via,
   sotto c'è già il colore nuovo. Tempo da performance.now(), compatibile con il video. */
import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";

const LUNG = 1.6;          // lunghezza dell'unghia (asse y, cuticola in basso)
const ANG = 2.4;           // angolo massimo della piega prima del tratto dritto
const DURATA = 1750;       // ms di una sfilata

// mezza larghezza della forma a mandorla, v da 0 (cuticola) a 1 (punta)
function semiLarghezza(v) {
  if (v < 0.15) { const t = (0.15 - v) / 0.15; return 0.5 * Math.sqrt(Math.max(1 - t * t, 0)); }
  if (v < 0.56) return 0.5 + 0.012 * (v - 0.15);
  const t = (v - 0.56) / 0.44;
  return 0.505 * Math.pow(Math.max(1 - Math.pow(t, 2.1), 0), 0.58);
}

function geometriaUnghia() {
  const g = new THREE.PlaneGeometry(1, LUNG, 34, 92);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i);
    const v = (y + LUNG / 2) / LUNG;
    const nx = x * 2 * semiLarghezza(v);
    // curva a C trasversale e leggero arco longitudinale
    const z = -0.62 * nx * nx - 0.1 * (v - 0.45) * (v - 0.45);
    p.setXYZ(i, nx, y, z);
  }
  g.computeVertexNormals();
  return g;
}

function texturaUnghiaNaturale() {
  const c = document.createElement("canvas");
  c.width = 8; c.height = 256;
  const g = c.getContext("2d");
  const gr = g.createLinearGradient(0, 256, 0, 0); // il basso del canvas è la cuticola (v = 0)
  gr.addColorStop(0, "#f3ddd6");
  gr.addColorStop(0.14, "#f1d6cf");
  gr.addColorStop(0.2, "#e9c3bb");
  gr.addColorStop(0.74, "#e6bdb4");
  gr.addColorStop(0.8, "#f6ebe6");
  gr.addColorStop(1, "#fbf5f1");
  g.fillStyle = gr; g.fillRect(0, 0, 8, 256);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function texturaOmbra() {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const g = c.getContext("2d");
  const gr = g.createRadialGradient(64, 64, 4, 64, 64, 64);
  gr.addColorStop(0, "rgba(61,41,48,0.55)");
  gr.addColorStop(0.55, "rgba(61,41,48,0.18)");
  gr.addColorStop(1, "rgba(61,41,48,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(c);
}

function materialeLacca(offset) {
  const u = {
    uFront: { value: -LUNG / 2 - 0.05 },
    uR: { value: 0.085 },
    uVia: { value: 0 },
    uT: { value: 0 },
    uOff: { value: offset },
    uGlitter: { value: 0 },
    uOpacita: { value: 1 },
  };
  const m = new THREE.MeshPhysicalMaterial({
    color: 0x7b1823, roughness: 0.1, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.03,
    side: THREE.DoubleSide, transparent: true, polygonOffset: true, polygonOffsetFactor: -1 - offset * 400,
  });
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, u);
    sh.vertexShader = sh.vertexShader
      .replace("#include <common>", `#include <common>
        uniform float uFront; uniform float uR; uniform float uVia; uniform float uT; uniform float uOff;
        varying vec2 vNailPos;
        vec3 pelPos;`)
      .replace("#include <beginnormal_vertex>", `vec3 objectNormal = vec3( normal );
        {
          vec3 p = position + normal * uOff;
          float fr = uFront + 0.1 * p.x + 0.1 * p.x * p.x;
          float d = fr - p.y;
          vec3 n = normal;
          if ( d > 0.0 ) {
            float th = min( d / uR, ${ANG.toFixed(3)} );
            float y = fr - uR * sin( th );
            float z = uR * ( 1.0 - cos( th ) );
            float L = max( d - uR * ${ANG.toFixed(3)}, 0.0 );
            y += L * ${(-Math.cos(ANG)).toFixed(4)};
            z += L * ${Math.sin(ANG).toFixed(4)};
            z += sin( uT * 2.6 + d * 5.0 ) * 0.02 * min( d, 1.0 );
            p = vec3( p.x * ( 1.0 - 0.05 * min( d, 1.0 ) ), y, p.z + z );
            n = vec3( normal.x, normal.y * cos( th ) + normal.z * sin( th ), -normal.y * sin( th ) + normal.z * cos( th ) );
          }
          p += vec3( 0.35, 0.7, 1.1 ) * uVia * uVia * 1.5;
          pelPos = p;
          objectNormal = n;
        }
        vNailPos = position.xy;`)
      .replace("#include <begin_vertex>", "vec3 transformed = pelPos;");
    sh.fragmentShader = sh.fragmentShader
      .replace("#include <common>", `#include <common>
        uniform float uGlitter; uniform float uOpacita;
        varying vec2 vNailPos;
        float h21( vec2 q ) { q = fract( q * vec2( 123.34, 456.21 ) ); q += dot( q, q + 45.32 ); return fract( q.x * q.y ); }`)
      .replace("#include <color_fragment>", `#include <color_fragment>
        if ( !gl_FrontFacing ) diffuseColor.rgb = mix( diffuseColor.rgb, vec3( 1.0 ), 0.14 );
        if ( uGlitter > 0.0 ) {
          float s = step( 0.962, h21( floor( vNailPos * 210.0 ) ) );
          diffuseColor.rgb = mix( diffuseColor.rgb, vec3( 1.0 ), s * uGlitter );
        }
        diffuseColor.a *= uOpacita;`);
  };
  m.userData.u = u;
  return m;
}

function applicaFinitura(m, finitura) {
  const u = m.userData.u;
  if (finitura === "shimmer") { m.metalness = 0.45; m.roughness = 0.3; u.uGlitter.value = 0.12; }
  else if (finitura === "glitter") { m.metalness = 0.55; m.roughness = 0.28; u.uGlitter.value = 0.7; }
  else { m.metalness = 0; m.roughness = 0.1; u.uGlitter.value = 0; }
}

const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

export async function avvia(canvas, opz = {}) {
  const mobile = matchMedia("(max-width: 767px)").matches;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "high-performance" });
  if (!renderer.getContext()) throw new Error("WebGL assente");
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, mobile ? 1.5 : 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 1.0;

  const scena = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scena.environment = pmrem.fromScene(new RoomEnvironment(), 0.035).texture;
  scena.environmentIntensity = 0.95;
  const luce = new THREE.DirectionalLight(0xffffff, 1.6);
  luce.position.set(-2.2, 3.2, 4);
  scena.add(luce);

  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 50);
  camera.position.set(0, 0, 5);

  const geo = geometriaUnghia();
  const gruppo = new THREE.Group();
  scena.add(gruppo);

  const base = new THREE.Mesh(geo, new THREE.MeshPhysicalMaterial({
    map: texturaUnghiaNaturale(), roughness: 0.42, clearcoat: 0.55, clearcoatRoughness: 0.25, side: THREE.DoubleSide,
  }));
  const sotto = new THREE.Mesh(geo, materialeLacca(0.006));
  const sopra = new THREE.Mesh(geo, materialeLacca(0.012));
  sotto.visible = false;
  sotto.renderOrder = 1;
  sopra.renderOrder = 2;
  gruppo.add(base, sotto, sopra);

  const ombra = new THREE.Mesh(
    new THREE.PlaneGeometry(1.7, 2.3),
    new THREE.MeshBasicMaterial({ map: texturaOmbra(), transparent: true, depthWrite: false })
  );
  ombra.position.z = -0.42;
  gruppo.add(ombra);

  const imposta = (m, hex, fin) => { m.color.set(hex); applicaFinitura(m, fin); };
  imposta(sopra.material, opz.hex || "#7b1823", opz.finitura || "lucida");

  // inquadratura
  function adatta() {
    const r = canvas.parentElement.getBoundingClientRect();
    const w = Math.max(r.width, 1), h = Math.max(r.height, 1);
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    const t = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    const dist = Math.max(2.6 / (2 * t), 2.3 / (2 * t * camera.aspect));
    camera.position.set(0, 0.1, dist);
    camera.lookAt(0, 0.18, 0);
    camera.updateProjectionMatrix();
    disegna(performance.now());
  }

  // stato della sfilata
  let inizio = -1;
  let prossimo = null;
  let attivo = false;
  let visibile = true;
  const puntatore = { x: 0, y: 0, tx: 0, ty: 0 };
  if (matchMedia("(hover: hover) and (pointer: fine)").matches) {
    canvas.parentElement.addEventListener("pointermove", (e) => {
      const r = canvas.getBoundingClientRect();
      puntatore.tx = ((e.clientX - r.left) / r.width - 0.5) * 2;
      puntatore.ty = ((e.clientY - r.top) / r.height - 0.5) * 2;
    });
    canvas.parentElement.addEventListener("pointerleave", () => { puntatore.tx = puntatore.ty = 0; });
  }

  function partiSfilata(hex, fin) {
    imposta(sotto.material, hex, fin);
    sotto.visible = true;
    inizio = performance.now();
  }

  function disegna(ora) {
    const t = ora / 1000;
    const us = sopra.material.userData.u;
    us.uT.value = t;
    if (inizio >= 0) {
      const k = Math.min((ora - inizio) / DURATA, 1);
      us.uFront.value = -LUNG / 2 - 0.05 + easeInOut(Math.min(k / 0.82, 1)) * (LUNG + 0.25);
      const via = Math.max((k - 0.6) / 0.4, 0);
      us.uVia.value = via;
      us.uOpacita.value = 1 - Math.pow(via, 1.6);
      if (k >= 1) {
        sopra.material.color.copy(sotto.material.color);
        sopra.material.metalness = sotto.material.metalness;
        sopra.material.roughness = sotto.material.roughness;
        us.uGlitter.value = sotto.material.userData.u.uGlitter.value;
        us.uFront.value = -LUNG / 2 - 0.05; us.uVia.value = 0; us.uOpacita.value = 1;
        sotto.visible = false;
        inizio = -1;
        if (prossimo) { const p = prossimo; prossimo = null; partiSfilata(p.hex, p.fin); }
      }
    }
    puntatore.x += (puntatore.tx - puntatore.x) * 0.06;
    puntatore.y += (puntatore.ty - puntatore.y) * 0.06;
    gruppo.rotation.set(
      -0.78 + Math.sin(t * 0.5) * 0.045 + puntatore.y * 0.12,
      Math.sin(t * 0.37) * 0.07 + puntatore.x * 0.28,
      -0.46 + Math.sin(t * 0.6) * 0.06
    );
    gruppo.position.y = -0.22 + Math.sin(t * 0.9) * 0.035;
    renderer.render(scena, camera);
  }

  function ciclo() {
    if (!attivo) return;
    disegna(performance.now());
    requestAnimationFrame(ciclo);
  }
  function avviaCiclo() { if (!attivo && visibile && !document.hidden && !opz.fermo) { attivo = true; requestAnimationFrame(ciclo); } }
  function fermaCiclo() { attivo = false; }

  new IntersectionObserver((v) => { visibile = v[0].isIntersecting; visibile ? avviaCiclo() : fermaCiclo(); }).observe(canvas);
  document.addEventListener("visibilitychange", () => (document.hidden ? fermaCiclo() : avviaCiclo()));
  new ResizeObserver(adatta).observe(canvas.parentElement);
  adatta();
  avviaCiclo();

  return {
    colore(hex, fin = "lucida", subito = false) {
      if (subito || opz.fermo) {
        imposta(sopra.material, hex, fin);
        sotto.visible = false; inizio = -1;
        disegna(performance.now());
        return;
      }
      if (inizio >= 0) { prossimo = { hex, fin }; return; }
      partiSfilata(hex, fin);
    },
  };
}
