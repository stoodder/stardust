// Clump separation (T117; D026 already offsets each unit sideways by uid): each unit also walks
// at its own tempo and starts on its own frame, so a tight clump's legs never move in lockstep
// and it reads as separate bugs, not one centipede. Pure, so it's unit-tested; EnemyView applies it.

/** A unit's walk-anim tempo (×0.88–1.12, in five steps) and the frame its walk starts on. */
export function walkTempo(uid: number): {
  readonly timeScale: number;
  readonly startFrame: number;
} {
  return { timeScale: 0.88 + ((uid * 3) % 5) * 0.06, startFrame: uid % 2 };
}
