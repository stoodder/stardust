// How enemies' overheads sort (T501i, T530a): health bars and tell glyphs live in `overlay`, which
// otherwise draws in insertion order, so a bunched crowd's bars tangled whichever view was made
// first. Each unit's overhead takes a depth from its body's screen y (and its uid on a tie), so
// the front-most unit's bar draws over the bars behind it, as its body does in `world`. The band
// sits over the overlay's unsorted pieces (depth 0: rims, rings, squiggles) and under the floaters
// (TransientFx's depth 1), which always read on top (D132). Pure, so it's unit-tested.

/** The band's floor. */
export const OVERHEAD_DEPTH = 0.5;
/** Screen y's share of the band (a playfield is far under 10,000 px tall), and a uid's tie-break. */
const OVERHEAD_Y_STEP = 1e-5;
const OVERHEAD_UID_STEP = 1e-9;

/** The overhead's depth for a body whose ground point sits at screen y `y`. */
export function overheadDepth(y: number, uid: number): number {
  return OVERHEAD_DEPTH + Math.max(0, y) * OVERHEAD_Y_STEP + (uid % 1000) * OVERHEAD_UID_STEP;
}
