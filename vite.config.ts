import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Relative asset URLs so the build works from any subpath (GitHub Pages).
  base: './',
  oxc: {
    jsx: { runtime: 'automatic', importSource: 'preact' },
  },
  build: {
    target: 'es2023',
    // Phaser alone is ~1.4 MB minified (~360 kB gzipped); the budget is 1 MB gzipped total.
    chunkSizeWarningLimit: 1600,
    rolldownOptions: {
      // gallery.html is the sprite gallery dev page (T104); smoke tests open it from the build.
      input: { main: 'index.html', gallery: 'gallery.html' },
      output: {
        codeSplitting: {
          groups: [{ name: 'phaser', test: /node_modules[\\/]phaser[\\/]/ }],
        },
      },
    },
  },
  test: {
    environment: 'node',
    // Vitest's 5 s default is a wall-time limit, and the heavier pure tests (the determinism hash,
    // the star map chart, the backdrop pixels: about 1 s each on a quiet machine) overran it while
    // other agents loaded the machine (load 5×+). A hang still fails, just later; the balance tests
    // set their own (HARNESS_TEST_TIMEOUT_MS). Test isolation stays on: `isolate: false` measured
    // no faster (the step is CPU-bound by the tests, not imports; conventions.md § Gate time).
    testTimeout: 20_000,
    include: ['src/**/*.test.ts', 'tools/**/*.test.ts'],
  },
});
