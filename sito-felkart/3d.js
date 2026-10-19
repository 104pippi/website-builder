// Il timbro aziendale in 3D: cade sul foglio, preme, lascia l'inchiostro, si rialza.
// Lo guida il tempo (performance.now), lo scroll inclina la camera; il puntatore lo sposta solo su desktop.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const BLU = '#0D2C89';
const INCHIOSTRO = '#2A3FB5';
const FOGLIO_W = 7.6;
const FOGLIO_H = 10.75;
const PX = 1024 / FOGLIO_W;

const limita = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const mix = (a, b, t) => a + (b - a) * t;
const entra = (t) => t * t * t;
const esce = (t) => 1 - Math.pow(1 - t, 3);
const morbido = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const rimbalzo = (t) => { const c = 2.2; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); };

function casuale(seme) {
  let a = seme >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function tela(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return c;
}

async function caricaLogo(colore) {
  const testo = await fetch(new URL('assets/logo/logo.svg', document.baseURI)).then((r) => r.text());
  const svg = testo
    .replace(/fill="#[0-9A-Fa-f]{6}"/, `fill="${colore}"`)
    .replace('<svg ', '<svg width="2097" height="468" ');
  const img = new Image();
  img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  await img.decode();
  return img;
}

async function caricaFont() {
  const pesi = ['500 30px Archivo', '600 40px Archivo', '700 40px Archivo', '800 60px Archivo'];
  await Promise.race([
    Promise.all(pesi.map((p) => document.fonts.load(p))),
    new Promise((r) => setTimeout(r, 2500)),
  ]);
}

/* ---------- Disegni su canvas ---------- */

function disegnaFoglio(logo) {
  const w = 1024, h = 1448;
  const c = tela(w, h);
  const x = c.getContext('2d');
  x.fillStyle = '#FFFFFF';
  x.fillRect(0, 0, w, h);

  const r = casuale(11);
  for (let i = 0; i < 2600; i++) {
    x.strokeStyle = `rgba(40, 50, 80, ${0.01 + r() * 0.025})`;
    x.lineWidth = 0.6 + r() * 0.8;
    const px = r() * w, py = r() * h, a = r() * Math.PI, l = 3 + r() * 9;
    x.beginPath(); x.moveTo(px, py); x.lineTo(px + Math.cos(a) * l, py + Math.sin(a) * l); x.stroke();
  }

  x.drawImage(logo, 72, 76, 300, 300 * 468 / 2097);
  x.textAlign = 'right';
  x.fillStyle = '#5B6275';
  x.font = '500 21px Archivo';
  x.fillText('Felkart S.r.l. – Via Piave, 17', w - 72, 92);
  x.fillText("31030 Caselle d'Altivole (TV)", w - 72, 121);
  x.fillText('Tel. 0423 566091 – info@felkart.it', w - 72, 150);
  x.fillStyle = BLU;
  x.fillRect(72, 190, w - 144, 4);

  x.textAlign = 'left';
  x.fillStyle = '#171B26';
  x.font = '800 56px Archivo';
  x.fillText("Conferma d'ordine", 72, 292);
  x.font = '500 25px Archivo';
  x.fillStyle = '#535A6D';
  x.fillText('Ecco la merce che prepariamo per voi.', 72, 338);

  let y = 410;
  x.font = '700 21px Archivo';
  x.fillStyle = '#535A6D';
  x.fillText('ARTICOLO', 72, y);
  x.textAlign = 'right';
  x.fillText('Q.TÀ', w - 72, y);
  x.textAlign = 'left';
  y += 18;
  x.fillStyle = '#171B26';
  x.fillRect(72, y, w - 144, 2);
  const righe = [
    ['Carta A4 80 g, risma da 500 fogli', '10'],
    ['Toner HP 83A nero', '2'],
    ['Evidenziatori Stabilo Boss gialli', '12'],
    ['Registratori dorso 8 cm', '6'],
    ['Asciugamani piegati a Z', '4'],
  ];
  x.font = '500 30px Archivo';
  for (const [art, q] of righe) {
    y += 56;
    x.fillStyle = '#171B26';
    x.fillText(art, 72, y);
    x.textAlign = 'right';
    x.fillText(q, w - 72, y);
    x.textAlign = 'left';
    y += 22;
    x.fillStyle = '#E1E4EA';
    x.fillRect(72, y, w - 144, 2);
  }
  y += 72;
  x.font = '700 29px Archivo';
  x.fillStyle = BLU;
  x.fillText('Consegna prevista: entro 48 ore', 72, y);

  x.font = '500 22px Archivo';
  x.fillStyle = '#535A6D';
  x.fillText('Timbro e firma', 560, 990);
  x.fillStyle = '#C9CED8';
  x.fillRect(560, 1196, w - 72 - 560, 2);

  x.font = '500 18px Archivo';
  x.fillStyle = '#8A90A0';
  x.fillText('Felkart S.r.l. – P.IVA 01308950268', 72, h - 72);

  // luce che cala verso il fondo del foglio
  const g = x.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, 'rgba(20, 30, 60, 0.07)');
  g.addColorStop(0.5, 'rgba(20, 30, 60, 0)');
  x.fillStyle = g;
  x.fillRect(0, 0, w, h);
  return c;
}

function cornice(x, w, h, r = 30) {
  x.lineWidth = 11;
  x.beginPath(); x.roundRect(12, 12, w - 24, h - 24, r); x.stroke();
  x.lineWidth = 4;
  x.beginPath(); x.roundRect(30, 30, w - 60, h - 60, Math.max(6, r - 16)); x.stroke();
}

function invecchia(c, seme) {
  const x = c.getContext('2d');
  const r = casuale(seme);
  const W = c.width, H = c.height;
  x.save();
  x.globalCompositeOperation = 'destination-out';
  const n = Math.round((W * H) / 260);
  for (let i = 0; i < n; i++) {
    x.globalAlpha = 0.12 + r() * 0.6;
    const s = 0.8 + r() * 2.6;
    x.fillRect(r() * W, r() * H, s, s);
  }
  for (let i = 0; i < 16; i++) {
    x.globalAlpha = 0.2 + r() * 0.35;
    x.fillRect(r() * W, r() * H, 30 + r() * 180, 1.5 + r() * 2.5);
  }
  const g = x.createLinearGradient(0, 0, W, H * 0.6);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(0.55, 'rgba(0,0,0,0.06)');
  g.addColorStop(1, 'rgba(0,0,0,0.4)');
  x.globalAlpha = 1;
  x.fillStyle = g;
  x.fillRect(0, 0, W, H);
  x.restore();
}

const IMPRONTE = {
  azienda: {
    w: 2.75, h: 1.18,
    disegna(x, W, H, logo) {
      cornice(x, W, H);
      x.drawImage(logo, (W - 600) / 2, 96, 600, 600 * 468 / 2097);
      x.font = '600 40px Archivo';
      x.fillText("Via Piave, 17 – 31030 Caselle d'Altivole (TV)", W / 2, 298);
      x.fillText('Tel. 0423 566091 – P.IVA 01308950268', W / 2, 362);
    },
  },
  consegna: {
    w: 2.3, h: 0.94,
    disegna(x, W, H) {
      cornice(x, W, H, 22);
      x.font = '800 86px Archivo';
      x.fillText('PRONTA CONSEGNA', W / 2, 176);
      x.font = '800 150px Archivo';
      x.fillText('24/48 ORE', W / 2, 340);
    },
  },
  articoli: {
    w: 2.4, h: 0.96,
    disegna(x, W, H) {
      cornice(x, W, H, 22);
      x.font = '800 116px Archivo';
      x.fillText('17.000 ARTICOLI', W / 2, 206);
      x.font = '700 72px Archivo';
      x.fillText('A MAGAZZINO', W / 2, 322);
    },
  },
  trasporto: {
    w: 2.6, h: 1.0,
    disegna(x, W, H) {
      cornice(x, W, H, 22);
      x.font = '800 98px Archivo';
      x.fillText('TRASPORTO GRATIS', W / 2, 190);
      x.font = '700 54px Archivo';
      x.fillText('IN VENETO SOPRA 79 € + IVA', W / 2, 300);
    },
  },
  sigillo: {
    w: 1.7, h: 1.7,
    disegna(x, W, H, logo) {
      const cx = W / 2, cy = H / 2;
      x.lineWidth = 16; x.beginPath(); x.arc(cx, cy, W / 2 - 20, 0, Math.PI * 2); x.stroke();
      x.lineWidth = 5; x.beginPath(); x.arc(cx, cy, W / 2 - 52, 0, Math.PI * 2); x.stroke();
      x.lineWidth = 5; x.beginPath(); x.arc(cx, cy, W / 2 - 190, 0, Math.PI * 2); x.stroke();
      const testo = "FELKART S.R.L. • CASELLE D'ALTIVOLE • TREVISO • ";
      x.font = '800 64px Archivo';
      const raggio = W / 2 - 122;
      const passo = (Math.PI * 2) / testo.length;
      for (let i = 0; i < testo.length; i++) {
        x.save();
        x.translate(cx, cy);
        x.rotate(-Math.PI / 2 + i * passo);
        x.translate(raggio, 0);
        x.rotate(Math.PI / 2);
        x.fillText(testo[i], 0, 22);
        x.restore();
      }
      const lato = 300;
      x.drawImage(logo, 1628, 0, 470, 468, cx - lato / 2, cy - lato / 2, lato, lato);
    },
  },
};

function disegnaImpronta(tipo, logo, seme) {
  const d = IMPRONTE[tipo];
  const W = 1100;
  const H = Math.round((W * d.h) / d.w);
  const c = tela(W, H);
  const x = c.getContext('2d');
  x.fillStyle = INCHIOSTRO;
  x.strokeStyle = INCHIOSTRO;
  x.textAlign = 'center';
  d.disegna(x, W, H, logo);
  invecchia(c, seme);
  return c;
}

function disegnaEtichetta(logo) {
  const c = tela(820, 328);
  const x = c.getContext('2d');
  x.fillStyle = '#FFFFFF';
  x.beginPath(); x.roundRect(4, 4, 812, 320, 40); x.fill();
  x.drawImage(logo, 110, (328 - 600 * 468 / 2097) / 2, 600, 600 * 468 / 2097);
  return c;
}

function disegnaLogoFronte(logo) {
  const c = tela(1024, 230);
  c.getContext('2d').drawImage(logo, 12, 0, 1000, 1000 * 468 / 2097);
  return c;
}

function disegnaOmbra(w, h, blur, raggio = 0) {
  const c = tela(w, h);
  const x = c.getContext('2d');
  x.fillStyle = '#000';
  x.fillRect(0, 0, w, h);
  x.shadowColor = '#fff';
  x.shadowBlur = blur;
  x.shadowOffsetX = 2000;
  x.fillStyle = '#fff';
  x.beginPath();
  x.roundRect(blur * 1.2 - 2000, blur * 1.2, w - blur * 2.4, h - blur * 2.4, raggio);
  x.fill();
  return c;
}

/* ---------- Avvio ---------- */

export async function avvia({ canvas, scena, riduci }) {
  if (scena.classList.contains('statico')) return;
  await caricaFont();
  const [logoBlu, logoInchiostro, logoBianco] = await Promise.all([
    caricaLogo(BLU), caricaLogo(INCHIOSTRO), caricaLogo('#FFFFFF'),
  ]);
  if (scena.classList.contains('statico')) return;

  const telefono = matchMedia('(max-width: 959px)').matches || matchMedia('(pointer: coarse)').matches;
  const mouse = matchMedia('(hover: hover) and (pointer: fine)').matches;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, telefono ? 1.5 : 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.setClearColor(0x000000, 0);
  const anisotropia = Math.min(8, renderer.capabilities.getMaxAnisotropy());

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.95;
  pmrem.dispose();

  const luce = new THREE.DirectionalLight(0xffffff, 1.6);
  luce.position.set(-4, 9, 6);
  scene.add(luce);

  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 120);

  const texture = (c, srgb = true) => {
    const t = new THREE.CanvasTexture(c);
    if (srgb) t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = anisotropia;
    return t;
  };

  /* Foglio */
  const foglio = new THREE.Group();
  foglio.rotation.y = -0.07;
  scene.add(foglio);

  const ombraFoglioMat = new THREE.MeshBasicMaterial({ color: 0x000000, alphaMap: texture(disegnaOmbra(256, 352, 26, 6), false), transparent: true, opacity: 0, depthWrite: false });
  const ombraFoglio = new THREE.Mesh(new THREE.PlaneGeometry(FOGLIO_W + 1.6, FOGLIO_H + 1.6), ombraFoglioMat);
  ombraFoglio.rotation.x = -Math.PI / 2;
  ombraFoglio.position.set(0.35, -0.02, 0.45);
  ombraFoglio.renderOrder = 0;
  foglio.add(ombraFoglio);

  const cartaMat = new THREE.MeshBasicMaterial({ map: texture(disegnaFoglio(logoBlu)), toneMapped: false, transparent: true, opacity: 0 });
  const carta = new THREE.Mesh(new THREE.PlaneGeometry(FOGLIO_W, FOGLIO_H), cartaMat);
  carta.rotation.x = -Math.PI / 2;
  carta.renderOrder = 1;
  foglio.add(carta);

  /* Timbro */
  const timbro = new THREE.Group();
  const mobile = new THREE.Group();
  const corpoMat = new THREE.MeshPhysicalMaterial({ color: BLU, roughness: 0.28, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.1 });
  const grafite = new THREE.MeshPhysicalMaterial({ color: 0x1B1E26, roughness: 0.42, clearcoat: 0.55, clearcoatRoughness: 0.3 });
  const metallo = new THREE.MeshStandardMaterial({ color: 0xDCE1E8, metalness: 1, roughness: 0.22 });
  const gommaMat = new THREE.MeshStandardMaterial({ color: 0x1E2650, roughness: 0.9 });

  const gomma = new THREE.Mesh(new THREE.BoxGeometry(2.95, 0.1, 1.36), gommaMat);
  gomma.position.y = 0.05;
  const piede = new THREE.Mesh(new RoundedBoxGeometry(3.3, 0.52, 1.82, 4, 0.14), grafite);
  piede.position.y = 0.36;
  const montante = new RoundedBoxGeometry(0.2, 2.25, 1.0, 3, 0.08);
  const sinistro = new THREE.Mesh(montante, metallo);
  sinistro.position.set(-1.53, 1.745, 0);
  const destro = new THREE.Mesh(montante, metallo);
  destro.position.set(1.53, 1.745, 0);

  const corpo = new THREE.Mesh(new RoundedBoxGeometry(2.8, 1.45, 1.6, 5, 0.34), corpoMat);
  corpo.position.y = 1.5;
  const collo = new THREE.Mesh(new RoundedBoxGeometry(2.1, 0.34, 1.15, 3, 0.1), grafite);
  collo.position.y = 2.33;
  const presa = new THREE.Mesh(new RoundedBoxGeometry(2.7, 0.62, 1.45, 5, 0.28), grafite);
  presa.position.y = 2.78;
  const etichetta = new THREE.Mesh(new THREE.PlaneGeometry(2.05, 0.82), new THREE.MeshBasicMaterial({ map: texture(disegnaEtichetta(logoBlu)), toneMapped: false }));
  etichetta.rotation.x = -Math.PI / 2;
  etichetta.position.y = 3.094;
  const logoFronte = new THREE.Mesh(new THREE.PlaneGeometry(2.0, 0.449), new THREE.MeshBasicMaterial({ map: texture(disegnaLogoFronte(logoBianco)), transparent: true, toneMapped: false }));
  logoFronte.position.set(0, 1.5, 0.802);
  logoFronte.renderOrder = 4;
  mobile.add(corpo, collo, presa, etichetta, logoFronte);
  timbro.add(gomma, piede, sinistro, destro, mobile);
  scene.add(timbro);

  const ombraTimbroMat = new THREE.MeshBasicMaterial({ color: 0x000000, alphaMap: texture(disegnaOmbra(256, 168, 30, 30), false), transparent: true, opacity: 0, depthWrite: false });
  const ombraTimbro = new THREE.Mesh(new THREE.PlaneGeometry(4.6, 3.0), ombraTimbroMat);
  ombraTimbro.rotation.x = -Math.PI / 2;
  ombraTimbro.renderOrder = 3;
  const ombraPerno = new THREE.Group();
  ombraPerno.add(ombraTimbro);
  scene.add(ombraPerno);

  /* Impronte */
  const cacheTex = {};
  const impronte = [];
  let semi = 3;
  function aggiungiImpronta(tipo, lx, lz, rot, subito = false) {
    if (!cacheTex[tipo]) cacheTex[tipo] = texture(disegnaImpronta(tipo, logoInchiostro, semi++ * 7));
    const d = IMPRONTE[tipo];
    const mat = new THREE.MeshBasicMaterial({ map: cacheTex[tipo], transparent: true, opacity: subito ? 0.94 : 0, depthWrite: false, toneMapped: false });
    const m = new THREE.Mesh(new THREE.PlaneGeometry(d.w, d.h), mat);
    m.rotation.x = -Math.PI / 2;
    m.renderOrder = 2;
    const perno = new THREE.Group();
    perno.position.set(lx, 0.004, lz);
    perno.rotation.y = rot;
    perno.add(m);
    foglio.add(perno);
    const voce = { perno, mat, nata: performance.now() / 1000, subito };
    impronte.push(voce);
    if (impronte.length > 8) {
      const vecchia = impronte.shift();
      foglio.remove(vecchia.perno);
      vecchia.perno.children[0].geometry.dispose();
      vecchia.mat.dispose();
    }
    return voce;
  }

  /* Coordinate: dal pixel del foglio al mondo */
  const daPixel = (px, py) => [px / PX - FOGLIO_W / 2, py / PX - FOGLIO_H / 2];
  const [ax, az] = daPixel(735, 1094);
  const [cx, cz] = daPixel(292, 1058);
  const lavoriIniziali = [
    { tipo: 'azienda', lx: ax, lz: az, rot: 0.02, intro: true },
    { tipo: 'consegna', lx: cx, lz: cz, rot: -0.17 },
  ];
  const sequenza = ['articoli', 'trasporto', 'sigillo', 'azienda', 'consegna'];
  let prossimo = 0;

  /* Stato del timbro */
  const pos = new THREE.Vector3(2, 7.5, -4);
  let rotY = -0.07, incX = 0, incZ = 0, schiaccia = 0;
  const riposoBase = new THREE.Vector3(2.2, 2.2, -0.6);
  const ancora = riposoBase.clone();
  let mira = null;
  const coda = [];
  let lavoro = null;
  let fineLavoro = 0;
  let introFinita = false;
  let scossa = 0, scossaT = 0;
  let scroll = 0;

  const inMondo = (lx, lz) => { foglio.updateMatrixWorld(true); return foglio.localToWorld(new THREE.Vector3(lx, 0, lz)); };
  let rotRiposo = -0.07;

  function iniziaLavoro(l, t) {
    const bersaglio = inMondo(l.lx, l.lz);
    lavoro = {
      ...l, t0: t, bersaglio,
      da: pos.clone(), rotDa: rotY, rotA: foglio.rotation.y + l.rot,
      incDa: incX, impronta: null,
      A: l.intro ? 0.72 : 0.5, D: l.intro ? 0 : 0.16, P: 0.13, R: 0.26, L: 0.6,
    };
    if (l.intro) lavoro.da.set(bersaglio.x + 0.4, 7.5, bersaglio.z - 6.5);
  }

  function aggiornaLavoro(t) {
    const l = lavoro;
    const tau = t - l.t0;
    l.bersaglio = inMondo(l.lx, l.lz);
    l.rotA = foglio.rotation.y + l.rot;
    const sopra = l.bersaglio.clone().add(new THREE.Vector3(0, 1.2, 0));
    const t1 = l.A, t2 = t1 + l.D, t3 = t2 + l.P, t4 = t3 + l.R, t5 = t4 + l.L;
    if (tau >= t2 && !l.impronta) {
      l.impronta = aggiungiImpronta(l.tipo, l.lx, l.lz, l.rot);
      scossa = l.intro ? 1 : 0.6; scossaT = t;
    }
    if (tau < t1) {
      const u = tau / l.A;
      if (l.intro) {
        const k = entra(u);
        pos.lerpVectors(l.da, l.bersaglio, k);
        rotY = mix(l.rotDa - 0.5, l.rotA, esce(u));
        incX = mix(0.55, 0, esce(u));
        incZ = mix(-0.35, 0, esce(u));
      } else {
        const k = morbido(u);
        pos.lerpVectors(l.da, sopra, k);
        pos.y += Math.sin(Math.PI * k) * 0.5;
        rotY = mix(l.rotDa, l.rotA, k);
        incX = mix(l.incDa, 0, k);
        incZ = mix(incZ, 0, k);
      }
      schiaccia = 0;
    } else if (tau < t2) {
      const u = (tau - t1) / l.D;
      pos.lerpVectors(sopra, l.bersaglio, entra(u));
      rotY = l.rotA; incX = 0; incZ = 0;
    } else if (tau < t3) {
      const u = (tau - t2) / l.P;
      pos.copy(l.bersaglio);
      rotY = l.rotA; incX = 0; incZ = 0;
      schiaccia = esce(u) * 0.42;
    } else if (tau < t4) {
      const u = (tau - t3) / l.R;
      pos.copy(l.bersaglio);
      schiaccia = 0.42 * (1 - rimbalzo(u));
    } else if (tau < t5) {
      const u = (tau - t4) / l.L;
      const k = morbido(u);
      const verso = coda.length ? sopra.clone().add(new THREE.Vector3(0, 0.6, 0)) : ancora;
      pos.lerpVectors(l.bersaglio, verso, k);
      schiaccia = 0;
      incX = mix(0, 0.1, k) - 0.45 * Math.sin(Math.PI * u);
      incZ = 0.12 * Math.sin(Math.PI * u);
      rotY = l.rotA;
    } else {
      lavoro = null;
      fineLavoro = t;
      rotRiposo = l.rotA;
      if (coda.length) iniziaLavoro(coda.shift(), t);
      else if (!introFinita) {
        introFinita = true;
        const s = scena.querySelector('[data-suggerimento]');
        if (s) s.hidden = false;
      }
    }
  }

  function aggiornaRiposo(t, dt) {
    const meta = mira ? new THREE.Vector3(mira.x, 2.2, mira.z) : riposoBase;
    ancora.lerp(meta, 1 - Math.exp(-dt * 3.5));
    const s = t - fineLavoro;
    pos.copy(ancora);
    pos.y += Math.sin(s * 1.6) * 0.09 + scroll * 1.4;
    rotY = rotRiposo + Math.sin(s * 0.55) * 0.28;
    incX = 0.1 + Math.sin(s * 1.1) * 0.05;
    incZ = Math.sin(s * 0.8) * 0.05;
  }

  /* Camera e inquadratura */
  const guarda = new THREE.Vector3(0.15, 0, 0.55);
  let distanza = 16, elevazione = 55, sposta = 0.06;
  function inquadra() {
    const w = Math.max(1, scena.clientWidth), h = Math.max(1, scena.clientHeight);
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    const t = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    // telefono: camera più bassa e puntata sulle impronte; desktop: foglio intero con un po' d'aria
    const stretto = w < 700;
    const largo = stretto ? 7.3 : 9.6;
    const alto = stretto ? 8 : 7.6;
    distanza = Math.max((alto * 0.5) / t, (largo * 0.5) / (t * camera.aspect));
    guarda.z = camera.aspect > 1.15 ? 0.95 : stretto ? 1.1 : 0.7;
    elevazione = stretto ? 50 : 55;
    sposta = stretto ? 0.08 : 0.06;
    if (stretto) riposoBase.set(1.7, 1.35, 1.25); else riposoBase.set(2.1, 1.9, -0.1);
    camera.updateProjectionMatrix();
  }
  function posizionaCamera(t) {
    const elev = THREE.MathUtils.degToRad(elevazione + scroll * 16);
    const s = scossa * Math.exp(-(t - scossaT) * 13);
    camera.position.set(
      guarda.x + distanza * sposta + Math.sin(t * 71) * 0.05 * s,
      guarda.y + Math.sin(elev) * distanza + Math.cos(t * 53) * 0.04 * s,
      guarda.z + Math.cos(elev) * distanza,
    );
    camera.lookAt(guarda.x, guarda.y - 0.05 * s, guarda.z);
  }

  function applicaTimbro() {
    timbro.position.copy(pos);
    timbro.rotation.set(incX, rotY, incZ, 'YXZ');
    mobile.position.y = -schiaccia;
    const alt = Math.max(0, pos.y);
    ombraPerno.position.set(pos.x + alt * 0.12, 0.006, pos.z + alt * 0.1);
    ombraPerno.rotation.y = rotY;
    const sc = 1 + alt * 0.16;
    ombraTimbro.scale.set(sc, sc, 1);
    ombraTimbroMat.opacity = limita(0.62 - alt * 0.1, 0.06, 0.62) * cartaMat.opacity;
  }

  /* Ciclo */
  let t0 = -1;
  let ultimo = performance.now() / 1000;
  let visibile = true;
  let rafId = 0;
  let primoFotogramma = null;
  const pronto = new Promise((r) => { primoFotogramma = r; });

  function passo(t, dt) {
    if (t0 < 0) t0 = t;
    const tp = t - t0;
    // il foglio viene appoggiato sul sottomano
    const kf = esce(limita(tp / 0.8));
    foglio.position.z = mix(2.6, 0, kf);
    foglio.position.x = mix(-0.6, 0, kf);
    foglio.rotation.y = mix(-0.3, -0.07, kf);
    cartaMat.opacity = limita(tp / 0.35);
    ombraFoglioMat.opacity = 0.42 * kf;
    if (kf >= 1 && cartaMat.transparent) { cartaMat.transparent = false; cartaMat.needsUpdate = true; }

    if (!lavoro && lavoriIniziali.length && tp > 0.38) {
      coda.push(...lavoriIniziali.splice(0));
      iniziaLavoro(coda.shift(), t);
    }
    if (lavoro) aggiornaLavoro(t);
    else if (tp > 0.38) aggiornaRiposo(t, dt);

    for (const v of impronte) {
      if (v.subito) continue;
      const u = limita((t - v.nata) / 0.16);
      v.mat.opacity = 0.94 * esce(u);
      const s = mix(1.035, 1, esce(u));
      v.perno.scale.set(s, 1, s);
    }
    scene.environmentRotation.y = Math.sin(t * 0.35) * 0.9;
    luce.position.x = Math.sin(t * 0.5) * 6;

    applicaTimbro();
    posizionaCamera(t);
    renderer.render(scene, camera);
  }

  function giro() {
    rafId = 0;
    if (!visibile || document.hidden) return;
    rafId = requestAnimationFrame(giro);
    const t = performance.now() / 1000;
    const dt = Math.min(0.05, Math.max(0, t - ultimo));
    ultimo = t;
    passo(t, dt);
    if (primoFotogramma) { scena.classList.add('tre-d'); primoFotogramma(); primoFotogramma = null; }
  }
  const riparti = () => { if (!rafId && visibile && !document.hidden) { ultimo = performance.now() / 1000; rafId = requestAnimationFrame(giro); } };

  function disegnaFermo() {
    // movimento ridotto: tutto già al suo posto, nessun ciclo
    foglio.position.set(0, 0, 0);
    cartaMat.opacity = 1; cartaMat.transparent = false;
    ombraFoglioMat.opacity = 0.42;
    pos.copy(riposoBase); incX = 0.1; rotY = -0.07;
    applicaTimbro();
    posizionaCamera(0);
    renderer.render(scene, camera);
  }

  inquadra();
  if (riduci) {
    for (const l of lavoriIniziali) aggiungiImpronta(l.tipo, l.lx, l.lz, l.rot, true);
    lavoriIniziali.length = 0;
    disegnaFermo();
    scena.classList.add('tre-d');
    primoFotogramma();
  }

  /* Scroll, visibilità, ridimensionamento */
  const leggiScroll = () => {
    const r = scena.getBoundingClientRect();
    scroll = limita(-r.top / Math.max(1, r.height));
  };
  addEventListener('scroll', leggiScroll, { passive: true });
  leggiScroll();
  new IntersectionObserver(([v]) => { visibile = v.isIntersecting; if (!riduci) riparti(); }).observe(scena);
  document.addEventListener('visibilitychange', () => { if (!riduci) riparti(); });
  new ResizeObserver(() => { inquadra(); if (riduci) disegnaFermo(); }).observe(scena);

  /* Tocco e puntatore */
  const raggio = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  function suFoglio(e) {
    const r = canvas.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    raggio.setFromCamera(ndc, camera);
    const hit = raggio.intersectObject(carta, false)[0];
    if (!hit) return null;
    const locale = foglio.worldToLocal(hit.point.clone());
    return {
      lx: limita(locale.x, -FOGLIO_W / 2 + 1.45, FOGLIO_W / 2 - 1.45),
      lz: limita(locale.z, -FOGLIO_H / 2 + 0.9, FOGLIO_H / 2 - 0.7),
      mondo: hit.point,
    };
  }
  canvas.addEventListener('click', (e) => {
    const p = suFoglio(e);
    if (!p) return;
    const tipo = sequenza[prossimo++ % sequenza.length];
    const rot = (Math.random() - 0.5) * 0.3;
    const s = scena.querySelector('[data-suggerimento]');
    if (s) s.hidden = true;
    if (riduci) {
      aggiungiImpronta(tipo, p.lx, p.lz, rot, true);
      disegnaFermo();
      return;
    }
    const l = { tipo, lx: p.lx, lz: p.lz, rot };
    if (lavoro || !introFinita) { if (coda.length < 2) coda.push(l); }
    else iniziaLavoro(l, performance.now() / 1000);
    riparti();
  });
  if (mouse && !riduci) {
    canvas.addEventListener('pointermove', (e) => {
      const p = suFoglio(e);
      mira = p ? p.mondo : null;
    });
    canvas.addEventListener('pointerleave', () => { mira = null; });
  }

  if (!riduci) riparti();
  return pronto;
}
