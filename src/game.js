// Game state, scoring and hit detection. No DOM access.

import { divergenceAnalytic, fmt } from './field.js';
import { getTargets } from './levels.js';
import { STRINGS } from './strings.js';

export const HIT_RADIUS = 0.6; // world units
export const WRONG_TOOL_RADIUS = 0.8; // "you clicked a sink with the source tool" detection
export const POINTS_HIT = 100;
export const PENALTY_MISS = 25;
export const HINT_COST = 50;
export const NEAR_ZERO = 0.1; // |div F| below this counts as "≈ 0" in the verdict

/** Time bonus: max(0, 200 − 2 × seconds), seconds counted in whole seconds. */
export function timeBonus(seconds) {
  return Math.max(0, 200 - 2 * Math.floor(Math.max(0, seconds)));
}

function dist(ax, ay, bx, by) {
  return Math.hypot(ax - bx, ay - by);
}

/** Fresh state for one level. `now` is a timestamp in milliseconds. */
export function createLevelState(level, now = 0) {
  return {
    level,
    targets: getTargets(level).map((t) => ({ ...t, found: false })),
    tool: 'source',
    score: 0,
    hintUsed: false,
    startTime: now,
    complete: false,
    elapsedSeconds: 0,
    bonus: 0,
    total: 0,
    lastResult: null,
  };
}

export function selectTool(state, tool) {
  if (tool !== 'source' && tool !== 'sink') throw new Error(`Unknown tool: ${tool}`);
  state.tool = tool;
}

/** Turn on the heatmap hint. Costs HINT_COST once per level. Returns true if it was newly enabled. */
export function useHint(state) {
  if (state.hintUsed || state.complete) return false;
  state.hintUsed = true;
  state.score = Math.max(0, state.score - HINT_COST);
  return true;
}

export function countFound(state) {
  const c = { sources: 0, sourcesTotal: 0, sinks: 0, sinksTotal: 0 };
  for (const t of state.targets) {
    if (t.kind === 'source') {
      c.sourcesTotal += 1;
      if (t.found) c.sources += 1;
    } else {
      c.sinksTotal += 1;
      if (t.found) c.sinks += 1;
    }
  }
  return c;
}

export function isComplete(state) {
  return state.targets.every((t) => t.found);
}

function nearest(targets, x, y, predicate, radius) {
  let best = null;
  let bestD = Infinity;
  for (const t of targets) {
    if (!predicate(t)) continue;
    const d = dist(x, y, t.x, t.y);
    if (d <= radius && d < bestD) {
      best = t;
      bestD = d;
    }
  }
  return best;
}

/**
 * Handle a click at world coordinates (x, y).
 * Returns { type: 'hit' | 'miss' | 'wrong-tool' | 'already' | 'ignored', x, y, div, verdict, delta, target? }
 */
export function handleClick(state, x, y, now = 0) {
  const div = divergenceAnalytic(state.level, x, y);
  const d = fmt(div);
  const base = { x, y, div };

  if (state.complete) return { ...base, type: 'ignored', delta: 0, verdict: '' };

  const tool = state.tool;
  const hit = nearest(state.targets, x, y, (t) => !t.found && t.kind === tool, HIT_RADIUS);
  let result;

  if (hit) {
    hit.found = true;
    state.score += POINTS_HIT;
    result = {
      ...base,
      type: 'hit',
      delta: POINTS_HIT,
      target: hit,
      verdict: tool === 'source' ? STRINGS.verdictHitSource(d) : STRINGS.verdictHitSink(d),
    };
    if (isComplete(state)) {
      state.complete = true;
      state.elapsedSeconds = Math.max(0, Math.floor((now - state.startTime) / 1000));
      state.bonus = timeBonus(state.elapsedSeconds);
      state.total = state.score + state.bonus;
    }
  } else if (nearest(state.targets, x, y, (t) => t.found && t.kind === tool, HIT_RADIUS)) {
    result = { ...base, type: 'already', delta: 0, verdict: STRINGS.verdictAlready };
  } else {
    const other = nearest(state.targets, x, y, (t) => !t.found && t.kind !== tool, WRONG_TOOL_RADIUS);
    const before = state.score;
    state.score = Math.max(0, state.score - PENALTY_MISS);
    const delta = state.score - before;
    if (other) {
      result = {
        ...base,
        type: 'wrong-tool',
        delta,
        verdict: other.kind === 'sink' ? STRINGS.verdictWrongToolSink : STRINGS.verdictWrongToolSource,
      };
    } else {
      let verdict;
      if (Math.abs(div) < NEAR_ZERO) verdict = STRINGS.verdictNearZero(d);
      else if (div > 0) verdict = STRINGS.verdictPositive(d);
      else verdict = STRINGS.verdictNegative(d);
      result = { ...base, type: 'miss', delta, verdict };
    }
  }

  state.lastResult = result;
  return result;
}

/**
 * Whole-game controller: level sequence, per-level results, total score.
 * `clock` returns milliseconds (injectable for tests).
 */
export class Game {
  constructor(levels, clock = () => Date.now()) {
    this.levels = levels;
    this.clock = clock;
    this.reset();
  }

  reset() {
    this.index = 0;
    this.results = [];
    this.finished = false;
    this.state = createLevelState(this.levels[0], this.clock());
  }

  get level() {
    return this.levels[this.index];
  }

  get totalScore() {
    return this.results.reduce((s, r) => s + r.total, 0);
  }

  click(x, y) {
    const r = handleClick(this.state, x, y, this.clock());
    if (r.type === 'hit' && this.state.complete) {
      this.results[this.index] = {
        id: this.level.id,
        title: this.level.title,
        score: this.state.score,
        bonus: this.state.bonus,
        seconds: this.state.elapsedSeconds,
        total: this.state.total,
      };
    }
    return r;
  }

  setTool(tool) {
    selectTool(this.state, tool);
  }

  useHint() {
    return useHint(this.state);
  }

  restartLevel() {
    const tool = this.state.tool;
    this.state = createLevelState(this.level, this.clock());
    this.state.tool = tool;
  }

  /** Jump to any level (0-based index). Starts a fresh attempt of that level. */
  goToLevel(index) {
    const i = Math.max(0, Math.min(this.levels.length - 1, Math.trunc(Number(index) || 0)));
    this.index = i;
    this.finished = false;
    this.state = createLevelState(this.level, this.clock());
    return i;
  }

  /** Advance to the next level. Returns false when the game is over. */
  nextLevel() {
    if (this.index + 1 >= this.levels.length) {
      this.finished = true;
      return false;
    }
    this.index += 1;
    this.state = createLevelState(this.level, this.clock());
    return true;
  }
}
