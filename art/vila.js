// Páxinal Crossing · edificios y mobiliario del pueblo (0.3), con las piezas de Paximón.
// Las casas de Paximón están pensadas para 5 casillas de ancho: en las de 4 la ventana pisaba la
// puerta y en las de 3 de alto la puerta se metía en el tejado. Aquí las ventanas se reparten según
// el ancho y la puerta, el rótulo va pintado en la fachada (no un cartel encima de la pared) y hay
// variedad: revocos de colores, casas de piedra, galerías, bares con toldo, quiosco y almacén.
import {
  Pix, T, rng, OUT, WOOD, GLASS, GRANITE, PLASTER, DOOR, SLATE, groundShadow,
  trapezoidRoof, plasterWall, windowAt, doorAt, galeria, chimney, stoneBlocks,
} from './paximon/townart.js';
import { text, textW } from './paximon/worldart.js';
import { shade } from './paximon/avatar.js';

const toTex = (p, top, extra = {}) => ({ cv: p.toCanvas(), top, w: p.w, h: p.h, ...extra });

// revocos: el blanco de Paximón y colores de casa marinera
export const WALLS = {
  branco: null,
  crema: { base: '#F3E6C4', shade: '#E0CFA4', dark: '#CDB98A' },
  amarelo: { base: '#F7E39A', shade: '#E8CD72', dark: '#D3B558' },
  azul: { base: '#D7E8F3', shade: '#BBD2E4', dark: '#A2BCD1' },
  rosa: { base: '#F5D9D4', shade: '#E6BDB6', dark: '#D4A79F' },
  verde: { base: '#DDEDD0', shade: '#C3DAB1', dark: '#AAC697' },
};
const DOORS = ['#8B5A2B', '#2E6B3A', '#2D5A8C', '#9C3B2E', '#5D4037', '#3E4A5C'];
const BOXES = [['#6F97E6', '#AFC8F7'], ['#E98AB8', '#F8C3DC'], ['#E8C547', '#FFF0A8'], ['#E57373', '#FFCDD2']];

function tint(p, x0, y0, w, h, pal) {
  if (!pal) return;
  const map = { [PLASTER.base]: pal.base, [PLASTER.shade]: pal.shade, [PLASTER.dark]: pal.dark };
  for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) { const c = p.get(x, y); if (map[c]) p.px(x, y, map[c]); }
}
// x de las ventanas en un tramo de muro [a, b): bien separadas, sin pisar la puerta ni las esquinas
function spread(a, b, ww) {
  const L = b - a;
  if (L < ww + 2) return [];
  const n = Math.max(1, Math.floor((L - 9) / (ww + 9))), gap = (L - n * ww) / (n + 1);
  return Array.from({ length: n }, (_, i) => Math.round(a + gap + i * (ww + gap)));
}
function windowSlots(W, door, ww = 12, dw = 12) {
  if (door == null) return spread(12, W - 12, ww);
  return [...spread(12, door - 7, ww), ...spread(door + dw + 7, W - 12, ww)];
}
// rótulo pintado en la fachada
function plaque(p, cx, y, label, bg, ink = '#FFF3D6') {
  const bw = textW(label) + 8, bx = Math.round(cx - bw / 2);
  p.rect(bx - 1, y - 1, bw + 2, 11, OUT); p.rect(bx, y, bw, 9, bg);
  p.hline(bx, bx + bw - 1, y, shade(bg, 0.2)); p.hline(bx, bx + bw - 1, y + 8, shade(bg, -0.3));
  text(p, bx + 4, y + 2, label, ink);
}
function stripes(p, x, y, w, c1, c2, h = 6) {
  for (let i = 0; i < w; i++) {
    const c = Math.floor(i / 4) % 2 ? c2 : c1;
    for (let j = 0; j < h; j++) p.px(x + i, y + j, j === 0 ? shade(c, -0.25) : j < 2 ? shade(c, 0.12) : c);
    if (i % 4 === 1 || i % 4 === 2) p.px(x + i, y + h, c);
  }
  p.hline(x, x + w - 1, y - 1, OUT);
}
// escaparate de bar: luz cálida, la barra y unas tazas
function barWindow(p, x, y, w, h, frame = '#4A2C18') {
  p.rect(x - 2, y - 2, w + 4, h + 4, frame);
  for (let j = 0; j < h; j++) p.hline(x, x + w - 1, y + j, j < h / 2 ? '#FFF1C9' : '#F5C77A');
  p.rect(x, y + h - 5, w, 5, '#8B5A2B'); p.hline(x, x + w - 1, y + h - 5, '#C68D52');
  for (let i = x + 2; i < x + w - 3; i += 6) { p.rect(i, y + h - 8, 3, 3, '#FFFFFF'); p.px(i + 3, y + h - 7, '#FFFFFF'); }
  p.px(x + 1, y + 1, '#FFFFFF'); p.px(x + 2, y + 1, '#FFFFFF'); p.px(x + 1, y + 2, '#FFFFFF');
  if (w > 18) p.vline(x + Math.floor(w / 2), y, y + h - 6, frame);
}

// Edificio del pueblo. o: { w, h, color (tejado), wall, door (casilla), seed, label, labelColor,
//   style: 'casa' | 'pedra' | 'galeria' | 'bar' | 'concello' }
export function edificio(o) {
  const { w, h } = o, style = o.style || 'casa', W = w * T, H = h * T, r = rng((o.seed || 1) * 97 + w * 7 + h);
  const two = style === 'galeria' || style === 'concello';
  const top = 9, roofH = style === 'bar' ? 24 : two ? 28 : 30;
  const p = new Pix(W, H + top); p.oy = top;
  const lights = [], L = (x, y, ww, hh) => lights.push([x, y + top, ww, hh]);
  const doorCol = o.door ?? Math.floor(w / 2), dw = style === 'concello' ? 16 : 12;
  const dx = Math.round(doorCol * T + (T - dw) / 2);
  chimney(p, r() < 0.5 ? W - 22 : 12, -7, 7, 16);
  if (style === 'pedra' || style === 'concello') {
    stoneBlocks(p, 3, roofH - 1, W - 6, H - roofH + 1, (o.seed || 1) + 30);
    p.vline(3, roofH - 1, H - 1, OUT); p.vline(W - 4, roofH - 1, H - 1, OUT); p.hline(3, W - 4, H - 1, OUT);
  } else {
    plasterWall(p, 3, roofH - 1, W - 6, H - roofH + 1);
    tint(p, 3, roofH - 1, W - 6, H - roofH + 1, WALLS[o.wall]);
  }
  trapezoidRoof(p, 0, 0, W, roofH, o.color || '#B5533A', { inset: w >= 7 ? 4 : 3 });
  const box = BOXES[Math.floor(r() * BOXES.length)], doorC = o.doorColor || DOORS[Math.floor(r() * DOORS.length)];
  const win = (x, y, ww = 12, hh = 11, withBox = true) => { windowAt(p, x, y, ww, hh, { box: withBox ? box : null }); L(x + 1, y + 1, ww - 2, hh - 2); };

  if (style === 'bar') {
    const awnC = o.labelColor || '#1565C0';
    if (o.label) plaque(p, W / 2, roofH + 1, o.label, shade(awnC, -0.15));
    stripes(p, 5, roofH + 12, W - 10, awnC, '#FFFFFF');
    for (const x of windowSlots(W, dx, 16)) { barWindow(p, x, H - 19, 16, 13); L(x, H - 19, 16, 13); }
    doorAt(p, dx, H - 22, 12, 21, { color: doorC });
    p.rect(dx + 2, H - 20, 8, 7, '#FFE7A8'); L(dx + 2, H - 20, 8, 7);
  } else if (two) {
    // planta alta: galería blanca (o balcones en el concello) y planta baja con ventanas y puerta
    // (el concello necesita 6 casillas de alto: rótulo, balcones, ventanas y la puerta en arco)
    if (style === 'galeria') { galeria(p, 9, roofH + 3, W - 18, 20); for (let x = 11; x + 4 <= W - 11; x += 5) L(x, roofH + 5, 4, 5); }
    else {
      if (o.label) plaque(p, W / 2, roofH + 1, o.label, o.labelColor || '#123C7A');
      const uy = roofH + 14;
      for (const x of windowSlots(W, null, 12)) {
        win(x, uy, 12, 12, false);
        p.rect(x - 3, uy + 13, 18, 2, '#3A3A48'); for (let i = x - 3; i < x + 15; i += 3) p.vline(i, uy + 10, uy + 13, '#3A3A48');
      }
      const cy = uy + 19; p.hline(4, W - 5, cy, GRANITE.light); p.hline(4, W - 5, cy + 1, GRANITE.base); p.hline(4, W - 5, cy + 2, GRANITE.dark);
    }
    const ly = style === 'galeria' ? H - 24 : H - 26;
    for (const x of windowSlots(W, dx, 12, dw)) win(x, ly, 12, 11);
    doorAt(p, dx, H - (style === 'concello' ? 23 : 21), dw, style === 'concello' ? 22 : 20, { color: doorC, arch: style === 'concello' });
  } else {
    // planta baja: con rótulo, las ventanas bajan para dejarle sitio
    const wy = o.label ? roofH + 12 : roofH + 8;
    if (o.label) plaque(p, W / 2, roofH + 1, o.label, o.labelColor || '#6D4C41');
    for (const x of windowSlots(W, dx, 12)) win(x, wy, 12, 11);
    doorAt(p, dx, H - 21, 12, 20, { color: doorC });
  }
  p.oy = 0; p.outline(OUT);
  return toTex(p, top, { lights });
}

// Quiosco de prensa (2x2): caseta verde con toldo y revistas
export function kiosko() {
  const W = 32, p = new Pix(W, 46), top = 14; p.oy = top;
  p.rect(2, 4, 28, 27, '#2E7D32'); p.vline(2, 4, 30, '#43A047'); p.vline(29, 4, 30, '#1B5E20');
  p.rect(5, 8, 22, 12, '#FFF6D8');
  const mags = ['#E53935', '#1E88E5', '#FDD835', '#8E24AA', '#43A047', '#FB8C00'];
  for (let i = 0; i < 6; i++) { p.rect(6 + Math.round(i * 3.5), 10 + (i % 2) * 5, 3, 4, mags[i]); }
  p.rect(4, 20, 24, 3, '#8B5A2B'); p.hline(4, 27, 20, '#C68D52');
  p.rect(3, 24, 26, 6, '#1B5E20'); text(p, 6, 25, 'PRENSA', '#FFFFFF');
  stripes(p, 0, -2, W, '#2E7D32', '#FFFFFF');
  p.rect(1, -8, 30, 6, '#3A3A48'); p.hline(1, 30, -8, '#565668');
  p.oy = 0; p.outline(OUT);
  groundShadow(p, 16, 45, 14, 1.2);
  return toTex(p, top, { lights: [[5, 8 + top, 22, 12]] });
}

// Almacén de Renfe Mercancías: chapa ondulada, portón y muelle de carga
export function almacen(w = 8, h = 4) {
  const W = w * T, H = h * T, top = 6, roofH = 22;
  const p = new Pix(W, H + top); p.oy = top;
  for (let x = 3; x < W - 3; x++) for (let y = roofH - 1; y < H - 4; y++) p.px(x, y, x % 4 === 0 ? '#8E9AA6' : x % 4 === 1 ? '#C4CCD4' : '#AEB8C2');
  p.rect(3, H - 6, W - 6, 6, '#7B7F86'); p.hline(3, W - 4, H - 6, '#9BA0A8');
  p.vline(3, roofH - 1, H - 1, OUT); p.vline(W - 4, roofH - 1, H - 1, OUT); p.hline(3, W - 4, H - 1, OUT);
  trapezoidRoof(p, 0, 0, W, roofH, SLATE, { inset: 3, course: 4 });
  const gw = 36, gx = Math.round(W / 2 - gw / 2), gy = roofH + 13;
  p.rect(gx - 2, gy - 2, gw + 4, H - 6 - gy + 2, '#4E5A66');
  p.rect(gx, gy, gw, H - 6 - gy, '#6B7B8A');
  for (let x = gx + 2; x < gx + gw; x += 3) p.vline(x, gy, H - 7, '#5C6B79');
  for (let i = 0; i < gw; i++) { const y1 = gy + Math.round(i * (H - 7 - gy) / gw); p.px(gx + i, y1, '#E0B43A'); p.px(gx + i, gy + (H - 7 - gy) - Math.round(i * (H - 7 - gy) / gw), '#E0B43A'); }
  p.rect(gx - 4, H - 6, gw + 8, 5, '#9E9A90'); p.hline(gx - 4, gx + gw + 3, H - 6, '#C4C0B6');
  const label = 'RENFE MERCANCÍAS', bw = textW(label) + 8, bx = Math.round(W / 2 - bw / 2);
  p.rect(bx - 1, roofH + 1, bw + 2, 10, OUT); p.rect(bx, roofH + 2, bw, 8, '#7B1FA2'); text(p, bx + 4, roofH + 3, label, '#FFFFFF');
  const lights = [];
  for (const x of [10, W - 26]) { p.rect(x - 1, roofH + 3, 18, 8, OUT); p.rect(x, roofH + 4, 16, 6, GLASS.base); p.hline(x, x + 15, roofH + 8, GLASS.dark); lights.push([x, roofH + 4 + top, 16, 6]); }
  p.oy = 0; p.outline(OUT);
  return toTex(p, top, { lights });
}

// Jardinera de granito con flores (variant: color de las flores)
export function planter(v = 0) {
  const p = new Pix(16, 22), top = 6; p.oy = top;
  const fl = [['#E53935', '#FFCDD2'], ['#FDD835', '#FFF59D'], ['#8E24AA', '#E1BEE7'], ['#FFFFFF', '#FFE0B2']][v % 4];
  p.ellipse(8, 2, 7, 4.5, '#3F8A3A'); p.ellipse(7, 1, 5, 3, '#5DB062');
  for (const [x, y, k] of [[4, 1, 0], [8, -1, 1], [11, 2, 0], [6, 3, 1], [10, 0, 0], [3, 3, 1], [12, -1, 1]]) { p.px(x, y, fl[k]); p.px(x + 1, y, fl[0]); }
  p.rect(1, 5, 14, 9, GRANITE.base); p.hline(1, 14, 5, GRANITE.light); p.hline(1, 14, 13, GRANITE.dark); p.vline(14, 5, 13, GRANITE.dark);
  p.oy = 0; p.outline(OUT);
  groundShadow(p, 8, 21, 7, 1);
  return toTex(p, top);
}

// Mástil con la bandera gallega (blanca con la banda azul)
export function bandeira() {
  const p = new Pix(24, 52), top = 36; p.oy = top;
  p.rect(1, 12, 6, 4, GRANITE.base); p.hline(1, 6, 12, GRANITE.light);
  p.rect(3, -34, 2, 47, '#8C8F96'); p.vline(3, -34, 12, '#B5B9C0'); p.rect(2, -36, 4, 2, '#E0B43A');
  const fw = 17, fh = 12;
  for (let i = 0; i < fw; i++) {
    const dy = Math.round(Math.sin(i / 3) * 0.8);
    for (let j = 0; j < fh; j++) {
      const band = Math.abs(j - (i * fh / fw)) < 2.2;
      p.px(5 + i, -33 + j + dy, band ? '#5AAEE8' : '#FFFFFF');
    }
  }
  p.oy = 0; p.outline(OUT);
  return toTex(p, top);
}

// Papelera verde
export function papeleira() {
  const p = new Pix(16, 16);
  p.rect(5, 4, 6, 10, '#2E7D32'); p.vline(5, 4, 13, '#43A047'); p.vline(10, 4, 13, '#1B5E20');
  p.rect(4, 3, 8, 2, '#1B5E20'); p.vline(7, 14, 15, '#3A3A48');
  p.outline(OUT);
  return toTex(p, 0);
}

// Palés con cajas (en el almacén de mercancías)
export function pales() {
  const p = new Pix(16, 24), top = 8; p.oy = top;
  p.rect(1, 12, 14, 3, WOOD.dark); p.hline(1, 14, 12, WOOD.base);
  p.rect(2, 2, 12, 10, '#C8A26B'); p.hline(2, 13, 2, '#E0C08A'); p.vline(8, 2, 11, '#A5824F');
  p.rect(4, -6, 9, 8, '#B88F5A'); p.hline(4, 12, -6, '#D8B47E'); p.hline(4, 12, -2, '#A5824F');
  p.oy = 0; p.outline(OUT);
  groundShadow(p, 8, 23, 7, 1);
  return toTex(p, top);
}

// Parque infantil: columpio de dos asientos (3 casillas) y tobogán (2 casillas)
export function columpio() {
  const W = 48, p = new Pix(W, 44), top = 28; p.oy = top;
  const leg = (x0, x1) => { for (let y = -26; y <= 14; y++) { const k = (y + 26) / 40; p.px(Math.round(x0 + (x1 - x0) * k), y, '#C62828'); p.px(Math.round(x0 + (x1 - x0) * k) + 1, y, '#8E1B1B'); } };
  leg(5, 1); leg(5, 9); leg(42, 38); leg(42, 46);
  p.rect(4, -27, 40, 3, '#E53935'); p.hline(4, 43, -27, '#FF7961');
  for (const sx of [15, 30]) {
    p.vline(sx, -24, 4, '#6F737A'); p.vline(sx + 5, -24, 4, '#6F737A');
    p.rect(sx - 1, 4, 8, 3, '#FDD835'); p.hline(sx - 1, sx + 6, 6, '#C9A227');
  }
  p.oy = 0; p.outline(OUT);
  groundShadow(p, 24, 43, 20, 1.2);
  return toTex(p, top);
}
export function tobogan() {
  const W = 32, p = new Pix(W, 44), top = 28; p.oy = top;
  for (let y = -22; y <= 14; y++) { p.px(3, y, '#1565C0'); p.px(9, y, '#1565C0'); if ((y + 22) % 5 === 0) p.hline(3, 9, y, '#42A5F5'); }
  p.rect(2, -24, 9, 3, '#1E88E5');
  for (let i = 0; i < 22; i++) { const y = -22 + Math.round(i * 1.6), x = 10 + i; p.rect(x, y, 2, 5, '#FB8C00'); p.px(x, y, '#FFB74D'); }
  p.oy = 0; p.outline(OUT);
  groundShadow(p, 16, 43, 14, 1.2);
  return toTex(p, top);
}
// Pozo de piedra con su tejadillo de madera, el torno y el caldero (auditoría A12: para que cada granja
// de O Agro sea un poco distinta)
export function pozo() {
  const p = new Pix(16, 32), top = 16; p.oy = top;
  for (let y = 4; y <= 14; y++) for (let x = 2; x <= 13; x++) p.px(x, y, ((x >> 1) + (y >> 1) * 3) % 4 === 0 ? '#8E8E86' : (x + y) % 7 === 0 ? '#6E6E68' : '#A8A89E');
  p.hline(2, 13, 4, '#C8C8BE'); p.rect(4, 5, 8, 2, '#2E3A44');
  p.vline(3, -9, 4, '#6B4A2E'); p.vline(12, -9, 4, '#6B4A2E');
  for (let i = 0; i < 4; i++) p.hline(1 + i, 14 - i, -10 - i, i % 2 ? '#8E5A34' : '#A8693C');
  p.hline(3, 12, -4, '#7A5530'); p.vline(8, -3, 1, '#9EA5AE'); p.rect(7, 1, 3, 3, '#5E6879'); p.px(7, 1, '#7D8A96');
  p.oy = 0; p.outline(OUT);
  groundShadow(p, 8, 31, 7, 1);
  return toTex(p, top);
}
// Palleiro: la meda de paja alrededor de un palo, como en las aldeas
export function palleiro() {
  const p = new Pix(16, 34), top = 18; p.oy = top;
  p.vline(8, -18, -10, '#6B4A2E');
  for (let y = -12; y <= 13; y++) {
    const k = (y + 12) / 25, hw = Math.round(1 + 6.5 * Math.sin(Math.min(1, k * 1.25) * Math.PI / 2));
    for (let x = 8 - hw; x <= 8 + hw; x++) p.px(x, y, (x + y * 2) % 5 === 0 ? '#B38B2A' : x < 8 ? '#E8C35A' : '#D9AE3E');
  }
  p.oy = 0; p.outline(OUT);
  groundShadow(p, 8, 33, 7, 1);
  return toTex(p, top);
}
