import base from './playwright.config.ts';
export default {
  ...base,
  outputDir: '/tmp/claude-0/-home-user-stardust/7156e6b1-e125-514b-89a1-eaea2df28fd8/scratchpad/test-results',
  use: { ...base.use, baseURL: 'http://localhost:4391' },
  webServer: { ...base.webServer, command: 'npx vite preview --port 4391 --strictPort --outDir /tmp/claude-0/-home-user-stardust/7156e6b1-e125-514b-89a1-eaea2df28fd8/scratchpad/dist', url: 'http://localhost:4391' },
};
