import { makeNet, simulate, combos } from './sim.mjs';
const net = makeNet(7), N = net.n, ids = net.nodes.map(n => n.id);
const P = .8, Q = .45;
const R = (() => { let a = 99; return () => { a = (a * 16807) % 2147483647; return a / 2147483647; }; })();
const members = [];
for (let g = 0; g < 6; g++) { const m = ids.filter(i => net.nodes[i].g === g).sort(() => R() - .5).slice(0, 5); members.push(...m); }
const memberPops = members.filter(i => net.nodes[i].pop);
console.log('integrantes populares', memberPops.map(i => i + '(g' + net.nodes[i].g + ')').join(' '));
const cand = ids.filter(i => net.nodes[i].nb.length >= 3 || net.nodes[i].nb.some(e => e.bridge));
for (const src of members.filter(i => net.nodes[i].g === 5).slice(0, 3)) {
  for (const k of [2, 3]) {
    const f = lim => { let ok = 0, tot = 0, b = [1e9]; combos(cand.filter(i => i !== src), k, c => { tot++; const r = simulate(net, { rumor: [{ node: src }], checkers: c, p: P, q: Q, group: { members, limit: lim } }).rumor; if (r <= 60) ok++; if (r < b[0]) b = [r, c]; }); return `${ok}/${tot} mejor ${b[0]}`; };
    console.log(`L5 src ${src} k=${k}: sin límite ${f(0)} | límite 5: ${f(5)}`);
  }
}
for (const S of [61, 11]) for (const tr of [1, 2]) {
  const v = []; combos(ids.filter(i => i !== S), 2, c => { const s = simulate(net, { rumor: [{ node: S }], truth: [{ node: c[0], round: tr }, { node: c[1], round: tr }], p: P, q: Q }); v.push(s.truth); });
  v.sort((a, b) => b - a);
  console.log(`L6 S=${S} 2 voceros ronda ${tr}: max ${v[0]}, >=30 ${v.filter(x => x >= 30).length}, >=40 ${v.filter(x => x >= 40).length}, >=50 ${v.filter(x => x >= 50).length} de ${v.length}, mediana ${v[v.length >> 1]}`);
}
