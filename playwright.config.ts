import { defineConfig, devices } from '@playwright/test';
import { SMOKE_OUT } from './smoke/out.ts';

// SMOKE_PORT moves the preview server off the default 4173 (a second checkout's smoke run, say).
// The gate still runs one `npm run check` at a time: runs also share `dist/`.
const PORT = Number(process.env['SMOKE_PORT'] ?? 4173);
// SMOKE_DIST serves another build folder than dist/ (`vite build --outDir <dir>`), so an agent's
// targeted smoke run needn't rebuild the shared dist/ under another agent's gate.
const DIST = process.env['SMOKE_DIST'];

// Browser resolution: CHROME_PATH (set in Claude Code cloud sessions, where the preinstalled
// Chromium doesn't match the pinned Playwright's revision); otherwise Playwright's own Chromium
// (`npx playwright install chromium`, as in CI).
const executablePath = process.env['CHROME_PATH'];

// Smoke workers (conventions.md § Gate time): SMOKE_WORKERS (a count, or a share of the cores
// such as '75%'), else half the cores. Each worker's headless Chromium renders WebGL in software
// (SwiftShader), close to two cores while a battle draws, so more workers than half the cores
// mostly makes each test slower.
const WORKERS = process.env['SMOKE_WORKERS'] ?? '50%';

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
      args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
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
