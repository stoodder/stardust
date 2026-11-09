// The audit podium (A1M4 decor, act1.md § A1M4: it faces the path, and Compliance Officer Prim
// hovers there all map; A3M2 revisits it empty). A white Everglow lectern with a teal band and the
// orange chevron. Prim (characters.md: "a clipboard-armed Everglow compliance drone, Auditor
// model") hovers at its shoulder: a tidy white box with one orange auditor lens, an antenna, a
// teal thruster, and her clipboard held out on a thin arm. Frames: `v0` the empty podium, and
// `prim_0`/`prim_1` with Prim bobbing (anim `prim`, her lens blinking on the beat).
import { defineSprite } from '../defineSprite.ts';
import { disc, grid, isoBox, line, plot, rows, stamp } from '../helpers.ts';

const W = 28;
const H = 40;
const AX = 11;
const AY = 34;

function podium(prim: 0 | 1 | null): string[] {
  const g = grid(W, H);
  isoBox(g, AX, AY + 1, 7, 0, { top: '_', rim: '_', left: '_', right: '_' });
  isoBox(g, AX, AY, 6, 11, { top: '4', rim: 'w', left: '3', right: '1' });
  // The sloped reading top, a teal band, and the orange Everglow chevron on the lit face.
  line(g, AX - 6, AY - 14, AX + 6, AY - 14, '2');
  for (let x = AX - 6; x < AX + 6; x++) {
    const y = AY - 6 + Math.round(Math.abs(x + 0.5 - AX) / 2);
    plot(g, x, y - 3, x < AX ? '8' : '7');
  }
  stamp(g, AX - 5, AY - 7, ['c.c', '.c.']);
  if (prim === null) return rows(g);
  const bob = prim; // 1 px up on the second beat
  // Her shadow on the ground, under where she hovers.
  for (let x = 17; x < 25; x++) plot(g, x, AY - 1, '_');
  const top = 9 - bob;
  // The body: a tidy rounded box, lit top-left.
  for (let y = top; y < top + 9; y++) {
    for (let x = 16; x < 26; x++) {
      const corner = (y === top || y === top + 8) && (x === 16 || x === 25);
      if (corner) continue;
      plot(g, x, y, y === top ? 'w' : x < 18 ? '4' : x > 23 ? '2' : y > top + 6 ? '3' : '4');
    }
  }
  // The auditor lens: one big orange eye (it blinks on the second beat), and a visor slit.
  disc(g, 21.5, top + 4.5, 2.5, (d) => (d > 1.8 ? 'k' : prim === 1 && d < 1 ? 'Q' : 'R'));
  if (prim === 0) plot(g, 21, top + 4, 'Q');
  line(g, 17, top + 2, 19, top + 2, '1');
  // The antenna with its teal tip, and the thruster puff below.
  line(g, 24, top - 3, 24, top - 1, '1');
  plot(g, 24, top - 4, '+');
  stamp(g, 19, top + 9, ['.77.', '..7.'].slice(0, 2 - bob));
  // The clipboard, held out over the podium on a thin arm: brass board, white sheet, ink lines.
  line(g, 15, top + 5, 13, top + 6, '1');
  stamp(g, 8, top + 3, ['.KKK.', 'Kwwwk', 'Kkkwk', 'Kwwwk', 'Kkwwk', '.KKK.']);
  return rows(g);
}

export const propPodium = defineSprite({
  id: 'prop.podium',
  size: { w: W, h: H },
  anchor: { x: AX, y: AY },
  palette: 'everglow',
  variants: ['everglow.worn'],
  outline: 'auto',
  glow: { slots: ['e0', 'e1'], radius: 1 },
  legend: { R: 'orange.3', Q: 'orange.4', K: 'brass.2' },
  frames: { v0: podium(null), prim_0: podium(0), prim_1: podium(1) },
  anims: { prim: { frames: ['prim_0', 'prim_1'], fps: 2 } },
});
