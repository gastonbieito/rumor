// La red de la escuela y la simulación. Sin nada de pantalla: se puede correr también en Node para verificar niveles.
// Estados: 0 no sabe, 1 cree el rumor, 2 sabe la verdad.

function prng(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

// Seis grupos (grados) en una grilla de 3 x 2, cada uno con sus amigos cercanos, algunos populares
// y pocos "puentes" entre grupos.
const GROUPS = [[235, 255], [640, 255], [1045, 255], [235, 515], [640, 515], [1045, 515]];
function makeNet(seed = 7, sizes = [20, 21, 19, 21, 20, 19]) {
  const R = prng(seed), nodes = [], edges = [], key = new Set();
  const link = (a, b, bridge) => {
    if (a === b) return;
    const k = a < b ? a + '-' + b : b + '-' + a;
    if (key.has(k)) return;
    key.add(k);
    edges.push({ a, b, bridge: !!bridge, pr: R(), pt: R() });
  };
  GROUPS.forEach(([cx, cy], g) => {
    const mine = [];
    let tries = 0;
    while (mine.length < sizes[g] && tries < 5000) {
      tries++;
      const ang = R() * Math.PI * 2, rr = Math.sqrt(R()) * 118;
      const x = cx + Math.cos(ang) * rr * 1.18, y = cy + Math.sin(ang) * rr * .92;
      if (mine.every(i => Math.hypot(nodes[i].x - x, nodes[i].y - y) > 36)) { mine.push(nodes.length); nodes.push({ id: nodes.length, x, y, g, nb: [] }); }
    }
    // Árbol mínimo (todos conectados) + vecinos más cercanos.
    const inT = new Set([mine[0]]);
    while (inT.size < mine.length) {
      let best = null, bd = Infinity;
      for (const i of inT) for (const j of mine) if (!inT.has(j)) { const d = Math.hypot(nodes[i].x - nodes[j].x, nodes[i].y - nodes[j].y); if (d < bd) { bd = d; best = [i, j]; } }
      link(best[0], best[1]); inT.add(best[1]);
    }
    for (const i of mine) {
      const near = mine.filter(j => j !== i).sort((p, q) => Math.hypot(nodes[i].x - nodes[p].x, nodes[i].y - nodes[p].y) - Math.hypot(nodes[i].x - nodes[q].x, nodes[i].y - nodes[q].y));
      if (R() < .55) link(i, near[1]);
    }
    // Populares: el más central del grupo y uno más.
    const byC = mine.slice().sort((p, q) => Math.hypot(nodes[p].x - cx, nodes[p].y - cy) - Math.hypot(nodes[q].x - cx, nodes[q].y - cy));
    const pops = [byC[0], byC[Math.floor(mine.length * .55)]];
    pops.forEach((h, k) => {
      nodes[h].pop = true;
      const others = mine.filter(j => j !== h).sort(() => R() - .5).slice(0, k ? 4 : 7);
      others.forEach(j => link(h, j));
    });
    GROUPS[g].pops = pops; GROUPS[g].mine = mine;
  });
  // Puentes entre grupos vecinos de la grilla (izquierda-derecha y arriba-abajo).
  const pairs = [[0, 1], [1, 2], [3, 4], [4, 5], [0, 3], [1, 4], [2, 5]];
  pairs.forEach(([g1, g2], i) => {
    const A = GROUPS[g1].mine, B = GROUPS[g2].mine;
    const toward = (list, other) => list.slice().sort((p, q) => Math.hypot(nodes[p].x - GROUPS[other][0], nodes[p].y - GROUPS[other][1]) - Math.hypot(nodes[q].x - GROUPS[other][0], nodes[q].y - GROUPS[other][1]));
    const a = toward(A, g2), b = toward(B, g1);
    link(a[0], b[0], true);
    if (i % 2 === 0) link(GROUPS[g1].pops[0], b[1], true);
  });
  for (const e of edges) { nodes[e.a].nb.push(e); nodes[e.b].nb.push(e); }
  // Nadie queda mudo: cada persona tiene al menos un amigo al que le cuenta el rumor y uno al que le cuenta la verdad.
  for (const nd of nodes) {
    if (!nd.nb.some(e => e.pr < .6)) nd.nb[0].pr = R() * .5;
    if (!nd.nb.some(e => e.pt < .4)) nd.nb[nd.nb.length - 1].pt = R() * .35;
  }
  return { nodes, edges, n: nodes.length };
}

// Simulación por rondas. Cada persona que se entera, en la ronda siguiente se lo cuenta a sus amigos:
// el rumor pasa por una amistad si e.pr < jugosidad; la verdad, si e.pt < q. Lo primero que llega es lo que se cree.
// Los verificadores no creen el rumor: cuando les llega, avisan la verdad a todos sus amigos.
// opt: { rumor:[{node,round}], truth:[{node,round}], checkers:[], p, q, group:{members:[], limit:0} }
function simulate(net, opt) {
  const N = net.n, st = new Int8Array(N + 1), when = new Int16Array(N + 1).fill(-1), via = new Int32Array(N + 1).fill(-1);
  const p = opt.p != null ? opt.p : .8, q = opt.q != null ? opt.q : .4;
  const chk = new Set(opt.checkers || []);
  const G = opt.group, GI = N;
  const events = [];
  let frontier = [];
  const starts = [];
  (opt.rumor || []).forEach(s => starts.push({ node: s.node, round: s.round || 0, type: 1 }));
  (opt.truth || []).forEach(s => starts.push({ node: s.node, round: s.round || 0, type: 2, strong: s.strong !== false }));
  const maxR = 40;
  let groupFwd = null;
  for (let r = 0; r <= maxR; r++) {
    const arrivals = [];
    for (const s of starts) if (s.round === r && st[s.node] === 0) arrivals.push({ to: s.node, from: -1, type: s.type, strong: s.strong });
    for (const f of frontier) {
      const t = st[f.node];
      if (f.node === GI) {
        const targets = G.limit ? G.members.slice(0, G.limit) : G.members;
        for (const m of targets) arrivals.push({ to: m, from: GI, type: t });
        continue;
      }
      const strong = f.strong;
      for (const e of net.nodes[f.node].nb) {
        const o = e.a === f.node ? e.b : e.a;
        if (t === 1 ? e.pr < p : (strong || e.pt < q)) arrivals.push({ to: o, from: f.node, type: t });
      }
      if (G && G.members.indexOf(f.node) >= 0 && (t === 1 || strong)) arrivals.push({ to: GI, from: f.node, type: t });
    }
    // Si en la misma ronda llegan las dos cosas, gana el rumor (es más llamativo).
    arrivals.sort((x, y) => x.type - y.type);
    const next = [], got = [];
    for (const a of arrivals) {
      if (st[a.to] !== 0) continue;
      let type = a.type, strong = !!a.strong;
      if (type === 1 && chk.has(a.to)) { type = 2; strong = true; }
      st[a.to] = type; when[a.to] = r; via[a.to] = a.from;
      next.push({ node: a.to, strong });
      got.push({ to: a.to, from: a.from, type, check: strong && a.type === 1 });
    }
    events.push(got);
    frontier = next;
    if (!next.length && !starts.some(s => s.round > r)) break;
  }
  let rumor = 0, truth = 0;
  for (let i = 0; i < N; i++) { if (st[i] === 1) rumor++; else if (st[i] === 2) truth++; }
  const byRound = []; let rc = 0, tc = 0;
  for (const ev of events) { for (const g of ev) if (g.to < N) { if (g.type === 1) rc++; else tc++; } byRound.push({ rumor: rc, truth: tc }); }
  return { st, when, via, events, rumor, truth, byRound, rounds: events.length };
}

// Integrantes del grupo de WhatsApp: 5 por grado, siempre los mismos.
function whatsappMembers(net) {
  let a = 99; const R = () => { a = (a * 16807) % 2147483647; return a / 2147483647; };
  const ids = net.nodes.map(n => n.id), out = [];
  for (let g = 0; g < 6; g++) out.push(...ids.filter(i => net.nodes[i].g === g).sort(() => R() - .5).slice(0, 5));
  return out;
}

// Niveles. goal: umbrales para 1, 2 y 3 estrellas ("max": no pasarse; "min": llegar).
const LEVELS = [
  { id: 1, type: 'contar', name: 'Contalo', text: 'Tocá a cualquier persona para contarle el rumor.', rumor: '¡Mañana no hay clases!', truth: 'Mañana hay clases, como siempre.', p: .8, q: .45,
    fact: 'En Twitter, las noticias falsas se compartieron un 70 % más que las verdaderas (estudio del MIT, 2018).' },
  { id: 2, type: 'elegir', name: '¿Quién lo cuenta?', text: 'Elegí quién lo cuenta: tiene que llegar a 45 personas en 5 rondas.', rumor: '¡En la cantina regalan pororó!', p: .8, rounds: 5, goal: { min: [45, 50, 60] },
    fact: 'Alguien con muchos amigos, o con amigos en otros grupos, hace que todo llegue lejos en pocos pasos.' },
  { id: 3, type: 'frenar', name: 'Frenalo', text: 'Poné 3 verificadores para que el rumor no llegue a la mitad.', rumor: '¡El recreo va a durar una hora!', src: 1, k: 3, p: .8, q: .45, goal: { max: [60, 30, 10] },
    fact: 'Un rumor se frena mejor cuando recién empieza: cuanto antes, menos trabajo.' },
  { id: 4, type: 'frenar', name: 'Frenalo con menos', text: 'Ahora lo cuenta alguien popular, y tenés solo 2 verificadores.', rumor: '¡Viene un youtuber a la escuela!', src: 31, k: 2, p: .8, q: .45, goal: { max: [60, 35, 20] },
    fact: 'Los "puentes", los que tienen amigos en otro grupo, son los mejores lugares para frenar algo.' },
  { id: 5, type: 'frenar', name: 'Grupo de WhatsApp', text: 'Hay un grupo de WhatsApp. Frenalo con 3 verificadores.', rumor: '¡Mañana hay que venir disfrazados!', src: 109, k: 3, p: .8, q: .45, group: true, goal: { max: [70, 45, 25] },
    fact: 'En 2020, WhatsApp dejó reenviar los mensajes muy reenviados a un solo chat por vez, y esos reenvíos bajaron un 70 %.' },
  { id: 6, type: 'carrera', name: 'La carrera', text: 'El rumor ya arrancó. Elegí 2 personas que cuenten la verdad.', rumor: '¡Se escapó un carpincho en el patio!', truth: 'No hay ningún carpincho.', src: 61, at: 2, k: 2, p: .8, q: .45, goal: { min: [40, 50, 60] },
    fact: 'Lo primero que escuchamos suele ser lo que creemos. Por eso la corrección casi siempre llega tarde.' },
  { id: 7, type: 'detective', name: '¿Quién lo empezó?', text: 'Tocá personas para preguntarles en qué ronda se enteraron. Encontrá la que lo empezó.', rumor: '¡El wifi va a ser solo para sexto!', p: .8, goal: { asks: [99, 10, 6] },
    fact: 'Rastrear de dónde salió un rumor se puede, pero cuesta mucho más que inventarlo.' },
  { id: 8, type: 'libre', name: 'Modo libre', text: 'Tocá personas para elegir quién cuenta el rumor, quién verifica y quién cuenta la verdad.', rumor: '¡...!', p: .8, q: .45 },
];
function starsFor(lv, value) {
  const g = lv.goal; if (!g) return 3;
  if (g.min) return g.min.filter(t => value >= t).length;
  if (g.max) return g.max.filter(t => value <= t).length;
  if (g.asks) return g.asks.filter(t => value <= t).length;
  return 0;
}
if (typeof module !== 'undefined') module.exports = { makeNet, simulate, prng, GROUPS, whatsappMembers, LEVELS, starsFor };
