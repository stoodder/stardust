// Flowering brush (decor). Its blooms are the act's flora accent: pink in Act I, embers in Act II,
// cold violet crystal in Act III, gold at the finale. Act III's maps grow `crystal` in its place.
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
    // Act III's growth (`crystal`, T640c): cold violet crystal shards breaking out of the dark
    // ground (unsung stardust spreading from the mines), lit on their left faces, one tip aglow.
    // On an Act III map it stands where the brush grew (groundTiles `decorLook`).
    crystal: [
      '.....*..........',
      '....+e..........',
      '....ce.....e....',
      '..e.cb....cb....',
      '..cbcba..ccba...',
      '.ccbcba.cccba.e.',
      '.cbbcbaaccbbacb.',
      '.baabbaabaaaaba.',
      '..10111111101110',
      '...__________...',
      '................',
      '................',
    ],
  },
});
