import { test, expect } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const shots = path.join(path.dirname(fileURLToPath(import.meta.url)), 'screenshots');

function trackErrors(page) {
  const errors = [];
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  page.on('pageerror', (e) => errors.push(String(e)));
  return errors;
}

const state = (page) => page.evaluate(() => window.__game.getState());

async function register(page, name, username) {
  const dlg = page.locator('#player-dialog');
  await expect(dlg).toBeVisible();
  await page.fill('#player-name', name);
  await page.fill('#player-username', username);
  await page.click('#player-submit');
}

async function solveCurrentLevel(page) {
  const s = await state(page);
  for (const t of s.targets.filter((t) => !t.found)) {
    await page.keyboard.press(t.kind === 'source' ? 's' : 'k');
    expect((await state(page)).tool).toBe(t.kind);
    const r = await page.evaluate(([x, y]) => window.__game.clickWorld(x, y), [t.x + 0.1, t.y - 0.1]);
    expect(r.type).toBe('hit');
  }
  await expect(page.locator('#screen-complete')).toBeVisible();
  await expect(page.locator('#c-formula')).toContainText('F = ');
}

test('first visit popup → play all 6 levels → final screen', async ({ page }) => {
  const errors = trackErrors(page);
  await page.goto('/');
  // First visit: name + username popup, cannot be dismissed with Escape.
  await expect(page.locator('#player-dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('#player-dialog')).toBeVisible();
  await page.waitForTimeout(400); // let the fade-in finish
  await page.screenshot({ path: path.join(shots, 'player-popup.png') });

  // Validation messages.
  await page.click('#player-submit');
  await expect(page.locator('#player-name-error')).toContainText('name');
  await page.fill('#player-name', 'Sejuti Swapna');
  await page.fill('#player-username', 'a b');
  await page.click('#player-submit');
  await expect(page.locator('#player-username-error')).toContainText('no spaces');
  await page.fill('#player-username', 'sejuti');
  await page.click('#player-submit');
  await expect(page.locator('#player-dialog')).toHaveCount(0);

  // Name in the top-right corner.
  const chip = page.locator('#player-chip');
  await expect(chip).toContainText('Sejuti Swapna');
  await expect(chip).toContainText('@sejuti');
  const box = await chip.boundingBox();
  expect(box.x + box.width).toBeGreaterThan(1280 * 0.75);
  expect(box.y).toBeLessThan(80);
  // Developer credit.
  await expect(page.locator('.brand-by')).toHaveText('by Sejuti');
  await expect(page.locator('.site-footer')).toContainText('Designed & developed by Sejuti');
  await page.screenshot({ path: path.join(shots, 'start.png'), fullPage: true });

  await page.locator('#btn-start').click();
  const canvas = page.locator('#field-canvas');
  await expect(canvas).toBeVisible();
  const cbox = await canvas.boundingBox();
  expect(cbox.width).toBeGreaterThan(300);

  // A miss shows divergence and a verdict; the score stays ≥ 0.
  const miss = await page.evaluate(() => window.__game.clickWorld(-4, -4));
  expect(miss.type).toBe('miss');
  await expect(page.locator('#last-click')).toContainText('div F');
  expect((await state(page)).score).toBe(0);

  // Level 1.
  const s1 = await state(page);
  expect(s1.levelId).toBe(1);
  await page.evaluate(([x, y]) => window.__game.clickWorld(x, y), [s1.targets[0].x, s1.targets[0].y]);
  await expect(page.locator('#score')).toHaveText('100');
  await expect(page.locator('#screen-complete')).toBeVisible();
  await expect(page.locator('#c-best')).toContainText('New personal best');
  await expect(page.locator('#c-formula')).toContainText('r₁ = (1, 0.5)');
  await page.screenshot({ path: path.join(shots, 'level-complete.png'), fullPage: true });
  await page.locator('#btn-next').click();

  for (let lvl = 2; lvl <= 6; lvl++) {
    const s = await state(page);
    expect(s.levelId).toBe(lvl);
    if (lvl === 4) {
      const src = s.targets.find((t) => t.kind === 'source');
      await page.locator('#tool-source').click();
      expect((await page.evaluate(([x, y]) => window.__game.clickWorld(x, y), [src.x, src.y])).type).toBe('hit');
      expect((await state(page)).score).toBe(100);
      await page.locator('#btn-hint').click();
      expect((await state(page)).score).toBe(50);
      await expect(page.locator('#btn-hint')).toBeDisabled();
      const sink = s.targets.find((t) => t.kind === 'sink');
      const wrong = await page.evaluate(([x, y]) => window.__game.clickWorld(x, y), [sink.x + 0.3, sink.y]);
      expect(wrong.type).toBe('wrong-tool');
      await expect(page.locator('#last-click')).toContainText('switch tool');
      await page.mouse.move(cbox.x + cbox.width * 0.6, cbox.y + cbox.height * 0.45);
      await page.waitForTimeout(300);
      await page.screenshot({ path: path.join(shots, 'level4-heatmap.png'), fullPage: true });
    }
    await solveCurrentLevel(page);
    await page.locator('#btn-next').click();
  }

  await expect(page.locator('#screen-final')).toBeVisible();
  await expect(page.locator('#final-heading')).toHaveText('All levels cleared!');
  const fin = await state(page);
  expect(fin.saved.completed).toBe(6);
  await expect(page.locator('#final-total')).toHaveText(String(fin.saved.total));
  await expect(page.locator('#final-breakdown tr')).toHaveCount(6);
  await page.screenshot({ path: path.join(shots, 'final.png'), fullPage: true });
  expect(errors).toEqual([]);
});

test('scores survive a refresh; level navigation works', async ({ page }) => {
  const errors = trackErrors(page);
  await page.goto('/');
  await register(page, 'Rafi', 'rafi');
  await page.locator('#btn-start').click();
  await solveCurrentLevel(page);
  const best1 = (await state(page)).saved.levels['1'].best;
  await page.locator('#btn-next').click();
  await solveCurrentLevel(page);
  await page.locator('#btn-next').click();
  expect((await state(page)).levelId).toBe(3);

  await page.reload();
  // No popup: the cookie remembers the player.
  await expect(page.locator('#player-chip')).toContainText('Rafi');
  await expect(page.locator('#player-dialog')).toHaveCount(0);
  const s = await state(page);
  expect(s.saved.completed).toBe(2);
  expect(s.saved.levels['1'].best).toBe(best1);
  await expect(page.locator('#btn-start')).toHaveText('Continue — Level 3');
  await expect(page.locator('#level-select .level-card').first()).toContainText(`Best ${best1}`);
  await expect(page.locator('#start-greeting')).toContainText('finished 2 of 6');

  // Level navigation: jump straight to level 5, then prev / next.
  await page.locator('#level-select .level-card[data-level="4"]').click();
  expect((await state(page)).levelId).toBe(5);
  await expect(page.locator('#level-title')).toHaveText('Whirlpool trap');
  await page.locator('#btn-prev-level').click();
  expect((await state(page)).levelId).toBe(4);
  await page.locator('#level-chips .level-chip[data-level="5"]').click();
  expect((await state(page)).levelId).toBe(6);
  await expect(page.locator('#btn-next-level')).toBeDisabled();
  await page.locator('#level-chips .level-chip[data-level="0"]').click();
  expect((await state(page)).levelId).toBe(1);
  await expect(page.locator('#btn-prev-level')).toBeDisabled();
  await expect(page.locator('#level-chips .level-chip.done')).toHaveCount(2);
  await expect(page.locator('#level-best')).toContainText(String(best1));
  await page.screenshot({ path: path.join(shots, 'level-nav.png'), fullPage: true });
  expect(errors).toEqual([]);
});

test('returning username loads history; usernames are unique; start from new', async ({ page }) => {
  const errors = trackErrors(page);
  await page.goto('/');
  await register(page, 'Sejuti', 'sejuti');
  await page.locator('#btn-start').click();
  await solveCurrentLevel(page);
  await page.locator('#btn-next').click();

  // Switch to a second player.
  await page.locator('#player-chip').click();
  await page.locator('#menu-switch').click();
  await register(page, 'Nila', 'nila');
  await expect(page.locator('#player-chip')).toContainText('Nila');
  expect((await state(page)).saved.completed).toBe(0);

  // Someone tries the taken username "SEJUTI" → asked if it is them.
  await page.locator('#player-chip').click();
  await page.locator('#menu-switch').click();
  await register(page, 'Another person', 'SEJUTI');
  await expect(page.locator('#player-exists')).toBeVisible();
  await expect(page.locator('#player-exists')).toContainText('already exists');
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(shots, 'username-exists.png') });
  await page.locator('#player-exists-no').click();
  await expect(page.locator('#player-username-error')).toContainText('taken');
  // It is really Sejuti → history is loaded.
  await page.click('#player-submit');
  await page.locator('#player-exists-yes').click();
  await expect(page.locator('#player-chip')).toContainText('Sejuti');
  let s = await state(page);
  expect(s.player.username).toBe('sejuti');
  expect(s.saved.completed).toBe(1);

  // Start from new deletes only Sejuti's scores.
  await page.locator('#btn-start-new').click();
  await expect(page.locator('#reset-dialog')).toBeVisible();
  await page.locator('#reset-dialog [data-action="confirm"]').click();
  s = await state(page);
  expect(s.saved.completed).toBe(0);
  await expect(page.locator('#btn-start')).toHaveText('Start');
  await expect(page.locator('#btn-start-new')).toBeHidden();
  expect(errors).toEqual([]);
});

test('leaderboard ranks players and Clear history wipes them', async ({ page }) => {
  const errors = trackErrors(page);
  await page.goto('/');
  await register(page, 'Low Scorer', 'low');
  await page.locator('#btn-start').click();
  await page.evaluate(() => {
    for (let i = 0; i < 4; i++) window.__game.clickWorld(-4, -4); // misses
  });
  await solveCurrentLevel(page);
  await page.locator('#btn-next').click();
  await solveCurrentLevel(page);
  await page.goto('/');

  await page.locator('#player-chip').click();
  await page.locator('#menu-switch').click();
  await register(page, 'Sejuti', 'sejuti');
  for (let i = 0; i < 3; i++) {
    await page.locator(`#level-select .level-card[data-level="${i}"]`).click();
    await solveCurrentLevel(page);
    await page.goto('/');
  }

  await page.goto('/leaderboard');
  await expect(page.locator('h1')).toHaveText('Leaderboard');
  await expect(page.locator('[data-nav="leaderboard"]')).toHaveClass(/active/);
  const rows = page.locator('#lb-table tbody tr');
  await expect(rows).toHaveCount(2);
  await expect(rows.nth(0)).toHaveAttribute('data-username', 'sejuti');
  await expect(rows.nth(0)).toHaveClass(/me/);
  await expect(rows.nth(0)).toContainText('3/6');
  await expect(rows.nth(1)).toHaveAttribute('data-username', 'low');
  await expect(page.locator('.podium-card')).toHaveCount(2);
  await page.screenshot({ path: path.join(shots, 'leaderboard.png'), fullPage: true });

  await page.locator('#btn-clear-history').click();
  await page.locator('#clear-dialog [data-action="cancel"]').click();
  await expect(rows).toHaveCount(2);
  await page.locator('#btn-clear-history').click();
  await page.locator('#clear-dialog [data-action="confirm"]').click();
  await expect(page.locator('#lb-empty')).toBeVisible();
  // The current player stays signed in, with no scores.
  await expect(page.locator('#player-chip')).toContainText('Sejuti');
  await page.reload();
  await expect(page.locator('#lb-empty')).toBeVisible();
  expect(errors).toEqual([]);
});

test('instruction routes /instruction/en and /instruction/bn with language switch', async ({ page }) => {
  const errors = trackErrors(page);
  await page.goto('/instruction/en');
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.locator('#doc-title')).toHaveText('How to play');
  await expect(page.locator('[data-nav="howto"]')).toHaveClass(/active/);
  await expect(page.locator('.doc-section')).toHaveCount(11);
  await expect(page.locator('.pattern canvas')).toHaveCount(4);
  await expect(page.locator('.site-footer')).toContainText('Sejuti');
  await page.screenshot({ path: path.join(shots, 'instruction-en.png'), fullPage: true });

  await page.locator('.lang-switch a[data-lang="bn"]').click();
  await expect(page).toHaveURL(/\/instruction\/bn\/?$/);
  await expect(page.locator('html')).toHaveAttribute('lang', 'bn');
  await expect(page.locator('#doc-title')).toHaveText('কীভাবে খেলবেন');
  await expect(page.locator('.doc-section')).toHaveCount(11);
  await page.screenshot({ path: path.join(shots, 'instruction-bn.png'), fullPage: true });

  // Language choice is remembered: /instruction and the header link go to bn.
  await page.goto('/instruction');
  await expect(page).toHaveURL(/\/instruction\/bn\/$/);
  await expect(page.locator('[data-nav="howto"]')).toHaveAttribute('href', /instruction\/bn\/$/);

  await page.locator('.lang-switch a[data-lang="en"]').click();
  await expect(page).toHaveURL(/\/instruction\/en\/?$/);
  await expect(page.locator('#doc-title')).toHaveText('How to play');

  // "Play now" goes back to the game.
  await page.locator('#doc-play').click();
  await expect(page.locator('#player-dialog')).toBeVisible();
  expect(errors).toEqual([]);
});

test('every page works at 400 px (phone)', async ({ page }) => {
  const errors = trackErrors(page);
  await page.setViewportSize({ width: 400, height: 860 });
  await page.goto('/');
  await register(page, 'Sejuti Swapna', 'sejuti');
  await expect(page.locator('#player-chip')).toBeVisible();
  await page.screenshot({ path: path.join(shots, 'phone-start.png'), fullPage: true });
  await page.locator('#btn-start').click();
  const canvas = await page.locator('#field-canvas').boundingBox();
  const panel = await page.locator('.panel').boundingBox();
  expect(canvas.x).toBeGreaterThanOrEqual(0);
  expect(canvas.x + canvas.width).toBeLessThanOrEqual(400);
  expect(panel.y).toBeGreaterThanOrEqual(canvas.y + canvas.height);
  await page.screenshot({ path: path.join(shots, 'phone-level.png'), fullPage: true });

  for (const url of ['/', '/instruction/en/', '/instruction/bn/', '/leaderboard/']) {
    await page.goto(url);
    await page.waitForTimeout(100);
    const scrollW = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(scrollW, url).toBeLessThanOrEqual(400);
  }
  await page.goto('/instruction/bn/');
  await page.screenshot({ path: path.join(shots, 'phone-instruction-bn.png'), fullPage: true });
  expect(errors).toEqual([]);
});

test('unknown URLs show the branded 404 page', async ({ page }) => {
  const res = await page.goto('/no-such-page');
  expect(res.status()).toBe(404);
  await expect(page.locator('h1')).toHaveText('Page not found');
  await expect(page.locator('body')).toContainText('Sejuti');
  await page.locator('a', { hasText: 'Play the game' }).click();
  await expect(page.locator('#player-dialog')).toBeVisible();
});
