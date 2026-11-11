// The REVOKED stamps (design/towers.md § 9: "the powered-down towers show a LICENSE REVOKED stamp
// for 1 s before they fold away"; art-direction §7 *License revoked*: red-stamped, `red.3` on
// `white.0`). Two rubber stamps on Everglow paper, each two lines of the 3×5 font in `red.3`
// inside a red rim, the ink worn thin in a few places along the rim (a real stamp's
// bite), the paper's lower and right edges a step grey so it lifts off the ground, and the
// `ink.0` outline round it so it reads on any act's ground:
// - `icon.stamp.license_revoked` "LICENSE / REVOKED": over every powered-down tower of the revoked
//   class (RevokedView), and for the loadout's and build bar's revoked slots.
// - `icon.stamp.uplink_revoked` "UPLINK / REVOKED": for the Orbital Strike's revoked slot.
// Authored 32×16 (the outline makes 34×18); not a 16×16 icon or an 8×8 glyph, so `icon.stamp.*`
// has its own size (icons.test.ts).
import { defineSprite } from '../defineSprite.ts';
import { textPixels, textWidth } from '../font3x5.ts';
import { grid, hash01, plot, rows } from '../helpers.ts';

/** The stamp's authored size. */
export const STAMP_W = 32;
export const STAMP_H = 16;

function stamp(top: string, bottom: string, seed: number): string[] {
  const g = grid(STAMP_W, STAMP_H, 'P');
  const right = STAMP_W - 2;
  const foot = STAMP_H - 2;
  // The paper's shaded lower and right edges, under the rim.
  for (let x = 1; x < STAMP_W; x++) plot(g, x, STAMP_H - 1, 'S');
  for (let y = 1; y < STAMP_H; y++) plot(g, STAMP_W - 1, y, 'S');
  plot(g, 0, STAMP_H - 1, '.');
  plot(g, STAMP_W - 1, 0, '.');
  // The rim, its ink worn thin in a few places (a real stamp's bite).
  const ink = (x: number, y: number): void => plot(g, x, y, hash01(x, y, seed) < 0.14 ? 'Q' : 'R');
  for (let x = 0; x <= right; x++) {
    ink(x, 0);
    ink(x, foot);
  }
  for (let y = 0; y <= foot; y++) {
    ink(0, y);
    ink(right, y);
  }
  // The two lines, centred inside the rim (text rows 2–6 and 8–12).
  const line = (text: string, y: number): void => {
    const x = 1 + Math.ceil((right - 1 - textWidth(text)) / 2);
    for (const p of textPixels(text, x, y)) plot(g, p.x, p.y, 'R');
  };
  line(top, 2);
  line(bottom, 8);
  return rows(g);
}

const LEGEND = { P: 'white.0', S: 'steel.4', R: 'red.3', Q: 'red.4' } as const;

export const iconStampLicenseRevoked = defineSprite({
  id: 'icon.stamp.license_revoked',
  size: { w: STAMP_W, h: STAMP_H },
  anchor: { x: 0, y: 0 },
  palette: 'everglow',
  outline: 'auto',
  legend: LEGEND,
  frames: { icon: stamp('LICENSE', 'REVOKED', 3) },
});

export const iconStampUplinkRevoked = defineSprite({
  id: 'icon.stamp.uplink_revoked',
  size: { w: STAMP_W, h: STAMP_H },
  anchor: { x: 0, y: 0 },
  palette: 'everglow',
  outline: 'auto',
  legend: LEGEND,
  frames: { icon: stamp('UPLINK', 'REVOKED', 5) },
});
