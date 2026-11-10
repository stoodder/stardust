// The master palette: every color in the game (docs/art/art-direction.md §2 and §3).
// This file is the home of the hex values. Everything else names colors (`teal.3`), never hex.

// prettier-ignore
export const MASTER = {
  // Neutrals
  'ink.0': '#05030a', 'ink.1': '#0d0a18', 'ink.2': '#181226', 'ink.3': '#251c3a', 'ink.4': '#362a52',
  'steel.0': '#2a3046', 'steel.1': '#434c66', 'steel.2': '#646f8a', 'steel.3': '#929db6', 'steel.4': '#c6cee0',
  'white.0': '#e6ebf5', 'white.1': '#ffffff',
  // Hues
  'red.0': '#2e0718', 'red.1': '#6e0f2c', 'red.2': '#b81d3a', 'red.3': '#f0384a', 'red.4': '#ff8c7e',
  'coral.0': '#3a0e1c', 'coral.1': '#7e2234', 'coral.2': '#c8474a', 'coral.3': '#f47e6a', 'coral.4': '#ffc2a0',
  'orange.0': '#3a1206', 'orange.1': '#8c2e0e', 'orange.2': '#d65c16', 'orange.3': '#ff9430', 'orange.4': '#ffcf7a',
  'gold.0': '#3e2408', 'gold.1': '#8c5c0e', 'gold.2': '#dca61c', 'gold.3': '#ffde46', 'gold.4': '#fff5ac',
  'green.0': '#0a2618', 'green.1': '#155a2c', 'green.2': '#2a9a3c', 'green.3': '#62d64c', 'green.4': '#b6f59e',
  'teal.0': '#04222a', 'teal.1': '#08505c', 'teal.2': '#0e8a92', 'teal.3': '#2cd6cc', 'teal.4': '#9efff0',
  'blue.0': '#08123c', 'blue.1': '#142c86', 'blue.2': '#245cd4', 'blue.3': '#469cff', 'blue.4': '#a6d8ff',
  'violet.0': '#170838', 'violet.1': '#351676', 'violet.2': '#642cbc', 'violet.3': '#9c5cf0', 'violet.4': '#d8acff',
  'pink.0': '#36082c', 'pink.1': '#76125c', 'pink.2': '#c4268c', 'pink.3': '#ff58b4', 'pink.4': '#ffaedd',
  // Materials and skin
  'skin.a.0': '#3a1c16', 'skin.a.1': '#7a3c2a', 'skin.a.2': '#b86a48', 'skin.a.3': '#e8a47a', 'skin.a.4': '#ffd9bc',
  'skin.b.0': '#24120e', 'skin.b.1': '#4e2a1e', 'skin.b.2': '#7e4a32', 'skin.b.3': '#b07a56', 'skin.b.4': '#dcae88',
  'skin.c.0': '#1a0c0a', 'skin.c.1': '#3a1e16', 'skin.c.2': '#5e3424', 'skin.c.3': '#8a5638', 'skin.c.4': '#c0885e',
  'brass.0': '#2a1806', 'brass.1': '#5c3a12', 'brass.2': '#9c6c22', 'brass.3': '#d6a440', 'brass.4': '#f6dc94',
  'patina.0': '#122a24', 'patina.1': '#2c5a4a', 'patina.2': '#4e8a72', 'patina.3': '#86c0a0', 'patina.4': '#c4ecd2',
  'grime.0': '#1a1612', 'grime.1': '#3a3226', 'grime.2': '#5e523e', 'grime.3': '#8a7c62', 'grime.4': '#b8aa8c',
  'hollow.0': '#121214', 'hollow.1': '#26262b', 'hollow.2': '#42424a', 'hollow.3': '#6e6e76', 'hollow.4': '#a8a8ae',
  'acid.0': '#2c3604', 'acid.1': '#4a5a06', 'acid.2': '#9cc214', 'acid.3': '#d8ff3e', 'acid.4': '#f2ffb0',

  // Environment ramps (art-direction §3), namespaced by act.
  // Act I: the Long Afternoon
  'act1.grass.0': '#123a2c', 'act1.grass.1': '#1e6438', 'act1.grass.2': '#348c48', 'act1.grass.3': '#56b056', 'act1.grass.4': '#98d878',
  'act1.clay.0': '#4c2244', 'act1.clay.1': '#7c3a5c', 'act1.clay.2': '#b85c7c', 'act1.clay.3': '#e892a2', 'act1.clay.4': '#ffc6c8',
  'act1.path.0': '#44303e', 'act1.path.1': '#6e5260', 'act1.path.2': '#957470', 'act1.path.3': '#b48e80', 'act1.path.4': '#d8baa2',
  'act1.water.0': '#1c6ab0', 'act1.water.1': '#2e9ae0', 'act1.water.2': '#6ad4f4', 'act1.water.3': '#c2f6ff',
  'act1.sky.0': '#7ccbee', 'act1.sky.1': '#b2e6f8', 'act1.sky.2': '#e2f8ff',
  'act1.shade': '#3a2c5e', 'act1.light': '#fff4dc',
  // Act II: the Long Dusk (grass, clay, and path are shared by act2.gold and act2.dusk). Grass and
  // path sit a value band under Act I's units, as Act I's do (T440c, art-direction §3).
  'act2.grass.0': '#433113', 'act2.grass.1': '#6c4d14', 'act2.grass.2': '#a77a1c', 'act2.grass.3': '#daa534', 'act2.grass.4': '#f9d77c',
  'act2.clay.0': '#3c1630', 'act2.clay.1': '#6c2838', 'act2.clay.2': '#a84638', 'act2.clay.3': '#de7440', 'act2.clay.4': '#ffae62',
  'act2.path.0': '#4a2a32', 'act2.path.1': '#6d4039', 'act2.path.2': '#996746', 'act2.path.3': '#bd8d58', 'act2.path.4': '#debc7e',
  'act2.gold.sky.0': '#ff7a52', 'act2.gold.sky.1': '#ffae52', 'act2.gold.sky.2': '#ffd88c',
  'act2.gold.shade': '#3a1446', 'act2.gold.light': '#ffd49c',
  'act2.dusk.sky.0': '#3a1a5e', 'act2.dusk.sky.1': '#7a3484', 'act2.dusk.sky.2': '#d0587a',
  'act2.dusk.shade': '#1c0c34', 'act2.dusk.light': '#bca0ff',
  // Act III: the Long Night (alarm.0 is red.1 and alarm.3 is red.4; they are not duplicated here)
  'act3.ground.0': '#06040c', 'act3.ground.1': '#120a22', 'act3.ground.2': '#22123c', 'act3.ground.3': '#36195a', 'act3.ground.4': '#522882',
  'act3.crystal.0': '#2a0a4c', 'act3.crystal.1': '#5a1aa2', 'act3.crystal.2': '#9a42ff', 'act3.crystal.3': '#d294ff', 'act3.crystal.4': '#ffffff',
  'act3.path.0': '#160a16', 'act3.path.1': '#2c1224', 'act3.path.2': '#461c30', 'act3.path.3': '#66283a',
  'act3.alarm.1': '#d4162e', 'act3.alarm.2': '#ff2e3e',
  'act3.sky.0': '#000000', 'act3.sky.1': '#07040f',
  'act3.shade': '#000000', 'act3.light': '#8a6ec4', 'act3.emergency': '#ff2e3e',
  // Finale: dawn through the dark
  'finale.ground.0': '#0f0a1c', 'finale.ground.1': '#2a1a3a', 'finale.ground.2': '#5c3050', 'finale.ground.3': '#b4606a', 'finale.ground.4': '#ffc68c',
  'finale.sky.0': '#1a0c36', 'finale.sky.1': '#5e2a6a', 'finale.sky.2': '#d0586a', 'finale.sky.3': '#ff9c5a', 'finale.sky.4': '#ffd87a',
  'finale.shade': '#1c1430', 'finale.light': '#ffc68c',
} as const;

/** A master palette color name, for example `teal.3` or `act1.grass.2`. */
export type ColorName = keyof typeof MASTER;

/** True if `name` is a master color. */
export function isColorName(name: string): name is ColorName {
  return Object.hasOwn(MASTER, name);
}

/** Every master color name, in declaration order. */
export const COLOR_NAMES: readonly ColorName[] = Object.keys(MASTER).filter(isColorName);

/** Unpacked 0–255 channels of a master color. */
export interface Rgb {
  readonly r: number;
  readonly g: number;
  readonly b: number;
}

/** The RGB value of a master color. */
export function rgbOf(name: ColorName): Rgb {
  const hex = MASTER[name];
  const n = Number.parseInt(hex.slice(1), 16);
  return { r: (n >> 16) & 0xff, g: (n >> 8) & 0xff, b: n & 0xff };
}
