// T714: Night Shift's staging (nightShift.ts): the room cold until Ves'thara laughs, blooming as
// her laugh line shows, warm after; and the scene it stages has that laugh (T720's lines).
import { describe, expect, it } from 'vitest';
import { SCENES } from '../../content/dialogue/index.ts';
import { NIGHT_SHIFT_SCENE, VISIT_SCENES } from '../../app/baseScenes.ts';
import { stagingOf } from '../dialogue/staging.ts';
import { BANNER_TEXT, isLaugh, nightShiftLabel, nightShiftLeadInMs, roomLight } from './nightShift.ts';

const said = (speaker: string, expression = 'neutral') => ({ speaker, portrait: { expression } });

describe('Night Shift (T714)', () => {
  it('plays full-screen and mandatory, staged in the shelters', () => {
    expect(stagingOf(NIGHT_SHIFT_SCENE)).toBe('night_shift');
    const row = VISIT_SCENES.find((v) => v.id === NIGHT_SHIFT_SCENE);
    expect(row?.mode).toBe('fullscreen');
    expect(row?.noSkip).toBe(true);
    expect(nightShiftLeadInMs(true)).toBeLessThan(nightShiftLeadInMs(false));
  });

  it('blooms as she laughs and stays warm after', () => {
    const before = [said('vesthara', 'sad'), said('pebble')];
    expect(roomLight(before, said('pebble'))).toBe('cold');
    expect(roomLight(before, said('vesthara', 'laugh'))).toBe('laugh');
    const after = [...before, said('vesthara', 'laugh')];
    expect(roomLight(after, said('vesthara'))).toBe('warm');
    expect(roomLight(after, null)).toBe('warm');
    expect(isLaugh(said('pebble', 'laugh'))).toBe(false);
    expect(nightShiftLabel('laugh')).toContain('warms');
  });

  it("the scene has Ves'thara's laugh line (her `laugh` expression)", () => {
    const nodes = SCENES[NIGHT_SHIFT_SCENE]?.nodes ?? [];
    expect(
      nodes.some((n) => n.kind === 'line' && n.speaker === 'vesthara' && n.expression === 'laugh'),
    ).toBe(true);
    expect(BANNER_TEXT).toBe('Mandatory Fun Friday');
  });
});
