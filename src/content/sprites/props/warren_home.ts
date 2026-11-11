// The Preserve's warren homes (`prop.warren_home`; A3M1 decor, act3.md § A3M1, markers
// `home_<n>` in the inner basin): the mounds Everglow "relocated" the Skitterkin into, built in the
// warrens' own way, so a Scuttle Den (the warrens' gift, the same earth and moss) looks like one
// of them (art-direction §6). A heap of warm turned earth capped with moss, a round dark doorway
// rimmed in packed earth, crumbs and a pebble at its foot. `v0`: an Everglow inventory tag (a
// white card with a teal band) staked by the door, its number in ink. `v1`: a glowworm lantern
// on a reed by the door, still lit: someone is home. Earth and moss are the warrens' own colours
// (`WARREN_LEGEND`), so they hold in every act.
import { defineSprite } from '../defineSprite.ts';
import { grid, plot, rows, type CharGrid } from '../helpers.ts';
import { dome, doorway, reedLantern, WARREN_LEGEND } from '../towers/warrenBase.ts';

const W = 26;
const H = 22;
const AX = 13;
const AY = 17;

function home(look: 'v0' | 'v1'): string[] {
  const g: CharGrid = grid(W, H);
  // The contact shadow, then the mound.
  for (let x = AX - 10; x <= AX + 10; x++) {
    const dy = Math.round(Math.sqrt(Math.max(0, 1 - ((x + 0.5 - AX) / 10.5) ** 2)) * 3);
    for (let y = AY - dy; y <= AY + dy; y++) plot(g, x, y, '_');
  }
  dome(g, AX, AY, 10, 11, 0.5);
  // The round doorway, a little off-center toward the viewer's left (the lit side).
  doorway(g, AX - 4, AY - 1, 5, 5);
  // Crumbs and a pebble at its foot.
  plot(g, AX - 6, AY, 'K');
  plot(g, AX + 5, AY - 1, 'J');
  plot(g, AX + 7, AY - 2, 'V');
  plot(g, AX + 8, AY - 2, 'T');
  if (look === 'v0') {
    // The inventory tag on a steel stake: a white card, a teal band, an ink number.
    for (let y = AY - 6; y <= AY; y++) plot(g, AX + 3, y, 'T');
    for (let y = AY - 9; y <= AY - 6; y++) {
      for (let x = AX + 2; x <= AX + 6; x++) {
        plot(g, x, y, y === AY - 9 ? 'd' : (x + y) % 3 === 0 && y > AY - 8 ? 'k' : 'W');
      }
    }
  } else {
    reedLantern(g, AX + 2, AY, AY - 8);
  }
  return rows(g);
}

export const propWarrenHome = defineSprite({
  id: 'prop.warren_home',
  size: { w: W, h: H },
  anchor: { x: AX, y: AY },
  palette: 'skitterkin.ally',
  outline: 'auto',
  glow: { slots: ['e0', 'e1'], radius: 1 },
  legend: WARREN_LEGEND,
  frames: { v0: home('v0'), v1: home('v1') },
});
