// System 4b: links. When `state.linksDirty` says something changed (a build, upgrade,
// specialization, or sell; later a jam), recomputes every tower's bonuses and its synergy links
// (design/towers.md § 4, § 6), emits LinkFormed and LinkBroken, and clears the flag. Every tick
// it also counts link uptime (`stats.linkTicks`). It runs after status and before the towers
// fire. The bonuses summed onto each tower (`flat*`, `pct*`, `vsStatus*`):
// - static `towerStat` modifiers for the tower (or `'*'`);
// - its tile as the run stands (cleared wreckage is the tile under it: a hidden power node pays):
//   high ground +25% range, a power node +20% fire rate (a support tower with no attack gets +20%
//   aura strength instead); `tileBonus` modifiers raise those fractions;
// - each active link type once (both partners built and adjacent, edge or corner), its bonus
//   scaled by `linkBonus` modifiers (Linked Up), plus Conductive's extras (`bonusJumps`, rounded
//   down after scaling, and `linkSoakedTicks`, which doesn't scale);
// - auras from other towers (systems/auras.ts, run last: it reads the links' Choir extras),
//   strongest per aura kind, and the Hum Choir's jam rule (`jamMul`; T607);
// - a link's detection radius (Overwatch, Skywatch: `bonusDetectTiles`, scaled like any link
//   bonus; systems/detection.ts reads it) and its `supportStat` radius tune-up (`detectPct`, so
//   sim/bonuses.ts can cap a detecting tower's reach at what it sees), and its kill credits
//   (Reel It In: `linkKillCredits`, scaled and rounded down like jumps; sim/towerEconomy.ts pays
//   them);
// - Resonance's damage against a raised shield (`vsShieldPct`, scaled like any link bonus; T504;
//   systems/towers.ts `damageOn` reads it);
// - Lightsong's faster beam ramp (`linkRampPct`: the Prism's +30%; attacks/beam.ts reads it) and
//   its stronger Marks (`linkMarkPct`: the Lantern's +5%; systems/status.ts `applyLinkStatuses` and
//   systems/markArea.ts read it), each scaled like any link bonus (T508);
// - the Scuttle Den's (T604; sim/swarmlings.ts reads them): Finders Keepers' extra swarmling
//   (`linkSwarmlings`, scaled and rounded down like jumps), Splash Zone's faster dash
//   (`linkSwarmSpeedPct`) and longer latch (`linkLatchTicks`), each scaled like any link bonus;
// - the Hum Choir's (T607): Harmony's wider auras (`linkAuraRadiusTiles`) and Bounce Chorus's
//   stronger ones (`linkAuraPct`), each scaled like any link bonus (systems/auras.ts reads them),
//   and Harmony's extra hitscan targets (`linkExtraTargets`, scaled and rounded down like jumps;
//   the towers system reads it).
// The caps apply when a stat is read (sim/bonuses.ts), never here. Recomputing allocates a little
// (the new pair list); it runs only when dirty, never per tick.
import type { CompiledContent, CompiledLinkDef } from '../../content/compiled.ts';
import {
  HIGH_GROUND_RANGE_PCT,
  LINK_ADJACENCY_TILES,
  POWER_NODE_AURA_PCT,
  POWER_NODE_RATE_PCT,
} from '../../content/rules.ts';
import type { IdSpace } from '../../content/types.ts';
import type { DeepReadonly } from '../../shared/types.ts';
import type { Modifier } from '../config.ts';
import type { Tower } from '../entities.ts';
import { emit, type SimState } from '../state.ts';
import type { TickContext } from '../tick.ts';
import { addBonus, applyAuras } from './auras.ts';
import { supportPct } from './detection.ts';
import { liveTileAt } from './wreckage.ts';

export function links(state: SimState, ctx: TickContext): void {
  if (state.linksDirty) {
    recompute(state, ctx);
    state.linksDirty = false;
  }
  countUptime(state, ctx.content.links);
}

/** The run's link and tile fractions after modifiers. */
interface TileAndLinkRules {
  /** Every link bonus × this (1 + Σ `linkBonus` pct). */
  linkMult: number;
  highGroundRangePct: number;
  powerNodeRatePct: number;
  powerNodeAuraPct: number;
}

/** Folds the `linkBonus` and `tileBonus` modifiers into the rule fractions (content/rules.ts). */
export function tileAndLinkRules(modifiers: readonly Modifier<IdSpace>[]): TileAndLinkRules {
  const out = {
    linkMult: 1,
    highGroundRangePct: HIGH_GROUND_RANGE_PCT,
    powerNodeRatePct: POWER_NODE_RATE_PCT,
    powerNodeAuraPct: POWER_NODE_AURA_PCT,
  };
  for (const m of modifiers) {
    if (m.kind === 'linkBonus') out.linkMult += m.pct;
    else if (m.kind === 'tileBonus') {
      if (m.tile === 'highGround') out.highGroundRangePct += m.flat;
      else {
        out.powerNodeRatePct += m.flat;
        out.powerNodeAuraPct += m.flat;
      }
    }
  }
  return out;
}

function recompute(state: SimState, ctx: TickContext): void {
  const pool = state.towers;
  const { map, content } = ctx;
  const modifiers = ctx.config.modifiers;
  const rules = tileAndLinkRules(modifiers);

  // Static modifiers and tiles.
  for (let i = 0; i < pool.used; i++) {
    const t = pool.items[i]!; // i < used ≤ items.length
    clearBonuses(t);
    if (!t.alive || t.def === null || t.tierDef === null) continue;
    t.detectPct = supportPct(modifiers, t.def.id, 'radius');
    for (const m of modifiers) {
      if (m.kind !== 'towerStat' || (m.tower !== '*' && m.tower !== t.def.id)) continue;
      addBonus(t, m.stat, m.flat ?? 0, m.pct ?? 0);
    }
    const tile = liveTileAt(map, state.wreckage, t.row * map.cols + t.col); // cleared wreckage too
    if (tile === '^') t.pctRange += rules.highGroundRangePct;
    else if (tile === '+' && t.tierDef.attack !== null) t.pctRate += rules.powerNodeRatePct;
  }

  // Links: every adjacent pair whose types a link names, each pair once (lower uid first).
  const pairs: [number, number, number][] = [];
  for (let i = 0; i < pool.used; i++) {
    const t = pool.items[i]!; // i < used ≤ items.length
    if (!t.alive || t.def === null) continue;
    for (let dr = -LINK_ADJACENCY_TILES; dr <= LINK_ADJACENCY_TILES; dr++) {
      for (let dc = -LINK_ADJACENCY_TILES; dc <= LINK_ADJACENCY_TILES; dc++) {
        const n = towerAt(state, map, t.col + dc, t.row + dr);
        if (n === null || n.uid <= t.uid || n.def === null) continue;
        for (const link of content.links) {
          const [a, b] = link.partners;
          const matches =
            (a.tower === t.def.id && b.tower === n.def.id) ||
            (a.tower === n.def.id && b.tower === t.def.id);
          if (!matches) continue;
          pairs.push([link.index, t.uid, n.uid]);
          t.linkMask |= link.bit;
          n.linkMask |= link.bit;
        }
      }
    }
  }
  // Each link type once per tower, whatever the number of partners.
  for (let i = 0; i < pool.used; i++) {
    const t = pool.items[i]!; // i < used ≤ items.length
    if (!t.alive || t.def === null || t.linkMask === 0) continue;
    for (const link of content.links) {
      if ((t.linkMask & link.bit) === 0) continue;
      const p = link.partners[0].tower === t.def.id ? link.partners[0] : link.partners[1];
      const k = rules.linkMult;
      t.flatDamage += p.flatDamage * k;
      t.flatRate += p.flatRate * k;
      t.flatRange += p.flatRange * k;
      t.pctDamage += p.pctDamage * k;
      t.pctRate += p.pctRate * k;
      t.pctRange += p.pctRange * k;
      if (p.vsStatusMask !== 0) {
        t.vsStatusMask |= p.vsStatusMask;
        t.vsStatusPct += p.vsStatusPct * k;
      }
      // Conductive (T304b): jumps scale with Linked Up and round down to whole jumps; the Soaked
      // a link grants is a duration, not a bonus, so it doesn't scale (the longest applies).
      if (p.chainJumps !== 0) t.bonusJumps += Math.floor(p.chainJumps * k + 1e-9);
      if (p.soakedTicks > t.linkSoakedTicks) t.linkSoakedTicks = p.soakedTicks;
      t.bonusDetectTiles += p.detectRadiusTiles * k;
      // Reel It In (T408): whole credits per kill, scaled like jumps and rounded down.
      if (p.killCredits !== 0) t.linkKillCredits += Math.floor(p.killCredits * k + 1e-9);
      // Resonance (T504): damage against a raised shield, scaled like any link bonus.
      t.vsShieldPct += p.vsShieldPct * k;
      // Lightsong (T508): a faster ramp and stronger Marks, scaled like any link bonus.
      t.linkRampPct += p.rampPct * k;
      t.linkMarkPct += p.markPct * k;
      // The Scuttle Den's (T604): whole swarmlings, scaled like jumps and rounded down; its dash
      // speed and its latch time scaled like any link bonus (the latch rounds to whole ticks).
      if (p.swarmlings !== 0) t.linkSwarmlings += Math.floor(p.swarmlings * k + 1e-9);
      t.linkSwarmSpeedPct += p.swarmSpeedPct * k;
      t.linkLatchTicks += Math.round(p.latchTicks * k);
      // The Hum Choir's (T607): its auras wider and stronger, scaled like any link bonus; whole
      // extra hitscan targets, scaled like jumps and rounded down.
      t.linkAuraRadiusTiles += p.auraRadiusTiles * k;
      t.linkAuraPct += p.auraPct * k;
      if (p.extraTargets !== 0) t.linkExtraTargets += Math.floor(p.extraTargets * k + 1e-9);
      // The Stasis Bloom's (T608): its field wider, scaled like any link bonus; its pulse sooner, a
      // duration scaled like Splash Zone's latch (rounded to whole ticks).
      t.linkFieldRadiusTiles += p.fieldRadiusTiles * k;
      t.linkPulseSoonerTicks += Math.round(p.pulseSoonerTicks * k);
      // Acid Rain, Sticky Flak (T705): whole Corroded stacks per hit, scaled like jumps and rounded
      // down (Linked Up's ×1.5 leaves 1 at 1); sim/puddles.ts lands them.
      if (p.corrodedStacks !== 0) t.linkCorrodedStacks += Math.floor(p.corrodedStacks * k + 1e-9);
    }
  }

  applyAuras(state, ctx, rules.powerNodeAuraPct);
  diffPairs(state, content, sortPairs(pairs));
}

function clearBonuses(t: Tower): void {
  t.linkMask = 0;
  t.flatDamage = 0;
  t.flatRate = 0;
  t.flatRange = 0;
  t.pctDamage = 0;
  t.pctRate = 0;
  t.pctRange = 0;
  t.vsStatusMask = 0;
  t.vsStatusPct = 0;
  t.bonusJumps = 0;
  t.linkSoakedTicks = 0;
  t.bonusDetectTiles = 0;
  t.linkKillCredits = 0;
  t.detectPct = 0;
  t.vsShieldPct = 0;
  t.linkRampPct = 0;
  t.linkMarkPct = 0;
  t.linkSwarmlings = 0;
  t.linkSwarmSpeedPct = 0;
  t.linkLatchTicks = 0;
  t.linkAuraRadiusTiles = 0;
  t.linkAuraPct = 0;
  t.linkExtraTargets = 0;
  t.linkFieldRadiusTiles = 0;
  t.linkPulseSoonerTicks = 0;
  t.linkCorrodedStacks = 0;
}

function towerAt(state: SimState, map: TickContext['map'], col: number, row: number): Tower | null {
  if (col < 0 || row < 0 || col >= map.cols || row >= map.rows) return null;
  const slot = state.towerAtTile[row * map.cols + col]!; // in bounds
  if (slot < 0) return null;
  const t = state.towers.items[slot]!; // towerAtTile holds live slots
  return t.alive ? t : null;
}

/** Sorted by link, then uid A, then uid B, and flattened. */
function sortPairs(pairs: [number, number, number][]): number[] {
  pairs.sort((x, y) => x[0] - y[0] || x[1] - y[1] || x[2] - y[2]);
  const flat: number[] = [];
  for (const [l, a, b] of pairs) flat.push(l, a, b);
  return flat;
}

/** Emits LinkBroken for pairs that ended, then LinkFormed for new ones, and stores the new list. */
function diffPairs(state: SimState, content: CompiledContent<IdSpace>, next: number[]): void {
  const prev = state.linkPairs;
  for (let i = 0; i < prev.length; i += 3) {
    if (!hasPair(next, prev[i]!, prev[i + 1]!, prev[i + 2]!)) {
      const link = content.links[prev[i]!]!; // indices come from the registry
      emit(state, { type: 'LinkBroken', link: link.id, a: prev[i + 1]!, b: prev[i + 2]! });
    }
  }
  for (let i = 0; i < next.length; i += 3) {
    if (!hasPair(prev, next[i]!, next[i + 1]!, next[i + 2]!)) {
      const link = content.links[next[i]!]!; // indices come from the registry
      emit(state, { type: 'LinkFormed', link: link.id, a: next[i + 1]!, b: next[i + 2]! });
    }
  }
  state.linkPairs = next;
}

function hasPair(list: readonly number[], l: number, a: number, b: number): boolean {
  for (let i = 0; i < list.length; i += 3) {
    if (list[i] === l && list[i + 1] === a && list[i + 2] === b) return true;
  }
  return false;
}

/** +1 tick of uptime for each link with at least one active pair (pairs are sorted by link). */
function countUptime(state: SimState, registry: readonly CompiledLinkDef<IdSpace>[]): void {
  const pairs = state.linkPairs;
  let last = -1;
  for (let i = 0; i < pairs.length; i += 3) {
    const l = pairs[i]!; // i < length
    if (l === last) continue;
    last = l;
    const id = registry[l]!.id; // indices come from the registry
    state.stats.linkTicks[id] = (state.stats.linkTicks[id] ?? 0) + 1;
  }
}

/**
 * Whether link `id` is active right now: at least one adjacent pair of its partners stands
 * (conditions' `linkActive`, T202c; the HUD). Current as of the last links pass.
 */
export function isLinkActive(
  state: DeepReadonly<Pick<SimState, 'linkPairs'>>,
  content: Pick<CompiledContent<IdSpace>, 'links'>,
  id: string,
): boolean {
  let index = -1;
  for (const link of content.links) if (link.id === id) index = link.index;
  if (index < 0) return false;
  for (let i = 0; i < state.linkPairs.length; i += 3) if (state.linkPairs[i] === index) return true;
  return false;
}
