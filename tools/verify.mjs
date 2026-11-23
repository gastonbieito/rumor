// Verifica cada nivel con la simulación real: que se pueda ganar (y con 3 estrellas) y que al azar sea difícil.
import { makeNet, simulate, whatsappMembers, LEVELS, starsFor, combos } from './sim.mjs';
const net = makeNet(7), N = net.n, ids = net.nodes.map(n => n.id), members = whatsappMembers(net);
let bad = 0;
const out = {};
for (const lv of LEVELS) {
  if (lv.type === 'elegir') {
    const vals = ids.map(i => [i, simulate(net, { rumor: [{ node: i }], p: lv.p }).byRound[lv.rounds].rumor]);
    const c = [1, 2, 3].map(s => vals.filter(v => starsFor(lv, v[1]) >= s).length);
    const best = vals.sort((a, b) => b[1] - a[1])[0];
    console.log(`N${lv.id}: personas que dan 1/2/3 estrellas: ${c.join('/')} de ${N} · mejor ${best[0]} (${best[1]})`);
    out[lv.id] = [best[0]]; if (!c[2]) bad++;
  }
  if (lv.type === 'frenar') {
    const opt = c => ({ rumor: [{ node: lv.src }], checkers: c, p: lv.p, q: lv.q, group: lv.group ? { members, limit: 5 } : null });
    const cand = ids.filter(i => i !== lv.src && (net.nodes[i].nb.length >= 3 || net.nodes[i].nb.some(e => e.bridge) || net.nodes[i].nb.some(e => e.a === lv.src || e.b === lv.src)));
    let best = [1e9];
    combos(lv.k === 3 ? cand : ids.filter(i => i !== lv.src), lv.k, c => { const r = simulate(net, opt(c)).rumor; if (r < best[0]) best = [r, c]; });
    let rnd = [0, 0, 0, 0];
    for (let t = 0; t < 3000; t++) { const c = []; while (c.length < lv.k) { const i = ids[Math.floor(Math.random() * N)]; if (i !== lv.src && !c.includes(i)) c.push(i); } rnd[starsFor(lv, simulate(net, opt(c)).rumor)]++; }
    const noLim = lv.group ? simulate(net, { ...opt(best[1]), group: { members, limit: 0 } }).rumor : null;
    console.log(`N${lv.id}: mejor ${best[0]} con ${best[1]} (${starsFor(lv, best[0])} estrellas) · al azar ganan ${((3000 - rnd[0]) / 30).toFixed(1)} %, 3 estrellas ${(rnd[3] / 30).toFixed(1)} %` + (lv.group ? ` · la misma jugada sin límite: ${noLim}` : ''));
    out[lv.id] = best[1]; if (starsFor(lv, best[0]) < 3) bad++;
  }
  if (lv.type === 'carrera') {
    const pre = simulate(net, { rumor: [{ node: lv.src }], p: lv.p });
    const free = ids.filter(i => pre.when[i] < 0 || pre.when[i] >= lv.at);
    let best = [-1], rnd = [0, 0, 0, 0], tot = 0;
    combos(free, lv.k, c => { tot++; const s = simulate(net, { rumor: [{ node: lv.src }], truth: c.map(n => ({ node: n, round: lv.at })), p: lv.p, q: lv.q }); rnd[starsFor(lv, s.truth)]++; if (s.truth > best[0]) best = [s.truth, c]; });
    console.log(`N${lv.id}: mejor ${best[0]} con ${best[1]} (${starsFor(lv, best[0])} estrellas) · ganan ${((tot - rnd[0]) / tot * 100).toFixed(1)} %, 3 estrellas ${(rnd[3] / tot * 100).toFixed(1)} %`);
    out[lv.id] = best[1]; if (starsFor(lv, best[0]) < 3) bad++;
  }
}
console.log(JSON.stringify(out));
console.log(bad ? `${bad} nivel(es) sin 3 estrellas posibles` : 'Todos los niveles se pueden ganar con 3 estrellas.');
process.exit(bad ? 1 : 0);
