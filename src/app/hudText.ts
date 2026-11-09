// The HUD's words (T225 split from app/hud.ts): display names, the tower panel's stat, delta, and
// bonus lines, ability descriptions, the cursor's announcement, and the notices a rejected command
// or a Hold fire change gives. Pure text from content and sim values; no signals.
import { CAMPAIGN_PLAN } from '../content/campaign.ts';
import type { CompiledAbilityDef, CompiledLinkDef, CompiledTier } from '../content/compiled.ts';
import { STATUS_BITS } from '../content/rules.ts';
import { TOWERS } from '../content/towers/index.ts';
import { SYSTEM_UNLOCKS } from '../meta/index.ts';
import type { IdSpace, MeterLabel, TileChar } from '../content/types.ts';
import { TICK_HZ } from '../shared/time.ts';
import { assertNever, type DeepReadonly } from '../shared/types.ts';
import type { InputRefusal } from '../render/input/BattleInteraction.ts';
import { clickableAt, peekerTile } from '../render/input/tileFacts.ts';
import {
  isBuildableTile,
  liveTileAt,
  tileAndLinkRules,
  wreckageStatus,
  type AbilityStats,
  type RejectReason,
  type Sim,
  type SimConfig,
  type TierStatDelta,
  type Tower,
  type TowerStatLine,
} from '../sim/index.ts';
import type { BuildSlotView } from '../ui/state.ts';

const TOWER_NAMES: Readonly<Record<string, { readonly name: string } | undefined>> = TOWERS;

/**
 * A tower's display name (T119): its content `name` ("Rivet"), or, for an id outside the live
 * registry (the dev battle's), the id as a display name.
 */
export function towerName(id: string): string {
  return (Object.hasOwn(TOWER_NAMES, id) ? TOWER_NAMES[id]?.name : undefined) ?? displayName(id);
}

/** A content id as a display name: `dev_` dropped, words capitalized (`rivet` → `Rivet`). */
export function displayName(id: string): string {
  return id
    .replace(/^dev_/, '')
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

/** The meter's HUD label (core-loop §2.9). */
export function meterLabelText(label: MeterLabel | null): string {
  switch (label) {
    case 'evacuated':
      return 'Evacuated';
    case 'sheltered':
      return 'Sheltered';
    case 'voices':
      return 'Voices';
    case null:
    case 'integrity':
      return 'Core';
    default:
      return assertNever(label);
  }
}

/** What a locked slot says (D026): "Thumper ships at wave 3", or "Thumper locked" with no wave. */
export function lockedText(slot: BuildSlotView): string {
  return slot.unlockWave === null
    ? `${slot.label} locked`
    : `${slot.label} ships at wave ${slot.unlockWave}`;
}

/** A number for a stat line: whole, or up to two decimals (2, 0.8, 2.5). */
function statNum(n: number): string {
  return String(Math.round(n * 100) / 100);
}

/** A tower's stats as the tower panel shows them (sim `towerStats`), e.g. "8 dmg · 2/s · range 3". */
export function statLineText(
  s: TowerStatLine,
  tier: DeepReadonly<CompiledTier> | null = null,
): string {
  if (s.kind === null) return supportText(tier);
  const parts = [`${statNum(s.damage)} dmg`, `${statNum(s.ratePerSec)}/s`];
  parts.push(`range ${statNum(s.rangeTiles)}`);
  if (s.splashTiles > 0) parts.push(`splash ${statNum(s.splashTiles)}`);
  if (tier !== null) parts.push(...traitTexts(tier));
  return parts.join(' · ');
}

/** The words for an aura's stat ("+20% range nearby"). */
const AURA_STAT_TEXT: Readonly<Record<string, string>> = {
  damage: 'damage',
  rate: 'fire rate',
  range: 'range',
};

/**
 * A support tier's line (T406; T431 may reword it): its detection and its auras as authored, e.g.
 * "detect 3.5 · linger 2 s · +20% range nearby", or "Support" with neither.
 */
function supportText(tier: DeepReadonly<CompiledTier> | null): string {
  const parts: string[] = [];
  const d = tier?.detect ?? null;
  if (d !== null) {
    parts.push(`detect ${statNum(d.radiusTiles)}`);
    if (d.lingerTicks > 0) parts.push(`linger ${statNum(d.lingerTicks / TICK_HZ)} s`);
    if (d.revealedDamagePct > 0) parts.push(`revealed ${pctText(d.revealedDamagePct)} dmg`);
  }
  for (const a of tier?.auras ?? []) {
    parts.push(`${pctText(a.pct)} ${AURA_STAT_TEXT[a.stat] ?? a.stat} nearby`);
  }
  return parts.length === 0 ? 'Support' : parts.join(' · ');
}

/**
 * What's special about a tier's attack, beyond its numbers (D059: the panel's stat line and the
 * spec cards say the same): "+4 bomblets", "ignores armor", "1 s spin-up", "2 Corroded".
 */
function traitTexts(tier: DeepReadonly<CompiledTier>): string[] {
  const parts: string[] = [];
  const a = tier.attack;
  if (a !== null) {
    if (a.kind === 'lobbed' && a.bomblets !== null) parts.push(`+${a.bomblets.count} bomblets`);
    if (a.ignoresArmor) parts.push('ignores armor');
    if (a.spinUpTicks > 0) parts.push(`${statNum(a.spinUpTicks / TICK_HZ)} s spin-up`);
  }
  for (const e of tier.effects) {
    if (e.status === 'corroded') parts.push(`${e.stacks} Corroded`);
  }
  return parts;
}

/** A signed stat change: "+3", "-0.5". */
function signed(n: number): string {
  return n > 0 ? `+${statNum(n)}` : statNum(n);
}

/** What the next upgrade changes, e.g. "+3 dmg · +0.5 range", or null at the top (or no change). */
export function deltaText(d: TierStatDelta | null): string | null {
  if (d === null) return null;
  const parts: string[] = [];
  if (d.damage !== 0) parts.push(`${signed(d.damage)} dmg`);
  if (d.ratePerSec !== 0) parts.push(`${signed(d.ratePerSec)}/s`);
  if (d.rangeTiles !== 0) parts.push(`${signed(d.rangeTiles)} range`);
  if (d.splashTiles !== 0) parts.push(`${signed(d.splashTiles)} splash`);
  if (d.armorPierce !== 0) parts.push(`${signed(d.armorPierce)} pierce`);
  return parts.length === 0 ? null : parts.join(' · ');
}

/**
 * An ability's one-line description (D026) with its real numbers (`stats`: abilityStats, so Mk II's
 * radius and Rapport's or Coolant's cooldown show), e.g. "200 damage in a 1.5-tile radius after
 * 1 s. Recharges 45 s." or "Slows 3 tiles of path 50% and deals 20 damage/s for 5 s. Recharges
 * 50 s." Without `stats`, the content's own numbers.
 */
export function abilityDescription(def: CompiledAbilityDef, stats?: AbilityStats): string {
  const e = def.effect;
  const cd = statNum((stats?.cooldownTicks ?? def.cooldownTicks) / TICK_HZ);
  if (e.kind === 'segment') {
    const slow = statNum(Math.round(e.slowPct * 100));
    const sec = statNum(e.durationTicks / TICK_HZ);
    const len = 2 * e.reachTiles + 1;
    return `Slows ${len} tiles of path ${slow}% and deals ${statNum(e.damagePerSec)} damage/s for ${sec} s. Recharges ${cd} s.`;
  }
  // M3's untargeted effects (T300a; T304d runs them, and T312c may reword these lines).
  if (e.kind === 'slowAll') {
    const slow = statNum(Math.round(e.slowPct * 100));
    const boss = statNum(Math.round(e.bossSlowPct * 100));
    const sec = statNum(e.durationTicks / TICK_HZ);
    return `Slows every enemy ${slow}% (bosses ${boss}%) for ${sec} s. Recharges ${cd} s.`;
  }
  if (e.kind === 'discount') {
    const pct = statNum(Math.round(e.pct * 100));
    return `Your next ${e.charges} builds or upgrades cost ${pct}% less. Once per ${def.cooldownWaves} waves.`;
  }
  // Scanner Sweep (T400a seam; T406 runs it, and T431 may reword the line).
  if (e.kind === 'reveal') {
    const radius = statNum(stats?.radiusTiles ?? e.radiusTiles);
    const sec = statNum(e.durationTicks / TICK_HZ);
    return `Reveals cloaked enemies in a ${radius}-tile radius for ${sec} s. Recharges ${cd} s.`;
  }
  const delay = statNum(e.delayTicks / TICK_HZ);
  const radius = statNum(stats?.radiusTiles ?? e.radiusTiles);
  return `${statNum(e.damage)} damage in a ${radius}-tile radius after ${delay} s. Recharges ${cd} s.`;
}

/** "+10%" from a fraction (0.1), or "+0.3" for a flat amount. */
function pctText(frac: number): string {
  return `+${statNum(Math.round(frac * 1000) / 10)}%`;
}

/** A status mask's names for a conditional bonus, e.g. "Chilled". */
function statusNames(mask: number): string {
  return STATUS_BITS.filter((_, i) => (mask & (1 << i)) !== 0)
    .map((st) => displayName(st))
    .join('/');
}

/**
 * Where a tower's bonuses come from, one entry per source (the panel's lines; D037's stacking):
 * its tile ("+25% range (high ground)", "+20% rate (power node)") and each active link
 * ("+10% rate (Crossfire)", "+20% dmg vs Chilled (Sitting Ducks)"), after the run's `tileBonus`
 * and `linkBonus` modifiers. Static `towerStat` modifiers show only in the stat line.
 */
export function bonusTexts(
  tile: TileChar | undefined,
  tower: Pick<Tower, 'linkMask'> & { readonly def: { readonly id: string } | null },
  hasAttack: boolean,
  links: readonly CompiledLinkDef<IdSpace>[],
  modifiers: SimConfig<IdSpace>['modifiers'],
): string[] {
  const rules = tileAndLinkRules(modifiers);
  const out: string[] = [];
  if (tile === '^') out.push(`${pctText(rules.highGroundRangePct)} range (high ground)`);
  else if (tile === '+') {
    out.push(
      hasAttack
        ? `${pctText(rules.powerNodeRatePct)} rate (power node)`
        : `${pctText(rules.powerNodeAuraPct)} aura (power node)`,
    );
  }
  if (tower.def === null || tower.linkMask === 0) return out;
  for (const link of links) {
    if ((tower.linkMask & link.bit) === 0) continue;
    const p = link.partners[0].tower === tower.def.id ? link.partners[0] : link.partners[1];
    const k = rules.linkMult;
    const parts: string[] = [];
    if (p.pctDamage !== 0) parts.push(`${pctText(p.pctDamage * k)} dmg`);
    if (p.vsStatusMask !== 0) {
      parts.push(`${pctText(p.vsStatusPct * k)} dmg vs ${statusNames(p.vsStatusMask)}`);
    }
    if (p.pctRate !== 0) parts.push(`${pctText(p.pctRate * k)} rate`);
    if (p.pctRange !== 0) parts.push(`${pctText(p.pctRange * k)} range`);
    if (p.flatDamage !== 0) parts.push(`${signed(p.flatDamage * k)} dmg`);
    if (p.flatRate !== 0) parts.push(`${signed(p.flatRate * k)}/s`);
    if (p.flatRange !== 0) parts.push(`${signed(p.flatRange * k)} range`);
    for (const part of parts) out.push(`${part} (${link.name})`);
  }
  return out;
}

/**
 * A spec card's description (D059: one format for every card, and the same as the panel's stat
 * line once it's built): its numbers, then what's special about it, e.g.
 * "9 dmg · 7.5/s · range 3 · 1 s spin-up" or "120 dmg · 0.5/s · range 6 · ignores armor".
 */
export function specDescription(spec: TowerStatLine, tier: DeepReadonly<CompiledTier>): string {
  return statLineText(spec, tier);
}

/**
 * What a locked tier-4 choice says (T202d): the Engineering pane opens after Shift n
 * (`SYSTEM_UNLOCKS`), or, once it's open, that the pair is bought there.
 */
export function specLockText(engineeringOpen: boolean): string {
  if (engineeringOpen) return 'Unlock in Engineering';
  const n = CAMPAIGN_PLAN.findIndex((m) => m.id === SYSTEM_UNLOCKS.engineering) + 1;
  return `Engineering unlocks after Shift ${n}`;
}

/** "rivet T3" (a counter-answer label) → "Rivet T3"; "thumper [Bunker Buster]" → "Thumper [Bunker Buster]". */
export function answerLabel(label: string): string {
  const [tower = '', ...rest] = label.split(' ');
  return [towerName(tower), ...rest].join(' ');
}

/** What each tile type is called in the cursor's announcement. */
const TILE_NAMES: Readonly<Record<TileChar, string>> = {
  '#': 'Path',
  o: 'Pad',
  '^': 'High ground',
  '+': 'Power node',
  x: 'Wreckage',
  '.': 'Ground',
  S: 'Spawn',
  C: 'Core',
};

/**
 * What the keyboard tile cursor on tile `index` announces (T126; the HUD's aria-live region):
 * the tile (columns and rows counted from 1), what stands on it, and what Enter does there.
 * `aimingLabel` is the aimed ability's name, or null. Null while the cursor is hidden. A clickable
 * world object reads as its map's name for it (`clickables`, T409); the Act I Peeker's rock as a
 * rock (T322).
 */
export function cursorText(
  sim: Sim<IdSpace>,
  index: number,
  armed: string | null,
  aimingLabel: string | null,
): string | null {
  const map = sim.map;
  if (index < 0 || map.tiles[index] === undefined) return null;
  // A cleared wreck reads as what it uncovered (D076).
  const tile = liveTileAt(map, sim.state.wreckage, index);
  const col = index % map.cols;
  const where = `column ${col + 1}, row ${(index - col) / map.cols + 1}`;
  const slot = sim.state.towerAtTile[index] ?? -1;
  const tower = slot < 0 ? null : (sim.state.towers.items[slot] ?? null);
  const what =
    tower !== null && tower.alive && tower.def !== null
      ? `${tower.def.name} tier ${tower.tier}, ${where}`
      : `${TILE_NAMES[tile]}, ${where}${isBuildableTile(tile) ? ', empty' : ''}`;
  if (aimingLabel !== null) return `${what}. Enter fires ${aimingLabel} here.`;
  if (tower !== null && tower.alive) return `${what}. Enter selects it.`;
  const clickable = clickableAt(sim, index);
  if (clickable !== null) {
    const name = Object.hasOwn(map.clickables, clickable) ? map.clickables[clickable]?.name : null;
    return `${name ?? 'Something'}, ${where}. Enter reaches for it.`;
  }
  if (index === peekerTile(map)) {
    return armed === null ? `A rock, ${where}. Enter pokes it.` : `A rock, ${where}.`;
  }
  if (tile === 'x' && armed === null) {
    const status = wreckageStatus(map, sim.state.wreckage, col, (index - col) / map.cols);
    return status === 'wreckage'
      ? `${what}. Enter sends the salvage drone.`
      : `${what}, the salvage drone's on it.`;
  }
  if (armed !== null && isBuildableTile(tile))
    return `${what}. Enter builds ${sim.config.content.towers[armed]?.name ?? towerName(armed)}.`;
  return `${what}.`;
}

/** Notice text for a rejected command, or null for rejections the player needn't hear about. */
export function rejectText(reason: RejectReason): string | null {
  switch (reason) {
    case 'cantAfford':
      return 'Not enough credits';
    case 'towerLocked':
      return 'Tower locked';
    case 'maxTier':
      return 'Max tier';
    case 'tileOccupied':
    case 'notBuildable':
    case 'invalidTile':
      return "Can't build there";
    case 'noTargeting':
      return 'No targeting on this tower';
    case 'notImplemented':
      return 'Not online yet';
    case 'specLocked':
      return 'Specialization locked';
    case 'noSpecs':
      return 'No specializations';
    case 'needsTier3':
      return 'Needs tier 3';
    case 'alreadySpecialized':
      return 'Already specialized';
    case 'waveInProgress':
      return 'Wave in progress';
    case 'noWavesLeft':
      return 'No waves left';
    case 'noAbility':
      return 'No ability equipped';
    case 'abilityOnCooldown':
      return 'Uplink recharging';
    case 'invalidTarget':
      return "Can't target there";
    // The Quiet Wave can't be called early (D097): the HUD hides Call, so only W reaches this.
    case 'quietWave':
      return 'This one comes in its own time';
    // Clickable world objects (T409): only a click that races the fallback, or a stale one.
    case 'notClickable':
      return 'Out of reach now';
    case 'mapEnded':
    case 'notInLoadout':
    case 'noSuchTower':
      return null;
    default:
      return assertNever(reason);
  }
}

/** An armed click on a wreck: how to send the salvage drone instead (style-guide § 2). */
export const CLEAR_FIRST_TEXT = 'Click it (no tower armed) to send the drone';

/** Notice text for an input refused before it reached the sim (render/input/apply.ts). */
export function refusalText(reason: InputRefusal): string {
  switch (reason) {
    case 'invalidTarget':
      return rejectText('invalidTarget') ?? '';
    case 'clearFirst':
      // R4: a mouse player learns how to clear it (style-guide § 2).
      return CLEAR_FIRST_TEXT;
    case 'alreadyQueued':
      return 'Drone already on it';
    default:
      return assertNever(reason);
  }
}

/** What a Hold fire change says (D059): for the one tower (by name) or for all of them. */
export function holdFireText(on: boolean, tower: string | null): string {
  if (tower === null) return on ? 'All turrets holding fire.' : 'All turrets firing again.';
  return on ? `${tower} holding fire.` : `${tower} firing again.`;
}
