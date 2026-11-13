// Páxinal Crossing · arte del mar: peces y basura de oficina (iconos de 16x16), la caña, la gaviota,
// las bateas de mejillón, la lonxa y sus puestos. Mismas piezas, paletas y contorno que Paximón.
import { Pix, T, OUT, WOOD, GRANITE, GLASS, groundShadow, trapezoidRoof, stoneBlocks, doorAt, windowAt } from './paximon/townart.js';
import { text, textW } from './paximon/worldart.js';
import { shade } from './paximon/avatar.js';

// ---------- peces: una silueta con parámetros (largo, alto, colores, rayas, manchas) ----------
const FISH = {
  xurelo: { len: 12, h: 4, c: '#7FA7C9', b: '#D9E6F0', fin: '#5C82A6' },
  sardina: { len: 10, h: 3, c: '#8FB3C8', b: '#EEF4F8', fin: '#6A8CA3', spots: '#3E5A70' },
  xarda: { len: 12, h: 4, c: '#3F8A7A', b: '#DDEFE8', fin: '#2C6157', stripes: '#1F3F3A' },
  robaliza: { len: 13, h: 5, c: '#9AA9B4', b: '#E6ECEF', fin: '#6E7E89' },
  troita: { len: 12, h: 4, c: '#8A9A5B', b: '#E9E2C0', fin: '#5E6B3A', spots: '#C0533A' },
  xurelo_ouro: { len: 13, h: 5, c: '#E8B53A', b: '#FFF0B0', fin: '#B8861E', shine: true },
};
function fish(p, f) {
  const x0 = Math.round(8 - f.len / 2), cy = 8;
  for (let i = 0; i < f.len; i++) {
    const t = i / (f.len - 1), hh = Math.max(1, Math.round(Math.sin(Math.min(1, t * 1.15) * Math.PI) * f.h));
    for (let j = -hh; j <= hh; j++) p.px(x0 + i, cy + j, j > hh * 0.2 ? f.b : f.c);
  }
  // cola
  const tx = x0 - 1;
  for (let j = -3; j <= 3; j++) p.px(tx - (Math.abs(j) > 1 ? 1 : 0), cy + j, f.fin);
  p.px(tx, cy, f.fin);
  // aleta de arriba y ojo
  p.px(x0 + Math.round(f.len * 0.45), cy - f.h - 1, f.fin); p.px(x0 + Math.round(f.len * 0.55), cy - f.h - 1, f.fin);
  p.px(x0 + f.len - 3, cy - 1, '#1B1B22'); p.px(x0 + f.len - 3, cy - 2, '#FFFFFF');
  if (f.stripes) for (let i = 2; i < f.len - 4; i += 2) p.px(x0 + i, cy - Math.max(1, f.h - 2), f.stripes);
  if (f.spots) for (let i = 2; i < f.len - 3; i += 3) p.px(x0 + i, cy - 1 + (i % 2), f.spots);
  if (f.shine) { p.px(x0 + 3, cy - 2, '#FFFFFF'); p.px(13, 2, '#FFF59D'); p.px(2, 3, '#FFFFFF'); }
}
const SEA_ICONS = {
  polbo: (p) => { p.ellipse(8, 6, 4.5, 4, '#9C4D8C'); p.ellipse(7, 5, 2, 1.6, '#C27AB3'); p.px(6, 6, '#1B1B22'); p.px(10, 6, '#1B1B22');
    for (let k = 0; k < 4; k++) { const x = 4 + k * 3; p.vline(x, 9, 12, '#9C4D8C'); p.px(x + (k % 2 ? 1 : -1), 13, '#9C4D8C'); } },
  choco: (p) => { p.ellipse(8, 7, 5.5, 3.5, '#A0785A'); p.ellipse(8, 6, 4, 2, '#C49A78'); for (let x = 4; x < 12; x += 2) p.px(x, 7, '#7A553A');
    p.px(12, 6, '#1B1B22'); for (const y of [9, 10, 11]) p.hline(12, 14, y, '#A0785A'); },
  centola: (p) => { p.ellipse(8, 8, 5, 4, '#C8452F'); p.ellipse(7, 7, 2.5, 1.6, '#E07055'); for (const [x, y] of [[4, 6], [6, 5], [10, 5], [12, 6]]) p.px(x, y, '#F2A88F');
    for (const s of [-1, 1]) { p.px(8 + s * 6, 6, '#C8452F'); p.px(8 + s * 7, 5, '#C8452F'); p.px(8 + s * 6, 11, '#C8452F'); p.px(8 + s * 7, 12, '#C8452F'); p.px(8 + s * 5, 12, '#C8452F'); } },
  necora: (p) => { p.ellipse(8, 8, 5, 3.5, '#2F4A6B'); p.ellipse(7, 7, 2.4, 1.4, '#4D6E95'); p.px(6, 6, '#E53935'); p.px(10, 6, '#E53935');
    for (const s of [-1, 1]) { p.rect(8 + s * 6 - (s < 0 ? 1 : 0), 5, 2, 2, '#2F4A6B'); p.px(8 + s * 6, 11, '#2F4A6B'); p.px(8 + s * 7, 12, '#2F4A6B'); } },
  anguia: (p) => { for (let i = 0; i < 13; i++) { const y = 8 + Math.round(Math.sin(i / 2) * 2); p.px(2 + i, y, '#4E5A3A'); p.px(2 + i, y + 1, '#8A9A6B'); } p.px(14, 7, '#1B1B22'); },
  // basura que se pesca
  rato_bola: (p) => { p.ellipse(8, 9, 4, 5, '#E3DED2'); p.vline(8, 4, 8, '#9E9A92'); p.ellipse(8, 11, 1.5, 1.5, '#5E5A52'); for (let y = 0; y < 4; y++) p.px(8 + (y % 2), y, '#7A766E'); },
  disquete: (p) => { p.rect(3, 3, 10, 10, '#37474F'); p.rect(5, 3, 6, 4, '#B0BEC5'); p.px(9, 4, '#37474F'); p.rect(5, 9, 6, 4, '#ECEFF1'); },
  cd_instalacion: (p) => { p.ellipse(8, 8, 5.5, 5.5, '#CFD8DC'); p.ellipse(7, 7, 3, 2, '#B3E5FC'); p.ellipse(10, 10, 2, 1.4, '#F8BBD0'); p.ellipse(8, 8, 1.4, 1.4, null); },
  pendrive: (p) => { p.rect(5, 4, 6, 9, '#1E88E5'); p.rect(6, 1, 4, 3, '#B0BEC5'); p.px(7, 2, '#455A64'); p.px(8, 2, '#455A64'); p.rect(6, 7, 4, 2, '#FFFFFF'); },
  guia_1998: (p) => { p.rect(3, 2, 10, 12, '#F4C400'); p.rect(3, 2, 10, 3, '#2B2B2B'); text(p, 4, 7, '98', '#2B2B2B'); p.vline(12, 2, 13, '#C99700'); },
  folleto_vanesa: (p) => { p.rect(3, 3, 10, 11, '#FFFFFF'); p.rect(3, 3, 10, 3, '#2E9BE0'); p.ellipse(6, 10, 1.6, 1.6, '#2E9BE0'); p.ellipse(10, 10, 1.6, 1.6, '#D8A45A'); },
  tarxeta_mollada: (p) => { p.rect(2, 5, 12, 7, '#F2EEE6'); p.hline(3, 8, 7, '#9E9A92'); p.hline(3, 10, 9, '#BDBAB2'); star(p, 11, 7, 1.6, '#FFC107', '#E08E00'); p.px(5, 11, '#86CDF2'); p.px(9, 10, '#86CDF2'); },
  bota: (p) => { p.rect(5, 2, 5, 9, '#2E7D32'); p.rect(5, 10, 9, 4, '#2E7D32'); p.hline(5, 13, 13, '#1B5E20'); p.vline(5, 2, 13, '#43A047'); },
  cana: (p) => { for (let i = 0; i < 13; i++) p.px(2 + i, 14 - i, i < 5 ? '#6B4226' : '#B98552'); p.ellipse(5, 11, 1.8, 1.8, '#9EA5AE'); p.vline(14, 2, 9, '#E8E8E8'); p.px(14, 10, '#9EA5AE'); },
  pienso: (p) => { p.rect(3, 3, 10, 11, '#C9A86A'); p.hline(3, 12, 3, '#E0C890'); p.rect(5, 6, 6, 4, '#FFFFFF'); text(p, 6, 6, 'P', '#7A5A2E'); p.vline(12, 3, 13, '#A88A4E'); },
  ovo: (p) => { p.ellipse(8, 9, 4, 5, '#F7F1E1'); p.ellipse(7, 7, 1.6, 2, '#FFFFFF'); text(p, 6, 8, '@', '#E53935'); },
  leite: (p) => { p.rect(5, 4, 6, 10, '#FFFFFF'); p.rect(6, 2, 4, 2, '#1E88E5'); p.rect(5, 8, 6, 3, '#1E88E5'); p.vline(10, 4, 13, '#E0E0E0'); },
  la: (p) => { p.ellipse(8, 9, 5, 4, '#F2EEE6'); for (const [x, y] of [[5, 8], [8, 6], [11, 9], [8, 11], [6, 11]]) p.ellipse(x, y, 1.6, 1.4, '#E2DCCD'); },
};
// pinta el icono de un pez o de una cosa del mar; devuelve false si no es suyo
export function seaIcon(id, p) {
  if (FISH[id]) { fish(p, FISH[id]); return true; }
  if (SEA_ICONS[id]) { SEA_ICONS[id](p); return true; }
  return false;
}
function star(p, cx, cy, R, fill, edge) {
  for (let y = Math.floor(cy - R); y <= Math.ceil(cy + R); y++) for (let x = Math.floor(cx - R); x <= Math.ceil(cx + R); x++) {
    const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy);
    if (d <= R) p.px(x, y, d > R - 1 ? edge : fill);
  }
}

// ---------- la gaviota (te roba el bocadillo si lo dejas en el suelo) ----------
export function gull(flap = 0) {
  const p = new Pix(16, 16);
  p.ellipse(8, 10, 4.5, 2.8, '#FFFFFF'); p.ellipse(7, 9.5, 3, 1.6, '#F2F2EE');
  p.ellipse(12, 7, 2.4, 2.2, '#FFFFFF'); p.px(13, 6, '#1B1B22'); p.hline(14, 15, 7, '#F2B233'); p.px(15, 8, '#E53935');
  if (flap) { for (let i = 0; i < 6; i++) p.px(4 + i, 5 - Math.round(Math.sin(i / 5 * Math.PI) * 2), '#9EA5AE'); }
  else { p.hline(4, 10, 9, '#9EA5AE'); p.hline(5, 9, 10, '#7D8590'); p.px(3, 10, '#2B2B2B'); }
  p.vline(7, 13, 14, '#F2B233'); p.vline(9, 13, 14, '#F2B233');
  p.outline(OUT);
  return { cv: p.toCanvas(), top: 0 };
}
// gaviota volando (auditoría A11): f = 0 alas abajo, 1 alas arriba; mira a la derecha
export function gullFly(f = 0) {
  const p = new Pix(16, 12);
  p.ellipse(8, 7, 4.2, 2, '#FFFFFF'); p.ellipse(12, 6, 2.2, 1.9, '#FFFFFF');
  p.px(13, 5, '#1B1B22'); p.hline(14, 15, 6, '#F2B233'); p.px(3, 7, '#2B2B2B');
  for (let i = 0; i < 7; i++) p.px(4 + i, f ? 5 - Math.round(Math.sin((i / 6) * Math.PI) * 4) : 8 + Math.round(Math.sin((i / 6) * Math.PI) * 2), '#9EA5AE');
  p.outline(OUT);
  return { cv: p.toCanvas(), top: 0 };
}
// ---------- batea de mejillón: el armazón de madera flotando en la ría ----------
export function batea() {
  const p = new Pix(48, 32);
  p.rect(2, 8, 44, 18, '#8A6440');
  for (let x = 2; x < 46; x += 5) p.vline(x, 8, 25, '#5E4126');
  for (let y = 8; y < 26; y += 5) p.hline(2, 45, y, '#A88058');
  for (let x = 5; x < 44; x += 5) for (let y = 11; y < 24; y += 5) p.px(x, y, '#2B2F3A');
  p.rect(0, 26, 48, 3, '#3A88CA'); p.hline(0, 47, 26, '#E4F5FF');
  p.outline(OUT);
  return { cv: p.toCanvas(), top: 16 };
}
// ---------- la lonxa: nave blanca con tejado de chapa, portalones azules y su letrero ----------
export function lonxa(w = 10, h = 6) {
  const W = w * T, H = h * T, top = 12, roofH = 30, p = new Pix(W, H + top); p.oy = top;
  p.rect(3, roofH - 1, W - 6, H - roofH + 1, '#F4F2EC');
  p.hline(3, W - 4, roofH, '#DCD8CC'); stoneBlocks(p, 3, H - 5, W - 6, 5, 21);
  p.vline(3, roofH - 1, H - 1, OUT); p.vline(W - 4, roofH - 1, H - 1, OUT); p.hline(3, W - 4, H - 1, OUT);
  // tejado de chapa ondulada
  for (let j = 0; j < roofH; j++) {
    const ins = Math.round((1 - j / (roofH - 1)) * 4);
    for (let i = ins; i < W - ins; i++) {
      let c = (i % 4 === 0) ? '#6E7E8C' : (i % 4 === 1) ? '#A9B7C2' : '#8C9CA9';
      if (j === 0 || j === roofH - 1 || i === ins || i === W - ins - 1) c = OUT; else if (j === roofH - 2) c = '#5A6874';
      p.px(i, j, c);
    }
  }
  // letrero
  const label = 'LONXA DE PAXIMIÑA', bw = textW(label) + 10, bx = Math.round(W / 2 - bw / 2), by = roofH + 2;
  p.rect(bx - 1, by - 1, bw + 2, 11, OUT); p.rect(bx, by, bw, 9, '#123C7A'); text(p, bx + 5, by + 2, label, '#FFFFFF');
  // portalones azules y ventanas
  for (const dx of [Math.round(W * 0.28) - 12, Math.round(W * 0.72) - 12]) {
    p.rect(dx - 2, H - 26, 28, 26, GRANITE.base); p.rect(dx, H - 24, 24, 23, '#1E5FA8');
    for (let x = dx + 3; x < dx + 24; x += 4) p.vline(x, H - 23, H - 2, '#174C88');
    p.hline(dx, dx + 23, H - 13, '#174C88'); p.px(dx + 12, H - 12, '#FFD54F'); p.hline(dx - 2, dx + 25, H - 27, OUT);
  }
  doorAt(p, Math.round(W / 2) - 7, H - 21, 14, 20, { color: '#3E4A5C' });
  for (const x of [8, W - 20]) windowAt(p, x, roofH + 14, 12, 9);
  p.oy = 0; p.outline(OUT);
  return { cv: p.toCanvas(), top, lights: [[9, roofH + 15 + top, 10, 7], [W - 19, roofH + 15 + top, 10, 7]] };
}
// ---------- dentro de la lonxa ----------
// puesto con hielo y pescado
export function fishStall() {
  const p = new Pix(32, 26), top = 10; p.oy = top;
  p.rect(1, 3, 30, 12, '#9EA5AE'); p.hline(1, 30, 3, '#C6CCD3'); for (let x = 4; x < 30; x += 6) p.vline(x, 5, 14, '#7D8590');
  p.rect(0, -4, 32, 7, '#E8F4FA'); p.hline(0, 31, -4, '#FFFFFF');
  for (let k = 0; k < 4; k++) { const x = 3 + k * 7; p.rect(x, -3, 5, 2, ['#7FA7C9', '#8FB3C8', '#9AA9B4', '#C8452F'][k]); p.px(x + 4, -3, '#1B1B22'); }
  p.oy = 0; p.outline(OUT);
  return { cv: p.toCanvas(), top };
}
// cajas de pescado apiladas
export function fishCrates() {
  const p = new Pix(16, 22), top = 6; p.oy = top;
  for (const [y, c] of [[5, '#2E6FB8'], [-3, '#2E9BE0']]) {
    p.rect(1, y, 14, 8, c); p.hline(1, 14, y, shade(c, 0.25)); p.hline(1, 14, y + 7, shade(c, -0.3));
    p.rect(3, y + 2, 10, 3, '#E8F4FA'); p.px(5, y + 3, '#7FA7C9'); p.px(9, y + 3, '#8FB3C8');
  }
  p.oy = 0; p.outline(OUT);
  return { cv: p.toCanvas(), top };
}
// el expositor de cañas de la tienda de efectos navales
export function rodRack() {
  const p = new Pix(32, 34), top = 18; p.oy = top;
  p.rect(1, 6, 30, 9, WOOD.base); p.hline(1, 30, 6, WOOD.light); p.hline(1, 30, 14, WOOD.dark);
  for (let k = 0; k < 5; k++) { const x = 4 + k * 6; p.vline(x, -18 + (k % 2) * 2, 6, k % 2 ? '#B98552' : '#6B4226'); p.px(x, -17 + (k % 2) * 2, '#E8E8E8'); }
  p.rect(20, 0, 9, 5, '#C9A86A'); p.hline(20, 28, 0, '#E0C890');
  p.oy = 0; p.outline(OUT);
  return { cv: p.toCanvas(), top };
}
// el panel de la subasta, colgado en la pared
export function auctionBoard() {
  const p = new Pix(48, 20);
  p.rect(0, 0, 48, 20, '#2A2D34'); p.rect(2, 2, 44, 16, '#0B0B0D');
  text(p, 5, 4, 'SUBASTA', '#FFB300'); text(p, 5, 11, '12:00', '#FF7043');
  for (let i = 0; i < 4; i++) p.px(40 + (i % 2) * 2, 5 + Math.floor(i / 2) * 2, '#3CC46A');
  p.outline(OUT);
  return { cv: p.toCanvas(), top: 0 };
}
export { groundShadow, GLASS };
