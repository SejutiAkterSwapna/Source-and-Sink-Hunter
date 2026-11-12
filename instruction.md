# Project: Source & Sink Hunter — a Divergence Game (by Sejuti)

You are Claude Code. Build, test and verify this project end to end **without asking the user questions**. Make reasonable decisions yourself and note them in the final report. Only stop and ask if something is truly blocking (for example, no Node.js installed and you cannot install it).

**Developer / author: Sejuti.** The design must make this visible on every page (see §9).

---

## 1. Purpose

This is a browser game for a university Vector Analysis course (Schaum's Outline, Chapter 4: Gradient, Divergence, Curl). The player sees a 2D vector field drawn as arrows and must find the hidden **sources** (div F > 0) and **sinks** (div F < 0) by clicking on them. Each click shows the actual divergence at that point, so the player learns what divergence means visually.

Players sign in with a **name + unique username**. Their per-level scores are saved in the browser and survive a page refresh. A **leaderboard** ranks all players. A beginner-friendly **guide** is available in **English and Bangla**.

The target user is a student presenting this as a class assignment. The game must be easy to run, look polished, and never crash during a demo.

---

## 2. Tech stack (fixed — do not change)

- **Code:** plain **HTML + CSS + vanilla JavaScript (ES modules)**. No frameworks, no build step, no CDN, no web fonts. It must work offline.
- **Drawing:** the **HTML5 Canvas 2D API**.
- **"Database":** the browser only — **localStorage** for data and a **cookie** for the signed-in player. No backend.
- **Unit tests:** **Node's built-in test runner**, Node 18+.
- **End-to-end tests:** **Playwright** (`@playwright/test`, Chromium only).
- **Local server:** `npx http-server` (installed as a devDependency so it works offline), or `python3 -m http.server` as a fallback. ES modules do not work from `file://`, and the README must say so.
- **Routes:** routes are **real folders with an `index.html`**, so they work on any static server with no SPA fallback. Use **relative** asset paths (`../../style.css`) so the site also works from a sub-path.

---

## 3. File structure

```
source-sink-hunter/
├── index.html                  # "/"  the game
├── instruction/
│   ├── index.html              # "/instruction" → redirects to last-used language (default en)
│   ├── en/index.html           # "/instruction/en"  English guide
│   └── bn/index.html           # "/instruction/bn"  Bangla guide
├── leaderboard/index.html      # "/leaderboard"
├── favicon.svg
├── 404.html                    # branded "Page not found" (absolute /paths; Netlify serves it for unknown URLs)
├── _headers, _redirects        # Netlify headers + short-link redirects (copied into dist/)
├── netlify.toml                # build = npm run build, publish = dist
├── scripts/build.mjs           # dependency-free build: copy + verify → dist/
├── style.css
├── src/
│   ├── field.js                # pure math: field evaluation, divergence (analytic + numeric), formula string
│   ├── levels.js               # level definitions (data only) + getTargets()
│   ├── game.js                 # game state, scoring, hit detection, Game class (no DOM)
│   ├── storage.js              # players + scores "database" (pure logic + browser adapters)
│   ├── render.js               # canvas drawing (grid, arrows, heatmap, markers, labels)
│   ├── strings.js              # all game UI text (English) in one object
│   ├── ui.js                   # el() helper, modal, confirmDialog, toast, formatDate
│   ├── layout.js               # shared header (brand, nav, player chip+menu) and footer
│   ├── player-dialog.js        # name + username popup
│   ├── main.js                 # game page wiring, screens, render loop, window.__game hook
│   ├── instructions.js         # guide content in en + bn (data only)
│   ├── instruction-page.js     # renders the guide pages
│   └── leaderboard-page.js     # renders the leaderboard page
├── tests/
│   ├── field.test.js
│   ├── levels.test.js
│   ├── game.test.js
│   ├── storage.test.js
│   └── e2e/smoke.spec.js       # screenshots go to tests/e2e/screenshots/
├── package.json
├── playwright.config.js
└── README.md
```

Keep `field.js`, `levels.js`, `game.js` and `storage.js` free of direct DOM/browser access, so they can be unit-tested in Node. `storage.js` may *export* browser adapters, but its core `createStore()` must take injected `storage`/`session` objects.

---

## 4. The math (implement exactly)

World coordinates are the square **[-5, 5] × [-5, 5]**. y points **up**; convert carefully to canvas pixels, where y points down.

### 4.1 Field components

A level's field F(x, y) = (P, Q) is the **sum** of its components.

**a) Point charge** at (x0, y0) — a source if q > 0, a sink if q < 0. It is softened with ε = 0.35:
```
dx = x - x0, dy = y - y0, d2 = dx² + dy² + ε²
F = q * (dx, dy) / d2
div F = 2 * q * ε² / d2²
```

**b) Uniform flow** (u, v): F = (u, v), div F = 0. This is a distractor.

**c) Swirl** centered at (xc, yc) with strength k. This is a distractor: it has rotation (curl) but no divergence.
```
F = k * (-(y - yc), (x - xc)) / (1 + (x - xc)² + (y - yc)²)
div F = 0
```

### 4.2 Exports from `field.js`

- `EPSILON = 0.35`
- `evalField(level, x, y) → {P, Q}`
- `divergenceAnalytic(level, x, y) → number`, the sum of the component formulas above.
- `divergenceNumeric(level, x, y, h = 1e-4)`, using central differences: `(P(x+h,y) − P(x−h,y))/2h + (Q(x,y+h) − Q(x,y−h))/2h`.
- `fmt(n, digits = 2)`, a compact number format that uses the Unicode minus `−` (e.g. `−10.85`, `0.5`, `2`).
- `fieldToString(level)`, a readable formula. Charges are numbered r₁, r₂… and swirls c₁…. The coefficient is omitted when it is 1. Example (must match exactly in a test):
  `F = 2·(r − r₁)/(|r − r₁|² + ε²) − 1.5·(r − r₂)/(|r − r₂|² + ε²) + (0.5, 0)   where r₁ = (1, 0.5), r₂ = (−2, 1), ε = 0.35`
  (Note the three spaces before `where`. The UI splits the string on them.)

The game uses the **analytic** divergence. The numeric one exists only to prove the formulas in tests.

---

## 5. Levels (`levels.js`)

`LEVELS` is an array of `{ id, title, hint, components }`. `getTargets(level)` returns one target per charge with q ≠ 0, in order: `{ id: index, kind: 'source'|'sink', x, y, q }`.

Use exactly these levels:

| # | Title | Components |
|---|---|---|
| 1 | First source | charge (1, 0.5, q=2) |
| 2 | First sink | charge (−1.5, −1, q=−2) |
| 3 | Pair | charge (−2, 1, 2); charge (2, −1.5, −2) |
| 4 | Windy | charges (−2.5, 1.5, 2), (1.5, 2.5, 1.5), (1, −2, −2); uniform (0.6, 0.3) |
| 5 | Whirlpool trap | charges (−2.5, −2, 2), (2.5, −2.5, −1.8), (−2, 2.5, −2); swirl (2, 2, k=3) |
| 6 | Final | charges (−3, 2.5, 2.5), (2.5, 3, 0.8), (0.5, −1, 1.5), (−2, −3, −1.2), (3, −1.5, −2); uniform (−0.4, 0.3); swirl (−3, −0.5, k=3) |

Hints (one sentence each, for beginners):
1. "Arrows spread outward from a source. Find the point they all point away from."
2. "A sink swallows flow: every arrow nearby points into it. Switch to the Sink (−) tool."
3. "Flow leaves the source and runs into the sink. One of each — use the right tool for each."
4. "A steady wind pushes everything one way. Uniform flow has zero divergence — look for where arrows still spread or converge."
5. "Something is spinning. Rotation is curl, not divergence — a whirlpool is neither a source nor a sink."
6. "Everything at once, with weak and strong charges. Weak ones are subtle — look closely."

Rules (enforced by tests):
- All charges lie inside [-4, 4]².
- Any two charges are at least 1.8 apart.
- Every swirl center is at least 2 from every charge.
- Every level has at least one target.
- Level 6 charge strengths range from 0.8 to 2.5 and are not all equal.

---

## 6. Game logic (`game.js`, no DOM)

Constants:
- `HIT_RADIUS = 0.6`
- `WRONG_TOOL_RADIUS = 0.8`
- `POINTS_HIT = 100`
- `PENALTY_MISS = 25`
- `HINT_COST = 50`
- `NEAR_ZERO = 0.1`

Functions:
- `timeBonus(seconds) = max(0, 200 − 2 × floor(seconds))`
- `createLevelState(level, now)` returns `{ level, targets (with found:false), tool:'source', score:0, hintUsed:false, startTime, complete:false, elapsedSeconds, bonus, total, lastResult }`
- `selectTool(state, 'source'|'sink')`
- `useHint(state)` deducts 50 **once** (score never below 0) and returns whether it was newly enabled.
- `countFound(state)`
- `isComplete(state)`
- `handleClick(state, x, y, now)` returns `{ type, x, y, div, delta, verdict, target? }`. It decides the type in this order:
  1. **ignored**: the level is already complete.
  2. **hit**: within 0.6 of an unfound target of the selected tool's type. +100, mark it found, verdict "Correct! div F = … > 0 — a source." or "… < 0 — a sink." When all targets are found: `complete = true`, `elapsedSeconds = floor((now − start)/1000)`, `bonus = timeBonus(...)`, `total = score + bonus`.
  3. **already**: within 0.6 of an already-found target of that type. No points change. Verdict "Already found — look for the others."
  4. **wrong-tool**: within 0.8 of an unfound target of the *other* type. −25. Verdict "That's a sink (div F < 0) — switch tool?" or the source equivalent.
  5. **miss**: −25 (the score never goes below 0). The verdict depends on |div|:
     - below 0.1: "div F ≈ X here — flow is just passing through."
     - positive: "div F = X > 0 — some spreading, but you are not on a source yet."
     - negative: the matching sink sentence.
- `class Game(levels, clock)` has:
  - properties: `index`, `state`, `results`, `finished`, `level`, `totalScore`
  - methods: `reset()`, `click(x,y)`, `setTool()`, `useHint()`, `restartLevel()` (keeps the selected tool), **`goToLevel(i)`** (clamps the index and starts a fresh attempt), `nextLevel()` (returns false after the last level).

Verdict text comes from `strings.js`.

---

## 7. Storage — the browser "database" (`storage.js`)

### 7.1 Data

- **localStorage key `ssh.db.v1`**:
  ```json
  { "version": 1, "players": {
      "<username lower-case>": {
        "username": "Sejuti", "name": "Sejuti Swapna", "createdAt": 0, "updatedAt": 0, "lastLevel": 0,
        "levels": { "1": { "best": 300, "bestSeconds": 0, "last": 300, "attempts": 1, "hintUsed": false, "completedAt": 0 } }
  } } }
  ```
- **Cookie `ssh_player`**: the signed-in username. Set it with `max-age` of 1 year, `path=/` and `SameSite=Lax`. Also mirror it to localStorage as a fallback when cookies are blocked.
- **localStorage `ssh.lang`**: the last guide language (`en`|`bn`).

### 7.2 API

- `normalizeUsername(u)` trims and lower-cases. Usernames are **unique, case-insensitive**.
- `validateUsername(u)` returns `null` or an error key: `usernameRequired`, `usernameShort` (<3), `usernameLong` (>20), or `usernameChars` (must match `/^[A-Za-z0-9_.-]{3,20}$/`).
- `validateName(n)` returns `null`, `nameRequired`, or `nameLong` (>40).
- `memoryStorage()` returns an in-memory Map-backed storage.
- `createStore({ storage, session?, now?, levelIds? })` provides:
  - `findPlayer(username)` → copy or null
  - `createPlayer({name, username})`: validates, throws `{code:'usernameTaken'}` if the username exists, otherwise creates the player and signs them in.
  - `login(username)`: signs in an existing player. Throws `{code:'unknownPlayer'}` if there is none.
  - `currentPlayer()`: clears a stale session that points to a deleted player.
  - `signOut()`
  - `recordLevel(username, levelId, {score, seconds, hintUsed})`: keeps the best score, the last score, an attempts count, and bestSeconds/hintUsed of the best run. Returns `{best, previousBest, isNewBest}`.
  - `setLastLevel(username, index)`
  - `resetPlayer(username)`: **Start from new**. Clears only that player's levels and lastLevel, and keeps the account.
  - `clearAll(keepUsername?)`: **Clear history**. Removes every player. If `keepUsername` is given, that player keeps an empty account and stays signed in. Otherwise the session is cleared.
  - `summary(username)` → `{username, name, total, completed, levelCount, levels, lastLevel, createdAt, updatedAt}`. `total` is the sum of the best score per level.
  - `leaderboard()`: only players with ≥ 1 finished level, sorted by total desc, then completed desc, then updatedAt asc.
  - `playerCount()`
- Robustness: invalid JSON, a missing or `null` storage, or a storage whose methods **throw** must never crash. Fall back to memory.
- Browser adapters: `cookieSession(document, localStorage)` and `browserStore(levelIds)`.

---

## 8. Pages, screens and behavior

### 8.1 Shared layout on every page (`layout.js`)

- **Header** (sticky, slightly translucent white):
  - Brand logo: an SVG rounded square with a purple→blue gradient, a green "+" circle and a red "−" circle.
  - Title **"Source & Sink Hunter"** with **"by Sejuti"** underneath (Sejuti in gradient text). The brand links home.
  - Navigation: **Play** (`./` or `../../`), **How to play** (→ `instruction/<last language>/`), **Leaderboard**. The active page is a gradient pill.
  - **Top-right player chip**: avatar with initials, name, and @username. Clicking it opens a menu with the name, @username, a progress line, **Switch player**, and **Start from new** (in red). It closes on an outside click or Escape. When nobody is signed in, the chip area shows a **Sign in** button instead.
- **Footer**: "S" monogram, "Designed & developed by **Sejuti**", "A Vector Analysis class project — Gradient, Divergence, Curl.", "Scores are saved only in this browser.", "© <year> Sejuti".
- Each page's `<body data-base="">` (or `"../"`, `"../../"`) gives the relative path to the root.

### 8.2 Name / username popup (`player-dialog.js`)

- It is shown automatically on the game page when no player is signed in. It is **required**: it can't be closed with Escape or a backdrop click. It is also used by "Switch player" and "Sign in", where it can be dismissed if someone is already signed in.
- Contents:
  - a small +/− badge
  - "Welcome, hunter!"
  - an explanation
  - a **Your name** field
  - a **Username** field, with help text "3–20 characters: letters, numbers, _ . - (must be unique)."
  - a **Let's play** button
- Validation errors appear inline under each field.
- If the username **does not exist**, create the player, sign them in, and show the toast "Nice to meet you, …!".
- If the username **already exists**, show a yellow box: "Username "x" already exists. It belongs to <name> (N levels finished, P points). Is that you? …"
  - **"Yes, that's me — continue"** logs in as that player and loads their history (toast "Welcome back, …!").
  - **"No, choose another username"** shows the error "That username is taken — please choose another one."
- While a modal is open, the game's keyboard shortcuts are disabled. Focus is trapped inside the modal and returns to where it was on close.

### 8.3 Game page `/`

1. **Start screen**:
   - A hero card (gradient top strip) with the badge "A Vector Analysis game by **Sejuti**" and the title.
   - A green greeting line, either "Hi, <name>! You have finished X of 6 levels · total score Y." or "… No levels finished yet — start with Level 1."
   - The divergence explanation (div F = ∂P/∂x + ∂Q/∂y; positive = spreads out = source; negative = converges = sink; zero even if swirling) and a formula pill.
   - A static example canvas showing one source.
   - Buttons:
     - **Start**, which becomes **"Continue — Level N"** once the player has progress (it goes to the saved `lastLevel`)
     - **How to play**
     - **Start from new**, shown only when the player has saved scores
   - A **"Choose a level"** grid of 6 cards. Each card shows the number (or ✓ when finished), the title, a content summary (e.g. "2 sources · 1 sink · wind") and "Best N" or "Not played". Clicking a card starts that level.
2. **Level screen**:
   - A **level navigation bar** above the board: ‹ prev, chips **1–6**, › next. The current chip is a gradient pill, finished chips are green with a small ✓ badge, and prev/next are disabled at the ends. Navigating starts a fresh attempt of that level and saves `lastLevel`.
   - The canvas sits on the left (square, responsive, max 640 px). The side panel is on the right and stacks below the canvas under 900 px.
   - The side panel contains:
     - the level pill "Level n / 6", the title and the hint
     - tool toggles **Source (+)** / **Sink (−)** (shortcuts `S` / `K`)
     - Score, a Time (m:ss) counter, and the found counter "Sources a/b · Sinks c/d"
     - "Your best for this level: N" when the player has a saved score
     - the **Last click** box: coordinates, `div F = 3.42` with the point change, and the verdict (green for a hit, orange for a miss)
     - buttons **"Hint: show divergence heatmap (−50)"** (becomes disabled "Heatmap on") and **Restart level**
3. **Level complete** (an overlay ~450 ms after the last hit):
   - "New personal best!" (with a ★) or "Your best for this level: N"
   - A table: points from clicks, "Time bonus (s s)", level total
   - The revealed formula, with "where …" on a new line and no line breaks inside `name = value`
   - Buttons **Replay level** and **Next level** (or **See results** on level 6)
   - On completion, call `recordLevel` with the level total and set `lastLevel` to the next level.
4. **Final screen**:
   - The heading is "All levels cleared!" if all 6 levels are saved, otherwise "Your results so far".
   - The player's name and username, the **total** (sum of saved best scores) in large gradient text, and a per-level table of best scores ("—" for unplayed levels).
   - A reminder sentence, **Play again** (level 1, history is kept), and **View leaderboard**.
- **Start from new** (from the start screen or the menu) shows a confirm dialog: "Start from new?" / "This deletes all saved level scores of <name>. Other players are not affected. This cannot be undone." / **Delete my scores** (red). Then reset the player, show a toast, and return to the start screen. Switching player also returns to the start screen.

### 8.4 Guide pages `/instruction/en` and `/instruction/bn`

- Each is a thin HTML shell (`<html lang="en">` or `lang="bn"`) that loads `instruction-page.js`. The script renders from `instructions.js`, using `document.documentElement.lang`.
- **Hero**:
  - the "Source & Sink Hunter · by **Sejuti**" badge
  - a **language switch** segmented control, **English | বাংলা**, linking to `../en/` and `../bn/` (it saves `ssh.lang`)
  - the title ("How to play" / "কীভাবে খেলবেন"), a subtitle and a read time
  - **Play now** and **Leaderboard** buttons
- **Layout**: a sticky "On this page" table of contents on the left, with section cards on the right. They stack on narrow screens.
- **Content model**: each section has blocks of type `p`, `ul`, `steps` (numbered gradient circles), `table`, `tip` (yellow box with 💡), `formula`, `patterns`, or `faq` (`<details>`). Inline `**bold**`, `*italic*` and `` `code` `` are supported. Always HTML-escape text first.
- **11 sections, written for complete beginners** (no calculus needed). The Bangla text is a faithful, natural translation of the English. Keep the UI words that appear in the game (Start, Source (+), Sink (−), Last click, Next level, Start from new, Clear history…) in English inside the Bangla text, so they match the buttons.
  1. The game in one sentence / এক বাক্যে গেমটি. Tip: arrows = water on a floor; a source is a tap, a sink is a drain.
  2. What do the arrows mean? / তীরচিহ্নগুলোর মানে কী? Covers: vector field; direction = flow; color light→dark blue = weak→strong; equal lengths; the axes run from −5 to 5.
  3. What is divergence? / ডাইভারজেন্স (Divergence) কী? Covers: the tiny-circle explanation of out > in, in > out and equal; the formula; F = (P, Q); you don't need to calculate anything.
  4. Learn to spot the four patterns / চারটি প্যাটার্ন চিনতে শিখুন. Shows 4 mini canvases (source, sink, swirl k=3, wind (0.8, 0.35)), drawn with `render.js` on a 9×9 arrow grid with a +/− marker for source and sink. Tip: rotation is **curl**, not divergence (Level 5).
  5. How to play, step by step / ধাপে ধাপে কীভাবে খেলবেন. Eight steps: name+username popup → Start or Choose a level → look for spreading or pointing in → pick the tool (S/K) → click within 0.6 → read Last click → level complete reveals the formula → Next level or chips 1–6.
  6. Understanding the feedback / ফলাফল বোঝা. A table of: green + circle, red − circle, dark × with number, "switch tool?", "div F ≈ 0 — just passing through".
  7. Scoring / স্কোরিং. A table: +100, −25 (never below 0), hint −50 once per level, time bonus 200 − 2 × seconds. Plus the heatmap explanation (red = positive, blue = negative, live value at the cursor).
  8. Controls / নিয়ন্ত্রণ. A table: click/tap, S, K, ‹ 1–6 ›, Restart level, the name in the top-right corner.
  9. Players, saved scores and the leaderboard / প্লেয়ার, সংরক্ষিত স্কোর এবং লিডারবোর্ড. Covers: auto-save (localStorage + cookie) that survives a refresh; the name in the top-right corner; the same username restores history; unique usernames (case-insensitive); Start from new; the Leaderboard and Clear history. Tip: nothing is sent to the internet.
  10. Tips for beginners / নতুনদের জন্য টিপস. Six tips: start with levels 1–2, look where arrows suddenly change direction, dark arrows are near targets, read the number after a miss, use the hint when stuck, weak targets in level 6.
  11. Questions / প্রশ্নোত্তর. Five FAQs: do I need calculus; why a swirl isn't a source; does a refresh lose progress (no, but the level you were in restarts); another computer (scores are per browser); someone else wants to play (Switch player).
- `/instruction/index.html` redirects with JS to `en/` or `bn/` (from `ssh.lang`), with a `<meta refresh>` to `en/` as a fallback.

### 8.5 Leaderboard `/leaderboard`

- **Hero**: badge "… by **Sejuti**", the title "Leaderboard", and the intro "Top hunters on this computer, ranked by total score (sum of each player's best score per level)." Buttons **Play now** and **Clear history** (red outline; disabled when there are no players).
- **Podium**: cards for the top 3 (🥇🥈🥉) with name, @username, total and "x/6 levels". First place gets a gold tint.
- **Table**: `#` (medals for the top 3), Player (name, a "YOU" tag for the current player, @username), **L1–L6** best scores ("—" if unplayed; the tooltip shows attempts and seconds), Levels "x/6", **Total**, Last played (localized date). Highlight the current player's row. Each row has `data-username`. The table scrolls horizontally inside its card on phones.
- **Empty state**: "No scores yet. Play a level and your name will appear here!" plus Play now.
- **Clear history** shows a confirm dialog: "Clear all history?" / "This removes every player and every score saved in this browser. This cannot be undone." / **Clear everything**. It calls `clearAll(currentUsername)`, then re-renders, shows a toast, and refreshes the header.

### 8.6 Testing hook (game page only)

Expose `window.__game`:
- `getState()` returns `{ screen, levelIndex, levelId, levelCount, tool, score, hintUsed, complete, targets[{kind,x,y,found}], lastResult{type,div,verdict}, player{name,username,lastLevel}, saved (store.summary), finished }`
- `clickWorld(x, y)` uses the same code path as a real canvas click and returns `{type, div, verdict}`.

---

## 9. Rendering and visual design

### Canvas (`render.js`)
- **View**: `makeView(size, {margin})` reserves the left and bottom margins for tick labels and provides `toPx`, `toWorld` and `inside`. `setupCanvas` scales the canvas for `devicePixelRatio`.
- **Background**: white, with faint grid lines every 1 unit, slightly darker axes, and tick labels from −5 to 5 (using `−`).
- **Arrows**: a **21 × 21** grid placed at **cell centers**, so no arrow pokes outside the plot. Every arrow has the same length (70% of a cell). Color goes from light blue `rgb(158,202,225)` to dark blue `rgb(8,48,107)`, using `sqrt(min(|F|, 2.5)/2.5)`.
- **Heatmap** (hint on):
  - It is pre-rendered once per level on an offscreen 100×100 canvas, then scaled with smoothing under the arrows.
  - Color: red `(220,38,38)` for div > 0, blue `(37,99,235)` for div < 0, transparent near 0.
  - Intensity: `t = clamp(asinh(4·div)/asinh(12), −1, 1)`, `alpha = min(1, 1.15|t|)·190`.
- **Found targets**: filled green or red circles with a white outline and a **+** or **−** stroke (symbols, not color alone).
- **Misses**: a dark × plus a rounded label "div F = …" that fades out over 2.6 s. Labels stay inside the plot.
- **Cursor**: a crosshair over the canvas (the native cursor is hidden). The live "div F" label appears **only when the hint is on**.
- **Redraw**: only when something is dirty or a miss marker is still fading. Resize with a ResizeObserver.

### Style (`style.css`)
- **Fonts**: system-ui. For `:lang(bn)`, use the stack Noto Sans Bengali, Kohinoor Bangla, Bangla Sangam MN, Nirmala UI, Vrinda, system-ui. No web fonts.
- **Brand**: a purple→blue gradient (`#6d5dfc → #2563eb`) on primary buttons, active nav pills, the current level chip, avatars, the monogram, "Sejuti" gradient text, and the 4 px top strip on hero cards.
- **Page**: a soft background (`#f4f5fb` plus faint radial tints). Cards are white with 16 px radius, a thin border and a soft shadow.
- **Colors and states**: source green `#1f9d55`, sink red `#d64545`, danger `#dc2626`. Use rounded buttons, visible focus rings, and a fade/pop animation on dialogs. The toast sits at the bottom center (green for success).
- **Responsive**: at ≤ 900 px the level layout stacks, the level grid has 2 columns and the docs table of contents is no longer sticky. At ≤ 720 px the nav wraps to a full-width second row and the @username is hidden in the chip. At ≤ 480 px the level grid has 1 column, chips and paddings get smaller, and headings shrink. There must be **no horizontal page scroll at 400 px** on any page.

---

## 10. Tests

### `package.json`
```json
{
  "name": "source-sink-hunter",
  "type": "module",
  "private": true,
  "scripts": {
    "start": "npx http-server -p 8080 -c-1 .",
    "build": "node scripts/build.mjs",
    "preview": "npm run build && npx http-server dist -p 8080 -c-1",
    "test": "node --test tests/*.test.js",
    "test:e2e": "playwright test",
    "test:dist": "npm run build && SERVE_DIR=dist playwright test",
    "test:all": "npm test && npm run test:e2e"
  },
  "devDependencies": { "@playwright/test": "*", "http-server": "*" },
  "engines": { "node": ">=18" }
}
```
Note: use `tests/*.test.js`, not `tests/`. Node 22+ no longer accepts a bare directory, and the shell glob works on Node 18 and later.

### `playwright.config.js`
- `testDir: './tests/e2e'`, Chromium only, 1 worker, viewport 1280×860, `baseURL: http://localhost:8080`
- The served folder is `process.env.SERVE_DIR || '.'`. The port is 8081 when `SERVE_DIR` is set (so it never clashes with a running `npm start`), otherwise 8080.
- `webServer: { command: \`npx http-server ${dir} -p ${port} -c-1 -s\`, url: \`http://localhost:${port}\`, reuseExistingServer: !process.env.SERVE_DIR }`

### Unit tests (`npm test`)
- **field.test.js**:
  - For every level, at 200 seeded-random points, analytic matches numeric (absolute or relative error < 1e-3). Also check at and next to each charge.
  - Uniform flow and swirl alone have numeric |div| < 1e-6.
  - At each charge, div > 0 for a source and < 0 for a sink.
  - At the center of a charge, div = 2q/ε².
  - `evalField` sums its components.
  - `fieldToString` covers every component and matches the exact example string.
- **levels.test.js**:
  - There are 6 levels with ids 1–6, and each has a title and a hint.
  - All the rules in §5 hold.
  - The level contents match the table (counts, uniform (0.6, 0.3) in level 4, swirl k=3 in level 5, varied strengths in level 6).
  - `getTargets` output is correct.
- **game.test.js**:
  - A hit within 0.6 gives +100 and marks the target found; a second click gives 'already' with no points.
  - A click just outside 0.6 is not a hit.
  - The wrong tool next to a target gives −25 and a verdict mentioning "switch tool".
  - Every click reports div and a verdict.
  - The score is never negative.
  - The level completes only when all targets are found, and the time bonus is right (30.5 s → 140).
  - Clicks after completion are ignored.
  - The `timeBonus` table is correct.
  - The hint costs 50 once and never takes the score below 0.
  - `Game` plays through all levels.
  - `restartLevel` resets.
  - `goToLevel` jumps, resets and clamps the index.
- **storage.test.js** (use `memoryStorage()` fakes):
  - Validation rules work.
  - `createPlayer` signs in, and duplicate usernames are rejected case-insensitively.
  - A returning `login` keeps history; an unknown username throws.
  - `recordLevel` keeps best, last, attempts, bestSeconds and hintUsed.
  - Data survives a "refresh" (a new store on the same storage).
  - `resetPlayer` affects only that player.
  - `leaderboard` is sorted and hides players with no scores.
  - `clearAll` with and without a kept player works.
  - Corrupt JSON, throwing storage and `null` storage never crash.

### E2E (`npm run test:e2e`, `tests/e2e/smoke.spec.js`)

Each test collects console errors and page errors and asserts that there are none.

1. **First visit → all 6 levels → final**:
   - The popup is shown and Escape doesn't close it.
   - Validation errors appear (empty name; username "a b").
   - Register "Sejuti Swapna" / "sejuti". The chip shows the name and @username in the top-right corner.
   - The header says "by Sejuti" and the footer says "Designed & developed by Sejuti".
   - A miss shows div F. Level 1 via the hook gives score 100, the complete dialog says "New personal best", and the formula contains `r₁ = (1, 0.5)`.
   - Level 4: the hint costs 50 once, the button is disabled afterwards, and the wrong tool shows "switch tool".
   - Play to the end. The final heading is "All levels cleared!" and the total equals the saved total, with 6 rows.
   - Screenshots: `player-popup`, `start`, `level-complete`, `level4-heatmap`, `final`. Wait ~400 ms for animations before each.
2. **Persistence and navigation**:
   - Finish levels 1–2, then reload. There is no popup, the chip is still there, and 2 levels are saved with the same best.
   - The start button reads "Continue — Level 3", the level-1 card shows "Best N", and the greeting says "finished 2 of 6".
   - Jump via a level card and the chips; prev/next are disabled at the ends; 2 chips are marked done.
   - Screenshot `level-nav`.
3. **Returning user / unique username / start from new**:
   - Register sejuti and finish level 1. Switch player to "nila" (0 levels).
   - Switch again with "Another person" / "SEJUTI". The "already exists" box appears (screenshot `username-exists`).
   - "No" shows the taken error. Submitting again and choosing "Yes" loads sejuti with 1 finished level.
   - Start from new, then confirm. 0 levels, the start button says "Start", and Start from new is hidden.
4. **Leaderboard**:
   - Two players with different totals. `/leaderboard` has the nav item active, rows ordered by total, the current player's row marked `me`, "3/6", and 2 podium cards (screenshot `leaderboard`).
   - Clear history: Cancel keeps the rows. Confirm shows the empty state, the chip remains, and the page is still empty after a reload.
5. **Instruction routes**:
   - `/instruction/en` (no trailing slash) has lang en, the title "How to play", the active nav item, 11 sections, 4 pattern canvases and the Sejuti footer (screenshot `instruction-en`).
   - Clicking বাংলা goes to `/instruction/bn/` with lang bn, the title "কীভাবে খেলবেন" and 11 sections (screenshot `instruction-bn`).
   - Afterwards `/instruction` redirects to `bn/` and the header "How to play" link points to `bn/`.
   - Switch back to English. "Play now" opens the game and shows the popup.
6. **Phone at 400 px**:
   - Register. The canvas fits and the panel stacks below it.
   - `scrollWidth ≤ 400` on `/`, `/instruction/en/`, `/instruction/bn/` and `/leaderboard/`.
   - Screenshots: `phone-start`, `phone-level`, `phone-instruction-bn`.
7. **404**: `/no-such-page` returns status 404 and shows "Page not found" with the Sejuti credit. "Play the game" opens the game.

---

## 10b. Build and deploy (Netlify)

- **`scripts/build.mjs`** (plain Node 18+, no dependencies). `node scripts/build.mjs [--out dir]`:
  1. Deletes and recreates `dist/`. Refuse if the output folder is the project root.
  2. Copies only `index.html`, `404.html`, `style.css`, `favicon.svg`, `src/`, `instruction/`, `leaderboard/`, `_headers` and `_redirects`. Skip dotfiles.
  3. Verifies every local reference: `href`/`src` in HTML, `import … from` / `export … from` / bare `import '…'` in JS, and `url()` in CSS. Ignore `http:`, `data:`, `mailto:`, `#` and `//`. Relative references resolve against the file and `/…` against `dist/`. A folder counts as valid only if it has an `index.html`. Also require the 5 route pages.
  4. Prints every broken reference and exits with code 1 if there are any.
  5. Writes `dist/build-info.json` (`name`, `version`, `author: "Sejuti"`, `builtAt`, `files`), then prints the file count, total size and time.
- **`netlify.toml`**: `[build] command = "npm run build"`, `publish = "dist"`, and `[build.environment] NODE_VERSION = "20"`, `PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD = "1"`.
- **`_headers`**:
  - `/*`: `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy: camera=(), microphone=(), geolocation=()`
  - `/src/*` and `/style.css`: `Cache-Control: public, max-age=0, must-revalidate`
  - `/favicon.svg`: `max-age=86400`
- **`_redirects`** (301): `/en` → `/instruction/en/`, `/bn` → `/instruction/bn/`, `/how-to-play` → `/instruction/en/`, `/scores` → `/leaderboard/`.
- **`404.html`**: uses **absolute** paths (`/style.css`), because it can be served at any URL. It contains the dev badge, "Page not found", buttons to Play / How to play / Leaderboard, and the Sejuti footer.
- **`.gitignore`**: `node_modules/`, `dist/`, `test-results/`, `playwright-report/`, `.DS_Store`.
- **Verification**:
  - `npm run test:dist` must pass, because it runs the whole E2E suite against `dist/`.
  - Also test the build checker by breaking an import in a scratch copy: the build must fail.
- **Deploy options** to document in the README: connect the Git repo (set the base directory if the project is in a subfolder), drag `dist/` onto Netlify Drop, or `npx netlify-cli deploy --dir=dist --prod`.

---

## 11. Work order

1. Scaffold folders, `package.json` and configs. Run `npm i -D @playwright/test http-server && npx playwright install chromium` (in the background).
2. Write `field.js` and its tests, then `levels.js` and its tests, then `game.js` and its tests, then `storage.js` and its tests. Get each one green before moving on.
3. Write `strings.js`, `render.js`, `ui.js`, `layout.js`, `player-dialog.js`, `main.js`, `index.html`, `favicon.svg` and `style.css`.
4. Write `instructions.js` (en + bn), `instruction-page.js`, the 3 instruction HTML files, `leaderboard-page.js` and `leaderboard/index.html`.
5. Write the E2E tests and run them until they pass.
6. **Look at every screenshot yourself.** Fix anything broken or ugly: overlapping text, arrows off the canvas, awkward wrapping (e.g. a lone "0." or "ε =" at a line end), unreadable colors, or horizontal scroll on a phone.
7. Check that the routes also work with `python3 -m http.server`. `/instruction/en` and `/leaderboard` should get a 301 redirect to the trailing-slash URL.
8. Write `scripts/build.mjs`, `netlify.toml`, `_headers`, `_redirects`, `404.html` and `.gitignore`. Run `npm run test:dist`.
9. Write `README.md`, including a **Build & deploy (Netlify)** section.
10. Run `npm run test:all` and `npm run test:dist` one final time.

---

## 12. README.md contents

- The title, "**Designed & developed by Sejuti**", and a one-paragraph description of the game and the math concept.
- How to run: `npm install` then `npm start`, then open `http://localhost:8080`. The fallback is `python3 -m http.server 8080`. Explain why `file://` does not work.
- How to play: a short summary.
- A **Pages (routes)** table: `/`, `/instruction/en`, `/instruction/bn`, `/instruction`, `/leaderboard`.
- **Players and saved scores**: the localStorage keys, the cookie, unique usernames, returning players, refresh behavior, level navigation, Start from new, Clear history, and the robustness fallbacks.
- How to run the tests, and what they cover.
- **Math behind the game**: the divergence definition, the softened point charge with a 2–3 line derivation (`div F = 2qε²/d⁴`), and why swirl and uniform flow have zero divergence.
- The level list and the project structure.
- Screenshots from `tests/e2e/screenshots/`.

---

## 13. Acceptance checklist (all must be true)

- [ ] `npm test` passes (60 unit tests in the reference build).
- [ ] `npm run test:e2e` passes (7 E2E tests).
- [ ] `npm run build` produces `dist/` with no broken references, and `npm run test:dist` passes against it.
- [ ] `netlify.toml` deploys `dist/` on Netlify, and unknown URLs show the branded 404 page.
- [ ] The game runs offline from a local server with no console errors on any page.
- [ ] All 6 levels are playable from start to finish, and the final screen shows the total.
- [ ] Every click shows the divergence value and a clear verdict.
- [ ] The heatmap hint works and costs points only once.
- [ ] The first visit asks for name + username. The username is unique (case-insensitive), and an existing username restores that player's history after confirmation.
- [ ] The player's name is shown in the top-right corner on every page.
- [ ] Per-level best scores survive a page refresh (localStorage + cookie).
- [ ] Any level can be reached directly (level grid + ‹ 1–6 › bar).
- [ ] "Start from new" deletes only the current player's history. "Clear history" on `/leaderboard` deletes all players' history.
- [ ] `/instruction/en` and `/instruction/bn` work, with or without a trailing slash, and link to each other via the language switch. The content is understandable for a complete beginner.
- [ ] Sejuti is clearly credited as developer: header "by Sejuti", hero badges, footer, and meta author.
- [ ] The layout works at 1280 px and 400 px wide on every page, with no horizontal scroll.
- [ ] Sources and sinks are marked with symbols, not color alone.
- [ ] The README is complete.

---

## 14. When to ask the user vs decide yourself

Decide yourself (do **not** ask): colors, wording, exact layout, arrow sizes, minor scoring tweaks, and file names inside this structure.

Only ask the user if:
- Node.js is missing and cannot be installed.
- Playwright's browser download is blocked by the network. In that case, **finish everything else**, keep the unit tests green, mark E2E as skipped in the final report, and ask whether they want to install the browser manually.

---

## 15. Final report

When done, print a short summary covering:
- what was built
- test results (unit + E2E)
- any decisions you made
- any known limitations, for example:
  - scores are per browser
  - a level in progress restarts after a refresh
  - only the guide is in Bangla; the game UI is English
  - the test hook exposes target positions in the console
- the exact commands to run the game
