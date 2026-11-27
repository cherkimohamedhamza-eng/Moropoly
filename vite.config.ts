import { loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
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
      // The 3D models (.glb) are fetched only when the table view needs them, so they are not in the list of files to
      // download in advance; but they do count for the version, so a changed model is not served from an old cache.
      const models = walk(outDir).map(f => relative(outDir, f).replace(/\\/g, '/')).filter(f => f.endsWith('.glb')).sort();
      const hash = createHash('sha256');
      for (const f of [...files, ...models]) hash.update(f).update(readFileSync(join(outDir, f)));
      const version = 'moropoly-' + hash.digest('hex').slice(0, 12);
      const sw = readFileSync(join(root, 'src/sw.js'), 'utf8')
        .replace(/^const VERSION=.*;$/m, `const VERSION='${version}';`)
        .replace(/^const FILES=.*;$/m, `const FILES=${JSON.stringify(['./', ...files])};`);
      writeFileSync(join(outDir, 'sw.js'), sw);
    },
  };
}

// The page may only connect to its own address, plus the game server when that lives somewhere else
// (VITE_GAME_SERVER, e.g. https://moropoly.example.workers.dev when the site itself stays on GitHub Pages).
function connectPolicy(server: string | undefined): Plugin {
  return {
    name: 'moropoly-connect-policy',
    transformIndexHtml(html) {
      if (!server) return html;
      const origin = new URL(server).origin;
      return html.replace("connect-src 'self'", `connect-src 'self' ${origin} ${origin.replace(/^http/, 'ws')}`);
    },
  };
}

// `npm run dev` serves the site; `npm run dev:server` runs the game server, which the site reaches through /api
const LOCAL_SERVER = { '/api': { target: 'http://127.0.0.1:8787', ws: true } };

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  return {
    base: './',
    build: {
      assetsDir: 'app',
    },
    server: { proxy: LOCAL_SERVER },
    preview: { proxy: LOCAL_SERVER },
    plugins: [react(), serviceWorker(), connectPolicy(env.VITE_GAME_SERVER)],
    test: {
      include: ['tests/**/*.test.ts'],
    },
  };
});
