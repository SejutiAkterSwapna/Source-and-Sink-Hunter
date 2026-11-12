// All UI text in one place (for easy translation later).
// Functions are used where a value has to be inserted.

export const STRINGS = {
  appTitle: 'Source & Sink Hunter',
  tagline: 'A divergence game',
  developer: 'Sejuti',
  byDeveloper: 'by Sejuti',
  createdBy: 'Designed & developed by',
  footerProject: 'A Vector Analysis class project — Gradient, Divergence, Curl.',
  footerPrivacy: 'Scores are saved only in this browser.',

  introHeading: 'What is divergence?',
  introText:
    'A vector field F(x, y) = (P, Q) tells you which way something flows at every point. ' +
    'Its divergence, div F = ∂P/∂x + ∂Q/∂y, measures how much flow leaves a tiny region around a point. ' +
    'If div F > 0 the flow spreads out — that point is a source. If div F < 0 the flow converges — that point is a sink. ' +
    'If div F = 0 whatever flows in also flows out, even if the arrows are swirling.',
  introTask:
    'Each level hides a few sources and sinks in a vector field. Pick the right tool and click on them. ' +
    'Every click tells you the actual divergence at that point.',
  exampleCaption: 'Example: a source. Arrows point away from it, div F > 0.',
  start: 'Start',
  continueAt: (n) => `Continue — Level ${n}`,
  startFromNew: 'Start from new',
  howToPlay: 'How to play',
  chooseLevel: 'Choose a level',
  greeting: (name) => `Hi, ${name}!`,
  progressSummary: (done, total, score) => `You have finished ${done} of ${total} levels · total score ${score}.`,
  progressNone: 'No levels finished yet — start with Level 1.',
  bestShort: (b) => `Best ${b}`,
  notPlayed: 'Not played',

  // Navigation
  navPlay: 'Play',
  navHowTo: 'How to play',
  navLeaderboard: 'Leaderboard',
  prevLevel: 'Previous level',
  nextLevelShort: 'Next level',
  levelNav: 'Levels',

  // Player
  signIn: 'Sign in',
  switchPlayer: 'Switch player',
  playerMenu: 'Player menu',
  playerDialogTitle: 'Welcome, hunter!',
  playerDialogText: 'Enter your name and pick a username. Your scores are saved under your username, so you can come back later and continue.',
  nameLabel: 'Your name',
  namePlaceholder: 'e.g. Sejuti Swapna',
  usernameLabel: 'Username',
  usernamePlaceholder: 'e.g. sejuti_01',
  usernameHelp: '3–20 characters: letters, numbers, _ . - (must be unique).',
  playerSubmit: "Let's play",
  playerExistsTitle: (u) => `Username “${u}” already exists`,
  playerExistsText: (name, done, score) =>
    `It belongs to ${name} (${done} level${done === 1 ? '' : 's'} finished, ${score} points). Is that you? Continuing will load that player’s saved history.`,
  playerExistsYes: 'Yes, that’s me — continue',
  playerExistsNo: 'No, choose another username',
  welcomeBack: (name) => `Welcome back, ${name}! Your saved scores are loaded.`,
  welcomeNew: (name) => `Nice to meet you, ${name}! Your scores will be saved automatically.`,
  errors: {
    nameRequired: 'Please enter your name.',
    nameLong: 'Name is too long (max 40 characters).',
    usernameRequired: 'Please choose a username.',
    usernameShort: 'Username must be at least 3 characters.',
    usernameLong: 'Username must be at most 20 characters.',
    usernameChars: 'Use only letters, numbers, _ . or -  (no spaces).',
    usernameTaken: 'That username is taken — please choose another one.',
  },

  // Start from new / clear history
  resetTitle: 'Start from new?',
  resetText: (name) => `This deletes all saved level scores of ${name}. Other players are not affected. This cannot be undone.`,
  resetConfirm: 'Delete my scores',
  resetDone: 'Your score history was deleted. Good luck from Level 1!',
  cancel: 'Cancel',

  // Leaderboard
  lbTitle: 'Leaderboard',
  lbIntro: 'Top hunters on this computer, ranked by total score (sum of each player’s best score per level).',
  lbRank: '#',
  lbPlayer: 'Player',
  lbLevels: 'Levels',
  lbTotal: 'Total',
  lbLast: 'Last played',
  lbEmpty: 'No scores yet. Play a level and your name will appear here!',
  lbYou: 'you',
  lbClear: 'Clear history',
  clearTitle: 'Clear all history?',
  clearText: 'This removes every player and every score saved in this browser. This cannot be undone.',
  clearConfirm: 'Clear everything',
  clearDone: 'All history was cleared.',
  lbPlay: 'Play now',

  level: (n, total) => `Level ${n} / ${total}`,
  toolHeading: 'Tool',
  toolSource: 'Source (+)',
  toolSink: 'Sink (−)',
  toolShortcuts: 'Shortcuts: S = source, K = sink',
  found: (fs, ts, fk, tk) => `Sources ${fs}/${ts} · Sinks ${fk}/${tk}`,
  score: 'Score',
  lastClick: 'Last click',
  noClickYet: 'Click on the field to probe the divergence.',
  coords: (x, y) => `(x, y) = (${x}, ${y})`,
  divValue: (d) => `div F = ${d}`,
  hintButton: 'Hint: show divergence heatmap (−50)',
  hintUsed: 'Heatmap on',
  restart: 'Restart level',
  heatmapLegend: 'Heatmap: red = div F > 0, blue = div F < 0',

  // Verdicts
  verdictHitSource: (d) => `Correct! div F = ${d} > 0 — a source.`,
  verdictHitSink: (d) => `Correct! div F = ${d} < 0 — a sink.`,
  verdictAlready: 'Already found — look for the others.',
  verdictWrongToolSink: 'That’s a sink (div F < 0) — switch tool?',
  verdictWrongToolSource: 'That’s a source (div F > 0) — switch tool?',
  verdictNearZero: (d) => `div F ≈ ${d} here — flow is just passing through.`,
  verdictPositive: (d) => `div F = ${d} > 0 — some spreading, but you are not on a source yet.`,
  verdictNegative: (d) => `div F = ${d} < 0 — some converging, but you are not on a sink yet.`,

  // Level complete
  levelComplete: 'Level complete!',
  levelScore: 'Points from clicks',
  timeBonus: (s) => `Time bonus (${s} s)`,
  levelTotal: 'Level total',
  revealHeading: 'The hidden field was',
  nextLevel: 'Next level',
  seeResults: 'See results',
  replayLevel: 'Replay level',
  newBest: 'New personal best!',
  bestWas: (b) => `Your best for this level: ${b}`,

  // Final
  finalHeading: 'All levels cleared!',
  finalPartial: 'Your results so far',
  finalNotDone: '—',
  viewLeaderboard: 'View leaderboard',
  totalScore: 'Total score',
  breakdownLevel: 'Level',
  breakdownScore: 'Score',
  playAgain: 'Play again',
  finalMessage: 'Remember: div F > 0 means flow spreads out (source), div F < 0 means it converges (sink), and swirls or uniform flows have div\u00a0F\u00a0=\u00a00.',
};
