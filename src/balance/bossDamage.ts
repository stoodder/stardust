// The boss-damage check (D157; conventions.md § Balance sims): on a map whose boss is laid to rest
// by its song (the finale's Unsung), more damage on the boss must never lose. Every alt the map
// offers still wins, at the forgiving floor or better, with its damage on the boss multiplied by
// each of BOSS_DAMAGE_MULS. The run emulates the extra damage in content, as the round-2 review's
// probe did: the boss's HP (and its split's parts') ÷ k, and the song's rest per point of the
// boss's damage × k, so each hit takes k times the share of its HP and feeds k times the rest.
// Its time floors (`notBeforeSec`) are what hold it: hit harder, a form still comes at its time.
// The harness runs it on the map's default flags (label `bossDamage<k>:alt:<name>`); the finale's
// 24 story cells are swept in the slow lane (`altCellFailures`, the second `it.each` of each
// balance/finM01Combos<Alt>.test.ts).
import type {
  CompiledContent,
  CompiledEnemyDef,
  CompiledMapDef,
  CompiledWaveGroup,
} from '../content/compiled.ts';
import type { IdSpace } from '../content/types.ts';
import { describeRun, fmtPct, margins, perRun, wonCount, type CheckSpec } from './checks.ts';
import { FORGIVING_FLOOR_PCT } from './rules.ts';

/** The damage multipliers on the boss every alt must still win with. */
export const BOSS_DAMAGE_MULS: readonly number[] = [1.5, 2];

/** The label prefix: 'bossDamage2:alt:no_mindspike' is that alt with ×2 damage on the boss. */
export const BOSS_DAMAGE_PREFIX = 'bossDamage';

const LABEL = /^bossDamage(\d+(?:\.\d+)?):(.+)$/;

/** A boss-damage label's multiplier and the build it plays, or null for any other label. */
export function bossDamageOf(
  label: string,
): { readonly mul: number; readonly build: string } | null {
  const m = LABEL.exec(label);
  if (m === null) return null;
  const mul = Number(m[1]);
  return Number.isFinite(mul) && mul > 0 ? { mul, build: m[2]! } : null;
}

/** The defs of the song bosses `map`'s waves send (a `layToRest` ending), and of their parts. */
export function songBosses<K extends IdSpace>(
  map: CompiledMapDef<K>,
  content: Pick<CompiledContent<K>, 'enemies'>,
): CompiledEnemyDef<K['enemy']>[] {
  if (map.song === null) return [];
  const ids = new Set<string>();
  for (const w of map.waves) {
    for (const g of w.groups) {
      const boss = g.enemy.boss;
      if (boss === null || boss.ending !== 'layToRest') continue;
      ids.add(g.enemy.id);
      for (const p of boss.phases) if (p.split !== null) ids.add(p.split.part);
    }
  }
  const defs: CompiledEnemyDef<K['enemy']>[] = Object.values(content.enemies);
  return defs.filter((d) => ids.has(d.id));
}

/**
 * `content` with `mapId`'s song bosses taking `mul` times the damage (see the header): their defs'
 * HP ÷ mul, in the content's enemies and in every wave and script group of the map that sends them
 * (the only places a compiled map holds an enemy's def), and the map's `restPerBossHp` × mul. The
 * rest of the content is shared, unchanged.
 */
export function withBossDamage<K extends IdSpace>(
  content: CompiledContent<K>,
  mapId: K['map'],
  mul: number,
): CompiledContent<K> {
  const map = content.maps[mapId];
  const song = map.song;
  if (song === null) return content;
  const swap = new Map<string, CompiledEnemyDef<K['enemy']>>();
  const enemies: Record<K['enemy'], CompiledEnemyDef<K['enemy']>> = { ...content.enemies };
  for (const def of songBosses(map, content)) {
    const harder = Object.freeze({ ...def, hp: def.hp / mul });
    swap.set(def.id, harder);
    enemies[def.id] = harder;
  }
  const group = (g: CompiledWaveGroup<K>): CompiledWaveGroup<K> => {
    const def = swap.get(g.enemy.id);
    return def === undefined ? g : { ...g, enemy: def };
  };
  const scriptGroups: Record<string, CompiledWaveGroup<K>> = {};
  for (const [id, g] of Object.entries(map.scriptGroups)) scriptGroups[id] = group(g);
  const harderMap: CompiledMapDef<K> = {
    ...map,
    waves: map.waves.map((w) => ({ ...w, groups: w.groups.map(group) })),
    scriptGroups,
    song: { ...song, restPerBossHp: song.restPerBossHp * mul },
  };
  return { ...content, enemies, maps: { ...content.maps, [mapId]: harderMap } };
}

/**
 * The boss-damage check (see the header): each alt the map expects to win (`altExpectations`
 * without an `outcome`), at each of BOSS_DAMAGE_MULS, on seed 1 of the map's default flags.
 */
export function bossDamageChecks<K extends IdSpace>(
  map: CompiledMapDef<K>,
  content: Pick<CompiledContent<K>, 'enemies'>,
): CheckSpec[] {
  if (songBosses(map, content).length === 0) return [];
  const b = map.builds;
  const alts = Object.keys(b.altBuilds).filter(
    (name) => !Object.hasOwn(b.altExpectations, name) || !b.altExpectations[name]!.outcome,
  );
  return alts.flatMap((name) =>
    BOSS_DAMAGE_MULS.map((mul) =>
      perRun(
        'bossDamage',
        `alt:${name} with ×${mul} damage on the boss still wins at ≥ ${FORGIVING_FLOOR_PCT}%`,
        `${BOSS_DAMAGE_PREFIX}${mul}:alt:${name}`,
        [1],
        (rec) => {
          if (rec.result?.outcome !== 'won') return describeRun(rec);
          return rec.marginPct >= FORGIVING_FLOOR_PCT
            ? null
            : `margin ${fmtPct(rec.marginPct)} is under the floor ${FORGIVING_FLOOR_PCT}`;
        },
        (recs) => `${wonCount(recs)}, margins ${margins(recs)}`,
        [],
        `alt:${name}`,
      ),
    ),
  );
}
