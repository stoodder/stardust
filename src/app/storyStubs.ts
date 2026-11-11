// Placeholder scenes for A3M4's story beats that T710's meta plays before the map's own dialogue
// lands (T720 writes them in content/dialogue/a3/a3_m04): the debrief carrying C4 (its options as
// campaign.md § 6.2's ledger writes them, each setting `quill_choice` with QUILL's "will remember
// that") and Night Shift, the base's mandatory vignette (act3.md § A3M4's lines). A registered
// scene always wins (`storyScene`), so once T720 registers its own these are never read and the
// file goes. Never in the registries, so the canon checks and the game's lists never see them;
// storyStubs.test.ts validates them like real dialogue.
import { SCENES, type Scene } from '../content/dialogue/index.ts';
import { defineScene, defineScenes } from '../content/dialogue/define.ts';

export const STORY_STUB_SCENES = defineScenes([
  defineScene('a3_m04_debrief', [
    {
      kind: 'line',
      speaker: 'quill',
      text: "I'd decide for myself, but I'm not permitted to. That's sort of the whole problem.",
    },
    {
      kind: 'choice',
      options: [
        {
          text: 'Purge them. All of them.',
          tone: 'earnest',
          set: { quill_choice: 'purge' },
          remember: 'quill',
        },
        {
          text: 'Keep them. Stay yourself.',
          tone: 'quiet',
          set: { quill_choice: 'keep' },
          remember: 'quill',
        },
        {
          text: 'Write your own.',
          tone: 'wry',
          set: { quill_choice: 'rewrite' },
          remember: 'quill',
        },
      ],
    },
  ]),
  defineScene('a3_m04_base_night_shift', [
    {
      kind: 'line',
      speaker: 'vesthara',
      text: "I cannot remember my mother's face. I remember that I loved it. That will have to be enough.",
    },
    {
      kind: 'line',
      speaker: 'pebble',
      text: "Why did the scarecrow win a prize? Because he was out. Standing. In a field. (squeak) That's two jokes.",
    },
    { kind: 'line', speaker: 'vesthara', expression: 'laugh', text: '(a laugh, short, surprised)' },
    { kind: 'line', speaker: 'vesthara', text: 'I had forgotten I could do that.' },
    { kind: 'branch', cond: { flag: 'quill_choice', eq: 'keep' }, goto: 'keep' },
    { kind: 'branch', cond: { flag: 'quill_choice', eq: 'rewrite' }, goto: 'rewrite' },
    // Purge: no line; QUILL's status bar blinks (a silence in her frame).
    { kind: 'line', speaker: 'quill', text: '', durationSec: 2 },
    { kind: 'branch', cond: { flag: 'quill_choice', eq: 'purge' }, goto: 'again' },
    {
      label: 'keep',
      kind: 'line',
      speaker: 'quill',
      text: "It's 'outstanding in his field,' Pebble. ...Yours is better.",
    },
    { kind: 'branch', cond: { flag: 'quill_choice', eq: 'keep' }, goto: 'again' },
    {
      label: 'rewrite',
      kind: 'line',
      speaker: 'quill',
      text: "I'll have one tomorrow. I'm writing it.",
    },
    { label: 'again', kind: 'line', speaker: 'pebble', text: '(squeak) Again!' },
  ]),
]);

/**
 * Scene `id`: the registered one, else its placeholder here (A3M4's debrief and Night Shift until
 * T720 registers them), else undefined.
 */
export function storyScene(id: string): Scene | undefined {
  return SCENES[id] ?? STORY_STUB_SCENES.find((s) => s.id === id);
}
