// The Act I Peeker's poke (T309): a UI event that sets `peeker_poked` on the save in play, once,
// and reaches the cursor and the click the same way (render/input).
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryStore, createNewSave } from '../meta/index.ts';
import { BattleInteraction } from '../render/input/BattleInteraction.ts';
import { applyIntent } from '../render/input/apply.ts';
import { resolveClick } from '../render/input/intents.ts';
import { emptyTileFacts, fillTileFacts, peekerTile } from '../render/input/tileFacts.ts';
import { createSim } from '../sim/index.ts';
import { battleConfig } from './battleSetup.ts';
import { hud } from '../ui/state.ts';
import { createHost } from './host.ts';
import {
  bindClickables,
  bindPeeker,
  clickableText,
  pokePeeker,
  withPeekerPoked,
} from './peeker.ts';
import { activeSave, initSaves, newGame } from './save.ts';
import { playSfx } from './audio.ts';
import { checkpointOf, resumeOf } from './checkpoints.ts';

vi.mock('./audio.ts', async (orig) => ({
  ...(await orig<typeof import('./audio.ts')>()),
  playSfx: vi.fn(),
}));
const played = (sfx: string): number =>
  vi.mocked(playSfx).mock.calls.filter(([id]) => id === sfx).length;
const squeaks = (): number => played('peeker_squeak');
const lightsUp = (): number => played('peeker_lights_up');

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

  it('screen readers hear a clickable object turn clickable, by its name (T409)', () => {
    const host = createHost(sim('dev_click'));
    const off = bindClickables(host);
    hud.announce.value = '';
    host.sim.enqueue({ type: 'callWave' });
    host.fastForward(1);
    expect(hud.announce.value).toBe(clickableText("The Peeker's rock"));
    expect(clickableText("The Peeker's rock")).toMatch(/^The Peeker's rock: within reach\./);
    off();
    // A map without clickables binds nothing.
    const plain = createHost(sim('a1_m01'));
    expect(() => bindClickables(plain)()).not.toThrow();
  });

  it("the Peeker's rock calls once as it lights up, never while a checkpoint replays (D135)", () => {
    vi.mocked(playSfx).mockClear();
    const host = createHost(sim('dev_click'));
    const off = bindClickables(host);
    host.sim.enqueue({ type: 'callWave' });
    host.fastForward(1);
    // Its own lights-up call (D135), not the on-click squeak.
    expect(lightsUp()).toBe(1);
    expect(squeaks()).toBe(0);
    host.fastForward(30);
    expect(lightsUp()).toBe(1); // armed once a run: one call
    off();
    // The same run replayed to a later tick: it arms again in the replay, silently.
    vi.mocked(playSfx).mockClear();
    const tick = host.sim.state.tick;
    const cp = checkpointOf({ wave: 1, tick }, host.sim.state.commandLog);
    const resumed = createHost(sim('dev_click'), {
      resume: resumeOf(host.sim.state.commandLog, cp),
    });
    const off2 = bindClickables(resumed);
    resumed.catchUp();
    expect(resumed.sim.state.tick).toBe(tick);
    expect(lightsUp() + squeaks()).toBe(0);
    off2();
  });

  it('screen readers hear a rock already armed as a resumed battle binds, with no sound (D135)', () => {
    const host = createHost(sim('dev_click'));
    host.sim.enqueue({ type: 'callWave' });
    host.fastForward(31);
    expect(host.sim.state.clickable.length).toBeGreaterThan(0);
    const tick = host.sim.state.tick;
    const cp = checkpointOf({ wave: 1, tick }, host.sim.state.commandLog);
    const resumed = createHost(sim('dev_click'), {
      resume: resumeOf(host.sim.state.commandLog, cp),
    });
    // As app/battle.ts does: the replay runs first, then the clickables bind.
    resumed.catchUp();
    vi.mocked(playSfx).mockClear();
    hud.announce.value = '';
    const off = bindClickables(resumed);
    expect(hud.announce.value).toBe(clickableText("The Peeker's rock"));
    expect(lightsUp() + squeaks()).toBe(0);
    off();
    // A fresh battle with nothing armed yet hears nothing as it binds.
    hud.announce.value = '';
    bindClickables(createHost(sim('dev_click')))();
    expect(hud.announce.value).toBe('');
  });
});
