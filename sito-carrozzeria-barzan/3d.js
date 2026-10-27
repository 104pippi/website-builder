// Le righe non mentono: una lamiera rossa sotto la lavagna a righe.
// Due chicchi di grandine la colpiscono, lo scroll spinge fuori i bolli un colpo alla volta.
// Tutto nello shader: la superficie è un campo di altezze analitico, il riflesso è calcolato per pixel.

const VS = `#version 300 es
in vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }`;

const FS = `#version 300 es
precision highp float;
out vec4 colore;
uniform vec2 uRes;
uniform float uTime, uA1, uA2, uIn;
uniform vec3 uCam, uFwd, uRight, uUp;
uniform float uTan;
uniform vec2 uC1, uC2, uLuce;

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }

// bollo: conca gaussiana un po' ovale con il bordo appena rialzato
void bollo(vec2 p, vec2 c, float s, float a, inout float h, inout vec2 g) {
  vec2 k = vec2(1.0, 0.82);
  vec2 d = (p - c) * k;
  float r2 = dot(d, d);
  float e = exp(-r2 / (s * s));
  h -= a * e;
  g += a * e * 2.0 * d * k / (s * s);
  float r = sqrt(r2) + 1e-5;
  float w = 0.5 * s, r0 = 1.4 * s;
  float f = exp(-((r - r0) * (r - r0)) / (w * w));
  h += 0.22 * a * f;
  g += 0.22 * a * f * (-2.0 * (r - r0) / (w * w)) * (d / r) * k;
}

float altezza(vec2 p, out vec2 g) {
  // fiancata bombata
  float h = -0.11 * p.x * p.x - 0.012 * p.y * p.y;
  g = vec2(-0.22 * p.x, -0.024 * p.y);
  // linea di carattere: la piega viva che corre lungo la fiancata
  vec2 n = normalize(vec2(-0.2, 1.0));
  float s = dot(p, n) - 1.05;
  float w = 0.028;
  float q = sqrt(s * s + w * w);
  h -= 0.055 * q;
  g -= 0.055 * (s / q) * n;
  bollo(p, uC1, 0.22, uA1, h, g);
  bollo(p, uC2, 0.14, uA2, h, g);
  return h;
}

void main() {
  vec2 uv = gl_FragCoord.xy / uRes;
  vec2 ndc = uv * 2.0 - 1.0;
  float asp = uRes.x / uRes.y;
  vec3 rd = normalize(uFwd + ndc.x * uRight * uTan * asp + ndc.y * uUp * uTan);
  vec3 fondo = mix(vec3(0.071, 0.082, 0.094), vec3(0.102, 0.118, 0.133), uv.y);
  vec3 col = fondo;

  if (rd.z < -0.002) {
    float t = -uCam.z / rd.z;
    vec3 P = uCam + rd * t;
    vec2 g;
    float h = altezza(P.xy, g);
    t = (h - uCam.z) / rd.z;
    P = uCam + rd * t;
    h = altezza(P.xy, g);
    vec3 N = normalize(vec3(-g, 1.0));
    vec3 R = reflect(rd, N);

    // vernice rossa metallizzata
    vec3 rosso = vec3(0.60, 0.035, 0.05);
    vec3 L = normalize(vec3(-0.4, 0.3, 1.0));
    float dif = max(dot(N, L), 0.0);
    col = rosso * (0.16 + 0.6 * dif);
    float sc = hash(floor(P.xy * 650.0));
    col += vec3(0.55, 0.14, 0.12) * step(0.986, sc) * 0.4 * dif;

    float fr = 0.04 + 0.96 * pow(1.0 - max(dot(N, -rd), 0.0), 5.0);

    // lavagna a righe sopra la lamiera: righe parallele all'asse y
    float tb = (1.55 - P.z) / max(R.z, 0.04);
    vec2 hit = P.xy + R.xy * tb;
    float u = hit.x * 2.6 + uLuce.x + uTime * 0.03;
    float m = fract(u);
    float aa = min(fwidth(u) * 1.1 + 0.012, 0.25);
    float riga = smoothstep(0.0, aa, m) * (1.0 - smoothstep(0.44, 0.44 + aa, m));
    float lav = smoothstep(14.0, 9.0, abs(hit.y - 0.9 - uLuce.y)) * smoothstep(0.0, 0.08, R.z);
    vec3 luce = vec3(1.0, 0.975, 0.95);
    col = mix(col, luce, riga * lav * (0.7 + 0.25 * fr));
    col += vec3(0.15, 0.16, 0.18) * fr * (1.0 - riga * lav);
    // chiarore morbido di un neon lontano, dà volume alla bombatura
    float neon = exp(-pow((R.x + 0.25) * 3.2, 2.0)) * smoothstep(0.0, 0.6, R.z);
    col += vec3(0.20, 0.10, 0.10) * neon;

    // la lamiera sfuma nel buio in lontananza
    float lontano = length((P.xy - vec2(0.0, 0.6)) * vec2(0.8, 1.0));
    col = mix(col, fondo, smoothstep(3.0, 5.6, lontano));
  }

  col *= 1.0 - 0.3 * dot(ndc * vec2(0.62, 0.55), ndc * vec2(0.62, 0.55));
  col = mix(fondo, col, uIn);
  col += (hash(gl_FragCoord.xy + fract(uTime * 7.0) * 91.0) - 0.5) * 0.016;
  colore = vec4(clamp(col, 0.0, 1.0), 1.0);
}`;

const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const liscio = (x) => x * x * (3 - 2 * x);
const norm = (v) => { const l = Math.hypot(...v); return v.map((c) => c / l); };
const croce = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];

// impatto con rimbalzo: il chicco affonda, la lamiera vibra e si assesta
const urto = (t) => (t <= 0 ? 0 : 1 - Math.exp(-6.5 * t) * Math.cos(17 * t));
// i bolli escono a spinte: cinque colpi di leva lungo la corsa
const spinte = (x) => {
  const n = 5;
  const k = clamp(x) * n;
  const i = Math.min(Math.floor(k), n - 1);
  return (i + liscio(clamp(k - i))) / n;
};

export function avvia({ sezione, canvas, poster, progresso, ridotto }) {
  const gl = canvas.getContext('webgl2', { antialias: false, alpha: false, powerPreference: 'high-performance' });
  if (!gl) return;

  const sh = (tipo, src) => {
    const s = gl.createShader(tipo);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
    return s;
  };
  const prog = gl.createProgram();
  gl.attachShader(prog, sh(gl.VERTEX_SHADER, VS));
  gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FS));
  gl.bindAttribLocation(prog, 0, 'aPos');
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
  gl.useProgram(prog);

  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

  const U = {};
  ['uRes', 'uTime', 'uA1', 'uA2', 'uIn', 'uCam', 'uFwd', 'uRight', 'uUp', 'uTan', 'uC1', 'uC2', 'uLuce']
    .forEach((n) => { U[n] = gl.getUniformLocation(prog, n); });

  const mobile = () => innerWidth < 1024;
  let L = 0;
  let H = 0;

  function camera() {
    const asp = L / H;
    // in verticale la camera sta più vicina e i bolli restano al centro, sopra i testi
    const stretto = asp < 0.9;
    const cam = stretto ? [0.05, -2.05, 1.32] : [0.35, -2.5, 1.45];
    const bersaglio = stretto ? [0.05, 0.75, -0.08] : [0.55, 0.45, -0.05];
    const fwd = norm(bersaglio.map((v, i) => v - cam[i]));
    const right = norm(croce(fwd, [0, 0, 1]));
    const up = croce(right, fwd);
    gl.uniform3fv(U.uCam, cam);
    gl.uniform3fv(U.uFwd, fwd);
    gl.uniform3fv(U.uRight, right);
    gl.uniform3fv(U.uUp, up);
    gl.uniform1f(U.uTan, Math.tan(((stretto ? 44 : 38) * Math.PI) / 360));
    gl.uniform2fv(U.uC1, stretto ? [0.12, 0.98] : [0.95, 0.62]);
    gl.uniform2fv(U.uC2, stretto ? [-0.2, 0.46] : [0.32, 0.12]);
  }

  function misura() {
    const dpr = Math.min(devicePixelRatio || 1, mobile() ? 1.5 : 2);
    const w = Math.max(1, Math.round(canvas.clientWidth * dpr));
    const h = Math.max(1, Math.round(canvas.clientHeight * dpr));
    if (w === L && h === H) return;
    L = w;
    H = h;
    canvas.width = w;
    canvas.height = h;
    gl.viewport(0, 0, w, h);
    gl.uniform2f(U.uRes, w, h);
    camera();
  }

  // puntatore: solo su desktop sposta un poco la lavagna
  const luce = { x: 0, y: 0, tx: 0, ty: 0 };
  if (matchMedia('(pointer: fine)').matches) {
    sezione.addEventListener('pointermove', (e) => {
      luce.tx = (e.clientX / innerWidth - 0.5) * 0.9;
      luce.ty = (e.clientY / innerHeight - 0.5) * 0.6;
    });
  }

  let inVista = false;
  let pieno = false;
  let tUrto = null;
  let tIn = null;
  let raf = null;
  const t0 = performance.now();

  function disegna(ora) {
    misura();
    const t = (ora - t0) / 1000;
    if (tUrto === null && pieno) tUrto = ora;
    const tau = tUrto === null ? 0 : (ora - tUrto) / 1000;
    const p = progresso();
    const a1 = 0.042 * urto(tau - 0.42) * (1 - spinte((p - 0.36) / 0.42));
    const a2 = 0.03 * urto(tau) * (1 - spinte((p - 0.1) / 0.3));
    luce.x += (luce.tx - luce.x) * 0.06;
    luce.y += (luce.ty - luce.y) * 0.06;
    if (tIn === null) tIn = ora;
    const fade = clamp((ora - tIn) / 700);
    gl.uniform1f(U.uTime, t);
    gl.uniform1f(U.uA1, a1);
    gl.uniform1f(U.uA2, a2);
    gl.uniform1f(U.uIn, liscio(fade));
    gl.uniform2f(U.uLuce, luce.x, luce.y);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  function giro(ora) {
    raf = null;
    disegna(ora);
    if (inVista && !document.hidden) raf = requestAnimationFrame(giro);
  }
  const parti = () => { if (!raf && !ridotto) raf = requestAnimationFrame(giro); };

  if (ridotto) {
    // una sola immagine ferma: lamiera già ammaccata
    tUrto = performance.now() - 3000;
    inVista = true;
    pieno = true;
    misura();
    disegna(performance.now());
    tIn = performance.now() - 1000;
    disegna(performance.now());
    canvas.classList.add('pronto');
    if (poster) poster.hidden = true;
    return;
  }

  new IntersectionObserver((voci) => {
    inVista = voci[0].isIntersecting;
    pieno = voci[0].intersectionRatio >= 0.6;
    if (inVista) parti();
  }, { threshold: [0, 0.12, 0.6, 1] }).observe(sezione.querySelector('[data-linee-palco]') || sezione);
  document.addEventListener('visibilitychange', () => { if (!document.hidden && inVista) parti(); });
  new ResizeObserver(() => { if (!raf) disegna(performance.now()); }).observe(canvas);
  canvas.addEventListener('webglcontextlost', (e) => {
    e.preventDefault();
    canvas.classList.remove('pronto');
    if (poster) poster.hidden = false;
  });

  // primo fotogramma, poi la dissolvenza sul poster
  misura();
  disegna(performance.now());
  requestAnimationFrame(() => {
    canvas.classList.add('pronto');
    setTimeout(() => { if (poster) poster.hidden = true; }, 900);
  });
  parti();
}
