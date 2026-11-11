// [revocation] (validateRevocation.ts; T606): the counter guarantee treats a revoked class as
// unowned, whichever class the cue could take, on the revoking map (the dev revoke range's W2
// Clean Exit) and on the campaign maps after it until the class is back.
import { describe, expect, it } from 'vitest';
import { DEV_CONTENT } from '../render/__fixtures__/devBattle.ts';
import type { IdSpace, MapDef, RawContent } from './types.ts';
import { validate } from './validate.ts';

const RAW: RawContent<IdSpace> = DEV_CONTENT;
const REVOKE: MapDef<IdSpace> = RAW.maps.dev_revoke!;
const MAW: MapDef<IdSpace> = RAW.maps.dev_maw!;

/** The [revocation] errors of DEV_CONTENT with these maps (and campaign) swapped in. */
function revocationErrors(
  maps: Readonly<Record<string, MapDef<IdSpace>>>,
  campaign: readonly string[] = RAW.campaign,
): string[] {
  const raw: RawContent<IdSpace> = { ...RAW, maps: { ...RAW.maps, ...maps }, campaign };
  return validate(raw).filter((e) => e.startsWith('[revocation]'));
}

const profile = (def: MapDef<IdSpace>, towers: readonly string[]): MapDef<IdSpace> => ({
  ...def,
  referenceProfile: { ...def.referenceProfile, towers },
});

describe('[revocation]', () => {
  it('passes the dev revoke range: its Prism answers armor whichever Everglow class goes', () => {
    expect(REVOKE.referenceProfile.towers).toEqual(['rivet', 'sprinkler', 'zapcoil', 'prism']);
    expect(revocationErrors({})).toEqual([]);
  });

  it('refuses a revoking map whose profile leans on one class the cue could take', () => {
    expect(
      revocationErrors({ dev_revoke: profile(REVOKE, ['rivet', 'sprinkler', 'zapcoil']) }),
    ).toEqual([
      "[revocation] maps.dev_revoke.referenceProfile: without 'rivet' (its revokeTowerClass could take it) the profile has no answer to required counter 'armor'",
    ]);
  });

  it('holds the maps after the cue to it while the profile still lacks a class it could take', () => {
    // The next map's row assumes the Rivet gone; if the Sprinkler went instead, it still has its
    // Rivet. Without the Prism, losing the Rivet leaves no armor answer.
    const campaign = ['dev_revoke', 'dev_maw'];
    const next = profile(MAW, ['sprinkler', 'zapcoil']);
    expect(revocationErrors({ dev_maw: next }, campaign)).toEqual([
      "[revocation] maps.dev_maw.referenceProfile: without 'rivet' (dev_revoke's revokeTowerClass could have taken it) the profile has no answer to required counter 'armor'",
    ]);
    // A Prism answers armor whichever class went.
    expect(
      revocationErrors({ dev_maw: profile(MAW, ['sprinkler', 'zapcoil', 'prism']) }, campaign),
    ).toEqual([]);
    // Every class back (the jailbreak): the window closed.
    expect(
      revocationErrors({ dev_maw: profile(MAW, ['rivet', 'sprinkler', 'zapcoil']) }, campaign),
    ).toEqual([]);
    // Off the campaign, no window.
    expect(revocationErrors({ dev_maw: next })).toEqual([]);
  });
});
