// Páxinal Crossing · minijuego de pesca: una barra de tensión. El pez sube y baja a su aire; tú mantienes
// pulsado (Espacio o el ratón) para subir la zona verde y la sueltas para que baje. Mientras el pez está
// dentro de la zona se llena la barra de captura; si se vacía, se escapa. En la línea de los minijuegos
// de cargar y soltar de Paximón. Devuelve {caught, skill} con skill de 0 a 1.
import { Sound, scaled } from './ui.js';
import { itemIcon } from '../art/granxa.js';

export function fishingGame({ difficulty = 0.5, title = 'Pescando…' } = {}) {
  return new Promise((resolve) => {
    const bg = document.createElement('div');
    bg.className = 'modal-bg fishing-bg';
    bg.innerHTML = `<div class="fishing">
      <div class="f-title">${title}</div>
      <div class="f-row">
        <div class="f-track"><div class="f-water"></div><div class="f-zone"></div><div class="f-fish"></div></div>
        <div class="f-meter"><i></i></div>
      </div>
      <div class="f-help">Mantén pulsado <b>Espacio</b> (o el ratón) para subir la zona verde. Que el pez no se salga.</div>
    </div>`;
    document.body.appendChild(bg);
    const track = bg.querySelector('.f-track'), zone = bg.querySelector('.f-zone'), fishEl = bg.querySelector('.f-fish'), meter = bg.querySelector('.f-meter i');
    fishEl.append(scaled(itemIcon('xurelo')));
    const H = 240, ZH = Math.round(96 - difficulty * 30);
    let zy = H - ZH, zv = 0, fy = H * 0.6, ft = fy, ftNext = 0, progress = 0.3, hold = false, t0 = performance.now(), last = t0, done = false;
    const down = (e) => { if (e.type === 'keydown' && e.key !== ' ' && e.key.toLowerCase() !== 'e') { if (e.key === 'Escape') finish(false); return; } e.preventDefault(); e.stopPropagation(); hold = true; };
    const up = (e) => { if (e.type === 'keyup' && e.key !== ' ' && e.key.toLowerCase() !== 'e') return; e.preventDefault?.(); hold = false; };
    addEventListener('keydown', down, true); addEventListener('keyup', up, true);
    track.addEventListener('pointerdown', down); addEventListener('pointerup', up);
    function finish(caught) {
      if (done) return; done = true;
      removeEventListener('keydown', down, true); removeEventListener('keyup', up, true); removeEventListener('pointerup', up);
      const secs = (performance.now() - t0) / 1000;
      bg.querySelector('.f-title').textContent = caught ? '¡Pica! ¡Lo tienes!' : 'Se escapó…';
      if (caught) Sound.play('item');
      setTimeout(() => { bg.remove(); resolve({ caught, skill: caught ? Math.max(0.55, Math.min(1, 0.55 + 0.45 * (1 - secs / 14))) : 0, secs }); }, 650);
    }
    function frame(now) {
      if (done) return;
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      // la zona: sube mientras pulsas y cae cuando sueltas
      zv += (hold ? -760 : 560) * dt; zv = Math.max(-230, Math.min(260, zv));
      zy += zv * dt;
      if (zy < 0) { zy = 0; zv = 0; } if (zy > H - ZH) { zy = H - ZH; zv *= -0.3; }
      // el pez: cambia de idea cada poco y nada hacia allí
      if (now > ftNext) { ft = 10 + Math.random() * (H - 30); ftNext = now + 600 + Math.random() * (1300 - difficulty * 500); }
      fy += (ft - fy) * Math.min(1, dt * (1.0 + difficulty * 2.0));
      const inside = fy + 10 > zy && fy + 10 < zy + ZH;
      progress += (inside ? 0.42 : -0.17 - difficulty * 0.08) * dt;
      zone.style.transform = `translateY(${zy}px)`; zone.style.height = ZH + 'px'; zone.classList.toggle('on', inside);
      fishEl.style.transform = `translateY(${fy}px)`;
      meter.style.height = `${Math.max(0, Math.min(1, progress)) * 100}%`;
      if (progress >= 1) return finish(true);
      if (progress <= 0 || now - t0 > 25000) return finish(false);
      requestAnimationFrame(frame);
    }
    // con la pestaña oculta requestAnimationFrame no corre: un temporizador de reserva
    const tick = () => { if (done) return; if (performance.now() - last > 120) frame(performance.now()); setTimeout(tick, 60); };
    requestAnimationFrame(frame); setTimeout(tick, 200);
  });
}
