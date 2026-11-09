// The dialogue registries (docs/tech/story-runtime.md): every map's scenes and map-scoped barks,
// the shared bark pools, and lookups by id. Each map's files are its own (`a<act>/a<act>_m0N/`), so
// map tasks never share an edit here beyond their one registry line.
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
import { barks as a2m01Barks } from './a2/a2_m01/barks.ts';
import { scenes as a2m01Scenes } from './a2/a2_m01/scenes.ts';
import { barks as a2m02Barks } from './a2/a2_m02/barks.ts';
import { scenes as a2m02Scenes } from './a2/a2_m02/scenes.ts';
import { barks as a2m03Barks } from './a2/a2_m03/barks.ts';
import { scenes as a2m03Scenes } from './a2/a2_m03/scenes.ts';
import { SHARED_BARKS } from './barks/index.ts';
import type { Bark, BarkId, MapDialogue, Scene, SceneId } from './types.ts';

export * from './types.ts';
export { defineBarks, defineScene, defineScenes } from './define.ts';
export { SPEAKER_DEFS, SPEAKERS } from './speakers.ts';
export type { BlipId, PortraitSpriteId, SpeakerDef, SpeakerFrame } from './speakers.ts';

/** Every map's dialogue, in campaign order. */
export const MAP_DIALOGUE: readonly MapDialogue[] = [
  { map: 'a1_m01', scenes: a1m01Scenes, barks: a1m01Barks },
  { map: 'a1_m02', scenes: a1m02Scenes, barks: a1m02Barks },
  { map: 'a1_m03', scenes: [...a1m03Scenes, ...a1m03BaseScenes], barks: a1m03Barks },
  { map: 'a1_m04', scenes: a1m04Scenes, barks: a1m04Barks },
  { map: 'a1_m05', scenes: a1m05Scenes, barks: a1m05Barks },
  { map: 'a2_m01', scenes: a2m01Scenes, barks: a2m01Barks },
  { map: 'a2_m02', scenes: a2m02Scenes, barks: a2m02Barks },
  { map: 'a2_m03', scenes: a2m03Scenes, barks: a2m03Barks },
];

/** Every scene, by id. */
export const SCENES: Readonly<Record<SceneId, Scene>> = Object.fromEntries(
  MAP_DIALOGUE.flatMap((m) => m.scenes.map((s) => [s.id, s] as const)),
);

/** Every bark (map-scoped and shared), by id. */
export const BARKS: Readonly<Record<BarkId, Bark>> = Object.fromEntries(
  [...MAP_DIALOGUE.flatMap((m) => m.barks), ...SHARED_BARKS].map((b) => [b.id, b] as const),
);

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
