// Which contact shadow a ground actor gets (art-direction §1). Render reads this; it never
// guesses sizes. Towers bake their shadow into the base frame, so this is for enemies (and
// any later ground unit without one).
import { SPRITES, type SpriteId } from './index.ts';

export interface GroundShadow {
  readonly sprite: 'fx.ground_shadow';
  readonly frame: 'small' | 'medium' | 'large';
  /** Image alpha: shadow pixels bake at 50%, so 0.7 draws them at 35%. */
  readonly alpha: number;
}

/** Contact-shadow alpha multiplier: 50% baked × 0.7 = 35% `ink.0`. */
export const GROUND_SHADOW_ALPHA = 0.7;

const SMALL: GroundShadow = {
  sprite: 'fx.ground_shadow',
  frame: 'small',
  alpha: GROUND_SHADOW_ALPHA,
};
const MEDIUM: GroundShadow = {
  sprite: 'fx.ground_shadow',
  frame: 'medium',
  alpha: GROUND_SHADOW_ALPHA,
};
const LARGE: GroundShadow = {
  sprite: 'fx.ground_shadow',
  frame: 'large',
  alpha: GROUND_SHADOW_ALPHA,
};

const byId = new Map<string, GroundShadow>();

/**
 * The contact shadow for a ground actor's sprite, sized by its authored width (≤ 15 px small,
 * ≤ 20 medium, else large). Draw it in `decal` at the actor's anchor (its ground point).
 */
export function groundShadowFor(id: SpriteId): GroundShadow {
  const cached = byId.get(id);
  if (cached !== undefined) return cached;
  const def = SPRITES.find((s) => s.id === id);
  const w = def?.size.w ?? 0;
  const s = w <= 15 ? SMALL : w <= 20 ? MEDIUM : LARGE;
  byId.set(id, s);
  return s;
}
