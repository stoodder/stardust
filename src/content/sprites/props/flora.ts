// Flowering brush (decor). Its blooms are the act's flora accent: pink in Act I, embers in Act II,
// cold violet crystal in Act III, gold at the finale.
import { defineSprite } from '../defineSprite.ts';
import { ENV_VARIANTS } from '../tiles/tileGen.ts';

export const propFlora = defineSprite({
  id: 'prop.flora',
  size: { w: 16, h: 12 },
  anchor: { x: 8, y: 9 },
  palette: 'act1',
  variants: ENV_VARIANTS,
  outline: 'auto',
  glow: { slots: ['e1'], radius: 1 },
  // prettier-ignore
  frames: {
    v0: [
      '.....+*.........',
      '....+**+..+.....',
      '..3..++.3+*+....',
      '.343.33.3.+..+*.',
      '.3332332333.+**+',
      '33233223322332+.',
      '.32222222322232.',
      '.12212221222121.',
      '..1111211111111.',
      '...__________...',
      '................',
      '................',
    ],
  },
});
