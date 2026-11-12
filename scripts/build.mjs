#!/usr/bin/env node
// Build script for deployment (Netlify or any static host).
//
//   node scripts/build.mjs            → builds into ./dist
//   node scripts/build.mjs --out dir  → builds into another folder
//
// The game has no bundler or transpiler: "building" means
//   1. copy only the files the site needs into a clean output folder,
//   2. check that every local link, stylesheet, script, image and ES-module import resolves,
//   3. write a small build-info.json.
// No dependencies — plain Node 18+.

import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const argOut = process.argv.indexOf('--out');
const OUT = path.resolve(ROOT, argOut > -1 ? process.argv[argOut + 1] : 'dist');

// Everything that is part of the website. Tests, node_modules, configs, README… are left out.
const INCLUDE = [
  'index.html',
  '404.html',
  'style.css',
  'favicon.svg',
  'src',
  'instruction',
  'leaderboard',
];
// Netlify reads these from the publish folder.
const NETLIFY_FILES = ['_headers', '_redirects'];

const log = (...a) => console.log('  ', ...a);

async function exists(p) {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

async function copy(src, dst) {
  const st = await fs.stat(src);
  if (st.isDirectory()) {
    await fs.mkdir(dst, { recursive: true });
    for (const name of await fs.readdir(src)) {
      if (name.startsWith('.')) continue; // .DS_Store etc.
      await copy(path.join(src, name), path.join(dst, name));
    }
  } else {
    await fs.copyFile(src, dst);
  }
}

async function walk(dir) {
  const out = [];
  for (const e of await fs.readdir(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...(await walk(p)));
    else out.push(p);
  }
  return out;
}

/** Local references in a file: href/src in HTML, import/export ... from in JS. */
function references(file, text) {
  const refs = [];
  if (file.endsWith('.html')) {
    for (const m of text.matchAll(/\s(?:href|src)\s*=\s*"([^"]+)"/g)) refs.push(m[1]);
  } else if (file.endsWith('.js') || file.endsWith('.mjs')) {
    for (const m of text.matchAll(/(?:^|\n)\s*(?:import|export)\s[^'"]*?from\s*['"]([^'"]+)['"]/g)) refs.push(m[1]);
    for (const m of text.matchAll(/(?:^|\n)\s*import\s*['"]([^'"]+)['"]/g)) refs.push(m[1]);
  } else if (file.endsWith('.css')) {
    for (const m of text.matchAll(/url\(\s*['"]?([^'")]+)['"]?\s*\)/g)) refs.push(m[1]);
  }
  return refs.filter((r) => r && !/^(?:[a-z]+:|#|\/\/)/i.test(r)); // skip http:, data:, mailto:, #anchors
}

/** Resolve a reference the way a static server would (folder → index.html). */
async function resolves(fromFile, ref) {
  const clean = ref.split(/[?#]/)[0];
  if (!clean) return true;
  const target = clean.startsWith('/') ? path.join(OUT, clean) : path.resolve(path.dirname(fromFile), clean);
  if (!target.startsWith(OUT)) return false;
  if (await exists(target)) {
    const st = await fs.stat(target);
    return st.isFile() || (await exists(path.join(target, 'index.html')));
  }
  return false;
}

async function main() {
  const t0 = Date.now();
  console.log(`Building Source & Sink Hunter → ${path.relative(ROOT, OUT) || '.'}`);

  // 1. clean + copy
  if (OUT === ROOT) throw new Error('Output folder must not be the project root.');
  await fs.rm(OUT, { recursive: true, force: true });
  await fs.mkdir(OUT, { recursive: true });
  for (const item of [...INCLUDE, ...NETLIFY_FILES]) {
    const src = path.join(ROOT, item);
    if (!(await exists(src))) {
      if (NETLIFY_FILES.includes(item) || item === '404.html') continue; // optional
      throw new Error(`Missing required file or folder: ${item}`);
    }
    await copy(src, path.join(OUT, item));
  }

  // 2. verify links and imports
  const files = await walk(OUT);
  const broken = [];
  for (const f of files) {
    if (!/\.(html|js|mjs|css)$/.test(f)) continue;
    const text = await fs.readFile(f, 'utf8');
    for (const ref of references(f, text)) {
      if (!(await resolves(f, ref))) broken.push(`${path.relative(OUT, f)} → ${ref}`);
    }
  }
  // Every route must have an index.html.
  for (const route of ['index.html', 'instruction/index.html', 'instruction/en/index.html', 'instruction/bn/index.html', 'leaderboard/index.html']) {
    if (!(await exists(path.join(OUT, route)))) broken.push(`missing route page: ${route}`);
  }
  if (broken.length) {
    console.error('\n✖ Build failed — broken references:');
    for (const b of broken) console.error('   ', b);
    process.exit(1);
  }

  // 3. build info (handy to check which version is live: /build-info.json)
  const pkg = JSON.parse(await fs.readFile(path.join(ROOT, 'package.json'), 'utf8'));
  const info = { name: pkg.name, version: pkg.version, author: 'Sejuti', builtAt: new Date().toISOString(), files: files.length + 1 };
  await fs.writeFile(path.join(OUT, 'build-info.json'), `${JSON.stringify(info, null, 2)}\n`);

  let bytes = 0;
  for (const f of await walk(OUT)) bytes += (await fs.stat(f)).size;
  log(`${info.files} files, ${(bytes / 1024).toFixed(1)} KB`);
  log('all links, scripts and module imports resolve');
  console.log(`✔ Done in ${Date.now() - t0} ms`);
}

main().catch((err) => {
  console.error('✖ Build failed:', err.message);
  process.exit(1);
});
