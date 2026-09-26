#!/usr/bin/env node
// Guards against a specific, nasty class of bug: a stray compiled .js file
// sitting next to its .tsx/.ts source in src/. Vite's default module
// resolution checks .js before .tsx, so an extensionless import
// ("./App") silently resolves to the stale .js file instead of the real,
// current source — with no error, no warning, and no way for typecheck or
// tests to catch it (they resolve .tsx correctly; only the bundler doesn't).
//
// This exact bug shipped three separate "verified and deployed" PRs that
// never actually reached production for about two weeks. Run before every
// build so it fails loudly instead of failing silently.

import { readdirSync, statSync } from 'node:fs';
import { join, extname, basename } from 'node:path';

const SRC_DIR = new URL('../src', import.meta.url).pathname;

function walk(dir) {
  const entries = readdirSync(dir);
  const files = [];
  for (const entry of entries) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      files.push(...walk(full));
    } else {
      files.push(full);
    }
  }
  return files;
}

const allFiles = walk(SRC_DIR);
const strayJsFiles = allFiles.filter((f) => {
  if (extname(f) !== '.js') return false;
  const stem = basename(f, '.js');
  const dir = f.slice(0, f.length - basename(f).length);
  return (
    allFiles.includes(join(dir, `${stem}.ts`)) || allFiles.includes(join(dir, `${stem}.tsx`))
  );
});

if (strayJsFiles.length > 0) {
  console.error('\n✗ Found stray .js file(s) shadowing their .ts/.tsx source in src/:\n');
  for (const f of strayJsFiles) {
    console.error(`  ${f}`);
  }
  console.error(
    '\nThese are almost certainly stale compiled output (e.g. from a build that ran before ' +
      "tsconfig's noEmit was in effect). Vite resolves .js before .tsx, so they will silently " +
      'shadow your real source with no error. Delete them:\n\n' +
      '  find src -name "*.js" -not -path "*/node_modules/*" -delete\n'
  );
  process.exit(1);
}

console.log('✓ No stray .js files in src/');
