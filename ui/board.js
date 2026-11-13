// Páxinal Crossing · tablón de anuncios: notas persistentes en una ventana «IPaxMsg LogViewer», con
// filtros por autor, fecha y destino, notas para todo el pueblo o para un departamento, avisos en
// tiempo real y límites por persona (15 s entre notas y 20 como mucho). Copiado de Paximón.
// La pestaña «Encargos» tiene los 3 encargos del día (auditoría A04): se entregan aquí y se cobran al momento.
import { openModal, ipmHead, esc, stamp, toast, modalOpen, Sound, scaled } from './ui.js';
import { DEPTS, deptColor, DEPT_BY_ID, TOWN, ITEMS } from '../core/data.js';
import * as R from '../core/rules.js';
import { itemIcon } from '../art/granxa.js';

const EVERYONE = 'Todo o pobo';
const LS_SEEN = 'paxinal.notes.seen';

export async function boardCount(app) {
  const notes = await app.net.select('notes').catch(() => []);
  const seen = Number(localStorage.getItem(LS_SEEN + '.' + app.net.kind + '.' + app.player.id) || 0);
  const fresh = notes.filter((n) => n.id > seen && n.author !== app.player.id).length;
  return { total: notes.length, fresh };
}

export function openBoard(app) {
  if (modalOpen()) return null;
  const P = app.player, seenKey = LS_SEEN + '.' + app.net.kind + '.' + app.player.id;
  const seenBefore = Number(localStorage.getItem(seenKey) || 0);
  const deptOpts = DEPTS.map((d) => `<option value="${d.id}">${esc(d.name)}</option>`).join('');
  const mo = openModal(`${ipmHead(`IPaxMsg LogViewer — Tablón de ${TOWN}`, true)}
    <div class="ipm-tabs"><button type="button" class="ipm-tab on" data-tab="notes">Tablón <b>×</b></button><button type="button" class="ipm-tab" data-tab="orders">Encargos <span class="ord-badge" hidden></span> <b>×</b></button><span class="ipm-plus">+</span></div>
    <div class="ipm-orders" hidden></div>
    <div class="ipm-toolbar">
      <div class="ipm-tools" aria-hidden="true"><span class="ico">⤓</span><span class="ico">−</span><span class="ico">🗎</span></div>
      <select class="f-user" title="Filtrar por autor"><option value="">All Users</option></select>
      <div class="ipm-tools" aria-hidden="true"><span class="ico">✎</span></div>
      <select class="f-period" title="Filtrar por fecha"><option value="">Entire period</option><option value="1">Today</option><option value="7">Last 7 days</option><option value="30">Last 30 days</option></select>
      <div class="ipm-tools" aria-hidden="true"><span class="ico">⭐</span><span class="ico">📋</span><span class="ico">📷</span><span class="ico">📎</span><span class="ico">✉</span></div>
      <select class="f-to" title="Filtrar por destino"><option value=""></option><option value="*">${EVERYONE}</option><option value="mine">Para mi departamento</option>${deptOpts}</select>
    </div>
    <div class="ipm-log"></div>
    <form class="ipm-compose">
      <div class="row1">Para: <select class="to"><option value="">${EVERYONE}</option>${deptOpts}</select><span class="cnt">0/500</span></div>
      <div class="row2"><textarea maxlength="500" placeholder="Escribe una nota para el tablón… (Ctrl+Enter para colgarla)"></textarea><button class="ipm-btn" type="submit">Send</button></div>
    </form>
    <div class="ipm-status"><span class="st"></span><span>Las notas se quedan colgadas hasta que su autor las quite</span></div>`,
  { cls: 'ipm-modal ipm', onClose: () => { app.board = null; app.refreshBoard(); } });
  const el = mo.el, log = el.querySelector('.ipm-log');
  el.querySelector('.ipm-x').addEventListener('click', () => mo.close());
  const fUser = el.querySelector('.f-user'), fPeriod = el.querySelector('.f-period'), fTo = el.querySelector('.f-to');
  let notes = [];
  const myDept = P.dept === 'otros' ? P.house : P.dept;

  const render = () => {
    const user = fUser.value, days = Number(fPeriod.value || 0), to = fTo.value;
    const since = days ? new Date(new Date().setHours(0, 0, 0, 0) - (days - 1) * 86400000).getTime() : null;
    const list = notes.filter((n) => (!user || n.author_nick === user)
      && (!since || n.created_at >= since)
      && (!to || (to === '*' ? !n.to_dept : to === 'mine' ? n.to_dept === myDept : n.to_dept === to)));
    log.innerHTML = list.length ? '' : `<div class="ipm-empty">${notes.length ? 'No hay notas con esos filtros.' : '¡El tablón está vacío! Cuelga la primera nota.'}</div>`;
    for (const n of list) {
      const mine = n.author === P.id, forMe = n.to_dept && n.to_dept === myDept;
      const d = document.createElement('div');
      d.className = 'ipm-entry' + (mine ? ' mine' : '') + (forMe ? ' forme' : '');
      const toName = n.to_dept ? (DEPT_BY_ID[n.to_dept]?.name || n.to_dept) : EVERYONE;
      d.innerHTML = `<div class="ipm-head"><span class="t">${stamp(n.created_at)}</span>${n.id > seenBefore && !mine ? '<span class="ipm-new">NUEVA</span>' : ''}
        <span class="arr">⇦</span><span class="nm dp" style="--c:${deptColor(n.author_dept)}">${esc(n.author_nick)}</span>
        <span class="arr">⇨</span><span class="nm${n.to_dept ? ' dp' : ''}" style="--c:${deptColor(n.to_dept)}">${esc(toName)}</span>
        ${mine ? '<button type="button" class="ipm-del">Quitar</button>' : ''}</div><div class="ipm-text"></div>`;
      d.querySelector('.ipm-text').textContent = n.text;
      d.querySelector('.ipm-del')?.addEventListener('click', async () => {
        if (!confirm('¿Quitar esta nota del tablón?')) return;
        try { await app.net.rpc('delete_note', { p_secret: P.secret, p_id: n.id }); await reload(); } catch (e) { toast(e.message, 'error'); }
      });
      log.appendChild(d);
    }
    log.scrollTop = log.scrollHeight;
    el.querySelector('.st').textContent = `${list.length} de ${notes.length} ${notes.length === 1 ? 'nota' : 'notas'}`;
  };
  let timer = null;
  const reload = () => new Promise((resolve) => {
    clearTimeout(timer);
    timer = setTimeout(async () => {
      try { notes = (await app.net.select('notes')).slice().reverse(); } catch (e) { toast(e.message, 'error'); return resolve(); }
      const authors = [...new Set(notes.map((n) => n.author_nick))].sort((a, b) => a.localeCompare(b));
      const cur = fUser.value;
      fUser.innerHTML = '<option value="">All Users</option>' + authors.map((a) => `<option>${esc(a)}</option>`).join('');
      fUser.value = authors.includes(cur) ? cur : '';
      render();
      const maxId = notes.reduce((m, n) => Math.max(m, n.id), 0);
      if (maxId > Number(localStorage.getItem(seenKey) || 0)) localStorage.setItem(seenKey, String(maxId));
      resolve();
    }, 120);
  });
  for (const f of [fUser, fPeriod, fTo]) f.addEventListener('change', render);
  const form = el.querySelector('.ipm-compose'), ta = form.querySelector('textarea'), cnt = form.querySelector('.cnt');
  ta.addEventListener('input', () => { cnt.textContent = `${ta.value.length}/500`; });
  ta.addEventListener('keydown', (e) => { e.stopPropagation(); if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); form.requestSubmit(); } });
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const text = ta.value.trim();
    if (!text) return ta.focus();
    const mine = notes.filter((n) => n.author === P.id);
    if (mine.length >= 20) return toast('Ya tienes 20 notas en el tablón: quita alguna antes.', 'error');
    if (mine.some((n) => Date.now() - n.created_at < 15000)) return toast('Espera unos segundos antes de colgar otra nota.');
    const btn = form.querySelector('button'); btn.disabled = true;
    try {
      await app.net.rpc('post_note', { p_secret: P.secret, p_text: text, p_to_dept: form.querySelector('.to').value || null });
      ta.value = ''; cnt.textContent = '0/500'; Sound.play('paper');
      await reload();
    } catch (err) { toast(err.message, 'error'); }
    btn.disabled = false;
  });
  // ---------- encargos del día ----------
  const ordBox = el.querySelector('.ipm-orders'), badge = el.querySelector('.ord-badge');
  const notesEls = [el.querySelector('.ipm-toolbar'), log, form, el.querySelector('.ipm-status')];
  let day = null, orders = [], done = [], ordErr = '';
  const loadOrders = async () => {
    day = R.dayKey(app.now()); orders = R.dayOrders(day);
    // sin aviso si falla (p. ej. si el servidor aún no tiene los encargos): se dice dentro de la pestaña
    try { done = (await app.net.rpc('my_orders', { p_secret: P.secret })).map(Number); ordErr = ''; } catch (e) { done = []; ordErr = e.message; }
    renderOrders();
  };
  const renderOrders = () => {
    if (R.dayKey(app.now()) !== day) { loadOrders(); return; }
    const left = orders.filter((o) => !done.includes(o.n)).length;
    badge.hidden = !left; badge.textContent = left;
    ordBox.innerHTML = `<div class="ipm-sys">Encargos de hoy. Cambian cada día a medianoche · cada uno se entrega una vez por persona y se cobra al momento</div>`
      + (ordErr ? `<div class="ipm-sys">No se pudo comprobar qué encargos has entregado hoy (${esc(ordErr)}).</div>` : '');
    for (const o of orders) {
      const it = ITEMS[o.item], have = app.player.inventory[o.item] || 0, isDone = done.includes(o.n), ok = have >= o.qty;
      const row = document.createElement('div');
      row.className = 'ipm-entry ord' + (isDone ? ' done' : '');
      row.innerHTML = `<div class="ipm-head"><span class="nm">${esc(o.who)}</span><span class="arr">⇨</span><span class="nm">${EVERYONE}</span><span class="ord-pay">${isDone ? 'Entregado ✓' : `+${o.pay} ₧${o.gift ? ' + regalo' : ''}`}</span></div>
        <div class="ord-body"><div class="ord-ico"></div><div class="ord-txt"><div class="ipm-text"></div>
          <div class="ord-need${ok || isDone ? '' : ' short'}">Piden: <b>${o.qty} × ${esc(it.name)}</b> · tienes ${have}</div>
          <div class="ord-get">Pagan <b>${o.pay} paxetas</b> (en la caja de envíos, ${o.box})${o.gift ? ` y regalan: <b>${esc(ITEMS[o.gift].name)}</b>` : ''}</div></div>
          <button type="button" class="ipm-btn"${isDone || !ok ? ' disabled' : ''}>${isDone ? 'Entregado' : 'Entregar'}</button></div>`;
      row.querySelector('.ipm-text').textContent = `«${o.text}»`;
      row.querySelector('.ord-ico').append(scaled(itemIcon(o.item)));
      row.querySelector('button').addEventListener('click', async (e) => {
        e.currentTarget.disabled = true;
        try {
          const r = await app.net.rpc('deliver_order', { p_secret: P.secret, p_n: o.n });
          app.setPlayer(r.player); done.push(o.n); Sound.play('coins');
          toast(`Encargo entregado a ${o.who}: +${r.order.pay} paxetas${r.order.gift ? ` y ${ITEMS[r.order.gift].name} (a la mochila)` : ''}.`, 'good');
        } catch (err) { toast(err.message, 'error'); }
        renderOrders();
      });
      ordBox.append(row);
    }
  };
  const showTab = (tab) => {
    for (const b of el.querySelectorAll('.ipm-tab[data-tab]')) b.classList.toggle('on', b.dataset.tab === tab);
    for (const x of notesEls) x.hidden = tab !== 'notes';
    ordBox.hidden = tab !== 'orders';
    if (tab === 'orders') loadOrders();
  };
  for (const b of el.querySelectorAll('.ipm-tab[data-tab]')) b.addEventListener('click', () => showTab(b.dataset.tab));
  loadOrders();

  app.board = { reload };
  reload();
  return mo;
}
