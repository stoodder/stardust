// The interact intent end to end (T409; story-runtime.md § Map scripts): on dev_click
// (devBattle.ts) the Peeker's rock (9,6) is decor until W1 starts; then a click on it, armed or
// not, reads its facts from the sim and issues `interact`, the hover asks for the hand with no tile
// mask, the cursor announces its name, and once reached it's decor again. The Act I rock reads as
// a rock (T322).
import { describe, expect, it } from 'vitest';
import { battleConfig } from '../../app/battleSetup.ts';
import { cursorText } from '../../app/hudText.ts';
import type { IdSpace } from '../../content/types.ts';
import { createSim, type Command } from '../../sim/index.ts';
import { peekerHold } from '../views/peekerMotion.ts';
import { applyIntent } from './apply.ts';
import { BattleInteraction } from './BattleInteraction.ts';
import { hoverLook, resolveClick } from './intents.ts';
import { clickableAt, emptyTileFacts, fillTileFacts, peekerTile } from './tileFacts.ts';

const ROCK = { col: 9, row: 6 } as const;

function setup() {
  const sim = createSim(battleConfig('dev_click', 1));
  const index = ROCK.row * sim.map.cols + ROCK.col;
  const interaction = new BattleInteraction();
  const issued: Command<IdSpace>[] = [];
  const sink = {
    issue: (c: Command<IdSpace>) => {
      issued.push(c);
      sim.enqueue(c);
    },
    onCantBuild: () => issued.push({ type: 'callWave' }),
  };
  const click = (armed: string | null, aiming: 1 | null = null): void => {
    const facts = fillTileFacts(sim, index, emptyTileFacts());
    applyIntent(resolveClick(facts, 'left', armed, aiming), interaction, sink);
  };
  return { sim, index, interaction, issued, click };
}

describe('a clickable world object', () => {
  it('is plain decor until a script turns it on', () => {
    const { sim, index, issued, click } = setup();
    const facts = fillTileFacts(sim, index, emptyTileFacts());
    expect(facts.clickable).toBeNull();
    expect(clickableAt(sim, index)).toBeNull();
    expect(resolveClick(facts, 'left', null)).toEqual({ kind: 'deselect' });
    expect(hoverLook(facts, null, false).clickable).toBe(false);
    expect(cursorText(sim, index, null, null)).toBe('Ground, column 10, row 7.');
    click(null);
    expect(issued).toEqual([]);
    expect(peekerHold(true, sim.state.clickable)).toBe('empty');
    expect(peekerHold(false, sim.state.clickable)).toBe('shy');
  });

  it('while clickable: a click (armed or not) interacts; the hover is the hand, with no mask', () => {
    const { sim, index, interaction, issued, click } = setup();
    sim.enqueue({ type: 'callWave' });
    sim.step(); // W1 starts: the rock turns clickable
    expect(peekerHold(true, sim.state.clickable)).toBe('holding');
    const facts = fillTileFacts(sim, index, emptyTileFacts());
    expect(facts.clickable).toBe('peeker');
    for (const armed of [null, 'rivet']) {
      expect(resolveClick(facts, 'left', armed)).toEqual({ kind: 'interact', marker: 'peeker' });
      const look = hoverLook(facts, armed, false);
      expect([look.highlight, look.clickable, look.ghost]).toEqual([null, true, false]);
    }
    // Aiming an ability fires it there instead; a right-click still cancels.
    expect(resolveClick(facts, 'left', null, 1).kind).toBe('ability');
    expect(hoverLook(facts, null, false, 1).clickable).toBe(false);
    expect(resolveClick(facts, 'right', null).kind).toBe('cancel');
    expect(cursorText(sim, index, null, null)).toBe(
      "The Peeker's rock, column 10, row 7. Enter reaches for it.",
    );

    interaction.arm('rivet');
    click('rivet');
    expect(issued).toEqual([{ type: 'interact', marker: 'peeker' }]);
    expect(interaction.armed).toBe('rivet'); // the slot stays armed
    sim.step();
    expect(sim.state.interacted).toEqual(['peeker']);
    expect(peekerHold(true, sim.state.clickable)).toBe('empty');
    // Reached: decor again.
    expect(fillTileFacts(sim, index, emptyTileFacts()).clickable).toBeNull();
    expect(cursorText(sim, index, null, null)).toBe('Ground, column 10, row 7.');
  });

  it("the Act I Peeker's rock reads as a rock, and Enter pokes it (T322)", () => {
    const sim = createSim(battleConfig('a1_m01', 1));
    const rock = peekerTile(sim.map);
    expect(cursorText(sim, rock, null, null)).toBe('A rock, column 4, row 2. Enter pokes it.');
    expect(cursorText(sim, rock, 'rivet', null)).toBe('A rock, column 4, row 2.');
  });
});
