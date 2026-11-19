// Páxinal Crossing · Eleccións a Paxineitor alcalde (evento de noviembre de 2026, parodia del 29N).
// Todo sale de la fecha: campaña desde el 19/11, votación abierta hasta el viernes 27/11 a las 13:00
// (el 28 y el 29 son fin de semana y no juega nadie), y el alcalde gobierna hasta el 4/12.
// Aquí están los partidos, los programas, lo que dice cada uno, a quién vota cada vecino y el recuento
// (11 concelleiros por D'Hondt y, si nadie llega a 6, pacto entre bloques).
// El servidor (net/local.js y supabase/schema.sql) repite las fechas de CAL y los regalos de PERKS.
import * as R from './rules.js';

export const CAL = { start: '2026-11-19', closeDay: '2026-11-27', closeHour: 13, end: '2026-12-04' };
export const startAt = () => R.dayStart(CAL.start);
export const closeAt = () => R.dayStart(CAL.closeDay) + CAL.closeHour * R.H;
export const endAt = () => R.dayStart(CAL.end) + 24 * R.H;
// off | campana | reflexion (la mañana del día de cierre) | goberno
export function phase(now) {
  if (now < startAt() || now >= endAt()) return 'off';
  if (now < R.dayStart(CAL.closeDay)) return 'campana';
  return now < closeAt() ? 'reflexion' : 'goberno';
}
export const canVote = (now) => ['campana', 'reflexion'].includes(phase(now));
export const SEATS = 11;
export const VOTE_PAY = 40;          // «dieta de participación» al votar (además de la chapa)
export const VOTE_GIFT = 'm_chapa';
export const URNA = { map: 'vila', x: 47, y: 35 };   // la puerta del Concello

export const PARTIDOS = [
  { id: 'pp', sigla: 'PP', name: 'Partido Paxinular', color: '#1E88E5', dark: '#12569C', bloque: 'dereita',
    cand: 'Alberto Núñez Paxijóo', short: 'Paxijóo', lema: 'Sentidiño. Ou non. Depende.',
    map: 'vila', mitin: [[10, 10.5]], stand: [35, 23], speed: 1.0, pause: 14,
    pts: [[25, 19, 1], [36, 19], [42, 18], [44, 17, 1], [42, 19], [33, 24], [29, 25], [21, 21, 1]],
    programa: [
      'Derrogar o «briefinguismo». Ninguén sabe o que é, pero derrógase.',
      'Baixar a permanencia de 12 meses a 11 e tres semanas. Rebaixa fiscal histórica.',
      'Un Excel para gobernalos a todos. Con macros. Protexido con contrasinal que ninguén lembra.',
      'Tren de Albacete: crearemos unha comisión que estude a creación dunha comisión.',
      'Xestión, xestión e xestión. ¿De que? Xa se verá. Pero xestión.',
      'Se gaño e non goberno, como a outra vez, quero polo menos a cadeira boa.',
    ],
    lines: [
      '¿Subo ou baixo? Depende. Ti vota e xa che digo.',
      'Eu xa gañei as últimas. Pero non me deixaron sentar.',
      'Hoxe levo gafas. Mañá, non. É a miña política de comunicación.',
      'Non é que non teña programa. É que está nun Excel protexido.',
      'Co sentidiño todo se arranxa. Menos a impresora.',
      'A gaivota non é miña. Pero se che rouba o bocadillo, a culpa é do goberno.',
    ],
    speech: ['¡Veciños! ¡Sentidiño!', 'Imos baixar a permanencia… tres semanas.', '¿Albacete? Unha comisión. Dúas, se fai falta.', 'Xestión. Xestión. E, sobre todo, xestión.', '¿Pactos? Depende.', 'Derrogaremos o briefinguismo. Sexa o que sexa.'] },
  { id: 'psoe', sigla: 'PSOE', name: 'Permanencia, SEO, Omnea y Excusas', color: '#E53935', dark: '#A31F1C', bloque: 'esquerda',
    cand: 'Pedro Paxánchez', short: 'Paxánchez', lema: 'Somos más (en primera página)',
    map: 'vila', mitin: [[12, 12.5]], stand: [35, 23], speed: 1.15, pause: 16,
    pts: [[29, 31], [29, 36], [27, 38, 1], [17, 38], [29, 37], [41, 38], [47, 37, 1], [41, 38], [41, 31], [29, 30]],
    programa: [
      'La Paguita Universal: 30 paxetas al día a todo el pueblo, por existir. A los vecinos inventados, también.',
      'Bono Café, Bono Grelo y Bono Regadera. Si se mueve, se le da un bono. Si no se mueve, una paguita.',
      'Paguita por regar y paguita por no regar. Aquí no se queda nadie atrás, ni en la página 2.',
      'Top 3 en Google para todos y todas, por Real Decreto.',
      'No pactaré jamás con Brais y Vanesa. (Punto sujeto a cambios de opinión.)',
      '¿Quién lo paga? Europa. Y si no, Contabilidad, que cuadra todo.',
    ],
    lines: [
      '¿Te ha llegado ya la paguita? ¿No? Vótame y te llegan dos.',
      'He cambiado de opinión. Otra vez. Yo a eso lo llamo permanencia.',
      'Me tomé cinco días de reflexión para leer un briefing. Sigo sin leerlo.',
      'Yo viajo en el único tren puntual del pueblo. Casualidad.',
      '¿Tienes gato? Paguita felina. ¿No tienes gato? Paguita por no tener gato.',
      'Mi libro: «Manual de permanencia». Doce meses, renovables. Como yo.',
    ],
    speech: ['¡Paguita para todos y todas!', '¡Y Bono Café! ¡Y Bono Grelo!', 'Somos más. En primera página.', '¿Quién lo paga? Europa.', 'No pactaré con los comerciales. Hoy.', '¡Una paguita por aplaudir! ¡Otra por no aplaudir!'] },
  { id: 'fa', sigla: 'FA', name: 'Frente Ampliable (según presupuesto)', color: '#D81B60', dark: '#8E1B4A', bloque: 'esquerda',
    cand: 'Ada Paxilau', short: 'Paxilau', lema: 'Otra reunión es posible',
    map: 'vila', mitin: [[17, 17.5]], stand: [35, 23], speed: 1.1, pause: 18,
    pts: [[33, 23, 1], [30, 19], [29, 26], [29, 30], [41, 31], [41, 38], [46, 44, 1], [55, 44, 1], [41, 46], [29, 40], [29, 31], [41, 26], [42, 19]],
    programa: [
      'Jornada de 4 días. El quinto, asamblea para decidir qué hacemos el quinto.',
      'Expropiar la cafetera buena de Gerencia y ponerla en la zona común.',
      'Tope al precio del grelo y alquiler social en las casas vacías de O Agro.',
      'Derecho a la desconexión: IPaxMsg apagado a las 15:00. Los jueves, a las 12:00.',
      'Toda decisión, por consenso. Llevamos reunidos desde el martes para aprobar el punto 1.',
      'El Frente es ampliable: con más presupuesto, más frente. Hoy somos varias siglas. Mañana, a saber.',
    ],
    lines: [
      'Compañeras, compañeros y compañeres de Paximiña…',
      'Esto lo votamos en asamblea a las 17:00. Trae silla.',
      'Hoy se nos ha escindido otra sigla. Seguimos siendo amplios.',
      'La cafetera de Gerencia es del pueblo. Y el azúcar, también.',
      'Esta reunión podía ser un correo. Por eso hacemos otra para debatirlo.',
      '¿Presupuesto? Depende de lo amplio que quieras el frente.',
    ],
    speech: ['¡Otra reunión es posible!', '¡La cafetera, para quien la trabaja!', 'Votemos si empezamos el mitin.', 'Hay una enmienda al orden del día.', '¡Viernes libre! El jueves lo hablamos.', 'Se abre turno de palabra. Tres horas.'] },
  { id: 'pax', sigla: 'PAX', name: 'PAX', color: '#43A047', dark: '#2A6B2E', bloque: 'dereita',
    cand: 'Santiago Abasfax', short: 'Abasfax', lema: 'Prioridad Paxinal',
    map: 'agro', mitin: [[11, 11.5], [16, 16.5]], stand: [4, 54], speed: 1.0, pause: 20, pet: 'vaca',
    pts: [[45, 56], [26, 56, 1], [8, 56], [4, 54, 1], [8, 56], [26, 56]],
    programa: [
      'Prioridad Paxinal: primero los de Pajimiña de Arosa. Y cerrar el chiringuito de RRSS.',
      'Reconquista de O Agro, leira a leira. Y cerrar el chiringuito de RRSS.',
      'Muro en el paso a nivel (lo paga Renfe). Y cerrar el chiringuito de RRSS.',
      'Brais y Vanesa, de vuelta en el tren de Albacete. Y cerrar el chiringuito de RRSS.',
      'Volver a la guía en papel de 1998, como Dios manda. Y cerrar el chiringuito de RRSS.',
      'Ver puntos del 1 al 5. Sobre todo, el final.',
    ],
    lines: [
      'Bajaremos el precio del grelo. ¿Cómo? Cerrando el chiringuito de RRSS.',
      '¿Que el tren de Albacete no llega? Pregunta en el chiringuito de RRSS.',
      'Prioridad Paxinal: primero los de Pajimiña. Después, los de Pajimiña. Los de RRSS, al final.',
      'Sígueme en TikTok, que ahí explico por qué hay que cerrar RRSS.',
      'Esta vaca es española. Rubia gallega, pero española.',
      '¿Llueve? Esto antes no pasaba. Antes de RRSS, digo.',
      'Ni un reel más con dinero público. Ni un carrusel. Ni un hashtag.',
    ],
    rrss: [
      '¿Tú eres de RRSS? Nada personal. Bueno, sí.',
      'Disfruta del chiringuito, que le quedan días.',
      '¿Me haces un reel para la campaña? Es para cerraros, pero con cariño.',
    ],
    speech: ['¡Prioridad Paxinal!', '¡Hay que cerrar el chiringuito de RRSS!', '¡Sal, Hashtag, que te veo!', '¡Ni un reel más!', '¡Primero los de Pajimiña de Arosa!', '¡La guía, en papel! ¡Y RRSS, cerrado!', '¡Es sentido común! ¡Y cerrar RRSS!'] },
];
export const PARTY = Object.fromEntries(PARTIDOS.map((p) => [p.id, p]));
export const candId = (pid) => 'cand_' + pid;

// Lo que el alcalde cumple de verdad: un regalo pequeño al día durante su semana (todos valen parecido,
// para que nadie vote por el premio). Lo demás queda «en estudio».
export const PERKS = {
  pp: { name: 'Rebaixa fiscal', desc: 'Un sobre con 30 paxetas. Sen factura. Non preguntes.', paxetas: 30 },
  psoe: { name: 'La Paguita', desc: '30 paxetas al día, por existir.', paxetas: 30 },
  fa: { name: 'Café expropiado', desc: 'Un café de la cafetera buena de Gerencia, que ya es del pueblo.', item: 'cafe', n: 1 },
  pax: { name: 'Producto paxinal', desc: 'Dos semillas de grelos de aquí, de toda la vida.', item: 'sem_grelos', n: 2 },
};

// Las 11 siglas del Frente Ampliable: cada día de campaña se escinde una (quedan 2 como poco)
export const SIGLAS = ['Sumar Pestañas', 'Más Paximiña', 'Izquierda Unida do Agro', 'Paximiña en Común', 'Los Verdes (de envidia)', 'Compromiso con el Café',
  'Chunta de Vecinos', 'Batzarre de Bateas', 'Iniciativa del Rego', 'Alianza del Viernes Intensivo', 'Asamblea Abierta (hasta las 15:00)'];
export const campaignDay = (now) => Math.max(0, Math.floor((Math.min(now, closeAt()) - startAt()) / R.DAY));
export function siglas(now) { const gone = Math.min(SIGLAS.length - 2, campaignDay(now)); return { left: SIGLAS.slice(0, SIGLAS.length - gone), gone: SIGLAS.slice(SIGLAS.length - gone).reverse() }; }

// ---------- a quién vota cada vecino (6-6-6-6: deciden los jugadores) ----------
// clave: id del departamento (su vecino inventado), id del vecino de A Vila o quién atiende un sitio
export const NPC_VOTES = {
  desarrollo_comercial: ['pp', 'Voto a Paxijóo: baixa a permanencia tres semanas. Iso, en quilómetros, é moito.'],
  telemarketing: ['pp', 'Paxijóo díxome «depende» catro veces seguidas. Iso é un cliente difícil. Respecto. Voto PP.'],
  administracion: ['pp', 'Como presidenta da mesa non podo dicilo. (Voto PP: son os únicos que entregan por triplicado.)'],
  contabilidad: ['pp', 'Paguiñas para todos… ¿e iso quen o cadra? Eu. Voto PP.'],
  uxia: ['pp', '¡Voto PP! ¡Non me pares! ¡É o único mitin que acaba a tempo!'],
  fermin: ['pp', 'Voto PP. Ese fala baixiño e de noite non esperta a ninguén.'],
  rrss: ['psoe', '¿A PAX? ¡Quérenme pechar o chiringuito! Voto PSOE, que polo menos dá paguiña. #NonAoPeche'],
  gcc: ['psoe', 'Chamáronme do PSOE para ofrecerme unha paguiña. Por unha vez non fun eu quen chamou. Vótoos.'],
  coordinacion: ['psoe', 'Teño un pósit que di «votar PSOE» e outro que di «cobrar paguiña». Vou por orde.'],
  pedro: ['psoe', 'Levo toda a semana repartindo propaganda. O voto por correo é cousa miña: PSOE, que me sobe a paguiña.'],
  diego: ['psoe', 'Bono Café, dicen. Si el Estado paga los cafés, yo voto PSOE con las dos manos.'],
  coop: ['psoe', 'Na cooperativa votamos PSOE: paguiña para as vacas, tamén.'],
  composicion: ['fa', 'Voto Frente Ampliable. Bloque 1: asemblea. Bloque 2: outra asemblea.'],
  marketing: ['fa', 'O Frente Ampliable é un funil: entran once siglas e converte unha. Vótoos por curiosidade.'],
  programacion: ['fa', 'Voto Frente Ampliable: é o único partido que escala. Horizontalmente.'],
  antia: ['fa', 'Voto Frente Ampliable. Prometen xornada de catro días e eu aínda non traballo.'],
  lola: ['fa', 'Eu voto Frente Ampliable. Pancho tamén quería votar, pero mordeu a papeleta.'],
  sabrina: ['fa', 'Yo, Frente Ampliable. Quieren expropiar la cafetera de Gerencia: menos competencia.'],
  edicion: ['pax', 'O programa de PAX non ten erratas: di seis veces o mesmo. Voto pola guía en papel.'],
  gerencia: ['pax', 'Queren expropiarme a cafeteira. A MIÑA cafeteira. Voto PAX e que pechen o que faga falta.'],
  maruxa: ['pax', 'Eu voto ao da vaca. Un home que pasea unha vaca é de fiar, filliña.'],
  xose: ['pax', 'Antes isto era todo leiras. Voto PAX, que queren que o volva ser.'],
  ramon: ['pax', 'O de PAX di que o xurelo é español. Mentres mo paguen na lonxa, vótoo.'],
  poxador: ['pax', 'Voto PAX. Prioridade Paxinal: primeiro o peixe de aquí.'],
  camarero: ['blanco', 'Mmm. (Enseña una papeleta en blanco. Por los dos lados.)'],
};
export const NPC_NULOS = 1;   // Pancho mordió la papeleta
export const npcLine = (key, now) => (phase(now) === 'campana' || phase(now) === 'reflexion' ? NPC_VOTES[key]?.[1] || null : null);
export function npcTally() {
  const t = { pp: 0, psoe: 0, fa: 0, pax: 0, blanco: 0 };
  for (const [p] of Object.values(NPC_VOTES)) t[p]++;
  return t;
}

// ---------- Brais y Vanesa, asesores de campaña a comisión: cada turno trabajan para quien mejor paga ----------
export function patron(who, now) {
  const afternoon = R.hourOf(now) >= 13.5;
  return PARTIDOS[(R.dayHash(R.dayKey(now), 77) + (who === 'vanesa' ? 2 : 0) + (afternoon ? 1 : 0)) % PARTIDOS.length];
}
export const comLines = (who, now) => {
  const p = patron(who, now), ref = phase(now) === 'reflexion';
  if (who === 'vanesa') return [
    ref ? 'Hoy es jornada de reflexión y no se puede pedir el voto. Esto no es pedir el voto: es una oferta.' : `Hoy llevo la campaña de ${p.sigla}. Mañana, la de quien pague. Soy muy de principios: los tengo todos.`,
    `Vota a ${p.short} y te regalo una papeleta premium. Con Omnea. Omnea también se presenta: Omnea es TODOS los partidos.`,
  ];
  return [
    ref ? 'Jornada de reflexión, sí, sí. Reflexiona conmigo: ¿y si votas a quien yo te diga?' : `¡Vota a ${p.short}! Hoy trabajo para ${p.sigla}. Esta tarde, igual no: es que van a comisión.`,
    'Tu voto, con permanencia de 12 meses. No se puede devolver ni cambiar. Y te regalo una web.',
  ];
};
export const CHASE = ['¡Espera, que te dejo el programa!', '¡Un voto! ¡Solo uno! ¡Con permanencia!', '¡Que es por tu bien y por mi comisión!', '¿Y un voto por correo? ¿Tampoco?', '¡Mira que el viernes cierran la urna!', '¡Te dejo una papeleta en el buzón!'];

// ---------- dónde está un candidato ahora ----------
// {map, route, t0} andando su ruta, {map, stand:[x, y], mitin|alcalde} parado, o null si no está.
// winner: el partido del alcalde (solo hace falta cuando ya gobierna).
export function candAt(p, now, winner = null) {
  const ph = phase(now), h = R.hourOf(now);
  if (h < 9 || h >= 19) return null;
  if (ph === 'campana') {
    if (p.mitin.some((w) => R.inHours(h, w))) return { map: p.map, stand: p.stand, mitin: true };
    return { map: p.map, route: 'v:' + candId(p.id), t0: R.dayStart(R.dayKey(now)) };
  }
  if (ph === 'goberno' && winner === p.id) return { map: 'vila', stand: [46, 36], alcalde: true };
  return null;
}
export const nextMitin = (p, now) => { const h = R.hourOf(now); const w = p.mitin.find((m) => m[1] > h); return w ? w[0] : null; };

// ---------- el sondeo del «CIS de Paxanos»: gana el PSOE pase lo que pase y nunca suma 100 ----------
export function sondeo(now) {
  const key = R.dayKey(now), out = {};
  PARTIDOS.forEach((p, i) => { out[p.id] = p.id === 'psoe' ? 38 + (R.dayHash(key, 410) % 9) : 14 + (R.dayHash(key, 411 + i) % 12); });
  return { pct: out, total: Object.values(out).reduce((a, b) => a + b, 0) };
}

// ---------- recuento ----------
// tally: los votos de los jugadores {pp, psoe, fa, pax, blanco}. Se suman los de los vecinos.
// 11 concelleiros por D'Hondt. Con 6 o más, mayoría absoluta; si no, gobierna el bloque con más concelleiros
// (derecha: PP y PAX; izquierda: PSOE y FA) y es alcalde el más votado de ese bloque.
export function resultado(tally = {}) {
  const npc = npcTally(), ids = PARTIDOS.map((p) => p.id), votes = {};
  for (const id of ids) votes[id] = npc[id] + (Number(tally[id]) || 0);
  const blanco = npc.blanco + (Number(tally.blanco) || 0);
  // empates: primero el partido del bloque con más votos y, si siguen igual, «por sorteo, como manda la
  // ley» (un orden fijo que sale de la fecha de cierre)
  const luck = Object.fromEntries(ids.map((id, i) => [id, R.dayHash(CAL.closeDay, 500 + i)]));
  const bloc = (id) => ids.filter((q) => PARTY[q].bloque === PARTY[id].bloque).reduce((n, q) => n + votes[q], 0);
  const better = (a, b) => votes[b] - votes[a] || bloc(b) - bloc(a) || luck[b] - luck[a];
  const seats = Object.fromEntries(ids.map((id) => [id, 0]));
  for (let s = 0; s < SEATS; s++) {
    const best = [...ids].sort((a, b) => votes[b] / (seats[b] + 1) - votes[a] / (seats[a] + 1) || better(a, b))[0];
    seats[best]++;
  }
  const order = [...ids].sort(better), first = order[0];
  const half = Math.floor(SEATS / 2) + 1;
  let alcalde = first, pact = null;
  if (seats[first] < half) {
    const bs = (b) => ids.filter((id) => PARTY[id].bloque === b), sum = (b) => bs(b).reduce((n, id) => n + seats[id], 0);
    const bloque = sum('dereita') > sum('esquerda') ? 'dereita' : 'esquerda';
    const socios = bs(bloque).sort(better);
    alcalde = socios[0];
    pact = { bloque, socios, seats: sum(bloque),
      text: bloque === 'dereita'
        ? 'Pacto da Leira: PP y PAX suman y gobiernan juntos. PAX pide a cambio cerrar el chiringuito de RRSS; el PP contesta que «depende».'
        : 'Pacto de la Paguita Ampliable: PSOE y Frente Ampliable gobiernan juntos, tras una asamblea de 14 horas y con el presupuesto ya ampliado.' };
  }
  const players = ids.reduce((n, id) => n + (Number(tally[id]) || 0), 0) + (Number(tally.blanco) || 0);
  return { votes, blanco, nulos: NPC_NULOS, seats, order, first, alcalde, pact, absoluta: seats[first] >= half, robbed: alcalde !== first ? first : null, players,
    total: ids.reduce((n, id) => n + votes[id], 0) + blanco + NPC_NULOS };
}
