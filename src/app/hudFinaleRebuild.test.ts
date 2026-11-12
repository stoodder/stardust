// M8 review round 1, A3 (D156): after "Who's there?" restores the folded class (`ClassRestored`),
// the battle stands paused with QUILL's word under PAUSED (`REBUILD_NOTE`), so a human rebuilds
// before the Halls run on. Play resumes only on the player's own press, and the word goes with
// it; a resumed run's replay neither pauses nor speaks; another map's battle never shows it.
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { IdSpace } from '../content/types.ts';
import type { BattleInteraction } from '../render/input/BattleInteraction.ts';
import { createSim } from '../sim/index.ts';
import { pauseNote } from '../ui/hud/finaleState.ts';
import { showsPaused } from '../ui/hud/Notices.tsx';
import { speed } from '../ui/state.ts';
import { battleConfig } from './battleSetup.ts';
import { setCommandTarget, setSpeed, togglePause } from './commands.ts';
import { createHost, type Host } from './host.ts';
import { bindFinaleHud, REBUILD_NOTE } from './hudFinale.ts';

vi.mock('./battle.ts', () => ({ startBattle: () => undefined }));
vi.mock('../render/scenes/BackdropScene.ts', () => ({ BACKDROP_SCENE_KEY: 'backdrop' }));

const noop = (): void => {};
let offs: (() => void)[] = [];
afterEach(() => {
  for (const off of offs) off();
  offs = [];
  setCommandTarget(null);
  setSpeed(1);
});

function bind(map: string): Host<IdSpace> {
  const host = createHost(createSim(battleConfig(map, 1, null)));
  setCommandTarget({
    host,
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- nothing here arms or aims
    interaction: {} as BattleInteraction,
    cancel: noop,
  });
  setSpeed(2);
  offs.push(bindFinaleHud(host, 1000));
  return host;
}

describe('the rebuild pause after "Who\'s there?" (A3)', () => {
  it("pauses with QUILL's word; the player's own press resumes and clears it", () => {
    const host = bind('fin_m01');
    expect(pauseNote.value).toBeNull();
    host.bus.emit({ type: 'ClassRestored', tower: 'mindspike' });
    expect(speed.value).toBe(0);
    expect(pauseNote.value).toEqual(REBUILD_NOTE);
    expect(REBUILD_NOTE.speaker).toBe('QUILL');
    expect(showsPaused(speed.value, 'playing', null)).toBe(true);
    togglePause(); // Space: back to the last running speed
    expect(speed.value).toBe(2);
    expect(pauseNote.value).toBeNull();
  });

  it('never scolds: no "!" and no blame, and it names the way back', () => {
    expect(REBUILD_NOTE.text).not.toMatch(/!/);
    expect(REBUILD_NOTE.text).toMatch(/rebuild/i);
    expect(REBUILD_NOTE.text).toMatch(/press play/);
  });

  it("a resumed run's replay neither pauses nor speaks", () => {
    const host = bind('fin_m01');
    Object.defineProperty(host, 'replaying', { value: true, configurable: true });
    host.bus.emit({ type: 'ClassRestored', tower: 'mindspike' });
    expect(speed.value).toBe(2);
    expect(pauseNote.value).toBeNull();
  });

  it('is quiet off the finale, and gone as the battle unbinds', () => {
    const host = bind('a3_m02');
    host.bus.emit({ type: 'ClassRestored', tower: 'thumper' });
    expect(pauseNote.value).toBeNull();
    const fin = bind('fin_m01');
    fin.bus.emit({ type: 'ClassRestored', tower: 'mindspike' });
    expect(pauseNote.value).not.toBeNull();
    for (const off of offs) off();
    offs = [];
    expect(pauseNote.value).toBeNull();
  });
});
