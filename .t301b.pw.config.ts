import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
  testDir: '/home/user/stardust/smoke',
  outputDir: '/tmp/claude-0/-home-user-stardust/7156e6b1-e125-514b-89a1-eaea2df28fd8/scratchpad/t301b/pw-out',
  fullyParallel: true, workers: 2, retries: 0, reporter: 'list', timeout: 30_000,
  use: { baseURL: 'http://localhost:5001', viewport: { width: 1280, height: 720 }, trace: 'off',
    launchOptions: { executablePath: process.env['CHROME_PATH'], args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] } },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
