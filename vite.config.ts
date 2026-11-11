import { globSync, readFileSync } from 'node:fs';
import { defineConfig } from 'vitest/config';

const TEST_GLOBS = ['src/**/*.test.ts', 'tools/**/*.test.ts'];

/**
 * Test files that keep per-file isolation (a fresh module graph each): any file that mocks a module
 * (`vi.mock`, `vi.doMock`, `vi.resetModules`) or opts in with a `// vitest: isolate` comment (a file
 * that needs its modules' first evaluation, say). Read from the files themselves, so a new test
 * lands in the right project with no list to update. Everything else shares one module graph per
 * worker (conventions.md § Gate time).
 */
const ISOLATED_TESTS: string[] = TEST_GLOBS.flatMap((g) => globSync(g)).filter((f) =>
  /\bvi\.(?:mock|doMock|resetModules)\(|\/\/ vitest: isolate\b/.test(readFileSync(f, 'utf8')),
);

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
    // The dev fixtures, which the game loads on demand (app/devRegistry.ts), registered up front.
    setupFiles: ['tools/vitestSetup.ts'],
    // Vitest's 5 s default is a wall-time limit, and the heavier pure tests (the determinism hash,
    // the star map chart, the backdrop pixels: about 1 s each on a quiet machine) overran it while
    // other agents loaded the machine (load 5×+). A hang still fails, just later; the balance tests
    // set their own (HARNESS_TEST_TIMEOUT_MS).
    testTimeout: 20_000,
    // One worker per core (Vitest's default leaves one free for its main thread, which only waits
    // here): the balance files keep every worker busy (T564b; conventions.md § Gate time).
    maxWorkers: '100%',
    // Two projects (conventions.md § Gate time, T501j). With every file isolated, module import was
    // ~65% of the step: each file re-evaluated the content graph (maps, sprites, dialogue). Now most
    // files share one module graph per worker (`isolate: false`), so a test must leave module
    // state as it found it (restore fake timers, reset what it sets); a file that mocks modules
    // keeps isolation.
    projects: [
      {
        extends: true,
        test: {
          name: 'shared',
          include: TEST_GLOBS,
          exclude: ISOLATED_TESTS,
          isolate: false,
        },
      },
      {
        extends: true,
        test: {
          name: 'isolated',
          include: ISOLATED_TESTS,
        },
      },
    ],
  },
});
