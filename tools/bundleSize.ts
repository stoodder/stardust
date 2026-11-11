// The initial-JS budget (D143 R16; docs/tech/conventions.md § Gate time, the `build` row): the
// gzipped size of the JavaScript a player's browser loads before the game boots: the build's entry
// script and every chunk `index.html` preloads with it (Vite's `modulepreload` links: the entry's
// static imports, Phaser among them). Dynamic imports load later and don't count. The gate runs it
// right after `npm run build` (tools/gate.ts); by hand: `node --experimental-strip-types
// tools/bundleSize.ts [dist]`. Plain Node, no dependencies, ~0.1 s.
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { gzipSync } from 'node:zlib';

/** Over this many kB (1,000 bytes, as Vite reports them) gzipped, the gate warns. */
export const INITIAL_JS_WARN_KB = 900;
/** Over this many kB gzipped, the gate fails: the 1 MB budget (architecture.md § 5). */
export const INITIAL_JS_FAIL_KB = 1000;

/**
 * The scripts `index.html` loads up front, as written there (relative paths): each module
 * `<script src>` and each `<link rel="modulepreload" href>`, in order, once each.
 */
export function initialScripts(html: string): string[] {
  const out: string[] = [];
  for (const tag of html.match(/<(?:script|link)\b[^>]*>/g) ?? []) {
    const script = /^<script\b/.test(tag) && /\btype=["']?module\b/.test(tag);
    const preload = /^<link\b/.test(tag) && /\brel=["']?modulepreload\b/.test(tag);
    const url = /\b(?:src|href)=["']?([^"' >]+)/.exec(tag)?.[1];
    if ((script || preload) && url !== undefined && !/^[a-z]+:/i.test(url) && !out.includes(url)) {
      out.push(url);
    }
  }
  return out;
}

export type BundleVerdict = 'ok' | 'warn' | 'fail';

/** The verdict on `kb` kB of initial JS, gzipped. */
export function bundleVerdict(kb: number): BundleVerdict {
  return kb > INITIAL_JS_FAIL_KB ? 'fail' : kb > INITIAL_JS_WARN_KB ? 'warn' : 'ok';
}

/** Each initial script of the build in `dist` with its gzipped size in kB, and the total. */
export function measureInitialJs(dist: string): {
  readonly files: readonly { readonly path: string; readonly kb: number }[];
  readonly kb: number;
} {
  const scripts = initialScripts(readFileSync(join(dist, 'index.html'), 'utf8'));
  if (scripts.length === 0) throw new Error(`${dist}/index.html loads no module script`);
  const files = scripts.map((path) => ({
    path,
    kb: gzipSync(readFileSync(join(dist, path.replace(/^\.?\//, '')))).length / 1000,
  }));
  return { files, kb: files.reduce((n, f) => n + f.kb, 0) };
}

/** Prints the measure and returns the process exit code (1 over the fail line). */
export function reportInitialJs(dist: string): number {
  const { files, kb } = measureInitialJs(dist);
  const verdict = bundleVerdict(kb);
  console.log('\ninitial JS (gzipped):');
  for (const f of files) console.log(`  ${f.path.padEnd(40)} ${f.kb.toFixed(1).padStart(7)} kB`);
  const line = `  total ${kb.toFixed(1)} kB (warn > ${INITIAL_JS_WARN_KB}, fail > ${INITIAL_JS_FAIL_KB})`;
  if (verdict === 'fail') console.error(`${line}  OVER THE 1 MB BUDGET`);
  else console.log(verdict === 'warn' ? `${line}  WARNING: nearing the 1 MB budget` : line);
  return verdict === 'fail' ? 1 : 0;
}

if (process.argv[1] !== undefined && resolve(process.argv[1]) === import.meta.filename) {
  process.exit(reportInitialJs(resolve(process.argv[2] ?? 'dist')));
}
