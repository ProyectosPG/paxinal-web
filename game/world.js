// Páxinal Crossing · el mundo en Phaser 3: mapa, personaje, colisiones, puertas, granja, muebles,
// otros jugadores, trenes, día y noche, y lluvia. No sabe nada del servidor: le pide las cosas a la
// app (this.app) y la app le avisa de lo que cambia.
import * as G from '../art/granxa.js';
import * as M from '../art/mar.js';
import * as AN from '../art/animais.js';
import * as V from '../art/vila.js';
import { hash } from '../art/paximon/townart.js';
import { avatarSheet, DIRS, AW, AH } from '../art/paximon/avatar.js';
import { DEPT_BY_ID, deptColor, HOUSE, FIELD, GIFT_PLOTS, FURNI_BY_ID, ITEMS, deskZone, DIEGO, SABRINA, WAITER, POXADOR, COOP, ANIMALS, COMERCIALES, ROUTES, LUNCH, CHASE_LINES, VECINOS, CARS, ZEBRAS } from '../core/data.js';
import * as R from '../core/rules.js';

const T = 16;
const SOLID = new Set(['water', 'rail_t', 'rail_b', 'ballast', 'wall_in', 'void']);
const DV = { down: [0, 1], up: [0, -1], left: [-1, 0], right: [1, 0] };
const WALK = 62, RUN = 105;

export class World extends Phaser.Scene {
  constructor(app) { super('world'); this.app = app; this.keys = new Set(); this.texN = 0; this.texKeys = new Map(); this.maps = {}; }

  // ---------- arranque ----------
  create() {
    const cam = this.cameras.main;
    cam.setRoundPixels(true);
    this.input.mouse?.disableContextMenu();
    this.makeBaseTextures();
    this.mapObjs = [];
    this.remotes = new Map();
    this.bubbles = new Map();
    this.zoom = this.app.prefs.zoom || this.autoZoom();
    this.scale.on('resize', () => this.onResize());
    addEventListener('keydown', (e) => this.onKey(e, true));
    addEventListener('keyup', (e) => this.onKey(e, false));
    addEventListener('blur', () => this.keys.clear());
    this.input.on('pointerdown', (p) => this.onPointer(p));
    this.input.on('pointermove', (p) => { this.pointer = p; });
    this.ready = true;
    this.app.onWorldReady(this);
  }
  autoZoom() { const w = this.scale.width, h = this.scale.height; return Math.max(2, Math.min(5, Math.floor(Math.min(w / 300, h / 200)))); }
  setZoom(z) { this.zoom = Math.max(1, Math.min(6, z)); this.app.prefs.zoom = this.zoom; this.app.savePrefs(); this.onResize(); }
  onResize() {
    if (!this.map) return;
    const cam = this.cameras.main, z = this.zoom, vw = Math.max(1, Math.ceil(cam.width / z)), vh = Math.max(1, Math.ceil(cam.height / z));
    cam.setZoom(z);
    const bx = this.MW < vw ? (this.MW - vw) / 2 : 0, by = this.MH < vh ? (this.MH - vh) / 2 : 0;
    cam.setBounds(bx, by, Math.max(this.MW, vw), Math.max(this.MH, vh));
    if (this.dark) this.dark.resize(vw + 2, vh + 2);
    this.drops = [];
    for (let i = 0; i < 170; i++) this.drops.push({ x: Math.random() * (vw + 60), y: Math.random() * vh, v: 170 + Math.random() * 70 });
  }
  // texturas que no dependen del mapa
  makeBaseTextures() {
    const g = document.createElement('canvas'); g.width = g.height = 64;
    const c = g.getContext('2d'), gr = c.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = gr; c.fillRect(0, 0, 64, 64);
    this.textures.addCanvas('glow', g);
    const s = document.createElement('canvas'); s.width = 12; s.height = 4;
    const sc = s.getContext('2d'); sc.fillStyle = 'rgba(27,48,30,0.27)'; sc.fillRect(1, 0, 10, 2); sc.fillRect(2, 2, 8, 1);
    this.textures.addCanvas('shadow', s);
    this.stamp = this.make.image({ key: 'glow', add: false }).setOrigin(0.5);
  }
  // un lienzo como textura (si ya existe con esa receta, se reutiliza)
  tex(recipe, paint) {
    let k = this.texKeys.get(recipe);
    if (k) return k;
    k = 't' + (++this.texN);
    const cv = paint();
    this.textures.addCanvas(k, cv.cv || cv);
    this.texKeys.set(recipe, k);
    this.texMeta = this.texMeta || new Map();
    this.texMeta.set(k, cv.cv ? cv : { cv });
    return k;
  }
  meta(k) { return this.texMeta.get(k); }
  sheet(look, shirt, extras = []) {
    const recipe = 'av:' + JSON.stringify([look, shirt, extras]);
    let k = this.texKeys.get(recipe);
    if (k) return k;
    k = 'av' + (++this.texN);
    const tx = this.textures.addCanvas(k, avatarSheet(look, shirt, extras));
    for (let r = 0; r < 4; r++) for (let f = 0; f < 3; f++) tx.add(r * 3 + f, 0, f * AW, r * AH, AW, AH);
    this.texKeys.set(recipe, k);
    return k;
  }

  // ---------- teclado y ratón ----------
  typing() { const a = document.activeElement; return a && (a.tagName === 'INPUT' || a.tagName === 'TEXTAREA' || a.tagName === 'SELECT' || a.isContentEditable); }
  onKey(e, down) {
    const k = e.key.toLowerCase();
    if (!down) { this.keys.delete(k); return; }
    if (this.typing() || this.app.blocked()) return;
    if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(k)) e.preventDefault();
    if (e.repeat && (k === ' ' || k === 'e')) return;
    this.keys.add(k);
    if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'w', 'a', 's', 'd'].includes(k)) this.path = null;
    if (k === ' ' || k === 'e' || k === 'enter') this.act();
    else if (k === 'escape') this.app.cancelMode();
    else if (/^[0-9]$/.test(k)) this.app.selectSlot(k === '0' ? 9 : Number(k) - 1);
    else if (k === ',' || k === '.') this.app.barScroll(k === ',' ? -1 : 1);   // (A13) más semillas en la barra
    else if (k === '+' || k === '=') this.setZoom(this.zoom + 1);
    else if (k === '-') this.setZoom(this.zoom - 1);
  }
  onPointer(p) {
    if (!this.map || this.app.blocked()) return;
    if (p.rightButtonDown()) { this.app.cancelMode(); return; }
    const tx = Math.floor(p.worldX / T), ty = Math.floor(p.worldY / T);
    if (this.mode) { this.app.modeClick(tx, ty, this.furniAt(tx, ty)); return; }
    // ¿un jugador? su ficha
    for (const [id, r] of this.remotes) if (Math.abs(p.worldX - r.x) < 9 && p.worldY < r.y + 2 && p.worldY > r.y - AH) { this.app.clickPlayer(id); return; }
    const me = this.me, ptx = Math.floor(me.x / T), pty = Math.floor((me.y - 2) / T);
    const d = Math.max(Math.abs(tx - ptx), Math.abs(ty - pty));
    if (d <= 1 && (tx !== ptx || ty !== pty)) { this.face(tx - ptx, ty - pty); this.act({ tx, ty }); return; }
    // lejos: ir andando y actuar al llegar
    const goal = this.walkable(tx, ty) ? [tx, ty] : this.nearWalkable(tx, ty);
    if (!goal) return;
    const path = this.findPath(ptx, pty, goal[0], goal[1]);
    if (path) { this.path = path; this.pathAct = (tx !== goal[0] || ty !== goal[1]) || this.spotAt(tx, ty) || this.fieldAt(tx, ty) ? { tx, ty } : null; }
  }
  face(dx, dy) { this.me.dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'down' : 'up'; }

  // ---------- mapas ----------
  async loadMap(id, at = null) {
    const base = id.startsWith('casa:') ? 'casa' : id;
    const dept = id.startsWith('casa:') ? id.slice(5) : null;
    const J = this.app.maps[base];
    this.clearMap();
    const ground = J.rows.map((r) => [...r].map((ch) => J.legend[ch]));
    const map = this.map = { id, base, dept, J, W: J.w, H: J.h, ground, outdoor: !!J.outdoor };
    this.MW = map.W * T; this.MH = map.H * T;
    this.solid = Array.from({ length: map.H }, (_, y) => Uint8Array.from(ground[y], (t) => (SOLID.has(t) ? 1 : 0)));
    this.season = R.seasonOf(this.app.now());
    this.S = G.SEASONS[map.outdoor ? this.season : 'primavera'];
    this.paintGround();
    this.lights = []; this.trees = []; this.barriers = []; this.shipBoxes = []; this.litImgs = []; this.boardLabel = null; this.trainSpr = null; this.zoneG = null; this.panel = null; this.gulls = []; this.troughs = {}; this.beasts = new Map();
    this.doorTiles = new Map(); this.furni = new Map(); this.plotsDrawn = new Map(); this.fieldList = J.fields || [];
    for (const o of J.objects) this.placeObject(o);
    for (const d of J.doors) for (let i = 0; i < (d.w || 1); i++) this.doorTiles.set((d.x + i) + ',' + d.y, d);
    this.buildRoutes();
    // personajes del mapa (vecinos, Diego y Sabrina, y los comerciales cuando pasen por aquí)
    this.npcs = [];
    this.addComerciales();
    this.addTraffic();
    for (const n of J.npcs || []) this.addNpc(n);
    if (base === 'casa') this.decorateHouse(dept);
    // el jugador
    const sp = at || J.spawn;
    const P = this.app.player;
    const key = this.sheet(P.look, deptColor(P.dept));
    this.me = { id: P.id, x: sp.x * T + 8, y: sp.y * T + 12, dir: sp.dir || 'down', f: 0, at: 0, moving: false };
    if (at && at.px) { this.me.x = at.px; this.me.y = at.py; }
    this.me.spr = this.track(this.add.sprite(this.me.x, this.me.y + 1, key, 0).setOrigin(0.5, 1));
    this.me.shadow = this.track(this.add.image(this.me.x, this.me.y, 'shadow').setOrigin(0.5, 0.5));
    this.me.tag = this.track(this.add.image(0, 0, this.tagTex(P.nickname, deptColor(P.dept))).setOrigin(0.5, 1).setDepth(9.5e5));
    this.hl = this.track(this.add.graphics().setDepth(8e5));
    this.ghost = null;
    // luz, lluvia y tren
    this.dark = this.track(this.add.renderTexture(0, 0, 8, 8).setOrigin(0).setDepth(9e5));
    this.warm = this.track(this.add.rectangle(0, 0, 8, 8, 0xff8040, 0).setOrigin(0).setDepth(9e5 - 2));
    this.rainG = this.track(this.add.graphics().setDepth(9e5 - 1));
    this.trainSpr = null; this.localTrain = null; this.railState = 'idle';
    const cam = this.cameras.main;
    cam.startFollow(this.me.spr, true, 1, 1, 0, 12);
    this.onResize();
    cam.centerOn(this.me.x, this.me.y - 12);
    this.path = null; this.mode = null;
    this.refreshFarm(true);
    this.refreshFurni();
    this.refreshAnimals();
    this.app.onMapLoaded(map);
  }
  track(o) { this.mapObjs.push(o); return o; }
  clearMap() {
    for (const o of this.mapObjs) o.destroy();
    this.mapObjs = [];
    for (const r of this.remotes.values()) this.dropRemoteSprites(r);
    for (const b of this.bubbles.values()) b.el.remove();
    this.bubbles.clear();
    this.dark = null;
  }
  paintGround() {
    const m = this.map, key = 'g:' + m.base + ':' + (m.outdoor ? this.season : '-');
    const hasWater = m.ground.some((r) => r.includes('water'));
    const MAP = { W: m.W, H: m.H, ground: m.ground };
    const f0 = this.tex(key + ':0', () => G.paintGround(MAP, this.S, 0));
    this.groundImg = this.track(this.add.image(0, 0, f0).setOrigin(0).setDepth(-1e5));
    this.groundFrames = [f0];
    if (hasWater) {
      // los otros tres fotogramas del oleaje, poco a poco para no parar el juego al entrar
      let k = 1;
      const next = () => {
        if (!this.map || this.map.base !== m.base || k > 3) return;
        this.groundFrames.push(this.tex(key + ':' + k, () => G.paintGround(MAP, this.S, k)));
        k++; setTimeout(next, 60);
      };
      setTimeout(next, 400);
    }
  }
  block(x0, y0, fw, fh, v = 1) { for (let y = y0; y < y0 + fh; y++) for (let x = x0; x < x0 + fw; x++) if (this.solid[y] && x >= 0 && x < this.map.W) this.solid[y][x] = v; }
  // pone un sprite con su huella; lo que sobresale va por encima
  sprite(k, tx, ty, fw = 1, fh = 1, o = {}) {
    const m = this.meta(k), top = m.top || 0;
    const x = tx * T + (o.dx || 0), y = ty * T - top + (o.dy || 0);
    const img = this.track(this.add.image(x, y, k).setOrigin(0).setDepth((ty + fh) * T + (o.dBase || 0)));
    if (!o.walk) this.block(tx, ty, fw, fh);
    if (m.lights?.length) this.addWindows(k, img, m);
    const L = { omnea: [9, 0.85, 0x6ed7ff], tv: [26, 0.8, 0x9fd8ff] }[o.pt] || [40, 0.95, 0xffc46e];
    for (const [a, b] of m.points || []) this.addLight(x + a, y + b, L[0], L[1], L[2]);
    return img;
  }
  addWindows(k, img, m) {
    const lk = this.tex('lit:' + k, () => {
      const c = document.createElement('canvas'); c.width = m.cv.width; c.height = m.cv.height;
      const x = c.getContext('2d'); x.fillStyle = '#FFD678';
      for (const [a, b, w, h] of m.lights) x.fillRect(a, b, w, h);
      return c;
    });
    const lit = this.track(this.add.image(img.x, img.y, lk).setOrigin(0).setDepth(img.depth + 0.01).setAlpha(0));
    (this.litImgs ||= []).push(lit);
    for (const [a, b, w, h] of m.lights) if (w * h >= 80) this.addLight(img.x + a + w / 2, img.y + b + h / 2, 12 + Math.min(8, w / 3), 0.32, 0xffc86e);
  }
  addLight(x, y, r, i, color) {
    const gl = this.track(this.add.image(x, y, 'glow').setDepth(9e5 + 1).setBlendMode(Phaser.BlendModes.ADD).setTint(color).setAlpha(0).setScale((r * 0.8 * 2) / 64));
    this.lights.push({ x, y, r, i, gl });
  }
  placeObject(o) {
    const S = this.S, sk = this.season;
    switch (o.t) {
      case 'tree': {
        const seed = hash(o.x, o.y, 11) % 1000 + 1;
        const k = this.tex(`tree:${o.k}:${seed}:${sk}`, () => G.tree(o.k, seed, S));
        this.sprite(k, o.x, o.y, 1, 1, { dx: this.meta(k).ox });
        return;
      }
      case 'px': return this.sprite(this.tex('px:' + JSON.stringify(o.o), () => G.px(o.o)), o.x, o.y, o.fw || 1, o.fh || 1, { walk: o.walk });
      case 'car': return this.sprite(this.tex('car:' + o.color, () => G.car(o.color)), o.x, o.y, 3, 1);
      case 'lamp': return this.sprite(this.tex('lamp', () => G.lamp()), o.x, o.y, 1, 1);
      case 'horreo': return this.sprite(this.tex('horreo:' + o.len, () => G.horreo(o.len)), o.x, o.y, o.len, 1);
      case 'station': return this.sprite(this.tex('station:' + o.label, () => G.station(o.label)), o.x, o.y, 12, 5);
      case 'cafe': return this.sprite(this.tex('cafe', () => G.cafe()), o.x, o.y, 7, 5);
      case 'paxinas': return this.sprite(this.tex('paxinas', () => G.paxinas()), o.x, o.y, 8, 5);
      case 'house': return this.sprite(this.tex('house:' + o.dept, () => G.house(deptColor(o.dept))), o.x, o.y, 5, 4);
      case 'building': {
        const k = this.tex('bld:' + JSON.stringify(o), () => {
          const r = G.px({ kind: 'building', type: o.type, w: o.w, h: o.h, color: o.color, door: o.door, seed: o.seed });
          const W = o.w * T, H = o.h * T, top = r.top;
          if (o.type === 'mansion') r.lights = [[13, H - 25 + top, 10, 9], [W - 23, H - 25 + top, 10, 9]];
          else { const roofH = o.type === 'casita' ? 27 : 30; r.lights = o.type === 'casita' ? [[11, roofH + 9 + top, 10, 9]] : [[11, roofH + 9 + top, 10, 9], [W - 21, roofH + 9 + top, 10, 9]]; }
          return r;
        });
        return this.sprite(k, o.x, o.y, o.w, o.h);
      }
      case 'edificio': return this.sprite(this.tex('edi:' + JSON.stringify(o), () => V.edificio(o)), o.x, o.y, o.w, o.h);
      case 'kiosko': return this.sprite(this.tex('kiosko', () => V.kiosko()), o.x, o.y, 2, 2);
      case 'almacen': return this.sprite(this.tex('almacen:' + o.w, () => V.almacen(o.w, o.h)), o.x, o.y, o.w, o.h);
      case 'fountain': return this.sprite(this.tex('fountain', () => G.px({ kind: 'fountain' })), o.x, o.y, 2, 2);
      case 'cruceiro': return this.sprite(this.tex('cruceiro', () => G.px({ kind: 'cruceiro' })), o.x, o.y, 1, 1);
      case 'sign': {
        const k = this.tex('sign:' + o.lines.join('|') + o.color, () => G.deptSign(o.lines, o.color));
        return this.sprite(k, o.x, o.y, 1, 1, { walk: true, dx: Math.round(T - this.meta(k).w / 2) });
      }
      case 'departures': {
        this.panel = this.sprite(this.tex('departures', () => G.departures()), o.x, o.y, 4, 1);
        this.panelKey = '';
        return this.panel;
      }
      case 'tv': return this.sprite(this.tex('tv', () => G.barTV()), o.x, o.y, 2, 1, { walk: true, pt: 'tv' });
      case 'bonsai_bar': return this.sprite(this.tex('bonsai_bar:' + o.w, () => G.bonsaiBar(o.w)), o.x, o.y, o.w, 1);
      case 'bonsai_plant': return this.sprite(this.tex('bonsai_plant', () => G.bonsaiPlant()), o.x, o.y);
      case 'lonxa': return this.sprite(this.tex('lonxa', () => M.lonxa(o.w, o.h)), o.x, o.y, o.w, o.h);
      case 'fish_crates': return this.sprite(this.tex('fish_crates', () => M.fishCrates()), o.x, o.y);
      case 'fish_stall': return this.sprite(this.tex('fish_stall', () => M.fishStall()), o.x, o.y, 2, 1);
      case 'rod_rack': return this.sprite(this.tex('rod_rack', () => M.rodRack()), o.x, o.y, 2, 1);
      case 'auction_board': return this.sprite(this.tex('auction_board', () => M.auctionBoard()), o.x, o.y, 3, 1, { walk: true });
      case 'batea': return this.sprite(this.tex('batea', () => M.batea()), o.x, o.y, 3, 1, { walk: true });
      case 'trough': {
        const img = this.sprite(this.tex('trough:0', () => AN.trough(false)), o.x, o.y);
        this.troughs[o.dept] = img;
        return img;
      }
      case 'gull': {
        const img = this.sprite(this.tex('gull:0', () => M.gull(0)), o.x, o.y, 1, 1, { walk: true });
        (this.gulls ||= []).push({ img, x0: img.x, y0: img.y, t: Math.random() * 10 });
        return img;
      }
      case 'board': {
        const img = this.sprite(this.tex('board', () => G.px({ kind: 'board' })), o.x, o.y, 3, 1);
        this.boardLabel = this.track(this.add.image(img.x + 24, img.y - 1, this.tagTex('TABLÓN', '#FFC107')).setOrigin(0.5, 1).setDepth(img.depth + 1));
        return img;
      }
      case 'fence': return this.sprite(this.tex('fence', () => G.px({ kind: 'fence' })), o.x, o.y);
      case 'fence_v': return this.sprite(this.tex('fence_v', () => G.fenceV()), o.x, o.y);
      case 'shipbox': {
        const img = this.sprite(this.tex('ship:0', () => G.shipBox(false)), o.x, o.y);
        (this.shipBoxes ||= []).push({ img, x: o.x, y: o.y });
        return img;
      }
      case 'duck': {
        const img = this.sprite(this.tex('duck', () => G.duck()), o.x, o.y, 1, 1, { walk: true });
        this.tweens.add({ targets: img, y: img.y - 1, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
        return img;
      }
      case 'barrier': {
        (this.barriers ||= []).push({ x: o.x * T + (o.dir > 0 ? 12 : 4), y: o.y * T + 14, dir: o.dir, img: null });
        this.block(o.x, o.y, 1, 1);
        return;
      }
      case 'banner': return;   // se pone al decorar la casa (lleva el color del departamento)
    }
  }
  // ---------- NPC ----------
  addNpc(n) {
    let look, shirt, extras = [], name;
    if (['diego', 'sabrina', 'camarero', 'poxador', 'coop'].includes(n.who)) { const D = { diego: DIEGO, sabrina: SABRINA, camarero: WAITER, poxador: POXADOR, coop: COOP }[n.who]; look = D.look; shirt = D.shirt; extras = D.extras; name = D.name; }
    else if (n.dept) {
      if (!this.app.houseEmpty(n.dept)) return;   // la casa ya tiene jugadores: el vecino está dentro
      const d = DEPT_BY_ID[n.dept]; look = d.npc.look; shirt = d.color; extras = d.npc.extras; name = d.npc.name;
    } else return;
    const spr = this.track(this.add.sprite(n.x * T + 8, n.y * T + 13, this.sheet(look, shirt, extras), DIRS.indexOf(n.dir || 'down') * 3).setOrigin(0.5, 1).setDepth(n.y * T + 12));
    const sh = this.track(this.add.image(spr.x, spr.y - 1, 'shadow').setOrigin(0.5).setDepth(spr.depth - 0.5));
    const tag = this.track(this.add.image(spr.x, spr.y - AH - 1, this.tagTex(name, shirt === '#FFFFFF' ? '#FFC94A' : shirt)).setOrigin(0.5, 1).setDepth(9.5e5).setAlpha(0));
    this.block(n.x, n.y, 1, 1);
    this.npcs.push({ ...n, name, spr, sh, tag, baseDir: n.dir || 'down' });
  }
  // ---------- comerciales: Brais y Vanesa ----------
  // Cada ruta es una lista de casillas unidas por el camino más corto, con paradas para vender. La posición
  // sale de la hora (igual para todos los jugadores); el muñeco camina hacia ella y se para si le hablas.
  buildRoutes() {
    this.routes = {};
    if (ROUTES[this.map.id]) this.buildRoute(this.map.id, ROUTES[this.map.id]);
    // (A11) y la ruta de cada vecino que pasea por este mapa
    for (const v of VECINOS) if (v.map === this.map.id) this.buildRoute('v:' + v.id, v);
  }
  buildRoute(name, R0) {
    const wp = R0.pts, pts = [[wp[0][0], wp[0][1]]], stops = new Set();
    let [cx, cy] = wp[0];
    for (let i = 1; i <= wp.length; i++) {
      const [gx, gy, stop] = wp[i % wp.length];
      const path = this.findPath(cx, cy, gx, gy);
      if (!path) console.warn('[paxinal] ruta sin camino', name, [cx, cy], '→', [gx, gy]);
      pts.push(...(path || [[gx, gy]]));
      cx = gx; cy = gy;
      if (stop) stops.add(pts.length - 1);
    }
    const A = [0], Dp = [];
    for (let i = 0; i < pts.length; i++) {
      Dp[i] = A[i] + (stops.has(i) ? R0.pause : 0);
      if (i + 1 < pts.length) A.push(Dp[i] + 1 / R0.speed);
    }
    this.routes[name] = { pts, A, D: Dp, total: Math.max(1, A[A.length - 1]), speed: R0.speed };
  }
  routePos(name, sec) {
    const r = this.routes[name]; if (!r) return null;
    const s = ((sec % r.total) + r.total) % r.total;
    let lo = 0, hi = r.A.length - 1;
    while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (r.A[mid] <= s) lo = mid; else hi = mid - 1; }
    const i = Math.min(lo, r.pts.length - 2), [x0, y0] = r.pts[i], [x1, y1] = r.pts[i + 1];
    const k = s < r.D[i] ? 0 : Math.min(1, (s - r.D[i]) * r.speed);
    const dir = x1 > x0 ? 'right' : x1 < x0 ? 'left' : y1 > y0 ? 'down' : 'up';
    return { x: (x0 + (x1 - x0) * k) * T + 8, y: (y0 + (y1 - y0) * k) * T + 12, dir, walking: k > 0 && k < 1 };
  }
  addComerciales() {
    this.coms = [];
    for (const c of COMERCIALES) {
      const spr = this.track(this.add.sprite(0, 0, this.sheet(c.look, c.shirt, c.extras), 0).setOrigin(0.5, 1).setVisible(false));
      const sh = this.track(this.add.image(0, 0, 'shadow').setOrigin(0.5).setVisible(false));
      const tag = this.track(this.add.image(0, 0, this.tagTex(c.name, '#FFC107')).setOrigin(0.5, 1).setDepth(9.5e5).setAlpha(0));
      const n = { ...c, who: c.id, com: true, spr, sh, tag, x: 0, y: 0, dir: 'down', at: 0, f: 0, shown: false, baseDir: 'down' };
      this.coms.push(n); this.npcs.push(n);
    }
    // (A11) los vecinos que pasean por este mapa: andan igual que los comerciales (y se paran si les hablas)
    for (const v of VECINOS) {
      if (v.map !== this.map.id) continue;
      const spr = this.track(this.add.sprite(0, 0, this.sheet(v.look, v.shirt, v.extras), 0).setOrigin(0.5, 1).setVisible(false));
      const sh = this.track(this.add.image(0, 0, 'shadow').setOrigin(0.5).setVisible(false));
      const tag = this.track(this.add.image(0, 0, this.tagTex(v.name, v.shirt)).setOrigin(0.5, 1).setDepth(9.5e5).setAlpha(0));
      const dog = v.dog ? { spr: this.track(this.add.image(0, 0, this.tex('an:can:0', () => AN.animal('can', 0))).setOrigin(0.5, 1).setVisible(false)), x: 0, y: 0, f: 0, at: 0 } : null;
      const n = { ...v, who: 'vecino', vecino: true, com: true, spr, sh, tag, dog, x: 0, y: 0, dir: 'down', at: 0, f: 0, shown: false, baseDir: 'down' };
      this.coms.push(n); this.npcs.push(n);
    }
  }
  // si les das largas, te persiguen un rato por donde vayas (solo en tu pantalla)
  startChase(id) { this.chase = { id, until: performance.now() + 15000, next: performance.now() + 600 }; }
  updateComerciales(now, dt) {
    const me = this.me, t = performance.now();
    if (this.chase && t > this.chase.until) this.chase = null;
    for (const c of this.coms || []) {
      const info = c.vecino ? R.vecinoAt(c, now) : R.comercialAt(c.id, now);
      const chasing = this.chase?.id === c.id;
      let target = null;
      if (chasing) {
        const [dx, dy] = DV[me.dir];
        target = { x: me.x - dx * 18, y: me.y - dy * 18, dir: null };
        if (t > this.chase.next) { this.chase.next = t + 3500; this.say(c.id, CHASE_LINES[Math.floor(Math.random() * CHASE_LINES.length)], 3000); }
      } else if (info && info.map === this.map.id) {
        if (info.stand) { const [lx, ly] = LUNCH[c.id]; target = { x: lx * T + 8, y: ly * T + 12, dir: 'down' }; }
        else target = this.routePos(info.route, (now - info.t0) / 1000);
      }
      if (!target) { if (c.shown) { c.shown = false; c.spr.setVisible(false); c.sh.setVisible(false); c.tag.setAlpha(0); c.dog?.spr.setVisible(false); } continue; }
      if (!c.shown) { c.shown = true; c.x = target.x; c.y = target.y; c.spr.setVisible(true); c.sh.setVisible(true); if (c.dog) { c.dog.x = c.x - 14; c.dog.y = c.y; c.dog.spr.setVisible(true); } }
      const near = !chasing && Math.hypot(me.x - c.x, me.y - c.y) < 30;
      let moving = false;
      if (near) c.dir = Math.abs(me.y - c.y) > Math.abs(me.x - c.x) ? (me.y < c.y ? 'up' : 'down') : me.x > c.x ? 'right' : 'left';
      else {
        const ddx = target.x - c.x, ddy = target.y - c.y, d = Math.hypot(ddx, ddy);
        if (d > 160 && !chasing) { c.x = target.x; c.y = target.y; }
        else if (d > 0.5) {
          const step = Math.min(d, (chasing ? 75 : 22 + d * 1.5) * dt);
          c.x += (ddx / d) * step; c.y += (ddy / d) * step; moving = true;
          c.dir = Math.abs(ddx) > Math.abs(ddy) ? (ddx > 0 ? 'right' : 'left') : ddy > 0 ? 'down' : 'up';
        } else if (target.dir && !target.walking) c.dir = target.dir;
      }
      if (moving) { c.at += dt; c.f = [1, 0, 2, 0][Math.floor(c.at / 0.16) % 4]; } else { c.f = 0; c.at = 0; }
      c.spr.setPosition(Math.round(c.x), Math.round(c.y) + 1).setFrame(DIRS.indexOf(c.dir) * 3 + c.f).setDepth(c.y);
      c.sh.setPosition(Math.round(c.x), Math.round(c.y)).setDepth(c.y - 0.5);
      c.tag.setPosition(Math.round(c.x), Math.round(c.y) - AH - 1).setAlpha(Math.hypot(me.x - c.x, me.y - c.y) < 44 ? 1 : 0);
      if (c.dog) this.followDog(c, dt);
    }
  }
  // ---------- (A11) coches por la avenida y gaviotas volando sobre la playa (solo en A Vila) ----------
  // La posición de los coches sale de la hora (R.carAt), igual para todos; si alguien está delante en su
  // carril, el coche espera (eso solo en tu pantalla). Las gaviotas son de adorno: cada pantalla las suyas.
  addTraffic() {
    this.cars = []; this.flyers = [];
    if (this.map.id !== 'vila') return;
    for (const c of CARS) this.cars.push({ c, hold: 0, spr: this.track(this.add.image(0, 0, this.tex('car:' + c.color, () => G.car(c.color))).setOrigin(0.5, 1).setVisible(false)) });
    for (let i = 0; i < 3; i++) this.flyers.push({ i, f: -1, spr: this.track(this.add.image(-50, -50, this.tex('gullfly:1', () => M.gullFly(1))).setOrigin(0.5).setDepth(8.6e5)) });
  }
  updateTraffic(now, dt) {
    const me = this.me;
    for (const car of this.cars || []) {
      let p = R.carAt(car.c, now - car.hold * 1000, this.MW, ZEBRAS);
      const ahead = (q) => p && q && Math.abs(q.y - p.y) < 14 && (q.x - p.x) * p.dir > 0 && Math.abs(q.x - p.x) < 54;
      if (p?.moving && (ahead(me) || [...this.remotes.values()].some((r) => r.spr && ahead(r)) || (this.npcs || []).some((n) => n.shown && ahead(n)))) {
        car.hold += dt; p = R.carAt(car.c, now - car.hold * 1000, this.MW, ZEBRAS);
      }
      if (!p) { car.spr.setVisible(false); continue; }
      car.spr.setVisible(true).setPosition(Math.round(p.x), p.y).setFlipX(p.dir > 0).setDepth(p.y);
    }
    const t = this.clock || 0, W = this.MW + 64;
    for (const g of this.flyers || []) {
      const dir = g.i % 2 ? -1 : 1, sp = 26 + g.i * 7;
      let x = ((t * sp + g.i * W / 3) % W) - 32;
      if (dir < 0) x = this.MW - x;
      const y = 50 * T + Math.sin(t * 1.1 + g.i * 2) * 10 - 9 * g.i;   // sobre la arena y la orilla
      const f = Math.floor(t * 4 + g.i) % 2;
      if (f !== g.f) { g.f = f; g.spr.setTexture(this.tex('gullfly:' + f, () => M.gullFly(f))); }
      g.spr.setPosition(Math.round(x), Math.round(y)).setFlipX(dir < 0);
    }
  }
  // (A11) el can de Lola va detrás de ella, a un paso
  followDog(c, dt) {
    const g = c.dog, [dx, dy] = DV[c.dir], tx = c.x - dx * 14, ty = c.y - dy * 10 + (dx ? 2 : 0);
    const ex = tx - g.x, ey = ty - g.y, d = Math.hypot(ex, ey);
    const moving = d > 1.5;
    if (d > 120) { g.x = tx; g.y = ty; }
    else if (moving) { const step = Math.min(d, (26 + d * 2) * dt); g.x += (ex / d) * step; g.y += (ey / d) * step; if (Math.abs(ex) > 0.5) g.spr.setFlipX(ex < 0); }
    g.at = moving ? g.at + dt : 0;
    const f = moving ? Math.floor(g.at / 0.15) % 2 : 0;
    if (f !== g.f) { g.f = f; g.spr.setTexture(this.tex('an:can:' + f, () => AN.animal('can', f))); }
    g.spr.setPosition(Math.round(g.x), Math.round(g.y) + 1).setDepth(g.y);
  }

  // ---------- animales ----------
  // En O Agro: los del corral pasean por él y el can por delante de su casa. Dentro de una casa: el gato,
  // dormido encima de la mesa de quien lo compró. Las posiciones son de cada pantalla (no se comparten).
  refreshAnimals() {
    if (!this.map || !this.beasts) return;
    const now = this.app.now(), base = this.map.base, seen = new Set();
    const add = (row, area, fixed = null) => {
      seen.add(row.id);
      let b = this.beasts.get(row.id);
      if (!b) {
        const x = fixed ? fixed.x : (area.x + Math.random() * area.w) * T, y = fixed ? fixed.y : (area.y + 0.4 + Math.random() * (area.h - 0.4)) * T;
        const spr = this.track(this.add.image(x, y, this.tex('an:' + row.kind + ':0', () => AN.animal(row.kind, 0))).setOrigin(0.5, 1));
        b = { row, spr, area, fixed, x, y, tx: x, ty: y, next: 0, f: 0, at: 0, icon: null };
        this.beasts.set(row.id, b);
      }
      b.row = row;
      const st = R.animalState(row, now), ik = st.ready ? ANIMALS[row.kind].product : '';
      if (ik !== (b.iconKind || '')) {
        b.icon?.destroy(); b.icon = null; b.iconKind = ik;
        if (ik) b.icon = this.track(this.add.image(b.x, b.y, this.tex('icon:' + ik, () => G.itemIcon(ik))).setOrigin(0.5, 1).setDepth(9.4e5).setScale(0.75));
      }
    };
    if (base === 'agro') {
      for (const c of this.map.J.corrals || []) {
        const rows = this.app.animalsOf(c.dept);
        for (const r of rows) {
          if (ANIMALS[r.kind]?.corral) add(r, { x: c.x, y: c.y + 1, w: c.w, h: c.h - 1 });
          else if (r.kind === 'can') add(r, c.dog);
        }
        const fed = rows.some((r) => ANIMALS[r.kind]?.corral) && rows.filter((r) => ANIMALS[r.kind]?.corral).every((r) => R.animalState(r, now).fed);
        this.troughs[c.dept]?.setTexture(this.tex('trough:' + (fed ? 1 : 0), () => AN.trough(fed)));
      }
    } else if (base === 'casa') {
      const members = this.app.houseMembers(this.map.dept);
      for (const r of this.app.animalsOf(this.map.dept)) {
        if (r.kind !== 'gato') continue;
        const owner = members.find((m) => m.id === r.bought_by) || members[0];
        if (!owner) continue;
        const z = deskZone(owner.desk_slot ?? 0);
        add(r, null, { x: z.x * T + 14, y: z.y * T + 4 });
      }
    }
    for (const [id, b] of this.beasts) if (!seen.has(id)) { b.spr.destroy(); b.icon?.destroy(); this.beasts.delete(id); }
  }
  animalAt(tx, ty) {
    let best = null, bd = 13;
    for (const b of this.beasts?.values() || []) {
      const d = Math.hypot(b.x - (tx * T + 8), b.y - 4 - (ty * T + 8));
      if (d < bd) { bd = d; best = b; }
    }
    return best;
  }
  updateAnimals(now, dt) {
    if (!this.beasts?.size) return;
    const t = performance.now();
    for (const b of this.beasts.values()) {
      if (b.fixed) {   // el gato duerme: respira y sueña
        b.spr.setPosition(b.fixed.x, b.fixed.y).setDepth(b.fixed.y + 20).setTexture(this.tex('an:gato:' + (Math.floor(t / 900) % 2), () => AN.animal('gato', Math.floor(t / 900) % 2)));
        continue;
      }
      if (t > b.next) { const a = b.area; b.tx = (a.x + 0.3 + Math.random() * (a.w - 0.6)) * T; b.ty = (a.y + 0.6 + Math.random() * (a.h - 0.6)) * T; b.next = t + 2000 + Math.random() * 4000; }
      const dx = b.tx - b.x, dy = b.ty - b.y, d = Math.hypot(dx, dy);
      const moving = d > 1;
      if (moving) { const sp = b.row.kind === 'can' ? 26 : b.row.kind === 'vaca' ? 9 : 13; b.x += (dx / d) * Math.min(d, sp * dt); b.y += (dy / d) * Math.min(d, sp * dt); b.at += dt; if (Math.abs(dx) > 0.5) b.spr.setFlipX(dx < 0); }
      const f = moving ? Math.floor(b.at / 0.22) % 2 : 0;
      if (f !== b.f) { b.f = f; b.spr.setTexture(this.tex('an:' + b.row.kind + ':' + f, () => AN.animal(b.row.kind, f))); }
      b.spr.setPosition(Math.round(b.x), Math.round(b.y)).setDepth(b.y);
      b.icon?.setPosition(Math.round(b.x), Math.round(b.y) - b.spr.height - 1);
      // el can les ladra a los comerciales que pasan cerca
      if (b.row.kind === 'can' && t > (b.bark || 0)) for (const c of this.coms || []) if (c.shown && Math.hypot(c.x - b.x, c.y - b.y) < 70) { b.bark = t + 6000; this.say('beast:' + b.row.id, '¡Guau! ¡Guau!', 2200); }
    }
  }

  // ---------- casas por dentro ----------
  decorateHouse(dept) {
    const d = DEPT_BY_ID[dept];
    if (!d) return;
    const k = this.tex('banner:' + dept, () => G.px({ kind: 'wall_deco', variant: 'banner', w: 4, color: d.color, short: d.short }));
    this.sprite(k, 9, 1, 4, 1, { walk: true });
    const members = this.app.houseMembers(dept);
    for (const pl of members) {
      const z = deskZone(pl.desk_slot ?? 0);
      const dk = this.tex('desk:' + d.desk, () => G.px({ kind: 'desk', variant: d.desk }));
      const img = this.sprite(dk, z.x, z.y, 2, 1);
      this.track(this.add.image(img.x + 16, z.y * T + 15, this.tagTex(pl.nickname, d.color)).setOrigin(0.5, 0).setDepth(img.depth + 1));
    }
    if (!members.length) {
      // casa vacía: el vecino inventado vive aquí y dice cosas
      this.addNpc({ id: 'npc_in_' + dept, dept, x: 12, y: 11, dir: 'down' });
    }
    // zonas: alfombra de cada mesa y de la zona común (solo se ven al decorar)
    this.zoneG = this.track(this.add.graphics().setDepth(-5e4));
  }
  showZones(on) {
    const g = this.zoneG; if (!g) return;
    g.clear();
    if (!on) return;
    const me = this.app.player;
    if (this.map.dept === me.house) {
      const c = HOUSE.common; g.fillStyle(0x4caf50, 0.16).fillRect(c.x * T, c.y * T, c.w * T, c.h * T);
      g.lineStyle(1, 0x4caf50, 0.6).strokeRect(c.x * T + 0.5, c.y * T + 0.5, c.w * T - 1, c.h * T - 1);
      const z = deskZone(me.desk_slot ?? 0);
      g.fillStyle(0xffc107, 0.18).fillRect(z.x * T, z.y * T, z.w * T, z.h * T);
      g.lineStyle(1, 0xffc107, 0.7).strokeRect(z.x * T + 0.5, z.y * T + 0.5, z.w * T - 1, z.h * T - 1);
      g.fillStyle(0x2e9be0, 0.14).fillRect(0, HOUSE.wallY * T, this.MW, T);
    }
  }

  // ---------- granja ----------
  fieldAt(tx, ty) {
    for (const f of this.fieldList) if (tx >= f.x && ty >= f.y && tx < f.x + f.w && ty < f.y + f.h) return { ...f, rx: tx - f.x, ry: ty - f.y };
    return null;
  }
  refreshFarm(force = false) {
    if (!this.map || this.map.base !== 'agro') return;
    const now = this.app.now(), plots = this.app.plots;
    const seen = new Set(), withPlots = new Set();
    for (const k of plots.keys()) withPlots.add(k.slice(0, k.indexOf(':')));
    const giftAt = new Map(GIFT_PLOTS.map((g) => [`${g.x}:${g.y}`, g.crop]));
    for (const f of this.fieldList) {
      // las leiras de las casas sin jugadores las cuida su vecino: las mismas filas de grelos y patacas que
      // le deja al primero que llega (GIFT_PLOTS). Si la casa ya tiene parcelas de verdad, no se pintan.
      const deco = this.app.houseEmpty(f.dept) && !withPlots.has(f.dept);
      for (let ry = 0; ry < f.h; ry++) for (let rx = 0; rx < f.w; rx++) {
        const key = `${f.dept}:${rx}:${ry}`;
        let p = plots.get(key);
        if (deco && giftAt.has(`${rx}:${ry}`)) p = { deco: true, crop: giftAt.get(`${rx}:${ry}`) };
        if (!p) continue;
        seen.add(key);
        const view = p.deco ? { tilled: true, wet: true, crop: p.crop, stage: 3 } : R.plotView(p, now);
        const tx = f.x + rx, ty = f.y + ry;
        const has = (dx, dy) => (deco ? giftAt.has(`${rx + dx}:${ry + dy}`) : plots.has(`${f.dept}:${rx + dx}:${ry + dy}`));
        const n = { u: has(0, -1), d: has(0, 1), l: has(-1, 0), r: has(1, 0) };
        const sk = `soil:${view.wet ? 1 : 0}${+n.u}${+n.d}${+n.l}${+n.r}:${(tx * 7 + ty * 3) % 4}`;
        const ck = view.crop ? `crop:${view.crop}:${view.stage}:${view.crop === 'palabra' ? view.pos : ''}` : '';
        let dr = this.plotsDrawn.get(key);
        if (dr && dr.sk === sk && dr.ck === ck && !force) continue;
        if (!dr) { dr = { soil: this.track(this.add.image(tx * T, ty * T, 'glow').setOrigin(0).setDepth(-5e4)) }; this.plotsDrawn.set(key, dr); }
        dr.sk = sk;
        dr.soil.setTexture(this.tex(sk, () => G.soilTile(view.wet, n, (tx * 7 + ty * 3) % 4)));
        if (ck !== dr.ck) {
          dr.ck = ck;
          dr.crop?.destroy(); dr.crop = null;
          if (view.crop) {
            const om = view.crop === 'omnea' && view.stage === 3;
            const k = om ? this.tex('omnea', () => G.omnea()) : this.tex(ck, () => G.crop(view.crop, view.stage, view.pos));
            dr.crop = this.track(this.add.image(tx * T + (om ? -4 : 0), ty * T - this.meta(k).top, k).setOrigin(0).setDepth((ty + 1) * T - 3));
          }
        }
      }
    }
    for (const [key, dr] of this.plotsDrawn) if (!seen.has(key)) { dr.soil.destroy(); dr.crop?.destroy(); this.plotsDrawn.delete(key); }
  }
  setShipFull(full) {
    for (const b of this.shipBoxes || []) b.img.setTexture(this.tex('ship:' + (full ? 1 : 0), () => G.shipBox(full)));
  }
  // ---------- muebles ----------
  refreshFurni() {
    if (!this.map || this.map.base !== 'casa') return;
    const rows = this.app.furniOf(this.map.dept);
    const seen = new Set();
    for (const r of rows) {
      seen.add(r.id);
      if (this.furni.has(r.id)) continue;
      const f = FURNI_BY_ID[r.kind]; if (!f) continue;
      const art = f.id === 'taboleiro' ? { ...f.art, color: deptColor(this.map.dept) } : f.art;
      const k = this.tex('furni:' + JSON.stringify(art), () => G.px(art));
      const img = this.sprite(k, r.x, r.y, f.w, f.h, { walk: !!f.wall });
      this.furni.set(r.id, { row: r, img, f });
    }
    for (const [id, it] of this.furni) if (!seen.has(id)) {
      it.img.destroy();
      if (!it.f.wall) this.block(it.row.x, it.row.y, it.f.w, it.f.h, 0);
      this.furni.delete(id);
    }
  }
  furniAt(tx, ty) {
    for (const it of this.furni.values()) {
      const r = it.row, f = it.f;
      if (tx >= r.x && tx < r.x + f.w && ty >= r.y && ty < r.y + f.h) return r;
    }
    return null;
  }
  // modo decorar: un mueble «fantasma» sigue al ratón
  setMode(mode) {
    this.mode = mode;
    this.ghost?.destroy(); this.ghost = null;
    if (mode?.kind === 'place') {
      const f = FURNI_BY_ID[mode.furni];
      const art = f.id === 'taboleiro' ? { ...f.art, color: deptColor(this.map.dept) } : f.art;
      const k = this.tex('furni:' + JSON.stringify(art), () => G.px(art));
      this.ghost = this.track(this.add.image(0, 0, k).setOrigin(0).setAlpha(0.7).setDepth(8.5e5));
      this.ghost.f = f;
    }
    this.showZones(!!mode);
  }

  // ---------- jugadores remotos ----------
  upsertRemote(id, info) {
    let r = this.remotes.get(id);
    if (!r) { r = { id, x: info.x, y: info.y, dir: 'down', f: 0, at: 0 }; this.remotes.set(id, r); }
    Object.assign(r, { nickname: info.nickname, dept: info.dept, look: info.look, map: info.map });
    if (Number.isFinite(info.x)) { r.tx = info.x; r.ty = info.y; if (!Number.isFinite(r.x) || Math.hypot(r.x - info.x, r.y - info.y) > 96) { r.x = info.x; r.y = info.y; } }
    if (info.dir) r.dir = info.dir;
    r.moving = !!info.moving;
    const here = this.map && info.map === this.map.id && Number.isFinite(r.x);
    if (!here) { this.dropRemoteSprites(r); return; }
    const key = this.sheet(r.look, deptColor(r.dept));
    if (!r.spr) {
      r.spr = this.add.sprite(r.x, r.y + 1, key, 0).setOrigin(0.5, 1);
      r.shadow = this.add.image(r.x, r.y, 'shadow').setOrigin(0.5);
      r.tag = this.add.image(r.x, r.y - AH - 1, this.tagTex(r.nickname, deptColor(r.dept))).setOrigin(0.5, 1).setDepth(9.5e5);
      r.key = key;
    } else if (r.key !== key) { r.spr.setTexture(key, 0); r.key = key; }
  }
  dropRemoteSprites(r) { r.spr?.destroy(); r.shadow?.destroy(); r.tag?.destroy(); r.spr = r.shadow = r.tag = null; }
  removeRemote(id) { const r = this.remotes.get(id); if (r) { this.dropRemoteSprites(r); this.remotes.delete(id); } const b = this.bubbles.get(id); if (b) { b.el.remove(); this.bubbles.delete(id); } }
  tagTex(name, color) { return this.tex('tag:' + name + ':' + color, () => G.nameTag(name, color)); }

  // ---------- bocadillos (en HTML, para que la letra se lea nítida) ----------
  say(id, text, ms = 5000) { this.bubble(id, { text }, ms); }
  emote(id, canvas, text) { this.bubble(id, { img: canvas, text }, 3200); }
  bubble(id, b, ms) {
    let old = this.bubbles.get(id);
    if (old) old.el.remove();
    const el = document.createElement('div');
    el.className = 'bubble' + (b.img ? ' emote' : '');
    if (b.img) { const c = b.img; c.className = 'emo'; el.appendChild(c); }
    const t = document.createElement('span'); t.textContent = String(b.text || '').slice(0, 140); el.appendChild(t);
    document.getElementById('bubbles').appendChild(el);
    this.bubbles.set(id, { el, until: performance.now() + ms });
  }
  charPos(id) {
    if (id === this.me?.id) return this.me;
    if (this.remotes.get(id)?.spr) return this.remotes.get(id);
    if (String(id).startsWith('beast:')) { const b = this.beasts?.get(Number(id.slice(6)) || id.slice(6)); return b ? { x: b.x, y: b.y - 4 } : null; }
    const n = this.npcs?.find((q) => q.id === id);
    return n && n.spr.visible !== false ? { x: n.spr.x, y: n.spr.y - 1 } : null;
  }
  worldToScreen(x, y) {
    const cam = this.cameras.main, wv = cam.worldView, canvas = this.game.canvas.getBoundingClientRect();
    return [canvas.left + (x - wv.x) * cam.zoom, canvas.top + (y - wv.y) * cam.zoom];
  }

  // ---------- colisiones y caminos ----------
  solidAt(px, py) {
    const tx = Math.floor(px / T), ty = Math.floor(py / T);
    if (tx < 0 || ty < 0 || tx >= this.map.W || ty >= this.map.H) return true;
    if (this.solid[ty][tx]) return true;
    return this.railState !== 'idle' && this.map.ground[ty][tx].startsWith('xing');
  }
  free(x, y) { return !this.solidAt(x - 5, y - 4) && !this.solidAt(x + 4, y - 4) && !this.solidAt(x - 5, y) && !this.solidAt(x + 4, y); }
  walkable(tx, ty) { return tx >= 0 && ty >= 0 && tx < this.map.W && ty < this.map.H && !this.solid[ty][tx]; }
  nearWalkable(tx, ty) {
    const me = this.me; let best = null, bd = 1e9;
    for (const [dx, dy] of [[0, 1], [0, -1], [-1, 0], [1, 0]]) {
      const x = tx + dx, y = ty + dy;
      if (!this.walkable(x, y)) continue;
      const d = Math.hypot(x * T + 8 - me.x, y * T + 8 - me.y);
      if (d < bd) { bd = d; best = [x, y]; }
    }
    return best;
  }
  findPath(sx, sy, gx, gy) {
    const W = this.map.W, H = this.map.H, prev = new Int32Array(W * H).fill(-1), q = [sy * W + sx];
    prev[sy * W + sx] = sy * W + sx;
    for (let i = 0; i < q.length && q.length < 9000; i++) {
      const c = q[i], cx = c % W, cy = (c / W) | 0;
      if (cx === gx && cy === gy) {
        const out = []; let k = c;
        while (k !== sy * W + sx) { out.push([k % W, (k / W) | 0]); k = prev[k]; }
        return out.reverse();
      }
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = cx + dx, ny = cy + dy, n = ny * W + nx;
        if (nx < 0 || ny < 0 || nx >= W || ny >= H || prev[n] >= 0 || this.solid[ny][nx]) continue;
        prev[n] = c; q.push(n);
      }
    }
    return null;
  }

  // ---------- qué hay delante ----------
  facing() {
    const me = this.me, [dx, dy] = DV[me.dir];
    return { tx: Math.floor(me.x / T) + dx, ty: Math.floor((me.y - 2) / T) + dy };
  }
  spotAt(tx, ty) {
    for (const s of this.map.J.spots || []) {
      if (s.r) { if (Math.hypot(tx + 0.5 - (s.x + 0.5), ty + 0.5 - (s.y + 0.5)) <= s.r) return s; continue; }
      if (tx >= s.x && tx < s.x + (s.w || 1) && ty === s.y) return s;
    }
    return null;
  }
  npcNear() {
    const me = this.me, [dx, dy] = DV[me.dir];
    let best = null, bd = 26;
    for (const n of this.npcs || []) {
      if (n.com && !n.spr.visible) continue;
      const d = Math.hypot(n.spr.x - (me.x + dx * 10), n.spr.y - 4 - (me.y - 4 + dy * 10));
      if (d < bd) { bd = d; best = n; }
    }
    return best;
  }
  // Espacio / E / clic: hablar, leer, entrar o usar la herramienta en la casilla de delante
  act(target = null) {
    if (!this.map || this.app.blocked()) return;
    if (this.mode) { const f = target || this.facing(); this.app.modeClick(f.tx, f.ty, this.furniAt(f.tx, f.ty)); return; }
    const f = target || this.facing();
    const npc = !target && this.npcNear();
    if (npc) return this.app.talk(npc);
    const door = this.doorTiles.get(f.tx + ',' + f.ty);
    if (door) return this.app.door(door);
    const spot = this.spotAt(f.tx, f.ty) || (!target && this.spotAt(Math.floor(this.me.x / T), Math.floor((this.me.y - 2) / T)));
    if (spot) return this.app.spot(spot);
    if (target) { const n = (this.npcs || []).find((q) => Math.floor(q.spr.x / T) === f.tx && Math.floor((q.spr.y - 2) / T) === f.ty); if (n) return this.app.talk(n); }
    const field = this.fieldAt(f.tx, f.ty);
    if (field) return this.app.useOnField(field, f);
    if (this.map.J.fishing && this.map.ground[f.ty]?.[f.tx] === 'water') return this.app.useOnWater(f);
    const an = this.animalAt(f.tx, f.ty) || (!target && this.animalAt(Math.floor(this.me.x / T), Math.floor((this.me.y - 2) / T)));
    if (an) return this.app.animalAct(an.row);
    const fr = this.furniAt(f.tx, f.ty);
    if (fr) return this.app.furniInfo(fr);
    if (!target) this.app.actNothing();
  }
  setBoardLabel(text) { if (this.boardLabel) this.boardLabel.setTexture(this.tagTex(text, '#FFC107')); }
  removeNpc(id) {
    const i = (this.npcs || []).findIndex((n) => n.id === id);
    if (i < 0) return;
    const n = this.npcs[i];
    n.spr.destroy(); n.sh.destroy(); n.tag.destroy();
    this.block(n.x, n.y, 1, 1, 0);
    this.npcs.splice(i, 1);
  }

  // ---------- tren ----------
  trainState(now) {
    if (this.map.id !== 'vila') return null;
    const tw = 3 * 96 + 12, span = ((this.MW + tw) / R.TRAIN_SPEED) * 1000, WARN = 3000, CLEAR = 2500;
    let t = this.localTrain && now - this.localTrain.at < span + WARN + CLEAR ? this.localTrain : null;
    if (!t) { const n = R.trainNear(now - WARN, span + WARN + CLEAR); t = n.cur; this.nextTrainAt = n.next?.at; }
    if (!t) return { state: 'idle' };
    const e = now - t.at;
    if (e < WARN) return { state: 'warning', t, k: e / WARN };
    if (e < WARN + span) { const d = (e - WARN) / 1000 * R.TRAIN_SPEED; return { state: 'passing', t, x: t.dir > 0 ? -tw + d : this.MW - d }; }
    return { state: 'clearing', t, k: (e - WARN - span) / CLEAR };
  }
  callTrain() { this.localTrain = { at: this.app.now(), dir: Math.random() < 0.5 ? 1 : -1, night: false, local: true }; }

  // ---------- guía del primer día: flecha hacia el sitio de la tarea que toca (ui/guia.js) ----------
  // pt: {x, y} en píxeles del mapa, o null. Si el sitio se ve, la flecha bota encima; si no, va al borde
  // de la pantalla, en la línea entre el muñeco y el sitio, sin meterse debajo del marcador ni del panel.
  setGuide(pt) { this.guideTarget = pt; }
  updateGuide() {
    const pt = this.guideTarget;
    let a = this.guideArrow;
    if (!pt || this.mode) { if (a?.active) a.setVisible(false); return; }
    if (!a?.active) a = this.guideArrow = this.track(this.add.image(0, 0, this.tex('guide_arrow', () => G.guideArrow())).setDepth(9.7e5));
    const cam = this.cameras.main, z = cam.zoom, wv = cam.worldView, bob = Math.sin(this.clock * 6) * 2;
    const x0 = wv.x + 34 / z, x1 = wv.right - 34 / z, y0 = wv.y + 100 / z, y1 = wv.bottom - 96 / z;
    if (pt.x >= wv.x + 10 / z && pt.x <= wv.right - 10 / z && pt.y >= wv.y && pt.y <= wv.bottom - 84 / z) {
      // se ve: encima del sitio apuntando hacia abajo (o debajo, apuntando arriba, si está pegado al borde)
      const up = pt.y - 22 >= wv.y;
      a.setVisible(true).setRotation(up ? Math.PI / 2 : -Math.PI / 2).setPosition(Math.round(pt.x), Math.round(up ? pt.y - 16 + bob : pt.y + 14 - bob));
      return;
    }
    const cx = this.me.x, cy = this.me.y - 10, dx = pt.x - cx, dy = pt.y - cy, ang = Math.atan2(dy, dx);
    let k = 1;
    if (dx) k = Math.min(k, (dx > 0 ? x1 - cx : x0 - cx) / dx);
    if (dy) k = Math.min(k, (dy > 0 ? y1 - cy : y0 - cy) / dy);
    k = Math.max(0, k);
    let x = Math.max(x0, Math.min(x1, cx + dx * k)), y = Math.max(y0, Math.min(y1, cy + dy * k));
    // el panel de la guía (arriba a la izquierda) no la tapa
    const r = document.getElementById('guide')?.getBoundingClientRect(), cr = this.game.canvas.getBoundingClientRect();
    if (r && r.width) {
      const sx = cr.left + (x - wv.x) * z, sy = cr.top + (y - wv.y) * z;
      if (sx < r.right + 14 && sy < r.bottom + 14) x = wv.x + (r.right + 22 - cr.left) / z;
    }
    a.setVisible(true).setRotation(ang).setPosition(Math.round(x + Math.cos(ang) * bob), Math.round(y + Math.sin(ang) * bob));
  }

  // ---------- bucle ----------
  update(time, delta) {
    if (!this.map || !this.me) return;
    const dt = Math.min(0.05, delta / 1000), now = this.app.now(), hour = R.hourOf(now);
    this.clock = (this.clock || 0) + dt;
    this.moveMe(dt);
    this.moveRemotes(dt);
    this.updateNpcs();
    this.updateComerciales(now, dt);
    this.updateTraffic(now, dt);
    this.updateAnimals(now, dt);
    for (const g of this.gulls) {
      g.t += dt;
      const hop = Math.max(0, Math.sin(g.t * 2.2)) > 0.97 ? 2 : 0, flap = Math.floor(g.t * 6) % 9 === 0 && Math.sin(g.t / 3) > 0.6;
      g.img.setY(g.y0 - hop).setTexture(this.tex('gull:' + (flap ? 1 : 0), () => M.gull(flap ? 1 : 0)));
    }
    this.updateTrain(now);
    this.updateFrames(dt);
    this.updateHighlight();
    this.updateGuide();
    this.updateLight(hour, now);
    this.updateBubbles();
    if ((this.farmT = (this.farmT || 0) + dt) > 20) { this.farmT = 0; this.refreshFarm(); this.refreshAnimals(); }
    if ((this.panelT = (this.panelT || 0) + dt) > 2) { this.panelT = 0; this.updatePanel(now); }
  }
  moveMe(dt) {
    const me = this.me, K = this.keys;
    let dx = 0, dy = 0;
    const blocked = this.app.blocked() || this.typing();
    if (!blocked) {
      if (K.has('arrowleft') || K.has('a')) dx -= 1;
      if (K.has('arrowright') || K.has('d')) dx += 1;
      if (K.has('arrowup') || K.has('w')) dy -= 1;
      if (K.has('arrowdown') || K.has('s')) dy += 1;
    }
    if (!dx && !dy && this.path?.length && !blocked) {
      const [px, py] = this.path[0], gx = px * T + 8, gy = py * T + 12;
      const ddx = gx - me.x, ddy = gy - me.y, l = Math.hypot(ddx, ddy);
      if (l < 2.5) { me.x = gx; me.y = gy; this.path.shift(); if (!this.path.length) { this.path = null; if (this.pathAct) { const a = this.pathAct; this.pathAct = null; this.face(a.tx - px, a.ty - py); this.act(a); } } }
      else { dx = ddx / l; dy = ddy / l; }
    }
    const wasMoving = me.moving;
    if (dx || dy) {
      const l = Math.hypot(dx, dy), sp = K.has('shift') ? RUN : WALK;
      dx /= l; dy /= l;
      const stuck = !this.free(me.x, me.y);
      const nx = me.x + dx * sp * dt;
      if (stuck || this.free(nx, me.y)) me.x = nx;
      const ny = me.y + dy * sp * dt;
      if (stuck || this.free(me.x, ny)) me.y = ny;
      else if (dy < 0) {   // empujando hacia una puerta: se entra
        const door = this.doorTiles.get(Math.floor(me.x / T) + ',' + Math.floor((ny - 5) / T));
        if (door && !this.doorCool) { this.doorCool = true; setTimeout(() => (this.doorCool = false), 700); this.app.door(door); }
      }
      me.x = Math.max(6, Math.min(this.MW - 6, me.x)); me.y = Math.max(8, Math.min(this.MH - 1, me.y));
      me.dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'down' : 'up';
      me.at += dt * (sp / WALK);
      me.f = [1, 0, 2, 0][Math.floor(me.at / 0.14) % 4];
      me.moving = true;
      // salidas del mapa (bordes y felpudos)
      const tx = Math.floor(me.x / T), ty = Math.floor((me.y - 2) / T);
      for (const e of this.map.J.exits || []) if (tx >= e.x && tx < e.x + e.w && ty >= e.y && ty < e.y + e.h) { this.app.exit(e); return; }
    } else { me.f = 0; me.at = 0; me.moving = false; }
    // al usar una herramienta el muñeco se inclina un poco hacia la casilla (A07)
    let lx = 0, ly = 0;
    if (this.lean) {
      const k = (this.time.now - this.lean.t0) / this.lean.dur;
      if (k >= 1 || me.moving) this.lean = null;
      else { const a = Math.sin(k * Math.PI) * 2; lx = this.lean.dx * a; ly = this.lean.dy * a; }
    }
    me.spr.setPosition(Math.round(me.x + lx), Math.round(me.y + ly) + 1).setFrame(DIRS.indexOf(me.dir) * 3 + me.f).setDepth(me.y);
    me.shadow.setPosition(Math.round(me.x), Math.round(me.y)).setDepth(me.y - 0.5);
    me.tag.setPosition(Math.round(me.x), Math.round(me.y) - AH - 1);
    this.app.onMove(me, wasMoving);
  }
  moveRemotes(dt) {
    for (const r of this.remotes.values()) {
      if (!r.spr) continue;
      const ddx = (r.tx ?? r.x) - r.x, ddy = (r.ty ?? r.y) - r.y, l = Math.hypot(ddx, ddy);
      const going = l > 0.5;
      if (going) { const st = Math.min(l, 110 * dt); r.x += (ddx / l) * st; r.y += (ddy / l) * st; r.at += dt; r.f = [1, 0, 2, 0][Math.floor(r.at / 0.14) % 4]; }
      else if (!r.moving) { r.f = 0; r.at = 0; }
      r.spr.setPosition(Math.round(r.x), Math.round(r.y) + 1).setFrame(DIRS.indexOf(r.dir || 'down') * 3 + (r.f || 0)).setDepth(r.y);
      r.shadow.setPosition(Math.round(r.x), Math.round(r.y)).setDepth(r.y - 0.5);
      r.tag.setPosition(Math.round(r.x), Math.round(r.y) - AH - 1);
    }
  }
  updateNpcs() {
    const me = this.me;
    for (const n of this.npcs || []) {
      if (n.com) continue;
      const d = Math.hypot(me.x - n.spr.x, me.y - n.spr.y);
      const near = d < 44;
      n.tag.setAlpha(near ? 1 : 0);
      const dir = near ? (Math.abs(me.y - n.spr.y) > Math.abs(me.x - n.spr.x) ? (me.y < n.spr.y ? 'up' : 'down') : me.x > n.spr.x ? 'right' : 'left') : n.baseDir;
      n.spr.setFrame(DIRS.indexOf(dir) * 3);
    }
  }
  updateTrain(now) {
    const st = this.trainState(now);
    if (!st) return;
    const prev = this.railState;
    this.railState = st.state;
    if (prev === 'idle' && st.state !== 'idle') this.app.onTrain(st.t);
    // barreras
    const up = st.state === 'idle' ? 1 : st.state === 'warning' ? Math.max(0, 1 - st.k * 1.4) : st.state === 'clearing' ? Math.min(1, st.k * 1.2) : 0;
    const blink = st.state !== 'idle' ? (Math.floor(this.clock * 2.5) % 2 ? 1 : 2) : 0;
    for (const b of this.barriers || []) {
      const k = Math.round(up * 8), key = this.tex(`barrier:${b.dir}:${k}:${blink}`, () => G.barrier(b.dir, k, blink));
      if (!b.img) b.img = this.track(this.add.image(b.x, b.y, key).setDepth(b.y));
      b.img.setTexture(key).setOrigin(36 / 72, 38 / 44);
      b.blink = blink;
    }
    // el tren
    if (st.state === 'passing') {
      const lit = R.darkness(R.hourOf(now)) > 0.25, key = this.tex('train:' + st.t.dir + ':' + lit, () => G.train(st.t.dir, lit));
      const y = (this.map.J.track.row) * T + 6 - 42;
      if (!this.trainSpr) this.trainSpr = this.track(this.add.image(0, y, key).setOrigin(0).setDepth((this.map.J.track.row + 1) * T));
      this.trainSpr.setTexture(key).setPosition(Math.round(st.x), y);
    } else if (this.trainSpr) { this.trainSpr.destroy(); this.mapObjs = this.mapObjs.filter((o) => o !== this.trainSpr); this.trainSpr = null; }
  }
  updatePanel(now) {
    if (!this.panel) return;
    const next = R.departuresFrom(now, 2).map((t) => ({
      dest: t.dest, time: t.albacete ? '?' : t.cancelled ? 'X' : R.clockText(t.sched),
      color: t.albacete || t.cancelled ? '#FF7043' : t.delay ? '#FFE082' : '#FFB300',
    }));
    const key = JSON.stringify(next);
    if (key === this.panelKey) return;
    this.panelKey = key;
    this.panel.setTexture(this.tex('departures:' + key, () => G.departures(next)));
  }
  updateFrames(dt) {
    if (this.groundFrames.length > 1) {
      const k = Math.floor(this.clock * 2.2) % this.groundFrames.length;
      if (this.groundImg.texture.key !== this.groundFrames[k]) this.groundImg.setTexture(this.groundFrames[k]);
    }
  }
  updateHighlight() {
    const g = this.hl; g.clear();
    if (this.mode && this.pointer) {
      const tx = Math.floor(this.pointer.worldX / T), ty = Math.floor(this.pointer.worldY / T);
      if (this.ghost) {
        const f = this.ghost.f, k = this.ghost.texture.key, m = this.meta(k);
        this.ghost.setPosition(tx * T, ty * T - (m.top || 0));
        const ok = this.app.canPlace(this.mode.furni, tx, ty);
        g.fillStyle(ok ? 0x4caf50 : 0xe53935, 0.35).fillRect(tx * T, ty * T, f.w * T, f.h * T);
        this.ghost.setTint(ok ? 0xffffff : 0xff9a9a);
      } else {
        const r = this.furniAt(tx, ty);
        g.lineStyle(1, r ? 0xffc107 : 0xffffff, r ? 0.95 : 0.4).strokeRect(tx * T + 0.5, ty * T + 0.5, T - 1, T - 1);
      }
      return;
    }
    const f = this.facing();
    const field = this.fieldAt(f.tx, f.ty);
    // herramienta mejorada (A05): se marcan todas las casillas que va a tocar
    const area = field && this.app.toolArea?.(field);
    if (area) for (const t of area) {
      g.fillStyle(0x7fc8ff, 0.16).fillRect(t.tx * T, t.ty * T, T, T);
      g.lineStyle(1, 0xffffff, 0.55).strokeRect(t.tx * T + 0.5, t.ty * T + 0.5, T - 1, T - 1);
    }
    if (field || this.spotAt(f.tx, f.ty) || this.doorTiles.has(f.tx + ',' + f.ty)) {
      g.lineStyle(1, 0xffffff, 0.75).strokeRect(f.tx * T + 0.5, f.ty * T + 0.5, T - 1, T - 1);
      g.lineStyle(1, 0x2b2230, 0.5).strokeRect(f.tx * T + 1.5, f.ty * T + 1.5, T - 3, T - 3);
    }
  }
  // ---------- efectos al trabajar la tierra (auditoría A07) ----------
  // Salen al pulsar, sin esperar al servidor (la casilla cambia cuando responde; si dice que no, no cambia).
  // kind: till | clear | water | plant | harvest · tiles: casillas del mapa [{tx, ty}] · tool: lo que se ve en la mano
  toolFx(kind, tiles, tool = null) {
    const me = this.me;
    if (!me || !tiles?.length) return;
    const [dx, dy] = DV[me.dir];
    this.lean = { dx, dy, t0: this.time.now, dur: 240 };
    if (tool) {
      // la herramienta aparece delante del muñeco y da un golpe corto (la regadera se inclina para echar agua)
      const k = this.tex('icon:' + tool, () => G.itemIcon(tool)), left = me.dir === 'left', s = left ? -1 : 1;
      const img = this.track(this.add.image(Math.round(me.x + dx * 9 + (dy ? 6 : 0)), Math.round(me.y - 9 + dy * 4), k)
        .setOrigin(0.5, 0.85).setScale(0.8).setFlipX(left).setDepth(me.y + (dy < 0 ? -1 : 1)));
      const pour = kind === 'water';
      img.setRotation(s * (pour ? -0.1 : -1));
      this.tweens.add({ targets: img, rotation: s * (pour ? 0.75 : 0.45), duration: 200, ease: pour ? 'Sine.easeOut' : 'Cubic.easeIn',
        onComplete: () => this.tweens.add({ targets: img, alpha: 0, delay: pour ? 280 : 120, duration: 150, onComplete: () => img.destroy() }) });
    }
    // las partículas, cuando la herramienta llega a la tierra
    this.time.delayedCall(kind === 'water' ? 110 : kind === 'harvest' ? 40 : 180, () => { if (this.me === me) for (const t of tiles) this.burst(kind, t.tx, t.ty); });
  }
  burst(kind, tx, ty) {
    const C = {
      till: { tex: 'clod', n: 8, speed: [40, 75], angle: [205, 335], g: 260, life: 450, zone: [-5, -2, 10, 4], rot: 0 },
      clear: { tex: 'leaf', n: 7, speed: [35, 60], angle: [200, 340], g: 180, life: 540, zone: [-5, -3, 10, 4], rot: 360 },
      water: { tex: 'drop', n: 10, speed: [20, 40], angle: [80, 100], g: 340, life: 320, zone: [-6, -16, 12, 6], rot: 0 },
      plant: { tex: 'leaf', n: 3, speed: [14, 26], angle: [245, 295], g: -8, life: 750, zone: [-3, -2, 6, 3], rot: 180 },
      harvest: { tex: 'dust', n: 8, speed: [30, 55], angle: [200, 340], g: 120, life: 420, zone: [-5, -2, 10, 4], rot: 0 },
    }[kind];
    if (!C) return;
    const em = this.track(this.add.particles(tx * T + 8, ty * T + 9, this.tex('fx:' + C.tex, () => G.fxParticle(C.tex)), {
      emitting: false, lifespan: C.life, speed: { min: C.speed[0], max: C.speed[1] }, angle: { min: C.angle[0], max: C.angle[1] },
      gravityY: C.g, alpha: { start: 1, end: 0 }, scale: { start: 1, end: 0.7 }, rotate: C.rot ? { min: 0, max: C.rot } : 0,
      emitZone: { type: 'random', source: new Phaser.Geom.Rectangle(...C.zone) },
    }).setDepth(Math.max((ty + 1) * T + 2, (this.me?.y || 0) + 1)));   // por delante del muñeco, aunque mire hacia arriba
    em.explode(C.n);
    this.time.delayedCall(C.life + 120, () => em.destroy());
  }
  // al cosechar: el producto salta de la casilla al muñeco y sube «+1 …» (cuando el servidor dice qué ha salido)
  harvestFx(tx, ty, item) {
    const me = this.me;
    if (!me || !ITEMS[item]) return;
    const img = this.track(this.add.image(tx * T + 8, ty * T + 6, this.tex('icon:' + item, () => G.itemIcon(item))).setScale(0.75).setDepth(9.4e5));
    const x0 = img.x, y0 = img.y;
    this.tweens.addCounter({ from: 0, to: 1, duration: 340, ease: 'Sine.easeIn',
      onUpdate: (tw) => { const v = tw.getValue(); img.setPosition(x0 + (me.x - x0) * v, y0 + (me.y - 14 - y0) * v - Math.sin(v * Math.PI) * 14); },
      onComplete: () => { img.destroy(); if (this.me === me) this.floatText('+1 ' + ITEMS[item].name); } });
  }
  floatText(s, color = '#9CCC65') {
    const me = this.me;
    const img = this.track(this.add.image(Math.round(me.x), Math.round(me.y) - AH - 10, this.tagTex(s, color)).setOrigin(0.5, 1).setDepth(9.6e5));
    this.tweens.add({ targets: img, y: img.y - 14, alpha: { from: 1, to: 0 }, duration: 950, ease: 'Sine.easeOut', onComplete: () => img.destroy() });
  }
  // destello sobre las casillas que acaba de tocar una herramienta mejorada (A05)
  flashTiles(list) {
    const g = this.track(this.add.graphics().setDepth(8e5 + 1));
    for (const t of list) g.fillStyle(0xffffff, 0.5).fillRect(t.tx * T, t.ty * T, T, T);
    this.tweens.add({ targets: g, alpha: 0, duration: 450, onComplete: () => g.destroy() });
  }
  updateLight(hour, now) {
    const cam = this.cameras.main, wv = cam.worldView, outdoor = this.map.outdoor;
    const night = outdoor ? R.darkness(hour) : this.map.J.dim ? 0.32 : 0, rain = outdoor && R.rainy(R.dayKey(now));
    this.night = night;
    const warm = outdoor ? R.warmth(hour) : 0;
    this.warm.setPosition(wv.x - 1, wv.y - 1).setSize(wv.width + 2, wv.height + 2).setFillStyle(0xff8040, warm);
    const dk = night + (rain ? 0.14 : 0);
    const glow = Math.min(0.9, night * 1.5);
    for (const l of this.litImgs || []) l.setAlpha(night > 0.1 ? glow : 0);
    const dark = this.dark;
    dark.setPosition(Math.floor(wv.x) - 1, Math.floor(wv.y) - 1);
    if (dk <= 0.01) { dark.setVisible(false); for (const l of this.lights) l.gl.setAlpha(0); }
    else {
      dark.setVisible(true);
      dark.clear();
      dark.fill(night < 0.05 ? 0x283448 : 0x0e163a, dk);
      const k = night / 0.6, vw = wv.width, vh = wv.height;
      for (const l of this.lights) {
        const sx = l.x - wv.x, sy = l.y - wv.y, inView = night > 0.05 && sx > -l.r && sy > -l.r && sx < vw + l.r && sy < vh + l.r;
        l.gl.setAlpha(inView ? 0.3 * k * l.i : 0);
        if (!inView) continue;
        this.stamp.setPosition(l.x - dark.x, l.y - dark.y).setScale((l.r * 2) / 64).setAlpha(l.i);
        dark.erase(this.stamp);
      }
      // las ventanas encendidas se ven a través de la noche
      if (night > 0.1) for (const l of this.litImgs || []) if (l.x < wv.right && l.x + l.width > wv.x && l.y < wv.bottom && l.y + l.height > wv.y) dark.erase(l, -dark.x, -dark.y);
      for (const b of this.barriers || []) if (b.blink && night > 0.05) { this.stamp.setPosition(b.x + (b.blink === 1 ? -2 : 3) - dark.x, b.y - 16 - dark.y).setScale(24 / 64).setAlpha(0.9); dark.erase(this.stamp); }
      if (this.trainSpr && night > 0.25) for (let i = 12; i < this.trainSpr.width; i += 13) { this.stamp.setPosition(this.trainSpr.x + i - dark.x, this.trainSpr.y + 14 - dark.y).setScale(24 / 64).setAlpha(0.45); dark.erase(this.stamp); }
    }
    // lluvia
    const g = this.rainG; g.clear();
    if (rain) {
      g.fillStyle(0xc8d7f0, 0.55);
      const vw = wv.width, vh = wv.height, dt = 1 / 60;
      for (const d of this.drops) {
        d.y += d.v * dt; d.x -= d.v * 0.3 * dt;
        if (d.y > vh) { d.y = -4; d.x = Math.random() * (vw + 60); }
        g.fillRect(wv.x + (d.x | 0), wv.y + (d.y | 0), 1, 3); g.fillRect(wv.x + (d.x | 0) - 1, wv.y + (d.y | 0) + 3, 1, 1);
      }
    }
  }
  updateBubbles() {
    const now = performance.now();
    for (const [id, b] of this.bubbles) {
      const c = this.charPos(id);
      if (now > b.until || !c) { b.el.remove(); this.bubbles.delete(id); continue; }
      const [sx, sy] = this.worldToScreen(c.x, c.y - AH - 10);
      b.el.style.transform = `translate(${Math.round(sx)}px, ${Math.round(sy)}px) translate(-50%, -100%)`;
    }
  }
}
