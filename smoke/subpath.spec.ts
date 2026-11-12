/// <reference lib="dom" />
// The build served from a subpath (T875; architecture.md § 5, *Deploy to GitHub Pages*): GitHub
// Pages serves the game at `/<repo>/`, so this spec serves the gate's own `dist/` (the artifact the
// deploy workflow uploads) with `vite preview --base /stardust/` and boots it there: the Title (its
// fonts and its idle-time preloads), a `?save=` campaign into a battle, the finale's lazy act and
// screens, and the sprite gallery. The build's URLs are relative (`base: './'`), so any request
// outside the base is a bug: an absolute `/…` path in the app. The shared fixture fails a test on
// any 4xx (the preview server answers nothing outside the base), and each test also asserts it.
import { spawn, type ChildProcess } from 'node:child_process';
import { createServer } from 'node:net';
import { fileURLToPath } from 'node:url';
import type { Page } from '@playwright/test';
import { expect, test } from './fixtures.ts';
import { shot, waitForReady } from './hooks.ts';

/** The subpath, as GitHub Pages serves the repo `stardust`. */
const BASE = '/stardust/';
/** The build to serve: the gate's dist/, or SMOKE_DIST's private build (playwright.config.ts). */
const DIST = process.env['SMOKE_DIST'] ?? 'dist';
const VITE = fileURLToPath(new URL('../node_modules/vite/bin/vite.js', import.meta.url));

// One preview server for the file, so its tests run in order in one worker.
test.describe.configure({ mode: 'serial' });

let server: ChildProcess | undefined;
let origin = '';

/** A port the OS says is free now (SMOKE_SUBPATH_PORT pins one instead). */
function freePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const probe = createServer();
    probe.once('error', reject);
    probe.listen(0, 'localhost', () => {
      const addr = probe.address();
      const port = typeof addr === 'object' && addr !== null ? addr.port : 0;
      probe.close(() => resolve(port));
    });
  });
}

test.beforeAll(async () => {
  const pinned = process.env['SMOKE_SUBPATH_PORT'];
  const port = pinned === undefined ? await freePort() : Number(pinned);
  const args = ['preview', '--base', BASE, '--port', String(port), '--strictPort'];
  server = spawn(process.execPath, [VITE, ...args, '--outDir', DIST], { stdio: 'ignore' });
  origin = `http://localhost:${port}`;
  await expect
    .poll(
      async () => {
        try {
          return (await fetch(`${origin}${BASE}`)).status;
        } catch {
          return 0;
        }
      },
      { timeout: 20_000, message: `vite preview --base ${BASE} on port ${port}` },
    )
    .toBe(200);
});

test.afterAll(() => {
  server?.kill();
});

/** The page's same-origin requests: chunk names (`assets/<name>-<hash>.js|css`) and strays. */
function trackRequests(page: Page): { chunks: Set<string>; outside: string[] } {
  const chunks = new Set<string>();
  const outside: string[] = [];
  page.on('request', (r) => {
    const url = r.url();
    if (!url.startsWith(`${origin}/`)) return;
    if (!url.startsWith(`${origin}${BASE}`)) outside.push(url);
    const name = /\/assets\/([\w]+)-[\w-]+\.(?:js|css)$/.exec(url)?.[1];
    if (name !== undefined) chunks.add(name);
  });
  return { chunks, outside };
}

test('subpath: the Title boots with its fonts and preloads Act II and the renderer', async ({
  page,
}) => {
  const req = trackRequests(page);
  await page.goto(`${origin}${BASE}`);
  await expect(page.getByRole('heading', { name: 'Stardust' })).toBeVisible();
  // The self-hosted fonts (CSS-relative URLs into assets/).
  const fonts = await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all([
      document.fonts.load('8px Silkscreen'),
      document.fonts.load('8px "Pixelify Sans"'),
    ]);
    return [document.fonts.check('8px Silkscreen'), document.fonts.check('8px "Pixelify Sans"')];
  });
  expect(fonts).toEqual([true, true]);
  // Lazy chunks found through the entry's relative URLs: idle time fetches Act II and the renderer.
  await expect
    .poll(() => req.chunks.has('a2') && req.chunks.has('BattleScene'), { timeout: 10_000 })
    .toBe(true);
  await shot(page, 'subpath', 1, 'title');
  expect(req.outside).toEqual([]);
});

test('subpath: a ?save= campaign boots and plays a battle', async ({ page }) => {
  const req = trackRequests(page);
  await page.goto(`${origin}${BASE}?test=1&lazy=1&seed=1&save=after_a1m3`);
  await waitForReady(page);
  await page.evaluate(() => globalThis.__sd!.goto('battle'));
  expect(await page.evaluate(() => globalThis.__sd!.state() !== null)).toBe(true);
  expect(req.chunks.has('BattleScene')).toBe(true);
  await expect(page.locator('canvas')).toBeVisible();
  await shot(page, 'subpath', 2, 'battle');
  expect(req.outside).toEqual([]);
});

test("subpath: the finale's lazy act and screens load before its battle", async ({ page }) => {
  const req = trackRequests(page);
  await page.goto(`${origin}${BASE}?test=1&lazy=1&seed=1&map=fin_m01&skipIntro=1`);
  await waitForReady(page);
  expect(await page.evaluate(() => globalThis.__sd!.state() !== null)).toBe(true);
  for (const chunk of ['fin', 'finUi', 'BattleScene']) expect(req.chunks).toContain(chunk);
  await shot(page, 'subpath', 3, 'finale');
  expect(req.outside).toEqual([]);
});

test('subpath: the sprite gallery opens', async ({ page }) => {
  const req = trackRequests(page);
  await page.goto(`${origin}${BASE}gallery.html`);
  await expect(page.locator('body[data-gallery-ready="1"]')).toBeAttached({ timeout: 15_000 });
  expect(req.outside).toEqual([]);
});
