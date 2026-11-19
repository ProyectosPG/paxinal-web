// Páxinal Crossing · arte de las eleccións: los cuatro Paxineitors candidatos (la estrella naranja de
// Páxinas con el complemento de su partido), en pequeño para andar por el pueblo y en grande para los
// carteles, la papeleta y el programa; y el mobiliario de campaña (cartel, caseta, atril, urna, precinto
// y la chapa «Votei»). Todo pintado por código, como el resto.
import { Pix, OUT } from './paximon/townart.js';
import { text, textW } from './paximon/worldart.js';
import { PARTY } from '../core/eleccions.js';

const toTex = (p, top = 0) => ({ cv: p.toCanvas(), top, w: p.w, h: p.h });
const BODY = ['#FFDD33', '#FFBE22', '#FF9D1C', '#F4720F'];
const bodyAt = (t) => BODY[t < -0.38 ? 0 : t < 0.02 ? 1 : t < 0.5 ? 2 : 3];

// estrella regordeta de cinco puntas (punta arriba), de amarillo arriba a naranja abajo
function star(p, cx, cy, R, rot = 0, flat = null) {
  const r = R * 0.56, A36 = Math.PI / 5, SEC = (2 * Math.PI) / 5, S36 = Math.sin(A36);
  for (let y = Math.floor(cy - R) - 1; y <= cy + R + 1; y++) for (let x = Math.floor(cx - R) - 1; x <= cx + R + 1; x++) {
    const dx = x + 0.5 - cx, dy = y + 0.5 - cy, d = Math.hypot(dx, dy);
    let a = Math.atan2(dx, -dy) - rot; a = ((a % SEC) + SEC) % SEC;
    const phi = a <= SEC / 2 ? a : SEC - a;
    const rho = Math.min(R * 0.94, (R * r * S36) / (R * Math.sin(phi) + r * Math.sin(A36 - phi)));
    if (d <= rho) p.px(x, y, flat || bodyAt(dy / R + (dx / R) * 0.15));
  }
}
const isBody = (c) => BODY.includes(c);

// ---------- en pequeño: 20×24 por fotograma, 3 fotogramas × 4 direcciones (como los muñecos) ----------
export const PW = 20, PH = 24;
function small(pid, dir, f) {
  const P = PARTY[pid], p = new Pix(PW, PH), cx = 10, cy = 14.5 - (f ? 1 : 0), rot = f === 1 ? 0.13 : f === 2 ? -0.13 : 0;
  star(p, cx, cy, 9.5, rot);
  const y0 = Math.round(cy - 1.5), sh = dir === 'left' ? -2 : dir === 'right' ? 2 : 0, front = dir !== 'up';
  if (pid === 'pax') {   // chaleco verde
    for (let y = y0 + 4; y < PH; y++) for (let x = 0; x < PW; x++) if (isBody(p.get(x, y)) && Math.abs(x + 0.5 - cx - sh * 0.5) > (front ? 1 : 0)) p.px(x, y, y > y0 + 6 ? P.dark : P.color);
  }
  if (front) {
    const ex = [cx - 2 + sh, cx + 1 + sh];
    if (pid === 'pp') { for (const x of ex) p.rect(x - 1, y0 - 1, 3, 3, '#D6E8FA'); p.hline(ex[0] - 1, ex[1] + 1, y0 - 1, '#2B2B33'); }
    for (const x of ex) { p.px(x, y0, '#1D1A24'); p.px(x, y0 + 1, '#1D1A24'); }
    p.px(ex[0] - 2, y0 + 2, '#F4511E'); p.px(ex[1] + 2, y0 + 2, '#F4511E');
    p.px(cx - 1 + sh, y0 + 3, '#7A2E0E'); p.px(cx + sh, y0 + 3, '#7A2E0E');
    if (pid === 'pp' || pid === 'psoe') { p.rect(cx - 1 + sh, y0 + 5, 2, 1, P.dark); p.rect(cx - 1 + sh, y0 + 6, 2, 2, P.color); }
    if (pid === 'psoe') { p.rect(17, y0 - 4, 2, 2, '#E53935'); p.px(18, y0 - 2, '#2E7D32'); p.px(18, y0 - 1, '#2E7D32'); }
    if (pid === 'fa') { p.hline(cx - 4 + sh, cx + 3 + sh, y0 + 5, P.color); p.px(cx + 2 + sh, y0 + 6, P.color); p.px(cx + 2 + sh, y0 + 7, '#7B1FA2'); p.rect(0, y0 - 3, 3, 3, '#ECECEC'); p.px(3, y0 - 2, P.color); }
    if (pid === 'pax') { p.rect(cx - 2 + sh, y0 + 3, 4, 2, '#5A3A22'); p.px(cx - 3 + sh, y0 + 2, '#5A3A22'); p.px(cx + 2 + sh, y0 + 2, '#5A3A22'); p.px(cx - 1 + sh, y0 + 3, '#2E1A0E'); p.px(cx + sh, y0 + 3, '#2E1A0E'); }
  } else if (pid === 'fa') { p.hline(cx - 4, cx + 3, y0 + 5, P.color); p.px(cx - 3, y0 + 6, P.color); }
  p.outline(OUT);
  return p;
}
const sheets = new Map();
export function paxiSheet(pid) {
  let cv = sheets.get(pid);
  if (cv) return cv;
  cv = document.createElement('canvas'); cv.width = PW * 3; cv.height = PH * 4;
  const c = cv.getContext('2d');
  ['down', 'up', 'left', 'right'].forEach((d, r) => { for (let f = 0; f < 3; f++) c.drawImage(small(pid, d, f).toCanvas(), f * PW, r * PH); });
  sheets.set(pid, cv);
  return cv;
}

// ---------- en grande: 64×64, para carteles, papeleta, programa y resultado ----------
function big(pid) {
  const P = PARTY[pid], p = new Pix(64, 64), cx = 32, cy = 35, R = 26, INK = '#1D1A24';
  star(p, cx, cy, R);
  if (pid === 'pax') {   // chaleco verde con botones
    for (let y = cy + 9; y < 64; y++) for (let x = 0; x < 64; x++) if (isBody(p.get(x, y)) && Math.abs(x + 0.5 - cx) > 3) p.px(x, y, y > cy + 15 ? P.dark : P.color);
    for (const y of [cy + 12, cy + 17]) p.px(cx + 5, y, '#FDD835');
  }
  if (pid === 'fa') {   // bufanda de tres colores
    for (let x = cx - 13; x <= cx + 12; x++) for (let y = cy + 10; y < cy + 14; y++) if (p.get(x, y)) p.px(x, y, [P.color, '#7B1FA2', '#2E7D32'][Math.floor((x - cx + 13) / 4) % 3]);
    p.rect(cx + 7, cy + 14, 4, 7, P.color); p.rect(cx + 7, cy + 19, 4, 2, '#7B1FA2');
    p.ellipse(cx - 9, cy + 18, 2, 2, '#FDD835'); p.ellipse(cx - 4, cy + 20, 1.6, 1.6, '#00B8D4');
  }
  // cara: ojos con brillo, cejas decididas, colorete y sonrisa (como los Paxineitors de siempre)
  for (const s of [-1, 1]) {
    const ex = cx + s * 8;
    p.ellipse(ex, cy - 2, 3, 4, INK); p.rect(ex - 2, cy - 5, 2, 2, '#FFFFFF');
    for (let i = 0; i < 7; i++) p.px(ex + s * (4 - i), cy - 10 + Math.round(i * (pid === 'psoe' ? -0.15 : 0.5)), INK);
    p.ellipse(cx + s * 14, cy + 4, 3, 2, '#FF7043');
  }
  p.hline(cx - 3, cx + 3, cy + 6, '#5A1E0A'); p.px(cx - 4, cy + 5, '#5A1E0A'); p.px(cx + 4, cy + 5, '#5A1E0A');
  if (pid === 'pp') {
    for (const s of [-1, 1]) { const ex = cx + s * 8; for (let i = -5; i <= 5; i++) { p.px(ex + i, cy - 8, INK); p.px(ex + i, cy + 4, INK); } for (let j = -8; j <= 4; j++) { p.px(ex - 5, cy + j, INK); p.px(ex + 5, cy + j, INK); } }
    p.hline(cx - 3, cx + 3, cy - 4, INK);
    p.rect(cx - 2, cy + 10, 4, 3, P.dark); p.rect(cx - 3, cy + 13, 6, 8, P.color); p.rect(cx - 2, cy + 21, 4, 2, P.color); p.vline(cx, cy + 13, cy + 21, P.dark);
    p.ellipse(cx - 21, cy - 21, 5, 3.5, '#FFFFFF'); p.ellipse(cx - 17, cy - 24, 2.6, 2.6, '#FFFFFF'); p.px(cx - 16, cy - 25, INK); p.rect(cx - 14, cy - 24, 3, 1, '#FFB300'); p.rect(cx - 25, cy - 21, 6, 2, '#9AA7B5');   // la gaviota
    p.rect(cx + 17, cy - 9, 14, 13, '#1D6F42'); p.rect(cx + 18, cy - 8, 12, 11, '#2E9E5E'); text(p, cx + 19, cy - 5, 'XLS', '#FFFFFF');
  }
  if (pid === 'psoe') {
    for (const s of [-1, 1]) p.rect(cx + s * 8 - 4, cy - 7, 8, 4, BODY[1]);   // mirada de guapo
    p.rect(cx - 4, cy + 5, 9, 3, '#FFFFFF'); p.hline(cx - 5, cx + 5, cy + 8, '#5A1E0A'); p.px(cx - 5, cy + 5, '#5A1E0A'); p.px(cx + 5, cy + 5, '#5A1E0A');
    p.rect(cx - 2, cy + 11, 4, 3, P.dark); p.rect(cx - 3, cy + 14, 6, 7, P.color); p.rect(cx - 2, cy + 21, 4, 2, P.color);
    p.vline(cx + 26, cy - 14, cy - 4, '#2E7D32'); p.px(cx + 27, cy - 9, '#2E7D32'); p.ellipse(cx + 26, cy - 17, 3.5, 3.5, '#E53935'); p.px(cx + 25, cy - 18, '#FF8A80');   // la rosa
    p.rect(cx - 31, cy - 9, 14, 13, P.dark); p.rect(cx - 30, cy - 8, 12, 11, P.color); text(p, cx - 29, cy - 5, 'PAG', '#FFFFFF');   // el talonario de paguitas
  }
  if (pid === 'fa') {
    for (let i = 0; i < 10; i++) p.vline(cx + 19 + i, cy - 7 - Math.round(i * 0.6), cy - 3 + Math.round(i * 0.6), i > 7 ? P.color : '#ECECEC');   // megáfono
    p.rect(cx + 16, cy - 6, 3, 3, '#9AA7B5');
    p.rect(cx - 31, cy - 26, 21, 9, '#FFFFFF'); text(p, cx - 30, cy - 24, '17:00', P.dark); p.vline(cx - 21, cy - 17, cy - 10, '#8B5A2B');   // la pancarta de la asamblea
  }
  if (pid === 'pax') {
    p.ellipse(cx, cy + 9, 10, 6, '#5A3A22'); p.rect(cx - 12, cy + 2, 3, 6, '#5A3A22'); p.rect(cx + 9, cy + 2, 3, 6, '#5A3A22'); p.hline(cx - 3, cx + 3, cy + 7, '#2E1A0E');
    for (const s of [-1, 1]) for (let i = 0; i < 7; i++) p.px(cx + s * (12 - i), cy - 11 + Math.round(i * 0.5), INK);
    p.rect(cx - 31, cy - 9, 17, 13, '#C9A227'); p.rect(cx - 30, cy - 8, 15, 11, '#FDD835'); text(p, cx - 30, cy - 5, '1998', INK);   // la guía en papel
  }
  p.outline(OUT);
  return p;
}
const bigs = new Map();
export function paxiBig(pid) { let cv = bigs.get(pid); if (!cv) { cv = big(pid).toCanvas(); bigs.set(pid, cv); } return cv; }
// una copia para poner en una ventana (cada <canvas> solo puede estar en un sitio)
export function paxiCanvas(pid, cls = 'paxi') { const s = paxiBig(pid), c = document.createElement('canvas'); c.width = s.width; c.height = s.height; c.getContext('2d').drawImage(s, 0, 0); c.className = cls; return c; }

// ---------- mobiliario de campaña ----------
const sigla = (p, P, y, w, c = '#FFFFFF') => text(p, Math.round((w - textW(P.sigla)) / 2), y, P.sigla, c);
// cartel electoral en su poste
export function cartel(pid) {
  const P = PARTY[pid], p = new Pix(18, 30);
  p.rect(0, 0, 18, 20, '#FFFFFF'); p.rect(1, 1, 16, 18, P.color); p.rect(1, 12, 16, 7, P.dark);
  star(p, 9, 7, 5.5); p.px(7, 6, '#1D1A24'); p.px(10, 6, '#1D1A24'); p.hline(8, 9, 8, '#7A2E0E');
  sigla(p, P, 13, 18);
  p.rect(8, 20, 2, 9, '#8B5A2B'); p.px(9, 20, '#6B4420');
  p.outline(OUT);
  return toTex(p, 14);
}
// caseta del partido: toldo de rayas, la estrella en el fondo y el mostrador con las siglas
export function caseta(pid) {
  const P = PARTY[pid], W = 24, p = new Pix(W, 36);
  p.rect(2, 7, 20, 14, '#FFF6D8'); star(p, 12, 13, 6); p.px(10, 12, '#1D1A24'); p.px(13, 12, '#1D1A24'); p.hline(11, 12, 14, '#7A2E0E');
  p.rect(1, 7, 2, 24, '#8B5A2B'); p.rect(21, 7, 2, 24, '#8B5A2B');
  for (let x = 0; x < W; x++) { const c = Math.floor(x / 3) % 2 ? '#FFFFFF' : P.color; p.vline(x, 1, 6, c); p.px(x, 7, Math.floor(x / 3) % 2 ? '#E0E0E0' : P.dark); }
  p.hline(0, W - 1, 0, P.dark);
  p.rect(0, 21, W, 11, '#C68D52'); p.hline(0, W - 1, 21, '#E3B078'); p.rect(2, 24, 20, 7, P.color); sigla(p, P, 25, W);
  p.rect(4, 19, 4, 2, '#FFFFFF'); p.rect(15, 19, 5, 2, '#FFFFFF'); p.px(16, 19, P.color);
  p.rect(1, 32, 2, 3, '#6B4420'); p.rect(21, 32, 2, 3, '#6B4420');
  p.outline(OUT);
  return toTex(p, 20);
}
// atril de los mítines, con su micrófono
export function atril() {
  const p = new Pix(16, 24);
  p.vline(8, 1, 7, '#3A3A48'); p.rect(7, 0, 3, 2, '#1D1A24');
  p.rect(2, 7, 12, 3, '#A8672F'); p.hline(2, 13, 7, '#C68D52');
  p.rect(3, 10, 10, 12, '#8B5A2B'); p.rect(4, 11, 8, 6, '#FFF6D8'); star(p, 8, 14, 3.2);
  p.rect(2, 22, 12, 1, '#6B4420');
  p.outline(OUT);
  return toTex(p, 8);
}
// urna de metacrilato sobre su mesa, con papeletas dentro
export function urna() {
  const p = new Pix(16, 24);
  p.rect(3, 1, 10, 11, '#CFE8F7'); p.rect(3, 1, 10, 1, '#8FB9D6'); p.vline(3, 1, 11, '#8FB9D6'); p.vline(12, 1, 11, '#8FB9D6'); p.hline(6, 9, 1, '#1D1A24');
  p.rect(5, 7, 4, 2, '#FFFFFF'); p.rect(7, 9, 4, 2, '#FFFFFF'); p.rect(5, 10, 3, 1, '#FFF6D8'); p.px(11, 3, '#FFFFFF'); p.px(11, 4, '#FFFFFF');
  p.rect(1, 12, 14, 3, '#1565C0'); p.hline(1, 14, 12, '#4A90D9');
  p.rect(2, 15, 2, 8, '#6B4420'); p.rect(12, 15, 2, 8, '#6B4420');
  p.outline(OUT);
  return toTex(p, 8);
}
// precinto para la casa de RRSS (solo si gobierna PAX): «chiringuito cerrado»
export function precinto() {
  const s = 'CHIRINGUITO CERRADO', W = textW(s) + 12, p = new Pix(W, 11);
  p.rect(0, 1, W, 9, '#FDD835');
  for (let x = -8; x < W; x += 6) for (let i = 0; i < 9; i++) if (x + i < 4 || x + i >= W - 4) { p.px(x + i, 1 + i, '#1D1A24'); p.px(x + i + 1, 1 + i, '#1D1A24'); }
  text(p, 6, 3, s, '#1D1A24');
  p.outline(OUT);
  return toTex(p, 0);
}
// la chapa de quien votó, enmarcada para colgar en casa
export function chapa() {
  const p = new Pix(32, 22);
  p.rect(0, 0, 32, 22, '#C9A04A'); p.rect(2, 2, 28, 18, '#FFFFFF');
  p.ellipse(16, 8, 7, 6.5, '#E8F0FB'); star(p, 16, 8.5, 6); p.px(14, 8, '#1D1A24'); p.px(17, 8, '#1D1A24'); p.hline(15, 16, 10, '#7A2E0E');
  text(p, 7, 14, 'VOTEI', '#1565C0');
  p.rect(24, 4, 4, 1, '#43A047'); p.px(27, 3, '#43A047'); p.px(24, 5, '#43A047');
  p.outline(OUT);
  return toTex(p, 0);
}
