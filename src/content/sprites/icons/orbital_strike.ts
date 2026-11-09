// Orbital Strike's ability icon (16×16, art-direction §5): the Everglow uplink satellite, teal
// solar wings out, firing its white-cored teal beam (the in-world beam) into a burst inside an
// orange reticle on the ground.
import { defineSprite } from '../defineSprite.ts';
import { ICON } from './iconGen.ts';

// prettier-ignore
export const iconAbilityOrbitalStrike = defineSprite({
  id: 'icon.ability.orbital_strike',
  size: { w: ICON, h: ICON },
  anchor: { x: 0, y: 0 },
  palette: 'everglow',
  outline: 'auto',
  frames: {
    icon: [
      '......44......',
      '.787.4334.787.',
      '.878132231878.',
      '.787.3223.787.',
      '.....1991.....',
      '......ww......',
      '.....9ww9.....',
      '.....9ww9.....',
      '.....9ww9.....',
      '..d..9ww9..d..',
      '.d..ewwwwe..d.',
      'd..cewwwwec..d',
      '.d..ceddec..d.',
      '..dd......dd..',
    ],
  },
});
