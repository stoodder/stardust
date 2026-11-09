// A1M3 · Special Delivery: its base conversations (story/campaign/act1.md § A1M3, *Base*),
// verbatim. Ids are `a1_m03_base_<topic>` (style-guide.md § 5.3); the app plays them in the base
// (app/baseScenes.ts, T308), never in a battle.
// - `arrival`: the first base visit with Zibzab's shop open lands on the Shop tab and plays it, as
//   the Zapcoil sample arrives (progression.md § 4.1).
// - `stardust`: the shop's open question, "Where does stardust come from?" (progression.md § 4).
//   Asked to the end, it sets `asked_zibzab_early`, which A2M4's truth scene pays off.
import { defineScene, defineScenes } from '../../define.ts';

export const scenes = defineScenes([
  defineScene('a1_m03_base_arrival', [
    {
      kind: 'line',
      speaker: 'zibzab',
      expression: 'happy',
      text: "Price first: your next visit. First one's on me. Zibzab is patient.",
    },
  ]),
  defineScene('a1_m03_base_stardust', [
    { kind: 'line', speaker: 'player', text: 'Where does stardust come from?' },
    {
      kind: 'line',
      speaker: 'zibzab',
      text: "You want to know where stardust comes from? Price first: you won't like it, and you can't return it. Still asking?",
    },
    {
      kind: 'choice',
      options: [
        {
          text: 'Still asking.',
          tone: 'earnest',
          set: { asked_zibzab_early: true },
          goto: 'answer',
        },
        { text: 'Not today.', tone: 'wry', goto: 'later' },
      ],
    },
    {
      kind: 'line',
      label: 'answer',
      speaker: 'zibzab',
      text: "It's the dead. Theirs. Sung to sleep, very slowly. Anyway. Forty for the Rivet tune-up?",
    },
    { kind: 'end' },
    // Not today: nothing more is said, and the question stays on the shelf.
    { kind: 'end', label: 'later' },
  ]),
]);
