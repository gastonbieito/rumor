import { makeNet, simulate, combos } from './sim.mjs';
const net = makeNet(7), N = net.n, ids = net.nodes.map(n => n.id);
const P = .8, Q = .45;
// Grupo de WhatsApp: 5 integrantes por grado.
const R = (() => { let a = 99; return () => { a = (a * 16807) % 2147483647; return a / 2147483647; }; })();
const members = [];
for (let g = 0; g < 6; g++) { const m = ids.filter(i => net.nodes[i].g === g).sort(() => R() - .5).slice(0, 5); members.push(...m); }
const src = ids.find(i => net.nodes[i].g === 5 && !members.includes(i) && net.nodes[i].nb.some(e => members.includes(e.a === i ? e.b : e.a)));
const best = (lim, k) => { let b = [1e9]; let ok = 0, tot = 0; combos(ids.filter(i => i !== src), k, c => { tot++; const r = simulate(net, { rumor: [{ node: src }], checkers: c, p: P, q: Q, group: { members, limit: lim } }).rumor; if (r <= 60) ok++; if (r < b[0]) b = [r, c]; }); return `mejor ${b[0]} con ${b[1]} · logran <=60: ${ok}/${tot}`; };
console.log('L5 fuente', src, 'miembros', members.join(','));
console.log('  sin límite, 0 verif:', simulate(net, { rumor: [{ node: src }], p: P, group: { members, limit: 0 } }).rumor, ' rondas', simulate(net, { rumor: [{ node: src }], p: P, group: { members, limit: 0 } }).rounds);
console.log('  sin límite k=1:', best(0, 1), ' k=2:', best(0, 2));
console.log('  con límite 5 k=1:', best(5, 1), ' k=2:', best(5, 2));
// Carrera: el rumor arranca en S; la verdad se cuenta en la ronda 2 desde un nodo a elección.
for (const S of [net.nodes.find(n => n.g === 0 && n.pop).id, net.nodes.find(n => n.g === 3 && !n.pop).id]) {
  for (const tr of [1, 2, 3]) {
    const res = ids.map(i => { const s = simulate(net, { rumor: [{ node: S }], truth: [{ node: i, round: tr }], p: P, q: Q }); return [i, s.truth - s.rumor, s.truth]; }).sort((a, b) => b[1] - a[1]);
    console.log(`L6 S=${S} verdad en ronda ${tr}: ganan ${res.filter(r => r[1] > 0).length}, top ${res.slice(0, 4).map(r => r[0] + ':' + r[1]).join(' ')}`);
  }
}
