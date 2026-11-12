// Canvas drawing: grid, arrows, heatmap, markers.

import { evalField, divergenceAnalytic, fmt } from './field.js';

export const WORLD_MIN = -5;
export const WORLD_MAX = 5;
const WORLD_SPAN = WORLD_MAX - WORLD_MIN;

const COLORS = {
  bg: '#ffffff',
  grid: '#eef1f6',
  axis: '#b8c0cc',
  tick: '#6b7685',
  source: '#1f9d55',
  sink: '#d64545',
  crosshair: '#1f2937',
  missFill: 'rgba(31, 41, 55, 0.85)',
};

// Arrow colour ramp: light blue → dark blue.
const ARROW_LIGHT = [158, 202, 225];
const ARROW_DARK = [8, 48, 107];
const MAG_CLAMP = 2.5;

/**
 * Coordinate mapping for a canvas of CSS size `size` × `size`.
 * A margin is reserved on the left and bottom for tick labels.
 */
export function makeView(size, { margin = 0 } = {}) {
  const left = margin;
  const top = margin * 0.4;
  const plot = size - left - margin * 0.4;
  const scale = plot / WORLD_SPAN;
  return {
    size,
    left,
    top,
    plot,
    scale,
    toPx: (x, y) => [left + (x - WORLD_MIN) * scale, top + (WORLD_MAX - y) * scale],
    toWorld: (px, py) => [WORLD_MIN + (px - left) / scale, WORLD_MAX - (py - top) / scale],
    inside: (px, py) => px >= left && px <= left + plot && py >= top && py <= top + plot,
  };
}

/** Make a canvas crisp on high-DPI screens. Returns the 2D context scaled to CSS pixels. */
export function setupCanvas(canvas, cssSize) {
  const dpr = window.devicePixelRatio || 1;
  canvas.style.width = `${cssSize}px`;
  canvas.style.height = `${cssSize}px`;
  canvas.width = Math.round(cssSize * dpr);
  canvas.height = Math.round(cssSize * dpr);
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return ctx;
}

function lerpColor(a, b, t) {
  return `rgb(${Math.round(a[0] + (b[0] - a[0]) * t)}, ${Math.round(a[1] + (b[1] - a[1]) * t)}, ${Math.round(a[2] + (b[2] - a[2]) * t)})`;
}

export function drawBackground(ctx, view, { ticks = true } = {}) {
  const { size, left, top, plot } = view;
  ctx.fillStyle = COLORS.bg;
  ctx.fillRect(0, 0, size, size);

  ctx.lineWidth = 1;
  for (let i = WORLD_MIN; i <= WORLD_MAX; i++) {
    const [px] = view.toPx(i, 0);
    const [, py] = view.toPx(0, i);
    ctx.strokeStyle = i === 0 ? COLORS.axis : COLORS.grid;
    ctx.beginPath();
    ctx.moveTo(Math.round(px) + 0.5, top);
    ctx.lineTo(Math.round(px) + 0.5, top + plot);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(left, Math.round(py) + 0.5);
    ctx.lineTo(left + plot, Math.round(py) + 0.5);
    ctx.stroke();
  }
  ctx.strokeStyle = COLORS.axis;
  ctx.strokeRect(left + 0.5, top + 0.5, plot - 1, plot - 1);

  if (!ticks) return;
  const fontSize = Math.max(9, Math.min(12, view.scale * 0.22));
  ctx.fillStyle = COLORS.tick;
  ctx.font = `${fontSize}px system-ui, -apple-system, Segoe UI, Roboto, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  for (let i = WORLD_MIN; i <= WORLD_MAX; i++) {
    const [px] = view.toPx(i, WORLD_MIN);
    ctx.fillText(fmt(i, 0), px, top + plot + 4);
  }
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  for (let i = WORLD_MIN; i <= WORLD_MAX; i++) {
    const [, py] = view.toPx(WORLD_MIN, i);
    ctx.fillText(fmt(i, 0), left - 5, py);
  }
}

/** Arrows on an n × n grid, normalised length, colour encodes |F|. */
export function drawArrows(ctx, view, level, n = 21) {
  // Grid points sit at cell centres so no arrow pokes outside the plot.
  const cell = view.plot / n;
  const len = cell * 0.7;
  const head = Math.max(3, len * 0.32);
  ctx.lineWidth = Math.max(1, cell * 0.07);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      const x = WORLD_MIN + (WORLD_SPAN * (i + 0.5)) / n;
      const y = WORLD_MIN + (WORLD_SPAN * (j + 0.5)) / n;
      const { P, Q } = evalField(level, x, y);
      const mag = Math.hypot(P, Q);
      if (mag < 1e-9) continue;
      const t = Math.sqrt(Math.min(mag, MAG_CLAMP) / MAG_CLAMP);
      const color = lerpColor(ARROW_LIGHT, ARROW_DARK, t);
      // Direction in canvas space (y flipped).
      const ux = P / mag;
      const uy = -Q / mag;
      const [cx, cy] = view.toPx(x, y);
      // Centre the arrow on the grid point; keep it inside the plot.
      const x0 = cx - (ux * len) / 2;
      const y0 = cy - (uy * len) / 2;
      const x1 = cx + (ux * len) / 2;
      const y1 = cy + (uy * len) / 2;
      ctx.strokeStyle = color;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.lineTo(x1 - ux * head * 0.6, y1 - uy * head * 0.6);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x1 - ux * head - uy * head * 0.5, y1 - uy * head + ux * head * 0.5);
      ctx.lineTo(x1 - ux * head + uy * head * 0.5, y1 - uy * head - ux * head * 0.5);
      ctx.closePath();
      ctx.fill();
    }
  }
}

const HEAT_CLAMP = 3;

/** Map divergence to an RGBA colour: red > 0, blue < 0, transparent near 0. */
export function heatColor(div) {
  // asinh compresses big values so small ones stay visible.
  const t = Math.max(-1, Math.min(1, Math.asinh(div * 4) / Math.asinh(HEAT_CLAMP * 4)));
  const a = Math.abs(t);
  const alpha = Math.round(Math.min(1, a * 1.15) * 190);
  return t >= 0 ? [220, 38, 38, alpha] : [37, 99, 235, alpha];
}

/** Pre-render the divergence heatmap of a level to an offscreen canvas (n × n pixels). */
export function buildHeatmap(level, n = 100) {
  const off = document.createElement('canvas');
  off.width = n;
  off.height = n;
  const octx = off.getContext('2d');
  const img = octx.createImageData(n, n);
  for (let j = 0; j < n; j++) {
    const y = WORLD_MAX - ((j + 0.5) * WORLD_SPAN) / n;
    for (let i = 0; i < n; i++) {
      const x = WORLD_MIN + ((i + 0.5) * WORLD_SPAN) / n;
      const [r, g, b, a] = heatColor(divergenceAnalytic(level, x, y));
      const k = (j * n + i) * 4;
      img.data[k] = r;
      img.data[k + 1] = g;
      img.data[k + 2] = b;
      img.data[k + 3] = a;
    }
  }
  octx.putImageData(img, 0, 0);
  return off;
}

export function drawHeatmap(ctx, view, heatCanvas) {
  ctx.save();
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(heatCanvas, view.left, view.top, view.plot, view.plot);
  ctx.restore();
}

/** Filled circle with a + or − symbol (shape, not colour alone). */
export function drawTargetMarker(ctx, view, target) {
  const [px, py] = view.toPx(target.x, target.y);
  const r = Math.max(10, view.scale * 0.42);
  const isSource = target.kind === 'source';
  ctx.save();
  ctx.beginPath();
  ctx.arc(px, py, r, 0, Math.PI * 2);
  ctx.fillStyle = isSource ? COLORS.source : COLORS.sink;
  ctx.shadowColor = 'rgba(0,0,0,0.25)';
  ctx.shadowBlur = 6;
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = '#ffffff';
  ctx.stroke();
  ctx.lineWidth = Math.max(2.5, r * 0.22);
  ctx.lineCap = 'round';
  const s = r * 0.5;
  ctx.beginPath();
  ctx.moveTo(px - s, py);
  ctx.lineTo(px + s, py);
  if (isSource) {
    ctx.moveTo(px, py - s);
    ctx.lineTo(px, py + s);
  }
  ctx.stroke();
  ctx.restore();
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** A label bubble near (px, py) that stays inside the plot area. */
export function drawLabel(ctx, view, px, py, text, { alpha = 1, bg = COLORS.missFill } = {}) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.font = '600 12px system-ui, -apple-system, Segoe UI, Roboto, sans-serif';
  const w = ctx.measureText(text).width + 14;
  const h = 22;
  let x = px + 12;
  let y = py - h - 8;
  if (x + w > view.left + view.plot) x = px - w - 12;
  if (y < view.top) y = py + 10;
  roundRect(ctx, x, y, w, h, 6);
  ctx.fillStyle = bg;
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x + 7, y + h / 2 + 0.5);
  ctx.restore();
}

/** Temporary marker for a missed click: an × plus the divergence value. */
export function drawMissMarker(ctx, view, marker, alpha) {
  const [px, py] = view.toPx(marker.x, marker.y);
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = COLORS.crosshair;
  ctx.lineWidth = 2.5;
  ctx.lineCap = 'round';
  const s = 6;
  ctx.beginPath();
  ctx.moveTo(px - s, py - s);
  ctx.lineTo(px + s, py + s);
  ctx.moveTo(px + s, py - s);
  ctx.lineTo(px - s, py + s);
  ctx.stroke();
  ctx.restore();
  drawLabel(ctx, view, px, py, `div F = ${fmt(marker.div)}`, { alpha });
}

export function drawCrosshair(ctx, view, px, py) {
  ctx.save();
  ctx.strokeStyle = COLORS.crosshair;
  ctx.globalAlpha = 0.7;
  ctx.lineWidth = 1.5;
  const s = 9;
  const g = 3;
  ctx.beginPath();
  ctx.moveTo(px - s, py);
  ctx.lineTo(px - g, py);
  ctx.moveTo(px + g, py);
  ctx.lineTo(px + s, py);
  ctx.moveTo(px, py - s);
  ctx.lineTo(px, py - g);
  ctx.moveTo(px, py + g);
  ctx.lineTo(px, py + s);
  ctx.stroke();
  ctx.restore();
}
