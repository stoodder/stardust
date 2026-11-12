// What an act's chunk holds (app/actContent.ts loads one; content/acts says what its story part
// holds): the act's story content and its sound groups.
import type { MusicGroup, MusicSet } from '../../audio/music/index.ts';
import type { SfxGroup } from '../../audio/sfx/index.ts';
import type { SfxRecipe } from '../../audio/types.ts';
import type { ActStory } from '../../content/acts/index.ts';

export interface ActChunk {
  readonly story: ActStory;
  readonly sfx: Readonly<Partial<Record<SfxGroup, Readonly<Record<string, SfxRecipe>>>>>;
  /** Its music groups (the finale's themes and cues; T850), if any. */
  readonly music?: Readonly<Partial<Record<MusicGroup, MusicSet>>>;
}
