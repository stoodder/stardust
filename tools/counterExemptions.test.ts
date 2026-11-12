// Every `counterExemptions` entry of the live content names, by `pinnedBy`, a balance unit test
// that exists and asserts what the counter's absence costs on that map (D150, T775): the harness
// skips #5 and #6 for the counter only because that test pins the cost, through
// `expectCounterCost` (src/balance/__fixtures__/counterCost.ts: par's margin over the no-counter
// build's, at least COUNTER_COST_MIN_POINTS). A file that only names the counter, or calls it for
// another map or counter, doesn't pin it, and a skipped or focused test in it may not run.
// validate() checks the path's shape (it runs in the browser, where it can't read files); this
// checks the file. The cost itself is asserted when the pinning test runs.
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { RAW_CONTENT } from '../src/content/registry.ts';

const ROOT = fileURLToPath(new URL('..', import.meta.url));

/** Whether `text` calls expectCounterCost for `map` and `counter` (their keys in either order). */
export function pinsCost(text: string, map: string, counter: string): boolean {
  const calls = text.match(/expectCounterCost\(\s*\{[^}]*\}/g) ?? [];
  return calls.some(
    (c) =>
      new RegExp(`\\bmap:\\s*'${map}'`).test(c) &&
      new RegExp(`\\bcounter:\\s*'${counter}'`).test(c) &&
      /\bminPoints:/.test(c),
  );
}

/** Whether `text` skips or focuses a test (so the pin might not run). */
export function skipsTests(text: string): boolean {
  return /\b(?:it|test|describe)\s*\.\s*(?:skip|only|todo|skipIf|runIf)\b|\bx(?:it|describe)\(/.test(
    text,
  );
}

/** A pinning call as a test writes it, for `map` and `counter`. */
const call = (map: string, counter: string): string =>
  `expectCounterCost({\n  map: '${map}',\n  counter: '${counter}',\n  par: a,\n  without: b,\n  minPoints: 40,\n});`;

describe('counter exemptions name the tests that pin their cost', () => {
  const entries = Object.values(RAW_CONTENT.maps).flatMap((m) =>
    (m.counterExemptions ?? []).map((x) => Object.assign({ map: m.id }, x)),
  );

  it('the live content has some (A3M5 jam, A3M6 detection)', () => {
    expect(entries.map((x) => `${x.map}:${x.counter}`)).toEqual(['a3_m05:jam', 'a3_m06:detection']);
  });

  it.each(entries)('$map $counter: pinnedBy exists and asserts its cost', (x) => {
    const path = `${ROOT}${x.pinnedBy}`;
    expect(existsSync(path), x.pinnedBy).toBe(true);
    const text = readFileSync(path, 'utf8');
    expect(text).toMatch(
      /import \{[^}]*\bexpectCounterCost\b[^}]*\} from '\.\/__fixtures__\/counterCost\.ts'/,
    );
    expect(pinsCost(text, x.map, x.counter), `${x.pinnedBy} pins ${x.map} ${x.counter}`).toBe(true);
    expect(skipsTests(text), `${x.pinnedBy} skips or focuses a test`).toBe(false);
  });

  it('a file that only names the counter, or pins another map or counter, doesn’t pin it', () => {
    const named = "const r = run('a3_m05', 'noCounter:jam'); expect(r.outcome).toBe('won');";
    expect(pinsCost(named, 'a3_m05', 'jam')).toBe(false);
    expect(pinsCost(call('a3_m05', 'jam'), 'a3_m05', 'jam')).toBe(true);
    expect(pinsCost(call('a3_m06', 'jam'), 'a3_m05', 'jam')).toBe(false);
    expect(pinsCost(call('a3_m05', 'detection'), 'a3_m05', 'jam')).toBe(false);
    expect(skipsTests("it.skip('x', () => {});")).toBe(true);
    expect(skipsTests("describe.only('x', () => {});")).toBe(true);
    expect(skipsTests("it('x', () => {});")).toBe(false);
  });
});
