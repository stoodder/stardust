// M3 review round 2 (D098), the HUD's hints: the Time Dilation teach on A1M3's flock (S6), the
// per-turret Hold Fire hint hidden under Hold (all), and the salvage hint timing out (S7).
import { describe, expect, it } from 'vitest';
import { createSim } from '../sim/index.ts';
import { pickHint, TIME_DILATION_HINT } from '../ui/hud/Notices.tsx';
import { battleConfig } from './battleSetup.ts';
import {
  FLOCK_SIZE,
  flockWaves,
  SALVAGE_HINT_WAVES,
  salvageHintShows,
  timeDilationTeachShows,
} from './hud.ts';

const none = {
  holdFireOne: false,
  holdFireTeach: false,
  holdFireAll: false,
  timeDilation: false,
  salvage: false,
  upgrade: false,
  selected: false,
};

describe('the Time Dilation teach (S6)', () => {
  it("finds A1M3's flocks: W5's ten Puffwings and W8's twenty, not W3's four", () => {
    const a1m3 = createSim(battleConfig('a1_m03', 1)).map;
    const flocks = flockWaves(a1m3.waves).flatMap((f, i) => (f ? [i + 1] : []));
    expect(flocks).toEqual([5, 8]);
    expect(FLOCK_SIZE).toBe(10);
  });

  it('shows once a flock is in reach, while it is ready, until the first cast', () => {
    expect(timeDilationTeachShows(true, false, true, true)).toBe(true);
    expect(timeDilationTeachShows(false, false, true, true)).toBe(false);
    expect(timeDilationTeachShows(true, true, true, true)).toBe(false);
    expect(timeDilationTeachShows(true, false, false, true)).toBe(false);
    expect(timeDilationTeachShows(true, false, true, false)).toBe(false);
    expect(TIME_DILATION_HINT).toBe('Time Dilation slows the flock');
  });

  it("outranks salvage and upgrade, and yields to Gerald's hints", () => {
    expect(pickHint({ ...none, timeDilation: true, salvage: true, upgrade: true })).toBe(
      'timeDilation',
    );
    expect(pickHint({ ...none, timeDilation: true, holdFireTeach: true })).toBe('holdAll');
    expect(pickHint({ ...none, timeDilation: true, holdFireOne: true })).toBe('holdOne');
  });
});

describe('hints never go stale (S7)', () => {
  it('hides the per-turret Hold Fire hint while Hold (all) is on', () => {
    expect(pickHint({ ...none, holdFireOne: true })).toBe('holdOne');
    expect(pickHint({ ...none, holdFireOne: true, holdFireTeach: true, holdFireAll: true })).toBe(
      null,
    );
    expect(pickHint({ ...none, holdFireOne: true, holdFireAll: true, salvage: true })).toBe(
      'salvage',
    );
  });

  it('times the salvage hint out after two wave starts', () => {
    expect(SALVAGE_HINT_WAVES).toBe(2);
    expect(salvageHintShows(true, true, false, true, 0)).toBe(true);
    expect(salvageHintShows(true, true, false, true, 1)).toBe(true);
    expect(salvageHintShows(true, true, false, true, 2)).toBe(false);
  });
});
