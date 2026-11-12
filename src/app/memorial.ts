// The finale's memorial wreck (finale.md § FIN, *Layout*; art-direction §6 *The memorial wreck*;
// T831): render draws the wrecked variant of the class Bricks's A3M3 tag was on (the save's
// `story.memorialTower`), and hovering it shows the plate's name, A3M3's tag text resolved exactly
// as the dialogue resolves it (story/text.ts `resolveText` over the save's text context), never a
// raw token. BattleScene takes both as optional deps (BattleSceneDeps `memorialTower`,
// `memorialName`).
import type { TowerId } from '../content/types.ts';
import type { SaveData } from '../meta/saveData.ts';
import { tagDefFor } from '../story/tags.ts';
import { resolveText } from '../story/text.ts';
import { textContext } from './inbox.ts';

/** The memorial's deps for a battle under `save`: its class and its plate's resolved name. */
export function memorialFor(save: SaveData | null): {
  readonly memorialTower: TowerId | null;
  readonly memorialName: string;
} {
  const tag = tagDefFor('a3_m03');
  return {
    memorialTower: save?.story.memorialTower ?? null,
    memorialName: save === null || tag === null ? '' : resolveText(tag.name, textContext(save)),
  };
}
