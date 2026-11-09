import { defineConfig, devices } from '@playwright/test';

const PORT = 4173;

// Browser resolution: CHROME_PATH (set in Claude Code cloud sessions, where the preinstalled
// Chromium doesn't match the pinned Playwright's revision); otherwise Playwright's own Chromium
// (`npx playwright install chromium`, as in CI).
const executablePath = process.env['CHROME_PATH'];

export default defineConfig({
  testDir: './smoke',
  // Default output dir; screenshots go to test-results/screens/ (cleaned each run).
  outputDir: './test-results',
  fullyParallel: true,
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
    command: 'npm run preview',
    url: `http://localhost:${PORT}`,
    reuseExistingServer: false,
    timeout: 30_000,
  },
});
