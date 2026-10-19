// I sei fogli del vassoio: ognuno è la carta che quel servizio produce. Disegnati su canvas, senza librerie.
const INK = '#1d2127';
const GRIGIO = '#8a919c';
const RIGA = '#cdd2d9';
const BLU = '#1f4fa8';
const PENNA = '#2446a8';
const FONT = '"Archivo", system-ui, sans-serif';
const MONO = 'ui-monospace, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace';

export const A4 = { w: 1024, h: 1448 };

function caso(seme) {
  let a = seme >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

let grana;
function trama() {
  if (grana) return grana;
  grana = document.createElement('canvas');
  grana.width = grana.height = 160;
  const g = grana.getContext('2d');
  const img = g.createImageData(160, 160);
  const r = caso(7);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = 120 + r() * 40;
    img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
    img.data[i + 3] = r() * 26;
  }
  g.putImageData(img, 0, 0);
  return grana;
}

function foglio(w, h, tinta = '#f8f8f5') {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const x = c.getContext('2d');
  x.fillStyle = tinta;
  x.fillRect(0, 0, w, h);
  x.fillStyle = x.createPattern(trama(), 'repeat');
  x.fillRect(0, 0, w, h);
  const v = x.createRadialGradient(w / 2, h / 2, h * 0.3, w / 2, h / 2, h * 0.8);
  v.addColorStop(0, 'rgba(0,0,0,0)');
  v.addColorStop(1, 'rgba(60,64,72,0.07)');
  x.fillStyle = v;
  x.fillRect(0, 0, w, h);
  x.textBaseline = 'alphabetic';
  return [c, x];
}

function righe(x, x0, y0, larg, n, passo, spessore, seme, colore = '#c3c8cf') {
  const r = caso(seme);
  x.fillStyle = colore;
  for (let i = 0; i < n; i++) {
    const ultima = i === n - 1 || r() < 0.12;
    const w = larg * (ultima ? 0.35 + r() * 0.3 : 0.82 + r() * 0.18);
    x.beginPath();
    x.roundRect(x0, y0 + i * passo, w, spessore, spessore / 2);
    x.fill();
  }
}

function copri(x, img, dx, dy, dw, dh) {
  const s = Math.max(dw / img.naturalWidth, dh / img.naturalHeight);
  const sw = dw / s, sh = dh / s;
  x.drawImage(img, (img.naturalWidth - sw) / 2, (img.naturalHeight - sh) * 0.35, sw, sh, dx, dy, dw, dh);
}

function segniTaglio(x, w, h, m) {
  x.strokeStyle = '#30343b'; x.lineWidth = 2;
  const l = 34;
  for (const [cx, cy, sx, sy] of [[m, m, -1, -1], [w - m, m, 1, -1], [m, h - m, -1, 1], [w - m, h - m, 1, 1]]) {
    x.beginPath();
    x.moveTo(cx, cy + sy * 8); x.lineTo(cx, cy + sy * (8 + l));
    x.moveTo(cx + sx * 8, cy); x.lineTo(cx + sx * (8 + l), cy);
    x.stroke();
  }
}

function mirino(x, cx, cy, r) {
  x.strokeStyle = INK; x.lineWidth = 2;
  x.beginPath(); x.arc(cx, cy, r, 0, Math.PI * 2); x.stroke();
  x.beginPath(); x.arc(cx, cy, r * 0.5, 0, Math.PI * 2); x.stroke();
  x.beginPath(); x.moveTo(cx - r * 1.5, cy); x.lineTo(cx + r * 1.5, cy); x.moveTo(cx, cy - r * 1.5); x.lineTo(cx, cy + r * 1.5); x.stroke();
}

function spunta(x, cx, cy, s, colore = PENNA) {
  x.strokeStyle = colore; x.lineWidth = s * 0.16; x.lineCap = 'round'; x.lineJoin = 'round';
  x.beginPath(); x.moveTo(cx - s * 0.32, cy); x.lineTo(cx - s * 0.06, cy + s * 0.28); x.lineTo(cx + s * 0.42, cy - s * 0.34); x.stroke();
}

function casella(x, cx, cy, s, piena) {
  x.strokeStyle = INK; x.lineWidth = 2.2;
  x.strokeRect(cx, cy - s, s, s);
  if (piena) spunta(x, cx + s / 2, cy - s / 2, s * 1.1);
}

function scarabocchio(x, x0, y, w, seme, alto = 16) {
  const r = caso(seme);
  x.strokeStyle = PENNA; x.lineWidth = 3; x.lineCap = 'round'; x.lineJoin = 'round';
  x.beginPath();
  let px = x0, py = y;
  x.moveTo(px, py);
  while (px < x0 + w) {
    const passo = 9 + r() * 12;
    const a = alto * (0.4 + r() * 0.9);
    x.bezierCurveTo(px + passo * 0.3, py - a, px + passo * 0.7, py - a, px + passo, py + (r() - 0.5) * 4);
    px += passo;
    if (r() < 0.12) { px += 14 + r() * 10; x.moveTo(px, y); }
  }
  x.stroke();
}

function firma(x, x0, y, w, seme) {
  const r = caso(seme);
  x.strokeStyle = PENNA; x.lineWidth = 3.4; x.lineCap = 'round';
  x.beginPath();
  x.moveTo(x0, y);
  for (let i = 0; i < 7; i++) {
    const px = x0 + (i + 1) * w / 7;
    x.bezierCurveTo(px - w / 9, y - 50 * r(), px - w / 20, y + 34 * r(), px, y - 10 + 20 * r());
  }
  x.stroke();
  x.beginPath(); x.moveTo(x0 + w * 0.1, y + 16); x.quadraticCurveTo(x0 + w * 0.5, y + 4, x0 + w * 0.95, y + 12); x.stroke();
}

// 1. Copia, stampa e scansione: una prova colore con la vetrina vera
function stampa(foto) {
  const { w, h } = A4;
  const [c, x] = foglio(w, h);
  segniTaglio(x, w, h, 28);
  x.fillStyle = GRIGIO; x.font = `500 24px ${FONT}`;
  x.fillText('Prova di stampa a colori', 80, 96);
  x.textAlign = 'right'; x.fillText('A4', w - 80, 96); x.textAlign = 'left';
  if (foto) copri(x, foto, 80, 124, w - 160, 560);
  else { x.fillStyle = '#9aa3ad'; x.fillRect(80, 124, w - 160, 560); }
  x.fillStyle = INK; x.font = `800 74px ${FONT}`;
  x.fillText('Borgo Treviso 122', 80, 790);
  x.fillStyle = '#4a515c'; x.font = `500 36px ${FONT}`;
  x.fillText('Castelfranco Veneto', 80, 846);
  righe(x, 80, 906, 404, 9, 34, 13, 11);
  righe(x, 540, 906, 404, 9, 34, 13, 23);
  const colori = ['#00a3e0', '#e6007e', '#ffe600', '#1d1d1b'];
  const y = 1252, s = 62;
  colori.forEach((col, i) => {
    x.fillStyle = col; x.fillRect(150 + i * (s + 8), y, s, s);
    x.globalAlpha = 0.5; x.fillRect(150 + i * (s + 8), y + s + 8, s, s * 0.5); x.globalAlpha = 1;
  });
  for (let i = 0; i < 10; i++) {
    const v = Math.round(255 - i * 25.5);
    x.fillStyle = `rgb(${v},${v},${v})`;
    x.fillRect(456 + i * 42, y, 42, s);
  }
  x.strokeStyle = '#30343b'; x.lineWidth = 1.5; x.strokeRect(456, y, 420, s);
  mirino(x, 90, y + 40, 22);
  mirino(x, w - 90, y + 40, 22);
  return c;
}

// 2. Registratori telematici: lo scontrino, con il bordo strappato
function scontrino() {
  const w = 440, h = 1448;
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const x = c.getContext('2d');
  x.beginPath();
  x.moveTo(0, 0); x.lineTo(w, 0); x.lineTo(w, h - 22);
  const denti = 22;
  for (let i = denti; i >= 0; i--) x.lineTo((w / denti) * i, h - 22 + (i % 2 ? 18 : 0));
  x.closePath();
  x.fillStyle = '#fbfbf8'; x.fill();
  x.save(); x.clip();
  x.fillStyle = x.createPattern(trama(), 'repeat'); x.fillRect(0, 0, w, h);
  x.restore();

  const ink = '#2b303a';
  x.fillStyle = ink;
  let y = 110;
  const centro = (t, f = `600 22px ${MONO}`, salto = 34) => { x.font = f; x.textAlign = 'center'; x.fillText(t, w / 2, y); y += salto; };
  const coppia = (a, b, f = `500 21px ${MONO}`) => { x.font = f; x.textAlign = 'left'; x.fillText(a, 34, y); x.textAlign = 'right'; x.fillText(b, w - 34, y); y += 36; };
  const tratteggio = () => { x.textAlign = 'center'; x.font = `500 21px ${MONO}`; x.fillText('- - - - - - - - - - - - - -', w / 2, y); y += 40; };

  centro('DRIGO & BERGAMIN SRL', `800 27px ${MONO}`, 40);
  centro('Borgo Treviso 122', undefined, 32);
  centro('31033 Castelfranco V.to', undefined, 32);
  centro('P.IVA 03198830261', undefined, 46);
  tratteggio();
  centro('DOCUMENTO COMMERCIALE', `800 22px ${MONO}`, 32);
  centro('di vendita o prestazione', `500 20px ${MONO}`, 46);
  tratteggio();
  coppia('Registratore telem.', '1');
  coppia('Cassa touch Wycash', '1');
  coppia('Lettore barcode', '1');
  coppia('Contabanconote', '1');
  coppia('Assist. tecnica', 'SI');
  coppia('Assist. fiscale', 'SI');
  y += 6;
  tratteggio();
  coppia('TOTALE', '1 FORNITORE', `800 25px ${MONO}`);
  y += 8;
  tratteggio();
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  coppia(`${p(d.getDate())}-${p(d.getMonth() + 1)}-${d.getFullYear()}`, '08:30');
  coppia('DOC. N.', '0001-0122');
  y += 24;
  const r = caso(122);
  let bx = 54;
  while (bx < w - 54) {
    const bw = 2 + Math.floor(r() * 4);
    if (r() > 0.35) x.fillRect(bx, y, bw, 92);
    bx += bw + 2 + Math.floor(r() * 3);
  }
  y += 150;
  centro('Grazie e a presto!', `700 23px ${MONO}`);
  return c;
}

// 3. Computer e software: una tavola CAD con la pianta di un ufficio
function cad() {
  const { w, h } = A4;
  const [c, x] = foglio(w, h, '#f8f9fa');
  x.fillStyle = 'rgba(31,79,168,0.12)';
  for (let gx = 70; gx < w - 60; gx += 32) for (let gy = 70; gy < h - 60; gy += 32) x.fillRect(gx, gy, 2, 2);
  x.strokeStyle = INK; x.lineWidth = 2; x.strokeRect(48, 48, w - 96, h - 96);

  const L = 130, T = 170, R = 894, B = 1040;
  x.strokeStyle = INK; x.lineWidth = 14; x.lineJoin = 'miter';
  x.beginPath();
  x.moveTo(L + 230, B); x.lineTo(L, B); x.lineTo(L, T); x.lineTo(R, T); x.lineTo(R, B); x.lineTo(L + 360, B);
  x.stroke();
  x.strokeStyle = '#f8f9fa'; x.lineWidth = 8;
  for (const [a, b] of [[L + 120, L + 290], [L + 420, L + 590]]) { x.beginPath(); x.moveTo(a, T); x.lineTo(b, T); x.stroke(); }
  x.strokeStyle = BLU; x.lineWidth = 2;
  for (const [a, b] of [[L + 120, L + 290], [L + 420, L + 590]]) for (const o of [-5, 0, 5]) { x.beginPath(); x.moveTo(a, T + o); x.lineTo(b, T + o); x.stroke(); }
  x.lineWidth = 2; x.beginPath(); x.moveTo(L + 230, B); x.lineTo(L + 230, B - 130); x.stroke();
  x.setLineDash([6, 6]); x.beginPath(); x.arc(L + 230, B, 130, -Math.PI / 2, 0); x.stroke(); x.setLineDash([]);

  const scrivania = (sx, sy, ruota) => {
    x.save(); x.translate(sx, sy); x.rotate(ruota);
    x.strokeStyle = INK; x.lineWidth = 3; x.strokeRect(-95, -45, 190, 90);
    x.fillStyle = INK; x.fillRect(-36, -38, 72, 8);
    x.strokeStyle = BLU; x.lineWidth = 2; x.strokeRect(-28, -18, 56, 16);
    x.beginPath(); x.arc(0, 78, 26, 0, Math.PI * 2); x.stroke();
    x.restore();
  };
  scrivania(300, 330, 0); scrivania(540, 330, 0);
  scrivania(300, 610, Math.PI); scrivania(540, 610, Math.PI);
  x.strokeStyle = INK; x.lineWidth = 3; x.strokeRect(330, 800, 300, 120);
  for (let i = 0; i < 4; i++) { x.strokeStyle = BLU; x.lineWidth = 2; x.beginPath(); x.arc(370 + i * 74, 785, 20, 0, Math.PI * 2); x.stroke(); x.beginPath(); x.arc(370 + i * 74, 935, 20, 0, Math.PI * 2); x.stroke(); }
  x.fillStyle = 'rgba(31,79,168,0.10)'; x.fillRect(760, 220, 110, 86); x.strokeStyle = BLU; x.lineWidth = 3; x.strokeRect(760, 220, 110, 86);
  x.fillRect(780, 880, 90, 130); x.strokeRect(780, 880, 90, 130);
  x.fillStyle = BLU; x.font = `700 22px ${FONT}`; x.textAlign = 'center';
  x.fillText('MF A3', 815, 270); x.fillText('Rack', 825, 952);
  x.fillStyle = INK; x.font = `600 20px ${FONT}`;
  for (const [px, py] of [[200, 268], [640, 268], [200, 672], [640, 672]]) {
    x.beginPath(); x.moveTo(px, py - 12); x.lineTo(px + 12, py + 8); x.lineTo(px - 12, py + 8); x.closePath(); x.fill();
  }
  x.strokeStyle = BLU; x.fillStyle = BLU; x.lineWidth = 1.6; x.font = `600 22px ${FONT}`;
  x.beginPath(); x.moveTo(L, 120); x.lineTo(R, 120); x.moveTo(L, 108); x.lineTo(L, 132); x.moveTo(R, 108); x.lineTo(R, 132); x.stroke();
  x.fillText('820', (L + R) / 2, 110);
  x.beginPath(); x.moveTo(82, T); x.lineTo(82, B); x.moveTo(70, T); x.lineTo(94, T); x.moveTo(70, B); x.lineTo(94, B); x.stroke();
  x.save(); x.translate(72, (T + B) / 2); x.rotate(-Math.PI / 2); x.fillText('960', 0, 0); x.restore();

  x.textAlign = 'left';
  const tx = 520, ty = 1150, tw = 376, th = 250;
  x.strokeStyle = INK; x.lineWidth = 2.5; x.strokeRect(tx, ty, tw, th);
  x.lineWidth = 1.5;
  for (const yy of [ty + 92, ty + 150, ty + 200]) { x.beginPath(); x.moveTo(tx, yy); x.lineTo(tx + tw, yy); x.stroke(); }
  x.beginPath(); x.moveTo(tx + 190, ty + 150); x.lineTo(tx + 190, ty + th); x.stroke();
  x.fillStyle = INK; x.font = `800 34px ${FONT}`; x.fillText('Ufficio tipo', tx + 18, ty + 48);
  x.font = `500 22px ${FONT}`; x.fillStyle = '#4a515c'; x.fillText('Pianta arredo e postazioni', tx + 18, ty + 78);
  x.fillText('Disegnato in AutoCAD', tx + 18, ty + 130);
  x.fillText('Scala 1:50', tx + 18, ty + 183); x.fillText('Tav. 03', tx + 208, ty + 183);
  x.fillText('Rete: 4 punti', tx + 18, ty + 233); x.fillText('Quote in cm', tx + 208, ty + 233);
  righe(x, 130, 1160, 340, 6, 36, 12, 5);
  return c;
}

// 4. Reti e server: lo schema di rete della sede
function rete() {
  const { w, h } = A4;
  const [c, x] = foglio(w, h, '#f8f9fa');
  x.fillStyle = INK; x.font = `800 52px ${FONT}`; x.fillText('Schema di rete', 80, 130);
  x.fillStyle = GRIGIO; x.font = `500 26px ${FONT}`; x.fillText('Sede, piano terra', 80, 172);
  x.strokeStyle = RIGA; x.lineWidth = 2; x.beginPath(); x.moveTo(80, 206); x.lineTo(w - 80, 206); x.stroke();

  const nodo = (cx, cy, testo, pieno, larg = 180) => {
    x.beginPath(); x.roundRect(cx - larg / 2, cy - 44, larg, 88, 16);
    x.fillStyle = pieno ? BLU : '#ffffff'; x.fill();
    x.strokeStyle = pieno ? BLU : INK; x.lineWidth = 3; x.stroke();
    x.fillStyle = pieno ? '#ffffff' : INK; x.font = `700 26px ${FONT}`; x.textAlign = 'center';
    x.fillText(testo, cx, cy + 9); x.textAlign = 'left';
  };
  const filo = (pts, tratt) => {
    x.strokeStyle = INK; x.lineWidth = 3; x.setLineDash(tratt ? [10, 9] : []);
    x.beginPath(); x.moveTo(pts[0][0], pts[0][1]); for (const p of pts.slice(1)) x.lineTo(p[0], p[1]); x.stroke(); x.setLineDash([]);
    for (const p of [pts[0], pts[pts.length - 1]]) { x.fillStyle = INK; x.beginPath(); x.arc(p[0], p[1], 6, 0, Math.PI * 2); x.fill(); }
  };
  x.strokeStyle = INK; x.lineWidth = 3; x.fillStyle = '#ffffff';
  x.beginPath();
  x.arc(470, 300, 46, Math.PI * 0.6, Math.PI * 1.6); x.arc(530, 268, 58, Math.PI * 1.1, Math.PI * 1.95);
  x.arc(590, 306, 44, Math.PI * 1.45, Math.PI * 0.45); x.closePath(); x.fill(); x.stroke();
  x.fillStyle = INK; x.font = `700 26px ${FONT}`; x.textAlign = 'center'; x.fillText('Internet', 530, 318); x.textAlign = 'left';

  filo([[530, 352], [530, 420]]);
  nodo(530, 464, 'Firewall', false, 220);
  x.fillStyle = '#e3061b'; x.fillRect(430, 430, 8, 68);
  filo([[530, 508], [530, 580]]);
  nodo(530, 624, 'Switch', false, 520);
  const cols = [200, 420, 640, 860];
  const sopra = ['Server', 'NAS backup', 'Wi-Fi', 'Multifunz.'];
  const sotto = ['PC 1', 'PC 2', 'PC 3', 'Cassa'];
  cols.forEach((cx, i) => {
    filo([[Math.min(Math.max(cx, 290), 770), 668], [cx, 720], [cx, 776]], i === 2);
    nodo(cx, 820, sopra[i], i < 2);
  });
  filo([[530, 668], [530, 940]]);
  x.strokeStyle = INK; x.lineWidth = 3; x.beginPath(); x.moveTo(200, 940); x.lineTo(860, 940); x.stroke();
  cols.forEach((cx, i) => { filo([[cx, 940], [cx, 1016]], false); nodo(cx, 1060, sotto[i], false); });

  x.fillStyle = INK; x.font = `600 24px ${FONT}`;
  x.strokeStyle = INK; x.lineWidth = 3;
  x.beginPath(); x.moveTo(80, 1220); x.lineTo(150, 1220); x.stroke(); x.fillText('Cavo di rete', 168, 1229);
  x.setLineDash([10, 9]); x.beginPath(); x.moveTo(450, 1220); x.lineTo(520, 1220); x.stroke(); x.setLineDash([]); x.fillText('Wi-Fi', 538, 1229);
  x.fillStyle = BLU; x.fillRect(700, 1204, 32, 32); x.fillStyle = INK; x.fillText('Dati al sicuro', 746, 1229);
  righe(x, 80, 1290, 860, 3, 36, 12, 9);
  return c;
}

// 5. Ricondizionati: la scheda di collaudo
function collaudo() {
  const { w, h } = A4;
  const [c, x] = foglio(w, h);
  x.fillStyle = INK; x.fillRect(0, 0, w, 190);
  x.fillStyle = '#ffffff'; x.font = `800 54px ${FONT}`; x.fillText('Scheda di collaudo', 80, 118);
  x.font = `500 26px ${FONT}`; x.fillStyle = '#b9c0ca'; x.fillText('Prodotto ricondizionato', 80, 160);

  x.fillStyle = INK;
  const campo = (et, val, y) => {
    x.fillStyle = GRIGIO; x.font = `500 24px ${FONT}`; x.fillText(et, 80, y);
    x.fillStyle = INK; x.font = `700 32px ${FONT}`; x.fillText(val, 330, y);
    x.strokeStyle = RIGA; x.lineWidth = 2; x.beginPath(); x.moveTo(80, y + 24); x.lineTo(w - 80, y + 24); x.stroke();
  };
  campo('Prodotto', 'Multifunzione A3 colore', 290);
  campo('Provenienza', 'Rigenerato', 370);

  const voci = ['Rigenerato', 'Verificato dai nostri tecnici', 'Garantito'];
  voci.forEach((t, i) => {
    const y = 500 + i * 84;
    casella(x, 80, y, 44, true);
    x.fillStyle = INK; x.font = `700 36px ${FONT}`; x.fillText(t, 150, y - 8);
  });

  x.fillStyle = GRIGIO; x.font = `500 24px ${FONT}`; x.fillText('Pagina di prova', 80, 790);
  const y0 = 820;
  for (let i = 0; i < 12; i++) { const v = Math.round(i * 23); x.fillStyle = `rgb(${v},${v},${v})`; x.fillRect(80 + i * 72, y0, 72, 90); }
  const cmy = ['#00a3e0', '#e6007e', '#ffe600'];
  cmy.forEach((col, i) => {
    const g = x.createLinearGradient(80, 0, w - 80, 0);
    g.addColorStop(0, '#ffffff'); g.addColorStop(1, col);
    x.fillStyle = g; x.fillRect(80, y0 + 110 + i * 46, w - 160, 38);
  });
  x.strokeStyle = INK; x.lineWidth = 1.2;
  for (let i = 0; i < 40; i++) { x.beginPath(); x.moveTo(80 + i * 6, 1110); x.lineTo(80 + i * 6, 1230); x.stroke(); }
  for (let i = 0; i < 20; i++) { x.beginPath(); x.moveTo(340, 1110 + i * 6); x.lineTo(560, 1110 + i * 6); x.stroke(); }
  mirino(x, 660, 1170, 40);

  x.save(); x.translate(820, 1250); x.rotate(-0.22);
  x.strokeStyle = PENNA; x.fillStyle = PENNA; x.globalAlpha = 0.85; x.lineWidth = 6;
  x.beginPath(); x.arc(0, 0, 120, 0, Math.PI * 2); x.stroke();
  x.lineWidth = 2.5; x.beginPath(); x.arc(0, 0, 104, 0, Math.PI * 2); x.stroke();
  x.font = `800 38px ${FONT}`; x.textAlign = 'center'; x.fillText('COLLAUDATO', 0, 14);
  x.font = `600 20px ${FONT}`; x.fillText('Drigo & Bergamin', 0, -40); x.fillText('Laboratorio', 0, 58);
  x.restore();
  return c;
}

// 6. Assistenza e consumabili: il rapporto di intervento firmato
function rapporto() {
  const { w, h } = A4;
  const [c, x] = foglio(w, h);
  x.fillStyle = INK; x.font = `800 52px ${FONT}`; x.fillText('Rapporto di intervento', 80, 130);
  x.fillStyle = GRIGIO; x.font = `500 26px ${FONT}`; x.fillText('Assistenza tecnica', 80, 172);
  x.textAlign = 'right'; x.fillStyle = INK; x.font = `700 28px ${FONT}`; x.fillText('N. 0122', w - 80, 130); x.textAlign = 'left';
  x.strokeStyle = INK; x.lineWidth = 3; x.beginPath(); x.moveTo(80, 206); x.lineTo(w - 80, 206); x.stroke();

  const campo = (et, y, seme, larg) => {
    x.fillStyle = GRIGIO; x.font = `500 24px ${FONT}`; x.fillText(et, 80, y);
    x.strokeStyle = RIGA; x.lineWidth = 2; x.beginPath(); x.moveTo(300, y + 6); x.lineTo(w - 80, y + 6); x.stroke();
    scarabocchio(x, 312, y - 4, larg, seme);
  };
  campo('Cliente', 290, 3, 300);
  campo('Indirizzo', 364, 8, 380);
  campo('Macchina', 438, 13, 260);
  campo('Matricola', 512, 21, 200);

  x.fillStyle = INK; x.font = `600 28px ${FONT}`;
  casella(x, 80, 626, 38, true); x.fillText('In sede', 136, 620);
  casella(x, 330, 626, 38, false); x.fillText('In laboratorio', 386, 620);
  x.fillStyle = GRIGIO; x.font = `500 24px ${FONT}`; x.fillText('Materiale fornito', 80, 712);
  x.fillStyle = INK; x.font = `600 28px ${FONT}`;
  casella(x, 80, 772, 38, true); x.fillText('Toner', 136, 766);
  casella(x, 300, 772, 38, false); x.fillText('Drum', 356, 766);
  casella(x, 500, 772, 38, true); x.fillText('Ricambi', 556, 766);

  x.fillStyle = GRIGIO; x.font = `500 24px ${FONT}`; x.fillText('Descrizione intervento', 80, 870);
  for (let i = 0; i < 5; i++) {
    const y = 940 + i * 62;
    x.strokeStyle = RIGA; x.lineWidth = 2; x.beginPath(); x.moveTo(80, y); x.lineTo(w - 80, y); x.stroke();
    if (i < 4) scarabocchio(x, 90, y - 10, 520 + ((i * 97) % 300), 40 + i);
  }
  x.fillStyle = GRIGIO; x.font = `500 24px ${FONT}`;
  x.fillText('Firma del tecnico', 80, 1340); x.fillText('Firma del cliente', 560, 1340);
  x.strokeStyle = INK; x.lineWidth = 2;
  x.beginPath(); x.moveTo(80, 1300); x.lineTo(460, 1300); x.moveTo(560, 1300); x.lineTo(w - 80, 1300); x.stroke();
  firma(x, 100, 1270, 300, 5);
  firma(x, 590, 1272, 280, 17);
  return c;
}

function carica(src) {
  return new Promise((ok) => {
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => ok(img);
    img.onerror = () => ok(null);
    img.src = src;
  });
}

export async function disegnaFogli() {
  const attesa = (ms) => new Promise((ok) => setTimeout(ok, ms));
  await Promise.race([
    Promise.all([document.fonts.load(`800 40px ${FONT}`), document.fonts.load(`500 24px ${FONT}`), document.fonts.load(`700 24px ${FONT}`)]),
    attesa(2500),
  ]).catch(() => {});
  const foto = await carica('assets/img/vetrina-insegna.jpg');
  return [
    { canvas: stampa(foto), larghezza: 1 },
    { canvas: scontrino(), larghezza: 440 / 1024, strappo: true },
    { canvas: cad(), larghezza: 1 },
    { canvas: rete(), larghezza: 1 },
    { canvas: collaudo(), larghezza: 1 },
    { canvas: rapporto(), larghezza: 1 },
  ];
}
