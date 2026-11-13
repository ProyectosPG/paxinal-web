// Páxinal Crossing · modo local: el mismo «servidor» que supabase/schema.sql pero dentro del
// navegador (localStorage) y con las pestañas hablando entre sí por BroadcastChannel. Sirve para
// probar el juego sin tocar la base de datos (?local en la dirección) y con dos pestañas a la vez.
import { DEPTS, DEPT_BY_ID, CROPS, ITEMS, FURNI_BY_ID, HOUSE, FIELD, ENERGY_MAX, START_PAXETAS, ANIMALS, CORRAL_MAX, CAFE_HOURS, BONSAI_HOURS, LONXA_HOURS, AUCTION_HOURS, PICANTE_LONXA, FISH_TABLE, TRASH, SEASON_BONUS, OMNEA_LOOT, GIFT_PLOTS, START_INV, START_INV_JOIN, TOOL_AREA, deskZone } from '../core/data.js';
import * as R from '../core/rules.js';

const KEY = 'paxinal.localdb';
// Por http y con la IP de la red (http://192.168…), el navegador no da crypto.randomUUID (solo existe
// en localhost o con https), así que aquí hay un repuesto.
const uuid = () => (crypto.randomUUID ? crypto.randomUUID()
  : [...crypto.getRandomValues(new Uint8Array(16))].map((x, i) => (i === 6 ? (x & 15) | 64 : i === 8 ? (x & 63) | 128 : x).toString(16).padStart(2, '0') + ([3, 5, 7, 9].includes(i) ? '-' : '')).join(''));
const NICK = /^[A-Za-z0-9_ÁÉÍÓÚÜÑáéíóúüñ]{2,16}$/;
const fail = (m) => { throw new Error(m); };
const clock = () => Date.now() + (globalThis.PXC_DEBUG_OFFSET || 0);

export function createLocal() {
  const bc = new BroadcastChannel('paxinal-local');
  const tab = Math.random().toString(36).slice(2, 10);
  const load = () => {
    let db; try { db = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch { db = null; }
    db ||= { players: [], plots: [], furni: [], notes: [], shipments: [], seq: 1 };
    db.animals ||= [];
    db.orders ||= [];
    return db;
  };
  const save = (db) => localStorage.setItem(KEY, JSON.stringify(db));
  const emit = (event, payload) => { bc.postMessage({ type: 'db', event, payload }); handlers.db?.(event, payload); };
  let handlers = {};

  const pub = (p) => ({ id: p.id, nickname: p.nickname, dept: p.dept, house: p.house, look: p.look, desk_slot: p.desk_slot, online: (p.online_until || 0) > Date.now(), last_seen: p.last_seen });
  const me = (p, extra = {}) => ({ id: p.id, secret: p.secret, nickname: p.nickname, dept: p.dept, house: p.house, look: p.look, desk_slot: p.desk_slot,
    paxetas: p.paxetas, energy: p.energy, inventory: { ...p.inventory }, bonsai_days: p.bonsai_days || 0, now: Date.now(), ...extra });
  const auth = (db, secret) => {
    const p = db.players.find((q) => q.secret === secret);
    if (!p) fail('sesión no válida');
    const now = Date.now();
    p.last_seen = now; p.online_until = now + 120000;
    const day = R.energyDay(now);
    if (p.energy_day !== day) { p.energy = ENERGY_MAX; p.energy_day = day; }
    return p;
  };
  const settle = (db, p) => {
    const now = Date.now(), paid = [];
    for (const s of db.shipments) if (s.player === p.id && !s.paid && s.pay_at <= now) { s.paid = true; p.paxetas += s.value; paid.push(s); }
    return paid;
  };
  const spend = (p, e) => { if (p.energy < e) fail('Estás sin energía: tómate un café (lo venden Diego y Sabrina).'); p.energy -= e; };
  const add = (p, item, n) => { const v = (p.inventory[item] || 0) + n; if (v < 0) fail('No tienes ' + (ITEMS[item]?.name || item)); if (v > 999) fail('No te caben más en la mochila.'); if (v) p.inventory[item] = v; else delete p.inventory[item]; };
  // En modo local vale cualquier palabra de acceso: la partida solo vive en este navegador, y la palabra
  // de verdad no puede ir escrita aquí porque web/ se publica en Internet (tools/deploy-pages.mjs).
  const okCode = async () => true;

  const RPC = {
    async check_code({ p_code }) { return okCode(p_code); },
    async register_player({ p_nickname, p_dept, p_house, p_look, p_code }) {
      if (!(await okCode(p_code))) fail('palabra de acceso incorrecta');
      const db = load(), nick = String(p_nickname || '').trim();
      if (!NICK.test(nick)) fail('apodo no válido: de 2 a 16 letras, números o _');
      if (db.players.some((q) => q.nickname.toLowerCase() === nick.toLowerCase())) fail('ese apodo ya está cogido');
      if (!DEPT_BY_ID[p_dept]) fail('elige tu departamento');
      const house = p_dept === 'otros' ? p_house : p_dept;
      if (!DEPTS.some((d) => d.id === house)) fail('elige a qué casa te apuntas');
      const used = new Set(db.players.filter((q) => q.house === house).map((q) => q.desk_slot));
      let slot = 0; while (used.has(slot) && slot < HOUSE.slots) slot++;
      if (slot >= HOUSE.slots) slot = used.size % HOUSE.slots;
      const now = Date.now(), first = !db.players.some((q) => q.house === house);
      const look = { skin: Math.max(0, Math.min(3, Number(p_look?.skin) || 0)), hair: Math.max(0, Math.min(7, Number(p_look?.hair) || 0)), style: ['corto', 'largo', 'mono', 'rizos'].includes(p_look?.style) ? p_look.style : 'corto' };
      const p = { id: uuid(), secret: uuid(), nickname: nick, dept: p_dept, house, look, paxetas: START_PAXETAS, energy: ENERGY_MAX, energy_day: R.energyDay(now),
        inventory: { ...(first ? START_INV : START_INV_JOIN) }, desk_slot: slot, created_at: now, last_seen: now, online_until: now + 120000 };
      db.players.push(p);
      // el primero de la casa la «despierta»: lo que cuidaba el vecino pasa a ser suyo, listo para cosechar
      const gift = [];
      if (first) for (const g of GIFT_PLOTS) {
        if (db.plots.some((q) => q.house === house && q.x === g.x && q.y === g.y)) continue;
        const h = CROPS[g.crop].hours;
        const plot = { house, x: g.x, y: g.y, crop: g.crop, planted_at: now - h * R.H, growth: h, growth_at: now, wet_until: null, harvests: 0, updated_by: null };
        db.plots.push(plot); gift.push(plot);
      }
      save(db); emit('players', pub(p));
      for (const plot of gift) emit('plot', plot);
      return me(p, { gift: gift.length > 0 });
    },
    async login_player({ p_secret }) { const db = load(), p = auth(db, p_secret), paid = settle(db, p); save(db); return me(p, { paid }); },
    async login_as({ p_player, p_secret, p_code }) {
      const db = load(), p = db.players.find((q) => q.id === p_player);
      if (!p) fail('ese usuario no existe');
      if (p_secret !== p.secret) {
        if (!(await okCode(p_code))) fail('palabra de acceso incorrecta');
        if ((p.online_until || 0) > Date.now()) fail(p.nickname + ' ya está conectado ahora mismo');
        p.secret = uuid();
      }
      p.online_until = Date.now() + 120000; save(db);
      return me(p);
    },
    async heartbeat({ p_secret }) { const db = load(), p = auth(db, p_secret), paid = settle(db, p); save(db); return { paxetas: p.paxetas, energy: p.energy, inventory: { ...p.inventory }, paid, now: Date.now() }; },
    async logout({ p_secret }) { const db = load(), p = db.players.find((q) => q.secret === p_secret); if (p) { p.online_until = 0; save(db); } },
    async farm({ p_secret, p_house, p_x, p_y, p_action, p_item }) {
      const db = load(), p = auth(db, p_secret), now = Date.now();
      if (!DEPTS.some((d) => d.id === p_house)) fail('esa parcela no existe');
      if (!(p_x >= 0 && p_x < FIELD.w && p_y >= 0 && p_y < FIELD.h)) fail('eso está fuera de la parcela');
      const member = p.house === p_house;
      const iOf = () => db.plots.findIndex((q) => q.house === p_house && q.x === p_x && q.y === p_y);
      let i = iOf(), plot = i >= 0 ? db.plots[i] : null, gained = null;
      const mine = () => { if (!member) fail('Esta parcela es de ' + DEPT_BY_ID[p_house].name + ': solo puedes ayudar a regar.'); };
      switch (p_action) {
        case 'till':
          mine(); if (plot) fail('Ya está arada.');
          spend(p, 2);
          plot = { house: p_house, x: p_x, y: p_y, crop: null, planted_at: null, growth: 0, growth_at: now, wet_until: null, harvests: 0 };
          db.plots.push(plot); break;
        case 'plant': {
          mine(); if (!plot) fail('Primero hay que arar con la azada.'); if (plot.crop) fail('Ya hay algo plantado.');
          const it = ITEMS[p_item]; if (!it || it.kind !== 'seed') fail('Eso no se planta.');
          spend(p, 1); add(p, p_item, -1);
          Object.assign(plot, { crop: it.crop, planted_at: now, growth: 0, growth_at: now, harvests: 0 }); break;
        }
        case 'water': {
          if (!plot) fail('Primero hay que arar con la azada.');
          const paid = plot.crop && CROPS[plot.crop].paid;
          if (paid) { mine(); if ((plot.wet_until || 0) - now > 18 * R.H) fail('La campaña de hoy ya está pagada.'); if (p.paxetas < paid) fail('No te llega para pagar los anuncios (' + paid + ' paxetas).'); p.paxetas -= paid; }
          else { if ((plot.wet_until || 0) - now > 18 * R.H) fail('Ya está bien regada. Vuelve mañana.'); spend(p, 1); }
          if (plot.crop) plot.growth = Math.min(R.targetHours(plot), R.growthRaw(plot, now));
          plot.growth_at = now; plot.wet_until = R.waterUntil(now); break;
        }
        case 'harvest': {
          mine(); if (!plot?.crop) fail('Aquí no hay nada que cosechar.');
          const c = CROPS[plot.crop], raw = R.growthRaw(plot, now);
          if (raw < R.targetHours(plot)) fail('Todavía no está lista.');
          spend(p, 1);
          gained = plot.crop === 'palabra' ? R.keywordItem(R.keywordPos(plot, now, raw)) : plot.crop === 'pementos' && Math.random() < 0.1 ? 'pemento_picante'
            : plot.crop === 'resenas' && Math.random() < 0.1 ? 'resena_mala' : plot.crop === 'omnea' ? OMNEA_LOOT[Math.floor(Math.random() * OMNEA_LOOT.length)] : c.product;
          add(p, gained, 1);
          if (c.regrow) Object.assign(plot, { harvests: (plot.harvests || 0) + 1, growth: 0, growth_at: now });
          else Object.assign(plot, { crop: null, planted_at: null, growth: 0, growth_at: now, harvests: 0 });
          break;
        }
        case 'clear':
          mine(); if (!plot) fail('Aquí no hay nada.');
          spend(p, 1);
          if (plot.crop) Object.assign(plot, { crop: null, planted_at: null, growth: 0, harvests: 0 });
          else { db.plots.splice(i, 1); plot = { house: p_house, x: p_x, y: p_y, deleted: true }; }
          break;
        default: fail('acción desconocida');
      }
      plot.updated_by = p.id;
      save(db); emit('plot', plot);
      return { plot, player: me(p), gained };
    },
    // (A05) regar o arar varias casillas de una vez con una herramienta mejorada (como mucho 9). Las casillas
    // fuera de la leira, las que no se pueden (hierba al regar, ya arada al arar, ya regada, Ads) se ignoran;
    // las demás se hacen todas y se cobra la energía de todas (1 por riego, 2 por arar).
    async farm_area({ p_secret, p_house, p_tiles, p_action }) {
      const db = load(), p = auth(db, p_secret), now = Date.now();
      if (!DEPTS.some((d) => d.id === p_house)) fail('esa parcela no existe');
      if (!['water', 'till'].includes(p_action)) fail('acción desconocida');
      const tiles = Array.isArray(p_tiles) ? p_tiles : [];
      const max = Math.max(0, ...Object.entries(TOOL_AREA).filter(([k, a]) => a.action === p_action && (p.inventory[k] || 0) > 0).map(([, a]) => a.max));
      if (!max) fail('Para eso necesitas una herramienta mejorada (en la cafetería).');
      if (tiles.length > max) fail(`Con tu herramienta, como mucho ${max} casillas de una vez.`);
      if (p_action === 'till' && p.house !== p_house) fail('Esta parcela es de ' + DEPT_BY_ID[p_house].name + ': solo puedes ayudar a regar.');
      const seen = new Set(), todo = [];
      for (const t of tiles) {
        const x = Number(t?.x), y = Number(t?.y), k = x + ',' + y;
        if (!(Number.isInteger(x) && Number.isInteger(y) && x >= 0 && x < FIELD.w && y >= 0 && y < FIELD.h) || seen.has(k)) continue;
        seen.add(k);
        const plot = db.plots.find((q) => q.house === p_house && q.x === x && q.y === y);
        if (p_action === 'till' ? !plot : plot && !(plot.crop && CROPS[plot.crop].paid) && !((plot.wet_until || 0) - now > 18 * R.H)) todo.push({ x, y, plot });
      }
      if (!todo.length) fail(p_action === 'till' ? 'Ahí no queda hierba que arar.' : 'Ahí no hay nada que regar ahora (ya está regado o sin arar).');
      spend(p, todo.length * (p_action === 'till' ? 2 : 1));
      const out = [];
      for (const t of todo) {
        let plot = t.plot;
        if (p_action === 'till') { plot = { house: p_house, x: t.x, y: t.y, crop: null, planted_at: null, growth: 0, growth_at: now, wet_until: null, harvests: 0 }; db.plots.push(plot); }
        else { if (plot.crop) plot.growth = Math.min(R.targetHours(plot), R.growthRaw(plot, now)); plot.growth_at = now; plot.wet_until = R.waterUntil(now); }
        plot.updated_by = p.id; out.push(plot);
      }
      save(db);
      for (const plot of out) emit('plot', plot);
      return { plots: out, player: me(p) };
    },
    async buy({ p_secret, p_item, p_qty }) {
      const db = load(), p = auth(db, p_secret), it = ITEMS[p_item], n = Number(p_qty) || 1;
      if (!it?.shop) fail('eso no se vende');
      if (!(n >= 1 && n <= 20)) fail('compra de 1 a 20 de cada vez');
      if (it.shop === 'cafe') { const h = R.hourOf(clock()); if (h < CAFE_HOURS[0] || h >= CAFE_HOURS[1]) fail('La cafetería está cerrada (abre de 7:00 a 22:00).'); }
      if (it.shop === 'bonsai') {
        const h = R.hourOf(clock()); if (h < BONSAI_HOURS[0] && h >= BONSAI_HOURS[1]) fail('El Bonsai está cerrado (abre de 22:00 a 7:00).');
        const day = R.energyDay(clock()); if (p.bonsai_last !== day) { p.bonsai_days = (p.bonsai_days || 0) + 1; p.bonsai_last = day; }
      }
      if (it.shop === 'lonxa' && !R.inHours(R.hourOf(clock()), LONXA_HOURS)) fail('La lonxa está cerrada (abre de 8:00 a 20:00).');
      if (it.kind === 'tool' && (p.inventory[p_item] || 0) + n > 1) fail('Ya tienes una. Con una basta.');
      const cost = R.priceOf(p_item, clock()) * n;   // con la oferta del día de los comerciales
      if (p.paxetas < cost) fail(`No te llega: cuesta ${cost} paxetas y tienes ${p.paxetas}.`);
      add(p, p_item, n); p.paxetas -= cost; save(db);
      return me(p);
    },
    async drink({ p_secret, p_item = 'cafe' }) {
      const db = load(), p = auth(db, p_secret), it = ITEMS[p_item];
      if (it?.kind !== 'drink') fail('Eso no se bebe.');
      if (!p.inventory[p_item]) fail('No te queda café.');
      if (p.energy >= ENERGY_MAX) fail('Ya estás a tope. Un café más y ves los sonidos.');
      add(p, p_item, -1); p.energy = Math.min(ENERGY_MAX, p.energy + it.energy); save(db);
      return me(p);
    },
    async ship({ p_secret, p_item, p_qty }) {
      const db = load(), p = auth(db, p_secret), it = ITEMS[p_item], n = Number(p_qty) || 1, now = Date.now();
      if (!it?.sell) fail('Eso no lo compra nadie.');
      if (!(n >= 1 && n <= 999)) fail('cantidad no válida');
      add(p, p_item, -n);
      const value = Math.round(it.sell * n * (it.season && it.season === R.seasonOf(now) ? SEASON_BONUS : 1));
      const late = Math.random() < 0.3 ? 15 + Math.floor(Math.random() * 76) : 0;
      const s = { id: db.seq++, player: p.id, item: p_item, qty: n, value, created_at: now, pay_at: R.payAt(now, late), late, paid: false };
      db.shipments.push(s); save(db);
      return { player: me(p), shipment: s };
    },
    // pescar: el minijuego se juega en el navegador y manda la habilidad (0-1); el servidor decide qué sale
    async fish({ p_secret, p_spot, p_skill }) {
      const db = load(), p = auth(db, p_secret), now = Date.now(), skill = Math.max(0, Math.min(1, Number(p_skill) || 0));
      if (!p.inventory.cana) fail('Necesitas una caña.');
      if (!['mar', 'peirao', 'rego'].includes(p_spot)) fail('Aquí no se pesca.');
      if (now - (p.last_fish || 0) < 3000) fail('Espera un poco entre lance y lance.');
      p.last_fish = now; spend(p, 2);
      let caught = null;
      if (skill >= 0.3) {
        if (Math.random() < 0.25 - 0.15 * skill) caught = TRASH[Math.floor(Math.random() * TRASH.length)];
        else {
          const table = FISH_TABLE[p_spot === 'rego' ? 'rego' : 'mar'].map(([id, w]) => [id, w < 10 ? w * (0.6 + skill) * (p_spot === 'peirao' ? 1.5 : 1) : w]);
          let r = Math.random() * table.reduce((s, [, w]) => s + w, 0);
          for (const [id, w] of table) { r -= w; if (r <= 0) { caught = id; break; } }
          caught ||= table[0][0];
        }
        add(p, caught, 1);
      }
      save(db);
      return { player: me(p), caught };
    },
    // la lonxa paga al momento: precio del día y, de 12:00 a 13:00, subasta (más)
    async lonxa_sell({ p_secret, p_item, p_qty }) {
      const db = load(), p = auth(db, p_secret), it = ITEMS[p_item], n = Number(p_qty) || 1, h = R.hourOf(clock());
      if (!it || !(['fish', 'trash'].includes(it.kind) || p_item === 'pemento_picante')) fail('Eso en la lonxa no lo quieren.');
      if (!R.inHours(h, LONXA_HOURS)) fail('La lonxa está cerrada (abre de 8:00 a 20:00).');
      if (!(n >= 1 && n <= 999)) fail('cantidad no válida');
      add(p, p_item, -n);
      const auction = R.inHours(h, AUCTION_HOURS);
      const value = Math.round(it.sell * R.lonxaFactor(R.dayKey(clock()), p_item) * (p_item === 'pemento_picante' ? PICANTE_LONXA : 1) * n * (auction ? 1.3 + Math.random() * 0.5 : 1));
      p.paxetas += value; save(db);
      return { player: me(p), value, auction };
    },
    // animales: comprar (con nombre), dar de comer a los del corral y recoger lo que dan
    async buy_animal({ p_secret, p_kind, p_name }) {
      const db = load(), p = auth(db, p_secret), a = ANIMALS[p_kind], name = String(p_name || '').trim();
      if (!a) fail('Ese animal no lo tenemos.');
      if (!/^[A-Za-z0-9ÁÉÍÓÚÜÑáéíóúüñ ]{1,12}$/.test(name)) fail('Ponle un nombre de 1 a 12 letras.');
      const mine = db.animals.filter((r) => r.house === p.house);
      if (mine.filter((r) => r.kind === p_kind).length >= a.max) fail('No caben más de esos.');
      if (a.corral && mine.filter((r) => ANIMALS[r.kind].corral).length >= CORRAL_MAX) fail('El corral está lleno.');
      if (p.paxetas < a.price) fail('No te llega: cuesta ' + a.price + ' paxetas.');
      p.paxetas -= a.price;
      const row = { id: db.seq++, house: p.house, kind: p_kind, name, bought_by: p.id, bought_at: Date.now(), fed_day: null, collected_day: null };
      db.animals.push(row); save(db); emit('animal', row);
      return { animal: row, player: me(p) };
    },
    async feed_animals({ p_secret, p_house }) {
      const db = load(), p = auth(db, p_secret), today = R.energyDay(clock());
      if (p.house !== p_house) fail('Solo puedes dar de comer a los animales de tu casa.');
      const hungry = db.animals.filter((r) => r.house === p_house && ANIMALS[r.kind].corral && r.fed_day !== today);
      if (!hungry.length) fail('Ya han comido hoy.');
      if ((p.inventory.pienso || 0) < hungry.length) fail('Te falta pienso: ' + hungry.length + ' sacos.');
      add(p, 'pienso', -hungry.length);
      for (const r of hungry) { r.fed_day = today; emit('animal', r); }
      save(db);
      return { fed: hungry.length, animals: hungry, player: me(p) };
    },
    async collect_animal({ p_secret, p_id }) {
      const db = load(), p = auth(db, p_secret), r = db.animals.find((q) => q.id === p_id);
      if (!r) fail('Ese animal ya no está.');
      if (r.house !== p.house) fail('Ese animal es de otra casa.');
      if (!R.animalState(r, clock()).ready) fail('Todavía no tiene nada.');
      const item = ANIMALS[r.kind].product;
      add(p, item, 1); r.collected_day = R.energyDay(clock()); save(db); emit('animal', r);
      return { item, animal: r, player: me(p) };
    },
    // encargos del día (auditoría A04): se entregan en el tablón; cada uno, una vez por persona y día
    async my_orders({ p_secret }) {
      const db = load(), p = auth(db, p_secret), day = R.dayKey(clock()); save(db);
      return db.orders.filter((o) => o.player === p.id && o.day === day).map((o) => o.n).sort();
    },
    async deliver_order({ p_secret, p_n }) {
      const db = load(), p = auth(db, p_secret), day = R.dayKey(clock()), n = Number(p_n);
      if (!(n >= 0 && n <= 2)) fail('Ese encargo no existe.');
      if (db.orders.some((q) => q.player === p.id && q.day === day && q.n === n)) fail('Ese encargo ya lo entregaste hoy.');
      const o = R.dayOrders(day)[n], have = p.inventory[o.item] || 0;
      if (have < o.qty) fail(`Te faltan cosas: piden ${o.qty} y tienes ${have}.`);
      add(p, o.item, -o.qty); p.paxetas += o.pay;
      if (o.gift) add(p, o.gift, 1);
      db.orders.push({ player: p.id, day, n, item: o.item, qty: o.qty, pay: o.pay, gift: o.gift, created_at: Date.now() });
      save(db);
      return { player: me(p), order: { n, item: o.item, qty: o.qty, pay: o.pay, gift: o.gift } };
    },
    async my_shipments({ p_secret }) { const db = load(), p = auth(db, p_secret); save(db); return db.shipments.filter((s) => s.player === p.id && !s.paid); },
    async place_furni({ p_secret, p_house, p_item, p_x, p_y }) {
      const db = load(), p = auth(db, p_secret), it = ITEMS[p_item];
      if (!it?.furni) fail('Eso no es un mueble.');
      if (p.house !== p_house) fail('Solo puedes decorar tu casa.');
      if (!p.inventory[p_item]) fail('No tienes ese mueble.');
      const f = FURNI_BY_ID[it.furni];
      const why = R.furniProblem(f, p_x, p_y, p.desk_slot, db.furni.filter((r) => r.house === p_house), FURNI_BY_ID, HOUSE, deskZone);
      if (why) fail(why);
      add(p, p_item, -1);
      const row = { id: db.seq++, house: p_house, owner: p.id, owner_nick: p.nickname, kind: f.id, x: p_x, y: p_y, placed_at: Date.now() };
      db.furni.push(row); save(db); emit('furni', row);
      return { furni: row, player: me(p) };
    },
    async pick_furni({ p_secret, p_id }) {
      const db = load(), p = auth(db, p_secret), i = db.furni.findIndex((r) => r.id === p_id);
      if (i < 0) fail('Ese mueble ya no está.');
      const row = db.furni[i];
      if (row.owner !== p.id) fail('Ese mueble lo puso ' + row.owner_nick + ': solo lo puede quitar quien lo puso.');
      db.furni.splice(i, 1); add(p, 'm_' + row.kind, 1); save(db); emit('furni', { ...row, deleted: true });
      return { player: me(p) };
    },
    async post_note({ p_secret, p_text, p_to_dept }) {
      const db = load(), p = auth(db, p_secret), text = String(p_text || '').trim(), now = Date.now();
      if (text.length < 1 || text.length > 500) fail('la nota debe tener entre 1 y 500 caracteres');
      if (p_to_dept && !DEPT_BY_ID[p_to_dept]) fail('ese departamento no existe');
      if (db.notes.some((n) => n.author === p.id && now - n.created_at < 15000)) fail('espera unos segundos antes de colgar otra nota');
      if (db.notes.filter((n) => n.author === p.id).length >= 20) fail('ya tienes 20 notas en el tablón: quita alguna antes');
      const n = { id: db.seq++, author: p.id, author_nick: p.nickname, author_dept: p.dept, to_dept: p_to_dept || null, text, created_at: now };
      db.notes.push(n); save(db); emit('notes', { op: 'insert', id: n.id });
      return n;
    },
    // solo para probar en modo local: adelanta el crecimiento de lo plantado (y el cobro de la caja)
    async debug_grow({ p_hours = 24 }) {
      const db = load(), now = Date.now();
      for (const q of db.plots) if (q.crop) { q.growth = (q.growth || 0) + p_hours; q.growth_at = now; q.planted_at = (q.planted_at || now) - p_hours * R.H; emit('plot', q); }
      for (const s of db.shipments) if (!s.paid) s.pay_at -= p_hours * R.H;
      save(db);
    },
    async delete_note({ p_secret, p_id }) {
      const db = load(), p = auth(db, p_secret), i = db.notes.findIndex((n) => n.id === p_id && n.author === p.id);
      if (i < 0) fail('solo puedes quitar tus propias notas');
      db.notes.splice(i, 1); save(db); emit('notes', { op: 'delete', id: p_id });
    },
  };

  // ---------- presencia y mensajes entre pestañas ----------
  const peers = new Map();
  let myKey = null, myMeta = null, beat = null;
  const syncPres = () => handlers.presence?.(Object.fromEntries([...peers].map(([k, v]) => [k, [v.meta]])));
  bc.onmessage = ({ data }) => {
    if (!data) return;
    if (data.type === 'db') handlers.db?.(data.event, data.payload);
    else if (data.type === 'bc') handlers.broadcast?.(data.event, data.payload);
    else if (data.type === 'pres') {
      const isNew = !peers.has(data.key);
      peers.set(data.key, { meta: data.meta, t: Date.now() });
      if (isNew) { syncPres(); handlers.join?.(data.key); if (myKey) bc.postMessage({ type: 'pres', key: myKey, meta: myMeta }); }
      else syncPres();
    } else if (data.type === 'leave') { peers.delete(data.key); syncPres(); }
  };
  setInterval(() => {
    const now = Date.now(); let changed = false;
    for (const [k, v] of peers) if (now - v.t > 9000) { peers.delete(k); changed = true; }
    if (changed) syncPres();
  }, 3000);
  addEventListener('beforeunload', () => { if (myKey) bc.postMessage({ type: 'leave', key: myKey }); });

  return {
    kind: 'local', tab,
    async init() {},
    async rpc(fn, args) { if (!RPC[fn]) fail('función desconocida: ' + fn); return RPC[fn](args || {}); },
    async select(table) {
      const db = load();
      if (table === 'players_public') return db.players.map(pub);
      if (table === 'plots') return db.plots;
      if (table === 'furniture') return db.furni;
      if (table === 'animals') return db.animals || [];
      if (table === 'notes') return [...db.notes].sort((a, b) => b.created_at - a.created_at).slice(0, 300);
      return [];
    },
    join(key, meta, h) {
      handlers = h; myKey = key; myMeta = meta;
      bc.postMessage({ type: 'pres', key, meta });
      clearInterval(beat); beat = setInterval(() => bc.postMessage({ type: 'pres', key: myKey, meta: myMeta }), 3000);
      setTimeout(() => h.status?.('SUBSCRIBED'), 50);
    },
    track(meta) { myMeta = meta; if (myKey) bc.postMessage({ type: 'pres', key: myKey, meta }); return true; },
    send(event, payload) { bc.postMessage({ type: 'bc', event, payload }); },
    leave() { if (myKey) bc.postMessage({ type: 'leave', key: myKey }); clearInterval(beat); myKey = null; handlers = {}; },
    presenceState: () => Object.fromEntries([...peers].map(([k, v]) => [k, [v.meta]])),
  };
}
