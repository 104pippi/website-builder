(() => {
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
  const riduci = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* Testata: diventa piena dopo l'hero */
  const testata = $('#testata');
  const aggiornaTestata = () => testata.classList.toggle('solida', scrollY > 40);
  addEventListener('scroll', aggiornaTestata, { passive: true });
  aggiornaTestata();

  /* Menu mobile */
  const bottoneMenu = $('.testata__menu');
  const menu = $('#menu-mobile');
  const chiudiMenu = () => {
    menu.hidden = true;
    bottoneMenu.setAttribute('aria-expanded', 'false');
    bottoneMenu.setAttribute('aria-label', 'Apri il menu');
    testata.classList.remove('menu-aperto');
    document.body.style.overflow = '';
  };
  bottoneMenu.addEventListener('click', () => {
    const apri = menu.hidden;
    if (!apri) return chiudiMenu();
    menu.hidden = false;
    bottoneMenu.setAttribute('aria-expanded', 'true');
    bottoneMenu.setAttribute('aria-label', 'Chiudi il menu');
    testata.classList.add('menu-aperto');
    document.body.style.overflow = 'hidden';
  });
  $$('a', menu).forEach(a => a.addEventListener('click', chiudiMenu));
  addEventListener('keydown', e => { if (e.key === 'Escape' && !menu.hidden) chiudiMenu(); });

  /* Rivelazioni: si osserva il contenitore e la classe va sul contenitore stesso */
  const daRivelare = $$('#aureus-foto, #fasi');
  if ('IntersectionObserver' in window && !riduci) {
    const io = new IntersectionObserver(voci => voci.forEach(v => {
      if (v.isIntersecting) { v.target.classList.add('in'); io.unobserve(v.target); }
    }), { threshold: 0.25 });
    daRivelare.forEach(el => io.observe(el));
  } else daRivelare.forEach(el => el.classList.add('in'));

  /* Campioni scelti */
  const scelti = new Set();
  try { JSON.parse(localStorage.getItem('camtex-campioni') || '[]').forEach(n => scelti.add(n)); } catch (e) {}
  const salva = () => { try { localStorage.setItem('camtex-campioni', JSON.stringify([...scelti])); } catch (e) {} };
  const listaScelti = $('#scelti-lista');
  const boxScelti = $('#scelti');

  const aggiornaScelti = () => {
    $$('.campione').forEach(c => {
      const dentro = scelti.has(c.dataset.nome);
      c.classList.toggle('scelto', dentro);
      const b = $('.campione__scegli', c);
      b.setAttribute('aria-pressed', String(dentro));
      b.textContent = dentro ? 'Nei campioni ✓' : 'Aggiungi ai campioni';
    });
    $$('[data-conta]').forEach(el => { el.hidden = scelti.size === 0; el.textContent = scelti.size; });
    listaScelti.innerHTML = '';
    scelti.forEach(nome => {
      const li = document.createElement('li');
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = nome;
      b.setAttribute('aria-label', `Togli ${nome} dai campioni`);
      b.addEventListener('click', () => { scelti.delete(nome); salva(); aggiornaScelti(); });
      li.append(b);
      listaScelti.append(li);
    });
    boxScelti.hidden = scelti.size === 0;
  };
  $$('.campione__scegli').forEach(b => b.addEventListener('click', () => {
    const nome = b.closest('.campione').dataset.nome;
    scelti.has(nome) ? scelti.delete(nome) : scelti.add(nome);
    salva(); aggiornaScelti();
  }));
  $$('[data-aggiungi]').forEach(b => b.addEventListener('click', () => {
    scelti.add(b.dataset.aggiungi); salva(); aggiornaScelti();
    $('input[name="tipo"][value="Campioni dal campionario"]').checked = true;
    $('#contatti').scrollIntoView({ behavior: riduci ? 'auto' : 'smooth' });
  }));
  aggiornaScelti();

  /* Filtri del campionario */
  const filtri = $$('.filtro');
  const listaCampioni = $('.campioni');
  filtri.forEach(f => f.addEventListener('click', () => {
    filtri.forEach(x => x.setAttribute('aria-pressed', String(x === f)));
    const fibra = f.dataset.filtro;
    $$('.campione').forEach(c => { c.hidden = fibra !== 'tutti' && c.dataset.fibra !== fibra; });
    listaCampioni.scrollTo({ left: 0, behavior: 'auto' });
  }));

  /* Scheda su misura: riassunto e anteprima dell'armatura */
  const scheda = $('#scheda');
  const tela = $('#armatura');
  const ctx = tela.getContext('2d');
  const nomiCostruzione = { 'tela': 'Tela', 'percalle': 'Percalle', 'spina di pesce': 'Spina di pesce', 'crespo': 'Crespo', 'jacquard': 'Jacquard' };

  const hash = (i, j) => { const s = Math.sin(i * 127.1 + j * 311.7) * 43758.5453; return s - Math.floor(s); };
  const sopra = (costr, i, j) => {
    if (costr === 'spina di pesce') { const blocco = Math.floor(i / 4) % 2; const ii = blocco ? -i : i; return (((ii + j) % 4) + 4) % 4 < 2; }
    if (costr === 'crespo') return hash(i, j) > 0.5;
    if (costr === 'jacquard') {
      const d = Math.abs((i % 12) - 6) + Math.abs((j % 12) - 6);
      return d < 5 ? (i + 3 * j) % 4 === 0 : (i + j) % 2 === 0;
    }
    return (i + j) % 2 === 0;
  };
  const tono = (hex, k) => {
    const n = parseInt(hex.slice(1), 16);
    const c = [n >> 16, (n >> 8) & 255, n & 255].map(v => Math.max(0, Math.min(255, Math.round(v * k))));
    return `rgb(${c.join(',')})`;
  };
  const disegnaArmatura = (costr, fibra, hex) => {
    const W = tela.width, cella = costr === 'percalle' ? 8 : 12, n = Math.ceil(W / cella);
    const irregolare = fibra === 'lino' ? 0.16 : fibra.startsWith('misto') ? 0.08 : 0.03;
    ctx.fillStyle = tono(hex, 0.55);
    ctx.fillRect(0, 0, W, W);
    for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
      const x = i * cella, y = j * cella, ordito = sopra(costr, i, j);
      const k = 1 - irregolare * hash(ordito ? i : j, ordito ? 7 : 3);
      const g = ordito ? ctx.createLinearGradient(x, 0, x + cella, 0) : ctx.createLinearGradient(0, y, 0, y + cella);
      g.addColorStop(0, tono(hex, (ordito ? 0.74 : 0.7) * k));
      g.addColorStop(0.5, tono(hex, (ordito ? 1.05 : 0.96) * k));
      g.addColorStop(1, tono(hex, (ordito ? 0.74 : 0.7) * k));
      ctx.fillStyle = g;
      if (ordito) ctx.fillRect(x + 1, y - 1, cella - 2, cella + 2);
      else ctx.fillRect(x - 1, y + 1, cella + 2, cella - 2);
    }
  };
  const valore = nome => (scheda.querySelector(`input[name="${nome}"]:checked`) || scheda.querySelector(`input[name="${nome}"]`)).value;
  const aggiornaScheda = () => {
    const fibra = valore('fibra'), costr = valore('costruzione');
    const colore = scheda.querySelector('input[name="colore"]:checked');
    const peso = scheda.peso.value, altezza = scheda.altezza.value;
    $('#peso-val').textContent = `${peso} g/m²`;
    $('#altezza-val').textContent = `${altezza} cm`;
    const coloreTesto = colore.value === 'tinta a campione' ? 'in una tinta a campione' : `color ${colore.value}`;
    $('#riassunto').textContent = `${nomiCostruzione[costr]} di ${fibra}, ${peso} g/m², alta ${altezza} cm, ${coloreTesto}.`;
    disegnaArmatura(costr, fibra, colore.dataset.hex);
  };
  scheda.addEventListener('input', aggiornaScheda);
  scheda.addEventListener('change', aggiornaScheda);
  aggiornaScheda();
  scheda.addEventListener('submit', e => {
    e.preventDefault();
    $('input[name="tipo"][value="Tessuto su misura (private label)"]').checked = true;
    $('#messaggio').value = `La mia prima idea di tessuto: ${$('#riassunto').textContent}\n\nUso previsto: `;
    $('#contatti').scrollIntoView({ behavior: riduci ? 'auto' : 'smooth' });
    setTimeout(() => $('input[name="nome"]').focus({ preventScroll: true }), riduci ? 0 : 700);
  });

  /* Confronto ieri / oggi */
  const confronto = $('#confronto');
  if (confronto) {
    const r = $('input', confronto);
    r.addEventListener('input', () => confronto.style.setProperty('--pos', r.value + '%'));
  }

  /* Modulo: compone l'email */
  const modulo = $('#modulo');
  const errore = $('#errore');
  modulo.addEventListener('submit', e => {
    e.preventDefault();
    const obbligatori = ['nome', 'azienda', 'email'];
    let primo = null;
    obbligatori.forEach(n => {
      const campo = modulo[n];
      const ok = campo.value.trim() !== '' && (n !== 'email' || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(campo.value.trim()));
      campo.classList.toggle('non-valido', !ok);
      campo.setAttribute('aria-invalid', String(!ok));
      if (!ok && !primo) primo = campo;
    });
    if (primo) {
      errore.textContent = 'Completa nome, azienda e un indirizzo email valido.';
      errore.hidden = false;
      primo.focus();
      return;
    }
    errore.hidden = true;
    const tipo = modulo.querySelector('input[name="tipo"]:checked').value;
    const righe = [
      `Richiesta dal sito: ${tipo}`,
      '',
      `Nome: ${modulo.nome.value.trim()}`,
      `Azienda: ${modulo.azienda.value.trim()}`,
      `Email: ${modulo.email.value.trim()}`,
      modulo.telefono.value.trim() ? `Telefono: ${modulo.telefono.value.trim()}` : null,
      scelti.size ? `Tessuti scelti: ${[...scelti].join(', ')}` : null,
      modulo.metri.value.trim() ? `Metri indicativi: ${modulo.metri.value.trim()}` : null,
      '',
      modulo.messaggio.value.trim()
    ].filter(r => r !== null);
    const oggetto = `${tipo} - ${modulo.azienda.value.trim()}`;
    location.href = `mailto:info@camtex.it?subject=${encodeURIComponent(oggetto)}&body=${encodeURIComponent(righe.join('\n'))}`;
    $('#nota-invio').textContent = 'Abbiamo aperto la tua app di posta con la richiesta già scritta. Se non si è aperta, scrivi a info@camtex.it o chiama lo 0438 738441.';
  });

  /* Anno nel piede */
  $('#anno').textContent = new Date().getFullYear();

  /* Telaio 3D: si carica solo quando la sezione si avvicina */
  const sezione = $('#telaio');
  const supportaWebGL2 = (() => {
    try { const c = document.createElement('canvas'); return !!c.getContext('webgl2'); } catch (e) { return false; }
  })();
  if (riduci || !supportaWebGL2) {
    sezione.classList.add('statico');
    return;
  }
  let caricato = false;
  const carica = () => {
    if (caricato) return;
    caricato = true;
    import('./3d.js').then(m => m.avvia()).catch(() => sezione.classList.add('statico'));
  };
  const io3d = new IntersectionObserver(v => { if (v[0].isIntersecting) { carica(); io3d.disconnect(); } }, { rootMargin: '900px 0px' });
  io3d.observe(sezione);
  addEventListener('load', () => setTimeout(carica, 1200), { once: true });
})();
