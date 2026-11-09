// Link compilation (design/towers.md § 6): each link's partner bonuses summed per stat, its bit in
// `Tower.linkMask`, and every tower's list of links. Problems are collected into the compile
// errors: an unknown or repeated partner, a link past MAX_LINKS, a malformed bonus, and a tower
// with two conditional (`vsStatus`) bonuses, which the sim's one pair of `vsStatus*` fields can't
// hold (no link in the design gives a tower two). A partner can also take chain jumps and a Soaked
// it applies (Conductive, T304b): `chainJumps` a whole number ≥ 0, `soakedSec` a duration > 0.
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
  for (const [i, bonus] of def.bonuses.entries()) {
    const at = `${where}.bonuses[${i}]`;
    const flat = bonus.flat ?? 0;
    const pct = bonus.pct ?? 0;
    if (!Number.isFinite(flat) || !Number.isFinite(pct) || (flat === 0 && pct === 0)) {
      ctx.errors.push(`${at}: needs a finite, non-zero flat or pct`);
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
