// A1M3 · Special Delivery: scenes (story/campaign/act1.md § A1M3, *Story delivery*), verbatim. Ids are
// `a1_m03_<slot>` (style-guide.md § 5.3). The shift teaches before it tests (D097): the Skyhook as
// it's issued, per-turret Hold Fire before Gerald's second pass, Time Dilation before the flock. The Joke of the Shift (w04) carries the optional
// **Who's there?** button (core-loop.md § 6.10): pressed, it plays `a1_m03_cue_knock_answer`;
// ignored, the scene runs on to QUILL's "nobody home". Bricks fact-checks either way.
import { defineScene, defineScenes } from '../../define.ts';

/** Bricks's fact-check, the last word on both branches of the knock-knock. */
const DOME = {
  kind: 'line',
  speaker: 'bricks',
  text: "It's a dome. It's always twenty-two degrees.",
} as const;

export const scenes = defineScenes([
  defineScene('a1_m03_brief', [
    {
      kind: 'line',
      speaker: 'quill',
      expression: 'happy',
      text: "Today's route includes Gerald. Gerald is the mail. Gerald has right of way.",
    },
  ]),
  // The shift's start, the first battle the save brings the newly issued Skyhook into (D061):
  // app/dialogue.ts plays `<map>_cue_issued_<tower>`. It ships at W3, with the Puffwings.
  defineScene('a1_m03_cue_issued_skyhook', [
    {
      kind: 'line',
      speaker: 'quill',
      expression: 'happy',
      text: 'New hardware! The Skyhook shoots down flyers. It ships at wave 3. Build it under the dotted air lane!',
    },
  ]),
  // The salvage-drone prompt wave: Form 88-B, then the crashed drones in Gerald's livery.
  defineScene('a1_m03_w02', [
    {
      kind: 'line',
      speaker: 'quill',
      text: "Rerouting Gerald requires Form 88-B. Form 88-B must be delivered by mail. I've asked Gerald.",
    },
    {
      kind: 'line',
      speaker: 'quill',
      expression: 'worried',
      text: "Gerald's colleagues. Gerald doesn't like to talk about it.",
    },
  ]),
  // Before Gerald's second pass (W4): hold fire turret by turret, on the ones that can hit him.
  defineScene('a1_m03_w03', [
    {
      kind: 'line',
      speaker: 'bricks',
      text: "Next pass, Sprout: hold fire on your Rivets and Skyhooks. Just those. Mortars can't reach Gerald. Let 'em work.",
    },
  ]),
  // Joke of the Shift: the knock-knock and its button (the single-button grammar's rehearsal).
  defineScene('a1_m03_w04', [
    {
      kind: 'line',
      speaker: 'quill',
      expression: 'happy',
      text: "Joke of the Shift! It's a knock-knock. Your line is 'Who's there?' There's a button. Knock knock.",
      button: { label: "Who's there?", reply: 'a1_m03_cue_knock_answer' },
    },
    {
      kind: 'line',
      speaker: 'quill',
      text: "No answer. I'll log it as 'nobody home.' ...That's also a joke! Two for one.",
    },
    DOME,
  ]),
  // The button's reply: QUILL does both halves of the punchline.
  defineScene('a1_m03_cue_knock_answer', [
    {
      kind: 'line',
      speaker: 'quill',
      expression: 'happy',
      text: "Lettuce. ...Now you say 'Lettuce who.' I'll do it. Lettuce who? Lettuce in, it's cold out here!",
    },
    DOME,
  ]),
  // The flock wave: the Time Dilation prompt.
  defineScene('a1_m03_w05', [
    {
      kind: 'line',
      speaker: 'quill',
      expression: 'happy',
      text: "Flock incoming: ten Puffwings! That's a lot of fluff.",
    },
    {
      kind: 'line',
      speaker: 'quill',
      text: 'Cast my Time Dilation as they reach your Skyhook. It slows pests, not turrets!',
    },
  ]),
  // Zibzab's shell-shop clanks onto the verge (the `zibzab_shop` marker): price first, always.
  defineScene('a1_m03_w06', [
    {
      kind: 'line',
      speaker: 'zibzab',
      expression: 'happy',
      text: 'Price first: forty stardust. Then the product: a very good gun. Zibzab does not lie. Lying is bad for repeat business.',
    },
  ]),
  defineScene('a1_m03_w07', [
    {
      kind: 'line',
      speaker: 'zibzab',
      text: "No refunds, no regrets! It's on the shell. Right there. Next to the other thing I won't refund.",
    },
  ]),
  // After Gerald's third pass (W7 opens with it): the form he was carrying.
  defineScene('a1_m03_w08', [
    {
      kind: 'line',
      speaker: 'bricks',
      text: "Pension form. Rejected. 'Missing signature.' I signed it. Twice. In pen.",
    },
  ]),
  // The debrief, on the results card: Gerald's route done, and Bricks on the mail that got
  // through when his form didn't (W8). QUILL on a loss: never a scold.
  defineScene('a1_m03_debrief', [
    { kind: 'branch', cond: { outcome: 'lost' }, goto: 'lost' },
    {
      kind: 'line',
      speaker: 'quill',
      expression: 'happy',
      text: "Gerald finished his route! All mail delivered. One parcel slightly singed. He'd like that noted.",
    },
    {
      kind: 'line',
      speaker: 'bricks',
      text: "Mail got through. Good. Somebody's paperwork should.",
    },
    { kind: 'end' },
    {
      label: 'lost',
      kind: 'line',
      speaker: 'quill',
      expression: 'happy',
      text: "Gerald finished his route! The pests finished theirs too. I'm logging one of those as a win.",
    },
  ]),
]);
