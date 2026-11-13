// Páxinal Crossing · la app: entrada, registro, granja, tiendas, caja de envíos, casas, chat, tablón
// y tiempo real. El mundo (Phaser) está en game/world.js; el servidor, en net/ (Supabase o local).
//   ?local  → modo local (sin Supabase; las pestañas se ven entre sí)   ·   ?debug → herramientas de prueba
import { World } from './game/world.js';
import { createLocal } from './net/local.js';
import { createSupa } from './net/supa.js';
import * as D from './core/data.js';
import * as R from './core/rules.js';
import * as G from './art/granxa.js';
import { avatarCanvas, SKINS, HAIRS, HAIR_NAMES, STYLES } from './art/paximon/avatar.js';
import { $, esc, toast, openModal, modalOpen, Sound, scaled } from './ui/ui.js';
import { Chat } from './ui/chat.js';
import { openBoard, boardCount } from './ui/board.js';
import { fishingGame } from './ui/fishing.js';
import { openMapa } from './ui/mapa.js';
import { createGuide } from './ui/guia.js';
import { animal as animalArt } from './art/animais.js';
const AN_ART = (kind) => animalArt(kind, 0).cv;

const Q = new URLSearchParams(location.search);
const net = Q.has('local') ? createLocal() : createSupa();
const Ses = {
  get: () => JSON.parse(sessionStorage.getItem('paxinal.session.' + net.kind) || localStorage.getItem('paxinal.session.' + net.kind) || 'null'),
  set: (v) => { const j = JSON.stringify(v); sessionStorage.setItem('paxinal.session.' + net.kind, j); localStorage.setItem('paxinal.session.' + net.kind, j); },
  clear: () => { sessionStorage.removeItem('paxinal.session.' + net.kind); localStorage.removeItem('paxinal.session.' + net.kind); },
};
const LS = { ses: 'paxinal.session.' + net.kind, code: 'paxinal.code', pos: 'paxinal.pos.' + net.kind, prefs: 'paxinal.prefs', sel: 'paxinal.sel' };
const SEEDS = Object.keys(D.ITEMS).filter((k) => D.ITEMS[k].kind === 'seed');
const DUCK = [
  'Riega cada día: un riego dura 24 horas. Si se seca, el cultivo se para, pero no se muere.',
  'Los días de lluvia no hace falta regar. Salvo los Ads: la lluvia no paga a Google.',
  'Lo que metas en la caja de envíos se lo lleva el tren de la noche, y se cobra al día siguiente a las 7:00.',
  'Las palabras clave suben de posición cada día que se riegan. Si no, bajan a la página 2.',
  'Si te quedas sin energía, café. Siempre café. Diego y Sabrina abren de 7:00 a 22:00.',
  'Puedes ayudar a regar las parcelas de otros departamentos. Cosechar, no: eso es suyo.',
  'El tráfico orgánico tarda dos semanas, pero luego da cosecha cada semana para siempre.',
];

const A = window.PXC = {
  net, maps: {}, player: null, players: [], plots: new Map(), furni: [], animals: [], online: new Map(), remotePos: new Map(), offset: 0, world: null,
  prefs: JSON.parse(localStorage.getItem(LS.prefs) || '{}'), board: null, slots: [], sel: localStorage.getItem(LS.sel) || 'azada', busy: false,
  debug: Q.has('debug'), shipments: [],
};
// PXC_DEBUG_OFFSET (ms): adelanta el reloj para probar (el modo local usa el mismo)
A.now = () => Date.now() + A.offset + (globalThis.PXC_DEBUG_OFFSET || 0);
A.heartbeat = () => heartbeat();
A.savePrefs = () => localStorage.setItem(LS.prefs, JSON.stringify(A.prefs));
const chat = new Chat(A);
// guía del primer día (A02): al completar las seis tareas, enhorabuena (después del aviso de la última)
A.guide = createGuide(A, { onFinish: () => setTimeout(() => {
  toast('¡Enhorabuena! Ya has hecho tu primer día en Paximiña. Mañana a las 7:00 cobras lo de la caja.', 'good'); Sound.play('coins');
  chat.system('Paximiña de Arousa', `${A.player.nickname} completó su primer día. Benvido/a ao pobo!`);
}, 1800) });

// ---------- datos ----------
const pkey = (p) => `${p.house}:${p.x}:${p.y}`;
A.houseMembers = (dept) => A.players.filter((p) => p.house === dept).sort((a, b) => (a.desk_slot ?? 0) - (b.desk_slot ?? 0));
A.houseEmpty = (dept) => !A.players.some((p) => p.house === dept);
A.furniOf = (dept) => A.furni.filter((r) => r.house === dept);
A.animalsOf = (dept) => A.animals.filter((r) => r.house === dept);
A.sameMap = (id) => (A.remotePos.get(id)?.map || A.online.get(id)?.map) === A.world?.map?.id;
async function loadAll() {
  const [players, plots, furni, animals] = await Promise.all([net.select('players_public'), net.select('plots'), net.select('furniture'), net.select('animals')]);
  A.players = players; A.plots = new Map(plots.map((p) => [pkey(p), p])); A.furni = furni; A.animals = animals;
}
function applyPlot(p) {
  if (!p) return;
  if (p.deleted) A.plots.delete(pkey(p)); else A.plots.set(pkey(p), p);
  A.world?.refreshFarm();
}
function applyFurni(r) {
  A.furni = A.furni.filter((q) => q.id !== r.id);
  if (!r.deleted) A.furni.push(r);
  A.world?.refreshFurni();
}
function applyAnimal(r) {
  A.animals = A.animals.filter((q) => q.id !== r.id);
  if (!r.deleted) A.animals.push(r);
  A.world?.refreshAnimals();
}
function setPlayer(p) {
  if (!p) return;
  const keep = { secret: A.player.secret };
  Object.assign(A.player, p, keep);
  if (p.now) A.offset = p.now - Date.now();
  renderHud(); renderHotbar();
  if (!$('#deco').hidden) renderDeco();
}
A.setPlayer = setPlayer;   // para las ventanas que cobran o dan cosas (los encargos del tablón)

// ---------- pantallas de entrada ----------
const screen = (html) => { $('#screen').innerHTML = html; };
const logo = `<div class="logo">Páxinal Crossing</div><div class="logo-sub">Granjas y vida de pueblo en Paximiña de Arousa</div>`;
async function showGate(msg = '') {
  const saved = localStorage.getItem(LS.code);
  if (saved && await net.rpc('check_code', { p_code: saved }).catch(() => false)) return showUsers();
  screen(`<form class="panel" id="gate">${logo}
    <p>Para entrar hace falta la <b>palabra de acceso</b> de la oficina (la misma para todos). Tu navegador la recordará.</p>
    <label for="g-code">Palabra de acceso</label><input id="g-code" type="password" autocomplete="off" autofocus>
    <div class="err" id="g-err">${esc(msg)}</div>
    <div class="row end"><button class="btn" type="submit">Entrar</button></div></form>`);
  $('#gate').addEventListener('submit', async (e) => {
    e.preventDefault();
    const code = $('#g-code').value.trim();
    if (!code) return;
    try {
      if (await net.rpc('check_code', { p_code: code })) { localStorage.setItem(LS.code, code); showUsers(); }
      else $('#g-err').textContent = 'Esa no es. Pregunta en la oficina.';
    } catch (err) { $('#g-err').textContent = err.message; }
  });
}
async function showUsers() {
  let users = [];
  try { users = await net.select('players_public'); } catch (e) { return screen(`<div class="panel">${logo}<p class="err">No se puede conectar con el servidor: ${esc(e.message)}</p></div>`); }
  const ses = Ses.get();
  screen(`<div class="panel wide">${logo}
    <h2>¿Quién eres?</h2>
    <p class="muted">${users.length ? 'Elige tu usuario. Si es la primera vez, date de alta.' : 'Todavía no hay nadie en el pueblo. ¡Sé el primero!'}</p>
    <div class="users" id="u-list"></div>
    <div class="err" id="u-err"></div>
    <div class="row end"><button class="btn" id="u-new" type="button">Soy nuevo/a</button></div></div>`);
  const list = $('#u-list');
  for (const u of users.sort((a, b) => a.nickname.localeCompare(b.nickname))) {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'user' + (u.online ? ' on' : '');
    b.append(avatarCanvas(u.look, D.deptColor(u.dept)));
    const t = document.createElement('div');
    t.innerHTML = `<div class="nm">${esc(u.nickname)}</div><div class="dp" style="--c:${D.deptColor(u.dept)}">${esc(D.deptName(u.dept))}</div>`;
    b.append(t);
    b.addEventListener('click', async () => {
      try {
        const p = await net.rpc('login_as', { p_player: u.id, p_secret: ses?.id === u.id ? ses.secret : null, p_code: localStorage.getItem(LS.code) });
        enterGame(p);
      } catch (e) { $('#u-err').textContent = e.message; }
    });
    list.append(b);
  }
  $('#u-new').addEventListener('click', showRegister);
}
function showRegister() {
  const look = { skin: Math.floor(Math.random() * 4), hair: Math.floor(Math.random() * 8), style: STYLES[Math.floor(Math.random() * 4)].id };
  const deptOpts = [...D.DEPTS].sort((a, b) => a.name.localeCompare(b.name)).map((d) => `<option value="${d.id}">${esc(d.name)}</option>`).join('');
  screen(`<form class="panel wide" id="reg">${logo}
    <h2>Date de alta</h2>
    <div class="look"><div>
      <label for="r-nick">Apodo (2 a 16 letras o números)</label><input id="r-nick" type="text" maxlength="16" autocomplete="off" autofocus>
      <label for="r-dept">Departamento</label><select id="r-dept"><option value="">— Elige —</option>${deptOpts}<option value="otros">Otros</option></select>
      <div id="r-house-box" hidden><label for="r-house">¿A qué casa te apuntas?</label><select id="r-house">${deptOpts}</select></div>
      <label>Piel</label><div class="swatches" id="r-skin"></div>
      <label>Pelo</label><div class="swatches" id="r-hair"></div>
      <label>Peinado</label><div class="row" id="r-style"></div>
    </div><div><label>Así te verán</label><div class="preview"><canvas id="r-prev" width="16" height="22"></canvas></div></div></div>
    <div class="err" id="r-err"></div>
    <div class="row end"><button class="btn alt" type="button" id="r-back">Volver</button><button class="btn" type="submit">¡A Paximiña!</button></div></form>`);
  const dirs = ['down', 'right', 'up', 'left'];
  let di = 0;
  const color = () => { const d = $('#r-dept').value; return d ? D.deptColor(d) : '#9E9E9E'; };
  const draw = () => avatarCanvas(look, color(), dirs[di], 0, $('#r-prev'));
  const timer = setInterval(() => { if (!$('#r-prev')) return clearInterval(timer); di = (di + 1) % 4; draw(); }, 900);
  const swatches = (el, cols, key, names) => {
    cols.forEach((c, i) => {
      const s = document.createElement('button'); s.type = 'button'; s.className = 'sw' + (look[key] === i ? ' on' : ''); s.style.background = c; s.title = names?.[i] || '';
      s.addEventListener('click', () => { look[key] = i; el.querySelectorAll('.sw').forEach((x, j) => x.classList.toggle('on', j === i)); draw(); });
      el.append(s);
    });
  };
  swatches($('#r-skin'), SKINS, 'skin'); swatches($('#r-hair'), HAIRS, 'hair', HAIR_NAMES);
  for (const st of STYLES) {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'chip' + (look.style === st.id ? ' on' : ''); b.textContent = st.name;
    b.addEventListener('click', () => { look.style = st.id; $('#r-style').querySelectorAll('.chip').forEach((x) => x.classList.toggle('on', x === b)); draw(); });
    $('#r-style').append(b);
  }
  $('#r-dept').addEventListener('change', () => { $('#r-house-box').hidden = $('#r-dept').value !== 'otros'; draw(); });
  $('#r-back').addEventListener('click', showUsers);
  draw();
  $('#reg').addEventListener('submit', async (e) => {
    e.preventDefault();
    const dept = $('#r-dept').value;
    if (!dept) return ($('#r-err').textContent = 'Elige tu departamento.');
    try {
      const p = await net.rpc('register_player', { p_nickname: $('#r-nick').value.trim(), p_dept: dept, p_house: dept === 'otros' ? $('#r-house').value : dept, p_look: look, p_code: localStorage.getItem(LS.code) });
      enterGame(p, true);
    } catch (err) { $('#r-err').textContent = err.message; }
  });
}

// ---------- entrar en el juego ----------
async function enterGame(p, first = false) {
  A.player = p; A.offset = (p.now || Date.now()) - Date.now(); A.first = first;
  Ses.set({ id: p.id, secret: p.secret });
  await loadAll();
  screen('');
  $('#hud').hidden = false;
  $('#hud-money-ico').replaceChildren(scaled(G.paxetaIcon()));
  chat.show();
  renderHud(); renderHotbar();
  A.guide.start(first, p.gift);
  if (!A.game) {
    // Phaser no puede arrancar en una ventana de tamaño cero (pestaña oculta): se espera a que tenga tamaño
    const make = () => {
      A.game = new Phaser.Game({
        type: Phaser.AUTO, parent: 'game', pixelArt: true, roundPixels: true, backgroundColor: '#0e1014', banner: false,
        audio: { noAudio: true }, scale: { mode: Phaser.Scale.RESIZE, width: innerWidth, height: innerHeight }, scene: [new World(A)],
        // ?timer: el bucle va con setTimeout en vez de requestAnimationFrame (para probar con la pestaña oculta)
        ...(Q.has('timer') ? { fps: { forceSetTimeOut: true, target: 30 } } : {}),
      });
    };
    if (innerWidth > 1 && innerHeight > 1) make();
    else { const on = () => { if (innerWidth > 1 && innerHeight > 1) { removeEventListener('resize', on); make(); } }; addEventListener('resize', on); }
  } else startWorld();
  net.join(p.id, presMeta(), {
    presence: onPresence, join: () => announcePos(300 + Math.random() * 900),
    broadcast: (ev, pl) => { if (ev === 'pos') onPos(pl); else if (ev === 'chat') chat.onChat(pl); else if (ev === 'emote') chat.onEmote(pl); },
    db: onDb, status: (s) => { if (s === 'SUBSCRIBED') announcePos(200); },
  });
  clearInterval(A.hb); A.hb = setInterval(heartbeat, 25000);
  notifyPaid(p.paid);
  refreshShipments();
}
A.onWorldReady = (w) => { A.world = w; startWorld(); };
function startWorld() {
  const saved = JSON.parse(localStorage.getItem(LS.pos) || 'null');
  const ok = saved && (A.maps[saved.map] || saved.map?.startsWith('casa:'));
  if (ok && !A.first) A.world.loadMap(saved.map, { px: saved.px, py: saved.py, dir: saved.dir, x: 0, y: 0 });
  else A.world.loadMap('vila');
  if (A.first) {
    const house = D.DEPT_BY_ID[A.player.house];
    // el primero de la casa se encuentra la leira del vecino sembrada y lista (A01)
    const gift = A.player.gift ? [[`${house.npc.name} (o veciño)`, 'Deixeiche a leira sementada: seis de grelos e seis de patacas, xa listos. Recolle e mete todo na caixa de envíos, que mañá o tren cóbrache.']] : [];
    talkSeq([[null, '¡Bienvenido/a a Paximiña de Arousa! Acabas de llegar en el tren de las 9:14… con 25 minutos de retraso, como siempre.'],
      [null, `Tu casa es la de ${house.name}, en O Agro: al otro lado de la vía, cruzando el paso a nivel (sube por la calle).`],
      ...gift,
      [null, 'Diego y Sabrina te han dejado una azada, una regadera, unas semillas y un café. Con los números eliges (1 azada, 2 regadera, del 4 al 9 las semillas y 0 el café) y con Espacio lo usas. ¡A plantar!'],
      [null, 'Arriba a la izquierda tienes las tareas de tu primer día, y la flecha amarilla te lleva a cada sitio. Con la M ves el mapa del pueblo. También se juega con el ratón: haz clic donde quieras ir o en lo que quieras usar.']]);
  }
}
const presMeta = () => ({ nickname: A.player.nickname, dept: A.player.dept, house: A.player.house, look: A.player.look, map: A.world?.map?.id || 'vila' });

// ---------- tiempo real ----------
function onPresence(state) {
  const online = new Map();
  for (const [id, metas] of Object.entries(state)) { const m = metas[metas.length - 1]; if (m && id !== A.player?.id) online.set(id, m); }
  A.online = online;
  syncRemotes();
}
function syncRemotes() {
  const w = A.world; if (!w?.map) return;
  for (const [id, m] of A.online) {
    const pos = A.remotePos.get(id) || {};
    w.upsertRemote(id, { nickname: m.nickname, dept: m.dept, look: m.look, map: pos.map || m.map, x: pos.x, y: pos.y, dir: pos.dir, moving: pos.moving });
  }
  for (const id of [...w.remotes.keys()]) if (!A.online.has(id)) w.removeRemote(id);
}
function onPos(p) {
  if (!p?.id || p.id === A.player?.id || !Number.isFinite(p.x) || !Number.isFinite(p.y) || typeof p.m !== 'string') return;
  A.remotePos.set(p.id, { map: p.m, x: p.x, y: p.y, dir: D_DIRS.has(p.d) ? p.d : 'down', moving: !!p.mv });
  const m = A.online.get(p.id);
  if (m) A.world?.upsertRemote(p.id, { nickname: m.nickname, dept: m.dept, look: m.look, map: p.m, x: p.x, y: p.y, dir: p.d, moving: !!p.mv });
}
const D_DIRS = new Set(['down', 'up', 'left', 'right']);
let lastPos = 0, stopSent = true, lastSave = 0;
A.onMove = (me, wasMoving) => {
  const t = performance.now();
  if (me.moving) { if (t - lastPos > 250) sendPos(me); stopSent = false; }
  else if (!stopSent) { sendPos(me); stopSent = true; }
  if (t - lastSave > 2000) { lastSave = t; localStorage.setItem(LS.pos, JSON.stringify({ map: A.world.map.id, px: Math.round(me.x), py: Math.round(me.y), dir: me.dir })); }
};
function sendPos(me) { lastPos = performance.now(); net.send('pos', { id: A.player.id, m: A.world.map.id, x: Math.round(me.x), y: Math.round(me.y), d: me.dir, mv: me.moving ? 1 : 0 }); }
function announcePos(delay = 0) { clearTimeout(A.posT); A.posT = setTimeout(() => { if (A.world?.me) sendPos(A.world.me); }, delay); }
async function onDb(ev, p) {
  if (ev === 'plot') applyPlot(p);
  else if (ev === 'furni') applyFurni(p);
  else if (ev === 'animal') applyAnimal(p);
  else if (ev === 'notes') { A.board?.reload(); A.refreshBoard(); if (p?.op === 'insert') Sound.play('paper', 0.25); }
  else if (ev === 'players') {
    const wasEmpty = p?.house && A.houseEmpty(p.house);
    A.players = await net.select('players_public');
    if (wasEmpty && A.world?.map?.base === 'agro') A.world.removeNpc('npc_' + p.house);
    A.world?.refreshFarm(true);
  }
}
async function heartbeat() {
  try {
    const r = await net.rpc('heartbeat', { p_secret: A.player.secret });
    setPlayer({ paxetas: r.paxetas, energy: r.energy, inventory: r.inventory, now: r.now });
    notifyPaid(r.paid);
  } catch (e) {
    if (/sesión no válida/.test(e.message)) { toast('Has entrado con este usuario desde otro sitio.', 'error'); setTimeout(() => location.reload(), 2500); }
  }
}
function notifyPaid(paid) {
  if (!paid?.length) return;
  const total = paid.reduce((s, x) => s + x.value, 0);
  for (const s of paid) chat.system('Renfe Mercancías', `El tren de la noche llegó a destino${s.late ? ` (con ${s.late} min de retraso)` : ''}: cobras ${s.value} paxetas por ${s.qty} × ${D.ITEMS[s.item]?.name || s.item}.`);
  toast(`¡Cobras ${total} paxetas de la caja de envíos!`, 'good'); Sound.play('coins');
  refreshShipments();
}
async function refreshShipments() {
  try { A.shipments = await net.rpc('my_shipments', { p_secret: A.player.secret }); } catch { A.shipments = []; }
  A.world?.setShipFull(A.shipments.length > 0);
}
A.refreshBoard = async () => {
  if (!A.player || A.world?.map?.id !== 'vila') return;
  const c = await boardCount(A);
  A.world.setBoardLabel(c.fresh ? `TABLÓN · ${c.fresh} ${c.fresh === 1 ? 'NUEVA' : 'NUEVAS'}` : `TABLÓN · ${c.total}`);
};

// ---------- el mundo pregunta y avisa ----------
A.blocked = () => modalOpen() || !$('#talk').hidden || $('#screen').innerHTML !== '';
A.onMapLoaded = (map) => {
  $('#hud-map').textContent = map.base === 'casa' ? 'Casa de ' + D.deptName(map.dept) : map.J.name;
  $('#btn-deco').hidden = !(map.base === 'casa' && map.dept === A.player.house);
  if ($('#btn-deco').hidden) closeDeco();
  net.track(presMeta());
  announcePos(60);
  syncRemotes();
  A.world.setShipFull(A.shipments.length > 0);
  A.refreshBoard();
};
A.onTrain = (t) => {
  if (A.world.map.id !== 'vila') return;
  Sound.play('train_horn', 0.3);
  toast(D.renfeLine(t));
};
A.door = (d) => {
  if (d.to === 'cafe') {
    const h = R.hourOf(A.now());
    if (h < D.CAFE_HOURS[0] || h >= D.CAFE_HOURS[1]) return talk('Cartel en la puerta', D.CLOSED_LINES[0]);
    return goTo('cafe');
  }
  if (d.to === 'lonxa') return R.inHours(R.hourOf(A.now()), D.LONXA_HOURS) ? goTo('lonxa') : talk('Cartel en la puerta', D.LONXA_CLOSED);
  if (d.to === 'bonsai') return bonsaiOpen() ? goTo('bonsai') : talk('Cartel en la puerta', D.BONSAI_CLOSED);
  if (d.to?.startsWith('casa:')) return goTo(d.to);
  if (d.text) talk(d.label || null, d.text);
};
A.exit = (e) => {
  const m = A.world.map;
  if (m.base === 'casa') {
    const h = A.maps.agro.houses.find((q) => q.dept === m.dept);
    return goTo('agro', { x: h.door.x, y: h.door.y + 1, dir: 'down' });
  }
  goTo(e.to, { x: e.tx, y: e.ty, dir: e.dir });
};
function goTo(id, at = null) {
  const cam = A.world.cameras.main;
  if (A.going) return;
  A.going = true;
  Sound.play('door', 0.3);
  cam.fadeOut(140, 0, 0, 0);
  cam.once('camerafadeoutcomplete', () => {
    A.world.loadMap(id, at);
    A.world.cameras.main.fadeIn(160, 0, 0, 0);
    A.going = false;
  });
}
A.spot = (s) => {
  switch (s.action) {
    case 'board': return openBoard(A);
    case 'shop': return cafeShop();
    case 'shop_bonsai': return bonsaiShop();
    case 'lonxa': return lonxaSell();
    case 'feed': return feedAnimals(s.dept);
    case 'shop_naval': return navalShop();
    case 'gull': return talk('La gaviota', ['La gaviota te mira el bocadillo. Tú miras a la gaviota. Nadie parpadea.', '«¡Kiaaa!» (Traducción: «¿Eso que llevas se come?»)', 'Ni se te ocurra dejar el bocadillo en el suelo.'][Math.floor(Math.random() * 3)]);
    case 'departures': return departuresPanel();
    case 'ship': return shipBox(s.dept);
    case 'catalog': return catalog();
    case 'house_info': return houseInfo(s.dept);
    case 'duck': return talk('El pato de goma', `Le cuentas tus penas al pato de goma. «Cuac.» Parece que te quiere decir algo: ${DUCK[Math.floor(Math.random() * DUCK.length)]}`);
    default: if (s.text) talk(null, s.text);
  }
};
A.talk = (n) => {
  if (n.who === 'diego' || n.who === 'sabrina') {
    const h = R.hourOf(A.now());
    if (h < D.CAFE_HOURS[0] || h >= D.CAFE_HOURS[1]) return talk(n.name, D.CLOSED_LINES[0]);
    return talk(n.name, D.CAFE_LINES[Math.floor(Math.random() * D.CAFE_LINES.length)], cafeShop);
  }
  if (n.who === 'brais' || n.who === 'vanesa') {
    const c = D.COMERCIALES.find((q) => q.id === n.who), deal = R.dealOf(R.dayKey(A.now()));
    return talkSeq([[c.name, c.lines[Math.floor(Math.random() * c.lines.length)]],
      [c.name, `¡Oferta solo por hoy! ${D.ITEMS[deal].name} a ${R.priceOf(deal, A.now())} paxetas en vez de ${D.ITEMS[deal].price}. Mañana, otra. Bueno, la misma.`]], () => comShop(c));
  }
  if (n.who === 'coop') return talk(n.name, D.COOP_LINES[Math.floor(Math.random() * D.COOP_LINES.length)], coopShop);
  if (n.who === 'vecino') return talk(n.name, n.lines[Math.floor(Math.random() * n.lines.length)]);   // vecinos de A Vila (A11)
  if (n.who === 'poxador') {
    const h = R.hourOf(A.now()), auction = R.inHours(h, D.AUCTION_HOURS);
    return talk(n.name, auction ? '¡Empieza la subasta! Saca lo que traigas, que hoy los restaurantes pagan bien.' : 'Aquí se compra pescado fresco. Y lo que saques del agua, aunque sea un disquete. A las 12:00, subasta.', lonxaSell);
  }
  if (n.who === 'camarero') {
    // solo gruñe… salvo a quien lleva un mes viniendo: entonces, un día, «bo día»
    if ((A.player.bonsai_days || 0) >= D.BONSAI_DAYS) return talk(n.name, 'Bo día.', () => { toast('Logro secreto: ¡el camarero del Bonsai te ha dado los buenos días!', 'good'); bonsaiShop(); });
    return talk(n.name, D.GRUNTS[Math.floor(Math.random() * D.GRUNTS.length)], bonsaiShop);
  }
  const d = D.DEPT_BY_ID[n.dept];
  if (!d) return;
  const line = d.npc.lines[Math.floor(Math.random() * d.npc.lines.length)];
  talkSeq([[n.name, line], [n.name, `Esta es la casa de ${d.name}. Mientras no se apunte nadie de ${d.name}, cuido yo la casa y la leira. Cuando llegue el primero, se la dejo.`]]);
};
A.clickPlayer = (id) => {
  const m = A.online.get(id); if (!m) return;
  const mo = openModal(`<h2>${esc(m.nickname)}</h2><p class="lead">${esc(D.deptName(m.dept))}${m.house && m.house !== m.dept ? ' · vive en la casa de ' + esc(D.deptName(m.house)) : ''}</p>
    <div class="row"><div class="preview" style="width:120px;height:120px"></div></div>
    <div class="row end"><button class="btn small" id="pc-msg">Escribirle</button></div>`);
  mo.el.querySelector('.preview').append(avatarCanvas(m.look, D.deptColor(m.dept)));
  mo.el.querySelector('.preview canvas').style.cssText = 'width:64px;height:88px';
  mo.el.querySelector('#pc-msg').addEventListener('click', () => { mo.close(); chat.open(); const i = $('#chat-input'); i.value = `@${m.nickname} `; i.focus(); });
};
A.furniInfo = (r) => { const f = D.FURNI_BY_ID[r.kind]; toast(`${f?.name || r.kind} · lo puso ${r.owner_nick}`); };
const isDrink = (id) => D.ITEMS[id]?.kind === 'drink';
A.actNothing = () => { if (isDrink(A.sel)) drink(A.sel); };
A.selectSlot = (i) => { const id = A.slots[i]; if (!id) return; if (id === A.sel && isDrink(id)) return drink(id); A.sel = id; localStorage.setItem(LS.sel, id); renderHotbar(); Sound.play('select', 0.2); };
A.cancelMode = () => { if (!$('#deco').hidden) closeDeco(); };

// ---------- granja ----------
function describePlot(p, dept) {
  const v = R.plotView(p, A.now()), c = D.CROPS[p.crop];
  if (!p.crop) return v.wet ? 'Tierra arada y regada: lista para plantar.' : 'Tierra arada: elige unas semillas y planta.';
  let s = c.name + (p.crop === 'palabra' ? ` · posición ${v.pos}` : '');
  if (v.ready) return s + ' · ¡lista para cosechar!';
  s += ` · faltan ${R.fmtHours(v.hoursLeft)} de ${c.paid ? 'anuncios' : 'riego'}`;
  if (v.rain && !c.paid) return s + ' · hoy llueve: se riega sola';
  if (v.wet) return s + ` · ${c.paid ? 'pagado' : 'regado'} (dura ${R.fmtHours((p.wet_until - A.now()) / R.H)} más)`;
  return s + (c.paid ? ' · sin pagar: no crece' : ' · seca: riégala para que siga creciendo');
}
A.useOnField = async (field, f) => {
  const P = A.player, key = `${field.dept}:${field.rx}:${field.ry}`, plot = A.plots.get(key), d = D.DEPT_BY_ID[field.dept];
  if (A.houseEmpty(field.dept)) return talk(d.npc.name, `Esta leira la cuido yo. Se abre en cuanto se apunte alguien de ${d.name}.`);
  const member = P.house === field.dept, view = plot && R.plotView(plot, A.now()), sel = A.sel;
  const notMine = () => toast(`Esta parcela es de ${d.name}: solo puedes ayudar a regar.`);
  let action = null, item = null;
  const area = areaFor(field);
  if (plot?.crop && view.ready) { if (!member) return toast(`Está lista para cosechar, pero es de ${d.name}.`); action = 'harvest'; }
  else if (area) return useArea(field, area);
  else if (sel === 'azada') {
    if (!member) return notMine();
    if (!plot) action = 'till';
    else if (plot.crop) { if (!confirm(`¿Arrancar ${D.CROPS[plot.crop].name}? Se pierde lo plantado.`)) return; action = 'clear'; }
    else return toast('Ya está arada. Elige unas semillas en la barra y plántalas.');
  } else if (sel === 'regadera') {
    if (!plot) return toast('Primero hay que arar la tierra con la azada (tecla 1).');
    if (plot.crop && D.CROPS[plot.crop].paid && !member) return toast('Los anuncios los paga su departamento.');
    action = 'water';
  } else if (D.ITEMS[sel]?.kind === 'seed') {
    if (!member) return notMine();
    if (!plot) return toast('Primero ara la tierra con la azada (tecla 1).');
    if (plot.crop) return toast('Ya hay algo plantado aquí.');
    action = 'plant'; item = sel;
  } else return toast(plot ? describePlot(plot) : 'Coge la azada (1) para arar, la regadera (2) para regar o unas semillas para plantar.');
  const now = A.now(), crop = plot?.crop && D.CROPS[plot.crop];
  if (action === 'water') {
    if (crop?.paid) {
      if ((plot.wet_until || 0) - now > 18 * R.H) return toast('La campaña de anuncios de hoy ya está pagada.');
      if (P.paxetas < crop.paid) return toast(`No te llega para pagar los anuncios (${crop.paid} paxetas).`);
    } else {
      if ((plot.wet_until || 0) - now > 18 * R.H) return toast('Ya está bien regada. Vuelve mañana.');
      if (R.rainy(R.dayKey(now))) return toast('Hoy llueve: no hace falta regar (es Galicia).');
    }
  }
  const cost = action === 'till' ? 2 : action === 'water' && crop?.paid ? 0 : 1;
  if (P.energy < cost) return toast('Estás sin energía: tómate un café (lo venden Diego y Sabrina).', 'error');
  if (A.busy) return;
  A.busy = true;
  // golpe de la herramienta y partículas al momento, sin esperar al servidor (A07)
  const here = { tx: field.x + field.rx, ty: field.y + field.ry };
  const inHand = action === 'till' || action === 'clear' ? D.toolUpgrade(P.inventory, 'azada') || 'azada'
    : action === 'water' ? D.toolUpgrade(P.inventory, 'regadera') || 'regadera' : action === 'plant' ? item : null;
  A.world.toolFx(action, [here], inHand);
  try {
    const r = await net.rpc('farm', { p_secret: P.secret, p_house: field.dept, p_x: field.rx, p_y: field.ry, p_action: action, p_item: item });
    applyPlot(r.plot); setPlayer(r.player);
    if (action === 'harvest' && r.gained) A.world.harvestFx(here.tx, here.ty, r.gained);
    A.guide.event('farm', { action, house: field.dept });
    if (action === 'harvest') { Sound.play('item'); toast(`+1 ${D.ITEMS[r.gained]?.name || r.gained}. Déjalo en la caja de envíos para venderlo.`, 'good'); }
    else if (action === 'water' && D.CROPS[r.plot.crop]?.paid) toast(`Campaña de anuncios pagada: ${D.CROPS.ads.paid} paxetas. Mañana, clics.`);
    else if (action === 'plant') Sound.play('select', 0.25);
    if (!member && action === 'water') toast(`Has regado la parcela de ${d.name}. ¡Qué majo/a!`, 'good');
  } catch (e) { toast(e.message, 'error'); }
  finally { A.busy = false; }
};
// (A05) herramientas mejoradas: ¿la de la barra trabaja aquí varias casillas? (la mejora, su forma y sus
// casillas en la leira) o null. Cosechar, arrancar lo plantado y pagar los Ads siguen yendo de una en una.
function areaFor(field) {
  const sel = A.sel, up = (sel === 'azada' || sel === 'regadera') && D.toolUpgrade(A.player.inventory, sel);
  if (!up || !A.world?.me || A.houseEmpty(field.dept)) return null;
  const plot = A.plots.get(`${field.dept}:${field.rx}:${field.ry}`);
  if (plot?.crop && R.plotView(plot, A.now()).ready) return null;
  if (sel === 'azada' && plot?.crop) return null;
  if (sel === 'regadera' && plot?.crop && D.CROPS[plot.crop].paid) return null;
  const a = D.TOOL_AREA[up];
  return { up, ...a, tiles: R.areaOf(field.rx, field.ry, A.world.me.dir, a.shape) };
}
// para el mundo: las casillas (del mapa) que va a tocar la herramienta, para marcarlas antes de usarla
A.toolArea = (field) => {
  const a = areaFor(field); if (!a) return null;
  return a.tiles.filter((t) => t.x >= 0 && t.y >= 0 && t.x < field.w && t.y < field.h).map((t) => ({ tx: field.x + t.x, ty: field.y + t.y }));
};
async function useArea(field, area) {
  const P = A.player, d = D.DEPT_BY_ID[field.dept], member = P.house === field.dept, now = A.now(), till = area.action === 'till';
  if (till && !member) return toast(`Esta parcela es de ${d.name}: solo puedes ayudar a regar.`);
  if (!till && R.rainy(R.dayKey(now))) return toast('Hoy llueve: no hace falta regar (es Galicia).');
  // las que se pueden hacer (para avisar y saber la energía; el servidor lo vuelve a mirar todo)
  const ok = area.tiles.filter((t) => t.x >= 0 && t.y >= 0 && t.x < D.FIELD.w && t.y < D.FIELD.h).filter((t) => {
    const p = A.plots.get(`${field.dept}:${t.x}:${t.y}`);
    return till ? !p : p && !(p.crop && D.CROPS[p.crop].paid) && !((p.wet_until || 0) - now > 18 * R.H);
  });
  if (!ok.length) return toast(till ? 'Ahí no queda hierba que arar.' : 'Ahí no hay nada que regar ahora (ya está regado o sin arar).');
  const cost = ok.length * (till ? 2 : 1);
  if (P.energy < cost) return toast(`Te falta energía: para ${ok.length} casillas hacen falta ${cost}. Tómate un café.`, 'error');
  if (A.busy) return;
  A.busy = true;
  A.world.toolFx(area.action, ok.map((t) => ({ tx: field.x + t.x, ty: field.y + t.y })), area.up);   // A07
  try {
    const r = await net.rpc('farm_area', { p_secret: P.secret, p_house: field.dept, p_tiles: area.tiles, p_action: area.action });
    for (const p of r.plots) applyPlot(p);
    setPlayer(r.player);
    A.world.flashTiles(r.plots.map((p) => ({ tx: field.x + p.x, ty: field.y + p.y })));
    A.guide.event('farm', { action: area.action, house: field.dept });
    Sound.play('select', 0.25);
    const n = r.plots.length, cas = n === 1 ? 'casilla' : 'casillas';
    toast(member || till ? `${D.ITEMS[area.up].name}: ${n} ${cas} ${till ? (n === 1 ? 'arada' : 'aradas') : (n === 1 ? 'regada' : 'regadas')} de una vez (−${n * (till ? 2 : 1)} de energía).`
      : `Has regado ${n} ${cas} de la parcela de ${d.name}. ¡Qué majo/a!`, member || till ? '' : 'good');
  } catch (e) { toast(e.message, 'error'); }
  finally { A.busy = false; }
}
async function drink(id = 'cafe') {
  if (!A.player.inventory[id]) return toast('No te queda café. Diego y Sabrina tienen (y de noche, el Bonsai).');
  if (A.player.energy >= D.ENERGY_MAX) return toast('Ya estás a tope. Un café más y ves los sonidos.');
  try { setPlayer(await net.rpc('drink', { p_secret: A.player.secret, p_item: id })); Sound.play('coffee'); A.guide.event('drink', { item: id }); toast(id === 'cafe_bonsai' ? `Mmm… sabe a cenicero. Energía: ${A.player.energy}.` : `¡Café! Energía: ${A.player.energy}.`, 'good'); }
  catch (e) { toast(e.message, 'error'); }
}

// ---------- animales ----------
async function feedAnimals(dept) {
  const P = A.player, mine = A.animalsOf(dept).filter((r) => D.ANIMALS[r.kind]?.corral);
  if (P.house !== dept) return toast(`Es el comedero de ${D.deptName(dept)}.`);
  if (!mine.length) return toast('El corral está vacío. Los animales se compran en la cooperativa, junto a la entrada de O Agro.');
  const hungry = mine.filter((r) => !R.animalState(r, A.now()).fed).length;
  if (!hungry) return toast('Ya han comido hoy. Mañana más.');
  if ((P.inventory.pienso || 0) < hungry) return toast(`Hacen falta ${hungry} sacos de pienso y tienes ${P.inventory.pienso || 0}. La cooperativa los vende.`, 'error');
  try { const r = await net.rpc('feed_animals', { p_secret: P.secret, p_house: dept }); setPlayer(r.player); (r.animals || []).forEach(applyAnimal); Sound.play('select', 0.3); toast(`Comida para ${r.fed} ${r.fed === 1 ? 'animal' : 'animales'}. Mañana darán lo suyo… bueno, hoy ya.`, 'good'); }
  catch (e) { toast(e.message, 'error'); }
}
A.animalAct = async (row) => {
  const P = A.player, a = D.ANIMALS[row.kind], st = R.animalState(row, A.now()), who = `${row.name} (${a.name.toLowerCase()})`;
  if (st.ready && P.house === row.house) {
    try { const r = await net.rpc('collect_animal', { p_secret: P.secret, p_id: row.id }); setPlayer(r.player); applyAnimal(r.animal); Sound.play('item'); toast(`${row.name}: ${a.sound} +1 ${D.ITEMS[r.item].name}.`, 'good'); }
    catch (e) { toast(e.message, 'error'); }
    return;
  }
  A.world.say('beast:' + row.id, a.sound + ' ♥', 1800);
  if (!a.product) return toast(`${who}. ${a.desc}`);
  if (!st.fed) return toast(`${who} tiene hambre: pon pienso en el comedero del corral.`);
  toast(`${who} ya ha comido. ${st.waitDays ? `Dará ${D.ITEMS[a.product].name.toLowerCase()} dentro de ${st.waitDays} ${st.waitDays === 1 ? 'día' : 'días'}.` : 'Mañana tendrá algo para ti.'}`);
};
function coopShop() {
  const P = A.player;
  const mo = openModal(`<h2>Cooperativa do Agro</h2><p class="lead">Animales para tu corral (caben ${D.CORRAL_MAX}) y pienso. Tienes <b class="shop-money">${P.paxetas}</b> paxetas.</p><div class="shop"></div>`, { cls: 'wide' });
  const box = mo.el.querySelector('.shop');
  box.append(shopRow('pienso', D.ITEMS.pienso.desc));
  for (const [kind, a] of Object.entries(D.ANIMALS)) {
    const have = A.animalsOf(P.house).filter((r) => r.kind === kind).length;
    const row = document.createElement('div'); row.className = 'it';
    const what = a.product ? `Da ${D.ITEMS[a.product].name.toLowerCase()} ${a.every === 1 ? 'cada día' : `cada ${a.every} días`} si come pienso. ` : a.desc + ' ';
    row.innerHTML = `<div></div><div><div class="nm">${esc(a.name)}</div><div class="ds">${what}Tienes ${have} de ${a.max}.</div></div>
      <div class="buy"><input class="nm-in" type="text" maxlength="12" title="Su nombre" value="${esc(D.ANIMAL_NAMES[kind][Math.floor(Math.random() * D.ANIMAL_NAMES[kind].length)])}"><span class="price">${a.price} ₧</span><button class="btn small" type="button">Comprar</button></div>`;
    row.querySelector('.nm-in').addEventListener('keydown', (e) => e.stopPropagation());
    row.firstChild.append(scaled(AN_ART(kind), 'big'));
    row.querySelector('button').addEventListener('click', async () => {
      if (have >= a.max) return toast(`Ya tienes ${a.max === 1 ? 'uno' : a.max}. No caben más.`);
      if (P.paxetas < a.price) return toast(`No te llega: cuesta ${a.price} paxetas.`, 'error');
      const name = row.querySelector('.nm-in').value.trim();
      if (!name) return toast('Ponle un nombre.');
      try {
        const r = await net.rpc('buy_animal', { p_secret: P.secret, p_kind: kind, p_name: name });
        setPlayer(r.player); applyAnimal(r.animal); Sound.play('coins');
        toast(`¡${r.animal.name} ya vive en tu ${a.corral ? 'corral' : 'casa'}! ${a.sound}`, 'good'); mo.close();
      } catch (e) { toast(e.message, 'error'); }
    });
    box.append(row);
  }
}

// ---------- pesca ----------
A.useOnWater = async (f) => {
  const P = A.player, map = A.world.map;
  if (A.sel !== 'cana') return toast(P.inventory.cana ? 'Elige la caña en la barra para pescar.' : 'Para pescar necesitas una caña: la venden en la lonxa del peirao (al oeste del paseo).');
  if (P.energy < 2) return toast('Estás sin energía para pescar: tómate un café.', 'error');
  if (A.busy || A.fishing) return;
  A.fishing = true;
  const spot = map.id === 'peirao' ? 'peirao' : map.J.fishing;
  const res = await fishingGame({ difficulty: spot === 'rego' ? 0.35 : spot === 'peirao' ? 0.55 : 0.5, title: spot === 'rego' ? 'Pescando en el rego…' : 'Pescando en la ría…' });
  try {
    const r = await net.rpc('fish', { p_secret: P.secret, p_spot: spot, p_skill: res.skill });
    setPlayer(r.player);
    const it = r.caught && D.ITEMS[r.caught];
    if (!it) toast('Se escapó. Era enorme. (Eso dicen todos.)');
    else if (it.kind === 'trash') toast(`Has pescado… ${it.name}. Gracias, ría.`);
    else toast(`¡Has pescado ${r.caught === 'xurelo_ouro' ? 'O XURELO DE OURO' : 'un' + (/a$/.test(it.name) ? 'a ' : ' ') + it.name}!${it.sell >= 150 ? ' ¡Menuda pieza!' : ''}`, 'good');
  } catch (e) { toast(e.message, 'error'); }
  finally { A.fishing = false; }
};

// ---------- tiendas ----------
const seasonTag = (it) => (it.season && it.season === R.seasonOf(A.now()) ? '<span class="tag-season">de temporada +25 %</span>' : '');
function shopRow(id, extraDesc = '', onBought = null) {
  const it = D.ITEMS[id], price = R.priceOf(id, A.now()), deal = price !== it.price;
  const row = document.createElement('div'); row.className = 'it';
  row.innerHTML = `<div></div><div><div class="nm">${esc(it.name)}</div><div class="ds">${extraDesc || esc(it.desc || '')}</div></div>
    <div class="buy">${deal ? `<span class="tag-deal">¡Solo por hoy!</span><s class="old">${it.price}</s>` : ''}<span class="price">${price} ₧</span><input class="qty" type="number" min="1" max="20" value="1"><button class="btn small" type="button">Comprar</button></div>`;
  row.firstChild.append(scaled(it.kind === 'furni' ? furniCanvas(it.furni) : G.itemIcon(id), it.kind === 'furni' ? 'big' : ''));
  const qty = row.querySelector('.qty'); qty.addEventListener('keydown', (e) => e.stopPropagation());
  row.querySelector('button').addEventListener('click', async () => {
    qty.value = Math.max(1, Math.min(20, Math.round(Number(qty.value) || 1)));
    if (price * qty.value > A.player.paxetas) return toast(`No te llega: cuesta ${price * qty.value} paxetas y tienes ${A.player.paxetas}.`, 'error');
    try {
      setPlayer(await net.rpc('buy', { p_secret: A.player.secret, p_item: id, p_qty: Number(qty.value) || 1 }));
      Sound.play('coins'); toast(`Comprado: ${qty.value} × ${it.name}.${it.kind === 'furni' ? ' Pulsa 🛋️ para colocarlo.' : ''}`, 'good');
      document.querySelectorAll('.shop-money').forEach((e) => { e.textContent = A.player.paxetas; });
      A.guide.event('buy', { item: id });
      onBought?.(id);
    } catch (e) { toast(e.message, 'error'); }
  });
  return row;
}
const bonsaiOpen = () => { const h = R.hourOf(A.now()); return h >= D.BONSAI_HOURS[0] || h < D.BONSAI_HOURS[1]; };
function bonsaiShop() {
  if (!bonsaiOpen()) return talk('Camarero', 'Grrf. (Señala el reloj: está cerrado.)');
  const mo = openModal(`<h2>Café Bonsai</h2><p class="lead">El peor café del pueblo, pero a estas horas es lo que hay. Tienes <b class="shop-money">${A.player.paxetas}</b> paxetas.</p><div class="shop"></div>`);
  mo.el.querySelector('.shop').append(shopRow('cafe_bonsai'));
}
// Panel de salidas: las próximas salidas con su destino, retrasos y supresiones (y el de Albacete)
function departuresPanel() {
  const now = A.now(), rows = R.departuresFrom(now, 8);
  const obs = (t) => t.albacete ? '<span class="late">RETRASADO · sin hora prevista</span>' : t.cancelled ? '<span class="late">SUPRIMIDO · servicio alternativo por carretera</span>'
    : t.night ? 'Recoge las cajas de envíos' : t.delay ? `<span class="warn">Retraso estimado: ${t.delay} min</span>` : 'En hora';
  openModal(`<div class="departures"><div class="dep-head"><span>SALIDAS</span><span>${R.clockText(now)}</span></div>
    <table><tr><th>Hora</th><th>Destino</th><th>Vía</th><th>Observaciones</th></tr>
    ${rows.map((t) => `<tr><td>${t.albacete ? '13:14' : R.clockText(t.sched)}</td><td>${esc(D.DESTS[t.dest] || t.dest)}</td><td>1</td><td>${obs(t)}</td></tr>`).join('')}</table>
    <div class="dep-foot">Renfe informa: consulte el estado de su tren. Disculpen las molestias.</div></div>`, { cls: 'wide dep-modal' });
}
// la tienda de los comerciales: si cierras sin comprar nada, te persiguen un rato
function comShop(c) {
  const deal = R.dealOf(R.dayKey(A.now())), items = [...new Set([deal, ...c.sells])];
  let bought = false;
  const mo = openModal(`<h2>${esc(c.name)} · Páxinas Galegas</h2><p class="lead">«Esto es una oportunidad única.» Tienes <b class="shop-money">${A.player.paxetas}</b> paxetas.</p><div class="shop"></div>
    <p class="muted" style="font-family:system-ui;font-size:12px">Letra pequeña: permanencia de 12 meses. O de 12 minutos. No queda claro.</p>`,
  { cls: 'wide', onClose: () => { if (!bought) A.world.startChase(c.id); } });
  const box = mo.el.querySelector('.shop');
  for (const id of items) {
    const it = D.ITEMS[id], cr = it.crop && D.CROPS[it.crop];
    const desc = cr ? `${esc(it.desc || cr.note)} Crece en ${R.fmtHours(cr.hours)}.` : esc(it.desc || (it.kind === 'furni' ? 'Se cuelga en la pared de tu casa. Trae clientes (eso dicen).' : ''));
    box.append(shopRow(id, desc, () => { bought = true; setTimeout(() => toast('Firmado: permanencia de 12 meses. (Es broma. Creemos.)'), 1800); }));
  }
}
// tienda de efectos navales (dentro de la lonxa): la caña
function navalShop() {
  if (!R.inHours(R.hourOf(A.now()), D.LONXA_HOURS)) return talk('Efectos navales', D.LONXA_CLOSED);
  const mo = openModal(`<h2>Efectos navales</h2><p class="lead">Autoservicio: se paga al poxador. Tienes <b class="shop-money">${A.player.paxetas}</b> paxetas.</p><div class="shop"></div>`);
  mo.el.querySelector('.shop').append(shopRow('cana', D.ITEMS.cana.desc));
}
// la lonxa compra el pescado (y la basura, por poco) al precio del día; de 12:00 a 13:00, subasta
function lonxaSell() {
  const h = R.hourOf(A.now());
  if (!R.inHours(h, D.LONXA_HOURS)) return talk('Poxador', D.LONXA_CLOSED);
  const auction = R.inHours(h, D.AUCTION_HOURS), key = R.dayKey(A.now());
  const mo = openModal(`<h2>Lonxa de Paximiña</h2><p class="lead">${auction ? '<b style="color:#FF7043">¡Subasta en directo!</b> Los compradores pujan y se paga más.' : 'Precio del día. A las 12:00 hay subasta y se paga más.'}</p><div class="shop"></div><div class="pending" hidden></div>`, { cls: 'wide' });
  const box = mo.el.querySelector('.shop'), pend = mo.el.querySelector('.pending');
  const render = () => {
    box.innerHTML = '';
    const items = Object.entries(A.player.inventory).filter(([k]) => ['fish', 'trash'].includes(D.ITEMS[k]?.kind) || k === 'pemento_picante');
    if (!items.length) box.innerHTML = '<p class="muted">No traes nada del mar. Con una caña (en la tienda de aquí al lado) se pesca en el peirao, en la playa o en el rego.</p>';
    for (const [id, n] of items) {
      const it = D.ITEMS[id], unit = Math.round(it.sell * R.lonxaFactor(key, id) * (id === 'pemento_picante' ? D.PICANTE_LONXA : 1));
      const row = document.createElement('div'); row.className = 'it';
      row.innerHTML = `<div></div><div><div class="nm">${esc(it.name)} × ${n}</div><div class="ds">${unit} ₧ cada uno hoy${auction ? ' · ¡en subasta, más!' : ''}</div></div>
        <div class="buy"><input class="qty" type="number" min="1" max="${n}" value="${n}"><button class="btn small" type="button">${auction ? 'Subastar' : 'Vender'}</button></div>`;
      row.firstChild.append(scaled(G.itemIcon(id)));
      const qty = row.querySelector('.qty'); qty.addEventListener('keydown', (e) => e.stopPropagation());
      row.querySelector('button').addEventListener('click', async (e) => {
        e.target.disabled = true;
        try {
          const q = Math.max(1, Math.min(n, Number(qty.value) || 1));
          const r = await net.rpc('lonxa_sell', { p_secret: A.player.secret, p_item: id, p_qty: q });
          if (r.auction) await auctionShow(pend, it.name, q, r.value);
          setPlayer(r.player); Sound.play('coins');
          toast(`Vendido: ${q} × ${it.name} por ${r.value} paxetas.`, 'good');
          render();
        } catch (err) { toast(err.message, 'error'); e.target.disabled = false; }
      });
      box.append(row);
    }
  };
  render();
}
// la subasta: los compradores pujan unos segundos hasta el precio final (lo decide el servidor)
async function auctionShow(el, name, qty, final) {
  el.hidden = false;
  const bids = D.BIDDERS.slice().sort(() => Math.random() - 0.5).slice(0, 3), steps = [0.62, 0.78, 0.9, 1];
  for (let i = 0; i < steps.length; i++) {
    const who = i < 3 ? bids[i] : bids[2];
    el.innerHTML = `Subasta: ${qty} × <b>${esc(name)}</b> · ${esc(who)} puja <b>${Math.round(final * steps[i])}</b> ₧${i === steps.length - 1 ? ' · <b>¡adjudicado!</b>' : '…'}`;
    Sound.play('select', 0.2);
    await new Promise((r) => setTimeout(r, 650));
  }
}
function cafeShop() {
  const h = R.hourOf(A.now());
  if (h < D.CAFE_HOURS[0] || h >= D.CAFE_HOURS[1]) return talk('Diego', D.CLOSED_LINES[0]);
  const mo = openModal(`<h2>Cafetería de Diego y Sabrina</h2><p class="lead">Semillas y café. Tienes <b class="shop-money">${A.player.paxetas}</b> paxetas.</p><div class="shop"></div>`, { cls: 'wide' });
  const box = mo.el.querySelector('.shop');
  const tools = Object.keys(D.ITEMS).filter((k) => D.ITEMS[k].kind === 'tool' && D.ITEMS[k].shop === 'cafe');   // mejoras (A05)
  for (const id of [...SEEDS.filter((k) => D.ITEMS[k].shop === 'cafe'), 'cafe', ...tools]) {
    const it = D.ITEMS[id], c = it.crop && D.CROPS[it.crop];
    const desc = c ? `${esc(c.note)} Crece en ${R.fmtHours(c.hours)}${c.regrow ? `, luego cada ${R.fmtHours(c.regrow)}` : ''}${c.paid ? ` · ${c.paid} ₧ al día de anuncios` : ''}. Se vende a ${D.ITEMS[c.product].sell} ₧${D.ITEMS[c.product].season ? seasonTag(D.ITEMS[c.product]) : ''}.` : '';
    box.append(shopRow(id, desc));
  }
}
function furniCanvas(id) { const f = D.FURNI_BY_ID[id]; return G.px(f.id === 'taboleiro' ? { ...f.art, color: D.deptColor(A.player.house) } : f.art).cv; }
function catalog() {
  const mo = openModal(`<h2>Catálogo de muebles</h2><p class="lead">La guía de Páxinas Galegas de 1998, reconvertida en catálogo. Tienes <b class="shop-money">${A.player.paxetas}</b> paxetas. Lo que compres va a tu mochila: luego, 🛋️ Decorar.</p><div class="shop"></div>`, { cls: 'wide' });
  const box = mo.el.querySelector('.shop');
  for (const f of D.FURNI.filter((q) => !q.shop)) box.append(shopRow('m_' + f.id, `${f.wall ? 'Se cuelga en la pared' : `Ocupa ${f.w || 1}×${f.h || 1} casillas`}`));
}
async function shipBox(dept) {
  const P = A.player;
  if (P.house !== dept) return talk('Caja de envíos', `Es la caja de ${D.deptName(dept)}. La tuya está junto a tu leira.`);
  await refreshShipments();
  const mo = openModal(`<h2>Caja de envíos</h2><p class="lead">Lo que metas aquí se lo lleva el tren de la noche (22:30) y se cobra al día siguiente a las 7:00. «Pago a 30 días», pero en uno.</p><div class="shop"></div><div class="pending"></div>`, { cls: 'wide' });
  const box = mo.el.querySelector('.shop'), pend = mo.el.querySelector('.pending');
  const render = () => {
    box.innerHTML = '';
    const items = Object.entries(A.player.inventory).filter(([k]) => D.ITEMS[k]?.sell);
    if (!items.length) box.innerHTML = '<p class="muted">No tienes nada para vender. Cosecha algo primero.</p>';
    for (const [id, n] of items) {
      const it = D.ITEMS[id], bonus = it.season && it.season === R.seasonOf(A.now()) ? D.SEASON_BONUS : 1;
      const row = document.createElement('div'); row.className = 'it';
      row.innerHTML = `<div></div><div><div class="nm">${esc(it.name)} × ${n}</div><div class="ds">${Math.round(it.sell * bonus)} ₧ cada uno ${seasonTag(it)}</div></div>
        <div class="buy"><input class="qty" type="number" min="1" max="${n}" value="${n}"><button class="btn small" type="button">Meter</button></div>`;
      row.firstChild.append(scaled(G.itemIcon(id)));
      const qty = row.querySelector('.qty'); qty.addEventListener('keydown', (e) => e.stopPropagation());
      row.querySelector('button').addEventListener('click', async () => {
        try {
          const r = await net.rpc('ship', { p_secret: A.player.secret, p_item: id, p_qty: Math.min(n, Number(qty.value) || 1) });
          setPlayer(r.player); Sound.play('item'); A.guide.event('ship');
          toast(`Dentro de la caja: ${r.shipment.qty} × ${it.name} (${r.shipment.value} ₧). Se cobra ${whenPaid(r.shipment.pay_at)}.`, 'good');
          await refreshShipments(); render();
        } catch (e) { toast(e.message, 'error'); }
      });
      box.append(row);
    }
    const total = A.shipments.reduce((s, x) => s + x.value, 0);
    pend.innerHTML = A.shipments.length ? `En la caja, esperando al tren: <b>${A.shipments.map((s) => `${s.qty} × ${esc(D.ITEMS[s.item]?.name || s.item)}`).join(', ')}</b> → ${total} paxetas, ${whenPaid(Math.min(...A.shipments.map((s) => s.pay_at)))}.` : 'La caja está vacía.';
  };
  render();
}
function whenPaid(t) {
  const d = R.dayKey(t), today = R.dayKey(A.now()), tomorrow = R.nextDayKey(today);
  return `${d === today ? 'hoy' : d === tomorrow ? 'mañana' : 'pasado mañana'} a las ${R.clockText(t)}`;
}
function houseInfo(dept) {
  const d = D.DEPT_BY_ID[dept], members = A.houseMembers(dept);
  const mo = openModal(`<h2 style="color:${d.color}">Casa de ${esc(d.name)}</h2>
    <p class="lead">${members.length ? `Viven aquí ${members.length} ${members.length === 1 ? 'persona' : 'personas'}. La leira es de todos: cualquiera de la casa puede plantar, regar y cosechar.` : `Todavía no hay nadie de ${esc(d.name)}. Mientras tanto vive aquí ${esc(d.npc.name)}, que cuida la casa y la leira.`}</p>
    <div class="members"></div>`);
  const box = mo.el.querySelector('.members');
  for (const m of members) {
    const row = document.createElement('div'); row.className = 'm';
    const on = m.id === A.player.id || A.online.has(m.id);
    row.innerHTML = `<span class="dot${on ? ' on' : ''}"></span>`;
    row.append(avatarCanvas(m.look, D.deptColor(m.dept)));
    row.append(Object.assign(document.createElement('span'), { textContent: m.nickname + (m.dept !== dept ? ` (${D.deptName(m.dept)})` : '') }));
    box.append(row);
  }
}
function bag() {
  const mo = openModal(`<h2>Mochila</h2><p class="lead">${A.player.paxetas} paxetas · energía ${A.player.energy}/${D.ENERGY_MAX}</p><div class="shop"></div>`, { cls: 'wide' });
  const box = mo.el.querySelector('.shop');
  const order = Object.keys(D.ITEMS);
  for (const [id, n] of Object.entries(A.player.inventory).sort((a, b) => order.indexOf(a[0]) - order.indexOf(b[0]))) {
    const it = D.ITEMS[id]; if (!it) continue;
    const row = document.createElement('div'); row.className = 'it';
    const info = it.kind === 'seed' ? D.CROPS[it.crop].note : it.desc || (it.sell ? `Se vende a ${it.sell} ₧ en la caja de envíos.` : '');
    row.innerHTML = `<div></div><div><div class="nm">${esc(it.name)} × ${n}</div><div class="ds">${esc(info)}</div></div><div class="buy"></div>`;
    row.firstChild.append(scaled(it.kind === 'furni' ? furniCanvas(it.furni) : G.itemIcon(id), it.kind === 'furni' ? 'big' : ''));
    const act = row.querySelector('.buy');
    if (id === 'cafe') { const b = Object.assign(document.createElement('button'), { className: 'btn small', type: 'button', textContent: 'Tomar' }); b.onclick = () => { drink().then(() => { mo.close(); }); }; act.append(b); }
    if (it.kind === 'furni' && !$('#btn-deco').hidden) { const b = Object.assign(document.createElement('button'), { className: 'btn small', type: 'button', textContent: 'Colocar' }); b.onclick = () => { mo.close(); openDeco(it.furni); }; act.append(b); }
    box.append(row);
  }
}

// ---------- decorar la casa ----------
let decoSel = null, decoPick = false;
function openDeco(pre = null) {
  if (A.world.map.base !== 'casa' || A.world.map.dept !== A.player.house) return toast('Solo puedes decorar tu casa.');
  $('#deco').hidden = false; $('#tileinfo').hidden = true;
  decoSel = pre; decoPick = false;
  A.world.setMode(pre ? { kind: 'place', furni: pre } : { kind: 'pick' });
  renderDeco();
}
function closeDeco() { $('#deco').hidden = true; decoSel = null; decoPick = false; A.world?.setMode(null); }
function renderDeco() {
  const box = $('#deco-items'); box.innerHTML = '';
  const have = Object.entries(A.player.inventory).filter(([k]) => D.ITEMS[k]?.kind === 'furni');
  if (!have.length) box.innerHTML = '<span class="muted">No tienes muebles en la mochila. Cómpralos en el catálogo (el atril junto a la puerta).</span>';
  for (const [id, n] of have) {
    const fid = D.ITEMS[id].furni, b = document.createElement('button');
    b.type = 'button'; b.className = 'fi' + (decoSel === fid ? ' on' : '');
    b.append(scaled(furniCanvas(fid)), Object.assign(document.createElement('span'), { textContent: `${D.FURNI_BY_ID[fid].name} × ${n}` }));
    b.onclick = () => { decoSel = fid; decoPick = false; A.world.setMode({ kind: 'place', furni: fid }); renderDeco(); };
    box.append(b);
  }
  $('#deco-pick').classList.toggle('on', decoPick || !decoSel);
  $('#deco-help').textContent = decoSel ? `Haz clic donde quieras poner: ${D.FURNI_BY_ID[decoSel].name} (verde = cabe). Clic derecho o Esc para soltarlo.` : 'Haz clic en un mueble que hayas puesto tú para guardarlo en la mochila, o elige uno de abajo para colocarlo.';
}
A.canPlace = (fid, tx, ty) => !R.furniProblem(D.FURNI_BY_ID[fid], tx, ty, A.player.desk_slot ?? 0, A.furniOf(A.player.house), D.FURNI_BY_ID, D.HOUSE, D.deskZone);
A.modeClick = async (tx, ty, row) => {
  if (A.busy) return;
  const P = A.player;
  if (decoSel) {
    const why = R.furniProblem(D.FURNI_BY_ID[decoSel], tx, ty, P.desk_slot ?? 0, A.furniOf(P.house), D.FURNI_BY_ID, D.HOUSE, D.deskZone);
    if (why) return toast(why, 'error');
    A.busy = true;
    try {
      const r = await net.rpc('place_furni', { p_secret: P.secret, p_house: P.house, p_item: 'm_' + decoSel, p_x: tx, p_y: ty });
      applyFurni(r.furni); setPlayer(r.player); Sound.play('item', 0.3);
      if (!A.player.inventory['m_' + decoSel]) { decoSel = null; A.world.setMode({ kind: 'pick' }); renderDeco(); }
    } catch (e) { toast(e.message, 'error'); }
    A.busy = false;
  } else if (row) {
    if (row.owner !== P.id) return toast(`Eso lo puso ${row.owner_nick}: solo lo puede quitar quien lo puso.`);
    A.busy = true;
    try { const r = await net.rpc('pick_furni', { p_secret: P.secret, p_id: row.id }); applyFurni({ ...row, deleted: true }); setPlayer(r.player); Sound.play('select', 0.3); }
    catch (e) { toast(e.message, 'error'); }
    A.busy = false;
  }
};
$('#btn-deco').addEventListener('click', () => ($('#deco').hidden ? openDeco() : closeDeco()));
$('#deco-done').addEventListener('click', closeDeco);
$('#deco-pick').addEventListener('click', () => { decoSel = null; decoPick = true; A.world.setMode({ kind: 'pick' }); renderDeco(); });
$('#btn-bag').addEventListener('click', bag);
$('#btn-map').addEventListener('click', () => A.world?.map && openMapa(A));
$('#btn-menu').addEventListener('click', () => {
  const mo = openModal(`<h2>Opciones</h2><div class="menu-list">
    <button class="btn alt" id="m-sound">${Sound.on ? '🔊 Sonido: sí' : '🔇 Sonido: no'}</button>
    <div class="row"><button class="btn alt" id="m-zin">Zoom +</button><button class="btn alt" id="m-zout">Zoom −</button></div>
    <button class="btn alt" id="m-guide">📋 Guía del primer día</button>
    <button class="btn alt" id="m-train">🚆 Llamar un tren (modo prueba)</button>
    <button class="btn alt" id="m-out">Cambiar de usuario</button>
    <p class="muted" style="font-family:system-ui;font-size:13px">WASD o flechas para moverte (Mayús corre) · Espacio o E para usar, hablar o entrar · 1 azada, 2 regadera, 3 caña, 4-9 semillas (más con , y .) y 0 café · T para el chat · I para la mochila · +/− zoom · también puedes hacer clic.</p></div>`);
  mo.el.querySelector('#m-sound').onclick = (e) => { e.target.textContent = Sound.toggle() ? '🔊 Sonido: sí' : '🔇 Sonido: no'; };
  mo.el.querySelector('#m-zin').onclick = () => A.world.setZoom(A.world.zoom + 1);
  mo.el.querySelector('#m-zout').onclick = () => A.world.setZoom(A.world.zoom - 1);
  mo.el.querySelector('#m-guide').onclick = () => { mo.close(); A.guide.show(); };
  mo.el.querySelector('#m-train').onclick = () => { mo.close(); if (A.world.map.id !== 'vila') return toast('Los trenes pasan por A Vila (la vía está junto a la estación).'); A.world.callTrain(); };
  mo.el.querySelector('#m-out').onclick = async () => { await net.rpc('logout', { p_secret: A.player.secret }).catch(() => {}); net.leave(); Ses.clear(); location.reload(); };
});

// ---------- diálogos ----------
let talkNext = null, talkQueue = [];
function talk(who, text, then = null) { talkQueue = []; showTalk(who, text, then); }
function talkSeq(lines, then = null) { talkQueue = lines.slice(1); showTalk(lines[0][0], lines[0][1], then); }
function showTalk(who, text, then) { $('#talk-who').textContent = who || ''; $('#talk-txt').textContent = text; $('#talk').hidden = false; talkNext = then; A.world && A.world.keys.clear(); }
function advanceTalk() {
  if (talkQueue.length) { const [w, t] = talkQueue.shift(); $('#talk-who').textContent = w || ''; $('#talk-txt').textContent = t; return; }
  $('#talk').hidden = true;
  const f = talkNext; talkNext = null; f?.();
}
$('#talk').addEventListener('click', advanceTalk);
addEventListener('keydown', (e) => {
  if (!$('#talk').hidden && [' ', 'e', 'enter', 'escape'].includes(e.key.toLowerCase())) { e.preventDefault(); e.stopPropagation(); if (!e.repeat) advanceTalk(); return; }
  const a = document.activeElement;
  if (!A.player || modalOpen() || (a && ['INPUT', 'TEXTAREA', 'SELECT'].includes(a.tagName))) return;
  const k = e.key.toLowerCase();
  if (k === 't') { e.preventDefault(); chat.open(); }
  else if (k === 'i') bag();
  else if (k === 'm' && A.world?.map) openMapa(A);
  else if (k === 'b' && !$('#btn-deco').hidden) $('#btn-deco').click();
}, true);

// ---------- marcador ----------
function renderHud() {
  const P = A.player; if (!P) return;
  $('#hud-nick').textContent = P.nickname;
  avatarCanvas(P.look, D.deptColor(P.dept), 'down', 0, $('#hud-avatar'));
  $('#hud-money').textContent = P.paxetas;
  $('#hud-energy').textContent = P.energy;
  $('#hud-energy-bar').style.width = `${Math.max(0, Math.min(100, (P.energy / D.ENERGY_MAX) * 100))}%`;
}
// (A13) Barra rápida con teclas fijas: 1 azada, 2 regadera, 3 caña y 0 café. Del 4 al 9 van las semillas
// (y el café del Bonsai), de 6 en 6: cada cosa se queda en su hueco mientras quede alguna, lo nuevo ocupa
// el primer hueco libre y, si no caben, se pasa de página con las flechas de la barra, la rueda del ratón
// encima de ella o las teclas «,» y «.». El orden se guarda por jugador en el navegador.
// A.slots[i] es lo que hay en la tecla (i + 1) % 10, o null si ese hueco está vacío.
const BAR_N = 6;
const barKey = () => `paxinal.barra.${net.kind}.${A.player.id}`;
function barOrder(inv) {
  if (A.barFor !== A.player.id) {
    A.barFor = A.player.id; A.barPage = null;
    try { A.bar = JSON.parse(localStorage.getItem(barKey()) || '[]'); } catch { A.bar = []; }
    if (!Array.isArray(A.bar)) A.bar = [];
  }
  const have = [...SEEDS, ...Object.keys(D.ITEMS).filter((k) => isDrink(k) && k !== 'cafe')].filter((k) => inv[k] > 0);
  const before = JSON.stringify(A.bar);
  A.bar = A.bar.map((id, j) => (have.includes(id) && A.bar.indexOf(id) === j ? id : null));
  for (const id of have) if (!A.bar.includes(id)) { const hole = A.bar.indexOf(null); if (hole < 0) A.bar.push(id); else A.bar[hole] = id; }
  while (A.bar.length && A.bar[A.bar.length - 1] === null) A.bar.pop();
  if (JSON.stringify(A.bar) !== before) localStorage.setItem(barKey(), JSON.stringify(A.bar));
  return Math.max(1, Math.ceil(A.bar.length / BAR_N));
}
A.barScroll = (dir) => {
  if (!A.player) return;
  const pages = barOrder(A.player.inventory || {}); if (pages < 2) return;
  A.barPage = ((A.barPage || 0) + dir + pages) % pages;
  renderHotbar(); Sound.play('select', 0.2);
};
// La barra va centrada, pero si así se mete debajo del chat (abajo a la derecha), se corre a la izquierda
// lo justo para que se vea entera, hasta el borde de la pantalla.
function placeHotbar() {
  const bar = $('#hotbar'), chatEl = $('#chat'), w = bar.offsetWidth, vw = innerWidth;
  let c = vw / 2;
  if (w && !chatEl.hidden) {
    const r = chatEl.getBoundingClientRect();
    if (r.width < vw - 1) c = Math.max(w / 2 + 8, Math.min(c, r.left - 8 - w / 2));
  }
  bar.style.left = `${Math.round(c)}px`;
}
addEventListener('resize', placeHotbar);
new ResizeObserver(placeHotbar).observe($('#chat'));
$('#hotbar').addEventListener('wheel',(e) => { e.preventDefault(); if (e.deltaY) A.barScroll(Math.sign(e.deltaY)); }, { passive: false });
function renderHotbar() {
  const P = A.player; if (!P) return;
  const inv = P.inventory || {};
  const pages = barOrder(inv);
  const fixed = ['azada', 'regadera', inv.cana ? 'cana' : null], cafe = inv.cafe > 0 ? 'cafe' : null;
  if (![...fixed, ...A.bar, cafe].includes(A.sel)) A.sel = 'azada';
  if (A.barPage == null) A.barPage = Math.floor(Math.max(0, A.bar.indexOf(A.sel)) / BAR_N);   // al entrar, la página de lo que llevas en la mano
  A.barPage = Math.max(0, Math.min(pages - 1, A.barPage));
  const mid = Array.from({ length: BAR_N }, (_, j) => A.bar[A.barPage * BAR_N + j] || null);
  A.slots = [...fixed, ...mid, cafe];
  // los huecos vacíos del final no se pintan (con varias páginas sí, para que las flechas no bailen)
  const last = pages > 1 ? BAR_N - 1 : mid.reduce((m, id, j) => (id ? j : m), -1);
  const bar = $('#hotbar'); bar.innerHTML = '';
  const arrow = (dir) => {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'bar-arrow';
    b.title = dir < 0 ? 'Semillas anteriores (tecla , o la rueda del ratón)' : 'Más semillas (tecla . o la rueda del ratón)';
    b.innerHTML = dir < 0 ? '‹' : `›<small>${A.barPage + 1}/${pages}</small>`;
    b.addEventListener('click', () => A.barScroll(dir));
    bar.append(b);
  };
  A.slots.forEach((id, i) => {
    const m = i - fixed.length, isMid = m >= 0 && m < BAR_N;
    if (m === 0 && pages > 1) arrow(-1);
    if (m === BAR_N && pages > 1) arrow(1);
    if (!id && (!isMid || m > last)) return;
    const b = document.createElement('button'); b.type = 'button';
    b.className = 'slot' + (id && id === A.sel ? ' on' : '') + (id ? '' : ' empty') + ((m === 0 || m === BAR_N) && pages < 2 ? ' gap' : '');
    b.insertAdjacentHTML('beforeend', `<span class="k">${(i + 1) % 10}</span>`);
    if (id) {
      const shown = D.toolUpgrade(inv, id) || id;   // la azada y la regadera se ven como su mejor mejora (A05)
      b.title = D.ITEMS[shown].name + (isDrink(id) ? ' (pulsa otra vez para tomarlo)' : '');
      b.prepend(scaled(G.itemIcon(shown)));
      if (D.ITEMS[id].kind !== 'tool') b.insertAdjacentHTML('beforeend', `<span class="n">${inv[id]}</span>`);
      b.addEventListener('click', () => A.selectSlot(i));
    } else { b.disabled = true; b.title = 'Hueco libre'; }
    bar.append(b);
  });
  placeHotbar();
}
function tickHud() {
  if (!A.player || !A.world?.map) return;
  A.guide.tick();
  const now = A.now(), season = R.seasonOf(now), out = A.world.map.outdoor;
  $('#hud-clock').textContent = R.clockText(now);
  $('#hud-season').textContent = `${R.SEASON_NAMES[season]} (${R.SEASON_Q[season]})`;
  $('#hud-weather').textContent = R.rainy(R.dayKey(now)) ? '🌧 Llueve (normal, es Galicia)' : R.darkness(R.hourOf(now)) > 0.3 ? '🌙 Noche' : '☀️ Despejado';
  const tr = $('#hud-train');
  if (A.world.map.id === 'vila') {
    const st = A.world.railState;
    tr.textContent = st && st !== 'idle' ? '🚆 Pasa el tren…' : A.world.nextTrainAt ? `🚆 Próximo tren: ${R.clockText(A.world.nextTrainAt)}` : '';
  } else tr.textContent = out ? '' : '';
  // qué hay delante
  const ti = $('#tileinfo');
  if (!$('#deco').hidden || A.blocked()) { ti.hidden = true; return; }
  const w = A.world, f = w.facing(), field = w.fieldAt(f.tx, f.ty), npc = w.npcNear(), door = w.doorTiles.get(f.tx + ',' + f.ty), spot = w.spotAt(f.tx, f.ty);
  let s = '';
  const beast = !npc && w.animalAt(f.tx, f.ty);
  if (npc) s = `Espacio: hablar con ${npc.name}`;
  else if (beast) { const st = R.animalState(beast.row, A.now()); s = `${beast.row.name} · ${st.ready ? `¡tiene ${D.ITEMS[D.ANIMALS[beast.row.kind].product].name.toLowerCase()}!` : st.fed || !D.ANIMALS[beast.row.kind].product ? 'Espacio: acariciar' : 'tiene hambre'}`; }
  else if (door) s = door.to ? `Espacio: entrar en ${door.label || 'la casa'}` : 'Espacio: llamar a la puerta';
  else if (spot) s = { board: 'Espacio: leer el tablón de anuncios', shop: 'Espacio: comprar', shop_bonsai: 'Espacio: pedir un café (si te atreves)', lonxa: 'Espacio: vender en la lonxa', feed: 'Espacio: echar pienso en el comedero', shop_naval: 'Espacio: mirar las cañas', gull: 'Espacio: mirar a la gaviota', departures: 'Espacio: mirar el panel de salidas', ship: 'Espacio: abrir la caja de envíos', catalog: 'Espacio: mirar el catálogo de muebles', house_info: 'Espacio: ver quién vive aquí', duck: 'Espacio: contarle tus penas al pato' }[spot.action] || 'Espacio: leer';
  else if (field) {
    const p = A.plots.get(`${field.dept}:${field.rx}:${field.ry}`);
    if (A.houseEmpty(field.dept)) s = `Leira de ${D.deptName(field.dept)} (la cuida ${D.DEPT_BY_ID[field.dept].npc.name})`;
    else s = p ? describePlot(p) : field.dept === A.player.house ? 'Hierba de tu leira: ¡ara con la azada!' : `Leira de ${D.deptName(field.dept)}`;
  }
  ti.hidden = !s; ti.textContent = s;
}
setInterval(tickHud, 250);

// ---------- arranque ----------
async function boot() {
  try { await net.init(); } catch (e) { console.error(e); }
  const ids = ['vila', 'agro', 'cafe', 'casa', 'bonsai', 'peirao', 'lonxa'];
  const maps = await Promise.all(ids.map((id) => fetch(`maps/${id}.json`).then((r) => r.json())));
  ids.forEach((id, i) => { A.maps[id] = maps[i]; });
  const ses = Ses.get();
  if (ses?.secret) {
    try { return enterGame(await net.rpc('login_player', { p_secret: ses.secret })); }
    catch (e) { console.warn('[paxinal] sesión:', e.message); }
  }
  showGate();
}
boot();
