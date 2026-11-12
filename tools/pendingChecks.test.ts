// T820: a map's pending harness checks (BuildsDef.pendingChecks: the checks about its subjects,
// and its checks by id, pass as "pending <task>" until that task's pass) can't ship. A map with any is never in dialogueCanon's COMPLETE
// list (the map isn't finished), and each pending task is still open on the board.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { RAW_CONTENT } from '../src/content/registry.ts';

const ROOT = join(import.meta.dirname, '..');

/** dialogueCanon.test.ts's COMPLETE list, read from its source. */
function completeMaps(): string[] {
  const src = readFileSync(join(ROOT, 'tools/dialogueCanon.test.ts'), 'utf8');
  const block = /const COMPLETE = \[([^\]]*)\]/.exec(src)?.[1];
  if (block === undefined) throw new Error('tools/dialogueCanon.test.ts: no COMPLETE list');
  return [...block.matchAll(/'([a-z0-9_]+)'/g)].map((m) => m[1]!);
}

const pending = Object.values(RAW_CONTENT.maps).filter((m) => m.pendingChecks !== undefined);

describe('pending harness checks', () => {
  it('reads the COMPLETE list', () => {
    expect(completeMaps()).toContain('a3_m06');
  });

  it('fin_m01 has none since T821 (its alts and the warren cell pass)', () => {
    expect(RAW_CONTENT.maps.fin_m01.pendingChecks).toBeUndefined();
  });

  it.each(pending.map((m) => [m.id, m.pendingChecks!.task] as const))(
    '%s (pending %s: its subjects and its checks by id) is not marked finished',
    (id, task) => {
      const p = pending.find((m) => m.id === id)!.pendingChecks!;
      expect(p.subjects.length + (p.checks ?? []).length).toBeGreaterThan(0);
      expect(completeMaps()).not.toContain(id);
      const board = readFileSync(join(ROOT, 'tasks.md'), 'utf8');
      const line = board.split('\n').find((l) => l.includes(`**${task}**`));
      expect(line, `${task} on the board`).toBeDefined();
      expect(line, `${task} still open`).not.toMatch(/^- \[x\]/);
    },
  );
});
