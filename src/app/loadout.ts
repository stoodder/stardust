// The loadout screen's app side (T201; design/core-loop.md § 1): builds its view from the save in
// play and the map (ui/screens/loadoutView.ts), and answers the screen's questions while it's open
// (toggling a tower or a Field Protocol, the links a pick forms, the counters it leaves
// unanswered) through the pure rules in meta/loadout.ts. Locking a pick in writes it as the map's
// preset and equips its protocols save-wide (app/save.ts); the battle reads both back through
// battleConfig (app/battleSetup.ts), so a retry keeps them too.
import { CAMPAIGN, CAMPAIGN_PLAN } from '../content/campaign.ts';
import type { CompiledContent, CompiledMapDef } from '../content/compiled.ts';
import { LINKS } from '../content/links/index.ts';
import { MAX_LOADOUT } from '../content/rules.ts';
import type {
  CounterId,
  IdSpace,
  LinkBonusDef,
  ObjectiveKind,
  ProtocolId,
  TowerId,
  TowerStat,
} from '../content/types.ts';
import { PROTOCOLS } from '../content/upgrades/index.ts';
import {
  abilityAnswers,
  equippedProtocols,
  abilitiesOffOn,
  initialPick,
  linksAmong,
  loadoutPools,
  mapCounters,
  takesTowerPick,
  toggleProtocol,
  toggleTower,
  towerAnswers,
  uncoveredCounters,
  type LoadoutMap,
  type LoadoutPick,
  type LoadoutPools,
  type SaveData,
  mapName,
} from '../meta/index.ts';
import type { SimConfig } from '../sim/index.ts';
import { LIST_PRICE_STATE, priceOf } from './hudViews.ts';
import { silkText } from '../ui/silk.ts';
import {
  loadout,
  type LoadoutAbilityView,
  type LoadoutLinkView,
  type LoadoutPickView,
  type LoadoutProtocolView,
  type LoadoutRevokedView,
  type LoadoutTowerView,
  type LoadoutView,
} from '../ui/screens/loadoutView.ts';
import { grantText } from '../ui/screens/storeText.ts';
import { battleConfig, defaultPick } from './battleSetup.ts';
import { displayName, towerName, towerRoleText } from './hudText.ts';
import { mapThreats } from './hudViews.ts';
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
  // Resonance's bonus holds only while the target's shield is up (T504).
  const vs = b.vsShielded === true ? 'shields' : b.vsStatus?.map(displayName).join('/');
  return vs === undefined ? parts.join(', ') : `${parts.join(', ')} vs ${vs}`;
}

/**
 * A partner's whole bonus: its stat bonuses, then Conductive's chain jumps and Soak (T304b), and
 * the Lookout's detection radius from Overwatch and Skywatch (T406), Reel It In's kill credits
 * (T408), Lightsong's faster ramp and stronger Marks (T508), and the Scuttle Den's swarmling,
 * dash, and latch (T604), the Hum Choir's aura extras and Harmony's extra target (T607), and the
 * Stasis Bloom's wider field and sooner pulse (T608).
 */
function partnerText(p: (typeof LINKS)[keyof typeof LINKS]['partners'][number]): string {
  const parts = p.bonuses.map(bonusText);
  if (p.chainJumps !== undefined) parts.push(`+${p.chainJumps} chain jumps`);
  if (p.soakedSec !== undefined) parts.push(`Soaks for ${p.soakedSec} s`);
  // Overwatch, Skywatch (T406).
  if (p.detectRadiusTiles !== undefined) parts.push(`+${p.detectRadiusTiles} detection radius`);
  // Reel It In (T408).
  if (p.killCredits !== undefined) {
    parts.push(`+${p.killCredits} ${p.killCredits === 1 ? 'credit' : 'credits'} per kill`);
  }
  // Lightsong (T508).
  if (p.rampPct !== undefined) parts.push(`ramps ${Math.round(p.rampPct * 100)}% faster`);
  if (p.markPct !== undefined) parts.push(`Marks +${Math.round(p.markPct * 100)}%`);
  // The Scuttle Den's: Finders Keepers' swarmling, Splash Zone's faster dash and longer latch (T604).
  if (p.swarmlings !== undefined) {
    parts.push(`+${p.swarmlings} ${p.swarmlings === 1 ? 'swarmling' : 'swarmlings'}`);
  }
  if (p.swarmSpeedPct !== undefined) {
    parts.push(`swarmlings ${Math.round(p.swarmSpeedPct * 100)}% faster`);
  }
  if (p.latchSec !== undefined) parts.push(`+${p.latchSec} s latch`);
  // The Hum Choir's: Harmony's extra target and wider aura, Bounce Chorus's stronger aura (T607).
  if (p.extraTargets !== undefined) {
    parts.push(`hits ${p.extraTargets} extra ${p.extraTargets === 1 ? 'target' : 'targets'}`);
  }
  if (p.auraRadiusTiles !== undefined) parts.push(`aura +${p.auraRadiusTiles} radius`);
  if (p.auraPct !== undefined) parts.push(`aura +${Math.round(p.auraPct * 100)}% damage`);
  // The Stasis Bloom's: Pinned Down's wider field, Stillmind's sooner pulse (T608).
  if (p.fieldRadiusTiles !== undefined) parts.push(`field +${p.fieldRadiusTiles} radius`);
  if (p.pulseSoonerSec !== undefined) parts.push(`pulses ${p.pulseSoonerSec} s sooner`);
  // Acid Rain, Sticky Flak (T705).
  if (p.corrodedStacks !== undefined) {
    parts.push(
      `hits add ${p.corrodedStacks} Corroded ${p.corrodedStacks === 1 ? 'stack' : 'stacks'}`,
    );
  }
  return parts.join(', ');
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
  modifiers: SimConfig<IdSpace>['modifiers'],
  id: TowerId,
): LoadoutTowerView {
  const def = content.towers[id]!; // pool towers are registered (validateSave)
  const specsOwned = c.save.unlocks.specs.includes(id);
  const required: readonly string[] = c.map.requiredCounters;
  return {
    id,
    name: silkText(def.name),
    role: silkText(towerRoleText(id, def.role)),
    // The list price (D077: the same `purchasePriceInto` the sim charges, before a battle: no
    // sale running, and Rapid Deploy's free first build isn't any one tower's).
    cost: priceOf(LIST_PRICE_STATE, modifiers, id, def.tiers[0].cost, 'build').cost,
    icon: def.sprites.icon,
    answers: towerAnswers(id, specsOwned, c.map, c.specName).map((a) => ({
      counter: a.counter,
      label: COUNTER_LABELS[a.counter],
      via: a.spec ?? (a.minTier > 1 ? `T${a.minTier}` : null),
      required: required.includes(a.counter),
    })),
  };
}

/** The objectives with no core to protect: an Escort's road, a Holdout's doors (D143 R9). */
const CORELESS: ReadonlySet<ObjectiveKind> = new Set(['escort', 'holdout']);

/** What a core-only protocol reads on a map with no core. */
export const NO_CORE_TEXT = 'No core on this shift';

/** What it reads there once the screen has benched it for another (D144 S1b). */
export const BENCHED_TEXT = 'Benched: no core on this shift';

/** Whether a protocol only ever acts on the core (Emergency Bulkhead's `leakAbsorb`). */
export function coreOnly(id: ProtocolId): boolean {
  const grants = PROTOCOLS[id].grants;
  return grants.length > 0 && grants.every((g) => g.kind === 'leakAbsorb');
}

/**
 * An owned Field Protocol as the picker shows it: its name and its grants in words, and why it's
 * inert on a map of `objective` (a core-only one on a map with no core).
 */
function protocolView(
  id: ProtocolId,
  objective: ObjectiveKind,
  benched = false,
): LoadoutProtocolView {
  const def = PROTOCOLS[id];
  return {
    id,
    name: silkText(def.name),
    effect: silkText(def.grants.map(grantText).join(' · ')),
    takesTower: takesTowerPick(id),
    inert: CORELESS.has(objective) && coreOnly(id) ? NO_CORE_TEXT : null,
    benched: benched ? BENCHED_TEXT : null,
  };
}

/**
 * The equipped protocols the screen starts from on this map (D144 S1b): each inert one (a
 * core-only protocol on a map with no core) benched for a protocol that acts here, the first
 * owned one the picker lists that isn't already equipped (the save keeps no history of what was
 * equipped before, so there is no "most recent" to prefer). With nothing to swap in, it stays:
 * benching it for an empty slot gains nothing. The player can still pick it back. Returns the
 * pick's protocols and the ids benched.
 */
export function benchInert(
  start: Pick<LoadoutPickView, 'towers' | 'protocols' | 'protocolPicks'>,
  offered: readonly LoadoutProtocolView[],
  firstTower: string | undefined,
): { pick: Pick<LoadoutPickView, 'protocols' | 'protocolPicks'>; benched: string[] } {
  const isInert = (id: string): boolean =>
    (offered.find((p) => p.id === id)?.inert ?? null) !== null;
  if (!start.protocols.some(isInert)) {
    return {
      pick: { protocols: start.protocols, protocolPicks: start.protocolPicks },
      benched: [],
    };
  }
  const protocols = [...start.protocols];
  const protocolPicks: Record<string, string> = { ...start.protocolPicks };
  const benched: string[] = [];
  for (const [slot, id] of protocols.entries()) {
    if (!isInert(id)) continue;
    const swap = offered.find((p) => p.inert === null && !protocols.includes(p.id));
    if (swap === undefined) continue;
    protocols[slot] = swap.id;
    benched.push(id);
    delete protocolPicks[id];
    const tower = start.towers[0] ?? firstTower;
    if (swap.takesTower && tower !== undefined) protocolPicks[swap.id] = tower;
  }
  return { pick: { protocols, protocolPicks }, benched };
}

function linkView(l: (typeof LINKS)[keyof typeof LINKS]): LoadoutLinkView {
  const [a, b] = l.partners;
  return {
    id: l.id,
    name: silkText(l.name),
    partners: [a.tower, b.tower],
    partnerNames: `${towerName(a.tower)} + ${towerName(b.tower)}`,
    // A partner that gets nothing itself (Reel It In's Crane) isn't listed.
    bonus: l.partners
      .filter((p) => partnerText(p) !== '')
      .map((p) => `${towerName(p.tower)} ${partnerText(p)}`)
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
  // Slot 1 leaves out what the map locks under the save's flags (A3M5's System Reboot, Rewrite).
  const off = abilitiesOffOn(map, save);
  const pools = loadoutPools(save, [], off);
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
  const owned = (pools.protocols ?? []).flatMap((p) =>
    save.unlocks.protocols.filter((o) => o === p),
  );
  const offered = owned.map((o) => protocolView(o, map.objective));
  const start = {
    ...initialPick(save, mapId, defaultPick(save, map.builds.parBuild, off), off),
    ...equippedView(save),
  };
  // A core-only protocol carried onto a map with no core is benched for one that acts (D144 S1b).
  const bench = benchInert(start, offered, pools.towers[0]);
  const protocols = owned.map((o) => protocolView(o, map.objective, bench.benched.includes(o)));
  const view: LoadoutView = {
    mapId,
    mapName: silkText(mapName(mapId)),
    shift: shift < 0 ? null : shift + 1,
    threats: mapThreats(map).map((t) => ({ label: t.label, tip: t.tip })),
    counters: mapCounters(c.map).map((id) => ({
      id,
      label: COUNTER_LABELS[id],
      required: required.includes(id),
    })),
    towers: pools.towers.map((id) => towerView(content, c, cfg.modifiers, id)),
    revoked: save.unlocks.revokedTowers.flatMap((id): LoadoutRevokedView[] => {
      const def = content.towers[id];
      return def === undefined ? [] : [{ id, name: silkText(def.name), icon: def.sprites.icon }];
    }),
    abilities: pools.abilities.map((id): LoadoutAbilityView => ({
      id,
      name: silkText(content.abilities[id]!.name), // pool abilities are registered (validateSave)
      icon: content.abilities[id]!.sprites.icon,
      answers: abilityAnswers(id, c.map).map((k) => COUNTER_LABELS[k]),
    })),
    revokedAbilities: save.unlocks.revokedAbilities.flatMap((id): LoadoutRevokedView[] => {
      const def = content.abilities[id];
      return def === undefined ? [] : [{ id, name: silkText(def.name), icon: def.sprites.icon }];
    }),
    links: linksAmong(pools.towers, Object.values(LINKS)).map(linkView),
    companion:
      slot2 === null || cfg.companion === null
        ? null
        : silkText(
            `${displayName(cfg.companion)} · ${content.abilities[slot2]?.name ?? displayName(slot2)}`,
          ),
    protocols,
    protocolSlots: pools.protocolSlots ?? 0,
    initial: { ...start, ...bench.pick },
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

/** The save's equipped protocols as the screen's pick holds them. */
function equippedView(save: SaveData): Pick<LoadoutPickView, 'protocols' | 'protocolPicks'> {
  const { equipped, picks } = equippedProtocols(save);
  const protocolPicks: Record<string, string> = {};
  for (const id of equipped) {
    const tower = picks[id];
    if (tower !== undefined) protocolPicks[id] = tower;
  }
  return { protocols: equipped, protocolPicks };
}

/**
 * The pick as the save's typed ids (unknown ids dropped), in its build-slot order, with its
 * protocols to equip.
 */
function typed(c: Context, pick: LoadoutPickView): LoadoutPick {
  const owned = c.save.unlocks.protocols;
  const equipped = pick.protocols.flatMap((p) => owned.filter((o) => o === p));
  const picks: Partial<Record<ProtocolId, TowerId>> = {};
  for (const id of equipped) {
    const tower = c.pools.towers.find((t) => t === pick.protocolPicks[id]);
    if (tower !== undefined) picks[id] = tower;
  }
  return {
    towers: pick.towers.flatMap((t) => c.pools.towers.filter((o) => o === t)),
    ability: c.pools.abilities.find((a) => a === pick.ability) ?? null,
    equip: { equipped, picks },
  };
}

/** Toggles a tower in the pick (meta/loadout.ts toggleTower: up to four, in build-slot order). */
export function togglePickTower(pick: LoadoutPickView, tower: string): LoadoutPickView {
  if (ctx === null) return pick;
  const pools: LoadoutPools<string, string> = ctx.pools;
  const next = toggleTower(pick, tower, pools);
  return next === pick ? pick : { ...pick, towers: next.towers };
}

/**
 * Toggles a Field Protocol (meta/loadout.ts toggleProtocol: on while a slot is free; with one full
 * slot, a swap). Unchanged when every slot is full. A protocol that takes a tower (Specialist)
 * starts on the pick's first tower.
 */
export function togglePickProtocol(pick: LoadoutPickView, id: string): LoadoutPickView {
  const view = loadout.value;
  if (ctx === null || view === null || !view.protocols.some((p) => p.id === id)) return pick;
  const protocols = toggleProtocol(pick.protocols, id, view.protocolSlots);
  if (protocols === pick.protocols) return pick;
  const protocolPicks: Record<string, string> = {};
  for (const p of protocols) {
    if (!takesTowerPick(p)) continue;
    const tower = pick.protocolPicks[p] ?? pick.towers[0] ?? view.towers[0]?.id;
    if (tower !== undefined) protocolPicks[p] = tower;
  }
  return { ...pick, protocols, protocolPicks };
}

/** Sets the tower an equipped tower-pick protocol (Specialist) takes: any tower in the pool. */
export function setProtocolTower(
  pick: LoadoutPickView,
  protocol: string,
  tower: string,
): LoadoutPickView {
  if (ctx === null || !pick.protocols.includes(protocol)) return pick;
  if (!ctx.pools.towers.some((t) => t === tower)) return pick;
  return { ...pick, protocolPicks: { ...pick.protocolPicks, [protocol]: tower } };
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
