// Videoispezione in 3D: la telecamera avanza in una fognatura guidata dallo scroll.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const R = 1;                 // raggio del tubo
const Z_INIZIO = 2;
const Z_PVC = -4;            // fine del tratto nuovo in PVC
const Z_RADICI = -8;         // giunto con le radici
const Z_ROTTO = -14;         // giunto aperto che gocciola
const Z_DANNO0 = -20;        // tratto corroso da risanare
const Z_DANNO1 = -28;
const Z_FINE = -40;
const Y_ACQUA = -0.9;

function casuale(seme) {
  return () => {
    seme |= 0; seme = (seme + 0x6D2B79F5) | 0;
    let t = Math.imul(seme ^ (seme >>> 15), 1 | seme);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function tela(w, h, disegna) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  disegna(c.getContext('2d'), w, h);
  return c;
}

function texture(canvas, ripeti = [1, 1], colore = true) {
  const t = new THREE.CanvasTexture(canvas);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(ripeti[0], ripeti[1]);
  if (colore) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

// macchie morbide sparse
function macchie(ctx, rnd, w, h, n, colori, rMin, rMax, aMin, aMax) {
  for (let i = 0; i < n; i++) {
    const x = rnd() * w, y = rnd() * h, r = rMin + rnd() * (rMax - rMin);
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    const c = colori[Math.floor(rnd() * colori.length)];
    g.addColorStop(0, `rgba(${c},${aMin + rnd() * (aMax - aMin)})`);
    g.addColorStop(1, `rgba(${c},0)`);
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
}

// fondo del tubo (u = 0,5): sedimento e linea dell'acqua
function fondo(ctx, rnd, w, h, colore, alfa) {
  const g = ctx.createLinearGradient(w * 0.28, 0, w * 0.72, 0);
  g.addColorStop(0, `rgba(${colore},0)`);
  g.addColorStop(0.3, `rgba(${colore},${alfa * 0.8})`);
  g.addColorStop(0.5, `rgba(${colore},${alfa})`);
  g.addColorStop(0.7, `rgba(${colore},${alfa * 0.8})`);
  g.addColorStop(1, `rgba(${colore},0)`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = 'rgba(30,20,10,0.35)';
  for (const x of [w * 0.335, w * 0.665]) {
    for (let y = 0; y < h; y += 2) ctx.fillRect(x + Math.sin(y * 0.07) * 2 + (rnd() - 0.5) * 2, y, 2.2, 2);
  }
}

// giunto: banda scura all'inizio di ogni piastrella (ogni 2 unità di tubo)
function giunto(ctx, w, h, scuro) {
  ctx.fillStyle = scuro; ctx.fillRect(0, 0, w, 7); ctx.fillRect(0, h - 3, w, 3);
  ctx.fillStyle = 'rgba(255,255,255,0.08)'; ctx.fillRect(0, 7, w, 2);
}

function pareteTela(tipo, seme) {
  const rnd = casuale(seme);
  return tela(512, 512, (ctx, w, h) => {
    if (tipo === 'pvc') {
      ctx.fillStyle = '#A9572B'; ctx.fillRect(0, 0, w, h);
      for (let i = 0; i < 160; i++) {
        ctx.fillStyle = rnd() < 0.5 ? `rgba(236,150,90,${0.03 + rnd() * 0.07})` : `rgba(110,45,15,${0.03 + rnd() * 0.06})`;
        ctx.fillRect(rnd() * w, 0, 1 + rnd() * 3, h);
      }
      macchie(ctx, rnd, w, h, 40, ['90,50,25', '60,40,25'], 8, 40, 0.05, 0.16);
      fondo(ctx, rnd, w, h, '70,48,28', 0.75);
      giunto(ctx, w, h, 'rgba(70,28,8,0.75)');
    } else {
      ctx.fillStyle = '#8B857A'; ctx.fillRect(0, 0, w, h);
      macchie(ctx, rnd, w, h, 260, ['120,114,104', '96,90,82', '150,144,132', '110,92,70'], 6, 46, 0.12, 0.35);
      for (let i = 0; i < 2600; i++) {
        const v = 60 + rnd() * 120;
        ctx.fillStyle = `rgba(${v},${v - 4},${v - 10},${0.15 + rnd() * 0.3})`;
        ctx.fillRect(rnd() * w, rnd() * h, 1 + rnd() * 2, 1 + rnd() * 2);
      }
      // colature dall'alto verso il fondo
      for (let i = 0; i < 26; i++) {
        const y = rnd() * h, lato = rnd() < 0.5 ? 1 : -1;
        const x0 = lato > 0 ? rnd() * 60 : w - rnd() * 60;
        const g = ctx.createLinearGradient(x0, 0, x0 + lato * 160, 0);
        g.addColorStop(0, 'rgba(90,70,45,0.28)'); g.addColorStop(1, 'rgba(90,70,45,0)');
        ctx.fillStyle = g;
        ctx.fillRect(Math.min(x0, x0 + lato * 160), y, 160, 2 + rnd() * 5);
      }
      if (tipo === 'danno') {
        macchie(ctx, rnd, w, h, 90, ['120,62,24', '80,40,18', '40,28,20'], 10, 60, 0.3, 0.7);
        // crepe
        ctx.strokeStyle = 'rgba(20,14,10,0.85)'; ctx.lineCap = 'round';
        for (let i = 0; i < 9; i++) {
          let x = rnd() * w, y = rnd() * h; ctx.lineWidth = 1.5 + rnd() * 2.5;
          ctx.beginPath(); ctx.moveTo(x, y);
          for (let k = 0; k < 14; k++) { x += (rnd() - 0.5) * 34; y += (rnd() - 0.3) * 30; ctx.lineTo(x, y); }
          ctx.stroke();
        }
        // buchi
        for (let i = 0; i < 14; i++) {
          const x = rnd() * w, y = rnd() * h, r = 4 + rnd() * 14;
          ctx.fillStyle = 'rgba(10,8,6,0.9)'; ctx.beginPath();
          for (let a = 0; a < 6.28; a += 0.6) { const rr = r * (0.6 + rnd() * 0.6); ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
          ctx.fill();
          ctx.strokeStyle = 'rgba(150,80,30,0.6)'; ctx.lineWidth = 2; ctx.stroke();
        }
      }
      fondo(ctx, rnd, w, h, '58,46,32', 0.8);
      giunto(ctx, w, h, 'rgba(30,26,22,0.8)');
    }
  });
}

function rivestimentoTela() {
  const rnd = casuale(7);
  return tela(512, 512, (ctx, w, h) => {
    const g = ctx.createLinearGradient(0, 0, w, 0);
    g.addColorStop(0, '#D8C489'); g.addColorStop(0.5, '#C9B270'); g.addColorStop(1, '#D8C489');
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    ctx.lineWidth = 1;
    for (let i = -h; i < w + h; i += 9) {
      ctx.strokeStyle = 'rgba(255,248,220,0.10)';
      ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i + h, h); ctx.stroke();
      ctx.strokeStyle = 'rgba(120,96,40,0.10)';
      ctx.beginPath(); ctx.moveTo(i + h, 0); ctx.lineTo(i, h); ctx.stroke();
    }
    macchie(ctx, rnd, w, h, 30, ['255,240,200', '150,120,60'], 20, 70, 0.05, 0.12);
  });
}

function acquaNormali() {
  const rnd = casuale(3);
  const N = 256;
  const altezza = tela(N, N, (ctx, w, h) => {
    ctx.fillStyle = '#808080'; ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 160; i++) {
      const x = rnd() * w, y = rnd() * h, rx = 8 + rnd() * 26, ry = 3 + rnd() * 8;
      for (const [dx, dy] of [[0, 0], [w, 0], [-w, 0], [0, h], [0, -h]]) {
        const g = ctx.createRadialGradient(x + dx, y + dy, 0, x + dx, y + dy, rx);
        const v = rnd() < 0.5 ? 255 : 0;
        g.addColorStop(0, `rgba(${v},${v},${v},0.22)`); g.addColorStop(1, `rgba(${v},${v},${v},0)`);
        ctx.save(); ctx.translate(x + dx, y + dy); ctx.scale(1, ry / rx); ctx.translate(-(x + dx), -(y + dy));
        ctx.fillStyle = g; ctx.fillRect(x + dx - rx, y + dy - rx, rx * 2, rx * 2); ctx.restore();
      }
    }
  });
  const src = altezza.getContext('2d').getImageData(0, 0, N, N).data;
  const out = tela(N, N, () => {});
  const ctx = out.getContext('2d');
  const img = ctx.createImageData(N, N);
  const H = (x, y) => src[(((y + N) % N) * N + ((x + N) % N)) * 4] / 255;
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const dx = (H(x + 1, y) - H(x - 1, y)) * 2.2, dy = (H(x, y + 1) - H(x, y - 1)) * 2.2;
    const l = Math.hypot(dx, dy, 1), i = (y * N + x) * 4;
    img.data[i] = (-dx / l * 0.5 + 0.5) * 255; img.data[i + 1] = (-dy / l * 0.5 + 0.5) * 255;
    img.data[i + 2] = (1 / l * 0.5 + 0.5) * 255; img.data[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  return out;
}

// pezzo di tubo dritto lungo z, visto dall'interno; u = 0 in alto, 0,5 sul fondo
function tratto(z0, z1, materiale, raggio = R) {
  const L = z0 - z1;
  const g = new THREE.CylinderGeometry(raggio, raggio, L, 72, Math.max(2, Math.round(L * 2)), true);
  g.rotateX(-Math.PI / 2);
  g.translate(0, 0, (z0 + z1) / 2);
  return new THREE.Mesh(g, materiale);
}

function radiciGeometria() {
  const rnd = casuale(11);
  const geos = [];
  const SEG = 18;
  for (let i = 0; i < 150; i++) {
    const grossa = i < 12;
    const th = (rnd() - 0.5) * (grossa ? 1.6 : 2.6);
    const a = new THREE.Vector3(Math.sin(th) * 0.975, Math.cos(th) * 0.975, Z_RADICI + (rnd() - 0.5) * 0.14);
    const punti = [a.clone()];
    let p = a.clone();
    const dir = new THREE.Vector3(-a.x * 0.7 + (rnd() - 0.5) * 0.7, -a.y * 0.7 - 0.4, (rnd() - 0.5) * 1.3).normalize();
    const L = grossa ? 0.6 + rnd() * 0.6 : 0.35 + rnd() * 1.2;
    const passi = 8;
    for (let k = 1; k <= passi; k++) {
      dir.y -= 0.17; dir.x += (rnd() - 0.5) * 0.55; dir.z += (rnd() - 0.5) * 0.55; dir.normalize();
      p = p.clone().addScaledVector(dir, L / passi);
      const r = Math.hypot(p.x, p.y);
      if (r > 0.95) { p.x *= 0.95 / r; p.y *= 0.95 / r; }
      if (p.y < Y_ACQUA + 0.02) p.y = Y_ACQUA + 0.02 + rnd() * 0.03;
      punti.push(p);
    }
    const radiali = grossa ? 6 : 4;
    const g = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(punti), SEG, grossa ? 0.017 + rnd() * 0.014 : 0.0032 + rnd() * 0.0065, radiali, false);
    const n = g.attributes.position.count;
    const t = new Float32Array(n);
    for (let v = 0; v < n; v++) t[v] = Math.floor(v / (radiali + 1)) / SEG;
    g.setAttribute('aT', new THREE.BufferAttribute(t, 1));
    geos.push(g);
  }
  return mergeGeometries(geos);
}

export default async function avviaTubo(canvas, palco, stato) {
  const mobile = matchMedia('(max-width: 760px)').matches;
  const riduci = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(pointer: fine)').matches;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, mobile ? 1.5 : 2));
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.localClippingEnabled = true;

  const scena = new THREE.Scene();
  const BUIO = 0x050607;
  scena.background = new THREE.Color(BUIO);
  scena.fog = new THREE.Fog(BUIO, 2.2, 13.5);

  const camera = new THREE.PerspectiveCamera(70, 1, 0.03, 40);
  scena.add(camera);
  const faro = new THREE.PointLight(0xFFF0DC, 7.5, 0, 1.15);
  faro.position.set(0, 0.06, 0.05);
  camera.add(faro);
  scena.add(new THREE.AmbientLight(0xA8BCC8, 0.05));
  const luceFronte = new THREE.PointLight(0xFFB050, 0, 7, 1.4);
  scena.add(luceFronte);

  // uniform condivise dalle pareti: impulsi della sonda
  const U = { uTempo: { value: 0 }, uSegnale: { value: 0 }, uOrigine: { value: -11.6 }, uFronte: { value: 0 }, uFronteVis: { value: 0 } };
  const conImpulsi = (mat, bagliore) => {
    mat.onBeforeCompile = (sh) => {
      Object.assign(sh.uniforms, U);
      sh.vertexShader = sh.vertexShader
        .replace('#include <common>', '#include <common>\nvarying float vZw;')
        .replace('#include <begin_vertex>', '#include <begin_vertex>\nvZw = (modelMatrix * vec4(transformed, 1.0)).z;');
      sh.fragmentShader = sh.fragmentShader
        .replace('#include <common>', '#include <common>\nvarying float vZw;\nuniform float uTempo, uSegnale, uOrigine, uFronte, uFronteVis;')
        .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
          float dS = uOrigine - vZw;
          float fase = fract(dS / 2.1 - uTempo * 0.85);
          float anello = smoothstep(0.0, 0.05, fase) * (1.0 - smoothstep(0.05, 0.17, fase));
          float svan = exp(-max(dS, 0.0) * 0.15) * step(0.3, dS);
          totalEmissiveRadiance += vec3(0.16, 0.70, 0.86) * anello * svan * uSegnale * 1.8;
          ${bagliore ? 'totalEmissiveRadiance += vec3(1.0, 0.62, 0.26) * exp(-abs(vZw - uFronte) * 5.0) * uFronteVis * 0.9;' : ''}`);
    };
    mat.customProgramCacheKey = () => (bagliore ? 'parete-bagliore' : 'parete');
    return mat;
  };

  const tex = (tipo, seme, L) => texture(pareteTela(tipo, seme), [1, L / 2]);
  const materialeParete = (tipo, seme, L) => {
    const t = tex(tipo, seme, L);
    return conImpulsi(new THREE.MeshStandardMaterial({
      map: t, bumpMap: t, bumpScale: tipo === 'pvc' ? 0.4 : 2.2,
      roughness: tipo === 'pvc' ? 0.42 : 0.88, metalness: 0, side: THREE.BackSide,
    }), false);
  };
  scena.add(tratto(Z_INIZIO, Z_PVC, materialeParete('pvc', 1, Z_INIZIO - Z_PVC)));
  scena.add(tratto(Z_PVC, Z_DANNO0, materialeParete('cemento', 2, Z_PVC - Z_DANNO0)));
  scena.add(tratto(Z_DANNO0, Z_DANNO1, materialeParete('danno', 3, Z_DANNO0 - Z_DANNO1)));
  scena.add(tratto(Z_DANNO1, Z_FINE, materialeParete('cemento', 4, Z_DANNO1 - Z_FINE)));

  // anelli dei giunti
  const anelli = [];
  for (let z = 0; z >= Z_FINE + 2; z -= 2) anelli.push(z);
  const geoAnello = new THREE.TorusGeometry(R * 0.992, 0.022, 6, 72);
  const matAnello = new THREE.MeshStandardMaterial({ color: 0x4A4036, roughness: 0.7 });
  const giunti = new THREE.InstancedMesh(geoAnello, matAnello, anelli.length);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), s1 = new THREE.Vector3(1, 1, 1);
  anelli.forEach((z, i) => {
    if (z === Z_ROTTO) {
      q.setFromEuler(new THREE.Euler(0.07, 0.03, 0));
      m4.compose(new THREE.Vector3(0.015, -0.045, z), q, s1);
    } else {
      m4.compose(new THREE.Vector3(0, 0, z), q.identity(), s1);
    }
    giunti.setMatrixAt(i, m4);
  });
  scena.add(giunti);
  // fessura nera del giunto aperto
  const fessura = new THREE.Mesh(new THREE.TorusGeometry(R * 0.985, 0.03, 6, 72, Math.PI * 0.9), new THREE.MeshBasicMaterial({ color: 0x050403 }));
  fessura.position.set(0, 0, Z_ROTTO - 0.07);
  fessura.rotation.z = Math.PI * 0.05;
  scena.add(fessura);

  // acqua sul fondo
  const larghezza = 2 * Math.sqrt(R * R - Y_ACQUA * Y_ACQUA) - 0.02;
  const lunghezza = Z_INIZIO - Z_FINE;
  const normaliAcqua = texture(acquaNormali(), [2.2, lunghezza / 0.9], false);
  const matAcqua = new THREE.MeshStandardMaterial({ color: 0x231D13, roughness: 0.08, metalness: 0, normalMap: normaliAcqua, normalScale: new THREE.Vector2(1.25, 1.25) });
  // riflesso delle pareti illuminate: più forte a incidenza radente e vicino alla telecamera
  matAcqua.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, U);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying float vZw;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvZw = (modelMatrix * vec4(transformed, 1.0)).z;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying float vZw;\nuniform float uFronte, uTempo;')
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        vec3 versoCam = normalize(vViewPosition);
        float fres = pow(1.0 - clamp(dot(normal, versoCam), 0.0, 1.0), 3.5);
        float dist = length(vViewPosition);
        float cala = 1.0 / (1.0 + dist * dist * 0.11);
        vec3 parete = vZw > ${Z_PVC.toFixed(1)} ? vec3(0.62, 0.30, 0.13) : vec3(0.40, 0.37, 0.32);
        if (vZw < ${(Z_DANNO0 + 0.4).toFixed(1)} && vZw > uFronte) parete = vec3(0.70, 0.58, 0.32);
        float scintilla = pow(max(0.0, abs(normal.x) * 0.9 + normal.z * 0.45), 14.0);
        totalEmissiveRadiance += parete * fres * cala * 1.25 + vec3(0.9, 0.85, 0.75) * scintilla * cala * 0.9;`);
  };
  matAcqua.customProgramCacheKey = () => 'acqua';
  const acqua = new THREE.Mesh(new THREE.PlaneGeometry(larghezza, lunghezza), matAcqua);
  acqua.rotation.x = -Math.PI / 2;
  acqua.position.set(0, Y_ACQUA, (Z_INIZIO + Z_FINE) / 2);
  scena.add(acqua);

  // radici
  const U_RADICI = { uCrescita: { value: 1 }, uTempo: U.uTempo };
  const matRadici = new THREE.MeshStandardMaterial({ color: 0xB89D7C, roughness: 0.74 });
  matRadici.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, U_RADICI);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nattribute float aT;\nvarying float vT;\nuniform float uTempo;')
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        vT = aT;
        transformed.x += sin(uTempo * 1.3 + position.z * 5.0 + position.y * 3.0) * 0.014 * aT;
        transformed.z += cos(uTempo * 0.9 + position.x * 4.0) * 0.02 * aT;`);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying float vT;\nuniform float uCrescita;')
      .replace('#include <clipping_planes_fragment>', '#include <clipping_planes_fragment>\nif (vT > uCrescita) discard;')
      .replace('#include <color_fragment>', '#include <color_fragment>\ndiffuseColor.rgb *= mix(0.55, 1.1, vT);');
  };
  matRadici.customProgramCacheKey = () => 'radici';
  const radici = new THREE.Mesh(radiciGeometria(), matRadici);
  scena.add(radici);

  // gocce dal giunto aperto
  const NG = 36;
  const gocce = new Float32Array(NG * 3);
  const rndG = casuale(5);
  const datiGocce = Array.from({ length: NG }, () => {
    const x = (rndG() - 0.5) * 0.5;
    return { x, z: Z_ROTTO - 0.07 + (rndG() - 0.5) * 0.05, top: Math.sqrt(1 - x * x) * 0.96, fase: rndG(), vel: 0.9 + rndG() * 0.5 };
  });
  const geoGocce = new THREE.BufferGeometry();
  geoGocce.setAttribute('position', new THREE.BufferAttribute(gocce, 3));
  const sprite = new THREE.CanvasTexture(tela(32, 32, (ctx) => {
    const g = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
    g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.5, 'rgba(220,240,255,0.6)'); g.addColorStop(1, 'rgba(220,240,255,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, 32, 32);
  }));
  const puntiGocce = new THREE.Points(geoGocce, new THREE.PointsMaterial({ map: sprite, size: 0.05, transparent: true, depthWrite: false, color: 0xD6ECFF }));
  scena.add(puntiGocce);

  // rivestimento in resina che cresce sul tratto corroso
  const pianoRiv = new THREE.Plane(new THREE.Vector3(0, 0, 1), -Z_DANNO0);
  const texRiv = texture(rivestimentoTela(), [1, (Z_DANNO0 - Z_DANNO1 + 1.2) / 1.5]);
  const matRiv = conImpulsi(new THREE.MeshPhysicalMaterial({
    map: texRiv, roughness: 0.34, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.14, side: THREE.BackSide, clippingPlanes: [pianoRiv],
  }), true);
  const rivestimento = tratto(Z_DANNO0 + 0.4, Z_DANNO1 - 0.8, matRiv, R * 0.958);
  scena.add(rivestimento);
  const bordoRiv = new THREE.Mesh(new THREE.TorusGeometry(R * 0.962, 0.03, 8, 72), new THREE.MeshStandardMaterial({ color: 0xB39A5C, roughness: 0.4 }));
  bordoRiv.position.z = Z_DANNO0 + 0.4;
  scena.add(bordoRiv);
  const fronte = new THREE.Mesh(new THREE.TorusGeometry(R * 0.955, 0.02, 6, 72), new THREE.MeshBasicMaterial({ color: 0xFFC27A, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
  scena.add(fronte);

  // dimensioni
  function dimensiona() {
    const w = palco.clientWidth, h = palco.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.fov = camera.aspect < 0.8 ? 78 : camera.aspect < 1.3 ? 70 : 62;
    camera.updateProjectionMatrix();
  }
  dimensiona();
  new ResizeObserver(dimensiona).observe(palco);

  // puntatore: solo un extra su desktop
  const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
  if (fine) {
    palco.addEventListener('pointermove', (e) => {
      const r = palco.getBoundingClientRect();
      mouse.tx = ((e.clientX - r.left) / r.width - 0.5) * 2;
      mouse.ty = ((e.clientY - r.top) / r.height - 0.5) * 2;
    });
    palco.addEventListener('pointerleave', () => { mouse.tx = 0; mouse.ty = 0; });
  }

  const tra = (p, a, b) => Math.min(1, Math.max(0, (p - a) / (b - a)));
  const morbido = (t) => t * t * (3 - 2 * t);
  let zCam = stato.z;
  let tempo = 0;
  let prima = performance.now();
  const bersaglio = new THREE.Vector3();

  function aggiorna(dt) {
    const p = stato.p;
    tempo += riduci ? 0 : dt;
    U.uTempo.value = tempo;
    const k = riduci ? 1 : 1 - Math.exp(-dt * 6);
    zCam += (stato.z - zCam) * k;
    mouse.x += (mouse.tx - mouse.x) * k; mouse.y += (mouse.ty - mouse.y) * k;

    const ondeggia = Math.sin(tempo * 0.55) * 0.035;
    const sobbalzo = Math.sin(tempo * 1.7) * 0.012 + Math.sin(tempo * 3.1) * 0.004;
    camera.position.set(ondeggia + mouse.x * 0.06, -0.2 + sobbalzo, zCam);
    bersaglio.set(ondeggia * 0.4 + mouse.x * 0.45, -0.1 - mouse.y * 0.22, zCam - 5);
    camera.lookAt(bersaglio);
    camera.rotation.z += Math.sin(tempo * 0.4) * 0.01;

    // radici: la stasatrice le porta via mentre si avanza
    U_RADICI.uCrescita.value = 1.02 - morbido(tra(p, 0.34, 0.415)) * 1.04;
    radici.visible = U_RADICI.uCrescita.value > 0;

    // sonda: impulsi sulle pareti
    U.uSegnale.value = morbido(tra(p, 0.47, 0.56)) * (1 - morbido(tra(p, 0.7, 0.76)));
    U.uOrigine.value = zCam;

    // risanamento: il fronte avanza lungo il tratto corroso
    const cresce = morbido(tra(p, 0.7, 0.97));
    const zF = Z_DANNO0 + 0.4 - cresce * (Z_DANNO0 - Z_DANNO1 + 1.2);
    pianoRiv.constant = -zF;
    U.uFronte.value = zF;
    const vis = cresce > 0.001 && cresce < 0.999 ? 1 : 0;
    U.uFronteVis.value += (vis - U.uFronteVis.value) * Math.min(1, dt * 4 + (riduci ? 1 : 0));
    fronte.position.set(0, 0, zF);
    fronte.visible = cresce > 0.001;
    fronte.material.opacity = 0.35 + U.uFronteVis.value * 0.65;
    luceFronte.position.set(0, -0.1, zF + 0.4);
    luceFronte.intensity = U.uFronteVis.value * (2.2 + Math.sin(tempo * 9) * 0.25);
    rivestimento.visible = bordoRiv.visible = cresce > 0.001;

    // acqua e gocce
    normaliAcqua.offset.y += dt * 0.32;
    const pos = geoGocce.attributes.position;
    datiGocce.forEach((g, i) => {
      const f = (g.fase + tempo * 0.55 * g.vel) % 1;
      const y = g.top - (g.top - Y_ACQUA) * f * f;
      pos.setXYZ(i, g.x * (1 - f * 0.2), y, g.z);
    });
    pos.needsUpdate = true;
  }

  function disegna() { renderer.render(scena, camera); }

  // prima compilazione senza blocchi, poi dissolvenza
  aggiorna(0);
  try { await renderer.compileAsync(scena, camera); } catch (e) { /* compila al primo render */ }
  disegna();
  palco.classList.add('pronto');

  let attivo = true;
  let inCiclo = false;
  function ciclo() {
    if (!attivo || document.hidden) { inCiclo = false; return; }
    inCiclo = true;
    const ora = performance.now();
    const dt = Math.min(0.05, Math.max(0, (ora - prima) / 1000));
    prima = ora;
    aggiorna(dt);
    disegna();
    requestAnimationFrame(ciclo);
  }
  function riparti() {
    if (!inCiclo && attivo && !document.hidden) { prima = performance.now(); requestAnimationFrame(ciclo); }
  }
  new IntersectionObserver(([v]) => { attivo = v.isIntersecting; riparti(); }, { rootMargin: '10% 0px' }).observe(palco);
  document.addEventListener('visibilitychange', riparti);
  riparti();
}
