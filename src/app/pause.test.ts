// The pause menu (T316): Esc with nothing to cancel opens it over a live battle, it freezes the sim
// and Resume puts back the speed it found; it never opens over the briefing, a scene, or the end.
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { pauseMenu } from '../ui/pause/state.ts';
import { hud, screen, speed } from '../ui/state.ts';
import { setSpeed } from './commands.ts';
import { escapeInBattle, openPauseMenu, pauseMenuAvailable, resumeFromPause } from './pause.ts';

beforeEach(() => {
  screen.value = 'battle';
  hud.outcome.value = 'playing';
  hud.briefing.value = null;
  hud.selectedTower.value = 0;
  hud.armedTower.value = null;
  hud.aimingAbility.value = null;
  hud.cursorShown.value = false;
  pauseMenu.value = false;
  setSpeed(2);
});

afterEach(() => {
  pauseMenu.value = false;
  setSpeed(1);
});

describe('the pause menu', () => {
  it('opens on Esc with nothing to cancel, freezing the sim; Resume puts the speed back', () => {
    escapeInBattle();
    expect(pauseMenu.value).toBe(true);
    expect(speed.value).toBe(0);
    resumeFromPause();
    expect(pauseMenu.value).toBe(false);
    expect(speed.value).toBe(2);
  });

  it("keeps a player's own pause", () => {
    setSpeed(0);
    openPauseMenu();
    resumeFromPause();
    expect(speed.value).toBe(0);
  });

  it('lets Esc cancel first: a selection, an armed build, an aim, or the tile cursor', () => {
    for (const busy of [
      () => (hud.selectedTower.value = 3),
      () => (hud.armedTower.value = 'rivet'),
      () => (hud.aimingAbility.value = 1),
      () => (hud.cursorShown.value = true),
    ]) {
      busy();
      escapeInBattle();
      expect(pauseMenu.value).toBe(false);
      hud.selectedTower.value = 0;
      hud.armedTower.value = null;
      hud.aimingAbility.value = null;
      hud.cursorShown.value = false;
    }
  });

  it('never opens over the briefing, after the map ends, or off the battle screen', () => {
    hud.briefing.value = 'a1_m01_brief';
    expect(pauseMenuAvailable()).toBe(false);
    hud.briefing.value = null;
    hud.outcome.value = 'won';
    openPauseMenu();
    expect(pauseMenu.value).toBe(false);
    hud.outcome.value = 'playing';
    screen.value = 'results';
    openPauseMenu();
    expect(pauseMenu.value).toBe(false);
    expect(speed.value).toBe(2);
  });
});
