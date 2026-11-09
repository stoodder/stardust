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
import {
  emptyTileFacts,
  fillTileFacts,
  isGroundPathTile,
  slotAimsAtPath,
} from '../render/input/tileFacts.ts';
import { costFor, isBuildableTile, type Command } from '../sim/index.ts';
import { hud, speed as speedSignal } from '../ui/state.ts';
import { PRIORITY_LABEL } from '../ui/hud/words.ts';
import type { Host } from './host.ts';
import { announce, showNotice } from './hud.ts';
import { lockedText, rejectText } from './hudText.ts';
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
  const def = host.sim.config.content.towers[tower];
  // What the sim charges: tier 1 after `towerCost` modifiers (D037).
  const cost =
    def === undefined ? Infinity : costFor(host.sim.config.modifiers, tower, def.tiers[0].cost);
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

/**
 * The tower panel's tier-4 choice (T202d): specializes the selected tower into spec `choice`. The
 * sim checks it (locked, not tier 3, can't afford, ...), and a rejection shows as a notice.
 */
export function specializeSelected(choice: 'a' | 'b'): void {
  const uid = target?.interaction.selectedTower ?? 0;
  if (uid !== 0) issue({ type: 'specialize', towerUid: uid, spec: choice });
}

/** S: sells the selected tower. */
export function sellSelected(): void {
  const uid = target?.interaction.selectedTower ?? 0;
  if (uid !== 0) issue({ type: 'sell', towerUid: uid });
}

/** The live tower `uid` in the running battle, or null. */
function liveTower(uid: number) {
  if (target === null || uid === 0) return null;
  const pool = target.host.sim.state.towers;
  for (let i = 0; i < pool.used; i++) {
    const t = pool.items[i]!; // i < used ≤ items.length
    if (t.alive && t.uid === uid) return t;
  }
  return null;
}

/** What H says with no tower selected: how to hold one, and the key that holds them all. */
export const HOLD_NEEDS_TOWER = 'Pick a turret first · Shift+H holds all';

/**
 * H, or the tower panel's toggle: the selected tower holds fire, or fires again (core-loop §2.7).
 * With nothing selected, a notice says how. The sim checks the uid; a rejection shows as a notice.
 */
export function toggleHoldFireSelected(): void {
  if (target === null) return;
  const uid = target.interaction.selectedTower;
  const t = liveTower(uid);
  if (t === null) {
    showNotice(HOLD_NEEDS_TOWER);
    return;
  }
  issue({ type: 'holdFire', target: uid, on: !t.holdFire });
}

/**
 * Shift+H, or the HUD's Hold fire (all) button: the master switch. On, every tower holds (and
 * towers built while it's on start holding); off, every tower fires again, ones held one by one
 * included (D041).
 */
export function toggleHoldFireAll(): void {
  if (target === null) return;
  issue({ type: 'holdFire', target: 'all', on: !target.host.sim.state.holdFireAll });
}

/** The tower panel's Spare runners toggle (from A2M1; hidden, and a no-op, until it unlocks). */
export function toggleSpareRunnersSelected(): void {
  if (target === null || !hud.spareRunnersOpen.value) return;
  const uid = target.interaction.selectedTower;
  const t = liveTower(uid);
  if (t !== null) issue({ type: 'spareRunners', target: uid, on: !t.spareRunners });
}

/** Alt+H, or the HUD's Spare runners (all) button: a master switch like Hold fire's. */
export function toggleSpareRunnersAll(): void {
  if (target === null || !hud.spareRunnersOpen.value) return;
  issue({ type: 'spareRunners', target: 'all', on: !target.host.sim.state.spareRunnersAll });
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
  const mode = nextPriority(sel.priority);
  issue({ type: 'targeting', towerUid: sel.uid, mode });
  announce(`Targeting: ${PRIORITY_LABEL[mode]}.`);
}

/** W: starts wave 1, or calls the next wave early during a countdown (core-loop §2.4). */
export function callWave(): void {
  issue({ type: 'callWave' });
}

/**
 * An ability slot (HUD click, Q for slot 1, or E for slot 2): starts aiming it, so the next click
 * on a tile fires it there (a stretch of path for Suppressing Fire), or stops aiming if it's
 * already aimed. An empty, absent, or recharging slot doesn't aim; a notice says why. Aiming works
 * while paused (the ability fires when play resumes, core-loop §3.1).
 */
export function pressAbility(slot: 1 | 2): void {
  if (target === null) return;
  const { host, interaction } = target;
  if (interaction.aiming === slot) {
    interaction.aimAbility(null);
    return;
  }
  const a = host.sim.config.abilities;
  const id = slot === 1 ? a.slot1 : a.slot2State === 'present' ? a.slot2 : null;
  if (id === null) {
    // An absent companion's slot is dark and says nothing (core-loop §3.1).
    if (slot === 1 || a.slot2State === 'none') showNotice(rejectText('noAbility') ?? '');
    return;
  }
  if ((host.sim.state.abilityCooldownTicks[slot - 1] ?? 0) > 0) {
    showNotice(cooldownText(slot, host.sim.config.content.abilities[id]?.name ?? null));
    return;
  }
  interaction.aimAbility(slot);
  // A showing tile cursor snaps at once to the nearest tile the aim can land on (D059: E from a
  // pad jumps to the path), so Enter fires without an arrow press first.
  const isTarget = cursorTargets(target);
  if (interaction.cursor >= 0 && !isTarget(interaction.cursor)) {
    const map = host.sim.map;
    const at = cursorStart(map.cols, map.rows, interaction.cursor, isTarget);
    if (at >= 0) interaction.setCursor(at);
  }
}

/**
 * What a recharging slot says: the uplink for slot 1 (the Technician's Orbital Strike), the
 * ability by name for slot 2 ("Suppressing Fire recharging").
 */
export function cooldownText(slot: 1 | 2, name: string | null): string {
  if (slot === 1 || name === null) return rejectText('abilityOnCooldown') ?? '';
  return `${name} recharging`;
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
 * The tiles the keyboard cursor lands on: while an ability is aimed, every tile (a strike lands
 * on paths), or only the ground-route tiles for one that targets the path (Suppressing Fire);
 * else the buildable tiles (pads, high ground, power nodes, so every tower too).
 */
function cursorTargets(t: CommandTarget): (index: number) => boolean {
  const { sim } = t.host;
  const tiles = sim.map.tiles;
  const aiming = t.interaction.aiming;
  if (aiming !== null) {
    if (slotAimsAtPath(sim, aiming)) return (i) => isGroundPathTile(sim.map, i);
    return () => true;
  }
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
  // The cursor sits on a tile it can't land on now (aiming a path ability from a pad): it jumps
  // to the nearest one it can.
  if (interaction.cursor >= 0 && !isTarget(interaction.cursor)) {
    const at = cursorStart(map.cols, map.rows, interaction.cursor, isTarget);
    if (at >= 0) interaction.setCursor(at);
    return;
  }
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
  const onPath = slotAimsAtPath(host.sim, interaction.aiming);
  const intent = resolveClick(facts, 'left', interaction.armed, interaction.aiming, onPath);
  applyIntent(intent, interaction, {
    issue,
    onCantBuild: () => showNotice(rejectText('notBuildable') ?? ''),
  });
}
