// Páxinal Crossing · Albacete: arcos (Pasaje de Lodares y Puerta de Hierros de la Feria), la catedral,
// el templete del recinto ferial, el monumento al cuchillero, la nevera de la casa de Alejandro y los
// iconos de las navajas, las provisiones y el botín. Con las piezas y los colores de Paximón.
import { Pix, T, OUT, WOOD, GLASS, GRANITE, groundShadow, trapezoidRoof, doorAt, stoneBlocks } from './paximon/townart.js';
import { text, textW } from './paximon/worldart.js';
import { shade } from './paximon/avatar.js';

const toTex = (p, top, extra = {}) => ({ cv: p.toCanvas(), top, w: p.w, h: p.h, ...extra });
function line(p, x0, y0, x1, y1, c) {
  const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) || 1;
  for (let i = 0; i <= n; i++) p.px(Math.round(x0 + ((x1 - x0) * i) / n), Math.round(y0 + ((y1 - y0) * i) / n), c);
}
function plaque(p, cx, y, label, bg, ink = '#FFF3D6') {
  const bw = textW(label) + 8, bx = Math.round(cx - bw / 2);
  p.rect(bx - 1, y - 1, bw + 2, 11, OUT); p.rect(bx, y, bw, 9, bg);
  p.hline(bx, bx + bw - 1, y, shade(bg, 0.2)); p.hline(bx, bx + bw - 1, y + 8, shade(bg, -0.3));
  text(p, bx + 4, y + 2, label, ink);
}

// Arco de w casillas de ancho y una de fondo: dos pilares (los únicos que cortan el paso) y el dintel con
// su rótulo, por debajo del que se pasa. style: 'lodares' (piedra crema, vidriera y faroles) o 'feria'
// (la Puerta de Hierros: blanca, con dos torrecillas de teja y la verja abierta).
export function arco(o) {
  const w = o.w || 4, W = w * T, top = 48, H = top + T, feria = o.style === 'feria';
  const C = feria ? { base: '#F6F3EA', hi: '#FFFFFF', sh: '#D8D2C2', dk: '#B4AD9A', plq: '#8E1B1B' } : { base: '#E9DAB4', hi: '#F7EDD2', sh: '#CBB98C', dk: '#A39064', plq: '#5D4037' };
  const EX = 12, p = new Pix(W, H + EX), points = []; p.oy = EX;   // 12 px de margen arriba para las torrecillas
  const pillar = (x0) => {
    p.rect(x0, 30, 12, H - 31, C.base); p.vline(x0, 30, H - 2, C.hi); p.vline(x0 + 1, 30, H - 2, C.hi);
    p.vline(x0 + 10, 30, H - 2, C.sh); p.vline(x0 + 11, 30, H - 2, C.dk);
    p.rect(x0 - 1, H - 5, 14, 4, C.sh); p.hline(x0 - 1, x0 + 12, H - 5, C.hi); p.hline(x0 - 1, x0 + 12, H - 2, C.dk);
    p.rect(x0 - 1, 29, 14, 3, C.sh); p.hline(x0 - 1, x0 + 12, 29, C.hi);
    for (let y = 38; y < H - 7; y += 7) p.hline(x0 + 2, x0 + 9, y, C.sh);
  };
  pillar(2); pillar(W - 14);
  // dintel
  p.rect(0, 14, W, 15, C.base); p.hline(0, W - 1, 14, C.hi); p.hline(0, W - 1, 15, C.hi); p.hline(0, W - 1, 27, C.sh); p.hline(0, W - 1, 28, C.dk);
  p.rect(0, 11, W, 3, C.sh); p.hline(0, W - 1, 11, C.hi);
  // cartelas en las esquinas del hueco
  for (let i = 0; i < 6; i++) { p.hline(14, 14 + 5 - i, 29 + i, C.sh); p.hline(W - 15 - 5 + i, W - 15, 29 + i, C.sh); }
  if (feria) {
    // torrecillas con tejado de teja y banderín
    for (const x0 of [1, W - 15]) {
      p.rect(x0 + 1, 2, 12, 9, C.base); p.vline(x0 + 1, 2, 10, C.hi); p.vline(x0 + 12, 2, 10, C.dk);
      p.rect(x0 + 5, 5, 4, 5, '#3A3A48'); p.hline(x0 + 5, x0 + 8, 5, '#6B6B7E');
      for (let i = 0; i < 7; i++) p.hline(x0 + i, x0 + 13 - i, 1 - i, i % 2 ? '#B5533A' : '#C8643A');
      p.vline(x0 + 7, -11, -6, '#3A3A48'); p.rect(x0 + 8, -11, 4, 3, '#C62828');
    }
    // verja de hierro abierta, pegada a cada pilar
    for (const x0 of [14, W - 19]) for (let i = 0; i < 5; i += 2) { p.vline(x0 + i, 34, H - 3, '#2B2B33'); p.px(x0 + i, 33, '#E0B43A'); }
    p.hline(14, 18, 40, '#2B2B33'); p.hline(W - 19, W - 15, 40, '#2B2B33');
  } else {
    // vidriera de hierro y cristal bajo el dintel, y dos faroles
    for (let x = 15; x < W - 15; x += 5) { p.rect(x, 29, 4, 5, GLASS.base); p.hline(x, x + 3, 29, GLASS.light || '#DFF3FF'); }
    p.hline(14, W - 15, 34, '#3A3A48');
    for (const x of [Math.round(W * 0.33), Math.round(W * 0.67)]) { p.vline(x, 35, 37, '#3A3A48'); p.rect(x - 1, 38, 3, 4, '#FFE7A8'); p.hline(x - 1, x + 1, 38, '#3A3A48'); points.push([x, 40]); }
    for (const x0 of [3, W - 13]) { p.rect(x0 + 3, 0, 4, 11, C.sh); p.hline(x0 + 2, x0 + 7, 0, C.hi); p.ellipse(x0 + 5, -3, 2.5, 2.5, C.base); }
  }
  plaque(p, W / 2, 16, o.label || '', C.plq);
  p.oy = 0; p.outline(OUT);
  return toTex(p, top + EX, { points: points.map(([x, y]) => [x, y + EX]) });
}

// Catedral de San Juan (w×h casillas): fachada de piedra, torre con campanario a la izquierda, rosetón y
// portada en arco. door: columna de la puerta.
export function catedral(o) {
  const w = o.w || 9, h = o.h || 6, W = w * T, H = h * T, top = 46, tw = 34;
  const p = new Pix(W, H + top); p.oy = top;
  const lights = [], L = (x, y, ww, hh) => lights.push([x, y + top, ww, hh]);
  // nave
  stoneBlocks(p, tw - 2, 20, W - tw - 1, H - 20, 71);
  trapezoidRoof(p, tw - 6, -6, W - tw + 6, 28, '#8E5A3C', { inset: 5 });
  // torre
  stoneBlocks(p, 3, -22, tw - 4, H + 22, 72);
  p.vline(3, -22, H - 1, OUT); p.vline(tw - 2, -22, 20, OUT);
  for (const x of [8, 20]) { p.rect(x, -14, 7, 13, '#2A2530'); p.ellipse(x + 3.5, -14, 3.5, 3, '#2A2530'); p.rect(x + 2, -8, 3, 5, '#C9A227'); L(x + 1, -13, 5, 11); }
  p.rect(1, -26, tw, 4, GRANITE.light); p.hline(1, tw, -23, GRANITE.dark);
  for (let i = 0; i < 16; i++) p.hline(3 + i, tw - 2 - i, -27 - i, i % 3 ? '#5E6879' : '#75809A');
  p.vline(Math.round(tw / 2) + 1, -46, -43, '#C9A227'); p.hline(Math.round(tw / 2) - 1, Math.round(tw / 2) + 3, -45, '#C9A227');
  p.rect(9, 12, 6, 12, '#2A2530'); p.ellipse(12, 12, 3, 3, '#2A2530'); L(10, 12, 4, 10);
  p.rect(21, 12, 6, 12, '#2A2530'); p.ellipse(24, 12, 3, 3, '#2A2530'); L(22, 12, 4, 10);
  // rosetón y portada
  const cx = Math.round(tw + (W - tw) / 2) - 1;
  p.ellipse(cx, 36, 9, 9, GRANITE.dark); p.ellipse(cx, 36, 7, 7, '#3F51B5'); p.ellipse(cx, 36, 3, 3, '#FFC107');
  for (const [a, b] of [[-5, 0], [5, 0], [0, -5], [0, 5]]) p.px(cx + a, 36 + b, '#E53935');
  L(cx - 6, 30, 12, 12);
  const dw = 18, dx = Math.round((o.door ?? Math.floor((tw / T) + (w - tw / T) / 2)) * T + (T - dw) / 2);
  p.rect(dx - 4, H - 30, dw + 8, 30, GRANITE.light); p.ellipse(dx + dw / 2, H - 30, dw / 2 + 4, 7, GRANITE.light);
  doorAt(p, dx, H - 27, dw, 26, { color: '#5D2E22', arch: true });
  for (const x of [tw + 4, W - 14]) { p.rect(x, 40, 7, 18, '#2A2530'); p.ellipse(x + 3.5, 40, 3.5, 3, '#2A2530'); p.rect(x + 1, 42, 5, 15, '#7986CB'); p.vline(x + 3, 40, 57, '#2A2530'); L(x + 1, 40, 5, 17); }
  p.vline(W - 3, 20, H - 1, OUT); p.hline(3, W - 3, H - 1, OUT);
  p.oy = 0; p.outline(OUT);
  return toTex(p, top, { lights });
}

// Templete de la Feria (3×2): quiosco de música con cubierta de cinc y barandilla
export function templete() {
  const W = 48, top = 30, p = new Pix(W, 32 + top); p.oy = top;
  p.rect(4, 22, 40, 9, '#C9BFA8'); p.hline(4, 43, 22, '#E6DECB'); p.hline(4, 43, 30, '#9E9482');
  for (const x of [6, 17, 29, 40]) { p.rect(x, -4, 2, 26, '#3F5D4A'); p.vline(x, -4, 21, '#5E8169'); }
  for (let x = 8; x < 40; x += 3) p.vline(x, 14, 21, '#3F5D4A');
  p.hline(6, 41, 13, '#3F5D4A');
  for (let i = 0; i < 12; i++) p.hline(2 + i * 2, W - 3 - i * 2, -5 - i, i % 2 ? '#7C8C99' : '#93A4B2');
  p.rect(0, -5, W, 2, '#5C6B79');
  p.vline(24, -24, -18, '#3A3A48'); p.rect(25, -24, 5, 3, '#C62828');
  p.oy = 0; p.outline(OUT);
  groundShadow(p, 24, 31 + top, 22, 1.4);
  return toTex(p, top, { points: [[24, top + 6]] });
}

// Monumento al cuchillero (plaza del Altozano): el vendedor de navajas, con su faja llena, en bronce
export function cuchillero() {
  const p = new Pix(16, 40), top = 24; p.oy = top;
  p.rect(2, 6, 12, 9, GRANITE.base); p.hline(2, 13, 6, GRANITE.light); p.vline(13, 6, 14, GRANITE.dark); p.rect(1, 13, 14, 2, GRANITE.dark);
  const B = '#7A5C2E', BL = '#A8843F', BD = '#4E3A1C';
  p.rect(5, -10, 6, 11, B); p.vline(5, -10, 0, BL); p.vline(10, -10, 0, BD);
  p.ellipse(8, -14, 3, 3, B); p.px(7, -15, BL); p.rect(4, -18, 8, 2, BD); p.rect(5, -20, 6, 2, BD);
  p.rect(5, 1, 2, 5, B); p.rect(9, 1, 2, 5, BD);
  p.rect(4, -3, 8, 2, BD);
  for (const x of [5, 7, 9]) { p.vline(x, -6, -3, '#C8CED6'); p.px(x, -2, '#E0B43A'); }
  line(p, 11, -8, 14, -13, B); p.vline(14, -18, -14, '#C8CED6'); p.px(14, -19, '#FFFFFF');
  p.oy = 0; p.outline(OUT);
  groundShadow(p, 8, 39, 7, 1.2);
  return toTex(p, top);
}

// Nevera y despensa de la casa de Alejandro (2×1): nevera con imanes y estantería con botes y un queso
export function despensa() {
  const p = new Pix(32, 34), top = 18; p.oy = top;
  p.rect(1, -14, 13, 29, '#ECEFF1'); p.vline(1, -14, 14, '#FFFFFF'); p.vline(13, -14, 14, '#B0BEC5'); p.hline(1, 13, -3, '#90A4AE');
  p.vline(11, -11, -6, '#78909C'); p.vline(11, 0, 6, '#78909C');
  p.rect(3, -11, 2, 2, '#E53935'); p.rect(6, -9, 3, 2, '#FDD835'); p.rect(4, 2, 4, 3, '#FFFFFF'); p.hline(4, 7, 3, '#90A4AE');
  p.rect(16, -14, 15, 29, WOOD.base); p.vline(16, -14, 14, WOOD.light); p.vline(30, -14, 14, WOOD.dark);
  for (const y of [-6, 3, 12]) { p.rect(17, y, 13, 2, WOOD.dark); }
  for (const [x, c] of [[18, '#E53935'], [22, '#43A047'], [26, '#FB8C00']]) { p.rect(x, -11, 3, 5, c); p.hline(x, x + 2, -11, '#FFFFFF'); }
  p.ellipse(22, 0, 4, 2.5, '#F2C94C'); p.hline(19, 25, 0, '#C99A1C'); p.px(21, -1, '#FFF3B0');
  p.rect(18, 7, 5, 5, '#A1887F'); p.rect(25, 8, 4, 4, '#F5F5F5'); p.hline(25, 28, 8, '#1565C0');
  p.oy = 0; p.outline(OUT);
  return toTex(p, top);
}

// ---------- iconos de 16×16 ----------
// navaja abierta en diagonal: cachas (c[0], c[1]), virola dorada y hoja (b[0] acero, b[1] filo)
function knife(p, c, b) {
  line(p, 2, 13, 6, 9, c[0]); line(p, 3, 14, 7, 10, c[1]); p.px(2, 14, c[1]); p.px(1, 14, '#E0B43A');
  p.px(7, 9, '#E0B43A'); p.px(6, 10, '#B8891C');
  line(p, 7, 8, 13, 2, b[0]); line(p, 8, 9, 13, 4, b[1]); line(p, 8, 8, 12, 4, b[0]); p.px(14, 1, b[0]);
}
export const ALBA_ICONS = {
  navaja: (p) => knife(p, ['#8A5A3A', '#664026'], ['#D9DEE5', '#9EA5AE']),
  navaja_albacete: (p) => { knife(p, ['#F3E6C4', '#C9B78A'], ['#EEF2F6', '#AEB6C0']); p.px(4, 11, '#C62828'); p.px(5, 12, '#C62828'); },
  navaja_7muelles: (p) => { knife(p, ['#3A2A1C', '#1F160E'], ['#FFFFFF', '#C6CCD3']); for (const [x, y] of [[3, 12], [4, 11], [5, 10]]) p.px(x, y, '#FFD54F'); p.px(13, 1, '#FFFFFF'); p.px(15, 3, '#FFF59D'); p.px(11, 0, '#FFF59D'); },
  navaja_ronosa: (p) => knife(p, ['#6D4C41', '#4E342E'], ['#A1672F', '#7A4A1E']),
  miguelito: (p) => {
    p.rect(3, 6, 10, 7, '#E9B96A'); p.hline(3, 12, 6, '#F6D79A'); p.hline(3, 12, 9, '#FFF6DC'); p.hline(3, 12, 10, '#FFF6DC'); p.hline(3, 12, 12, '#B98234');
    for (const [x, y] of [[4, 5], [6, 5], [7, 4], [9, 5], [11, 5], [12, 4]]) p.px(x, y, '#FFFFFF');
  },
  bocata_manchego: (p) => {
    p.ellipse(8, 9, 7, 3.6, '#D9A066'); p.hline(2, 13, 7, '#EDC08A'); p.hline(2, 13, 9, '#F2D25C'); p.hline(3, 12, 10, '#E57373'); p.hline(2, 13, 11, '#B9793F');
    for (const x of [4, 8, 11]) p.px(x, 6, '#B9793F');
  },
  gazpacho_manchego: (p) => {
    p.ellipse(8, 10, 7, 4, '#8D4E2A'); p.ellipse(8, 8, 6, 2.6, '#D9812E'); p.px(5, 8, '#F3E2C7'); p.px(8, 7, '#F3E2C7'); p.px(10, 9, '#F3E2C7'); p.px(7, 9, '#6D4C41'); p.px(11, 8, '#558B2F');
    for (const [x, y] of [[6, 4], [7, 3], [10, 4], [11, 2]]) p.px(x, y, '#E9E4F2');
  },
  reloj_casio: (p) => {
    p.rect(6, 1, 4, 3, '#2B2B33'); p.rect(6, 12, 4, 3, '#2B2B33'); p.rect(3, 4, 10, 8, '#3A3A48'); p.hline(3, 12, 4, '#6B6B7E');
    p.rect(5, 6, 6, 4, '#B7D3A8'); text(p, 5, 6, '5', '#1B3A1B'); p.px(9, 7, '#1B3A1B'); p.px(9, 9, '#1B3A1B'); p.px(13, 7, '#9EA5AE');
  },
  mechero: (p) => { p.rect(5, 6, 6, 9, '#E53935'); p.vline(5, 6, 14, '#FF8A80'); p.vline(10, 6, 14, '#B71C1C'); p.rect(5, 4, 6, 2, '#C6CCD3'); p.px(9, 3, '#9EA5AE'); p.px(7, 2, '#FFC107'); p.px(7, 1, '#FF7043'); p.px(8, 3, '#FFC107'); },
  cigarro: (p) => { p.rect(2, 9, 9, 3, '#FFFFFF'); p.hline(2, 10, 11, '#DADADA'); p.rect(11, 9, 3, 3, '#D9A066'); p.px(1, 10, '#FF7043'); for (const [x, y] of [[1, 7], [2, 5], [1, 3], [3, 2]]) p.px(x, y, '#CFCFDA'); },
  sarten_feria: (p) => { p.ellipse(6, 7, 5.5, 5.5, '#2B2B33'); p.ellipse(6, 7, 4, 4, '#4A4A58'); p.px(4, 5, '#8A8A9C'); p.px(5, 4, '#8A8A9C'); line(p, 10, 10, 14, 14, '#2B2B33'); line(p, 11, 10, 15, 14, '#5D4037'); },
  corazon: (p) => {
    for (const [y, a, b] of [[3, 3, 6], [3, 9, 12], [4, 2, 13], [5, 2, 13], [6, 2, 13], [7, 3, 12], [8, 4, 11], [9, 5, 10], [10, 6, 9], [11, 7, 8]]) p.hline(a, b, y, '#E53935');
    p.px(4, 4, '#FF8A80'); p.px(5, 4, '#FF8A80'); p.px(4, 5, '#FF8A80'); p.hline(7, 8, 11, '#B71C1C'); p.hline(6, 9, 10, '#C62828');
  },
};
