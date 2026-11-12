import { test } from 'node:test';
import assert from 'node:assert/strict';
import { evalField, divergenceAnalytic, divergenceNumeric, fieldToString, EPSILON } from '../src/field.js';
import { LEVELS, getTargets } from '../src/levels.js';

// Deterministic PRNG so failures are reproducible.
function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}
const rand = rng(12345);
const randPoint = () => [rand() * 10 - 5, rand() * 10 - 5];

for (const level of LEVELS) {
  test(`level ${level.id}: analytic divergence matches numeric at 200 random points`, () => {
    for (let i = 0; i < 200; i++) {
      const [x, y] = randPoint();
      const a = divergenceAnalytic(level, x, y);
      const n = divergenceNumeric(level, x, y);
      const abs = Math.abs(a - n);
      const rel = abs / Math.max(Math.abs(a), 1e-12);
      assert.ok(abs < 1e-3 || rel < 1e-3, `(${x}, ${y}): analytic ${a} vs numeric ${n}`);
    }
  });
}

test('analytic matches numeric right at and next to each charge', () => {
  for (const level of LEVELS) {
    for (const t of getTargets(level)) {
      for (const [ox, oy] of [[0, 0], [0.1, 0], [0, -0.2], [0.3, 0.3]]) {
        const a = divergenceAnalytic(level, t.x + ox, t.y + oy);
        const n = divergenceNumeric(level, t.x + ox, t.y + oy);
        assert.ok(Math.abs(a - n) / Math.max(Math.abs(a), 1) < 1e-3, `level ${level.id}: ${a} vs ${n}`);
      }
    }
  }
});

test('uniform flow alone has zero divergence', () => {
  const level = { components: [{ type: 'uniform', u: 0.6, v: -1.3 }] };
  for (let i = 0; i < 200; i++) {
    const [x, y] = randPoint();
    assert.ok(Math.abs(divergenceNumeric(level, x, y)) < 1e-6);
    assert.equal(divergenceAnalytic(level, x, y), 0);
  }
});

test('swirl alone has zero divergence', () => {
  const level = { components: [{ type: 'swirl', xc: 1.2, yc: -0.7, k: 3 }] };
  for (let i = 0; i < 200; i++) {
    const [x, y] = randPoint();
    assert.ok(Math.abs(divergenceNumeric(level, x, y)) < 1e-6, `${divergenceNumeric(level, x, y)}`);
    assert.equal(divergenceAnalytic(level, x, y), 0);
  }
});

test('divergence is positive at sources and negative at sinks', () => {
  for (const level of LEVELS) {
    for (const t of getTargets(level)) {
      const d = divergenceAnalytic(level, t.x, t.y);
      if (t.kind === 'source') assert.ok(d > 0, `level ${level.id} source ${d}`);
      else assert.ok(d < 0, `level ${level.id} sink ${d}`);
    }
  }
});

test('point charge divergence at its centre is 2q/ε²', () => {
  const level = { components: [{ type: 'charge', x0: 0, y0: 0, q: 2 }] };
  assert.ok(Math.abs(divergenceAnalytic(level, 0, 0) - (2 * 2) / EPSILON ** 2) < 1e-9);
});

test('evalField sums components', () => {
  const level = {
    components: [
      { type: 'uniform', u: 1, v: 2 },
      { type: 'charge', x0: 0, y0: 0, q: 1 },
    ],
  };
  const f = evalField(level, 1, 0);
  assert.ok(Math.abs(f.P - (1 + 1 / (1 + EPSILON ** 2))) < 1e-12);
  assert.ok(Math.abs(f.Q - 2) < 1e-12);
});

test('fieldToString describes every component', () => {
  for (const level of LEVELS) {
    const s = fieldToString(level);
    assert.ok(s.startsWith('F = '));
    const charges = level.components.filter((c) => c.type === 'charge').length;
    assert.equal((s.match(/ε²\)/g) || []).length, charges);
    if (level.components.some((c) => c.type === 'uniform')) assert.match(s, /\(−?\d+(\.\d+)?, −?\d+(\.\d+)?\)/);
  }
  assert.equal(
    fieldToString({ components: [{ type: 'charge', x0: 1, y0: 0.5, q: 2 }, { type: 'charge', x0: -2, y0: 1, q: -1.5 }, { type: 'uniform', u: 0.5, v: 0 }] }),
    'F = 2·(r − r₁)/(|r − r₁|² + ε²) − 1.5·(r − r₂)/(|r − r₂|² + ε²) + (0.5, 0)   where r₁ = (1, 0.5), r₂ = (−2, 1), ε = 0.35',
  );
});
