// The boss bar's numbers (art-direction §8, the `boss` tell: "HUD bar with phase markers";
// design/enemies.md § 6). Pure, so the layout is unit-tested; views/BossBarView.ts draws it.
// A shielded boss's bar carries a thin shield strip under the HP (its shield against its own
// maximum, re-forming as a ghost while its shards count down), and a boss whose fight ends above
// 0 (`endAtPct`: the Glass Witch's retreat, the Penitent's kneel) carries the end mark where the
// HP stops (review R6).

/** The bar: its width and height inside a 1 px frame (game px), and where it sits on screen. */
export const BOSS_BAR_W = 160;
export const BOSS_BAR_H = 4;
/** The label's top, and the bar's top under it (screen px): between the notices and the banner. */
export const BOSS_LABEL_Y = 30;
export const BOSS_BAR_Y = 39;
/** Phase markers stand this far above and below the bar (px). */
export const MARK_OVERHANG_PX = 2;
/** The damage chip (`red.3` behind the fill) drains this many px per ms toward the fill. */
export const CHIP_PX_PER_MS = 0.16;
/** A phase change flashes the whole bar white for this long (ms). */
export const PHASE_FLASH_MS = 120;
/** After the boss's ending starts, the bar holds this long, then steps out over BAR_FADE_MS. */
export const BAR_HOLD_MS = 1200;
export const BAR_FADE_MS = 600;

/**
 * The fill's width (px) for `hp` of `maxHp` on a `w`-px bar: rounded up, so a boss with any HP
 * left shows at least a pixel, and 0 only at 0.
 */
export function barFillPx(hp: number, maxHp: number, w = BOSS_BAR_W): number {
  if (!(maxHp > 0) || !(hp > 0)) return 0;
  const px = Math.ceil((hp / maxHp) * w - 1e-9);
  return px < 0 ? 0 : px > w ? w : px;
}

/**
 * Where each phase threshold falls on a `w`-px bar (px from its left), for every phase after the
 * first: Chitterbloom's 60% and 25%. A shield-broken phase (the Penitent's, T506) begins when its
 * shield breaks, at no HP share, so it has no mark (T530a).
 */
export function phaseMarksPx(
  phases: readonly { readonly fromPct: number; readonly onShieldBroken?: boolean }[],
  w = BOSS_BAR_W,
): number[] {
  const out: number[] = [];
  for (let i = 1; i < phases.length; i++) {
    const p = phases[i]!; // i < length
    if (p.onShieldBroken !== true) out.push(Math.round(p.fromPct * w));
  }
  return out;
}

/** The shield strip under a shielded boss's HP: its height, under a 1 px `ink.0` rule (px). */
export const BOSS_SHIELD_H = 2;
/** The shield strip's segments (the small health bar's): this many px lit in every period. */
export const SHIELD_SEG_ON = 3;
export const SHIELD_SEG_PERIOD = 4;
/** The end mark's flag under the bar: this wide (px), the 1 px tick standing on its middle. */
export const END_FLAG_W = 3;

/** The bar's whole height inside its frame (px): the HP, and for a shielded boss the strip. */
export function barBodyH(shielded: boolean): number {
  return shielded ? BOSS_BAR_H + 1 + BOSS_SHIELD_H : BOSS_BAR_H;
}

/**
 * Where a boss's fight ends on a `w`-px bar (px from its left), or −1 for none: its `endAtPct`
 * when above 0 (the Glass Witch's 40% retreat, the Penitent's 50% kneel; Chitterbloom is driven
 * off at 0 and has none). The HP never drains past it.
 */
export function endMarkPx(endAtPct: number, w = BOSS_BAR_W): number {
  if (!(endAtPct > 0) || !(endAtPct < 1)) return -1;
  return Math.round(endAtPct * w);
}

/**
 * The shield strip's fill (px) for `shieldHp` of the boss's own `maxShield` (D139 S5): scaled to
 * the shield, never to the HP, so a full shield is the full strip (the Penitent's 600 under its
 * 1,200 HP fills the strip end to end).
 */
export function shieldStripPx(shieldHp: number, maxShield: number, w = BOSS_BAR_W): number {
  return barFillPx(shieldHp, maxShield, w);
}

/**
 * The tiny "½" under the end mark's flag when the fight ends at half (the Penitent's kneel; D139
 * S5), `#` lit: a 1 over a 2 across a slash, 7×7, drawn `white.1` over a 1 px `ink.0` outline,
 * centred on the tick. Null for any other end (the Witch's 40% has none).
 */
export const HALF_GLYPH: readonly string[] = [
  '#....#.',
  '#...#..',
  '#..#...',
  '..#.##.',
  '.#....#',
  '#....#.',
  '....###',
];

export function endGlyph(endAtPct: number): readonly string[] | null {
  return endAtPct === 0.5 ? HALF_GLYPH : null;
}

/** Whether pixel `x` of the shield strip is a lit segment (3 on, 1 off, from the left). */
export function shieldSegLit(x: number): boolean {
  return x % SHIELD_SEG_PERIOD < SHIELD_SEG_ON;
}

/**
 * The shield strip's re-forming ghost (px), while a shield-broken boss's shield is down and its
 * shards count it back (`reformTicks` of `totalTicks` left): it grows from empty to the full bar
 * as the re-form nears, so the player sees the wall coming back; 0 when nothing is re-forming.
 */
export function reformPx(reformTicks: number, totalTicks: number, w = BOSS_BAR_W): number {
  if (!(reformTicks > 0) || !(totalTicks > 0)) return 0;
  const done = 1 - Math.min(reformTicks, totalTicks) / totalTicks;
  return Math.max(0, Math.min(w, Math.floor(done * w)));
}

/** The chip's width after `dt` ms: it drains toward the fill, and never sits below it. */
export function chipPx(chip: number, fill: number, dt: number): number {
  if (chip <= fill) return fill;
  const next = chip - CHIP_PX_PER_MS * dt;
  return next < fill ? fill : next;
}

/**
 * The bar's alpha `ms` after its boss's ending began: held `holdMs`, then 60, 35, 15%, then gone
 * (0). A pivot holds nothing (T530a): the fight is over and the boss is kneeling, not fleeing, so
 * the bar steps out with its fade at once.
 */
export function barFadeAlpha(ms: number, holdMs = BAR_HOLD_MS): number {
  if (ms < holdMs) return 1;
  const t = (ms - holdMs) / BAR_FADE_MS;
  return t < 1 / 3 ? 0.6 : t < 2 / 3 ? 0.35 : t < 1 ? 0.15 : 0;
}

/** The name as the 3×5 font draws it (capitals). */
export function bossLabel(name: string): string {
  return name.toUpperCase();
}
