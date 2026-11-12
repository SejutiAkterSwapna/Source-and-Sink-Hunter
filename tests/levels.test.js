import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LEVELS, getTargets } from '../src/levels.js';

const charges = (l) => l.components.filter((c) => c.type === 'charge');
const swirls = (l) => l.components.filter((c) => c.type === 'swirl');

test('there are 6 levels with unique ids 1..6, titles and hints', () => {
  assert.equal(LEVELS.length, 6);
  LEVELS.forEach((l, i) => {
    assert.equal(l.id, i + 1);
    assert.ok(l.title && l.hint);
  });
});

for (const level of LEVELS) {
  test(`level ${level.id}: charges inside [-4, 4]²`, () => {
    for (const c of charges(level)) {
      assert.ok(Math.abs(c.x0) <= 4 && Math.abs(c.y0) <= 4, JSON.stringify(c));
    }
  });

  test(`level ${level.id}: charges at least 1.8 apart`, () => {
    const cs = charges(level);
    for (let i = 0; i < cs.length; i++)
      for (let j = i + 1; j < cs.length; j++)
        assert.ok(Math.hypot(cs[i].x0 - cs[j].x0, cs[i].y0 - cs[j].y0) >= 1.8);
  });

  test(`level ${level.id}: swirl centre at least 2 from every charge`, () => {
    for (const s of swirls(level))
      for (const c of charges(level)) assert.ok(Math.hypot(s.xc - c.x0, s.yc - c.y0) >= 2);
  });

  test(`level ${level.id}: has at least one target`, () => {
    assert.ok(getTargets(level).length >= 1);
  });
}

test('level contents match the spec table', () => {
  const summary = LEVELS.map((l) => {
    const t = getTargets(l);
    return {
      sources: t.filter((x) => x.kind === 'source').length,
      sinks: t.filter((x) => x.kind === 'sink').length,
      uniform: l.components.some((c) => c.type === 'uniform'),
      swirl: l.components.some((c) => c.type === 'swirl'),
    };
  });
  assert.deepEqual(summary, [
    { sources: 1, sinks: 0, uniform: false, swirl: false },
    { sources: 0, sinks: 1, uniform: false, swirl: false },
    { sources: 1, sinks: 1, uniform: false, swirl: false },
    { sources: 2, sinks: 1, uniform: true, swirl: false },
    { sources: 1, sinks: 2, uniform: false, swirl: true },
    { sources: 3, sinks: 2, uniform: true, swirl: true },
  ]);
  const u4 = LEVELS[3].components.find((c) => c.type === 'uniform');
  assert.deepEqual([u4.u, u4.v], [0.6, 0.3]);
  assert.equal(swirls(LEVELS[4])[0].k, 3);
  const qs = charges(LEVELS[5]).map((c) => Math.abs(c.q));
  assert.ok(Math.min(...qs) >= 0.8 && Math.max(...qs) <= 2.5 && new Set(qs).size > 1);
});

test('targets are derived correctly from charges', () => {
  const level = {
    components: [
      { type: 'charge', x0: 1, y0: 2, q: 2 },
      { type: 'uniform', u: 1, v: 0 },
      { type: 'charge', x0: -1, y0: -2, q: -0.5 },
      { type: 'swirl', xc: 3, yc: 3, k: 1 },
    ],
  };
  assert.deepEqual(getTargets(level), [
    { id: 0, kind: 'source', x: 1, y: 2, q: 2 },
    { id: 1, kind: 'sink', x: -1, y: -2, q: -0.5 },
  ]);
});
