// Anelli: il tronco che si apre e mostra 32 anni (1994-2026), un anello alla volta.
// Tutto disegnato in codice (corteccia, anelli, segatura): nessun modello esterno.
import * as THREE from 'three';

const R = 1;          // raggio del tronco
const L = 3.6;        // lunghezza del tronco
const T = 0.24;       // spessore della rondella
const NA = 32;        // anelli: 1994 -> 2026
const CENTRO = new THREE.Vector2(0.07, -0.05); // il midollo non è mai al centro esatto

const SNOISE = /* glsl */`
vec3 mod289(vec3 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 mod289(vec4 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 permute(vec4 x){return mod289(((x*34.0)+10.0)*x);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-0.85373472095314*r;}
float snoise(vec3 v){
  const vec2 C=vec2(1.0/6.0,1.0/3.0);
  const vec4 D=vec4(0.0,0.5,1.0,2.0);
  vec3 i=floor(v+dot(v,C.yyy));
  vec3 x0=v-i+dot(i,C.xxx);
  vec3 g=step(x0.yzx,x0.xyz);
  vec3 l=1.0-g;
  vec3 i1=min(g.xyz,l.zxy);
  vec3 i2=max(g.xyz,l.zxy);
  vec3 x1=x0-i1+C.xxx;
  vec3 x2=x0-i2+C.yyy;
  vec3 x3=x0-D.yyy;
  i=mod289(i);
  vec4 p=permute(permute(permute(i.z+vec4(0.0,i1.z,i2.z,1.0))+i.y+vec4(0.0,i1.y,i2.y,1.0))+i.x+vec4(0.0,i1.x,i2.x,1.0));
  float n_=0.142857142857;
  vec3 ns=n_*D.wyz-D.xzx;
  vec4 j=p-49.0*floor(p*ns.z*ns.z);
  vec4 x_=floor(j*ns.z);
  vec4 y_=floor(j-7.0*x_);
  vec4 x=x_*ns.x+ns.yyyy;
  vec4 y=y_*ns.x+ns.yyyy;
  vec4 h=1.0-abs(x)-abs(y);
  vec4 b0=vec4(x.xy,y.xy);
  vec4 b1=vec4(x.zw,y.zw);
  vec4 s0=floor(b0)*2.0+1.0;
  vec4 s1=floor(b1)*2.0+1.0;
  vec4 sh=-step(h,vec4(0.0));
  vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy;
  vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
  vec3 p0=vec3(a0.xy,h.x);
  vec3 p1=vec3(a0.zw,h.y);
  vec3 p2=vec3(a1.xy,h.z);
  vec3 p3=vec3(a1.zw,h.w);
  vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
  p0*=norm.x;p1*=norm.y;p2*=norm.z;p3*=norm.w;
  vec4 m=max(0.5-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.0);
  m=m*m;
  return 105.0*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
}`;

const NEBBIA = /* glsl */`
uniform vec2 uNebbia; uniform float uScuro;
vec3 nebbia(vec3 col, vec3 wp){
  float d = length(cameraPosition - wp);
  float f = clamp(smoothstep(uNebbia.x, uNebbia.y, d) + uScuro, 0.0, 1.0);
  return mix(col, vec3(0.059, 0.141, 0.102), f);
}`;

// ---------- la faccia del taglio: gli anelli ----------
const anelliVS = /* glsl */`
varying vec2 vP; varying vec3 vWP; varying vec3 vN;
void main(){
  vP = position.xz / ${R.toFixed(3)};
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vWP = wp.xyz;
  vN = normalize(mat3(modelMatrix) * normal);
  gl_Position = projectionMatrix * viewMatrix * wp;
}`;

const anelliFS = /* glsl */`
uniform float uAnelli; uniform vec3 uLuce;
varying vec2 vP; varying vec3 vWP; varying vec3 vN;
${SNOISE}
${NEBBIA}
const float NA = ${NA.toFixed(1)};
void main(){
  vec2 q = vP - vec2(${CENTRO.x.toFixed(3)}, ${CENTRO.y.toFixed(3)});
  float r = length(q);
  float a = atan(q.y, q.x);
  float rEdge = length(vP);

  // anelli irregolari, più larghi verso il midollo (l'albero giovane cresce di più)
  float d = snoise(vec3(q * 1.7, 1.3)) * 0.045 + snoise(vec3(q * 4.6, 7.1)) * 0.011 + 0.02 * sin(a * 2.0 + 0.7) * r;
  float rr = max(r + d * smoothstep(0.0, 0.25, r), 0.0);
  float rn = rr / 0.86;
  float t = NA * pow(rn, 1.18);
  t += 0.28 * sin(t * 0.83 + 1.0) + 0.12 * sin(t * 2.1);
  float idx = floor(t);
  float f = fract(t);

  vec3 durame = vec3(0.64, 0.41, 0.25);
  vec3 alburno = vec3(0.93, 0.82, 0.63);
  vec3 legno = mix(durame, alburno, smoothstep(18.0, 24.0, t));
  legno *= 0.92 + 0.13 * fract(sin(idx * 91.7) * 43758.5);
  float tardo = smoothstep(0.70, 0.93, f) * (1.0 - smoothstep(0.95, 1.0, f));
  vec3 col = mix(legno, legno * vec3(0.46, 0.34, 0.25), tardo * 0.95);
  col = mix(vec3(0.33, 0.19, 0.09), col, smoothstep(0.012, 0.034, r)); // midollo

  // segni della catena e grana del legno
  float sega = sin(dot(vP, vec2(0.83, 0.56)) * 360.0 + snoise(vec3(vP * 2.4, 4.0)) * 9.0);
  col *= 0.955 + 0.045 * sega;

  // due cretti da ritiro
  float c1 = abs(sin((a - 0.95) * 0.5)) * r;
  float c2 = abs(sin((a + 2.35) * 0.5)) * r;
  float w1 = 0.0055 + 0.004 * snoise(vec3(r * 9.0, 1.0, 2.0));
  float cretti = (1.0 - smoothstep(0.0, w1, c1)) * smoothstep(0.42, 0.62, r)
               + (1.0 - smoothstep(0.0, 0.004, c2)) * smoothstep(0.58, 0.74, r);
  cretti *= 1.0 - smoothstep(0.84, 0.9, rEdge);

  // anelli accesi fino all'anno corrente, gli altri restano spenti
  float bordo = uAnelli * NA + smoothstep(0.96, 1.0, uAnelli) * 8.0;
  float acceso = 1.0 - smoothstep(bordo - 0.5, bordo + 0.5, t);
  float lum = dot(col, vec3(0.299, 0.587, 0.114));
  vec3 spento = mix(vec3(lum), col, 0.3) * 0.40;
  col = mix(spento, col * 1.06, acceso);
  float vivo = step(0.0015, uAnelli) * (1.0 - step(0.999, uAnelli));
  float linea = exp(-pow((t - bordo) * 2.4, 2.0));
  col += vec3(1.0, 0.80, 0.52) * linea * 0.6 * vivo;
  col = mix(col, col * 0.25, cretti * 0.85);

  // cambio chiaro e corteccia sul bordo
  float rb = 0.925 + snoise(vec3(vP * 6.0, 9.0)) * 0.014;
  float cambio = smoothstep(rb - 0.03, rb - 0.016, rEdge) * (1.0 - smoothstep(rb - 0.012, rb, rEdge));
  col = mix(col, vec3(0.86, 0.66, 0.40) * (0.6 + 0.4 * acceso), cambio);
  float cort = smoothstep(rb - 0.004, rb + 0.004, rEdge);
  vec3 ccol = vec3(0.16, 0.11, 0.08) * (0.75 + 0.5 * (0.5 + 0.5 * snoise(vec3(vP * 22.0, 1.0))));
  col = mix(col, ccol, cort);

  // luce
  vec3 N = normalize(vN);
  vec3 V = normalize(cameraPosition - vWP);
  if (dot(N, V) < 0.0) N = -N;
  float dif = max(dot(N, uLuce), 0.0);
  vec3 H = normalize(uLuce + V);
  float spec = pow(max(dot(N, H), 0.0), 36.0) * 0.07;
  col = col * (0.45 + 0.68 * dif) + spec;
  col *= 1.0 - 0.16 * smoothstep(0.45, 0.95, rEdge);
  gl_FragColor = vec4(nebbia(col, vWP), 1.0);
}`;

// ---------- la corteccia ----------
const CORT = /* glsl */`
float cortH(vec3 p){
  float a = atan(p.z, p.x);
  vec3 q = vec3(cos(a) * 4.4, sin(a) * 4.4, p.y * 0.75);
  float r1 = 1.0 - abs(snoise(q));
  float r2 = 1.0 - abs(snoise(q * vec3(2.2, 2.2, 1.6) + 5.0));
  return r1 * 0.68 + r2 * 0.32;
}`;

const cortecciaVS = /* glsl */`
uniform float uOff; uniform float uMezza; uniform float uAmp;
varying vec3 vL; varying vec3 vWP;
${SNOISE}
${CORT}
void main(){
  vec3 p = position;
  vec3 lp = vec3(p.x, p.y + uOff, p.z);
  float h = cortH(lp);
  float bordi = smoothstep(0.0, 0.07, uMezza - abs(p.y));
  vec3 n = normalize(vec3(p.x, 0.0, p.z));
  p += n * h * h * uAmp * bordi;
  vL = lp;
  vec4 wp = modelMatrix * vec4(p, 1.0);
  vWP = wp.xyz;
  gl_Position = projectionMatrix * viewMatrix * wp;
}`;

const cortecciaFS = /* glsl */`
uniform vec3 uLuce;
varying vec3 vL; varying vec3 vWP;
${SNOISE}
${CORT}
${NEBBIA}
void main(){
  vec3 N = normalize(cross(dFdx(vWP), dFdy(vWP)));
  float h = cortH(vL);
  vec3 col = mix(vec3(0.085, 0.062, 0.048), vec3(0.37, 0.31, 0.25), smoothstep(0.32, 0.96, h));
  float m = smoothstep(0.2, 0.7, snoise(vL * vec3(1.3, 0.55, 1.3) + 3.0)) * smoothstep(-0.2, 0.7, vL.z);
  col = mix(col, vec3(0.21, 0.29, 0.12), m * 0.6);
  col *= 0.88 + 0.12 * snoise(vL * 16.0);
  vec3 V = normalize(cameraPosition - vWP);
  float dif = max(dot(N, uLuce), 0.0);
  float rim = pow(1.0 - max(dot(N, V), 0.0), 2.5);
  col = col * (0.34 + 0.9 * dif) + vec3(0.95, 0.80, 0.55) * rim * 0.16;
  gl_FragColor = vec4(nebbia(col, vWP), 1.0);
}`;

// ---------- la segatura ----------
const segaturaVS = /* glsl */`
attribute vec3 aVel; attribute float aSeme;
uniform float uSeg; uniform float uTempo; uniform float uScala;
varying float vA;
void main(){
  float s = clamp(uSeg * (0.75 + 0.5 * aSeme), 0.0, 1.0);
  vec3 p = position + aVel * s * 1.7;
  p.y -= s * s * 1.1;
  p.x += sin(uTempo * 0.9 + aSeme * 20.0) * 0.03 * s;
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = (0.6 + aSeme * 1.6) * uScala / -mv.z;
  vA = smoothstep(0.0, 0.06, s) * (1.0 - smoothstep(0.55, 1.0, s));
}`;
const polvereVS = /* glsl */`
attribute float aSeme;
uniform float uTempo; uniform float uScala;
varying float vA;
void main(){
  vec3 p = position;
  p.y = mod(p.y - uTempo * (0.05 + aSeme * 0.06) + 4.0, 8.0) - 4.0;
  p.x += sin(uTempo * 0.3 + aSeme * 30.0) * 0.15;
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = (0.5 + aSeme * 1.2) * uScala / -mv.z;
  vA = 0.16 + 0.22 * aSeme;
}`;
const puntoFS = /* glsl */`
varying float vA;
void main(){
  vec2 c = gl_PointCoord - 0.5;
  float a = smoothstep(0.5, 0.15, length(c)) * vA;
  gl_FragColor = vec4(vec3(1.0, 0.88, 0.66) * a, a);
}`;

const ease = (x) => x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
const tra = (x, a, b) => clamp((x - a) / (b - a), 0, 1);

export function avvia({ sezione, tela, segno }) {
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas: tela, antialias: true, powerPreference: 'high-performance' });
  } catch (e) { return false; }
  if (!renderer.getContext()) return false;

  const mobile = matchMedia('(max-width: 899px), (pointer: coarse)').matches;
  const fermo = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const dpr = Math.min(window.devicePixelRatio || 1, mobile ? 1.5 : 2);
  renderer.setPixelRatio(dpr);
  renderer.setClearColor(0x0F241A, 1);

  const scena = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 80);

  const condivisi = {
    uAnelli: { value: 0 },
    uLuce: { value: new THREE.Vector3(-0.55, 0.75, 0.95).normalize() },
    uNebbia: { value: new THREE.Vector2(8, 18) },
    uTempo: { value: 0 },
    uScala: { value: 60 * dpr },
  };
  const matAnelli = () => new THREE.ShaderMaterial({
    uniforms: { ...condivisi, uScuro: { value: 0 } },
    vertexShader: anelliVS, fragmentShader: anelliFS, side: THREE.DoubleSide,
  });
  const matCorteccia = (off, mezza, amp) => new THREE.ShaderMaterial({
    uniforms: { ...condivisi, uScuro: { value: 0 }, uOff: { value: off }, uMezza: { value: mezza }, uAmp: { value: amp } },
    vertexShader: cortecciaVS, fragmentShader: cortecciaFS, side: THREE.DoubleSide,
  });

  // tronco
  const gruppo = new THREE.Group();
  scena.add(gruppo);
  const segTronco = mobile ? 96 : 140;
  const anelliTronco = matAnelli();
  const cortTronco = matCorteccia(0, L / 2, 0.055);
  const tronco = new THREE.Mesh(
    new THREE.CylinderGeometry(R, R, L, segTronco, mobile ? 36 : 56, false),
    [cortTronco, anelliTronco, anelliTronco]
  );
  tronco.rotation.x = Math.PI / 2;
  gruppo.add(tronco);

  // rondella
  const anelliDisco = matAnelli();
  const cortDisco = matCorteccia(L / 2 + T / 2, T / 2, 0.022);
  const disco = new THREE.Mesh(
    new THREE.CylinderGeometry(R, R, T, segTronco, 3, false),
    [cortDisco, anelliDisco, anelliDisco]
  );
  scena.add(disco);

  // segatura che esce dal taglio (nel sistema del tronco)
  const nSeg = mobile ? 360 : 620;
  const pos = new Float32Array(nSeg * 3), vel = new Float32Array(nSeg * 3), seme = new Float32Array(nSeg);
  for (let i = 0; i < nSeg; i++) {
    const a = Math.random() * Math.PI * 2, r = Math.sqrt(Math.random()) * R * 1.02;
    pos[i * 3] = Math.cos(a) * r; pos[i * 3 + 1] = Math.sin(a) * r; pos[i * 3 + 2] = L / 2 + 0.02;
    const out = 0.4 + Math.random() * 1.2;
    vel[i * 3] = Math.cos(a) * out; vel[i * 3 + 1] = Math.sin(a) * out + 0.25; vel[i * 3 + 2] = 0.3 + Math.random() * 1.6;
    seme[i] = Math.random();
  }
  const gSeg = new THREE.BufferGeometry();
  gSeg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  gSeg.setAttribute('aVel', new THREE.BufferAttribute(vel, 3));
  gSeg.setAttribute('aSeme', new THREE.BufferAttribute(seme, 1));
  const uSeg = { value: 0 };
  const segatura = new THREE.Points(gSeg, new THREE.ShaderMaterial({
    uniforms: { ...condivisi, uSeg }, vertexShader: segaturaVS, fragmentShader: puntoFS,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  }));
  segatura.frustumCulled = false;
  gruppo.add(segatura);

  // pulviscolo nell'aria
  const nPol = mobile ? 160 : 280;
  const pPol = new Float32Array(nPol * 3), sPol = new Float32Array(nPol);
  for (let i = 0; i < nPol; i++) {
    pPol[i * 3] = (Math.random() - 0.5) * 9; pPol[i * 3 + 1] = (Math.random() - 0.5) * 8; pPol[i * 3 + 2] = -6 + Math.random() * 8;
    sPol[i] = Math.random();
  }
  const gPol = new THREE.BufferGeometry();
  gPol.setAttribute('position', new THREE.BufferAttribute(pPol, 3));
  gPol.setAttribute('aSeme', new THREE.BufferAttribute(sPol, 1));
  const polvere = new THREE.Points(gPol, new THREE.ShaderMaterial({
    uniforms: condivisi, vertexShader: polvereVS, fragmentShader: puntoFS,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  }));
  polvere.frustumCulled = false;
  scena.add(polvere);

  // ---------- inquadratura ----------
  const st = { w: 1, h: 1, D: 9, fine: new THREE.Vector3(), verticale: true, mx: 0, my: 0, cx: 0, cy: 0 };
  const tan = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * 2;
  function misura() {
    const r = tela.getBoundingClientRect();
    st.w = Math.max(1, r.width); st.h = Math.max(1, r.height);
    const asp = st.w / st.h;
    st.verticale = asp < 1.05;
    camera.aspect = asp;
    if (st.verticale) {
      st.D = (2 * R) / (0.8 * asp * tan);
      const Hv = st.D * tan;
      st.fine.set(0, Hv * 0.14, 0);
    } else {
      st.D = (2 * R) / (0.6 * tan);
      const Hv = st.D * tan, Wv = Hv * asp;
      st.fine.set(Wv * 0.19, 0, 0);
    }
    camera.position.set(0, 0, st.D);
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();
    condivisi.uNebbia.value.set(st.D + 0.6, st.D + 9);
    renderer.setSize(st.w, st.h, false);
  }
  misura();
  new ResizeObserver(misura).observe(tela);

  if (!mobile) {
    window.addEventListener('pointermove', (e) => {
      st.mx = e.clientX / innerWidth - 0.5; st.my = e.clientY / innerHeight - 0.5;
    }, { passive: true });
  }

  // ---------- coreografia ----------
  const qX = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI / 2);
  const Y = new THREE.Vector3(0, 1, 0);
  const qInizio = new THREE.Quaternion(), qFine = new THREE.Quaternion(), qGiro = new THREE.Quaternion();
  const vInizio = new THREE.Vector3(), vTmp = new THREE.Vector3(), dir = new THREE.Vector3();

  function progresso() {
    const r = sezione.getBoundingClientRect();
    const corsa = r.height - innerHeight;
    return corsa > 0 ? clamp(-r.top / corsa, 0, 1) : 0;
  }

  function aggiorna(t, p) {
    condivisi.uTempo.value = t;
    const s = ease(tra(p, 0.06, 0.40));        // la rondella si stacca e viene avanti
    const anelli = tra(p, 0.40, 0.90);         // 1994 -> 2026
    condivisi.uAnelli.value = anelli;
    uSeg.value = tra(p, 0.08, 0.5);

    // tronco: tre quarti, poi indietreggia nella nebbia
    const ondeggia = fermo ? 0 : Math.sin(t * 0.35) * 0.06;
    const base = st.verticale
      ? { x: 0.55, y: st.fine.y * 0.5, z: -0.6, ry: -0.6, rx: 0.3 }
      : { x: st.fine.x * 1.5, y: -0.05, z: -0.7, ry: -0.68, rx: 0.24 };
    gruppo.position.set(base.x + s * 0.7, base.y - s * 0.9, base.z - s * 3.2);
    gruppo.rotation.set(base.rx + s * 0.15, base.ry + ondeggia - s * 0.35, 0.05);
    gruppo.updateMatrixWorld(true);
    cortTronco.uniforms.uScuro.value = s * 0.55;
    anelliTronco.uniforms.uScuro.value = s * 0.55;

    // rondella: dal tronco fino davanti alla camera
    vInizio.set(0, 0, L / 2 + T / 2 + s * 0.02).applyMatrix4(gruppo.matrixWorld);
    qInizio.copy(gruppo.quaternion).multiply(qX);
    dir.copy(camera.position).sub(st.fine).normalize();
    qFine.setFromUnitVectors(Y, dir);
    const vive = fermo ? 0 : Math.sin(t * 0.5) * 0.04;
    qGiro.setFromAxisAngle(Y, (1 - s) * 1.6 + vive + anelli * 0.5);
    disco.position.lerpVectors(vInizio, st.fine, s);
    disco.position.y += Math.sin(s * Math.PI) * 0.45;
    disco.position.z += Math.sin(s * Math.PI) * 0.9;
    disco.quaternion.slerpQuaternions(qInizio, qFine, s).multiply(qGiro);
    disco.updateMatrixWorld(true);

    // camera: sul desktop segue un poco il mouse
    st.cx += (st.mx * 0.5 - st.cx) * 0.05; st.cy += (-st.my * 0.35 - st.cy) * 0.05;
    camera.position.set(st.cx, st.cy, st.D);
    camera.lookAt(st.cx * 0.3, st.cy * 0.3, 0);

    // il segno dell'anno sul bordo dell'anello acceso
    if (segno) {
      const vedo = s > 0.94;
      segno.classList.toggle('vivo', vedo);
      if (vedo) {
        const rn = Math.pow(Math.max(anelli, 0.0001), 1 / 1.18);
        const r = rn * 0.86 * R;
        const th = -0.8;
        vTmp.set(CENTRO.x + Math.cos(th) * r, T / 2 + 0.002, CENTRO.y + Math.sin(th) * r)
          .applyMatrix4(disco.matrixWorld).project(camera);
        const x = (vTmp.x * 0.5 + 0.5) * st.w, y = (-vTmp.y * 0.5 + 0.5) * st.h;
        segno.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
        const anno = 1994 + Math.round(anelli * NA);
        if (segno.dataset.anno !== String(anno)) { segno.dataset.anno = anno; segno.lastElementChild.textContent = anno; }
      }
    }
  }

  // ---------- ciclo ----------
  let raf = 0, inVista = false, pronta = false;
  function disegna(ts) {
    aggiorna((ts || performance.now()) / 1000, fermo ? 1 : progresso());
    renderer.render(scena, camera);
    if (!pronta) { pronta = true; sezione.classList.add('pronto'); }
  }
  // se il telefono fatica, scende la risoluzione (una volta sola)
  let campioni = 0, somma = 0, prima = 0, ridotta = false;
  function ciclo(ts) {
    raf = requestAnimationFrame(ciclo);
    if (prima && !ridotta) {
      const dt = ts - prima;
      if (dt < 200) { somma += dt; campioni++; }
      if (campioni === 90) {
        if (somma / campioni > 20 && renderer.getPixelRatio() > 1) { renderer.setPixelRatio(1); misura(); }
        ridotta = true;
      }
    }
    prima = ts;
    disegna(ts);
  }
  function parti() { if (!raf && inVista && !document.hidden && !fermo) raf = requestAnimationFrame(ciclo); }
  function ferma() { if (raf) cancelAnimationFrame(raf); raf = 0; }

  new IntersectionObserver((e) => {
    inVista = e.some((x) => x.isIntersecting);
    if (inVista) { if (fermo) disegna(); else parti(); } else ferma();
  }, { rootMargin: '20% 0px' }).observe(sezione);
  document.addEventListener('visibilitychange', () => (document.hidden ? ferma() : parti()));
  if (fermo) window.addEventListener('resize', () => disegna());

  disegna();
  window.__anelli = { disegna, progresso, aggiorna, renderer, scena, camera };
  return true;
}
