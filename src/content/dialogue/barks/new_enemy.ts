// Act I `new_enemy` pool (story/campaign/act1.md § Act I barks): QUILL meets a pest the save hasn't
// seen, wherever it first spawns. The map-scoped ones (A1M3's Puffwing, A1M4's Elder) stay with
// their maps.
import { defineBarks } from '../define.ts';

export const newEnemy = defineBarks([
  {
    id: 'quill_new_enemy_a1_10',
    speaker: 'quill',
    expression: 'happy',
    text: 'Bunchlings! Pop one, get three Nibblers. Splash gets the whole bunch!',
    trigger: { on: 'new_enemy', enemy: 'bunchling' },
    when: { act: 1 },
  },
  {
    id: 'quill_new_enemy_a1_11',
    speaker: 'quill',
    expression: 'happy',
    text: 'Diggers! They tunnel under the road and pop up further on. Very punctual!',
    trigger: { on: 'new_enemy', enemy: 'digger' },
    when: { act: 1 },
  },
]);
