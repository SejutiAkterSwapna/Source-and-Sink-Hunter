import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createStore, memoryStorage, validateUsername, validateName, normalizeUsername, DB_KEY } from '../src/storage.js';

function setup() {
  const storage = memoryStorage();
  let t = 1000;
  const store = createStore({ storage, now: () => (t += 1), levelIds: [1, 2, 3, 4, 5, 6] });
  return { storage, store };
}

test('username and name validation', () => {
  assert.equal(validateUsername(''), 'usernameRequired');
  assert.equal(validateUsername('ab'), 'usernameShort');
  assert.equal(validateUsername('a'.repeat(21)), 'usernameLong');
  assert.equal(validateUsername('has space'), 'usernameChars');
  assert.equal(validateUsername('sejuti_01'), null);
  assert.equal(validateUsername('Se.ju-ti'), null);
  assert.equal(validateName('  '), 'nameRequired');
  assert.equal(validateName('x'.repeat(41)), 'nameLong');
  assert.equal(validateName('Sejuti Swapna'), null);
  assert.equal(normalizeUsername('  SeJuTi '), 'sejuti');
});

test('createPlayer signs the player in; usernames are unique case-insensitively', () => {
  const { store } = setup();
  const p = store.createPlayer({ name: 'Sejuti', username: 'Sejuti' });
  assert.equal(p.username, 'Sejuti');
  assert.equal(store.currentPlayer().name, 'Sejuti');
  assert.throws(() => store.createPlayer({ name: 'Other', username: 'sejuti' }), (e) => e.code === 'usernameTaken');
  assert.throws(() => store.createPlayer({ name: '', username: 'abc' }), (e) => e.code === 'nameRequired');
  assert.equal(store.playerCount(), 1);
});

test('returning player keeps their history after login', () => {
  const { store } = setup();
  store.createPlayer({ name: 'A', username: 'alice' });
  store.recordLevel('alice', 1, { score: 250, seconds: 25 });
  store.signOut();
  assert.equal(store.currentPlayer(), null);
  const p = store.login('ALICE');
  assert.equal(p.levels['1'].best, 250);
  assert.equal(store.currentPlayer().username, 'alice');
  assert.throws(() => store.login('nobody'), (e) => e.code === 'unknownPlayer');
});

test('recordLevel keeps the best score, the last score and attempts', () => {
  const { store } = setup();
  store.createPlayer({ name: 'A', username: 'alice' });
  let r = store.recordLevel('alice', 2, { score: 200, seconds: 50 });
  assert.deepEqual(r, { best: 200, previousBest: null, isNewBest: true });
  r = store.recordLevel('alice', 2, { score: 150, seconds: 20 });
  assert.equal(r.isNewBest, false);
  assert.equal(r.best, 200);
  r = store.recordLevel('alice', 2, { score: 320, seconds: 10, hintUsed: true });
  assert.equal(r.isNewBest, true);
  const lv = store.findPlayer('alice').levels['2'];
  assert.equal(lv.best, 320);
  assert.equal(lv.last, 320);
  assert.equal(lv.attempts, 3);
  assert.equal(lv.bestSeconds, 10);
  assert.equal(lv.hintUsed, true);
  assert.equal(store.recordLevel('ghost', 1, { score: 1 }), null);
});

test('data survives a "page refresh" (new store on the same storage)', () => {
  const { storage, store } = setup();
  store.createPlayer({ name: 'A', username: 'alice' });
  store.recordLevel('alice', 1, { score: 280 });
  store.setLastLevel('alice', 3);
  const again = createStore({ storage, levelIds: [1, 2, 3, 4, 5, 6] });
  const p = again.currentPlayer();
  assert.equal(p.username, 'alice');
  assert.equal(p.levels['1'].best, 280);
  assert.equal(p.lastLevel, 3);
});

test('resetPlayer ("Start from new") clears only that player', () => {
  const { store } = setup();
  store.createPlayer({ name: 'A', username: 'alice' });
  store.recordLevel('alice', 1, { score: 100 });
  store.setLastLevel('alice', 2);
  store.createPlayer({ name: 'B', username: 'bob' });
  store.recordLevel('bob', 1, { score: 300 });
  assert.equal(store.resetPlayer('alice'), true);
  assert.deepEqual(store.findPlayer('alice').levels, {});
  assert.equal(store.findPlayer('alice').lastLevel, 0);
  assert.equal(store.findPlayer('bob').levels['1'].best, 300);
  assert.equal(store.resetPlayer('ghost'), false);
});

test('leaderboard ranks by total, hides players without scores', () => {
  const { store } = setup();
  store.createPlayer({ name: 'A', username: 'alice' });
  store.recordLevel('alice', 1, { score: 100 });
  store.recordLevel('alice', 2, { score: 100 });
  store.createPlayer({ name: 'B', username: 'bob' });
  store.recordLevel('bob', 1, { score: 300 });
  store.createPlayer({ name: 'C', username: 'carol' });
  const lb = store.leaderboard();
  assert.deepEqual(lb.map((p) => [p.username, p.total, p.completed]), [['bob', 300, 1], ['alice', 200, 2]]);
  assert.equal(lb[0].levelCount, 6);
});

test('clearAll removes every player but can keep the current one signed in', () => {
  const { store } = setup();
  store.createPlayer({ name: 'A', username: 'alice' });
  store.recordLevel('alice', 1, { score: 100 });
  store.createPlayer({ name: 'B', username: 'bob' });
  store.recordLevel('bob', 1, { score: 300 });
  store.clearAll('bob');
  assert.equal(store.leaderboard().length, 0);
  assert.equal(store.findPlayer('alice'), null);
  assert.deepEqual(store.findPlayer('bob').levels, {});
  assert.equal(store.currentPlayer().username, 'bob');
  store.clearAll();
  assert.equal(store.playerCount(), 0);
  assert.equal(store.currentPlayer(), null);
});

test('corrupted or missing storage never crashes', () => {
  const storage = memoryStorage();
  storage.setItem(DB_KEY, '{not json');
  const s = createStore({ storage });
  assert.equal(s.leaderboard().length, 0);
  s.createPlayer({ name: 'A', username: 'alice' });
  assert.equal(s.findPlayer('alice').name, 'A');

  const throwing = { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('blocked'); }, removeItem() { throw new Error('blocked'); } };
  const s2 = createStore({ storage: throwing });
  s2.createPlayer({ name: 'B', username: 'bob' });
  assert.equal(s2.currentPlayer().username, 'bob');

  const s3 = createStore({ storage: null });
  assert.equal(s3.currentPlayer(), null);
});
