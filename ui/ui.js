// Páxinal Crossing · ayudas de interfaz: ventanas, avisos, sonidos y formatos.
import { logoDataUrl } from '../art/paximon/ipmsg.js';

export const $ = (s) => document.querySelector(s);
export const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const pad2 = (n) => String(n).padStart(2, '0');
export function stamp(t, withDate = true) {
  const d = new Date(t || Date.now()), hm = `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
  return withDate && d.toDateString() !== new Date().toDateString() ? `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)} ${hm}` : hm;
}

let toastTimer;
export function toast(msg, kind = '') {
  const t = $('#toast'); t.textContent = msg; t.hidden = false; t.className = kind;
  clearTimeout(toastTimer); toastTimer = setTimeout(() => (t.hidden = true), Math.min(7000, 2600 + msg.length * 35));
}

export const modalOpen = () => !!document.querySelector('.modal-bg');
export function openModal(html, { cls = '', onClose, closable = true } = {}) {
  const bg = document.createElement('div');
  bg.className = 'modal-bg';
  bg.innerHTML = `<div class="modal ${cls}" role="dialog" aria-modal="true">${closable ? '<button class="modal-x" type="button" aria-label="Cerrar">✕</button>' : ''}${html}</div>`;
  document.body.appendChild(bg);
  let closed = false;
  const close = () => {
    if (closed) return; closed = true;
    bg.remove(); document.removeEventListener('keydown', onKey, true);
    onClose?.();
  };
  const onKey = (e) => { if (e.key === 'Escape' && closable) { e.stopPropagation(); close(); } };
  if (closable) {
    bg.querySelector('.modal-x').addEventListener('click', close);
    bg.addEventListener('pointerdown', (e) => { if (e.target === bg) close(); });
    document.addEventListener('keydown', onKey, true);
  }
  document.activeElement?.blur?.();
  return { el: bg.querySelector('.modal'), close };
}

// cabecera de ventana de IPaxMsg (barra de título y menú de Windows)
export const ipmHead = (title, closeBtn = false) => `
  <div class="ipm-titlebar"><img class="ipm-ico" src="${logoDataUrl()}" alt=""><span class="ipm-title">${esc(title)}</span>
    <span class="ipm-winbtns" aria-hidden="${!closeBtn}"><i>—</i><i>☐</i>${closeBtn ? '<button type="button" class="ipm-x" aria-label="Cerrar">✕</button>' : '<i>✕</i>'}</span></div>
  <div class="ipm-menu" aria-hidden="true"><span>File</span><span>Settings</span><span>Window</span><span>Print</span><span>Help</span></div>`;

// ---------- sonidos (copiados de Paximón) ----------
const SFX = {};
export const Sound = {
  on: localStorage.getItem('paxinal.sound') !== '0',
  play(name, vol = 0.45) {
    if (!this.on) return;
    try {
      const a = (SFX[name] ||= new Audio(`audio/${name}.mp3`));
      const c = a.cloneNode(); c.volume = vol; c.play().catch(() => {});
    } catch { /* sin sonido */ }
  },
  toggle() { this.on = !this.on; localStorage.setItem('paxinal.sound', this.on ? '1' : '0'); return this.on; },
};

// lienzo a escala (para mostrar sprites pequeños en grande y pixelados)
export function scaled(cv, cls = '') { const c = document.createElement('canvas'); c.width = cv.width; c.height = cv.height; c.getContext('2d').drawImage(cv, 0, 0); if (cls) c.className = cls; return c; }
