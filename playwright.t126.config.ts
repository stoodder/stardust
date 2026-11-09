import base from '/home/user/stardust/playwright.config.ts';
const PORT = 4412;
export default {
  ...base,
  testDir: '/home/user/stardust/smoke',
  outputDir: '/tmp/claude-0/-home-user-stardust/7156e6b1-e125-514b-89a1-eaea2df28fd8/scratchpad/t126/pw',
  use: { ...base.use, baseURL: `http://localhost:${PORT}` },
  webServer: { ...base.webServer, command: `npx vite preview --port ${PORT} --strictPort --outDir /tmp/claude-0/-home-user-stardust/7156e6b1-e125-514b-89a1-eaea2df28fd8/scratchpad/t126/dist`, url: `http://localhost:${PORT}` },
};
