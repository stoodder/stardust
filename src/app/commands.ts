// The one door for player actions (architecture.md § UI: DOM overlay): the HUD (T106), keyboard
// hotkeys (keys.ts), and the test hooks act through these functions, never on the sim directly.
// Sim commands go through the current battle's host; interaction changes (selection, the armed
// build slot) go to the battle's BattleInteraction, which the scene and the HUD both read.
import type { IdSpace } from '../content/types.ts';
import type { BattleInteraction } from '../render/input/BattleInteraction.ts';
import type { Command } from '../sim/index.ts';
import { speed as speedSignal } from '../ui/state.ts';
import type { Host } from './host.ts';
import type { Speed } from './testHookTypes.ts';

/** What commands act on: the running battle, or null outside one. */
export interface CommandTarget {
  readonly host: Host<IdSpace>;
  readonly interaction: BattleInteraction;
  /** Cancels the scene's transient input state (Esc, right-click). */
  cancel(): void;
}

let target: CommandTarget | null = null;
/** The speed Space returns to when unpausing. */
let lastRunningSpeed: Exclude<Speed, 0> = 1;

/** Points commands at a battle (or at nothing, between battles). */
export function setCommandTarget(next: CommandTarget | null): void {
  target = next;
  if (next !== null) next.host.setSpeed(speedSignal.value);
}

/** Issues a sim command; it applies at the next tick (or right away while paused). */
export function issue(cmd: Command<IdSpace>): void {
  target?.host.enqueue(cmd);
}

/** Sets game speed (0 pauses). */
export function setSpeed(next: Speed): void {
  if (next !== 0) lastRunningSpeed = next;
  speedSignal.value = next;
  target?.host.setSpeed(next);
}

/** Space: pause, or resume at the last running speed. */
export function togglePause(): void {
  setSpeed(speedSignal.value === 0 ? lastRunningSpeed : 0);
}

/** F: toggle 1× and 2× (and unpause). */
export function toggleFastSpeed(): void {
  setSpeed(speedSignal.value === 2 ? 1 : 2);
}

/** Arms a build slot's tower (null disarms). */
export function armBuild(tower: string | null): void {
  target?.interaction.arm(tower);
}

/** Selects a tower by uid (0 clears). */
export function selectTower(uid: number): void {
  target?.interaction.selectTower(uid);
}

/** Esc / right-click: drops the selection. */
export function cancel(): void {
  target?.cancel();
}
