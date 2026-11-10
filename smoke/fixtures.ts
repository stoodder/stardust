// Shared smoke fixture: fails any test that logs a console error, throws a page error, or has a
// failed or 4xx/5xx request (docs/tech/conventions.md § Browser smoke tests).
import { test as base, expect } from '@playwright/test';
import { isAllowedConsole } from './allowedConsole.ts';

const FPS = Number(process.env['SMOKE_FPS'] ?? 60);

export const test = base.extend<{ consoleProblems: string[]; frameCap: void }>({
  frameCap: [
    async ({ page }, use) => {
      if (FPS < 60) {
        await page.addInitScript((fps) => {
          const raf = window.requestAnimationFrame.bind(window);
          const every = 1000 / fps - 2;
          let last = -1e9;
          window.requestAnimationFrame = (cb) => {
            const step = (t: number): void => {
              if (t === last || t - last >= every) {
                last = t;
                cb(t);
              } else raf(step);
            };
            return raf(step);
          };
        }, FPS);
      }
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
