// Every `counterExemptions` entry of the live content names, by `pinnedBy`, a balance unit test
// that exists and is about that map and counter (D150): the harness skips #5 and #6 for the
// counter only because that test pins what its absence costs. validate() checks the path's shape
// (it runs in the browser, where it can't read files); this checks the file.
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { RAW_CONTENT } from '../src/content/registry.ts';

const ROOT = fileURLToPath(new URL('..', import.meta.url));

describe('counter exemptions name the tests that pin them', () => {
  const entries = Object.values(RAW_CONTENT.maps).flatMap((m) =>
    (m.counterExemptions ?? []).map((x) => ({ map: m.id, ...x })),
  );

  it('the live content has some (A3M5 jam, A3M6 detection)', () => {
    expect(entries.map((x) => `${x.map}:${x.counter}`)).toEqual(['a3_m05:jam', 'a3_m06:detection']);
  });

  it.each(entries)('$map $counter: pinnedBy exists and names the map and counter', (x) => {
    const path = `${ROOT}${x.pinnedBy}`;
    expect(existsSync(path), x.pinnedBy).toBe(true);
    const text = readFileSync(path, 'utf8');
    expect(text).toContain(x.map);
    expect(text).toMatch(new RegExp(`noCounter:${x.counter}|'${x.counter}'`));
  });
});
