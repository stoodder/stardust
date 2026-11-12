// Endless mode's score table in the save (design/maps.md § 8; T861; D154's lever: one record per
// seed). A run's score is the waves it held (sim/endless.ts `endlessWavesHeld`). The table keeps
// each seed's best, at most ENDGAME_LIMITS.endlessScores of them: a new seed's record past the
// limit pushes out the lowest score (the oldest of the lowest), and one lower than every record
// in a full table isn't kept. Best first: waves held, then the seed that got there first. Pure:
// it returns a new save and never touches the old one.
import type { EndlessScore, SaveData } from './saveData.ts';
import { ENDGAME_LIMITS } from './validateEndgame.ts';

/** The save's endless records, best first (waves held; on a tie, the earlier record). */
export function endlessScores(save: Pick<SaveData, 'endless'>): EndlessScore[] {
  return (save.endless ?? [])
    .map((s, i) => ({ s, i }))
    .toSorted((a, b) => b.s.wave - a.s.wave || a.i - b.i)
    .map(({ s }) => ({ ...s }));
}

/** The best waves held on `seed`, or null before a run on it. */
export function endlessBest(save: Pick<SaveData, 'endless'>, seed: number): number | null {
  return save.endless?.find((s) => s.seed === seed)?.wave ?? null;
}

/**
 * `save` with a run of `wave` waves held on `seed` recorded: the seed's best rises to it, a new
 * seed joins the table (pushing out the lowest record when it's full). Returns `save` itself when
 * nothing changes (no better than the seed's best, or too low for a full table). Throws a
 * RangeError for a seed outside 32 bits or a wave count that isn't a whole number in the
 * validator's range (a caller bug).
 */
export function withEndlessScore(save: SaveData, seed: number, wave: number): SaveData {
  if (!Number.isInteger(seed) || seed < 0 || seed >= 2 ** 32) {
    throw new RangeError(`endless: seed must be a 32-bit unsigned integer (got ${seed})`);
  }
  if (!Number.isInteger(wave) || wave < 0 || wave > ENDGAME_LIMITS.endlessWave) {
    throw new RangeError(
      `endless: waves held must be 0–${ENDGAME_LIMITS.endlessWave} (got ${wave})`,
    );
  }
  const table = save.endless ?? [];
  const at = table.findIndex((s) => s.seed === seed);
  if (at >= 0) {
    if (table[at]!.wave >= wave) return save; // at < length
    return { ...save, endless: table.map((s, i) => (i === at ? { seed, wave } : { ...s })) };
  }
  if (table.length < ENDGAME_LIMITS.endlessScores) {
    return { ...save, endless: [...table.map((s) => ({ ...s })), { seed, wave }] };
  }
  // Full: the lowest record goes (the oldest of the lowest), if the new one beats it.
  let low = 0;
  for (let i = 1; i < table.length; i++) if (table[i]!.wave < table[low]!.wave) low = i;
  if (table[low]!.wave >= wave) return save;
  return {
    ...save,
    endless: [...table.filter((_, i) => i !== low).map((s) => ({ ...s })), { seed, wave }],
  };
}
