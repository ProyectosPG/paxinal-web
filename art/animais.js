// Páxinal Crossing · animales de la granja: gallina, vaca rubia gallega, oveja, gato y can, con dos
// fotogramas para andar, y el comedero del corral. Mismo estilo que Paximón: contorno oscuro y bandas.
import { Pix, OUT, WOOD, groundShadow } from './paximon/townart.js';

function legs(p, xs, y, h, c, f) { xs.forEach((x, i) => p.vline(x, y + ((i + f) % 2 ? 1 : 0), y + h, c)); }
const PAINT = {
  // gallina: blanca, cresta roja; sus huevos son «leads»
  gallina: (f) => {
    const p = new Pix(16, 16);
    p.ellipse(8, 10, 4.5, 3.4, '#FAFAF6'); p.ellipse(7, 9, 2.6, 1.8, '#FFFFFF'); p.hline(5, 9, 12, '#DCD8CC');
    p.ellipse(12, 6, 2.2, 2.2, '#FAFAF6'); p.px(13, 5, '#1B1B22'); p.px(14, 6, '#F2B233'); p.px(15, 6, '#F2B233');
    p.px(12, 3, '#E53935'); p.px(11, 3, '#E53935'); p.px(12, 4, '#E53935'); p.px(13, 8, '#E53935');
    p.px(3, 8, '#DCD8CC'); p.px(3, 7, '#FAFAF6'); p.px(4, 7, '#FAFAF6');
    legs(p, [7, 9], 13, 1, '#F2B233', f);
    p.outline(OUT);
    groundShadow(p, 8, 15, 4, 0.8);
    return p;
  },
  // vaca rubia gallega: dorada, hocico claro y cuernos cortos
  vaca: (f) => {
    const p = new Pix(32, 24);
    p.rect(6, 7, 18, 9, '#D9A55B'); p.hline(6, 23, 7, '#E8BC7A'); p.hline(6, 23, 15, '#B98543'); p.ellipse(15, 10, 6, 2, '#E8BC7A');
    p.rect(23, 5, 6, 7, '#D9A55B'); p.rect(26, 9, 4, 4, '#F2D6B0'); p.px(28, 11, '#5E3B1C'); p.px(25, 7, '#1B1B22');
    p.px(23, 4, '#F4EFE3'); p.px(28, 4, '#F4EFE3'); p.px(22, 6, '#B98543'); p.px(29, 6, '#B98543');
    p.vline(5, 8, 13, '#B98543'); p.px(4, 13, '#5E3B1C');
    p.rect(10, 15, 3, 2, '#F2C1B0');
    legs(p, [8, 11, 19, 22], 16, 4, '#B98543', f); for (const x of [8, 11, 19, 22]) p.px(x, 21, '#5E3B1C');
    p.outline(OUT);
    groundShadow(p, 16, 22.5, 11, 1.2);
    return p;
  },
  // oveja: una nube de lana con patitas y cara oscura
  ovella: (f) => {
    const p = new Pix(24, 20);
    for (const [x, y, r] of [[8, 9, 4], [12, 8, 4.5], [16, 9, 4], [10, 12, 3.5], [14, 12, 3.5]]) p.ellipse(x, y, r, r * 0.85, '#F2EEE6');
    for (const [x, y] of [[9, 7], [13, 6], [16, 8], [11, 10]]) p.px(x, y, '#FFFFFF');
    for (const [x, y] of [[7, 12], [12, 13], [16, 12]]) p.px(x, y, '#DCD5C6');
    p.ellipse(20, 8, 2.4, 2.6, '#3A3530'); p.px(21, 7, '#FFFFFF'); p.px(18, 6, '#3A3530');
    legs(p, [9, 11, 14, 16], 15, 2, '#3A3530', f);
    p.outline(OUT);
    groundShadow(p, 12, 18.6, 8, 1);
    return p;
  },
  // gato de oficina: atigrado, hecho una bola (duerme encima del teclado)
  gato: (f) => {
    const p = new Pix(16, 12);
    p.ellipse(8, 7, 5.5, 3.5, '#E59A4A'); for (let x = 4; x < 12; x += 2) p.vline(x, 5, 6, '#B8702E');
    p.ellipse(12, 5, 2.4, 2.2, '#E59A4A'); p.px(11, 3, '#E59A4A'); p.px(13, 3, '#E59A4A'); p.hline(11, 13, 5, f ? '#5E3B1C' : '#B8702E');
    p.hline(2, 5, 9, '#E59A4A'); p.px(2, 8, '#B8702E');
    p.outline(OUT);
    return p;
  },
  // can: marrón con manchas blancas y el rabo contento
  can: (f) => {
    const p = new Pix(16, 16);
    p.rect(4, 7, 8, 5, '#8D5A3B'); p.ellipse(6, 9, 2, 1.6, '#F4EFE3'); p.hline(4, 11, 11, '#6B4226');
    p.ellipse(12, 6, 2.6, 2.4, '#8D5A3B'); p.ellipse(13, 7, 1.6, 1.2, '#F4EFE3'); p.px(14, 7, '#1B1B22'); p.px(12, 5, '#1B1B22');
    p.vline(10, 3, 5, '#6B4226'); p.px(11, 3, '#6B4226');
    p.px(3, 6 - (f ? 1 : 0), '#8D5A3B'); p.px(2, 5 - (f ? 1 : 0), '#8D5A3B');
    legs(p, [5, 7, 9, 11], 12, 2, '#6B4226', f);
    p.outline(OUT);
    groundShadow(p, 8, 15, 5, 0.8);
    return p;
  },
};
const cache = {};
// sprite de un animal: {cv, w, h}. f = fotograma (0 o 1)
export function animal(kind, f = 0) {
  const k = kind + f;
  if (!cache[k]) { const p = PAINT[kind](f); cache[k] = { cv: p.toCanvas(), w: p.w, h: p.h, top: Math.max(0, p.h - 16) }; }
  return cache[k];
}
// comedero de madera del corral (lleno de pienso cuando ya comieron hoy)
export function trough(full) {
  const p = new Pix(16, 16);
  p.rect(1, 6, 14, 6, WOOD.base); p.hline(1, 14, 6, WOOD.light); p.hline(1, 14, 11, WOOD.dark);
  p.rect(2, 7, 12, 3, full ? '#C9A86A' : '#5E3B1C'); if (full) for (let x = 3; x < 13; x += 2) p.px(x, 7, '#E0C890');
  p.rect(2, 12, 2, 3, WOOD.dark); p.rect(12, 12, 2, 3, WOOD.dark);
  p.outline(OUT);
  return { cv: p.toCanvas(), top: 0 };
}
