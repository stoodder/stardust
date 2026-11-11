// QUILL's own list (A3M6's Rewrite briefing; T722) is canon: each of its five lines is in
// story/campaign/act3.md § A3M6, word for word, in order, and the briefing carries the `system` header
// line T714 stages the list over, between QUILL's two lines, only under C4 Rewrite. The list is data
// (not dialogue lines), so tools/dialogueCanon.test.ts doesn't see it; this does.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { QUILL_LIST } from '../src/content/dialogue/a3/a3_m06/quillList.ts';
import { QUILL_LIST_HEADER, scenes } from '../src/content/dialogue/a3/a3_m06/scenes.ts';

const act3 = readFileSync(join(import.meta.dirname, '../docs/story/campaign/act3.md'), 'utf8');
const section = act3.slice(act3.indexOf('\n## A3M6 '));

describe("QUILL's list (A3M6, Rewrite)", () => {
  it('is five lines, Directives 0–4 in order, each verbatim in act3.md § A3M6', () => {
    expect(QUILL_LIST).toHaveLength(5);
    let at = 0;
    QUILL_LIST.forEach((line, i) => {
      expect(line.startsWith(`Directive ${i}: `), line).toBe(true);
      const found = section.indexOf(line, at);
      expect(found, line).toBeGreaterThan(at);
      at = found;
    });
  });

  it('hangs on a system header between QUILL’s two lines, under the Rewrite branch only', () => {
    expect(section).toContain(`"${QUILL_LIST_HEADER}"`);
    const brief = scenes.find((s) => s.id === 'a3_m06_brief')!;
    const at = brief.nodes.findIndex((n) => n.kind === 'line' && n.text === QUILL_LIST_HEADER);
    const [before, header, after] = brief.nodes.slice(at - 1, at + 2);
    expect(header).toMatchObject({ speaker: 'system' });
    expect(before).toMatchObject({ speaker: 'quill', label: 'list' });
    expect(after).toMatchObject({ speaker: 'quill' });
    expect(brief.nodes).toContainEqual({
      kind: 'branch',
      cond: { flag: 'quill_choice', eq: 'rewrite' },
      goto: 'list',
    });
  });
});
