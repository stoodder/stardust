// The price tag (`fx.price_tag`; design/enemies.md § 8, art-direction §7 *Impacts, hits, and
// deaths*): Everglow Security's death in every act ends in a clean shutdown and a falling price
// tag: Everglow's product, priced to the last. A white tag with a punched hole and a `gold.3` price
// line, hung on a `steel.4` string, inside the `auto` `ink.0` rim so it reads on any ground.
// - `hang`: hung over the body as the power goes off.
// - `flutter_0`/`flutter_1` (`flutter`, 12 fps): it tips one way, then the other, as it drops.
// - `lie`: landed, lying on its side on the ground, string and all.
// Anchored at the string's top, so a frame's foot is its canvas's bottom wherever it hangs; the
// tag's whole canvas is the same in every frame, so EverglowView's fall lands it on the ground.
// Drawn by EverglowView (render/views/EverglowView.ts, `tagFrame`).
import { defineSprite } from '../defineSprite.ts';

/** `S` the string, `W` the tag, `O` its punched hole, `G` the price line. */
const LEGEND = { S: 'steel.4', W: 'white.1', O: 'ink.1', G: 'gold.3' } as const;

// prettier-ignore
export const fxPriceTag = defineSprite({
  id: 'fx.price_tag',
  size: { w: 9, h: 8 },
  anchor: { x: 4, y: 0 },
  palette: 'everglow',
  outline: 'auto',
  legend: LEGEND,
  frames: {
    hang: [
      '....S....',
      '....S....',
      '...WWW...',
      '..WWOWW..',
      '..WWWWW..',
      '..WGGGW..',
      '..WWWWW..',
      '...WWW...',
    ],
    flutter_0: [
      '....S....',
      '...S.....',
      '..WWW....',
      '.WWOWW...',
      '.WWWWW...',
      '.WGGGW...',
      '..WWWW...',
      '...WW....',
    ],
    flutter_1: [
      '....S....',
      '.....S...',
      '....WWW..',
      '...WWOWW.',
      '...WWWWW.',
      '...WGGGW.',
      '...WWWW..',
      '....WW...',
    ],
    lie: [
      '.........',
      '.........',
      '.........',
      '.........',
      '.WWWWWW..',
      'SOWWGGWW.',
      '.WWWWWW..',
      '.........',
    ],
  },
  anims: {
    flutter: { frames: ['flutter_0', 'flutter_1'], fps: 12 },
  },
});
