// Arma un único HTML autónomo (funciona sin internet y desde pendrive).
// Uso: node build.mjs  ->  dist/index.html
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const src = (...p) => path.join(root, 'src', ...p);

let html = fs.readFileSync(src('index.html'), 'utf8');
let css = fs.readFileSync(src('styles.css'), 'utf8');
const jsFiles = fs.readdirSync(src('js')).filter(f => f.endsWith('.js')).sort();
const js = jsFiles.map(f => `// ---- ${f}\n` + fs.readFileSync(src('js', f), 'utf8').replace(/^﻿/, '')).join('\n');

const fontPath = path.join(root, 'node_modules/@fontsource/nunito/files/nunito-latin-800-normal.woff2');
const font = fs.existsSync(fontPath)
  ? `@font-face{font-family:'Nunito';font-weight:800;font-display:block;src:url(data:font/woff2;base64,${fs.readFileSync(fontPath).toString('base64')}) format('woff2')}`
  : '';
if (!font) console.warn('Aviso: no se encontró la fuente Nunito; se usará la del sistema.');

const stamp = new Date().toISOString().slice(0, 16).replace('T', ' ');
css = css.replace('/*FONT*/', () => font);
html = html
  .replace('<!--CSS-->', () => `<style>\n${css}\n</style>`)
  .replace('<!--JS-->', () => `<script>\n(()=>{\nconst BUILD='${stamp}';\n${js}\n})();\n</script>`);

// dist/ es la copia para usar desde la compu o un pendrive; docs/ es lo que publica GitHub Pages.
for (const dir of ['dist', 'docs']) {
  fs.mkdirSync(path.join(root, dir), { recursive: true });
  fs.writeFileSync(path.join(root, dir, 'index.html'), html);
}
console.log(`dist/index.html y docs/index.html  ${(html.length / 1024).toFixed(0)} KB  (${jsFiles.length} módulos, ${stamp})`);
