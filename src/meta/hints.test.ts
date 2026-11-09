// One-time hints (meta/hints.ts, D061): the upgrade teach and a newly issued tower's first battle.
import { describe, expect, it } from 'vitest';
import { TOWER_ACCESS } from '../content/upgrades/index.ts';
import { hintSeen, newlyIssuedTowers, newTowerHint, UPGRADE_HINT, withHintsSeen } from './hints.ts';
import { createNewSave } from './saveData.ts';
import { validateSave } from './validate.ts';

describe('one-time hints', () => {
  it('a newly issued tower is new until its first battle; the starting kit never is', () => {
    const save = createNewSave();
    expect(newlyIssuedTowers(save, ['rivet', 'thumper', 'sprinkler'])).toEqual(['sprinkler']);
    expect(newlyIssuedTowers(save, ['rivet', 'thumper'])).toEqual([]);
    const after = withHintsSeen(save, [newTowerHint('sprinkler')]);
    expect(newlyIssuedTowers(after, ['rivet', 'thumper', 'sprinkler'])).toEqual([]);
    // Only issued rows count: a bought or gifted tower (or an unknown id) never is.
    expect(
      newlyIssuedTowers(save, ['sprinkler'], {
        ...TOWER_ACCESS,
        sprinkler: { how: 'gift', availableAfter: 'a1_m01' },
      }),
    ).toEqual([]);
    expect(newlyIssuedTowers(save, ['not_a_tower'])).toEqual([]);
  });

  it('marks hints seen once, leaving the input untouched', () => {
    const save = createNewSave();
    const once = withHintsSeen(save, [UPGRADE_HINT, UPGRADE_HINT]);
    expect(once.seenHints).toEqual(['upgrade']);
    expect(save.seenHints).toEqual([]);
    expect(hintSeen(once, UPGRADE_HINT)).toBe(true);
    expect(withHintsSeen(once, [UPGRADE_HINT])).toBe(once);
  });

  it('validates: a save without the field reads as none seen; unknown hints are refused', () => {
    const { seenHints: _drop, ...older } = createNewSave();
    const read = validateSave(older);
    expect(read.ok && read.value.seenHints).toEqual([]);
    const seen = withHintsSeen(createNewSave(), [UPGRADE_HINT, newTowerHint('sprinkler')]);
    const again = validateSave(JSON.parse(JSON.stringify(seen)));
    expect(again.ok && again.value.seenHints).toEqual(['upgrade', 'new:sprinkler']);
    expect(validateSave({ ...createNewSave(), seenHints: ['new:dragon'] }).ok).toBe(false);
    expect(validateSave({ ...createNewSave(), seenHints: 'upgrade' }).ok).toBe(false);
  });
});
