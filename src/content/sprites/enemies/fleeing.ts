// The fleeing bodies (enemies/flee.ts): every Act I Skitterkin that runs ahead of the Hollow in
// Act II's waves (A2M1–A2M3: Nibblers, Zoomers, younglings, Diggers, Puffwings, Haulers, Elders,
// Bunchlings), drawn for a `fleeing`-tagged unit. The Brood Hauler's is its Act II self: the sack
// untied and the young showing in its mouth (art-direction §6, A2M3's "sacks visibly young").
import { enemyBroodHauler, hauler } from './brood_hauler.ts';
import { enemyBunchling } from './bunchling.ts';
import { enemyDigger } from './digger.ts';
import { enemyElder } from './elder.ts';
import { fleeingSprite } from './flee.ts';
import { enemyNibbler } from './nibbler.ts';
import { enemyPuffwing } from './puffwing.ts';
import { enemyYoungling } from './youngling.ts';
import { enemyZoomer } from './zoomer.ts';

export const enemyNibblerFleeing = fleeingSprite(enemyNibbler, 'enemy.nibbler_fleeing');
export const enemyZoomerFleeing = fleeingSprite(enemyZoomer, 'enemy.zoomer_fleeing', {
  body: '012346789OPQ',
});
export const enemyYounglingFleeing = fleeingSprite(enemyYoungling, 'enemy.youngling_fleeing');
export const enemyDiggerFleeing = fleeingSprite(enemyDigger, 'enemy.digger_fleeing');
export const enemyPuffwingFleeing = fleeingSprite(enemyPuffwing, 'enemy.puffwing_fleeing');
export const enemyBunchlingFleeing = fleeingSprite(enemyBunchling, 'enemy.bunchling_fleeing', {
  body: '012346789PQ',
});
export const enemyElderFleeing = fleeingSprite(enemyElder, 'enemy.elder_fleeing', {
  tuft: 'abcdeWV',
  body: '012346789ST',
});
export const enemyBroodHaulerFleeing = fleeingSprite(
  {
    ...enemyBroodHauler,
    frames: {
      walk_se_0: hauler('se', 0, true),
      walk_se_1: hauler('se', 1, true),
      walk_ne_0: hauler('ne', 0, true),
      walk_ne_1: hauler('ne', 1, true),
    },
  },
  'enemy.brood_hauler_fleeing',
  { body: '012346789ST', glanceShift: 4 },
);
