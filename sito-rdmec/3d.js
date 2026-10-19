/* R.D.MEC — compressore a vite in 3D.
   Rotore maschio a 4 lobi e femmina a 6 vani, a passo inverso: ingranano senza toccarsi
   (interasse 2,57, gioco minimo verificato 0,016). L'aria entra, si stringe nei vani e esce compressa.
   Lo guidano il tempo (rAF) e lo scroll; si ferma fuori schermo e con la scheda nascosta. */
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const TAU = Math.PI * 2;
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const sstep = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const lerp = (a, b, t) => a + (b - a) * t;

const RM = 1.0, RF = 1.5, D = 2.57, L = 6;
const LOBI_M = 4, LOBI_F = 6;
const GIRO_M = 1.55 * Math.PI;            // avvolgimento del maschio lungo la vite
const GIRO_F = -GIRO_M * LOBI_M / LOBI_F; // la femmina gira al contrario, più lenta
const profiloM = (t) => { const c = Math.cos(LOBI_M * t); return RM + (c >= 0 ? 0.34 * Math.pow(c, 0.55) : -0.36 * Math.pow(-c, 1.6)); };
const profiloF = (t) => { const c = Math.cos(LOBI_F * t); return RF - (c >= 0 ? 0.40 * Math.pow(c, 0.7) : -0.24 * Math.pow(-c, 1.8)); };

function geoVite(profilo, giro, segA, segL) {
  const pos = new Float32Array((segL + 1) * segA * 3);
  let k = 0;
  for (let j = 0; j <= segL; j++) {
    const z = -L / 2 + (L * j) / segL, tw = (giro * j) / segL;
    for (let i = 0; i < segA; i++) {
      const th = (i / segA) * TAU, r = profilo(th), a = th + tw;
      pos[k++] = r * Math.cos(a); pos[k++] = r * Math.sin(a); pos[k++] = z;
    }
  }
  const idx = [];
  for (let j = 0; j < segL; j++) {
    for (let i = 0; i < segA; i++) {
      const a = j * segA + i, b = j * segA + ((i + 1) % segA), c = (j + 1) * segA + i, d = (j + 1) * segA + ((i + 1) % segA);
      idx.push(a, b, c, b, d, c);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

function geoTappo(profilo, segA) {
  const s = new THREE.Shape();
  for (let i = 0; i <= segA; i++) {
    const th = (i / segA) * TAU, r = profilo(th);
    if (i === 0) s.moveTo(r * Math.cos(th), r * Math.sin(th)); else s.lineTo(r * Math.cos(th), r * Math.sin(th));
  }
  return new THREE.ShapeGeometry(s, 1);
}

function rotore(profilo, giro, mat, matAlbero, rAlbero, segA, segL) {
  const g = new THREE.Group();
  g.add(new THREE.Mesh(geoVite(profilo, giro, segA, segL), mat));
  const tappo = geoTappo(profilo, segA);
  const sopra = new THREE.Mesh(tappo, mat); sopra.position.z = L / 2; sopra.rotation.z = giro; g.add(sopra);
  const sotto = new THREE.Mesh(tappo, mat); sotto.position.z = -L / 2; sotto.rotation.x = Math.PI; g.add(sotto);
  const albero = new THREE.CylinderGeometry(rAlbero, rAlbero, 1.5, 40);
  const collare = new THREE.CylinderGeometry(rAlbero * 1.75, rAlbero * 1.75, 0.22, 48);
  for (const lato of [-1, 1]) {
    const a = new THREE.Mesh(albero, matAlbero); a.rotation.x = Math.PI / 2; a.position.z = lato * (L / 2 + 0.75); g.add(a);
    const c = new THREE.Mesh(collare, matAlbero); c.rotation.x = Math.PI / 2; c.position.z = lato * (L / 2 + 0.38); g.add(c);
  }
  return g;
}

function cassa() {
  const g = new THREE.Group();
  const m = new THREE.LineBasicMaterial({ color: 0x86a0c4, transparent: true, opacity: 0.3 });
  const cerchio = (cx, r, z) => {
    const p = [];
    for (let i = 0; i <= 120; i++) { const a = (i / 120) * TAU; p.push(new THREE.Vector3(cx + r * Math.cos(a), r * Math.sin(a), z)); }
    return new THREE.Line(new THREE.BufferGeometry().setFromPoints(p), m);
  };
  const rm = RM + 0.34 + 0.09, rf = RF + 0.24 + 0.09;
  for (const z of [-L / 2 - 0.06, L / 2 + 0.06]) { g.add(cerchio(-D / 2, rm, z)); g.add(cerchio(D / 2, rf, z)); }
  const linee = [];
  for (const [cx, r] of [[-D / 2, rm], [D / 2, rf]]) {
    for (const a of [Math.PI / 2, -Math.PI / 2]) {
      linee.push(new THREE.Vector3(cx + r * Math.cos(a), r * Math.sin(a), -L / 2 - 0.06), new THREE.Vector3(cx + r * Math.cos(a), r * Math.sin(a), L / 2 + 0.06));
    }
  }
  g.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(linee), m));
  return g;
}

const VERT = /* glsl */`
  attribute float aSize; attribute vec3 aCol; attribute float aAlpha;
  uniform float uScala;
  varying vec3 vCol; varying float vAlpha;
  void main() {
    vCol = aCol; vAlpha = aAlpha;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = aSize * uScala / -mv.z;
    gl_Position = projectionMatrix * mv;
  }`;
const FRAG = /* glsl */`
  varying vec3 vCol; varying float vAlpha;
  void main() {
    float r = length(gl_PointCoord - 0.5);
    float a = (smoothstep(0.5, 0.0, r) * 0.35 + smoothstep(0.26, 0.1, r)) * vAlpha;
    gl_FragColor = vec4(vCol, min(a, 1.0));
  }`;

export async function avvia({ sezione, canvas, ridotto }) {
  const mobile = Math.min(window.innerWidth, window.innerHeight) < 700;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, mobile ? 1.5 : 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.92;
  renderer.setClearColor(0x000000, 0);

  const scena = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scena.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  pmrem.dispose();

  const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);

  const luceRosa = new THREE.DirectionalLight(0xff3f8c, 3.2); luceRosa.position.set(5, 4, -5);
  const luceBlu = new THREE.DirectionalLight(0x4f9bff, 2.4); luceBlu.position.set(-6, -3, 3);
  const luceBianca = new THREE.DirectionalLight(0xffffff, 1.1); luceBianca.position.set(2, 6, 8);
  scena.add(luceRosa, luceBlu, luceBianca);

  const segA = mobile ? 112 : 160, segL = mobile ? 90 : 130;
  const matM = new THREE.MeshStandardMaterial({ color: 0xdce3ea, metalness: 1, roughness: 0.2 });
  const matF = new THREE.MeshStandardMaterial({ color: 0xa9b7c8, metalness: 1, roughness: 0.3 });
  const matAlbero = new THREE.MeshStandardMaterial({ color: 0x6f7d90, metalness: 1, roughness: 0.38 });
  const maschio = rotore(profiloM, GIRO_M, matM, matAlbero, 0.3, segA, segL);
  const femmina = rotore(profiloF, GIRO_F, matF, matAlbero, 0.34, segA, segL);
  maschio.position.x = -D / 2; femmina.position.x = D / 2;

  const gruppo = new THREE.Group();      // vite nel suo riferimento: asse z, rotori affiancati su x
  gruppo.add(maschio, femmina, cassa());
  const orienta = new THREE.Group();     // orientamento per schermo largo o stretto
  orienta.add(gruppo);
  const supporto = new THREE.Group();    // giro lento di camera con lo scroll
  supporto.add(orienta);
  scena.add(supporto);

  /* Aria: particelle che entrano, si stringono nei vani e escono */
  const N = mobile ? 1100 : 1800;
  const Z0 = -L / 2 - 3.4, Z1 = -L / 2, Z2 = L / 2, Z3 = L / 2 + 4.2;
  const pos = new Float32Array(N * 3), col = new Float32Array(N * 3), dim = new Float32Array(N), alfa = new Float32Array(N);
  const z = new Float32Array(N), sel = new Uint8Array(N), vano = new Uint8Array(N), u = new Float32Array(N);
  const raggio0 = new Float32Array(N), ang0 = new Float32Array(N), vel = new Float32Array(N), jet = new Float32Array(N * 2), base = new Float32Array(N);
  const nuova = (i, zIniziale) => {
    z[i] = zIniziale;
    sel[i] = Math.random() < 0.45 ? 0 : 1;
    vano[i] = Math.floor(Math.random() * (sel[i] ? LOBI_F : LOBI_M));
    u[i] = Math.random();
    raggio0[i] = 2.4 + Math.random() * 2.6;
    ang0[i] = Math.random() * TAU;
    vel[i] = 0.75 + Math.random() * 0.5;
    const a = Math.random() * TAU, r = Math.sqrt(Math.random()) * 0.28;
    jet[i * 2] = Math.cos(a) * r; jet[i * 2 + 1] = Math.sin(a) * r;
    base[i] = 0.13 + Math.random() * 0.13;
  };
  for (let i = 0; i < N; i++) nuova(i, lerp(Z0, Z3, Math.random()));
  const geoAria = new THREE.BufferGeometry();
  geoAria.setAttribute('position', new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage));
  geoAria.setAttribute('aCol', new THREE.BufferAttribute(col, 3).setUsage(THREE.DynamicDrawUsage));
  geoAria.setAttribute('aSize', new THREE.BufferAttribute(dim, 1).setUsage(THREE.DynamicDrawUsage));
  geoAria.setAttribute('aAlpha', new THREE.BufferAttribute(alfa, 1).setUsage(THREE.DynamicDrawUsage));
  const matAria = new THREE.ShaderMaterial({
    vertexShader: VERT, fragmentShader: FRAG, uniforms: { uScala: { value: 400 } },
    transparent: true, depthWrite: false, blending: THREE.NormalBlending,
  });
  const aria = new THREE.Points(geoAria, matAria);
  aria.frustumCulled = false;
  gruppo.add(aria);

  const FREDDO = [0.72, 0.85, 1.0], ROSA = [0.9, 0.16, 0.45], CALDO = [1.0, 0.62, 0.8];
  const tmp = { x: 0, y: 0 };
  function nelVano(i, zz, aM, aF, stretta) {
    const f = sel[i] === 1;
    const cx = f ? D / 2 : -D / 2;
    const tz = (zz - Z1) / L;
    const ang = f
      ? (vano[i] * TAU) / LOBI_F + aF + GIRO_F * tz
      : Math.PI / LOBI_M + (vano[i] * TAU) / LOBI_M + aM + GIRO_M * tz;
    const fondo = f ? 1.13 : 0.67;
    const r = fondo + u[i] * (f ? 0.52 : 0.55) * (1 - 0.55 * stretta);
    tmp.x = cx + r * Math.cos(ang); tmp.y = r * Math.sin(ang);
    return tmp;
  }

  let aM = 0, tempo = 0;
  function aggiorna(dt, p) {
    const spinta = sstep(0.24, 0.6, p);
    const omega = lerp(0.45, 2.3, spinta);
    aM += omega * dt; tempo += dt;
    const aF = (-aM * LOBI_M) / LOBI_F;
    maschio.rotation.z = aM;
    femmina.rotation.z = aF;

    const calore = sstep(0.3, 0.62, p);
    const fronte = lerp(Z1 + 0.4, Z3 + 0.6, sstep(0.06, 0.86, p));
    const k = 0.55 + 1.5 * spinta;
    for (let i = 0; i < N; i++) {
      let zz = z[i];
      const v = zz < Z1 ? 0.9 : zz < Z2 ? 0.62 : 2.4;
      zz += v * k * vel[i] * dt;
      if (zz > Z3) { nuova(i, Z0 - Math.random() * 0.6); zz = z[i]; }
      z[i] = zz;
      let x, y, c, s, a;
      if (zz < Z1) {
        const t = clamp((zz - Z0) / (Z1 - Z0));
        const e = nelVano(i, Z1, aM, aF, 0);
        const w = Math.pow(t, 1.6);
        x = lerp(Math.cos(ang0[i]) * raggio0[i], e.x, w);
        y = lerp(Math.sin(ang0[i]) * raggio0[i], e.y, w);
        c = FREDDO; s = base[i] * 0.9; a = 0.32 + 0.4 * t;
      } else if (zz <= Z2) {
        const t = (zz - Z1) / L;
        const e = nelVano(i, zz, aM, aF, t * (0.4 + 0.6 * calore));
        x = e.x; y = e.y;
        const h = clamp(t * 1.2) * calore;
        c = h < 0.6 ? [lerp(FREDDO[0], ROSA[0], h / 0.6), lerp(FREDDO[1], ROSA[1], h / 0.6), lerp(FREDDO[2], ROSA[2], h / 0.6)] : ROSA;
        s = base[i] * (1 + 0.5 * t * calore); a = 0.75 + 0.25 * t;
      } else {
        const t = clamp((zz - Z2) / (Z3 - Z2));
        const e = nelVano(i, Z2, aM, aF, 0.4 + 0.6 * calore);
        const w = 1 - Math.pow(1 - t, 3);
        x = lerp(e.x, jet[i * 2], w);
        y = lerp(e.y, jet[i * 2 + 1], w);
        const h = calore;
        c = [lerp(ROSA[0], CALDO[0], h * t), lerp(ROSA[1], CALDO[1], h * t), lerp(ROSA[2], CALDO[2], h * t)];
        if (calore < 0.05) c = FREDDO;
        s = base[i] * (1.4 - 0.4 * t); a = 1 - t * t;
      }
      a *= 1 - sstep(fronte - 0.9, fronte, zz);
      pos[i * 3] = x; pos[i * 3 + 1] = y; pos[i * 3 + 2] = zz;
      col[i * 3] = c[0]; col[i * 3 + 1] = c[1]; col[i * 3 + 2] = c[2];
      dim[i] = s; alfa[i] = a;
    }
    geoAria.attributes.position.needsUpdate = true;
    geoAria.attributes.aCol.needsUpdate = true;
    geoAria.attributes.aSize.needsUpdate = true;
    geoAria.attributes.aAlpha.needsUpdate = true;

    // camera: entra lenta, gira attorno alla vite, si avvicina mentre comprime
    if (largo) {
      supporto.rotation.y = lerp(0.34, -0.3, sstep(0, 1, p)) + Math.sin(tempo * 0.25) * 0.02;
      supporto.rotation.x = lerp(0.36, 0.14, p);
      camera.position.set(0, 0, lerp(19.5, 16, sstep(0, 0.55, p)) + lerp(0, 3.2, sstep(0.68, 1, p)));
    } else {
      supporto.rotation.y = lerp(-0.55, 0.45, sstep(0, 1, p)) + Math.sin(tempo * 0.25) * 0.02;
      supporto.rotation.x = lerp(-0.12, 0.24, p);
      camera.position.set(0, 0, lerp(28, 22, sstep(0, 0.55, p)) + lerp(0, 5, sstep(0.68, 1, p)));
    }
    camera.lookAt(0, 0, 0);
  }

  let largo = true;
  function dimensiona() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    largo = w / h > 1.05;
    camera.fov = largo ? 34 : 40;
    camera.updateProjectionMatrix();
    if (largo) {
      orienta.rotation.set(0, Math.PI / 2, Math.PI / 2, 'YXZ'); // asse orizzontale, rotori uno sopra l'altro
      orienta.position.set(0, 0, 0);
      supporto.position.set(w > 1100 ? 2.4 : 1.8, -0.2, 0);
    } else {
      orienta.rotation.set(-Math.PI / 2, 0, 0);                  // asse verticale, aria dal basso verso l'alto
      supporto.position.set(0, 0.35, 0);
    }
    const hBuffer = renderer.getDrawingBufferSize(new THREE.Vector2()).y;
    matAria.uniforms.uScala.value = (hBuffer / 2) / Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
  }
  dimensiona();
  new ResizeObserver(() => { dimensiona(); if (ridotto) disegnaFermo(); }).observe(canvas);

  const progresso = () => (window.RDMEC ? window.RDMEC.progressoVite() : 0);

  function disegnaFermo() {
    tempo = 0; aM = 0.6;
    for (let n = 0; n < 240; n++) aggiorna(1 / 60, 0.62);
    renderer.render(scena, camera);
  }

  if (ridotto) { disegnaFermo(); return; }

  let visibile = true, inCorso = false, idRaf = 0, ultimo = 0;
  function fotogramma(t) {
    idRaf = requestAnimationFrame(fotogramma);
    const dt = Math.min(0.05, Math.max(0, (t - ultimo) / 1000));
    ultimo = t;
    aggiorna(dt, progresso());
    renderer.render(scena, camera);
  }
  function parti() { if (inCorso || !visibile || document.hidden) return; inCorso = true; ultimo = performance.now(); idRaf = requestAnimationFrame(fotogramma); }
  function ferma() { if (!inCorso) return; inCorso = false; cancelAnimationFrame(idRaf); }
  new IntersectionObserver(([e]) => { visibile = e.isIntersecting; if (visibile) parti(); else ferma(); }, { rootMargin: '10% 0px' }).observe(sezione);
  document.addEventListener('visibilitychange', () => { if (document.hidden) ferma(); else parti(); });

  // primo fotogramma subito, così il canvas compare già pieno
  for (let n = 0; n < 90; n++) aggiorna(1 / 60, progresso());
  renderer.render(scena, camera);
  parti();
}
