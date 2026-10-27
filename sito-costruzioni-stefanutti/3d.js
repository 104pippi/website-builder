// Come nasce un capannone: plastico three.js con spigoli a inchiostro, costruito dallo scroll.
// Fasi: platea armata e getto, pilastri nei casseri e disarmo, travi e copertura, tamponamenti e uffici.
import * as THREE from 'three';

const COL = {
  inchiostro: 0x24282C, cls: 0xD6D3CD, clsBagnato: 0x8E8B86, cassero: 0xE2B13C,
  ferro: 0x8A4B2F, vetro: 0x9DB6C3, pannello: 0xE4E2DD, portone: 0x8E9398, trave: 0xC9C5BE
};
const rgb = hex => new THREE.Vector3(((hex >> 16) & 255) / 255, ((hex >> 8) & 255) / 255, (hex & 255) / 255);

// colori sRGB scritti così come sono: niente conversione lineare nello shader
const VS = /* glsl */`
varying vec2 vUv;
varying vec3 vN;
void main() {
  vUv = uv;
  vN = normalize(mat3(modelMatrix) * normal);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;
const FS = /* glsl */`
uniform vec3 uColor;
uniform vec3 uInk;
uniform float uOpacity;
uniform float uEdge;
uniform vec2 uRep;
varying vec2 vUv;
varying vec3 vN;
void main() {
  vec3 n = normalize(vN);
  float luce = 0.64 + 0.27 * max(dot(n, normalize(vec3(0.45, 0.85, 0.3))), 0.0) + 0.1 * n.y - 0.07 * max(-n.z, 0.0);
  vec3 c = uColor * luce;
  vec2 q = vUv * uRep;
  vec2 f = fract(q);
  vec2 w = max(fwidth(q), vec2(1e-5));
  vec2 d = min(f, 1.0 - f) / w;
  float spigolo = 1.0 - smoothstep(0.55, 1.45, min(d.x, d.y));
  c = mix(c, uInk, spigolo * uEdge);
  gl_FragColor = vec4(c, uOpacity);
}`;
const VS_SUOLO = /* glsl */`
varying vec3 vW;
void main() {
  vec4 w = modelMatrix * vec4(position, 1.0);
  vW = w.xyz;
  gl_Position = projectionMatrix * viewMatrix * w;
}`;
const FS_SUOLO = /* glsl */`
uniform vec3 uInk;
varying vec3 vW;
void main() {
  vec2 q = vW.xz / 5.0;
  vec2 g = abs(fract(q - 0.5) - 0.5) / max(fwidth(q), vec2(1e-5));
  float riga = 1.0 - min(min(g.x, g.y), 1.0);
  float r = length(vW.xz - vec2(0.0, 3.0)) / 62.0;
  float sfuma = 1.0 - smoothstep(0.45, 1.0, r);
  gl_FragColor = vec4(uInk, riga * 0.12 * sfuma);
}`;

const materiale = (hex, { bordo = 1, opacita = 1, trasparente = false, rep = [1, 1] } = {}) => new THREE.ShaderMaterial({
  uniforms: {
    uColor: { value: rgb(hex) }, uInk: { value: rgb(COL.inchiostro) },
    uOpacity: { value: opacita }, uEdge: { value: bordo }, uRep: { value: new THREE.Vector2(...rep) }
  },
  vertexShader: VS, fragmentShader: FS, transparent: trasparente, depthWrite: true
});

const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const seg = (p, a, b) => clamp((p - a) / (b - a));
const esce = t => 1 - Math.pow(1 - t, 3);
const entra = t => t * t * t;
const morbido = t => t * t * (3 - 2 * t);

export async function avvia({ canvas, scena: contenitore, sezione, etichette, leggiP, ridotto }) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  if (!renderer.getContext()) throw new Error('WebGL non disponibile');
  renderer.setClearColor(0x000000, 0);
  const mobile = matchMedia('(max-width: 900px)').matches;
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, mobile ? 1.5 : 2));

  const scena = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-10, 10, 10, -10, 1, 600);
  const BOX = new THREE.BoxGeometry(1, 1, 1);
  BOX.translate(0, 0.5, 0); // origine alla base: si cresce dal basso

  const blocco = (m, w, h, d, x, y, z) => {
    const b = new THREE.Mesh(BOX, m);
    b.scale.set(w, h, d);
    b.position.set(x, y, z);
    b.userData = { w, h, d, x, y, z };
    scena.add(b);
    return b;
  };

  // suolo con la quadrettatura del lotto
  const suolo = new THREE.Mesh(new THREE.PlaneGeometry(260, 260), new THREE.ShaderMaterial({
    uniforms: { uInk: { value: rgb(COL.inchiostro) } }, vertexShader: VS_SUOLO, fragmentShader: FS_SUOLO,
    transparent: true, depthWrite: false
  }));
  suolo.rotation.x = -Math.PI / 2;
  suolo.position.y = -0.04;
  suolo.renderOrder = -1;
  scena.add(suolo);

  const linea = (punti, colore, opacita = 1, tratteggio = false) => {
    const g = new THREE.BufferGeometry().setFromPoints(punti);
    const m = tratteggio
      ? new THREE.LineDashedMaterial({ color: colore, transparent: true, opacity: opacita, dashSize: 1.2, gapSize: 0.8 })
      : new THREE.LineBasicMaterial({ color: colore, transparent: true, opacity: opacita });
    const l = new THREE.LineSegments(g, m);
    if (tratteggio) l.computeLineDistances();
    scena.add(l);
    return l;
  };
  const rettangolo = (w, d, y, cx = 0, cz = 0) => {
    const a = [[-w / 2, -d / 2], [w / 2, -d / 2], [w / 2, d / 2], [-w / 2, d / 2]].map(([x, z]) => new THREE.Vector3(cx + x, y, cz + z));
    return [a[0], a[1], a[1], a[2], a[2], a[3], a[3], a[0]];
  };

  // recinzione del cantiere e tracciamento dello scavo
  const recinto = linea(rettangolo(74, 52, 0.02, -2, 2), COL.inchiostro, 0.45, true);
  const scavo = linea(rettangolo(51.6, 29.6, 0.03), COL.inchiostro, 0.0);

  // fase 1: rete d'armatura e platea (50 x 28 m = 1.400 mq)
  const PL = { w: 50, d: 28, h: 0.8 };
  const ferri = [];
  for (let z = -13.4; z <= 13.41; z += 1.2) ferri.push({ k: (z + 14) / 28, a: new THREE.Vector3(-24.6, 0.42, z), b: new THREE.Vector3(24.6, 0.42, z) });
  for (let x = -24.6; x <= 24.61; x += 1.2) ferri.push({ k: (x + 25) / 50, a: new THREE.Vector3(x, 0.46, -13.6), b: new THREE.Vector3(x, 0.46, 13.6) });
  ferri.sort((p, q) => p.k - q.k);
  const rete = linea(ferri.flatMap(f => [f.a, f.b]), COL.ferro, 0.95);
  // ombra di contatto morbida sotto il fabbricato
  const ombra = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.ShaderMaterial({
    uniforms: { uInk: { value: rgb(COL.inchiostro) }, uA: { value: 0 } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: 'uniform vec3 uInk; uniform float uA; varying vec2 vUv; void main(){ vec2 d = abs(vUv - 0.5) * 2.0; vec2 k = smoothstep(vec2(0.62), vec2(1.0), d); float a = (1.0 - k.x) * (1.0 - k.y); gl_FragColor = vec4(uInk, a * uA); }',
    transparent: true, depthWrite: false
  }));
  ombra.rotation.x = -Math.PI / 2;
  ombra.scale.set(64, 50, 1);
  ombra.position.set(-1, 0.01, 4);
  ombra.renderOrder = -1;
  scena.add(ombra);
  const matPlatea = materiale(COL.cls);
  const platea = blocco(matPlatea, PL.w, PL.h, PL.d, 0, 0, 0);

  // fase 2: pilastri gettati in opera (h 10,00 m) dentro i casseri gialli
  const XS = [-24, -14.4, -4.8, 4.8, 14.4, 24], ZS = [-13.4, 13.4];
  const matCls = materiale(COL.cls);
  const pilastri = [], casseri = [];
  ZS.forEach(z => XS.forEach(x => {
    pilastri.push(blocco(matCls, 0.7, 10, 0.7, x, PL.h, z));
    casseri.push(blocco(materiale(COL.cassero, { trasparente: true }), 1.12, 10, 1.12, x, PL.h, z));
  }));
  // quota del pilastro d'angolo
  const qx = 25.9, qz = 15.1, y0 = PL.h, y1 = PL.h + 10;
  const quota = linea([
    new THREE.Vector3(qx, y0, qz), new THREE.Vector3(qx, y1, qz),
    new THREE.Vector3(qx - 0.6, y0 - 0.35, qz - 0.6), new THREE.Vector3(qx + 0.6, y0 + 0.35, qz + 0.6),
    new THREE.Vector3(qx - 0.6, y1 - 0.35, qz - 0.6), new THREE.Vector3(qx + 0.6, y1 + 0.35, qz + 0.6),
    new THREE.Vector3(24.5, y1, 13.9), new THREE.Vector3(qx + 0.5, y1, qz + 0.5)
  ], COL.inchiostro, 0);

  // fase 3: travi prefabbricate, canali di gronda, copertura
  const testa = PL.h + 10;
  const matTrave = materiale(COL.trave);
  const travi = XS.map(x => blocco(matTrave, 0.62, 1.4, 27.6, x, testa, 0));
  const gronde = ZS.map(z => blocco(matTrave, 49.2, 0.9, 0.8, 0, testa, z));
  const matTetto = materiale(COL.pannello);
  const tegoli = [];
  for (let b = 0; b < 5; b++) for (let s = 0; s < 4; s++) {
    const xc = (XS[b] + XS[b + 1]) / 2, zc = -13.8 + 6.9 * s + 3.45;
    tegoli.push(blocco(matTetto, 9.4, 0.35, 6.84, xc, testa + 1.4, zc));
  }

  // fase 4: tamponamenti prefabbricati, portone, corpo uffici vetrato
  const matPannello = materiale(COL.pannello);
  const matPortone = materiale(COL.portone);
  const H = 12.6;
  const pareti = [];
  const giro = [];
  for (let i = 0; i < 20; i++) giro.push({ lato: 'retro', x: -23.75 + i * 2.5, z: -13.85, w: 2.5, d: 0.3 });
  for (let i = 0; i < 11; i++) giro.push({ lato: 'dx', x: 24.85, z: -12.73 + i * 2.545, w: 0.3, d: 2.545 });
  for (let i = 19; i >= 0; i--) giro.push({ lato: 'fronte', x: -23.75 + i * 2.5, z: 13.85, w: 2.5, d: 0.3, i });
  for (let i = 10; i >= 0; i--) giro.push({ lato: 'sx', x: -24.85, z: -12.73 + i * 2.545, w: 0.3, d: 2.545 });
  giro.forEach(g => {
    const portone = g.lato === 'fronte' && (g.i === 12 || g.i === 13);
    if (portone) {
      pareti.push(blocco(matPortone, g.w, 5.4, g.d * 0.6, g.x, PL.h, g.z));
      pareti.push(blocco(matPannello, g.w, H - 5.4, g.d, g.x, PL.h + 5.4, g.z));
    } else pareti.push(blocco(matPannello, g.w, H, g.d, g.x, PL.h, g.z));
  });
  const UF = { x: -17.5, z: 18.6, w: 14, d: 9 };
  const ufficiBase = blocco(matCls, UF.w, PL.h, UF.d, UF.x, 0, UF.z);
  const solai = [], vetri = [], montanti = [];
  for (let i = 0; i < 4; i++) solai.push(blocco(matCls, UF.w, 0.42, UF.d, UF.x, PL.h + i * 3.6, UF.z));
  for (let i = 0; i < 3; i++) {
    vetri.push(blocco(materiale(COL.vetro, { trasparente: true, opacita: 0, rep: [10, 1], bordo: 0.85 }), UF.w - 0.5, 3.18, UF.d - 0.5, UF.x, PL.h + 0.42 + i * 3.6, UF.z));
    [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(([a, b]) => montanti.push(blocco(matCls, 0.45, 3.18, 0.45, UF.x + a * (UF.w / 2 - 0.3), PL.h + 0.42 + i * 3.6, UF.z + b * (UF.d / 2 - 0.3))));
  }


  // gru a torre: traliccio a linee, braccio che ruota da solo
  const GX = -31, GZ = -21, GH = 34;
  const traliccio = [];
  const lato = 1.8, passo = 1.8;
  const c4 = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([a, b]) => [a * lato / 2, b * lato / 2]);
  c4.forEach(([a, b]) => traliccio.push(new THREE.Vector3(GX + a, 0, GZ + b), new THREE.Vector3(GX + a, GH, GZ + b)));
  for (let y = 0; y < GH - 0.1; y += passo) {
    for (let k = 0; k < 4; k++) {
      const [a1, b1] = c4[k], [a2, b2] = c4[(k + 1) % 4];
      const alt = (Math.round(y / passo) + k) % 2;
      traliccio.push(new THREE.Vector3(GX + (alt ? a1 : a2), y, GZ + (alt ? b1 : b2)), new THREE.Vector3(GX + (alt ? a2 : a1), y + passo, GZ + (alt ? b2 : b1)));
      traliccio.push(new THREE.Vector3(GX + a1, y, GZ + b1), new THREE.Vector3(GX + a2, y, GZ + b2));
    }
  }
  linea(traliccio, COL.inchiostro, 0.75);
  const rotazione = new THREE.Group();
  rotazione.position.set(GX, GH, GZ);
  scena.add(rotazione);
  const lineeGru = [];
  const L = 36, LC = 11, h = 1.6, cima = 6;
  const v = (x, y, z) => new THREE.Vector3(x, y, z);
  lineeGru.push(v(-LC, 0, -0.8), v(L, 0, -0.8), v(-LC, 0, 0.8), v(L, 0, 0.8), v(0, h, 0), v(L, 0, 0));
  for (let x = 0; x < L - 0.1; x += 2) {
    lineeGru.push(v(x, 0, -0.8), v(x + 1, h * (1 - (x + 1) / L), 0), v(x + 1, h * (1 - (x + 1) / L), 0), v(x + 2, 0, 0.8));
    lineeGru.push(v(x, 0, -0.8), v(x, 0, 0.8));
  }
  lineeGru.push(v(0, 0, 0), v(0, cima, 0), v(0, cima, 0), v(L * 0.62, h * 0.4, 0), v(0, cima, 0), v(-LC, 0, 0));
  const traliccioGru = new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(lineeGru), new THREE.LineBasicMaterial({ color: COL.inchiostro, transparent: true, opacity: 0.8 }));
  rotazione.add(traliccioGru);
  const zavorra = new THREE.Mesh(BOX, matCls);
  zavorra.scale.set(2.6, 2.4, 2.2); zavorra.position.set(-LC + 1.6, -2.4, 0);
  rotazione.add(zavorra);
  const cabina = new THREE.Mesh(BOX, materiale(COL.cassero));
  cabina.scale.set(1.8, 1.8, 1.6); cabina.position.set(1.4, -1.9, 1.5);
  rotazione.add(cabina);
  const carrello = new THREE.Mesh(BOX, matTrave);
  carrello.scale.set(1.4, 0.5, 1.6);
  rotazione.add(carrello);
  const cavoGeo = new THREE.BufferGeometry().setFromPoints([v(0, 0, 0), v(0, -10, 0)]);
  const cavo = new THREE.LineSegments(cavoGeo, new THREE.LineBasicMaterial({ color: COL.inchiostro }));
  rotazione.add(cavo);
  const carico = new THREE.Mesh(BOX, matTrave);
  carico.scale.set(9, 1.0, 0.6);
  rotazione.add(carico);

  // camera ortografica da plastico: inquadratura calcolata sui punti chiave
  const bersaglio = new THREE.Vector3(0, 5, 2);
  const chiave = [];
  [-25.2, 25.2].forEach(x => [-14.2, 23.4].forEach(z => [0, 14.2].forEach(y => chiave.push(v(x, y, z)))));
  chiave.push(v(GX, GH + cima, GZ), v(GX, 0, GZ), v(qx + 2, y1, qz));
  const EL = 0.5;
  const dirCamera = az => v(Math.cos(EL) * Math.sin(az), Math.sin(EL), Math.cos(EL) * Math.cos(az));
  let mezzaAltezza = 30, centro = new THREE.Vector2();
  const inquadra = () => {
    const w = contenitore.clientWidth, hh = contenitore.clientHeight;
    if (!w || !hh) return;
    renderer.setSize(w, hh, false);
    const aspetto = w / hh;
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    [0.8, 0.96, 1.1].forEach(az => {
      camera.position.copy(bersaglio).addScaledVector(dirCamera(az), 200);
      camera.lookAt(bersaglio);
      camera.updateMatrixWorld();
      const inv = camera.matrixWorldInverse;
      chiave.forEach(p => {
        const q = p.clone().applyMatrix4(inv);
        minX = Math.min(minX, q.x); maxX = Math.max(maxX, q.x);
        minY = Math.min(minY, q.y); maxY = Math.max(maxY, q.y);
      });
    });
    centro.set((minX + maxX) / 2, (minY + maxY) / 2);
    const margine = mobile ? 1.04 : 1.08;
    mezzaAltezza = Math.max((maxY - minY) / 2, (maxX - minX) / 2 / aspetto) * margine;
    camera.left = -mezzaAltezza * aspetto; camera.right = mezzaAltezza * aspetto;
    camera.top = mezzaAltezza; camera.bottom = -mezzaAltezza;
    camera.updateProjectionMatrix();
  };
  const destra = new THREE.Vector3(), su = new THREE.Vector3(), dir = new THREE.Vector3();
  const piazzaCamera = az => {
    dir.copy(dirCamera(az));
    destra.set(Math.cos(az), 0, -Math.sin(az));
    su.crossVectors(dir, destra);
    const b = bersaglio.clone().addScaledVector(destra, centro.x).addScaledVector(su, centro.y);
    camera.position.copy(b).addScaledVector(dir, 200);
    camera.lookAt(b);
  };
  inquadra();
  new ResizeObserver(inquadra).observe(contenitore);

  // stato della costruzione per un avanzamento p (0-1)
  const colPlatea = matPlatea.uniforms.uColor.value;
  const asciutto = rgb(COL.cls), bagnato = rgb(COL.clsBagnato);
  const mostra = (m, s) => { m.visible = s > 0.002; };
  const costruisci = p => {
    const f1 = seg(p, 0.0, 0.2), f2 = seg(p, 0.25, 0.45), f3 = seg(p, 0.5, 0.7), f4 = seg(p, 0.75, 0.95);
    scavo.material.opacity = 0.55 * seg(f1, 0, 0.15) * (1 - seg(f1, 0.85, 1));
    rete.geometry.setDrawRange(0, Math.floor(ferri.length * esce(seg(f1, 0.04, 0.5))) * 2);
    const getto = seg(f1, 0.45, 0.85);
    platea.scale.y = Math.max(0.001, PL.h * morbido(getto)); mostra(platea, getto);
    colPlatea.copy(bagnato).lerp(asciutto, seg(f1, 0.7, 1));
    ombra.material.uniforms.uA.value = 0.1 * getto + 0.08 * seg(f4, 0, 0.6);

    pilastri.forEach((pl, i) => {
      const k = i * 0.025;
      const cresce = esce(seg(f2, k, k + 0.5));
      const pieno = seg(f2, k + 0.12, k + 0.62);
      const disarmo = seg(f2, 0.8 + i * 0.01, 0.92 + i * 0.006);
      const cs = casseri[i];
      cs.scale.y = Math.max(0.001, 10 * cresce);
      cs.position.y = PL.h + 7 * entra(disarmo);
      cs.material.uniforms.uOpacity.value = 1 - disarmo;
      mostra(cs, cresce * (1 - disarmo));
      pl.scale.y = Math.max(0.001, 10 * pieno);
      mostra(pl, pieno);
    });
    quota.material.opacity = 0.9 * seg(f2, 0.55, 0.75) * (1 - seg(f4, 0.25, 0.5));

    travi.forEach((t, i) => {
      const e = seg(f3, i * 0.06, i * 0.06 + 0.3);
      t.position.y = testa + 14 * (1 - esce(e)); mostra(t, e);
    });
    gronde.forEach(g => { const e = seg(f3, 0.36, 0.55); g.position.y = testa + 10 * (1 - esce(e)); mostra(g, e); });
    tegoli.forEach((t, k) => {
      const e = seg(f3, 0.5 + k * 0.02, 0.62 + k * 0.02);
      t.position.y = testa + 1.4 + 7 * (1 - esce(e)); mostra(t, e);
    });

    const n = pareti.length;
    pareti.forEach((pa, k) => {
      const a = (k / n) * 0.55;
      const e = esce(seg(f4, a, a + 0.25));
      pa.scale.y = Math.max(0.001, pa.userData.h * e); mostra(pa, e);
    });
    const eb = seg(f4, 0.1, 0.25);
    ufficiBase.scale.y = Math.max(0.001, PL.h * eb); mostra(ufficiBase, eb);
    solai.forEach((s, i) => { const e = seg(f4, 0.2 + i * 0.12, 0.34 + i * 0.12); s.position.y = s.userData.y + 6 * (1 - esce(e)); mostra(s, e); });
    montanti.forEach((m, j) => { const i = Math.floor(j / 4); const e = seg(f4, 0.26 + i * 0.12, 0.38 + i * 0.12); m.scale.y = Math.max(0.001, 3.18 * e); mostra(m, e); });
    vetri.forEach((vt, i) => { const e = seg(f4, 0.62 + i * 0.1, 0.8 + i * 0.1); vt.material.uniforms.uOpacity.value = 0.55 * e; mostra(vt, e); });

    return { f1, f2, f3, f4 };
  };

  // etichette HTML agganciate ai punti 3D
  const etichetta = Object.fromEntries(etichette.map(el => [el.dataset.etichetta, el]));
  const ancore = { platea: v(14, PL.h, 14.4), pilastro: v(qx + 0.3, y1 - 2.2, qz + 0.3) };
  const tmp = new THREE.Vector3();
  const aggiornaEtichette = (fasi, w, hh) => {
    const vis = {
      platea: seg(fasi.f1, 0.75, 0.95) * (1 - seg(fasi.f2, 0.1, 0.35)),
      pilastro: seg(fasi.f2, 0.6, 0.8) * (1 - seg(fasi.f3, 0.5, 0.8))
    };
    for (const k in ancore) {
      const el = etichetta[k];
      if (!el) continue;
      tmp.copy(ancore[k]).project(camera);
      const x = (tmp.x + 1) / 2 * w, y = (1 - tmp.y) / 2 * hh;
      el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) translate(${k === 'pilastro' ? '10px' : '-50%'}, -50%)`;
      el.style.opacity = vis[k].toFixed(3);
    }
  };

  // avanzamento morbido + piccola intro automatica quando la scena entra in vista
  let pMostrato = leggiP(), visibile = false, attivo = !document.hidden, t0 = 0, introDa = -1, ultimo = 0;
  new IntersectionObserver(([v]) => { visibile = v.isIntersecting; if (visibile) richiedi(); }, { threshold: 0.01 }).observe(contenitore);
  document.addEventListener('visibilitychange', () => { attivo = !document.hidden; if (attivo) richiedi(); });
  if (ridotto) addEventListener('scroll', () => richiedi(), { passive: true });

  let rafId = 0;
  const richiedi = () => { if (!rafId) rafId = requestAnimationFrame(disegna); };
  function disegna() {
    rafId = 0;
    const ora = performance.now();
    const dt = Math.min(0.05, (ora - (ultimo || ora)) / 1000);
    ultimo = ora;
    const t = (ora - t0) / 1000;
    const pScroll = leggiP();
    if (ridotto) pMostrato = Math.max(pScroll, 0.24);
    else {
      if (introDa < 0) introDa = t;
      const intro = 0.095 * morbido(clamp((t - introDa - 0.2) / 2.4));
      pMostrato += (Math.max(pScroll, intro) - pMostrato) * (1 - Math.exp(-dt * 5));
    }
    const fasi = costruisci(pMostrato);

    const tm = ridotto ? 0 : t;
    const az = 0.8 + 0.32 * pMostrato + 0.035 * Math.sin(tm * 0.21);
    piazzaCamera(az);
    rotazione.rotation.y = 0.55 + 0.75 * Math.sin(tm * 0.11) + 0.25 * Math.sin(tm * 0.047);
    const r = 15 + 12 * (0.5 + 0.5 * Math.sin(tm * 0.083));
    const discesa = 11 + 3.5 * Math.sin(tm * 0.13);
    carrello.position.set(r, -0.5, 0);
    cavo.position.set(r, -0.5, 0);
    cavo.scale.y = discesa / 10;
    carico.position.set(r - 4.5, -0.5 - discesa - 1.0, -0.3);
    carico.rotation.y = 0.18 * Math.sin(tm * 0.37);

    renderer.render(scena, camera);
    aggiornaEtichette(fasi, contenitore.clientWidth, contenitore.clientHeight);
    if (!ridotto && visibile && attivo) richiedi();
  }

  costruisci(Math.max(leggiP(), 0.0));
  piazzaCamera(0.8);
  await renderer.compileAsync(scena, camera);
  t0 = performance.now();
  renderer.render(scena, camera);
  richiedi();
  return true;
}
