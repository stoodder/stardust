// The HUD's words (T225 split from app/hud.ts): display names, the tower panel's stat, delta, and
// bonus lines, ability descriptions, the cursor's announcement, and the notices a rejected command
// or a Hold fire change gives. Pure text from content and sim values; no signals.
import type { CompiledAbilityDef, CompiledLinkDef, CompiledTier } from '../content/compiled.ts';
import { STATUS_BITS } from '../content/rules.ts';
import { TOWERS } from '../content/towers/index.ts';
import { mapMilestone, SYSTEM_UNLOCKS } from '../meta/index.ts';
import type { IdSpace, MeterLabel, TileChar } from '../content/types.ts';
import { TICK_HZ } from '../shared/time.ts';
import { assertNever, type DeepReadonly } from '../shared/types.ts';
import type { InputRefusal } from '../render/input/BattleInteraction.ts';
import { clickableAt, peekerTile } from '../render/input/tileFacts.ts';
import { incomingAt, incomingWave } from '../render/views/spawnFlags.ts';
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

/**
 * What a tower's card says beside its role where its name could mislead (style-guide § 2): the
 * Seer's Lantern sees in the dark but doesn't light it (D138; the Prism lights while it beams).
 */
const TOWER_CARD_NOTES: Readonly<Record<string, string>> = {
  lantern: "Doesn't light the dark",
};

/** A tower's role as its cards show it (the loadout, the shelves): with its note, if it has one. */
export function towerRoleText(id: string, role: string): string {
  const note = Object.hasOwn(TOWER_CARD_NOTES, id) ? TOWER_CARD_NOTES[id] : undefined;
  return note === undefined ? role : `${role}. ${note}`;
}

/** A content id as a display name: `dev_` dropped, words capitalized (`rivet` → `Rivet`). */
export function displayName(id: string): string {
  return id
    .replace(/^dev_/, '')
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

/**
 * A threat's name where it isn't its id in words (campaign.md § 4.8's threat column): the Motes'
 * `clustered` trait is "Hollow clusters"; the auras read in sentence case ("Shield aura", T531).
 */
const THREAT_LABELS: Readonly<Record<string, string>> = {
  clustered: 'Hollow clusters',
  shield_aura: 'Shield aura',
  healer_aura: 'Healer aura',
  haste_aura: 'Haste aura',
};

/** A threat trait or tell as the briefing's strip names it: "Armored", "Hollow clusters". */
export function threatLabel(id: string): string {
  return Object.hasOwn(THREAT_LABELS, id) ? (THREAT_LABELS[id] ?? id) : displayName(id);
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

/**
 * A beam's damage per second as it lands (T531): the tier's `damage` is per second at the authored
 * tick (`beamTickSec`), and the rate counts beam ticks, so a rate bonus (more ticks, each the same
 * size) raises it: damage × ticks/s × beamTickSec. Never damage × rate (that reads 4× too high).
 */
export function beamDps(s: Pick<TowerStatLine, 'damage' | 'ratePerSec'>, tickSec: number): number {
  return s.damage * s.ratePerSec * tickSec;
}

/**
 * A tower's stats as the tower panel shows them (sim `towerStats`), e.g. "8 dmg · 2/s · range 3";
 * a beam's as its damage per second ("12 dmg/s · range 3 · ramp ×4 in 6 s").
 */
export function statLineText(
  s: TowerStatLine,
  tier: DeepReadonly<CompiledTier> | null = null,
  from: DeepReadonly<CompiledTier> | null = null,
): string {
  if (s.kind === null) return supportText(tier);
  const a = tier?.attack ?? null;
  const parts =
    a !== null && a.kind === 'beam'
      ? [`${statNum(beamDps(s, a.beamTickSec))} dmg/s`]
      : [`${statNum(s.damage)} dmg`, `${statNum(s.ratePerSec)}/s`];
  parts.push(`range ${statNum(s.rangeTiles)}`);
  if (s.splashTiles > 0) parts.push(`splash ${statNum(s.splashTiles)}`);
  if (tier !== null) parts.push(...traitTexts(tier, from));
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
 * spec cards say the same): "+4 bomblets", "ignores armor", "1 s spin-up", "2 Corroded"; and
 * T407b's, so the Skyhook's and Zapcoil's spec cards read apart from tier 3: "chains to 8",
 * "4 homing", "4 s charge", "50% splash 1", "pierce 4"; and M5's (T531), so the Prism's,
 * Mindspike's and Lantern's do too: "3 beams", "ramp ×4 in 6 s", "echo 50%", "1.2 tiles",
 * "Unnerves 1.5 s", "Mark +35%", "no evading", "detect 3.5", "Marks all in 3.5". A spec card
 * also says what its choice gives up against `from`, the tier it replaces (D138): Truthlight's
 * "1 beam" against tier 3's two.
 */
export function traitTexts(
  tier: DeepReadonly<CompiledTier>,
  from: DeepReadonly<CompiledTier> | null = null,
): string[] {
  const parts: string[] = [];
  const a = tier.attack;
  if (a !== null) {
    if (a.kind === 'beam') {
      const was = from?.attack?.kind === 'beam' ? from.attack.beams : 1;
      if (a.beams > 1) parts.push(`${a.beams} beams`);
      else if (was > 1) parts.push('1 beam');
      if (a.rampCap > 1 && a.rampPctPerTick > 0) parts.push(rampText(a.rampCap, a.rampPctPerTick));
    }
    if (a.kind === 'hitscan' && a.echo !== null) {
      parts.push(`echo ${statNum(Math.round(a.echo.pct * 100))}%`);
      parts.push(`${statNum(a.echo.radiusTiles)} tiles`);
    }
    if (a.kind === 'lobbed' && a.bomblets !== null) parts.push(`+${a.bomblets.count} bomblets`);
    if (a.kind === 'chain') parts.push(`chains to ${a.jumps + 1}`);
    if (a.kind === 'projectile' && a.volley > 1) {
      parts.push(`${a.volley} ${a.homing ? 'homing' : 'shots'}`);
    } else if (a.kind === 'projectile' && a.homing) {
      parts.push('homing');
    }
    if (a.kind === 'charge') {
      parts.push(`${statNum(a.chargeTicks / TICK_HZ)} s charge`);
      parts.push(`${statNum(Math.round(a.splashPct * 100))}% splash ${statNum(a.splashTiles)}`);
    }
    if (a.ignoresArmor) parts.push('ignores armor');
    else if (a.armorPierce > 0) parts.push(`pierce ${a.armorPierce}`);
    if (a.spinUpTicks > 0) parts.push(`${statNum(a.spinUpTicks / TICK_HZ)} s spin-up`);
  }
  for (const e of tier.effects) {
    if (e.status === 'corroded') parts.push(`${e.stacks} Corroded`);
    if (e.status === 'unnerved') parts.push(`Unnerves ${statNum(e.durationTicks / TICK_HZ)} s`);
    if (e.status === 'marked') {
      parts.push(`Mark ${pctText(e.pct)}`);
      if (e.noEvade) parts.push('no evading');
    }
  }
  // An attacking tier that also detects (the Lantern): its sight, then an area Mark (All-Seeing).
  if (a !== null && tier.detect !== null) parts.push(`detect ${statNum(tier.detect.radiusTiles)}`);
  if (tier.markArea !== null) {
    parts.push(`Marks all in ${statNum(tier.markArea.radiusTiles)} ${pctText(tier.markArea.pct)}`);
  }
  return parts;
}

/**
 * A beam's ramp (T531; sim/attacks/beam.ts): its cap and how long a held target takes to reach it,
 * e.g. "ramp ×4 in 6 s" (linear: + `rampPctPerTick` a tick from ×1).
 */
export function rampText(cap: number, pctPerTick: number): string {
  const sec = (cap - 1) / (pctPerTick * TICK_HZ);
  return `ramp ×${statNum(cap)} in ${statNum(Math.round(sec * 10) / 10)} s`;
}

/** A live ramp multiplier as the panel's ramp row shows it: "×2.4". */
export function rampNow(ramp: number): string {
  return `×${(Math.floor(ramp * 10) / 10).toFixed(1)}`;
}

/** A signed stat change: "+3", "-0.5". */
function signed(n: number): string {
  return n > 0 ? `+${statNum(n)}` : statNum(n);
}

/**
 * What the next upgrade changes, e.g. "+3 dmg · +0.5 range", or null at the top (or no change).
 * For a beam (T531) pass its damage-per-second change (`beamDpsDelta`: it reads "+4 dmg/s", in
 * place of the damage and rate), and `extra` adds what the stats don't carry ("ramp ×5").
 */
export function deltaText(
  d: TierStatDelta | null,
  beamDpsDelta: number | null = null,
  extra: readonly string[] = [],
): string | null {
  if (d === null) return null;
  const parts: string[] = [];
  if (beamDpsDelta !== null) {
    if (beamDpsDelta !== 0) parts.push(`${signed(beamDpsDelta)} dmg/s`);
  } else {
    if (d.damage !== 0) parts.push(`${signed(d.damage)} dmg`);
    if (d.ratePerSec !== 0) parts.push(`${signed(d.ratePerSec)}/s`);
  }
  if (d.rangeTiles !== 0) parts.push(`${signed(d.rangeTiles)} range`);
  if (d.splashTiles !== 0) parts.push(`${signed(d.splashTiles)} splash`);
  if (d.armorPierce !== 0) parts.push(`${signed(d.armorPierce)} pierce`);
  parts.push(...extra);
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
  // Stillness (T500a seam; T507 runs it, and T531 may reword the line).
  if (e.kind === 'stasisArea') {
    const radius = statNum(stats?.radiusTiles ?? e.radiusTiles);
    const sec = statNum(e.durationTicks / TICK_HZ);
    return `Freezes enemies in a ${radius}-tile radius for ${sec} s. Recharges ${cd} s.`;
  }
  // Underfoot (T600a seam; T604 runs it, and T631 may reword the line).
  if (e.kind === 'pathTrap') {
    const sec = statNum(e.durationTicks / TICK_HZ);
    const pin = statNum(e.pinTicks / TICK_HZ);
    return `For ${sec} s, each enemy crossing the tile is pinned ${pin} s and takes ${statNum(e.damage)} damage. Hits burrowed. Recharges ${cd} s.`;
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
 * The darkness's line in the tower panel (Sundown, T505; T531), among the bonus lines: an unlit
 * tower's lost range ("-15% range (dark)": the stat line's range already has it), or, while the
 * map is dark at all, a lit tower's "Lit: full range". Nothing on a map in daylight, and nothing
 * for a tower the dark can't dim (`dims` false, the sim's `darkDims`: no attack, as the Lookout and
 * the Crane; or a beam that reaches its detection radius, as the Lantern; D138).
 */
export function darkTexts(darkRangePct: number, lit: boolean, dark: number, dims = true): string[] {
  if (!dims) return [];
  if (darkRangePct > 0) return [`-${statNum(Math.round(darkRangePct * 1000) / 10)}% range (dark)`];
  return dark > 0 && lit ? ['Lit: full range'] : [];
}

/**
 * A spec card's description (D059: one format for every card, and the same as the panel's stat
 * line once it's built): its numbers, then what's special about it, e.g.
 * "9 dmg · 7.5/s · range 3 · 1 s spin-up" or "120 dmg · 0.5/s · range 6 · ignores armor".
 */
export function specDescription(
  spec: TowerStatLine,
  tier: DeepReadonly<CompiledTier>,
  from: DeepReadonly<CompiledTier> | null = null,
): string {
  return statLineText(spec, tier, from);
}

/**
 * What a locked tier-4 choice says (T202d): the map Engineering opens after, named as the base's
 * hints name it (`mapMilestone`, D102's naming rule: "Engineering unlocks after The Audit"), or,
 * once it's open, that the pair is bought there.
 */
export function specLockText(engineeringOpen: boolean): string {
  if (engineeringOpen) return 'Unlock in Engineering';
  // An Act I map, so always named (mapShown); a later one would read "Shift n" until it shows.
  return `Engineering unlocks after ${mapMilestone(SYSTEM_UNLOCKS.engineering)}`;
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
  // An "incoming" flag (T326): Enter starts or calls the wave from here.
  if (armed === null && incomingAt(map, sim.state, index)) {
    const n = incomingWave(map, sim.state);
    return `${what}, incoming flag. Enter ${sim.state.wave === 0 ? 'starts' : 'calls'} wave ${n}.`;
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
    // A `noCall` wave can't be called early (the Quiet Wave, D097; A2M5's W6, D138): the HUD hides
    // Call, so only W reaches this.
    case 'noCall':
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
