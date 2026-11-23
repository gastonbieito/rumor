// Prueba automática: juega los 8 niveles en Edge y Chrome (1366x768 y 1024x600) con la mejor jugada
// calculada por tools/verify.mjs. Revisa que todo entre en pantalla, las estrellas y los errores.
//   URL=https://... (página publicada)  CANALES=msedge  SOLO=1
import { chromium } from 'playwright-core';
import path from 'node:path';
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const url = process.env.URL || pathToFileURL(path.join(root, 'dist', 'index.html')).href;
const out = path.join(root, 'tests', 'out');
fs.mkdirSync(out, { recursive: true });
const verify = execFileSync(process.execPath, [path.join(root, 'tools', 'verify.mjs')], { encoding: 'utf8' }).trim().split('\n');
const SOL = JSON.parse(verify[verify.length - 2]);
const SIZES = [[1366, 768], [1024, 600]];
const CHANNELS = (process.env.CANALES || 'msedge,chrome').split(',');
let fails = 0;
const fail = m => { fails++; console.log('  FALLA:', m); };

const wait = (page, fn, arg, ms = 60000) => page.waitForFunction(fn, arg, { timeout: ms });
async function clickBtn(page, label) {
  const b = await page.evaluate(l => __rumor.button(l), label);
  if (!b) { fail('no está el botón ' + label); return; }
  await page.mouse.click(b.x, b.y);
}
async function clickNode(page, i) { const p = await page.evaluate(n => __rumor.node(n), i); await page.mouse.move(p.x, p.y, { steps: 2 }); await page.mouse.down(); await page.mouse.up(); await page.waitForTimeout(150); }
async function layout(page, tag) {
  const bad = await page.evaluate(() => {
    const W = innerWidth, H = innerHeight, b = [];
    document.querySelectorAll('.btn').forEach(e => { const r = e.getBoundingClientRect(); if (r.left < 0 || r.top < 0 || r.right > W + 1 || r.bottom > H + 1) b.push('botón ' + e.dataset.label + ' fuera de pantalla'); });
    if (__rumor.screen !== 'menu') for (let i = 0; i < __rumor.NET.n; i++) { const p = __rumor.node(i); if (p.x < 8 || p.y < 8 || p.x > W - 8 || p.y > H - 8) b.push('persona ' + i + ' fuera de pantalla'); const e = document.elementFromPoint(p.x, p.y); if (!e || !e.closest('.node')) b.push('persona ' + i + ' tapada por ' + (e ? e.tagName + '.' + (e.closest('.btn') ? 'botón' : '') : 'nada')); }
    const h = document.getElementById('hint'); if (h) { const r = h.getBoundingClientRect(), s = [...document.querySelectorAll('.btn')].filter(x => x.dataset.label === 'sonido')[0].getBoundingClientRect(); if (r.right > s.left - 4) b.push('la consigna pisa el botón de sonido'); }
    return b;
  });
  [...new Set(bad)].slice(0, 6).forEach(m => fail(`[${tag}] ${m}`));
}
async function result(page, tag, want, id) {
  await wait(page, () => __rumor.phase === 'fin', null, 90000);
  await page.waitForTimeout(600);
  const r = await page.evaluate(() => __rumor.result);
  await page.screenshot({ path: path.join(out, `${tag}-n${id}-fin.png`) });
  if (want != null && (!r || r.stars < want)) fail(`[${tag}] nivel ${id}: ${r ? r.stars : '?'} estrellas, se esperaban ${want}`);
  return r;
}

for (const ch of CHANNELS) {
  let browser;
  try { browser = await chromium.launch({ channel: ch, headless: true }); } catch (e) { console.log(`(${ch} no disponible)`); continue; }
  for (const [w, h] of SIZES) {
    const tag = `${ch}-${w}x${h}`;
    console.log('▶', tag);
    const ctx = await browser.newContext({ viewport: { width: w, height: h } });
    const page = await ctx.newPage();
    const errs = [];
    page.on('pageerror', e => errs.push(e.message));
    page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
    await page.goto(url);
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await wait(page, () => window.__rumor && __rumor.screen === 'menu');
    await page.waitForTimeout(1200);
    await page.screenshot({ path: path.join(out, `${tag}-0-menu.png`) });
    await layout(page, tag + ' menú');

    const enter = async id => { await wait(page, n => __rumor.screen === 'nivel' + n, id); await page.waitForTimeout(500); await layout(page, `${tag} nivel ${id}`); await clickBtn(page, 'rapido'); };
    await clickBtn(page, 'nivel1'); await enter(1);
    await clickNode(page, 5);
    await page.waitForTimeout(2500); await page.screenshot({ path: path.join(out, `${tag}-n1-juego.png`) });
    await wait(page, () => __rumor.phase === 'verdad');
    await clickNode(page, 5);
    await result(page, tag, 3, 1);
    await clickBtn(page, 'siguiente'); await enter(2);
    await clickNode(page, SOL[2][0]);
    await result(page, tag, 3, 2);
    for (const id of [3, 4, 5]) {
      await clickBtn(page, 'siguiente'); await enter(id);
      if (id === 5) await clickBtn(page, 'limite');
      for (const n of SOL[id]) await clickNode(page, n);
      await page.screenshot({ path: path.join(out, `${tag}-n${id}-armado.png`) });
      await clickBtn(page, 'empezar');
      await result(page, tag, 3, id);
    }
    await clickBtn(page, 'siguiente'); await enter(6);
    await clickBtn(page, 'empezar');
    await wait(page, () => __rumor.phase === 'elegir');
    for (const n of SOL[6]) await clickNode(page, n);
    await result(page, tag, 3, 6);
    await clickBtn(page, 'siguiente'); await enter(7);
    const origin = await page.evaluate(() => __rumor.origin);
    await clickNode(page, origin === 0 ? 1 : 0);
    await page.screenshot({ path: path.join(out, `${tag}-n7-juego.png`) });
    await clickNode(page, origin);
    await result(page, tag, 3, 7);
    await clickBtn(page, 'siguiente'); await enter(8);
    await clickNode(page, 3); await clickNode(page, 50); await clickNode(page, 50); await clickNode(page, 90); await clickNode(page, 90); await clickNode(page, 90);
    await clickBtn(page, 'empezar');
    await result(page, tag, null, 8);
    await clickBtn(page, 'menu');
    await wait(page, () => __rumor.screen === 'menu'); await page.waitForTimeout(800);
    await page.screenshot({ path: path.join(out, `${tag}-9-menu-final.png`) });
    const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('rumorSexto')));
    const three = [1, 2, 3, 4, 5, 6, 7].filter(i => saved.stars[i] === 3).length;
    if (three !== 7) fail(`guardado: ${three} niveles con 3 estrellas`); else console.log('  7 niveles con 3 estrellas, guardado ok');
    errs.forEach(e => fail('error en consola: ' + e));
    await ctx.close();
    if (process.env.SOLO) break;
  }
  await browser.close();
}
console.log(fails ? `\n${fails} problema(s).` : '\nTodo en orden.');
process.exit(fails ? 1 : 0);
