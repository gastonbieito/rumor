// Pantallas, dibujo de la red, animación y lógica de cada nivel.
const stage = $('#stage');
const L = { defs: $('#defs'), bg: $('#bg'), world: $('#world'), fx: $('#fx'), ui: $('#ui'), over: $('#over') };
const COL = { panel: '#1f2850', ink: '#eef2ff', dim: '#93a1cc', rumor: '#ff7a45', truth: '#3ecf8e', none: '#c9d3e6', check: '#5aa9ff', gold: '#ffd166', wa: '#25d366' };
const toSvg = (cx, cy) => { const p = new DOMPoint(cx, cy).matrixTransform(stage.getScreenCTM().inverse()); return { x: p.x, y: p.y }; };
const toScreen = (x, y) => { const p = new DOMPoint(x, y).matrixTransform(stage.getScreenCTM()); return { x: p.x, y: p.y }; };
const NET = makeNet(7), MEMBERS = whatsappMembers(NET), GI = NET.n, GPOS = { x: 640, y: 385 };
const pos = i => i === GI ? GPOS : NET.nodes[i];

L.defs.innerHTML = `<radialGradient id="gBg" cx=".5" cy=".45" r=".8"><stop offset="0" stop-color="#26306a"/><stop offset="1" stop-color="#121733"/></radialGradient>
<radialGradient id="gGlowR"><stop offset="0" stop-color="#ff7a45" stop-opacity=".55"/><stop offset="1" stop-color="#ff7a45" stop-opacity="0"/></radialGradient>
<radialGradient id="gGlowT"><stop offset="0" stop-color="#3ecf8e" stop-opacity=".55"/><stop offset="1" stop-color="#3ecf8e" stop-opacity="0"/></radialGradient>`;
L.bg.innerHTML = `<rect x="-800" y="-600" width="2880" height="1920" fill="url(#gBg)"/>`;

// ---------- Guardado (solo en esta compu).
const Save = {
  key: 'rumorSexto', d: { stars: {} }, open: false,
  load() { try { const d = JSON.parse(localStorage.getItem(this.key) || 'null'); if (d && d.stars) this.d = d; } catch (e) { } },
  save() { try { localStorage.setItem(this.key, JSON.stringify(this.d)); } catch (e) { } },
  stars(id) { return this.d.stars[id] || 0; },
  set(id, s) { if (s > this.stars(id)) { this.d.stars[id] = s; this.save(); } },
  unlocked(id) { return this.open || id === 1 || this.stars(id - 1) > 0 || id === 8 && this.stars(7) > 0; },
};

// ---------- Piezas de interfaz.
function button(parent, x, y, w, h, label, onClick, o = {}) {
  const g = grp({ transform: tr(x, y), class: 'btn' + (o.off ? ' off' : '') }, parent);
  const face = grp({ class: 'face' }, g);
  face.innerHTML = `<rect x="${-w / 2}" y="${-h / 2 + 5}" width="${w}" height="${h}" rx="${Math.min(h / 2, 16)}" fill="#000" opacity=".3"/>
<rect x="${-w / 2}" y="${-h / 2}" width="${w}" height="${h}" rx="${Math.min(h / 2, 16)}" fill="${o.fill || COL.gold}"/>
<text y="2" text-anchor="middle" dominant-baseline="middle" font-size="${o.fs || 24}" fill="${o.ink || '#1b1f3a'}">${label}</text>`;
  g.addEventListener('pointerdown', e => {
    e.stopPropagation();
    if (g.classList.contains('off')) return;
    Sound.init(); Sound.tap();
    anim(face, [{ transform: 'scale(.93)' }, { transform: 'scale(1)' }], { duration: 160, fill: 'none' });
    onClick();
  });
  g.label = t => { face.querySelector('text').textContent = t; };
  g.off = v => g.classList.toggle('off', v);
  g.dataset.label = label; g.dataset.x = x; g.dataset.y = y;
  return g;
}
function soundButton() {
  const b = button(L.ui, 1228, 44, 64, 52, Sound.muted ? '🔇' : '🔊', () => { Sound.muted = !Sound.muted; b.label(Sound.muted ? '🔇' : '🔊'); try { localStorage.setItem('rumorMute', Sound.muted ? '1' : ''); } catch (e) { } }, { fill: '#2c3770', ink: COL.ink, fs: 24 });
  b.dataset.label = 'sonido';
}
const starSvg = (x, y, r, on) => `<path transform="translate(${x} ${y})" d="${starPath(r, r * .48)}" fill="${on ? COL.gold : '#3a4577'}" stroke="${on ? '#e8a400' : '#4b5690'}" stroke-width="3" stroke-linejoin="round"/>`;
function starPath(R, r) { let d = ''; for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r : R; d += (i ? 'L' : 'M') + (Math.cos(a) * rr).toFixed(1) + ' ' + (Math.sin(a) * rr).toFixed(1); } return d + 'Z'; }

// ---------- Dibujo de la red.
function drawNet(parent, o = {}) {
  const v = { nodes: [], hl: -1 };
  const blobs = grp({}, parent), eL = grp({}, parent), wL = grp({}, parent), nL = grp({}, parent);
  v.marks = grp({ 'pointer-events': 'none' }, parent); v.badges = grp({ 'pointer-events': 'none' }, parent);
  GROUPS.forEach(([cx, cy], g) => {
    blobs.innerHTML += `<ellipse cx="${cx}" cy="${cy}" rx="178" ry="130" fill="#1d2550" opacity=".85"/><text x="${cx - 168}" y="${cy - 104}" font-size="20" fill="${COL.dim}">${g + 1}.º</text>`;
  });
  v.edges = NET.edges.map(e => { const a = NET.nodes[e.a], b = NET.nodes[e.b]; return el('line', { x1: a.x, y1: a.y, x2: b.x, y2: b.y, stroke: '#7787b8', 'stroke-opacity': .38, 'stroke-width': 2 }, eL); });
  if (o.group) {
    for (const m of MEMBERS) { const n = NET.nodes[m]; el('line', { x1: GPOS.x, y1: GPOS.y, x2: n.x, y2: n.y, stroke: COL.wa, 'stroke-opacity': .22, 'stroke-width': 1.5, 'stroke-dasharray': '4 6' }, wL); }
    v.wa = grp({ transform: tr(GPOS.x, GPOS.y) }, nL);
    v.waIn = grp({}, v.wa, `<circle r="31" fill="${COL.wa}" stroke="#0e1330" stroke-width="3"/><path d="M-15 -9 h30 a6 6 0 0 1 6 6 v14 a6 6 0 0 1 -6 6 h-18 l-9 8 v-8 h-3 a6 6 0 0 1 -6 -6 v-14 a6 6 0 0 1 6 -6Z" fill="#fff"/><circle cx="-8" cy="4" r="2.6" fill="${COL.wa}"/><circle cx="0" cy="4" r="2.6" fill="${COL.wa}"/><circle cx="8" cy="4" r="2.6" fill="${COL.wa}"/>`);
    v.waLim = grp({ transform: 'translate(24 -26)', opacity: 0 }, v.wa, `<circle r="14" fill="${COL.gold}" stroke="#0e1330" stroke-width="2.5"/><text y="1" text-anchor="middle" dominant-baseline="middle" font-size="15" fill="#1b1f3a">5</text>`);
  }
  NET.nodes.forEach(n => {
    const g = grp({ transform: tr(n.x, n.y), class: 'node' }, nL), inner = grp({}, g);
    inner.innerHTML = `<circle class="b" r="12.5" fill="${COL.none}" stroke="#0e1330" stroke-width="2.5"/><circle cx="-4" cy="-2" r="1.9" fill="#1b1f3a"/><circle cx="4" cy="-2" r="1.9" fill="#1b1f3a"/><path class="m" d="M-3.5 4.5 h7" stroke="#1b1f3a" stroke-width="2" stroke-linecap="round" fill="none"/>`;
    v.nodes.push({ g, inner, b: inner.querySelector('.b'), m: inner.querySelector('.m'), st: 0 });
  });
  v.set = (i, st, check) => {
    if (i === GI) { if (v.waIn) anim(v.waIn, [{ transform: 'scale(1)' }, { transform: 'scale(1.35)' }, { transform: 'scale(1)' }], { duration: 400, fill: 'none' }); return; }
    const nd = v.nodes[i]; nd.st = st;
    nd.b.setAttribute('fill', st === 1 ? COL.rumor : st === 2 ? COL.truth : COL.none);
    nd.m.setAttribute('d', st === 1 ? 'M-3 5 a3 3.4 0 1 0 6 0 a3 3.4 0 1 0 -6 0' : st === 2 ? 'M-4.5 3.5 q4.5 5 9 0' : 'M-3.5 4.5 h7');
    if (st) anim(nd.inner, [{ transform: 'scale(1)' }, { transform: 'scale(1.55)' }, { transform: 'scale(1)' }], { duration: 380, fill: 'none', easing: 'ease-out' });
    if (check) { ring(nd, COL.truth, 46); Sound.check(); }
  };
  v.reset = () => v.nodes.forEach((nd, i) => { if (nd.st) v.set(i, 0); });
  v.highlight = i => {
    if (i === v.hl) return;
    const paint = (k, on) => { if (k < 0) return; for (const e of NET.nodes[k].nb) { const ln = v.edges[NET.edges.indexOf(e)]; ln.setAttribute('stroke', on ? '#ffffff' : '#7787b8'); ln.setAttribute('stroke-opacity', on ? .9 : .38); ln.setAttribute('stroke-width', on ? 3.5 : 2); } v.nodes[k].g.setAttribute('transform', tr(NET.nodes[k].x, NET.nodes[k].y, on ? 1.3 : 1)); };
    paint(v.hl, false); v.hl = i; paint(i, true);
  };
  return v;
}
function ring(nd, color, r) {
  const g = grp({ transform: nd.g.getAttribute('transform').replace(/ scale\([^)]*\)/, '') }, L.fx), c = el('circle', { r, fill: 'none', stroke: color, 'stroke-width': 5 }, g);
  anim(c, [{ transform: 'scale(.2)', opacity: 1 }, { transform: 'scale(1)', opacity: 0 }], { duration: 650, easing: 'ease-out' }).onfinish = () => g.remove();
}
function particle(from, to, type, dur) {
  const a = pos(from), b = pos(to);
  const g = grp({ transform: tr(a.x, a.y) }, L.fx), c = el('circle', { r: 5.5, fill: type === 1 ? COL.rumor : COL.truth, stroke: '#fff', 'stroke-width': 1.5 }, g);
  anim(c, [{ transform: 'translate(0px,0px)' }, { transform: `translate(${b.x - a.x}px,${b.y - a.y}px)` }], { duration: dur, easing: 'ease-in-out' }).onfinish = () => g.remove();
}
function bubble(i, text, type) {
  const n = pos(i), w = Math.max(160, text.length * 11.5 + 30), x = Math.min(Math.max(n.x, w / 2 + 20), 1260 - w / 2), up = n.y > 200;
  const y = up ? n.y - 52 : n.y + 52;
  const g = grp({ transform: tr(x, y) }, L.fx), inner = grp({}, g, `<rect x="${-w / 2}" y="-21" width="${w}" height="42" rx="21" fill="${type === 2 ? COL.truth : '#fff'}" stroke="${type === 2 ? '#1c7a52' : COL.rumor}" stroke-width="3"/><text y="2" text-anchor="middle" dominant-baseline="middle" font-size="19" fill="#1b1f3a">${esc(text)}</text>`);
  anim(inner, [{ transform: 'scale(0)', opacity: 1 }, { transform: 'scale(1)', opacity: 1, offset: .12 }, { transform: 'scale(1)', opacity: 1, offset: .85 }, { transform: 'scale(.9)', opacity: 0 }], { duration: 3200, easing: 'ease-out' }).onfinish = () => g.remove();
}
function mark(v, i, kind) {
  const n = NET.nodes[i], g = grp({ transform: tr(n.x, n.y) }, v.marks);
  if (kind === 'src') g.innerHTML = `<g class="pulse"><circle r="30" fill="url(#gGlowR)"/></g><g transform="translate(15 -17)"><circle r="11" fill="${COL.rumor}" stroke="#0e1330" stroke-width="2.5"/><text y="1" text-anchor="middle" dominant-baseline="middle" font-size="15" fill="#fff">!</text></g>`;
  if (kind === 'chk') g.innerHTML = `<circle r="19" fill="none" stroke="${COL.check}" stroke-width="4"/><g transform="translate(15 -16)"><path d="M0 -10 L9 -6 C9 3 5 8 0 11 C-5 8 -9 3 -9 -6Z" fill="${COL.check}" stroke="#0e1330" stroke-width="2"/></g>`;
  if (kind === 'tru') g.innerHTML = `<g class="pulse"><circle r="30" fill="url(#gGlowT)"/></g><circle r="19" fill="none" stroke="${COL.truth}" stroke-width="4"/>`;
  anim(g.firstElementChild, [{ opacity: 0 }, { opacity: 1 }], 200);
  return g;
}

// ---------- Pantallas.
const Game = { screen: null, token: 0, onNode: null, result: null, phase: '' };
function clearAll() { Game.token++; ['world', 'fx', 'ui', 'over'].forEach(k => { L[k].innerHTML = ''; }); Game.onNode = null; Game.result = null; Game.phase = ''; L.world.__v = null; }

function menu() {
  clearAll(); Game.screen = 'menu';
  const deco = drawNet(L.world); deco.nodes.forEach(nd => nd.g.setAttribute('opacity', .25)); L.world.setAttribute('opacity', 1);
  // Un rumor de adorno que corre por detrás, en bucle.
  const tk = Game.token;
  (async () => {
    while (tk === Game.token) {
      const s = simulate(NET, { rumor: [{ node: Math.floor(Math.random() * NET.n) }], p: .8 });
      for (const ev of s.events) { if (tk !== Game.token) return; for (const g of ev) if (g.to < NET.n) deco.set(g.to, 1); await sleep(380); }
      await sleep(1500); if (tk !== Game.token) return; deco.reset(); await sleep(600);
    }
  })();
  grp({}, L.ui, `<rect x="-800" y="-600" width="2880" height="1920" fill="#121733" opacity=".82"/>
<text x="640" y="118" text-anchor="middle" font-size="76" fill="${COL.ink}">El rumor</text>
<text x="640" y="168" text-anchor="middle" font-size="26" fill="${COL.dim}">¿Qué tan rápido corre algo que no es cierto?</text>`);
  LEVELS.forEach((lv, k) => {
    const x = 250 + (k % 4) * 260, y = 320 + Math.floor(k / 4) * 230, open = Save.unlocked(lv.id), st = Save.stars(lv.id);
    const g = grp({ transform: tr(x, y), class: 'btn' }, L.ui), face = grp({ class: 'face' }, g);
    face.innerHTML = `<rect x="-112" y="-86" width="224" height="180" rx="22" fill="#000" opacity=".3"/><rect x="-112" y="-92" width="224" height="180" rx="22" fill="${open ? '#2c3770' : '#232a52'}" stroke="${open ? (st ? COL.gold : '#5a67a8') : '#2e3666'}" stroke-width="3"/>
<text y="-38" text-anchor="middle" font-size="46" fill="${open ? COL.ink : '#4b5690'}">${lv.id === 8 ? '∞' : lv.id}</text>
<text y="8" text-anchor="middle" font-size="21" fill="${open ? COL.ink : '#4b5690'}">${esc(lv.name)}</text>
${open && (lv.goal || lv.type === 'contar') ? [0, 1, 2].map(i => starSvg((i - 1) * 40, 50, 15, i < st)).join('') : ''}
${open ? '' : `<g transform="translate(0 48)"><path d="M-10 -4 v-6 a10 10 0 0 1 20 0 v6" fill="none" stroke="#4b5690" stroke-width="5"/><rect x="-15" y="-5" width="30" height="22" rx="5" fill="#4b5690"/></g>`}`;
    g.dataset.label = 'nivel' + lv.id;
    g.addEventListener('pointerdown', e => { e.stopPropagation(); if (!open) { Sound.init(); Sound.no(); return; } Sound.init(); Sound.tap(); level(lv.id); });
  });
  // El botón para volver al portal es la casita de volver.js (abajo a la izquierda, igual que en todos los juegos).
  soundButton();
}

// Barra de abajo: personas en cada estado y la ronda.
function bottomBar(v) {
  const g = grp({}, L.ui);
  g.innerHTML = `<rect x="0" y="652" width="1280" height="68" fill="#10152e" opacity=".85"/>`;
  const item = (x, color, id) => grp({ transform: tr(x, 686) }, g, `<circle r="13" fill="${color}" stroke="#0e1330" stroke-width="2.5"/><text id="${id}" x="24" y="2" dominant-baseline="middle" font-size="28" fill="${COL.ink}">0</text>`);
  item(52, COL.rumor, 'cR'); item(172, COL.truth, 'cT'); item(292, COL.none, 'cN');
  grp({}, g, `<text id="cRound" x="430" y="688" dominant-baseline="middle" font-size="24" fill="${COL.dim}"></text>`);
  const upd = (round) => {
    let r = 0, t = 0; v.nodes.forEach(nd => { if (nd.st === 1) r++; else if (nd.st === 2) t++; });
    $('#cR').textContent = r; $('#cT').textContent = t; $('#cN').textContent = NET.n - r - t;
    if (round != null) $('#cRound').textContent = round >= 0 ? 'Ronda ' + round : '';
    return { r, t };
  };
  upd(-1);
  return upd;
}

function level(id) {
  clearAll(); Game.screen = 'nivel' + id;
  const lv = LEVELS[id - 1], tk = Game.token, alive = () => tk === Game.token;
  const v = drawNet(L.world, { group: lv.group });
  L.world.__v = v;
  const upd = bottomBar(v);
  // Encabezado: nivel, nombre y consigna en una línea.
  button(L.ui, 52, 44, 72, 52, '☰', menu, { fill: '#2c3770', ink: COL.ink, fs: 28 }).dataset.label = 'menu';
  const head = grp({}, L.ui, `<text x="104" y="30" font-size="19" fill="${COL.dim}">Nivel ${id === 8 ? '∞' : id} · ${esc(lv.name)}</text><text id="hint" x="104" y="64" font-size="25" fill="${COL.ink}">${esc(lv.text)}</text>`);
  // La consigna siempre en una línea: si no entra, se achica la letra.
  const fit = () => { const h = $('#hint'); let fs = 25; h.setAttribute('font-size', fs); while (h.getBBox().width > 1070 && fs > 15) h.setAttribute('font-size', --fs); };
  const hint = t => { $('#hint').textContent = t; fit(); anim($('#hint'), [{ opacity: 0 }, { opacity: 1 }], 300); };
  fit();
  soundButton();
  let speed = 650;
  const fast = button(L.ui, 1196, 686, 76, 48, '⏩', () => { speed = speed === 650 ? 260 : 650; fast.querySelector('rect:nth-child(2)').setAttribute('fill', speed === 650 ? '#2c3770' : COL.gold); }, { fill: '#2c3770', ink: COL.ink, fs: 24 });
  fast.dataset.label = 'rapido';

  async function play(sim, from = 0, to = Infinity) {
    for (let r = from; r < Math.min(sim.events.length, to); r++) {
      if (!alive()) return false;
      const ev = sim.events[r];
      for (const g of ev) if (g.from >= 0) particle(g.from, g.to, g.type, speed * .55);
      await sleep(speed * .55);
      if (!alive()) return false;
      for (const g of ev) { v.set(g.to, g.type, g.check); if (g.to < NET.n) Sound.pip(g.type); }
      upd(r);
      await sleep(speed * .45);
    }
    return alive();
  }
  function finish(value, text, extra) {
    const stars = lv.type === 'contar' ? 3 : starsFor(lv, value);
    Save.set(id, stars);
    Game.result = { value, stars };
    Game.phase = 'fin';
    stars ? Sound.win(stars) : Sound.lose();
    const ov = grp({}, L.over);
    el('rect', { x: -800, y: -600, width: 2880, height: 1920, fill: '#0b0f24', opacity: .6 }, ov);
    const card = grp({}, grp({ transform: tr(640, 360) }, ov));
    const fact = lv.fact ? wrap(lv.fact, 52) : [];
    card.innerHTML = `<rect x="-330" y="-230" width="660" height="460" rx="28" fill="#232c5c" stroke="${stars ? COL.gold : '#5a67a8'}" stroke-width="4"/>
<text y="-172" text-anchor="middle" font-size="40" fill="${COL.ink}">${stars ? (stars === 3 ? '¡Excelente!' : '¡Lo lograste!') : 'Todavía no'}</text>
${lv.goal || lv.type === 'contar' ? [0, 1, 2].map(i => starSvg((i - 1) * 70, -105, 28, i < stars)).join('') : ''}
${text.map((t, i) => `<text y="${-30 + i * 38}" text-anchor="middle" font-size="${i ? 22 : 30}" fill="${i ? COL.dim : COL.ink}">${esc(t)}</text>`).join('')}
${fact.map((t, i) => `<text y="${74 + i * 26}" text-anchor="middle" font-size="19" fill="#b9c4ea">${esc(t)}</text>`).join('')}`;
    anim(card, [{ transform: 'scale(.6)', opacity: 0 }, { transform: 'scale(1)', opacity: 1 }], { duration: 380, easing: EB });
    button(ov, 470, 545, 210, 58, '↻ Otra vez', () => level(id), { fill: '#3a4683', ink: COL.ink }).dataset.label = 'otra';
    if (stars && id < 8) button(ov, 810, 545, 210, 58, 'Siguiente ▶', () => level(id + 1)).dataset.label = 'siguiente';
    else button(ov, 810, 545, 210, 58, '☰ Niveles', menu, { fill: '#3a4683', ink: COL.ink }).dataset.label = 'niveles';
  }
  const goalText = () => lv.goal.min ? `Meta: ${lv.goal.min[0]} o más` : `Meta: ${lv.goal.max[0]} o menos`;

  // ----- Nivel 1: el rumor contra la verdad aburrida.
  if (lv.type === 'contar') {
    let rumorN = 0;
    Game.phase = 'elegir';
    Game.onNode = async i => {
      if (Game.phase === 'elegir') {
        Game.phase = 'corriendo'; mark(v, i, 'src'); bubble(i, lv.rumor, 1); Sound.place();
        const s = simulate(NET, { rumor: [{ node: i }], p: lv.p });
        await sleep(900);
        if (!await play(s)) return;
        rumorN = s.rumor;
        await sleep(900); if (!alive()) return;
        v.reset(); v.marks.innerHTML = ''; upd(-1);
        hint('Ahora contá la verdad, que es aburrida. Tocá a cualquier persona.');
        Game.phase = 'verdad';
      } else if (Game.phase === 'verdad') {
        Game.phase = 'corriendo'; mark(v, i, 'tru'); bubble(i, lv.truth, 2); Sound.place();
        const s = simulate(NET, { truth: [{ node: i, strong: false }], q: lv.q });
        await sleep(900);
        if (!await play(s)) return;
        await sleep(700); if (!alive()) return;
        finish(s.truth, [`El rumor llegó a ${rumorN} personas.`, `La verdad aburrida, a ${s.truth}.`]);
      }
    };
  }

  // ----- Nivel 2: elegir quién lo cuenta (5 rondas).
  if (lv.type === 'elegir') {
    Game.phase = 'elegir';
    Game.onNode = async i => {
      if (Game.phase !== 'elegir') return;
      Game.phase = 'corriendo'; mark(v, i, 'src'); bubble(i, lv.rumor, 1); Sound.place();
      const s = simulate(NET, { rumor: [{ node: i }], p: lv.p });
      await sleep(800);
      if (!await play(s, 0, lv.rounds + 1)) return;
      const val = s.byRound[Math.min(lv.rounds, s.byRound.length - 1)].rumor;
      await sleep(700); if (!alive()) return;
      finish(val, [`En ${lv.rounds} rondas llegó a ${val} personas.`, goalText()]);
    };
  }

  // ----- Niveles 3, 4 y 5: frenar con verificadores.
  if (lv.type === 'frenar') {
    Game.phase = 'armar';
    const chk = new Map(); let limit = 0;
    mark(v, lv.src, 'src');
    const shields = grp({ transform: tr(640, 686) }, L.ui);
    const drawShields = () => { shields.innerHTML = Array.from({ length: lv.k }, (_, k) => `<path transform="translate(${(k - (lv.k - 1) / 2) * 40} 0)" d="M0 -16 L14 -10 C14 4 8 12 0 17 C-8 12 -14 4 -14 -10Z" fill="${k < lv.k - chk.size ? COL.check : '#2c3770'}" stroke="#0e1330" stroke-width="2.5"/>`).join(''); };
    drawShields();
    const go = button(L.ui, 1050, 686, 170, 48, '▶ Empezar', start);
    go.dataset.label = 'empezar';
    let limB = null;
    if (lv.group) {
      limB = button(L.ui, 820, 686, 250, 48, 'Límite de reenvío: NO', () => {
        if (Game.phase !== 'armar') return;
        limit = limit ? 0 : 5;
        limB.label('Límite de reenvío: ' + (limit ? 'SÍ' : 'NO'));
        limB.querySelector('rect:nth-child(2)').setAttribute('fill', limit ? COL.wa : '#2c3770');
        v.waLim.setAttribute('opacity', limit ? 1 : 0);
      }, { fill: '#2c3770', ink: COL.ink, fs: 20 });
      limB.dataset.label = 'limite';
    }
    bubble(lv.src, lv.rumor, 1);
    Game.onNode = i => {
      if (Game.phase !== 'armar' || i === lv.src) return;
      if (chk.has(i)) { chk.get(i).remove(); chk.delete(i); Sound.tap(); }
      else if (chk.size < lv.k) { chk.set(i, mark(v, i, 'chk')); Sound.place(); }
      else { Sound.no(); hint('Ya usaste todos. Tocá un verificador para sacarlo y ponerlo en otro lado.'); }
      drawShields();
    };
    async function start() {
      if (Game.phase !== 'armar') return;
      Game.phase = 'corriendo'; go.off(true); if (limB) limB.off(true);
      const s = simulate(NET, { rumor: [{ node: lv.src }], checkers: [...chk.keys()], p: lv.p, q: lv.q, group: lv.group ? { members: MEMBERS, limit } : null });
      if (!await play(s)) return;
      await sleep(700); if (!alive()) return;
      finish(s.rumor, [`El rumor llegó a ${s.rumor} de ${NET.n} personas.`, goalText()]);
    }
  }

  // ----- Nivel 6: la carrera de la verdad.
  if (lv.type === 'carrera') {
    Game.phase = 'listo';
    mark(v, lv.src, 'src');
    const picks = [];
    const go = button(L.ui, 1050, 686, 170, 48, '▶ Empezar', async () => {
      if (Game.phase !== 'listo') return;
      Game.phase = 'corriendo'; go.off(true); bubble(lv.src, lv.rumor, 1);
      const s0 = simulate(NET, { rumor: [{ node: lv.src }], p: lv.p });
      await sleep(700);
      if (!await play(s0, 0, lv.at)) return;
      hint(`¡Rápido! Tocá ${lv.k} personas que todavía no sepan nada.`);
      Game.phase = 'elegir';
    });
    go.dataset.label = 'empezar';
    Game.onNode = async i => {
      if (Game.phase !== 'elegir') return;
      if (v.nodes[i].st !== 0 || picks.includes(i)) { Sound.no(); return; }
      picks.push(i); mark(v, i, 'tru'); Sound.place();
      if (picks.length < lv.k) return;
      Game.phase = 'corriendo'; bubble(picks[0], lv.truth, 2);
      const s = simulate(NET, { rumor: [{ node: lv.src }], truth: picks.map(n => ({ node: n, round: lv.at })), p: lv.p, q: lv.q });
      await sleep(600);
      if (!await play(s, lv.at)) return;
      await sleep(700); if (!alive()) return;
      finish(s.truth, [`La verdad llegó a ${s.truth} personas; el rumor, a ${s.rumor}.`, goalText()]);
    };
  }

  // ----- Nivel 7: ¿quién lo empezó?
  if (lv.type === 'detective') {
    const origin = Math.floor(Math.random() * NET.n);
    const s = simulate(NET, { rumor: [{ node: origin }], p: lv.p });
    Game.origin = origin;
    s.events.forEach(ev => ev.forEach(g => { if (g.to < NET.n) { v.nodes[g.to].st = 1; v.nodes[g.to].b.setAttribute('fill', COL.rumor); v.nodes[g.to].m.setAttribute('d', 'M-3 5 a3 3.4 0 1 0 6 0 a3 3.4 0 1 0 -6 0'); } }));
    upd(-1);
    let asks = 0; const asked = new Set();
    const cnt = grp({}, L.ui, `<text id="asks" x="640" y="688" text-anchor="middle" dominant-baseline="middle" font-size="24" fill="${COL.ink}">Preguntas: 0</text>`);
    Game.phase = 'preguntar';
    Game.onNode = async i => {
      if (Game.phase !== 'preguntar' || asked.has(i)) return;
      asked.add(i); asks++; $('#asks').textContent = 'Preguntas: ' + asks;
      const w = s.when[i], n = NET.nodes[i];
      const b = grp({ transform: tr(n.x, n.y - 26) }, v.badges, `<rect x="-17" y="-15" width="34" height="28" rx="9" fill="${w === 0 ? COL.gold : '#fff'}" stroke="#0e1330" stroke-width="2.5"/><text y="1" text-anchor="middle" dominant-baseline="middle" font-size="19" fill="#1b1f3a">${w}</text>`);
      anim(b.firstElementChild, [{ opacity: 0 }, { opacity: 1 }], 200);
      Sound.tap();
      if (w !== 0) return;
      Game.phase = 'corriendo';
      mark(v, i, 'src'); Sound.check();
      hint('¡Ahí empezó! Mirá cómo se fue contando.');
      await sleep(900); if (!alive()) return;
      v.reset(); upd(-1); speed = 300;
      if (!await play(s)) return;
      await sleep(600); if (!alive()) return;
      finish(asks, [`Lo encontraste con ${asks} preguntas.`, 'Meta: 6 o menos para tres estrellas']);
    };
  }

  // ----- Modo libre.
  if (lv.type === 'libre') {
    Game.phase = 'armar';
    const roles = new Map(); let pIdx = 1;
    const P = [.6, .8, .95], PN = ['poco', 'normal', 'muy'];
    const juicy = button(L.ui, 800, 686, 250, 48, 'Rumor jugoso: normal', () => { pIdx = (pIdx + 1) % 3; juicy.label('Rumor jugoso: ' + PN[pIdx]); }, { fill: '#2c3770', ink: COL.ink, fs: 20 });
    juicy.dataset.label = 'jugoso';
    const go = button(L.ui, 1050, 686, 170, 48, '▶ Empezar', async () => {
      if (Game.phase !== 'armar') return;
      const rumor = [], truth = [], checkers = [];
      roles.forEach((r, i) => { if (r.k === 1) rumor.push({ node: i }); if (r.k === 2) checkers.push(i); if (r.k === 3) truth.push({ node: i }); });
      if (!rumor.length && !truth.length) { Sound.no(); hint('Primero tocá a alguien para que cuente el rumor.'); return; }
      Game.phase = 'corriendo'; go.off(true);
      const s = simulate(NET, { rumor, truth, checkers, p: P[pIdx], q: .45 });
      if (!await play(s)) return;
      hint('Tocá ↻ para armar otro experimento.');
      Game.phase = 'fin';
    });
    go.dataset.label = 'empezar';
    button(L.ui, 610, 686, 76, 48, '↻', () => level(8), { fill: '#3a4683', ink: COL.ink, fs: 26 }).dataset.label = 'otra';
    Game.onNode = i => {
      if (Game.phase !== 'armar') return;
      const cur = roles.get(i); if (cur) cur.g.remove();
      const k = ((cur ? cur.k : 0) + 1) % 4;
      if (k) roles.set(i, { k, g: mark(v, i, ['', 'src', 'chk', 'tru'][k]) }); else roles.delete(i);
      Sound.tap();
    };
  }
}

// ---------- Entrada: tocar personas y resaltar sus amigos.
function nodeAt(p, r = 26) { let best = -1, bd = r; NET.nodes.forEach((n, i) => { const d = Math.hypot(n.x - p.x, n.y - p.y); if (d < bd) { bd = d; best = i; } }); return best; }
stage.addEventListener('pointerdown', e => {
  Sound.init();
  if (!Game.onNode) return;
  const i = nodeAt(toSvg(e.clientX, e.clientY));
  if (i >= 0) Game.onNode(i);
});
stage.addEventListener('pointermove', e => {
  if (!Game.screen || !Game.screen.startsWith('nivel')) return;
  const v = L.world.__v; if (!v) return;
  v.highlight(nodeAt(toSvg(e.clientX, e.clientY), 22));
});
window.addEventListener('keydown', e => {
  if (e.shiftKey && e.key.toLowerCase() === 'd') { Save.open = true; if (Game.screen === 'menu') menu(); }
});
window.addEventListener('contextmenu', e => e.preventDefault());

// Ganchos para las pruebas automáticas.
window.__rumor = {
  get screen() { return Game.screen; }, get phase() { return Game.phase; }, get result() { return Game.result; }, get origin() { return Game.origin; },
  NET, LEVELS, MEMBERS, simulate, starsFor,
  node(i) { return toScreen(NET.nodes[i].x, NET.nodes[i].y); },
  button(label) { const b = [...document.querySelectorAll('.btn')].find(x => x.dataset.label === label && !x.classList.contains('off')); if (!b) return null; const r = b.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; },
};
