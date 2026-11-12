// Shared site header (brand, navigation, player chip) and footer for every page.

import { STRINGS } from './strings.js';
import { el, confirmDialog, toast } from './ui.js';
import { openPlayerDialog } from './player-dialog.js';

const LANG_KEY = 'ssh.lang';

export function preferredLang() {
  try {
    const v = localStorage.getItem(LANG_KEY);
    if (v === 'en' || v === 'bn') return v;
  } catch {
    /* ignore */
  }
  return 'en';
}

export function rememberLang(lang) {
  try {
    localStorage.setItem(LANG_KEY, lang);
  } catch {
    /* ignore */
  }
}

/** Brand mark: a source (+) and a sink (−), the two things the game is about. */
export function logoSvg(size = 34) {
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', '0 0 40 40');
  svg.setAttribute('width', size);
  svg.setAttribute('height', size);
  svg.setAttribute('aria-hidden', 'true');
  svg.innerHTML =
    '<defs><linearGradient id="lg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#6d5dfc"/><stop offset="1" stop-color="#2563eb"/></linearGradient></defs>' +
    '<rect x="1" y="1" width="38" height="38" rx="11" fill="url(#lg)"/>' +
    '<circle cx="15" cy="16" r="8" fill="#22c55e" stroke="#fff" stroke-width="2"/>' +
    '<path d="M11 16h8M15 12v8" stroke="#fff" stroke-width="2.6" stroke-linecap="round"/>' +
    '<circle cx="27" cy="26" r="6.5" fill="#ef4444" stroke="#fff" stroke-width="2"/>' +
    '<path d="M24 26h6" stroke="#fff" stroke-width="2.6" stroke-linecap="round"/>';
  return svg;
}

function initials(name) {
  const parts = String(name || '?').trim().split(/\s+/);
  return ((parts[0]?.[0] || '?') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
}

/**
 * @param {object} o
 * @param {'play'|'howto'|'leaderboard'} o.active
 * @param {object} o.store
 * @param {(player, returning:boolean) => void} [o.onPlayerChange]
 * @param {() => void} [o.onReset]
 */
export function mountLayout({ active, store, onPlayerChange, onReset }) {
  const base = document.body.dataset.base || '';
  const home = base || './';
  const lang = preferredLang();
  const links = [
    ['play', STRINGS.navPlay, home],
    ['howto', STRINGS.navHowTo, `${base}instruction/${lang}/`],
    ['leaderboard', STRINGS.navLeaderboard, `${base}leaderboard/`],
  ];

  const playerSlot = el('div', { class: 'player-slot', id: 'player-slot' });

  const header = el(
    'header',
    { class: 'topbar' },
    el(
      'a',
      { class: 'brand', href: home, 'aria-label': `${STRINGS.appTitle} ${STRINGS.byDeveloper}` },
      logoSvg(),
      el('span', { class: 'brand-text' }, el('span', { class: 'brand-title', text: STRINGS.appTitle }), el('span', { class: 'brand-by' }, 'by ', el('b', { text: STRINGS.developer }))),
    ),
    el(
      'nav',
      { class: 'mainnav', 'aria-label': 'Main' },
      links.map(([key, label, href]) => el('a', { href, class: key === active ? 'active' : '', 'aria-current': key === active ? 'page' : null, 'data-nav': key, text: label })),
    ),
    playerSlot,
  );

  const footer = el(
    'footer',
    { class: 'site-footer' },
    el(
      'div',
      { class: 'footer-inner' },
      el(
        'div',
        { class: 'credit' },
        el('span', { class: 'monogram', 'aria-hidden': 'true', text: 'S' }),
        el('div', {}, el('div', { class: 'credit-line' }, `${STRINGS.createdBy} `, el('strong', { class: 'dev-name', text: STRINGS.developer })), el('div', { class: 'muted small', text: STRINGS.footerProject })),
      ),
      el('div', { class: 'muted small footer-right' }, el('span', { text: STRINGS.footerPrivacy }), el('span', { text: `© ${new Date().getFullYear()} Sejuti` })),
    ),
  );

  document.getElementById('site-header').replaceWith(header);
  const footSlot = document.getElementById('site-footer');
  if (footSlot) footSlot.replaceWith(footer);

  let menuOpen = false;
  function closeMenu() {
    menuOpen = false;
    const m = document.getElementById('player-menu');
    if (m) m.hidden = true;
    const b = document.getElementById('player-chip');
    if (b) b.setAttribute('aria-expanded', 'false');
  }

  async function switchPlayer() {
    closeMenu();
    const res = await openPlayerDialog(store, { required: !store.currentPlayer() });
    if (!res) return;
    refresh();
    toast(res.returning ? STRINGS.welcomeBack(res.player.name) : STRINGS.welcomeNew(res.player.name), 'good');
    if (onPlayerChange) onPlayerChange(res.player, res.returning);
  }

  async function startFromNew() {
    closeMenu();
    const p = store.currentPlayer();
    if (!p) return;
    const ok = await confirmDialog({
      title: STRINGS.resetTitle,
      message: STRINGS.resetText(p.name),
      confirmText: STRINGS.resetConfirm,
      cancelText: STRINGS.cancel,
      danger: true,
      id: 'reset-dialog',
    });
    if (!ok) return;
    store.resetPlayer(p.username);
    toast(STRINGS.resetDone, 'good');
    refresh();
    if (onReset) onReset();
  }

  function refresh() {
    const p = store.currentPlayer();
    if (!p) {
      playerSlot.replaceChildren(el('button', { class: 'btn btn-primary btn-small', id: 'btn-sign-in', text: STRINGS.signIn, onclick: switchPlayer }));
      return;
    }
    const sum = store.summary(p.username);
    const menu = el(
      'div',
      { class: 'player-menu card', id: 'player-menu', role: 'menu', hidden: true },
      el('div', { class: 'menu-head' }, el('strong', { text: p.name }), el('span', { class: 'muted small', text: `@${p.username}` }), el('span', { class: 'small', text: STRINGS.progressSummary(sum.completed, sum.levelCount, sum.total) })),
      el('button', { class: 'menu-item', role: 'menuitem', id: 'menu-switch', text: STRINGS.switchPlayer, onclick: switchPlayer }),
      el('button', { class: 'menu-item danger', role: 'menuitem', id: 'menu-reset', text: STRINGS.startFromNew, onclick: startFromNew }),
    );
    const chip = el(
      'button',
      {
        class: 'player-chip',
        id: 'player-chip',
        'aria-haspopup': 'menu',
        'aria-expanded': 'false',
        'aria-label': `${STRINGS.playerMenu}: ${p.name}`,
        onclick: (e) => {
          e.stopPropagation();
          menuOpen = !menuOpen;
          menu.hidden = !menuOpen;
          chip.setAttribute('aria-expanded', String(menuOpen));
        },
      },
      el('span', { class: 'avatar', 'aria-hidden': 'true', text: initials(p.name) }),
      el('span', { class: 'chip-text' }, el('span', { class: 'chip-name', id: 'player-name-display', text: p.name }), el('span', { class: 'chip-user', id: 'player-username-display', text: `@${p.username}` })),
      el('span', { class: 'chip-caret', 'aria-hidden': 'true', text: '▾' }),
    );
    playerSlot.replaceChildren(chip, menu);
  }

  document.addEventListener('click', (e) => {
    if (menuOpen && !e.target.closest('#player-menu')) closeMenu();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && menuOpen) closeMenu();
  });

  refresh();
  return { refresh, switchPlayer, startFromNew };
}
