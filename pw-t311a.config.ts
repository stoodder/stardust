import { defineConfig, devices } from '@playwright/test';
const PORT = 4413;
export default defineConfig({
  testDir: '/home/user/stardust/smoke',
  testMatch: /gallery\.spec\.ts/,
  outputDir: '/tmp/claude-0/-home-user-stardust/7156e6b1-e125-514b-89a1-eaea2df28fd8/scratchpad/pw-out',
  reporter: 'list',
  use: {
    baseURL: `http://localhost:${PORT}`,
    launchOptions: { executablePath: process.env['CHROME_PATH'], args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] },
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: `npx vite --port ${PORT} --strictPort`,
    cwd: '/home/user/stardust',
    url: `http://localhost:${PORT}/gallery.html`,
    reuseExistingServer: false,
    timeout: 60_000,
  },
});
