// Cadorin Carpenterie — interazioni della pagina. Le scene 3D stanno in 3d.js e arrivano dopo il load.
(() => {
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const ridotto = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const WA = '393357464472';
  const wa = (testo) => `https://wa.me/${WA}?text=${encodeURIComponent(testo)}`;

  // Anno nel piede
  $$('[data-anno]').forEach((el) => { el.textContent = new Date().getFullYear(); });

  // Testata e barra fissa
  const testata = $('[data-testata]');
  const barra = $('[data-barra]');
  const contatti = $('#contatti');

  // Menu mobile
  const bottoneMenu = $('[data-apri-menu]');
  const menu = $('#menu-mobile');
  const chiudiMenu = () => { menu.hidden = true; bottoneMenu.setAttribute('aria-expanded', 'false'); bottoneMenu.textContent = 'Menu'; };
  bottoneMenu.addEventListener('click', () => {
    const apri = menu.hidden;
    menu.hidden = !apri;
    bottoneMenu.setAttribute('aria-expanded', String(apri));
    bottoneMenu.textContent = apri ? 'Chiudi' : 'Menu';
  });
  $$('a', menu).forEach((a) => a.addEventListener('click', chiudiMenu));
  addEventListener('keydown', (e) => { if (e.key === 'Escape' && !menu.hidden) chiudiMenu(); });

  // Schede dei lavori (dialog con galleria)
  const scheda = $('[data-scheda]');
  const titoloScheda = $('[data-scheda-titolo]');
  const corpoScheda = $('[data-scheda-corpo]');
  let tesseraAperta = null;
  const chiudiScheda = () => { if (scheda.open) scheda.close(); };
  scheda.addEventListener('close', () => {
    document.documentElement.classList.remove('bloccata');
    corpoScheda.replaceChildren();
    if (tesseraAperta) tesseraAperta.focus({ preventScroll: true });
  });
  scheda.addEventListener('click', (e) => { if (e.target === scheda) chiudiScheda(); });
  $('[data-chiudi-scheda]').addEventListener('click', chiudiScheda);
  $$('[data-apri]').forEach((t) => t.addEventListener('click', () => {
    const tpl = document.getElementById(`scheda-${t.dataset.apri}`);
    if (!tpl) return;
    tesseraAperta = t;
    titoloScheda.textContent = tpl.dataset.titolo;
    corpoScheda.replaceChildren(tpl.content.cloneNode(true));
    document.documentElement.classList.add('bloccata');
    scheda.showModal();
    $('.scheda__galleria', corpoScheda)?.scrollTo({ left: 0 });
  }));
  corpoScheda.addEventListener('click', (e) => {
    const b = e.target.closest('[data-al-modulo]');
    if (!b) return;
    chiudiScheda();
    vaiAlModulo(b.dataset.alModulo);
  });

  // Modulo: compone il messaggio e apre WhatsApp (o la posta)
  const modulo = $('[data-modulo]');
  const errore = $('[data-errore]');
  const selCosa = $('#f-cosa');
  function vaiAlModulo(cosa, testo) {
    if (cosa) {
      const opz = [...selCosa.options].find((o) => o.text === cosa);
      if (opz) selCosa.value = opz.value || opz.text;
    }
    if (testo) $('#f-msg').value = testo;
    modulo.scrollIntoView({ behavior: ridotto ? 'auto' : 'smooth', block: 'start' });
    setTimeout(() => $('#f-nome').focus({ preventScroll: true }), ridotto ? 0 : 650);
  }
  function messaggio() {
    const d = new FormData(modulo);
    const r = ['Buongiorno, vi scrivo dal sito.'];
    if (d.get('cosa')) r.push(`Mi serve: ${d.get('cosa')}.`);
    if (d.get('comune')) r.push(`Comune del lavoro: ${d.get('comune')}.`);
    if ((d.get('messaggio') || '').trim()) r.push(d.get('messaggio').trim());
    if (d.get('sopralluogo')) r.push('Vorrei fissare un sopralluogo gratuito.');
    r.push(`${d.get('nome')}${d.get('telefono') ? `, tel. ${d.get('telefono')}` : ''}`);
    return r.join('\n');
  }
  function valido() {
    const ok = $('#f-nome').value.trim().length > 1;
    errore.hidden = ok;
    if (!ok) $('#f-nome').focus();
    return ok;
  }
  modulo.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!valido()) return;
    window.open(wa(messaggio()), '_blank', 'noopener');
  });
  $('[data-invia-email]').addEventListener('click', () => {
    if (!valido()) return;
    const cosa = selCosa.value || 'informazioni';
    location.href = `mailto:info@cadorincarpenterie.it?subject=${encodeURIComponent(`Richiesta preventivo: ${cosa}`)}&body=${encodeURIComponent(messaggio())}`;
  });

  // Configuratore del cancello: stato condiviso con la scena 3D
  const configura = $('#configura');
  const stato = window.__statoCancello = { stile: 'doghe', colore: '7016', aperto: false };
  const nomiStile = { doghe: 'Doghe orizzontali', diagonale: 'Doghe diagonali', classico: 'Classico a lance' };
  const tipoStile = { doghe: 'Scorrevole su binario', diagonale: 'Scorrevole su binario', classico: 'A due ante, a battente' };
  const nomeColore = () => $(`input[name="colore"][value="${stato.colore}"]`).dataset.nome;
  const linkCancello = $('[data-wa-cancello]');
  const bottoneApri = $('[data-apri-cancello]');
  function aggiornaConfiguratore() {
    const nome = nomeColore();
    $('[data-nome-colore]').textContent = nome;
    $('[data-riep-tipo]').textContent = tipoStile[stato.stile];
    $('[data-riep-stile]').textContent = nomiStile[stato.stile];
    $('[data-riep-colore]').textContent = `Zincato a caldo, verniciato ${nome}`;
    linkCancello.href = wa(`Buongiorno, vorrei un preventivo per un cancello ${tipoStile[stato.stile].toLowerCase()}, stile ${nomiStile[stato.stile].toLowerCase()}, colore ${nome}. Il lavoro è a: `);
    document.dispatchEvent(new CustomEvent('cancello', { detail: { ...stato } }));
  }
  let toccato = false;
  const fermaGiro = () => { toccato = true; clearTimeout(giro); };
  $$('input[name="stile"], input[name="colore"]').forEach((i) => i.addEventListener('change', () => {
    stato[i.name] = i.value;
    aggiornaConfiguratore();
  }));
  ['pointerdown', 'keydown'].forEach((ev) => configura.addEventListener(ev, fermaGiro, { passive: true }));
  bottoneApri.addEventListener('click', () => {
    stato.aperto = !stato.aperto;
    bottoneApri.setAttribute('aria-pressed', String(stato.aperto));
    bottoneApri.textContent = stato.aperto ? 'Chiudi il cancello' : 'Apri il cancello';
    aggiornaConfiguratore();
  });
  aggiornaConfiguratore();

  // Finché nessuno tocca, i colori girano da soli quando la sezione è in vista
  let giro = 0;
  let configuraInVista = false;
  const colori = $$('input[name="colore"]');
  function prossimoColore() {
    if (toccato || ridotto || !configuraInVista) return;
    const i = colori.findIndex((c) => c.checked);
    const dopo = colori[(i + 1) % colori.length];
    dopo.checked = true;
    stato.colore = dopo.value;
    aggiornaConfiguratore();
    giro = setTimeout(prossimoColore, 2300);
  }
  new IntersectionObserver(([e]) => {
    const prima = configuraInVista;
    configuraInVista = e.isIntersecting;
    if (configuraInVista && !prima && !toccato) { clearTimeout(giro); giro = setTimeout(prossimoColore, 2600); }
    if (!configuraInVista) clearTimeout(giro);
  }, { threshold: 0.35 }).observe($('[data-scena-cancello]'));

  // Targhetta che si raddrizza quando entra
  const targhetta = $('.targhetta');
  new IntersectionObserver(([e], io) => {
    if (e.isIntersecting) { targhetta.classList.add('vista'); io.disconnect(); }
  }, { threshold: 0.3 }).observe($('.garanzie__griglia'));

  // Scroll: testata, barra, saldatura dei passi, parallasse della banda
  const passi = $('[data-passi]');
  const elencoPassi = $$('.passo', passi);
  const punta = document.createElement('span');
  punta.className = 'passi__punta';
  punta.setAttribute('aria-hidden', 'true');
  passi.append(punta);
  const banda = $('.banda');
  const bandaImg = $('.banda img');
  let inCoda = false;
  function aggiorna() {
    inCoda = false;
    const y = scrollY;
    const h = innerHeight;
    testata.classList.toggle('scorsa', y > 8);

    const rc = contatti.getBoundingClientRect();
    barra.classList.toggle('nascosta', rc.top < h * 0.55 && rc.bottom > h * 0.3);

    const rp = passi.getBoundingClientRect();
    const avanza = Math.min(1, Math.max(0, (h * 0.62 - rp.top) / (rp.height - 16)));
    passi.style.setProperty('--avanza', avanza.toFixed(4));
    passi.style.setProperty('--punta', `${(avanza * (rp.height - 16)).toFixed(1)}px`);
    passi.style.setProperty('--accesa', avanza > 0.002 && avanza < 0.998 ? '1' : '0');
    const fondo = rp.top + avanza * (rp.height - 16);
    elencoPassi.forEach((p) => p.classList.toggle('fatto', p.getBoundingClientRect().top + 18 <= fondo + 1));

    if (!ridotto) {
      const rb = banda.getBoundingClientRect();
      if (rb.bottom > 0 && rb.top < h) {
        const k = (rb.top + rb.height / 2 - h / 2) / (h / 2 + rb.height / 2);
        bandaImg.style.setProperty('--sp', `${(-k * rb.height * 0.08).toFixed(1)}px`);
      }
    }
  }
  const chiedi = () => { if (!inCoda) { inCoda = true; requestAnimationFrame(aggiorna); } };
  addEventListener('scroll', chiedi, { passive: true });
  addEventListener('resize', chiedi);
  aggiorna();

  // 3D: prima la pagina, poi le scene
  const haWebGL = (() => {
    try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; }
  })();
  if (!haWebGL) return;
  let modulo3d = null;
  const carica = () => modulo3d || (modulo3d = import('./3d.js'));
  const avviaMarchio = () => {
    const canvas = $('[data-scena-marchio]');
    carica().then((m) => m.avviaMarchio(canvas, { ridotto })).catch((err) => console.warn('3D marchio', err));
  };
  if (document.readyState === 'complete') avviaMarchio();
  else addEventListener('load', avviaMarchio, { once: true });

  const scenaCancello = $('[data-scena-cancello]');
  new IntersectionObserver(([e], io) => {
    if (!e.isIntersecting) return;
    io.disconnect();
    carica().then((m) => m.avviaCancello(scenaCancello, { ridotto, stato })).catch((err) => console.warn('3D cancello', err));
  }, { rootMargin: '900px 0px' }).observe(scenaCancello);
})();
