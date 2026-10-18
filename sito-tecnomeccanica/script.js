(() => {
  const html = document.documentElement;
  const fermo = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const limita = (v, a, b) => Math.min(b, Math.max(a, v));

  /* ---------- Testata e menu mobile ---------- */
  const testata = document.getElementById('testata');
  const apri = testata.querySelector('.menu-apri');
  const menu = document.getElementById('menu-mobile');
  const chiudiMenu = () => { menu.hidden = true; apri.setAttribute('aria-expanded', 'false'); apri.textContent = 'Menu'; };
  apri.addEventListener('click', () => {
    const aperto = menu.hidden;
    menu.hidden = !aperto;
    apri.setAttribute('aria-expanded', String(aperto));
    apri.textContent = aperto ? 'Chiudi' : 'Menu';
    if (aperto) testata.classList.add('piena');
  });
  menu.addEventListener('click', (e) => { if (e.target.closest('a')) chiudiMenu(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !menu.hidden) { chiudiMenu(); apri.focus(); } });

  /* ---------- Hero: la luce dello studio ---------- */
  const pezzo = document.getElementById('hero-pezzo');
  const foto = pezzo.querySelector('picture');
  let luceDalPuntatore = false;
  pezzo.addEventListener('animationend', () => pezzo.classList.add('acceso'), { once: true });
  if (!fermo && matchMedia('(pointer: fine)').matches) {
    document.querySelector('.hero').addEventListener('pointermove', (e) => {
      if (!pezzo.classList.contains('acceso')) return;
      const r = pezzo.getBoundingClientRect();
      luceDalPuntatore = true;
      pezzo.style.setProperty('--lx', limita((e.clientX - r.left) / r.width * 100, -10, 110) + '%');
      pezzo.style.setProperty('--ly', limita((e.clientY - r.top) / r.height * 100, -10, 110) + '%');
    });
  }

  /* ---------- Magazzino: i pezzi entrano mentre scorri ---------- */
  const pista = document.getElementById('mag-pista');
  const pezzi = [...pista.querySelectorAll('.pezzo')];
  const figure = pezzi.map((p) => p.querySelector('.pezzo-fig'));
  const quote = pezzi.map((p) => p.querySelector('.quota'));
  const blocchi = [...pista.querySelectorAll('.mag-avanzamento i')];
  const n = pezzi.length;
  if (!fermo) {
    html.classList.add('scorre');
    // i pezzi stanno fuori campo: si caricano tutti appena il magazzino si avvicina
    new IntersectionObserver((voci, oss) => {
      if (voci.some((v) => v.isIntersecting)) {
        pista.querySelectorAll('img[loading="lazy"]').forEach((img) => { img.loading = 'eager'; });
        oss.disconnect();
      }
    }, { rootMargin: '150% 0px' }).observe(pista);
  }

  function magazzino() {
    const r = pista.getBoundingClientRect();
    if (r.bottom < -50 || r.top > innerHeight + 50) return;
    const pos = limita(-r.top / (r.height - innerHeight), 0, 1) * (n - 1);
    const attivo = Math.round(pos);
    pezzi.forEach((p, i) => {
      // ogni pezzo resta fermo al centro per un tratto, poi lascia il posto al successivo
      const g = i - pos;
      const e = Math.sign(g) * Math.max(0, Math.abs(g) - 0.16) / 0.84;
      const a = Math.abs(e);
      figure[i].style.transform = `translate3d(${(e * 62).toFixed(2)}%,${(a * 4).toFixed(2)}%,0) rotate(${(e * -14).toFixed(2)}deg) scale(${(1 - Math.min(a, 1) * 0.22).toFixed(3)})`;
      figure[i].style.opacity = limita(1 - a * 1.5, 0, 1).toFixed(3);
      quote[i].style.setProperty('--q', limita(1 - a * 3.2, 0, 1).toFixed(3));
      p.classList.toggle('attivo', i === attivo);
    });
    blocchi.forEach((b, i) => b.classList.toggle('pieno', i <= attivo));
  }

  /* ---------- Marchi: il muro si accende dall'alto ---------- */
  const muro = document.querySelector('[data-muro]');
  function marchi() {
    const r = muro.getBoundingClientRect();
    if (r.bottom < -50 || r.top > innerHeight + 50) return;
    const p = limita((innerHeight * 0.92 - r.top) / (r.height + innerHeight * 0.35), 0, 1);
    muro.style.setProperty('--luce', (p * 116 - 8).toFixed(1) + '%');
  }

  function scroll() {
    const y = scrollY;
    testata.classList.toggle('piena', y > 30 || !menu.hidden);
    if (fermo) return;
    if (y < innerHeight * 1.2) {
      const p = limita(y / innerHeight, 0, 1);
      foto.style.transform = `translate3d(0,${(y * 0.22).toFixed(1)}px,0) rotate(${(p * 8).toFixed(2)}deg)`;
      if (!luceDalPuntatore && pezzo.classList.contains('acceso')) {
        pezzo.style.setProperty('--lx', (62 - p * 55).toFixed(1) + '%');
        pezzo.style.setProperty('--ly', (34 + p * 40).toFixed(1) + '%');
      }
    }
    magazzino();
    marchi();
  }
  addEventListener('scroll', scroll, { passive: true });
  addEventListener('resize', scroll);
  scroll();

  /* ---------- Orari: aperto o chiuso adesso (ora di Roma) ---------- */
  const fasce = { 0: [], 1: [[510, 750], [810, 1050]], 2: [[510, 750], [810, 1050]], 3: [[510, 750], [810, 1050]], 4: [[510, 750], [810, 1050]], 5: [[510, 750], [810, 1050]], 6: [[510, 720]] };
  const nomiGiorni = ['domenica', 'lunedì', 'martedì', 'mercoledì', 'giovedì', 'venerdì', 'sabato'];
  const ora = (m) => `${Math.floor(m / 60)}.${String(m % 60).padStart(2, '0')}`;
  function adessoARoma() {
    const parti = Object.fromEntries(new Intl.DateTimeFormat('en-US', {
      timeZone: 'Europe/Rome', weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit',
    }).formatToParts(new Date()).map((p) => [p.type, p.value]));
    return {
      giorno: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(parti.weekday),
      minuti: (+parti.hour % 24) * 60 + +parti.minute,
      data: `${parti.year}-${parti.month}-${parti.day}`,
    };
  }
  const adesso = adessoARoma();
  function statoNegozio({ giorno, minuti }) {
    const oggi = fasce[giorno];
    const dentro = oggi.find(([a, b]) => minuti >= a && minuti < b);
    if (dentro) return { aperto: true, testo: `Aperto ora, chiude alle ${ora(dentro[1])}` };
    const dopo = oggi.find(([a]) => a > minuti);
    if (dopo) return { aperto: false, testo: `Chiuso ora, riapre alle ${ora(dopo[0])}` };
    for (let k = 1; k <= 7; k++) {
      const g = (giorno + k) % 7;
      if (fasce[g].length) return { aperto: false, testo: `Chiuso ora, riapre ${k === 1 ? 'domani' : nomiGiorni[g]} alle ${ora(fasce[g][0][0])}` };
    }
    return null;
  }
  const stato = statoNegozio(adesso);
  if (stato) {
    document.querySelectorAll('[data-stato]').forEach((el) => {
      el.classList.add(stato.aperto ? 'aperto' : 'chiuso');
      el.querySelector('[data-stato-testo]').textContent = stato.testo;
    });
  }
  document.querySelectorAll('tr[data-giorni]').forEach((tr) => {
    if (tr.dataset.giorni.split(',').map(Number).includes(adesso.giorno)) tr.classList.add('oggi');
  });

  /* ---------- Promozioni scadute: via da sole ---------- */
  document.querySelectorAll('[data-scade]').forEach((li) => { if (li.dataset.scade < adesso.data) li.hidden = true; });

  /* ---------- Preventivo: precompila e compone l'email ---------- */
  const modulo = document.getElementById('modulo');
  const reparto = document.getElementById('f-reparto');
  const richiesta = document.getElementById('f-richiesta');
  const esito = document.getElementById('esito');
  let testoAuto = '';

  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-reparto], [data-promo]');
    if (!b) return;
    if (b.dataset.reparto) {
      reparto.value = [...reparto.options].some((o) => o.value === b.dataset.reparto) ? b.dataset.reparto : '';
    }
    if (b.dataset.promo && (!richiesta.value.trim() || richiesta.value === testoAuto)) {
      testoAuto = `Vorrei il prezzo di questo articolo della promozione ${b.dataset.promo}: `;
      richiesta.value = testoAuto;
    }
  });

  modulo.addEventListener('submit', (e) => {
    e.preventDefault();
    let primo = null;
    modulo.querySelectorAll('[required]').forEach((campo) => {
      const vuoto = !campo.value.trim() || campo.value === testoAuto;
      campo.setAttribute('aria-invalid', String(vuoto));
      if (vuoto && !primo) primo = campo;
    });
    if (primo) {
      esito.hidden = false;
      esito.textContent = 'Mancano alcuni dati: compila nome, telefono e cosa ti serve.';
      primo.focus();
      return;
    }
    const d = new FormData(modulo);
    const righe = [
      'Buongiorno, vi chiedo un preventivo.',
      '',
      `Cosa mi serve: ${d.get('richiesta').trim()}`,
      `Reparto: ${d.get('reparto') || 'da definire'}`,
      `Ritiro o consegna: ${d.get('ritiro')}`,
      '',
      `Nome: ${d.get('nome').trim()}`,
      d.get('azienda').trim() ? `Azienda: ${d.get('azienda').trim()}` : null,
      `Telefono: ${d.get('telefono').trim()}`,
    ].filter((r) => r !== null);
    const oggetto = `Richiesta preventivo${d.get('azienda').trim() ? ' - ' + d.get('azienda').trim() : ''}`;
    location.href = `mailto:vendite@tecnomeccanica.net?subject=${encodeURIComponent(oggetto)}&body=${encodeURIComponent(righe.join('\n'))}`;
    esito.hidden = false;
    esito.textContent = 'Abbiamo aperto la tua app di posta con la richiesta pronta: premi Invia. Se non si è aperta, scrivi a vendite@tecnomeccanica.net o chiama lo 0423 721039.';
  });
  modulo.addEventListener('input', (e) => { if (e.target.hasAttribute('aria-invalid')) e.target.setAttribute('aria-invalid', String(!e.target.value.trim())); });

  document.querySelectorAll('[data-anno]').forEach((el) => { el.textContent = adesso.data.slice(0, 4); });
})();
