// The one door for player actions (architecture.md § UI: DOM overlay): the HUD (T106), keyboard
// hotkeys (keys.ts), and the test hooks act through these functions, never on the sim directly.
// Sim commands go through the current battle's host; interaction changes (selection, the armed
// build slot, the aimed ability) go to the battle's BattleInteraction, which the scene and the HUD
// both read.
import type { IdSpace, TargetPriority } from '../content/types.ts';
import { applyIntent } from '../render/input/apply.ts';
import type { BattleInteraction } from '../render/input/BattleInteraction.ts';
import { cursorStart, cursorStep, type CursorDir } from '../render/input/cursor.ts';
import { resolveClick } from '../render/input/intents.ts';
import { emptyTileFacts, fillTileFacts } from '../render/input/tileFacts.ts';
import { isBuildableTile, type Command } from '../sim/index.ts';
import { hud, speed as speedSignal } from '../ui/state.ts';
import type { Host } from './host.ts';
import { lockedText, rejectText, showNotice } from './hud.ts';
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
  if (state.lockedTowers.includes(tower)) {
    const slot = hud.slots.value[index];
    showNotice(slot === undefined ? (rejectText('towerLocked') ?? '') : lockedText(slot));
    return;
  }
  if (state.credits < cost) {
    showNotice(rejectText('cantAfford') ?? '');
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

/** Closes the map's briefing (its button, Enter, or Esc); game hotkeys come back on. */
export function dismissBriefing(): void {
  hud.briefing.value = null;
}

/**
 * Esc / right-click: drops the selection, disarms the build slot, and stops aiming. With none of
 * those to drop, Esc hides the keyboard cursor (it remembers its tile).
 */
export function cancel(): void {
  if (target === null) return;
  const i = target.interaction;
  if (i.selectedTower === 0 && i.armed === null && i.aiming === null) i.hideCursor();
  else target.cancel();
}

/**
 * The tiles the keyboard cursor lands on: every tile while an ability is aimed (a strike lands
 * on paths), else the buildable tiles (pads, high ground, power nodes, so every tower too).
 */
function cursorTargets(t: CommandTarget): (index: number) => boolean {
  const tiles = t.host.sim.map.tiles;
  if (t.interaction.aiming !== null) return () => true;
  return (i) => {
    const tile = tiles[i];
    return tile !== undefined && isBuildableTile(tile);
  };
}

/** The tile index of the tower `uid`, or −1. */
function towerTile(t: CommandTarget, uid: number): number {
  if (uid === 0) return -1;
  const { sim } = t.host;
  const pool = sim.state.towers;
  for (let i = 0; i < pool.used; i++) {
    const tw = pool.items[i]!; // i < used ≤ items.length
    if (tw.alive && tw.uid === uid) return tw.row * sim.map.cols + tw.col;
  }
  return -1;
}

/**
 * An arrow key (T126): the first press shows the keyboard cursor (on the selected tower, else on
 * its last tile, else on the target nearest the map's middle); later presses move it to the
 * nearest target that way (render/input/cursor.ts has the rule).
 */
export function moveCursor(dir: CursorDir): void {
  if (target === null) return;
  const { interaction } = target;
  const map = target.host.sim.map;
  const isTarget = cursorTargets(target);
  if (interaction.cursor < 0) {
    const sel = towerTile(target, interaction.selectedTower);
    const at = cursorStart(map.cols, map.rows, sel >= 0 ? sel : interaction.cursorLast, isTarget);
    if (at >= 0) interaction.setCursor(at);
    return;
  }
  const from = interaction.cursor;
  const move = cursorStep(
    map.cols,
    map.cols * map.rows,
    from,
    dir,
    isTarget,
    interaction.cursorNav,
  );
  interaction.setCursor(move.index, { axis: move.axis, anchor: move.anchor });
}

const cursorFacts = emptyTileFacts();

/**
 * Enter on the playfield (T126): acts on the cursor's tile as a click would (fires an aimed
 * ability there, selects a tower, builds the armed tower on a free pad). No-op while it's hidden.
 */
export function pressCursor(): void {
  if (target === null) return;
  const { host, interaction } = target;
  if (interaction.cursor < 0) return;
  const facts = fillTileFacts(host.sim, interaction.cursor, cursorFacts);
  applyIntent(resolveClick(facts, 'left', interaction.armed, interaction.aiming), interaction, {
    issue,
    onCantBuild: () => showNotice(rejectText('notBuildable') ?? ''),
  });
}
