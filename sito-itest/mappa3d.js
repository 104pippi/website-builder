/* Mappa 3D delle realizzazioni ITEST.
   Ogni impianto è un segmento di colonna, colorato per settore. Le colonne crescono a ondate:
   Puglia, poi il resto d'Italia, poi l'estero con gli archi da Corato. La camera segue lo scroll. */
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const sez = document.querySelector('[data-mappa]');
const host = sez.querySelector('[data-mappa-scena]');
const etHost = sez.querySelector('[data-mappa-etichette]');
const ridotto = matchMedia('(prefers-reduced-motion: reduce)').matches;
const mobile = matchMedia('(max-width: 767px)').matches;

const COL = { vino: '#E0466C', pasta: '#E8A41C', energia: '#8C70F0', alimentare: '#62AE3C', ospedali: '#23A6D8' };
const ORDINE = ['vino', 'pasta', 'alimentare', 'energia', 'ospedali'];
const SEDE = { lo: 16.41083, la: 41.13083 };
const srgb = (hex) => { const n = parseInt(hex.slice(1), 16); return new THREE.Vector3((n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255); };
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const liscio = (x) => x * x * (3 - 2 * x);
const fuori = (x) => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); };

async function main() {
  const [geo, imp] = await Promise.all([
    fetch('assets/geo/mediterraneo.json').then((r) => r.json()),
    fetch('assets/geo/impianti.json').then((r) => r.json()),
  ]);
  const K = geo.k, LON0 = geo.lon0, LAT0 = geo.lat0;
  const pos = (lo, la, y = 0) => new THREE.Vector3((lo - LON0) * K, y, -(la - LAT0));

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: devicePixelRatio < 2, powerPreference: 'high-performance' });
  } catch (e) {
    return disegnaSVG(geo, imp, pos);
  }
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, mobile ? 1.5 : 2));
  renderer.setClearColor('#04173A', 1);
  host.appendChild(renderer.domElement);

  const scena = new THREE.Scene();
  scena.fog = new THREE.Fog('#04173A', 10, 60);
  const camera = new THREE.PerspectiveCamera(mobile ? 46 : 34, 1, 0.1, 400);

  scena.add(new THREE.HemisphereLight('#A8C8FF', '#04173A', 1.15));
  const sole = new THREE.DirectionalLight('#ffffff', 1.5);
  sole.position.set(-4, 10, 7);
  scena.add(sole);

  /* Terre: Italia in rilievo, il resto più basso e scuro */
  const H_IT = 0.11, H_ALTRI = 0.05;
  const gIt = [], gAltri = [], lIt = [], lAltri = [];
  for (const c of geo.c) {
    for (const r of c.r) {
      const pts = [];
      for (let i = 0; i < r.length; i += 2) pts.push(new THREE.Vector2(r[i], r[i + 1]));
      if (pts.length < 3) continue;
      const h = c.it ? H_IT : H_ALTRI;
      const g = new THREE.ExtrudeGeometry(new THREE.Shape(pts), { depth: h, bevelEnabled: false, curveSegments: 1 });
      g.rotateX(-Math.PI / 2);
      (c.it ? gIt : gAltri).push(g);
      const v = [];
      for (const p of pts) v.push(p.x, h + 0.002, -p.y);
      v.push(pts[0].x, h + 0.002, -pts[0].y);
      (c.it ? lIt : lAltri).push(v);
    }
  }
  const terraIt = new THREE.Mesh(mergeGeometries(gIt, false), new THREE.MeshLambertMaterial({ color: '#1D52AE', emissive: '#0B2D70', emissiveIntensity: 0.45 }));
  const terraAltri = new THREE.Mesh(mergeGeometries(gAltri, false), new THREE.MeshLambertMaterial({ color: '#0F2D62', emissive: '#061A44', emissiveIntensity: 0.3 }));
  scena.add(terraIt, terraAltri);
  const linee = (lista, colore, opacita) => {
    const arr = [];
    for (const v of lista) for (let i = 0; i < v.length - 3; i += 3) arr.push(v[i], v[i + 1], v[i + 2], v[i + 3], v[i + 4], v[i + 5]);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(arr, 3));
    return new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: colore, transparent: true, opacity: opacita }));
  };
  scena.add(linee(lIt, '#8DB4FF', 0.7), linee(lAltri, '#5C7FBE', 0.28));

  /* Mare con il reticolo dei meridiani e dei paralleli */
  const sede = pos(SEDE.lo, SEDE.la, H_IT);
  const mare = new THREE.Mesh(
    new THREE.PlaneGeometry(90, 60).rotateX(-Math.PI / 2).translate(-6, -0.002, 0),
    new THREE.ShaderMaterial({
      uniforms: { uMare: { value: srgb('#04173A') }, uRete: { value: srgb('#3D6BC4') }, uSede: { value: sede }, uK: { value: K }, uCam: { value: new THREE.Vector3() }, uFar: { value: 60 } },
      vertexShader: 'varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }',
      fragmentShader: `uniform vec3 uMare; uniform vec3 uRete; uniform vec3 uSede; uniform float uK; uniform vec3 uCam; uniform float uFar;
        varying vec3 vW;
        void main(){
          vec2 g = vec2(vW.x / uK, vW.z) / 2.0;
          vec2 fw = fwidth(g);
          vec2 gr = abs(fract(g - 0.5) - 0.5) / max(fw, vec2(1e-4));
          float rete = 1.0 - min(min(gr.x, gr.y), 1.0);
          float d = distance(vW.xz, uSede.xz);
          vec3 col = uMare + uRete * rete * 0.16 + vec3(0.05, 0.13, 0.33) * exp(-d * 0.22) * 0.6;
          float f = smoothstep(uFar * 0.55, uFar, distance(vW, uCam));
          gl_FragColor = vec4(mix(col, uMare, f), 1.0);
        }`,
    }),
  );
  scena.add(mare);

  /* Colonne: un segmento per impianto, raggruppati per paese o città vicina */
  const gruppi = new Map();
  for (const i of imp) {
    const k = `${(i.la / 0.05).toFixed(0)}|${(i.lo / 0.05).toFixed(0)}`;
    if (!gruppi.has(k)) gruppi.set(k, []);
    gruppi.get(k).push(i);
  }
  const segmenti = [];
  const colonne = [];
  for (const lista of gruppi.values()) {
    lista.sort((a, b) => ORDINE.indexOf(a.s) - ORDINE.indexOf(b.s));
    const it = lista[0].p === 'Italia';
    const base = it ? H_IT : H_ALTRI;
    const p = pos(lista[0].lo, lista[0].la, base);
    const ondata = lista[0].r === 'Puglia' ? 0 : it ? 1 : 2;
    const dist = Math.hypot(lista[0].lo - SEDE.lo, lista[0].la - SEDE.la);
    const col = { p, base, n: lista.length, ondata, ritardo: Math.min(dist * (ondata === 0 ? 0.32 : 0.09), ondata === 2 ? 0.2 : 1.1) + (ondata === 2 ? 0.75 : 0), nome: lista[0].n, settore: lista[0].s };
    colonne.push(col);
    lista.forEach((i, j) => segmenti.push({ col, j, colore: new THREE.Color(COL[i.s]) }));
  }
  const boxG = new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0);
  const segMesh = new THREE.InstancedMesh(boxG, new THREE.MeshBasicMaterial({ toneMapped: false, fog: false }), segmenti.length);
  segmenti.forEach((s, i) => segMesh.setColorAt(i, s.colore));
  segMesh.frustumCulled = false;
  scena.add(segMesh);

  /* Alone a terra sotto ogni colonna */
  const alone = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 64;
    const x = c.getContext('2d');
    const g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.35, 'rgba(255,255,255,.35)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = g; x.fillRect(0, 0, 64, 64);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  })();
  const aloniMesh = new THREE.InstancedMesh(
    new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({ map: alone, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false, fog: false, opacity: 0.42 }),
    colonne.length,
  );
  colonne.forEach((c, i) => aloniMesh.setColorAt(i, new THREE.Color(COL[c.settore])));
  aloniMesh.frustumCulled = false;
  scena.add(aloniMesh);

  /* Sede di Corato: due anelli che pulsano */
  const anelli = [0, 1].map(() => {
    const m = new THREE.Mesh(new THREE.RingGeometry(0.86, 1, 64).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, depthWrite: false, toneMapped: false, fog: false }));
    m.position.copy(sede).setY(H_IT + 0.004);
    scena.add(m);
    return m;
  });

  /* Archi verso l'estero (Stati Uniti fuori dal bordo ovest) */
  const archi = [];
  const arcoMat = (hex) => new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, fog: false,
    uniforms: { uDraw: { value: 0 }, uTime: { value: 0 }, uCol: { value: srgb(hex) } },
    vertexShader: 'varying float vU; void main(){ vU = uv.x; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `uniform float uDraw; uniform float uTime; uniform vec3 uCol; varying float vU;
      void main(){
        if (vU > uDraw) discard;
        float testa = smoothstep(uDraw - 0.12, uDraw, vU);
        float onda = smoothstep(0.82, 1.0, fract(vU * 2.5 - uTime * 0.45));
        gl_FragColor = vec4(mix(uCol, vec3(1.0), testa * 0.6), 0.42 + 0.5 * testa + 0.3 * onda);
      }`,
  });
  const esteri = [...gruppi.values()].map((l) => l[0]).filter((i) => i.p !== 'Italia');
  const usa = [{ lo: -8.6, la: 38.6 }, { lo: -8.6, la: 40.1 }, { lo: -8.6, la: 41.6 }];
  const mete = [
    ...esteri.filter((i) => i.p !== 'Stati Uniti').map((i) => ({ lo: i.lo, la: i.la, s: i.s, usa: false })),
    ...usa.map((u) => ({ ...u, s: 'pasta', usa: true })),
  ];
  for (const m of mete) {
    const a = sede.clone().setY(H_IT + 0.02);
    const b = pos(m.lo, m.la, m.usa ? 1.2 : H_ALTRI + 0.02);
    const d = a.distanceTo(b);
    const alto = (m.usa ? 0.2 : 0.16) * d + 0.3;
    const curva = new THREE.CubicBezierCurve3(a, a.clone().lerp(b, 0.25).setY(alto), a.clone().lerp(b, 0.75).setY(alto * (m.usa ? 1.15 : 1)), b);
    const g = new THREE.TubeGeometry(curva, 80, mobile ? 0.05 : 0.035, 6, false);
    const mesh = new THREE.Mesh(g, arcoMat(COL[m.s]));
    mesh.frustumCulled = false;
    scena.add(mesh);
    archi.push(mesh);
  }

  /* Etichette HTML */
  const ET = [
    { t: 'Corato, sede ITEST', lo: SEDE.lo, la: SEDE.la, cls: 'et--sede', passi: [0, 1, 2] },
    { t: 'San Severo', lo: 15.39, la: 41.69, passi: [0] },
    { t: 'Manduria', lo: 17.63, la: 40.40, passi: [0] },
    { t: 'Galatina', lo: 18.16, la: 40.18, passi: [0], sotto: true },
    { t: 'Matera', lo: 16.55, la: 40.68, passi: [0] },
    { t: 'Chivasso', lo: 7.90, la: 45.21, passi: [1] },
    { t: 'Pavia', lo: 9.16, la: 45.19, passi: [1], sotto: true },
    { t: 'Cerveteri', lo: 12.10, la: 42.0, passi: [1] },
    { t: 'Napoli', lo: 14.23, la: 40.86, passi: [1], sotto: true },
    { t: 'Marsala', lo: 12.44, la: 37.80, passi: [1] },
    { t: 'Pantelleria', lo: 11.95, la: 36.80, passi: [1], sotto: true },
    { t: 'Mannheim', lo: 8.46, la: 49.51, passi: [2] },
    { t: 'Tizi Ouzou', lo: 4.07, la: 36.71, passi: [2], sotto: true },
    { t: 'Tripoli', lo: 13.25, la: 32.91, passi: [2], sotto: true },
    { t: 'Malta', lo: 14.46, la: 35.87, passi: [2] },
    { t: 'Stati Uniti: 3 pastifici', lo: -8.0, la: 40.1, y: 1.3, cls: 'et--usa', passi: [2], bordo: true },
  ].map((e) => {
    const el = document.createElement('span');
    el.className = 'et ' + (e.cls || '');
    el.textContent = e.t;
    etHost.appendChild(el);
    return { ...e, el, w: pos(e.lo, e.la, e.y ?? H_IT), vis: false };
  });

  /* Camera: tre inquadrature, guidate dallo scroll */
  const inq = mobile
    ? [
        { T: pos(16.85, 40.85), D: 7.8, phi: 0.86, th: 0.16 },
        { T: pos(12.8, 41.2), D: 22, phi: 0.5, th: 0.04 },
        { T: pos(10.8, 39.6), D: 36, phi: 0.42, th: -0.02 },
      ]
    : [
        { T: pos(16.9, 40.9), D: 6.6, phi: 0.9, th: 0.2 },
        { T: pos(10.4, 41.3), D: 20.5, phi: 0.54, th: 0.05 },
        { T: pos(7.6, 40.4), D: 31, phi: 0.58, th: -0.05 },
      ];
  const stato = { T: inq[0].T.clone(), D: inq[0].D * 1.25, phi: inq[0].phi - 0.12, th: inq[0].th + 0.25 };
  const voluto = { T: new THREE.Vector3(), D: 0, phi: 0, th: 0 };
  const progresso = () => {
    const r = sez.getBoundingClientRect();
    return clamp(-r.top / (r.height - innerHeight), 0, 1);
  };
  const tappa = (p) => {
    if (p < 0.2) return 0;
    if (p < 0.46) return liscio((p - 0.2) / 0.26);
    if (p < 0.6) return 1;
    if (p < 0.86) return 1 + liscio((p - 0.6) / 0.26);
    return 2;
  };
  const testa = sez.querySelector('.mappa__testa');
  const passi = sez.querySelector('.mappa__passi');
  let mouseX = 0;
  if (matchMedia('(pointer: fine)').matches) addEventListener('pointermove', (e) => { mouseX = e.clientX / innerWidth - 0.5; }, { passive: true });

  const misura = () => {
    const w = host.clientWidth, h = host.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };
  misura();
  addEventListener('resize', misura);

  /* Ondate: partono quando la sezione è in vista e quando si arriva alla tappa */
  const avvio = [null, null, null];
  let avvioArchi = null;
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(), pv = new THREE.Vector3(), tmp = new THREE.Vector3();
  let ultimo = performance.now(), visibile = false, attivo = !document.hidden, raf = 0, disegnata = false;

  const aggiorna = (ora) => {
    const dt = Math.min(0.05, (ora - ultimo) / 1000);
    ultimo = ora;
    const t = ora / 1000;
    const p = progresso();
    const u = tappa(p);
    const passo = p < 0.36 ? 0 : p < 0.7 ? 1 : 2;
    for (let g = 0; g <= passo; g++) if (avvio[g] === null && visibile) avvio[g] = t;
    if (passo === 2 && avvioArchi === null) avvioArchi = t;
    if (passo < 2) avvioArchi = null;
    if (ridotto) { avvio[0] = avvio[1] = avvio[2] = -100; if (avvioArchi !== null) avvioArchi = -100; }

    // camera
    const i0 = Math.floor(Math.min(u, 1.999)), f = u - i0;
    const A = inq[i0], B = inq[i0 + 1];
    voluto.T.lerpVectors(A.T, B.T, f);
    voluto.D = A.D + (B.D - A.D) * f;
    voluto.phi = A.phi + (B.phi - A.phi) * f;
    voluto.th = A.th + (B.th - A.th) * f + Math.sin(t * 0.18) * 0.035 + mouseX * 0.12;
    const k = ridotto ? 1 : 1 - Math.exp(-dt * 4.2);
    stato.T.lerp(voluto.T, k);
    stato.D += (voluto.D - stato.D) * k;
    stato.phi += (voluto.phi - stato.phi) * k;
    stato.th += (voluto.th - stato.th) * k;
    camera.position.set(
      stato.T.x + stato.D * Math.sin(stato.phi) * Math.sin(stato.th),
      stato.T.y + stato.D * Math.cos(stato.phi),
      stato.T.z + stato.D * Math.sin(stato.phi) * Math.cos(stato.th),
    );
    camera.lookAt(stato.T);
    camera.updateMatrixWorld();
    scena.fog.near = stato.D * 0.9;
    scena.fog.far = stato.D * 2.8;
    mare.material.uniforms.uCam.value.copy(camera.position);
    mare.material.uniforms.uFar.value = stato.D * 2.6;

    // colonne
    const z = clamp(stato.D / 7, 0.9, 5.5);
    const hS = 0.13 * z, gap = 0.032 * z, w = 0.06 * z;
    segmenti.forEach((s, i) => {
      const a0 = avvio[s.col.ondata];
      const g = a0 === null ? 0 : clamp((t - a0 - s.col.ritardo - s.j * 0.05) / 0.55, 0, 1);
      const e = g <= 0 ? 0 : fuori(g);
      pv.set(s.col.p.x, s.col.base + s.j * (hS + gap) * Math.min(1, g * 1.4), s.col.p.z);
      sc.set(w, Math.max(0.0001, hS * e), w);
      segMesh.setMatrixAt(i, m4.compose(pv, q, sc));
    });
    segMesh.instanceMatrix.needsUpdate = true;
    colonne.forEach((c, i) => {
      const a0 = avvio[c.ondata];
      const g = a0 === null ? 0 : clamp((t - a0 - c.ritardo) / 0.5, 0, 1);
      const r = 0.3 * z * (0.4 + 0.6 * g) * (0.9 + Math.min(c.n, 6) * 0.06);
      pv.set(c.p.x, c.base + 0.003, c.p.z);
      sc.set(r * g + 0.0001, 1, r * g + 0.0001);
      aloniMesh.setMatrixAt(i, m4.compose(pv, q, sc));
    });
    aloniMesh.instanceMatrix.needsUpdate = true;

    // anelli della sede
    anelli.forEach((m, i) => {
      const fase = ((t * 0.55 + i * 0.5) % 1);
      const s = (0.06 + fase * 0.42) * z;
      m.scale.set(s, 1, s);
      m.material.opacity = (1 - fase) * 0.8;
    });

    // archi
    archi.forEach((m, i) => {
      const goal = avvioArchi === null ? 0 : clamp((t - avvioArchi - i * 0.06) / 1.1, 0, 1);
      m.material.uniforms.uDraw.value = passo < 2 ? Math.max(0, m.material.uniforms.uDraw.value - dt * 1.6) : liscio(goal);
      m.material.uniforms.uTime.value = t;
    });

    renderer.render(scena, camera);

    // etichette
    const W = host.clientWidth, H = host.clientHeight;
    const limite = testa.offsetTop + testa.offsetHeight + 24;
    const limiteBasso = passi.offsetTop + (W < 1040 ? 30 : 60);
    for (const e of ET) {
      let mostra = e.passi.includes(passo) && (!e.bordo || (avvioArchi !== null && t - avvioArchi > 0.9));
      if (mostra) {
        tmp.copy(e.w).project(camera);
        let x = (tmp.x * 0.5 + 0.5) * W, y = (-tmp.y * 0.5 + 0.5) * H;
        if (e.bordo) x = Math.max(x, 14 + (e.el.offsetWidth / 2));
        if (tmp.z > 1 || x < -40 || x > W + 40 || y < limite || y > Math.min(H - 40, (W < 1040 || x < 560) ? limiteBasso : H)) mostra = false;
        else e.el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) translate(-50%, ${e.sotto ? '60%' : '-160%'})`;
      }
      if (mostra !== e.vis) { e.el.classList.toggle('vis', mostra); e.vis = mostra; }
    }
  };

  const giro = (ora) => {
    raf = 0;
    if (!visibile || !attivo) return;
    aggiorna(ora);
    if (!disegnata) { disegnata = true; host.classList.add('pronta'); }
    if (ridotto) return;
    raf = requestAnimationFrame(giro);
  };
  const riprendi = () => {
    if (ridotto) { aggiorna(performance.now()); host.classList.add('pronta'); return; }
    if (!raf && visibile && attivo) { ultimo = performance.now(); raf = requestAnimationFrame(giro); }
  };
  new IntersectionObserver(([v]) => { visibile = v.isIntersecting; riprendi(); }, { rootMargin: '10% 0px' }).observe(sez);
  document.addEventListener('visibilitychange', () => { attivo = !document.hidden; riprendi(); });
  if (ridotto) addEventListener('scroll', () => requestAnimationFrame(() => aggiorna(performance.now())), { passive: true });

  if (renderer.compileAsync) await renderer.compileAsync(scena, camera);
  riprendi();
}

/* Senza WebGL: la stessa mappa in SVG, ferma */
function disegnaSVG(geo, imp, pos) {
  const NS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', '-13 -9.5 18 16');
  svg.setAttribute('preserveAspectRatio', 'xMidYMid slice');
  let d = '', dIt = '';
  for (const c of geo.c) for (const r of c.r) {
    let s = '';
    for (let i = 0; i < r.length; i += 2) s += (i ? 'L' : 'M') + r[i].toFixed(2) + ' ' + (-r[i + 1]).toFixed(2);
    if (c.it) dIt += s + 'Z'; else d += s + 'Z';
  }
  svg.innerHTML = `<path d="${d}" fill="#0F2D62"/><path d="${dIt}" fill="#1D52AE" stroke="#8DB4FF" stroke-width=".03"/>` +
    imp.map((i) => { const p = pos(i.lo, i.la); return `<circle cx="${p.x.toFixed(2)}" cy="${p.z.toFixed(2)}" r=".09" fill="${COL[i.s]}"/>`; }).join('');
  host.appendChild(svg);
  host.classList.add('pronta');
}

main().catch((err) => { console.warn('mappa3d', err); });
