import { makeNet, simulate, combos } from './sim.mjs';
const net = makeNet(7);
const N = net.n;
const deg = net.nodes.map(n => n.nb.length);
console.log('personas', N, 'amistades', net.edges.length, 'grado max', Math.max(...deg), 'populares', net.nodes.filter(n => n.pop).map(n => n.id + ':' + n.nb.length).join(' '));
for (const p of [.7, .75, .8, .85]) {
  const reach = net.nodes.map(n => simulate(net, { rumor: [{ node: n.id }], p }).rumor);
  const r5 = net.nodes.map(n => simulate(net, { rumor: [{ node: n.id }], p }).byRound[5]?.rumor || 0);
  reach.sort((a, b) => a - b); const s5 = r5.slice().sort((a, b) => b - a);
  console.log(`p=${p} alcance min/med/max ${reach[0]}/${reach[N >> 1]}/${reach[N - 1]}  ronda5 top: ${s5.slice(0, 8).join(',')} mediana ${s5[N >> 1]}`);
}
for (const q of [.3, .4, .5]) {
  const tr = net.nodes.map(n => simulate(net, { truth: [{ node: n.id, strong: false }], q }).truth).sort((a, b) => a - b);
  console.log(`verdad aburrida q=${q} min/med/max ${tr[0]}/${tr[N >> 1]}/${tr[N - 1]}`);
}
