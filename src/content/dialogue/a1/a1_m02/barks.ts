// A1M2 · Hatching Season: map-scoped barks (story/campaign/act1.md § A1M2, *Barks*), verbatim. They
// fire only on this map; act-wide pools live in ../../barks/. Ids end `_a1_02` (this map), so no
// other Act I map's ids collide with them.
import { defineBarks } from '../../define.ts';

export const barks = defineBarks([
  // A Hauler down: QUILL's glee and Bricks's tip are standalone barks, so they take turns over the
  // shift's Hauler kills (one a kill, 6 s apart).
  {
    id: 'quill_enemy_killed_a1_02',
    speaker: 'quill',
    expression: 'happy',
    text: 'Sack ruptured! Glitter everywhere! Tidybots are on it!',
    trigger: { on: 'enemy_killed', enemy: 'hauler' },
  },
  {
    id: 'bricks_enemy_killed_a1_02',
    speaker: 'bricks',
    text: 'Mortars on the big ones. Rivets bounce off that hide till tier three.',
    trigger: { on: 'enemy_killed', enemy: 'hauler' },
  },
  // The first Hauler through the gate: a pebble in the shoe, logged and not understood.
  {
    id: 'quill_enemy_leaked_a1_02',
    speaker: 'quill',
    text: 'A Hauler got out, sack and all! It looked... relieved? Logging it.',
    trigger: { on: 'enemy_leaked', enemy: 'hauler' },
  },
  // Selling Denise (the tagged turret): it waits its turn on the panel rather than dropping.
  {
    id: 'bricks_tower_sold_a1_02',
    speaker: 'bricks',
    text: "You sold Denise. ...Fair. She'd have done the same.",
    trigger: { on: 'tower_sold', tagged: true },
  },
]);
