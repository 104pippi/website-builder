(() => {
  const calmo = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const WA = 'https://wa.me/393481624284?text=';

  // Testata: diventa piena appena si scorre
  const testata = document.getElementById('testata');
  const suScroll = () => testata.classList.toggle('is-pieno', scrollY > 40);
  addEventListener('scroll', suScroll, { passive: true });
  suScroll();

  // Menu mobile
  const hamburger = document.getElementById('hamburger');
  const menu = document.getElementById('menu');
  const chiudi = () => { hamburger.setAttribute('aria-expanded', 'false'); document.body.classList.remove('menu-aperto'); };
  hamburger.addEventListener('click', () => {
    const apri = hamburger.getAttribute('aria-expanded') !== 'true';
    hamburger.setAttribute('aria-expanded', String(apri));
    document.body.classList.toggle('menu-aperto', apri);
  });
  menu.addEventListener('click', (e) => { if (e.target.closest('a')) chiudi(); });
  addEventListener('keydown', (e) => { if (e.key === 'Escape') chiudi(); });

  // Tabellone delle partenze a palette
  const tab = document.getElementById('tabellone');
  if (tab) {
    const mete = tab.dataset.mete.split('|');
    const N = 11, PASSO = 150, ALFA = 'ABCDEFGHILMNOPRSTUVZ';
    const tessere = [];
    for (let i = 0; i < N; i++) {
      const el = document.createElement('span');
      el.className = 't';
      el.innerHTML = '<span class="t-a"><b></b></span><span class="t-b"><b></b></span><span class="t-fa"><b></b></span><span class="t-fb"><b></b></span>';
      const [a, b, fa, fb] = [...el.children].map((s) => s.firstChild);
      tessere.push({ el, a, b, fa, fb, c: ' ' });
      tab.append(el);
    }
    const metti = (T, ch) => {
      const prima = T.c;
      T.a.textContent = ch; T.fb.textContent = ch;
      T.fa.textContent = prima; T.b.textContent = prima;
      T.el.classList.remove('gira');
      void T.el.offsetWidth;
      T.el.classList.add('gira');
      T.c = ch;
    };
    const mostra = (parola) => {
      const w = (parola + ' '.repeat(N)).slice(0, N);
      tessere.forEach((T, i) => {
        const fine = w[i];
        if (T.c === fine) return;
        if (calmo) { T.a.textContent = T.b.textContent = T.fb.textContent = fine; T.c = fine; return; }
        const giri = 1 + ((i * 7 + parola.length) % 3);
        const seq = [];
        for (let j = 0; j < giri; j++) seq.push(ALFA[(i * 5 + j * 11 + parola.charCodeAt(0)) % ALFA.length]);
        seq.push(fine);
        seq.forEach((ch, j) => setTimeout(() => metti(T, ch), 300 + i * 55 + j * PASSO));
      });
    };
    let n = 0;
    mostra(mete[0]);
    setInterval(() => { n = (n + 1) % mete.length; mostra(mete[n]); }, 3400);
  }

  // Comparsa delle sezioni, timbri sui biglietti e rotte sulla mappa
  const vedi = new IntersectionObserver((voci) => voci.forEach((v) => {
    if (v.isIntersecting) { v.target.classList.add('is-in'); vedi.unobserve(v.target); }
  }), { rootMargin: '0px 0px -10% 0px', threshold: .08 });
  document.querySelectorAll('.reveal').forEach((el) => vedi.observe(el));
  const mappa = document.getElementById('mappa');
  if (mappa) {
    const vediMappa = new IntersectionObserver(([v]) => {
      if (v.isIntersecting) { mappa.classList.add('is-in'); vediMappa.disconnect(); }
    }, { threshold: .35 });
    vediMappa.observe(mappa);
  }

  // Barra Chiama / WhatsApp su mobile, dopo l'hero
  const barra = document.getElementById('barra');
  const hero = document.querySelector('.hero');
  if (barra && hero) {
    new IntersectionObserver(([v]) => barra.classList.toggle('is-su', !v.isIntersecting), { rootMargin: '-45% 0px 0px 0px' }).observe(hero);
  }

  // Modulo per i gruppi: compone il messaggio e apre WhatsApp
  const modulo = document.getElementById('modulo');
  if (modulo) {
    const errore = document.getElementById('modulo-errore');
    modulo.addEventListener('submit', (e) => {
      e.preventDefault();
      const d = Object.fromEntries(new FormData(modulo).entries());
      const nome = modulo.elements.nome, tel = modulo.elements.telefono;
      const mancaNome = !d.nome.trim(), mancaTel = d.telefono.replace(/\D/g, '').length < 6;
      nome.setAttribute('aria-invalid', String(mancaNome));
      tel.setAttribute('aria-invalid', String(mancaTel));
      if (mancaNome || mancaTel) { errore.hidden = false; (mancaNome ? nome : tel).focus(); return; }
      errore.hidden = true;
      const righe = [
        'Buongiorno, vorrei un preventivo per un pellegrinaggio di gruppo.',
        `Nome: ${d.nome.trim()}`,
        `Telefono: ${d.telefono.trim()}`,
        d.gruppo.trim() && `Parrocchia o gruppo: ${d.gruppo.trim()}`,
        `Meta: ${d.meta}`,
        d.persone && `Persone: ${d.persone}`,
        d.periodo.trim() && `Periodo: ${d.periodo.trim()}`,
        d.messaggio.trim() && `Messaggio: ${d.messaggio.trim()}`,
      ].filter(Boolean);
      const url = WA + encodeURIComponent(righe.join('\n'));
      const w = window.open(url, '_blank', 'noopener');
      if (!w) location.href = url;
    });
  }

  const anno = document.getElementById('anno');
  if (anno) anno.textContent = new Date().getFullYear();
})();
