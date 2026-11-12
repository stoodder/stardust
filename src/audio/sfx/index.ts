// The sound effect registry: every recipe by id (architecture.md § Audio). Recipes are data; the
// synth plays any of them the same way, and recipes.test.ts validates each one. Act I's and the
// shared sounds are always registered; Act II's and Act III's (and the finale's) arrive with their
// act's chunk (app/acts/; architecture.md § 5, *Bundle*), so `SFX` and `SFX_IDS` are updated in
// place, always in registry order. `SfxId` names every sound, registered or not: a sound whose
// act hasn't loaded plays nothing (`loadedSfx`).
import type { SfxRecipe } from '../types.ts';
import type { ACT2_SFX } from './act2.ts';
import type { ACT2B_SFX } from './act2b.ts';
import type { ACT2_TOWER_SFX } from './act2towers.ts';
import type { ACT3_SFX } from './act3.ts';
import type { ACT3B_SFX } from './act3b.ts';
import type { FIN_SFX } from './fin.ts';
import type { AELARI_SFX } from './aelari.ts';
import { ALLY_SFX } from './allies.ts';
import { BATTLE_SFX } from './battle.ts';
import { SPEECH_SFX } from './blips.ts';
import { BOSS_SFX } from './boss.ts';
import { COMMANDER_SFX } from './commander.ts';
import { HIT_SFX } from './hits.ts';
import type { HOLLOW_SFX } from './hollow.ts';
import { PEST_SFX } from './pests.ts';
import { TOWER_SFX } from './towers.ts';
import { UI_SFX } from './ui.ts';

export type { SpeakerBlipId } from './blips.ts';

/** The sounds always registered: Act I's and the shared ones (the speech blips last). */
const CORE_SFX = {
  ...UI_SFX,
  ...TOWER_SFX,
  ...BATTLE_SFX,
  ...ALLY_SFX,
  ...HIT_SFX,
  ...PEST_SFX,
  ...BOSS_SFX,
  ...COMMANDER_SFX,
} as const satisfies Readonly<Record<string, SfxRecipe>>;

/** Every sound an act chunk brings (app/acts/a2.ts, a3.ts, fin.ts), by group. */
type LazySfx = typeof AELARI_SFX &
  typeof HOLLOW_SFX &
  typeof ACT2_SFX &
  typeof ACT2B_SFX &
  typeof ACT2_TOWER_SFX &
  typeof ACT3_SFX &
  typeof ACT3B_SFX &
  typeof FIN_SFX;

/** Every recipe, registered or not, with its literal shape. */
type AllSfx = typeof CORE_SFX & LazySfx & typeof SPEECH_SFX;

/** A sound effect's id (registered or not yet: its act may still be loading). */
export type SfxId = keyof AllSfx;

/**
 * The groups an act chunk registers, in registry order (`registerSfx`): each group's recipes sit
 * between the core sounds and the speech blips, in this order, whichever act loads first.
 */
export const SFX_GROUPS = [
  'aelari',
  'hollow',
  'act2',
  'act2b',
  'act2towers',
  'act3',
  'act3b',
  'fin',
] as const;
export type SfxGroup = (typeof SFX_GROUPS)[number];

const groups = new Map<SfxGroup, Readonly<Record<string, SfxRecipe>>>();
const registry: Record<string, SfxRecipe> = {};
const ids: SfxId[] = [];

/**
 * Every registered recipe, by id: the core's always, an act's once its chunk has loaded. Typed as
 * every sound; read one that may not be registered with `loadedSfx`.
 */
// oxlint-disable-next-line typescript/no-unsafe-type-assertion -- typed as every sound; read one whose act may not be in with `loadedSfx`
export const SFX: Readonly<AllSfx> = registry as AllSfx;

/** Whether `id` names a registered sound effect. */
export function isSfxId(id: string): id is SfxId {
  return Object.hasOwn(registry, id);
}

/** Every registered sound effect id, in registry order (updated in place). */
export const SFX_IDS: readonly SfxId[] = ids;

/** Rebuilds the registry in registry order: the core, the act groups, the speech blips. */
function rebuild(): void {
  for (const id of Object.keys(registry)) delete registry[id];
  Object.assign(registry, CORE_SFX);
  for (const g of SFX_GROUPS) Object.assign(registry, groups.get(g) ?? {});
  Object.assign(registry, SPEECH_SFX);
  ids.length = 0;
  ids.push(...Object.keys(registry).filter(isSfxId));
}
rebuild();

/** Registers an act chunk's sound groups (again: replaces them). */
export function registerSfx(
  add: Readonly<Partial<Record<SfxGroup, Readonly<Record<string, SfxRecipe>>>>>,
): void {
  for (const g of SFX_GROUPS) {
    const recipes = add[g];
    if (recipes !== undefined) groups.set(g, recipes);
  }
  rebuild();
}

/** A recipe by id (typed as the general shape). Its act must be registered (`loadedSfx` if not). */
export function sfxRecipe(id: SfxId): SfxRecipe {
  return SFX[id];
}

/** A recipe by id, or undefined while its act's chunk hasn't loaded (it plays nothing). */
export function loadedSfx(id: SfxId): SfxRecipe | undefined {
  return Object.hasOwn(registry, id) ? registry[id] : undefined;
}
