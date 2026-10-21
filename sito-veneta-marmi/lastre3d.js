/* Sfoglia le lastre: lastre vere incernierate come le pagine di un libro, girate dallo scroll */
import * as THREE from 'three';

const W = 3.0, H = 1.8, SP = 0.034, PASSO = 0.075;

// studio fotografico per i riflessi: stanza scura con strisce di luce, come si fotografano le lastre lucide
function studio() {
  const s = new THREE.Scene();
  s.add(new THREE.Mesh(new THREE.BoxGeometry(30, 14, 30), new THREE.MeshBasicMaterial({ color: 0x323b40, side: THREE.BackSide })));
  const pannello = (w, h, forza, x, y, z) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color().setScalar(forza), side: THREE.DoubleSide }));
    m.position.set(x, y, z); m.lookAt(0, 0, 0); s.add(m);
  };
  pannello(0.7, 10, 9, -3.6, 0.5, 9.3);
  pannello(0.35, 10, 6, -6.5, 0.5, 7.5);
  pannello(0.8, 8, 6, 7.5, 1.5, 6);
  pannello(14, 3.5, 2.4, 0, 6.8, 1);
  pannello(8, 4, 1.1, -2, 0, -12);
  return s;
}

export async function avvia({ canvas, sezione, pista }) {
  const VM = window.VM;
  const mobile = matchMedia('(max-width: 959px)').matches;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, mobile ? 1.5 : 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.setClearColor(0x000000, 0);

  const scena = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scena.environment = pmrem.fromScene(studio(), 0.02).texture;
  scena.environmentIntensity = 1.0;

  const camera = new THREE.PerspectiveCamera(mobile ? 34 : 30, 1, 0.1, 80);

  const luce = new THREE.DirectionalLight(0xffffff, 1.6);
  luce.position.set(4, 5, 6);
  scena.add(luce);
  scena.add(new THREE.HemisphereLight(0xe8eef0, 0x30383c, 0.9));
  const controluce = new THREE.DirectionalLight(0xbfd2e0, 0.5);
  controluce.position.set(-6, 2, -4);
  scena.add(controluce);

  // texture vere delle lastre
  const loader = new THREE.TextureLoader();
  const carica = (url) => new Promise((ok, ko) => loader.load(url, ok, undefined, ko));
  const maxAniso = renderer.capabilities.getMaxAnisotropy();
  const [retro, ...tex] = await Promise.all([
    carica('assets/img/lastre/retro.jpg'),
    ...VM.LASTRE.map(([id]) => carica(`assets/img/lastre/${id}.jpg`)),
  ]);
  [retro, ...tex].forEach((t) => { t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = Math.min(8, maxAniso); });

  // colore medio di ogni texture, per i bordi della lastra
  const tela = document.createElement('canvas'); tela.width = tela.height = 1;
  const ctx = tela.getContext('2d', { willReadFrequently: true });
  const medio = (t) => { ctx.drawImage(t.image, 0, 0, 1, 1); const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data; return new THREE.Color(`rgb(${r},${g},${b})`); };

  const geo = new THREE.BoxGeometry(W, H, SP);
  geo.translate(-W / 2, 0, 0); // cerniera sul bordo destro, dalla parte della camera
  const matRetro = new THREE.MeshStandardMaterial({ map: retro, color: 0x9a9e9b, roughness: 0.92, metalness: 0 });

  const libro = new THREE.Group();
  scena.add(libro);
  const n = tex.length;
  const lastre = tex.map((t, i) => {
    const fronte = new THREE.MeshPhysicalMaterial({
      map: t, roughness: 0.38, metalness: 0, specularIntensity: 0.3, clearcoat: 1, clearcoatRoughness: 0.0,
    });
    const bordo = new THREE.MeshStandardMaterial({ color: medio(t).multiplyScalar(1.05), roughness: 0.42 });
    const m = new THREE.Mesh(geo, [bordo, bordo, bordo, bordo, fronte, matRetro]);
    const g = new THREE.Group();
    g.position.set(W / 2, 0, -i * PASSO);
    g.add(m);
    libro.add(g);
    return g;
  });

  // palo della cerniera e morsetti
  const metallo = new THREE.MeshStandardMaterial({ color: 0x2a2f33, metalness: 0.85, roughness: 0.35 });
  const palo = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, H + 0.5, 20), metallo);
  palo.position.set(W / 2 + 0.035, 0.06, -((n - 1) * PASSO) / 2);
  libro.add(palo);
  const base = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.05, (n - 1) * PASSO + 0.34), metallo);
  base.position.set(W / 2 + 0.035, -H / 2 - 0.19, -((n - 1) * PASSO) / 2);
  libro.add(base);

  // ombra morbida sul pavimento, disegnata su una tela
  const tOmbra = (() => {
    const c = document.createElement('canvas'); c.width = 256; c.height = 128;
    const x = c.getContext('2d');
    const gr = x.createRadialGradient(128, 64, 4, 128, 64, 124);
    gr.addColorStop(0, 'rgba(6,9,11,0.62)'); gr.addColorStop(0.55, 'rgba(6,9,11,0.22)'); gr.addColorStop(1, 'rgba(6,9,11,0)');
    x.fillStyle = gr; x.fillRect(0, 0, 256, 128);
    return new THREE.CanvasTexture(c);
  })();
  const ombra = new THREE.Mesh(new THREE.PlaneGeometry(W * 2.3, 1.6), new THREE.MeshBasicMaterial({ map: tOmbra, transparent: true, depthWrite: false }));
  ombra.rotation.x = -Math.PI / 2;
  ombra.position.set(0, -H / 2 - 0.215, -0.25);
  libro.add(ombra);

  // inquadratura che si adatta allo schermo
  let larg = 1, alt = 1, dist = 10, spostaX = 0;
  function misura() {
    larg = canvas.clientWidth || innerWidth; alt = canvas.clientHeight || innerHeight;
    renderer.setSize(larg, alt, false);
    camera.aspect = larg / alt;
    const fov = THREE.MathUtils.degToRad(camera.fov);
    const quota = mobile ? 0.86 : 0.4; // quanta larghezza occupa la lastra
    const dW = (W / quota) / 2 / (Math.tan(fov / 2) * camera.aspect);
    const dH = (H / (mobile ? 0.36 : 0.46)) / 2 / Math.tan(fov / 2);
    dist = Math.max(dW, dH);
    // su desktop l'inquadratura scivola a destra, lontano dal testo
    if (mobile) camera.clearViewOffset(); else camera.setViewOffset(larg, alt, -larg * 0.19, 0, larg, alt);
    camera.updateProjectionMatrix();
  }
  misura();
  addEventListener('resize', misura);

  const ease = (u) => (u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2);
  const fermo = (i) => THREE.MathUtils.degToRad(3 - 1.4 * i);    // ventaglio delle lastre ancora da girare
  const girata = (i) => THREE.MathUtils.degToRad(168 - 2.2 * i);  // pila delle lastre girate: l'ultima sta sopra

  function posa(tempo) {
    const f = VM.sfogliaF || 0;
    lastre.forEach((g, i) => {
      const u = ease(THREE.MathUtils.clamp(f - i, 0, 1));
      g.rotation.y = THREE.MathUtils.lerp(fermo(i), girata(i), u);
      // la lastra che gira si stacca un poco dalla pila, poi si riappoggia
      g.position.z = THREE.MathUtils.lerp(-i * PASSO, 0.03 + i * 0.012, u) + Math.sin(Math.PI * u) * 0.18;
    });
    const respiro = Math.sin(tempo * 0.00035);
    const yCam = mobile ? 0.55 : 0.75;
    camera.position.set(spostaX + dist * 0.36 + respiro * 0.12, yCam + respiro * 0.05, dist * 0.94);
    camera.lookAt(spostaX + 0.15, -0.05, -0.2);
    // i pannelli dello studio scorrono piano sul lucido, e di più mentre una lastra gira
    scena.environmentRotation.y = 0.16 * Math.sin(tempo * 0.00042) + 0.1 * Math.sin(f * Math.PI);
    renderer.render(scena, camera);
  }

  await renderer.compileAsync(scena, camera);
  let attivo = true;
  new IntersectionObserver(([e]) => { attivo = e.isIntersecting; }, { rootMargin: '10% 0px' }).observe(pista);
  function ciclo(t) {
    if (attivo && !document.hidden) posa(t);
    requestAnimationFrame(ciclo);
  }
  posa(performance.now());
  sezione.classList.add('pronta');
  requestAnimationFrame(ciclo);
  window.__fotogramma = () => posa(performance.now());
}
