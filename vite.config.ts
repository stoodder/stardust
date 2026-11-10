import { defineConfig } from 'vitest/config';

const TEST_FILES = ['src/**/*.test.ts', 'tools/**/*.test.ts'];
/** Test files that mock modules (vi.mock), so they need a fresh module graph each. */
const ISOLATED_TESTS = [
  'src/app/battleSetup.lazy.test.ts',
  'src/app/checkpoints.test.ts',
  'src/app/dialogueAct2.test.ts',
  'src/app/dialoguePebble.test.ts',
  'src/app/dialogueR2.test.ts',
  'src/app/router.test.ts',
];

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
    // the star map chart, the backdrop pixels: about 1 s each on a quiet machine) passed it under
    // another agent's gate (load 5×+). A hang still fails, just later; the balance tests set their
    // own (HARNESS_TEST_TIMEOUT_MS).
    testTimeout: 20_000,
    // Two projects (conventions.md § Gate time): most test files share each worker's module cache
    // (isolate: false), so the content and sim modules load once per worker rather than once per
    // file, which was two-thirds of the test step. The files that mock modules (vi.mock) need a
    // fresh module graph and keep isolation. A test that leaks module state (a store, a cache, a
    // global) must reset it in its own afterEach, or move to the isolated list.
    projects: [
      {
        extends: true,
        test: { name: 'shared', include: TEST_FILES, exclude: ISOLATED_TESTS, isolate: false },
      },
      { extends: true, test: { name: 'isolated', include: ISOLATED_TESTS } },
    ],
  },
});
