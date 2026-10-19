/* Zootropio: 16 fotogrammi veri su un anello curvo che gira intorno al titolo.
   WebGL2 senza librerie, un solo draw call. Il tempo viene da performance.now() (funziona anche nel video). */

const N = 16;                 // fotogrammi (atlante 4x4)
const COLONNE = 18;           // suddivisioni orizzontali di ogni fotogramma (curvatura)
const SPAZIO = 0.11;          // spazio tra un fotogramma e l'altro
const PASSO = (Math.PI * 2) / N;
const AMPIEZZA = PASSO * (1 - SPAZIO);
const ALTEZZA = AMPIEZZA * 0.625; // 16:10
const GIRO = (Math.PI * 2) / 46;  // un giro ogni 46 s

const DIDASCALIE = [
  'Centroprofondo, short film', 'Technogym, lancio prodotto', 'Blauer USA, campagna fotografica',
  'Asiago DOP, campagna TV', 'Trentino Marketing, short movie', "M9 Museo del '900, Arte Salvata",
  'Findus, spot televisivo', 'Somec Gruppo, branding', 'Langhe Monferrato Roero, web serie',
  'Bicycle Line, lancio prodotto', 'Proraso, campagna di posizionamento', 'Fondazione FS, video celebrativo',
  'Save the Children, spot televisivo', 'Banca Prealpi SanBiagio, short film', 'Texcene, corporate branding',
  'GEA Group, customer story'
];

const VS = `#version 300 es
in vec3 a_pos; in vec2 a_uv; in float a_idx;
uniform mat4 u_proj;
uniform float u_spin, u_tilt, u_roll, u_dist, u_intro, u_n, u_fade;
out vec2 v_uv; out float v_side; out float v_lum; flat out float v_idx; out float v_glint;
mat3 rotY(float a){ float c=cos(a), s=sin(a); return mat3(c,0.,-s, 0.,1.,0., s,0.,c); }
mat3 rotX(float a){ float c=cos(a), s=sin(a); return mat3(1.,0.,0., 0.,c,s, 0.,-s,c); }
mat3 rotZ(float a){ float c=cos(a), s=sin(a); return mat3(c,s,0., -s,c,0., 0.,0.,1.); }
void main(){
  float d = min(a_idx, u_n - a_idx);
  float k = a_idx < .5 ? 1. : clamp((u_intro - (.55 + d * .085)) / .6, 0., 1.);
  float e = 1. - pow(1. - k, 3.);
  float th0 = a_idx * 6.2831853 / u_n;
  vec3 c = vec3(sin(th0), 0., cos(th0));
  vec3 p = c + (a_pos - c) * e + c * (1. - e) * .45;
  mat3 m = rotZ(u_roll) * rotX(u_tilt) * rotY(u_spin);
  p = m * p;
  vec3 n = m * normalize(vec3(a_pos.x, 0., a_pos.z));
  vec3 cam = vec3(0., 0., u_dist);
  vec3 toCam = normalize(cam - p);
  v_side = dot(n, toCam);
  float dist = length(cam - p);
  float nebbia = smoothstep(u_dist + 1.1, u_dist - .9, dist);       // lontano = più scuro
  float lato = v_side < 0. ? .46 : mix(.62, 1., smoothstep(0., .75, v_side));
  v_lum = e * u_fade * lato * mix(.55, 1., nebbia);
  v_glint = v_side > 0. ? pow(max(0., v_side), 24.) : 0.;           // la luce che scivola sul fotogramma davanti
  v_uv = a_uv; v_idx = a_idx;
  gl_Position = u_proj * vec4(p.x, p.y, p.z - u_dist, 1.);
}`;

const FS = `#version 300 es
precision highp float;
in vec2 v_uv; in float v_side; in float v_lum; flat in float v_idx; in float v_glint;
uniform sampler2D u_tex; uniform float u_t; uniform vec2 u_cella;
out vec4 o;
float box(vec2 p, vec2 b, float r){ vec2 q = abs(p) - b + r; return length(max(q, 0.)) + min(max(q.x, q.y), 0.) - r; }
float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
void main(){
  vec2 uv = v_uv;
  if (v_side < 0.) uv.x = 1. - uv.x;
  float sd = box((v_uv - .5) * vec2(1.6, 1.), vec2(.8, .5), .03);
  if (sd > .0) discard;
  float bordo = smoothstep(0., -.012, sd);
  float col = mod(v_idx, 4.), riga = floor(v_idx / 4.);
  vec2 cuv = clamp(uv, u_cella, 1. - u_cella);
  vec3 c = texture(u_tex, vec2((col + cuv.x) / 4., (riga + 1. - cuv.y) / 4.)).rgb;
  float vign = smoothstep(1.15, .35, length((v_uv - .5) * vec2(1.25, 1.6)));
  c *= mix(.72, 1., vign);
  c += v_glint * .1 * smoothstep(.0, 1., 1. - abs(v_uv.x - .5) * 2.);
  c *= v_lum * bordo;
  c += (hash(gl_FragCoord.xy + fract(u_t * 7.3) * 97.) - .5) * .035 * v_lum;   // grana
  o = vec4(c, 1.);
}`;

const lerp = (a, b, t) => a + (b - a) * t;
const clamp01 = t => Math.min(1, Math.max(0, t));
const smooth = (a, b, x) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const easeInOut = t => (t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const easeOut = t => 1 - Math.pow(1 - t, 3);

function compila(gl, tipo, src) {
  const s = gl.createShader(tipo);
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
  return s;
}

function geometria() {
  const pos = [], uv = [], idx = [], ind = [];
  for (let i = 0; i < N; i++) {
    const th0 = i * PASSO, base = pos.length / 3;
    for (let s = 0; s <= COLONNE; s++) {
      const u = s / COLONNE, th = th0 + (u - .5) * AMPIEZZA;
      for (let r = 0; r <= 1; r++) {
        pos.push(Math.sin(th), (r - .5) * ALTEZZA, Math.cos(th));
        uv.push(u, r);
        idx.push(i);
      }
    }
    for (let s = 0; s < COLONNE; s++) {
      const a = base + s * 2;
      ind.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
    }
  }
  return { pos: new Float32Array(pos), uv: new Float32Array(uv), idx: new Float32Array(idx), ind: new Uint16Array(ind) };
}

// stessa trasformazione del vertex shader, per sapere dove cade il fotogramma 0 sullo schermo
function rot(p, spin, tilt, roll) {
  let [x, y, z] = p;
  let c = Math.cos(spin), s = Math.sin(spin);
  [x, z] = [c * x + s * z, -s * x + c * z];
  c = Math.cos(tilt); s = Math.sin(tilt);
  [y, z] = [c * y - s * z, s * y + c * z];
  c = Math.cos(roll); s = Math.sin(roll);
  [x, y] = [c * x - s * y, s * x + c * y];
  return [x, y, z];
}

export function avvia({ canvas, hero, foto, velo, titolo, didascalia, cornice, fermo }) {
  const gl = canvas.getContext('webgl2', { antialias: true, alpha: false, premultipliedAlpha: false, powerPreference: 'high-performance' });
  if (!gl) return;
  const largo = matchMedia('(min-width: 760px)').matches;
  const telefono = matchMedia('(pointer: coarse)').matches || innerWidth < 760;
  const conMouse = matchMedia('(hover: hover) and (pointer: fine)').matches;

  const prog = gl.createProgram();
  gl.attachShader(prog, compila(gl, gl.VERTEX_SHADER, VS));
  gl.attachShader(prog, compila(gl, gl.FRAGMENT_SHADER, FS));
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
  gl.useProgram(prog);

  const g = geometria();
  const vao = gl.createVertexArray();
  gl.bindVertexArray(vao);
  const attr = (nome, dati, n) => {
    const b = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, b);
    gl.bufferData(gl.ARRAY_BUFFER, dati, gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, nome);
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, n, gl.FLOAT, false, 0, 0);
  };
  attr('a_pos', g.pos, 3);
  attr('a_uv', g.uv, 2);
  attr('a_idx', g.idx, 1);
  const ib = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, g.ind, gl.STATIC_DRAW);

  const U = {};
  for (const n of ['u_proj', 'u_spin', 'u_tilt', 'u_roll', 'u_dist', 'u_intro', 'u_n', 'u_fade', 'u_tex', 'u_t', 'u_cella']) U[n] = gl.getUniformLocation(prog, n);
  gl.uniform1f(U.u_n, N);
  gl.uniform1i(U.u_tex, 0);
  gl.enable(gl.DEPTH_TEST);
  gl.clearColor(0, 0, 0, 1);

  const img = new Image();
  img.decoding = 'async';
  img.src = largo ? 'assets/img/atlante-d.jpg' : 'assets/img/atlante-m.jpg';

  let W = 0, H = 0, cx = 0, cy = 0, proj = new Float32Array(16), param = null;

  const misura = () => {
    const dpr = Math.min(devicePixelRatio || 1, telefono ? 1.5 : 2);
    W = hero.clientWidth; H = hero.clientHeight;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    gl.viewport(0, 0, canvas.width, canvas.height);
    const rh = hero.getBoundingClientRect(), rt = titolo.getBoundingClientRect();
    cx = 0;
    cy = 1 - 2 * ((rt.top + rt.height / 2 - rh.top) / H);
    // il velo scuro dietro al titolo segue la sua altezza vera
    hero.style.setProperty('--titolo-y', ((1 - cy) * 50).toFixed(1) + '%');
    const a = W / H, t = smooth(.6, 1.45, a);
    param = {
      dist: lerp(2.45, 2.75, t),
      tanX: lerp(.215, .36, t),
      tilt: lerp(.34, .15, t),
      roll: lerp(-.11, -.06, t),
      a
    };
  };

  const proiezione = (dist, sx, sy) => {
    const tx = param.tanX, ty = tx / param.a, near = .1, far = 20;
    proj.fill(0);
    proj[0] = 1 / tx; proj[5] = 1 / ty;
    proj[10] = -(far + near) / (far - near); proj[11] = -1;
    proj[14] = -(2 * far * near) / (far - near);
    proj[8] = -sx; proj[9] = -sy;
    return proj;
  };

  // dove cade il fotogramma 0 (in px css dentro l'hero)
  const rettangolo0 = (spin, tilt, roll, dist, sx, sy) => {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const u of [0, .5, 1]) for (const v of [-.5, .5]) {
      const th = (u - .5) * AMPIEZZA;
      const [x, y, z] = rot([Math.sin(th), v * ALTEZZA, Math.cos(th)], spin, tilt, roll);
      const w = dist - z;
      const nx = (x / param.tanX) / w + sx;
      const ny = (y / (param.tanX / param.a)) / w + sy;
      const px = (nx * .5 + .5) * W, py = (1 - (ny * .5 + .5)) * H;
      x0 = Math.min(x0, px); x1 = Math.max(x1, px); y0 = Math.min(y0, py); y1 = Math.max(y1, py);
    }
    return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
  };

  misura();
  addEventListener('resize', () => { misura(); if (!inCorsa) disegna(performance.now()); });

  // stato
  let T0 = 0, spin = 0, ultimo = 0, velScroll = 0, ultimoScroll = scrollY;
  let mx = 0, my = 0, tmx = 0, tmy = 0, frontale = 0, consegnata = false, inCorsa = false, visibile = true;

  if (conMouse) {
    hero.addEventListener('pointermove', e => {
      tmx = (e.clientX / innerWidth - .5) * 2;
      tmy = (e.clientY / innerHeight - .5) * 2;
    });
    hero.addEventListener('pointerleave', () => { tmx = 0; tmy = 0; });
  }
  addEventListener('scroll', () => {
    const dy = scrollY - ultimoScroll;
    ultimoScroll = scrollY;
    velScroll = Math.max(-.6, Math.min(.6, velScroll + dy * .0016));
  }, { passive: true });

  const aggiornaDidascalia = i => {
    if (i === frontale) return;
    frontale = i;
    didascalia.style.opacity = '0';
    setTimeout(() => { didascalia.textContent = DIDASCALIE[i]; didascalia.style.opacity = ''; }, 220);
  };

  const disegna = now => {
    const t = (now - T0) / 1000;
    const dt = Math.min(.05, Math.max(0, (now - ultimo) / 1000));
    ultimo = now;

    const p = clamp01(scrollY / H);
    const assesto = fermo ? 0 : .13 * (1 - easeOut(clamp01(t / 2.6)));
    mx += (tmx - mx) * .05; my += (tmy - my) * .05;

    if (!fermo) {
      spin += dt * GIRO * smooth(.9, 3, t) + velScroll * dt * 2.2;
      velScroll *= Math.pow(.04, dt);
    }
    const tilt = param.tilt + assesto + p * (1.08 - param.tilt) + my * .045;
    const roll = param.roll * (1 - p * .6);
    const dist = param.dist - p * .38;
    const sx = cx + mx * .025, sy = cy + p * .42;
    const s = spin + mx * .12;

    gl.uniformMatrix4fv(U.u_proj, false, proiezione(dist, sx, sy));
    gl.uniform1f(U.u_spin, s);
    gl.uniform1f(U.u_tilt, tilt);
    gl.uniform1f(U.u_roll, roll);
    gl.uniform1f(U.u_dist, dist);
    gl.uniform1f(U.u_intro, fermo ? 99 : t);
    gl.uniform1f(U.u_fade, 1 - smooth(.5, 1, p));
    gl.uniform1f(U.u_t, now / 1000);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.drawElements(gl.TRIANGLES, g.ind.length, gl.UNSIGNED_SHORT, 0);

    // passaggio di consegne: la foto dell'hero si rimpicciolisce fino al fotogramma 0
    if (!consegnata) {
      const hp = easeInOut(clamp01((t - .05) / 1.15));
      const r = rettangolo0(s, tilt, roll, dist, sx, sy);
      foto.style.left = lerp(0, r.x, hp) + 'px';
      foto.style.top = lerp(0, r.y, hp) + 'px';
      foto.style.width = lerp(W, r.w, hp) + 'px';
      foto.style.height = lerp(H, r.h, hp) + 'px';
      foto.style.borderRadius = lerp(0, r.h * .03, hp) + 'px';
      foto.style.opacity = String(1 - smooth(1.02, 1.36, t));
      if (t > 1.4) {
        consegnata = true;
        foto.style.visibility = 'hidden';
        cornice?.classList.add('visibile');
      }
    }
    const i = ((Math.round(-s / PASSO) % N) + N) % N;
    if (consegnata) aggiornaDidascalia(i);
  };

  const ciclo = now => {
    if (!inCorsa) return;
    disegna(performance.now());
    requestAnimationFrame(ciclo);
  };
  const parti = () => {
    if (inCorsa || fermo || !visibile || document.hidden) return;
    inCorsa = true;
    ultimo = performance.now();
    requestAnimationFrame(ciclo);
  };
  const ferma = () => { inCorsa = false; };

  img.onload = () => {
    const tex = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, img);
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.uniform2f(U.u_cella, 2 / (img.width / 4), 2 / (img.height / 4));

    // l'intro della pagina (titolo e foto) dura circa 1,6 s: il 3D parte dopo, mai prima
    const attesa = Math.max(0, 1650 - performance.now());
    setTimeout(() => {
      misura();
      foto.style.animation = 'none';
      T0 = performance.now();
      if (fermo) {
        consegnata = true;
        foto.style.transition = 'opacity .6s';
        foto.style.opacity = '0';
        disegna(T0 + 99000);
        canvas.classList.add('pronto');
        cornice?.classList.add('visibile');
        return;
      }
      disegna(T0);
      canvas.classList.add('pronto');
      canvas.style.transition = 'none';
      parti();
    }, attesa);
  };

  new IntersectionObserver(([v]) => {
    visibile = v.isIntersecting;
    visibile ? (T0 && parti()) : ferma();
  }).observe(hero);
  document.addEventListener('visibilitychange', () => (document.hidden ? ferma() : T0 && parti()));
  canvas.addEventListener('webglcontextlost', e => {
    e.preventDefault(); ferma();
    foto.style.visibility = ''; foto.style.opacity = '1';
    Object.assign(foto.style, { left: '0', top: '0', width: '100%', height: '100%', borderRadius: '0' });
    canvas.classList.remove('pronto');
  });
}
