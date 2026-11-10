// The boss bar's numbers (art-direction §8, the `boss` tell: "HUD bar with phase markers";
// design/enemies.md § 6). Pure, so the layout is unit-tested; views/BossBarView.ts draws it.

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
