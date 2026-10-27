// Carrozzeria Barzan: menu, intro, righe di luce, prima/dopo, servizi, modulo, mappa
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const ridotto = matchMedia('(prefers-reduced-motion: reduce)').matches;
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));

/* anno */
$$('[data-anno]').forEach((el) => { el.textContent = new Date().getFullYear(); });

/* testata solida, barra fissa, parallasse dell'hero */
const testata = $('[data-testata]');
const barra = $('[data-barra]');
const hero = $('[data-hero]');
const heroFondo = $('[data-hero-fondo]');
const heroCta = $('[data-hero-cta]');
let scrollInCoda = false;

function suScroll() {
  scrollInCoda = false;
  const y = scrollY;
  testata.classList.toggle('solida', y > 30);
  const fineCta = heroCta.getBoundingClientRect().bottom;
  barra.classList.toggle('su', fineCta < 0);
  if (!ridotto && y < innerHeight * 1.2) {
    const k = y / innerHeight;
    heroFondo.style.transform = `translate3d(0, ${(y * 0.28).toFixed(1)}px, 0) scale(${(1 + k * 0.06).toFixed(4)})`;
  }
  aggiornaLinee();
}
addEventListener('scroll', () => {
  if (!scrollInCoda) { scrollInCoda = true; requestAnimationFrame(suScroll); }
}, { passive: true });
addEventListener('resize', () => requestAnimationFrame(suScroll));

/* menu mobile */
const menu = $('[data-menu]');
const apri = $('[data-menu-apri]');
function chiudiMenu() {
  menu.hidden = true;
  apri.setAttribute('aria-expanded', 'false');
  document.body.style.overflow = '';
}
apri.addEventListener('click', () => {
  const aperto = apri.getAttribute('aria-expanded') === 'true';
  if (aperto) { chiudiMenu(); return; }
  menu.hidden = false;
  apri.setAttribute('aria-expanded', 'true');
  testata.classList.add('solida');
  document.body.style.overflow = 'hidden';
});
$$('a', menu).forEach((a) => a.addEventListener('click', chiudiMenu));
addEventListener('keydown', (e) => { if (e.key === 'Escape' && !menu.hidden) { chiudiMenu(); apri.focus(); } });

/* le righe: testi e barra seguono lo scroll; la scena 3D arriva dopo */
const linee = $('[data-linee]');
const passi = $$('[data-linee-passi] li');
const barraLinee = $('[data-linee-barra]');
let passoAttivo = 0;

function progressoLinee() {
  const r = linee.getBoundingClientRect();
  const corsa = r.height - innerHeight;
  return corsa > 0 ? clamp(-r.top / corsa) : 0;
}
function aggiornaLinee() {
  const p = progressoLinee();
  const i = p < 0.3 ? 0 : p < 0.7 ? 1 : 2;
  if (i !== passoAttivo) {
    passi[passoAttivo].classList.remove('on');
    passi[i].classList.add('on');
    passoAttivo = i;
  }
  barraLinee.style.transform = `scaleX(${p.toFixed(4)})`;
}

let scenaChiesta = false;
function caricaScena() {
  if (scenaChiesta) return;
  scenaChiesta = true;
  import('./3d.js')
    .then((m) => m.avvia({
      sezione: linee,
      canvas: $('[data-linee-canvas]'),
      poster: $('[data-linee-poster]'),
      progresso: progressoLinee,
      ridotto,
    }))
    .catch((err) => console.warn('Scena 3D non disponibile:', err));
}
new IntersectionObserver((voci, oss) => {
  if (voci.some((v) => v.isIntersecting)) { caricaScena(); oss.disconnect(); }
}, { rootMargin: '120% 0px' }).observe(linee);
addEventListener('load', () => setTimeout(caricaScena, 1200), { once: true });

/* prima e dopo */
$$('[data-confronto]').forEach((fig) => {
  const quadro = $('.confronto__quadro', fig);
  const maniglia = $('.confronto__maniglia', fig);
  let pos = 50;
  let demo = null;
  const metti = (v) => {
    pos = clamp(v, 0, 100);
    quadro.style.setProperty('--pos', `${pos.toFixed(2)}%`);
    maniglia.setAttribute('aria-valuenow', String(Math.round(pos)));
  };
  const daEvento = (e) => {
    const r = quadro.getBoundingClientRect();
    metti(((e.clientX - r.left) / r.width) * 100);
  };
  const fermaDemo = () => { if (demo) { cancelAnimationFrame(demo); demo = null; } };

  let attivo = false;
  let tocco = null;
  quadro.addEventListener('pointerdown', (e) => {
    fermaDemo();
    if (e.pointerType === 'mouse') {
      attivo = true;
      quadro.setPointerCapture(e.pointerId);
      daEvento(e);
    } else {
      tocco = { x: e.clientX, y: e.clientY, id: e.pointerId };
    }
  });
  quadro.addEventListener('pointermove', (e) => {
    if (attivo) { daEvento(e); return; }
    if (tocco && e.pointerId === tocco.id) {
      const dx = Math.abs(e.clientX - tocco.x);
      const dy = Math.abs(e.clientY - tocco.y);
      if (dx > 6 && dx > dy) { attivo = true; quadro.setPointerCapture(e.pointerId); }
      if (attivo) daEvento(e);
      else if (dy > 10) tocco = null;
    }
  });
  const fine = (e) => {
    if (tocco && !attivo && e.type === 'pointerup') daEvento(e);
    attivo = false;
    tocco = null;
  };
  quadro.addEventListener('pointerup', fine);
  quadro.addEventListener('pointercancel', fine);
  maniglia.addEventListener('keydown', (e) => {
    const passo = e.shiftKey ? 10 : 4;
    if (e.key === 'ArrowLeft') { fermaDemo(); metti(pos - passo); e.preventDefault(); }
    if (e.key === 'ArrowRight') { fermaDemo(); metti(pos + passo); e.preventDefault(); }
    if (e.key === 'Home') { fermaDemo(); metti(0); e.preventDefault(); }
    if (e.key === 'End') { fermaDemo(); metti(100); e.preventDefault(); }
  });

  // all'ingresso fa vedere da solo come funziona: 50 → 84 → 16 → 50
  if (!ridotto) {
    new IntersectionObserver((voci, oss) => {
      if (!voci[0].isIntersecting) return;
      oss.disconnect();
      const t0 = performance.now() + 250;
      const tappe = [[0, 50], [0.32, 84], [0.72, 16], [1, 50]];
      const giro = () => {
        const t = clamp((performance.now() - t0) / 2600);
        let k = 0;
        while (k < tappe.length - 2 && t > tappe[k + 1][0]) k++;
        const [ta, va] = tappe[k];
        const [tb, vb] = tappe[k + 1];
        const u = clamp((t - ta) / (tb - ta));
        const e = u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2;
        metti(va + (vb - va) * e);
        demo = t < 1 ? requestAnimationFrame(giro) : null;
      };
      demo = requestAnimationFrame(giro);
    }, { threshold: 0.55 }).observe(quadro);
  }
});

/* servizi: uno aperto alla volta */
const servizi = $('[data-servizi]');
$$('.voce__tasto', servizi).forEach((tasto) => {
  tasto.addEventListener('click', () => {
    const voce = tasto.closest('.voce');
    const desktop = matchMedia('(min-width: 1024px)').matches;
    const giaAperta = voce.classList.contains('on');
    if (giaAperta && desktop) return;
    $$('.voce', servizi).forEach((v) => {
      v.classList.remove('on');
      $('.voce__tasto', v).setAttribute('aria-expanded', 'false');
    });
    if (!giaAperta) {
      voce.classList.add('on');
      tasto.setAttribute('aria-expanded', 'true');
    }
  });
});

/* rivelazione con la riga di luce: galleria e coppia Panamera */
const daRivelare = $$('.galleria__v, .storia__foto');
if (!ridotto && 'IntersectionObserver' in window) {
  daRivelare.forEach((el) => el.classList.add('luce-in'));
  const oss = new IntersectionObserver((voci) => {
    voci.forEach((v) => {
      if (!v.isIntersecting) return;
      const el = v.target;
      const gruppo = el.parentElement ? [...el.parentElement.children].indexOf(el) % 4 : 0;
      el.style.setProperty('animation-delay', '0s');
      setTimeout(() => el.classList.add('in'), gruppo * 90);
      oss.unobserve(el);
    });
  }, { rootMargin: '0px 0px -8% 0px' });
  daRivelare.forEach((el) => oss.observe(el));
}

/* modulo: compone l'email */
const modulo = $('[data-modulo]');
const errore = $('[data-modulo-errore]');
modulo.addEventListener('submit', (e) => {
  e.preventDefault();
  const d = Object.fromEntries(new FormData(modulo));
  const nome = (d.nome || '').trim();
  const tel = (d.telefono || '').trim();
  if (!nome || !tel) {
    errore.hidden = false;
    (nome ? modulo.telefono : modulo.nome).focus();
    return;
  }
  errore.hidden = true;
  const auto = (d.auto || '').trim();
  const oggetto = `Richiesta preventivo: ${d.tipo}${auto ? `, ${auto}` : ''}`;
  const corpo = [
    'Buongiorno,',
    '',
    `vorrei un preventivo per: ${d.tipo.toLowerCase()}.`,
    auto ? `Auto: ${auto}` : '',
    (d.messaggio || '').trim() ? `\n${d.messaggio.trim()}` : '',
    '',
    `${nome}`,
    `Telefono: ${tel}`,
    '',
    '(Allego le foto del danno.)',
  ].filter((r, i, a) => r !== '' || a[i - 1] !== '').join('\n');
  location.href = `mailto:info@carrozzeriabarzan.com?subject=${encodeURIComponent(oggetto)}&body=${encodeURIComponent(corpo)}`;
});

/* mappa: si carica solo al tocco */
const mappa = $('[data-mappa]');
$('[data-mappa-apri]', mappa).addEventListener('click', () => {
  const f = document.createElement('iframe');
  f.src = 'https://www.google.com/maps?q=Carrozzeria%20Barzan%20Snc%20di%20Igor%20e%20Luca%2C%20Via%20Monsignor%20Tognana%2055%2C%2031055%20Quinto%20di%20Treviso&z=16&output=embed';
  f.title = 'Mappa: Carrozzeria Barzan, Via Monsignor Tognana 55, Quinto di Treviso';
  f.loading = 'lazy';
  f.referrerPolicy = 'no-referrer-when-downgrade';
  mappa.replaceChildren(f);
});

suScroll();
