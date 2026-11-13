// Páxinal Crossing · guía del primer día (auditoría A02). Seis tareas en un panel bajo el reloj que se
// tachan solas, una flecha en el mundo hacia el sitio de la que toca (game/world.js, setGuide) y su marca
// en el mapa de la M (ui/mapa.js). Se guarda por jugador en localStorage; sale sola a quien se da de alta
// y se puede volver a abrir desde Opciones.
import * as D from '../core/data.js';
import * as R from '../core/rules.js';
import { $, esc } from './ui.js';

const T = 16;
const OUTDOOR = ['vila', 'agro', 'peirao'];

export function createGuide(A, { onFinish } = {}) {
  let st = null, lastHtml = '', hideT = null;
  const key = () => `paxinal.guia.${A.net.kind}.${A.player.id}`;
  const save = () => { try { localStorage.setItem(key(), JSON.stringify(st)); } catch { /* sin almacenamiento: dura lo que la pestaña */ } };
  const el = () => $('#guide');

  // ---------- dónde está cada cosa ----------
  const home = () => A.player.house;
  const field = () => (A.maps.agro.fields || []).find((f) => f.dept === home());
  const fieldPt = () => { const f = field(); return f && { map: 'agro', x: f.x + f.w / 2, y: f.y + f.h / 2, label: 'Tu leira' }; };
  const shipPt = () => { const s = (A.maps.agro.spots || []).find((q) => q.action === 'ship' && q.dept === home()); return s && { map: 'agro', x: s.x + 0.5, y: s.y + 0.5, label: 'Tu caja de envíos' }; };
  const cafeOpen = () => R.inHours(R.hourOf(A.now()), D.CAFE_HOURS);
  const cafePt = () => {
    const id = cafeOpen() ? 'cafe' : 'bonsai', s = (A.maps[id].spots || []).find((q) => /^shop/.test(q.action));
    return { map: id, x: s.x + (s.w || 1) / 2, y: s.y + 1.2, label: id === 'cafe' ? 'Cafetería' : 'Café Bonsai' };
  };
  const rainy = () => R.rainy(R.dayKey(A.now()));
  const keyOf = (pred) => { const i = A.slots.findIndex(pred); return i < 0 ? '' : String((i + 1) % 10); };
  const seedKey = () => keyOf((id) => D.ITEMS[id]?.kind === 'seed');

  const TASKS = [
    { id: 'agro', text: () => 'Cruza el paso a nivel hasta O Agro', where: () => ({ map: 'agro', x: 46, y: A.maps.agro.spawn.y + 0.5, label: 'O Agro' }) },
    { id: 'leira', text: () => (st.gift ? 'Entra en tu leira y cosecha lo que dejó el vecino' : `Entra en tu leira (la de ${D.deptName(home())})`), where: fieldPt },
    { id: 'arar', text: () => `Ara una casilla de hierba de tu leira (${keyOf((id) => id === 'azada') || 1} y Espacio)`, where: fieldPt },
    { id: 'plantar', text: () => (rainy() ? `Planta unas semillas (${seedKey() || 4}); hoy riega la lluvia` : `Planta (${seedKey() || 4}) y riega (${keyOf((id) => id === 'regadera') || 2})`), where: fieldPt },
    { id: 'caja', text: () => 'Mete algo en la caja de envíos', where: shipPt },
    { id: 'cafe', text: () => (cafeOpen() ? 'Tómate un café en la cafetería de Diego y Sabrina' : 'Tómate un café (de noche, en el Café Bonsai)'), where: cafePt },
  ];
  const current = () => (st && !st.finished ? TASKS.find((t) => !st.done[t.id]) : null);

  // ---------- el camino: por qué puerta o salida se va hacia otro mapa ----------
  function links(id) {
    const J = A.maps[id.startsWith('casa:') ? 'casa' : id];
    if (!J) return [];
    const out = (J.exits || []).map((e) => ({ to: e.to, x: e.x + (e.w || 1) / 2, y: e.y + (e.h || 1) / 2 }));
    for (const d of J.doors || []) if (d.to) out.push({ to: d.to, x: d.x + (d.w || 1) / 2, y: d.y + 0.5 });
    return out;
  }
  function firstHop(from, to) {
    const seen = new Set([from]), q = links(from).map((l) => ({ l, at: l.to }));
    for (let i = 0; i < q.length; i++) {
      if (q[i].at === to) return q[i].l;
      if (seen.has(q[i].at)) continue;
      seen.add(q[i].at);
      for (const n of links(q[i].at)) q.push({ l: q[i].l, at: n.to });
    }
    return null;
  }

  // ---------- comprobar lo que se ve desde el mundo (mapa, dónde estás) ----------
  function inMyField() {
    const w = A.world, me = w?.me; if (!me || w.map.base !== 'agro') return false;
    const f = w.facing(), here = w.fieldAt(Math.floor(me.x / T), Math.floor((me.y - 2) / T)), ahead = w.fieldAt(f.tx, f.ty);
    return here?.dept === home() || ahead?.dept === home();
  }
  function readyInMyField() { for (const p of A.plots.values()) if (p.house === home() && p.crop && R.plotView(p, A.now()).ready) return true; return false; }
  function tick(id) { if (!st || st.done[id]) return; st.done[id] = true; save(); }
  function check() {
    if (!st || st.finished) return;
    const base = A.world?.map?.base;
    if (base === 'agro' || base === 'casa') tick('agro');
    if (inMyField() && (!st.gift || !readyInMyField())) tick('leira');
    if (st.plant && (st.water || rainy())) tick('plantar');
    if (TASKS.every((t) => st.done[t.id])) {
      st.finished = true; save();
      onFinish?.();
      clearTimeout(hideT); hideT = setTimeout(() => { if (st?.finished) { st.hidden = true; save(); render(); } }, 12000);
    }
  }

  // ---------- el panel ----------
  function render() {
    const box = el(); if (!box) return;
    if (!st || st.hidden || !A.world?.map) { box.hidden = true; lastHtml = ''; return; }
    const cur = current(), n = TASKS.filter((t) => st.done[t.id]).length;
    const html = `<div class="g-head"><b>Tu primer día</b><span class="g-n">${n}/${TASKS.length}</span><button type="button" class="g-x" title="Ocultar la guía (se vuelve a abrir en ⚙️ Opciones)" aria-label="Ocultar la guía">✕</button></div>
      <ol class="g-list">${TASKS.map((t) => `<li class="${st.done[t.id] ? 'done' : t === cur ? 'cur' : ''}">${esc(t.text())}</li>`).join('')}</ol>
      ${st.finished ? '<p class="g-end">¡Enhorabuena! Ya sabes lo básico. Mañana a las 7:00, a cobrar.</p>' : '<p class="g-tip">Sigue la flecha amarilla · M: mapa</p>'}`;
    if (html !== lastHtml) {
      box.innerHTML = html; lastHtml = html;
      box.querySelector('.g-x').onclick = () => { st.hidden = true; save(); render(); A.world?.setGuide(null); };
    }
    box.hidden = false;
    const place = $('#hud-place')?.getBoundingClientRect();
    if (place) box.style.top = `${Math.round(place.bottom + 8)}px`;
  }

  // ---------- la flecha: el sitio de la tarea que toca, o la puerta o salida que lleva hacia él ----------
  function arrowPoint() {
    const cur = current(), w = A.world;
    if (!cur || st.hidden || !w?.map) return null;
    const goal = cur.where(); if (!goal) return null;
    const here = w.map.id;
    if (cur.id === 'agro' && here === 'agro') return null;
    const p = here === goal.map ? goal : firstHop(here, goal.map);
    return p ? { x: p.x * T, y: p.y * T } : null;
  }

  return {
    // al entrar: a quien se acaba de dar de alta se le abre una guía nueva; a los demás, la que tuvieran
    start(first, gift) {
      clearTimeout(hideT);
      try { st = JSON.parse(localStorage.getItem(key()) || 'null'); } catch { st = null; }
      if (first || st) st = first ? { done: {}, gift: !!gift, plant: false, water: false, hidden: false, finished: false } : st;
      if (st) save();
      lastHtml = ''; render();
    },
    // lo que hace el jugador (después de que el servidor diga que sí)
    event(kind, info = {}) {
      if (!st || st.finished) return;
      if (kind === 'farm' && info.house === home()) {
        if (info.action === 'harvest') tick('leira');
        if (info.action === 'till') tick('arar');
        if (info.action === 'plant') { st.plant = true; save(); }
      }
      if (kind === 'farm' && info.action === 'water') { st.water = true; save(); }
      if (kind === 'ship') tick('caja');
      if ((kind === 'drink' || kind === 'buy') && D.ITEMS[info.item]?.kind === 'drink' && ['cafe', 'bonsai'].includes(A.world?.map?.id)) tick('cafe');
      check(); render();
    },
    // cada cuarto de segundo, desde el marcador
    tick() { if (!A.player) return; check(); render(); A.world?.setGuide?.(arrowPoint()); },
    // volver a enseñarla (Opciones): si no había, empieza una
    show() {
      if (!st) st = { done: {}, gift: false, plant: false, water: false, hidden: false, finished: false };
      st.hidden = false; save(); lastHtml = ''; render();
    },
    // para el mapa de la M: dónde está la tarea que toca, en uno de los mapas de fuera
    mapTarget() {
      const cur = current(); if (!cur || st.hidden) return null;
      const g = cur.where(); if (!g) return null;
      if (OUTDOOR.includes(g.map)) return { id: g.map, x: g.x, y: g.y, label: g.label };
      for (const id of OUTDOOR) {
        const d = (A.maps[id].doors || []).find((q) => q.to === g.map);
        if (d) return { id, x: d.x + (d.w || 1) / 2, y: d.y + 0.5, label: g.label };
      }
      return null;
    },
  };
}
