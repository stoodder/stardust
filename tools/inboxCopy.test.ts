// The codex and the Inbox quote the docs where the docs give the words (T303): the welcome memo is
// style-guide § 6.1's sample, every Act I memo's subject and small print is its act-file line, and
// the codex lines the docs quote appear in their entries. The content files are the home of
// everything else. Reads the docs from disk, so it lives with the other node-side checks.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { CODEX } from '../src/content/codex/index.ts';
import { MEMOS, MEMO_LIST } from '../src/content/memos/index.ts';

const ROOT = join(import.meta.dirname, '..');
const read = (path: string): string => readFileSync(join(ROOT, path), 'utf8');
/** Whitespace collapsed, so text wrapped in a doc's code block compares with one-line data. */
const flat = (s: string): string => s.replace(/\s+/g, ' ').trim();

const STYLE = flat(read('docs/story/style-guide.md'));
const ACT1 = flat(read('docs/story/campaign/act1.md'));

/** `doc` holds `text` (a boolean check, so a miss prints the text, not the whole doc). */
function expectQuoted(doc: string, text: string): void {
  expect(doc.includes(text), `the doc doesn't quote: ${text}`).toBe(true);
}

/** Memos whose small print the act file leaves to the content (A1M5's names none). */
const UNQUOTED_SMALL_PRINT = new Set(['memo_a1_00', 'memo_a1_05']);

describe('the welcome memo is the style guide sample', () => {
  const m = MEMOS.memo_a1_00!;
  it.each([
    ['from', `FROM: ${m.from}`],
    ['to', `TO: ${m.to}`],
    ['subject', `RE: ${m.subject}`],
    ['body', m.body],
    ['sign-off', m.signOff ?? ''],
    ['small print', `Small print: ${m.smallPrint ?? ''}`],
  ])('%s', (_, text) => {
    expectQuoted(STYLE, flat(text));
  });
});

describe("each Act I memo's subject and small print are its act-file lines", () => {
  for (const m of MEMO_LIST) {
    it(m.id, () => {
      const subject = m.subject.replace(' {glyph:sun}', '');
      expectQuoted(ACT1, `\`${m.id}\` *${subject}*`);
      if (!UNQUOTED_SMALL_PRINT.has(m.id)) {
        expectQuoted(ACT1, `small print: "${m.smallPrint ?? ''}")`);
      }
    });
  }
});

/** An entry's original text. */
function original(id: string): string {
  return CODEX[id]?.versions.original?.text ?? '';
}

describe('codex lines the docs quote', () => {
  it.each([
    ['codex_brood_hauler', STYLE],
    ['codex_elder', STYLE],
    ['codex_chitterbloom', ACT1],
  ] as const)('%s is verbatim', (id, doc) => {
    expectQuoted(doc, `"${original(id)}"`);
  });

  it.each([
    ['codex_gerald', 'Do not target. Do not reroute without Form 88-B.'],
    ['codex_stardust', "Everglow's premium mineral! Responsibly sourced!"],
    ['codex_scarecrow', 'Employee of the Month, 144 months running'],
  ])('%s quotes its act-file line', (id, line) => {
    expectQuoted(ACT1, line);
    expect(original(id)).toContain(line);
  });

  it("carries the Orbital Strike's small print, and Rig Nine's one line", () => {
    const strike = CODEX.codex_orbital_strike?.versions.original?.smallPrint ?? '';
    expectQuoted(ACT1, `(small print: "${strike.replace(/\.$/, '')}")`);
    const rig = original('codex_rig_nine').replace(/\.$/, '').toLowerCase();
    expectQuoted(ACT1.toLowerCase(), `"${rig}"`);
  });
});
