// Level definitions (data only).
// Targets are derived from charge components: q > 0 → source, q < 0 → sink.

export const LEVELS = [
  {
    id: 1,
    title: 'First source',
    hint: 'Arrows spread outward from a source. Find the point they all point away from.',
    components: [{ type: 'charge', x0: 1, y0: 0.5, q: 2 }],
  },
  {
    id: 2,
    title: 'First sink',
    hint: 'A sink swallows flow: every arrow nearby points into it. Switch to the Sink (−) tool.',
    components: [{ type: 'charge', x0: -1.5, y0: -1, q: -2 }],
  },
  {
    id: 3,
    title: 'Pair',
    hint: 'Flow leaves the source and runs into the sink. One of each — use the right tool for each.',
    components: [
      { type: 'charge', x0: -2, y0: 1, q: 2 },
      { type: 'charge', x0: 2, y0: -1.5, q: -2 },
    ],
  },
  {
    id: 4,
    title: 'Windy',
    hint: 'A steady wind pushes everything one way. Uniform flow has zero divergence — look for where arrows still spread or converge.',
    components: [
      { type: 'charge', x0: -2.5, y0: 1.5, q: 2 },
      { type: 'charge', x0: 1.5, y0: 2.5, q: 1.5 },
      { type: 'charge', x0: 1, y0: -2, q: -2 },
      { type: 'uniform', u: 0.6, v: 0.3 },
    ],
  },
  {
    id: 5,
    title: 'Whirlpool trap',
    hint: 'Something is spinning. Rotation is curl, not divergence — a whirlpool is neither a source nor a sink.',
    components: [
      { type: 'charge', x0: -2.5, y0: -2, q: 2 },
      { type: 'charge', x0: 2.5, y0: -2.5, q: -1.8 },
      { type: 'charge', x0: -2, y0: 2.5, q: -2 },
      { type: 'swirl', xc: 2, yc: 2, k: 3 },
    ],
  },
  {
    id: 6,
    title: 'Final',
    hint: 'Everything at once, with weak and strong charges. Weak ones are subtle — look closely.',
    components: [
      { type: 'charge', x0: -3, y0: 2.5, q: 2.5 },
      { type: 'charge', x0: 2.5, y0: 3, q: 0.8 },
      { type: 'charge', x0: 0.5, y0: -1, q: 1.5 },
      { type: 'charge', x0: -2, y0: -3, q: -1.2 },
      { type: 'charge', x0: 3, y0: -1.5, q: -2 },
      { type: 'uniform', u: -0.4, v: 0.3 },
      { type: 'swirl', xc: -3, yc: -0.5, k: 3 },
    ],
  },
];

/** Targets of a level: one per charge component, in order. */
export function getTargets(level) {
  return level.components
    .filter((c) => c.type === 'charge' && c.q !== 0)
    .map((c, i) => ({
      id: i,
      kind: c.q > 0 ? 'source' : 'sink',
      x: c.x0,
      y: c.y0,
      q: c.q,
    }));
}
