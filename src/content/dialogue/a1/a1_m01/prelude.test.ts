// The Prelude's shape that the stage relies on and the canon check (tools/dialogueCanon.test.ts,
// text only) can't see: the still cues' labels in order on their speakers, the silence after the
// ad is unplugged, and the scene's registration (D164).
import { describe, expect, it } from 'vitest';
import { dialogueErrors } from '../../../validateDialogue.ts';
import { parseText } from '../../rules.ts';
import { sceneById } from '../../index.ts';
import type { DialogueNode, LineNode } from '../../types.ts';
import { PRELUDE_SCENE_ID, scenes } from './prelude.ts';

const nodes: readonly DialogueNode[] = scenes[0]?.nodes ?? [];
const lines = nodes.filter((n): n is LineNode => n.kind === 'line');
const spoken = lines.filter((n) => n.text !== '');

/** The cue table (seams: label → shot), in play order, with the speaker of each cued line. */
const CUES: readonly (readonly [label: string, speaker: string, shot: number])[] = [
  ['p_ad', 'pa', 1],
  ['p_small_print', 'narrator', 1],
  ['p_haul', 'narrator', 2],
  ['p_view', 'narrator', 3],
  ['p_unplug', 'narrator', 3],
  ['p_descent', 'pa', 4],
  ['p_touchdown', 'pa', 5],
  ['p_incident', 'pa', 5],
  ['p_dome_row', 'narrator', 6],
  ['p_wave', 'narrator', 6],
  ['p_delivery', 'gerald', 7],
  ['p_form', 'system', 7],
];

describe('the Prelude (a1_m01_scene_prelude)', () => {
  it('is one scene, registered under A1M1 as a full-screen scene', () => {
    expect(scenes.map((s) => s.id)).toEqual([PRELUDE_SCENE_ID]);
    expect(sceneById(PRELUDE_SCENE_ID)).toBe(scenes[0]);
  });

  it('carries the cue labels in the cue table order, on their speakers', () => {
    const labelled = nodes.flatMap((n) =>
      n.label === undefined ? [] : [[n.label, n.kind === 'line' ? n.speaker : n.kind] as const],
    );
    expect(labelled).toEqual(CUES.map(([label, speaker]) => [label, speaker]));
  });

  it('opens on the ad and ends on the form, the cue lines first and last', () => {
    expect(nodes[0]?.label).toBe('p_ad');
    expect(nodes.at(-1)?.label).toBe('p_form');
  });

  it('holds a 3 s silence straight after the ad is unplugged', () => {
    const i = nodes.findIndex((n) => n.label === 'p_unplug');
    expect(nodes[i + 1]).toEqual({ kind: 'line', speaker: 'narrator', text: '', durationSec: 3 });
    expect(lines.filter((n) => n.text === '')).toHaveLength(1);
  });

  it('is 18 spoken lines, lines only (no branches, choices, or flags), within the 20-line cap', () => {
    expect(spoken).toHaveLength(18);
    expect(nodes.every((n) => n.kind === 'line')).toBe(true);
  });

  it('speaks only as the PA, the narrator, Gerald, and the system, with no portrait expressions', () => {
    expect(new Set(lines.map((n) => n.speaker))).toEqual(
      new Set(['pa', 'narrator', 'gerald', 'system']),
    );
    expect(lines.every((n) => n.expression === undefined)).toBe(true);
  });

  it('uses no tokens: there is no profile yet', () => {
    for (const n of spoken) {
      expect(
        parseText(n.text).parts.every((p) => p.kind === 'text'),
        n.text,
      ).toBe(true);
    }
  });

  it('passes the dialogue validators', () => {
    expect(dialogueErrors().filter((e) => e.includes(PRELUDE_SCENE_ID))).toEqual([]);
  });
});
