// The Act I Peeker's poke (T309): a UI event that sets `peeker_poked` on the save in play, once,
// and reaches the cursor and the click the same way (render/input).
import { beforeEach, describe, expect, it } from 'vitest';
import { MemoryStore, createNewSave } from '../meta/index.ts';
import { BattleInteraction } from '../render/input/BattleInteraction.ts';
import { applyIntent } from '../render/input/apply.ts';
import { resolveClick } from '../render/input/intents.ts';
import { emptyTileFacts, fillTileFacts, peekerTile } from '../render/input/tileFacts.ts';
import { createSim } from '../sim/index.ts';
import { battleConfig } from './battleSetup.ts';
import { bindPeeker, pokePeeker, withPeekerPoked } from './peeker.ts';
import { activeSave, initSaves, newGame } from './save.ts';

const sim = (mapId: string) => createSim(battleConfig(mapId, 1, null));

describe('the Peeker', () => {
  beforeEach(() => {
    initSaves(new MemoryStore(), () => 0);
  });

  it("sits on each Act I map's peeker marker", () => {
    const a1 = sim('a1_m01');
    expect(peekerTile(a1.map)).toBe(1 * a1.map.cols + 3); // (3, 1), act1.md § A1M1
    const a2 = sim('a1_m02');
    expect(peekerTile(a2.map)).toBe(4 * a2.map.cols + 13);
    // Not an Act I map: no UI-event Peeker (A2M3's rock is a scripted `interact`).
    expect(peekerTile({ ...a1.map, act: 2 })).toBe(-1);
    expect(peekerTile({ ...a1.map, markers: {} })).toBe(-1);
  });

  it('a click on the rock pokes it; nothing reaches the sim', () => {
    const s = sim('a1_m01');
    const interaction = new BattleInteraction();
    const issued: unknown[] = [];
    let pokes = 0;
    interaction.onPoke(() => pokes++);
    const facts = fillTileFacts(s, peekerTile(s.map), emptyTileFacts());
    expect(facts.peeker).toBe(true);
    applyIntent(resolveClick(facts, 'left', null), interaction, {
      issue: (c) => issued.push(c),
      onCantBuild: () => issued.push('cantBuild'),
    });
    expect(pokes).toBe(1);
    expect(issued).toEqual([]);
    expect(fillTileFacts(s, 0, emptyTileFacts()).peeker).toBe(false);
  });

  it('sets peeker_poked on the save in play, once', () => {
    expect(newGame(1).ok).toBe(true);
    expect(activeSave()?.story.flags.peeker_poked).toBeUndefined();
    const s = sim('a1_m01');
    const interaction = new BattleInteraction();
    const off = bindPeeker(s.map, interaction);
    interaction.poke();
    const after = activeSave();
    expect(after?.story.flags.peeker_poked).toBe(true);
    interaction.poke(); // once is enough: no second write
    expect(activeSave()).toBe(after);
    off();
  });

  it('does nothing without a save (a ?map= battle) or off Act I', () => {
    expect(() => pokePeeker()).not.toThrow();
    expect(activeSave()).toBeNull();
    expect(newGame(1).ok).toBe(true);
    const s = sim('a1_m01');
    const interaction = new BattleInteraction();
    bindPeeker({ ...s.map, act: 2 }, interaction)();
    interaction.poke();
    expect(activeSave()?.story.flags.peeker_poked).toBeUndefined();
  });

  it('withPeekerPoked leaves a poked save as it is', () => {
    const save = withPeekerPoked(createNewSave());
    expect(save.story.flags.peeker_poked).toBe(true);
    expect(withPeekerPoked(save)).toBe(save);
  });
});
