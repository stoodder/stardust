// The authoritative module-boundary check (docs/tech/architecture.md § 2 and § 4).
// Scans every source file under src/ for forbidden imports, and src/sim/ for nondeterministic
// globals and the banned Math members. Lint repeats some of this for editor feedback; this test
// is what the gate trusts. Type-checked by tsconfig.node.json (it reads files with node:fs).
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, posix, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

const SRC = join(import.meta.dirname, '..');
const SELF = 'shared/architecture.test.ts';

type ModuleName =
  'shared' | 'content' | 'sim' | 'story' | 'meta' | 'balance' | 'render' | 'ui' | 'audio' | 'app';

const MODULES: readonly ModuleName[] = [
  'shared',
  'content',
  'sim',
  'story',
  'meta',
  'balance',
  'render',
  'ui',
  'audio',
  'app',
];

/** Pure modules and the src/ modules each may import (architecture.md § 4, allowed dependencies). */
const PURE_ALLOWED: Readonly<Partial<Record<ModuleName, readonly ModuleName[]>>> = {
  shared: ['shared'],
  content: ['shared', 'content'],
  sim: ['shared', 'content', 'sim'],
  story: ['shared', 'content', 'sim', 'story'],
  balance: ['shared', 'content', 'sim', 'meta', 'balance'],
};

/** Members of Math that differ between JS engines or break determinism (architecture.md § Determinism). */
const BANNED_MATH = new Set(['sin', 'cos', 'atan2', 'pow', 'random']);

/** Globals the sim never touches: wall-clock time, timers, storage, and the global object. */
const BANNED_SIM_GLOBALS = [
  'Date',
  'performance',
  'setTimeout',
  'setInterval',
  'requestAnimationFrame',
  'localStorage',
  'globalThis',
];

interface Violation {
  readonly file: string;
  readonly line: number;
  readonly message: string;
}

/**
 * Returns `src` with comments removed. With `blankStrings`, string and template literal contents
 * are replaced by spaces too. Newlines are kept so line numbers still match. Regex literals are
 * not recognized; a quote inside one could confuse the scan (none in src/ today).
 */
function stripComments(src: string, blankStrings: boolean): string {
  let out = '';
  let i = 0;
  // Each entry is the `{` depth at which a template's `${` was opened.
  const templateStack: number[] = [];
  let braceDepth = 0;
  const keep = (ch: string, isLiteral: boolean): string =>
    ch === '\n' || !isLiteral || !blankStrings ? ch : ' ';

  while (i < src.length) {
    const ch = src.charAt(i);
    const next = src.charAt(i + 1);
    if (ch === '/' && next === '/') {
      while (i < src.length && src.charAt(i) !== '\n') i++;
    } else if (ch === '/' && next === '*') {
      i += 2;
      while (i < src.length && !(src.charAt(i) === '*' && src.charAt(i + 1) === '/')) {
        if (src.charAt(i) === '\n') out += '\n';
        i++;
      }
      i += 2;
    } else if (ch === "'" || ch === '"') {
      out += ch;
      i++;
      while (i < src.length && src.charAt(i) !== ch && src.charAt(i) !== '\n') {
        if (src.charAt(i) === '\\') {
          out += keep(src.charAt(i), true);
          i++;
        }
        out += keep(src.charAt(i), true);
        i++;
      }
      out += src.charAt(i);
      i++;
    } else if (ch === '`' || (ch === '}' && templateStack.at(-1) === braceDepth)) {
      // Template literal body: from an opening backtick, or resuming after a `${…}` closes.
      if (ch === '}') templateStack.pop();
      out += ch;
      i++;
      while (i < src.length && src.charAt(i) !== '`') {
        if (src.charAt(i) === '\\') {
          out += keep(src.charAt(i), true);
          i++;
        } else if (src.charAt(i) === '$' && src.charAt(i + 1) === '{') {
          templateStack.push(braceDepth);
          break;
        }
        out += keep(src.charAt(i), true);
        i++;
      }
      if (src.charAt(i) === '$') {
        out += '${';
        i += 2;
      } else {
        out += src.charAt(i);
        i++;
      }
    } else {
      if (ch === '{') braceDepth++;
      if (ch === '}') braceDepth--;
      out += ch;
      i++;
    }
  }
  return out;
}

function lineOf(text: string, index: number): number {
  let line = 1;
  for (let i = 0; i < index; i++) if (text.charCodeAt(i) === 10) line++;
  return line;
}

/** Every module specifier in the file: static imports and re-exports, dynamic import(), require(). */
function importSpecifiers(src: string): { spec: string; line: number }[] {
  const code = stripComments(src, false);
  const found: { spec: string; line: number }[] = [];
  const patterns = [
    /\b(?:import|export)\s+(?:type\s+)?(?:[\w$*{}\s,]+?\s+from\s+)?(['"])([^'"\n]+)\1/g,
    /\bimport\s*\(\s*(['"])([^'"\n]+)\1/g,
    /\brequire\s*\(\s*(['"])([^'"\n]+)\1/g,
  ];
  for (const re of patterns) {
    for (const m of code.matchAll(re)) {
      found.push({ spec: m[2] ?? '', line: lineOf(code, m.index) });
    }
  }
  return found;
}

function moduleOf(srcRelPath: string): ModuleName | null {
  const first = srcRelPath.split('/')[0] ?? '';
  if (first === 'main.ts') return 'app';
  return MODULES.find((m) => m === first) ?? null;
}

function isTestFile(path: string): boolean {
  return /\.test\.tsx?$/.test(path);
}

/** Checks one import of `file` (a path relative to src/, with `/` separators). */
function checkImport(file: string, spec: string): string | null {
  const from = moduleOf(file);
  if (from === null) return null;
  const pureAllowed = PURE_ALLOWED[from];

  if (!spec.startsWith('.')) {
    if (pureAllowed === undefined) return null; // browser modules may use packages
    if (spec === 'vitest' && isTestFile(file)) return null;
    return `pure module '${from}' imports package '${spec}'`;
  }

  const target = posix.normalize(posix.join(posix.dirname(file), spec));
  if (target.startsWith('..')) return `'${spec}' reaches outside src/`;
  const to = moduleOf(target);
  if (to === null) return `'${spec}' resolves to unknown module '${target}'`;
  if (to === from) return null;

  if (pureAllowed !== undefined) {
    return pureAllowed.includes(to) ? null : `pure module '${from}' may not import '${to}'`;
  }
  if (to === 'balance') return `'${from}' may not import 'balance' (only tools/sim.ts uses it)`;
  if (from === 'render' || from === 'ui' || from === 'audio') {
    if (to === 'sim' && target !== 'sim/index.ts') {
      return `'${from}' imports sim internals ('${target}'); use sim/index.ts`;
    }
    if (from === 'ui' && to === 'render' && target.startsWith('render/sprites/')) return null;
    if (to === 'render' || to === 'ui' || to === 'audio') {
      return `'${from}' may not import '${to}'`;
    }
  }
  return null;
}

/** Banned Math members and globals in src/sim/ (determinism). */
function checkSimDeterminism(code: string): { index: number; message: string }[] {
  const out: { index: number; message: string }[] = [];
  for (const m of code.matchAll(/(?<![\w$.])Math\b/g)) {
    const member = /^\s*\.\s*([A-Za-z_$][\w$]*)/.exec(code.slice(m.index + 4))?.[1];
    if (member === undefined) {
      out.push({
        index: m.index,
        message: 'Math used other than as Math.<member> (aliasing hides bans)',
      });
    } else if (BANNED_MATH.has(member)) {
      out.push({ index: m.index, message: `Math.${member} is banned in src/sim/` });
    }
  }
  const globals = new RegExp(`(?<![\\w$.])(${BANNED_SIM_GLOBALS.join('|')})\\b(?!\\s*\\??:)`, 'g');
  for (const m of code.matchAll(globals)) {
    out.push({ index: m.index, message: `'${m[1] ?? ''}' is banned in src/sim/` });
  }
  return out;
}

/** All architecture violations in one source file. `file` is relative to src/, `/`-separated. */
function scanSource(file: string, src: string): Violation[] {
  const violations: Violation[] = [];
  for (const { spec, line } of importSpecifiers(src)) {
    const message = checkImport(file, spec);
    if (message !== null) violations.push({ file, line, message });
  }
  if (moduleOf(file) === 'sim') {
    const code = stripComments(src, true);
    for (const { index, message } of checkSimDeterminism(code)) {
      violations.push({ file, line: lineOf(code, index), message });
    }
  }
  return violations;
}

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    return statSync(p).isDirectory() ? walk(p) : /\.tsx?$/.test(name) ? [p] : [];
  });
}

describe('architecture boundaries', () => {
  it('src/ has no forbidden imports or banned sim globals', () => {
    const files = walk(SRC)
      .map((p) => relative(SRC, p).split('\\').join('/'))
      .filter((f) => f !== SELF);
    expect(files.length).toBeGreaterThan(0);
    const violations = files.flatMap((f) => scanSource(f, readFileSync(join(SRC, f), 'utf8')));
    expect(violations).toEqual([]);
  });
});

function messages(file: string, src: string): string[] {
  return scanSource(file, src).map((v) => `${v.line}: ${v.message}`);
}

describe('scanner catches violations', () => {
  it('flags packages in pure modules', () => {
    expect(messages('sim/tick.ts', "import * as Phaser from 'phaser';")).toEqual([
      "1: pure module 'sim' imports package 'phaser'",
    ]);
    expect(messages('shared/x.ts', "import { readFileSync } from 'node:fs';")).toHaveLength(1);
    expect(messages('content/x.ts', "import { h } from 'preact';")).toHaveLength(1);
    expect(messages('sim/x.ts', "import { it } from 'vitest';")).toHaveLength(1);
    expect(messages('sim/x.test.ts', "import { it } from 'vitest';")).toEqual([]);
  });

  it('flags forbidden module edges', () => {
    expect(messages('sim/a.ts', "import { x } from '../render/iso.ts';")).toEqual([
      "1: pure module 'sim' may not import 'render'",
    ]);
    expect(
      messages('sim/systems/a.ts', "import type { S } from '../../meta/save.ts';"),
    ).toHaveLength(1);
    expect(messages('sim/a.ts', "export { b } from '../balance/policies.ts';")).toHaveLength(1);
    expect(messages('content/a.ts', "import { s } from '../sim/index.ts';")).toHaveLength(1);
    expect(messages('shared/a.ts', "import '../app/boot.ts';")).toHaveLength(1);
    expect(messages('sim/a.ts', "const m = await import('../ui/state.ts');")).toHaveLength(1);
    expect(messages('sim/a.ts', "import {\n  a,\n  b,\n} from '../app/x.ts';")).toEqual([
      "1: pure module 'sim' may not import 'app'",
    ]);
    expect(messages('sim/a.ts', "import x from '../../tools/sim.ts';")).toHaveLength(1);
  });

  it('allows the documented edges', () => {
    expect(messages('sim/a.ts', "import { c } from '../content/compile.ts';")).toEqual([]);
    expect(messages('sim/a.ts', "import { r } from '../shared/rng.ts';")).toEqual([]);
    expect(messages('balance/a.ts', "import { m } from '../meta/modifiers.ts';")).toEqual([]);
    expect(messages('story/a.ts', "import type { E } from '../sim/index.ts';")).toEqual([]);
    expect(messages('render/a.ts', "import type { S } from '../sim/index.ts';")).toEqual([]);
    expect(messages('ui/a.ts', "import { a } from '../render/sprites/atlas.ts';")).toEqual([]);
    expect(messages('app/a.ts', "import { s } from '../sim/state.ts';")).toEqual([]);
    expect(messages('render/a.ts', "import * as Phaser from 'phaser';")).toEqual([]);
  });

  it('flags browser-module boundary breaks', () => {
    expect(messages('render/a.ts', "import { s } from '../sim/state.ts';")).toHaveLength(1);
    expect(messages('ui/a.ts', "import { s } from '../render/scale.ts';")).toHaveLength(1);
    expect(messages('render/a.ts', "import { s } from '../ui/state.ts';")).toHaveLength(1);
    expect(messages('app/a.ts', "import { p } from '../balance/policies.ts';")).toHaveLength(1);
  });

  it('flags banned Math members and aliasing in src/sim/', () => {
    expect(messages('sim/a.ts', 'const a = Math.sin(x);')).toEqual([
      '1: Math.sin is banned in src/sim/',
    ]);
    expect(messages('sim/a.ts', 'const r =\n  Math . random();')).toEqual([
      '2: Math.random is banned in src/sim/',
    ]);
    expect(messages('sim/a.ts', "const r = Math['pow'](2, 3);")).toHaveLength(1);
    expect(messages('sim/a.ts', 'const { cos } = Math;')).toHaveLength(1);
    expect(messages('sim/a.ts', 'const M = Math; M.atan2(1, 2);')).toHaveLength(1);
  });

  it('flags nondeterministic globals in src/sim/', () => {
    expect(messages('sim/a.ts', 'const t = Date.now();')).toEqual([
      "1: 'Date' is banned in src/sim/",
    ]);
    expect(messages('sim/a.ts', 'performance.now();')).toHaveLength(1);
    expect(messages('sim/a.ts', 'setTimeout(f, 1);')).toHaveLength(1);
    expect(messages('sim/a.ts', 'globalThis.Math.random();')).toHaveLength(1);
  });

  it('ignores comments, strings, safe members, and other modules', () => {
    const ok = [
      '// Math.random() would break determinism',
      '/* Math.sin */ const d = Math.sqrt(dx * dx + dy * dy);',
      "const s = 'Math.pow and Date';",
      'const t = `Math.cos ${Math.floor(x)} Date`;',
      'interface Stats { performance: number; date?: string }',
      'const n = Math.max(a, Math.min(b, c));',
      'const o = { Date: 1 }.Date;',
    ].join('\n');
    expect(messages('sim/a.ts', ok)).toEqual([]);
    expect(messages('render/a.ts', 'const a = Math.sin(t) + Date.now();')).toEqual([]);
    expect(messages('sim/a.ts', "// import * as Phaser from 'phaser';")).toEqual([]);
  });

  it('keeps line numbers through comments and templates', () => {
    const src = '/* one\n two */\nconst s = `a\n${b}\nc`;\nMath.random();';
    expect(messages('sim/a.ts', src)).toEqual(['6: Math.random is banned in src/sim/']);
  });
});
