// Extraction Rigs 7 and 8 (`prop.rigs`; A2M2's Protect asset, act2.md § A2M2, design/maps.md § 5.2):
// two Everglow pump rigs on one steel plinth at the end of the rig branch, Rig 7 behind on the
// left, Rig 8 in front on the right, each an open lattice derrick (the ground shows through) over a
// white pump house with its number stencilled in orange. Ves'thara shatters rigs, and only rigs,
// with thread-glass: the damage is sapphire shards driven into the steel, never fire.
//
// One frame per asset damage band (`assetDamage`, D111), which AssetView swaps as the meter falls:
// - `intact`: both beacons lit teal, a little heap of drill spoil with cold violet flecks.
// - `damaged`: glass shards lodged in both derricks, their braces cracked, slivers in the dirt.
// - `critical_0`, `critical_1`, anim `critical` (2 fps): Rig 8 shattered (its derrick snapped,
//   the crown lying in the dirt among shards, its beacon dead) and Rig 7 still standing, cracked,
//   its beacon blinking alarm orange: one rig of two down, the HUD's low-asset alarm.
// - `lost`: both derricks snapped, the pump houses split, the plinth strewn with glass.
// The colors are fixed (Everglow hardware, Aelari glass), so they hold in every act.
import { defineSprite } from '../defineSprite.ts';
import { grid, isoBox, line, plot, rows, stamp, type CharGrid } from '../helpers.ts';

const W = 46;
const H = 46;
const CX = 22;
const FOOT_Y = 39; // the footprint's center (the anchor)

type RigState = 'ok' | 'cracked' | 'snapped';

// prettier-ignore
const DIGITS: Readonly<Record<'7' | '8', readonly string[]>> = {
  '7': ['ddd', '..d', '.d.', '.d.', '.d.'],
  '8': ['ddd', 'd.d', 'ddd', 'd.d', 'ddd'],
};

/** A thread-glass shard: a sliver of sapphire with a teal edge and a white glint. */
function shard(g: CharGrid, x: number, y: number, big: boolean): void {
  stamp(g, x, y, big ? ['..R.', '.RS.', 'RSTw', '.ST.', '..S.'] : ['.R', 'RS', 'Tw']);
}

/**
 * One rig: a derrick over a pump house. `bx` is the derrick's centre column, `base` the row its
 * legs stand on, `tall` its height; `beacon` the crown lamp ('+' lit teal, 'O' alarm, 'K' dead).
 */
function rig(
  g: CharGrid,
  bx: number,
  base: number,
  tall: number,
  num: '7' | '8',
  state: RigState,
  beacon: string,
): void {
  const top = base - tall;
  const cut = state === 'snapped' ? base - Math.floor(tall * 0.45) : top;
  const legAt = (y: number, side: -1 | 1): number => {
    const t = (base - y) / (base - top);
    return Math.round(bx + side * (6 - 4.5 * t)) - (side > 0 ? 1 : 0);
  };
  // The legs, lit left and shaded right, braced in X's; a snapped one stops in a jagged stub.
  for (let y = cut; y <= base; y++) {
    plot(g, legAt(y, -1), y, '3');
    plot(g, legAt(y, 1), y, '1');
  }
  for (let y = top + 2; y + 5 <= base; y += 5) {
    if (y < cut) continue;
    line(g, legAt(y, -1) + 1, y, legAt(y + 5, 1) - 1, y + 5, '2');
    line(g, legAt(y, 1) - 1, y, legAt(y + 5, -1) + 1, y + 5, '2');
  }
  if (state === 'snapped') {
    // The break: bent stubs, and the crown lying in the dirt beside the plinth, beacon dead.
    plot(g, legAt(cut, -1) + 1, cut - 1, '3');
    plot(g, legAt(cut, 1) - 2, cut - 1, '1');
    line(g, bx - 9, base + 4, bx - 3, base + 1, '2');
    line(g, bx - 9, base + 3, bx - 3, base, '3');
    stamp(g, bx - 12, base + 2, ['.443', 'dcd1', 'KK1.']);
  } else {
    // The drill string, and the crown block with its safety band and beacon.
    for (let y = top + 1; y <= base; y++) plot(g, bx - 1, y, y % 3 === 0 ? '0' : '2');
    stamp(g, bx - 3, top - 2, ['.443.', '4dcd1', '33221']);
    stamp(
      g,
      bx - 2,
      top - 4,
      beacon === '+' ? ['.+.', '+*+'] : [`.${beacon}.`, `${beacon}${beacon}${beacon}`],
    );
  }
  if (state === 'cracked') {
    // Glass shards driven through the near leg and the crown, the brace between them cracked.
    shard(g, legAt(base - 7, -1) - 2, base - 10, true);
    shard(g, legAt(top + 6, 1) - 1, top + 4, false);
    line(g, legAt(base - 14, -1) + 1, base - 14, legAt(base - 9, 1) - 1, base - 9, 'K');
  }
  // The pump house, front right of the derrick: white paint, a teal band, the rig's number.
  const hx = bx + 4;
  const hy = base + 1;
  isoBox(g, hx, hy, 5, 7, { top: '4', rim: 'w', left: '4', right: '3' });
  for (let x = hx - 5; x < hx + 5; x++) {
    const y = hy - 7 + Math.round(Math.abs(x + 0.5 - hx) / 2);
    plot(g, x, y + 2, x < hx ? '8' : '7');
  }
  stamp(g, hx - 4, hy - 4, DIGITS[num]);
  if (state === 'snapped') {
    // The house split by a shard through its roof.
    line(g, hx + 1, hy - 8, hx - 1, hy - 2, 'K');
    shard(g, hx, hy - 11, true);
  }
}

/** `alarm`: Rig 7's beacon in the critical band, lit orange (`on`) or dark (`off`); null: teal. */
function rigsGrid(rig7: RigState, rig8: RigState, alarm: 'on' | 'off' | null): string[] {
  const g = grid(W, H);
  // Ground shadow and the shared steel plinth.
  isoBox(g, CX, FOOT_Y + 1, 17, 0, { top: '_', rim: '_', left: '_', right: '_' });
  isoBox(g, CX, FOOT_Y, 15, 3, { top: '1', rim: '2', left: '0', right: 'K' });
  // Hazard stripes along the plinth's two front faces.
  for (let x = CX - 14; x < CX + 14; x++) {
    const y = FOOT_Y + 9 - Math.round(Math.abs(x + 0.5 - CX) / 2) - 1;
    if (((x + 64) >> 1) % 2 === 0) plot(g, x, y, 'c');
  }
  // The spoil heap at the back: grey tailings with cold violet flecks (drill spoil is unsung).
  // prettier-ignore
  stamp(g, CX + 8, FOOT_Y - 10, [
    '..NN..',
    '.NNNM.',
    'NNMMMM',
  ]);
  plot(g, CX + 10, FOOT_Y - 9, 'V');
  plot(g, CX + 12, FOOT_Y - 8, 'U');
  const beacon7 = rig7 === 'snapped' || alarm === 'off' ? 'K' : alarm === 'on' ? 'O' : '+';
  const beacon8 = rig8 === 'snapped' ? 'K' : '+';
  rig(g, CX - 8, FOOT_Y - 6, 26, '7', rig7, beacon7);
  rig(g, CX + 4, FOOT_Y - 1, 24, '8', rig8, beacon8);
  // Slivers of glass in the dirt once anything has been hit.
  if (rig7 !== 'ok' || rig8 !== 'ok') {
    shard(g, CX + 14, FOOT_Y - 2, false);
    shard(g, CX - 17, FOOT_Y - 1, false);
  }
  if (rig8 === 'snapped') {
    shard(g, CX - 2, FOOT_Y + 2, false);
    shard(g, CX + 9, FOOT_Y + 3, false);
  }
  return rows(g);
}

export const propRigs = defineSprite({
  id: 'prop.rigs',
  size: { w: W, h: H },
  anchor: { x: CX, y: FOOT_Y },
  palette: 'everglow',
  outline: 'auto',
  glow: { slots: ['e0', 'e1'], radius: 1 },
  legend: {
    M: 'grime.2',
    N: 'grime.3',
    U: 'violet.3',
    V: 'violet.4',
    K: 'ink.2',
    O: 'orange.3',
    // Thread-glass: the Aelari's sapphire and emerald, lit from inside.
    R: 'blue.2',
    S: 'blue.3',
    T: 'teal.4',
  },
  frames: {
    intact: rigsGrid('ok', 'ok', null),
    damaged: rigsGrid('cracked', 'cracked', null),
    critical_0: rigsGrid('cracked', 'snapped', 'on'),
    critical_1: rigsGrid('cracked', 'snapped', 'off'),
    lost: rigsGrid('snapped', 'snapped', null),
  },
  anims: { critical: { frames: ['critical_0', 'critical_1'], fps: 2 } },
});
