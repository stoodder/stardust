// T740b: a jailbroken class's look (towerLook.ts `jailbreakLook`, `jailbrokenBaseIds`): the base's
// `_jb` twin in the `everglow.jailbroken` palette, base and head, only for a class the save holds
// jailbroken and only where the sprites author it.
import { describe, expect, it } from 'vitest';
import { DEFAULT_VARIANT } from '../sprites/bake.ts';
import { jailbreakLook, jailbrokenBaseIds, JAILBROKEN_PALETTE } from './towerLook.ts';

const TOWERS = {
  rivet: { sprites: { base: 'tower.rivet' } },
  gloop: { sprites: { base: 'tower.gloop' } },
};

describe('jailbroken towers (towers.md § 9)', () => {
  it('draws a jailbroken class’s base twin and both parts in the jailbroken palette', () => {
    const set = jailbrokenBaseIds(TOWERS, ['rivet']);
    expect([...set]).toEqual(['tower.rivet']);
    expect(jailbreakLook('tower.rivet', 'tower.rivet_head', set)).toEqual({
      base: JAILBROKEN_PALETTE,
      head: JAILBROKEN_PALETTE,
      frameSuffix: '_jb',
    });
  });

  it('draws every other class plain, and a class whose art has no twin plain too', () => {
    const plain = { base: DEFAULT_VARIANT, head: DEFAULT_VARIANT, frameSuffix: '' };
    const set = jailbrokenBaseIds(TOWERS, ['rivet']);
    expect(jailbreakLook('tower.thumper', 'tower.thumper_head', set)).toEqual(plain);
    // A save naming a class the content doesn't have is skipped; one without a `_jb` twin draws plain.
    const odd = jailbrokenBaseIds(TOWERS, ['gloop', 'nope']);
    expect([...odd]).toEqual(['tower.gloop']);
    expect(jailbreakLook('tower.gloop', 'tower.gloop_head', odd)).toEqual(plain);
    expect(jailbreakLook('tower.rivet', 'tower.rivet_head', new Set())).toEqual(plain);
  });
});
