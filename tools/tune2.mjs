import { makeNet, simulate, combos } from './sim.mjs';
const net = makeNet(7), N = net.n, ids = net.nodes.map(n => n.id);
const P = .8, Q = .45;
const reach = ids.map(i => simulate(net, { rumor: [{ node: i }], p: P }).rumor).sort((a, b) => a - b);
console.log('L1 rumor min/med', reach[0], reach[N >> 1], ' verdad:', ids.map(i => simulate(net, { truth: [{ node: i, strong: false }], q: Q }).truth).sort((a, b) => a - b).filter((_, k) => k % 20 === 0).join(','));
const r5 = ids.map(i => simulate(net, { rumor: [{ node: i }], p: P }).byRound[5].rumor);
for (const t of [40, 45, 50, 55, 60]) console.log(`L2 >=${t} en ronda 5: ${r5.filter(v => v >= t).length} personas`);
const pops = net.nodes.filter(n => n.pop).map(n => n.id);
function frenar(src, k, goal, extra = {}) {
  let ok = 0, tot = 0, best = null;
  combos(ids.filter(i => i !== src), k, c => { tot++; const r = simulate(net, { rumor: [{ node: src }], checkers: c, p: P, q: Q, ...extra }).rumor; if (r <= goal) ok++; if (!best || r < best[0]) best = [r, c]; });
  return `${ok}/${tot} (${(ok / tot * 100).toFixed(2)}%) mejor ${best[0]} con ${best[1]}`;
}
const s3 = net.nodes.find(n => n.g === 0 && !n.pop && n.nb.length === 2)?.id ?? 2;
console.log('L3 fuente', s3, 'k=3 <=60:', frenar(s3, 3, 60), ' <=40:', frenar(s3, 3, 40));
const s4 = pops.find(i => net.nodes[i].g === 1);
console.log('L4 fuente', s4, 'k=2 <=60:', frenar(s4, 2, 60), ' k=3 <=60:', frenar(s4, 3, 60));
