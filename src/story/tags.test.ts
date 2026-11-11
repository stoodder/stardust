// Bricks's name tags (towers.md § 8; campaign.md § 6.3): the earliest attacking tower at the first
// wave clear, support towers skipped, the sale (or revocation, D143 R5) that takes the tag, the
// A3M3 `latest` tag, and the
// list position the save keeps.
import { describe, expect, it } from 'vitest';
import { NAME_TAGS } from '../content/dialogue/tags.ts';
import type { IdSpace } from '../content/types.ts';
import type { SimEvent } from '../sim/index.ts';
import {
  giveTag,
  isAttackingTower,
  newTagState,
  tagDefFor,
  tagIndexAfter,
  tagStep,
  taggedTowerType,
  type TagEffect,
  type TagState,
} from './tags.ts';

const built = (uid: number, tower: string): SimEvent<IdSpace> => ({
  type: 'TowerBuilt',
  uid,
  tower,
  tile: [0, 0],
  cost: 0,
});
const sold = (uid: number): SimEvent<IdSpace> => ({ type: 'TowerSold', uid, refund: 0 });
const revoked = (uid: number, tower: string): SimEvent<IdSpace> => ({
  type: 'TowerRevoked',
  uid,
  tower,
  refund: 0,
});
const cleared = (wave: number): SimEvent<IdSpace> => ({ type: 'WaveCleared', wave, bonus: 0 });
/** A support tower in tests: everything but `aura`s attacks. */
const attacking = (tower: string): boolean => tower !== 'aura';

function run(
  state: TagState,
  events: readonly SimEvent<IdSpace>[],
): { state: TagState; effects: TagEffect[] } {
  let s = state;
  const effects: TagEffect[] = [];
  for (const e of events) {
    const step = tagStep(s, e, attacking);
    s = step.state;
    effects.push(...step.effects);
  }
  return { state: s, effects };
}

describe('name tags', () => {
  it('lists the canon names on their maps', () => {
    expect(NAME_TAGS.map((t) => t.name)).toEqual([
      'Denise',
      'Marguerite',
      'Biscuit',
      'Auntie Funmi',
      'Dele',
      'Lucky',
      '{name}',
    ]);
    expect(tagDefFor('a1_m02')?.name).toBe('Denise');
    expect(tagDefFor('a1_m03')).toBeNull();
    expect(tagDefFor('a3_m04')).toBeNull();
  });

  it('tags the earliest attacking tower still standing at the first wave clear', () => {
    const r = run(newTagState('a1_m02'), [
      built(3, 'aura'),
      built(5, 'thumper'),
      built(4, 'rivet'),
      sold(4),
      built(6, 'rivet'),
      cleared(1),
      cleared(2),
    ]);
    expect(r.effects).toEqual([{ kind: 'tagged', uid: 5, tower: 'thumper', name: 'Denise' }]);
    expect(taggedTowerType(r.state)).toBe('thumper');
  });

  it('waits for a clear with an attacking tower standing', () => {
    const r = run(newTagState('a1_m02'), [cleared(1), built(2, 'rivet'), cleared(2)]);
    expect(r.effects).toEqual([{ kind: 'tagged', uid: 2, tower: 'rivet', name: 'Denise' }]);
  });

  it('selling the tagged tower takes the tag for good', () => {
    const r = run(newTagState('a1_m02'), [
      built(1, 'rivet'),
      built(2, 'rivet'),
      cleared(1),
      sold(2),
      sold(1),
      cleared(2),
    ]);
    expect(r.effects).toEqual([
      { kind: 'tagged', uid: 1, tower: 'rivet', name: 'Denise' },
      { kind: 'untagged', uid: 1, reason: 'sold' },
    ]);
    expect(r.state.tagged).toBeNull();
  });

  it('does nothing on a map with no tag', () => {
    const r = run(newTagState('a1_m03'), [built(1, 'rivet'), cleared(1), sold(1)]);
    expect(r.effects).toEqual([]);
  });

  it('A3M3’s tag goes on the newest tower at its cue and follows each newer one', () => {
    let s = run(newTagState('a3_m03'), [built(1, 'rivet'), built(2, 'thumper'), cleared(1)]).state;
    expect(s.tagged).toBeNull();
    const cue = giveTag(s);
    expect(cue.effects).toEqual([{ kind: 'tagged', uid: 2, tower: 'thumper', name: '{name}' }]);
    expect(giveTag(cue.state).effects).toEqual([]);
    const r = run(cue.state, [built(3, 'aura'), built(4, 'rivet'), sold(4)]);
    expect(r.effects).toEqual([
      { kind: 'untagged', uid: 2, reason: 'moved' },
      { kind: 'tagged', uid: 4, tower: 'rivet', name: '{name}' },
      { kind: 'untagged', uid: 4, reason: 'sold' },
      { kind: 'tagged', uid: 2, tower: 'thumper', name: '{name}' },
    ]);
    s = r.state;
    expect(taggedTowerType(s)).toBe('thumper');
  });

  it("the Clean Exit takes A3M2's Lucky with its turret: untagged, 'revoked', never 'sold'", () => {
    const s = run(newTagState('a3_m02'), [built(1, 'thumper'), built(2, 'rivet'), cleared(1)]);
    expect(s.state.tagged?.uid).toBe(1);
    const r = run(s.state, [revoked(1, 'thumper')]);
    // An `earliest` tag goes with it and stays gone (Lucky was given; nothing retags).
    expect(r.effects).toEqual([{ kind: 'untagged', uid: 1, reason: 'revoked' }]);
    expect(r.state.tagged).toBeNull();
    expect(r.state.towers.map((t) => t.uid)).toEqual([2]);
    // A revoked tower that wasn't tagged just leaves the list.
    const other = run(s.state, [revoked(2, 'rivet')]);
    expect(other.effects).toEqual([]);
    expect(other.state.tagged?.uid).toBe(1);
  });

  it('a `latest` tag on a revoked turret retags the newest standing one', () => {
    const s = run(newTagState('a3_m03'), [built(1, 'rivet'), built(2, 'thumper')]).state;
    const cue = giveTag(s);
    const r = run(cue.state, [revoked(2, 'thumper')]);
    expect(r.effects).toEqual([
      { kind: 'untagged', uid: 2, reason: 'revoked' },
      { kind: 'tagged', uid: 1, tower: 'rivet', name: '{name}' },
    ]);
  });

  it('keeps the list position past the furthest map tagged', () => {
    expect(tagIndexAfter('a1_m02', 0)).toBe(1);
    expect(tagIndexAfter('a1_m05', 1)).toBe(2);
    expect(tagIndexAfter('a1_m02', 2)).toBe(2);
    expect(tagIndexAfter('a1_m03', 2)).toBe(2);
  });

  it('reads support towers from the content (no attack)', () => {
    expect(isAttackingTower('rivet')).toBe(true);
    expect(isAttackingTower('sprinkler')).toBe(true);
    expect(isAttackingTower('dev_unknown')).toBe(true);
  });
});
