// Where an enemy's body is drawn (T530a): EnemyView walks each unit a little to the side of its
// route's line (its lane offset, D026) and lifts a flyer 12 px, so a view that marks a unit from
// its grid point alone lands beside it. Views that mark bodies (MindView's squiggle, PhaseView's
// ring, BeamView's beam end, ShieldAuraView's glint) ask for the drawn box through this seam;
// BattleScene answers from its EnemyViews. Types only, so the views stay testable.

/** A body as drawn, in screen px (written into by `UnitAnchors.box`). */
export interface UnitBox {
  /** The body's centre line (its lane offset included). */
  x: number;
  /** The top of its frame as drawn (lift and bob included). */
  top: number;
  /** The bottom of its frame as drawn (its anchor: a flyer's is in the air). */
  bottom: number;
  /** Its ground point (the lane offset included, no lift): where rings under it sit. */
  groundY: number;
  /** Half its frame's width. */
  halfW: number;
}

/** The drawn body of enemy `uid`, written into `out`; false when it has no placed view. */
export interface UnitAnchors {
  box(uid: number, out: UnitBox): boolean;
}

/** A fresh box (one per view, reused every frame). */
export function blankBox(): UnitBox {
  return { x: 0, top: 0, bottom: 0, groundY: 0, halfW: 0 };
}

/** No anchors: views fall back to the unit's grid point (unit tests, scenes without enemies). */
export const NO_ANCHORS: UnitAnchors = { box: () => false };
