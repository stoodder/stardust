import { describe, expect, it } from 'vitest';
import { compileContent } from '../../content/compile.ts';
import { RAW_CONTENT } from '../../content/registry.ts';
import { TICK_HZ } from '../../shared/time.ts';
import {
  BAR_FADE_MS,
  BAR_HOLD_MS,
  BarEndClock,
  barFadeAlpha,
  barFillPx,
  BOSS_BAR_H,
  BOSS_BAR_W,
  BOSS_SHIELD_H,
  barBodyH,
  bossLabel,
  chipPx,
  endGlyph,
  endMarkPx,
  HALF_GLYPH,
  phaseMarksPx,
  reformPx,
  shieldSegLit,
  shieldStripPx,
} from './bossBar.ts';

describe('the boss bar (T312b)', () => {
  it('fills by HP share, showing a pixel while any HP is left', () => {
    expect(barFillPx(2500, 2500)).toBe(BOSS_BAR_W);
    expect(barFillPx(1500, 2500)).toBe(96);
    expect(barFillPx(1, 2500)).toBe(1);
    expect(barFillPx(0, 2500)).toBe(0);
    expect(barFillPx(10, 0)).toBe(0);
    expect(barFillPx(3000, 2500)).toBe(BOSS_BAR_W);
  });

  it("marks every phase after the first at its threshold (Chitterbloom's 60% and 25%)", () => {
    const phases = [{ fromPct: 1 }, { fromPct: 0.6 }, { fromPct: 0.25 }];
    expect(phaseMarksPx(phases)).toEqual([96, 40]);
    expect(phaseMarksPx([{ fromPct: 1 }])).toEqual([]);
    // The Penitent's shield-broken phase starts when its shield breaks: no mark at 0 (T530a).
    expect(phaseMarksPx([{ fromPct: 1 }, { fromPct: 0, onShieldBroken: true }])).toEqual([]);
    expect(
      phaseMarksPx([{ fromPct: 1 }, { fromPct: 0, onShieldBroken: true }, { fromPct: 0.3 }]),
    ).toEqual([48]);
  });

  it('drains the damage chip toward the fill, never below it', () => {
    expect(chipPx(100, 60, 0)).toBe(100);
    expect(chipPx(100, 60, 100)).toBeCloseTo(84);
    expect(chipPx(100, 60, 10_000)).toBe(60);
    expect(chipPx(50, 60, 16)).toBe(60); // healed past it
  });

  it("runs the ending's clock on sim time, and on frame time once the outcome is decided (C4)", () => {
    const tickMs = 1000 / TICK_HZ;
    const clock = new BarEndClock();
    expect(clock.running).toBe(false);
    expect(clock.ms(50, 16, true)).toBe(0);
    clock.start(100);
    expect(clock.running).toBe(true);
    // While the map plays, sim time: a mid-play pause (the tick held) holds the bar at full.
    for (let f = 0; f < 600; f++) expect(clock.ms(100, 16, false)).toBe(0);
    expect(clock.ms(130, 16, false)).toBeCloseTo(30 * tickMs);
    // The boss was the last kill: the sim stops at the win tick, and frame time carries the bar
    // through its hold and out over the field's hold before Results.
    const won = new BarEndClock();
    won.start(200);
    let ms = 0;
    let frames = 0;
    while (barFadeAlpha(ms) > 0 && frames < 1000) {
      ms = won.ms(200, 16, true);
      frames++;
    }
    expect(barFadeAlpha(ms)).toBe(0);
    expect(frames * 16).toBeGreaterThanOrEqual(BAR_HOLD_MS + BAR_FADE_MS);
    expect(frames * 16).toBeLessThan(BAR_HOLD_MS + BAR_FADE_MS + 32); // gone in ~1.8 s, as in M8
    // Decided partway: the sim time it ran, plus the frames since.
    const late = new BarEndClock();
    late.start(0);
    expect(late.ms(30, 16, false)).toBeCloseTo(30 * tickMs);
    expect(late.ms(30, 100, true)).toBeCloseTo(30 * tickMs + 100);
    // A new ending starts it afresh.
    late.start(30);
    expect(late.ms(30, 0, true)).toBe(0);
    late.stop();
    expect(late.running).toBe(false);
  });

  it('holds after the ending, then steps out on the stepped-alpha ladder', () => {
    expect(barFadeAlpha(0)).toBe(1);
    expect(barFadeAlpha(BAR_HOLD_MS - 1)).toBe(1);
    expect(barFadeAlpha(BAR_HOLD_MS)).toBe(0.6);
    expect(barFadeAlpha(BAR_HOLD_MS + BAR_FADE_MS / 2)).toBe(0.35);
    expect(barFadeAlpha(BAR_HOLD_MS + BAR_FADE_MS * 0.9)).toBe(0.15);
    expect(barFadeAlpha(BAR_HOLD_MS + BAR_FADE_MS)).toBe(0);
    // A pivot steps out at once (no hold).
    expect(barFadeAlpha(0, 0)).toBe(0.6);
    expect(barFadeAlpha(BAR_FADE_MS, 0)).toBe(0);
  });

  it('labels the bar in capitals', () => {
    expect(bossLabel('Matriarch Chitterbloom')).toBe('MATRIARCH CHITTERBLOOM');
    // The 3×5 font has no quotes (T731): Shareholder Value's bar keeps its name without them.
    expect(bossLabel('"Shareholder Value"')).toBe('SHAREHOLDER VALUE');
  });

  it('marks where the fight ends: the Penitent kneels at 50%, the Witch retreats at 40% (R6)', () => {
    const live = compileContent(RAW_CONTENT);
    const penitent = live.enemies.sunderglass_penitent.boss!;
    expect(endMarkPx(penitent.endAtPct)).toBe(BOSS_BAR_W / 2);
    expect(endMarkPx(live.enemies.glass_witch.boss!.endAtPct)).toBe(64);
    // Chitterbloom is driven off at 0: no mark; nor at or past full.
    expect(endMarkPx(live.enemies.chitterbloom.boss!.endAtPct)).toBe(-1);
    expect(endMarkPx(1)).toBe(-1);
    // The HP never drains past it: the fill at the end is the mark.
    expect(barFillPx(penitent.endAtPct * 1400, 1400)).toBe(endMarkPx(penitent.endAtPct));
  });

  it('draws a shielded boss a 2 px strip under a 1 px rule, in 3-on-1-off segments', () => {
    expect(barBodyH(false)).toBe(BOSS_BAR_H);
    expect(barBodyH(true)).toBe(BOSS_BAR_H + 1 + BOSS_SHIELD_H);
    expect([0, 1, 2, 3, 4, 5, 6, 7].map(shieldSegLit)).toEqual([
      true,
      true,
      true,
      false,
      true,
      true,
      true,
      false,
    ]);
  });

  it('grows the re-form ghost from empty to full as the shards count the wall back', () => {
    expect(reformPx(0, 240)).toBe(0); // nothing re-forming
    expect(reformPx(240, 240)).toBe(0); // just broke
    expect(reformPx(120, 240)).toBe(BOSS_BAR_W / 2);
    expect(reformPx(1, 240)).toBe(BOSS_BAR_W - 1);
    expect(reformPx(500, 240)).toBe(0);
    expect(reformPx(10, 0)).toBe(0);
  });

  it('scales the shield strip to the shield, not the HP: a full shield is the full strip (S5)', () => {
    const pen = compileContent(RAW_CONTENT).enemies.sunderglass_penitent;
    const max = pen.shield!.hp;
    expect(max).toBeLessThan(pen.hp); // the case P read wrong: a shield half the HP
    expect(shieldStripPx(max, max)).toBe(BOSS_BAR_W);
    expect(shieldStripPx(max / 2, max)).toBe(BOSS_BAR_W / 2);
    expect(shieldStripPx(0, max)).toBe(0);
  });

  it('writes a tiny "½" under the kneel flag, and nothing under any other end (S5)', () => {
    const live = compileContent(RAW_CONTENT);
    expect(endGlyph(live.enemies.sunderglass_penitent.boss!.endAtPct)).toBe(HALF_GLYPH);
    expect(endGlyph(live.enemies.glass_witch.boss!.endAtPct)).toBeNull();
    expect(endGlyph(0)).toBeNull();
    // Odd-wide, so it centres on the 1 px tick; every row the same width; tiny (≤ 7 px).
    const w = HALF_GLYPH[0]!.length;
    expect(w % 2).toBe(1);
    expect(HALF_GLYPH.every((r) => r.length === w && /^[#.]+$/.test(r))).toBe(true);
    expect(HALF_GLYPH.length).toBeLessThanOrEqual(7);
  });
});
