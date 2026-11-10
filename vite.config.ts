import type { Plugin } from 'vite';
import { defineConfig } from 'vitest/config';
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

// Files phones keep for offline play. Music and fonts are cached on first use instead, as before.
const OFFLINE = /^(index\.html|manifest\.webmanifest|icons\/[^/]+\.png|assets\/[^/]+\.webp|app\/[^/]+\.(js|css))$/;

const walk = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap(e => (e.isDirectory() ? walk(join(dir, e.name)) : [join(dir, e.name)]));

// Writes dist/sw.js from src/sw.js, filling in the file list and a version that changes whenever any of those files change.
function serviceWorker(): Plugin {
  let root = process.cwd();
  let outDir = 'dist';
  return {
    name: 'moropoly-service-worker',
    apply: 'build',
    configResolved(c) {
      root = c.root;
      outDir = resolve(c.root, c.build.outDir);
    },
    closeBundle() {
      const files = walk(outDir)
        .map(f => relative(outDir, f).replace(/\\/g, '/'))
        .filter(f => OFFLINE.test(f))
        .sort();
      const hash = createHash('sha256');
      for (const f of files) hash.update(f).update(readFileSync(join(outDir, f)));
      const version = 'moropoly-' + hash.digest('hex').slice(0, 12);
      const sw = readFileSync(join(root, 'src/sw.js'), 'utf8')
        .replace(/^const VERSION=.*;$/m, `const VERSION='${version}';`)
        .replace(/^const FILES=.*;$/m, `const FILES=${JSON.stringify(['./', ...files])};`);
      writeFileSync(join(outDir, 'sw.js'), sw);
    },
  };
}

export default defineConfig({
  base: './',
  build: {
    assetsDir: 'app',
  },
  plugins: [serviceWorker()],
  test: {
    include: ['tests/**/*.test.ts'],
  },
});
