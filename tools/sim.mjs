// Herramienta para afinar y verificar niveles: carga la simulación real y mide.
import fs from 'node:fs';
const code = fs.readFileSync(new URL('../src/js/10-net.js', import.meta.url), 'utf8');
const mod = { exports: {} };
new Function('module', code)(mod);
export const { makeNet, simulate, whatsappMembers, LEVELS, starsFor } = mod.exports;
export function combos(arr, k, fn) { const c = []; const rec = (s) => { if (c.length === k) return fn(c.slice()); for (let i = s; i < arr.length; i++) { c.push(arr[i]); rec(i + 1); c.pop(); } }; rec(0); }
