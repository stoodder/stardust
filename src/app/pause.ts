// The pause menu (T316): Esc with nothing to cancel, or the HUD's Menu button, opens Resume /
// Retry / Quit over a live battle. Opening it freezes the sim (speed 0) and drops any armed build
// or aim; Resume puts back the speed it found (a player's own pause stays). Retry and Quit end
// the run in the save as a loss first (app/navigation.ts `retryFromPause`, `quitFromPause`).
import { hud, screen, speed } from '../ui/state.ts';
import { sceneBlocks } from '../ui/dialogue/state.ts';
import { pauseMenu } from '../ui/pause/state.ts';
import { cancel, setSpeed } from './commands.ts';
import type { Speed } from './testHookTypes.ts';

/** The speed to put back on Resume. */
let resumeSpeed: Speed = 0;

/** Whether the pause menu can open: a live battle, with no briefing or scene up. */
export function pauseMenuAvailable(): boolean {
  return (
    screen.value === 'battle' &&
    hud.outcome.value === 'playing' &&
    hud.briefing.value === null &&
    !sceneBlocks.value
  );
}

/** Opens the pause menu over a live battle (no-op elsewhere, or when it's open). */
export function openPauseMenu(): void {
  if (pauseMenu.value || !pauseMenuAvailable()) return;
  resumeSpeed = speed.value;
  setSpeed(0);
  cancel();
  pauseMenu.value = true;
}

/** Resume (or Esc): closes the menu and puts back the speed it found. */
export function resumeFromPause(): void {
  if (!pauseMenu.value) return;
  pauseMenu.value = false;
  if (resumeSpeed !== 0) setSpeed(resumeSpeed);
}

/**
 * Esc in a live battle: cancels the armed build, the aim, or the selection, else hides the
 * keyboard cursor; with none of those, opens the pause menu (design/core-loop.md § 4).
 */
export function escapeInBattle(): void {
  const busy =
    hud.selectedTower.value !== 0 ||
    hud.armedTower.value !== null ||
    hud.aimingAbility.value !== null ||
    hud.cursorShown.value;
  if (busy) cancel();
  else openPauseMenu();
}
