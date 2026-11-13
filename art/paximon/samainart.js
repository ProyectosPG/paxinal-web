// Copia de paximon/web/samainart.js para Páxinal Crossing (juegos separados: si se mejora allí, volver a copiar).
// Arte de Samaín pintado por código (mismo sistema que townart.js): calabazas, lápidas del
// cementerio de las webs, y lo que vuela de noche (bruxas en escoba, pantasmas y morcegos).
// También renderizable en Node para revisar (tools/town/preview.mjs).
import { Pix } from './townart.js';

const OUT = '#2B2230';
const stamp = (p, x, y, rows, pal) => rows.forEach((row, j) => [...row].forEach((ch, i) => { if (pal[ch]) p.px(x + i, y + j, pal[ch]); }));

// ---------- objetos del mapa ----------
// calabaza tallada con una vela dentro (variant 1: más grande, 2: dos juntas)
export function pumpkin(v = 0) {
  const p = new Pix(16, 16);
  const one = (cx, cy, rx, ry) => {
    p.ellipse(cx, cy, rx, ry, '#E8741C');
    for (const dx of [-rx * 0.45, rx * 0.45]) for (let y = cy - ry + 1; y < cy + ry - 1; y++) p.px(cx + dx, y, '#C2561A');
    p.ellipse(cx - rx * 0.55, cy - ry * 0.35, 1, 1.2, '#F7A24A');
    p.rect(cx - 1, cy - ry - 2, 2, 3, '#4E7A2E'); p.px(cx + 1, cy - ry - 2, '#6FA040');
    // cara: ojos triangulares y boca en zigzag, con la luz de la vela
    const L = '#FFE45C', l = '#FFB52E';
    p.px(cx - 3, cy - 1, L); p.px(cx - 2, cy - 1, L); p.px(cx - 2, cy - 2, l);
    p.px(cx + 2, cy - 1, L); p.px(cx + 3, cy - 1, L); p.px(cx + 2, cy - 2, l);
    if (rx >= 5) for (let i = -3; i <= 3; i++) p.px(cx + i, cy + 2 - (i % 2 ? 1 : 0), i % 2 ? l : L);
    else for (let i = -2; i <= 2; i++) p.px(cx + i, cy + 2, L);
  };
  if (v === 2) { one(5, 11, 4.2, 3.6); one(11, 10, 5, 4.4); }
  else if (v === 1) one(8, 9.5, 6.5, 5.2);
  else one(8, 10.5, 5.5, 4.4);
  p.outline(OUT);
  return { pix: p, top: 0 };
}

// lápida de granito; variant: 0 redondeada con RIP, 1 cruz, 2 inclinada y con musgo
export function tombstone(v = 0) {
  const p = new Pix(16, 24), top = 8; p.oy = top;
  const G = '#9E9A92', g = '#7B776F', Gl = '#C2BEB5';
  if (v === 1) {
    p.rect(6, -6, 4, 20, G); p.rect(2, -1, 12, 4, G);
    p.vline(6, -6, 13, Gl); p.hline(2, 13, -1, Gl); p.vline(9, -5, 13, g); p.hline(3, 13, 2, g);
  } else {
    const lean = v === 2 ? 1 : 0;
    p.rect(3 + lean, -3, 10, 17, G); p.ellipse(8 + lean, -3, 5, 4, G);
    p.vline(3 + lean, -3, 13, Gl); p.vline(12 + lean, -3, 13, g);
    // RIP en letras de 3x4
    const RIP = ['##.#.##.', '#.##.#.#', '##.#.##.', '#.##.#..'];
    stamp(p, 4 + lean, 0, RIP, { '#': '#4A4740' });
    p.hline(5 + lean, 11 + lean, 6, g); p.hline(5 + lean, 10 + lean, 8, g);
    if (v === 2) for (const [x, y] of [[4, 10], [5, 11], [4, 12], [12, 9], [13, 12], [6, -5]]) p.px(x, y, '#5E8C3A');
  }
  p.rect(1, 13, 14, 2, '#5B4636'); p.hline(2, 13, 13, '#6E5642');
  p.oy = 0; p.outline(OUT);
  return { pix: p, top };
}

// ---------- lo que vuela (sprites sueltos, dos fotogramas) ----------
// bruxa en escoba mirando a la derecha
const WITCH = [
  [
    '...........KK...........',
    '..........KKK...........',
    '.........KKKK...........',
    '........KKKKK...........',
    '.......KVVVVKK..........',
    '....KKKKKKKKKKKK........',
    '......HHGGGG............',
    '.....HHHGGEG............',
    '.....HHHGGGGN...........',
    '....HHHKKGG.............',
    '..CCCKKKKKKA............',
    '.CCCKKKKKKKAA...........',
    'BBCCKKKKKKKKSSSSSSSSSS..',
    'BBBBSSSSSSSSSSSSSSSSSSSS',
    'BBBB.....KKF............',
    '.BB......FF.............',
  ],
  [
    '...........KK...........',
    '..........KKK...........',
    '.........KKKK...........',
    '........KKKKK...........',
    '.......KVVVVKK..........',
    '....KKKKKKKKKKKK........',
    '......HHGGGG............',
    '.....HHHGGEG............',
    '....HHHHGGGGN...........',
    '...CHHHKKGG.............',
    '.CCCCKKKKKKA............',
    'CCC.KKKKKKKAA...........',
    'BB..KKKKKKKKSSSSSSSSSS..',
    'BBBBSSSSSSSSSSSSSSSSSSSS',
    'BBBBB....KKF............',
    'BB.......FF.............',
  ],
];
const WITCH_PAL = { K: '#1F1A2B', V: '#9A4DDB', H: '#E8711C', G: '#8BC34A', E: '#111111', N: '#6E9E36', C: '#4B2D6E', A: '#8BC34A', S: '#8B5A2B', B: '#D9A441', F: '#111111' };
const GHOST = [
  [
    '....WWWWWW....',
    '..WWWWWWWWWW..',
    '.WWWWWWWWWWWW.',
    '.WWWWWWWWWWWW.',
    'WWWEEWWWWEEWWW',
    'WWWEEWWWWEEWWW',
    'WWWWWWWWWWWWWW',
    'WWWWWWEEEWWWWW',
    'WWWWWEEEEEWWWW',
    'wWWWWWEEEWWWWw',
    'wWWWWWWWWWWWWw',
    'wWWWWWWWWWWWWw',
    '.wWWWwWWWwWWw.',
    '..ww..ww..ww..',
  ],
  [
    '....WWWWWW....',
    '..WWWWWWWWWW..',
    '.WWWWWWWWWWWW.',
    '.WWWWWWWWWWWW.',
    'WWWEEWWWWEEWWW',
    'WWWEEWWWWEEWWW',
    'WWWWWWWWWWWWWW',
    'WWWWWWEEEWWWWW',
    'WWWWWEEEEEWWWW',
    'wWWWWWEEEWWWWw',
    'wWWWWWWWWWWWWw',
    'wWWWWWWWWWWWWw',
    '.WWwWWWwWWWwW.',
    '.w..ww..ww..w.',
  ],
];
const GHOST_PAL = { W: '#F4F2FF', w: '#C9C4E6', E: '#2A2140' };
const BAT = [
  ['B.........B', 'BB.......BB', 'BBB.BRB.BBB', '.BBBBBBBBB.', '....BBB....'],
  ['...........', '....BRB....', 'BBBBBBBBBBB', '.BB.BBB.BB.', 'B...BBB...B'],
];
const BAT_PAL = { B: '#1B1424', R: '#FF3B3B' };

function sprite(rows, pal, flip = false, outline = true) {
  const w = rows[0].length, p = new Pix(w + 2, rows.length + 2);
  rows.forEach((row, j) => [...row].forEach((ch, i) => { if (pal[ch]) p.px(1 + (flip ? w - 1 - i : i), 1 + j, pal[ch]); }));
  if (outline) p.outline(OUT);
  return p;
}
// sprites ya pasados a canvas (solo navegador), con caché
const cache = new Map();
function cv(key, make) { let c = cache.get(key); if (!c) { c = make().toCanvas(); cache.set(key, c); } return c; }
export const witchCanvas = (f, flip) => cv(`w${f}${flip}`, () => sprite(WITCH[f], WITCH_PAL, flip));
export const ghostCanvas = (f) => cv(`g${f}`, () => sprite(GHOST[f], GHOST_PAL));
export const batCanvas = (f) => cv(`b${f}`, () => sprite(BAT[f], BAT_PAL, false, false));
// para revisar en Node
export const SKY_PIX = { witch: (f, flip) => sprite(WITCH[f], WITCH_PAL, flip), ghost: (f) => sprite(GHOST[f], GHOST_PAL), bat: (f) => sprite(BAT[f], BAT_PAL, false, false) };

// ---------- el Paximón del vampiro ----------
// Piezas que no están en la BBDD: el cuello alto de la capa (detrás del cuerpo) y los colmillos
export function vampParts() {
  const cx = 32, cy = 29;
  const rows = [];
  for (let y = 0; y < 30; y++) {
    let row = '';
    for (let x = 0; x < 64; x++) {
      // dos alas del cuello alto, abiertas por arriba (la punta de la estrella asoma entre ellas)
      const ax = Math.abs(x + 0.5 - cx), up = cy - (y + 0.5);
      const outer = 9 + up * 0.75 + 1.6 * Math.abs(Math.sin(up * 0.55));   // borde de fuera con picos
      const inner = 6 + up * 0.18;
      if (up < 0 || up > 25 || ax > outer || ax < inner) row += '.';
      else if (ax > outer - 2 || ax < inner + 1.5 || up > 23.5) row += 'K';
      else if (ax > outer - 5) row += 'R';
      else row += 'r';
    }
    rows.push(row);
  }
  const collar = { id: 'acc_vamp_collar', kind: 'accessory', width: 64, height: 30, offset_x: 0, offset_y: 4, pixels: rows, palette: { K: '#141018', R: '#B3122E', r: '#6E0A1C' } };
  const fangs = { id: 'acc_vamp_fangs', kind: 'accessory', width: 8, height: 3, offset_x: 28, offset_y: 43,
    pixels: ['WW....WW', '.W....W.', '.K....K.'], palette: { W: '#FFFFFF', K: '#1A1A1A' } };
  return { [collar.id]: collar, [fangs.id]: fangs };
}
