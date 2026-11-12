// The initial-JS budget's measure (tools/bundleSize.ts; D143 R16).
import { describe, expect, it } from 'vitest';
import { bundleVerdict, initialScripts } from './bundleSize.ts';

describe('the initial-JS budget', () => {
  it('counts the entry script and the chunks index.html preloads, once each; nothing else', () => {
    const html = `<!doctype html><html><head>
    <script type="module" crossorigin src="./assets/main-Gx.js"></script>
    <link rel="modulepreload" crossorigin href="./assets/clickOutline-Bd.js">
    <link rel="modulepreload" crossorigin href="./assets/phaser-CQ.js">
    <link rel="modulepreload" crossorigin href="./assets/phaser-CQ.js">
    <link rel="stylesheet" crossorigin href="./assets/main-E4.css">
    <link rel="icon" href="./favicon.png">
    <script src="https://example.com/analytics.js"></script>
    <script>window.x = 1;</script>
    </head><body></body></html>`;
    expect(initialScripts(html)).toEqual([
      './assets/main-Gx.js',
      './assets/clickOutline-Bd.js',
      './assets/phaser-CQ.js',
    ]);
  });

  it('warns over 800 kB gzipped and fails over 900 kB', () => {
    expect([bundleVerdict(785), bundleVerdict(800), bundleVerdict(800.1)]).toEqual([
      'ok',
      'ok',
      'warn',
    ]);
    expect([bundleVerdict(900), bundleVerdict(900.1)]).toEqual(['warn', 'fail']);
  });
});
