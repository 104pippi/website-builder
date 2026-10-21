// La goccia: olio lubrificante usato in raymarching WebGL2. Cade nell'hero, scende con la pagina
// e nel palco della rigenerazione si divide in 67 / 20 / 8 / 5 kg. Canvas fisso, tempo da performance.now().

const html = document.documentElement;
const canvas = document.querySelector('.goccia-canvas');
const gl = canvas && canvas.getContext('webgl2', {
  alpha: true, premultipliedAlpha: true, antialias: false, depth: false, stencil: false, powerPreference: 'high-performance'
});
if (!gl) throw new Error('WebGL2 non disponibile');

const VS = `#version 300 es
void main() {
  vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
  gl_Position = vec4(p * 2. - 1., 0., 1.);
}`;

const FS = `#version 300 es
precision highp float;
uniform vec2 uRes;
uniform float uH, uD, uT, uK, uOnda;
uniform vec4 uB[6];   // centro, raggio
uniform vec4 uC[6];   // colore di trasmissione, iridescenza
uniform vec4 uM[6];   // densità, luce trasmessa
uniform vec4 uBound;
uniform vec4 uGl;     // bagliore del palco: centro, raggio, intensità
uniform float uCaldo;
out vec4 o;

float sm(float a, float b, float k, out float h) {
  h = clamp(.5 + .5 * (b - a) / k, 0., 1.);
  return mix(b, a, h) - k * h * (1. - h);
}
float onda(vec3 p) {
  return uOnda * sin(p.x * 5.1 + uT * 1.3) * sin(p.y * 4.3 - uT * 1.1) * sin(p.z * 4.7 + uT * .9);
}
float mappa(vec3 p) {
  float h, d = length(p - uB[0].xyz) - uB[0].w;
  for (int i = 1; i < 6; i++) d = sm(d, length(p - uB[i].xyz) - uB[i].w, uK, h);
  return d + onda(p);
}
void materiale(vec3 p, out vec4 c, out vec4 m) {
  float h, d = length(p - uB[0].xyz) - uB[0].w;
  c = uC[0]; m = uM[0];
  for (int i = 1; i < 6; i++) {
    d = sm(d, length(p - uB[i].xyz) - uB[i].w, uK, h);
    c = mix(uC[i], c, h);
    m = mix(uM[i], m, h);
  }
}
vec3 normale(vec3 p) {
  const vec2 e = vec2(1., -1.) * .003;
  return normalize(e.xyy * mappa(p + e.xyy) + e.yyx * mappa(p + e.yyx) + e.yxy * mappa(p + e.yxy) + e.xxx * mappa(p + e.xxx));
}

// studio: stanza blu notte, softbox in alto a sinistra, striscia teal a destra, controluce ambra
vec3 ambiente(vec3 r) {
  vec3 c = mix(vec3(.008, .03, .052), vec3(.05, .12, .18), smoothstep(-.5, .9, r.y));
  float s = dot(r, normalize(vec3(-.55, .62, .56)));
  c += vec3(1., .97, .92) * smoothstep(.9, .968, s) * 3.4;
  c += vec3(.5, .72, .85) * smoothstep(.5, .95, s) * .16;
  float st = smoothstep(.15, .03, abs(r.x - .74)) * smoothstep(-.5, -.1, r.y) * smoothstep(.85, .4, r.y);
  c += vec3(0., .69, .66) * st * 1.5;
  // alle spalle: orizzonte chiaro e finestra calda, che le gocce trasparenti mostrano capovolti
  float dietro = smoothstep(-.1, -.75, r.z);
  c += vec3(.9, .9, .86) * smoothstep(.2, .02, abs(r.y - .06)) * dietro * 1.1;
  c += vec3(1., .82, .52) * smoothstep(.42, 0., length(r.xy - vec2(.08, -.34))) * dietro * .9;
  c += vec3(.25, .4, .45) * dietro * smoothstep(.1, .8, r.y) * .5;
  c += vec3(.95, .58, .2) * smoothstep(-.25, -.95, r.y) * .2;
  return c;
}

vec3 tinta(vec3 p, vec3 rd, vec3 n, vec4 c, vec4 m) {
  float ct = clamp(dot(n, -rd), 0., 1.);
  float F = .04 + .96 * pow(1. - ct, 5.);
  vec3 R = ambiente(reflect(rd, n));
  // pellicola sottile: l'iridescenza del petrolio
  float th = sin(dot(p, vec3(1.9, 1.3, -1.1)) + uT * .35) + .6 * sin(p.y * 3.7 - p.x * 2.3 - uT * .5);
  vec3 ir = .5 + .5 * cos(6.2832 * (th * .32 + ct * .85 + vec3(0., .33, .67)));
  // nero lucido: la pellicola colora solo la fascia tra centro e bordo
  float fascia = smoothstep(.2, .55, 1. - ct) * (1. - smoothstep(.68, .9, 1. - ct));
  vec3 spec = R * F * mix(vec3(1.), ir * 1.5, fascia * .45 * c.a) + ir * fascia * .035 * c.a;
  // trasmissione: la goccia fa da lente, centro luminoso e bordo più carico (Beer a buon mercato)
  vec3 rr = refract(rd, n, .69);
  float spessore = (.55 + 1.35 * (1. - ct)) * m.x;
  vec3 tr = pow(max(c.rgb, vec3(1e-3)), vec3(spessore)) * ambiente(rr) * (1. - F) * m.y;
  return spec + tr;
}

void main() {
  vec2 uv = (gl_FragCoord.xy - .5 * uRes) / uRes.y;
  vec3 ro = vec3(0., 0., uD);
  vec3 rd = normalize(vec3(uv * uH, -uD));
  // bagliore sotto le gocce (somma, alfa zero)
  vec2 gq = (uv * uH - uGl.xy) / (uGl.z * vec2(1.3, .9));
  vec3 gl = mix(vec3(0., .69, .66), vec3(.95, .62, .2), uCaldo * .55) * .15 * exp(-dot(gq, gq) * 2.) * uGl.w;
  vec3 oc = ro - uBound.xyz;
  float b = dot(oc, rd), cc = dot(oc, oc) - uBound.w * uBound.w, disc = b * b - cc;
  if (disc < 0.) { o = vec4(gl, 0.); return; }
  float sq = sqrt(disc), t = max(-b - sq, 0.), tf = -b + sq;
  float pix = uH / (uRes.y * uD);
  float dm = 1e9, tm = t;
  bool colpito = false;
  for (int i = 0; i < 96; i++) {
    float d = mappa(ro + rd * t);
    if (d < dm) { dm = d; tm = t; }
    if (d < pix * t * .3) { colpito = true; break; }
    t += d * .9;
    if (t > tf) break;
  }
  float cop = colpito ? 1. : 1. - smoothstep(0., pix * tm * 1.5, dm);
  if (cop < .003) { o = vec4(gl, 0.); return; }
  vec3 p = ro + rd * (colpito ? t : tm);
  vec4 c, m;
  materiale(p, c, m);
  vec3 col = tinta(p, rd, normale(p), c, m);
  col = 1. - exp(-col * 1.25);
  col = pow(col, vec3(.4545));
  o = vec4(col * cop + gl * (1. - cop), cop);
}`;

function shader(tipo, src) {
  const s = gl.createShader(tipo);
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
  return s;
}
const prog = gl.createProgram();
gl.attachShader(prog, shader(gl.VERTEX_SHADER, VS));
gl.attachShader(prog, shader(gl.FRAGMENT_SHADER, FS));
gl.linkProgram(prog);
if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
gl.useProgram(prog);
gl.bindVertexArray(gl.createVertexArray());
const U = {};
for (const n of ['uRes', 'uH', 'uD', 'uT', 'uK', 'uOnda', 'uB', 'uC', 'uM', 'uBound', 'uGl', 'uCaldo']) U[n] = gl.getUniformLocation(prog, n);
gl.clearColor(0, 0, 0, 0);

const PX = 100;   // px per unità di mondo
const D = 14;     // distanza della camera
const B = new Float32Array(24), C = new Float32Array(24), M = new Float32Array(24);

// materiali: [r, g, b, iridescenza, densità, luce trasmessa]
const OLIO = [.035, .026, .018, 1, 7, 1];
const FINE = [
  [1, .74, .24, 0, 2.4, 1.05],   // 67 kg basi lubrificanti
  [.05, .04, .03, .35, 5, 1],    // 20 kg bitume e gasolio
  [.72, .92, 1, 0, .5, .55],     // 8 kg acqua depurata
  [.5, .53, .56, .1, 2.4, .6],   // 5 kg a terzi
  [1, .74, .24, 0, 2.4, 1.05],   // le ultime due si fondono nella goccia di basi
  [1, .74, .24, 0, 2.4, 1.05]
];
// forma da ferma: raggio, raggio d'orbita, velocità, fase (in frazioni della goccia)
const FORMA = [
  [.74, 0, 0, 0],
  [.5, .4, .55, 0],
  [.46, .44, -.43, 2.1],
  [.42, .46, .67, 4.2],
  [.44, .4, -.61, 1.1],
  [.4, .42, .49, 3.3]
];

const ancora = document.querySelector('.goccia-ancora');
const centro = document.querySelector('.palco__centro');
const mete = [...document.querySelectorAll('.esito__goccia')];
const hero = document.querySelector('.hero');
const rig = document.getElementById('rigenera');

const ss = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const mix = (a, b, t) => a + (b - a) * t;
const rett = (el) => { const r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, r: r.width / 2 }; };
const progresso = window.__palcoProgresso || (() => {
  const r = rig.getBoundingClientRect(), corsa = r.height - innerHeight;
  return corsa > 0 ? Math.min(1, Math.max(0, -r.top / corsa)) : 1;
});

let W = 0, H = 0, scala = 1;
function dimensiona() {
  W = canvas.clientWidth; H = canvas.clientHeight;
  const mob = W < 760;
  const r = Math.min(devicePixelRatio || 1, mob ? 1.25 : 1.5) * scala;
  canvas.width = Math.max(1, Math.round(W * r));
  canvas.height = Math.max(1, Math.round(H * r));
  gl.viewport(0, 0, canvas.width, canvas.height);
}
dimensiona();
addEventListener('resize', dimensiona);

// caduta d'ingresso: la goccia principale su una molla, le altre la inseguono in ritardo (effetto gelatina)
const caduta = { y: 0, v: 0, sat: FORMA.map(() => ({ y: 0, v: 0 })), pronta: false };
const avvio = performance.now() + Math.max(0, 950 - performance.now());

let prima = true, tPrec = performance.now(), lenti = 0, campioni = 0;
function disegna(ora) {
  const dt = Math.min(.05, Math.max(0, (ora - tPrec) / 1000));
  tPrec = ora;
  const t = ora / 1000;

  // regolazione della risoluzione se il telefono fatica
  if (dt > 0) {
    campioni++;
    if (dt > .028) lenti++;
    if (campioni >= 40) {
      if (lenti > 24 && scala > .6) { scala *= .85; dimensiona(); }
      campioni = 0; lenti = 0;
    }
  }

  const h = rett(ancora), c = rett(centro);
  const sy = scrollY;
  const rr = rig.getBoundingClientRect();
  const s0 = hero.offsetHeight * .22, s1 = rr.top + sy;
  const s = ss(s0, Math.max(s0 + 1, s1), sy);
  const p = progresso();

  let gx = mix(h.x, c.x, s), gy = mix(h.y, c.y, s);
  const gr = mix(h.r, c.r, s);

  // caduta
  if (!caduta.pronta) {
    caduta.y = -(gy + gr * 2.4 + 60);
    caduta.sat.forEach((q) => { q.y = caduta.y * 1.25; });
    caduta.pronta = true;
  }
  if (ora >= avvio) {
    const passi = Math.max(1, Math.ceil(dt / .008)), h2 = dt / passi;
    for (let k = 0; k < passi; k++) {
      caduta.v += (-46 * caduta.y - 8.5 * caduta.v) * h2;
      caduta.y += caduta.v * h2;
      caduta.sat.forEach((q, i) => {
        const w = 70 + i * 9;
        q.v += (-w * (q.y - caduta.y) - 6.2 * q.v) * h2;
        q.y += q.v * h2;
      });
    }
  }
  gy += caduta.y;

  const kFerma = .3 * gr / PX;
  let minX = 1e9, minY = 1e9, maxX = -1e9, maxY = -1e9, maxR = 0;
  for (let i = 0; i < 6; i++) {
    const f = FORMA[i];
    const a = t * f[2] + f[3];
    let x = gx + Math.cos(a) * f[1] * gr;
    const ritardo = i ? Math.max(-.9 * gr, Math.min(.9 * gr, (caduta.sat[i].y - caduta.y) * .3)) : 0;
    let y = gy + Math.sin(a * 1.3) * f[1] * gr * .9 + ritardo;
    let z = Math.sin(a) * f[1] * gr * .8;
    let r = f[0] * gr;
    const meta = i < 4 ? rett(mete[i]) : rett(mete[0]);
    const j = i < 4 ? i : 0;   // le ultime due seguono la goccia di basi
    const e = ss(.1 + j * .06, .4 + j * .06, p);
    const rf = i < 4 ? meta.r * (i ? 1 : 1.02) : meta.r * .55;
    x = mix(x, meta.x, e); y = mix(y, meta.y, e); z = mix(z, 0, e); r = mix(r, rf, e);
    const cm = ss(.15 + j * .06, .45 + j * .06, p);
    const fin = FINE[i];
    for (let k = 0; k < 3; k++) C[i * 4 + k] = mix(OLIO[k], fin[k], cm);
    C[i * 4 + 3] = mix(OLIO[3], fin[3], cm);
    M[i * 4] = mix(OLIO[4], fin[4], cm);
    M[i * 4 + 1] = mix(OLIO[5], fin[5], cm);
    const wx = (x - W / 2) / PX, wy = (H / 2 - y) / PX, wz = z / PX, wr = r / PX;
    B[i * 4] = wx; B[i * 4 + 1] = wy; B[i * 4 + 2] = wz; B[i * 4 + 3] = wr;
    minX = Math.min(minX, wx - wr); maxX = Math.max(maxX, wx + wr);
    minY = Math.min(minY, wy - wr); maxY = Math.max(maxY, wy + wr);
    maxR = Math.max(maxR, wr);
  }
  const k = Math.max(.004, mix(kFerma, .05, ss(.12, .5, p)));
  const bx = (minX + maxX) / 2, by = (minY + maxY) / 2;
  const br = Math.hypot(maxX - minX, maxY - minY, maxR * 2) / 2 + k + .1;

  // bagliore: si accende mentre il palco entra
  const bagliore = ss(H, H * .2, rr.top);
  // fuori schermo: niente disegno
  const vis = ((maxY > -H / PX / 2 - .2) && (minY < H / PX / 2 + .2)) || bagliore > 0;
  gl.clear(gl.COLOR_BUFFER_BIT);
  if (vis) {
    gl.uniform4f(U.uGl, (c.x - W / 2) / PX, (H / 2 - c.y) / PX, Math.max(W, H) * .42 / PX, bagliore);
    gl.uniform1f(U.uCaldo, ss(.15, .55, p));
    gl.uniform2f(U.uRes, canvas.width, canvas.height);
    gl.uniform1f(U.uH, H / PX);
    gl.uniform1f(U.uD, D);
    gl.uniform1f(U.uT, t % 1000);
    gl.uniform1f(U.uK, k);
    gl.uniform1f(U.uOnda, .007 * gr / PX * (1 - .6 * ss(.1, .5, p)));
    gl.uniform4fv(U.uB, B);
    gl.uniform4fv(U.uC, C);
    gl.uniform4fv(U.uM, M);
    gl.uniform4f(U.uBound, bx, by, 0, br);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }
  if (prima) { prima = false; html.classList.add('has-3d'); }
}

// il ciclo gira solo con hero o palco sullo schermo e la scheda visibile
let inVista = new Set(), giro = 0;
function ciclo(ora) {
  giro = 0;
  disegna(performance.now());
  avvia();
}
function avvia() {
  if (!giro && inVista.size && !document.hidden) giro = requestAnimationFrame(ciclo);
}
function ferma() {
  if (giro) cancelAnimationFrame(giro);
  giro = 0;
}
const io = new IntersectionObserver((voci) => {
  voci.forEach((v) => (v.isIntersecting ? inVista.add(v.target) : inVista.delete(v.target)));
  if (inVista.size) avvia(); else { ferma(); gl.clear(gl.COLOR_BUFFER_BIT); }
});
io.observe(hero);
io.observe(rig);
document.addEventListener('visibilitychange', () => (document.hidden ? ferma() : avvia()));
canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); ferma(); html.classList.remove('has-3d'); html.classList.add('no-3d'); });

disegna(performance.now());
avvia();
