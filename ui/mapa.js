// Páxinal Crossing · mapa del pueblo (tecla M). O Agro, A Vila y el peirao vistos desde arriba, unidos
// por donde se pasa de uno a otro, con quién está conectado y dónde, en tiempo real. Se dibuja con los
// mismos datos de los mapas (casillas y objetos), así que si cambia un mapa, cambia el plano.
import * as D from '../core/data.js';
import { openModal, esc } from './ui.js';
import { shade } from '../art/paximon/avatar.js';

const S = 6;                                                        // píxeles por casilla
const LAYOUT = { agro: [-5, -64], vila: [0, 0], peirao: [-56, 19] };   // esquina de cada mapa, en casillas de A Vila
const MINX = -56, MINY = -64, WT = 145, HT = 120;
const GROUND = {
  grass: '#8DBA5E', flowers: '#97C066', path: '#DCC48F', plaza: '#CFC8BA', sand: '#EDDCAA', water: '#5AA5DA', wood: '#A07D57',
  asphalt: '#6E7078', parking: '#7E8088', bay: '#7E8088', zebra_h: '#A4A6AC', zebra_v: '#A4A6AC', platform: '#C2BBAE',
  ballast: '#8F867B', rail_t: '#6B5A4A', rail_b: '#6B5A4A', xing_g: '#A4A6AC', xing_t: '#A4A6AC', xing_b: '#A4A6AC',
};
const ROOF = { cafe: '#B5533A', paxinas: '#C8463A', station: '#5E6879', lonxa: '#5E6879', kiosko: '#2E7D32', almacen: '#5E6879' };
const LABELS = {
  vila: [['Estación', 63.5, 11.4], ['Praza da Fonte', 29.5, 24.4], ['Cafetería', 24, 12.2], ['Páxinas', 35.5, 12.2], ['Barrio do Carme', 9.5, 20.4],
    ['Parque da Concha', 14, 35.4], ['Concello', 47.5, 29.4], ['Bares', 54, 39.4], ['Café Bonsai', 77.5, 39.4], ['Praia da Concha', 22, 50], ['Parking', 62.5, 21.6]],
  agro: [['Cooperativa', 51.5, 56.6], ['O rego', 70, 18.4]],
  peirao: [['Lonxa', 47, 16.6], ['Peirao do Ramal', 20, 26.2]],
};
const BIG = [['O AGRO', 45, -61.6], ['A VILA', 62, 2.4], ['PEIRAO E LONXA', -28, 21.6]];
const ZONES = {
  vila: [[0, 0, 83, 8, 'junto a la vía'], [43, 9, 83, 18, 'en la estación'], [43, 19, 71, 25, 'en el parking da estación'], [72, 19, 83, 25, 'en el prado da estación'], [39, 9, 42, 28, 'en la calle de la estación'],
    [20, 10, 38, 25, 'en la Praza da Fonte'], [0, 10, 19, 25, 'en el barrio do Carme'], [0, 26, 83, 29, 'en la avenida'], [0, 30, 38, 45, 'en el parque da Concha'],
    [39, 30, 42, 45, 'en la rúa da Praia'], [43, 30, 83, 38, 'en la rúa do Concello'], [43, 39, 83, 45, 'en los bares del paseo'], [0, 46, 83, 47, 'en el paseo marítimo'], [0, 48, 83, 55, 'en la playa']],
  peirao: [[38, 14, 55, 35, 'en el muelle de la lonxa'], [0, 0, 55, 35, 'en el peirao']],
};

const X = (id, x) => (x + LAYOUT[id][0] - MINX) * S, Y = (id, y) => (y + LAYOUT[id][1] - MINY) * S;
function dot(g, x, y, r, c, edge) { g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fillStyle = c; g.fill(); if (edge) { g.lineWidth = 1; g.strokeStyle = edge; g.stroke(); } }
function roof(g, x, y, w, h, c) {
  g.fillStyle = '#2B2230'; g.fillRect(x - 1, y - 1, w + 2, h + 2);
  g.fillStyle = shade(c, -0.12); g.fillRect(x, y, w, h);
  g.fillStyle = shade(c, 0.12); g.fillRect(x, y, w, Math.round(h * 0.45));
  g.fillStyle = 'rgba(0,0,0,.28)'; g.fillRect(x + 1, y + Math.round(h * 0.45), w - 2, 1);
}
function label(g, s, x, y, size = 12, color = '#FFFFFF') {
  g.font = `600 ${size}px "Pixelify Sans", monospace`; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.lineJoin = 'round'; g.lineWidth = size > 14 ? 5 : 3.5; g.strokeStyle = '#2B2230'; g.strokeText(s, x, y);
  g.fillStyle = color; g.fillText(s, x, y);
}
function drawObj(g, id, o) {
  const x = X(id, o.x), y = Y(id, o.y), w = (o.fw || o.w || 1) * S, h = (o.fh || o.h || 1) * S;
  switch (o.t) {
    case 'tree': dot(g, x + S / 2, y + S / 2 - 3, S * 0.8, o.k === 'pineiro' ? '#2D6A3C' : o.k === 'castineiro' ? '#5C7F2E' : '#3E803A', '#1E3A26'); break;
    case 'px':
      if (o.o.kind === 'bush') dot(g, x + S / 2, y + S / 2, S * 0.4, '#4E9A4E');
      else if (o.o.kind === 'boat') { g.fillStyle = o.o.variant || '#FFFFFF'; g.fillRect(x + 2, y + 2, w - 4, S - 3); }
      else if (o.o.kind === 'terrace') dot(g, x + S / 2, y + S / 2, S * 0.35, '#F3E3C3');
      break;
    case 'fence': g.fillStyle = '#7A5530'; g.fillRect(x, y + S / 2 - 1, S, 2); break;
    case 'fence_v': g.fillStyle = '#7A5530'; g.fillRect(x + S / 2 - 1, y, 2, S); break;
    case 'car': g.fillStyle = o.color; g.fillRect(x + 2, y + 1, w - 4, S - 2); break;
    case 'house': roof(g, x, y, w, h, D.deptColor(o.dept)); break;
    case 'edificio': case 'building': roof(g, x, y, w, h, o.color || '#B5533A'); break;
    case 'cafe': case 'paxinas': case 'station': case 'almacen': case 'kiosko': case 'lonxa': roof(g, x, y, w, h, ROOF[o.t]); break;
    case 'horreo': g.fillStyle = '#B98A52'; g.fillRect(x, y + 1, w, S - 2); break;
    case 'fountain': dot(g, x + S, y + S, S * 0.9, '#8DD0F6', '#7B7469'); break;
    case 'shipbox': case 'trough': g.fillStyle = '#8B5A2B'; g.fillRect(x + 1, y + 1, S - 2, S - 2); break;
    case 'batea': g.fillStyle = '#8C6A45'; g.fillRect(x, y + 1, w, S - 2); break;
    default:
  }
}
let baseCv = null;
function drawBase(A) {
  const cv = document.createElement('canvas'); cv.width = WT * S; cv.height = HT * S;
  const g = cv.getContext('2d');
  g.fillStyle = '#4F93C9'; g.fillRect(0, 0, cv.width, cv.height);   // la ría
  for (const id of Object.keys(LAYOUT)) {
    const J = A.maps[id];
    J.rows.forEach((row, y) => { for (let x = 0; x < row.length; x++) { g.fillStyle = GROUND[J.legend[row[x]]] || GROUND.grass; g.fillRect(X(id, x), Y(id, y), S, S); } });
    for (const f of J.fields || []) {
      g.fillStyle = '#9A6A43'; g.fillRect(X(id, f.x), Y(id, f.y), f.w * S, f.h * S);
      g.fillStyle = '#7A4E2E'; for (let r = 0; r < f.h; r++) g.fillRect(X(id, f.x), Y(id, f.y + r) + S - 2, f.w * S, 1);
    }
    for (const o of J.objects) if (o.t !== 'tree') drawObj(g, id, o);
    for (const o of J.objects) if (o.t === 'tree') drawObj(g, id, o);
    for (const [s, x, y] of LABELS[id] || []) label(g, s, X(id, x), Y(id, y), 12);
    for (const h of J.houses || []) label(g, D.DEPT_BY_ID[h.dept]?.short || h.dept, X(id, h.x + 2.5), Y(id, h.y + h.h + 0.75), 10, shade(D.deptColor(h.dept), 0.55));
  }
  for (const [s, x, y] of BIG) label(g, s, (x - MINX) * S, (y - MINY) * S, 22, '#FFD36B');
  return cv;
}

// dónde está alguien: casilla en el plano y una frase («en la Praza da Fonte», «dentro de la cafetería»…)
function placeOf(A, map, px, py) {
  if (!map) return null;
  if (LAYOUT[map]) {
    const tx = px / 16, ty = py / 16;
    return { id: map, x: tx, y: ty, txt: zoneName(A, map, tx, ty) };
  }
  for (const id of Object.keys(LAYOUT)) {
    const d = (A.maps[id].doors || []).find((q) => q.to === map);
    if (d) {
      const txt = map.startsWith('casa:') ? `en la casa de ${D.deptName(map.slice(5))}` : `dentro de ${{ cafe: 'la cafetería', bonsai: 'el Café Bonsai', lonxa: 'la lonxa' }[map] || 'un edificio'}`;
      return { id, x: d.x + (d.w || 1) / 2, y: d.y + 0.6, txt, inside: true };
    }
  }
  return null;
}
function zoneName(A, map, tx, ty) {
  if (map === 'agro') {
    const h = (A.maps.agro.houses || []).find((q) => tx >= q.x - 1 && tx < q.x + 20 && ty >= q.y - 7 && ty < q.y + 9);
    if (h) return `en la leira de ${D.deptName(h.dept)}`;
    if (tx >= 47 && tx <= 56 && ty >= 55) return 'en la cooperativa';
    if (ty >= 16 && ty <= 23) return 'junto al rego';
    return 'en O Agro';
  }
  const z = (ZONES[map] || []).find(([x0, y0, x1, y1]) => tx >= x0 && tx < x1 + 1 && ty >= y0 && ty < y1 + 1);
  return z ? z[4] : '';
}
function people(A) {
  const out = [];
  const me = A.world?.me, myMap = A.world?.map?.id;
  if (me && myMap) out.push({ id: A.player.id, me: true, name: A.player.nickname, dept: A.player.dept, at: placeOf(A, myMap, me.x, me.y) });
  for (const [id, m] of A.online) {
    const pos = A.remotePos.get(id);
    let at = pos ? placeOf(A, pos.map, pos.x, pos.y) : null;
    if (!at && m.map) {   // aún no se ha movido: en la llegada de su mapa
      const J = A.maps[m.map.startsWith('casa:') ? 'casa' : m.map];
      at = LAYOUT[m.map] && J?.spawn ? placeOf(A, m.map, J.spawn.x * 16 + 8, J.spawn.y * 16 + 8) : placeOf(A, m.map, 0, 0);
    }
    out.push({ id, name: m.nickname, dept: m.dept, at });
  }
  return out;
}

export function openMapa(A) {
  if (document.querySelector('.mapa-modal')) return;
  baseCv ||= drawBase(A);
  const mo = openModal(`
    <h2>Mapa de Paximiña de Arousa</h2>
    <p class="lead">Quién está conectado y dónde, en directo. <span class="mapa-keys">M o Esc para cerrar</span></p>
    <div class="mapa-wrap"><div class="mapa-cv"><canvas width="${baseCv.width}" height="${baseCv.height}"></canvas></div>
      <aside class="mapa-side"><h3>Conectados <b class="mapa-n"></b></h3><ul class="mapa-list"></ul></aside></div>`,
  { cls: 'mapa-modal', onClose: () => { clearInterval(timer); removeEventListener('keydown', onKey, true); } });
  const cv = mo.el.querySelector('canvas'), g = cv.getContext('2d'), list = mo.el.querySelector('.mapa-list');
  let focus = null, focusT = 0, lastList = '';
  const onKey = (e) => { if (e.key.toLowerCase() === 'm' && !e.repeat) { e.preventDefault(); e.stopPropagation(); mo.close(); } };
  addEventListener('keydown', onKey, true);
  list.addEventListener('click', (e) => { const li = e.target.closest('li[data-id]'); if (li) { focus = li.dataset.id; focusT = performance.now(); } });
  const draw = () => {
    const t = performance.now(), ps = people(A);
    g.drawImage(baseCv, 0, 0);
    // la tarea que toca de la guía del primer día (ui/guia.js), con su marca amarilla
    const goal = A.guide?.mapTarget?.();
    if (goal && LAYOUT[goal.id]) {
      const x = X(goal.id, goal.x), y = Y(goal.id, goal.y), k = (t / 700) % 1;
      g.beginPath(); g.arc(x, y, 9 + 10 * k, 0, Math.PI * 2); g.lineWidth = 3; g.strokeStyle = `rgba(255,211,107,${1 - k})`; g.stroke();
      g.beginPath(); g.moveTo(x, y - 8); g.lineTo(x + 7, y); g.lineTo(x, y + 8); g.lineTo(x - 7, y); g.closePath();
      g.fillStyle = '#FFD36B'; g.fill(); g.lineWidth = 2; g.strokeStyle = '#2B2230'; g.stroke();
      label(g, 'Tarea: ' + goal.label, x, y - 19, 13, '#FFD36B');
    }
    const stack = new Map();
    const placed = ps.filter((p) => p.at).sort((a, b) => (a.me ? 1 : 0) - (b.me ? 1 : 0));
    for (const p of placed) {
      const x = X(p.at.id, p.at.x), y = Y(p.at.id, p.at.y), key = Math.round(x / 10) + ',' + Math.round(y / 10), k = stack.get(key) || 0;
      stack.set(key, k + 1);
      const col = D.deptColor(p.dept);
      if (p.me || (focus === p.id && t - focusT < 3000)) { const r = 9 + 5 * ((t / 600) % 1); g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.lineWidth = 2; g.strokeStyle = `rgba(255,255,255,${1 - ((t / 600) % 1)})`; g.stroke(); }
      dot(g, x, y, p.me ? 6 : 5, col, '#FFFFFF');
      g.lineWidth = 2; g.strokeStyle = '#2B2230'; g.beginPath(); g.arc(x, y, p.me ? 7 : 6, 0, Math.PI * 2); g.stroke();
      const tag = (p.me ? 'Tú' : p.name) + (p.at.inside ? ' (dentro)' : '');
      g.font = '600 12px "Pixelify Sans", monospace';
      const tw = g.measureText(tag).width + 10, up = y - 20 - k * 17, ty = up < 10 ? y + 20 + k * 17 : up;
      g.fillStyle = 'rgba(30,24,40,.86)'; g.fillRect(Math.round(x - tw / 2), Math.round(ty - 8), Math.round(tw), 16);
      g.fillStyle = col; g.fillRect(Math.round(x - tw / 2), Math.round(ty - 8), 3, 16);
      g.fillStyle = '#FFFFFF'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(tag, Math.round(x + 1), Math.round(ty));
    }
    const html = ps.map((p) => `<li data-id="${esc(p.id)}"><i style="background:${D.deptColor(p.dept)}"></i><b>${esc(p.me ? `${p.name} (tú)` : p.name)}</b><span>${esc(D.DEPT_BY_ID[p.dept]?.name || '')}</span><em>${esc(p.at?.txt || 'en algún sitio')}</em></li>`).join('');
    if (html !== lastList) { list.innerHTML = html; lastList = html; mo.el.querySelector('.mapa-n').textContent = `(${ps.length})`; }
  };
  draw();
  const timer = setInterval(draw, 120);
  return mo;
}
