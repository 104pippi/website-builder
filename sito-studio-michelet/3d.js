/* Dalla vigna al dato: filari di una collina che, scorrendo, diventano un waterfall di cromatogrammi.
   Ogni filare è una riga: un "sipario" opaco nasconde le righe dietro, un nastro luminoso disegna il profilo. */
import * as THREE from 'three';

const ALTEZZE = /* glsl */`
  uniform float uTempo;
  uniform float uMorph;
  uniform float uScalaX;
  attribute float aX;
  attribute float aRiga;

  float hash(float n) { return fract(sin(n) * 43758.5453); }

  float collina(vec2 p) {
    float h = 0.55 * sin(0.42 * p.x + 0.33 * p.y + 0.6)
            + 0.32 * sin(0.85 * p.x - 0.47 * p.y + 2.1)
            + 0.16 * sin(1.6 * p.x + 0.8 * p.y + 4.0);
    h += 0.035 * sin(uTempo * 0.5 + p.x * 0.9 + p.y * 0.6);
    h += 0.03 * pow(abs(sin(p.x * 7.0 + aRiga * 3.0)), 10.0);   /* i pali dei filari */
    return h * 0.9 - 0.15;
  }

  const float PICCO_X[8] = float[8](-2.7, -1.9, -1.15, -0.55, 0.15, 0.9, 1.65, 2.5);
  const float PICCO_L[8] = float[8](0.10, 0.07, 0.13, 0.05, 0.09, 0.06, 0.12, 0.08);
  const float PICCO_H[8] = float[8](0.55, 1.15, 0.7, 1.55, 0.9, 1.25, 0.6, 0.85);

  float picchi(vec2 p) {
    float id = aRiga * 97.0;
    float y = 0.018 * sin(p.x * 9.0 + id) + 0.012 * sin(p.x * 23.0 - id * 2.0);
    for (int k = 0; k < 8; k++) {
      float fk = float(k);
      float onda = 0.5 + 0.5 * sin(aRiga * (5.0 + fk * 1.7) + fk * 2.3);
      float a = PICCO_H[k] * (0.25 + 0.75 * onda * onda) * (0.75 + 0.25 * hash(id + fk * 11.0));
      float d = (p.x - PICCO_X[k]) / PICCO_L[k];
      y += a * exp(-d * d);
    }
    return y * 0.95 - 0.55;
  }

  float morphRiga() {
    return smoothstep(0.0, 1.0, clamp(uMorph * 1.9 - aRiga * 0.9, 0.0, 1.0));
  }

  float altezza(float x, float z) {
    vec2 p = vec2(x / uScalaX, z);
    return mix(collina(p), picchi(p), morphRiga());
  }
`;

const VERT_NASTRO = /* glsl */`
  ${ALTEZZE}
  uniform vec2 uRis;
  uniform float uSpessore;
  attribute float aLato;
  varying float vAlt;
  varying float vLato;
  varying float vNebbia;
  varying float vScan;
  varying float vM;

  void main() {
    float z = position.z;
    float y = altezza(aX, z);
    float y2 = altezza(aX + 0.02, z);
    vec4 a = projectionMatrix * modelViewMatrix * vec4(aX, y, z, 1.0);
    vec4 b = projectionMatrix * modelViewMatrix * vec4(aX + 0.02, y2, z, 1.0);
    vec2 sa = a.xy / a.w * uRis;
    vec2 sb = b.xy / b.w * uRis;
    vec2 dir = normalize(sb - sa + 1e-6);
    vec2 nor = vec2(-dir.y, dir.x);
    a.xy += nor * aLato * uSpessore / uRis * a.w;
    gl_Position = a;
    vec4 mv = modelViewMatrix * vec4(aX, y, z, 1.0);
    vNebbia = exp(-length(mv.xyz) * 0.085);
    vAlt = y;
    vLato = aLato;
    vM = morphRiga();
    float testa = mod(uTempo * 0.9 + aRiga * 1.3, 9.0) - 4.5;   /* il rivelatore che "legge" ogni tracciato */
    vScan = exp(-pow((aX / uScalaX - testa) * 2.2, 2.0)) * vM;
  }
`;

const FRAG_NASTRO = /* glsl */`
  uniform vec3 uBasso;
  uniform vec3 uAlto;
  uniform vec3 uCollina;
  uniform vec3 uLuce;
  uniform vec3 uFondo;
  varying float vAlt;
  varying float vLato;
  varying float vNebbia;
  varying float vScan;
  varying float vM;

  void main() {
    float t = clamp((vAlt + 0.45) / 1.35, 0.0, 1.0);
    vec3 dati = mix(uBasso, uAlto, pow(t, 1.4));
    vec3 col = mix(uCollina, dati, vM);
    col = mix(col, uLuce, vScan * 0.85);
    float bordo = 1.0 - smoothstep(0.35, 1.0, abs(vLato));
    float luce = (0.55 + 0.45 * bordo) * (0.35 + 0.65 * vNebbia);
    gl_FragColor = vec4(mix(uFondo, col, luce), 1.0);
  }
`;

const VERT_SIPARIO = /* glsl */`
  ${ALTEZZE}
  attribute float aLato;
  varying float vGiu;
  varying float vNebbia;
  void main() {
    float z = position.z;
    float y = altezza(aX, z);
    float giu = aLato * 3.2;
    vGiu = giu;
    vec4 mv = modelViewMatrix * vec4(aX, y - giu, z, 1.0);
    vNebbia = exp(-length(mv.xyz) * 0.085);
    gl_Position = projectionMatrix * mv;
  }
`;

const FRAG_SIPARIO = /* glsl */`
  uniform vec3 uFondo;
  uniform vec3 uAlone;
  varying float vGiu;
  varying float vNebbia;
  void main() {
    float alone = exp(-vGiu * 3.5) * 0.55 * vNebbia;
    gl_FragColor = vec4(mix(uFondo, uAlone, alone), 1.0);
  }
`;

function costruisci(righe, punti, larghezza, zVicino, passo) {
  const crea = (laterale) => {
    const n = righe * punti * 2;
    const pos = new Float32Array(n * 3);
    const ax = new Float32Array(n);
    const ar = new Float32Array(n);
    const al = new Float32Array(n);
    const idx = [];
    let v = 0;
    for (let r = 0; r < righe; r++) {
      const z = zVicino - r * passo;
      for (let i = 0; i < punti; i++) {
        const x = -larghezza + (2 * larghezza * i) / (punti - 1);
        for (let s = 0; s < 2; s++) {
          pos[v * 3 + 2] = z;
          ax[v] = x;
          ar[v] = r / (righe - 1);
          al[v] = laterale ? (s === 0 ? -1 : 1) : s;
          v++;
        }
        if (i < punti - 1) {
          const base = (r * punti + i) * 2;
          idx.push(base, base + 1, base + 2, base + 1, base + 3, base + 2);
        }
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('aX', new THREE.BufferAttribute(ax, 1));
    g.setAttribute('aRiga', new THREE.BufferAttribute(ar, 1));
    g.setAttribute('aLato', new THREE.BufferAttribute(al, 1));
    g.setIndex(idx);
    g.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0, zVicino - (righe * passo) / 2), 40);
    return g;
  };
  return { nastro: crea(true), sipario: crea(false) };
}

export function avvia(canvas, stato, opzioni = {}) {
  const ridotto = !!opzioni.ridotto;
  const palco = canvas.parentElement;
  const mobile = Math.min(window.innerWidth, window.innerHeight) < 760;

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  } catch (e) {
    document.documentElement.classList.add('senza-webgl');
    return;
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, mobile ? 1.5 : 2));
  const fondo = new THREE.Color('#1F1027');
  renderer.setClearColor(fondo, 1);

  const scena = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(mobile ? 58 : 42, 1, 0.1, 80);

  const righe = mobile ? 38 : 54;
  const punti = mobile ? 150 : 220;
  const scalaX = Math.min(1, Math.max(0.42, (window.innerWidth / window.innerHeight) / 1.4));
  const geo = costruisci(righe, punti, 4.6 * scalaX, 1.6, mobile ? 0.4 : 0.3);

  const comuni = {
    uTempo: { value: 0 },
    uMorph: { value: 0 },
    uScalaX: { value: scalaX },
    uFondo: { value: fondo },
  };
  const ris = new THREE.Vector2(1, 1);
  const matNastro = new THREE.ShaderMaterial({
    vertexShader: VERT_NASTRO,
    fragmentShader: FRAG_NASTRO,
    uniforms: {
      ...comuni,
      uRis: { value: ris },
      uSpessore: { value: mobile ? 1.6 : 1.4 },
      uBasso: { value: new THREE.Color('#7A55A3') },
      uAlto: { value: new THREE.Color('#F6EBD2') },
      uCollina: { value: new THREE.Color('#B59AD6') },
      uLuce: { value: new THREE.Color('#FFF6DC') },
    },
    side: THREE.DoubleSide,
  });
  const matSipario = new THREE.ShaderMaterial({
    vertexShader: VERT_SIPARIO,
    fragmentShader: FRAG_SIPARIO,
    uniforms: { ...comuni, uAlone: { value: new THREE.Color('#4A2766') } },
    side: THREE.DoubleSide,
    polygonOffset: true,
    polygonOffsetFactor: 1,
    polygonOffsetUnits: 1,
  });
  const sipario = new THREE.Mesh(geo.sipario, matSipario);
  const nastro = new THREE.Mesh(geo.nastro, matNastro);
  sipario.frustumCulled = false;
  nastro.frustumCulled = false;
  scena.add(sipario, nastro);

  function ridimensiona() {
    const w = palco.clientWidth, h = palco.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    const pr = renderer.getPixelRatio();
    ris.set((w * pr) / 2, (h * pr) / 2);
  }
  ridimensiona();
  new ResizeObserver(ridimensiona).observe(palco);

  const guarda = new THREE.Vector3();
  let pLiscio = stato.p;
  const t0 = performance.now();

  function disegna(t, p) {
    const e = p * p * (3 - 2 * p);
    comuni.uTempo.value = t;
    comuni.uMorph.value = THREE.MathUtils.smoothstep(p, 0.1, 0.66);
    const lontano = mobile ? 1.15 : 1;
    camera.position.set(
      Math.sin(t * 0.13) * 0.35 + (e - 0.5) * 0.9,
      THREE.MathUtils.lerp(3.3, 1.15, e) * lontano,
      THREE.MathUtils.lerp(5.2, 2.7, e) * lontano
    );
    guarda.set((e - 0.5) * 0.4, THREE.MathUtils.lerp(0.0, 0.35, e), THREE.MathUtils.lerp(-4.5, -3.2, e));
    camera.lookAt(guarda);
    renderer.render(scena, camera);
  }

  if (ridotto) {
    disegna(0, 0.75);
    canvas.classList.add('pronto');
    return;
  }

  let visibile = true, attivo = true, rafId = 0;
  function giro() {
    rafId = 0;
    if (!visibile || !attivo) return;
    const t = (performance.now() - t0) / 1000;
    pLiscio += (stato.p - pLiscio) * 0.08;
    disegna(t, pLiscio);
    rafId = requestAnimationFrame(giro);
  }
  function riparti() { if (!rafId && visibile && attivo) rafId = requestAnimationFrame(giro); }

  new IntersectionObserver((v) => { visibile = v[0].isIntersecting; riparti(); }, { rootMargin: '200px 0px' }).observe(palco.parentElement);
  document.addEventListener('visibilitychange', () => { attivo = !document.hidden; riparti(); });

  disegna(0, pLiscio);
  canvas.classList.add('pronto');
  riparti();
}
