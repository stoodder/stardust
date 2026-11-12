// The prelude's stage rules (T1001; prelude.ts, stillCues.ts): the cue table against the scene's
// data and the stills' frames, the shots in order, the dim on Form FF-1, the pan in whole pixels,
// the screen-reader labels, and the staging's table and options.
import { describe, expect, it } from 'vitest';
import { SCENES } from '../../content/dialogue/index.ts';
import {
  PRELUDE_FRAMES,
  PRELUDE_STILLS,
  preludeStillDef,
} from '../../content/sprites/scenes/prelude/index.ts';
import {
  autoAdvanceHoldMs,
  stagingAutoAdvances,
  stagingLeadInMs,
  stagingLockMs,
  stagingOf,
  stagingSkipsAll,
} from '../dialogue/staging.ts';
import { cueIndex, stillAt, type CuedLine } from '../dialogue/stillCues.ts';
import {
  panOffset,
  PRELUDE_CUES,
  PRELUDE_FORM_LABEL,
  PRELUDE_LOCK_MS,
  PRELUDE_PAN,
  PRELUDE_SCENE,
  PRELUDE_SHOTS,
  PRELUDE_STILL_ORDER,
  preludeLabel,
  preludeLeadInMs,
  preludeShot,
} from './prelude.ts';

/** The scene's lines as the stage reads them. */
function lines(): CuedLine[] {
  const scene = SCENES[PRELUDE_SCENE];
  if (scene === undefined) throw new Error('no prelude scene');
  return scene.nodes.flatMap((n) =>
    n.kind === 'line'
      ? [{ speaker: n.speaker, text: n.text, ...(n.label === undefined ? {} : { label: n.label }) }]
      : [],
  );
}

describe('the cue table', () => {
  it("names the scene's labels, in the scene's order, and its last line is Form FF-1", () => {
    const labels = lines().flatMap((l) => (l.label === undefined ? [] : [l.label]));
    expect(labels).toEqual([...PRELUDE_CUES.map((c) => c.label), PRELUDE_FORM_LABEL]);
    expect(lines().at(-1)?.label).toBe(PRELUDE_FORM_LABEL);
    // The first line is the first cue, so the ad shows from the start.
    expect(lines()[0]?.label).toBe(PRELUDE_CUES[0]?.label);
  });

  it('names only stills and frames the art has, and every cue frame of every still', () => {
    for (const c of PRELUDE_CUES) {
      const def = preludeStillDef(c.still);
      expect(Object.keys(def.frames), `${c.still}:${c.frame}`).toContain(c.frame);
      expect(PRELUDE_FRAMES[c.still]).toContain(c.frame);
    }
    for (const def of PRELUDE_STILLS) {
      const cued = PRELUDE_CUES.filter((c) => c.still === def.id).map((c) => c.frame);
      expect(cued, def.id).toEqual(PRELUDE_FRAMES[def.id]);
    }
    expect(PRELUDE_STILL_ORDER).toEqual(PRELUDE_STILLS.map((d) => d.id));
  });

  it('a still that animates a cue frame starts on it (the stage plays `anims[frame]`)', () => {
    for (const def of PRELUDE_STILLS) {
      for (const [name, a] of Object.entries(def.anims ?? {})) {
        if (!PRELUDE_FRAMES[def.id].includes(name) || !('frames' in a)) continue;
        expect(a.frames[0], `${def.id}:${name}`).toBe(name);
        for (const f of a.frames) expect(Object.keys(def.frames)).toContain(f);
      }
    }
  });
});

describe('the shots as the lines play', () => {
  it('runs the seven shots in order, one still at a time, and dims on the last line', () => {
    const said = lines();
    const shots = said.map((_, i) => preludeShot(said.slice(0, i), said[i]!));
    expect(shots.map((s) => s.shot)).toEqual(shots.map((s) => s.shot).toSorted((a, b) => a - b));
    expect(new Set(shots.map((s) => s.shot))).toEqual(
      new Set(Array.from({ length: PRELUDE_SHOTS }, (_, i) => i + 1)),
    );
    expect(shots.at(-1)).toMatchObject({ shot: 7, still: 'scene.dome_row', frame: 'gerald' });
    expect(shots.filter((s) => s.dim)).toHaveLength(1);
    expect(shots.at(-1)?.dim).toBe(true);
    // Each cue line brings its own still and frame up, and it stays until the next cue.
    for (const c of PRELUDE_CUES) {
      const i = said.findIndex((l) => l.label === c.label);
      expect(shots[i], c.label).toMatchObject({ still: c.still, frame: c.frame, shot: c.shot });
    }
    // The 3 s silence holds the viewport, ad off.
    const silence = said.findIndex((l) => l.text === '');
    expect(shots[silence]).toMatchObject({ still: 'scene.viewport', frame: 'ad_off' });
    // The lead-in (nothing said yet) shows the ad.
    expect(preludeShot([], null)).toMatchObject({
      shot: 1,
      still: 'scene.prelude_ad',
      frame: 'ad',
    });
  });

  it('keys cues by label or by text (Dawn keeps its text cues; stillCues.ts)', () => {
    const cues = [
      { still: 's', frame: 'a', label: 'x' },
      { still: 's', frame: 'b', speaker: 'narrator', says: 'gold' },
    ] as const;
    const a = { speaker: 'pa', text: 'hi', label: 'x' };
    const b = { speaker: 'narrator', text: 'the gold mote' };
    const c = { speaker: 'pa', text: 'the gold mote' };
    expect(cueIndex(cues, [], null)).toBe(-1);
    expect(cueIndex(cues, [a], null)).toBe(0);
    expect(cueIndex(cues, [a], b)).toBe(1);
    expect(cueIndex(cues, [a, b], c)).toBe(1);
    expect(stillAt(cues, { still: 's', frame: 'z' }, [], c)).toEqual({ still: 's', frame: 'z' });
  });
});

describe('the pan', () => {
  it('tilts the descent 0 → 120 px down in whole pixels, and rests at its end under reduced motion', () => {
    expect(PRELUDE_PAN.still).toBe('scene.descent');
    const def = preludeStillDef('scene.descent');
    expect(def.size.h - PRELUDE_PAN.to).toBe(180);
    let last = -1;
    for (let ms = 0; ms <= PRELUDE_PAN.ms + 500; ms += 37) {
      const y = panOffset(PRELUDE_PAN, ms, false);
      expect(Number.isInteger(y)).toBe(true);
      expect(y).toBeGreaterThanOrEqual(last);
      last = y;
    }
    expect(panOffset(PRELUDE_PAN, 0, false)).toBe(0);
    expect(panOffset(PRELUDE_PAN, PRELUDE_PAN.ms, false)).toBe(120);
    expect(panOffset(PRELUDE_PAN, 0, true)).toBe(120);
  });
});

describe('screen readers', () => {
  it('labels every still and frame the cues bring up', () => {
    for (const c of PRELUDE_CUES) {
      const label = preludeLabel(c);
      expect(label, `${c.still}:${c.frame}`).not.toBe('The arrival.');
      expect(label.length).toBeLessThanOrEqual(160);
    }
  });
});

describe('the staging', () => {
  it('stages the prelude: a lead-in, the 700 ms start lock, lines that move on, Skip for all', () => {
    expect(stagingOf(PRELUDE_SCENE)).toBe('prelude');
    expect(stagingLeadInMs('prelude', false)).toBe(preludeLeadInMs(false));
    expect(stagingLeadInMs('prelude', true)).toBeLessThan(preludeLeadInMs(false));
    expect(stagingLockMs('prelude', false)).toBe(700);
    expect(stagingLockMs('prelude', true)).toBe(PRELUDE_LOCK_MS);
    expect(stagingAutoAdvances('prelude')).toBe(true);
    expect(stagingSkipsAll('prelude')).toBe(true);
    // No other staging changes (Dawn, the party, C5 keep Next and Esc as they were).
    for (const k of ['dawn', 'c5', 'party', 'rig9_feed', 'yield_log'] as const) {
      expect(stagingAutoAdvances(k)).toBe(false);
      expect(stagingSkipsAll(k)).toBe(false);
    }
    expect(stagingLockMs('dawn', false)).toBe(0);
    // The hold: 1.5 s plus 30 ms a character (the epilogue's pace).
    expect(autoAdvanceHoldMs('')).toBe(1500);
    expect(autoAdvanceHoldMs('DELIVERY: ATTEMPTED.')).toBe(1500 + 30 * 20);
  });
});
