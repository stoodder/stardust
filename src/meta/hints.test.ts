// One-time hints (meta/hints.ts, D061): the upgrade teach and a newly issued tower's first battle.
import { describe, expect, it } from 'vitest';
import { TOWER_ACCESS } from '../content/upgrades/index.ts';
import {
  hintSeen,
  newlyIssuedTowers,
  newTowerHint,
  UPGRADE_HINT,
  withHintsSeen,
  XENOTECH_HINT,
} from './hints.ts';
import { createNewSave } from './saveData.ts';
import { validateSave } from './validate.ts';

describe('one-time hints', () => {
  it('a newly issued tower is new until its first battle; the starting kit never is', () => {
    const save = createNewSave();
    expect(newlyIssuedTowers(save, ['rivet', 'thumper', 'sprinkler'])).toEqual(['sprinkler']);
    expect(newlyIssuedTowers(save, ['rivet', 'thumper'])).toEqual([]);
    const after = withHintsSeen(save, [newTowerHint('sprinkler')]);
    expect(newlyIssuedTowers(after, ['rivet', 'thumper', 'sprinkler'])).toEqual([]);
    // A licensed tower (or an unknown id) never is.
    expect(newlyIssuedTowers(save, ['zapcoil', 'lookout'])).toEqual([]);
    expect(newlyIssuedTowers(save, ['not_a_tower'])).toEqual([]);
  });

  it('an Aelari tower given or attuned is new until its first battle too (T566)', () => {
    const save = createNewSave();
    const loadout = ['rivet', 'prism', 'mindspike', 'lantern'];
    expect(newlyIssuedTowers(save, loadout)).toEqual(['prism', 'mindspike', 'lantern']);
    const after = withHintsSeen(save, [newTowerHint('prism')]);
    expect(newlyIssuedTowers(after, loadout)).toEqual(['mindspike', 'lantern']);
    expect(TOWER_ACCESS.prism.how).toBe('gift');
  });

  it('marks hints seen once, leaving the input untouched', () => {
    const save = createNewSave();
    const once = withHintsSeen(save, [UPGRADE_HINT, UPGRADE_HINT]);
    expect(once.seenHints).toEqual(['upgrade']);
    expect(save.seenHints).toEqual([]);
    expect(hintSeen(once, UPGRADE_HINT)).toBe(true);
    expect(withHintsSeen(once, [UPGRADE_HINT])).toBe(once);
  });

  it('validates: the field is required (v1 saves gain it in migration); unknown hints are refused', () => {
    const { seenHints: _drop, ...older } = createNewSave();
    expect(validateSave(older).ok).toBe(false);
    const seen = withHintsSeen(createNewSave(), [
      UPGRADE_HINT,
      newTowerHint('sprinkler'),
      XENOTECH_HINT,
    ]);
    const again = validateSave(JSON.parse(JSON.stringify(seen)));
    expect(again.ok && again.value.seenHints).toEqual(['upgrade', 'new:sprinkler', 'xenotech']);
    expect(validateSave({ ...createNewSave(), seenHints: ['new:dragon'] }).ok).toBe(false);
    expect(validateSave({ ...createNewSave(), seenHints: 'upgrade' }).ok).toBe(false);
  });
});
