// The full-screen scenes' staging (D097 R3): the table, the timelines against ART's sprites, the
// lead-in, reduced motion's stills, and the line announcer's words (U-M1).
import { describe, expect, it } from 'vitest';
import { SCENES } from '../../content/dialogue/index.ts';
import { SPRITES } from '../../content/sprites/index.ts';
import type { SpriteDef } from '../../content/sprites/types.ts';
import { DEV_SCENES } from './dev.ts';
import { lineAnnouncement } from './SceneParts.tsx';
import {
  BURST_BEATS,
  BURST_BEATS_STILL,
  CANNON_BEATS,
  CANNON_BEATS_STILL,
  CANNON_SPRITE,
  CONFETTI_SPRITE,
  FALL_BEATS,
  FALL_BEATS_STILL,
  FEED_BEATS,
  FEED_BEATS_STILL,
  FEED_SPRITE,
  frameAt,
  leadInMs,
  SCENE_STAGING,
  stagingLeadInMs,
  stagingOf,
  stillMoving,
  type Beat,
} from './staging.ts';
import type { LineView } from './state.ts';

function def(id: string): SpriteDef {
  const d = (SPRITES as readonly SpriteDef[]).find((s) => s.id === id);
  if (d === undefined) throw new Error(`no sprite ${id}`);
  return d;
}

const anims = (id: string) => def(id).anims ?? {};

/** The moving feed's frame `ms` in. */
const at = (ms: number) => frameAt(FEED_BEATS, anims(FEED_SPRITE), ms);

/** Every beat names a real frame or anim, and every moment of the timeline a real frame. */
function check(id: string, beats: readonly Beat[]): void {
  const d = def(id);
  for (const b of beats) {
    if ('frame' in b) expect(Object.hasOwn(d.frames, b.frame), `${id} ${b.frame}`).toBe(true);
    else expect(Object.hasOwn(d.anims ?? {}, b.anim), `${id} ${b.anim}`).toBe(true);
  }
  for (let ms = 0; ms < 6000; ms += 37) {
    const f = frameAt(beats, anims(id), ms);
    expect(f !== null && Object.hasOwn(d.frames, f), `${id} at ${ms}: ${f}`).toBe(true);
  }
}

describe('the staging table', () => {
  it('stages registered scenes only (or the dev Yield Log), the stinger, party, and Yield Log', () => {
    const dev = new Set(DEV_SCENES.map((s) => s.id));
    for (const id of Object.keys(SCENE_STAGING)) {
      expect(Object.hasOwn(SCENES, id) || dev.has(id), id).toBe(true);
    }
    expect(stagingOf('a1_m05_scene_stinger')).toBe('rig9_feed');
    expect(stagingOf('a1_m05_scene_party')).toBe('party');
    expect(stagingOf('a1_m01_brief')).toBeNull();
  });

  it("names only frames and anims ART's sprites have", () => {
    check(FEED_SPRITE, FEED_BEATS);
    check(FEED_SPRITE, FEED_BEATS_STILL);
    check(CANNON_SPRITE, CANNON_BEATS);
    check(CANNON_SPRITE, CANNON_BEATS_STILL);
    check(CONFETTI_SPRITE, BURST_BEATS);
    check(CONFETTI_SPRITE, BURST_BEATS_STILL);
    check(CONFETTI_SPRITE, FALL_BEATS);
    check(CONFETTI_SPRITE, FALL_BEATS_STILL);
  });
});

describe('the stinger feed', () => {
  it('plays live, static, the six smudge frames in half a second, static, then NO SIGNAL', () => {
    expect(at(0)).toBe('live_0');
    expect(at(600)).toBe('live_1');
    expect(at(1500)).toMatch(/^static_/);
    const smudge = new Set<string>();
    for (let ms = 1750; ms < 2250; ms += 10) smudge.add(at(ms)!);
    expect([...smudge].toSorted()).toEqual(
      ['smudge_0', 'smudge_1', 'smudge_2', 'smudge_3', 'smudge_4', 'smudge_5'].toSorted(),
    );
    expect(at(2300)).toMatch(/^static_/);
    expect(at(2500)).toMatch(/^no_signal_/);
    expect(at(60_000)).toMatch(/^no_signal_/);
  });

  it('leads the lines in by its timed beats; reduced motion holds three stills, no static', () => {
    expect(leadInMs(FEED_BEATS)).toBe(2500);
    expect(stagingLeadInMs('rig9_feed', false)).toBe(2500);
    expect(stagingLeadInMs('rig9_feed', true)).toBe(2000);
    expect(stagingLeadInMs('party', false)).toBe(0);
    const still = (ms: number) => frameAt(FEED_BEATS_STILL, anims(FEED_SPRITE), ms);
    expect([still(0), still(1200), still(2100), still(9000)]).toEqual([
      'live_0',
      'smudge_3',
      'no_signal_0',
      'no_signal_0',
    ]);
    // Settled stills stop redrawing; the moving feed never settles (NO SIGNAL blinks).
    expect(stillMoving(FEED_BEATS_STILL, anims(FEED_SPRITE), 2100)).toBe(false);
    expect(stillMoving(FEED_BEATS, anims(FEED_SPRITE), 9000)).toBe(true);
  });
});

describe('the party', () => {
  it('fires the cannon once (it settles idle) and bursts from fire_0', () => {
    const cannon = (ms: number) => frameAt(CANNON_BEATS, anims(CANNON_SPRITE), ms);
    expect(cannon(0)).toBe('fire_0');
    expect(cannon(5000)).toBe('idle');
    expect(stillMoving(CANNON_BEATS, anims(CANNON_SPRITE), 5000)).toBe(false);
    expect(frameAt(BURST_BEATS, anims(CONFETTI_SPRITE), 0)).toBe('burst_0');
    expect(frameAt(BURST_BEATS, anims(CONFETTI_SPRITE), 9000)).toBe('burst_5');
  });
});

/** A line on screen. */
const line = (name: string, text: string, silence = false): LineView => ({
  id: 1,
  speaker: 'quill',
  name,
  color: 'teal.3',
  frame: 'portrait',
  portrait: null,
  text,
  silence,
  point: false,
});

describe('the line announcer (U-M1)', () => {
  it('says the speaker and the whole line; a caption alone; a silence nothing', () => {
    expect(lineAnnouncement(line('QUILL', 'Probably a *smudge*! Logging it.'))).toBe(
      'QUILL: Probably a smudge! Logging it.',
    );
    expect(lineAnnouncement(line('', 'Rig Nine. Status: not answering.'))).toBe(
      'Rig Nine. Status: not answering.',
    );
    expect(lineAnnouncement(line('', '', true))).toBe('');
    expect(lineAnnouncement(null)).toBe('');
  });
});
