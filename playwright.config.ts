import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { defineConfig, devices } from '@playwright/test';
import { SMOKE_OUT } from './smoke/out.ts';

// SMOKE_PORT moves the preview server off the default 4173 (a second checkout's smoke run, say).
// The gate still runs one `npm run check` at a time: runs also share `dist/`.
const PORT = Number(process.env['SMOKE_PORT'] ?? 4173);
// SMOKE_DIST serves another build folder than dist/ (`vite build --outDir <dir>`), so an agent's
// targeted smoke run needn't rebuild the shared dist/ under another agent's gate.
const DIST = process.env['SMOKE_DIST'];

// Browser resolution (conventions.md § Gate time): SMOKE_CHROME if set; else, when CHROME_PATH is
// set (Claude Code cloud sessions, where the preinstalled browsers don't match the pinned
// Playwright's revision), the preinstalled Chrome Headless Shell beside it, which boots the game
// ~0.5 s faster than full Chrome's headless mode (T501j); else CHROME_PATH; else Playwright's own
// browser (`npx playwright install chromium`, as in CI: headless runs already use its shell).
function preinstalledHeadlessShell(): string | undefined {
  const root = process.env['PLAYWRIGHT_BROWSERS_PATH'];
  if (root === undefined || !existsSync(root)) return undefined;
  const dir = readdirSync(root)
    .filter((d) => d.startsWith('chromium_headless_shell-'))
    .toSorted()
    .at(-1);
  if (dir === undefined) return undefined;
  const exe = join(root, dir, 'chrome-headless-shell-linux64', 'chrome-headless-shell');
  return existsSync(exe) ? exe : undefined;
}
const executablePath =
  process.env['SMOKE_CHROME'] ??
  (process.env['CHROME_PATH'] === undefined ? undefined : preinstalledHeadlessShell()) ??
  process.env['CHROME_PATH'];

// Smoke workers (conventions.md § Gate time): SMOKE_WORKERS (a count, or a share of the cores
// such as '50%'), else three quarters of them (3 on the 4-core cloud session). With software
// compositing and the 30 fps cap (smoke/fixtures.ts) a worker's browser no longer needs two cores
// to draw, and 3 workers beat 2 both quiet and under load (T564).
const WORKERS = process.env['SMOKE_WORKERS'] ?? '75%';

export default defineConfig({
  testDir: './smoke',
  // SMOKE_OUT (smoke/out.ts), else ./test-results; screenshots go to <out>/screens/, the gallery's
  // sheets to <out>/gallery/. Playwright cleans it at the start of each run.
  outputDir: SMOKE_OUT,
  fullyParallel: true,
  workers: /^\d+$/.test(WORKERS) ? Number(WORKERS) : WORKERS,
  // The gate-time guardrail: name every spec file over 15 s at the end of the run.
  reportSlowTests: { max: 10, threshold: 15_000 },
  forbidOnly: true,
  retries: 0,
  reporter: 'list',
  timeout: 30_000,
  use: {
    baseURL: `http://localhost:${PORT}`,
    viewport: { width: 1280, height: 720 },
    trace: 'off',
    screenshot: 'off',
    video: 'off',
    launchOptions: {
      ...(executablePath ? { executablePath } : {}),
      // Software WebGL (SwiftShader), explicitly: Chrome's automatic fallback to it is deprecated.
      // Software compositing too (T564): compositing every frame through SwiftShader cost the GPU
      // process about a core per page, and a screenshot ~1 s under load (0.3 s without);
      // SMOKE_GPU_COMPOSITING=1 puts it back.
      args: [
        '--use-angle=swiftshader',
        '--enable-unsafe-swiftshader',
        ...(process.env['SMOKE_GPU_COMPOSITING'] === '1' ? [] : ['--disable-gpu-compositing']),
      ],
    },
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    // `npm run preview`'s Vite command, with the port.
    command: `npx vite preview --port ${PORT} --strictPort${DIST === undefined ? '' : ` --outDir ${DIST}`}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: false,
    timeout: 30_000,
  },
});
