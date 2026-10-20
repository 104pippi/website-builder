/* Hartnagel Handels — catalogo: ricerca per codice, filtri, scheda prodotto, lista preventivo. */
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const normCod = (s) => norm(s).replace(/[^a-z0-9]/g, '');
  const LINEE = { industria: 'Industria', ufficio: 'Ufficio', 'tavoli-sedie': 'Tavoli e sedie', casa: 'Casa e alloggi' };
  const TEL_WA = '393483018871', EMAIL = 'info@hhsrl.it';
  const store = {
    get(k) { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* niente */ } },
  };

  /* menu */
  const burger = $('#burger'), menu = $('#menu');
  burger.addEventListener('click', () => {
    const a = menu.classList.toggle('aperto');
    burger.setAttribute('aria-expanded', String(a));
    burger.setAttribute('aria-label', a ? 'Chiudi il menu' : 'Apri il menu');
  });
  $('#anno').textContent = new Date().getFullYear();

  /* stato */
  const par = new URLSearchParams(location.search);
  let dati = [], q = par.get('q') || '', cat = LINEE[par.get('cat')] ? par.get('cat') : '';
  let lista = Array.isArray(store.get('hh-lista')) ? store.get('hh-lista') : [];
  const input = $('#q'), ris = $('#risultati'), conta = $('#conta'), vuoto = $('#vuoto');
  input.value = q;

  const foto = (img) => `assets/catalogo/${img}.jpg`;
  const indice = (f) => norm(f.nome + ' ' + f.punti.join(' ') + ' ' + f.var.map((v) => v.c + ' ' + v.d).join(' '));

  const filtra = () => {
    const qn = norm(q).trim(), qc = normCod(q);
    const parole = qn.split(/\s+/).filter(Boolean);
    const out = [];
    dati.forEach((f, i) => {
      if (cat && !f.cat.includes(cat)) return;
      if (!qn) { out.push({ f, i, punti: 0, hit: null }); return; }
      let punti = 0, hit = null;
      for (const v of f.var) {
        const c = normCod(v.c);
        let p = 0;
        if (qc && c === qc) p = 100; else if (qc.length >= 3 && c.startsWith(qc)) p = 60; else if (qc.length >= 3 && c.includes(qc)) p = 40;
        if (p > punti) { punti = p; hit = v.c; }
      }
      if (!punti && parole.every((p) => f._idx.includes(p))) punti = norm(f.nome).includes(parole[0]) ? 20 : 10;
      if (punti) out.push({ f, i, punti, hit });
    });
    out.sort((a, b) => b.punti - a.punti);
    return out;
  };

  const disegna = () => {
    const out = filtra();
    const nCod = out.reduce((n, r) => n + r.f.var.length, 0);
    conta.textContent = q || cat
      ? `${out.length} ${out.length === 1 ? 'famiglia' : 'famiglie'}, ${nCod} codici${cat ? ' in ' + LINEE[cat] : ''}${q ? ` per "${q}"` : ''}`
      : `Tutti i prodotti: ${out.length} famiglie, ${nCod} codici`;
    vuoto.hidden = out.length > 0;
    ris.innerHTML = out.map(({ f, i, hit }) => {
      const v0 = hit ? f.var.find((v) => v.c === hit) : f.var[0];
      const img = (v0 && v0.img) || f.img[0];
      const wh = (v0 && v0.img && v0.wh) || (f.var.find((v) => v.img === img) || {}).wh || [640, 640];
      const codici = (hit ? [hit] : f.var.slice(0, 2).map((v) => v.c)).map((c) => `<span class="targhetta">${esc(c)}</span>`).join(' ');
      const altri = f.var.length - (hit ? 1 : Math.min(2, f.var.length));
      return `<li><button class="prodotto" type="button" data-i="${i}" data-hit="${esc(hit || '')}">
        <span class="prodotto__foto${img ? '' : ' prodotto__foto--vuota'}">${img
          ? `<img src="${foto(img)}" alt="" width="${wh[0]}" height="${wh[1]}" loading="lazy" decoding="async">`
          : `<span>${esc(f.var[0].c)}</span>`}</span>
        <span class="prodotto__testo"><b>${esc(f.nome)}</b>
        <span class="prodotto__cod">${codici}${altri > 0 ? ` <small>+${altri}</small>` : ''}</span>
        <span class="prodotto__linea">${f.cat.map((c) => LINEE[c]).filter(Boolean).join(', ')}</span></span>
      </button></li>`;
    }).join('');
    const u = new URL(location.href);
    q ? u.searchParams.set('q', q) : u.searchParams.delete('q');
    cat ? u.searchParams.set('cat', cat) : u.searchParams.delete('cat');
    history.replaceState(null, '', u);
    return out;
  };

  /* scheda */
  const scheda = $('#scheda');
  const apriScheda = (i, hit) => {
    const f = dati[i];
    const imgs = f.img;
    const princ = (hit && (f.var.find((v) => v.c === hit) || {}).img) || imgs[0];
    const img = $('#schedaImg');
    if (princ) { img.src = foto(princ); img.alt = f.nome; img.parentElement.classList.remove('vuota'); }
    else { img.removeAttribute('src'); img.alt = ''; img.parentElement.classList.add('vuota'); }
    $('#schedaMini').innerHTML = imgs.length > 1 ? imgs.slice(0, 6).map((m) => `<button type="button" data-img="${esc(m)}" aria-label="Mostra un'altra foto"><img src="${foto(m)}" alt="" width="64" height="64" loading="lazy"></button>`).join('') : '';
    $('#schedaLinea').textContent = f.cat.map((c) => LINEE[c]).filter(Boolean).join(', ');
    $('#schedaNome').textContent = f.nome;
    $('#schedaPunti').innerHTML = f.punti.map((p) => `<li>${esc(p)}</li>`).join('');
    $('#schedaVar').innerHTML = f.var.map((v) => {
      const inLista = lista.some((x) => x.c === v.c);
      return `<tr class="${v.c === hit ? 'colpito' : ''}">
        <td><span class="targhetta">${esc(v.c)}</span></td>
        <td>${esc(v.d || '–')}</td>
        <td class="varianti__azioni">${v.pdf ? `<a class="varianti__pdf" href="${esc(v.pdf)}" target="_blank" rel="noopener" aria-label="Scheda tecnica ${esc(v.c)} in PDF"><svg aria-hidden="true"><use href="#i-pdf"/></svg><span>Scheda</span></a>` : ''}
        <button type="button" class="aggiungi${inLista ? ' dentro' : ''}" data-c="${esc(v.c)}" data-n="${esc(f.nome)}" data-d="${esc(v.d || '')}">${inLista ? 'In lista' : 'Aggiungi'}</button></td>
      </tr>`;
    }).join('');
    if (typeof scheda.showModal === 'function') scheda.showModal(); else scheda.setAttribute('open', '');
    scheda.scrollTop = 0;
    const colpito = $('.colpito', scheda);
    if (colpito) setTimeout(() => colpito.scrollIntoView({ block: 'nearest' }), 80);
  };
  ris.addEventListener('click', (e) => { const b = e.target.closest('.prodotto'); if (b) apriScheda(Number(b.dataset.i), b.dataset.hit); });
  $('#schedaMini').addEventListener('click', (e) => { const b = e.target.closest('[data-img]'); if (b) $('#schedaImg').src = foto(b.dataset.img); });
  $('#schedaVar').addEventListener('click', (e) => {
    const b = e.target.closest('.aggiungi'); if (!b) return;
    const c = b.dataset.c;
    if (lista.some((x) => x.c === c)) lista = lista.filter((x) => x.c !== c);
    else lista.push({ c, nome: b.dataset.n, d: b.dataset.d, n: 1 });
    b.classList.toggle('dentro'); b.textContent = b.classList.contains('dentro') ? 'In lista' : 'Aggiungi';
    salvaLista();
  });
  $$('dialog').forEach((d) => {
    d.addEventListener('click', (e) => { if (e.target === d || e.target.closest('[data-chiudi]')) d.close(); });
  });

  /* lista preventivo */
  const listaBtn = $('#listaBtn'), listaDlg = $('#lista');
  const testoLista = () => 'Buongiorno, vorrei un preventivo per questi articoli:\n' + lista.map((x) => `- ${x.c} (${x.nome}${x.d ? ', ' + x.d : ''}) x ${x.n}`).join('\n');
  const salvaLista = () => {
    store.set('hh-lista', lista);
    listaBtn.hidden = !lista.length;
    $('#listaN').textContent = lista.reduce((n, x) => n + x.n, 0);
    listaBtn.classList.remove('salta-su'); void listaBtn.offsetWidth; listaBtn.classList.add('salta-su');
    $('#listaVoci').innerHTML = lista.map((x, i) => `<li>
      <span><span class="targhetta">${esc(x.c)}</span> <b>${esc(x.nome)}</b>${x.d ? `<small>${esc(x.d)}</small>` : ''}</span>
      <span class="qta"><button type="button" data-meno="${i}" aria-label="Uno in meno">−</button><input type="number" min="1" inputmode="numeric" value="${x.n}" data-qta="${i}" aria-label="Quantità ${esc(x.c)}"><button type="button" data-piu="${i}" aria-label="Uno in più">+</button></span>
      <button type="button" class="togli" data-togli="${i}" aria-label="Togli ${esc(x.c)}">Togli</button>
    </li>`).join('') || '<li class="lista__vuota">La lista è vuota: apri un prodotto e premi "Aggiungi".</li>';
    const t = encodeURIComponent(testoLista());
    $('#listaWa').href = `https://wa.me/${TEL_WA}?text=${t}`;
    $('#listaMail').href = `mailto:${EMAIL}?subject=${encodeURIComponent('Richiesta preventivo da catalogo')}&body=${t}`;
  };
  listaBtn.addEventListener('click', () => { if (typeof listaDlg.showModal === 'function') listaDlg.showModal(); else listaDlg.setAttribute('open', ''); });
  $('#listaVoci').addEventListener('click', (e) => {
    const t = e.target;
    if (t.dataset.meno) lista[t.dataset.meno].n = Math.max(1, lista[t.dataset.meno].n - 1);
    else if (t.dataset.piu) lista[t.dataset.piu].n += 1;
    else if (t.dataset.togli) lista.splice(Number(t.dataset.togli), 1);
    else return;
    salvaLista();
  });
  $('#listaVoci').addEventListener('change', (e) => {
    const i = e.target.dataset.qta; if (i === undefined) return;
    lista[i].n = Math.max(1, parseInt(e.target.value, 10) || 1); salvaLista();
  });
  $('#listaSvuota').addEventListener('click', () => { lista = []; salvaLista(); listaDlg.close(); });
  salvaLista();
  listaBtn.classList.remove('salta-su');

  /* filtri */
  const bottoni = $$('.filtri__cat button');
  const segnaCat = () => bottoni.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.cat === cat)));
  bottoni.forEach((b) => b.addEventListener('click', () => { cat = b.dataset.cat; segnaCat(); disegna(); }));
  let attesa = 0;
  input.addEventListener('input', () => { clearTimeout(attesa); attesa = setTimeout(() => { q = input.value.trim(); disegna(); }, 120); });
  input.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter') return;
    e.preventDefault(); q = input.value.trim();
    const out = disegna();
    if (out[0] && out[0].punti >= 60) apriScheda(out[0].i, out[0].hit);
  });
  segnaCat();

  fetch('catalogo.json').then((r) => r.json()).then((d) => {
    dati = d; dati.forEach((f) => { f._idx = indice(f); });
    const out = disegna();
    if (q && out[0] && out[0].punti === 100) apriScheda(out[0].i, out[0].hit);
  }).catch(() => { conta.textContent = 'Il catalogo non si è caricato. Ricarica la pagina o chiamaci allo 0422 591 609.'; });
})();
