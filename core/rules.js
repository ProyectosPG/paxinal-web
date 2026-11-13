// Páxinal Crossing · reglas que comparten el cliente, el modo local y el servidor
// (supabase/schema.sql repite estas mismas fórmulas en SQL: si se cambian aquí, cambiarlas allí).
import { CROPS, WATER_HOURS, ITEMS, DEAL_ITEMS, ANIMALS, ORDERS, ORDER_GIFTS } from './data.js';

export const H = 3600000, DAY = 24 * H;

// ---------- hora de Galicia ----------
const fmt = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Europe/Madrid', year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23', weekday: 'short',
});
const WD = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 0 };
export function madrid(ms) {
  const o = {};
  for (const p of fmt.formatToParts(new Date(ms))) o[p.type] = p.value;
  return { y: +o.year, mo: +o.month, d: +o.day, h: +o.hour % 24, mi: +o.minute, s: +o.second, wd: WD[o.weekday] };
}
export const hourOf = (ms) => { const t = madrid(ms); return t.h + t.mi / 60 + t.s / 3600; };
const pad = (n) => String(n).padStart(2, '0');
export const dayKey = (ms) => { const t = madrid(ms); return `${t.y}-${pad(t.mo)}-${pad(t.d)}`; };
// milisegundos de las 00:00 de Galicia de ese día ('YYYY-MM-DD')
export function dayStart(key) {
  const [y, m, d] = key.split('-').map(Number);
  let guess = Date.UTC(y, m - 1, d);
  for (let i = 0; i < 2; i++) {
    const t = madrid(guess), asUtc = Date.UTC(t.y, t.mo - 1, t.d, t.h, t.mi, t.s);
    guess -= asUtc - Date.UTC(y, m - 1, d);
  }
  return guess;
}
export const nextDayKey = (key) => dayKey(dayStart(key) + 30 * H);
export const clockText = (ms) => { const t = madrid(ms); return `${pad(t.h)}:${pad(t.mi)}`; };
export function seasonOf(ms) { const m = madrid(ms).mo; return m <= 3 ? 'inverno' : m <= 6 ? 'primavera' : m <= 9 ? 'verao' : 'outono'; }
export const SEASON_NAMES = { inverno: 'Inverno', primavera: 'Primavera', verao: 'Verán', outono: 'Outono' };
export const SEASON_Q = { inverno: 'Q1', primavera: 'Q2', verao: 'Q3', outono: 'Q4' };
// el «día de trabajo» empieza a las 6:00: a esa hora se rellena la energía
export const energyDay = (ms) => dayKey(ms - 6 * H);

// ---------- el tiempo: lluvia determinista por día (igual para todos y en el servidor) ----------
const RAIN = [0.45, 0.4, 0.35, 0.35, 0.3, 0.15, 0.1, 0.1, 0.2, 0.35, 0.45, 0.45];   // Galicia, claro
export function dayHash(key, salt = 0) {
  const [y, m, d] = key.split('-').map(Number);
  let h = (Math.round((Date.UTC(y, m - 1, d) - Date.UTC(2026, 0, 1)) / DAY) + 1000 + salt * 7919) >>> 0;
  h = Math.imul(h ^ (h >>> 16), 2146121005) >>> 0;
  h = Math.imul(h ^ (h >>> 15), 1540483477) >>> 0;
  return (h ^ (h >>> 16)) >>> 0;
}
export const rainy = (key) => dayHash(key) / 4294967296 < RAIN[Number(key.slice(5, 7)) - 1];

// ---------- crecimiento ----------
// Una parcela guarda: crop, planted_at, growth (horas ya crecidas), growth_at (cuándo se apuntó)
// y wet_until (hasta cuándo dura el último riego). Crece solo mientras está húmeda: por el riego
// o porque llueve ese día (salvo el tráfico de Ads, que se paga). Sin regar se para; nunca muere.
export function growthRaw(p, now) {
  if (!p?.crop) return 0;
  const c = CROPS[p.crop];
  let g = Number(p.growth) || 0, a = Math.max(Number(p.growth_at) || now, now - 400 * DAY);
  const wet = Number(p.wet_until) || 0;
  while (a < now) {
    const key = dayKey(a), end = Math.min(now, dayStart(nextDayKey(key)));
    if (!c.paid && rainy(key)) g += (end - a) / H;
    else if (wet > a) g += (Math.min(end, wet) - a) / H;
    a = end;
  }
  return g;
}
export const targetHours = (p) => { const c = CROPS[p.crop]; return (p.harvests || 0) > 0 && c.regrow ? c.regrow : c.hours; };
// lo que se ve de una parcela en este momento
export function plotView(p, now) {
  const today = dayKey(now);
  const view = { tilled: true, wet: (Number(p.wet_until) || 0) > now, rain: rainy(today) };
  if (!p.crop) return view;
  const c = CROPS[p.crop], target = targetHours(p), raw = growthRaw(p, now), g = Math.min(target, raw), frac = g / target;
  Object.assign(view, { crop: p.crop, frac, ready: frac >= 1, hoursLeft: Math.max(0, target - g) });
  if (!c.paid && view.rain) view.wet = true;
  if ((p.harvests || 0) > 0 && c.regrow) view.stage = view.ready ? 3 : 2;
  else view.stage = view.ready ? 3 : frac < 0.2 ? 0 : frac < 0.55 ? 1 : 2;
  if (p.crop === 'palabra') view.pos = keywordPos(p, now, raw);
  return view;
}
// posición de una palabra clave: nace en la 50, sube cada día de riego y baja despacio si no se riega
export function keywordPos(p, now, raw = growthRaw(p, now)) {
  const frac = Math.min(1, raw / CROPS.palabra.hours);
  const elapsed = (now - Number(p.planted_at)) / H, dry = Math.max(0, Math.floor((elapsed - raw) / 24));
  return Math.max(1, Math.min(99, Math.round(50 - 49 * frac) + dry * 2));
}
// (A05) casillas que toca una herramienta mejorada desde la casilla (rx, ry) mirando hacia dir:
// 'line' = esa y las dos siguientes hacia delante; 'square' = 3×3 hacia delante, centrado de lado
export function areaOf(rx, ry, dir, shape) {
  const [dx, dy] = { down: [0, 1], up: [0, -1], left: [-1, 0], right: [1, 0] }[dir] || [0, 1], out = [];
  for (let s = 0; s < 3; s++) for (const o of shape === 'square' ? [-1, 0, 1] : [0]) out.push({ x: rx + dx * s + (dy ? o : 0), y: ry + dy * s + (dx ? o : 0) });
  return out;
}
export const keywordItem = (pos) => (pos <= 3 ? 'palabra_top' : pos <= 10 ? 'palabra_p1' : 'palabra_p2');
export const waterUntil = (now) => now + WATER_HOURS * H;

// ---------- día y noche ----------
export function darkness(h) {
  const N = 0.6;
  if (h < 6) return N; if (h < 8) return N * (1 - (h - 6) / 2);
  if (h < 18.5) return 0; if (h < 21) return (N * (h - 18.5)) / 2.5; return N;
}
export const warmth = (h) => Math.max(0, 1 - Math.abs(h - 19.6) / 1.4) * 0.16 + Math.max(0, 1 - Math.abs(h - 7) / 1.1) * 0.1;

// ---------- trenes: un horario determinista para que todos vean el mismo tren a la vez ----------
// De 6:00 a 23:30, uno cada 3 a 6 minutos al azar. A las 22:30 pasa el de mercancías (el de la noche).
// Cada tren lleva destino y a veces retraso (5-25 min) o «Suprimido»; el de Albacete (13:14) nunca llega.
const DEST_LIST = ['VIGO', 'A CORUÑA', 'SANTIAGO', 'PONTEVEDRA', 'REDONDELA', 'PADRÓN'];
export const TRAIN_SPEED = 150;   // px/s
const scheduleCache = new Map();
export function trainSchedule(key) {
  let s = scheduleCache.get(key);
  if (s) return s;
  s = [];
  const d0 = dayStart(key);
  let t = d0 + 6 * H, k = 0;
  while (t < d0 + 23.5 * H) {
    t += (180 + (dayHash(key, ++k) % 181)) * 1000;
    const hd = dayHash(key, 900 + k) % 100, delay = hd < 60 ? 0 : hd < 95 ? 5 + (dayHash(key, 1300 + k) % 21) : 0;
    s.push({ sched: t, at: t + delay * 60000, delay, cancelled: hd >= 95, dest: DEST_LIST[dayHash(key, 700 + k) % DEST_LIST.length], dir: dayHash(key, 500 + k) % 2 ? 1 : -1, night: false });
  }
  s.push({ sched: d0 + 22.5 * H, at: d0 + 22.5 * H, delay: 0, dest: 'MERCANCÍAS', dir: -1, night: true });
  s.push({ sched: d0 + 13.2333 * H, at: Infinity, delay: null, cancelled: true, albacete: true, dest: 'ALBACETE', dir: 1, night: false });
  s.sort((a, b) => a.at - b.at);
  scheduleCache.set(key, s);
  if (scheduleCache.size > 4) scheduleCache.delete(scheduleCache.keys().next().value);
  return s;
}
// el tren que está pasando (o el siguiente): {at, dir, night}
export function trainNear(now, spanMs) {
  const s = trainSchedule(dayKey(now));
  let next = null;
  for (const t of s) {
    if (t.cancelled) continue;
    if (t.at <= now && now < t.at + spanMs) return { cur: t, next: null };
    if (t.at > now) { next = t; break; }
  }
  return { cur: null, next: next || trainSchedule(nextDayKey(dayKey(now))).find((t) => !t.cancelled) };
}
// las próximas salidas para el panel (por hora prevista; las que ya pasaron no salen)
export function departuresFrom(now, n = 6) {
  const key = dayKey(now), list = [...trainSchedule(key), ...trainSchedule(nextDayKey(key))];
  return list.filter((t) => (t.albacete ? t.sched > now - 3 * H : (t.cancelled ? t.sched : t.at) > now - 60000)).sort((a, b) => a.sched - b.sched).slice(0, n);
}

// ---------- muebles: dónde se puede poner cada cosa dentro de una casa ----------
// En la pared (fila 1) lo que cuelga; en el suelo, la zona común o la zona de tu mesa (sin pisar la mesa).
// rows: los muebles que ya hay en esa casa. Devuelve null si cabe o el motivo si no.
export function furniProblem(f, x, y, slot, rows, FB, HOUSE, deskZone) {
  const w = f.w || 1, h = f.h || 1;
  const others = rows.map((r) => ({ r, g: FB[r.kind] })).filter((o) => o.g);
  const hit = (o) => x < o.r.x + (o.g.w || 1) && x + w > o.r.x && y < o.r.y + (o.g.h || 1) && y + h > o.r.y;
  if (f.wall) {
    if (y !== HOUSE.wallY) return 'Esto se cuelga en la pared.';
    if (x < 0 || x + w > HOUSE.w) return 'No cabe en la pared.';
    if (HOUSE.wallBusy.some(([a, b]) => x <= b && x + w - 1 >= a)) return 'Ahí ya hay una ventana o el pendón.';
    if (others.some((o) => o.g.wall && hit(o))) return 'Ya hay algo colgado ahí.';
    return null;
  }
  const c = HOUSE.common, z = deskZone(slot);
  const inRect = (q) => x >= q.x && y >= q.y && x + w <= q.x + q.w && y + h <= q.y + q.h;
  const inDesk = inRect(z);
  if (!inRect(c) && !inDesk) return 'Solo en la zona común (abajo) o junto a tu mesa.';
  if (inDesk && x < z.x + 2 && y === z.y) return 'Ahí está tu mesa.';
  if (x <= HOUSE.catalog[0] && x + w > HOUSE.catalog[0] && y <= HOUSE.catalog[1] && y + h > HOUSE.catalog[1]) return 'Ahí está el catálogo.';
  if (others.some((o) => !o.g.wall && hit(o))) return 'Ya hay otro mueble ahí.';
  return null;
}

// ---------- caja de envíos: el tren de la noche pasa a las 22:30 y se cobra al día siguiente a las 7:00 ----------
export function payAt(now, delayMin = 0) {
  const key = dayKey(now), leaves = hourOf(now) < 22.5 ? key : nextDayKey(key);
  return dayStart(nextDayKey(leaves)) + 7 * H + delayMin * 60000;
}

// ---------- comerciales: dónde está cada uno ahora ----------
// {map, route, t0} si va andando su ruta (t0: cuándo la empezó), {map, stand} si está parado, o null si no está
export function comercialAt(id, now) {
  const h = hourOf(now), d0 = dayStart(dayKey(now));
  if (h < 9 || h >= 19) return null;
  if (h >= 13.5 && h < 14.5) return { map: 'vila', stand: 'lunch' };
  const morning = h < 13.5, inVila = (id === 'brais') === morning;
  return { map: inVila ? 'vila' : 'agro', route: inVila ? 'vila' : 'agro', t0: d0 + (morning ? 9 : 14.5) * H };
}
// (A11) un vecino: {map, route, t0} si está en la calle ahora (pasea su ruta desde la medianoche) o null
export function vecinoAt(v, now) {
  const h = hourOf(now);
  if (!v.hours.some((w) => inHours(h, w))) return null;
  return { map: v.map, route: 'v:' + v.id, t0: dayStart(dayKey(now)) };
}
// (A11) un coche de la avenida: {x, y, dir, moving} en píxeles del mapa, o null si no hay coche ahora.
// Cruza el mapa de punta a punta parándose 2,5 s en cada paso de cebra; luego pasan gap segundos sin él.
export function carAt(c, now, mapW, zebras) {
  if (!inHours(hourOf(now), c.hours)) return null;
  const T = 16, D = mapW + 96, STOP = 2.5, travel = D / c.speed;
  // el morro (24 px desde el centro) se para a 2 px del paso de cebra
  const stops = zebras.map(([x0, x1]) => (c.dir > 0 ? x0 * T - 26 + 48 : mapW + 48 - ((x1 + 1) * T + 26))).filter((s) => s > 0 && s < D).sort((a, b) => a - b);
  const cycle = travel + stops.length * STOP + c.gap;
  let t = ((now / 1000 + c.offset) % cycle + cycle) % cycle, s = 0, moving = true;
  for (const st of stops) {
    const tt = (st - s) / c.speed;
    if (t < tt) { s += t * c.speed; t = -1; break; }
    t -= tt; s = st;
    if (t < STOP) { moving = false; t = -1; break; }
    t -= STOP;
  }
  if (t >= 0) { s += t * c.speed; if (s > D) return null; }
  const x = c.dir > 0 ? -48 + s : mapW + 48 - s;
  return { x, y: c.lane * T + 15, dir: c.dir, moving };
}
// la oferta del día y el precio de cada cosa hoy (lo mismo calcula el servidor)
export const dealOf = (key) => DEAL_ITEMS[dayHash(key, 33) % DEAL_ITEMS.length];
export const priceOf = (item, now) => { const p = ITEMS[item]?.price || 0; return item === dealOf(dayKey(now)) ? Math.round(p * 0.7) : p; };

// ---------- lonxa: precio del día de cada pescado (entre el 80 y el 130 % de su valor) ----------
const codeSum = (s) => [...String(s)].reduce((n, ch) => n + ch.charCodeAt(0), 0);
export const lonxaFactor = (key, item) => 0.8 + (dayHash(key, 50 + (codeSum(item) % 997)) % 51) / 100;
export const inHours = (h, [a, b]) => (a < b ? h >= a && h < b : h >= a || h < b);

// ---------- encargos del día: 3 al día, los mismos para todos (schema.sql, day_orders, hace lo mismo) ----------
// key: el día ('YYYY-MM-DD'). Pagan entre un 30 y un 50 % más que la caja (con lo de temporada incluido);
// la cuenta va en enteros para que el navegador y el servidor redondeen igual.
export function dayOrders(key) {
  const used = new Set(), out = [], season = seasonOf(dayStart(key) + 12 * H);
  for (let n = 0; n < 3; n++) {
    let i = dayHash(key, 300 + n) % ORDERS.length;
    while (used.has(i)) i = (i + 1) % ORDERS.length;
    used.add(i);
    const t = ORDERS[i], it = ITEMS[t.item];
    const qty = t.q[0] + (dayHash(key, 310 + n) % (t.q[1] - t.q[0] + 1));
    const k = dayHash(key, 320 + n) % 21, s = it.season && it.season === season ? 125 : 100;
    const pay = Math.round((it.sell * qty * (130 + k) * s) / 10000);
    const gift = dayHash(key, 330 + n) % 4 === 0 ? ORDER_GIFTS[dayHash(key, 340 + n) % ORDER_GIFTS.length] : null;
    out.push({ n, i, who: t.who, item: t.item, qty, pay, gift, box: Math.round((it.sell * qty * s) / 100), text: t.text.replace('{n}', qty) });
  }
  return out;
}

// ---------- animales: ¿tiene hambre? ¿tiene algo para recoger? (el «día» empieza a las 6:00) ----------
const keyDays = (k) => Math.round(Date.UTC(+k.slice(0, 4), +k.slice(5, 7) - 1, +k.slice(8, 10)) / DAY);
export function animalState(a, now) {
  const A = ANIMALS[a.kind], today = energyDay(now), fed = a.fed_day === today;
  if (!A?.product) return { fed, ready: false, pet: true };
  const ready = fed && (!a.collected_day || keyDays(today) - keyDays(a.collected_day) >= A.every);
  const waitDays = a.collected_day ? Math.max(0, A.every - (keyDays(today) - keyDays(a.collected_day))) : 0;
  return { fed, ready, waitDays };
}

// ---------- formatos ----------
export const fmtHours = (h) => (h >= 48 ? `${Math.ceil(h / 24)} días` : h >= 1 ? `${Math.ceil(h)} h` : `${Math.max(1, Math.ceil(h * 60))} min`);
export const fmtPx = (n) => `${Math.round(Number(n) || 0)}`;
