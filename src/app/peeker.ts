// The Act I Peeker's poke (T309; design/core-loop.md § 6.9). A poke (a plain click on its rock, or
// Enter with the keyboard cursor on it) is a UI event, never a sim command: nothing in the run
// changes, so it never enters the command log. The scene plays the duck (PeekerView); this plays
// the squeak and sets the `peeker_poked` story flag on the save in play, written at once
// (story-runtime.md § Flags: UI events set flags). Once is enough: the first poke writes the
// flag, and later pokes only squeak. Writing at once, not at run end, is the path that persists:
// the poke counts on any Act I map whether the run is won, lost, or abandoned, and run end
// (`recordRun`) builds on the same in-memory save, so it keeps the flag.
import type { CompiledMapDef } from '../content/compiled.ts';
import type { IdSpace } from '../content/types.ts';
import type { SaveData } from '../meta/index.ts';
import type { BattleInteraction } from '../render/input/BattleInteraction.ts';
import { peekerTile } from '../render/input/tileFacts.ts';
import { playSfx } from './audio.ts';
import { activeSave, updateActiveSave } from './save.ts';

/** `save` with `peeker_poked` set (the same object when it already is). */
export function withPeekerPoked(save: SaveData): SaveData {
  if (save.story.flags.peeker_poked === true) return save;
  return {
    ...save,
    story: { ...save.story, flags: { ...save.story.flags, peeker_poked: true } },
  };
}

/** A poke: the squeak, and the flag on the save in play the first time (none in a `?map=` battle). */
export function pokePeeker(): void {
  playSfx('peeker_squeak');
  const save = activeSave();
  if (save === null || save.story.flags.peeker_poked === true) return;
  // A failed write is logged by the save session, which keeps the flag for the next write.
  updateActiveSave(withPeekerPoked);
}

/**
 * Listens for pokes in a battle on `map` (only an Act I map with a `peeker` marker has a Peeker to
 * poke). Returns the unsubscribe.
 */
export function bindPeeker(map: CompiledMapDef<IdSpace>, interaction: BattleInteraction): () => void {
  if (peekerTile(map) < 0) return () => {};
  return interaction.onPoke(pokePeeker);
}
