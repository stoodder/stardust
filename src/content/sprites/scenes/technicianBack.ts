// The Technician from behind (art-direction § 6, *The finale's stills* and *The prelude's stills*):
// the one builder for the pose the campaign opens and closes on, three-quarter, turned toward a
// light east of it. The oversized Everglow helmet (§ 5's `player`) with its antenna, the collar,
// sloped shoulders and arms, the back running out of the frame's foot; a silhouette, no face ever
// drawn. The Dawn (`dawn.ts`) and the prelude's viewport (`prelude/viewport.ts`) both stand it at
// the same place in the frame, each lighting it in its own colours (`TechnicianInks`).
import type { CharGrid } from '../helpers.ts';
import { plot } from '../helpers.ts';
import { dithered, eachOnLine, SCENE_H } from './sceneKit.ts';

/** The helmet: an ellipse centred at (cx, cy). */
export interface Helm {
  readonly cx: number;
  readonly cy: number;
  readonly rx: number;
  readonly ry: number;
}

/** The Dawn's helmet, the pose's place in the frame (the prelude's viewport reuses it). */
export const TECHNICIAN_HELM: Helm = { cx: 92, cy: 71, rx: 17, ry: 15 };

/** The grid characters a still lights the Technician with (the light stands east of it). */
export interface TechnicianInks {
  /** The back's and the helmet's dark. */
  readonly body: string;
  /** The deepest dark: arm seams, the collar ring, the visor's frame, the back's foot. */
  readonly deep: string;
  /** The sky caught on the helmet's crown and the top edges turned away from the light. */
  readonly crown: string;
  /** The rim's inner pixel (and the helmet's rim line toward the light). */
  readonly rimInner: string;
  /** The rim where it softens: the helmet's top edge, the start of the back's fading rim. */
  readonly rimSoft: string;
  /** The helmet's lit edge. */
  readonly rimHelm: string;
  /** The shoulders' lit edge (to 30 rows under the collar). */
  readonly rimShoulder: string;
  /** The antenna's tip. */
  readonly antennaTip: string;
}

/** The visor, down: its glass's ramp (top to bottom), the light's line across it, two glints. */
export interface VisorInks {
  readonly glass: readonly [string, string, string];
  readonly line: readonly [string, string];
  readonly glint: readonly [string, string];
}

/**
 * The back's east rim below the shoulders (M8 review R5): the light's colour holds to the shoulder
 * line, then breaks up, dithered into the dark of the back over RIM_FADE rows, so it never runs as
 * an unbroken stroke to the frame's foot.
 */
const RIM_SOLID = 22;
const RIM_FADE = 40;

/** The back: collar, then shoulders rounding out, arms hanging, a little narrower at the waist. */
function backHalf(t: number): number {
  if (t < 3) return 9;
  if (t < 14) return 9 + Math.sqrt((t - 3) / 11) * 25;
  return 34 - Math.min(4, (t - 14) / 12);
}

/** The Technician's shape at `helm`, and its painters. */
export function technicianBack(helm: Helm) {
  const collarY = helm.cy + helm.ry - 4;

  const inHelmet = (x: number, y: number): boolean =>
    ((x - helm.cx) / helm.rx) ** 2 + ((y - helm.cy) / helm.ry) ** 2 <= 1;

  /** The helmet's visor, down: its band round the front, seen past the helmet's east edge. */
  const inVisor = (x: number, y: number): boolean => {
    const dy = y - helm.cy;
    if (dy < -7 || dy > 6 || !inHelmet(x, y)) return false;
    return x >= helm.cx + 7 + (dy * dy) / 14;
  };

  const inBody = (x: number, y: number): boolean => {
    if (y < collarY) return false;
    const half = backHalf(y - collarY);
    // Turned toward the light: the far (east) shoulder a little narrower than the near one.
    return x >= helm.cx - half && x <= helm.cx + half * 0.86;
  };

  const inTechnician = (x: number, y: number): boolean => inHelmet(x, y) || inBody(x, y);

  /** The gap between arm and torso: a dark line down each side, below the shoulder. */
  const armSeam = (x: number, y: number): boolean => {
    const t = y - collarY;
    if (t < 18) return false;
    const half = backHalf(t);
    return x === Math.round(helm.cx - half + 8) || x === Math.round(helm.cx + half * 0.86 - 7);
  };

  /** The helmet, antenna, collar and back, rimmed toward the light. */
  const paintBack = (g: CharGrid, k: TechnicianInks): void => {
    const rimBelow = (x: number, y: number): string =>
      dithered([k.rimSoft, k.rimInner, k.body], (y - collarY - RIM_SOLID - 8) / RIM_FADE, x, y);
    // The helmet's antenna (its mic stub's partner), up off the back-left, its tip lit.
    eachOnLine(helm.cx - 11, helm.cy - 9, helm.cx - 15, helm.cy - 22, (x, y) =>
      plot(g, x, y, k.body),
    );
    plot(g, helm.cx - 15, helm.cy - 23, k.antennaTip);
    for (let y = helm.cy - helm.ry - 1; y < SCENE_H; y++) {
      for (let x = helm.cx - 40; x <= helm.cx + 40; x++) {
        if (!inTechnician(x, y)) continue;
        const helmet = inHelmet(x, y) && y < collarY + 2;
        const eastEdge = !inTechnician(x + 1, y);
        const topEdge = !inTechnician(x, y - 1);
        let ch = k.body;
        if (helmet) {
          // The shell catches a little sky on its crown.
          const crown = ((x - helm.cx + 4) / 10) ** 2 + ((y - helm.cy + 9) / 4) ** 2 <= 1;
          ch = crown ? k.crown : k.body;
          if (!inTechnician(x + 2, y) && !eastEdge) ch = k.rimInner;
        } else if (armSeam(x, y)) ch = k.deep;
        else if (!inTechnician(x + 2, y) && !eastEdge)
          // The rim's inner pixel only on the shoulder; below it breaks into the back's dark.
          ch = dithered([k.rimInner, k.body], (y - collarY - RIM_SOLID) / RIM_FADE, x, y);
        else if (y > 150) ch = dithered([k.body, k.deep], (y - 150) / 30, x, y);
        if (eastEdge)
          ch = y < collarY ? k.rimHelm : y < collarY + 30 ? k.rimShoulder : rimBelow(x, y);
        else if (topEdge) ch = x > helm.cx - 4 ? (helmet ? k.rimSoft : k.rimInner) : k.crown;
        plot(g, x, y, ch);
      }
    }
    // The helmet's rim, wider than the collar under it, and the collar ring.
    for (let x = helm.cx - 14; x <= helm.cx + 13; x++) {
      if (inHelmet(x, collarY - 1)) plot(g, x, collarY - 1, x > helm.cx + 9 ? k.rimInner : k.crown);
    }
    for (let x = helm.cx - 9; x <= helm.cx + 8; x++) plot(g, x, collarY + 1, k.deep);
  };

  /**
   * Visor down: the mirrored glass wraps round the front in a dark frame, reflecting what is
   * behind us, with the light's line across it and a white glint.
   */
  const paintVisorDown = (g: CharGrid, frame: string, v: VisorInks): void => {
    for (let y = helm.cy - 7; y <= helm.cy + 6; y++) {
      for (let x = helm.cx; x <= helm.cx + helm.rx; x++) {
        if (!inVisor(x, y)) continue;
        const framed = !inVisor(x - 1, y) || !inVisor(x, y - 1) || !inVisor(x, y + 1);
        const dy = y - helm.cy;
        let ch = dithered(v.glass, (dy + 6) / 10, x, y);
        if (dy === 2) ch = v.line[0];
        else if (dy === 3) ch = v.line[1];
        plot(g, x, y, framed ? frame : ch);
      }
    }
    plot(g, helm.cx + 12, helm.cy - 4, v.glint[0]);
    plot(g, helm.cx + 13, helm.cy - 5, v.glint[1]);
  };

  return { collarY, inHelmet, inVisor, inTechnician, paintBack, paintVisorDown };
}
