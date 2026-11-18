// Páxinal Crossing · Albacete: la gente de la calle y las navajas. Vive dentro del mundo (world.combat)
// solo en los mapas con «combat». Cada pantalla tiene su gente: no se comparte con los demás jugadores.
//
// La gente pasea. De vez en cuando uno se te acerca y te pide la hora y luego un cigarro. Al acabar, si
// era de los pacíficos da las gracias y sigue; si era navajero, saca la navaja y va a por ti. No se sabe
// cuál es cuál hasta entonces (puedes pinchar primero, pero si era inocente se te echan encima los de
// alrededor). Un navajero se para un momento antes de pinchar (parpadea en amarillo): si te apartas, falla.
// Deja de seguirte si te alejas mucho o entras en una zona segura. En la Feria vive el Sartenero.
import { DIRS, AH } from '../art/paximon/avatar.js';
import * as G from '../art/granxa.js';
import { ALBA_FOLK, ALBA_BOSS, ALBA_NIGHT, ALBA_LINES, myNavaja } from '../core/data.js';
import * as R from '../core/rules.js';

const T = 16;
const DV = { down: [0, 1], up: [0, -1], left: [-1, 0], right: [1, 0] };
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const rnd = (a, b) => a + Math.random() * (b - a);
const rint = ([a, b]) => Math.round(rnd(a, b));
const dirOf = (dx, dy) => (Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'down' : 'up');
const ASKING = new Set(['approach', 'ask1', 'ask2']);

export class Combat {
  constructor(world) {
    this.w = world; this.app = world.app; this.folk = []; this.cool = 0; this.seq = 0;
    const J = world.map.J;
    this.safe = J.safe || []; this.feria = J.feria || null;
    // casillas de calle donde puede aparecer y pasear la gente (fuera de las zonas seguras)
    const all = [];
    for (let y = 0; y < J.h; y++) for (let x = 0; x < J.w; x++) {
      if (['plaza', 'path', 'sand'].includes(world.map.ground[y][x]) && world.walkable(x, y) && !this.isSafe(x * T + 8, y * T + 8)) all.push([x, y]);
    }
    this.streets = all.filter(([x, y]) => !this.inFeria(x * T + 8, y * T + 8, 1));
    this.ring = all.filter(([x, y]) => this.inFeria(x * T + 8, y * T + 8, -1.5));
    const night = this.isNight();
    for (const k of ALBA_FOLK) for (let i = 0; i < k.n + (night && k.hostile > 0 ? 1 : 0); i++) this.spawn(k);
    if (this.ring.length) this.spawn(ALBA_BOSS, true);
  }
  isNight() { const h = R.hourOf(this.app.now()); return h >= 21 || h < 7; }
  isSafe(px, py) { const x = px / T, y = py / T; return this.safe.some(([x0, y0, x1, y1]) => x >= x0 && x < x1 + 1 && y >= y0 && y < y1 + 1); }
  inFeria(px, py, margin = 0) { const f = this.feria; return !!f && Math.hypot(px / T - f.x, py / T - f.y) <= f.r + margin; }

  // ---------- gente ----------
  spawn(kind, boss = false, f = null) {
    const w = this.w, me = w.me, pool = boss ? this.ring : this.streets;
    let pos = pick(pool);
    for (let i = 0; i < 40; i++) { const c = pick(pool); if (Math.hypot(c[0] * T + 8 - me.x, c[1] * T + 12 - me.y) > 9 * T) { pos = c; break; } }
    const [look, shirt, extras] = boss ? [kind.look, kind.shirt, kind.extras] : pick(kind.looks);
    const key = w.sheet(look, shirt, extras), tagKey = w.tagTex(kind.tag, boss ? '#E53935' : '#9E9E9E');
    if (!f) {
      f = { id: 'folk' + (++this.seq),
        spr: w.track(w.add.sprite(0, 0, key, 0).setOrigin(0.5, 1)),
        sh: w.track(w.add.image(0, 0, 'shadow').setOrigin(0.5)),
        tag: w.track(w.add.image(0, 0, tagKey).setOrigin(0.5, 1).setDepth(9.5e5).setAlpha(0)),
        knife: w.track(w.add.image(0, 0, w.tex('icon:navaja', () => G.itemIcon('navaja'))).setOrigin(0.5, 0.8).setScale(0.7).setVisible(false)) };
      this.folk.push(f);
    }
    f.spr.setTexture(key, 0).setAlpha(1).setAngle(0).clearTint().setVisible(true); f.sh.setVisible(true); f.tag.setTexture(tagKey);
    Object.assign(f, { kind, boss, hp: kind.hp, x: pos[0] * T + 8, y: pos[1] * T + 12, dir: 'down', f: 0, at: 0, state: 'wander', t: rnd(0, 3), path: null,
      hostile: Math.random() < kind.hostile + (this.isNight() && kind.hostile > 0 && kind.hostile < 1 ? ALBA_NIGHT : 0),
      revealed: boss, askCool: rnd(3, 10), wind: 0, rest: 0, flash: 0, moving: false, repath: 0 });
    return f;
  }
  tileOf(o) { return [Math.floor(o.x / T), Math.floor((o.y - 2) / T)]; }
  face(f, o) { f.dir = dirOf(o.x - f.x, o.y - f.y); }
  // un paso hacia (gx, gy), resbalando por las paredes
  step(f, gx, gy, sp, dt) {
    const dx = gx - f.x, dy = gy - f.y, d = Math.hypot(dx, dy), w = this.w;
    if (d < 0.5) return 0;
    const st = Math.min(d, sp * dt), nx = f.x + (dx / d) * st, ny = f.y + (dy / d) * st;
    const stuck = !w.free(f.x, f.y);   // si ha quedado dentro de algo, que pueda salir
    let moved = false;
    if (stuck || w.free(nx, f.y)) { f.x = nx; moved = true; }
    if (stuck || w.free(f.x, ny)) { f.y = ny; moved = true; }
    if (moved) { f.moving = true; f.dir = dirOf(dx, dy); }
    return d;
  }
  follow(f, sp, dt) {   // sigue su camino (lista de casillas); devuelve false cuando se acaba
    if (!f.path?.length) return false;
    const [px, py] = f.path[0], gx = px * T + 8, gy = py * T + 12;
    if (Math.hypot(gx - f.x, gy - f.y) < 2.5) f.path.shift(); else this.step(f, gx, gy, sp, dt);
    return true;
  }
  goto(f, o, sp, dt) {   // hacia un punto que se mueve: de cerca, directo; de lejos, por el camino más corto
    const d = Math.hypot(o.x - f.x, o.y - f.y);
    if (d < 28) { f.path = null; return this.step(f, o.x, o.y, sp, dt); }
    f.repath -= dt;
    if (f.repath <= 0 || !f.path) { f.repath = 0.5; const [sx, sy] = this.tileOf(f), [gx, gy] = this.tileOf(o); f.path = this.w.findPath(sx, sy, gx, gy); }
    if (!this.follow(f, sp, dt)) this.step(f, o.x, o.y, sp, dt);
  }
  wander(f, dt) {
    const pool = f.boss ? this.ring : this.streets, sp = f.kind.id === 'runner' ? 70 : f.boss ? 24 : 26;
    if (this.follow(f, sp, dt)) return;
    f.t -= dt;
    if (f.t > 0) return;
    f.t = f.kind.id === 'runner' ? 0.2 : rnd(1.5, 6);
    const [sx, sy] = this.tileOf(f);
    let goal = null;
    for (let i = 0; i < 12 && !goal; i++) { const c = pick(pool); const d = Math.hypot(c[0] - sx, c[1] - sy); if (d > 3 && d < (f.kind.id === 'runner' ? 40 : 14)) goal = c; }
    if (goal) f.path = this.w.findPath(sx, sy, goal[0], goal[1]);
  }
  say(f, list, ms = 2400) { this.w.say(f.id, pick(list), ms); }
  reveal(f, list) {
    f.hostile = true; f.revealed = true; f.state = 'fight'; f.wind = 0; f.rest = 0.55; f.path = null;
    if (!f.boss) f.tag.setTexture(this.w.tagTex('Navajero', '#E53935'));
    if (list) this.say(f, list);
  }

  // ---------- bucle ----------
  update(dt) {
    const w = this.w, me = w.me;
    if (!me || this.app.blocked()) return;
    this.cool = Math.max(0, this.cool - dt);
    const meSafe = this.isSafe(me.x, me.y), asking = this.folk.some((q) => ASKING.has(q.state));
    for (const f of this.folk) {
      if (f.state === 'ko') { f.t -= dt; if (f.t <= 0) this.spawn(f.kind, f.boss, f); continue; }
      const d = Math.hypot(me.x - f.x, me.y - f.y);
      f.moving = false; f.flash = Math.max(0, f.flash - dt);
      switch (f.state) {
        case 'wander':
          this.wander(f, dt); f.askCool -= dt;
          if (meSafe) break;
          if (f.boss) { if (this.inFeria(me.x, me.y) && d < 8 * T) this.reveal(f, ALBA_LINES.boss); }
          else if (f.kind.id === 'runner') { if (d < 26 && f.askCool <= 0) { f.askCool = 9; this.say(f, ALBA_LINES.runner, 1800); } }
          else if (f.revealed) { if (d < 4.5 * T && f.askCool <= 0) this.reveal(f, null); }
          else if (f.askCool <= 0 && d < 5.5 * T && !asking) { f.state = 'approach'; f.t = 7; f.path = null; }
          break;
        case 'approach':   // se acerca a preguntar
          f.t -= dt;
          if (meSafe || f.t <= 0 || d > 9 * T) { f.state = 'wander'; f.askCool = 12; f.path = null; break; }
          if (d > 20) this.goto(f, me, 48, dt);
          else { this.face(f, me); f.state = 'ask1'; f.t = 2.3; this.say(f, ALBA_LINES.ask1, 2300); }
          break;
        case 'ask1': case 'ask2':
          this.face(f, me); f.t -= dt;
          if (d > 3.2 * T || meSafe) {   // le dejas con la palabra en la boca
            if (f.hostile && !meSafe) this.reveal(f, ALBA_LINES.ignored);
            else { this.say(f, ALBA_LINES.shrug); f.state = 'wander'; f.askCool = 45; }
          } else if (f.t <= 0) {
            if (f.state === 'ask1') { f.state = 'ask2'; f.t = 2.3; this.say(f, ALBA_LINES.ask2, 2300); }
            else if (f.hostile) this.reveal(f, ALBA_LINES.reveal);
            else { this.say(f, ALBA_LINES.thanks); f.state = 'wander'; f.askCool = 70; this.app.albaEvent?.('thanks'); }
          }
          break;
        case 'fight': this.fight(f, me, d, dt, meSafe); break;
        case 'flee': {
          f.t -= dt;
          const l = d || 1; this.step(f, f.x + ((f.x - me.x) / l) * 40, f.y + ((f.y - me.y) / l) * 40, f.kind.speed + 12, dt);
          if (f.t <= 0 || d > 11 * T) { f.state = 'wander'; f.askCool = f.hostile ? 14 : 90; f.path = null; }
          break;
        }
      }
      this.draw(f, d, dt);
    }
  }
  fight(f, me, d, dt, meSafe) {
    if (meSafe || d > 13 * T || (f.boss && !this.inFeria(me.x, me.y, 2.5))) {   // se cansa de seguirte
      this.say(f, ALBA_LINES.leash, 2000); f.state = 'wander'; f.askCool = 10; f.path = null; f.wind = 0;
      if (f.boss) f.hp = Math.min(f.kind.hp, f.hp + 60);
      return;
    }
    if (f.wind > 0) {   // armando el navajazo: quieto y parpadeando; si sigues a tiro cuando acaba, te da
      f.wind -= dt;
      if (f.wind <= 0) { f.rest = f.boss ? 0.8 : 0.9; this.lunge(f); if (d < 25) this.app.albaHurt(rint(f.kind.dmg), f); }
      return;
    }
    f.rest = Math.max(0, f.rest - dt);
    if (d <= 19 && f.rest <= 0) { f.wind = f.boss ? 0.5 : 0.45; this.face(f, me); return; }
    if (d > 15) this.goto(f, me, f.kind.speed, dt); else this.face(f, me);
  }
  lunge(f) {
    const [dx, dy] = DV[f.dir];
    this.w.tweens.add({ targets: f.knife, x: f.knife.x + dx * 7, y: f.knife.y + dy * 6, duration: 70, yoyo: true });
  }
  draw(f, d, dt) {
    if (f.moving) { f.at += dt; f.f = [1, 0, 2, 0][Math.floor(f.at / 0.16) % 4]; } else { f.f = 0; f.at = 0; }
    const x = Math.round(f.x), y = Math.round(f.y), armed = f.state === 'fight';
    f.spr.setPosition(x, y + 1).setFrame(DIRS.indexOf(f.dir) * 3 + f.f).setDepth(f.y);
    if (f.flash > 0) f.spr.setTint(0xff7777); else if (f.wind > 0 && Math.floor(f.wind * 18) % 2 === 0) f.spr.setTint(0xffe27a); else f.spr.clearTint();
    f.sh.setPosition(x, y).setDepth(f.y - 0.5);
    f.tag.setPosition(x, y - AH - 1).setAlpha(f.revealed || d < 44 ? 1 : 0);
    if (armed && !this.w.tweens.isTweening(f.knife)) {
      const [dx, dy] = DV[f.dir];
      f.knife.setPosition(x + dx * 8 + (dy ? 6 : 0), y - 8 + dy * 3 - (f.wind > 0 ? 3 : 0)).setFlipX(f.dir === 'left').setDepth(f.y + (dy < 0 ? -1 : 1));
    }
    f.knife.setVisible(armed);
  }

  // ---------- tu navaja ----------
  // ¿hay pelea? Un navajero descubierto a menos de 4 casillas, o alguien justo delante, a tiro
  threat() {
    const me = this.w.me, [dx, dy] = DV[me.dir], hx = me.x + dx * 13, hy = me.y - 3 + dy * 12;
    if (this.isSafe(me.x, me.y)) return false;
    return this.folk.some((f) => f.state !== 'ko' && ((f.state === 'fight' && Math.hypot(f.x - me.x, f.y - me.y) < 4 * T) || Math.hypot(f.x - hx, f.y - 3 - hy) < 15));
  }
  attack() {
    const w = this.w, me = w.me;
    if (this.cool > 0) return;
    if (this.isSafe(me.x, me.y)) { this.app.albaEvent?.('safe'); return; }
    this.cool = 0.42;
    const nav = myNavaja(this.app.player.inventory), [dx, dy] = DV[me.dir];
    w.toolFx('stab', [w.facing()], nav.id || 'navaja');
    const hx = me.x + dx * 13, hy = me.y - 3 + dy * 12;
    for (const f of this.folk) if (f.state !== 'ko' && Math.hypot(f.x - hx, f.y - 3 - hy) < 15) this.damage(f, rint(nav.dmg), dx, dy);
  }
  damage(f, n, dx, dy) {
    const w = this.w, innocent = !f.hostile;
    f.hp -= n; f.flash = 0.16;
    if (w.free(f.x + dx * 7, f.y + dy * 7)) { f.x += dx * 7; f.y += dy * 7; }
    const img = w.track(w.add.image(Math.round(f.x), Math.round(f.y) - AH - 8, w.tagTex('-' + n, '#FFD54F')).setOrigin(0.5, 1).setDepth(9.6e5));
    w.tweens.add({ targets: img, y: img.y - 12, alpha: { from: 1, to: 0 }, duration: 700, onComplete: () => img.destroy() });
    if (f.hp <= 0) return this.ko(f, innocent);
    if (innocent) {
      this.say(f, ALBA_LINES.innocent); f.state = 'flee'; f.t = 5; f.path = null;
      this.app.albaEvent?.('innocent');
      // los de alrededor lo han visto todo
      let n2 = 0;
      for (const q of this.folk) if (q !== f && q.state !== 'ko' && !q.boss && q.kind.hostile > 0 && Math.hypot(q.x - f.x, q.y - f.y) < 7 * T && n2 < 3 && Math.random() < 0.7) { this.reveal(q, n2 ? null : ALBA_LINES.mob); n2++; }
      return;
    }
    if (!f.boss && f.hp < f.kind.hp * 0.3 && Math.random() < 0.45) { this.say(f, ALBA_LINES.flee, 1800); f.revealed = true; f.state = 'flee'; f.t = 3.5; f.wind = 0; f.tag.setTexture(w.tagTex('Navajero', '#E53935')); return; }
    if (f.state !== 'fight') this.reveal(f, ALBA_LINES.hit); else if (Math.random() < 0.3) this.say(f, ALBA_LINES.hit, 1200);
    f.rest = Math.max(f.rest, 0.25);
  }
  ko(f, innocent) {
    const w = this.w;
    this.say(f, innocent ? ALBA_LINES.innocent : ALBA_LINES.ko, 2600);
    f.state = 'ko'; f.t = f.boss ? f.kind.respawn : rnd(35, 60); f.wind = 0;
    f.knife.setVisible(false); f.sh.setVisible(false); f.tag.setAlpha(0); f.spr.clearTint().setAngle(90);
    w.tweens.add({ targets: f.spr, alpha: 0, delay: 1400, duration: 600 });
    w.burst('ko', Math.floor(f.x / T), Math.floor((f.y - 2) / T));
    this.app.albaWin(f.boss ? 'boss' : innocent ? 'innocent' : 'normal', f.kind);
  }
  // te han dado: el mundo lo enseña (la salud la lleva la app)
  hurtFx(n) {
    const w = this.w, me = w.me;
    w.cameras.main.shake(110, 0.004);
    me.spr.setTint(0xff6666); w.time.delayedCall(160, () => { if (w.me === me) me.spr.clearTint(); });
    w.floatText('-' + n + ' ♥', '#FF5252');
  }
}
