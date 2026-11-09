// Elder (`elder`, design/enemies.md § 5.1): a big, slow, grumpy old Skitterkin (Old Thrum, who leads
// the Quiet Wave, is one). Broad and low, with an old shell of steel-grey plates over her back (her
// armor 2: the `armored` tell's steel) gone green with moss, a white tuft and bushy white brows over
// heavy-lidded eyes, and white chin whiskers. In Act I she reads as a cranky boss-lady; on re-read
// she is holding the little ones to her pace.
//
// The `huddle` tell (art-direction §8, `gold.4`): a row of warm gold spots glows along her flank,
// lit one step brighter on alternate steps so it pulses as she walks; render adds the soft ring
// under the group. She sways from foot to foot rather than bouncing.
import { defineSprite } from '../defineSprite.ts';
import { at, plot, stamp, type CharGrid } from '../helpers.ts';
import { finish, skitterBody } from './skitter.ts';

const W = 26;
const H = 19;

/**
 * The shell: a dome of three overlapping plates over the back (behind the face, seen from the
 * front), each lit on top with a dark seam between them.
 */
function shell(g: CharGrid, cx: number, cy: number, facing: 'se' | 'ne'): void {
  const sx = facing === 'se' ? cx - 3.5 : cx;
  const plates = [sx - 5, sx, sx + 5];
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const ch = at(g, x, y);
      if (ch === '.' || '789'.includes(ch)) continue;
      const dx = x + 0.5 - sx;
      const dy = y + 0.5 - (cy - 1.5);
      if (Math.hypot(dx / 8.5, dy / 5.5) > 1 || dy > 1.5) continue;
      const d = plates.map((p) => Math.abs(x + 0.5 - p));
      const k = d.indexOf(Math.min(...d));
      const edge = Math.abs(x + 0.5 - (plates[k] ?? 0)) > 2.2;
      plot(g, x, y, edge ? 'T' : dy < 0 ? 'S' : 'T');
    }
  }
}

function elder(facing: 'se' | 'ne', step: 0 | 1): string[] {
  const sway = step === 1 ? 0.5 : -0.5;
  const cx = 13 + sway;
  const cy = 10.5;
  const rx = 11;
  const g = skitterBody({ w: W, h: H, cx, cy, rx, ry: 7.5, facing, belly: 0.35 });
  shell(g, cx, cy, facing);
  const ox = Math.round(sway);
  // Moss on the shell: tufts of the accent ramp.
  const mx = facing === 'se' ? -3 : 0;
  stamp(g, 5 + ox + mx, 5, ['.cd', 'bcc']);
  stamp(g, 14 + ox + mx, 4, ['dc.', 'cbb']);
  stamp(g, 10 + ox + mx, 6, ['.d', 'cb']);
  // Huddle spots along the flank: gold, brighter on alternate steps.
  const spot = step === 0 ? '*' : '+';
  const dim = step === 0 ? '+' : '*';
  const legs =
    step === 0
      ? ['.11...11.....11...11.', '.00...00.....00...00.']
      : ['..11...11...11...11..', '..00...00...00...00..'];
  if (facing === 'se') {
    return finish(g, [
      [3, H - 2, legs],
      // A white tuft, gone thin on top.
      [11 + ox, 1, ['.W.W', 'WVWV']],
      // Bushy white brows over heavy lids (the lid is the body's lit step over the pupil).
      [15 + ox, 7, ['WWW.WWW']],
      [15 + ox, 8, ['.4k..4k']],
      [16 + ox, 9, ['k...k']],
      // Chin whiskers, and a mouth set firmly in disapproval.
      [17 + ox, 11, ['k.k']],
      [16 + ox, 12, ['W.V.W']],
      [3 + ox, 10, [spot, '.', dim]],
      [6 + ox, 12, [dim + '.' + spot]],
    ]);
  }
  // Seen from behind she is lit across the whole broad back (the sun is over her shoulder), so
  // the back view stays in the actors' value band: the shadow steps each come up one.
  const lift: Readonly<Record<string, string>> = { '1': '2', '2': '3', T: 'S' };
  for (const row of g) row.forEach((ch, x) => (row[x] = lift[ch] ?? ch));
  return finish(g, [
    [3, H - 2, legs],
    [11 + ox, 1, ['.W.W', 'WVWV']],
    [4 + ox, 11, [spot + '.' + dim + '.' + spot]],
    [17 + ox, 11, [dim + '.' + spot + '.' + dim]],
  ]);
}

export const enemyElder = defineSprite({
  id: 'enemy.elder',
  size: { w: W, h: H },
  anchor: { x: 13, y: H - 1 },
  palette: 'skitterkin',
  variants: ['skitterkin.ally'],
  outline: 'auto',
  glow: { slots: ['e0', 'e1'], radius: 1 },
  // The old shell (armored steel) and her white brows, tuft, and whiskers.
  legend: { S: 'steel.4', T: 'steel.3', W: 'white.0', V: 'steel.4' },
  frames: {
    walk_se_0: elder('se', 0),
    walk_se_1: elder('se', 1),
    walk_ne_0: elder('ne', 0),
    walk_ne_1: elder('ne', 1),
  },
  anims: {
    walk_se: { frames: ['walk_se_0', 'walk_se_1'], fps: 4 },
    walk_sw: { mirrorOf: 'walk_se' },
    walk_ne: { frames: ['walk_ne_0', 'walk_ne_1'], fps: 4 },
    walk_nw: { mirrorOf: 'walk_ne' },
  },
});
