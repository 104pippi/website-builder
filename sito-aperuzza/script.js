(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const fermo = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // anno nel piede
  $$('[data-anno]').forEach((el) => { el.textContent = new Date().getFullYear(); });

  // ---------- menu mobile ----------
  const apri = $('[data-menu-apri]');
  const pannello = $('[data-menu-mobile]');
  const chiudiMenu = () => {
    apri.setAttribute('aria-expanded', 'false');
    pannello.hidden = true;
    document.body.classList.remove('menu-aperto');
  };
  apri.addEventListener('click', () => {
    const aperto = apri.getAttribute('aria-expanded') === 'true';
    if (aperto) return chiudiMenu();
    apri.setAttribute('aria-expanded', 'true');
    pannello.hidden = false;
    document.body.classList.add('menu-aperto');
    $('a', pannello).focus();
  });
  pannello.addEventListener('click', (e) => { if (e.target.closest('a')) chiudiMenu(); });
  addEventListener('keydown', (e) => { if (e.key === 'Escape' && !pannello.hidden) { chiudiMenu(); apri.focus(); } });

  // ---------- foto che si srotolano ----------
  const rivela = $$('[data-rivela]');
  if ('IntersectionObserver' in window && !fermo) {
    const io = new IntersectionObserver((voci) => {
      voci.forEach((v) => { if (v.isIntersecting) { v.target.classList.add('in'); io.unobserve(v.target); } });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
    rivela.forEach((el) => io.observe(el));
  } else {
    rivela.forEach((el) => el.classList.add('in'));
  }

  // ---------- strisce dei macchinari: tre copie per scorrere senza vuoti ----------
  const strisce = $$('[data-scorre]');
  strisce.forEach((s) => {
    const pic = $('picture', s);
    for (let i = 0; i < 2; i++) s.appendChild(pic.cloneNode(true));
  });

  // ---------- tutto ciò che segue lo scroll, in un solo rAF ----------
  const testata = $('[data-testata]');
  const barra = $('.barra-mobile');
  const mestiere = $('[data-mestiere]');
  const passi = $$('[data-passo]');
  const barraPassi = $('[data-barra]');
  const fotoCompositi = $('.compositi__foto');
  const ciclo = $('[data-ciclo]');
  const tappe = ciclo ? $$('.eco__tappa', ciclo) : [];
  const linea = $('[data-linea]');
  let passoAttivo = 0;

  function scorri() {
    const vh = innerHeight, y = scrollY;
    testata.classList.toggle('piena', y > 24);
    barra.classList.toggle('visibile', y > vh * 0.45);

    if (mestiere) {
      const r = mestiere.getBoundingClientRect();
      const corsa = r.height - vh;
      const p = corsa > 0 ? clamp(-r.top / corsa, 0, 1) : 0;
      const n = p < 0.34 ? 0 : p < 0.67 ? 1 : 2;
      if (n !== passoAttivo) {
        passi[passoAttivo].classList.remove('attivo');
        passi[n].classList.add('attivo');
        passoAttivo = n;
      }
      barraPassi.style.setProperty('--p', p.toFixed(4));
    }

    if (fotoCompositi && !fermo) {
      const r = fotoCompositi.getBoundingClientRect();
      if (r.bottom > -200 && r.top < vh + 200) {
        const s = clamp((r.top + r.height / 2 - vh / 2) / vh, -1, 1);
        fotoCompositi.style.setProperty('--s', s.toFixed(4));
      }
    }

    if (ciclo) {
      const r = ciclo.getBoundingClientRect();
      const p = fermo ? 1 : clamp((vh * 0.9 - r.top) / (r.height + vh * 0.3), 0, 1);
      ciclo.style.setProperty('--p', p.toFixed(4));
      tappe.forEach((t, i) => t.classList.toggle('accesa', p >= i * 0.25 + 0.04));
    }

    strisce.forEach((s) => {
      const r = s.getBoundingClientRect();
      if (r.bottom < -50 || r.top > vh + 50) return;
      const larga = s.firstElementChild.getBoundingClientRect().width || 1000;
      const q = clamp((vh - r.top) / (vh + r.height), 0, 1);
      const corsa = innerWidth < 960 ? 170 : 320;
      const dir = Number(s.dataset.scorre) || 1;
      s.style.setProperty('--x', `${(-larga / 2 + dir * (q - 0.5) * corsa).toFixed(1)}px`);
    });

    if (linea) {
      const r = linea.getBoundingClientRect();
      const p = fermo ? 1 : clamp((vh * 0.62 - r.top) / r.height, 0, 1);
      linea.style.setProperty('--p', p.toFixed(4));
    }
  }
  let inAttesa = false;
  const pianifica = () => { if (!inAttesa) { inAttesa = true; requestAnimationFrame(() => { inAttesa = false; scorri(); }); } };
  addEventListener('scroll', pianifica, { passive: true });
  addEventListener('resize', pianifica);
  scorri();

  // ---------- banco: inclinazione 3D col puntatore, solo dove c'è un mouse ----------
  if (matchMedia('(hover: hover) and (pointer: fine)').matches && !fermo) {
    $$('.tessera').forEach((t) => {
      const pic = $('picture', t);
      t.addEventListener('pointermove', (e) => {
        const r = t.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
        pic.style.setProperty('--ry', `${(x * 10).toFixed(2)}deg`);
        pic.style.setProperty('--rx', `${(-y * 8).toFixed(2)}deg`);
      });
      t.addEventListener('pointerleave', () => { pic.style.removeProperty('--rx'); pic.style.removeProperty('--ry'); });
    });
  }

  // ---------- modulo: preselezione della famiglia e email già pronta ----------
  const modulo = $('[data-modulo]');
  const settore = $('[data-select-settore]');
  $$('[data-settore]').forEach((a) => a.addEventListener('click', () => { settore.value = a.dataset.settore; }));

  const errore = $('[data-errore]', modulo);
  modulo.addEventListener('submit', (e) => {
    e.preventDefault();
    const f = modulo.elements;
    const controlli = [
      [f.nome, f.nome.value.trim().length > 1],
      [f.email, /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(f.email.value.trim())],
      [f.settore, f.settore.value !== ''],
      [f.messaggio, f.messaggio.value.trim().length > 3],
    ];
    let primo = null;
    controlli.forEach(([campo, ok]) => {
      campo.closest('.campo').classList.toggle('errore', !ok);
      campo.setAttribute('aria-invalid', String(!ok));
      if (!ok && !primo) primo = campo;
    });
    errore.hidden = !primo;
    if (primo) { primo.focus(); return; }

    const righe = [
      `Buongiorno, vorrei un'offerta per: ${f.settore.value}.`,
      '',
      f.messaggio.value.trim(),
      '',
      `Nome: ${f.nome.value.trim()}`,
      f.azienda.value.trim() ? `Azienda: ${f.azienda.value.trim()}` : null,
      `Email: ${f.email.value.trim()}`,
      f.telefono.value.trim() ? `Telefono: ${f.telefono.value.trim()}` : null,
    ].filter((r) => r !== null);
    const oggetto = `Richiesta offerta: ${f.settore.value}${f.azienda.value.trim() ? ` (${f.azienda.value.trim()})` : ''}`;
    window.location.href = `mailto:info@aperuzza.com?subject=${encodeURIComponent(oggetto)}&body=${encodeURIComponent(righe.join('\n'))}`;
  });
  modulo.addEventListener('input', (e) => {
    const c = e.target.closest('.campo');
    if (c && c.classList.contains('errore')) { c.classList.remove('errore'); e.target.removeAttribute('aria-invalid'); }
  });

  // ---------- la bobina 3D arriva dopo la pagina ----------
  const tela = $('[data-tela]');
  function haWebGL() {
    try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch (e) { return false; }
  }
  function caricaBobina() {
    if (!tela || !haWebGL()) return;
    import('./3d.js')
      .then((m) => m.avvia({ sezione: mestiere, tela, fermo }))
      .catch(() => { /* resta la foto della bobina */ });
  }
  const dopoIlCarico = () => setTimeout(caricaBobina, 150);
  if (document.readyState === 'complete') dopoIlCarico(); else addEventListener('load', dopoIlCarico, { once: true });
})();
