// The clear intent end to end (T312a; design/maps.md § 3): a click (or the cursor's Enter) on the
// dev battle's wreckage tile reads its facts from the sim, issues `clear`, and the tile becomes its
// live tile once the drone is done; a build there first says "Clear it first".
import { describe, expect, it } from 'vitest';
import { battleConfig, DEV_MAP_ID } from '../../app/battleSetup.ts';
import { clearTicksFor, createSim, type Command } from '../../sim/index.ts';
import type { IdSpace } from '../../content/types.ts';
import { applyIntent } from './apply.ts';
import { BattleInteraction, type InputRefusal } from './BattleInteraction.ts';
import { resolveClick } from './intents.ts';
import { emptyTileFacts, fillTileFacts } from './tileFacts.ts';

/** The dev battle's wreckage tile (devBattle.ts: a pad lies under it). */
const WRECK = { col: 1, row: 4 } as const;

describe('the clear intent on the dev battle', () => {
  it('queues the drone, refuses a second click and an armed build, and builds once cleared', () => {
    const sim = createSim(battleConfig(DEV_MAP_ID, 1));
    const index = WRECK.row * sim.map.cols + WRECK.col;
    const interaction = new BattleInteraction();
    const refusals: InputRefusal[] = [];
    interaction.onRefusal((r) => refusals.push(r));
    const issued: Command<IdSpace>[] = [];
    const sink = {
      issue: (c: Command<IdSpace>) => {
        issued.push(c);
        sim.enqueue(c);
      },
      onCantBuild: () => refusals.push('invalidTarget'),
    };
    const click = (armed: string | null): void => {
      const facts = fillTileFacts(sim, index, emptyTileFacts());
      applyIntent(resolveClick(facts, 'left', armed), interaction, sink);
    };

    expect(fillTileFacts(sim, index, emptyTileFacts())).toMatchObject({
      buildable: false,
      wreckage: 'wreckage',
    });
    click('dev_rivet');
    expect(refusals).toEqual(['clearFirst']);
    expect(issued).toEqual([]);

    click(null);
    expect(issued).toEqual([{ type: 'clear', tile: [1, 4] }]);
    sim.step();
    expect(fillTileFacts(sim, index, emptyTileFacts()).wreckage).toBe('clearing');
    click(null);
    expect(refusals).toEqual(['clearFirst', 'alreadyQueued']);
    expect(issued).toHaveLength(1);

    for (let t = 0; t < clearTicksFor(sim.config.modifiers); t++) sim.step();
    expect(fillTileFacts(sim, index, emptyTileFacts())).toMatchObject({
      buildable: true,
      wreckage: 'cleared',
    });
    click('dev_rivet');
    expect(issued.at(-1)).toEqual({ type: 'build', tower: 'dev_rivet', tile: [1, 4] });
  });
});
