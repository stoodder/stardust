// Content validation: the design rules types and compile can't express. compileContent() runs it
// first and throws one ContentCompileError listing every validation and compile problem, so
// invalid content never compiles. Each error reads `[rule] where: message`.
//
// This file and its parts are the home of the list of checks (architecture.md § Validation is a
// summary). The rules themselves are owned by the design docs, and their values by rules.ts.
//
// Checked here:
// - [sprites], [palettes]: sprite grids (sprites/validate.ts) and the palette rules
//   (palettes/validate.ts: master colors, the Hollow hue reservation, path vs pad contrast).
// - [sprite-ref]: content names registered sprites of the right category.
// - [tower-range], [enemy-range], [ability-range]: numbers are in range on every resolved tier.
// - [enemy-traits]: traits match the enemy's data (flying ⇔ air layer, armored ⇔ armor, shielded
//   ⇔ shield, burrowing ⇔ `burrow`, splitting ⇔ `split`, huddle ⇔ `huddle`, the `carrier` tell ⇔
//   `carrier`, the `boss` tell ⇔ `boss`), and every trait shows its tell (enemies.md § 1, rule 1).
// - [enemy-ability]: enemy abilities and bosses (T300a; enemies.md § 5–6) name enemies that exist
//   (never themselves), with sane numbers: a boss's phases start at full HP and fall, it ends at
//   or below its last phase, and it pays no bounty; a neutral unit (Gerald) leaks and pays 0 and
//   has no trait but flying. TODO(T304c): boss tells ≥ BOSS_MIN_TELL_SEC once boss abilities carry tells.
// - [jammer-source]: only the listed jammers jam (enemies.md § 4).
// - [companion]: at most one ability per companion (its slot-2 signature).
// - [campaign]: no map twice.
// - [purchasable]: reference profiles are affordable and available in time (validatePurchasable.ts).
// - Maps (validateMap.ts), builds (validateBuilds.ts), and medals and conditions
//   (validateMedals.ts): see their headers.
//
// Feature guards ([feature]): content that needs a system that doesn't exist yet is refused
// rather than silently mis-simulated: non-Defend objectives (T305; Escort safe exits). M3's new
// mechanics (flyers, enemy abilities, bosses, wreckage, objectives, the new ability effects) are
// refused at createSim instead, per feature (sim/gates.ts FEATURE_GATES), so their content can be
// registered ahead of the task that runs it.
import { mergePatch } from './compileHelpers.ts';
import { validatePalettes } from './palettes/validate.ts';
import { ENV_PALETTE_IDS } from './palettes/env.ts';
import { PALETTES, PALETTE_IDS } from './palettes/index.ts';
import {
  CHILL_CAP,
  COUNTER_ANSWERS,
  HASTE_CAP,
  JAMMER_ENEMIES,
  MAX_STATUS_PCT,
  TRAIT_TELL,
  type CounterAnswers,
} from './rules.ts';
import { SPRITES } from './sprites/index.ts';
import type { SpriteDef } from './sprites/types.ts';
import { validateSprites } from './sprites/validate.ts';
import type {
  AbilityDef,
  AttackDef,
  CounterId,
  EnemyDef,
  IdSpace,
  RawContent,
  TierDef,
  TowerDef,
} from './types.ts';
import { validateCampaignMaps } from './validateMap.ts';
import { validateMedals } from './validateMedals.ts';
import { validatePurchasable, type PurchaseRules } from './validatePurchasable.ts';
import {
  Issues,
  duplicates,
  isNonNegative,
  isNonNegativeInt,
  isPositive,
  isPositiveInt,
} from './validateHelpers.ts';

/** The rule data validation reads; tests swap in fixture answer lists. */
export interface ValidationRules {
  /** Which towers and abilities answer each counter category (rules.ts COUNTER_ANSWERS). */
  readonly counterAnswers: Readonly<Record<CounterId, CounterAnswers>>;
  /** The catalog and campaign plan for [purchasable]; default LIVE_PURCHASE_RULES. */
  readonly purchases?: PurchaseRules;
}
export const DEFAULT_VALIDATION_RULES: ValidationRules = { counterAnswers: COUNTER_ANSWERS };

/** Every validation problem in the content; empty when it is valid. Never throws. */
export function validate<K extends IdSpace>(
  raw: RawContent<K>,
  rules: ValidationRules = DEFAULT_VALIDATION_RULES,
): string[] {
  const issues = new Issues();
  issues.errors.push(...artErrors());
  for (const def of Object.values<TowerDef>(raw.towers)) validateTower(issues, def);
  const enemyIds: ReadonlySet<string> = new Set(Object.keys(raw.enemies));
  for (const def of Object.values<EnemyDef>(raw.enemies)) validateEnemy(issues, def, enemyIds);
  const abilities = Object.values<AbilityDef>(raw.abilities);
  for (const def of abilities) validateAbility(issues, def);
  validateCompanionAbilities(issues, abilities);
  for (const id of duplicates(raw.campaign)) {
    issues.add('campaign', 'campaign', `map '${id}' is listed more than once`);
  }
  validateCampaignMaps(issues, raw, rules);
  validateMedals(issues, raw);
  validatePurchasable(issues, raw, rules.purchases);
  return issues.errors;
}

// ── Art ──────────────────────────────────────────────────────────────────────────────────────

let artCache: readonly string[] | null = null;

/** Sprite and palette errors. The art registries are static, so this runs once per process. */
function artErrors(): readonly string[] {
  artCache ??= [
    ...validateSprites(SPRITES, PALETTE_IDS).map((e) => `[sprites] ${e}`),
    ...validatePalettes({ palettes: PALETTES, envIds: ENV_PALETTE_IDS, sprites: SPRITES }).map(
      (e) => `[palettes] ${e}`,
    ),
  ];
  return artCache;
}

const SPRITE_IDS: ReadonlySet<string> = new Set(SPRITES.map((s: SpriteDef) => s.id));
function checkSprite(issues: Issues, id: string, category: string, where: string): void {
  if (!id.startsWith(`${category}.`)) {
    issues.add('sprite-ref', where, `'${id}' must be a '${category}.*' sprite`);
  } else if (!SPRITE_IDS.has(id)) {
    issues.add('sprite-ref', where, `'${id}' is not a registered sprite`);
  }
}

// ── Towers ───────────────────────────────────────────────────────────────────────────────────

/** Attack kinds that pick a target, so they need a default priority. */
const TARGETED_KINDS: ReadonlySet<string> = new Set([
  'hitscan',
  'projectile',
  'lobbed',
  'beam',
  'chain',
]);

function validateTower(issues: Issues, def: TowerDef): void {
  const where = `towers.${def.id}`;
  checkSprite(issues, def.sprites.base, 'tower', `${where}.sprites.base`);
  if (def.sprites.head !== undefined) {
    checkSprite(issues, def.sprites.head, 'tower', `${where}.sprites.head`);
  }
  checkSprite(issues, def.sprites.icon, 'icon', `${where}.sprites.icon`);
  for (const [p, w] of projectileSprites(def)) checkSprite(issues, p, 'projectile', `${where}${w}`);
  if (def.lightRadiusTiles !== undefined && !isPositive(def.lightRadiusTiles)) {
    issues.add('tower-range', `${where}.lightRadiusTiles`, 'must be > 0');
  }
  // Ranges are checked on each resolved tier (the patches merged as compile merges them), so a
  // patch can't break a value it doesn't mention.
  const [t1, p2, p3] = def.tiers;
  const t2 = resolve(t1, p2);
  const t3 = resolve(t2, p3);
  const tiers: [TierDef, number, string][] = [
    [t1, t1.cost, `${where}.tiers[0]`],
    [t2, p2.cost, `${where}.tiers[1]`],
    [t3, p3.cost, `${where}.tiers[2]`],
  ];
  if (def.specs !== undefined) {
    tiers.push([resolve(t3, def.specs.a), def.specs.a.cost, `${where}.specs.a`]);
    tiers.push([resolve(t3, def.specs.b), def.specs.b.cost, `${where}.specs.b`]);
  }
  for (const [tier, cost, w] of tiers) validateTier(issues, tier, cost, w);
}

function resolve(base: TierDef, patch: object): TierDef {
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- the compile merge rule; compile checks completeness
  return mergePatch(base, patch) as TierDef;
}

function validateTier(issues: Issues, tier: TierDef, cost: number, where: string): void {
  const bad = (field: string, msg: string): void =>
    issues.add('tower-range', `${where}${field}`, msg);
  if (!isPositiveInt(cost)) bad('.cost', `${String(cost)} must be a whole number of credits > 0`);
  const a = tier.attack;
  if (a !== undefined) {
    if (a.kind !== 'spawner' && !tier.targets.ground && !tier.targets.air) {
      bad('.targets', 'an attacking tier must target ground, air, or both');
    }
    if (TARGETED_KINDS.has(a.kind) && tier.defaultPriority === null) {
      bad('.defaultPriority', `a '${a.kind}' attack picks a target, so it needs a priority`);
    }
    if (a.kind === 'pulse' && tier.defaultPriority !== null) {
      bad('.defaultPriority', "a 'pulse' attack hits everything in range; it must be null");
    }
    validateAttack(bad, a);
  } else if (tier.defaultPriority !== null && (tier.auras ?? []).length > 0) {
    bad('.defaultPriority', 'a support tower picks no target; it must be null');
  }
  for (const [i, e] of (tier.effects ?? []).entries()) {
    const w = `.effects[${i}]`;
    if ('pct' in e) {
      const max = MAX_STATUS_PCT[e.status] ?? 1;
      if (!isPositive(e.pct) || e.pct > max) bad(`${w}.pct`, `${e.pct} must be in (0, ${max}]`);
    }
    if ('durationSec' in e && !isPositive(e.durationSec)) bad(`${w}.durationSec`, 'must be > 0');
    if (e.status === 'corroded') {
      if (!isPositiveInt(e.stacks) || !isPositiveInt(e.maxStacks) || e.stacks > e.maxStacks) {
        bad(w, 'stacks and maxStacks must be whole numbers ≥ 1, with stacks ≤ maxStacks');
      }
    }
  }
  for (const [i, au] of (tier.auras ?? []).entries()) {
    if (!isPositive(au.radiusTiles)) bad(`.auras[${i}].radiusTiles`, 'must be > 0');
    if (!isPositive(au.pct)) bad(`.auras[${i}].pct`, 'must be > 0');
  }
}

/** Attack field rules: [field, holds, what it must be]. Only fields present are checked. */
const ATTACK_RULES: readonly [string, (v: unknown) => boolean, string][] = [
  ['damage', isNonNegative, 'must be ≥ 0'],
  ['rangeTiles', isPositive, 'must be > 0'],
  ['armorPierce', isNonNegativeInt, 'must be a whole number ≥ 0'],
  ['spinUpSec', isNonNegative, 'must be ≥ 0'],
  ['speedTilesPerSec', isPositive, 'must be > 0'],
  ['flightSec', isPositive, 'must be > 0'],
  ['splashTiles', isPositive, 'must be > 0'],
  ['tickSec', isPositive, 'must be > 0'],
  ['jumps', isPositiveInt, 'must be a whole number ≥ 1'],
  ['jumpRangeTiles', isPositive, 'must be > 0'],
  ['falloffPct', (v) => typeof v === 'number' && v >= 0 && v < 1, 'must be in [0, 1)'],
  ['maxAlive', isPositiveInt, 'must be a whole number ≥ 1'],
];

function validateAttack(bad: (field: string, msg: string) => void, a: AttackDef): void {
  // A field compile finds missing is reported there, so only present fields are checked here.
  // ratePerSec and negative durations are compile errors too, so they aren't repeated.
  const fields = new Map<string, unknown>(Object.entries(a));
  for (const [field, holds, what] of ATTACK_RULES) {
    if (fields.has(field) && !holds(fields.get(field))) bad(`.attack.${field}`, what);
  }
  const min = a.minRangeTiles;
  if (min !== undefined && (!isNonNegative(min) || min >= a.rangeTiles)) {
    bad('.attack.minRangeTiles', `${min} must be ≥ 0 and below rangeTiles (${a.rangeTiles})`);
  }
}

/** Projectile sprites as authored (each once, not once per tier that inherits it). */
function projectileSprites(def: TowerDef): [id: string, where: string][] {
  const out: [string, string][] = [];
  const visit = (a: unknown, w: string): void => {
    if (typeof a === 'object' && a !== null && 'projectile' in a) {
      if (typeof a.projectile === 'string') out.push([a.projectile, `${w}.attack.projectile`]);
    }
  };
  for (const [i, t] of def.tiers.entries()) visit(t.attack, `.tiers[${i}]`);
  if (def.specs !== undefined) {
    visit(def.specs.a.attack, '.specs.a');
    visit(def.specs.b.attack, '.specs.b');
  }
  return out;
}

// ── Enemies ──────────────────────────────────────────────────────────────────────────────────

function validateEnemy(issues: Issues, def: EnemyDef, enemyIds: ReadonlySet<string>): void {
  const where = `enemies.${def.id}`;
  checkSprite(issues, def.sprites.body, 'enemy', `${where}.sprites.body`);
  checkSprite(issues, def.sprites.icon, 'icon', `${where}.sprites.icon`);
  const bad = (field: string, msg: string): void =>
    issues.add('enemy-range', `${where}.${field}`, msg);
  if (!isPositive(def.hp)) bad('hp', 'must be > 0');
  if (!isNonNegative(def.armor)) bad('armor', 'must be ≥ 0');
  if (def.shield !== undefined) {
    if (!isPositive(def.shield.hp)) bad('shield.hp', 'must be > 0');
    if (!isNonNegative(def.shield.regenPerSec)) bad('shield.regenPerSec', 'must be ≥ 0');
  }
  if (!isPositive(def.speedTilesPerSec)) bad('speedTilesPerSec', 'must be > 0');
  if (!isNonNegativeInt(def.leak)) bad('leak', 'must be a whole number ≥ 0');
  if (!isNonNegativeInt(def.bounty)) bad('bounty', 'must be a whole number ≥ 0');
  if (!isPositive(def.spawnIntervalSec)) bad('spawnIntervalSec', 'must be > 0');
  if (def.restValue !== undefined && !isPositive(def.restValue)) bad('restValue', 'must be > 0');

  const traits = (field: string, msg: string): void =>
    issues.add('enemy-traits', `${where}.${field}`, msg);
  for (const t of duplicates(def.traits)) traits('traits', `'${t}' is listed twice`);
  for (const t of duplicates(def.tells)) traits('tells', `'${t}' is listed twice`);
  for (const t of def.traits) {
    if (!def.tells.includes(TRAIT_TELL[t])) {
      traits('tells', `trait '${t}' needs its tell '${TRAIT_TELL[t]}'`);
    }
  }
  const has = (t: (typeof def.traits)[number]): boolean => def.traits.includes(t);
  if (has('flying') !== (def.layer === 'air')) {
    traits('traits', `'flying' goes with layer 'air' (layer is '${def.layer}')`);
  }
  if (has('armored') !== def.armor > 0) {
    traits('traits', `'armored' goes with armor > 0 (armor is ${def.armor})`);
  }
  if (has('shielded') !== (def.shield !== undefined)) {
    traits('traits', "'shielded' goes with a shield");
  }
  if (def.carrier !== undefined && !isPositiveInt(def.carrier.young)) {
    bad('carrier.young', 'must be a whole number ≥ 1');
  }
  if (def.tells.includes('carrier') !== (def.carrier !== undefined)) {
    traits('tells', "the 'carrier' tell goes with `carrier` (a sack that bursts on death)");
  }
  if (has('burrowing') !== (def.burrow !== undefined)) {
    traits('traits', "'burrowing' goes with `burrow`");
  }
  if (has('splitting') !== (def.split !== undefined)) {
    traits('traits', "'splitting' goes with `split`");
  }
  if (has('huddle') !== (def.huddle !== undefined)) traits('traits', "'huddle' goes with `huddle`");
  if (def.tells.includes('boss') !== (def.boss !== undefined)) {
    traits('tells', "the 'boss' tell goes with `boss`");
  }
  validateEnemyAbilities(issues, def, enemyIds);
  if (has('jammer') && !JAMMER_ENEMIES.includes(def.id)) {
    issues.add(
      'jammer-source',
      `${where}.traits`,
      `only ${JAMMER_ENEMIES.join(', ')} may jam (adding a jammer needs a decision entry)`,
    );
  }
}

/** [enemy-ability]: burrow, split, huddle, boss, and neutral (enemies.md § 5–6; T300a). */
function validateEnemyAbilities(
  issues: Issues,
  def: EnemyDef,
  enemyIds: ReadonlySet<string>,
): void {
  const where = `enemies.${def.id}`;
  const bad = (field: string, msg: string): void =>
    issues.add('enemy-ability', `${where}.${field}`, msg);
  const child = (field: string, id: string, count: number): void => {
    if (!enemyIds.has(id)) bad(`${field}.enemy`, `unknown enemy '${id}'`);
    else if (id === def.id) bad(`${field}.enemy`, 'an enemy may not spawn itself');
    if (!isPositiveInt(count)) bad(`${field}.count`, 'must be a whole number ≥ 1');
  };
  const huddle = (field: string, h: { radiusTiles: number; regenPerSec: number }): void => {
    if (!isPositive(h.radiusTiles)) bad(`${field}.radiusTiles`, 'must be > 0');
    if (!isNonNegative(h.regenPerSec)) bad(`${field}.regenPerSec`, 'must be ≥ 0');
  };
  const b = def.burrow;
  if (b !== undefined) {
    if (!isPositive(b.everySec)) bad('burrow.everySec', 'must be > 0');
    if (!isPositive(b.durationSec)) bad('burrow.durationSec', 'must be > 0');
    if (!isPositive(b.speedMul)) bad('burrow.speedMul', 'must be > 0');
    if (!isNonNegative(b.tellSec)) bad('burrow.tellSec', 'must be ≥ 0');
  }
  if (def.split !== undefined) child('split', def.split.enemy, def.split.count);
  if (def.huddle !== undefined) huddle('huddle', def.huddle);
  const threats = def.traits.filter((t) => t !== 'flying');
  if (def.neutral === true && (def.leak !== 0 || def.bounty !== 0 || threats.length > 0)) {
    bad('neutral', 'a neutral unit leaks 0, pays 0, and has no trait but flying (core-loop § 2.7)');
  }
  const boss = def.boss;
  if (boss === undefined) return;
  if (def.bounty !== 0) bad('bounty', 'a boss pays no bounty (its wave bonus is tripled)');
  if (boss.phases.length === 0) bad('boss.phases', 'a boss has at least one phase');
  let last = Infinity;
  for (const [i, p] of boss.phases.entries()) {
    const w = `boss.phases[${i}]`;
    if (i === 0 ? p.fromPct !== 1 : !(p.fromPct > 0 && p.fromPct < last)) {
      bad(`${w}.fromPct`, i === 0 ? 'the first phase starts at 1 (full HP)' : 'must fall, > 0');
    }
    last = p.fromPct;
    if (p.spawn !== undefined) {
      child(`${w}.spawn`, p.spawn.enemy, p.spawn.count);
      if (!isPositive(p.spawn.everySec)) bad(`${w}.spawn.everySec`, 'must be > 0');
    }
    if (p.burrow !== undefined) {
      if (!isPositiveInt(p.burrow.times)) bad(`${w}.burrow.times`, 'must be a whole number ≥ 1');
      if (!isPositive(p.burrow.durationSec)) bad(`${w}.burrow.durationSec`, 'must be > 0');
      const s = p.burrow.surfaceSpawn;
      if (s !== undefined) child(`${w}.burrow.surfaceSpawn`, s.enemy, s.count);
    }
    if (p.hastePct !== undefined && !(p.hastePct > 0 && p.hastePct <= HASTE_CAP)) {
      bad(`${w}.hastePct`, `must be in (0, ${HASTE_CAP}]`);
    }
    if (p.huddle !== undefined) huddle(`${w}.huddle`, p.huddle);
  }
  if (!(boss.endAtPct >= 0 && boss.endAtPct < last)) {
    bad('boss.endAtPct', 'must be ≥ 0 and below the last phase');
  }
}

// ── Abilities ────────────────────────────────────────────────────────────────────────────────

function validateAbility(issues: Issues, def: AbilityDef): void {
  const where = `abilities.${def.id}`;
  checkSprite(issues, def.sprites.icon, 'icon', `${where}.sprites.icon`);
  const e = def.effect;
  const bad = (field: string, msg: string): void =>
    issues.add('ability-range', `${where}.${field}`, msg);
  if (def.cooldownWaves === undefined) {
    if (!isPositive(def.cooldownSec)) bad('cooldownSec', 'must be > 0');
  } else if (!isPositiveInt(def.cooldownWaves)) {
    bad('cooldownWaves', 'must be a whole number of waves ≥ 1');
  }
  if (e.kind === 'strike') {
    if (!isNonNegative(e.damage)) bad('effect.damage', 'must be ≥ 0');
    if (!isPositive(e.radiusTiles)) bad('effect.radiusTiles', 'must be > 0');
  } else if (e.kind === 'slowAll') {
    for (const f of ['slowPct', 'bossSlowPct'] as const) {
      if (!(e[f] > 0 && e[f] < 1)) bad(`effect.${f}`, 'must be in (0, 1)');
    }
    if (!isPositive(e.durationSec)) bad('effect.durationSec', 'must be > 0');
  } else if (e.kind === 'discount') {
    if (!(e.pct > 0 && e.pct < 1)) bad('effect.pct', 'must be in (0, 1)');
    if (!isPositiveInt(e.charges)) bad('effect.charges', 'must be a whole number ≥ 1');
  } else {
    if (!isNonNegative(e.damagePerSec)) bad('effect.damagePerSec', 'must be ≥ 0');
    // The slow lands as Chilled (strongest source wins), so it can't pass the chill cap.
    if (!(e.slowPct >= 0 && e.slowPct <= CHILL_CAP)) {
      bad('effect.slowPct', `must be in [0, ${CHILL_CAP}] (it lands as Chilled)`);
    }
    if (!isPositive(e.durationSec)) bad('effect.durationSec', 'must be > 0');
    if (!isPositiveInt(e.lengthTiles) || e.lengthTiles % 2 === 0) {
      bad('effect.lengthTiles', 'must be an odd whole number of tiles (centered on the click)');
    }
  }
}

/** [companion]: at most one ability per companion (its slot-2 signature). */
function validateCompanionAbilities(issues: Issues, defs: readonly AbilityDef[]): void {
  const owner = new Map<string, string>();
  for (const def of defs) {
    if (def.companion === undefined) continue;
    const prev = owner.get(def.companion);
    if (prev !== undefined) {
      issues.add(
        'companion',
        `abilities.${def.id}.companion`,
        `'${def.companion}' already has '${prev}'; a companion has one ability`,
      );
    }
    owner.set(def.companion, def.id);
  }
}
