// T630b's Act III world, as pure rules: Sterling's shuttle lifting on A3M2's cue (shuttleLift.ts)
// and A3M3's blast doors under C3 and the SEAL (blastDoor.ts), on the real maps.
import { describe, expect, it } from 'vitest';
import { compileContent } from '../../content/compile.ts';
import { RAW_CONTENT } from '../../content/registry.ts';
import { SPRITES } from '../../content/sprites/index.ts';
import { doorCores, doorLook, SEAL_INPUT, type SealPhase } from './blastDoor.ts';
import {
  cueFired,
  LIFT_HOVER_TICKS,
  LIFT_STILL_TICKS,
  liftPose,
  SHUTTLE_CUE,
  SHUTTLE_MARKER,
  type LiftPose,
} from './shuttleLift.ts';

const maps = compileContent(RAW_CONTENT).maps;
const m1 = maps['a3_m01']!;
const m2 = maps['a3_m02']!;
const m3 = maps['a3_m03']!;

const frames = (id: string): readonly string[] =>
  Object.keys(SPRITES.find((s) => s.id === id)?.frames ?? {});
const anims = (id: string): readonly string[] =>
  Object.keys(SPRITES.find((s) => s.id === id)?.anims ?? {});

describe("Sterling's shuttle (A3M2)", () => {
  it('stands on its pad marker and lifts on a cue the map really fires', () => {
    expect(m2.markers[SHUTTLE_MARKER]).toEqual([20, 3]);
    const at = m2.events.findIndex((e) =>
      e.actions.some((a) => 'cue' in a && a.cue === SHUTTLE_CUE),
    );
    expect(at).toBeGreaterThanOrEqual(0);
    const fired = m2.events.map(() => false);
    expect(cueFired(m2.events, fired, SHUTTLE_CUE)).toBe(false);
    // Every other event fired: still parked.
    const others = m2.events.map((_, i) => i !== at);
    expect(cueFired(m2.events, others, SHUTTLE_CUE)).toBe(false);
    fired[at] = true;
    expect(cueFired(m2.events, fired, SHUTTLE_CUE)).toBe(true);
    // No other map carries the cue.
    expect(
      cueFired(
        m1.events,
        m1.events.map(() => true),
        SHUTTLE_CUE,
      ),
    ).toBe(false);
  });

  it('rises off the pad, climbs away up and east fading, and is gone', () => {
    const p: LiftPose = { dx: 0, dy: 0, alpha: 1, done: false };
    expect(liftPose(0, false, p)).toEqual({ dx: 0, dy: 0, alpha: 1, done: false });
    let lastY = 0;
    let lastX = 0;
    let lastA = 1;
    let t = 0;
    for (; t < 2000 && !liftPose(t, false, p).done; t += 5) {
      expect(p.dy).toBeLessThanOrEqual(lastY); // only ever up
      expect(p.dx).toBeGreaterThanOrEqual(lastX); // and east
      expect(p.alpha).toBeLessThanOrEqual(lastA);
      lastY = p.dy;
      lastX = p.dx;
      lastA = p.alpha;
    }
    expect(p.done).toBe(true);
    // A hover first (no drift east while it lifts off), then the climb; it fades before it's gone.
    expect(liftPose(LIFT_HOVER_TICKS - 1, false, p).dx).toBe(0);
    expect(liftPose(LIFT_HOVER_TICKS - 1, false, p).dy).toBeLessThan(0);
    expect(lastA).toBeLessThan(0.1);
    expect(lastY).toBeLessThan(-100);
    expect(t / 60).toBeGreaterThan(3);
    expect(t / 60).toBeLessThan(8);
  });

  it('under reduced motion fades out where it stood', () => {
    const p: LiftPose = { dx: 0, dy: 0, alpha: 1, done: false };
    for (let t = 0; t <= LIFT_STILL_TICKS; t += 10) {
      liftPose(t, true, p);
      expect([p.dx, p.dy]).toEqual([0, 0]);
    }
    expect(liftPose(LIFT_STILL_TICKS / 2, true, p).alpha).toBeCloseTo(0.5);
    expect(liftPose(LIFT_STILL_TICKS, true, p).done).toBe(true);
  });

  it('has the frames and anims the view plays', () => {
    expect(frames('prop.shuttle')).toEqual(
      expect.arrayContaining(['pad', 'parked_0', 'ship_0', 'ship_1']),
    );
    expect(anims('prop.shuttle')).toEqual(expect.arrayContaining(['parked', 'lift']));
  });
});

describe("A3M3's blast doors", () => {
  it('finds both door cores, and opens only the door C3 chose', () => {
    const at = (flags: Parameters<typeof doorCores>[1]) =>
      doorCores(m3, flags).map((d) => [d.marker, d.col, d.row, d.open]);
    expect(at({ door_choice: 'convoy' })).toEqual([
      ['door_west', 3, 13, true],
      ['door_east', 17, 13, false],
    ]);
    expect(at({ door_choice: 'warren' })).toEqual([
      ['door_west', 3, 13, false],
      ['door_east', 17, 13, true],
    ]);
    // Before C3 is answered nobody walks: both doors stand open.
    expect(at({})).toEqual([
      ['door_west', 3, 13, true],
      ['door_east', 17, 13, true],
    ]);
    for (const d of doorCores(m3, {})) {
      expect(m3.tiles[d.index]).toBe('C');
      expect(d.index).toBe(d.row * m3.cols + d.col);
    }
  });

  it('draws no door on a map without door markers', () => {
    expect(doorCores(m1, {})).toEqual([]);
    expect(doorCores(m2, {})).toEqual([]);
  });

  it('shuts the unchosen door, and runs the chosen one shut on the SEAL, then holds it sealed', () => {
    const seq: SealPhase[] = ['none', 'closing', 'sealed'];
    expect(seq.map((s) => doorLook(false, s, false))).toEqual(
      Array(3).fill({ frame: 'shut', anim: null }),
    );
    expect(seq.map((s) => doorLook(true, s, false))).toEqual([
      { frame: 'open', anim: null },
      { frame: 'closing_0', anim: 'closing' },
      { frame: 'sealed_0', anim: 'sealed' },
    ]);
    // Reduced motion: sealed at once, still.
    expect(doorLook(true, 'closing', true)).toEqual({ frame: 'sealed_0', anim: null });
    expect(doorLook(true, 'sealed', true)).toEqual({ frame: 'sealed_0', anim: null });
    expect(doorLook(true, 'none', true)).toEqual({ frame: 'open', anim: null });
  });

  it('seals on the forced input A3M3 really asks for, and has the frames the view plays', () => {
    const asks = m3.events.flatMap((e) =>
      e.actions.flatMap((a) => ('forceInput' in a ? [a.forceInput.id] : [])),
    );
    expect(asks).toEqual([SEAL_INPUT]);
    for (const s of ['none', 'closing', 'sealed'] as const) {
      for (const open of [true, false]) {
        for (const still of [true, false]) {
          const look = doorLook(open, s, still);
          expect(frames('prop.blast_door')).toContain(look.frame);
          if (look.anim !== null) expect(anims('prop.blast_door')).toContain(look.anim);
        }
      }
    }
  });
});
