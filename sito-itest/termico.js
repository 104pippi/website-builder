/* Hero: una banda di "vista termica" scansiona la foto della cantina.
   WebGL puro, nessuna libreria. Senza WebGL resta la foto. */
const hero = document.querySelector('.hero');
const canvas = hero && hero.querySelector('.hero__termico');
const img = hero && hero.querySelector('.hero__media img');

const VS = `attribute vec2 p; varying vec2 v; void main(){ v = p * 0.5 + 0.5; gl_Position = vec4(p, 0.0, 1.0); }`;
const FS = `precision mediump float;
uniform sampler2D uTex; uniform vec2 uRes; uniform vec2 uImg; uniform vec2 uPos;
uniform float uScan; uniform float uBand; uniform float uTime;
varying vec2 v;
vec3 pal(float t){
  t = clamp(t, 0.0, 1.0);
  vec3 c0 = vec3(0.024, 0.102, 0.267);
  vec3 c1 = vec3(0.078, 0.275, 0.784);
  vec3 c2 = vec3(0.137, 0.710, 0.910);
  vec3 c3 = vec3(0.910, 0.965, 0.980);
  vec3 c4 = vec3(1.000, 0.761, 0.239);
  vec3 c5 = vec3(0.949, 0.380, 0.114);
  vec3 c6 = vec3(0.702, 0.075, 0.165);
  if (t < 0.20) return mix(c0, c1, t / 0.20);
  if (t < 0.40) return mix(c1, c2, (t - 0.20) / 0.20);
  if (t < 0.54) return mix(c2, c3, (t - 0.40) / 0.14);
  if (t < 0.68) return mix(c3, c4, (t - 0.54) / 0.14);
  if (t < 0.84) return mix(c4, c5, (t - 0.68) / 0.16);
  return mix(c5, c6, (t - 0.84) / 0.16);
}
void main(){
  vec2 f = vec2(v.x, 1.0 - v.y);
  float s = max(uRes.x / uImg.x, uRes.y / uImg.y);
  vec2 disp = uImg * s;
  vec2 uv = (f * uRes - (uRes - disp) * uPos) / disp;
  vec3 c = texture2D(uTex, uv).rgb;
  float l = dot(c, vec3(0.299, 0.587, 0.114));
  float heat = 0.16 + (1.0 - l) * 0.36 + (c.r - c.b) * 2.1 + (0.5 - uv.y) * 0.08;
  heat += 0.045 * sin(uv.y * 36.0 + uTime * 1.6 + sin(uv.x * 11.0 + uTime * 0.55) * 2.0);
  vec3 col = pal(heat);
  col *= 0.9 + 0.1 * step(0.5, fract(f.y * uRes.y / 3.0));
  float d = f.y - uScan;
  float a = (1.0 - smoothstep(0.0, uBand, d)) * smoothstep(-0.002, 0.006, d);
  a = pow(a, 1.25) * 0.93;
  float line = exp(-pow(d / 0.0016, 2.0));
  gl_FragColor = vec4(col * a + vec3(0.86, 0.97, 1.0) * line * 0.95, max(a, line * 0.95));
}`;

async function avvia() {
  if (!canvas || !img) return;
  const gl = canvas.getContext('webgl', { alpha: true, premultipliedAlpha: true, antialias: false, depth: false, stencil: false });
  if (!gl) return;
  try { await img.decode(); } catch (e) { /* già decodificata o fallita: si prova lo stesso */ }
  if (!img.naturalWidth) return;

  const shader = (tipo, src) => {
    const s = gl.createShader(tipo);
    gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
    return s;
  };
  const prog = gl.createProgram();
  gl.attachShader(prog, shader(gl.VERTEX_SHADER, VS));
  gl.attachShader(prog, shader(gl.FRAGMENT_SHADER, FS));
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
  gl.useProgram(prog);

  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, 'p');
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

  const tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, img);

  const U = {};
  ['uTex', 'uRes', 'uImg', 'uPos', 'uScan', 'uBand', 'uTime'].forEach((n) => { U[n] = gl.getUniformLocation(prog, n); });
  gl.uniform1i(U.uTex, 0);
  gl.uniform2f(U.uImg, img.naturalWidth, img.naturalHeight);
  gl.clearColor(0, 0, 0, 0);

  const mobile = matchMedia('(max-width: 767px)').matches;
  const banda = mobile ? 0.4 : 0.38;
  gl.uniform1f(U.uBand, banda);

  const misura = () => {
    const dpr = Math.min(devicePixelRatio || 1, mobile ? 1.5 : 2);
    const w = Math.round(canvas.clientWidth * dpr), h = Math.round(canvas.clientHeight * dpr);
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
    gl.viewport(0, 0, w, h);
    gl.uniform2f(U.uRes, w, h);
    const op = getComputedStyle(img).objectPosition.split(' ').map((v) => parseFloat(v) / 100);
    gl.uniform2f(U.uPos, isNaN(op[0]) ? 0.5 : op[0], isNaN(op[1]) ? 0.5 : op[1]);
  };
  misura();
  addEventListener('resize', misura);

  // Ciclo: passata dal basso verso l'alto, poi pausa
  const PASSATA = 3.4, PAUSA = 2.6, CICLO = PASSATA + PAUSA;
  const da = 1.04, a = -banda - 0.04;
  const ease = (t) => 0.5 - 0.5 * Math.cos(Math.PI * t);
  let t0 = performance.now();
  let visibile = true, attivo = true, pulita = false, raf = 0;

  const disegna = (ora) => {
    const t = (ora - t0) / 1000;
    const k = t % CICLO;
    if (k < PASSATA) {
      const scan = da + (a - da) * ease(k / PASSATA);
      gl.uniform1f(U.uScan, scan);
      gl.uniform1f(U.uTime, t);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      pulita = false;
      hero.style.setProperty('--scan', (scan * 100).toFixed(2) + '%');
      hero.style.setProperty('--scan-on', scan > 0.06 && scan < (mobile ? 0.36 : 0.94) ? '1' : '0');
    } else if (!pulita) {
      gl.clear(gl.COLOR_BUFFER_BIT);
      hero.style.setProperty('--scan-on', '0');
      pulita = true;
    }
  };
  const giro = () => {
    raf = 0;
    if (!visibile || !attivo) return;
    disegna(performance.now());
    raf = requestAnimationFrame(giro);
  };
  const riprendi = () => { if (!raf && visibile && attivo) raf = requestAnimationFrame(giro); };

  new IntersectionObserver(([v]) => { visibile = v.isIntersecting; riprendi(); }).observe(hero);
  document.addEventListener('visibilitychange', () => { attivo = !document.hidden; riprendi(); });

  hero.classList.add('termico-on');
  t0 = performance.now() + 250;
  riprendi();
}

avvia().catch((err) => console.warn('termico', err));
