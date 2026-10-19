// Il segno FDE forgiato: otto barre piegate e quattro rombi, estrusi in metallo dorato,
// arrivano da punti diversi della scena e si montano mentre la sezione entra in vista.
import * as THREE from 'three';
import { SVGLoader } from 'three/addons/loaders/SVGLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const SEGNO = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 36.5 33.9">
<path d="M29.6,1.2c0.7,4-1.5,8.3-4.4,11.3c0.9,0.8,1.5,1.6,2.2,2.3c4.1-2.9,6.2-8.5,5.7-13.6H29.6z"/>
<path d="M7.1,1.2H3.6C3.1,6.2,5.3,11.9,9.3,14.8c0.7-0.7,1.3-1.5,2.2-2.3C8.6,9.5,6.4,5.2,7.1,1.2z"/>
<path d="M11.3,21.4c-0.9-0.8-1.5-1.6-2.2-2.3C5,22,2.9,27.6,3.4,32.7h3.5C6.1,28.7,8.4,24.4,11.3,21.4z"/>
<path d="M27.4,19.1c-0.7,0.7-1.3,1.5-2.2,2.3c2.9,3,5.2,7.3,4.4,11.3h3.5C33.6,27.6,31.4,22,27.4,19.1z"/>
<path d="M13.9,24c-2.4,2.3-4,4.5-3.8,8.7h3.1c0.1-3.6,1.2-4.4,3-6.4C15.5,25.6,14.6,24.7,13.9,24z"/>
<path d="M20.4,26.3c1.8,2,2.9,2.8,3,6.4h3.1c0.2-4.2-1.4-6.4-3.8-8.7C22,24.7,21.1,25.6,20.4,26.3z"/>
<path d="M20.4,7.6c0.7,0.8,1.6,1.6,2.3,2.3c2.4-2.3,4-4.5,3.8-8.7l-3.1,0C23.3,4.8,22.2,5.6,20.4,7.6z"/>
<path d="M16.2,7.6c-1.8-2-2.9-2.8-3-6.4l-3.1,0c-0.2,4.2,1.4,6.4,3.8,8.7C14.6,9.2,15.5,8.3,16.2,7.6z"/>
<polygon points="16.2,21.7 18.4,24 20.7,21.7 18.4,19.4"/>
<polygon points="11.6,17.1 13.9,19.4 16.1,17.1 13.9,14.8"/>
<polygon points="20.7,17.1 22.9,19.4 25.1,17.1 22.9,14.8"/>
<polygon points="20.7,12.5 18.4,10.1 16.2,12.5 18.4,14.8"/>
</svg>`;

const CENTRO = new THREE.Vector2(18.25, 16.95);
const DURATA_PEZZO = 0.55;

// numeri pseudo-casuali sempre uguali: la scena si monta identica a ogni visita (e nel video)
function semi(s) {
  return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
}

export function avvia(contenitore, { ridotto = false } = {}) {
  const tela = document.createElement('canvas');
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas: tela, antialias: true, alpha: true, powerPreference: 'high-performance' });
  } catch (e) {
    return;
  }
  if (!renderer.getContext()) return;

  const mobile = matchMedia('(max-width: 899px)').matches;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, mobile ? 1.5 : 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.08;
  contenitore.appendChild(tela);

  const scena = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scena.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  pmrem.dispose();

  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 400);
  camera.position.set(0, 0, 70);

  const luce = new THREE.DirectionalLight(0xfff0d8, 2.4);
  luce.position.set(14, 16, 24);
  scena.add(luce);
  const controluce = new THREE.DirectionalLight(0x9fb4c4, 0.9);
  controluce.position.set(-18, -8, -10);
  scena.add(controluce);

  const gruppo = new THREE.Group();
  scena.add(gruppo);

  const caso = semi(1976);
  const dati = new SVGLoader().parse(SEGNO);
  const pezzi = [];
  const chiaro = new THREE.Color('#F4C870');
  const brunito = new THREE.Color('#B07C26');

  dati.paths.forEach(percorso => {
    SVGLoader.createShapes(percorso).forEach(forma => {
      const geo = new THREE.ExtrudeGeometry(forma, {
        depth: 2.6, bevelEnabled: true, bevelThickness: 0.5, bevelSize: 0.3,
        bevelSegments: 4, curveSegments: mobile ? 18 : 28
      });
      // SVG ha la y verso il basso: ruotare di 180° sull'asse x la raddrizza senza rovesciare le facce
      geo.scale(1, -1, -1);
      geo.computeBoundingBox();
      const c = new THREE.Vector3();
      geo.boundingBox.getCenter(c);
      geo.translate(-c.x, -c.y, -c.z);
      geo.computeVertexNormals();

      // oro chiaro in alto, oro brunito in basso, come nel logo
      const t = THREE.MathUtils.clamp((-c.y - 1.2) / 31.5, 0, 1);
      const materiale = new THREE.MeshPhysicalMaterial({
        color: chiaro.clone().lerp(brunito, t),
        metalness: 1, roughness: 0.3,
        clearcoat: 0.4, clearcoatRoughness: 0.25,
        emissive: new THREE.Color('#ff8a2a'), emissiveIntensity: 0
      });
      const mesh = new THREE.Mesh(geo, materiale);

      const arrivo = new THREE.Vector3(c.x - CENTRO.x, c.y + CENTRO.y, 0);
      const direzione = arrivo.clone().setZ(0);
      if (direzione.lengthSq() < 0.5) direzione.set(caso() - 0.5, caso() - 0.5, 0);
      direzione.normalize();
      const partenza = arrivo.clone()
        .add(direzione.multiplyScalar(26 + caso() * 18))
        .add(new THREE.Vector3((caso() - 0.5) * 14, (caso() - 0.5) * 14, -30 + caso() * 58));
      const giro = new THREE.Quaternion().setFromEuler(new THREE.Euler(
        (caso() - 0.5) * Math.PI * 2.4, (caso() - 0.5) * Math.PI * 2.4, (caso() - 0.5) * Math.PI * 1.6
      ));

      gruppo.add(mesh);
      pezzi.push({ mesh, materiale, arrivo, partenza, giro, distanza: arrivo.length(), ritardo: 0, montato: -1 });
    });
  });

  // prima le barre esterne, poi quelle interne, per ultimi i rombi che le "saldano"
  pezzi.sort((a, b) => b.distanza - a.distanza);
  pezzi.forEach((p, i) => { p.ritardo = i * 0.05; });
  const fine = pezzi[pezzi.length - 1].ritardo + DURATA_PEZZO;
  const identita = new THREE.Quaternion();

  function disponi(P, ora) {
    pezzi.forEach(p => {
      const x = THREE.MathUtils.clamp((P - p.ritardo) / DURATA_PEZZO, 0, 1);
      const e = 1 - Math.pow(1 - x, 4);
      p.mesh.position.lerpVectors(p.partenza, p.arrivo, e);
      p.mesh.quaternion.slerpQuaternions(p.giro, identita, e);
      if (x >= 1 && p.montato < 0) p.montato = ora;
      if (x < 0.98) p.montato = -1;
      p.materiale.emissiveIntensity = p.montato >= 0 ? Math.exp(-(ora - p.montato) * 5) * 1.4 : 0;
    });
  }

  function dimensiona() {
    const w = contenitore.clientWidth;
    const h = contenitore.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  dimensiona();
  new ResizeObserver(() => { dimensiona(); if (ridotto) disegna(performance.now()); }).observe(contenitore);

  let P = ridotto ? fine : 0;
  let visibileDa = -1;
  let ultimo = performance.now();

  function bersaglio(ora) {
    const r = contenitore.getBoundingClientRect();
    const vh = window.innerHeight;
    const daScroll = THREE.MathUtils.clamp((vh * 0.95 - r.top) / (vh * 0.75), 0, 1);
    if (visibileDa < 0) visibileDa = ora;
    const daTempo = THREE.MathUtils.clamp(((ora - visibileDa) / 1000 - 1.4) / 3.2, 0, 1);
    return Math.max(daScroll, daTempo) * fine;
  }

  function disegna(ora) {
    const t = ora / 1000;
    const n = THREE.MathUtils.clamp(P / fine, 0, 1);
    disponi(P, t);
    gruppo.rotation.y = Math.sin(t * 0.45) * 0.42 * n + (1 - n) * 0.9;
    gruppo.rotation.x = -0.1 + Math.sin(t * 0.31) * 0.08;
    luce.position.x = Math.sin(t * 0.5) * 20;
    luce.position.y = 12 + Math.cos(t * 0.37) * 8;
    renderer.render(scena, camera);
  }

  let attivo = false;
  let ciclo = 0;
  function passo() {
    if (!attivo) return;
    const ora = performance.now();
    const dt = Math.min(0.05, (ora - ultimo) / 1000);
    ultimo = ora;
    const obiettivo = bersaglio(ora);
    P += (obiettivo - P) * (1 - Math.exp(-dt * 3.2));
    disegna(ora);
    ciclo = requestAnimationFrame(passo);
  }
  function avviaCiclo() {
    if (attivo || ridotto) return;
    attivo = true;
    ultimo = performance.now();
    ciclo = requestAnimationFrame(passo);
  }
  function fermaCiclo() {
    attivo = false;
    cancelAnimationFrame(ciclo);
  }

  disegna(performance.now());
  contenitore.classList.add('pronta');
  if (ridotto) return;

  let inVista = false;
  new IntersectionObserver(([voce]) => {
    inVista = voce.isIntersecting;
    if (inVista && !document.hidden) avviaCiclo(); else fermaCiclo();
  }, { rootMargin: '100px 0px' }).observe(contenitore);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) fermaCiclo(); else if (inVista) avviaCiclo();
  });
}
