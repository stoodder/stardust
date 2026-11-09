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
      output: {
        codeSplitting: {
          groups: [{ name: 'phaser', test: /node_modules[\\/]phaser[\\/]/ }],
        },
      },
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'tools/**/*.test.ts'],
  },
});
