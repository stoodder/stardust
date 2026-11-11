// Placeholder art (T800a): the finale's new actors under their final sprite ids, so content can
// name them before their art lands (D069's pattern, as T700a did). Each is an existing sprite under
// the new id, without palette variants, so it keeps the sprite contract (enemy walks in four
// facings, 14×14 icons). T841 replaces each behind the same id (the Unsung's forms `gather`,
// `split`, `burrow`, `song`, `rest` beside it) and deletes its line here; this file goes away with
// the last of them.
import { enemyMaw } from '../enemies/maw.ts';
import { iconEnemyMaw } from '../icons/m6_enemies.ts';
import type { SpriteDef } from '../types.ts';

/** `base` under a new id, without its palette variants. */
function placeholder<const Id extends string>(base: SpriteDef, id: Id): SpriteDef<Id> {
  const { variants: _variants, ...rest } = base;
  return { ...rest, id };
}

/** The finale's placeholders, in gallery order (sprites/index.ts spreads them into SPRITES). */
export const M8_PLACEHOLDERS = [
  // The Unsung (T841).
  placeholder(enemyMaw, 'enemy.unsung'),
  placeholder(iconEnemyMaw, 'icon.enemy.unsung'),
] as const;
