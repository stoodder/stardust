// The Evie billboards agree with the presentation dial (T410b; core-loop.md § 6.7, the `evie` row
// of content/presentation.ts, is the documented source): GroundView draws the billboard by the
// map's env (groundTiles `decorLook`, T440c), and on every registered campaign map that frame is
// the map's `evie` dial: `beaming` in Act I, `peeling` in Act II. (Act III's `dark` lands with its
// maps, M6.)
import { describe, expect, it } from 'vitest';
import { isCampaignMapId } from '../../content/dialogue/rules.ts';
import { MAPS } from '../../content/maps/index.ts';
import { presentationOfMap } from '../../story/presentation.ts';
import { decorLook } from './groundTiles.ts';

describe('the Evie billboards', () => {
  it("draw each campaign map's `evie` dial", () => {
    const maps = Object.values(MAPS).filter((m) => isCampaignMapId(m.id));
    expect(maps.length).toBeGreaterThan(5);
    for (const map of maps) {
      expect(decorLook('prop.billboard', map.env).frame, map.id).toBe(presentationOfMap(map).evie);
    }
  });
});
