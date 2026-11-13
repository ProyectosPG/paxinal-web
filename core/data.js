// Páxinal Crossing · datos del juego (los mismos números están en supabase/schema.sql: si se
// cambia un precio o un tiempo aquí, hay que cambiarlo también allí).

export const TOWN = 'Paximiña de Arousa';
export const CURRENCY = 'paxetas';
export const ENERGY_MAX = 100;
export const START_PAXETAS = 500;

// ---------- departamentos ----------
// prio: orden de las parcelas en O Agro (las de los que más van a jugar, cerca de la entrada).
// npc: el vecino inventado que vive en la casa mientras no hay nadie del departamento.
export const DEPTS = [
  { id: 'desarrollo_comercial', name: 'Desarrollo Comercial', short: 'D. COMERCIAL', color: '#E53935', sign: ['DESARROLLO', 'COMERCIAL'], desk: 'phone',
    npc: { name: 'Rutiña', look: { skin: 1, hair: 4, style: 'corto' }, extras: ['tie:#1565C0', 'case'],
      lines: ['Hoxe fixen 300 km e tres visitas. Unha delas, a min mesma.', 'Este mapa ten tantas chinchetas que xa non se ve Galicia.', '¿Ti tamén vés polo coche de empresa? Está no taller. Sempre.'] } },
  { id: 'composicion', name: 'Composición', short: 'COMPOSICIÓN', color: '#1E88E5', sign: ['COMPOSICIÓN'], desk: 'pc',
    npc: { name: 'Bloquiño', look: { skin: 0, hair: 2, style: 'rizos' }, extras: ['glasses'],
      lines: ['Eu non falo: compoño. Bloque 1: ola. Bloque 2: que tal.', 'Teño 40 pestanas abertas e ningunha é a que busco.', 'Isto quedaría mellor cun H2.'] } },
  { id: 'rrss', name: 'RRSS', short: 'RRSS', color: '#00B8D4', sign: ['RRSS'], desk: 'pc',
    npc: { name: 'Hashtag', look: { skin: 2, hair: 7, style: 'mono' }, extras: ['sunglasses'],
      lines: ['¡Espera, que lle saco unha foto ao grelo! #agro #paximiña', 'O algoritmo de Instagram cambiou outra vez. Xa van tres hoxe.', 'Isto en carrusel petaríao.'] } },
  { id: 'gcc', name: 'GCC', short: 'GCC', color: '#FDD835', sign: ['GCC'], desk: 'redphone',
    npc: { name: 'Ring-Ring', look: { skin: 1, hair: 1, style: 'largo' }, extras: ['badge'],
      lines: ['¿Diga? ¿Diga? Ah, non, era o despertador.', 'Este cuestionario ten 48 preguntas. Imos pola 3.', 'O teléfono vermello só soa cando estou no baño.'] } },
  { id: 'edicion', name: 'Edición', short: 'EDICIÓN', color: '#00897B', sign: ['EDICIÓN'], desk: 'papers',
    npc: { name: 'Dona Lupa', look: { skin: 0, hair: 6, style: 'mono' }, extras: ['glasses'],
      lines: ['Isto ten unha errata. E isto. E iso tamén.', 'Na guía de 1998 isto saía en amarelo.', 'O rotulador vermello é o meu mellor amigo.'] } },
  { id: 'marketing', name: 'Marketing', short: 'MARKETING', color: '#D81B60', sign: ['MARKETING'], desk: 'pc',
    npc: { name: 'Embudiño', look: { skin: 3, hair: 0, style: 'corto' }, extras: ['lanyard'],
      lines: ['Isto non é unha leira: é un funil de conversión.', '¿Viches as visitas de onte? Subiron un 3 %. ¡Festa!', 'Plantei palabras clave na posición 50. Xa veremos.'] } },
  { id: 'coordinacion', name: 'Coordinación', short: 'COORDINACIÓN', color: '#FB8C00', sign: ['COORDINACIÓN'], desk: 'papers',
    npc: { name: 'Dona Pósit', look: { skin: 1, hair: 3, style: 'largo' }, extras: [],
      lines: ['Teño un pósit para cada cousa. E un pósit cos pósits.', '¿Quen colle isto? Ninguén? Pois para o martes.', 'O calendario ten máis frechas que días.'] } },
  { id: 'telemarketing', name: 'Telemarketing', short: 'TELEMARKETING', color: '#AFB42B', sign: ['TELEMARKETING'], desk: 'phone',
    npc: { name: 'Centralita', look: { skin: 2, hair: 5, style: 'rizos' }, extras: [],
      lines: ['Bos días, chámolle de Paximiña… ¿colgou? Colgou.', 'Hoxe levo 120 chamadas. A 121 é a boa.', '¡GONG! Iso foi unha venda. Ou a porta.'] } },
  { id: 'administracion', name: 'Administración', short: 'ADMINISTRACIÓN', color: '#8E24AA', sign: ['ADMINISTRACIÓN'], desk: 'papers',
    npc: { name: 'Dona Firmina', look: { skin: 0, hair: 1, style: 'mono' }, extras: ['glasses'],
      lines: ['¿Trae o selo? Sen selo non hai paraíso.', 'Isto está pendente de sinatura dende o 2019.', 'Por triplicado, por favor.'] } },
  { id: 'contabilidad', name: 'Contabilidad', short: 'CONTABILIDAD', color: '#43A047', sign: ['CONTABILIDAD'], desk: 'calc',
    npc: { name: 'Don Cadrado', look: { skin: 1, hair: 6, style: 'corto' }, extras: ['mustache', 'glasses'],
      lines: ['Cadra. Todo cadra. Ata o que non cadra, cadra.', 'Unha paxeta é unha paxeta. Dúas, dúas.', '¿Trae a factura do grelo?'] } },
  { id: 'programacion', name: 'Programación', short: 'PROGRAMACIÓN', color: '#3949AB', sign: ['PROGRAMACIÓN'], desk: 'pc',
    npc: { name: 'Bugoberto', look: { skin: 1, hair: 4, style: 'rizos' }, extras: ['sunglasses'],
      lines: ['Na miña máquina funciona.', 'Iso non é un bug: é unha funcionalidade non documentada.', 'O rack zoa. Se deixa de zoar, preocúpate.'] } },
  { id: 'gerencia', name: 'Gerencia', short: 'GERENCIA', color: '#6D4C41', sign: ['GERENCIA'], desk: 'boss',
    npc: { name: 'O Inspector', look: { skin: 0, hair: 6, style: 'corto' }, extras: ['tie:#6D4C41', 'mustache'],
      lines: ['Vin inspeccionar a decoración. Un 6. Pódese mellorar.', 'A cafeteira boa é a miña. Que conste.', 'Isto no meu tempo facíase en papel.'] } },
];
export const OTHERS = { id: 'otros', name: 'Otros', short: 'OUTROS', color: '#9E9E9E' };
export const DEPT_BY_ID = Object.fromEntries([...DEPTS, OTHERS].map((d) => [d.id, d]));
export const deptColor = (id) => DEPT_BY_ID[id]?.color || '#9E9E9E';
export const deptName = (id) => DEPT_BY_ID[id]?.name || id || 'sin departamento';

// ---------- cultivos ----------
// hours: horas de riego hasta la cosecha · regrow: horas hasta la siguiente (perennes)
// paid: no se riega, se paga (tráfico de Ads) · season: temporada (vende un 25 % más en ella)
export const CROPS = {
  grelos: { name: 'Grelos', seed: 'sem_grelos', product: 'grelos', hours: 96, season: 'inverno', note: 'El básico de invierno.' },
  patacas: { name: 'Patacas', seed: 'sem_patacas', product: 'patacas', hours: 120, season: 'primavera', note: 'Para el caldo y para todo.' },
  pementos: { name: 'Pementos de Padrón', seed: 'sem_pementos', product: 'pementos', hours: 144, season: 'verao', note: 'Unos pican y otros no (uno de cada diez).' },
  palabra: { name: 'Palabras clave', seed: 'sem_palabra', product: 'palabra_top', hours: 168, note: 'Nacen en la posición 50 y suben cada día que se riegan. Si no, bajan a la página 2.' },
  organico: { name: 'Tráfico orgánico', seed: 'sem_organico', product: 'organico', hours: 336, regrow: 168, note: 'Lento, pero da cosecha cada semana para siempre.' },
  ads: { name: 'Tráfico de Ads', seed: 'sem_ads', product: 'clics', hours: 24, regrow: 24, paid: 12, note: 'Sale al día siguiente, pero hay que pagarlo cada día. La lluvia no paga a Google.' },
  resenas: { name: 'Reseñas de 5 estrellas', seed: 'sem_resenas', product: 'resena', hours: 120, note: 'Flores que atraen clientes. De vez en cuando sale una de una estrella.' },
  omnea: { name: 'Omnea', seed: 'sem_omnea', product: 'omnea', hours: 168, note: 'Omnea es TODO: cada vez que se cosecha sale algo distinto.' },
};
export const WATER_HOURS = 24;   // un riego dura 24 h

// ---------- objetos ----------
// kind: tool | seed | produce | drink | furni · price: lo que cuesta en la tienda · sell: lo que pagan en la caja de envíos
export const ITEMS = {
  azada: { name: 'Azada', kind: 'tool', desc: 'Para arar la hierba de tu parcela (o quitar lo plantado).' },
  regadera: { name: 'Regadera', kind: 'tool', desc: 'Para regar. Un riego dura 24 horas.' },
  // (auditoría A05) mejoras de las herramientas: se compran en la cafetería y la azada y la regadera de la
  // barra trabajan entonces varias casillas de una vez (lo que dice TOOL_AREA), con la energía de todas
  regadera_cobre: { name: 'Regadera de cobre', kind: 'tool', price: 400, shop: 'cafe', desc: 'Riega 3 casillas en línea de una vez (la de delante y las dos siguientes). 1 de energía por casilla.' },
  regadera_grande: { name: 'Regadera grande', kind: 'tool', price: 1200, shop: 'cafe', desc: 'Riega 3×3 casillas de una vez, hacia delante. 1 de energía por casilla.' },
  azada_boa: { name: 'Azada buena', kind: 'tool', price: 500, shop: 'cafe', desc: 'Ara 3 casillas de hierba en línea de una vez. 2 de energía por casilla.' },
  sem_grelos: { name: 'Semillas de grelos', kind: 'seed', crop: 'grelos', price: 20, shop: 'cafe' },
  sem_patacas: { name: 'Semillas de patacas', kind: 'seed', crop: 'patacas', price: 30, shop: 'cafe' },
  sem_pementos: { name: 'Semillas de pementos', kind: 'seed', crop: 'pementos', price: 40, shop: 'cafe' },
  sem_palabra: { name: 'Semillas de palabras clave', kind: 'seed', crop: 'palabra', price: 60, shop: 'cafe' },
  sem_organico: { name: 'Semillas de tráfico orgánico', kind: 'seed', crop: 'organico', price: 150, shop: 'cafe' },
  sem_ads: { name: 'Semillas de tráfico de Ads', kind: 'seed', crop: 'ads', price: 40, shop: 'cafe' },
  cafe: { name: 'Café', kind: 'drink', price: 15, energy: 40, shop: 'cafe', desc: '+40 de energía. El de Diego y Sabrina, del bueno.' },
  cafe_bonsai: { name: 'Café del Bonsai', kind: 'drink', price: 10, energy: 10, shop: 'bonsai', desc: '+10 de energía. Sabe a cenicero, pero a estas horas es lo único abierto.' },
  grelos: { name: 'Grelos', kind: 'produce', sell: 70, season: 'inverno' },
  patacas: { name: 'Patacas', kind: 'produce', sell: 95, season: 'primavera' },
  pementos: { name: 'Pementos de Padrón', kind: 'produce', sell: 115, season: 'verao' },
  pemento_picante: { name: 'Pemento que pica', kind: 'produce', sell: 250, desc: 'Este pica. Mucho.' },
  palabra_top: { name: 'Palabra clave (top 3)', kind: 'produce', sell: 260 },
  palabra_p1: { name: 'Palabra clave (1.ª página)', kind: 'produce', sell: 120 },
  palabra_p2: { name: 'Palabra clave (2.ª página)', kind: 'produce', sell: 40, desc: 'En la página 2 ya no la ve nadie.' },
  organico: { name: 'Visitas orgánicas', kind: 'produce', sell: 70 },
  clics: { name: 'Clics de Ads', kind: 'produce', sell: 30 },
  sem_resenas: { name: 'Semillas de reseñas de 5 estrellas', kind: 'seed', crop: 'resenas', price: 80, shop: 'comercial', desc: 'Con permanencia de 12 meses. Y letra pequeña.' },
  sem_omnea: { name: 'Semilla omnea', kind: 'seed', crop: 'omnea', price: 150, shop: 'comercial', desc: 'Omnea es TODO. Es el principio y el fin. Lo que salga, sale.' },
  resena: { name: 'Reseña de 5 estrellas', kind: 'produce', sell: 150, desc: '«Muy buen trato, volveremos.»' },
  resena_mala: { name: 'Reseña de 1 estrella', kind: 'produce', sell: 5, desc: '«No me cogieron el teléfono.» Nadie la quiere.' },
  // pesca: la caña se compra en la lonxa; el pescado se vende allí (o en la caja de envíos)
  cana: { name: 'Caña de pescar', kind: 'tool', price: 80, shop: 'lonxa', desc: 'Para pescar en el peirao, en la playa o en el rego de O Agro. Cada lance gasta 2 de energía.' },
  xurelo: { name: 'Xurelo', kind: 'fish', sell: 25 },
  sardina: { name: 'Sardiña', kind: 'fish', sell: 20 },
  xarda: { name: 'Xarda', kind: 'fish', sell: 30 },
  robaliza: { name: 'Robaliza', kind: 'fish', sell: 80 },
  polbo: { name: 'Polbo', kind: 'fish', sell: 110 },
  choco: { name: 'Choco', kind: 'fish', sell: 70 },
  centola: { name: 'Centola', kind: 'fish', sell: 220 },
  necora: { name: 'Nécora', kind: 'fish', sell: 150 },
  xurelo_ouro: { name: 'O Xurelo de Ouro', kind: 'fish', sell: 1000, desc: 'El pez legendario de la ría. Dicen que solo sale con la marea de los viernes. O cuando quiere.' },
  troita: { name: 'Troita', kind: 'fish', sell: 60 },
  anguia: { name: 'Anguía', kind: 'fish', sell: 120 },
  rato_bola: { name: 'Ratón de bola', kind: 'trash', sell: 2, desc: 'Con su bolita y todo.' },
  disquete: { name: 'Disquete de 3½', kind: 'trash', sell: 2, desc: 'Pone «COPIA SEGURIDAD 2003». Mejor no mirar.' },
  cd_instalacion: { name: 'CD de instalación', kind: 'trash', sell: 2, desc: '«Instale aquí su acceso a Internet.»' },
  pendrive: { name: 'Pendrive', kind: 'trash', sell: 3, desc: 'Dentro: propuesta_final_v7_DEFINITIVA.docx' },
  guia_1998: { name: 'Página de la guía de 1998', kind: 'trash', sell: 5, desc: 'Sección «Fontaneros». Alguien la echará de menos.' },
  folleto_vanesa: { name: 'Folleto de Vanesa', kind: 'trash', sell: 1, desc: '«Omnea: omnipresencia en el ecosistema algorítmico.»' },
  tarxeta_mollada: { name: 'Tarjeta de visita mojada', kind: 'trash', sell: 1, desc: 'Se lee «…ales de Páxinas Galeg…».' },
  bota: { name: 'Bota de agua', kind: 'trash', sell: 2, desc: 'Solo la izquierda.' },
  // animales: el pienso se compra en la cooperativa de O Agro y lo que dan se vende en la caja de envíos
  pienso: { name: 'Saco de pienso', kind: 'feed', price: 5, shop: 'cooperativa', desc: 'Una ración por animal y día. Sin pienso no dan nada (pero tampoco se ponen malos).' },
  ovo: { name: 'Huevo (lead)', kind: 'produce', sell: 25, desc: 'Un lead fresquito. Hay que llamarlo antes de que se enfríe.' },
  leite: { name: 'Leche de rubia gallega', kind: 'produce', sell: 70 },
  la: { name: 'Lana', kind: 'produce', sell: 110 },
};
export const SEASON_BONUS = 1.25;
// (A05) qué hace cada mejora: la herramienta de la barra a la que mejora, la forma (línea de 3 hacia delante
// o cuadrado de 3×3 hacia delante) y cuántas casillas como mucho. Gana la mejor que tengas. El servidor
// (farm_area en local.js y schema.sql) acepta como mucho esas casillas con esa mejora en la mochila.
export const TOOL_AREA = {
  regadera_grande: { tool: 'regadera', action: 'water', shape: 'square', max: 9 },
  regadera_cobre: { tool: 'regadera', action: 'water', shape: 'line', max: 3 },
  azada_boa: { tool: 'azada', action: 'till', shape: 'line', max: 3 },
};
// la mejor mejora que tiene el jugador para esa herramienta de la barra (o null)
export const toolUpgrade = (inv, tool) => Object.keys(TOOL_AREA).find((k) => TOOL_AREA[k].tool === tool && (inv?.[k] || 0) > 0) || null;

// ---------- muebles ----------
// art: receta para el pintor (worldart/officeart/townart) · w,h: huella en casillas · wall: va en la pared
// Se compran en el catálogo de cada casa (la guía de Páxinas Galegas de 1998, reconvertida).
export const FURNI = [
  { id: 'planta', name: 'Planta', price: 40, art: { kind: 'plant' } },
  { id: 'papeles', name: 'Pila de papeles', price: 20, art: { kind: 'paper_stack', variant: 1 } },
  { id: 'papeles_big', name: 'Montaña de papeles', price: 35, art: { kind: 'paper_stack', variant: 2 } },
  { id: 'caixas', name: 'Cajas de albariño', price: 30, art: { kind: 'crates' } },
  { id: 'cabaza', name: 'Calabaza de Samaín', price: 25, art: { kind: 'pumpkin', variant: 0 } },
  { id: 'seto', name: 'Seto con flores', price: 35, art: { kind: 'bush', variant: 'pink' } },
  { id: 'archivador', name: 'Archivador', price: 90, art: { kind: 'cabinet' } },
  { id: 'fuente', name: 'Fuente de agua', price: 120, art: { kind: 'cooler' } },
  { id: 'impresora', name: 'Impresora (atascada)', price: 150, art: { kind: 'printer' } },
  { id: 'cafetera', name: 'Cafetera', price: 200, art: { kind: 'coffee_machine' } },
  { id: 'rack', name: 'Rack de servidores', price: 300, art: { kind: 'server_rack' } },
  { id: 'aro', name: 'Aro de luz', price: 160, art: { kind: 'ringlight' } },
  { id: 'tripode', name: 'Trípode con móvil', price: 110, art: { kind: 'tripod_phone' } },
  { id: 'atril', name: 'Atril', price: 90, art: { kind: 'lectern' } },
  { id: 'barril', name: 'Barril de albariño', price: 70, art: { kind: 'barrel', variant: 1 } },
  { id: 'taboleiro', name: 'Tablero de corcho', price: 60, art: { kind: 'dept_board' } },
  { id: 'sofa', name: 'Sofá', price: 220, w: 2, art: { kind: 'sofa' } },
  { id: 'estanteria', name: 'Estantería', price: 180, w: 2, art: { kind: 'bookshelf', w: 2 } },
  { id: 'mesa_cafe', name: 'Mesa con sillas', price: 140, w: 2, art: { kind: 'table_in' } },
  { id: 'banco', name: 'Banco do parque', price: 80, w: 2, art: { kind: 'bench' } },
  { id: 'pantalla', name: 'Pantallón', price: 260, w: 2, art: { kind: 'pc_big' } },
  { id: 'mesa_grande', name: 'Mesa de reuniones', price: 350, w: 4, h: 2, art: { kind: 'table_big', w: 4, h: 2 } },
  { id: 'reloxo', name: 'Reloj de pared', price: 50, wall: true, art: { kind: 'wall_deco', variant: 'clock' } },
  { id: 'cadro', name: 'Cuadro', price: 70, wall: true, art: { kind: 'wall_deco', variant: 'photo' } },
  { id: 'pizarra', name: 'Pizarra blanca', price: 120, wall: true, w: 2, art: { kind: 'wall_deco', variant: 'whiteboard', w: 2 } },
  { id: 'menu', name: 'Pizarra del menú', price: 60, wall: true, w: 3, art: { kind: 'wall_deco', variant: 'menu', w: 3 } },
  { id: 'bonsai', name: 'Bonsái', price: 90, art: { kind: 'bonsai_plant' } },
  { id: 'web', name: 'Web corporativa (enmarcada)', price: 300, wall: true, w: 2, shop: 'comercial', art: { kind: 'web_frame' } },
  { id: 'ficha', name: 'Ficha de Google Maps', price: 120, wall: true, shop: 'comercial', art: { kind: 'ficha_frame' } },
];
export const FURNI_BY_ID = Object.fromEntries(FURNI.map((f) => [f.id, { w: 1, h: 1, ...f }]));
for (const f of FURNI) ITEMS['m_' + f.id] = { name: f.name, kind: 'furni', price: f.price, shop: f.shop || 'catalogo', furni: f.id };
// la semilla omnea da cualquier cosa al cosecharla (un cultivo, un mueble…): «omnea es todo»
export const OMNEA_LOOT = ['grelos', 'patacas', 'pementos', 'palabra_top', 'organico', 'clics', 'resena', 'm_planta', 'm_bonsai', 'm_cafetera', 'm_rack', 'm_sofa', 'm_cadro'];

// ---------- casas por dentro (las mismas medidas en el servidor) ----------
// Pared arriba (filas 0-2), mesas en dos filas de 5 puestos, zona común abajo y la puerta en la fila 14.
// En la pared se cuelgan cosas en la fila 1, salvo donde están las ventanas y el pendón.
export const HOUSE = {
  w: 22, h: 15, door: [10, 14], deskW: 4, deskH: 2, slots: 10, common: { x: 1, y: 10, w: 20, h: 3 },
  wallY: 1, wallBusy: [[2, 3], [9, 12], [18, 19]], catalog: [14, 13],
};
export const deskZone = (slot) => ({ x: 1 + (slot % 5) * 4, y: 4 + Math.floor(slot / 5) * 3, w: HOUSE.deskW, h: HOUSE.deskH });

// ---------- parcelas (las mismas medidas en el servidor) ----------
export const FIELD = { w: 8, h: 5 };
// La leira que cuida el vecino mientras la casa está vacía: 6 de grelos (fila 1) y 6 de patacas (fila 2).
// Cuando el primer jugador de la casa se da de alta pasan a ser parcelas de verdad, listas para cosechar
// (supabase/schema.sql, register_player, hace lo mismo). Quien llega a una casa que ya tiene gente no
// recibe cosecha, pero sus 2 semillas de palabras clave pasan a ser de tráfico de Ads (salen en 24 h).
export const GIFT_PLOTS = [[1, 'grelos'], [2, 'patacas']].flatMap(([y, crop]) => [1, 2, 3, 4, 5, 6].map((x) => ({ x, y, crop })));
export const START_INV = { azada: 1, regadera: 1, sem_grelos: 6, sem_palabra: 2, cafe: 1 };
export const START_INV_JOIN = { azada: 1, regadera: 1, sem_grelos: 6, sem_ads: 2, cafe: 1 };

// ---------- cafetería ----------
export const CAFE_HOURS = [7, 22];   // abre de 7:00 a 22:00 (hora de Galicia)
export const DIEGO = { name: 'Diego', look: { skin: 1, hair: 0, style: 'corto' }, shirt: '#FFFFFF', extras: ['apron', 'mustache'] };
export const SABRINA = { name: 'Sabrina', look: { skin: 1, hair: 4, style: 'largo' }, shirt: '#FFFFFF', extras: ['apron'] };
export const CAFE_LINES = [
  '¡Epa! ¿Qué va a ser? ¿Un café con leche y unas semillas de grelos?',
  'Hoy las arepas salieron chéveres. Ah, que esto es una granja, chamo.',
  'Las semillas de palabras clave se venden muchísimo. Nadie sabe muy bien para qué son.',
  'El tren de la noche se lleva lo que dejes en la caja de envíos. Se cobra al día siguiente. Pago a 30 días… es broma.',
];
export const CLOSED_LINES = ['Cerrado. Abrimos a las 7:00. A estas horas solo queda el Bonsai… y el camarero no está para fiestas.'];

// ---------- Café Bonsai: abre de noche, cuando cierra la cafetería ----------
export const BONSAI_HOURS = [22, 7];   // de 22:00 a 7:00
export const WAITER = { name: 'Camarero', look: { skin: 1, hair: 4, style: 'corto' }, shirt: '#3A3A48', extras: ['mustache'] };
export const GRUNTS = ['Mmm.', 'Grrf.', '…', '¿Qué?', 'Hmpf.', 'Ya.', 'Mm-hm.', '…café.', 'Bfff.'];
export const BONSAI_DAYS = 30;   // días distintos tomando café aquí para que te dé los buenos días
export const BONSAI_CLOSED = 'Café Bonsai. Cerrado. Abre de noche, cuando cierra la cafetería de Diego y Sabrina. Desde dentro se oye: «Mmm. Grrf.»';

// ---------- comerciales: Brais y Vanesa ----------
// Llegan en tren por la mañana (9:00), uno pasea por A Vila y otro por O Agro, comen en la terraza de la
// cafetería (13:30-14:30), se cambian de zona por la tarde y se van a las 19:00. Todos los ven en el mismo sitio.
export const COMERCIALES = [
  { id: 'brais', name: 'Brais', look: { skin: 1, hair: 0, style: 'corto' }, shirt: '#2B3A55', extras: ['tie:#C62828', 'case'],
    sells: ['sem_resenas', 'm_web', 'm_ficha'],
    lines: ['¿Sale tu negocio en Google Maps? ¿No? Pues tengo justo lo que necesitas.', '¡Una web! Con permanencia de 12 meses, nada, ni lo notas.', 'Tengo una oferta solo por hoy… como ayer. Y como mañana.', 'Esto con una web vendería el triple. Hasta a las vacas se lo vendo.'] },
  { id: 'vanesa', name: 'Vanesa', look: { skin: 0, hair: 5, style: 'largo' }, shirt: '#4A4F5A', extras: ['tie:#1565C0', 'case', 'glasses'],
    sells: ['sem_omnea', 'sem_resenas', 'm_web'],
    lines: ['Omnea, ¿alguien quiere Omnea?', 'Omnea es TODO. Es el principio y el fin.', '¡Reseñas! ¡Tengo reseñas de cinco estrellas!', '¿Que qué es Omnea? Ay, eso te lo explico otro día en el andén.'] },
];
export const CHASE_LINES = ['¡Espera, que es solo por hoy!', '¡No te vayas sin tu web!', '¡Que te hago precio!', '¿Y una ficha de Google? ¿Tampoco?', '¡Mira que mañana sube!', 'Te dejo mi tarjeta, ¿eh?'];
export const DEAL_ITEMS = ['sem_resenas', 'sem_omnea', 'm_web', 'm_ficha'];   // la «oferta solo por hoy» sale de aquí (30 % menos)
// rutas (casillas por las que pasan; un 1 al final = parada para vender) que el mundo une por el camino más corto
export const ROUTES = {
  vila: { speed: 1.25, pause: 25, pts: [[60, 10], [44, 10], [42, 12], [42, 18], [36, 19], [25, 19, 1], [28, 24], [29, 30], [29, 34, 1], [29, 38], [41, 38], [47, 37, 1], [66, 37], [69, 44], [55, 46, 1], [43, 46], [41, 30], [42, 26], [42, 18], [50, 17, 1]] },
  agro: { speed: 1.25, pause: 25, pts: [[45, 61], [45, 56], [26, 56, 1], [8, 56], [45, 56], [45, 40], [60, 40, 1], [82, 40], [45, 40], [45, 16], [30, 16, 1], [8, 16], [60, 16, 1], [86, 16], [45, 16], [45, 40], [45, 61]] },
};
export const LUNCH = { brais: [21, 19], vanesa: [29, 19] };

// ---------- vecinos de A Vila (auditoría A11) ----------
// Pasean por su ruta (casillas unidas por el camino más corto; un 1 al final = parada) en sus horas.
// Como los comerciales, la posición sale de la hora: todos los jugadores los ven en el mismo sitio.
// hours: tramos [desde, hasta) en horas de Galicia (de 23 a 6 = de noche). De 8:00 a 21:00 siempre hay
// al menos cuatro por la calle; de noche, uno o dos. dog: lleva el can detrás.
export const VECINOS = [
  { id: 'maruxa', map: 'vila', name: 'Dona Maruxa', look: { skin: 0, hair: 6, style: 'mono' }, shirt: '#8E3B7A', extras: ['glasses'],
    hours: [[8.5, 13.5], [15, 20]], speed: 0.9, pause: 18,
    pts: [[10, 19], [19, 19], [24, 23, 1], [27, 19, 1], [36, 23], [44, 17, 1], [42, 19], [33, 24], [29, 25], [21, 21, 1], [10, 19]],
    lines: ['Vou á praza. Os grelos están a prezo de ouro, filliña.', '¿Ti tamén traballas en Páxinas? Meu neto fai webs. Ou iso di.', 'Na miña época os anuncios ían no xornal e chegaba.', 'Diego pon o café moi forte. A min gústame así.'] },
  { id: 'xose', map: 'vila', name: 'Don Xosé', look: { skin: 1, hair: 6, style: 'corto' }, shirt: '#5D4037', extras: ['cap:#3E2723', 'mustache'],
    hours: [[10, 20.5]], speed: 0.7, pause: 30,
    pts: [[29, 31], [29, 36], [27, 38, 1], [17, 38], [8, 38, 1], [3, 38], [16, 37], [29, 37], [31, 33, 1], [29, 30]],
    lines: ['Neste banco levo sentado dende o 87.', 'O pato do estanque é de goma, pero eu fálolle igual.', '¿Sabes cal é o segredo dunha vida longa? Non ler os correos.', 'Antes isto era todo leiras. Agora tamén, pero con wifi.'] },
  { id: 'pedro', map: 'vila', name: 'Pedro o carteiro', look: { skin: 2, hair: 0, style: 'corto' }, shirt: '#F2C12E', extras: ['cap:#1565C0', 'case'],
    hours: [[8, 15]], speed: 1.1, pause: 8,
    pts: [[38, 19], [15, 18, 1], [9, 18, 1], [3, 18, 1], [0, 22], [3, 25, 1], [9, 25, 1], [15, 25, 1], [28, 25], [41, 31], [47, 36, 1], [55, 36, 1], [63, 36, 1], [42, 37], [38, 19]],
    lines: ['Carta para o barrio do Carme. Outra vez propaganda de Omnea.', 'Hoxe só levo facturas. Ninguén me quere.', 'Se ves un can solto, avisa. É persoal.', 'Unha carta certificada para Páxinas. ¿Ti asinas? Non, mellor non.'] },
  { id: 'antia', map: 'vila', name: 'Antía', look: { skin: 1, hair: 7, style: 'largo' }, shirt: '#00B8D4', extras: [],
    hours: [[11, 21]], speed: 1.15, pause: 22,
    pts: [[60, 18], [50, 18], [42, 20], [33, 23, 1], [30, 19], [29, 26], [29, 30], [41, 31], [41, 38], [46, 44, 1], [55, 44, 1], [62, 44], [41, 46], [30, 46, 1], [29, 40], [29, 31], [41, 26], [42, 19], [60, 18]],
    lines: ['Estou de exames. Bueno, estou na praza.', '¿Tedes wifi na cafetería? É para un traballo. De TikTok.', 'O tren de Santiago chegou puntual. Fixen captura, ninguén me cre.', 'Na Xeadería hai xeado de polbo. Non o recomendo.'] },
  { id: 'uxia', map: 'vila', name: 'Uxía', look: { skin: 3, hair: 4, style: 'mono' }, shirt: '#E53935', extras: ['sunglasses'],
    hours: [[7, 10], [17.5, 21]], speed: 2.6, pause: 0,
    pts: [[2, 46], [82, 46], [82, 37], [44, 37], [41, 31], [2, 30], [2, 46]],
    lines: ['¡Non me pares, que perdo o ritmo!', 'Dez quilómetros. Ou tres. O reloxo marca o que quere.', '¡Bo día! ¡Bo día! ¡Bo día!', 'Correr polo paseo co vento de cara é o mellor. Ou o peor.'] },
  { id: 'lola', map: 'vila', name: 'Lola e Pancho', look: { skin: 1, hair: 1, style: 'largo' }, shirt: '#43A047', extras: [], dog: true,
    hours: [[7, 11], [13, 17.5], [20, 24]], speed: 0.85, pause: 15,
    pts: [[20, 30], [29, 34], [20, 37], [10, 37], [5, 45], [20, 46, 1], [40, 46], [41, 31], [29, 26], [29, 24], [20, 25, 1], [20, 30]],
    lines: ['Este é Pancho. Non morde. Bueno, aos comerciais si.', 'Pancho ladroulle a Brais tres veces hoxe. Récord.', 'Saco o can e o can sácame a min.', 'Pancho quere ir á praia. Pancho sempre quere ir á praia.'] },
  { id: 'ramon', map: 'vila', name: 'Ramón o pescador', look: { skin: 2, hair: 6, style: 'corto' }, shirt: '#1E5FA8', extras: ['cap:#123C7A', 'mustache'],
    hours: [[6, 9], [19, 22]], speed: 0.8, pause: 90,
    pts: [[41, 31], [41, 45], [30, 46], [13, 47], [13, 51, 1], [13, 47], [41, 46], [41, 31]],
    lines: ['Hoxe pica o xurelo. Ou iso dixo a gaivota.', 'Na lonxa pagan máis ao mediodía, rapaz.', 'Vin o Xurelo de Ouro unha vez. Ninguén me cre.', 'Pescar é esperar. Coma o tren de Albacete.'] },
  { id: 'fermin', map: 'vila', name: 'Fermín o vixiante', look: { skin: 0, hair: 2, style: 'corto' }, shirt: '#37474F', extras: ['badge', 'cap:#263238'],
    hours: [[23, 6]], speed: 0.8, pause: 25,
    pts: [[44, 10], [82, 10, 1], [72, 16], [63, 17, 1], [50, 18], [42, 12], [44, 10]],
    lines: ['Vixiante nocturno. Vixío… que non pase nada. E non pasa.', 'O último tren pasa ás 23:30. Despois, silencio. E eu.', 'Se ves luz no Bonsai, é que segue aberto. Sempre segue aberto.', 'Unha vez pasou un gato. Foi a noite máis movida do ano.'] },
];

// ---------- coches por la avenida (A11): de lado, uno por carril (por la derecha); paran en cada paso de cebra ----------
// lane: fila de A Vila · dir: 1 hacia el este, -1 hacia el oeste · gap: segundos sin coche entre pasada y pasada
export const CARS = [
  { color: '#C62828', lane: 28, dir: 1, speed: 60, gap: 22, offset: 0, hours: [7, 23] },
  { color: '#1565C0', lane: 27, dir: -1, speed: 52, gap: 35, offset: 17, hours: [7, 23] },
];
export const ZEBRAS = [[28, 30], [40, 41], [61, 63]];   // casillas (de x0 a x1) de cada paso de cebra de la avenida

// ---------- pesca y lonxa ----------
// qué sale en cada sitio (pesos); la basura sale menos cuanto mejor pescas
export const FISH_TABLE = {
  mar: [['xurelo', 30], ['sardina', 28], ['xarda', 22], ['robaliza', 9], ['polbo', 6], ['choco', 7], ['centola', 2], ['necora', 3], ['xurelo_ouro', 0.3]],
  rego: [['troita', 50], ['anguia', 18]],
};
export const TRASH = ['rato_bola', 'disquete', 'cd_instalacion', 'pendrive', 'guia_1998', 'folleto_vanesa', 'tarxeta_mollada', 'bota'];
export const LONXA_HOURS = [8, 20];     // la lonxa abre de 8:00 a 20:00
export const AUCTION_HOURS = [12, 13];  // y la subasta es de 12:00 a 13:00 (se paga más)
export const PICANTE_LONXA = 1.5;       // los pementos que pican se pagan más en la lonxa
export const BIDDERS = ['Peixería Aurora', 'Restaurante O Náutico', 'Mariscos Paco', 'A Taberna do Porto', 'Conservas A Ría'];
export const POXADOR = { name: 'Poxador', look: { skin: 2, hair: 6, style: 'corto' }, shirt: '#1E5FA8', extras: ['cap:#123C7A', 'apron'] };
export const LONXA_CLOSED = 'Lonxa de Paximiña. Cerrada. Abre de 8:00 a 20:00 (y la subasta, a las 12:00).';

// ---------- animales ----------
// every: cada cuántos días dan su producto (si han comido ese día) · corral: viven en el corral de la leira
export const ANIMALS = {
  gallina: { name: 'Gallina', price: 120, product: 'ovo', every: 1, corral: true, max: 4, sound: '¡Coc!' },
  vaca: { name: 'Vaca rubia gallega', price: 700, product: 'leite', every: 1, corral: true, max: 1, sound: '¡Muuu!' },
  ovella: { name: 'Oveja', price: 400, product: 'la', every: 3, corral: true, max: 2, sound: '¡Beee!' },
  gato: { name: 'Gato de oficina', price: 60, corral: false, max: 1, sound: 'Prrrr…', desc: 'No da nada. Duerme encima del teclado de quien lo compre.' },
  can: { name: 'Can', price: 90, corral: false, max: 1, sound: '¡Guau!', desc: 'No da nada. Vigila la casa y les ladra a los comerciales.' },
};
export const CORRAL_MAX = 6;   // animales que caben en un corral
export const ANIMAL_NAMES = { gallina: ['Pita', 'Lead', 'Turuta', 'Clueca'], vaca: ['Marela', 'Rubia', 'Moucha', 'Bonita'], ovella: ['Nube', 'Lanuda', 'Merina'], gato: ['Michi', 'Teclado', 'Ctrl'], can: ['Lur', 'Bobby', 'Ping'] };
export const COOP = { name: 'Cooperativa', look: { skin: 1, hair: 6, style: 'corto' }, shirt: '#2E7D32', extras: ['cap:#2E7D32', 'mustache'] };
export const COOP_LINES = ['Aquí tenemos de todo: gallinas, vacas rubias, ovejas… y pienso, que sin pienso no hay huevos.', 'Las gallinas ponen un huevo al día si comen. Bueno, un lead. Aquí les llamamos así.', 'La oveja da lana cada tres días. No le metas prisa, que se agobia.'];

// ---------- encargos del día (auditoría A04) ----------
// Cada día hay 3, iguales para todo el pueblo y sacados de la fecha (rules.js, dayOrders). Se entregan en
// la pestaña «Encargos» del tablón, una vez por persona. Pagan entre un 30 y un 50 % más que la caja de
// envíos y uno de cada cuatro regala además un mueble. q: cuántas cosas piden (de q[0] a q[1]).
// OJO: el orden importa. supabase/schema.sql (tabla order_pool) tiene estas mismas filas en este orden.
export const ORDERS = [
  { who: 'Diego', item: 'grelos', q: [4, 8], text: 'Necesito {n} grelos para el caldo del jueves. Si no, Sabrina no me deja entrar en la cocina, chamo.' },
  { who: 'Sabrina', item: 'patacas', q: [4, 8], text: 'Hoy hay tortilla. Bueno, habrá si alguien me trae {n} patacas. Con cebolla, que esto es Galicia.' },
  { who: 'Diego', item: 'pementos', q: [3, 6], text: '{n} pementos de Padrón para la tapa. Unos pican y otros no: yo no pregunto.' },
  { who: 'Sabrina', item: 'ovo', q: [2, 5], text: 'Para las arepas me hacen falta {n} huevos. Leads fresquitos, que los de ayer ya no contestan.' },
  { who: 'El poxador', item: 'xurelo', q: [2, 5], text: 'Los del Náutico piden {n} xurelos y en la lonxa no queda ni uno. ¡A pescar!' },
  { who: 'El poxador', item: 'sardina', q: [3, 6], text: '{n} sardiñas para la sardiñada del sábado. Sin ellas no hay fiesta, y sin fiesta no hay sábado.' },
  { who: 'El poxador', item: 'xarda', q: [2, 4], text: 'Un cliente quiere {n} xardas. Dice que son para un cliente suyo. Los clientes tienen clientes.' },
  { who: 'La cooperativa', item: 'leite', q: [1, 3], text: 'Para el queso de la cooperativa: {n} de leche de rubia gallega. Pagamos al momento, que no es costumbre.' },
  { who: 'La cooperativa', item: 'la', q: [1, 2], text: '{n} de lana para las mantas. Dicen los de Telemarketing que la centralita da frío.' },
  { who: 'Embudiño (Marketing)', item: 'clics', q: [2, 5], text: 'Necesito {n} clics para el informe del mes. Que sean de verdad, ¿eh? Bueno, que lo parezcan.' },
  { who: 'Hashtag (RRSS)', item: 'resena', q: [1, 2], text: '{n} reseñas de cinco estrellas para el perfil. No preguntes de quién son. #auténticas' },
  { who: 'Bugoberto (Programación)', item: 'troita', q: [1, 3], text: 'Quiero {n} troitas del rego. Es para una prueba de rendimiento. No preguntes de qué.' },
  { who: 'Diego', item: 'leite', q: [1, 2], text: 'Un café con leche sin leche no es un café con leche. Necesito {n} de leche, rápido.' },
  { who: 'Dona Firmina (Administración)', item: 'grelos', q: [3, 5], text: '{n} grelos, por triplicado y con sello. Bueno, sin sello. Pero que sean frescos.' },
  { who: 'Rutiña (Desarrollo Comercial)', item: 'ovo', q: [3, 6], text: 'Tengo una visita a las nueve y quiero llevar {n} leads. De los frescos, no de la base de datos de 2009.' },
  { who: 'Embudiño (Marketing)', item: 'palabra_p1', q: [1, 1], text: 'Una palabra clave en primera página para un cliente. Solo una. Me la piden «para ayer».' },
];
export const ORDER_GIFTS = ['m_planta', 'm_cadro', 'm_bonsai', 'm_reloxo', 'm_caixas'];   // el mueble que regalan a veces

// ---------- emotes (bocadillos sobre la cabeza, como en Paximón) ----------
export const EMOTES = [
  { id: 'laugh', text: 'JAJAJA' },
  { id: 'shout', text: 'MANDA CARALLO' },
  { id: 'cry', text: 'BUAAA' },
  { id: 'cool', text: 'TRANQUI' },
  { id: 'sleep', text: 'Zzz…' },
  { id: 'boa', text: '¡BOA!' },
  { id: 'hmm', text: 'HMM…' },
  { id: 'cafe', text: '¿UN CAFÉ?' },
];

// ---------- textos de Renfe ----------
export const RENFE = [
  'Renfe informa: el tren con destino A Coruña circula con un retraso de 12 minutos.',
  'Renfe informa: el tren con destino Albacete sufre un retraso indeterminado. Disculpen las molestias.',
  'Renfe informa: por obras, este tren será sustituido por un autobús… o no.',
  'Renfe informa: el tren procedente de Vigo efectuará su entrada por la vía 1. Bueno, por la única.',
  'Renfe informa: el tren de Santiago llega puntual. Repetimos: puntual. No es una broma.',
];
// destinos del panel de salidas (el tren a Albacete sale siempre «retrasado», en guiño a Paximón)
export const DESTS = { 'VIGO': 'Vigo', 'A CORUÑA': 'A Coruña', 'SANTIAGO': 'Santiago', 'PONTEVEDRA': 'Pontevedra', 'REDONDELA': 'Redondela', 'PADRÓN': 'Padrón', 'ALBACETE': 'Albacete', 'MERCANCÍAS': 'Mercancías' };
export function renfeLine(t, pick = Math.random()) {
  const dest = DESTS[t.dest] || t.dest;
  if (t.night) return NIGHT_TRAIN;
  if (t.delay) return `Renfe informa: el tren con destino ${dest} efectúa su entrada con ${t.delay} minutos de retraso. Disculpen las molestias.`;
  return [`Renfe informa: el tren con destino ${dest} está efectuando su entrada por la vía 1. Bueno, por la única.`,
    `Renfe informa: el tren con destino ${dest} llega puntual. Repetimos: puntual. No es una broma.`,
    `Renfe informa: el tren con destino ${dest} va a efectuar su salida. Ojo al hueco entre el tren y el andén.`][Math.floor(pick * 3)];
}
export const NIGHT_TRAIN = 'Renfe Mercancías informa: el tren de la noche pasa a recoger las cajas de envíos. Se paga mañana por la mañana.';
