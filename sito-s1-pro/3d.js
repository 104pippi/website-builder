// S1 PRO — il tampone in 3D.
// Un ciclo di tampografia vero, guidato dallo scroll: il calamaio scopre il cliché inciso col logo,
// il tampone di silicone scende, si schiaccia (deformazione nello shader), preleva l'inchiostro,
// si sposta sulla pallina da golf, si adatta alla curva e posa il logo.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

// Il marchio S1 vettorializzato dal logo dell'azienda (coordinate potrace, asse y in su, riquadro 2338×1286).
const PATH_S = "M323 1285 c-2 0 -8 -1 -14 -1 -39 -3 -90 -14 -119 -27 -2 -1 -4 -2 -5 -2 -1 0 -28 -14 -34 -18 -43 -26 -74 -59 -95 -102 -21 -42 -31 -82 -34 -137 -1 -24 0 -59 2 -74 1 -4 2 -11 3 -16 6 -44 24 -92 49 -133 22 -37 46 -67 83 -105 29 -28 51 -48 114 -100 50 -42 64 -55 92 -82 12 -13 26 -28 32 -36 40 -50 58 -95 58 -146 0 -22 -2 -31 -8 -48 -13 -34 -44 -58 -86 -65 -13 -2 -42 -2 -50 0 -24 5 -43 16 -58 34 -26 31 -42 76 -48 137 -1 7 -2 14 -3 14 0 1 -6 0 -14 -1 -7 -1 -18 -3 -24 -4 -7 0 -14 -2 -17 -2 -4 -1 -13 -2 -21 -3 -8 -1 -17 -2 -20 -3 -4 0 -12 -2 -18 -3 -6 0 -16 -2 -21 -3 -5 0 -14 -2 -19 -2 -6 -1 -19 -3 -29 -5 l-19 -2 0 -8 c0 -5 1 -12 2 -17 1 -5 2 -12 2 -16 3 -26 8 -45 15 -70 7 -24 12 -34 23 -58 29 -60 70 -106 125 -137 17 -10 41 -20 60 -26 3 0 8 -2 10 -3 2 0 8 -1 12 -2 29 -6 40 -7 74 -7 16 0 34 0 42 1 15 1 47 6 56 9 3 0 8 2 12 3 48 12 91 34 127 65 27 23 51 55 66 87 2 4 5 9 5 10 2 4 8 20 10 29 2 4 4 10 4 11 1 2 2 7 6 25 4 19 6 40 7 70 0 24 0 33 -1 45 -3 23 -8 51 -12 62 0 1 -2 5 -3 9 -2 7 -7 22 -8 25 0 1 -3 6 -5 11 -11 28 -36 70 -58 99 -36 45 -75 84 -149 147 -12 11 -32 27 -43 37 -102 88 -140 136 -153 198 -2 12 -2 48 0 60 4 17 7 26 13 38 7 16 21 31 35 39 24 13 58 17 85 10 30 -9 51 -27 66 -57 7 -13 10 -22 14 -38 2 -11 4 -18 6 -34 0 -5 0 -5 4 -5 1 0 6 0 10 1 4 0 14 2 23 2 9 1 19 2 23 3 3 0 9 1 13 1 4 1 10 1 15 2 4 1 14 2 21 2 7 1 20 3 28 3 7 1 16 2 19 3 24 2 31 3 37 4 9 1 10 1 9 6 -4 32 -9 57 -17 83 -24 78 -69 138 -129 174 -26 16 -55 27 -84 33 -3 0 -8 1 -11 2 -15 3 -33 4 -56 5 -14 0 -26 0 -27 -1z";
const PATH_1 = "M1060 1285 c0 -1 -38 -31 -60 -47 -17 -12 -27 -18 -50 -33 -24 -16 -51 -31 -79 -47 -23 -12 -39 -21 -58 -30 -4 -3 -7 -5 -8 -6 -1 -1 -1 -23 -1 -59 l1 -56 84 -1 c46 0 85 -1 86 -1 1 -1 1 -103 1 -500 0 -275 0 -500 1 -500 0 -1 40 -1 97 -1 87 0 97 0 97 2 1 2 1 1275 0 1278 l0 2 -56 0 c-30 0 -55 0 -55 -1z";

const INK = new THREE.Color('#E2211C');
const FONDO = new THREE.Color('#16151F');
const LASTRA = { x: -1.9, top: 0.38 };          // centro del logo inciso, quota del piano del cliché
const PALLA = { x: 1.7, y: 0.616, r: 0.55 };    // pallina da golf sul suo supporto
const TAMP = { h: 0.95, r: 0.6, riposo: 2.05 }; // tampone: altezza, raggio, quota di riposo della punta
const LOGO = 0.66;                              // lato del logo, in unità di scena

const clamp01 = (v) => Math.min(1, Math.max(0, v));
const seg = (p, a, b) => clamp01((p - a) / (b - a));
const morbido = (t) => t * t * t * (t * (t * 6 - 15) + 10);
const lerp = (a, b, t) => a + (b - a) * t;

function texturaLogo(maxAniso) {
  const c = document.createElement('canvas');
  c.width = c.height = 1024;
  const g = c.getContext('2d');
  g.fillStyle = '#000';
  g.fillRect(0, 0, 1024, 1024);
  const alto = 860;
  const s = alto / 1286;
  const largo = 1240 * s;
  g.save();
  g.translate((1024 - largo) / 2, (1024 - alto) / 2);
  g.scale(s, s);
  g.translate(0, 1286);
  g.scale(1, -1);
  g.fillStyle = '#fff';
  g.fill(new Path2D(PATH_S));
  g.fill(new Path2D(PATH_1));
  g.restore();
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.NoColorSpace;
  t.anisotropy = Math.min(8, maxAniso);
  return t;
}

function texturaOmbra() {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  const r = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  r.addColorStop(0, 'rgba(0,0,0,0.85)');
  r.addColorStop(0.45, 'rgba(0,0,0,0.45)');
  r.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = r;
  g.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// Punto più vicino su una distribuzione di Fibonacci sferica (Keinert et al. 2015): le fossette della pallina.
const FIBO = /* glsl */ `
const float F_PI = 3.14159265;
const float F_PHI = 1.61803399;
vec3 fiboVicino( vec3 p, float n ) {
  float phi = min( atan( p.y, p.x ), F_PI );
  float cosTheta = p.z;
  float k = max( 2.0, floor( log( n * F_PI * sqrt( 5.0 ) * ( 1.0 - cosTheta * cosTheta ) ) / log( F_PHI * F_PHI ) ) );
  float Fk = pow( F_PHI, k ) / sqrt( 5.0 );
  vec2 F = vec2( round( Fk ), round( Fk * F_PHI ) );
  vec2 ka = 2.0 * F / n;
  vec2 kb = 2.0 * F_PI * ( fract( ( F + 1.0 ) * F_PHI ) - ( F_PHI - 1.0 ) );
  mat2 iB = mat2( ka.y, -ka.x, kb.y, -kb.x ) / ( ka.y * kb.x - ka.x * kb.y );
  vec2 c = floor( iB * vec2( phi, cosTheta - ( 1.0 - 1.0 / n ) ) );
  float best = 8.0;
  vec3 bq = vec3( 0.0, 0.0, 1.0 );
  for ( int s = 0; s < 4; s++ ) {
    vec2 uv = vec2( float( s - 2 * ( s / 2 ) ), float( s / 2 ) );
    float i = dot( F, uv + c );
    float phi2 = 2.0 * F_PI * fract( i * ( F_PHI - 1.0 ) );
    float ct = 1.0 - ( 2.0 * i + 1.0 ) / n;
    float st = sqrt( max( 0.0, 1.0 - ct * ct ) );
    vec3 q = vec3( cos( phi2 ) * st, sin( phi2 ) * st, ct );
    float dd = dot( q - p, q - p );
    if ( dd < best ) { best = dd; bq = q; }
  }
  return bq;
}
`;

// Fotogrammi chiave della camera: dove guarda (t), da dove (c), quanta scena deve stare nell'inquadratura (w).
const K = [
  { p: 0.00, t: [-0.15, 0.78, 0], c: [0.5, 2.75, 7.4], w: 3.05 },
  { p: 0.06, t: [-0.15, 0.78, 0], c: [0.6, 2.65, 7.4], w: 3.05 },
  { p: 0.13, t: [LASTRA.x + 0.6, 0.45, 0], c: [LASTRA.x + 1.2, 2.7, 4.1], w: 1.95 },
  { p: 0.24, t: [LASTRA.x + 0.6, 0.45, 0], c: [LASTRA.x + 1.4, 2.6, 3.9], w: 1.95 },
  { p: 0.31, t: [LASTRA.x, 0.85, 0], c: [LASTRA.x + 1.5, 1.35, 3.5], w: 1.5 },
  { p: 0.44, t: [LASTRA.x, 0.95, 0], c: [LASTRA.x + 1.2, 1.45, 3.6], w: 1.5 },
  { p: 0.52, t: [-0.1, 1.55, 0], c: [-0.1, 0.6, 4.6], w: 2.35 },
  { p: 0.59, t: [0.6, 1.5, 0], c: [0.5, 0.7, 4.4], w: 2.25 },
  { p: 0.66, t: [PALLA.x, 0.95, 0], c: [PALLA.x - 1.0, 1.75, 3.3], w: 1.35 },
  { p: 0.78, t: [PALLA.x, 0.95, 0], c: [PALLA.x - 1.2, 1.7, 3.2], w: 1.35 },
  { p: 0.92, t: [PALLA.x, 1.25, 0], c: [PALLA.x - 0.15, 1.5, 3.0], w: 0.92 },
  { p: 1.00, t: [PALLA.x, 1.25, 0], c: [PALLA.x - 0.1, 1.5, 3.0], w: 0.92 },
];

export function avvia(sec, stato, { ridotto = false } = {}) {
  const canvas = sec.querySelector('.tampone__tela');
  const palco = sec.querySelector('.tampone__palco');

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  } catch (e) {
    return false;
  }
  const mobile = matchMedia('(pointer: coarse)').matches || innerWidth < 800;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, mobile ? 1.5 : 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 1.02;
  renderer.setClearColor(FONDO, 1);

  const scene = new THREE.Scene();
  scene.background = FONDO;
  scene.fog = new THREE.Fog(FONDO, 8, 19);
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.68;
  pmrem.dispose();

  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 60);

  // luci: chiave bianca, controluce rosso S1, occhio di bue sul banco
  const chiave = new THREE.DirectionalLight(0xffffff, 1.9);
  chiave.position.set(-3, 6, 4);
  const taglio = new THREE.DirectionalLight(0xff5446, 1.6);
  taglio.position.set(4, 2.6, -5);
  const spot = new THREE.SpotLight(0xfff3e6, 120, 0, 0.6, 0.9, 2);
  spot.position.set(0, 7.5, 2.4);
  spot.target.position.set(0, 0, 0);
  scene.add(chiave, taglio, spot, spot.target, new THREE.HemisphereLight(0xc6caff, 0x15141c, 0.4));

  const logoTex = texturaLogo(renderer.capabilities.getMaxAnisotropy());
  const ombraTex = texturaOmbra();

  // materiali
  const acciaio = new THREE.MeshStandardMaterial({ color: 0xd2d5dc, metalness: 1, roughness: 0.24 });
  const spazzolato = new THREE.MeshStandardMaterial({ color: 0xbfc2ca, metalness: 1, roughness: 0.42 });
  const anodizzato = new THREE.MeshStandardMaterial({ color: 0x353441, metalness: 0.55, roughness: 0.45 });
  const bancoMat = new THREE.MeshStandardMaterial({ color: 0x2b2a37, metalness: 0.15, roughness: 0.62 });
  const ceramica = new THREE.MeshStandardMaterial({ color: 0xf1efe9, metalness: 0, roughness: 0.3 });

  const mesh = (geo, mat, x = 0, y = 0, z = 0) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    return m;
  };
  const ombra = (w, d, op) => {
    const m = new THREE.Mesh(
      new THREE.PlaneGeometry(w, d),
      new THREE.MeshBasicMaterial({ map: ombraTex, transparent: true, depthWrite: false, opacity: op, polygonOffset: true, polygonOffsetFactor: -2 })
    );
    m.rotation.x = -Math.PI / 2;
    return m;
  };

  // banco
  scene.add(mesh(new THREE.BoxGeometry(70, 0.5, 70), bancoMat, 0, -0.25, 0));

  // cliché su porta-cliché
  const cx = LASTRA.x + 0.6;
  scene.add(mesh(new THREE.BoxGeometry(2.95, 0.32, 1.6), anodizzato, cx, 0.16, 0));
  scene.add(mesh(new THREE.BoxGeometry(2.75, 0.06, 1.38), acciaio, cx, 0.35, 0));
  const ombraBase = ombra(4.2, 2.6, 0.55);
  ombraBase.position.set(cx, 0.002, 0);
  scene.add(ombraBase);

  // il logo inciso, con l'inchiostro dentro
  const incisione = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -4,
    uniforms: {
      uLogo: { value: logoTex },
      uInk: { value: 1 },
      uColInk: { value: INK.clone() },
      uColInc: { value: new THREE.Color('#585b66') },
    },
    vertexShader: /* glsl */ `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 ); }`,
    fragmentShader: /* glsl */ `
      uniform sampler2D uLogo; uniform float uInk; uniform vec3 uColInk; uniform vec3 uColInc; varying vec2 vUv;
      void main(){
        float m = texture2D( uLogo, vUv ).r;
        vec3 c = mix( uColInc, uColInk * 0.92, uInk );
        gl_FragColor = vec4( c, m );
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
  const logoLastra = mesh(new THREE.PlaneGeometry(LOGO, LOGO), incisione, LASTRA.x, LASTRA.top + 0.001, 0);
  logoLastra.rotation.x = -Math.PI / 2;
  scene.add(logoLastra);

  // calamaio (la coppa d'inchiostro che scorre sul cliché)
  const calamaio = new THREE.Group();
  calamaio.add(mesh(new THREE.CylinderGeometry(0.53, 0.53, 0.05, 64), ceramica, 0, 0.025, 0));
  calamaio.add(mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.3, 64), spazzolato, 0, 0.2, 0));
  calamaio.add(mesh(new THREE.CylinderGeometry(0.36, 0.42, 0.08, 48), anodizzato, 0, 0.39, 0));
  calamaio.add(mesh(new THREE.BoxGeometry(1.3, 0.1, 0.22), anodizzato, 0.85, 0.24, 0));
  const ombraCal = ombra(1.5, 1.5, 0.5);
  ombraCal.position.y = 0.002;
  calamaio.add(ombraCal);
  calamaio.position.set(LASTRA.x, LASTRA.top, 0);
  scene.add(calamaio);

  // supporto e pallina da golf
  scene.add(mesh(new THREE.CylinderGeometry(0.46, 0.5, 0.2, 48), anodizzato, PALLA.x, 0.1, 0));
  const anello = mesh(new THREE.TorusGeometry(0.37, 0.035, 12, 64), acciaio, PALLA.x, 0.2, 0);
  anello.rotation.x = Math.PI / 2;
  scene.add(anello);
  const ombraSupporto = ombra(1.7, 1.7, 0.6);
  ombraSupporto.position.set(PALLA.x, 0.002, 0);
  scene.add(ombraSupporto);

  const uPalla = {
    uLogo: { value: logoTex },
    uLogoLato: { value: LOGO },
    uInk: { value: INK.clone() },
    uStampa: { value: 0 },
    uNM: { value: new THREE.Matrix3() },
    uFossa: { value: 0.036 },
  };
  const pallaMat = new THREE.MeshPhysicalMaterial({ color: 0xf7f7f4, roughness: 0.34, clearcoat: 1, clearcoatRoughness: 0.1 });
  pallaMat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, uPalla);
    sh.vertexShader = 'varying vec3 vObj;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nvObj = position;');
    sh.fragmentShader =
      'uniform sampler2D uLogo; uniform float uLogoLato; uniform vec3 uInk; uniform float uStampa; uniform mat3 uNM; uniform float uFossa;\nvarying vec3 vObj;\n' +
      FIBO +
      sh.fragmentShader
        .replace(
          '#include <color_fragment>',
          `#include <color_fragment>
          {
            vec2 puv = vec2( vObj.x, -vObj.z ) / uLogoLato + 0.5;
            float dentro = step( 0.0, puv.x ) * step( puv.x, 1.0 ) * step( 0.0, puv.y ) * step( puv.y, 1.0 ) * step( 0.0, vObj.y );
            float rr = length( vObj.xz );
            float ink = texture2D( uLogo, puv ).r * dentro * ( 1.0 - smoothstep( uStampa - 0.035, uStampa, rr ) );
            diffuseColor.rgb = mix( diffuseColor.rgb, uInk, ink );
          }`
        )
        .replace(
          '#include <normal_fragment_maps>',
          `#include <normal_fragment_maps>
          {
            vec3 pO = normalize( vObj );
            vec3 qs = fiboVicino( pO.yzx, 332.0 );
            vec3 q = vec3( qs.z, qs.x, qs.y );
            float d = length( pO - q );
            const float rd = 0.1;
            vec3 g = d < rd ? ( pO - q ) * ( 2.0 * uFossa / ( rd * rd ) ) : vec3( 0.0 );
            vec3 gT = g - pO * dot( g, pO );
            normal = normalize( uNM * normalize( pO - gT ) );
          }`
        )
        .replace(
          '#include <clearcoat_normal_fragment_maps>',
          `#include <clearcoat_normal_fragment_maps>
          #ifdef USE_CLEARCOAT
            clearcoatNormal = normal;
          #endif`
        );
  };
  const palla = mesh(new THREE.SphereGeometry(PALLA.r, 112, 80), pallaMat, PALLA.x, PALLA.y, 0);
  const m4 = new THREE.Matrix4();
  palla.onBeforeRender = (r, s, cam) => {
    uPalla.uNM.value.getNormalMatrix(m4.multiplyMatrices(cam.matrixWorldInverse, palla.matrixWorld));
  };
  scene.add(palla);

  // il tampone di silicone, con la sua deformazione
  const uTamp = {
    uSurfY: { value: -10 },
    uSph: { value: new THREE.Vector4(0, -10, 0, PALLA.r) },
    uModo: { value: -1 },
    uSchiaccia: { value: 0 },
    uLogo: { value: logoTex },
    uLogoLato: { value: LOGO },
    uInkTamp: { value: 0 },
    uInk: { value: INK.clone() },
  };
  const tampMat = new THREE.MeshPhysicalMaterial({
    color: 0xefe8dd, roughness: 0.46, clearcoat: 0.35, clearcoatRoughness: 0.4,
    sheen: 0.5, sheenRoughness: 0.6, sheenColor: new THREE.Color(0xffffff),
  });
  tampMat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, uTamp);
    sh.vertexShader =
      'uniform float uSurfY; uniform vec4 uSph; uniform float uModo; uniform float uSchiaccia; uniform float uLogoLato;\nvarying vec2 vTampUv; varying float vPunta;\n' +
      sh.vertexShader
        .replace(
          '#include <beginnormal_vertex>',
          `vec3 objectNormal = vec3( normal );
          #ifdef USE_TANGENT
            vec3 objectTangent = vec3( tangent.xyz );
          #endif
          vec3 dPos = position;
          vTampUv = vec2( position.x, -position.z ) / uLogoLato + 0.5;
          vPunta = 1.0 - smoothstep( 0.03, 0.2, position.y );
          float sq = uSchiaccia;
          dPos.y += sq * 0.5 * exp( -position.y / 0.34 );
          dPos.xz *= 1.0 + 0.95 * sq * exp( -position.y / 0.42 );
          if ( uModo > -0.5 ) {
            float S = -100.0;
            vec3 nC = vec3( 0.0, 1.0, 0.0 );
            if ( uModo < 0.5 ) {
              S = uSurfY;
            } else {
              vec2 dd = dPos.xz - uSph.xz;
              float q = uSph.w * uSph.w - dot( dd, dd );
              if ( q > 0.0 ) { S = uSph.y + sqrt( q ); nC = normalize( vec3( dd.x, S - uSph.y, dd.y ) ); }
            }
            if ( dPos.y < S ) { dPos.y = S; objectNormal = -nC; }
          }`
        )
        .replace(
          '#include <begin_vertex>',
          `vec3 transformed = dPos;
          #ifdef USE_ALPHAHASH
            vPosition = vec3( position );
          #endif`
        );
    sh.fragmentShader =
      'uniform sampler2D uLogo; uniform float uInkTamp; uniform vec3 uInk;\nvarying vec2 vTampUv; varying float vPunta;\n' +
      sh.fragmentShader.replace(
        '#include <color_fragment>',
        `#include <color_fragment>
        { float a = texture2D( uLogo, vTampUv ).r * uInkTamp * vPunta; diffuseColor.rgb = mix( diffuseColor.rgb, uInk * 0.95, a ); }`
      );
  };
  const profilo = [];
  const N = 64;
  for (let i = 0; i <= N; i++) {
    const a = (i / N) * (Math.PI / 2);
    profilo.push(new THREE.Vector2(Math.max(0.0001, TAMP.r * Math.sin(a)), TAMP.h * (1 - Math.cos(a))));
  }
  profilo.push(new THREE.Vector2(TAMP.r, TAMP.h + 0.04), new THREE.Vector2(0.0001, TAMP.h + 0.04));
  const tampone = new THREE.Group();
  tampone.add(new THREE.Mesh(new THREE.LatheGeometry(profilo, 112), tampMat));
  tampone.add(mesh(new THREE.CylinderGeometry(0.7, 0.7, 0.1, 64), spazzolato, 0, TAMP.h + 0.08, 0));
  tampone.add(mesh(new THREE.BoxGeometry(0.52, 0.34, 0.52), anodizzato, 0, TAMP.h + 0.3, 0));
  tampone.add(mesh(new THREE.CylinderGeometry(0.075, 0.075, 4.4, 24), acciaio, 0, TAMP.h + 0.47 + 2.2, 0));
  scene.add(tampone);

  // guida e carrello in alto
  scene.add(mesh(new THREE.BoxGeometry(7.6, 0.24, 0.32), anodizzato, -0.1, 3.95, -0.36));
  const carrello = mesh(new THREE.BoxGeometry(0.72, 0.62, 0.62), anodizzato, 0, 3.95, 0);
  scene.add(carrello);

  // ombra del tampone sul cliché
  const ombraTamp = ombra(1.6, 1.6, 0);
  scene.add(ombraTamp);

  // ---------- inquadratura ----------
  let W = 1, H = 1, fullW = 1, fullH = 1, sx = 0.3, sy = 0.4;
  function misura() {
    W = canvas.clientWidth || palco.clientWidth || innerWidth;
    H = canvas.clientHeight || palco.clientHeight || innerHeight;
    renderer.setSize(W, H, false);
    const verticale = W / H < 1;
    camera.fov = verticale ? 42 : 30;
    const cxs = verticale ? 0.5 : 0.66;
    const cys = verticale ? 0.4 : 0.52;
    sx = verticale ? 0.44 : 0.29;
    sy = verticale ? 0.25 : 0.38;
    fullW = W * 2 * Math.max(cxs, 1 - cxs);
    fullH = H * 2 * Math.max(cys, 1 - cys);
    camera.aspect = fullW / fullH;
    camera.setViewOffset(fullW, fullH, fullW / 2 - cxs * W, fullH / 2 - cys * H, W, H);
    camera.updateProjectionMatrix();
  }
  function distanza(w) {
    const tn = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    return Math.max((w * fullH) / (2 * tn * sx * W), (0.62 * w * fullH) / (2 * tn * sy * H));
  }

  const vT = new THREE.Vector3(), vC = new THREE.Vector3(), vA = new THREE.Vector3(), vB = new THREE.Vector3();
  const puntatore = { x: 0, y: 0, mx: 0, my: 0 };
  if (matchMedia('(pointer: fine)').matches) {
    addEventListener('pointermove', (e) => {
      puntatore.x = (e.clientX / innerWidth) * 2 - 1;
      puntatore.y = (e.clientY / innerHeight) * 2 - 1;
    }, { passive: true });
  }

  function camera3d(p, t, dt) {
    let i = 0;
    while (i < K.length - 2 && p > K[i + 1].p) i++;
    const a = K[i], b = K[i + 1];
    const f = morbido(seg(p, a.p, b.p));
    vT.set(lerp(a.t[0], b.t[0], f), lerp(a.t[1], b.t[1], f), lerp(a.t[2], b.t[2], f));
    vA.set(a.c[0] - a.t[0], a.c[1] - a.t[1], a.c[2] - a.t[2]).normalize();
    vB.set(b.c[0] - b.t[0], b.c[1] - b.t[1], b.c[2] - b.t[2]).normalize();
    vA.lerp(vB, f).normalize();
    const d = distanza(lerp(a.w, b.w, f));
    scene.fog.near = d + 1.2;
    scene.fog.far = d + 13;
    puntatore.mx += (puntatore.x - puntatore.mx) * (1 - Math.exp(-dt * 3));
    puntatore.my += (puntatore.y - puntatore.my) * (1 - Math.exp(-dt * 3));
    vC.copy(vT).addScaledVector(vA, d);
    vC.x += Math.sin(t * 0.31) * 0.07 * d * 0.2 + puntatore.mx * 0.22;
    vC.y += Math.sin(t * 0.23) * 0.05 * d * 0.2 - puntatore.my * 0.12;
    if (vC.y < 0.5) vC.y = 0.5;
    camera.position.copy(vC);
    camera.lookAt(vT);
  }

  // ---------- la coreografia, da p (0..1) e dal tempo ----------
  let pressioneCss = -1;
  function disegna(p, t, dt = 1 / 60) {
    // 1. il calamaio scopre il cliché, poi torna a coprirlo
    const via = morbido(seg(p, 0.09, 0.22));
    const torna = morbido(seg(p, 0.52, 0.62));
    calamaio.position.x = LASTRA.x + 1.28 * (via - torna);

    // 2-4. il tampone
    const vaPalla = morbido(seg(p, 0.47, 0.6));
    const tx = lerp(LASTRA.x, PALLA.x, vaPalla);
    const giu1 = morbido(seg(p, 0.27, 0.35)) - morbido(seg(p, 0.385, 0.46));
    const giu2 = morbido(seg(p, 0.63, 0.695)) - morbido(seg(p, 0.725, 0.79));
    const fondo1 = LASTRA.top - 0.3;
    const fondo2 = PALLA.y + PALLA.r - 0.3;
    let ty = p < 0.47 ? lerp(TAMP.riposo, fondo1, giu1) : lerp(TAMP.riposo, fondo2, giu2);
    ty += morbido(seg(p, 0.8, 0.9)) * 2.4;
    ty += Math.sin(t * 1.7) * 0.02 * (1 - giu1) * (1 - giu2);

    // finale: la pallina si alza e mostra il logo
    const su = morbido(seg(p, 0.82, 0.93));
    const py = PALLA.y + su * 0.62;
    palla.position.y = py;
    palla.rotation.set(su * 1.2, su * 0.1 + Math.sin(t * 0.6) * 0.34 * su, 0, 'YXZ');

    // contatto
    let modo = -1, pen = 0;
    if (Math.abs(tx - LASTRA.x) < 0.95) {
      modo = 0;
      pen = Math.max(0, LASTRA.top - ty);
      uTamp.uSurfY.value = LASTRA.top - ty;
    } else if (Math.abs(tx - PALLA.x) < 0.95) {
      modo = 1;
      pen = Math.max(0, py + PALLA.r - ty);
      uTamp.uSph.value.set(PALLA.x - tx, py - ty, 0, PALLA.r);
    }
    uTamp.uModo.value = modo;
    uTamp.uSchiaccia.value = Math.min(pen, 0.34);
    tampone.position.set(tx, ty, 0);
    carrello.position.x = tx;

    // inchiostro: cliché → tampone → pallina
    uTamp.uInkTamp.value = seg(p, 0.345, 0.372) - 0.92 * seg(p, 0.69, 0.716);
    incisione.uniforms.uInk.value = 1 - 0.86 * seg(p, 0.345, 0.372) + 0.86 * seg(p, 0.6, 0.62);
    uPalla.uStampa.value = 0.62 * morbido(seg(p, 0.665, 0.712));

    // ombra del tampone sul cliché
    const vicino = clamp01(1 - Math.abs(tx - LASTRA.x) / 1.1);
    const altezza = clamp01((ty - LASTRA.top) / 1.9);
    ombraTamp.position.set(tx, LASTRA.top + 0.003, 0);
    ombraTamp.material.opacity = 0.6 * vicino * (1 - altezza);
    ombraTamp.scale.setScalar(0.75 + altezza * 0.9);

    // luce che respira
    chiave.position.x = -3 + Math.sin(t * 0.27) * 1.3;

    camera3d(p, t, dt);
    renderer.render(scene, camera);

    // il titolo del passo si "schiaccia" con il tampone
    const pr = Math.round(clamp01(pen / 0.3) * 20) / 20;
    if (pr !== pressioneCss) {
      pressioneCss = pr;
      sec.style.setProperty('--pressione', String(pr));
    }
  }

  // ---------- ciclo ----------
  misura();
  let pS = stato.p;
  let tempo = 0, tPrec = null, raf = 0, attivo = false, inVista = true;

  function fotogramma(ts) {
    raf = 0;
    if (!attivo) return;
    const dt = tPrec == null ? 1 / 60 : Math.min(0.1, Math.max(0, (ts - tPrec) / 1000));
    tPrec = ts;
    tempo += dt;
    pS += (stato.p - pS) * (1 - Math.exp(-dt * 7));
    if (Math.abs(stato.p - pS) < 0.0003) pS = stato.p;
    disegna(pS, tempo, dt);
    raf = requestAnimationFrame(fotogramma);
  }
  function accendi() {
    if (attivo || ridotto) return;
    attivo = true;
    tPrec = null;
    raf = requestAnimationFrame(fotogramma);
  }
  function spegni() {
    attivo = false;
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
  }
  function aggiorna() {
    if (inVista && !document.hidden) accendi();
    else spegni();
  }

  const primo = () => {
    disegna(ridotto ? 1 : pS, 0);
    canvas.classList.add('is-pronta');
    sec.classList.add('is-3d');
    new IntersectionObserver(([v]) => { inVista = v.isIntersecting; aggiorna(); }).observe(sec);
    document.addEventListener('visibilitychange', aggiorna);
    aggiorna();
  };
  new ResizeObserver(() => {
    misura();
    if (!attivo) disegna(ridotto ? 1 : pS, tempo);
  }).observe(canvas);

  camera3d(pS, 0, 1 / 60);
  if (renderer.compileAsync) renderer.compileAsync(scene, camera).then(primo, primo);
  else primo();
  return true;
}
