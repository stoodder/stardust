// The A1M5 party hat (art-direction § Portrait roster, act1.md § A1M5: "Hats on."): a striped
// paper cone with a gold band round its brim and a white pom-pom on its tip, tipped at a jaunty
// angle on each speaker's crown. The packs come in assorted colors, so every speaker's cone has its
// own stripe color between the gold stripes. QUILL's cone predates this module and stays its own
// stamp (quill.ts). Painted before a portrait's outline pass, so the hat gets the hand outline.
import { plot, type CharGrid } from '../helpers.ts';

/** The grid characters a portrait paints its hat with (each must be in its palette or legend). */
export interface PartyHatInk {
  /** The cone's colored stripes, lit and shaded. */
  readonly stripe: string;
  readonly stripeShade: string;
  /** The gold stripes and brim band, lit and shaded. */
  readonly gold: string;
  readonly goldShade: string;
  /** The pom-pom, lit and shaded. */
  readonly pom: string;
  readonly pomShade: string;
}

export interface PartyHatSpec {
  /** The brim's center, on the crown (pixel coordinates). */
  readonly base: readonly [number, number];
  /** The cone's tip, where the pom-pom sits. */
  readonly tip: readonly [number, number];
  /** Half the brim's width, in pixels. */
  readonly halfWidth: number;
  readonly ink: PartyHatInk;
}

/** The pom-pom's radius. */
const POM_R = 1.6;

/**
 * Paints the cone from `base` to `tip`: diagonal stripes, the side away from the upper-left light
 * shaded, a gold band along the brim, and the pom-pom over the tip. Pixels off the frame are
 * dropped (a cone may run off the top edge).
 */
export function paintPartyHat(g: CharGrid, spec: PartyHatSpec): void {
  const [bx, by] = spec.base;
  const [tx, ty] = spec.tip;
  const len = Math.hypot(tx - bx, ty - by);
  const ax = (tx - bx) / len;
  const ay = (ty - by) / len;
  // The perpendicular, pointing to the cone's right as seen from its brim.
  const nx = -ay;
  const ny = ax;
  // Which side faces the light (upper left): the one whose normal points up-left.
  const litSign = nx + ny < 0 ? 1 : -1;
  const x0 = Math.floor(Math.min(bx, tx) - spec.halfWidth - 2);
  const x1 = Math.ceil(Math.max(bx, tx) + spec.halfWidth + 2);
  const y0 = Math.floor(Math.min(by, ty) - spec.halfWidth - 2);
  const y1 = Math.ceil(Math.max(by, ty) + spec.halfWidth + 2);
  const { ink } = spec;
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const px = x + 0.5 - bx;
      const py = y + 0.5 - by;
      const along = px * ax + py * ay;
      const across = px * nx + py * ny;
      if (along < 0 || along > len) continue;
      const half = spec.halfWidth * (1 - along / len) + 0.35;
      if (Math.abs(across) > half) continue;
      const lit = across * litSign >= -0.3;
      let ch: string;
      if (along < 1.6) ch = lit ? ink.gold : ink.goldShade;
      else {
        // Stripes slanted across the cone, about 2.5 px apart.
        const band = Math.floor((along + across * 0.7) / 2.4);
        const gold = band % 2 === 1;
        ch = gold ? (lit ? ink.gold : ink.goldShade) : lit ? ink.stripe : ink.stripeShade;
      }
      plot(g, x, y, ch);
    }
  }
  for (let y = Math.floor(ty - 2); y <= Math.ceil(ty + 2); y++) {
    for (let x = Math.floor(tx - 2); x <= Math.ceil(tx + 2); x++) {
      const dx = x + 0.5 - tx;
      const dy = y + 0.5 - ty;
      if (Math.hypot(dx, dy) > POM_R) continue;
      plot(g, x, y, dx + dy > 0.6 ? ink.pomShade : ink.pom);
    }
  }
}
