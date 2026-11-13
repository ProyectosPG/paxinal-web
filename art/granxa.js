// Páxinal Crossing · arte con el estilo de Paximón.
// Lo que ya existía en Paximón (hierba, caminos, casas, hórreo, estación, tren, coches, farolas…)
// se pinta con su misma biblioteca (carpeta paximon/). Aquí solo está lo nuevo, hecho con sus
// mismas piezas y colores: tierra arada, cultivos, la omnea, las oficinas de Páxinas, el parking,
// el paso a nivel, el cartel de cada casa y las estaciones del año.
import {
  Pix, T, hash, rng, OUT, GRASS, WOOD, GLASS, GRANITE, paintGround as paintBase, groundShadow,
  trapezoidRoof, plasterWall, windowAt, doorAt, galeria, star, chimney, stoneBlocks, PLASTER, DOOR,
} from './paximon/townart.js';
import { paintObject as paintPx, TILES, text, textW, flipPix } from './paximon/worldart.js';
import { shade } from './paximon/avatar.js';
import { seaIcon } from './mar.js';
import * as V from './vila.js';

export { T };

// ---------- estaciones: se cambian los colores de la hierba y de las hojas ----------
const OAK = ['#2F7040', '#43924F', '#5DB062', '#86CF79'], OAK_OUT = '#1E3A26';
export const SEASONS = {
  inverno: { name: 'Inverno', q: 'Q1', grass: ['#93B58A', '#76986F', '#B5CEAC'], bare: true, frost: true },
  primavera: { name: 'Primavera', q: 'Q2', grass: null, leaves: null, chest: ['#4F8A2E', '#66A83A', '#86C64C', '#AEDF72'] },
  verao: { name: 'Verán', q: 'Q3', grass: ['#8CC85E', '#6DAA4B', '#B2DF7B'], leaves: ['#2E6A36', '#41894A', '#5BA85A', '#82C775'], chest: ['#467E2A', '#5C9C34', '#7BBA46', '#A2D466'] },
  outono: { name: 'Outono', q: 'Q4', grass: ['#A9BD63', '#8AA04F', '#C8D684'], leaves: ['#8E3F1E', '#BC5E2C', '#E0873A', '#F4B65A'], leafOut: '#4A2412', chest: ['#86661C', '#B38B2A', '#D9B23E', '#F0D46E'], chestOut: '#4A3810', fallen: true },
};

function remap(pix, table) {
  for (let i = 0; i < pix.d.length; i++) { const c = pix.d[i]; if (c && table[c]) pix.d[i] = table[c]; }
  return pix;
}

// ---------- casillas nuevas ----------
const SOIL = { base: '#9A6A43', dark: '#7A4E2E', light: '#B8855A', edge: '#6B4429' };
const SOIL_WET = { base: '#76502F', dark: '#5C3B22', light: '#8E6440', edge: '#4E321C' };
const ASP = { base: '#6E7078', dark: '#5E6068', light: '#858790', line: '#F1EFE6' };
const PLANK = { base: '#8C8276', dark: '#6E665C', light: '#A69C8F' };
const soft = (t) => t === 'grass' || t === 'flowers';

function soil(S) {
  return (p, X, Y, h, n) => {
    p.rect(X, Y, T, T, S.base);
    for (let y = 0; y < T; y++) { const k = y % 4; if (k === 0) p.hline(X, X + 15, Y + y, S.light); else if (k === 3) p.hline(X, X + 15, Y + y, S.dark); }
    const r = rng(h);
    for (let k = 0; k < 3; k++) p.px(X + 1 + Math.floor(r() * 14), Y + 1 + 4 * Math.floor(r() * 3) + 1, S.dark);
    if (soft(n.u)) p.hline(X, X + 15, Y, S.edge);
    if (soft(n.d)) p.hline(X, X + 15, Y + 15, S.edge);
    if (soft(n.l)) p.vline(X, Y, Y + 15, S.edge);
    if (soft(n.r)) p.vline(X + 15, Y, Y + 15, S.edge);
  };
}
function asphaltBase(p, X, Y, h) {
  p.rect(X, Y, T, T, ASP.base);
  const r = rng(h);
  for (let k = 0; k < 10; k++) p.px(X + Math.floor(r() * 16), Y + Math.floor(r() * 16), r() < 0.5 ? ASP.dark : ASP.light);
}
function planks(p, X, Y, y0, y1, skip = []) {
  for (let y = y0; y <= y1; y++) {
    if (skip.includes(y)) continue;
    const k = (Y + y) % 4;
    p.hline(X, X + 15, Y + y, k === 3 ? PLANK.dark : k === 0 ? PLANK.light : PLANK.base);
  }
}
const MY_TILES = {
  soil: soil(SOIL),
  soil_wet: soil(SOIL_WET),
  parking: (p, X, Y, h) => asphaltBase(p, X, Y, h),
  // plaza de aparcamiento: 3 casillas de ancho (los coches miden 48 px), con su raya; empiezan en columnas múltiplo de 3
  bay: (p, X, Y, h, n, f, x) => {
    asphaltBase(p, X, Y, h);
    if (x % 3 === 0) p.vline(X, Y + 1, Y + 14, ASP.line);
    if (n.r !== 'bay' && x % 3 === 2) p.vline(X + 15, Y + 1, Y + 14, ASP.line);
  },
  zebra_v: (p, X, Y, h) => { asphaltBase(p, X, Y, h); for (let x = 1; x < 16; x += 5) p.rect(X + x, Y + 1, 3, 14, ASP.line); },
  zebra_h: (p, X, Y, h) => { asphaltBase(p, X, Y, h); for (let y = 1; y < 16; y += 5) p.rect(X + 1, Y + y, 14, 3, ASP.line); },
  // paso a nivel: tablones sobre la vía
  xing_g: (p, X, Y) => planks(p, X, Y, 0, 15),
  xing_t: (p, X, Y, h, n) => { TILES.rail_t(p, X, Y, h, n); planks(p, X, Y, 4, 15, [9, 10, 11]); },
  xing_b: (p, X, Y, h, n) => { TILES.rail_b(p, X, Y, h, n); planks(p, X, Y, 0, 11, [4, 5, 6]); },
};

// Suelo entero de una estación del año. frame = oleaje del agua.
export function paintGround(map, S, frame) {
  const p = paintBase(map, frame, { ...TILES, ...MY_TILES });
  const g0 = S.grass ? S.grass[0] : GRASS.base;
  if (S.grass) remap(p, { [GRASS.base]: S.grass[0], [GRASS.dark]: S.grass[1], [GRASS.light]: S.grass[2] });
  if (S.frost || S.fallen) for (let i = 0; i < p.d.length; i++) {
    if (p.d[i] !== g0) continue;
    const k = hash(i % p.w, (i / p.w) | 0, 77) % 1000;
    if (S.frost && k < 9) p.d[i] = '#EEF5F2';
    else if (S.fallen && k < 7) p.d[i] = k < 3 ? '#D9822F' : '#C4652E';
  }
  return p.toCanvas();
}

// ---------- objetos de Paximón tal cual (y los nuevos de aquí con la misma receta) ----------
export function px(o) {
  if (NEW_PAINTERS[o.kind]) return NEW_PAINTERS[o.kind](o);
  const r = paintPx(o); return { cv: r.pix.toCanvas(), top: r.top, w: r.pix.w, h: r.pix.h };
}
const NEW_PAINTERS = {
  bonsai_plant: () => bonsaiPlant(),
  web_frame: () => webFrame(),
  ficha_frame: () => fichaFrame(),
  planter: (o) => V.planter(o.variant || 0),
  bandeira: () => V.bandeira(),
  papeleira: () => V.papeleira(),
  pales: () => V.pales(),
  columpio: () => V.columpio(),
  tobogan: () => V.tobogan(),
  palleiro: () => V.palleiro(),
  pozo: () => V.pozo(),
};
// La web que venden Brais y Vanesa, enmarcada para colgar: navegador, cabecera, foto y botones
function webFrame() {
  const p = new Pix(32, 24);
  p.rect(0, 0, 32, 24, '#C9A04A'); p.rect(2, 2, 28, 20, '#FFFFFF');
  p.rect(2, 2, 28, 3, '#E0E0E0'); p.px(4, 3, '#FF5F57'); p.px(6, 3, '#FEBC2E'); p.px(8, 3, '#28C840'); p.hline(11, 27, 3, '#FFFFFF');
  p.rect(2, 5, 28, 3, '#1E88E5'); text(p, 4, 5, 'WEB', '#FFFFFF');
  p.rect(4, 10, 11, 8, '#86CDF2'); p.rect(4, 15, 11, 3, '#5DB062'); p.ellipse(12, 12, 1.4, 1.4, '#FFE082');
  for (const y of [10, 12, 14]) p.hline(17, 27, y, '#9E9A92');
  p.rect(17, 16, 8, 3, '#E53935'); p.hline(18, 23, 17, '#FFCDD2');
  p.outline(OUT);
  return { cv: p.toCanvas(), top: 0, w: 32, h: 24 };
}
// La ficha de Google Maps: un mapa con la chincheta roja y cinco estrellitas
function fichaFrame() {
  const p = new Pix(16, 20);
  p.rect(0, 0, 16, 20, '#3E4A5C'); p.rect(1, 1, 14, 18, '#E8F0E3');
  p.rect(1, 9, 14, 2, '#FFFFFF'); p.rect(6, 1, 2, 18, '#FFFFFF'); p.rect(9, 12, 6, 7, '#B7E1FA');
  p.ellipse(8, 6, 3, 3, '#E53935'); p.px(8, 6, '#FFFFFF'); for (let y = 8; y < 12; y++) p.px(8, y, '#C62828');
  for (let i = 0; i < 5; i++) p.px(3 + i * 2, 16, '#FFC107');
  p.outline(OUT);
  return { cv: p.toCanvas(), top: 0, w: 16, h: 20 };
}

// ---------- árboles con estación ----------
// Los de Paximón miden 16x26, casi como una persona. Aquí son de verdad: copa de 2 o 3 casillas
// y 44-52 px de alto, hechos con las mismas paletas, el mismo sombreado en bandas y el mismo contorno.
function line(p, x0, y0, x1, y1, c) {
  const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) || 1;
  for (let i = 0; i <= n; i++) p.px(Math.round(x0 + ((x1 - x0) * i) / n), Math.round(y0 + ((y1 - y0) * i) / n), c);
}
// Copa hecha de lóbulos redondos [cx, cy, rx, ry]: el de más abajo va delante y cada uno tiene su brillo,
// así se ven las «bolas» de hojas de los árboles de Paximón pero en grande.
function lobes(p, L, C, seed, wob = 0.07) {
  const r = rng(seed), ph = L.map(() => r() * 6);
  const inL = (i, x, y) => {
    const [cx, cy, rx, ry] = L[i], dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry;
    return Math.hypot(dx, dy) * (1 + wob * Math.sin(Math.atan2(dy, dx) * 7 + ph[i])) <= 1;
  };
  const owner = (x, y) => { let o = -1; for (let i = 0; i < L.length; i++) if (inL(i, x, y) && (o < 0 || L[i][1] > L[o][1])) o = i; return o; };
  const x0 = Math.floor(Math.min(...L.map((l) => l[0] - l[2] * 1.1))), x1 = Math.ceil(Math.max(...L.map((l) => l[0] + l[2] * 1.1)));
  const y0 = Math.floor(Math.min(...L.map((l) => l[1] - l[3] * 1.1))), y1 = Math.ceil(Math.max(...L.map((l) => l[1] + l[3] * 1.1)));
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    const o = owner(x, y); if (o < 0) continue;
    const [cx, cy, rx, ry] = L[o], dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry;
    const l = -dx * 0.55 - dy * 0.85 + (r() - 0.5) * 0.28;
    let c = l > 0.62 ? C[3] : l > 0.16 ? C[2] : l < -0.44 ? C[0] : C[1];
    const below = owner(x, y + 1);
    if (below >= 0 && below !== o && L[below][1] > cy) c = C[0];   // sombra del lóbulo de delante
    p.px(x, y, c);
  }
  // hojitas sueltas
  for (let k = 0; k < 16; k++) {
    const x = x0 + 2 + Math.floor(r() * (x1 - x0 - 3)), y = y0 + 2 + Math.floor(r() * (y1 - y0 - 3));
    const c = p.get(x, y);
    if (c === C[1] || c === C[2]) { p.px(x, y, C[0]); p.px(x + 1, y + 1, C[0]); }
    else if (c === C[3]) p.px(x + 1, y, C[2]);
  }
}
function trunk(p, cx, y0, y1, w = 6) {
  const x0 = Math.round(cx - w / 2);
  p.rect(x0, y0, w, y1 - y0 + 1, '#8A5A3A');
  p.vline(x0 + w - 1, y0, y1, '#664026'); p.vline(x0 + w - 2, y0 + 2, y1, '#7A4E30'); p.vline(x0, y0 + 1, y1, '#A8744C');
  p.px(x0 - 1, y1, '#8A5A3A'); p.px(x0 - 1, y1 - 1, '#A8744C'); p.px(x0 + w, y1, '#664026'); p.px(x0 + w, y1 - 1, '#664026');
  for (let y = y0 + 3; y < y1 - 1; y += 4) p.px(x0 + 2 + (y % 3), y, '#664026');
  p.hline(x0, x0 + w - 1, y0, '#3C2A1C'); p.hline(x0 + 1, x0 + w - 2, y0 + 1, '#5A3A22');
}
const LOBES = {
  // carballo: copa redonda y alta
  carballo: [[20, 16, 15, 13], [10, 21, 9, 8], [30, 21, 9, 8], [14, 9, 8, 7], [26, 9, 8, 7], [20, 26, 11, 6]],
  // castiñeiro: copa más ancha y aplastada
  castineiro: [[20, 15, 16, 11], [8, 19, 8, 7.5], [32, 19, 8, 7.5], [20, 8, 12, 7], [13, 24, 9, 6], [27, 24, 9, 6]],
};
function bigLeafy(kind, seed) {
  const p = new Pix(40, 48), r = rng(seed * 7 + 3);
  const L = LOBES[kind].map(([cx, cy, rx, ry]) => [cx + Math.round((r() - 0.5) * 2), cy + Math.round((r() - 0.5) * 2), rx + (r() - 0.5) * 1.4, ry + (r() - 0.5) * 1.2]);
  trunk(p, 20, 27, 43, kind === 'castineiro' ? 7 : 6);
  lobes(p, L, OAK, seed);
  if (kind === 'castineiro') for (let k = 0; k < 7; k++) {   // ourizos (las castañas en su erizo)
    const x = 6 + Math.floor(r() * 28), y = 6 + Math.floor(r() * 20), c = p.get(x, y);
    if (c && c !== OAK[0]) { p.px(x, y, '#C9B54A'); p.px(x + 1, y, '#A8962E'); p.px(x, y - 1, '#E3D27A'); }
  }
  p.outline(OAK_OUT);
  groundShadow(p, 20, 45.5, 12, 2);
  return p;
}
function bigPine(seed) {
  const p = new Pix(32, 52), r = rng(seed);
  const C = ['#245C3A', '#337A4A', '#4C9A5E', '#6DBA74'];
  p.rect(14, 38, 4, 9, '#7A4E2E'); p.vline(17, 38, 46, '#5A3820'); p.vline(14, 39, 46, '#8E6040'); p.hline(14, 17, 38, '#3C2A1C');
  const tiers = [[0, 12, 5.5], [6, 21, 9], [13, 30, 12], [21, 39, 15]];
  for (const [top, base, hw] of tiers) for (let y = top; y <= base; y++) {
    const w = ((y - top) / (base - top)) * hw + 0.8;
    for (let x = Math.floor(16 - w); x <= Math.ceil(16 + w) - 1; x++) {
      const rel = (x + 0.5 - 16) / w;
      let c = rel < -0.35 ? C[2] : rel > 0.42 ? C[0] : C[1];
      if (y === base || (y === base - 1 && x % 2)) c = C[0];
      if (rel < -0.55 && y < base - 1 && r() < 0.6) c = C[3];
      if (rel > -0.1 && rel < 0.3 && y < base - 2 && r() < 0.08) c = C[0];
      p.px(x, y, c);
    }
  }
  p.outline('#1A3A28');
  groundShadow(p, 16, 48.5, 10, 1.8);
  return p;
}
// en invierno los carballos y castiñeiros se quedan en los huesos, con escarcha en las ramitas
function bigBare(seed) {
  const p = new Pix(40, 48), r = rng(seed), B = '#7A5236', BL = '#9A6E4A';
  trunk(p, 20, 20, 43, 6);
  const branch = (x0, y0, x1, y1, c = B) => { line(p, x0, y0, x1, y1, c); line(p, x0 + 1, y0, x1 + 1, y1, c); };
  branch(18, 22, 7, 9); branch(21, 22, 32, 8); branch(19, 21, 18, 3, BL); branch(21, 24, 36, 18); branch(18, 25, 4, 18);
  const twigs = [[7, 9, 3, 4], [7, 9, 10, 2], [32, 8, 36, 3], [32, 8, 28, 2], [18, 3, 14, 0], [18, 3, 22, 0], [36, 18, 39, 14], [4, 18, 1, 13], [12, 15, 10, 9], [27, 14, 30, 9]];
  for (const [a, b, c, d] of twigs) line(p, a, b, c, d, r() < 0.5 ? B : BL);
  for (const [, , x, y] of twigs) { p.px(x, y, '#EEF4F2'); if (r() < 0.6) p.px(x + 1, y, '#DDEBE8'); }
  p.outline('#3C2A1C');
  groundShadow(p, 20, 45.5, 10, 1.8);
  return p;
}
// kind: carballo | castineiro | pineiro. Devuelve {cv, top, ox}: ox centra el tronco en su casilla.
export function tree(kind, seed, S) {
  let p;
  if (kind === 'pineiro') p = bigPine(seed);
  else if (S.bare) p = bigBare(seed);
  else {
    p = bigLeafy(kind === 'castineiro' ? 'castineiro' : 'carballo', seed);
    const pal = kind === 'castineiro' ? S.chest : S.leaves, out = kind === 'castineiro' ? S.chestOut : S.leafOut;
    if (pal) remap(p, { [OAK[0]]: pal[0], [OAK[1]]: pal[1], [OAK[2]]: pal[2], [OAK[3]]: pal[3], ...(out ? { [OAK_OUT]: out } : {}) });
  }
  return { cv: p.toCanvas(), top: p.h - T, ox: -Math.round((p.w - T) / 2), pix: p };
}

// ---------- coches, farola, hórreo y tren a escala ----------
// Coche visto de lado, mirando a la izquierda: 48 px (3 casillas) en vez de 32.
export function car(v = '#4F83C2') {
  const p = new Pix(48, 28), top = 12;
  const dk = shade(v, -0.3), lt = shade(v, 0.25), ddk = shade(v, -0.45);
  // carrocería
  p.rect(1, 14, 46, 9, v); p.hline(2, 45, 14, lt); p.hline(1, 46, 22, dk);
  p.rect(0, 16, 2, 5, v); p.rect(46, 15, 2, 6, v);
  // cabina con el parabrisas inclinado
  for (let j = 0; j < 9; j++) { const xa = 17 - Math.round(j * 0.75), xb = 35 + Math.min(2, Math.round(j * 0.3)); p.hline(xa, xb, 5 + j, j === 0 ? lt : v); }
  p.rect(16, 7, 8, 6, GLASS.base); p.rect(26, 7, 8, 6, GLASS.base);
  for (let j = 0; j < 4; j++) p.px(15 + Math.round((3 - j) * 0.75), 8 + j, GLASS.base);
  p.px(17, 8, GLASS.light); p.px(18, 8, GLASS.light); p.px(27, 8, GLASS.light); p.hline(16, 33, 12, GLASS.dark);
  p.vline(25, 6, 21, dk); p.px(21, 16, ddk); p.px(31, 16, ddk);
  // luces, parachoques y ruedas
  p.rect(0, 16, 2, 3, '#FFE082'); p.rect(46, 16, 2, 3, '#E53935');
  p.hline(1, 46, 20, dk);
  for (const x of [10, 38]) {
    p.ellipse(x, 21, 5, 4, ddk);
    p.ellipse(x, 23, 3.8, 3.8, '#222228'); p.ellipse(x, 23, 1.6, 1.6, '#9EA3AA'); p.px(x - 1, 22, '#C9CDD2');
  }
  p.outline(OUT);
  groundShadow(p, 24, 26.6, 22, 1.3);
  return { cv: p.toCanvas(), top, w: 48, h: 28 };
}
// Farola de Paximón estirada: 46 px, algo más del doble que una persona.
export function lamp() {
  const p = new Pix(16, 46), top = 30;
  p.rect(5, 41, 6, 4, '#3A3A48'); p.hline(5, 10, 41, '#565668'); p.rect(6, 38, 4, 3, '#3A3A48');
  p.rect(7, 12, 2, 27, '#3A3A48'); p.vline(7, 12, 38, '#565668');
  p.rect(4, 3, 8, 9, '#3A3A48'); p.rect(5, 5, 6, 6, '#FFE38A'); p.px(5, 5, '#FFF7D6'); p.px(6, 5, '#FFF7D6');
  p.rect(3, 2, 10, 2, '#3A3A48'); p.rect(7, 0, 2, 2, '#3A3A48');
  p.outline(OUT);
  return { cv: p.toCanvas(), top, points: [[8, 8]] };
}
// Hórreo de cuatro casillas (el de Paximón es de tres): pegoyos de granito, tornarratos y cruz.
export function horreo(len = 4) {
  const W = len * T, p = new Pix(W, 54), top = 38;
  const legs = len >= 4 ? [4, Math.round(W / 2) - 2, W - 9] : [4, 21, 39];
  for (const x of legs) {
    p.rect(x, 36, 5, 15, GRANITE.base); p.vline(x, 36, 50, GRANITE.light); p.vline(x + 4, 36, 50, GRANITE.dark);
    p.rect(x - 3, 33, 11, 3, GRANITE.light); p.hline(x - 3, x + 7, 35, GRANITE.dark);
  }
  p.rect(2, 17, W - 4, 16, '#B98A52');
  for (let x = 4; x < W - 3; x++) if (x % 3 === 0) p.vline(x, 19, 30, '#5D4127');
  p.rect(2, 17, W - 4, 2, GRANITE.base); p.rect(2, 31, W - 4, 2, GRANITE.base);
  p.rect(2, 17, 3, 16, GRANITE.light); p.rect(W - 5, 17, 3, 16, GRANITE.dark);
  trapezoidRoof(p, 0, 6, W, 12, '#C8643A', { inset: 1, course: 3 });
  p.rect(4, 0, 2, 7, GRANITE.light); p.rect(2, 2, 6, 2, GRANITE.light);
  p.rect(W - 6, 1, 2, 6, GRANITE.light); p.rect(W - 7, -1, 4, 3, GRANITE.light);
  p.outline(OUT);
  groundShadow(p, W / 2, 52.5, W / 2 - 4, 1.6);
  return { cv: p.toCanvas(), top };
}
// Tren de media distancia de Renfe: coches de 96 px y 46 de alto (el de Paximón era de juguete).
const RCW = 96, RH = 44;
export function trainPix(dir = 1, cars = 3, lit = false) {
  const p = new Pix(RCW * cars + 12, RH + 2);
  const BODY = '#F2F2EE', STRIPE = '#7B2D8E', STRIPE2 = '#C62828', WIN = lit ? '#FFE08A' : '#34495E', WINL = lit ? '#FFF4C8' : '#8FB3D9';
  for (let k = 0; k < cars; k++) {
    const x0 = k * RCW + 2, x1 = x0 + RCW - 3;
    p.rect(x0, 4, RCW - 2, 30, BODY); p.hline(x0, x1, 4, '#FFFFFF'); p.rect(x0, 1, RCW - 2, 3, '#9AA2AB'); p.hline(x0 + 2, x1 - 2, 0, '#B9C0C7');
    p.rect(x0, 27, RCW - 2, 3, STRIPE); p.hline(x0, x1, 30, STRIPE2); p.hline(x0, x1, 33, '#D9D9D2');
    for (let wx = x0 + 6; wx < x1 - 8; wx += 13) {
      if (Math.abs(wx + 5 - (x0 + 22)) < 9 || Math.abs(wx + 5 - (x1 - 20)) < 9) continue;   // las puertas
      p.rect(wx, 9, 10, 10, WIN); p.px(wx + 1, 10, WINL); p.px(wx + 2, 10, WINL); p.px(wx + 1, 11, WINL); p.hline(wx, wx + 9, 18, shade(WIN, -0.25));
    }
    for (const dx of [x0 + 18, x1 - 24]) { p.rect(dx, 7, 9, 26, STRIPE2); p.rect(dx + 2, 9, 5, 8, WIN); p.vline(dx + 4, 9, 32, shade(STRIPE2, -0.3)); }
    p.rect(x0, 34, RCW - 2, 4, '#3A3F47');
    for (const wx of [x0 + 12, x0 + 22, x1 - 22, x1 - 12]) { p.ellipse(wx, 39.5, 3.2, 3.2, '#1E1E24'); p.px(wx, 39, '#9AA2AB'); }
    if (k) p.rect(x0 - 2, 12, 2, 20, '#3A3F47');
  }
  const nx = RCW * cars;
  for (let y = 4; y < 38; y++) {
    const ext = Math.round(Math.sqrt(Math.max(0, 1 - ((y - 21) / 17) ** 2)) * 10);
    p.hline(nx, nx + ext, y, y >= 27 && y < 30 ? STRIPE : y === 30 ? STRIPE2 : y >= 34 ? '#3A3F47' : BODY);
  }
  p.rect(nx, 8, 7, 11, '#34495E'); p.px(nx + 1, 9, '#8FB3D9'); p.px(nx + 2, 9, '#8FB3D9');
  p.rect(nx + 5, 23, 4, 2, '#FFF59D');
  p.rect(RCW + 30, -1, 14, 2, '#555A63'); p.vline(RCW + 33, 0, 1, '#555A63'); p.vline(RCW + 40, 0, 1, '#555A63');
  p.outline(OUT);
  const q = dir > 0 ? p : flipPix(p);
  for (let k = 0; k < cars; k++) {   // «RENFE» en cada coche (después de girarlo, para que no salga al revés)
    const x0 = dir > 0 ? k * RCW + 2 : q.w - (k * RCW + 2) - (RCW - 2);
    text(q, x0 + 37, 20, 'RENFE', STRIPE);
  }
  return q;
}
export function train(dir, lit) { return trainPix(dir, 3, lit).toCanvas(); }

// ---------- casas y carteles ----------
// Casa de departamento: la misma casita de Paximón con el tejado de su color.
export function house(color) {
  const r = paintPx({ kind: 'building', type: 'casa', w: 5, h: 4, color, door: 2, seed: 1 });
  const roofH = 30, top = r.top;
  return { cv: r.pix.toCanvas(), top, lights: [[11, roofH + 9 + top, 10, 9], [80 - 21, roofH + 9 + top, 10, 9]] };
}
// Cartel de madera con el nombre del departamento y una franja de su color.
export function deptSign(lines, color) {
  const tw = Math.max(...lines.map(textW)), W = Math.max(28, tw + 10), bh = 6 + lines.length * 6, top = bh - 3;
  const p = new Pix(W, 16 + top); p.oy = top;
  for (const x of [4, W - 6]) { p.rect(x, 0, 2, 15, WOOD.dark); p.vline(x, 0, 14, WOOD.base); }
  p.rect(0, -top, W, bh, WOOD.base);
  p.hline(0, W - 1, -top, shade(color, 0.15)); p.hline(0, W - 1, -top + 1, color); p.hline(0, W - 1, -top + 2, shade(color, -0.25));
  p.hline(0, W - 1, -top + bh - 1, WOOD.dark);
  lines.forEach((s, i) => text(p, Math.round(W / 2 - textW(s) / 2), -top + 5 + i * 6, s, '#FFF3D6', WOOD.dark));
  p.oy = 0; p.outline(OUT);
  return { cv: p.toCanvas(), top, w: W };
}

// Oficinas de Páxinas: casa grande con galería, el rótulo con la estrella y escaparates.
export function paxinas() {
  const w = 8, h = 5, W = w * T, H = h * T, top = 10, roofH = 26, lights = [];
  const p = new Pix(W, H + top); p.oy = top;
  chimney(p, W - 24, -8, 7, 16); chimney(p, 17, -8, 7, 16);
  plasterWall(p, 3, roofH - 1, W - 6, H - roofH + 1);
  trapezoidRoof(p, 0, 0, W, roofH, '#C8463A', { inset: 4 });
  for (const x of [12, W - 24]) { windowAt(p, x, roofH + 6, 12, 11, { box: ['#E98AB8', '#F8C3DC'] }); lights.push([x + 1, roofH + 7 + top, 10, 9]); }
  const gx = 34, gy = roofH + 3, gw = W - 68, gh = 18;
  galeria(p, gx, gy, gw, gh);
  for (let x = gx + 2; x + 4 <= gx + gw - 2; x += 5) for (let y = gy + 2; y + 5 <= gy + gh - 6; y += 6) lights.push([x, y + top, 4, 5]);
  const label = 'PÁXINAS GALEGAS', tw = textW(label), bw = tw + 18, bx = Math.round(W / 2 - bw / 2), by = roofH + 25;
  p.rect(bx - 1, by - 1, bw + 2, 11, OUT); p.rect(bx, by, bw, 9, '#FFFFFF'); p.hline(bx, bx + bw - 1, by + 8, '#D9D9D2');
  star(p, bx + 7, by + 4, 4.4, '#FFC107', '#E08E00');
  text(p, bx + 14, by + 2, label, '#1F3864');
  const shop = (x, y, ww, hh) => {
    p.rect(x - 2, y - 2, ww + 4, hh + 3, '#3E4A5C');
    p.rect(x, y, ww, hh, GLASS.base); p.rect(x, y + hh - 4, ww, 4, GLASS.dark);
    for (let i = x + 7; i < x + ww; i += 8) p.vline(i, y, y + hh - 1, '#3E4A5C');
    p.px(x + 1, y + 1, GLASS.light); p.px(x + 2, y + 1, GLASS.light); p.px(x + 1, y + 2, GLASS.light);
    lights.push([x, y + top, ww, hh]);
  };
  shop(10, H - 17, 38, 12); shop(W - 48, H - 17, 38, 12);
  doorAt(p, W / 2 - 7, H - 19, 14, 18, { color: '#3E4A5C' });
  p.rect(W / 2 - 5, H - 17, 10, 7, GLASS.base); p.px(W / 2 - 4, H - 16, GLASS.light);
  lights.push([W / 2 - 5, H - 17 + top, 10, 7]);
  p.oy = 0; p.outline(OUT);
  return { cv: p.toCanvas(), top, lights };
}

// Cafetería y estación: las de Paximón, con sus ventanas para encenderlas de noche.
export function cafe() {
  const r = px({ kind: 'building', type: 'cafe', w: 7, h: 5, door: 3 }), H = 80, Wd = 112;
  return { ...r, lights: [[9, H - 24 + r.top, 30, 18], [Wd - 39, H - 24 + r.top, 30, 18], [52, H - 20 + r.top, 8, 7]] };
}
export function station(sign) {
  const w = 12, h = 5, r = px({ kind: 'building', type: 'station', w, h, door: 5.5, sign }), W = w * T, H = h * T, roofH = 24, cx = W / 2;
  const lights = [];
  for (let x = 16; x < W - 20; x += 30) if (Math.abs(x + 6 - cx) > 16) lights.push([x + 1, roofH + 21 + r.top, 10, H - roofH - 33]);
  lights.push([86, H - 22 + r.top, 20, 7]);
  return { ...r, lights };
}
// Panel de salidas con dos trenes: uno a Vigo y otro a Albacete, que nunca se sabe.
// rows: las dos próximas salidas [{dest, time, color}] (se repinta cada poco con el horario de verdad)
export function departures(rows = [{ dest: 'VIGO', time: '1' }, { dest: 'ALBACETE', time: '?', color: '#FF7043' }]) {
  const r = paintPx({ kind: 'departures' }), p = r.pix;
  rows.slice(0, 2).forEach((row, i) => {
    const c = row.color || '#FFB300', tw = textW(row.time);
    let d = String(row.dest);
    while (d.length > 1 && textW(d) > 58 - tw - 4) d = d.slice(0, -1);
    text(p, 4, 12 + i * 7, d, c); text(p, 60 - tw, 12 + i * 7, row.time, c);
  });
  return { cv: p.toCanvas(), top: r.top };
}

// ---------- Café Bonsai ----------
// El bonsái de la casa: un arbolito retorcido en su maceta (en la barra y como mueble)
function bonsaiAt(p, x, y, big = false) {
  const k = big ? 1.4 : 1;
  p.rect(x - 4 * k, y, 9 * k, 3, '#6D3B1F'); p.hline(x - 4 * k, x + 5 * k - 1, y, '#8E5A33'); p.hline(x - 3 * k, x + 4 * k - 1, y + 3, '#4A2C18');
  line(p, x, y - 1, x - 1, y - 4 * k, '#5A3A22'); line(p, x - 1, y - 4 * k, x + 2, y - 6 * k, '#5A3A22');
  blob(p, x - 2, y - 6 * k, 2.6 * k, 1.8 * k); blob(p, x + 3, y - 7 * k, 2.4 * k, 1.6 * k); blob(p, x + 1, y - 9 * k, 2 * k, 1.4 * k);
}
// Barra del Bonsai: madera oscura, una cafetera vieja, el bonsái y un servilletero
export function bonsaiBar(w = 5) {
  const W = w * T, top = 18, p = new Pix(W, 16 + top); p.oy = top;
  p.rect(0, 2, W, 14, '#4A2C18'); for (let x = 3; x < W; x += 7) p.vline(x, 4, 13, '#3A2210');
  p.hline(0, W - 1, 14, '#2E1A0C'); p.hline(0, W - 1, 15, '#22130A');
  p.rect(0, -3, W, 5, '#6B4A2E'); p.hline(0, W - 1, -3, '#8A6440'); p.hline(0, W - 1, 1, '#4A2C18');
  // cafetera vieja con una mancha
  p.rect(4, -15, 18, 12, '#7D8590'); p.hline(4, 21, -15, '#9EA5AE'); p.rect(4, -6, 18, 3, '#5E6570');
  p.rect(8, -8, 3, 3, '#222'); p.rect(15, -8, 3, 3, '#222'); p.px(19, -13, '#C62828'); p.px(10, -12, '#5A4030'); p.px(11, -11, '#5A4030');
  // el bonsái
  bonsaiAt(p, Math.round(W / 2) + 4, -5);
  // tazas sucias y servilletero
  for (const x of [W - 22, W - 16]) { p.rect(x, -6, 3, 3, '#F1EDE4'); p.px(x + 3, -5, '#F1EDE4'); }
  p.rect(W - 10, -8, 6, 5, '#B0B0B0'); p.rect(W - 9, -10, 4, 2, '#FFFFFF');
  p.oy = 0; p.outline(OUT);
  return { cv: p.toCanvas(), top, points: [[Math.round(W / 2), 2]] };   // la luz de encima de la barra
}
// El bonsái grande, como planta de suelo
export function bonsaiPlant() {
  const p = new Pix(16, 24), top = 8; p.oy = top;
  bonsaiAt(p, 7, 10, true);
  p.oy = 0; p.outline(OUT);
  return { cv: p.toCanvas(), top };
}
// Tele de bar con el fútbol puesto (de noche, repetición del partido)
export function barTV() {
  const p = new Pix(32, 22);
  p.rect(2, 1, 28, 18, '#1E1E24'); p.rect(4, 3, 24, 14, '#2E7D32');
  for (let x = 4; x < 28; x += 4) p.vline(x, 3, 16, '#388E3C');
  p.vline(16, 3, 16, '#E8F5E9'); p.ellipse(16, 10, 3, 3, null); p.ellipse(16, 10, 3, 3, '#2E7D32');
  for (let a = 0; a < 16; a++) p.px(Math.round(16 + Math.cos(a / 16 * 6.283) * 3), Math.round(10 + Math.sin(a / 16 * 6.283) * 3), '#E8F5E9');
  p.px(11, 8, '#E53935'); p.px(20, 12, '#1E88E5'); p.px(18, 9, '#FFFFFF');
  p.rect(14, 19, 4, 2, '#3A3A48');
  p.outline(OUT);
  return { cv: p.toCanvas(), top: 0, points: [[16, 10]] };
}
// ---------- cultivos ----------
const LF = ['#2F7040', '#43924F', '#5DB062', '#86CF79'];
function blob(p, cx, cy, rx, ry, pal = LF) {
  for (let y = Math.floor(cy - ry) - 1; y <= Math.ceil(cy + ry) + 1; y++) for (let x = Math.floor(cx - rx) - 1; x <= Math.ceil(cx + rx) + 1; x++) {
    const dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry;
    if (dx * dx + dy * dy > 1) continue;
    const l = -dx * 0.55 - dy * 0.85;
    p.px(x, y, l > 0.6 ? pal[3] : l > 0.1 ? pal[2] : l < -0.5 ? pal[0] : pal[1]);
  }
}
function cropSign(p, s, gold) {
  p.vline(12, 6, 12, WOOD.dark);
  p.rect(8, 0, 8, 7, gold ? '#FFD54F' : '#FFFFFF'); p.hline(8, 15, 6, gold ? '#E0A800' : '#D9D9D2');
  text(p, 8 + Math.floor((8 - textW(s)) / 2), 1, s, '#2B2230');
  if (gold) { p.px(7, -3, '#FFF59D'); p.px(15, -4, '#FFFFFF'); p.px(6, 1, '#FFE082'); }
}
const cropCache = {};
// kind: grelos | patacas | pementos | palabra | organico | ads | resenas · st: 0 semilla, 1 brote, 2 creciendo, 3 lista
// pos: posición de la palabra clave (sale en su cartelito)
export function crop(kind, st, pos = null) {
  const key = kind + st + (kind === 'palabra' ? ':' + pos : '');
  if (cropCache[key]) return cropCache[key];
  const top = 6, p = new Pix(16, 16 + top); p.oy = top;
  const by = 12;
  const kw = () => String(pos ?? (st === 3 ? 1 : st === 2 ? 12 : 50));
  if (st === 0) {
    // semillas recién plantadas: montoncitos claros con un puntito verde, para que se vean en la tierra mojada
    for (const x of [4, 8, 12]) { p.rect(x - 1, by, 3, 1, '#5C3B22'); p.px(x - 1, by - 1, '#E8D9A8'); p.px(x, by - 1, '#F4E9C4'); p.px(x + 1, by - 1, '#D2BE86'); p.px(x, by - 2, '#86CF79'); }
    if (kind === 'palabra') { cropSign(p, kw()); p.oy = 0; p.outline(OUT); return (cropCache[key] = { cv: p.toCanvas(), top }); }
    p.oy = 0;
    return (cropCache[key] = { cv: p.toCanvas(), top });
  }
  if (st === 1) {
    const x = kind === 'palabra' ? 5 : 8;
    p.vline(x, by - 2, by, LF[1]); p.px(x - 1, by - 3, LF[2]); p.px(x - 2, by - 3, LF[3]); p.px(x + 1, by - 3, LF[2]); p.px(x + 2, by - 4, LF[3]);
    if (kind === 'palabra') cropSign(p, kw());
  } else if (kind === 'grelos') {
    const big = st === 3;
    if (big) for (const [x, y] of [[4, -1], [8, -3], [12, 0]]) {
      line(p, 8, by - 3, x, y + 2, '#43924F');
      p.rect(x - 1, y, 3, 2, '#FFD54F'); p.px(x, y - 1, '#FFF59D'); p.px(x + 1, y + 1, '#E0A800');
    }
    blob(p, 5, by - 2, big ? 3.6 : 2.8, 2.4); blob(p, 11, by - 2, big ? 3.6 : 2.8, 2.4); blob(p, 8, by - 4, big ? 3 : 2.4, big ? 3.4 : 2.6);
  } else if (kind === 'patacas') {
    const big = st === 3;
    if (big) for (const [x, y] of [[3, by + 1], [12, by + 1]]) { p.ellipse(x, y, 2.2, 1.4, '#C08A4E'); p.px(x - 1, y - 1, '#DDB07A'); }
    blob(p, 8, by - 3, big ? 6 : 4.6, big ? 4.2 : 3.4, ['#2E6A33', '#43924F', '#5DB062', '#86CF79']);
    blob(p, 4, by - 1, 2.6, 2); blob(p, 12, by - 1, 2.6, 2);
    if (big) for (const [x, y] of [[6, by - 6], [10, by - 7], [8, by - 4]]) { p.px(x, y, '#FFFFFF'); p.px(x + 1, y, '#E1BEE7'); p.px(x, y + 1, '#CE93D8'); p.px(x + 1, y + 1, '#FFEB3B'); }
  } else if (kind === 'pementos') {
    const big = st === 3;
    blob(p, 8, by - (big ? 5 : 4), big ? 6 : 4.5, big ? 5 : 4, ['#2E6A33', '#3F8A3A', '#5DAA4E', '#86CF79']);
    if (big) for (const [x, y] of [[3, by - 4], [10, by - 3], [12, by - 8], [6, by - 9]]) {
      p.px(x, y - 1, '#1B5E20'); p.rect(x, y, 2, 3, '#2E7D32'); p.px(x, y, '#A5D66B'); p.px(x + 1, y + 2, '#1B5E20');
    }
  } else if (kind === 'palabra') {
    const big = st === 3;
    blob(p, 5, by - 3, big ? 4 : 3, big ? 3.6 : 2.8); blob(p, 4, by - (big ? 7 : 5), 2, 2);
    const n = Number(kw());
    cropSign(p, kw(), big && n <= 3);
  } else if (kind === 'organico') {
    // tráfico orgánico: una mata con hojas que suben en escalera, como una gráfica de visitas
    const big = st === 3, hs = st === 2 ? [3, 5, 7] : [4, 7, 10];
    hs.forEach((hh, i) => {
      const x = 4 + i * 4;
      p.vline(x, by - hh, by, '#43924F');
      blob(p, x - 1, by - hh + 1, 1.8, 1.5); blob(p, x + 1, by - hh + 3, 1.8, 1.5);
    });
    if (big) { line(p, 2, by - 3, 13, by - 12, '#2E7D32'); p.px(13, by - 12, '#2E7D32'); p.px(12, by - 12, '#2E7D32'); p.px(13, by - 11, '#2E7D32'); p.px(3, by - 4, '#A5D66B'); }
    blob(p, 8, by, 5, 1.6);
  } else if (kind === 'ads') {
    // tráfico de Ads: una planta con su etiqueta amarilla de «Anuncio» y, lista, llena de clics
    const big = st === 3;
    blob(p, 7, by - 3, big ? 4.6 : 3.6, big ? 3.6 : 3);
    p.vline(11, by - 9, by, WOOD.dark);
    p.rect(8, by - 14, 8, 6, '#F2C12E'); p.hline(8, 15, by - 9, '#C99700'); text(p, 9, by - 13, 'AD', '#2B2230');
    if (big) for (const [x, y] of [[2, by - 8], [6, by - 10], [3, by - 3]]) {   // cursores de ratón
      p.vline(x, y, y + 3, '#FFFFFF'); p.px(x + 1, y + 1, '#FFFFFF'); p.px(x + 1, y + 2, '#FFFFFF'); p.px(x + 2, y + 2, '#FFFFFF');
    }
  } else if (kind === 'resenas') {
    const tops = st === 3 ? [[4, by - 7], [8, by - 10], [12, by - 6]] : [[5, by - 6], [11, by - 7]];
    for (const [x, y] of tops) {
      line(p, 8, by, x, y + 3, '#43924F');
      if (st === 3) star(p, x, y, 3.4, '#FFC107', '#E08E00');
      else { p.rect(x - 1, y, 2, 2, '#D4E157'); p.px(x - 1, y, '#F0F4C3'); }
    }
    blob(p, 6, by - 1, 2.4, 1.6); blob(p, 10, by - 1, 2.4, 1.6);
  }
  p.oy = 0; p.outline(OUT);
  return (cropCache[key] = { cv: p.toCanvas(), top });
}

// Planta omnea: un infinito. Medio bucle de cintas azules y doradas y medio de nodos que brillan de noche.
export function omnea() {
  const top = 10, p = new Pix(24, 16 + top); p.oy = top;
  p.vline(12, 0, 13, '#43924F'); p.vline(11, 6, 13, '#2F7040');
  for (const [x, y] of [[9, 9], [8, 8], [10, 10], [14, 7], [15, 6], [13, 8]]) p.px(x, y, '#5DB062');
  const cy = -4, lx = 7, rx = 17;
  for (let y = cy - 6; y <= cy + 6; y++) for (let x = lx - 6; x <= lx + 6; x++) {
    const d = Math.hypot(x + 0.5 - lx, y + 0.5 - cy);
    if (d < 2.6 || d > 5) continue;
    const a = Math.atan2(y + 0.5 - cy, x + 0.5 - lx), band = d < 3.8 ? 0 : 1;
    p.px(x, y, (Math.floor((a + Math.PI) / (Math.PI / 3)) + band) % 2 ? '#2E9BE0' : '#D8A45A');
  }
  const nodes = [];
  for (let k = 0; k < 7; k++) { const a = -Math.PI / 2 + (k * 2 * Math.PI) / 7; nodes.push([Math.round(rx + Math.cos(a) * 4.4), Math.round(cy + Math.sin(a) * 4.4)]); }
  nodes.forEach(([x0, y0], k) => { const [x1, y1] = nodes[(k + 1) % nodes.length]; line(p, x0, y0, x1, y1, '#2E9BE0'); });
  line(p, nodes[0][0], nodes[0][1], nodes[3][0], nodes[3][1], '#3A7FB0');
  line(p, nodes[1][0], nodes[1][1], nodes[5][0], nodes[5][1], '#3A7FB0');
  for (const [x, y] of nodes) { p.rect(x, y, 2, 2, '#4FC3E8'); p.px(x, y, '#B8F0FF'); }
  p.rect(11, cy - 1, 3, 3, '#D8A45A'); p.px(12, cy, '#FFE7B0');
  p.oy = 0; p.outline(OUT);
  groundShadow(p, 12, 25, 5, 1.2);
  return { cv: p.toCanvas(), top, points: nodes.map(([x, y]) => [x + 1, y + 1 + top]) };
}

// ---------- piezas nuevas de O Agro ----------
// Valla que va de arriba abajo (la de Paximón solo va de lado a lado)
export function fenceV() {
  const p = new Pix(16, 22), top = 6; p.oy = top;
  p.rect(7, -6, 2, 22, WOOD.light); p.vline(8, -6, 15, WOOD.base);
  p.rect(6, 2, 4, 12, WOOD.base); p.vline(6, 2, 13, WOOD.light); p.vline(9, 2, 13, WOOD.dark); p.hline(6, 9, 2, WOOD.light);
  p.oy = 0; p.outline(OUT);
  return { cv: p.toCanvas(), top };
}
// Caja de envíos: cajón de madera con la tapa, la franja morada de Renfe Mercancías y una etiqueta
export function shipBox(full = false) {
  const p = new Pix(16, 24), top = 8; p.oy = top;
  p.rect(1, 1, 14, 14, WOOD.base); p.vline(1, 1, 14, WOOD.light); p.vline(14, 1, 14, WOOD.dark); p.hline(1, 14, 14, WOOD.dark);
  for (const y of [5, 10]) p.hline(2, 13, y, WOOD.gap);
  p.rect(1, 7, 14, 2, '#7B2D8E'); p.hline(1, 14, 8, '#5E1F6E');
  p.rect(0, -5, 16, 6, WOOD.dark); p.hline(0, 15, -5, WOOD.light); p.hline(1, 14, -4, WOOD.base); p.hline(0, 15, 0, WOOD.gap);
  p.rect(5, 2, 6, 3, '#FFFFFF'); p.hline(6, 9, 3, '#9E9A92');
  if (full) { p.rect(3, -8, 4, 3, '#43924F'); p.px(4, -9, '#86CF79'); p.rect(9, -7, 4, 2, '#C08A4E'); }
  p.oy = 0; p.outline(OUT);
  groundShadow(p, 8, 23, 7, 1);
  return { cv: p.toCanvas(), top };
}
// El pato de goma del estanque del parque (le cuentas tus penas y te da una pista)
export function duck() {
  const p = new Pix(16, 16);
  p.ellipse(8, 12.5, 6.5, 2, '#B7E1FA');
  p.ellipse(7, 10, 5, 3.2, '#FFD54F'); p.ellipse(6, 9, 3, 1.6, '#FFE57F');
  p.ellipse(10, 6, 3, 3, '#FFD54F'); p.px(9, 5, '#FFF59D');
  p.px(11, 5, '#2B2230'); p.rect(13, 6, 2, 2, '#FF8F00'); p.px(13, 7, '#E65100');
  p.outline(OUT);
  return { cv: p.toCanvas(), top: 0 };
}
// Tierra arada de una casilla: n dice qué vecinas también están aradas (para el borde con la hierba)
const soilCache = {};
export function soilTile(wet, n, v = 0) {
  const key = (wet ? 'w' : 'd') + (n.u ? 1 : 0) + (n.d ? 1 : 0) + (n.l ? 1 : 0) + (n.r ? 1 : 0) + v;
  if (soilCache[key]) return soilCache[key];
  const p = new Pix(16, 16), g = (b) => (b ? 'soil' : 'grass');
  MY_TILES[wet ? 'soil_wet' : 'soil'](p, 0, 0, hash(v, 3, 9), { u: g(n.u), d: g(n.d), l: g(n.l), r: g(n.r) });
  return (soilCache[key] = p.toCanvas());
}

// ---------- iconos de 16x16 para la mochila y las tiendas ----------
const SEED_COLORS = { grelos: '#7CB342', patacas: '#A1887F', pementos: '#43A047', palabra: '#1E88E5', organico: '#00897B', ads: '#F2C12E', resenas: '#FFC107', omnea: '#2E9BE0' };
function packet(p, c, kind) {
  p.rect(3, 2, 10, 13, '#F4EFE3'); p.rect(3, 2, 10, 4, c); p.hline(3, 12, 2, shade(c, 0.25)); p.vline(12, 2, 14, '#DDD3C0');
  p.hline(3, 12, 14, '#C9BDA6');
  for (let x = 4; x < 12; x += 2) p.px(x, 1, '#F4EFE3');
  if (kind === 'palabra') text(p, 5, 8, '50', '#1E3A8A');
  else if (kind === 'ads') text(p, 5, 8, 'AD', '#7A5C00');
  else if (kind === 'resenas') star(p, 8, 10, 3.2, '#FFC107', '#E08E00');
  else if (kind === 'omnea') { p.ellipse(6, 10, 2.2, 2.2, '#2E9BE0'); p.ellipse(10, 10, 2.2, 2.2, '#D8A45A'); p.px(6, 10, '#F4EFE3'); p.px(10, 10, '#F4EFE3'); }
  else { p.ellipse(8, 10, 2.4, 2, c); p.px(7, 9, shade(c, 0.4)); }
}
// regadera: c = [cuerpo, brillo, sombra]; big = la grande (más cuerpo y dos bocas)
function wateringCan(p, c, big = false) {
  const x0 = big ? 1 : 3, w = big ? 10 : 8, y0 = big ? 5 : 6;
  p.rect(x0, y0, w, 14 - y0, c[0]); p.hline(x0, x0 + w - 1, y0, c[1]); p.vline(x0 + w - 1, y0, 13, c[2]);
  line(p, x0 + w, 9, 14, 5, c[0]); p.rect(13, 3, 3, 2, c[1]);
  if (big) { p.px(15, 6, c[1]); p.px(15, 7, '#7FC8FF'); p.px(14, 8, '#7FC8FF'); }
  for (let x = x0 + 1; x < x0 + w - 1; x++) p.px(x, y0 - 2 + Math.round(Math.abs(x - (x0 + w / 2 - 0.5)) * 0.4), c[2]);
}
const ICONS = {
  azada: (p) => { line(p, 3, 13, 11, 5, WOOD.dark); line(p, 4, 13, 12, 5, WOOD.base); p.rect(9, 2, 5, 3, '#9EA5AE'); p.hline(9, 13, 2, '#C6CCD3'); p.rect(12, 4, 2, 3, '#747C86'); },
  azada_boa: (p) => { line(p, 3, 13, 11, 5, WOOD.dark); line(p, 4, 13, 12, 5, WOOD.light); p.rect(8, 1, 7, 4, '#E0B23C'); p.hline(8, 14, 1, '#FFE08A'); p.rect(12, 4, 3, 3, '#A8781C'); },
  regadera: (p) => wateringCan(p, ['#4C8DFF', '#8AB4FF', '#2E5BD6']),
  regadera_cobre: (p) => wateringCan(p, ['#C87533', '#E8A060', '#8E4B1E']),
  regadera_grande: (p) => wateringCan(p, ['#D4A017', '#FFE08A', '#9A6F0C'], true),
  cafe: (p) => {
    p.ellipse(8, 13.5, 7, 1.8, '#E6E6EE'); p.rect(3, 6, 9, 7, '#FFFFFF'); p.vline(11, 6, 12, '#CFCFDA');
    p.px(12, 7, '#FFFFFF'); p.px(13, 8, '#FFFFFF'); p.px(13, 9, '#FFFFFF'); p.px(12, 10, '#FFFFFF');
    p.hline(3, 11, 6, '#B07A4A'); p.hline(4, 9, 6, '#F3E2C7');
    for (const [x, y] of [[5, 3], [6, 2], [8, 4], [9, 3], [9, 1]]) p.px(x, y, '#E9E4F2');
  },
  grelos: (p) => { blob(p, 6, 9, 3.4, 3); blob(p, 10, 8, 3.4, 3.4); p.rect(7, 11, 2, 4, '#86CF79'); p.rect(9, 2, 3, 2, '#FFD54F'); },
  patacas: (p) => { p.ellipse(6, 10, 4, 3, '#C08A4E'); p.ellipse(10.5, 8, 3.5, 2.8, '#B07A45'); p.px(5, 9, '#DDB07A'); p.px(10, 7, '#DDB07A'); p.px(7, 11, '#8A5A33'); },
  pementos: (p) => { for (const [x, y] of [[4, 5], [8, 4], [11, 6]]) { p.rect(x, y + 2, 3, 6, '#2E7D32'); p.px(x, y + 2, '#A5D66B'); p.px(x + 1, y + 1, '#5D4037'); p.px(x + 1, y + 8, '#1B5E20'); } },
  pemento_picante: (p) => { p.rect(6, 4, 4, 9, '#2E7D32'); p.px(6, 4, '#A5D66B'); p.px(7, 3, '#5D4037'); p.px(8, 13, '#1B5E20'); for (const [x, y] of [[2, 3], [12, 2], [13, 6], [2, 9]]) p.px(x, y, '#FF5722'); p.px(12, 3, '#FFC107'); },
  palabra_top: (p) => { p.rect(2, 3, 12, 9, '#FFD54F'); p.hline(2, 13, 11, '#E0A800'); text(p, 7, 5, '1', '#2B2230'); p.vline(8, 12, 15, WOOD.dark); p.px(1, 1, '#FFF59D'); p.px(14, 2, '#FFFFFF'); },
  palabra_p1: (p) => { p.rect(2, 3, 12, 9, '#FFFFFF'); p.hline(2, 13, 11, '#D9D9D2'); text(p, 4, 5, 'P1', '#1E88E5'); p.vline(8, 12, 15, WOOD.dark); },
  palabra_p2: (p) => { p.rect(2, 3, 12, 9, '#E0E0E0'); p.hline(2, 13, 11, '#BDBDBD'); text(p, 4, 5, 'P2', '#757575'); p.vline(8, 12, 15, WOOD.dark); },
  organico: (p) => { for (const [x, h] of [[3, 4], [7, 7], [11, 10]]) p.rect(x, 14 - h, 3, h, '#43A047'); line(p, 2, 9, 13, 2, '#1B5E20'); p.px(12, 2, '#1B5E20'); p.px(13, 3, '#1B5E20'); },
  clics: (p) => { for (let y = 0; y < 9; y++) p.hline(4, 4 + Math.min(y, 6 - Math.max(0, y - 6) * 2), 3 + y, '#FFFFFF'); p.vline(7, 11, 14, '#FFFFFF'); p.vline(8, 11, 14, '#FFFFFF'); for (const [x, y] of [[11, 3], [13, 6], [11, 9]]) p.px(x, y, '#F2C12E'); },
  resena: (p) => star(p, 8, 8, 6.5, '#FFC107', '#E08E00'),
  resena_mala: (p) => { star(p, 8, 8, 6.5, '#9E9E9E', '#616161'); p.px(8, 8, '#E53935'); },
  furni: (p) => { p.rect(3, 5, 10, 7, WOOD.base); p.hline(3, 12, 5, WOOD.light); p.rect(3, 12, 2, 3, WOOD.dark); p.rect(11, 12, 2, 3, WOOD.dark); },
};
const iconCache = {};
export function itemIcon(id) {
  if (iconCache[id]) return iconCache[id];
  const p = new Pix(16, 16);
  if (id.startsWith('sem_')) { const k = id.slice(4); packet(p, SEED_COLORS[k] || '#9E9E9E', k); }
  else if (seaIcon(id, p)) { /* peces, basura del mar, caña, pienso y productos de los animales */ }
  else (ICONS[id] || ICONS[id.startsWith('m_') ? 'furni' : ''] || ((q) => q.rect(4, 4, 8, 8, '#9E9E9E')))(p);
  p.outline(OUT);
  return (iconCache[id] = p.toCanvas());
}
// La paxeta: moneda dorada con agujero en el centro, como la de 25 pesetas, y la estrella de Páxinas
export function paxetaIcon() {
  if (iconCache.$paxeta) return iconCache.$paxeta;
  const p = new Pix(12, 12);
  p.ellipse(6, 6, 5.6, 5.6, '#E0A21C'); p.ellipse(6, 6, 4.6, 4.6, '#FFC83D'); p.ellipse(5.2, 5, 2.8, 2.8, '#FFD86B');
  for (const [x, y] of [[6, 1], [2, 4], [10, 4], [3, 9], [9, 9]]) p.px(x, y, '#FF8F00');
  p.outline(OUT);
  p.ellipse(6, 6, 1.6, 1.6, null);
  for (const [x, y] of [[5, 4], [6, 4], [4, 5], [7, 5], [4, 6], [7, 6], [5, 7], [6, 7]]) p.px(x, y, '#9C6A0E');
  return (iconCache.$paxeta = p.toCanvas());
}

// ---------- emotes: la cabeza de tu muñeco con otra cara ----------
// grid: la matriz de avatarGrid(look, camiseta, 'down', 0)
export function emoteIcon(grid, id) {
  const p = new Pix(20, 18), ox = 2, oy = 3;
  for (let y = 0; y < 13; y++) for (let x = 0; x < 16; x++) if (grid[y][x]) p.px(ox + x, oy + y, grid[y][x]);
  const O = '#2A1F2D', skin = grid[6][7] || '#FFDDB8';
  const eye = (x, rows) => { for (let y = 9; y <= 10; y++) p.px(ox + x, oy + y, skin); rows.forEach(([dx, dy]) => p.px(ox + x + dx, oy + dy, O)); };
  const mouth = (pts, c = O) => pts.forEach(([x, y]) => p.px(ox + x, oy + y, c));
  switch (id) {
    case 'laugh': eye(5, [[-1, 10], [0, 9], [1, 10]]); eye(10, [[-1, 10], [0, 9], [1, 10]]); mouth([[6, 11], [7, 11], [8, 11], [9, 11], [7, 12], [8, 12]]); p.px(ox + 7, oy + 12, '#E57373'); break;
    case 'shout': eye(5, [[-1, 9], [0, 10]]); eye(10, [[1, 9], [0, 10]]); mouth([[7, 11], [8, 11], [6, 12], [9, 12], [7, 12], [8, 12]]); p.vline(18, 1, 4, '#E53935'); p.px(18, 6, '#E53935'); break;
    case 'cry': eye(5, [[-1, 9], [0, 9], [1, 9]]); eye(10, [[-1, 9], [0, 9], [1, 9]]); for (const x of [4, 5, 10, 11]) { p.px(ox + x, oy + 11, '#4FC3F7'); p.px(ox + x, oy + 12, '#4FC3F7'); } p.px(ox + 5, oy + 13, '#4FC3F7'); p.px(ox + 10, oy + 13, '#4FC3F7'); mouth([[7, 12], [8, 12]]); break;
    case 'cool': for (let x = 3; x <= 12; x++) { p.px(ox + x, oy + 9, '#1B1B22'); p.px(ox + x, oy + 10, x === 7 || x === 8 ? skin : '#1B1B22'); } p.px(ox + 4, oy + 9, '#5A5A70'); p.px(ox + 9, oy + 9, '#5A5A70'); mouth([[7, 12], [8, 12], [9, 11]]); break;
    case 'sleep': eye(5, [[-1, 10], [0, 10], [1, 10]]); eye(10, [[-1, 10], [0, 10], [1, 10]]); text(p, 15, 0, 'Z', '#7DA3EA'); p.px(13, 4, '#7DA3EA'); p.px(14, 4, '#7DA3EA'); p.px(14, 5, '#7DA3EA'); p.px(13, 6, '#7DA3EA'); p.px(14, 6, '#7DA3EA'); break;
    case 'boa': eye(5, [[-1, 10], [0, 9], [1, 10]]); eye(10, [[-1, 10], [0, 9], [1, 10]]); mouth([[6, 11], [9, 11], [7, 12], [8, 12]]); star(p, 17, 3, 2.8, '#FFC107', '#E08E00'); break;
    case 'hmm': eye(5, [[0, 9], [0, 10]]); eye(10, [[0, 10], [-1, 8], [0, 8], [1, 8]]); mouth([[7, 12], [8, 12], [9, 12]]); text(p, 16, 1, '?', '#FFB300'); break;
    case 'cafe': mouth([[7, 12], [8, 12]]); p.rect(14, 9, 5, 5, '#FFFFFF'); p.hline(14, 18, 9, '#B07A4A'); p.px(19, 10, '#FFFFFF'); p.px(19, 11, '#FFFFFF'); p.px(15, 7, '#E9E4F2'); p.px(16, 6, '#E9E4F2'); p.px(17, 7, '#E9E4F2'); break;
  }
  p.outline(OUT);
  return p.toCanvas();
}

// Partículas de la granja (auditoría A07): terrón al arar, gota al regar, hojita al plantar o arrancar
// y polvo al cosechar. Son muy pequeñas: el juego las escala con el zoom.
export function fxParticle(kind) {
  const P = {
    clod: [3, 3, ['.a.', 'aba', '.b.'], { a: '#C99A62', b: '#6E4524' }],
    drop: [2, 3, ['a.', 'ab', 'bb'], { a: '#CFEAFF', b: '#4C9BFF' }],
    leaf: [3, 3, ['.a.', 'aab', '.b.'], { a: '#8BC34A', b: '#4E8A2A' }],
    dust: [2, 2, ['ab', 'bb'], { a: '#FFF4D6', b: '#D9C9A3' }],
  }[kind] || [1, 1, ['a'], { a: '#FFFFFF' }];
  const [w, h, rows, C] = P, p = new Pix(w, h);
  rows.forEach((r, y) => [...r].forEach((ch, x) => { if (C[ch]) p.px(x, y, C[ch]); }));
  return p.toCanvas();
}

// Flecha amarilla de la guía del primer día (apunta a la derecha; el juego la gira hacia donde toca)
export function guideArrow() {
  const rows = ['......o......', '......oo.....', '......oho....', 'ooooooohyo...', 'ohhhhhhhyyo..', 'oyyyyyyyyyyo.',
    'oddddddddyo..', 'oooooooddo...', '......odo....', '......oo.....', '......o......'];
  const C = { o: '#2B2230', y: '#FFD36B', h: '#FFF2C2', d: '#E0A93A' };
  const p = new Pix(13, 11);
  rows.forEach((r, y) => [...r].forEach((ch, x) => { if (C[ch]) p.px(x, y, C[ch]); }));
  return p.toCanvas();
}

// ---------- letreros con la letra de píxeles ----------
// Etiqueta con el nombre: fondo oscuro, una franja del color del departamento y letra blanca
export function nameTag(name, color, opts = {}) {
  const s = String(name || '').toUpperCase(), tw = Math.max(1, textW(s)), W = tw + 8, Hh = 9;
  const p = new Pix(W, Hh), bg = opts.bg || '#1D1A24';
  p.rect(1, 0, W - 2, Hh, bg); p.rect(0, 1, W, Hh - 2, bg);
  p.rect(2, 2, 2, 5, color || '#9E9E9E');
  text(p, 5, 2, s, opts.ink || '#FFFFFF');
  return p.toCanvas();
}
// Barrera del paso a nivel en un ángulo (k de 0, abajo, a 8, arriba) con una de las luces encendida
const barrierCache = {};
export function barrier(dir, k, lit) {
  const key = dir + ':' + k + ':' + lit;
  if (barrierCache[key]) return barrierCache[key];
  const p = new Pix(72, 44), bx = 36, by = 38;
  p.rect(bx - 2, by - 13, 5, 15, '#2B2230'); p.rect(bx - 1, by - 12, 3, 13, '#5A5F6A');
  p.rect(bx - 5, by - 19, 11, 6, '#2B2230'); p.rect(bx - 4, by - 18, 9, 4, '#1E2024');
  p.rect(bx - 3, by - 17, 2, 2, lit === 1 ? '#FF5252' : '#6B1F1C');
  p.rect(bx + 2, by - 17, 2, 2, lit === 2 ? '#FF5252' : '#6B1F1C');
  const a = (k / 8) * (Math.PI / 2) * 0.95;
  for (let i = 2; i < 32; i++) p.rect(Math.round(bx + dir * Math.cos(a) * i), Math.round(by - 9 - Math.sin(a) * i) - 1, 1, 4, '#2B2230');
  for (let i = 2; i < 31; i++) p.rect(Math.round(bx + dir * Math.cos(a) * i), Math.round(by - 9 - Math.sin(a) * i), 1, 2, (i >> 2) % 2 ? '#FFFFFF' : '#E53935');
  return (barrierCache[key] = { cv: p.toCanvas(), ox: bx, oy: by });
}
