// A3M4 balance-harness builds: docs/story/campaign/act3.md § A3M4, Par build. Every build arms Hold
// Fire for Gerald's pass before W1 (`holdFireWhile: 'neutral'`: Hold Fire (all) while he is on the
// field, W7), so par never hits him and earns Signature: Received. Bricks's slot is empty, so slot
// 1 (System Reboot) is the only ability; par casts it on the Silencers' tells.
//
// Par (act3.md § A3M4, Par build, as built): Harpoons on the service switchback and the junction's
// south-east corner from W1 (a third over the service tunnel's north run at W3), a Rivet at the
// junction's north-east corner (T3 at W11), a Mindspike below the south-west corner; the Hum Choir
// at W4 on the hall side of that Mindspike (Harmony), where the Silencers can't reach it until
// they're in the corridor, so its aura cuts their jams on the junction to a second (T3 at W10);
// a second Rivet under the Moths' lane at W5, a second Mindspike at the south-west corner at W9.
import { defineBuilds } from '../../define.ts';
import { REFERENCE_PROFILES, REFERENCE_VARIANTS } from '../../upgrades/reference.ts';
import type { BuildStep, GridPos, ScriptedBuild, TowerId } from '../../types.ts';

// The pads (map.ts).
/** The hall junction's four corners. */
const J_NW: GridPos = [10, 7];
const J_NE: GridPos = [12, 7];
const J_SW: GridPos = [10, 9];
const J_SE: GridPos = [12, 9];
/** The Hollow's tunnel (west): inside its switchback, north and south, and beside its down run. */
const TW_N: GridPos = [5, 3];
const TW_S: GridPos = [5, 7];
const TW_E: GridPos = [8, 4];
/** Everglow's service tunnel (east), the same. */
const SV_N: GridPos = [16, 3];
const SV_S: GridPos = [16, 7];
const SV_W: GridPos = [13, 4];
/** The outer bays at each tunnel's mouth. */
const MOUTH_W: GridPos = [1, 4];
const MOUTH_E: GridPos = [20, 4];
/** Either side of the generator. */
const HALL_W: GridPos = [9, 11];
const HALL_E: GridPos = [13, 11];
/** Beside each rift's bay. */
const BAY_W: GridPos = [1, 9];
const BAY_E: GridPos = [20, 9];
/** Under the south-west corner, beside the corridor: it touches J_SW (a link pair). */
const J_S: GridPos = [10, 10];
/** Under the Moths' lane, north of the junction. */
const SKY: GridPos = [11, 5];

/** Hold Fire (all) while Gerald is on the field: every build's first step. */
const HOLD_FOR_GERALD: BuildStep = { wave: 1, holdFireWhile: 'neutral' };

/** System Reboot `afterSec` into `wave` (slot 1; no target). */
const reboot = (wave: number, afterSec: number): BuildStep => ({
  wave,
  ability: 1,
  when: { afterSec },
});

/**
 * `steps` with each tower `swap` names built as its swap instead (same tile, same upgrades), and
 * without System Reboot's casts when `casts` is false.
 */
function swapped(
  steps: readonly BuildStep[],
  swap: Partial<Record<TowerId, TowerId>>,
  casts = true,
): BuildStep[] {
  return steps.flatMap((st): BuildStep[] => {
    if ('ability' in st) return casts ? [st] : [];
    if (!('build' in st)) return [st];
    const to = swap[st.build];
    return [to === undefined ? st : { ...st, build: to }];
  });
}

/**
 * System Reboot as a pack's first tell starts, so that tell fizzles (sim/enemyAbilities/
 * jamTendril.ts). Par casts it in W6, W9, W10, W12, W14 and W16 (40 s apart at least): W4's lone
 * Silencer and W13's and W15's packs fall to the Choir alone. Each wave lists its cast ahead of
 * its buys, and no wave's buys outrun its credits, so a cast never waits behind an upgrade.
 */
const REBOOT_SEC = 27.5;
/** W14's and W16's first packs come up the rifts, so their first tells are sooner. */
const W14_RIFT_REBOOT_SEC = 8.3;
const W16_RIFT_REBOOT_SEC = 17.8;
/** W16's Reboot in the warren's par (its Gloop's junction meets the rift packs later). */
const W16_WARREN_REBOOT_SEC = 16;
/** W16's Reboot held for the tunnel pack instead (the Den alt's: it has no Choir for that one). */
const W16_TUNNEL_REBOOT_SEC = 11.2;
/** W16's Reboot for the Prism alt: its Prisms by the service tunnel meet the rift packs sooner. */
const W16_BEAM_REBOOT_SEC = 13.1;

function parSteps(): BuildStep[] {
  return [
    HOLD_FOR_GERALD,
    { wave: 1, build: 'harpoon', tile: SV_S },
    { wave: 1, build: 'harpoon', tile: J_SE },
    { wave: 1, build: 'rivet', tile: J_NE },
    { wave: 1, upgrade: J_NE },
    { wave: 1, build: 'mindspike', tile: J_S },
    { wave: 3, build: 'harpoon', tile: SV_N },
    // The Choir on the hall side of the Mindspike (Harmony), out of the Silencers' reach until
    // they're in the corridor: its aura cuts their jams on the junction to a second.
    { wave: 4, build: 'choir', tile: HALL_W },
    { wave: 5, build: 'rivet', tile: SKY },
    reboot(6, REBOOT_SEC),
    { wave: 6, upgrade: HALL_W },
    { wave: 7, upgrade: J_SE },
    { wave: 8, upgrade: SV_S },
    reboot(9, REBOOT_SEC),
    { wave: 9, build: 'mindspike', tile: J_SW },
    reboot(10, REBOOT_SEC),
    { wave: 10, upgrade: HALL_W }, // T3: jams in its aura cut by 75%
    { wave: 10, upgrade: J_S },
    { wave: 11, upgrade: J_NE }, // T3: pierce
    reboot(12, REBOOT_SEC),
    { wave: 12, upgrade: J_S },
    { wave: 13, upgrade: J_SW },
    reboot(14, W14_RIFT_REBOOT_SEC),
    reboot(16, W16_RIFT_REBOOT_SEC),
  ];
}

/**
 * The warren's par (its reference owns the Gloop Spitter; act3.md § A3M4): the Gloop where par's
 * junction Rivet stands (its Corroded lets the Harpoons through the plate), a third Harpoon for
 * the drones the Rivet would have pierced, and a Mindspike under the Moths' lane where par's
 * second Rivet stands (the Gloop can't hit air).
 */
function warrenSteps(): BuildStep[] {
  return [
    HOLD_FOR_GERALD,
    { wave: 1, build: 'harpoon', tile: SV_S },
    { wave: 1, build: 'harpoon', tile: J_SE },
    { wave: 1, build: 'gloop', tile: J_NE },
    { wave: 1, build: 'mindspike', tile: J_S },
    { wave: 2, build: 'mindspike', tile: SKY },
    { wave: 3, upgrade: J_SE },
    { wave: 4, build: 'harpoon', tile: SV_N },
    { wave: 5, build: 'choir', tile: HALL_W },
    reboot(6, REBOOT_SEC),
    { wave: 6, upgrade: J_NE },
    { wave: 7, upgrade: HALL_W },
    { wave: 8, upgrade: SV_S },
    reboot(9, REBOOT_SEC),
    { wave: 9, build: 'mindspike', tile: J_SW },
    reboot(10, REBOOT_SEC),
    { wave: 10, upgrade: HALL_W },
    { wave: 10, upgrade: SKY },
    { wave: 11, upgrade: J_S },
    reboot(12, REBOOT_SEC),
    { wave: 12, upgrade: SV_N },
    reboot(13, REBOOT_SEC),
    { wave: 13, upgrade: J_S },
    { wave: 14, upgrade: J_SE },
    { wave: 15, upgrade: J_SW },
    reboot(16, W16_WARREN_REBOOT_SEC),
    { wave: 16, upgrade: SKY },
    { wave: 16, upgrade: SV_S },
  ];
}

const PAR: ScriptedBuild = {
  loadout: ['choir', 'harpoon', 'mindspike', 'rivet'],
  steps: parSteps(),
};

const same = (a: GridPos, b: GridPos): boolean => a[0] === b[0] && a[1] === b[1];

/** `steps` then, at W16, each of `tiles` upgraded to tier 3 and specialized as Bunker Buster. */
function withBunkerBusters(steps: readonly BuildStep[], tiles: readonly GridPos[]): BuildStep[] {
  const tierOf = (tile: GridPos): number =>
    steps.filter(
      (st) => ('build' in st && same(st.tile, tile)) || ('upgrade' in st && same(st.upgrade, tile)),
    ).length;
  const tail = tiles.flatMap((tile): BuildStep[] => [
    ...Array.from({ length: Math.max(0, 3 - tierOf(tile)) }, (): BuildStep => ({
      wave: 16,
      upgrade: tile,
    })),
    { wave: 16, specialize: tile, spec: 'b' },
  ]);
  return [...steps, ...tail];
}

export const builds = defineBuilds({
  // A3M4's reference profile (campaign.md § 4.9): the jailbreak's Rivet back, the Hum Choir from
  // the shelter elders, System Reboot in slot 1, Head Start on (T771). The warren's cell owns its
  // Gloop Spitter too, and its par builds the Gloop wherever the convoy's builds a Rivet.
  referenceProfile: REFERENCE_PROFILES.a3_m04,
  referenceProfileByFlag: REFERENCE_VARIANTS.a3_m04.map((cell) => ({
    ...cell,
    parBuild: { loadout: ['choir', 'harpoon', 'mindspike', 'gloop'], steps: warrenSteps() },
  })),
  parBuild: PAR,
  flagVariants: { door_choice: ['convoy', 'warren'], spared_quiet_wave: [false, true] },
  // A3M4 introduces the jam category (campaign.md § 4.8), so it is a teach map: the no-jam build
  // has to lose only by the final wave (the jams cost it across the Silencer waves, not in one);
  // no-armor and no-air lose by W11 (balance/a3m4.test.ts pins both).
  teachMap: true,
  noCounterLoseByWave: 16,
  noCounterBuilds: {
    // No jam answer: par with a Prism where its Choir stands, Scanner Sweep in slot 1, no casts.
    jam: {
      loadout: ['harpoon', 'mindspike', 'rivet', 'prism'],
      technicianAbility: 'scanner_sweep',
      steps: swapped(PAR.steps, { choir: 'prism' }, false),
    },
    // No armor answer: Zapcoils where par's Harpoons stand, Skyhooks for its Rivets, a Scuttle Den
    // for its Mindspikes (Psionic ignores the Silencers' armor, so it answers armor here).
    armor: {
      loadout: ['choir', 'zapcoil', 'skyhook', 'burrow'],
      steps: swapped(PAR.steps, { harpoon: 'zapcoil', rivet: 'skyhook', mindspike: 'burrow' }),
    },
    // No air answer: Thumpers (Bunker Buster) where par's Harpoons stand, Sprinklers for its
    // Rivets, a Scuttle Den for its Mindspikes: nothing reaches the Moths.
    air: {
      loadout: ['choir', 'thumper', 'burrow', 'sprinkler'],
      steps: withBunkerBusters(
        swapped(PAR.steps, { harpoon: 'thumper', rivet: 'sprinkler', mindspike: 'burrow' }),
        [SV_S, J_SE],
      ),
    },
  },
  altBuilds: {
    // Hum Choir, Prism, Skyhook, Thumper (Bunker Buster): the Prisms' beams carry the armor, the
    // Skyhooks the Moths, a Thumper the screens and (as Bunker Buster) the plate; the Choir and
    // System Reboot the jams.
    beam_and_flak: {
      loadout: ['choir', 'prism', 'skyhook', 'mindspike'],
      steps: [
        HOLD_FOR_GERALD,
        { wave: 1, build: 'prism', tile: J_SE },
        { wave: 1, build: 'prism', tile: SV_S },
        { wave: 1, build: 'mindspike', tile: J_S },
        { wave: 1, build: 'skyhook', tile: SKY },
        { wave: 2, upgrade: J_SE },
        { wave: 3, build: 'prism', tile: SV_N },
        { wave: 4, build: 'choir', tile: HALL_W },
        { wave: 5, upgrade: SKY },
        reboot(6, REBOOT_SEC),
        { wave: 6, upgrade: HALL_W },
        { wave: 7, upgrade: SV_S },
        { wave: 8, upgrade: J_S },
        reboot(9, REBOOT_SEC),
        { wave: 9, upgrade: HALL_W },
        reboot(10, REBOOT_SEC),
        { wave: 10, build: 'mindspike', tile: J_SW },
        { wave: 11, upgrade: SV_N },
        reboot(12, REBOOT_SEC),
        { wave: 12, upgrade: J_SE },
        reboot(13, REBOOT_SEC),
        { wave: 13, upgrade: J_SW },
        { wave: 14, build: 'skyhook', tile: J_NE },
        { wave: 14, upgrade: J_NE },
        { wave: 15, upgrade: SV_S },
        reboot(16, W16_BEAM_REBOOT_SEC),
        { wave: 16, upgrade: J_S },
      ],
    },
    // Harpoon, Mindspike, Scuttle Den, Lookout: no Choir, so System Reboot carries the jam.
    den_and_lookout: {
      loadout: ['harpoon', 'mindspike', 'burrow', 'lookout'],
      steps: [
        HOLD_FOR_GERALD,
        { wave: 1, build: 'harpoon', tile: SV_S },
        { wave: 1, build: 'harpoon', tile: J_SE },
        { wave: 1, build: 'mindspike', tile: J_S },
        { wave: 1, build: 'burrow', tile: J_SW },
        { wave: 2, build: 'harpoon', tile: J_NE },
        { wave: 3, build: 'lookout', tile: HALL_W },
        { wave: 4, upgrade: J_SE },
        { wave: 5, build: 'mindspike', tile: SKY },
        reboot(6, REBOOT_SEC),
        { wave: 6, upgrade: J_S },
        { wave: 7, upgrade: SV_S },
        { wave: 8, build: 'mindspike', tile: J_NW },
        reboot(9, REBOOT_SEC),
        { wave: 9, upgrade: J_NE },
        reboot(10, REBOOT_SEC),
        { wave: 10, upgrade: J_NW },
        { wave: 11, upgrade: J_S },
        reboot(12, REBOOT_SEC),
        { wave: 12, upgrade: J_SE },
        reboot(13, REBOOT_SEC),
        { wave: 13, build: 'mindspike', tile: BAY_W },
        { wave: 14, build: 'mindspike', tile: BAY_E },
        { wave: 14, upgrade: BAY_W },
        { wave: 15, upgrade: BAY_E },
        reboot(16, W16_TUNNEL_REBOOT_SEC),
        { wave: 16, upgrade: J_NE },
      ],
    },
  },
});

/** Pads named for the tests (balance/a3m4.test.ts). */
export const PADS = {
  J_NW,
  J_NE,
  J_SW,
  J_SE,
  TW_N,
  TW_S,
  TW_E,
  SV_N,
  SV_S,
  SV_W,
  MOUTH_W,
  MOUTH_E,
  HALL_W,
  HALL_E,
  BAY_W,
  BAY_E,
  J_S,
  SKY,
} as const;
