// The codex and the Inbox quote the docs where the docs give the words (T303, T411): the welcome
// memo is style-guide § 6.1's sample, every memo's (and A2M2's KFA form's) subject and small print
// is its act-file line, and the codex lines the docs quote appear in their entries. The content files are the home of
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
const ACT2 = flat(read('docs/story/campaign/act2.md'));
const ACT3 = flat(read('docs/story/campaign/act3.md'));
/** A memo's act file, by its id (`memo_a2_01` → act2.md). */
const actDoc = (id: string): string =>
  id.startsWith('memo_a3_') ? ACT3 : id.startsWith('memo_a2_') ? ACT2 : ACT1;

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

describe("each memo's subject and small print are its act-file lines", () => {
  for (const m of MEMO_LIST) {
    it(m.id, () => {
      const subject = m.subject.replace(' {glyph:sun}', '');
      expectQuoted(actDoc(m.id), `\`${m.id}\` *${subject}*`);
      if (!UNQUOTED_SMALL_PRINT.has(m.id)) {
        // Inline, `(small print: "…")`; or its own sentence after the quote, `Small print: "…"`.
        const doc = actDoc(m.id);
        const inline = `small print: "${m.smallPrint ?? ''}")`;
        const own = `Small print: "${m.smallPrint ?? ''}"`;
        expect(doc.includes(inline) || doc.includes(own), `small print of ${m.id}`).toBe(true);
      }
    });
  }
});

/** An entry's original text. */
function original(id: string): string {
  return CODEX[id]?.versions.original?.text ?? '';
}

/** An entry's annotated text. */
function annotated(id: string): string {
  return CODEX[id]?.versions.annotated?.text ?? '';
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

  it.each([
    ['codex_mote', ACT2],
    ['codex_glass_witch', ACT2],
  ] as const)('%s (Act II) is verbatim', (id, doc) => {
    expectQuoted(doc, `"${original(id)}"`);
  });

  it.each([
    ['codex_lumenglass', '"woven glass, origin unknown, humming"'],
    ['codex_pebble', '"Entry withheld."'],
  ])('%s quotes its act-file line', (id, quoted) => {
    expectQuoted(ACT2, quoted);
    expect(original(id)).toContain(quoted.replace(/"/g, ''));
  });

  it("annotates the Brood Hauler with QUILL's half of the style guide's annotation", () => {
    const note = annotated('codex_brood_hauler');
    expect(note).toMatch(/^\[QUILL: /);
    expectQuoted(STYLE, `"${note}`);
  });

  // Act II part two (T511): the act file's quotes from each entry, word for word.
  it.each([
    ['codex_second_harvest', 'original', 'in hours what nature takes years to do'],
    ['codex_second_harvest', 'original', 'a lovely violet'],
    ['codex_kip', 'original', 'The smear on the pocket is product.'],
    ['codex_tidybot', 'annotated', 'because inventory was the word I was given'],
    ['codex_stardust', 'annotated', 'Further questions: Reclamation.'],
    ['codex_stardust', 'annotated', '(Per policy.)'],
    ['codex_stardust', 'annotated', 'The figures match.'],
    ['codex_intake_manifest', 'original', 'processed (assorted)'],
    ['codex_intake_manifest', 'original', 'processed (very small)'],
    ['codex_intake_manifest', 'original', 'Names: no such field.'],
    ['codex_cantor', 'original', 'Shoot the singer first. Everglow is aware of how that sounds.'],
    ['codex_penitent', 'original', "Security has filed this under 'surrender.'"],
    ['codex_preserve', 'original', 'Humane Relocation Preserve: a forever home!'],
    ['codex_preserve', 'original', 'very peaceful, and very quiet'],
    ['codex_vesthara', 'original', "Ves'thara is not known to Everglow."],
    ['codex_vesthara', 'original', 'Witnesses are reminded that it did not happen.'],
    ['codex_prism', 'original', 'Everglow thanks the donor, who does not exist.'],
    ['codex_long_night', 'original', 'Remember: a clean perimeter.'],
  ] as const)('%s (%s) holds the act file\'s "%s"', (id, version, line) => {
    expectQuoted(ACT2, `"${line}`);
    expect(CODEX[id]?.versions[version]?.text).toContain(line);
  });

  it("quotes the Preserve's small print: its fencing faces inward", () => {
    const print = CODEX.codex_preserve?.versions.original?.smallPrint ?? '';
    expect(print).toContain('For safety, its fencing faces inward.');
    expectQuoted(ACT2, '"For safety, its fencing faces inward."');
  });

  it("writes Ves'thara's margin notes as the act file quotes them, the Hauler's the style guide's", () => {
    const prefix = "[In the margin, in Ves'thara's hand: ";
    const margins = Object.values(CODEX).filter((e) => e.versions.margin !== undefined);
    expect(margins.length).toBeGreaterThan(0);
    for (const e of margins) {
      const note = e.versions.margin?.text ?? '';
      expect(note.startsWith(prefix), e.id).toBe(true);
      expectQuoted(ACT2, `("${note.slice(prefix.length, -1)}")`);
    }
    expectQuoted(STYLE, CODEX.codex_brood_hauler?.versions.margin?.text ?? '-');
  });

  it("carries the Orbital Strike's small print, and Rig Nine's one line", () => {
    const strike = CODEX.codex_orbital_strike?.versions.original?.smallPrint ?? '';
    expectQuoted(ACT1, `(small print: "${strike.replace(/\.$/, '')}")`);
    const rig = original('codex_rig_nine').replace(/\.$/, '').toLowerCase();
    expectQuoted(ACT1.toLowerCase(), `"${rig}"`);
  });
});

/** An entry's version text, the revised wording where `revised` is asked for. */
function text(id: string, version: 'original' | 'corrected' | 'revised'): string {
  const v = CODEX[id]?.versions;
  if (version === 'revised') return v?.corrected?.revised?.text ?? '';
  return v?.[version]?.text ?? '';
}

describe("the Field Journal's lines the docs quote (Act III, T611)", () => {
  it("corrects the Hauler and the Elder as the style guide quotes them, the Elder's citation the act file's", () => {
    expectQuoted(STYLE, `"${text('codex_brood_hauler', 'corrected')}"`);
    expectQuoted(STYLE, `"${text('codex_elder', 'revised')}"`);
    expectQuoted(ACT3, 'the Elder\'s citation still reads "Survey 2346, Okonkwo" until A3M3');
    expect(text('codex_elder', 'corrected')).toContain('(Survey 2346, Okonkwo.)');
    expectQuoted(
      ACT3,
      `now cites "Amended Survey 2346, Okonkwo: 'Correction: they were singing.'"`,
    );
  });

  it.each([
    [
      'codex_chitterbloom',
      'corrected',
      "Not 'Chitterbloom.' A mother who walks at the back so no one is left",
    ],
    ['codex_leaving_song', 'original', "Everglow's name for it is 'Everglow Bright.'"],
    ['codex_leaving_song', 'original', "The Aelari render it 'the Singers.'"],
    ['codex_small_ones_walk', 'original', 'Her name was Thrum.'],
    ['codex_compliance', 'original', 'No one is inside. Everglow does not send people.'],
    ['codex_quill_directives', 'original', 'QUILL asked that no one decide about it yet.'],
    ['codex_buffer_protocol', 'original', 'Plenty of room!'],
    ['codex_buffer_protocol', 'corrected', 'The Preserve was the buffer.'],
    [
      'codex_clean_exit',
      'corrected',
      'The colony is not on the list of assets. Neither are its people.',
    ],
    ['codex_sterling', 'corrected', 'It was not personal. That was the point.'],
    ['codex_okonkwos_gap', 'original', 'On the old charts it had a number.'],
    ['codex_okonkwos_gap', 'original', "The colony calls it Okonkwo's Gap now."],
    ['codex_amended_survey', 'original', 'It is fifteen years late. He filed it anyway.'],
  ] as const)('%s (%s) holds act3.md\'s "%s"', (id, version, line) => {
    expectQuoted(ACT3, `"${line}`);
    expect(text(id, version)).toContain(line);
  });

  it("quotes the QUILL directives exactly as A3M2's confession scene gives them", () => {
    const directives = text('codex_quill_directives', 'original').split('\n').slice(1, 6);
    expect(directives).toHaveLength(5);
    for (const d of directives) expectQuoted(ACT3, `"${d}"`);
  });

  it("memo_a3_02's closing line is act3.md's", () => {
    expectQuoted(ACT3, '"Replies to this address are not monitored."');
    expect(MEMOS.memo_a3_02?.body).toContain('Replies to this address are not monitored.');
  });
});
