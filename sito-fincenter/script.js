/* Fin Center — scroll, lastre in profondità, modulo di richiesta, avvio del 3D */
(() => {
  const doc = document.documentElement;
  doc.classList.add('js');
  const ridotto = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (ridotto) doc.classList.add('statico');

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const morbido = (t) => t * t * (3 - 2 * t);

  const anno = $('#anno');
  if (anno) anno.textContent = String(new Date().getFullYear());

  /* ---------- elementi ---------- */
  const testata = $('#testata');
  const barra = $('.barra');
  const hero = $('#hero');
  const parola = $('.hero__parola');
  const voci = $$('.voce__parola');
  const agile = $('.agile');
  const agileImg = $('.agile__foto img');
  const motto = $('.agile__motto');
  const pista = $('#ufficioPista');
  const lastre = $$('.lastra');
  const passi = $('.passi__corpo');
  const arco = $('#passiArco');
  const lunghezzaArco = arco ? arco.getTotalLength() : 0;
  if (arco) { arco.style.strokeDasharray = lunghezzaArco; arco.style.strokeDashoffset = lunghezzaArco; }

  /* ---------- un solo giro di aggiornamento per fotogramma ---------- */
  let inCoda = false;
  const chiedi = () => { if (!inCoda) { inCoda = true; requestAnimationFrame(aggiorna); } };

  function aggiorna() {
    inCoda = false;
    const y = window.scrollY;
    const vh = window.innerHeight;
    const vw = window.innerWidth;

    testata.classList.toggle('scorre', y > 30);
    if (barra) barra.classList.toggle('su', y > vh * 0.35);

    // hero: la parola sale più in fretta della foto
    if (hero && y < hero.offsetHeight + 50 && !ridotto) {
      parola.style.transform = `translate3d(0, ${(-y * 0.32).toFixed(1)}px, 0)`;
    }

    // indice: la parola al centro dello schermo prende peso
    if (!ridotto) {
      for (const el of voci) {
        const r = el.getBoundingClientRect();
        if (r.bottom < -50 || r.top > vh + 50) continue;
        const centro = r.top + r.height / 2;
        const k = morbido(clamp(1 - Math.abs(centro - vh * 0.5) / (vh * 0.42)));
        el.style.fontWeight = String(Math.round(200 + 260 * k));
        el.style.letterSpacing = `${(-0.045 + 0.012 * k).toFixed(4)}em`;
      }
    }

    // be agile: foto più lenta, motto che scivola come la scia
    if (agile && !ridotto) {
      const r = agile.getBoundingClientRect();
      if (r.bottom > 0 && r.top < vh) {
        const p = clamp((vh - r.top) / (vh + r.height));
        agileImg.style.transform = `translate3d(0, ${((p - 0.5) * -14).toFixed(2)}%, 0) scale(1.04)`;
        motto.style.transform = `translate3d(${((0.5 - p) * 18).toFixed(2)}vw, 0, 0)`;
      }
    }

    // ufficio: si cammina tra le lastre di vetro
    if (pista && !ridotto) muoviLastre(vh, vw);

    // passi: l'arco del logo si disegna
    if (arco && vw >= 900) {
      const r = passi.getBoundingClientRect();
      const p = clamp((vh * 0.9 - r.top) / (r.height * 0.9));
      arco.style.strokeDashoffset = (lunghezzaArco * (1 - p)).toFixed(1);
    }
  }

  /* ---------- lastre in profondità (CSS 3D, una prospettiva per lastra) ---------- */
  const P = 1000;
  function muoviLastre(vh, vw) {
    const r = pista.getBoundingClientRect();
    if (r.bottom < -vh || r.top > vh * 1.5) return;
    const p = clamp(-r.top / (r.height - vh));
    const mobile = vw < 900;
    const n = lastre.length;
    const passo = mobile ? 1300 : 1500;
    // fase globale: rallenta quando una lastra è davanti a te, accelera fra una e l'altra
    const S = -0.6 + p * (n - 1 + 0.6);
    const fase = S - 0.62 * Math.sin(2 * Math.PI * S) / (2 * Math.PI);
    const base = mobile ? vw * 0.04 : vw * 0.07;
    lastre.forEach((el, i) => {
      const s = fase - i;                          // < 0 in arrivo, 0 davanti, > 0 ti passa accanto
      const ultima = i === n - 1;
      const lato = ultima ? 0 : (i % 2 ? 1 : -1);
      const z = s <= 0 ? s * passo : s * P * 0.7;
      const x = lato * (base + Math.max(0, s) * vw * (mobile ? 0.95 : 0.6));
      const y = s <= 0 ? s * vh * 0.14 : 0;          // chi arriva sta più in alto: la sua didascalia resta dietro la foto davanti
      const arrivo = clamp((s + 1.4) / 0.65);
      const via = ultima ? 1 : clamp(1 - (s - 0.1) / 0.36);
      const o = arrivo * via;
      el.style.opacity = o.toFixed(3);
      el.style.setProperty('--t', clamp((s + 0.62) / 0.4).toFixed(3));
      el.style.visibility = o < 0.01 ? 'hidden' : 'visible';
      el.style.zIndex = String(1000 + Math.round(z / 10));
      el.style.transform = `perspective(${P}px) translate3d(calc(-50% + ${x.toFixed(1)}px), calc(-50% + ${y.toFixed(1)}px), ${z.toFixed(1)}px)`;
    });
  }

  /* ---------- passi: i cerchi si posano sull'arco ---------- */
  const voltePassi = $$('.passi__lista li');
  function allineaPassi() {
    if (!arco) return;
    voltePassi.forEach((li) => { li.style.transform = ''; });
    if (window.innerWidth < 900) return;
    const sr = arco.ownerSVGElement.getBoundingClientRect();
    const punti = [];
    for (let k = 0; k <= 240; k++) punti.push(arco.getPointAtLength(lunghezzaArco * k / 240));
    voltePassi.forEach((li) => {
      const c = li.querySelector('.passi__n').getBoundingClientRect();
      const cx = (c.left + c.width / 2 - sr.left) / sr.width * 1000;
      let best = punti[0];
      for (const pt of punti) if (Math.abs(pt.x - cx) < Math.abs(best.x - cx)) best = pt;
      const yArco = sr.top + best.y / 220 * sr.height;
      li.style.transform = `translateY(${(yArco - (c.top + c.height / 2)).toFixed(1)}px)`;
    });
  }
  allineaPassi();
  addEventListener('resize', allineaPassi);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(allineaPassi).catch(() => {});

  addEventListener('scroll', chiedi, { passive: true });
  addEventListener('resize', chiedi);
  aggiorna();

  /* ---------- tenda sulla foto dei mutui (osservo la figure, non l'img ritagliata) ---------- */
  const daRivelare = $$('[data-rivela]');
  if ('IntersectionObserver' in window && !ridotto) {
    const io = new IntersectionObserver((voci) => {
      voci.forEach((v) => { if (v.isIntersecting) { v.target.classList.add('in'); io.unobserve(v.target); } });
    }, { rootMargin: '0px 0px -15% 0px' });
    daRivelare.forEach((el) => io.observe(el));
  } else {
    daRivelare.forEach((el) => el.classList.add('in'));
  }

  /* ---------- scelta del tipo dalle righe dell'indice ---------- */
  const modulo = $('#proposta');
  $$('[data-tipo]').forEach((a) => {
    a.addEventListener('click', () => {
      const r = modulo.querySelector(`input[name="tipo"][value="${a.dataset.tipo}"]`);
      if (r) r.checked = true;
    });
  });

  /* ---------- modulo: compone l'email per info@fincenter.it ---------- */
  const esito = $('#esito');
  modulo.addEventListener('submit', (e) => {
    e.preventDefault();
    const dati = new FormData(modulo);
    const obbligatori = ['bene', 'azienda', 'nome', 'telefono'];
    let primo = null;
    obbligatori.forEach((nome) => {
      const campo = modulo.elements[nome];
      const vuoto = !String(dati.get(nome) || '').trim();
      campo.closest('.campo').classList.toggle('errore', vuoto);
      if (vuoto && !primo) primo = campo;
    });
    const privacy = modulo.elements.privacy;
    privacy.closest('.modulo__privacy').classList.toggle('errore', !privacy.checked);
    if (!primo && !privacy.checked) primo = privacy;
    if (primo) {
      esito.hidden = false;
      esito.textContent = 'Mancano alcuni dati: completa i campi segnati e conferma di aver letto l\'informativa privacy.';
      primo.focus();
      return;
    }
    const v = (k) => String(dati.get(k) || '').trim();
    const righe = [
      'Buongiorno,',
      'vorrei ricevere una proposta.',
      '',
      `Tipo: ${v('tipo')}`,
      `Che cosa vorrei finanziare: ${v('bene')}`,
      v('importo') ? `Importo indicativo: ${v('importo')}` : null,
      '',
      `Azienda: ${v('azienda')}`,
      `Nome: ${v('nome')}`,
      `Telefono: ${v('telefono')}`,
      v('email') ? `Email: ${v('email')}` : null,
      '',
      'Grazie.',
    ].filter((r) => r !== null);
    const oggetto = `Richiesta di proposta: ${v('tipo')} (${v('azienda')})`;
    const link = `mailto:info@fincenter.it?subject=${encodeURIComponent(oggetto)}&body=${encodeURIComponent(righe.join('\n'))}`;
    esito.hidden = false;
    esito.textContent = 'Abbiamo preparato la tua email: se l\'app di posta non si è aperta, scrivi a info@fincenter.it o chiama lo 0423 4221.';
    window.location.href = link;
  });
  modulo.addEventListener('input', (e) => {
    const c = e.target.closest('.campo');
    if (c) c.classList.remove('errore');
    if (e.target.name === 'privacy') e.target.closest('.modulo__privacy').classList.remove('errore');
  });

  /* ---------- 3D: arriva dopo la pagina ---------- */
  function avvia3d() {
    const canvas = $('#heroAnello');
    if (!canvas) return;
    const prova = document.createElement('canvas');
    const gl = prova.getContext('webgl2') || prova.getContext('webgl');
    if (!gl) return;
    import('./3d.js')
      .then((m) => m.avvia({ canvas, hero, persona: $('#heroPersona'), ridotto }))
      .catch((err) => console.warn('3D non disponibile:', err));
  }
  if (document.readyState === 'complete') setTimeout(avvia3d, 60);
  else addEventListener('load', () => setTimeout(avvia3d, 60), { once: true });
})();
