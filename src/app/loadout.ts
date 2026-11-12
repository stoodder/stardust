// The loadout screen's app side (T201; design/core-loop.md § 1): builds its view from the save in
// play and the map (ui/screens/loadoutView.ts), and answers the screen's questions while it's open
// (toggling a tower or a Field Protocol, the links a pick forms, the counters it leaves
// unanswered) through the pure rules in meta/loadout.ts. Locking a pick in writes it as the map's
// preset and equips its protocols save-wide (app/save.ts); the battle reads both back through
// battleConfig (app/battleSetup.ts), so a retry keeps them too. The screen serves the campaign's
// maps and the post-game's (Endless, the challenges; T803d), and bends to the run's rules
// (sim/rules.ts): Short-Handed's 3-tower cap (T860), a challenge's faction (T862: the other towers
// stay home, greyed with why), Radio Silence's dark slot 1, No Protocols.
import { CAMPAIGN, CAMPAIGN_PLAN } from '../content/campaign.ts';
import { POST_GAME_MAPS } from '../content/postGame.ts';
import type { CompiledContent, CompiledMapDef } from '../content/compiled.ts';
import { LINKS } from '../content/links/index.ts';
import { MAX_LOADOUT } from '../content/rules.ts';
import { technicianOffBeside } from '../content/technician.ts';
import type {
  CompanionId,
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
  companionChoices,
  equippedProtocols,
  abilitiesOffOn,
  initialPick,
  linksAmong,
  loadoutPools,
  mapCounters,
  pickedCompanion,
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
  isVeteranModifierId,
  VETERAN_COPY,
  VETERAN_SOURCE_PREFIX,
} from '../meta/index.ts';
import {
  challengeConfig,
  hasRule,
  radioSilent,
  towerFactionRule,
  towerTypeLimit,
  CHALLENGE_SOURCE_PREFIX,
  type SimConfig,
  type SimRule,
  type SimRuleKind,
} from '../sim/index.ts';
import { LIST_PRICE_STATE, priceOf } from './hudViews.ts';
import { silkText } from '../ui/silk.ts';
import {
  loadout,
  type LoadoutAbilityView,
  type LoadoutCompanionView,
  type LoadoutLinkView,
  type LoadoutLockedAbilityView,
  type LoadoutPickView,
  type LoadoutProtocolView,
  type LoadoutRevokedView,
  type LoadoutRulesView,
  type LoadoutTowerView,
  type LoadoutView,
} from '../ui/screens/loadoutView.ts';
import { grantText } from '../ui/screens/storeText.ts';
import { battleConfig, defaultPick, slot1Beside } from './battleSetup.ts';
import { displayName, lockedAbilityReason, towerName, towerRoleText } from './hudText.ts';
import { SPEAKERS } from '../content/dialogue/speakers.ts';
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
 * Stasis Bloom's wider field and sooner pulse (T608), and the Sproing Pad's longer Pin and
 * Marked-first pick (T704).
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
  // The Sproing Pad's: Bounce Chorus's longer Pin, Lookie Here's Marked-first pick (T704).
  if (p.pinSec !== undefined) parts.push(`Pin +${p.pinSec} s`);
  if (p.preferMarked === true) parts.push('leapers pick Marked first');
  return parts.join(', ');
}

/** What the open screen works from: the save it was built for, its pools, and the map. */
interface Context {
  readonly mapId: string;
  readonly save: SaveData;
  readonly pools: LoadoutPools;
  readonly map: LoadoutMap;
  readonly specName: (tower: string, spec: 'a' | 'b') => string | null;
  /** Who may walk with you (the finale's pick list; meta `companionChoices`), else empty. */
  readonly companions: readonly CompanionId[];
  /** The map's own companion when present in slot 2 (no pick list), else null. */
  readonly fixed: CompanionId | null;
  /** The abilities slot 1 can't hold beside each companion (content/technician.ts). */
  readonly offBeside: Readonly<Partial<Record<CompanionId, readonly string[]>>>;
  /** The run's tower limit (4, or a rule's lower one: Short-Handed's 3). */
  readonly max: number;
  /** Whether a tower may deploy on this run (a challenge's faction rule; T862). */
  readonly deploys: (tower: string) => boolean;
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

/** A companion's name as the screen says it ("Ves'thara", "QUILL", "Bramble"). */
export function companionName(id: CompanionId): string {
  // Bramble speaks as `chitterbloom`, whose name plate reads "Bramble" from Act III (speakers.ts).
  if (id === 'bramble') return 'Bramble';
  return SPEAKERS[id].name;
}

/** Why a Technician ability greys beside the companion that brings it (T501): "QUILL brings it". */
export function bringsText(companion: CompanionId): string {
  return `${companionName(companion)} brings it`;
}

/**
 * Whose ability `id` was, as the loadout's Technician card says it, when the story made it the
 * Technician's (T731; `unlocks.inheritedAbilities`: "QUILL's" Time Dilation under C4 Keep,
 * "Bricks's" Suppressing Fire from Gerald's mail); null otherwise.
 */
export function inheritedFrom(
  save: Pick<SaveData, 'unlocks'>,
  id: string,
  companion: string | null,
): string | null {
  const inherited: readonly string[] = save.unlocks.inheritedAbilities ?? [];
  if (!inherited.includes(id) || companion === null) return null;
  const speakers: Readonly<Record<string, { readonly name: string } | undefined>> = SPEAKERS;
  const name = Object.hasOwn(speakers, companion) ? speakers[companion]?.name : undefined;
  return name === undefined ? null : `${name}'s`;
}

function towerView(
  content: CompiledContent<IdSpace>,
  c: Context,
  modifiers: SimConfig<IdSpace>['modifiers'],
  id: TowerId,
  stays: string | null,
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
    // A jailbroken class shows its jailbroken art (T731; towers.md § 9).
    ...(c.save.unlocks.jailbroken.includes(id) ? { jailbroken: true } : {}),
    ...(stays === null ? {} : { stays }),
  };
}

/**
 * Whether the loadout screen serves `mapId`: a registered campaign map, or a registered post-game
 * map (Endless, a challenge: T803d; picking four is the whole game there too). A dev battle's
 * towers aren't the save's, so never one of those.
 */
export function isLoadoutMap(mapId: string): boolean {
  const campaignMaps: readonly string[] = CAMPAIGN;
  if (campaignMaps.includes(mapId)) return true;
  return POST_GAME_MAPS.some((m) => m.id === mapId);
}

/**
 * The name a rule goes by on the screen, from its source: a veteran modifier's ("Short-Handed"),
 * or the challenge map's own ("Skitterkin Only"); null for one the screen can't name.
 */
function ruleName(rule: SimRule, content: CompiledContent<IdSpace>): string | null {
  const source = rule.source;
  if (source.startsWith(VETERAN_SOURCE_PREFIX)) {
    const id = source.slice(VETERAN_SOURCE_PREFIX.length);
    return isVeteranModifierId(id) ? VETERAN_COPY[id].name : null;
  }
  if (source.startsWith(CHALLENGE_SOURCE_PREFIX)) {
    const maps: Readonly<Record<string, CompiledMapDef<IdSpace> | undefined>> = content.maps;
    const id = source.slice(CHALLENGE_SOURCE_PREFIX.length);
    return Object.hasOwn(maps, id) ? (maps[id]?.challenge?.name ?? null) : null;
  }
  return null;
}

/** The name of `cfg`'s first rule of `kind`, else a plain fallback. */
function ruleNamed(cfg: SimConfig<IdSpace>, kind: SimRuleKind, fallback: string): string {
  const rule = (cfg.rules ?? []).find((r) => r.kind === kind);
  return (rule === undefined ? null : ruleName(rule, cfg.content)) ?? fallback;
}

/** What `cfg`'s rules do to the pick, in words, or null when it carries none that bite here. */
export function rulesView(cfg: SimConfig<IdSpace>): LoadoutRulesView | null {
  const limit = towerTypeLimit(cfg);
  const cap =
    limit !== null && limit < MAX_LOADOUT ? ruleNamed(cfg, 'maxTowerTypes', 'Run rule') : null;
  const noAbilities = radioSilent(cfg)
    ? `${ruleNamed(cfg, 'noAbilities', 'Radio Silence')}: slot 1 stays dark this shift`
    : null;
  const noProtocols = hasRule(cfg, 'noProtocols')
    ? `${ruleNamed(cfg, 'noProtocols', 'No Protocols')}: none apply this shift`
    : null;
  return cap === null && noAbilities === null && noProtocols === null
    ? null
    : { cap, noAbilities, noProtocols };
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
  // Campaign and post-game maps only: a dev battle's towers aren't the save's.
  if (save === null || !isLoadoutMap(mapId)) return false;
  const saved = configFor(mapId, save);
  if (saved === null) return false;
  // The run's rules as the battle will meet them: a veteran replay's (battleConfig applies them)
  // and a challenge map's (createSim applies them; T862).
  const cfg = challengeConfig(saved);
  const content = cfg.content;
  const map = content.maps[mapId]!; // battleConfig found it
  // Slot 1 leaves out what the map locks under the save's flags (A3M5's System Reboot, Rewrite).
  const off = abilitiesOffOn(map, save);
  const pools = loadoutPools(save, [], off);
  // The finale's companion pick (QUILL gone under C4 Purge; the first, Ves'thara, by default).
  const companions = companionChoices(save, map.companion);
  // The run's tower limit (Short-Handed's 3; T860), and its faction (a challenge's; T862).
  const max = Math.min(MAX_LOADOUT, towerTypeLimit(cfg) ?? MAX_LOADOUT);
  const faction = towerFactionRule(cfg);
  const factionOf: Readonly<Record<string, { readonly faction: string } | undefined>> =
    content.towers;
  const deploys = (tower: string): boolean =>
    faction === null || factionOf[tower]?.faction === faction;
  const staysText =
    faction === null ? null : silkText(`Stays home: ${ruleNamed(cfg, 'towerFaction', 'Rules')}`);
  // A map's one companion, present in slot 2, brings its ability too (A1M5's Bricks beside an
  // inherited Suppressing Fire); an absent one brings nothing.
  const fixed =
    companions.length === 0 && cfg.abilities.slot2State === 'present' ? cfg.companion : null;
  const offBeside: Partial<Record<CompanionId, readonly string[]>> = {};
  for (const id of fixed === null ? companions : [fixed]) {
    offBeside[id] = technicianOffBeside(content.abilities, id);
  }
  const c: Context = {
    mapId,
    save,
    pools,
    map: loadoutMap(map, cfg.abilities.slot2),
    specName: (tower, spec) => content.towers[tower]?.specs?.[spec].name ?? null,
    companions,
    fixed,
    offBeside,
    max,
    deploys,
  };
  ctx = c;
  const required: readonly string[] = map.requiredCounters;
  const shift = CAMPAIGN_PLAN.findIndex((m) => m.id === mapId);
  const slot2 = cfg.abilities.slot2;
  const owned = (pools.protocols ?? []).flatMap((p) =>
    save.unlocks.protocols.filter((o) => o === p),
  );
  const offered = owned.map((o) => protocolView(o, map.objective));
  const remembered = initialPick(save, mapId, defaultPick(save, map.builds.parBuild, off), off);
  // Fitted to the run's rules: only towers that deploy, the first `max` in build-slot order (as
  // Short-Handed keeps them); none left, the pool's first that do.
  const fitted = remembered.towers.filter(deploys);
  const first = {
    ...remembered,
    towers: (fitted.length > 0 ? fitted : pools.towers.filter(deploys)).slice(0, max),
  };
  const companion = companions.length === 0 ? null : pickedCompanion(save, mapId, companions);
  const beside = companion ?? fixed;
  const start = {
    ...first,
    // Slot 1 starts off what the companion brings (T501: Time Dilation beside QUILL).
    ...(beside === null
      ? {}
      : { ability: slot1Beside(content, first.ability, beside, pools.abilities) }),
    ...(companion === null ? {} : { companion }),
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
    towers: pools.towers.map((id) =>
      towerView(content, c, cfg.modifiers, id, deploys(id) ? null : staysText),
    ),
    revoked: save.unlocks.revokedTowers.flatMap((id): LoadoutRevokedView[] => {
      const def = content.towers[id];
      return def === undefined ? [] : [{ id, name: silkText(def.name), icon: def.sprites.icon }];
    }),
    abilities: pools.abilities.map((id): LoadoutAbilityView => {
      const def = content.abilities[id]!; // pool abilities are registered (validateSave)
      const from = inheritedFrom(save, id, def.companion);
      // Its own companion on the pick list brings it in slot 2: slot 1 greys it beside them.
      const brings = (fixed === null ? companions : [fixed]).find(
        (k) => offBeside[k]?.includes(id) === true,
      );
      return {
        id,
        name: silkText(def.name),
        icon: def.sprites.icon,
        answers: abilityAnswers(id, c.map).map((k) => COUNTER_LABELS[k]),
        ...(from === null ? {} : { inheritedFrom: silkText(from) }),
        ...(brings === undefined
          ? {}
          : { brings: { companion: brings, reason: silkText(bringsText(brings)) } }),
      };
    }),
    // What the map locks under the save's story (T731: A3M5's System Reboot under Rewrite), as
    // cards to read, with why.
    lockedAbilities: off.flatMap((id): LoadoutLockedAbilityView[] => {
      const ownedAbilities: readonly string[] = save.unlocks.abilities;
      const def = Object.hasOwn(content.abilities, id) ? content.abilities[id] : undefined;
      return def === undefined || !ownedAbilities.includes(id)
        ? []
        : [
            {
              id,
              name: silkText(def.name),
              icon: def.sprites.icon,
              reason: silkText(lockedAbilityReason(id)),
            },
          ];
    }),
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
    // The pick list (each with the ability they bring), when the map has one.
    ...(companions.length === 0
      ? {}
      : {
          companions: companions.map((id): LoadoutCompanionView => {
            const ability = Object.values(content.abilities).find((a) => a.companion === id);
            return {
              id,
              name: silkText(companionName(id)),
              ability: silkText(ability?.name ?? ''),
              icon: ability?.sprites.icon ?? '',
            };
          }),
        }),
    protocols,
    protocolSlots: pools.protocolSlots ?? 0,
    initial: { ...start, ...bench.pick },
    max,
    ...((): { rules?: LoadoutRulesView } => {
      const rules = rulesView(cfg);
      return rules === null ? {} : { rules };
    })(),
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
  const companion = c.companions.find((k) => k === pick.companion) ?? null;
  return {
    towers: pick.towers.flatMap((t) => c.pools.towers.filter((o) => o === t)),
    ability: c.pools.abilities.find((a) => a === pick.ability) ?? null,
    equip: { equipped, picks },
    ...(companion === null ? {} : { companion }),
  };
}

/**
 * Whether `ability` greys in slot 1 for the pick's companion, or the map's own present one (T501;
 * content/technician.ts): the companion brings it in slot 2 ("QUILL brings it").
 */
export function abilityGreyed(pick: Pick<LoadoutPickView, 'companion'>, ability: string): boolean {
  const c = ctx;
  if (c === null) return false;
  const k = c.fixed ?? c.companions.find((id) => id === pick.companion);
  return k !== undefined && (c.offBeside[k]?.includes(ability) ?? false);
}

/**
 * Picks who walks with you (the finale): the pick's companion, with slot 1 moved off an ability
 * they bring (to the first one that doesn't clash). Unchanged for a companion the list doesn't
 * offer.
 */
export function pickCompanion(pick: LoadoutPickView, id: string): LoadoutPickView {
  const c = ctx;
  if (c === null) return pick;
  const k = c.companions.find((x) => x === id);
  if (k === undefined || k === pick.companion) return pick;
  const off = c.offBeside[k] ?? [];
  const ability =
    pick.ability !== null && off.includes(pick.ability)
      ? (c.pools.abilities.find((a) => !off.includes(a)) ?? null)
      : pick.ability;
  return { ...pick, companion: k, ability };
}

/** Picks the Technician's ability, unless the pick's companion brings it (T501: greyed). */
export function pickAbility(pick: LoadoutPickView, id: string): LoadoutPickView {
  if (abilityGreyed(pick, id) || pick.ability === id) return pick;
  return { ...pick, ability: id };
}

/**
 * Toggles a tower in the pick (meta/loadout.ts toggleTower: up to four, in build-slot order), never
 * past the run's limit (Short-Handed's 3) and never a tower the run leaves home (a challenge's).
 */
export function togglePickTower(pick: LoadoutPickView, tower: string): LoadoutPickView {
  if (ctx === null) return pick;
  const adding = !pick.towers.includes(tower);
  // A tower the run leaves home (T862), or one past the run's limit (Short-Handed; T860).
  if (adding && (!ctx.deploys(tower) || pick.towers.length >= ctx.max)) return pick;
  const pools: LoadoutPools<string, string> = ctx.pools;
  const from = { towers: pick.towers, ability: pick.ability };
  const next = toggleTower(from, tower, pools);
  return next === from ? pick : { ...pick, towers: next.towers };
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
      .filter((t) => t.stays === undefined)
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
