// Il disco del tachigrafo: tempi della storia e disegno della faccia stampata.
// Lo usano script.js (testi e ripiego 2D) e 3d.js (scena three.js).

export const SPAN = Math.PI * 2 * 0.88;          // arco del disco occupato dalla storia
export const THETA0 = -Math.PI / 2 + 0.42;       // dove lo stilo tocca il disco (davanti, a destra)
export const R_ZERO = 0.5;                       // raggio della traccia a 0 km/h
export const R_AMPIEZZA = 0.3;                   // da 0 a 125 km/h
const SOSTA = 0.55;                              // parte di ogni tappa in cui il disco "sta fermo" sull'anno

const liscio = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

export function leggiTappe(ol) {
  return [...ol.querySelectorAll('li')].map((li) => {
    const b = li.querySelector('b');
    const testo = li.innerHTML.replace(/<b>.*?<\/b>\s*/, '');
    return { da: +li.dataset.da, a: +li.dataset.a, etichetta: b ? b.textContent : li.dataset.da, testo };
  });
}

// Velocità "registrata" (0..1) in un tratto di guida tra due tappe
function guida(u, k) {
  const inviluppo = liscio(0, 0.18, u) * (1 - liscio(0.82, 1, u));
  const v = 0.64 + 0.2 * Math.sin(u * 11 + k * 2.1) + 0.1 * Math.sin(u * 29 + k * 5.3) + 0.04 * Math.sin(u * 67 + k);
  return Math.max(0, Math.min(1, inviluppo * v));
}
// Piccole manovre durante la sosta
function sosta(t, k) {
  const c = 0.3 + 0.15 * Math.sin(k * 3.7);
  const x = (t - c) / 0.05;
  return 0.14 * Math.exp(-x * x);
}

// p (0..1, avanzamento nella sezione) → anno mostrato, tappa attiva, velocità
export function statoTimeline(p, tappe) {
  const n = tappe.length;
  const x = Math.min(Math.max(p, 0), 0.999999) * n;
  const k = Math.floor(x);
  const t = x - k;
  const T = tappe[k];
  const N = tappe[k + 1];
  let anno, v;
  if (!N) {
    anno = T.da + (T.a - T.da) * liscio(0, 0.9, t);
    v = 0.55 * guida(Math.min(1, t * 1.05), k);
  } else if (t < SOSTA) {
    anno = T.da + (T.a - T.da) * liscio(0, 1, t / SOSTA);
    v = sosta(t / SOSTA, k);
  } else {
    const u = (t - SOSTA) / (1 - SOSTA);
    anno = T.a + (N.da - T.a) * liscio(0, 1, u);
    v = guida(u, k);
  }
  return { anno, k, t, v };
}

export const angoloDi = (p) => THETA0 - p * SPAN;

function fontStampa(ctx, peso, px) {
  ctx.font = `${peso} ${px}px Archivo, "Arial Black", sans-serif`;
  if ('fontStretch' in ctx) ctx.fontStretch = 'expanded';
}

// Testo lungo l'arco, leggibile guardando dal centro verso l'esterno (parte bassa del disco dritta)
function testoSuArco(ctx, c, R, testo, r, phi, px) {
  ctx.save();
  ctx.translate(c, c);
  ctx.rotate(-Math.PI / 2 - phi);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(testo, 0, r * R);
  ctx.restore();
  return px;
}

function raggio(ctx, c, R, phi, r1, r2) {
  const cs = Math.cos(phi), sn = Math.sin(phi);
  ctx.beginPath();
  ctx.moveTo(c + cs * r1 * R, c - sn * r1 * R);
  ctx.lineTo(c + cs * r2 * R, c - sn * r2 * R);
  ctx.stroke();
}

function cerchio(ctx, c, R, r) {
  ctx.beginPath();
  ctx.arc(c, c, r * R, 0, Math.PI * 2);
  ctx.stroke();
}

// Disegna la faccia del disco su un canvas quadrato di lato S
export function disegnaDisco(canvas, tappe) {
  const S = canvas.width;
  const ctx = canvas.getContext('2d');
  const c = S / 2;
  const R = S / 2 * 0.996;
  const inchiostro = '#262a31';
  const rosso = '#d62718';
  const n = tappe.length;

  ctx.clearRect(0, 0, S, S);
  const carta = ctx.createRadialGradient(c, c, R * 0.1, c, c, R);
  carta.addColorStop(0, '#fbfbf8');
  carta.addColorStop(1, '#efefea');
  ctx.fillStyle = carta;
  ctx.beginPath(); ctx.arc(c, c, R, 0, Math.PI * 2); ctx.fill();

  ctx.strokeStyle = inchiostro;
  ctx.lineCap = 'round';

  // bordi esterni
  ctx.globalAlpha = 0.8; ctx.lineWidth = S * 0.0016; cerchio(ctx, c, R, 0.988);
  ctx.globalAlpha = 0.5; ctx.lineWidth = S * 0.0009; cerchio(ctx, c, R, 0.952);

  // banda velocità: cerchi ogni 20 km/h
  for (let kmh = 0; kmh <= 120; kmh += 20) {
    const r = R_ZERO + R_AMPIEZZA * (kmh / 125);
    ctx.globalAlpha = kmh === 0 ? 0.55 : 0.18;
    ctx.lineWidth = S * (kmh === 0 ? 0.0013 : 0.0008);
    cerchio(ctx, c, R, r);
  }
  ctx.globalAlpha = 0.45; ctx.lineWidth = S * 0.0011; cerchio(ctx, c, R, R_ZERO + R_AMPIEZZA);

  // banda attività e banda distanza
  ctx.globalAlpha = 0.28; ctx.lineWidth = S * 0.0008;
  cerchio(ctx, c, R, 0.842); cerchio(ctx, c, R, 0.888);
  cerchio(ctx, c, R, 0.372); cerchio(ctx, c, R, 0.438);
  ctx.globalAlpha = 0.55; ctx.lineWidth = S * 0.0012; cerchio(ctx, c, R, 0.33);

  // tacche e righe radiali lungo la storia
  const passi = n * 12;
  for (let i = 0; i <= passi; i++) {
    const p = i / passi;
    const phi = angoloDi(p);
    const tappa = i % 12 === 0;
    const media = i % 3 === 0;
    if (tappa) {
      ctx.strokeStyle = rosso; ctx.globalAlpha = 1; ctx.lineWidth = S * 0.0034;
      raggio(ctx, c, R, phi, 0.955, 0.986);
      ctx.strokeStyle = inchiostro; ctx.globalAlpha = 0.32; ctx.lineWidth = S * 0.001;
      raggio(ctx, c, R, phi, R_ZERO, R_ZERO + R_AMPIEZZA);
      raggio(ctx, c, R, phi, 0.842, 0.888);
    } else {
      ctx.strokeStyle = inchiostro;
      ctx.globalAlpha = media ? 0.7 : 0.4;
      ctx.lineWidth = S * (media ? 0.0014 : 0.0009);
      raggio(ctx, c, R, phi, media ? 0.962 : 0.97, 0.986);
      ctx.globalAlpha = media ? 0.13 : 0.07; ctx.lineWidth = S * 0.0007;
      raggio(ctx, c, R, phi, R_ZERO, R_ZERO + R_AMPIEZZA);
    }
  }
  // fine della storia: 2026
  ctx.strokeStyle = inchiostro; ctx.globalAlpha = 0.85; ctx.lineWidth = S * 0.0028;
  raggio(ctx, c, R, angoloDi(1), 0.955, 0.986);

  // anni delle tappe
  ctx.globalAlpha = 1;
  const pxAnno = S * 0.03;
  fontStampa(ctx, 800, pxAnno);
  tappe.forEach((T, k) => {
    ctx.fillStyle = rosso;
    testoSuArco(ctx, c, R, String(T.etichetta), 0.918, angoloDi(k / n), pxAnno);
  });
  ctx.fillStyle = inchiostro;
  fontStampa(ctx, 700, S * 0.026);
  testoSuArco(ctx, c, R, '2026', 0.918, angoloDi(1) + 0.012, pxAnno);

  // spazio libero del disco: scala km/h e luogo
  const phiVuoto = angoloDi(1) - (Math.PI * 2 - SPAN) / 2;
  fontStampa(ctx, 700, S * 0.024);
  ctx.fillStyle = inchiostro; ctx.globalAlpha = 0.85;
  testoSuArco(ctx, c, R, 'VAZZOLA TV', 0.918, phiVuoto, 0);
  fontStampa(ctx, 600, S * 0.019);
  ctx.globalAlpha = 0.6;
  for (let kmh = 20; kmh <= 120; kmh += 20) {
    testoSuArco(ctx, c, R, String(kmh), R_ZERO + R_AMPIEZZA * (kmh / 125), phiVuoto, 0);
  }
  testoSuArco(ctx, c, R, 'km/h', R_ZERO - 0.03, phiVuoto, 0);

  // centro: marchio sopra e sotto il perno
  ctx.globalAlpha = 1; ctx.fillStyle = inchiostro;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  fontStampa(ctx, 900, S * 0.05);
  ctx.fillText('TEZCAR V.I.', c, c - R * 0.19);
  ctx.fillStyle = rosso;
  ctx.fillRect(c - R * 0.17, c - R * 0.145, R * 0.34, S * 0.004);
  ctx.fillStyle = inchiostro;
  fontStampa(ctx, 700, S * 0.026);
  ctx.fillText('DAL 1930', c, c + R * 0.17);
  fontStampa(ctx, 500, S * 0.017);
  ctx.globalAlpha = 0.7;
  ctx.fillText('TEZZE DI VAZZOLA', c, c + R * 0.225);
  ctx.globalAlpha = 1;
}
