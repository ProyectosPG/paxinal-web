// Páxinal Crossing · ventanas de las eleccións: el programa de cada partido (en su caseta), el colegio
// electoral del Concello (papeleta y urna; el voto es anónimo y no se puede cambiar), el escrutinio con
// los 11 concelleiros y el pacto, y la pestaña «Eleccións» del tablón (participación y el sondeo).
import { openModal, modalOpen, esc, toast, Sound } from './ui.js';
import * as E from '../core/eleccions.js';
import * as R from '../core/rules.js';
import { ITEMS } from '../core/data.js';
import { paxiCanvas } from '../art/eleccions.js';

const left = (now) => R.fmtHours(Math.max(0, E.closeAt() - now) / R.H);
const CLOSE_TXT = 'el viernes 27 a las 13:00';

// ---------- el programa (caseta del partido o hablando con el candidato) ----------
export function openPrograma(app, pid) {
  if (modalOpen()) return;
  const P = E.PARTY[pid], now = app.now(), ph = E.phase(now), nm = E.nextMitin(P, now);
  let extra = '';
  if (pid === 'fa') { const s = E.siglas(now); extra = `<p class="elx-note">Siglas del Frente hoy: <b>${s.left.length}</b> (${esc(s.left.join(' · '))}).${s.gone.length ? ` Última escisión: «${esc(s.gone[0])}».` : ''}</p>`; }
  if (pid === 'pax') extra = `<p class="elx-note">Días con el chiringuito de RRSS abierto desde que prometimos cerrarlo: <b>${E.campaignDay(now) + 1}</b>. Intolerable.</p>`;
  if (pid === 'psoe') extra = '<p class="elx-note">Paguitas entregadas hasta hoy: 0. Paguitas prometidas: todas.</p>';
  if (pid === 'pp') extra = '<p class="elx-note">Programa completo en el Excel adjunto. (El Excel no se adjunta.)</p>';
  const mo = openModal(`<div class="elx-prog" style="--c:${P.color};--d:${P.dark}">
    <div class="elx-head"><div class="elx-pic"></div><div><div class="elx-sigla">${esc(P.sigla)}</div><h2>${esc(P.name)}</h2>
      <p class="lead">Candidato: <b>${esc(P.cand)}</b><br>«${esc(P.lema)}»</p></div></div>
    <ol class="elx-list">${P.programa.map((t) => `<li>${esc(t)}</li>`).join('')}</ol>${extra}
    <p class="muted elx-foot">${ph === 'campana' ? (nm != null ? `Mitin de hoy: a las ${String(Math.floor(nm)).padStart(2, '0')}:${nm % 1 ? '30' : '00'}, ${P.map === 'agro' ? 'delante de la casa de RRSS, en O Agro' : 'en la praza da Fonte'}. ` : '') + `Se vota en el Concello hasta ${CLOSE_TXT}.` : ph === 'reflexion' ? `Jornada de reflexión. La urna del Concello cierra hoy a las 13:00.` : 'Las elecciones ya pasaron. Las promesas, también.'}</p></div>`, { cls: 'wide' });
  mo.el.querySelector('.elx-pic').append(paxiCanvas(pid));
  return mo;
}

// ---------- el Concello: votar (campaña y reflexión) o ver el escrutinio (cuando ya hay alcalde) ----------
export async function openConcello(app) {
  if (modalOpen() || app.elexBusy) return;
  const ph = E.phase(app.now());
  if (ph === 'off') return;
  app.elexBusy = true;
  try { await app.refreshElex(); } finally { app.elexBusy = false; }
  if (modalOpen()) return;
  if (ph === 'goberno') return openResultado(app);
  const st = app.elex || {};
  if (st.error) return toast('La mesa electoral no contesta: ' + st.error, 'error');
  const head = `<h2>Colegio electoral · Concello de Paximiña</h2>`;
  const census = `Han votado <b>${st.turnout ?? 0}</b> de ${st.census ?? '?'} jugadores (y los vecinos, que votan todos). La urna cierra ${CLOSE_TXT}: quedan ${left(app.now())}.`;
  if (st.voted) {
    return openModal(`${head}<p class="lead">Dona Firmina, presidenta de la mesa: «Vostede xa votou. Consta aquí, por triplicado. O que votou non consta en ningures: é secreto.»</p>
      <p class="elx-note">${census}</p><p class="muted elx-foot">El voto es anónimo: el servidor apunta quién ha votado en una lista y el recuento en otra, sin nada que las una. Por eso no se puede cambiar.</p>`);
  }
  let pick = null;
  const mo = openModal(`${head}<p class="lead">Dona Firmina, presidenta de la mesa: «Colla unha papeleta, métaa na urna e non me manche nada. Unha por persoa.»</p>
    <div class="elx-ballots">${E.PARTIDOS.map((P) => `<button type="button" class="elx-ballot" data-p="${P.id}" style="--c:${P.color};--d:${P.dark}"><span class="pic"></span><b>${esc(P.sigla)}</b><span class="nm">${esc(P.name)}</span><span class="cd">${esc(P.cand)}</span></button>`).join('')}
      <button type="button" class="elx-ballot blank" data-p="blanco" style="--c:#9E9E9E;--d:#616161"><span class="pic">▢</span><b>EN BLANCO</b><span class="nm">Ninguno me convence</span><span class="cd">(como el camarero del Bonsai)</span></button></div>
    <p class="elx-note">${census}</p>
    <div class="row end"><span class="muted elx-foot">Voto anónimo y definitivo: una vez en la urna, no se puede cambiar.</span><button class="btn" id="elx-go" disabled>Elige una papeleta</button></div>`, { cls: 'wide' });
  const go = mo.el.querySelector('#elx-go');
  for (const b of mo.el.querySelectorAll('.elx-ballot')) {
    if (E.PARTY[b.dataset.p]) b.querySelector('.pic').append(paxiCanvas(b.dataset.p));
    b.addEventListener('click', () => {
      pick = b.dataset.p;
      for (const q of mo.el.querySelectorAll('.elx-ballot')) q.classList.toggle('on', q === b);
      go.disabled = false; go.textContent = `Meter en la urna: ${pick === 'blanco' ? 'voto en blanco' : E.PARTY[pick].sigla}`;
    });
  }
  go.addEventListener('click', async () => {
    if (!pick) return;
    go.disabled = true;
    try {
      const r = await app.net.rpc('election_vote', { p_secret: app.player.secret, p_party: pick });
      app.setPlayer(r.player); app.elex = r.state; Sound.play('paper');
      mo.close();
      toast(`¡Has votado! Dieta de participación: ${E.VOTE_PAY} paxetas y la chapa «Votei» (en la mochila, para colgar en casa).`, 'good');
      app.onVoted?.();
    } catch (e) { toast(e.message, 'error'); go.disabled = false; }
  });
  return mo;
}

// barras, concelleiros y pacto de un recuento (res = E.resultado(...)); light: para el tablón, que es blanco
function resultHtml(res) {
  const ids = res.order, npc = E.npcTally(), max = Math.max(1, ...ids.map((id) => res.votes[id]));
  const seats = ids.flatMap((id) => Array.from({ length: res.seats[id] }, () => `<i style="background:${E.PARTY[id].color}" title="${esc(E.PARTY[id].sigla)}"></i>`)).join('');
  const rows = ids.map((id) => { const P = E.PARTY[id]; return `<div class="elx-row"><b style="color:${P.color}">${esc(P.sigla)}</b><span class="bar"><i style="width:${Math.round((res.votes[id] / max) * 100)}%;background:${P.color}"></i></span>
    <span class="n">${res.votes[id]} votos <small>(${npc[id]} vecinos + ${res.votes[id] - npc[id]} jugadores)</small></span><span class="s">${res.seats[id]} concelleiros</span></div>`; }).join('');
  const A = E.PARTY[res.alcalde];
  return `<div class="elx-seats">${seats}</div>${rows}
    <p class="elx-note">En blanco: ${res.blanco}. Nulos: ${res.nulos} (Pancho mordió la papeleta). Total: ${res.total} votos, ${res.players} de jugadores.</p>
    <p class="elx-note">${res.absoluta ? `<b>${esc(A.sigla)}</b> tiene mayoría absoluta (${res.seats[res.alcalde]} de ${E.SEATS}). No hace falta ni reunirse.` : esc(res.pact.text) + ` Suman ${res.pact.seats} de ${E.SEATS}.`}
    ${res.robbed ? ` <b>${esc(E.PARTY[res.robbed].sigla)}</b> ganó las elecciones, pero no gobierna. Otra vez.` : ''}</p>`;
}
function openResultado(app) {
  const st = app.elex || {}, now = app.now();
  if (!st.results) return toast('El escrutinio todavía no ha llegado del servidor' + (st.error ? `: ${st.error}` : '. Vuelve en un momento.'), 'error');
  const res = E.resultado(st.results), A = E.PARTY[res.alcalde], perk = E.PERKS[res.alcalde], today = R.dayKey(now), got = st.perk_day === today;
  const mo = openModal(`<h2>Escrutinio · Eleccións a Paxineitor alcalde</h2>
    <div class="elx-head" style="--c:${A.color};--d:${A.dark}"><div class="elx-pic"></div><div><div class="elx-sigla">ALCALDE</div>
      <p class="lead"><b>${esc(A.cand)}</b> (${esc(A.sigla)} · ${esc(A.name)})<br>«${esc(A.lema)}»</p></div></div>
    ${resultHtml(res)}
    <div class="elx-perk"><div><b>Decreto del alcalde: ${esc(perk.name)}</b><br><span class="muted">${esc(perk.desc)} Una vez al día mientras gobierne. El resto del programa queda «en estudio».</span></div>
      <button class="btn small" id="elx-perk"${got ? ' disabled' : ''}>${got ? 'Recogido hoy' : 'Recoger'}</button></div>`, { cls: 'wide' });
  mo.el.querySelector('.elx-pic').append(paxiCanvas(res.alcalde));
  mo.el.querySelector('#elx-perk').addEventListener('click', async (e) => {
    e.currentTarget.disabled = true;
    try {
      const r = await app.net.rpc('election_perk', { p_secret: app.player.secret, p_party: res.alcalde });
      app.setPlayer(r.player); app.elex = { ...app.elex, perk_day: today }; Sound.play('coins');
      e.currentTarget.textContent = 'Recogido hoy';
      toast(`${perk.name}: ${perk.paxetas ? `+${perk.paxetas} paxetas` : `${perk.n} × ${ITEMS[perk.item].name}`}. Mañana, otro.`, 'good');
    } catch (err) { toast(err.message, 'error'); e.currentTarget.disabled = false; }
  });
  return mo;
}

// ---------- la pestaña «Eleccións» del tablón ----------
export async function renderElexTab(app, box) {
  const now = app.now(), ph = E.phase(now);
  box.innerHTML = '<div class="ipm-sys">Xunta Electoral de Paximiña de Arousa</div>';
  await app.refreshElex();
  const st = app.elex || {};
  const entry = (who, html) => { const d = document.createElement('div'); d.className = 'ipm-entry'; d.innerHTML = `<div class="ipm-head"><span class="nm">${esc(who)}</span><span class="arr">⇨</span><span class="nm">Todo o pobo</span></div><div class="ipm-text elx-light">${html}</div>`; box.append(d); };
  if (ph === 'goberno') {
    if (!st.results) return entry('Xunta Electoral', 'El escrutinio todavía no ha llegado. Disculpen las molestias (esto lo lleva Renfe).');
    const res = E.resultado(st.results), A = E.PARTY[res.alcalde];
    entry('Xunta Electoral', `Escrutinio terminado. Alcalde: <b style="color:${A.color}">${esc(A.cand)}</b> (${esc(A.sigla)}).${resultHtml(res)}`);
    entry('Concello', `Decreto del alcalde: <b>${esc(E.PERKS[res.alcalde].name)}</b>. Se recoge una vez al día en la puerta del Concello, hasta el 4 de diciembre.`);
    return;
  }
  box.firstChild.textContent = `Eleccións a Paxineitor alcalde · la urna del Concello cierra ${CLOSE_TXT} (quedan ${left(now)})`;
  entry('Xunta Electoral', `${st.error ? 'No se pudo consultar la participación.' : `Han votado <b>${st.turnout ?? 0}</b> de ${st.census ?? '?'} jugadores. Los ${Object.keys(E.NPC_VOTES).length} vecinos votan todos (pregúntales).`} ${st.voted ? 'Tú ya has votado ✓' : '<b>Tú todavía no has votado</b>: se vota en la puerta del Concello, en la rúa do Concello.'}<br>El voto es anónimo y no se puede cambiar. Quien vota se lleva ${E.VOTE_PAY} paxetas y la chapa «Votei».`);
  const s = E.sondeo(now);
  entry('CIS de Paxanos', `Estimación de voto de hoy (muestra: una persona, preguntada dos veces):${E.PARTIDOS.map((P) => `<div class="elx-row"><b style="color:${P.color}">${esc(P.sigla)}</b><span class="bar"><i style="width:${s.pct[P.id] * 2}%;background:${P.color}"></i></span><span class="n">${s.pct[P.id]} %</span></div>`).join('')}Suma ${s.total} %. Margen de error: sí.`);
  entry('Mítines de hoy', ph === 'reflexion' ? 'Hoy es jornada de reflexión: no hay mítines ni candidatos por la calle. Brais y Vanesa dicen que lo suyo «no es pedir el voto».'
    : E.PARTIDOS.map((P) => `<b style="color:${P.color}">${esc(P.sigla)}</b> ${esc(P.short)}: ${P.mitin.map((m) => `${String(Math.floor(m[0])).padStart(2, '0')}:00`).join(' y ')}, ${P.map === 'agro' ? 'delante de la casa de RRSS (O Agro)' : 'praza da Fonte'}`).join('<br>'));
  const sg = E.siglas(now);
  entry('Frente Ampliable informa', `Hoy somos ${sg.left.length} siglas.${sg.gone.length ? ` Se ha escindido «${esc(sg.gone[0])}» por discrepancias sobre el orden del día.` : ' De momento, nadie se ha escindido. Mañana hay asamblea.'}`);
  entry('PAX informa', `Días con el chiringuito de RRSS abierto desde que prometimos cerrarlo: <b>${E.campaignDay(now) + 1}</b>.`);
}
