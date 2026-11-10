// What a Protect map's asset looks like at each damage band (design/maps.md § 5.2, D111; T440c).
// Pure, so the choice is unit-tested; AssetView draws it. A2M2's Rigs 7 and 8 (`prop.rigs`) show
// one frame per band: intact, damaged (glass shards in both derricks), critical (one rig of two
// down, the other's beacon blinking alarm orange: the HUD's low-asset alarm), and lost.
import type { SpriteId } from '../../content/sprites/index.ts';
import type { MarkerId } from '../../content/types.ts';
import type { AssetDamage } from '../../sim/index.ts';

/** The sprite a Protect asset's marker draws, by marker id (A2M2's `rigs`). */
export const ASSET_SPRITES: Readonly<Record<MarkerId, SpriteId>> = { rigs: 'prop.rigs' };

/** A frame, and the looping anim to play over it (null: hold the frame). */
export interface AssetLook {
  readonly frame: string;
  readonly anim: string | null;
}

/** The asset's look at damage band `damage` (`assetDamage`); `none` reads as intact. */
export function assetLook(damage: AssetDamage): AssetLook {
  if (damage === 'critical') return { frame: 'critical_0', anim: 'critical' };
  if (damage === 'damaged' || damage === 'lost') return { frame: damage, anim: null };
  return { frame: 'intact', anim: null };
}
