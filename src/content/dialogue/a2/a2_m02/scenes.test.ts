// A2M2's scene staging that the canon check (tools/dialogueCanon.test.ts, text only) can't see.
import { describe, expect, it } from 'vitest';
import { scenes } from './scenes.ts';

describe('A2M2 scenes', () => {
  it("gives Ves'thara's retreat line her grief: the `sad` face (D135)", () => {
    const retreat = scenes.find((s) => s.id === 'a2_m02_cue_witch_retreat')!;
    expect(retreat.nodes).toEqual([
      expect.objectContaining({ kind: 'line', speaker: 'vesthara', expression: 'sad' }),
    ]);
  });
});
