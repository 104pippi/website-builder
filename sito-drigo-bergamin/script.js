const doc = document.documentElement;
const ridotto = matchMedia('(prefers-reduced-motion: reduce)').matches;
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

$('#anno').textContent = new Date().getFullYear();

/* ---------- header e menu ---------- */
const barraTop = $('#top-bar');
const hamb = $('.hamb');
const menu = $('#menu');
function chiudiMenu() {
  menu.classList.remove('aperto');
  hamb.setAttribute('aria-expanded', 'false');
  document.body.classList.remove('menu-su');
}
hamb.addEventListener('click', () => {
  const apri = !menu.classList.contains('aperto');
  menu.classList.toggle('aperto', apri);
  hamb.setAttribute('aria-expanded', String(apri));
  document.body.classList.toggle('menu-su', apri);
});
$$('a', menu).forEach((a) => a.addEventListener('click', chiudiMenu));
addEventListener('keydown', (e) => { if (e.key === 'Escape') chiudiMenu(); });

/* ---------- intro: la luce dello scanner scende e "copia" la vetrina ---------- */
const hero = $('.hero');
function finisciIntro() {
  doc.classList.remove('intro');
  doc.classList.add('no-intro-fatto');
}
function intro() {
  const copri = $('.scan-copri', hero), scia = $('.scan-scia', hero), barra = $('.scan-barra', hero);
  const stampe = $$('[data-stampa]', hero);
  const dur = 1700;
  let t0 = null;
  function passo(ora) {
    if (t0 === null) t0 = ora;
    const k = clamp((ora - t0) / dur);
    const e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
    const h = hero.offsetHeight;
    const y = e * (h + 60) - 30;
    copri.style.clipPath = `inset(${Math.max(0, y)}px 0 0 0)`;
    barra.style.transform = `translateY(${y}px)`;
    scia.style.transform = `translateY(${y - scia.offsetHeight}px)`;
    const fondo = hero.getBoundingClientRect().top;
    for (const el of stampe) {
      if (!el.classList.contains('su') && y > el.getBoundingClientRect().top - fondo + 10) el.classList.add('su');
    }
    if (k < 1) requestAnimationFrame(passo);
    else {
      barra.style.transition = scia.style.transition = 'opacity .5s ease';
      barra.style.opacity = scia.style.opacity = '0';
      stampe.forEach((el) => el.classList.add('su'));
      setTimeout(finisciIntro, 900);
    }
  }
  const img = $('img', hero);
  const pronta = img.complete && img.naturalWidth ? Promise.resolve() : (img.decode ? img.decode() : Promise.resolve());
  Promise.race([pronta.catch(() => {}), new Promise((ok) => setTimeout(ok, 700))]).then(() => requestAnimationFrame(passo));
}
if (doc.classList.contains('intro')) intro();

/* ---------- aperto o chiuso adesso (ora di Roma) ---------- */
(function aperto() {
  const el = $('.aperto'), testo = $('.aperto-testo', el);
  try {
    const parti = Object.fromEntries(new Intl.DateTimeFormat('it-IT', { timeZone: 'Europe/Rome', weekday: 'long', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
      .formatToParts(new Date()).map((p) => [p.type, p.value]));
    const g = ['lunedì', 'martedì', 'mercoledì', 'giovedì', 'venerdì', 'sabato', 'domenica'].indexOf(parti.weekday.toLowerCase());
    const m = Number(parti.hour) * 60 + Number(parti.minute);
    if (g < 0 || Number.isNaN(m)) return;
    const fasce = [[510, 750], [870, 1110]];
    const ora = (min) => `${Math.floor(min / 60)}:${String(min % 60).padStart(2, '0')}`;
    const feriale = g <= 4;
    const fascia = feriale && fasce.find(([a, b]) => m >= a && m < b);
    if (fascia) {
      testo.textContent = `Aperto adesso, fino alle ${ora(fascia[1])}`;
      el.classList.add('si');
    } else {
      let quando;
      if (feriale && m < 510) quando = 'oggi alle 8:30';
      else if (feriale && m >= 750 && m < 870) quando = 'alle 14:30';
      else if (g <= 3 || g === 6) quando = 'domani alle 8:30';
      else quando = 'lunedì alle 8:30';
      testo.textContent = `Chiuso adesso, riapre ${quando}`;
      el.classList.add('no');
    }
  } catch (e) { /* resta l'orario fisso */ }
})();

/* ---------- header pieno e barra mobile ---------- */
const barra = $('#barra');
const azioniHero = $('#hero-azioni');
function aggiornaTop() {
  barraTop.classList.toggle('pieno', scrollY > 30);
  const r = azioniHero.getBoundingClientRect();
  const fondo = document.body.scrollHeight - innerHeight - scrollY < 140;
  barra.classList.toggle('su', r.bottom < 0 && !fondo);
}
addEventListener('scroll', aggiornaTop, { passive: true });
aggiornaTop();

/* ---------- il vassoio: progresso dei passi e display della stampante ---------- */
const passi = $$('.passo');
const nomi = passi.map((p) => p.dataset.breve || $('h3', p).textContent);
const numero = $('#foglio-n'), nome = $('#foglio-nome'), barretta = $('#foglio-barra');
window.__vassoio = function () {
  const mobile = innerWidth < 900;
  const T = innerHeight * (mobile ? 0.8 : 0.56);
  let u = 0;
  for (const p of passi) {
    const r = p.getBoundingClientRect();
    u += clamp((T - r.top) / r.height);
  }
  return { u, n: passi.length };
};
let attivoOra = -1, inCoda = false;
function aggiornaPassi() {
  inCoda = false;
  const { u, n } = window.__vassoio();
  const i = Math.min(n - 1, Math.floor(u));
  if (i !== attivoOra) {
    attivoOra = i;
    passi.forEach((p, k) => p.classList.toggle('attivo', k === i));
    numero.textContent = i + 1;
    nome.textContent = nomi[i];
  }
  barretta.style.width = `${clamp((u + 0.6) / n) * 100}%`;
}
addEventListener('scroll', () => { if (!inCoda) { inCoda = true; requestAnimationFrame(aggiornaPassi); } }, { passive: true });
addEventListener('resize', aggiornaPassi);
aggiornaPassi();

/* ---------- 3D dopo il caricamento; senza WebGL resta la pila disegnata ---------- */
const palco = $('#palco'), tela = $('#tela');
async function riserva() {
  palco.classList.add('no3d');
  try {
    const { disegnaFogli } = await import('./fogli.js');
    const fogli = await disegnaFogli();
    const box = $('#riserva');
    const inclina = [-3, 2.5, -1.5, 3, -2, 1.2];
    const els = fogli.map((f) => { box.appendChild(f.canvas); return f.canvas; });
    const aggiorna = () => {
      const { u } = window.__vassoio();
      els.forEach((c, i) => {
        const p = ridotto ? 1 : clamp((u - i) * 1.9 + 0.38);
        c.style.opacity = p > 0.02 ? 1 : 0;
        c.style.transform = `translate(-50%, ${-50 - (1 - p) * 40}%) rotateX(${(1 - p) * 55}deg) rotate(${inclina[i] * p}deg)`;
      });
    };
    addEventListener('scroll', aggiorna, { passive: true });
    aggiorna();
  } catch (e) { /* resta il testo */ }
}
async function avvia3d() {
  try {
    const m = await import('./3d.js');
    await m.avvia({ palco, tela, progresso: window.__vassoio, ridotto });
  } catch (e) {
    console.warn('Scena 3D non disponibile:', e && e.message);
    riserva();
  }
}
if (document.readyState === 'complete') setTimeout(avvia3d, 120);
else addEventListener('load', () => setTimeout(avvia3d, 120), { once: true });

/* ---------- contatore copie e voci incluse ---------- */
const contatore = $('#contatore');
const cifre = $('#cifre');
const N = 6, META = 8452;
const colonne = Array.from({ length: N }, () => {
  const c = document.createElement('span');
  c.className = 'cifra';
  const s = document.createElement('span');
  s.innerHTML = '01234567890'.split('').map((d) => `<b>${d}</b>`).join('');
  c.appendChild(s);
  cifre.appendChild(c);
  return s;
});
function mostraNumero(v) {
  for (let i = 0; i < N; i++) {
    const p = 10 ** (N - 1 - i);
    const base = Math.floor(v / p) % 10;
    const sotto = v % p;
    const fr = p === 1 ? v % 1 : clamp(sotto - (p - 1));
    colonne[i].style.transform = `translateY(${-(base + fr)}em)`;
  }
}
const voci = $$('#incluso li');
const scan = $('.contatore-scan');
if (ridotto) {
  mostraNumero(META);
  voci.forEach((li) => li.classList.add('ok'));
} else {
  mostraNumero(0);
  let t0 = null, giro = 0, visibile = false;
  const ciclo = (ora) => {
    if (t0 === null) t0 = ora;
    const s = (ora - t0) / 1000;
    const salita = clamp(s / 2.6);
    const v = META * (1 - Math.pow(1 - salita, 3)) + Math.max(0, s - 2.6) * 0.9;
    mostraNumero(v);
    const k = clamp((s - 0.5) / 1.5);
    const lista = $('#incluso');
    const top = lista.offsetTop - 10, alto = lista.offsetHeight + 20;
    const y = top + k * alto;
    scan.style.transform = `translateY(${y}px)`;
    scan.style.opacity = k > 0 && k < 1 ? '1' : '0';
    voci.forEach((li) => { if (!li.classList.contains('ok') && y > li.offsetTop + li.offsetHeight / 2) li.classList.add('ok'); });
    if (visibile) giro = requestAnimationFrame(ciclo);
  };
  new IntersectionObserver((v) => {
    visibile = v.some((x) => x.isIntersecting);
    if (visibile) giro = requestAnimationFrame(ciclo);
    else cancelAnimationFrame(giro);
  }, { threshold: 0.35 }).observe(contatore);
}

/* ---------- modulo: compone l'email ---------- */
const modulo = $('#modulo');
const tema = $('#tema');
$$('[data-scegli]').forEach((a) => a.addEventListener('click', () => { tema.value = a.dataset.scegli; }));
modulo.addEventListener('submit', (e) => {
  e.preventDefault();
  const d = Object.fromEntries(new FormData(modulo));
  const errore = $('#modulo-errore');
  $$('.campo', modulo).forEach((c) => c.classList.remove('errato'));
  const manca = [];
  if (!d.nome.trim()) { manca.push('il nome'); modulo.nome.closest('.campo').classList.add('errato'); }
  if (!d.telefono.trim()) { manca.push('il telefono'); modulo.telefono.closest('.campo').classList.add('errato'); }
  if (manca.length) {
    errore.textContent = `Scrivi ${manca.join(' e ')}, così possiamo richiamarti.`;
    (d.nome.trim() ? modulo.telefono : modulo.nome).focus();
    return;
  }
  errore.textContent = '';
  const righe = [
    'Buongiorno,',
    `vorrei un preventivo per: ${d.tema}.`,
    '',
    d.messaggio.trim(),
    '',
    `Nome: ${d.nome.trim()}`,
    d.azienda.trim() && `Azienda: ${d.azienda.trim()}`,
    `Telefono: ${d.telefono.trim()}`,
    d.email.trim() && `Email: ${d.email.trim()}`,
  ].filter((r) => r !== false && r !== undefined);
  const oggetto = `Richiesta di preventivo: ${d.tema}`;
  location.href = `mailto:info@drigobergamin.it?subject=${encodeURIComponent(oggetto)}&body=${encodeURIComponent(righe.join('\n').replace(/\n{3,}/g, '\n\n'))}`;
});

/* ---------- privacy ---------- */
const privacy = $('#privacy');
$('#apri-privacy').addEventListener('click', (e) => {
  e.preventDefault();
  privacy.hidden = !privacy.hidden;
  if (!privacy.hidden) privacy.scrollIntoView({ behavior: ridotto ? 'auto' : 'smooth', block: 'nearest' });
});
if (location.hash === '#privacy') privacy.hidden = false;
