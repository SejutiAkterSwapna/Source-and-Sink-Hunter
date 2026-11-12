// Player + score "database" kept in the browser.
//
//   localStorage["ssh.db.v1"]  → all players and their per-level scores (JSON)
//   cookie "ssh_player"        → username of the player currently signed in
//
// No DOM access here except through the injected `storage` / `session` adapters,
// so the logic can be unit-tested in Node with fakes.

export const DB_KEY = 'ssh.db.v1';
export const SESSION_KEY = 'ssh_player';
export const USERNAME_RE = /^[A-Za-z0-9_.-]{3,20}$/;
export const NAME_MAX = 40;

/** Usernames are unique case-insensitively: "Sejuti" and "sejuti" are the same player. */
export function normalizeUsername(u) {
  return String(u ?? '').trim().toLowerCase();
}

/** Returns null when valid, otherwise an error key from STRINGS.errors. */
export function validateUsername(u) {
  const v = String(u ?? '').trim();
  if (!v) return 'usernameRequired';
  if (v.length < 3) return 'usernameShort';
  if (v.length > 20) return 'usernameLong';
  if (!USERNAME_RE.test(v)) return 'usernameChars';
  return null;
}

export function validateName(n) {
  const v = String(n ?? '').trim();
  if (!v) return 'nameRequired';
  if (v.length > NAME_MAX) return 'nameLong';
  return null;
}

/** In-memory fallback when localStorage is unavailable (private mode, blocked storage…). */
export function memoryStorage() {
  const m = new Map();
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => m.set(k, String(v)),
    removeItem: (k) => m.delete(k),
  };
}

function safe(storage) {
  const mem = memoryStorage();
  const wrap = (fn) => (...args) => {
    try {
      return fn(...args);
    } catch {
      return undefined;
    }
  };
  if (!storage) return mem;
  return {
    getItem: (k) => {
      const v = wrap(() => storage.getItem(k))();
      return v === undefined ? mem.getItem(k) : v;
    },
    setItem: (k, v) => {
      mem.setItem(k, v);
      wrap(() => storage.setItem(k, v))();
    },
    removeItem: (k) => {
      mem.removeItem(k);
      wrap(() => storage.removeItem(k))();
    },
  };
}

function emptyDb() {
  return { version: 1, players: {} };
}

function cleanLevels(levels) {
  const out = {};
  if (!levels || typeof levels !== 'object') return out;
  for (const [id, r] of Object.entries(levels)) {
    if (r && Number.isFinite(r.best)) out[id] = r;
  }
  return out;
}

/**
 * @param {object} opts
 * @param {Storage|null} opts.storage   localStorage-like object
 * @param {{get():string|null,set(v:string):void,clear():void}} [opts.session]  current-player adapter (cookie)
 * @param {() => number} [opts.now]
 * @param {number[]} [opts.levelIds]    ids of all levels (for "completed x / n")
 */
export function createStore({ storage, session, now = () => Date.now(), levelIds = [] } = {}) {
  const st = safe(storage);
  const sess = session || {
    get: () => st.getItem(SESSION_KEY),
    set: (v) => st.setItem(SESSION_KEY, v),
    clear: () => st.removeItem(SESSION_KEY),
  };

  function load() {
    const raw = st.getItem(DB_KEY);
    if (!raw) return emptyDb();
    try {
      const db = JSON.parse(raw);
      if (!db || typeof db !== 'object' || typeof db.players !== 'object' || db.players === null) return emptyDb();
      for (const [k, p] of Object.entries(db.players)) {
        if (!p || typeof p.username !== 'string') delete db.players[k];
        else p.levels = cleanLevels(p.levels);
      }
      return db;
    } catch {
      return emptyDb();
    }
  }

  function save(db) {
    st.setItem(DB_KEY, JSON.stringify(db));
  }

  function clone(p) {
    return p ? JSON.parse(JSON.stringify(p)) : null;
  }

  function totalOf(p) {
    return Object.values(p.levels || {}).reduce((s, r) => s + (r.best || 0), 0);
  }

  function summarize(p) {
    return {
      username: p.username,
      name: p.name,
      total: totalOf(p),
      completed: Object.keys(p.levels || {}).length,
      levelCount: levelIds.length,
      levels: clone(p.levels || {}),
      lastLevel: p.lastLevel || 0,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
    };
  }

  const api = {
    /** Player record by username (case-insensitive), or null. */
    findPlayer(username) {
      return clone(load().players[normalizeUsername(username)]);
    },

    /**
     * Create a new player. Throws { code: 'usernameTaken' } if the username exists,
     * or { code: <validation key> } if invalid.
     */
    createPlayer({ name, username }) {
      const e = validateName(name) || validateUsername(username);
      if (e) throw Object.assign(new Error(e), { code: e });
      const db = load();
      const key = normalizeUsername(username);
      if (db.players[key]) throw Object.assign(new Error('usernameTaken'), { code: 'usernameTaken' });
      const t = now();
      db.players[key] = {
        username: String(username).trim(),
        name: String(name).trim(),
        createdAt: t,
        updatedAt: t,
        lastLevel: 0,
        levels: {},
      };
      save(db);
      sess.set(key);
      return clone(db.players[key]);
    },

    /** Sign in as an existing player (keeps their history). */
    login(username) {
      const p = api.findPlayer(username);
      if (!p) throw Object.assign(new Error('unknownPlayer'), { code: 'unknownPlayer' });
      sess.set(normalizeUsername(username));
      return p;
    },

    /** The signed-in player, or null. */
    currentPlayer() {
      const u = sess.get();
      if (!u) return null;
      const p = api.findPlayer(u);
      if (!p) sess.clear();
      return p;
    },

    signOut() {
      sess.clear();
    },

    /**
     * Save a finished level. Keeps the best score, the last score and the attempt count.
     * Returns { best, previousBest, isNewBest }.
     */
    recordLevel(username, levelId, { score, seconds = 0, hintUsed = false }) {
      const db = load();
      const p = db.players[normalizeUsername(username)];
      if (!p) return null;
      const id = String(levelId);
      const prev = p.levels[id];
      const t = now();
      const previousBest = prev ? prev.best : null;
      const isNewBest = previousBest === null || score > previousBest;
      p.levels[id] = {
        best: isNewBest ? score : previousBest,
        bestSeconds: isNewBest ? seconds : prev.bestSeconds,
        last: score,
        attempts: (prev ? prev.attempts || 0 : 0) + 1,
        hintUsed: isNewBest ? Boolean(hintUsed) : Boolean(prev.hintUsed),
        completedAt: t,
      };
      p.updatedAt = t;
      save(db);
      return { best: p.levels[id].best, previousBest, isNewBest };
    },

    /** Remember which level the player was on (0-based index). */
    setLastLevel(username, index) {
      const db = load();
      const p = db.players[normalizeUsername(username)];
      if (!p || p.lastLevel === index) return;
      p.lastLevel = index;
      save(db);
    },

    /** "Start from new": wipe this player's scores but keep the account. */
    resetPlayer(username) {
      const db = load();
      const p = db.players[normalizeUsername(username)];
      if (!p) return false;
      p.levels = {};
      p.lastLevel = 0;
      p.updatedAt = now();
      save(db);
      return true;
    },

    /**
     * "Clear history": remove every player and score.
     * The player given in `keepUsername` (the one at the keyboard) keeps their
     * account, with no scores, so they stay signed in.
     */
    clearAll(keepUsername = null) {
      const old = load();
      const db = emptyDb();
      const key = normalizeUsername(keepUsername);
      const keep = keepUsername && old.players[key];
      if (keep) {
        db.players[key] = { ...keep, levels: {}, lastLevel: 0, updatedAt: now() };
      } else {
        sess.clear();
      }
      save(db);
    },

    summary(username) {
      const p = load().players[normalizeUsername(username)];
      return p ? summarize(p) : null;
    },

    /** Players with at least one finished level, best total first. */
    leaderboard() {
      return Object.values(load().players)
        .filter((p) => Object.keys(p.levels || {}).length > 0)
        .map(summarize)
        .sort((a, b) => b.total - a.total || b.completed - a.completed || a.updatedAt - b.updatedAt || a.username.localeCompare(b.username));
    },

    playerCount() {
      return Object.keys(load().players).length;
    },
  };
  return api;
}

// ---------------------------------------------------------------------------
// Browser adapters
// ---------------------------------------------------------------------------

/** Cookie-based session (falls back to localStorage if cookies are disabled). */
export function cookieSession(doc, fallback) {
  const read = () => {
    try {
      const m = doc.cookie.split(/;\s*/).find((c) => c.startsWith(`${SESSION_KEY}=`));
      return m ? decodeURIComponent(m.slice(SESSION_KEY.length + 1)) : null;
    } catch {
      return null;
    }
  };
  const write = (v, maxAge) => {
    try {
      doc.cookie = `${SESSION_KEY}=${encodeURIComponent(v)}; max-age=${maxAge}; path=/; SameSite=Lax`;
    } catch {
      /* cookies blocked */
    }
  };
  const fb = safe(fallback);
  return {
    get: () => read() || fb.getItem(SESSION_KEY),
    set: (v) => {
      write(v, 60 * 60 * 24 * 365);
      fb.setItem(SESSION_KEY, v);
    },
    clear: () => {
      write('', 0);
      fb.removeItem(SESSION_KEY);
    },
  };
}

/** The store as used by the pages. */
export function browserStore(levelIds) {
  let ls = null;
  try {
    ls = window.localStorage;
  } catch {
    ls = null;
  }
  return createStore({ storage: ls, session: cookieSession(document, ls), levelIds });
}
