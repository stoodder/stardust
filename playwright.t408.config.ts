// Scratch config for T408's look (deleted after use).
import base from './playwright.config.ts';
const S = '/tmp/claude-0/-home-user-stardust/7156e6b1-e125-514b-89a1-eaea2df28fd8/scratchpad/t408';
export default {
  ...base,
  testMatch: /zz_t408/,
  outputDir: `${S}/results`,
  workers: 1,
  timeout: 120_000,
  use: { ...base.use, baseURL: 'http://localhost:5071' },
  webServer: {
    command: `npx vite preview --outDir ${S}/dist --port 5071 --strictPort`,
    url: 'http://localhost:5071',
    reuseExistingServer: false,
    timeout: 30_000,
  },
};
