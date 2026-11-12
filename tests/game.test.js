import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createLevelState, handleClick, selectTool, useHint, timeBonus, isComplete, Game, HINT_COST } from '../src/game.js';
import { LEVELS } from '../src/levels.js';

const pair = { id: 99, title: 't', hint: 'h', components: [
  { type: 'charge', x0: -2, y0: 0, q: 2 },
  { type: 'charge', x0: 2, y0: 0, q: -2 },
] };

test('hit inside 0.6 gives +100 and marks found; second click gives nothing', () => {
  const s = createLevelState(pair, 0);
  const r = handleClick(s, -2 + 0.4, 0.3, 1000); // distance 0.5
  assert.equal(r.type, 'hit');
  assert.equal(s.score, 100);
  assert.ok(s.targets[0].found);
  assert.match(r.verdict, /Correct! div F = .* > 0/);
  const r2 = handleClick(s, -2, 0, 2000);
  assert.equal(r2.type, 'already');
  assert.equal(s.score, 100);
});

test('click just outside 0.6 is a miss', () => {
  const s = createLevelState(pair, 0);
  const r = handleClick(s, -2 + 0.65, 0, 0);
  assert.notEqual(r.type, 'hit');
  assert.equal(s.targets[0].found, false);
});

test('wrong tool near a target is a miss that suggests switching tool', () => {
  const s = createLevelState(pair, 0);
  s.score = 100;
  const r = handleClick(s, 2.1, 0.1, 0); // source tool on a sink
  assert.equal(r.type, 'wrong-tool');
  assert.equal(s.score, 75);
  assert.equal(s.targets[1].found, false);
  assert.match(r.verdict, /sink.*switch tool/i);
  selectTool(s, 'sink');
  const r2 = handleClick(s, -2, 0, 0);
  assert.match(r2.verdict, /source.*switch tool/i);
});

test('every click reports the divergence and a verdict', () => {
  const s = createLevelState(pair, 0);
  const r = handleClick(s, 0, 4.5, 0);
  assert.equal(typeof r.div, 'number');
  assert.match(r.verdict, /div F/);
  assert.match(r.verdict, /passing through/);
});

test('score never goes below zero', () => {
  const s = createLevelState(pair, 0);
  for (let i = 0; i < 5; i++) handleClick(s, 0, 4, 0);
  assert.equal(s.score, 0);
  handleClick(s, -2, 0, 0);
  assert.equal(s.score, 100);
  for (let i = 0; i < 10; i++) handleClick(s, 0, 4, 0);
  assert.equal(s.score, 0);
});

test('level completes only when all targets are found; time bonus applied', () => {
  const s = createLevelState(pair, 10_000);
  handleClick(s, -2, 0, 12_000);
  assert.equal(s.complete, false);
  assert.equal(isComplete(s), false);
  selectTool(s, 'sink');
  handleClick(s, 2, 0, 10_000 + 30_500); // 30 whole seconds
  assert.equal(s.complete, true);
  assert.equal(s.elapsedSeconds, 30);
  assert.equal(s.bonus, 200 - 2 * 30);
  assert.equal(s.total, 200 + 140);
  // clicks after completion are ignored
  assert.equal(handleClick(s, 0, 0, 0).type, 'ignored');
  assert.equal(s.score, 200);
});

test('time bonus formula', () => {
  assert.equal(timeBonus(0), 200);
  assert.equal(timeBonus(10), 180);
  assert.equal(timeBonus(10.9), 180);
  assert.equal(timeBonus(99), 2);
  assert.equal(timeBonus(100), 0);
  assert.equal(timeBonus(500), 0);
});

test('hint deducts 50 once only (and not below zero)', () => {
  const s = createLevelState(pair, 0);
  handleClick(s, -2, 0, 0);
  assert.equal(useHint(s), true);
  assert.equal(s.score, 100 - HINT_COST);
  assert.equal(useHint(s), false);
  assert.equal(s.score, 50);
  const t = createLevelState(pair, 0);
  useHint(t);
  assert.equal(t.score, 0);
  assert.ok(t.hintUsed);
});

test('Game plays through all levels and totals the score', () => {
  let now = 0;
  const g = new Game(LEVELS, () => now);
  for (let i = 0; i < LEVELS.length; i++) {
    for (const t of g.state.targets) {
      g.setTool(t.kind);
      now += 1000;
      assert.equal(g.click(t.x, t.y).type, 'hit');
    }
    assert.ok(g.state.complete);
    g.nextLevel();
  }
  assert.ok(g.finished);
  assert.equal(g.results.length, 6);
  assert.equal(g.totalScore, g.results.reduce((s, r) => s + r.total, 0));
  assert.ok(g.totalScore > 6 * 100);
});

test('restartLevel resets level score and found targets', () => {
  const g = new Game(LEVELS, () => 0);
  g.click(1, 0.5);
  assert.ok(g.state.complete);
  g.restartLevel();
  assert.equal(g.state.score, 0);
  assert.equal(g.state.targets[0].found, false);
});

test('goToLevel jumps to any level with a fresh state and clamps the index', () => {
  const g = new Game(LEVELS, () => 0);
  g.click(1, 0.5);
  assert.equal(g.goToLevel(3), 3);
  assert.equal(g.level.id, 4);
  assert.equal(g.state.score, 0);
  assert.ok(g.state.targets.every((t) => !t.found));
  assert.equal(g.goToLevel(99), LEVELS.length - 1);
  assert.equal(g.goToLevel(-2), 0);
  g.nextLevel();
  assert.equal(g.level.id, 2);
});
