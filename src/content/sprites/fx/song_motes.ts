// The Leaving Song's motes (art-direction §1 principle 6, §7 *Laid to rest* and *Scattered*;
// design/maps.md § 5.5): warm gold means remembered, cold violet means forgotten. Each is light, not
// a body (no outline), centred on its anchor; SongView draws a pooled cloud of them (T830).
// - **`fx.rest_mote`** (5×5): one of the 6–10 gold motes a unit laid to rest rises into: `r0` a
//   white-hot cross in gold, `r1` a gold point over its pink trail, `r2` a lone gold speck; `rise`
//   (6 fps) twinkles through them. Its gold is the `skitterkin` palette's emissives, so it glows.
// - **`fx.ishael_mote`** (4×4, Dawn): the one mote that rises apart from the rest and hangs at
//   Ves'thara's shoulder: larger, a 2×2 white-gold core in a gold ring, `glow` (2 frames, 2 fps,
//   slower than the rest) breathing between white and gold. Nothing labels it.
// - **`fx.scatter_mote`** (5×5): the cold violet a unit broken outside the song scatters into
//   (`stardust.unsung`, never warm): `m0`–`m2` its twinkle as it drifts back along the road and
//   hovers (`drift`, 6 fps, the unravel mote's grammar); `pull_0`–`pull_1` the motes condensing as
//   they draw in on the re-forming body (`pull`, 8 fps); `reform_0`–`reform_2` the violet flash
//   where it re-forms, a burst that rings out and is gone (`reform`, 12 fps, once).
import { defineSprite } from '../defineSprite.ts';

// prettier-ignore
export const fxRestMote = defineSprite({
  id: 'fx.rest_mote',
  size: { w: 5, h: 5 },
  anchor: { x: 2, y: 2 },
  palette: 'skitterkin',
  glow: { slots: ['e0', 'e1'], radius: 1 },
  legend: { W: 'white.1', P: 'pink.3' },
  frames: {
    r0: ['.....', '..*..', '.*W*.', '..*..', '.....'],
    r1: ['.....', '..*..', '..P..', '.....', '.....'],
    r2: ['.....', '.....', '..+..', '.....', '.....'],
  },
  anims: {
    rise: { frames: ['r0', 'r1', 'r2', 'r1'], fps: 6 },
  },
});

// prettier-ignore
export const fxIshaelMote = defineSprite({
  id: 'fx.ishael_mote',
  size: { w: 4, h: 4 },
  anchor: { x: 2, y: 2 },
  palette: 'skitterkin',
  glow: { slots: ['e0', 'e1'], radius: 1 },
  legend: { W: 'white.1' },
  frames: {
    i0: ['.**.', '*WW*', '*WW*', '.**.'],
    i1: ['.++.', '+*W+', '+W*+', '.++.'],
  },
  anims: {
    glow: { frames: ['i0', 'i1'], fps: 2 },
  },
});

// prettier-ignore
export const fxScatterMote = defineSprite({
  id: 'fx.scatter_mote',
  size: { w: 5, h: 5 },
  anchor: { x: 2, y: 2 },
  palette: 'hollow',
  legend: { V: 'violet.3', U: 'violet.4', W: 'white.1' },
  frames: {
    m0: ['.....', '..U..', '.UWU.', '..U..', '.....'],
    m1: ['.....', '..U..', '..V..', '.....', '.....'],
    m2: ['.....', '.....', '..V..', '.....', '.....'],
    pull_0: ['V...V', '.U.U.', '..W..', '.U.U.', 'V...V'],
    pull_1: ['.....', '.V.V.', '..U..', '.V.V.', '.....'],
    reform_0: ['..U..', '.UWU.', 'UWWWU', '.UWU.', '..U..'],
    reform_1: ['.U.U.', 'U...U', '..V..', 'U...U', '.U.U.'],
    reform_2: ['V...V', '.....', '.....', '.....', 'V...V'],
  },
  anims: {
    drift: { frames: ['m0', 'm1', 'm2', 'm1'], fps: 6 },
    pull: { frames: ['pull_0', 'pull_1'], fps: 8 },
    reform: { frames: ['reform_0', 'reform_1', 'reform_2'], fps: 12, loop: false },
  },
});

/** The song's motes in gallery order. */
export const SONG_MOTES = [fxRestMote, fxIshaelMote, fxScatterMote] as const;
