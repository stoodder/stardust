// T607: the Hum Choir's minimal look (choirLook.ts): which rings, where, and the Lulled note.
import { describe, expect, it } from 'vitest';
import { rgbOf } from '../../content/palettes/master.ts';
import {
  choirReach,
  HUM_BEAT_TICKS,
  lullReach,
  NOTE_COLOR,
  LULLED_DROP_PX,
  LULLED_H,
  LULLED_W,
  lulledImage,
  NOTE_H,
  NOTE_SIDE_PX,
  NOTE_RIM,
  NOTE_W,
  noteBobPx,
  noteImage,
  showsLulled,
  songDashShift,
  type ChoirTower,
} from './choirLook.ts';

const T3 = { auras: [{ kind: 'choir', radiusTiles: 2 }], lull: null };
const LULLABY = { auras: [{ kind: 'choir', radiusTiles: 2 }], lull: { radiusTiles: 2.5 } };
const LOOKOUT = { auras: [{ kind: 'lookout', radiusTiles: 1.5 }], lull: null };

function tower(tierDef: ChoirTower['tierDef'], over: Partial<ChoirTower> = {}): ChoirTower {
  return { alive: true, tierDef, linkAuraRadiusTiles: 0, detectPct: 0, ...over };
}

describe('choirLook', () => {
  it('the song ring: the widest choir aura, + Harmony, × the radius tune-up; none for others', () => {
    expect(choirReach(tower(T3))).toBe(2);
    expect(choirReach(tower(T3, { linkAuraRadiusTiles: 0.5 }))).toBe(2.5);
    expect(choirReach(tower(T3, { detectPct: 0.5 }))).toBe(3);
    expect(choirReach(tower(LOOKOUT))).toBe(0);
    expect(choirReach(tower(T3, { alive: false }))).toBe(0);
    expect(choirReach(tower(null))).toBe(0);
  });

  it('the Lullaby ring: its own radius (Harmony doesn’t widen it), × the tune-up', () => {
    expect(lullReach(tower(T3))).toBe(0);
    expect(lullReach(tower(LULLABY, { linkAuraRadiusTiles: 0.5 }))).toBe(2.5);
    expect(lullReach(tower(LULLABY, { detectPct: 0.2 }))).toBe(3);
  });

  it('crawls and bobs on the hum’s beat, and holds still under reduced motion', () => {
    expect([songDashShift(0, false), songDashShift(HUM_BEAT_TICKS, false)]).toEqual([0, 1]);
    expect(songDashShift(HUM_BEAT_TICKS, true)).toBe(0);
    expect(noteBobPx(HUM_BEAT_TICKS, 0, false)).toBe(-1);
    expect(noteBobPx(HUM_BEAT_TICKS, 0, true)).toBe(0);
  });

  it('the Lulled note shows on a Lulled unit out in the open only', () => {
    const e = { alive: true, lulled: true, burrowed: false, phased: false, leaving: false };
    expect(showsLulled(e)).toBe(true);
    expect(showsLulled({ ...e, lulled: false })).toBe(false);
    expect(showsLulled({ ...e, leaving: true })).toBe(false);
    expect(showsLulled({ ...e, burrowed: true })).toBe(false);
    expect(showsLulled({ ...e, alive: false })).toBe(false);
  });

  it('the note is a rimmed 7×9 eighth note', () => {
    const img = noteImage(NOTE_COLOR);
    expect([img.w, img.h, NOTE_W, NOTE_H]).toEqual([7, 9, 7, 9]);
    const at = (x: number, y: number): number[] =>
      Array.from(img.data.subarray((y * 7 + x) * 4, (y * 7 + x) * 4 + 4));
    const gold = rgbOf(NOTE_COLOR);
    const ink = rgbOf(NOTE_RIM);
    expect(at(1, 5)).toEqual([gold.r, gold.g, gold.b, 255]); // the head
    expect(at(0, 5)).toEqual([ink.r, ink.g, ink.b, 255]); // its rim
    expect(at(6, 8)[3]).toBe(0); // clear
  });
  it('Lulled wears a bigger rimmed ♫ that settles on the head, not over it (T630a)', () => {
    const img = lulledImage('blue.4');
    expect([img.w, img.h, LULLED_W, LULLED_H]).toEqual([9, 9, 9, 9]);
    expect(LULLED_W * LULLED_H).toBeGreaterThan(NOTE_W * NOTE_H);
    expect(LULLED_DROP_PX).toBeGreaterThan(0);
    const at = (x: number, y: number): number => img.data[(y * img.w + x) * 4 + 3]!;
    expect(at(3, 1)).toBe(255); // the beam
    expect(at(0, 0)).toBe(0); // clear corners
    expect(at(8, 8)).toBe(0);
  });

  it("the Choir's note stands aside, clear of a 4-digit purchase float up the middle", () => {
    // A float like "−100" in the 3×5 font is about 18 px wide with its outline: 9 either side.
    expect(NOTE_SIDE_PX - (NOTE_W - 1) / 2).toBeGreaterThanOrEqual(9);
  });
});
