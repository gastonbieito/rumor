'use strict';
const NS = 'http://www.w3.org/2000/svg';
const $ = s => document.querySelector(s);
function el(tag, attrs, parent) { const e = document.createElementNS(NS, tag); if (attrs) for (const k in attrs) e.setAttribute(k, attrs[k]); if (parent) parent.appendChild(e); return e; }
function grp(attrs, parent, html) { const e = el('g', attrs, parent); if (html) e.innerHTML = html; return e; }
const tr = (x, y, s) => `translate(${x} ${y})` + (s != null && s !== 1 ? ` scale(${s})` : '');
const rand = (a, b) => a + Math.random() * (b - a);
const pick = a => a[Math.floor(Math.random() * a.length)];
const lerp = (a, b, t) => a + (b - a) * t;
const EB = 'cubic-bezier(.34,1.56,.64,1)';
const Ease = { inOut: t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2, out: t => 1 - Math.pow(1 - t, 3) };
function anim(e, kf, o) { if (!e || !e.animate) return { set onfinish(f) { f && f(); } }; return e.animate(kf, Object.assign({ fill: 'both' }, typeof o === 'number' ? { duration: o } : o)); }
const esc = s => String(s).replace(/[<>&"]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[c]));
const sleep = ms => new Promise(r => setTimeout(r, ms));
// Texto en varias líneas (SVG no corta solo).
function wrap(text, max) {
  const words = text.split(' '), lines = []; let cur = '';
  for (const w of words) { if ((cur + ' ' + w).trim().length > max && cur) { lines.push(cur); cur = w; } else cur = (cur + ' ' + w).trim(); }
  if (cur) lines.push(cur);
  return lines;
}
