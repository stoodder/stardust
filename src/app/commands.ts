// The one door for player actions (architecture.md § UI: DOM overlay): the HUD (T106), keyboard
// hotkeys (keys.ts), and the test hooks act through these functions, never on the sim directly.
// Sim commands go through the current battle's host; interaction changes (selection, the armed
// build slot, the aimed ability) go to the battle's BattleInteraction, which the scene and the HUD
// both read.
import type { IdSpace, TargetPriority } from '../content/types.ts';
import type { BattleInteraction } from '../render/input/BattleInteraction.ts';
import type { Command } from '../sim/index.ts';
import { hud, speed as speedSignal } from '../ui/state.ts';
import type { Host } from './host.ts';
import { rejectText, showNotice } from './hud.ts';
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

/** Arms a build slot's tower (null disarms). Arming drops the selection. */
export function armBuild(tower: string | null): void {
  target?.interaction.arm(tower);
}

/**
 * A build slot (HUD click or keys 1–4, 0-based here): arms its tower, or disarms it if it's
 * already armed. A locked or unaffordable tower doesn't arm; a notice says why.
 */
export function pressBuildSlot(index: number): void {
  if (target === null) return;
  const { host, interaction } = target;
  const tower = host.sim.config.loadout[index];
  if (tower === undefined) return;
  if (interaction.armed === tower) {
    interaction.arm(null);
    return;
  }
  const state = host.sim.state;
  const cost = host.sim.config.content.towers[tower]?.tiers[0].cost ?? Infinity;
  const why = state.lockedTowers.includes(tower)
    ? 'towerLocked'
    : state.credits < cost
      ? 'cantAfford'
      : null;
  if (why !== null) {
    showNotice(rejectText(why) ?? '');
    return;
  }
  interaction.arm(tower);
}

/** Selects a tower by uid (0 clears). Selecting a tower disarms. */
export function selectTower(uid: number): void {
  target?.interaction.selectTower(uid);
}

/** U: upgrades the selected tower to its next tier. */
export function upgradeSelected(): void {
  const uid = target?.interaction.selectedTower ?? 0;
  if (uid !== 0) issue({ type: 'upgrade', towerUid: uid });
}

/** S: sells the selected tower. */
export function sellSelected(): void {
  const uid = target?.interaction.selectedTower ?? 0;
  if (uid !== 0) issue({ type: 'sell', towerUid: uid });
}

/** Targeting priorities in cycle order (core-loop §2.6). */
export const PRIORITY_CYCLE: readonly TargetPriority[] = ['first', 'last', 'strong', 'close'];

/** The priority after `p` in the cycle. */
export function nextPriority(p: TargetPriority): TargetPriority {
  return PRIORITY_CYCLE[(PRIORITY_CYCLE.indexOf(p) + 1) % PRIORITY_CYCLE.length] ?? 'first';
}

/** T: cycles the selected tower's targeting priority. */
export function cycleTargeting(): void {
  const sel = hud.selected.value;
  if (target === null || sel === null || sel.uid !== target.interaction.selectedTower) return;
  if (sel.priority === null) {
    showNotice(rejectText('noTargeting') ?? '');
    return;
  }
  issue({ type: 'targeting', towerUid: sel.uid, mode: nextPriority(sel.priority) });
}

/** W: starts wave 1, or calls the next wave early during a countdown (core-loop §2.4). */
export function callWave(): void {
  issue({ type: 'callWave' });
}

/**
 * An ability slot (HUD click, or Q for slot 1): starts aiming it, so the next click on a tile fires
 * it there, or stops aiming if it's already aimed. An empty or recharging slot doesn't aim; a
 * notice says why. Aiming works while paused (the strike fires when play resumes, core-loop §3.1).
 */
export function pressAbility(slot: 1 | 2): void {
  if (target === null) return;
  const { host, interaction } = target;
  if (interaction.aiming === slot) {
    interaction.aimAbility(null);
    return;
  }
  const id = slot === 1 ? host.sim.config.abilities.slot1 : host.sim.config.abilities.slot2;
  const why =
    id === null
      ? 'noAbility'
      : (host.sim.state.abilityCooldownTicks[slot - 1] ?? 0) > 0
        ? 'abilityOnCooldown'
        : null;
  if (why !== null) {
    showNotice(rejectText(why) ?? '');
    return;
  }
  interaction.aimAbility(slot);
}

/** Esc / right-click: drops the selection, disarms the build slot, and stops aiming. */
export function cancel(): void {
  target?.cancel();
}
