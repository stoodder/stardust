// The dialogue registries (docs/tech/story-runtime.md): every map's scenes and map-scoped barks,
// the shared bark pools, and lookups by id. Each map's files are its own (`a<act>/a<act>_m0N/`), so
// map tasks never share an edit here beyond their one registry line: Act I's maps below, a later
// act's in its act file (content/acts/a2.ts, a3.ts, fin.ts), which loads with that act's chunk
// (architecture.md § 5, *Bundle*). The shared bark pools are always registered.
import type { CampaignMapId } from '../campaign.ts';
import { barks as a1m01Barks } from './a1/a1_m01/barks.ts';
import { scenes as a1m01Scenes } from './a1/a1_m01/scenes.ts';
import { barks as a1m02Barks } from './a1/a1_m02/barks.ts';
import { scenes as a1m02Scenes } from './a1/a1_m02/scenes.ts';
import { barks as a1m03Barks } from './a1/a1_m03/barks.ts';
import { scenes as a1m03BaseScenes } from './a1/a1_m03/base.ts';
import { scenes as a1m03Scenes } from './a1/a1_m03/scenes.ts';
import { barks as a1m04Barks } from './a1/a1_m04/barks.ts';
import { scenes as a1m04Scenes } from './a1/a1_m04/scenes.ts';
import { barks as a1m05Barks } from './a1/a1_m05/barks.ts';
import { scenes as a1m05Scenes } from './a1/a1_m05/scenes.ts';
import { SHARED_BARKS } from './barks/index.ts';
import type { Bark, BarkId, MapDialogue, Scene, SceneId } from './types.ts';

export * from './types.ts';
export { defineBarks, defineScene, defineScenes } from './define.ts';
export { SPEAKER_DEFS, SPEAKERS } from './speakers.ts';
export type { BlipId, PortraitSpriteId, SpeakerDef, SpeakerFrame } from './speakers.ts';

/** Act I's dialogue, in campaign order: always registered (later acts' arrive with their chunk). */
const ACT1_DIALOGUE: readonly MapDialogue[] = [
  { map: 'a1_m01', scenes: a1m01Scenes, barks: a1m01Barks },
  { map: 'a1_m02', scenes: a1m02Scenes, barks: a1m02Barks },
  { map: 'a1_m03', scenes: [...a1m03Scenes, ...a1m03BaseScenes], barks: a1m03Barks },
  { map: 'a1_m04', scenes: a1m04Scenes, barks: a1m04Barks },
  { map: 'a1_m05', scenes: a1m05Scenes, barks: a1m05Barks },
];

/** Each act's maps' dialogue by act rank (content/acts: Act I 0 … the finale 3). */
const byAct: (readonly MapDialogue[] | undefined)[] = [ACT1_DIALOGUE];
const mapDialogueList: MapDialogue[] = [];
const scenes: Record<SceneId, Scene> = {};
const barks: Record<BarkId, Bark> = {};

/**
 * Every registered map's dialogue, in campaign order: Act I's always, a later act's once its chunk
 * has loaded (content/acts; app/actContent.ts). The array is updated in place.
 */
export const MAP_DIALOGUE: readonly MapDialogue[] = mapDialogueList;

/** Every registered scene, by id (updated in place as acts register). */
export const SCENES: Readonly<Record<SceneId, Scene>> = scenes;

/** Every registered bark (map-scoped and shared), by id (updated in place as acts register). */
export const BARKS: Readonly<Record<BarkId, Bark>> = barks;

/** Rebuilds the lists from the registered acts, in campaign order. */
function rebuild(): void {
  mapDialogueList.length = 0;
  for (const id of Object.keys(scenes)) delete scenes[id];
  for (const id of Object.keys(barks)) delete barks[id];
  for (const part of byAct) if (part !== undefined) mapDialogueList.push(...part);
  for (const m of mapDialogueList) {
    for (const s of m.scenes) scenes[s.id] = s;
    for (const b of m.barks) barks[b.id] = b;
  }
  for (const b of SHARED_BARKS) barks[b.id] = b;
}
rebuild();

/**
 * Registers an act's maps' dialogue (content/acts `registerActStory`; `rank` is the act's rank,
 * Act II 1 … the finale 3). Registering an act again replaces its part.
 */
export function registerMapDialogue(rank: number, maps: readonly MapDialogue[]): void {
  byAct[rank] = maps;
  rebuild();
}

/** The scene `id`, if registered. */
export function sceneById(id: SceneId): Scene | undefined {
  return Object.hasOwn(SCENES, id) ? SCENES[id] : undefined;
}

/** Map `map`'s dialogue (empty when it has none). */
export function mapDialogue(map: CampaignMapId): MapDialogue {
  return MAP_DIALOGUE.find((m) => m.map === map) ?? { map, scenes: [], barks: [] };
}

/** The barks that can fire on `map`: its own, then the shared pools (each gated by `when`). */
export function barksFor(map: CampaignMapId): readonly Bark[] {
  return [...mapDialogue(map).barks, ...SHARED_BARKS];
}
