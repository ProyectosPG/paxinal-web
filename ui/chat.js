// Páxinal Crossing · chat IPaxMsg: la parodia de IPMsg LogViewer de Paximón (ventana de Windows,
// pestaña «All», los emotes en la barra de herramientas, filtro «All Users», entradas del registro
// «hora ⇦ remitente ⇨ destinatario», Enter envía, Mayús+Enter salta, doble clic cita).
// Va por Broadcast de Realtime entre navegadores; no se guarda nada en la base de datos.
import { $, esc, stamp, toast, Sound } from './ui.js';
import { logoDataUrl } from '../art/paximon/ipmsg.js';
import { avatarGrid } from '../art/paximon/avatar.js';
import { emoteIcon } from '../art/granxa.js';
import { EMOTES, deptColor } from '../core/data.js';

const EVERYONE = 'Todo o pobo';
export const emoteById = (id) => EMOTES.find((e) => e.id === id);
export function emoteCanvas(look, dept, id) { return emoteIcon(avatarGrid(look, deptColor(dept), 'down', 0), id); }

export class Chat {
  constructor(app) {
    this.app = app; this.users = new Set(); this.filter = ''; this.lastChat = 0; this.lastEmote = 0;
    $('#chat-ico').src = logoDataUrl();
    $('#chat-toggle').addEventListener('click', () => this.toggle());
    $('#chat-form').addEventListener('submit', (e) => { e.preventDefault(); const i = $('#chat-input'); this.send(i.value); i.value = ''; i.blur(); });
    $('#chat-input').addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); $('#chat-form').requestSubmit(); }
      if (e.key === 'Escape') { e.preventDefault(); e.target.blur(); }
      e.stopPropagation();
    });
    $('#chat-filter').addEventListener('change', (e) => {
      this.filter = e.target.value;
      document.querySelectorAll('#chat-msgs .ipm-entry').forEach((d) => { d.hidden = !!this.filter && d.dataset.from !== this.filter; });
      const box = $('#chat-msgs'); box.scrollTop = box.scrollHeight;
    });
  }
  show() { $('#chat').hidden = false; this.renderEmotes(); this.line({ sys: '— Chat general de Paximiña —' }); }
  hide() { $('#chat').hidden = true; }
  open() { const c = $('#chat'); c.classList.remove('collapsed'); const u = $('#chat-unread'); u.hidden = true; u.textContent = '0'; $('#chat-input').focus(); }
  toggle() { const c = $('#chat'); if (c.classList.contains('collapsed')) this.open(); else { c.classList.add('collapsed'); $('#chat-input').blur(); } }
  renderEmotes() {
    const box = $('#chat-emotes'); box.innerHTML = '';
    const P = this.app.player;
    for (const e of EMOTES) {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'emote-btn'; b.title = e.text;
      b.appendChild(emoteCanvas(P.look, P.dept, e.id));
      b.addEventListener('click', () => this.sendEmote(e.id));
      box.appendChild(b);
    }
  }
  // cada mensaje es una entrada del LogViewer: «hora ⇦ remitente ⇨ destinatario» y el texto debajo
  line(msg) {
    const box = $('#chat-msgs'), d = document.createElement('div');
    if (msg.sys) { d.className = 'ipm-sys'; d.textContent = msg.sys; }
    else {
      d.className = 'ipm-entry' + (msg.mine ? ' mine' : '') + (msg.system ? ' sysmsg' : '');
      d.dataset.from = msg.from;
      d.innerHTML = `<div class="ipm-head"><span class="t">${stamp(msg.ts, false)}</span><span class="arr">⇦</span>
        <span class="nm dp" style="--c:${msg.color || deptColor(msg.dept)}">${esc(msg.from)}</span><span class="arr">⇨</span><span class="nm">${esc(msg.to || EVERYONE)}</span></div>
        <div class="ipm-text"></div>`;
      const body = d.querySelector('.ipm-text');
      if (msg.emote) { body.append(emoteCanvas(msg.look, msg.dept, msg.emote), emoteById(msg.emote)?.text || msg.emote); }
      else {
        body.textContent = msg.text;
        if (!msg.system) { d.title = 'Doble clic para citar'; d.addEventListener('dblclick', () => this.quote(msg.text)); }
      }
      if (!msg.system && !this.users.has(msg.from)) {
        this.users.add(msg.from);
        const o = document.createElement('option'); o.textContent = msg.from; $('#chat-filter').appendChild(o);
      }
      if (this.filter && this.filter !== msg.from) d.hidden = true;
    }
    box.appendChild(d);
    while (box.children.length > 150) box.firstChild.remove();
    box.scrollTop = box.scrollHeight;
    if (!msg.sys && !msg.mine && $('#chat').classList.contains('collapsed')) {
      const u = $('#chat-unread'); u.hidden = false; u.textContent = String(Number(u.textContent || 0) + 1);
      Sound.play('ipmsg', 0.35);
    }
  }
  // responder citando, al estilo IPMsg: tu respuesta arriba y el original con «>» debajo
  quote(text) {
    const input = $('#chat-input');
    input.value = `\n\n${String(text).split('\n').map((l) => '>' + l).join('\n')}`.slice(0, 300);
    this.open(); input.setSelectionRange(0, 0);
  }
  send(text) {
    text = String(text).replace(/^\s*\n|\s+$/g, '').slice(0, 300);
    if (!text) return;
    const now = Date.now();
    if (now - this.lastChat < 600) return;
    this.lastChat = now;
    const P = this.app.player, payload = { from: P.nickname, from_id: P.id, dept: P.dept, text, ts: now };
    this.line({ ...payload, mine: true });
    this.app.world?.say(P.id, text);
    this.app.net.send('chat', payload);
  }
  sendEmote(id) {
    const now = Date.now();
    if (now - this.lastEmote < 2000) return toast('Espera un poco entre emotes');
    this.lastEmote = now;
    const P = this.app.player, payload = { from: P.nickname, from_id: P.id, dept: P.dept, look: P.look, emote: id, ts: now };
    this.line({ ...payload, mine: true });
    this.app.world?.emote(P.id, emoteCanvas(P.look, P.dept, id), emoteById(id).text);
    this.app.net.send('emote', payload);
  }
  onChat(p) {
    if (!p || p.from_id === this.app.player?.id || typeof p.text !== 'string') return;
    const text = p.text.slice(0, 300);
    this.line({ from: String(p.from || '?'), dept: p.dept, text, ts: Date.now() });
    if (this.app.sameMap(p.from_id)) this.app.world?.say(p.from_id, text);
  }
  onEmote(p) {
    if (!p || p.from_id === this.app.player?.id || !emoteById(p.emote)) return;
    this.line({ from: String(p.from || '?'), dept: p.dept, look: p.look, emote: p.emote, ts: Date.now() });
    if (this.app.sameMap(p.from_id)) this.app.world?.emote(p.from_id, emoteCanvas(p.look, p.dept, p.emote), emoteById(p.emote).text);
  }
  // avisos del juego en el mismo registro (cobros del tren, etc.)
  system(from, text, color = '#7B2D8E') { this.line({ from, to: this.app.player.nickname, text, ts: Date.now(), system: true, color }); }
}
