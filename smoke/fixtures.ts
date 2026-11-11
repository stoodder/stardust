// Shared smoke fixtures: fails any test that logs a console error, throws a page error, or has a
// failed or 4xx/5xx request (docs/tech/conventions.md § Browser smoke tests), and caps the page's
// frame rate (§ Gate time).
import { test as base, expect } from '@playwright/test';
import { isAllowedConsole } from './allowedConsole.ts';

/**
 * The page's frame rate in smoke runs (conventions.md § Gate time): `SMOKE_FPS`, else 30. Each
 * frame costs software WebGL (SwiftShader) a core or more, so a cap halves what the browsers draw
 * without changing what is drawn: the sim runs on elapsed time, not frames (app/host.ts), and the
 * screenshots show the same frames. `SMOKE_FPS=60` (or more) turns the cap off.
 */
const FPS = Number(process.env['SMOKE_FPS'] ?? 30);

/**
 * Caps `requestAnimationFrame` at `fps` (an init script, so it is in place before boot): a frame
 * runs its callbacks only once `1000 / fps` ms have passed since the last one that ran; the rest
 * wait for a later frame. Every callback asked for in a frame that runs, runs in it, and
 * `cancelAnimationFrame` still cancels a waiting one. A spec that installs Playwright's clock
 * (`page.clock.install()`) replaces both with the clock's own.
 */
function capFrames(fps: number): void {
  const raf = window.requestAnimationFrame.bind(window);
  const caf = window.cancelAnimationFrame.bind(window);
  // 2 ms of slack, so a 60 Hz frame that lands a hair early still counts.
  const every = 1000 / fps - 2;
  const waiting = new Map<number, number>();
  let last = -Infinity;
  let next = 1;
  window.requestAnimationFrame = (cb: FrameRequestCallback): number => {
    const id = next++;
    const step = (t: number): void => {
      if (t === last || t - last >= every) {
        waiting.delete(id);
        last = t;
        cb(t);
      } else waiting.set(id, raf(step));
    };
    waiting.set(id, raf(step));
    return id;
  };
  window.cancelAnimationFrame = (id: number): void => {
    const raw = waiting.get(id);
    if (raw === undefined) return;
    caf(raw);
    waiting.delete(id);
  };
}

export const test = base.extend<{ consoleProblems: string[]; frameCap: void }>({
  frameCap: [
    async ({ page }, use) => {
      if (FPS < 60) await page.addInitScript(capFrames, FPS);
      await use();
    },
    { auto: true },
  ],
  consoleProblems: [
    async ({ page }, use) => {
      const problems: string[] = [];
      page.on('console', (msg) => {
        if (msg.type() === 'error' && !isAllowedConsole(msg.text())) {
          problems.push(`console.error: ${msg.text()}`);
        }
      });
      page.on('pageerror', (err) => problems.push(`pageerror: ${err.message}`));
      page.on('requestfailed', (req) => {
        problems.push(`request failed: ${req.url()} (${req.failure()?.errorText ?? 'unknown'})`);
      });
      page.on('response', (res) => {
        if (res.status() >= 400) problems.push(`HTTP ${res.status()}: ${res.url()}`);
      });
      await use(problems);
      expect(problems, 'console errors, page errors, or failed requests').toEqual([]);
    },
    { auto: true },
  ],
});

export { expect };
