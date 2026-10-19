// Moby: menu, catalogo filtrabile, lista dei giochi per il preventivo, email composta, avvio del 3D.
(() => {
  const html = document.documentElement;
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const EMAIL = 'info@mobyitaly.it';

  $$('[data-anno]').forEach((el) => { el.textContent = new Date().getFullYear(); });

  // ---------- testata e menu ----------
  const testata = $('[data-testata]');
  const bottoneMenu = $('[data-menu]');
  const menu = $('#menu');
  const barra = $('.barra');
  const aggiornaTestata = () => testata.classList.toggle('solida', scrollY > 24 || !menu.hidden);
  addEventListener('scroll', aggiornaTestata, { passive: true });
  aggiornaTestata();
  const chiudiMenu = () => { menu.hidden = true; bottoneMenu.setAttribute('aria-expanded', 'false'); aggiornaTestata(); };
  bottoneMenu.addEventListener('click', () => {
    const apri = menu.hidden;
    menu.hidden = !apri;
    bottoneMenu.setAttribute('aria-expanded', String(apri));
    aggiornaTestata();
  });
  $$('a', menu).forEach((a) => a.addEventListener('click', chiudiMenu));
  addEventListener('keydown', (e) => { if (e.key === 'Escape' && !menu.hidden) chiudiMenu(); });

  // la barra in basso si toglie di mezzo quando c'è già il modulo
  const modulo = $('[data-modulo]');
  if (barra && 'IntersectionObserver' in window) {
    new IntersectionObserver(([v]) => barra.classList.toggle('nascosta', v.isIntersecting), { threshold: 0.15 }).observe(modulo);
  }

  // ---------- 3D: prima la pagina, poi il gioco ----------
  const titolo = $('.eroe__titolo');
  document.addEventListener('moby:atterrato', () => {
    html.classList.add('atterrato');
    titolo.classList.remove('boing');
    void titolo.offsetWidth;
    titolo.classList.add('boing');
  });
  const risparmio = navigator.connection && navigator.connection.saveData;
  const avvia3d = () => {
    if (risparmio) { html.classList.add('no-3d'); return; }
    import('./3d.js').then((m) => m.avvia()).catch(() => html.classList.add('no-3d'));
    setTimeout(() => { if (!html.classList.contains('si-3d')) html.classList.add('no-3d'); }, 9000);
  };
  if (document.readyState === 'complete') setTimeout(avvia3d, 60);
  else addEventListener('load', () => setTimeout(avvia3d, 60), { once: true });

  // ---------- mosaico di foto ----------
  if ('IntersectionObserver' in window) {
    const oss = new IntersectionObserver((voci) => voci.forEach((v) => {
      if (v.isIntersecting) { v.target.classList.add('visto'); oss.unobserve(v.target); }
    }), { threshold: 0.2 });
    $$('.mosaico figure').forEach((f, i) => { f.style.transitionDelay = `${(i % 3) * 90}ms`; oss.observe(f); });
  } else {
    $$('.mosaico figure').forEach((f) => f.classList.add('visto'));
  }

  // ---------- richiesta (lista dei giochi scelti) ----------
  const CHIAVE = 'moby-richiesta';
  let scelti = [];
  try { scelti = JSON.parse(localStorage.getItem(CHIAVE) || '[]'); if (!Array.isArray(scelti)) scelti = []; } catch (e) { scelti = []; }
  const salva = () => { try { localStorage.setItem(CHIAVE, JSON.stringify(scelti)); } catch (e) { /* va bene anche senza */ } };
  const trova = (art) => scelti.find((s) => s.art === art);

  const carte = $$('.gioco');
  const datiCarta = (c) => ({ art: c.dataset.art, nome: $('h3', c).textContent, codice: $('.gioco__art', c).textContent });

  const listaScelti = $('[data-lista-scelti]');
  const vuoto = $('[data-vuoto]');
  const disegnaScelti = () => {
    const totale = scelti.reduce((n, s) => n + s.q, 0);
    $$('[data-conta]').forEach((c) => { c.textContent = totale; c.hidden = totale === 0; });
    vuoto.hidden = scelti.length > 0;
    listaScelti.innerHTML = '';
    scelti.forEach((s) => {
      const li = document.createElement('li');
      li.innerHTML = `<div><strong></strong><small></small></div>
        <div class="quantita" role="group" aria-label="Quantità"><button type="button" data-meno aria-label="Uno in meno">−</button><output></output><button type="button" data-piu aria-label="Uno in più">+</button></div>
        <button type="button" class="togli" data-togli aria-label="Togli dalla richiesta">×</button>`;
      $('strong', li).textContent = s.nome;
      $('small', li).textContent = s.codice;
      $('output', li).textContent = s.q;
      $('[data-meno]', li).addEventListener('click', () => { s.q = Math.max(1, s.q - 1); salva(); disegnaScelti(); });
      $('[data-piu]', li).addEventListener('click', () => { s.q = Math.min(99, s.q + 1); salva(); disegnaScelti(); });
      $('[data-togli]', li).addEventListener('click', () => { scelti = scelti.filter((x) => x !== s); salva(); aggiornaCarte(); disegnaScelti(); });
      listaScelti.appendChild(li);
    });
  };
  const aggiornaCarte = () => {
    carte.forEach((c) => {
      const b = $('[data-aggiungi]', c);
      const dentro = !!trova(c.dataset.art);
      b.setAttribute('aria-pressed', String(dentro));
      $('use', b).setAttribute('href', dentro ? '#i-ok' : '#i-piu');
      b.setAttribute('aria-label', `${dentro ? 'Togli' : 'Aggiungi'} ${$('h3', c).textContent} ${dentro ? 'dalla' : 'alla'} richiesta`);
    });
    aggiornaBottoneDettaglio();
  };
  const alterna = (dati) => {
    const c = trova(dati.art);
    if (c) scelti = scelti.filter((s) => s !== c);
    else scelti.push({ ...dati, q: 1 });
    salva(); aggiornaCarte(); disegnaScelti();
    return !c;
  };
  carte.forEach((c) => {
    $('[data-aggiungi]', c).addEventListener('click', (e) => {
      const b = e.currentTarget;
      const aggiunto = alterna(datiCarta(c));
      if (aggiunto) { b.classList.remove('salta-su'); void b.offsetWidth; b.classList.add('salta-su'); }
    });
  });

  // ---------- filtri ----------
  const PRIMI = 12;
  let famiglia = 'tutti', etichetta = null, tutti = false;
  const sotto = $('[data-sottofiltri]');
  const altri = $('[data-altri]');
  const risultati = $('[data-risultati]');
  const applica = () => {
    let n = 0;
    const visibili = [];
    carte.forEach((c) => {
      const ok = (famiglia === 'tutti' || c.dataset.fam === famiglia) &&
        (!etichetta || c.dataset.tag.split(' ').includes(etichetta));
      if (ok) visibili.push(c);
      c.hidden = true;
    });
    visibili.forEach((c) => { c.hidden = !tutti && n >= PRIMI; n++; });
    sotto.hidden = !(famiglia === 'tutti' || famiglia === 'molla');
    $('.catalogo__altri').hidden = tutti || visibili.length <= PRIMI;
    altri.textContent = `Mostra tutti i ${visibili.length}`;
    risultati.textContent = visibili.length === 1 ? '1 gioco' : `${visibili.length} giochi`;
  };
  $$('[data-filtro]').forEach((b) => b.addEventListener('click', () => {
    famiglia = b.dataset.filtro;
    $$('[data-filtro]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    if (famiglia !== 'tutti' && famiglia !== 'molla') {
      etichetta = null;
      $$('[data-tag-filtro]').forEach((x) => x.setAttribute('aria-pressed', 'false'));
    }
    tutti = false; applica();
  }));
  $$('[data-tag-filtro]').forEach((b) => b.addEventListener('click', () => {
    const nuovo = b.dataset.tagFiltro;
    etichetta = etichetta === nuovo ? null : nuovo;
    $$('[data-tag-filtro]').forEach((x) => x.setAttribute('aria-pressed', String(x.dataset.tagFiltro === etichetta)));
    tutti = false; applica();
  }));
  altri.addEventListener('click', () => {
    tutti = true;
    const primoNascosto = carte.find((c) => c.hidden && (famiglia === 'tutti' || c.dataset.fam === famiglia));
    applica();
    if (primoNascosto) $('button', primoNascosto).focus({ preventScroll: true });
  });
  applica();

  // ---------- scheda di dettaglio ----------
  const dettaglio = $('[data-dettaglio]');
  let catalogo = null, artAperto = null;
  const carica = () => catalogo ? Promise.resolve(catalogo) :
    fetch('catalogo.json').then((r) => r.json()).then((d) => { catalogo = d; return d; });
  const bottoneDettaglio = $('[data-d-aggiungi]');
  function aggiornaBottoneDettaglio() {
    if (!artAperto) return;
    bottoneDettaglio.textContent = trova(artAperto) ? 'Nella richiesta: togli' : 'Aggiungi alla richiesta';
  }
  const apri = (c) => {
    carica().then((d) => {
      const g = d.find((x) => x.art === c.dataset.art);
      if (!g) return;
      artAperto = g.art;
      const img = $('[data-d-img]');
      img.src = g.img; img.width = g.w; img.height = g.h; img.alt = $('img', c).alt;
      $('.dettaglio__foto').classList.toggle('bianco', g.bianco);
      $('[data-d-tipo]').textContent = g.tipo;
      $('[data-d-nome]').textContent = g.nome;
      $('[data-d-art]').textContent = /^[\w./ -]+$/.test(g.art) && g.art !== 'scivolo-a-tubo' ? `Art. ${g.art}` : '';
      const dl = $('[data-d-spec]');
      dl.innerHTML = '';
      g.spec.forEach(([k, v]) => {
        const div = document.createElement('div');
        div.innerHTML = '<dt></dt><dd></dd>';
        $('dt', div).textContent = k; $('dd', div).textContent = v;
        dl.appendChild(div);
      });
      dl.hidden = !g.spec.length;
      const ul = $('[data-d-info]');
      ul.innerHTML = '';
      g.info.forEach((t) => { const li = document.createElement('li'); li.textContent = t; ul.appendChild(li); });
      const desc = $('[data-d-desc]');
      desc.textContent = g.desc;
      desc.closest('details').hidden = !g.desc;
      desc.closest('details').open = false;
      aggiornaBottoneDettaglio();
      if (typeof dettaglio.showModal === 'function') dettaglio.showModal(); else dettaglio.setAttribute('open', '');
      dettaglio.scrollTop = 0;
    }).catch(() => {});
  };
  carte.forEach((c) => $('[data-apri]', c).addEventListener('click', () => apri(c)));
  bottoneDettaglio.addEventListener('click', () => {
    const c = carte.find((x) => x.dataset.art === artAperto);
    if (c) alterna(datiCarta(c));
  });
  dettaglio.addEventListener('click', (e) => { if (e.target === dettaglio) dettaglio.close(); });
  dettaglio.addEventListener('close', () => { artAperto = null; });

  // ---------- modulo: compone l'email ----------
  const messaggio = $('[data-messaggio]');
  $$('[data-motivo]').forEach((a) => a.addEventListener('click', () => {
    const t = a.dataset.motivo;
    if (!messaggio.value.includes(t)) messaggio.value = messaggio.value ? `${messaggio.value}\n${t}` : t;
  }));
  const errore = $('[data-errore]');
  modulo.addEventListener('submit', (e) => {
    e.preventDefault();
    const d = Object.fromEntries(new FormData(modulo).entries());
    const mancano = [];
    ['nome', 'telefono'].forEach((k) => {
      const input = modulo.elements[k];
      const vuotoCampo = !String(d[k] || '').trim();
      input.setAttribute('aria-invalid', String(vuotoCampo));
      if (vuotoCampo) mancano.push(k === 'nome' ? 'il nome' : 'il telefono');
    });
    if (mancano.length) {
      errore.textContent = `Manca ${mancano.join(' e ')}: serve per richiamarti.`;
      errore.hidden = false;
      modulo.elements[mancano[0] === 'il nome' ? 'nome' : 'telefono'].focus();
      return;
    }
    if (!scelti.length && !String(d.messaggio || '').trim()) {
      errore.textContent = 'Scegli almeno un gioco dal catalogo o scrivi nel messaggio cosa ti serve.';
      errore.hidden = false;
      messaggio.focus();
      return;
    }
    errore.hidden = true;
    const righe = ['Richiesta di preventivo dal sito', ''];
    righe.push(`Nome: ${d.nome}`);
    if (d.ente) righe.push(`Ente o azienda: ${d.ente}`);
    righe.push(`Telefono: ${d.telefono}`);
    if (d.email) righe.push(`Email: ${d.email}`);
    if (d.comune) righe.push(`Comune di installazione: ${d.comune}`);
    if (scelti.length) {
      righe.push('', 'Giochi scelti:');
      scelti.forEach((s) => righe.push(`- ${s.q} × ${s.nome} (${s.codice})`));
    }
    if (d.messaggio) righe.push('', 'Messaggio:', d.messaggio);
    const pezzi = scelti.reduce((n, s) => n + s.q, 0);
    const oggetto = scelti.length ? `Richiesta preventivo: ${pezzi} ${pezzi === 1 ? 'gioco' : 'giochi'}` : 'Richiesta preventivo dal sito';
    location.href = `mailto:${EMAIL}?subject=${encodeURIComponent(oggetto)}&body=${encodeURIComponent(righe.join('\n'))}`;
    let ok = $('.modulo__ok', modulo);
    if (!ok) {
      ok = document.createElement('p');
      ok.className = 'modulo__ok';
      ok.setAttribute('role', 'status');
      modulo.insertBefore(ok, $('.modulo__privacy', modulo));
    }
    ok.textContent = `Si sta aprendo la tua app di posta con la richiesta pronta. Se non si apre, scrivi a ${EMAIL} o chiama lo 0422 856090.`;
  });

  aggiornaCarte();
  disegnaScelti();
})();
