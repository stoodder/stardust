// Gerald's speaker icon (`portrait.gerald`; story/characters.md § Minor recurring characters,
// art-direction § Portrait roster): Gerald speaks only in delivery chimes and status text, so he
// gets a 16×16 icon beside his status line instead of a 48×48 portrait. The same mail drone as his
// unit sprite: a rotor, a round white Everglow capsule with a teal visor, an orange satchel with a
// letter peeking out (a blue stamp, his name-plate color). He has one face: `neutral`, plus the
// shared talk contract (`neutral_talk`, anim `talk_neutral`), where the chime lamp on his crown
// lights gold and the rotor blurs: that is how a line of status text "speaks". Authored 14×14; the
// auto outline makes 16×16, like every icon (art-direction § Sizes).
import { defineSprite } from '../defineSprite.ts';
import { disc, grid, line, plot, rows, stamp, type CharGrid } from '../helpers.ts';
import { diffPatch, portraitFrame, portraitTalkAnim, TALK_FPS } from './portrait.ts';

/** Authored size; the outline grows it to 16×16. */
const ICON = 14;

function paint(talk: boolean): string[] {
  const g: CharGrid = grid(ICON, ICON);
  // The rotor: a long blade at rest, a short blurred one with a hub glint while chiming.
  if (talk) line(g, 3, 0, 10, 0, '2');
  else line(g, 1, 0, 12, 0, '3');
  plot(g, 6, 1, '1');
  plot(g, 7, 1, '0');
  // The capsule: white Everglow paint lit from the upper left.
  disc(g, 7, 6.5, 4.6, (d, x, y) => {
    if (d > 3.8) return x + y < 12 ? '3' : '1';
    return x + y < 11 ? '4' : x + y < 14 ? '3' : '2';
  });
  // The chime lamp on his crown: dim teal at rest, gold while he chimes.
  plot(g, 7, 2, talk ? 'M' : '7');
  if (talk) plot(g, 8, 2, 'N');
  // The visor: a teal band, glinting.
  stamp(g, 4, 4, ['88899', '77888']);
  plot(g, 7, 4, 'w');
  // The satchel strap across the capsule, then the satchel: orange, a lit flap, a letter in it.
  line(g, 11, 5, 6, 10, 'c');
  // prettier-ignore
  stamp(g, 0, 8, [
    '.WWU..',
    'eWWUe.',
    'eeeeed',
    'dddddc',
    'ddddcc',
    '.cccc.',
  ]);
  // The thruster under him, a soft teal puff.
  plot(g, 8, 12, '+');
  plot(g, 9, 12, '+');
  plot(g, 8, 13, '*');
  return rows(g);
}

const rest = paint(false);
const talking = paint(true);
const neutral = portraitFrame('neutral');
const talkPatch = diffPatch(rest, talking);

export const portraitGerald = defineSprite({
  id: 'portrait.gerald',
  size: { w: ICON, h: ICON },
  anchor: { x: ICON / 2, y: ICON },
  palette: 'everglow',
  outline: 'auto',
  // prettier-ignore
  legend: { W: 'white.0', U: 'blue.3', M: 'gold.3', N: 'gold.4' },
  frames: {
    [neutral]: rest,
    [portraitFrame('neutral', { mouth: 'talk' })]: {
      from: neutral,
      patch: talkPatch ?? { x: 0, y: 0, rows: [' '] },
    },
  },
  anims: {
    [portraitTalkAnim('neutral')]: {
      frames: [neutral, portraitFrame('neutral', { mouth: 'talk' })],
      fps: TALK_FPS,
    },
  },
});
