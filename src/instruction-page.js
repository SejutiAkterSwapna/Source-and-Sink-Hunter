// Renders /instruction/en and /instruction/bn from src/instructions.js.

import { INSTRUCTIONS, LANGS } from './instructions.js';
import { browserStore } from './storage.js';
import { LEVELS } from './levels.js';
import { mountLayout, rememberLang } from './layout.js';
import { el } from './ui.js';
import { makeView, setupCanvas, drawBackground, drawArrows, drawTargetMarker } from './render.js';

const lang = document.documentElement.lang === 'bn' ? 'bn' : 'en';
const T = INSTRUCTIONS[lang];
const base = document.body.dataset.base || '';

/** Escape, then allow **bold** and `code`. */
function rich(text) {
  const span = document.createElement('span');
  span.innerHTML = String(text)
    .replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, '<code>$1</code>');
  return span;
}

const PATTERN_FIELDS = {
  source: { components: [{ type: 'charge', x0: 0, y0: 0, q: 2 }] },
  sink: { components: [{ type: 'charge', x0: 0, y0: 0, q: -2 }] },
  swirl: { components: [{ type: 'swirl', xc: 0, yc: 0, k: 3 }] },
  wind: { components: [{ type: 'uniform', u: 0.8, v: 0.35 }] },
};

function patternCanvas(key) {
  const c = el('canvas', { class: 'pattern-canvas', 'aria-hidden': 'true' });
  requestAnimationFrame(() => {
    const size = 160;
    const ctx = setupCanvas(c, size);
    const view = makeView(size, { margin: 0 });
    drawBackground(ctx, view, { ticks: false });
    drawArrows(ctx, view, PATTERN_FIELDS[key], 9);
    if (key === 'source' || key === 'sink') drawTargetMarker(ctx, view, { x: 0, y: 0, kind: key });
  });
  return c;
}

function block(b) {
  if (b.p) return el('p', {}, rich(b.p));
  if (b.tip) return el('div', { class: 'tip' }, el('span', { class: 'tip-icon', 'aria-hidden': 'true', text: '💡' }), el('p', {}, rich(b.tip)));
  if (b.formula) return el('p', { class: 'formula' }, b.formula);
  if (b.ul) return el('ul', { class: 'nice-list' }, b.ul.map((t) => el('li', {}, rich(t))));
  if (b.steps) return el('ol', { class: 'steps' }, b.steps.map((t) => el('li', {}, rich(t))));
  if (b.table)
    return el(
      'div',
      { class: 'table-wrap' },
      el('table', { class: 'info-table' }, el('thead', {}, el('tr', {}, b.table.head.map((h) => el('th', { text: h })))), el('tbody', {}, b.table.rows.map((r) => el('tr', {}, r.map((c) => el('td', {}, rich(c))))))),
    );
  if (b.patterns)
    return el(
      'div',
      { class: 'patterns' },
      b.patterns.map((p) => el('figure', { class: `pattern pattern-${p.key}` }, patternCanvas(p.key), el('figcaption', {}, el('strong', { text: p.title }), el('span', {}, rich(p.text))))),
    );
  if (b.faq) return el('div', { class: 'faq' }, b.faq.map((f) => el('details', {}, el('summary', { text: f.q }), el('p', {}, rich(f.a)))));
  return document.createTextNode('');
}

function render() {
  document.title = T.pageTitle;
  const langSwitch = el(
    'div',
    { class: 'lang-switch', role: 'group', 'aria-label': T.langLabel },
    LANGS.map((l) =>
      el('a', {
        href: `${base}instruction/${l.code}/`,
        lang: l.code,
        hreflang: l.code,
        class: l.code === lang ? 'active' : '',
        'aria-current': l.code === lang ? 'page' : null,
        'data-lang': l.code,
        text: l.label,
        onclick: () => rememberLang(l.code),
      }),
    ),
  );

  const hero = el(
    'section',
    { class: 'card hero doc-hero' },
    el(
      'div',
      { class: 'doc-hero-top' },
      el('span', { class: 'dev-badge' }, el('span', { class: 'monogram small-mono', 'aria-hidden': 'true', text: 'S' }), 'Source & Sink Hunter · by ', el('strong', { text: 'Sejuti' })),
      langSwitch,
    ),
    el('h1', { id: 'doc-title', text: T.title }),
    el('p', { class: 'lead', text: T.subtitle }),
    el('p', { class: 'muted small', text: T.readTime }),
    el('div', { class: 'start-actions' }, el('a', { class: 'btn btn-primary btn-big', href: base || './', id: 'doc-play', text: T.play }), el('a', { class: 'btn btn-ghost btn-big', href: `${base}leaderboard/`, text: T.leaderboard })),
  );

  const toc = el('nav', { class: 'card toc', 'aria-label': T.toc }, el('h2', { text: T.toc }), el('ol', {}, T.sections.map((s) => el('li', {}, el('a', { href: `#${s.id}`, text: s.title.replace(/^[\d০-৯]+\.\s*/, '') })))));

  const sections = T.sections.map((s) => el('section', { class: 'card doc-section', id: s.id }, el('h2', { text: s.title }), s.blocks.map(block)));

  const bottom = el('div', { class: 'doc-bottom' }, el('a', { class: 'btn btn-primary btn-big', href: base || './', text: T.play }));

  document.getElementById('doc').replaceChildren(hero, el('div', { class: 'doc-layout' }, toc, el('div', { class: 'doc-sections' }, sections, bottom)));
}

rememberLang(lang);
const store = browserStore(LEVELS.map((l) => l.id));
mountLayout({ active: 'howto', store });
render();
