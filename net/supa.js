// Páxinal Crossing · servidor de verdad: Supabase, esquema `paxinal` del proyecto compartido.
// Toda la lógica está en funciones RPC (supabase/schema.sql); el cliente solo lee tablas públicas.
// Tiempo real en el canal «paxinal:pobo»: la posición y el chat por Broadcast, y la Presence solo
// al cambiar de mapa (Realtime echa a quien manda más de 5 actualizaciones de Presence en 30 s).
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
import { SUPABASE_URL, SUPABASE_KEY } from '../config.js';

const TOPIC = 'paxinal:pobo';
const PRES_MAX = 4, PRES_WINDOW = 30000;
const ms = (v) => (v == null ? null : typeof v === 'number' ? v : Date.parse(v));

// las fechas llegan como texto: el juego trabaja con milisegundos
function normPlot(r) { return r && { ...r, planted_at: ms(r.planted_at), growth_at: ms(r.growth_at), wet_until: ms(r.wet_until), growth: Number(r.growth) || 0 }; }
function normPlayer(p) { return p && { ...p, now: ms(p.now), paid: (p.paid || []).map((s) => ({ ...s, pay_at: ms(s.pay_at), created_at: ms(s.created_at) })) }; }

export function createSupa() {
  const sb = createClient(SUPABASE_URL, SUPABASE_KEY, { db: { schema: 'paxinal' }, realtime: { worker: true } });
  let ch = null, handlers = {}, myKey = null, meta = null, sent = [], timer = null, lastKey = null, gen = 0, ready = false;

  async function rpc(fn, args) {
    const { data, error } = await sb.rpc(fn, args || {});
    if (error) throw new Error(error.message);
    if (fn === 'farm') return { ...data, plot: normPlot(data.plot), player: normPlayer(data.player) };
    if (fn === 'farm_area') return { ...data, plots: (data.plots || []).map(normPlot), player: normPlayer(data.player) };
    if (['register_player', 'login_player', 'login_as', 'buy', 'drink'].includes(fn)) return normPlayer(data);
    if (fn === 'heartbeat') return normPlayer(data);
    if (fn === 'ship') return { ...data, player: normPlayer(data.player), shipment: { ...data.shipment, pay_at: ms(data.shipment.pay_at) } };
    if (fn === 'place_furni' || fn === 'pick_furni') return { ...data, player: normPlayer(data.player) };
    if (fn === 'my_shipments') return (data || []).map((s) => ({ ...s, pay_at: ms(s.pay_at), created_at: ms(s.created_at) }));
    if (data && typeof data === 'object' && data.player) return { ...data, player: normPlayer(data.player) };
    return data;
  }
  async function select(table) {
    let q = sb.from(table).select('*');
    if (table === 'notes') q = q.order('created_at', { ascending: false }).limit(300);
    const { data, error } = await q;
    if (error) throw new Error(error.message);
    if (table === 'plots') return data.map(normPlot);
    if (table === 'notes') return data.map((n) => ({ ...n, created_at: ms(n.created_at) }));
    if (table === 'furniture') return data.map((r) => ({ ...r, placed_at: ms(r.placed_at) }));
    return data;
  }

  // Presence con tope: como mucho PRES_MAX envíos por ventana y solo si cambia algo que ven los demás
  function track(m) {
    meta = m;
    if (!ch || !ready || timer) return;
    const now = Date.now();
    sent = sent.filter((t) => now - t < PRES_WINDOW);
    timer = setTimeout(sendPresence, sent.length < PRES_MAX ? 300 : sent[0] + PRES_WINDOW - now + 500);
  }
  function sendPresence() {
    timer = null;
    if (!ch || !ready || !meta) return;
    const key = JSON.stringify(meta);
    if (key === lastKey) return;
    const now = Date.now();
    sent = sent.filter((t) => now - t < PRES_WINDOW);
    if (sent.length >= PRES_MAX) return track(meta);
    sent.push(now); lastKey = key;
    const c = ch;
    c.track({ ...meta }).then((r) => { if (r !== 'ok' && c === ch && lastKey === key) { lastKey = null; track(meta); } }, () => { if (c === ch) lastKey = null; });
  }
  async function open() {
    const g = ++gen;
    ready = false;
    const old = ch; ch = null;
    if (old) await sb.removeChannel(old).catch(() => {});
    for (const c of sb.getChannels()) if (c.topic === 'realtime:' + TOPIC) await sb.removeChannel(c).catch(() => {});
    if (g !== gen || !myKey) return;
    const c = sb.channel(TOPIC, { config: { presence: { key: myKey }, broadcast: { self: false } } });
    ch = c
      .on('presence', { event: 'sync' }, () => handlers.presence?.(c.presenceState()))
      .on('presence', { event: 'join' }, ({ key, currentPresences }) => { if (key !== myKey && !currentPresences?.length) handlers.join?.(key); })
      .on('broadcast', { event: '*' }, ({ event, payload }) => {
        if (['plot', 'furni', 'notes', 'players', 'animal'].includes(event)) handlers.db?.(event, event === 'plot' ? normPlot(payload) : payload);
        else handlers.broadcast?.(event, payload);
      })
      .subscribe((status, err) => {
        if (g !== gen) return;
        if (status === 'SUBSCRIBED') { ready = true; lastKey = null; sendPresence(); handlers.status?.('SUBSCRIBED'); return; }
        ready = false;
        console.warn('[paxinal] canal:', status, err || '');
        handlers.status?.(status);
        if (status === 'CLOSED') setTimeout(() => { if (g === gen && myKey) open(); }, 2000 + Math.random() * 2000);
      });
  }
  document.addEventListener('visibilitychange', () => { if (!document.hidden && myKey && (!ch || ch.state === 'closed')) open(); });
  addEventListener('online', () => { if (myKey && (!ch || ch.state === 'closed')) open(); });

  return {
    kind: 'supabase',
    async init() {},
    rpc, select, track,
    join(key, m, h) { myKey = key; meta = m; handlers = h; open(); },
    send(event, payload) { if (ch && ready) ch.send({ type: 'broadcast', event, payload }); },
    leave() { gen++; myKey = null; handlers = {}; const c = ch; ch = null; ready = false; clearTimeout(timer); timer = null; if (c) sb.removeChannel(c).catch(() => {}); },
    presenceState: () => (ch ? ch.presenceState() : {}),
  };
}
