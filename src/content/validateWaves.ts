// Wave validation (maps.md § 9; the rule list is validateMap.ts's header): [wave] and
// [route-walk] and [wave-tag].
import { SKITTERKIN_ONLY_TAGS } from './rules.ts';
import type { IdSpace, MapDef } from './types.ts';
import type { MapCtx } from './validateMap.ts';
import { Issues, duplicates, isPositive, isPositiveInt } from './validateHelpers.ts';

export type RouteKind = 'path' | 'air' | 'rift';

export function routesOf(
  def: MapDef<IdSpace>,
): Map<string, { kind: RouteKind; opensAtWave: number }> {
  const out = new Map<string, { kind: RouteKind; opensAtWave: number }>();
  // Like compile, the first route with an id wins (a duplicate id is a compile error).
  const add = (id: string, kind: RouteKind, opensAtWave: number): void => {
    if (!out.has(id)) out.set(id, { kind, opensAtWave });
  };
  for (const p of def.paths) add(p.id, 'path', 1);
  for (const p of def.airLanes ?? []) add(p.id, 'air', 1);
  for (const p of def.riftLanes ?? []) add(p.id, 'rift', p.opensAtWave);
  return out;
}

export function validateWaves(
  issues: Issues,
  ctx: MapCtx,
  def: MapDef<IdSpace>,
  mapWhere: string,
): void {
  if (def.waves.length === 0)
    issues.add('wave', `${mapWhere}.waves`, 'a map needs at least one wave');
  const routes = routesOf(def);
  for (const [w, wave] of def.waves.entries()) {
    const where = `${mapWhere}.waves[${w}]`;
    if (wave.groups.length === 0) issues.add('wave', where, 'a wave needs at least one group');
    if (wave.countdownSec !== undefined) {
      if (w === 0)
        issues.add(
          'wave',
          `${where}.countdownSec`,
          'wave 1 has no countdown (the player starts it)',
        );
      else if (!isPositive(wave.countdownSec))
        issues.add('wave', `${where}.countdownSec`, 'must be > 0');
    }
    for (const [g, group] of wave.groups.entries()) {
      const gw = `${where}.groups[${g}]`;
      if (!isPositiveInt(group.count))
        issues.add('wave', `${gw}.count`, 'must be a whole number ≥ 1');
      if (group.intervalSec !== undefined && !isPositive(group.intervalSec)) {
        issues.add('wave', `${gw}.intervalSec`, 'must be > 0');
      }
      const enemy = ctx.enemies.get(group.enemy);
      const route = routes.get(group.route);
      if (enemy !== undefined && route !== undefined) {
        // Flyers take air lanes and ground units ground routes; a neutral flyer (Gerald, core-loop
        // § 2.7) may also fly a ground path (T304a).
        const air = enemy.layer === 'air';
        const walks =
          route.kind === 'air' ? air : !air || (enemy.neutral === true && route.kind === 'path');
        if (!walks) {
          issues.add(
            'route-walk',
            gw,
            `${enemy.layer} unit '${enemy.id}' can't walk ${route.kind} route '${group.route}'`,
          );
        }
        if (route.kind === 'rift') {
          if (enemy.faction !== 'hollow') {
            issues.add('route-walk', gw, `rift lane '${group.route}' carries only the Hollow`);
          }
          if (w + 1 < route.opensAtWave) {
            issues.add(
              'route-walk',
              gw,
              `rift lane '${group.route}' opens at wave ${route.opensAtWave}, not wave ${w + 1}`,
            );
          }
        }
      }
      const tags = group.tags ?? [];
      for (const t of duplicates(tags))
        issues.add('wave-tag', `${gw}.tags`, `'${t}' is listed twice`);
      if (enemy !== undefined && enemy.faction !== 'skitterkin') {
        for (const t of tags.filter((x) => SKITTERKIN_ONLY_TAGS.includes(x))) {
          issues.add('wave-tag', `${gw}.tags`, `'${t}' is only for Skitterkin (not '${enemy.id}')`);
        }
      }
    }
  }
}
