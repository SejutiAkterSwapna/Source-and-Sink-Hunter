// Game page: wires DOM events, screens, the render loop, players and saved scores.

import { LEVELS, getTargets } from './levels.js';
import { Game, countFound } from './game.js';
import { divergenceAnalytic, fieldToString, fmt } from './field.js';
import { STRINGS } from './strings.js';
import { browserStore } from './storage.js';
import { mountLayout, preferredLang } from './layout.js';
import { openPlayerDialog } from './player-dialog.js';
import { el, toast } from './ui.js';
import {
  makeView,
  setupCanvas,
  drawBackground,
  drawArrows,
  buildHeatmap,
  drawHeatmap,
  drawTargetMarker,
  drawMissMarker,
  drawCrosshair,
  drawLabel,
} from './render.js';

const $ = (id) => document.getElementById(id);
const MISS_MARKER_MS = 2600;
const MAX_CANVAS = 640;

const store = browserStore(LEVELS.map((l) => l.id));
const game = new Game(LEVELS, () => performance.now());
let layout = null;

const ui = {
  screen: 'start',
  view: null,
  ctx: null,
  cssSize: 0,
  sizeKey: '',
  hover: null, // {px, py}
  missMarkers: [], // {x, y, div, t}
  heatmaps: new Map(), // level id → offscreen canvas
  dirty: true,
  completeTimer: null,
  lastSave: null,
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function applyStrings() {
  for (const node of document.querySelectorAll('[data-text]')) {
    const v = STRINGS[node.dataset.text];
    if (typeof v === 'string') node.textContent = v;
  }
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

const player = () => store.currentPlayer();
const savedLevels = () => {
  const p = player();
  return p ? p.levels : {};
};

function levelSummary(level) {
  const t = getTargets(level);
  const s = t.filter((x) => x.kind === 'source').length;
  const k = t.length - s;
  const parts = [];
  if (s) parts.push(`${s} source${s > 1 ? 's' : ''}`);
  if (k) parts.push(`${k} sink${k > 1 ? 's' : ''}`);
  if (level.components.some((c) => c.type === 'uniform')) parts.push('wind');
  if (level.components.some((c) => c.type === 'swirl')) parts.push('swirl');
  return parts.join(' · ');
}

function modalOpen() {
  return Boolean(document.querySelector('.modal-overlay'));
}

/** Make sure someone is signed in (shows the name/username popup the first time). */
async function ensurePlayer() {
  const p = player();
  if (p) return p;
  const res = await openPlayerDialog(store, { required: true });
  if (!res) return null;
  layout.refresh();
  toast(res.returning ? STRINGS.welcomeBack(res.player.name) : STRINGS.welcomeNew(res.player.name), 'good');
  refreshStart();
  return res.player;
}

// ---------------------------------------------------------------------------
// Screens
// ---------------------------------------------------------------------------

function showScreen(name) {
  ui.screen = name;
  $('screen-start').hidden = name !== 'start';
  $('screen-level').hidden = name !== 'level' && name !== 'complete' && name !== 'completing';
  $('screen-complete').hidden = name !== 'complete';
  $('screen-final').hidden = name !== 'final';
  if (name === 'level' || name === 'complete') {
    resizeCanvas();
    ui.dirty = true;
  }
  if (name === 'complete') $('btn-next').focus();
  if (name === 'level') $('field-canvas').focus({ preventScroll: true });
}

function refreshStart() {
  const p = player();
  const saved = savedLevels();
  const done = Object.keys(saved).length;
  const total = Object.values(saved).reduce((s, r) => s + r.best, 0);
  const greet = $('start-greeting');
  if (p) {
    greet.hidden = false;
    greet.textContent = `${STRINGS.greeting(p.name)} ${done ? STRINGS.progressSummary(done, LEVELS.length, total) : STRINGS.progressNone}`;
  } else {
    greet.hidden = true;
  }
  const hasProgress = done > 0 || (p && p.lastLevel > 0);
  $('btn-start').textContent = hasProgress ? STRINGS.continueAt((p.lastLevel || 0) + 1) : STRINGS.start;
  $('btn-start-new').hidden = !(p && done > 0);

  $('level-select').replaceChildren(
    ...LEVELS.map((lvl, i) => {
      const r = saved[lvl.id];
      return el(
        'button',
        { class: `level-card${r ? ' done' : ''}`, 'data-level': String(i), 'aria-label': `Level ${lvl.id}: ${lvl.title}${r ? `, ${STRINGS.bestShort(r.best)}` : ''}`, onclick: () => startAt(i) },
        el('span', { class: 'level-num', text: r ? '✓' : String(lvl.id) }),
        el('span', { class: 'level-card-text' }, el('strong', { text: `${lvl.id}. ${lvl.title}` }), el('span', { class: 'small muted', text: levelSummary(lvl) })),
        el('span', { class: `level-best ${r ? '' : 'muted'}`, text: r ? STRINGS.bestShort(r.best) : STRINGS.notPlayed }),
      );
    }),
  );
}

function renderLevelNav() {
  const saved = savedLevels();
  $('level-chips').replaceChildren(
    ...LEVELS.map((lvl, i) => {
      const r = saved[lvl.id];
      const current = i === game.index;
      return el(
        'button',
        {
          class: `level-chip${r ? ' done' : ''}${current ? ' current' : ''}`,
          'data-level': String(i),
          'aria-current': current ? 'step' : null,
          title: `${lvl.id}. ${lvl.title}${r ? ` — ${STRINGS.bestShort(r.best)}` : ''}`,
          'aria-label': `Level ${lvl.id}: ${lvl.title}${r ? `, ${STRINGS.bestShort(r.best)}` : ''}`,
          onclick: () => startAt(i),
        },
        el('span', { class: 'chip-num', text: String(lvl.id) }),
        r ? el('span', { class: 'chip-check', 'aria-hidden': 'true', text: '✓' }) : null,
      );
    }),
  );
  $('btn-prev-level').disabled = game.index === 0;
  $('btn-next-level').disabled = game.index === LEVELS.length - 1;
}

async function startAt(index) {
  if (!(await ensurePlayer())) return;
  clearTimeout(ui.completeTimer);
  game.goToLevel(index);
  store.setLastLevel(player().username, game.index);
  enterLevel();
}

function enterLevel() {
  ui.missMarkers = [];
  ui.hover = null;
  const lvl = game.level;
  $('level-number').textContent = STRINGS.level(game.index + 1, LEVELS.length);
  $('level-title').textContent = lvl.title;
  $('level-hint').textContent = lvl.hint;
  $('last-click').innerHTML = `<p class="muted">${escapeHtml(STRINGS.noClickYet)}</p>`;
  renderLevelNav();
  showScreen('level');
  updatePanel();
}

function showComplete() {
  const s = game.state;
  const save = ui.lastSave;
  $('c-score').textContent = String(s.score);
  $('c-bonus-label').textContent = STRINGS.timeBonus(s.elapsedSeconds);
  $('c-bonus').textContent = `+${s.bonus}`;
  $('c-total').textContent = String(s.total);
  const best = $('c-best');
  best.textContent = save ? (save.isNewBest ? STRINGS.newBest : STRINGS.bestWas(save.best)) : '';
  best.classList.toggle('new-best', Boolean(save && save.isNewBest));
  // Show "where …" on its own line and keep each "name = value" together.
  const [expr, where] = fieldToString(game.level).split('   where ');
  $('c-formula').textContent = where ? `${expr}\nwhere ${where.replace(/ = /g, ' = ')}` : expr;
  const last = game.index + 1 >= LEVELS.length;
  $('btn-next').textContent = last ? STRINGS.seeResults : STRINGS.nextLevel;
  showScreen('complete');
}

function showFinal() {
  game.finished = true;
  const p = player();
  const saved = savedLevels();
  const done = Object.keys(saved).length;
  const total = Object.values(saved).reduce((s, r) => s + r.best, 0);
  $('final-heading').textContent = done === LEVELS.length ? STRINGS.finalHeading : STRINGS.finalPartial;
  $('final-player').textContent = p ? `${p.name} · @${p.username}` : '';
  $('final-total').textContent = String(total);
  $('final-breakdown').innerHTML = LEVELS.map((lvl) => {
    const r = saved[lvl.id];
    return `<tr><td>${lvl.id}. ${escapeHtml(lvl.title)}</td><td>${r ? r.best : STRINGS.finalNotDone}</td></tr>`;
  }).join('');
  showScreen('final');
}

// ---------------------------------------------------------------------------
// Panel
// ---------------------------------------------------------------------------

function updatePanel() {
  const s = game.state;
  $('tool-source').setAttribute('aria-pressed', String(s.tool === 'source'));
  $('tool-sink').setAttribute('aria-pressed', String(s.tool === 'sink'));
  $('score').textContent = String(s.score);
  const c = countFound(s);
  $('found').textContent = STRINGS.found(c.sources, c.sourcesTotal, c.sinks, c.sinksTotal);
  const r = savedLevels()[game.level.id];
  $('level-best').textContent = r ? STRINGS.bestWas(r.best) : '';
  const hintBtn = $('btn-hint');
  hintBtn.disabled = s.hintUsed || s.complete;
  hintBtn.textContent = s.hintUsed ? STRINGS.hintUsed : STRINGS.hintButton;
  $('heat-legend').hidden = !s.hintUsed;
  updateTimer();
}

function updateTimer() {
  const s = game.state;
  const secs = s.complete ? s.elapsedSeconds : Math.max(0, Math.floor((performance.now() - s.startTime) / 1000));
  const t = `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`;
  const node = $('timer');
  if (node.textContent !== t) node.textContent = t;
}

function bumpScore() {
  const node = $('score');
  node.classList.remove('score-bump');
  void node.offsetWidth; // restart animation
  node.classList.add('score-bump');
}

function showLastClick(r) {
  const good = r.type === 'hit';
  const cls = good ? 'good' : r.type === 'already' ? '' : 'bad';
  const delta = r.delta > 0 ? ` (+${r.delta})` : r.delta < 0 ? ` (${fmt(r.delta, 0)})` : '';
  $('last-click').innerHTML =
    `<p class="coords">${escapeHtml(STRINGS.coords(fmt(r.x), fmt(r.y)))}</p>` +
    `<p class="div">${escapeHtml(STRINGS.divValue(fmt(r.div)))}${escapeHtml(delta)}</p>` +
    `<p class="verdict ${cls}">${escapeHtml(r.verdict)}</p>`;
}

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

function clickWorld(x, y) {
  if (ui.screen !== 'level') return null;
  const r = game.click(x, y);
  if (r.type === 'ignored') return r;
  if (r.type !== 'hit' && r.type !== 'already') {
    ui.missMarkers.push({ x, y, div: r.div, t: performance.now() });
  }
  showLastClick(r);
  if (r.delta) bumpScore();
  ui.dirty = true;
  if (game.state.complete) {
    const s = game.state;
    const p = player();
    ui.lastSave = p ? store.recordLevel(p.username, game.level.id, { score: s.total, seconds: s.elapsedSeconds, hintUsed: s.hintUsed }) : null;
    if (p) store.setLastLevel(p.username, Math.min(game.index + 1, LEVELS.length - 1));
    layout.refresh();
    renderLevelNav();
    // Let the player see the final marker before the dialog appears.
    ui.screen = 'completing';
    ui.completeTimer = setTimeout(showComplete, 450);
  }
  updatePanel();
  return r;
}

function setTool(tool) {
  if (ui.screen !== 'level') return;
  game.setTool(tool);
  updatePanel();
}

function useHint() {
  if (ui.screen !== 'level') return;
  if (game.useHint()) {
    bumpScore();
    updatePanel();
    ui.dirty = true;
  }
}

function restartLevel() {
  if (ui.screen !== 'level') return;
  game.restartLevel();
  enterLevel();
}

function nextLevel() {
  if (game.index + 1 >= LEVELS.length) showFinal();
  else startAt(game.index + 1);
}

function onPlayerChanged() {
  clearTimeout(ui.completeTimer);
  game.reset();
  refreshStart();
  showScreen('start');
}

// ---------------------------------------------------------------------------
// Canvas
// ---------------------------------------------------------------------------

function resizeCanvas() {
  const wrap = $('canvas-wrap');
  const size = Math.floor(Math.min(MAX_CANVAS, wrap.clientWidth || MAX_CANVAS));
  if (size <= 0) return;
  const key = `${size}@${window.devicePixelRatio || 1}`;
  if (ui.sizeKey === key) return;
  ui.sizeKey = key;
  ui.cssSize = size;
  ui.ctx = setupCanvas($('field-canvas'), size);
  ui.view = makeView(size, { margin: size < 420 ? 24 : 30 });
  ui.dirty = true;
}

function heatmapFor(level) {
  if (!ui.heatmaps.has(level.id)) ui.heatmaps.set(level.id, buildHeatmap(level, 100));
  return ui.heatmaps.get(level.id);
}

function draw(now) {
  const { ctx, view } = ui;
  if (!ctx || !view) return;
  const s = game.state;
  drawBackground(ctx, view);
  if (s.hintUsed) drawHeatmap(ctx, view, heatmapFor(s.level));
  drawArrows(ctx, view, s.level, 21);
  for (const t of s.targets) if (t.found) drawTargetMarker(ctx, view, t);

  ui.missMarkers = ui.missMarkers.filter((m) => now - m.t < MISS_MARKER_MS);
  for (const m of ui.missMarkers) {
    const age = (now - m.t) / MISS_MARKER_MS;
    drawMissMarker(ctx, view, m, age < 0.7 ? 1 : 1 - (age - 0.7) / 0.3);
  }

  if (ui.hover && view.inside(ui.hover.px, ui.hover.py)) {
    drawCrosshair(ctx, view, ui.hover.px, ui.hover.py);
    if (s.hintUsed) {
      const [x, y] = view.toWorld(ui.hover.px, ui.hover.py);
      drawLabel(ctx, view, ui.hover.px, ui.hover.py, `div F = ${fmt(divergenceAnalytic(s.level, x, y))}`, {
        bg: 'rgba(37, 99, 235, 0.92)',
      });
    }
  }
}

function loop(now) {
  if (ui.screen === 'level' || ui.screen === 'complete' || ui.screen === 'completing') {
    updateTimer();
    if (ui.dirty || ui.missMarkers.length) {
      ui.dirty = false;
      try {
        draw(now);
      } catch (err) {
        console.error(err);
      }
    }
  }
  requestAnimationFrame(loop);
}

function eventToCanvas(e) {
  const rect = $('field-canvas').getBoundingClientRect();
  return { px: e.clientX - rect.left, py: e.clientY - rect.top };
}

function drawExample() {
  const size = 220;
  const ctx = setupCanvas($('example-canvas'), size);
  const view = makeView(size, { margin: 0 });
  const example = { components: [{ type: 'charge', x0: 0, y0: 0, q: 2 }] };
  drawBackground(ctx, view, { ticks: false });
  drawArrows(ctx, view, example, 11);
  drawTargetMarker(ctx, view, { x: 0, y: 0, kind: 'source' });
}

// ---------------------------------------------------------------------------
// Wiring
// ---------------------------------------------------------------------------

function init() {
  applyStrings();
  layout = mountLayout({ active: 'play', store, onPlayerChange: onPlayerChanged, onReset: onPlayerChanged });
  drawExample();
  $('link-howto').href = `instruction/${preferredLang()}/`;

  $('btn-start').addEventListener('click', () => {
    const p = player();
    startAt(p ? p.lastLevel || 0 : 0);
  });
  $('btn-start-new').addEventListener('click', () => layout.startFromNew());
  $('btn-again').addEventListener('click', () => startAt(0));
  $('btn-next').addEventListener('click', nextLevel);
  $('btn-replay').addEventListener('click', () => startAt(game.index));
  $('btn-hint').addEventListener('click', useHint);
  $('btn-restart').addEventListener('click', restartLevel);
  $('btn-prev-level').addEventListener('click', () => startAt(game.index - 1));
  $('btn-next-level').addEventListener('click', () => startAt(game.index + 1));
  $('tool-source').addEventListener('click', () => setTool('source'));
  $('tool-sink').addEventListener('click', () => setTool('sink'));

  const canvas = $('field-canvas');
  canvas.addEventListener('click', (e) => {
    if (!ui.view) return;
    const { px, py } = eventToCanvas(e);
    if (!ui.view.inside(px, py)) return;
    const [x, y] = ui.view.toWorld(px, py);
    clickWorld(x, y);
  });
  canvas.addEventListener('pointermove', (e) => {
    ui.hover = eventToCanvas(e);
    ui.dirty = true;
  });
  canvas.addEventListener('pointerleave', () => {
    ui.hover = null;
    ui.dirty = true;
  });

  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey || modalOpen()) return;
    if (e.target && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;
    const k = e.key.toLowerCase();
    if (k === 's') setTool('source');
    else if (k === 'k') setTool('sink');
  });

  if ('ResizeObserver' in window) {
    new ResizeObserver(() => {
      if (ui.screen !== 'start' && ui.screen !== 'final') resizeCanvas();
    }).observe($('canvas-wrap'));
  }
  window.addEventListener('resize', () => {
    if (ui.screen !== 'start' && ui.screen !== 'final') resizeCanvas();
  });

  refreshStart();
  requestAnimationFrame(loop);
  // First visit: ask for name + username.
  if (!player()) ensurePlayer();
}

// Testing hook: state reads + clickWorld only.
window.__game = {
  getState() {
    const s = game.state;
    const p = player();
    return {
      screen: ui.screen,
      levelIndex: game.index,
      levelId: game.level.id,
      levelCount: LEVELS.length,
      tool: s.tool,
      score: s.score,
      hintUsed: s.hintUsed,
      complete: s.complete,
      targets: s.targets.map((t) => ({ kind: t.kind, x: t.x, y: t.y, found: t.found })),
      lastResult: s.lastResult && { type: s.lastResult.type, div: s.lastResult.div, verdict: s.lastResult.verdict },
      player: p && { name: p.name, username: p.username, lastLevel: p.lastLevel },
      saved: p ? store.summary(p.username) : null,
      finished: game.finished,
    };
  },
  clickWorld(x, y) {
    const r = clickWorld(x, y);
    return r && { type: r.type, div: r.div, verdict: r.verdict };
  },
};

init();
