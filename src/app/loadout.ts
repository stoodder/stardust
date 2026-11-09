// The loadout screen's app side (T201; design/core-loop.md § 1): builds its view from the save in
// play and the map (ui/screens/loadoutView.ts), and answers the screen's questions while it's open
// (toggling a tower, the links a pick forms, the counters it leaves unanswered) through the pure
// rules in meta/loadout.ts. Locking a pick in writes it as the map's preset (app/save.ts); the
// battle reads it back through battleConfig (app/battleSetup.ts), so a retry keeps it too.
import { CAMPAIGN, CAMPAIGN_PLAN } from '../content/campaign.ts';
import type { CompiledContent, CompiledMapDef } from '../content/compiled.ts';
import { LINKS } from '../content/links/index.ts';
import { MAX_LOADOUT } from '../content/rules.ts';
import type { CounterId, IdSpace, LinkBonusDef, TowerId, TowerStat } from '../content/types.ts';
import {
  abilityAnswers,
  initialPick,
  linksAmong,
  loadoutPools,
  mapCounters,
  toggleTower,
  towerAnswers,
  uncoveredCounters,
  type LoadoutMap,
  type LoadoutPick,
  type LoadoutPools,
  type SaveData,
  mapName,
} from '../meta/index.ts';
import { costFor } from '../sim/index.ts';
import { silkText } from '../ui/silk.ts';
import {
  loadout,
  type LoadoutAbilityView,
  type LoadoutLinkView,
  type LoadoutPickView,
  type LoadoutTowerView,
  type LoadoutView,
} from '../ui/screens/loadoutView.ts';
import { battleConfig, defaultPick } from './battleSetup.ts';
import { displayName } from './hudText.ts';
import { threatNames } from './hudViews.ts';
import { logError } from './log.ts';
import { activeSave, rememberLoadout, type SaveResult } from './save.ts';

/** Counter categories as the screen names them (design/enemies.md § 3.1). */
export const COUNTER_LABELS: Readonly<Record<CounterId, string>> = {
  armor: 'Armor',
  shield: 'Shields',
  detection: 'Detection',
  air: 'Air',
  burrowed: 'Burrowers',
  splash: 'Splash',
  jam: 'Jam',
};

const STAT_TEXT: Readonly<Record<TowerStat, string>> = {
  damage: 'damage',
  rate: 'fire rate',
  range: 'range',
};

/** "+10% fire rate", "+0.3 range", "+20% damage vs Chilled". */
function bonusText(b: LinkBonusDef): string {
  const parts: string[] = [];
  if (b.pct !== undefined) parts.push(`+${Math.round(b.pct * 100)}% ${STAT_TEXT[b.stat]}`);
  if (b.flat !== undefined) parts.push(`+${b.flat} ${STAT_TEXT[b.stat]}`);
  const vs = b.vsStatus?.map(displayName).join('/');
  return vs === undefined ? parts.join(', ') : `${parts.join(', ')} vs ${vs}`;
}

/** What the open screen works from: the save it was built for, its pools, and the map. */
interface Context {
  readonly mapId: string;
  readonly save: SaveData;
  readonly pools: LoadoutPools;
  readonly map: LoadoutMap;
  readonly specName: (tower: string, spec: 'a' | 'b') => string | null;
}

let ctx: Context | null = null;

/** The map as meta/loadout.ts's counter checks need it. */
function loadoutMap(map: CompiledMapDef<IdSpace>, slot2: string | null): LoadoutMap {
  return {
    act: map.act,
    threatIntel: map.threatIntel,
    requiredCounters: map.requiredCounters,
    enemies: map.waves.flatMap((w) => w.groups.map((g) => g.enemy)),
    slot2,
  };
}

function towerView(
  content: CompiledContent<IdSpace>,
  c: Context,
  modifiers: Parameters<typeof costFor>[0],
  id: TowerId,
): LoadoutTowerView {
  const def = content.towers[id]!; // pool towers are registered (validateSave)
  const specsOwned = c.save.unlocks.specs.includes(id);
  const required: readonly string[] = c.map.requiredCounters;
  return {
    id,
    name: silkText(displayName(id)),
    role: silkText(def.role),
    cost: costFor(modifiers, id, def.tiers[0].cost),
    icon: def.sprites.icon,
    answers: towerAnswers(id, specsOwned, c.map, c.specName).map((a) => ({
      counter: a.counter,
      label: COUNTER_LABELS[a.counter],
      via: a.spec ?? (a.minTier > 1 ? `T${a.minTier}` : null),
      required: required.includes(a.counter),
    })),
  };
}

function linkView(l: (typeof LINKS)[keyof typeof LINKS]): LoadoutLinkView {
  const [a, b] = l.partners;
  return {
    id: l.id,
    name: silkText(l.name),
    partners: [a.tower, b.tower],
    partnerNames: `${displayName(a.tower)} + ${displayName(b.tower)}`,
    bonus: l.partners
      .map((p) => `${displayName(p.tower)} ${p.bonuses.map(bonusText).join(', ')}`)
      .join(' · '),
  };
}

/** The map's battle config for the save (its content, modifiers, and slot 2), or null. */
function configFor(mapId: string, save: SaveData): ReturnType<typeof battleConfig> | null {
  try {
    return battleConfig(mapId, 0, save);
  } catch (err) {
    logError(`loadout: no map '${mapId}'`, err);
    return null;
  }
}

/**
 * Builds the loadout screen for `mapId` and the save in play into the `loadout` view. Returns
 * false (and shows nothing) without a save or for a map no battle can open.
 */
export function openLoadout(mapId: string): boolean {
  const save = activeSave();
  // Campaign maps only: a dev battle's towers aren't the save's.
  const campaignMaps: readonly string[] = CAMPAIGN;
  if (save === null || !campaignMaps.includes(mapId)) return false;
  const cfg = configFor(mapId, save);
  if (cfg === null) return false;
  const content = cfg.content;
  const map = content.maps[mapId]!; // battleConfig found it
  const pools = loadoutPools(save);
  const c: Context = {
    mapId,
    save,
    pools,
    map: loadoutMap(map, cfg.abilities.slot2),
    specName: (tower, spec) => content.towers[tower]?.specs?.[spec].name ?? null,
  };
  ctx = c;
  const required: readonly string[] = map.requiredCounters;
  const shift = CAMPAIGN_PLAN.findIndex((m) => m.id === mapId);
  const slot2 = cfg.abilities.slot2;
  const view: LoadoutView = {
    mapId,
    mapName: silkText(mapName(mapId)),
    shift: shift < 0 ? null : shift + 1,
    threats: threatNames(map),
    counters: mapCounters(c.map).map((id) => ({
      id,
      label: COUNTER_LABELS[id],
      required: required.includes(id),
    })),
    towers: pools.towers.map((id) => towerView(content, c, cfg.modifiers, id)),
    abilities: pools.abilities.map((id): LoadoutAbilityView => ({
      id,
      name: silkText(content.abilities[id]!.name), // pool abilities are registered (validateSave)
      icon: content.abilities[id]!.sprites.icon,
      answers: abilityAnswers(id, c.map).map((k) => COUNTER_LABELS[k]),
    })),
    links: linksAmong(pools.towers, Object.values(LINKS)).map(linkView),
    companion:
      slot2 === null || cfg.companion === null
        ? null
        : silkText(
            `${displayName(cfg.companion)} · ${content.abilities[slot2]?.name ?? displayName(slot2)}`,
          ),
    initial: initialPick(save, mapId, defaultPick(save, map.builds.parBuild)),
    max: MAX_LOADOUT,
  };
  loadout.value = view;
  return true;
}

/** Closes the screen's view (the router, when it leaves the screen). */
export function closeLoadout(): void {
  loadout.value = null;
  ctx = null;
}

/** The pick as the save's typed ids (unknown ids dropped), in its build-slot order. */
function typed(c: Context, pick: LoadoutPickView): LoadoutPick {
  return {
    towers: pick.towers.flatMap((t) => c.pools.towers.filter((o) => o === t)),
    ability: c.pools.abilities.find((a) => a === pick.ability) ?? null,
  };
}

/** Toggles a tower in the pick (meta/loadout.ts toggleTower: up to four, in build-slot order). */
export function togglePickTower(pick: LoadoutPickView, tower: string): LoadoutPickView {
  if (ctx === null) return pick;
  const pools: LoadoutPools<string, string> = ctx.pools;
  return toggleTower(pick, tower, pools);
}

/** The ids of the links the picked towers form. */
export function formedLinks(pick: LoadoutPickView): string[] {
  return linksAmong(pick.towers, Object.values(LINKS)).map((l) => l.id);
}

/**
 * A heads-up for each required counter the pick leaves unanswered, naming the owned towers that
 * would answer it. Never a scold: the player may know something the warning doesn't.
 */
export function pickWarnings(pick: LoadoutPickView): string[] {
  const c = ctx;
  const view = loadout.value;
  if (c === null || view === null) return [];
  return uncoveredCounters(typed(c, pick), c.save, c.map, c.specName).map((counter) => {
    const label = COUNTER_LABELS[counter];
    const who = view.towers
      .map((t) => {
        const a = t.answers.find((x) => x.counter === counter);
        return a === undefined ? null : a.via === null ? t.name : `${t.name} (${a.via})`;
      })
      .filter((n) => n !== null);
    const hint = who.length === 0 ? '' : ` ${who.join(' or ')} would.`;
    return `Heads up: this shift needs an answer to ${label}, and nothing here has one.${hint}`;
  });
}

/** Locks the pick in: writes it as the map's preset and the last one (the battle reads it). */
export function savePick(pick: LoadoutPickView): SaveResult {
  if (ctx === null) return { ok: false, message: 'The loadout screen is closed.' };
  const r = rememberLoadout(ctx.mapId, typed(ctx, pick));
  if (!r.ok) logError(`loadout: ${r.message}`);
  return r;
}

/** The open screen's map, or null. */
export function loadoutMapId(): string | null {
  return ctx?.mapId ?? null;
}
