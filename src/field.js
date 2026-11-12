// Pure math for the game: field evaluation and divergence.
// No DOM / browser code here so it can be unit-tested in Node.

/** Softening length for point charges (world units). */
export const EPSILON = 0.35;
const EPS2 = EPSILON * EPSILON;

// ---------------------------------------------------------------------------
// Individual components
// ---------------------------------------------------------------------------

function chargeField(c, x, y) {
  const dx = x - c.x0;
  const dy = y - c.y0;
  const d2 = dx * dx + dy * dy + EPS2;
  return { P: (c.q * dx) / d2, Q: (c.q * dy) / d2 };
}

function chargeDiv(c, x, y) {
  const dx = x - c.x0;
  const dy = y - c.y0;
  const d2 = dx * dx + dy * dy + EPS2;
  return (2 * c.q * EPS2) / (d2 * d2);
}

function uniformField(c) {
  return { P: c.u, Q: c.v };
}

function swirlField(c, x, y) {
  const dx = x - c.xc;
  const dy = y - c.yc;
  const s = c.k / (1 + dx * dx + dy * dy);
  return { P: -dy * s, Q: dx * s };
}

/** Field of a single component. */
export function evalComponent(c, x, y) {
  switch (c.type) {
    case 'charge':
      return chargeField(c, x, y);
    case 'uniform':
      return uniformField(c);
    case 'swirl':
      return swirlField(c, x, y);
    default:
      throw new Error(`Unknown component type: ${c.type}`);
  }
}

/** Analytic divergence of a single component. */
export function divComponent(c, x, y) {
  switch (c.type) {
    case 'charge':
      return chargeDiv(c, x, y);
    case 'uniform':
    case 'swirl':
      return 0;
    default:
      throw new Error(`Unknown component type: ${c.type}`);
  }
}

// ---------------------------------------------------------------------------
// Whole-level API
// ---------------------------------------------------------------------------

/** F(x, y) = (P, Q) — the sum of all components of the level. */
export function evalField(level, x, y) {
  let P = 0;
  let Q = 0;
  for (const c of level.components) {
    const f = evalComponent(c, x, y);
    P += f.P;
    Q += f.Q;
  }
  return { P, Q };
}

/** div F from the closed-form formulas. */
export function divergenceAnalytic(level, x, y) {
  let d = 0;
  for (const c of level.components) d += divComponent(c, x, y);
  return d;
}

/** div F by central differences: ∂P/∂x + ∂Q/∂y. */
export function divergenceNumeric(level, x, y, h = 1e-4) {
  const dPdx = (evalField(level, x + h, y).P - evalField(level, x - h, y).P) / (2 * h);
  const dQdy = (evalField(level, x, y + h).Q - evalField(level, x, y - h).Q) / (2 * h);
  return dPdx + dQdy;
}

// ---------------------------------------------------------------------------
// Pretty printing
// ---------------------------------------------------------------------------

const MINUS = '−';
const SUB = ['₀', '₁', '₂', '₃', '₄', '₅', '₆', '₇', '₈', '₉'];

function subscript(n) {
  return String(n)
    .split('')
    .map((d) => SUB[Number(d)])
    .join('');
}

/** Format a number compactly with a proper minus sign. */
export function fmt(n, digits = 2) {
  const r = Number(n.toFixed(digits));
  const s = String(Math.abs(r));
  return (r < 0 ? MINUS : '') + s;
}

function signed(value, body, first) {
  const neg = value < 0;
  const mag = Math.abs(value);
  const coef = mag === 1 ? '' : `${fmt(mag)}·`;
  if (first) return `${neg ? MINUS : ''}${coef}${body}`;
  return ` ${neg ? MINUS : '+'} ${coef}${body}`;
}

/**
 * Readable formula for the "reveal" panel, e.g.
 * F = 2·(r − r₁)/(|r − r₁|² + ε²) − 1.5·(r − r₂)/(|r − r₂|² + ε²) + (0.5, 0)
 *     where r₁ = (1, 0.5), r₂ = (−2, 1), ε = 0.35
 */
export function fieldToString(level) {
  let expr = '';
  const where = [];
  let ci = 0;
  let si = 0;
  for (const c of level.components) {
    const first = expr === '';
    if (c.type === 'charge') {
      ci += 1;
      const r = `r${subscript(ci)}`;
      expr += signed(c.q, `(r ${MINUS} ${r})/(|r ${MINUS} ${r}|² + ε²)`, first);
      where.push(`${r} = (${fmt(c.x0)}, ${fmt(c.y0)})`);
    } else if (c.type === 'uniform') {
      expr += `${first ? '' : ' + '}(${fmt(c.u)}, ${fmt(c.v)})`;
    } else if (c.type === 'swirl') {
      si += 1;
      const cc = `c${subscript(si)}`;
      expr += signed(c.k, `(${MINUS}(y ${MINUS} y${subscript(si)}), x ${MINUS} x${subscript(si)})/(1 + |r ${MINUS} ${cc}|²)`, first);
      where.push(`${cc} = (x${subscript(si)}, y${subscript(si)}) = (${fmt(c.xc)}, ${fmt(c.yc)})`);
    }
  }
  if (level.components.some((c) => c.type === 'charge')) where.push(`ε = ${EPSILON}`);
  return `F = ${expr || '0'}${where.length ? `   where ${where.join(', ')}` : ''}`;
}
