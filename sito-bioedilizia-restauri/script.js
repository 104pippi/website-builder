(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const root = document.documentElement;
  const ridotto = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const WA = '393381123387';

  // anno nel piede
  const anno = $('#anno');
  if (anno) anno.textContent = new Date().getFullYear();

  // testata: trasparente sull'hero, piena dopo
  const testata = $('#testata');
  const hero = $('.hero');
  const aggiornaTestata = () => {
    const soglia = hero ? hero.offsetHeight - 90 : 40;
    testata.classList.toggle('solida', scrollY > Math.min(soglia, 120));
  };

  // menu mobile
  const menuBtn = $('.testata-menu');
  const menu = $('#menu-mobile');
  const chiudiMenu = () => {
    root.classList.remove('menu-aperto');
    menuBtn.setAttribute('aria-expanded', 'false');
    menu.classList.remove('visibile');
    setTimeout(() => { if (!root.classList.contains('menu-aperto')) menu.hidden = true; }, 300);
  };
  menuBtn.addEventListener('click', () => {
    const apri = menuBtn.getAttribute('aria-expanded') !== 'true';
    if (!apri) return chiudiMenu();
    menu.hidden = false;
    requestAnimationFrame(() => menu.classList.add('visibile'));
    root.classList.add('menu-aperto');
    menuBtn.setAttribute('aria-expanded', 'true');
  });
  $$('a', menu).forEach((a) => a.addEventListener('click', chiudiMenu));
  addEventListener('keydown', (e) => { if (e.key === 'Escape' && root.classList.contains('menu-aperto')) chiudiMenu(); });

  // foto che entrano con la passata di spatola
  const rivela = $$('.rivela');
  if ('IntersectionObserver' in window && !ridotto) {
    const io = new IntersectionObserver((voci) => {
      voci.forEach((v) => { if (v.isIntersecting) { v.target.classList.add('in'); io.unobserve(v.target); } });
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0 });
    rivela.forEach((el) => io.observe(el));
  } else {
    rivela.forEach((el) => el.classList.add('in'));
  }

  // il cappotto: passi guidati dallo scroll
  const PASSI = [0, 0.12, 0.26, 0.42, 0.56, 0.70, 0.85, 1];
  const stato = (window.cappotto = { p: 0, colore: '#ECE7DC' });
  const telaio = $('#cappotto-telaio');
  const passi = $$('.passo');
  const tacche = $$('.cappotto-binario li');
  let passoAttivo = 0;
  const aggiornaCappotto = () => {
    if (!telaio) return;
    const r = telaio.getBoundingClientRect();
    const corsa = r.height - innerHeight;
    stato.p = Math.min(1, Math.max(0, -r.top / Math.max(1, corsa)));
    let i = 0;
    while (i < PASSI.length - 2 && stato.p >= PASSI[i + 1]) i++;
    if (i !== passoAttivo) {
      passoAttivo = i;
      passi.forEach((el, j) => el.classList.toggle('attivo', j === i));
    }
    tacche.forEach((t, j) => t.classList.toggle('fatto', j <= i));
    if (stato.ridisegna) stato.ridisegna();
  };
  $$('.colore').forEach((b) => b.addEventListener('click', () => {
    $$('.colore').forEach((x) => { x.classList.toggle('attivo', x === b); x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
    stato.colore = b.dataset.colore;
    if (stato.ridisegna) stato.ridisegna();
  }));

  // scroll
  let inCoda = false;
  const suScroll = () => {
    if (inCoda) return;
    inCoda = true;
    requestAnimationFrame(() => { inCoda = false; aggiornaTestata(); aggiornaCappotto(); });
  };
  addEventListener('scroll', suScroll, { passive: true });
  addEventListener('resize', suScroll);
  aggiornaTestata();
  aggiornaCappotto();

  // scena 3D: caricata dopo la pagina, quando la sezione si avvicina
  const scenaEl = $('#cappotto-scena');
  const avvia3D = () => {
    const canvas = $('#cappotto-canvas');
    const probe = document.createElement('canvas');
    const gl = probe.getContext('webgl2') || probe.getContext('webgl');
    if (!gl) { root.classList.add('no-webgl'); return; }
    import('./3d.js')
      .then((m) => m.avvia(canvas, stato, $('#cappotto-etichette')))
      .then((ok) => { if (ok) scenaEl.classList.add('pronto'); else root.classList.add('no-webgl'); })
      .catch((err) => { console.warn('3D non disponibile', err); root.classList.add('no-webgl'); });
  };
  const quandoVicino = () => {
    if (!scenaEl) return;
    if (!('IntersectionObserver' in window)) return avvia3D();
    const io = new IntersectionObserver(([v]) => {
      if (v.isIntersecting) { io.disconnect(); avvia3D(); }
    }, { rootMargin: '400% 0px' });
    io.observe(scenaEl);
  };
  // three.js pesa ~190 KB: parte poco dopo il load, così la scena è pronta quando si arriva alla sezione
  const dopoLoad = () => setTimeout(quandoVicino, 700);
  if (document.readyState === 'complete') dopoLoad();
  else addEventListener('load', dopoLoad, { once: true });

  // binario delle case: frecce su desktop
  const binario = $('#binario');
  $$('[data-scorri]').forEach((b) => b.addEventListener('click', () => {
    const passo = binario.querySelector('.casa').getBoundingClientRect().width + 22;
    binario.scrollBy({ left: Number(b.dataset.scorri) * passo * 2, behavior: ridotto ? 'auto' : 'smooth' });
  }));

  // galleria delle foto di ogni lavoro
  const dialogo = $('#galleria');
  const pista = $('#galleria-pista');
  const conta = $('#galleria-conta');
  let ultimoBottone = null;
  const contatore = () => {
    const n = pista.children.length;
    const i = Math.round(pista.scrollLeft / Math.max(1, pista.clientWidth));
    conta.textContent = n > 1 ? `${Math.min(n, i + 1)} di ${n}` : '';
  };
  const apriGalleria = (btn) => {
    const id = btn.dataset.galleria;
    const n = Number(btn.dataset.n) || 1;
    const alt = btn.querySelector('img')?.alt || btn.dataset.titolo;
    $('#galleria-titolo').textContent = btn.dataset.titolo;
    pista.innerHTML = '';
    for (let i = 1; i <= n; i++) {
      const nn = String(i).padStart(2, '0');
      const fig = document.createElement('figure');
      const img = document.createElement('img');
      img.src = `assets/img/lavori/${id}-${nn}.webp`;
      img.alt = i === 1 && alt ? alt : `${btn.dataset.titolo}, foto ${i} di ${n}`;
      img.decoding = 'async';
      if (i > 2) img.loading = 'lazy';
      fig.appendChild(img);
      pista.appendChild(fig);
    }
    ultimoBottone = btn;
    dialogo.showModal();
    root.classList.add('galleria-aperta');
    pista.scrollLeft = 0;
    contatore();
    pista.focus({ preventScroll: true });
  };
  $$('[data-galleria]').forEach((b) => b.addEventListener('click', () => apriGalleria(b)));
  $$('[data-apri]').forEach((a) => a.addEventListener('click', (e) => {
    const b = $(`[data-galleria="${a.dataset.apri}"]`);
    if (!b) return;
    e.preventDefault();
    apriGalleria(b);
  }));
  pista.addEventListener('scroll', () => requestAnimationFrame(contatore), { passive: true });
  $$('[data-lb]').forEach((b) => b.addEventListener('click', () => {
    pista.scrollBy({ left: Number(b.dataset.lb) * pista.clientWidth, behavior: ridotto ? 'auto' : 'smooth' });
  }));
  pista.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      e.preventDefault();
      pista.scrollBy({ left: (e.key === 'ArrowRight' ? 1 : -1) * pista.clientWidth, behavior: ridotto ? 'auto' : 'smooth' });
    }
  });
  $('#galleria-chiudi').addEventListener('click', () => dialogo.close());
  dialogo.addEventListener('click', (e) => { if (e.target === dialogo) dialogo.close(); });
  dialogo.addEventListener('close', () => {
    root.classList.remove('galleria-aperta');
    pista.innerHTML = '';
    if (ultimoBottone) ultimoBottone.focus({ preventScroll: true });
  });

  // modulo: compone il messaggio e apre WhatsApp
  const modulo = $('#modulo');
  const errore = $('#modulo-errore');
  const testoRichiesta = () => {
    const f = new FormData(modulo);
    const lavori = f.getAll('lavoro');
    const righe = ['Buongiorno, vorrei chiedere un sopralluogo.'];
    righe.push(`Nome: ${String(f.get('nome') || '').trim()}`);
    righe.push(`Telefono: ${String(f.get('telefono') || '').trim()}`);
    const comune = String(f.get('comune') || '').trim();
    if (comune) righe.push(`Comune del cantiere: ${comune}`);
    if (lavori.length) righe.push(`Lavoro: ${lavori.join(', ')}`);
    const msg = String(f.get('messaggio') || '').trim();
    if (msg) righe.push('', msg);
    return righe.join('\n');
  };
  modulo.addEventListener('submit', (e) => {
    e.preventDefault();
    const nome = $('#f-nome'), tel = $('#f-tel');
    const mancano = [];
    nome.setAttribute('aria-invalid', String(!nome.value.trim()));
    tel.setAttribute('aria-invalid', String(tel.value.replace(/\D/g, '').length < 6));
    if (!nome.value.trim()) mancano.push('il nome');
    if (tel.value.replace(/\D/g, '').length < 6) mancano.push('un numero di telefono');
    if (mancano.length) {
      errore.textContent = `${mancano.length > 1 ? 'Mancano' : 'Manca'} ${mancano.join(' e ')}: ci serve per richiamarvi.`;
      errore.hidden = false;
      (mancano[0] === 'il nome' ? nome : tel).focus();
      return;
    }
    errore.hidden = true;
    window.open(`https://wa.me/${WA}?text=${encodeURIComponent(testoRichiesta())}`, '_blank', 'noopener');
  });
  $('#modulo-email').addEventListener('click', (e) => {
    if (!$('#f-nome').value.trim() && !$('#f-tel').value.trim()) return;
    e.preventDefault();
    location.href = `mailto:info@bioediliziaerestauri.it?subject=${encodeURIComponent('Richiesta di sopralluogo')}&body=${encodeURIComponent(testoRichiesta())}`;
  });
})();
