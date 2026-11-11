// Link compilation (design/towers.md § 6): each link's partner bonuses summed per stat, its bit in
// `Tower.linkMask`, and every tower's list of links. Problems are collected into the compile
// errors: an unknown or repeated partner, a link past MAX_LINKS, a malformed bonus, and a tower
// with two conditional (`vsStatus`) bonuses, which the sim's one pair of `vsStatus*` fields can't
// hold (no link in the design gives a tower two). A partner can also take chain jumps and a Soaked
// it applies (Conductive, T304b): `chainJumps` a whole number ≥ 0, `soakedSec` a duration > 0;
// and (T500a) a damage bonus against a raised shield (`vsShielded`: Resonance, one per partner), a
// faster beam ramp (`rampPct`), and a stronger Mark (`markPct`: Lightsong), each a fraction > 0;
// and (T604) a Scuttle Den's extras: `swarmlings` a whole number > 0 (Finders Keepers), and
// `swarmSpeedPct` a fraction > 0 with `latchSec` a duration > 0 (Splash Zone); and (T607) a Hum
// Choir's `auraRadiusTiles` > 0 (Harmony) and `auraPct` a fraction > 0 (Bounce Chorus), and a
// hitscan partner's `extraTargets` a whole number > 0 (Harmony's Mindspike); and (T608) a Stasis
// Bloom's `fieldRadiusTiles` > 0 (Pinned Down) and `pulseSoonerSec` a duration > 0 (Stillmind);
// and (T700a seams) `corrodedStacks` a whole number > 0 (Acid Rain, Sticky Flak), a Sproing Pad's
// `pinSec` a duration > 0 (Bounce Chorus) and `preferMarked` (Lookie Here).
import type { CompiledLinkDef, CompiledLinkPartner } from './compiled.ts';
import { entriesOf, checkKey, ticks, type Ctx } from './compileHelpers.ts';
import { MAX_LINKS, statusMask } from './rules.ts';
import type { IdSpace, LinkDef, LinkPartnerDef } from './types.ts';
import { assertNever } from '../shared/types.ts';

/**
 * Compiles the link registry against the tower ids. Returns the links in registry order and,
 * per tower id, the ids of the links it partners in (registry order).
 */
export function compileLinks<K extends IdSpace>(
  ctx: Ctx,
  raw: Readonly<Record<string, LinkDef<K>>>,
  towerIds: ReadonlySet<string>,
): { links: CompiledLinkDef<K>[]; byTower: Map<string, string[]> } {
  const links: CompiledLinkDef<K>[] = [];
  const byTower = new Map<string, string[]>();
  const conditional = new Map<string, string>(); // tower → the link giving it a vsStatus bonus
  for (const [key, def] of entriesOf(raw)) {
    checkKey(ctx, 'links', key, def.id);
    const where = `links.${def.id}`;
    const index = links.length;
    if (index >= MAX_LINKS) {
      ctx.errors.push(`${where}: the registry holds at most ${MAX_LINKS} links (Tower.linkMask)`);
      continue;
    }
    const [a, b] = def.partners;
    if (a.tower === b.tower) ctx.errors.push(`${where}: partners must be two different towers`);
    const partners = [
      partner(ctx, a, `${where}.partners[0]`),
      partner(ctx, b, `${where}.partners[1]`),
    ] as const;
    for (const p of partners) {
      if (!towerIds.has(p.tower)) {
        ctx.errors.push(`${where}: unknown tower '${p.tower}'`);
        continue;
      }
      const list = byTower.get(p.tower) ?? [];
      list.push(def.id);
      byTower.set(p.tower, list);
      if (p.vsStatusMask !== 0) {
        const other = conditional.get(p.tower);
        if (other !== undefined) {
          ctx.errors.push(
            `${where}: '${p.tower}' already has a vsStatus bonus (from '${other}'); a tower takes one`,
          );
        }
        conditional.set(p.tower, def.id);
      }
    }
    links.push({ id: def.id, name: def.name, index, bit: 1 << index, partners });
  }
  return { links, byTower };
}

function partner<K extends IdSpace>(
  ctx: Ctx,
  def: LinkPartnerDef<K>,
  where: string,
): CompiledLinkPartner<K> {
  const out = {
    tower: def.tower,
    flatDamage: 0,
    flatRate: 0,
    flatRange: 0,
    pctDamage: 0,
    pctRate: 0,
    pctRange: 0,
    vsStatusMask: 0,
    vsStatusPct: 0,
    chainJumps: 0,
    soakedTicks: 0,
    detectRadiusTiles: 0,
    killCredits: 0,
    vsShieldPct: 0,
    rampPct: 0,
    markPct: 0,
    swarmlings: 0,
    swarmSpeedPct: 0,
    latchTicks: 0,
    auraRadiusTiles: 0,
    auraPct: 0,
    extraTargets: 0,
    fieldRadiusTiles: 0,
    pulseSoonerTicks: 0,
    corrodedStacks: 0,
    pinTicks: 0,
    preferMarked: def.preferMarked === true,
  };
  if (def.chainJumps !== undefined) {
    if (Number.isInteger(def.chainJumps) && def.chainJumps > 0) out.chainJumps = def.chainJumps;
    else ctx.errors.push(`${where}.chainJumps: needs a whole number > 0`);
  }
  if (def.soakedSec !== undefined) {
    if (Number.isFinite(def.soakedSec) && def.soakedSec > 0) {
      out.soakedTicks = ticks(ctx, def.soakedSec, `${where}.soakedSec`);
    } else ctx.errors.push(`${where}.soakedSec: needs a duration > 0`);
  }
  if (def.detectRadiusTiles !== undefined) {
    if (Number.isFinite(def.detectRadiusTiles) && def.detectRadiusTiles > 0) {
      out.detectRadiusTiles = def.detectRadiusTiles;
    } else ctx.errors.push(`${where}.detectRadiusTiles: needs a radius > 0`);
  }
  if (def.killCredits !== undefined) {
    if (Number.isInteger(def.killCredits) && def.killCredits > 0) out.killCredits = def.killCredits;
    else ctx.errors.push(`${where}.killCredits: needs a whole number > 0`);
  }
  // A Scuttle Den partner's extras (T604): whole swarmlings, a dash speed fraction, a latch time.
  if (def.swarmlings !== undefined) {
    if (Number.isInteger(def.swarmlings) && def.swarmlings > 0) out.swarmlings = def.swarmlings;
    else ctx.errors.push(`${where}.swarmlings: needs a whole number > 0`);
  }
  if (def.latchSec !== undefined) {
    if (Number.isFinite(def.latchSec) && def.latchSec > 0) {
      out.latchTicks = ticks(ctx, def.latchSec, `${where}.latchSec`);
    } else ctx.errors.push(`${where}.latchSec: needs a duration > 0`);
  }
  // A Hum Choir's (T607): its auras wider (Harmony) and stronger (Bounce Chorus); a hitscan
  // partner's extra targets (Harmony's Mindspike).
  if (def.auraRadiusTiles !== undefined) {
    if (Number.isFinite(def.auraRadiusTiles) && def.auraRadiusTiles > 0) {
      out.auraRadiusTiles = def.auraRadiusTiles;
    } else ctx.errors.push(`${where}.auraRadiusTiles: needs a radius > 0`);
  }
  if (def.extraTargets !== undefined) {
    if (Number.isInteger(def.extraTargets) && def.extraTargets > 0) {
      out.extraTargets = def.extraTargets;
    } else ctx.errors.push(`${where}.extraTargets: needs a whole number > 0`);
  }
  // A Stasis Bloom's (T608): its field wider (Pinned Down) and its pulse sooner (Stillmind).
  if (def.fieldRadiusTiles !== undefined) {
    if (Number.isFinite(def.fieldRadiusTiles) && def.fieldRadiusTiles > 0) {
      out.fieldRadiusTiles = def.fieldRadiusTiles;
    } else ctx.errors.push(`${where}.fieldRadiusTiles: needs a radius > 0`);
  }
  if (def.pulseSoonerSec !== undefined) {
    if (Number.isFinite(def.pulseSoonerSec) && def.pulseSoonerSec > 0) {
      out.pulseSoonerTicks = ticks(ctx, def.pulseSoonerSec, `${where}.pulseSoonerSec`);
    } else ctx.errors.push(`${where}.pulseSoonerSec: needs a duration > 0`);
  }
  // M7's (T700a seams): Corroded stacks per hit (T705), a Sproing Pad's longer Pin (T704).
  if (def.corrodedStacks !== undefined) {
    if (Number.isInteger(def.corrodedStacks) && def.corrodedStacks > 0) {
      out.corrodedStacks = def.corrodedStacks;
    } else ctx.errors.push(`${where}.corrodedStacks: needs a whole number > 0`);
  }
  if (def.pinSec !== undefined) {
    if (Number.isFinite(def.pinSec) && def.pinSec > 0) {
      out.pinTicks = ticks(ctx, def.pinSec, `${where}.pinSec`);
    } else ctx.errors.push(`${where}.pinSec: needs a duration > 0`);
  }
  for (const f of ['rampPct', 'markPct', 'swarmSpeedPct', 'auraPct'] as const) {
    const v = def[f];
    if (v === undefined) continue;
    if (Number.isFinite(v) && v > 0) out[f] = v;
    else ctx.errors.push(`${where}.${f}: needs a fraction > 0`);
  }
  for (const [i, bonus] of def.bonuses.entries()) {
    const at = `${where}.bonuses[${i}]`;
    const flat = bonus.flat ?? 0;
    const pct = bonus.pct ?? 0;
    if (!Number.isFinite(flat) || !Number.isFinite(pct) || (flat === 0 && pct === 0)) {
      ctx.errors.push(`${at}: needs a finite, non-zero flat or pct`);
      continue;
    }
    if (bonus.vsShielded === true) {
      if (bonus.stat !== 'damage' || flat !== 0 || bonus.vsStatus !== undefined) {
        ctx.errors.push(`${at}: a vsShielded bonus is a damage pct alone (no vsStatus)`);
        continue;
      }
      if (out.vsShieldPct !== 0) {
        ctx.errors.push(`${at}: a partner takes one vsShielded bonus`);
        continue;
      }
      out.vsShieldPct = pct;
      continue;
    }
    if (bonus.vsStatus !== undefined) {
      if (bonus.stat !== 'damage' || flat !== 0 || bonus.vsStatus.length === 0) {
        ctx.errors.push(`${at}: a vsStatus bonus is a damage pct against at least one status`);
        continue;
      }
      if (out.vsStatusMask !== 0) {
        ctx.errors.push(`${at}: a partner takes one vsStatus bonus`);
        continue;
      }
      out.vsStatusMask = statusMask(bonus.vsStatus);
      out.vsStatusPct = pct;
      continue;
    }
    switch (bonus.stat) {
      case 'damage':
        out.flatDamage += flat;
        out.pctDamage += pct;
        break;
      case 'rate':
        out.flatRate += flat;
        out.pctRate += pct;
        break;
      case 'range':
        out.flatRange += flat;
        out.pctRange += pct;
        break;
      default:
        assertNever(bonus.stat);
    }
  }
  return out;
}
