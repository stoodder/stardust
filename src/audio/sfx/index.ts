// The sound effect registry: every recipe by id (architecture.md § Audio). Recipes are data; the
// synth plays any of them the same way, and recipes.test.ts validates each one.
import type { SfxRecipe } from '../types.ts';
import { ACT2_SFX } from './act2.ts';
import { ACT2B_SFX } from './act2b.ts';
import { ACT2_TOWER_SFX } from './act2towers.ts';
import { ACT3_SFX } from './act3.ts';
import { ACT3B_SFX } from './act3b.ts';
import { AELARI_SFX } from './aelari.ts';
import { ALLY_SFX } from './allies.ts';
import { BATTLE_SFX } from './battle.ts';
import { SPEECH_SFX } from './blips.ts';
import { BOSS_SFX } from './boss.ts';
import { COMMANDER_SFX } from './commander.ts';
import { HIT_SFX } from './hits.ts';
import { HOLLOW_SFX } from './hollow.ts';
import { PEST_SFX } from './pests.ts';
import { TOWER_SFX } from './towers.ts';
import { UI_SFX } from './ui.ts';

export type { SpeakerBlipId } from './blips.ts';

export const SFX = {
  ...UI_SFX,
  ...TOWER_SFX,
  ...BATTLE_SFX,
  ...ALLY_SFX,
  ...HIT_SFX,
  ...PEST_SFX,
  ...BOSS_SFX,
  ...COMMANDER_SFX,
  ...AELARI_SFX,
  ...HOLLOW_SFX,
  ...ACT2_SFX,
  ...ACT2B_SFX,
  ...ACT2_TOWER_SFX,
  ...ACT3_SFX,
  ...ACT3B_SFX,
  ...SPEECH_SFX,
} as const satisfies Readonly<Record<string, SfxRecipe>>;

/** A sound effect's id. */
export type SfxId = keyof typeof SFX;

/** Whether `id` names a sound effect. */
export function isSfxId(id: string): id is SfxId {
  return Object.hasOwn(SFX, id);
}

/** Every sound effect id, in registry order. */
export const SFX_IDS: readonly SfxId[] = Object.keys(SFX).filter(isSfxId);

/** A recipe by id (typed as the general shape). */
export function sfxRecipe(id: SfxId): SfxRecipe {
  return SFX[id];
}
