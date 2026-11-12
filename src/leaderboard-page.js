// /leaderboard — all players on this browser ranked by total score.

import { LEVELS } from './levels.js';
import { STRINGS } from './strings.js';
import { browserStore, normalizeUsername } from './storage.js';
import { mountLayout } from './layout.js';
import { el, confirmDialog, toast, formatDate } from './ui.js';

const store = browserStore(LEVELS.map((l) => l.id));
const base = document.body.dataset.base || '';

const MEDALS = ['🥇', '🥈', '🥉'];

function render() {
  const rows = store.leaderboard();
  const me = store.currentPlayer();
  const meKey = me ? normalizeUsername(me.username) : null;

  const podium = el(
    'div',
    { class: 'podium' },
    rows.slice(0, 3).map((p, i) =>
      el(
        'div',
        { class: `card podium-card place-${i + 1}` },
        el('span', { class: 'medal', 'aria-hidden': 'true', text: MEDALS[i] }),
        el('strong', { class: 'podium-name', text: p.name }),
        el('span', { class: 'muted small', text: `@${p.username}` }),
        el('span', { class: 'podium-score', text: String(p.total) }),
        el('span', { class: 'muted small', text: `${p.completed}/${p.levelCount} ${STRINGS.lbLevels.toLowerCase()}` }),
      ),
    ),
  );

  const table = el(
    'div',
    { class: 'table-wrap' },
    el(
      'table',
      { class: 'info-table lb-table', id: 'lb-table' },
      el(
        'thead',
        {},
        el(
          'tr',
          {},
          el('th', { text: STRINGS.lbRank }),
          el('th', { text: STRINGS.lbPlayer }),
          LEVELS.map((l) => el('th', { class: 'num', title: l.title, text: `L${l.id}` })),
          el('th', { class: 'num', text: STRINGS.lbLevels }),
          el('th', { class: 'num', text: STRINGS.lbTotal }),
          el('th', { text: STRINGS.lbLast }),
        ),
      ),
      el(
        'tbody',
        {},
        rows.map((p, i) =>
          el(
            'tr',
            { class: normalizeUsername(p.username) === meKey ? 'me' : '', 'data-username': p.username },
            el('td', { class: 'rank', text: i < 3 ? MEDALS[i] : String(i + 1) }),
            el(
              'td',
              {},
              el('strong', { text: p.name }),
              normalizeUsername(p.username) === meKey ? el('span', { class: 'you-tag', text: STRINGS.lbYou }) : null,
              el('div', { class: 'muted small', text: `@${p.username}` }),
            ),
            LEVELS.map((l) => {
              const r = p.levels[l.id];
              return el('td', { class: `num ${r ? '' : 'muted'}`, title: r ? `${r.attempts}× · ${r.bestSeconds}s` : '', text: r ? String(r.best) : '—' });
            }),
            el('td', { class: 'num', text: `${p.completed}/${p.levelCount}` }),
            el('td', { class: 'num total-cell', text: String(p.total) }),
            el('td', { class: 'small muted', text: formatDate(p.updatedAt) }),
          ),
        ),
      ),
    ),
  );

  const empty = el('div', { class: 'empty', id: 'lb-empty' }, el('p', { text: STRINGS.lbEmpty }), el('a', { class: 'btn btn-primary', href: base || './', text: STRINGS.lbPlay }));

  const clearBtn = el('button', { class: 'btn btn-danger-ghost', id: 'btn-clear-history', text: STRINGS.lbClear, disabled: store.playerCount() === 0, onclick: clearHistory });

  document.getElementById('lb').replaceChildren(
    el(
      'section',
      { class: 'card hero lb-hero' },
      el('div', {}, el('span', { class: 'dev-badge' }, el('span', { class: 'monogram small-mono', 'aria-hidden': 'true', text: 'S' }), 'Source & Sink Hunter · by ', el('strong', { text: 'Sejuti' })), el('h1', { text: STRINGS.lbTitle }), el('p', { class: 'muted', text: STRINGS.lbIntro })),
      el('div', { class: 'lb-actions' }, el('a', { class: 'btn btn-primary', href: base || './', text: STRINGS.lbPlay }), clearBtn),
    ),
    rows.length ? podium : null,
    el('section', { class: 'card lb-card' }, rows.length ? table : empty),
  );
}

async function clearHistory() {
  const ok = await confirmDialog({
    title: STRINGS.clearTitle,
    message: STRINGS.clearText,
    confirmText: STRINGS.clearConfirm,
    cancelText: STRINGS.cancel,
    danger: true,
    id: 'clear-dialog',
  });
  if (!ok) return;
  const me = store.currentPlayer();
  store.clearAll(me ? me.username : null);
  layout.refresh();
  render();
  toast(STRINGS.clearDone, 'good');
}

const layout = mountLayout({ active: 'leaderboard', store, onPlayerChange: render, onReset: render });
render();
