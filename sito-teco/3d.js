/* TECO — la sfera della valvola: si apre all'arrivo, l'acqua (o il gas) passa nel foro,
   e scorrendo la leva gira di 90° e intercetta il flusso. */
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

const ACQUA = new THREE.Color('#2f8cff');
const GAS = new THREE.Color('#f2c12e');
const LEVA_ACQUA = new THREE.Color('#1f5fd0');
const LEVA_GAS = new THREE.Color('#efbf22');
const R_FORO = 0.5;
const R_FLUSSO = 0.42;
const FOV = 32;
const QUADRO = 4.6;        // il poster è largo 4,6 raggi della sfera
const DIREZIONE = new THREE.Vector3(0.58, 0.44, 1).normalize();

const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const easeIO = t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

export async function avvia({ ridotto = false, poster = false } = {}) {
  const hero = document.getElementById('hero');
  const palco = hero.querySelector('.hero__palco');
  const box = document.getElementById('scena');
  const posterImg = hero.querySelector('.hero__poster');
  const stato = document.getElementById('stato');
  const fluidoTxt = document.getElementById('stato-fluido');
  const valvolaTxt = document.getElementById('stato-valvola');
  const mobile = () => innerWidth < 900;

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance', preserveDrawingBuffer: poster });
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  box.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.03).texture;
  pmrem.dispose();

  const camera = new THREE.PerspectiveCamera(FOV, 1, 0.5, 80);

  /* ---------- La valvola ---------- */
  const valvola = new THREE.Group();
  scene.add(valvola);
  const sfera = new THREE.Group();
  valvola.add(sfera);

  const cromo = new THREE.MeshPhysicalMaterial({ color: 0xe8ebee, metalness: 1, roughness: 0.075 });
  const cromoInterno = new THREE.MeshPhysicalMaterial({ color: 0xb9bec3, metalness: 1, roughness: 0.22, side: THREE.BackSide });
  const ottone = new THREE.MeshPhysicalMaterial({ color: 0xe6bd6e, metalness: 1, roughness: 0.2 });
  const ptfe = new THREE.MeshPhysicalMaterial({ color: 0xf1efe9, metalness: 0, roughness: 0.5, clearcoat: 0.2 });
  const leva = new THREE.MeshPhysicalMaterial({ color: LEVA_ACQUA.clone(), metalness: 0.05, roughness: 0.32, clearcoat: 0.7, clearcoatRoughness: 0.18 });

  // sfera forata: superficie di rotazione dell'arco esterno, foro lungo X
  const h = Math.sqrt(1 - R_FORO * R_FORO);
  const f0 = Math.asin(h);
  const arco = [];
  for (let i = 0; i <= 64; i++) {
    const f = -f0 + (2 * f0 * i) / 64;
    arco.push(new THREE.Vector2(Math.cos(f), Math.sin(f)));
  }
  const gSfera = new THREE.LatheGeometry(arco, 128);
  gSfera.rotateZ(-Math.PI / 2);
  sfera.add(new THREE.Mesh(gSfera, cromo));
  const gForo = new THREE.CylinderGeometry(R_FORO, R_FORO, 2 * h, 96, 1, true);
  gForo.rotateZ(Math.PI / 2);
  sfera.add(new THREE.Mesh(gForo, cromoInterno));

  // asta, premistoppa e leva (girano con la sfera)
  const asta = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.95, 40), ottone);
  asta.position.y = 1.3;
  sfera.add(asta);
  const testa = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.16, 40), leva);
  testa.position.y = 1.82;
  sfera.add(testa);
  const barra = new THREE.Mesh(new RoundedBoxGeometry(1.95, 0.12, 0.36, 4, 0.05), leva);
  barra.position.set(0.82, 1.84, 0);
  sfera.add(barra);

  // parti fisse del corpo: dado esagonale e guarnizioni in PTFE attorno al foro
  const dado = new THREE.Mesh(new THREE.CylinderGeometry(0.33, 0.33, 0.2, 6), ottone);
  dado.position.y = 1.12;
  valvola.add(dado);
  [-1, 1].forEach(s => {
    const anello = new THREE.Mesh(new THREE.TorusGeometry(0.6, 0.055, 20, 96), ptfe);
    anello.rotation.y = Math.PI / 2;
    anello.position.x = s * 0.8;
    valvola.add(anello);
  });

  /* ---------- Il fluido ---------- */
  const N = poster ? 0 : (mobile() ? 900 : 1700);
  const XMIN = mobile() ? -4.6 : -8.5;
  const XMAX = mobile() ? 4.6 : 7.5;
  const px = new Float32Array(N), pr = new Float32Array(N), pa = new Float32Array(N), pv = new Float32Array(N);
  const fermo = new Uint8Array(N), stopX = new Float32Array(N);
  const pos = new Float32Array(N * 3), mix = new Float32Array(N), seme = new Float32Array(N);
  const nuovo = (i, x) => {
    const r = R_FLUSSO * Math.sqrt(Math.random());
    pr[i] = r;
    pa[i] = Math.random() * Math.PI * 2;
    pv[i] = (2.5 + Math.random() * 0.5) * (1 - 0.55 * (r / R_FLUSSO) ** 2); // profilo laminare
    px[i] = x;
    stopX[i] = -0.9 - Math.random() * 0.55;
    seme[i] = Math.random();
  };
  for (let i = 0; i < N; i++) {
    // all'inizio l'acqua aspetta a monte della sfera chiusa
    nuovo(i, XMIN + Math.random() * (-0.9 - XMIN));
    if (px[i] > stopX[i]) px[i] = stopX[i] - Math.random() * 0.2;
    fermo[i] = 1;
  }
  const gFluido = new THREE.BufferGeometry();
  gFluido.setAttribute('position', new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage));
  gFluido.setAttribute('aMix', new THREE.BufferAttribute(mix, 1).setUsage(THREE.DynamicDrawUsage));
  gFluido.setAttribute('aSeme', new THREE.BufferAttribute(seme, 1));
  const mFluido = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: {
      uSize: { value: 100 }, uPR: { value: 1 },
      uAcqua: { value: new THREE.Vector3(0x2f / 255, 0x8c / 255, 0xff / 255) },
      uGas: { value: new THREE.Vector3(0xff / 255, 0xc9 / 255, 0x3a / 255) },
      uOpacita: { value: 0 }, uLontano: { value: 5 }, uVicino: { value: 2 }
    },
    vertexShader: `
      attribute float aMix; attribute float aSeme;
      uniform float uSize, uPR, uLontano, uVicino;
      varying float vMix; varying float vFade;
      void main() {
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = uSize * uPR * (0.7 + 0.6 * aSeme) / -mv.z;
        vMix = aMix;
        vFade = smoothstep(uLontano, uVicino, abs(position.x)) * (0.55 + 0.45 * aSeme);
      }`,
    fragmentShader: `
      uniform vec3 uAcqua, uGas; uniform float uOpacita;
      varying float vMix; varying float vFade;
      void main() {
        vec2 uv = gl_PointCoord - 0.5;
        uv.y *= 3.2;
        float d = length(uv) * 2.0;
        float a = 1.0 - smoothstep(0.0, 1.0, d);
        a *= a;
        vec3 c = mix(uAcqua, uGas, vMix);
        gl_FragColor = vec4(c * 1.15, a * vFade * uOpacita);
      }`
  });
  const fluido = new THREE.Points(gFluido, mFluido);
  fluido.frustumCulled = false;
  if (N) scene.add(fluido);

  /* ---------- Inquadratura: la sfera sta dove CSS ha messo il poster ---------- */
  let W = 1, H = 1;
  function inquadra() {
    W = palco.clientWidth; H = palco.clientHeight;
    renderer.setPixelRatio(Math.min(devicePixelRatio, mobile() ? 1.5 : 2));
    renderer.setSize(W, H, false);
    const rp = posterImg.getBoundingClientRect(), rc = palco.getBoundingClientRect();
    const cx = rp.left + rp.width / 2 - rc.left, cy = rp.top + rp.height / 2 - rc.top;
    const R = rp.width / QUADRO;
    const t = Math.tan(THREE.MathUtils.degToRad(FOV / 2));
    const dist = H / (2 * R * t);
    camera.aspect = W / H;
    camera.position.copy(DIREZIONE).multiplyScalar(dist);
    camera.lookAt(0, 0, 0);
    camera.setViewOffset(W, H, -(cx - W / 2), -(cy - H / 2), W, H);
    camera.near = Math.max(0.5, dist - 12); camera.far = dist + 14;
    camera.updateProjectionMatrix();
    mFluido.uniforms.uSize.value = 0.17 * H / (2 * t);
    mFluido.uniforms.uPR.value = renderer.getPixelRatio();
    // il getto si spegne prima del testo su desktop
    mFluido.uniforms.uLontano.value = mobile() ? 6 : 3.5;
    mFluido.uniforms.uVicino.value = mobile() ? 3 : 1.35;
  }

  /* ---------- Stato: apertura, fluido, scroll ---------- */
  let theta = -Math.PI / 2;        // chiusa: leva verso chi guarda
  let apertura = 0;
  let modo = 0, mixLeva = 0, cambio = 0;
  let t0 = 0, tPrec = 0, attivo = true, visibile = true;
  let px0 = 0, py0 = 0, pxS = 0, pyS = 0;
  const CICLO = 6.5;

  function progressoScroll() {
    const corsa = hero.offsetHeight - palco.offsetHeight;
    return corsa > 0 ? Math.min(1, Math.max(0, scrollY / corsa)) : 0;
  }

  let testoFluido = '', testoValvola = '';
  function aggiornaStato() {
    const nomeF = mixLeva > 0.5 ? 'Gas' : 'Acqua';
    const nomeV = apertura > 0.5 ? 'valvola aperta' : 'valvola chiusa';
    if (nomeF !== testoFluido) {
      testoFluido = nomeF; fluidoTxt.textContent = nomeF;
      stato.dataset.fluido = nomeF === 'Gas' ? 'gas' : 'acqua';
    }
    if (nomeV !== testoValvola) {
      testoValvola = nomeV; valvolaTxt.textContent = nomeV;
      stato.toggleAttribute('data-chiusa', apertura <= 0.5);
    }
  }

  function passo(now, dt) {
    const t = (now - t0) / 1000;
    // apertura all'arrivo, poi chiusura guidata dallo scroll
    const apri = ridotto ? 1 : easeIO(smooth(0.75, 2.0, t));
    const p = easeIO(progressoScroll());
    const chiuso = Math.max(1 - apri, p);
    theta = -Math.PI / 2 * chiuso;
    apertura = Math.min(1, Math.max(0, 1 - chiuso * 1.3));
    sfera.rotation.y = theta;

    // il fluido cambia: acqua, poi gas, poi di nuovo acqua (il fronte parte da sinistra)
    const fase = Math.floor(Math.max(0, t - 1.5) / CICLO) % 2;
    if (fase !== modo) { modo = fase; cambio = t; }
    const arrivo = Math.abs(XMIN) / 2.6;
    const verso = smooth(cambio + arrivo - 0.4, cambio + arrivo + 0.6, t);
    mixLeva = modo ? Math.max(mixLeva, verso) : Math.min(mixLeva, 1 - verso);
    leva.color.copy(LEVA_ACQUA).lerp(LEVA_GAS, mixLeva);

    // particelle
    const rLibero = R_FLUSSO * apertura * 1.02;
    for (let i = 0; i < N; i++) {
      let x = px[i];
      if (fermo[i]) {
        if (pr[i] <= rLibero && apertura > 0.04) fermo[i] = 0; else { scrivi(i, x); continue; }
      }
      // l'acqua chiusa dentro la sfera resta ferma
      if (apertura < 0.3 && x > -0.82 && x < 0.82) { scrivi(i, x); continue; }
      let nx = x + pv[i] * dt;
      if (x <= stopX[i] && nx > stopX[i] && pr[i] > rLibero) { nx = stopX[i]; fermo[i] = 1; }
      if (nx > XMAX) { nuovo(i, XMIN - Math.random() * 1.2); mix[i] = modo; nx = px[i]; }
      px[i] = nx;
      scrivi(i, nx);
    }
    gFluido.attributes.position.needsUpdate = true;
    gFluido.attributes.aMix.needsUpdate = true;
    mFluido.uniforms.uOpacita.value = smooth(0.2, 1.4, t);

    // vita: la luce scivola sul cromo, la valvola galleggia, il mouse (solo desktop) la inclina
    scene.environmentRotation.y = t * 0.12;
    valvola.position.y = Math.sin(t * 0.9) * 0.035;
    pxS += (px0 - pxS) * Math.min(1, dt * 3);
    pyS += (py0 - pyS) * Math.min(1, dt * 3);
    valvola.rotation.y = Math.sin(t * 0.32) * 0.06 + pxS * 0.18;
    valvola.rotation.x = pyS * 0.1;
    aggiornaStato();
  }
  function scrivi(i, x) {
    pos[i * 3] = x;
    pos[i * 3 + 1] = Math.sin(pa[i]) * pr[i];
    pos[i * 3 + 2] = Math.cos(pa[i]) * pr[i];
  }

  /* ---------- Poster: un fotogramma fermo, valvola chiusa ---------- */
  if (poster) {
    box.style.cssText = 'position:fixed;left:0;top:0;width:900px;height:900px;opacity:1';
    renderer.setPixelRatio(1);
    renderer.setSize(900, 900, false);
    const t = Math.tan(THREE.MathUtils.degToRad(FOV / 2));
    const dist = 900 / (2 * (900 / QUADRO) * t);
    camera.aspect = 1;
    camera.position.copy(DIREZIONE).multiplyScalar(dist);
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();
    sfera.rotation.y = -Math.PI / 2;
    await renderer.compileAsync(scene, camera);
    renderer.render(scene, camera);
    window.__poster = renderer.domElement.toDataURL('image/png');
    return;
  }

  inquadra();
  addEventListener('resize', () => { inquadra(); if (ridotto) disegna(performance.now()); });
  if (!mobile()) {
    addEventListener('pointermove', e => { px0 = e.clientX / innerWidth - 0.5; py0 = e.clientY / innerHeight - 0.5; }, { passive: true });
  }

  await renderer.compileAsync(scene, camera);

  function disegna(now) {
    const dt = Math.min(0.05, Math.max(0, (now - tPrec) / 1000));
    tPrec = now;
    passo(now, dt);
    renderer.render(scene, camera);
  }

  function ciclo() {
    if (!attivo) return;
    disegna(performance.now());
    requestAnimationFrame(ciclo);
  }
  function aggiornaAttivo() {
    const ora = visibile && !document.hidden && !ridotto;
    if (ora && !attivo) { attivo = true; tPrec = performance.now(); requestAnimationFrame(ciclo); }
    else if (!ora) attivo = false;
  }

  t0 = performance.now();
  tPrec = t0;
  if (ridotto) {
    attivo = false;
    disegna(t0 + 4000);
    addEventListener('scroll', () => disegna(t0 + 4000), { passive: true });
  } else {
    requestAnimationFrame(ciclo);
  }
  requestAnimationFrame(() => hero.classList.add('scena-pronta'));

  new IntersectionObserver(v => { visibile = v[0].isIntersecting; aggiornaAttivo(); }).observe(palco);
  document.addEventListener('visibilitychange', aggiornaAttivo);

  window.__teco3d = {
    stato: () => ({ theta, apertura, modo, mixLeva, attivo, N }),
    renderer
  };
}
