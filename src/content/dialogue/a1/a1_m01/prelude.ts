// The Prelude, "Arrival" (story/campaign/act1.md § Prelude · Arrival), verbatim: the cinematic a
// new campaign plays before the New Hire Intake (D164). Seven shots over code-drawn stills; each
// line carrying a `label` is a still cue (the stage switches still and frame on it), so the labels
// are the cue table's keys and their order is pinned by prelude.test.ts. No tokens (there is no
// profile yet), no character A1M1 introduces, and the 3 s silence after the ad is unplugged is the
// shot's quiet wonder. tools/dialogueCanon.test.ts checks each line against its section.
import { defineScene, defineScenes } from '../../define.ts';

/** The prelude's scene id (a `scene_<name>` slot under the map it leads into). */
export const PRELUDE_SCENE_ID = 'a1_m01_scene_prelude';

export const scenes = defineScenes([
  defineScene(PRELUDE_SCENE_ID, [
    // Shot 1 · Brighter Every Day! (the ad)
    {
      label: 'p_ad',
      kind: 'line',
      speaker: 'pa',
      text: "Everglow Gardens, Tumble IV! Sunshine, lettuce, and a career that's brighter every day!",
    },
    {
      kind: 'line',
      speaker: 'pa',
      text: 'Now hiring Junior Perimeter Technicians! No experience needed. Helmet provided. One size fits most!',
    },
    {
      kind: 'line',
      speaker: 'pa',
      text: 'Everglow, Everglow, brighter every day! Everglow, Everglow, clearing the way!',
    },
    {
      label: 'p_small_print',
      kind: 'line',
      speaker: 'narrator',
      text: "The small print scrolls too fast to read. You read it anyway: 'Lettuce not for export.'",
    },
    // Shot 2 · The Haul (the freighter)
    {
      label: 'p_haul',
      kind: 'line',
      speaker: 'narrator',
      text: 'Day 61 aboard the Everglow freighter *Positive Outlook*. The ad has played 4,212 times.',
    },
    {
      kind: 'line',
      speaker: 'narrator',
      text: 'Cargo: confetti, 6 tonnes. Helmets, one size. And you.',
    },
    // Shot 3 · Tumble IV (the viewport: Dawn's pose)
    {
      label: 'p_view',
      kind: 'line',
      speaker: 'narrator',
      text: "Tumble IV. One day there lasts thirty-eight of yours. You're arriving just after noon.",
    },
    {
      label: 'p_unplug',
      kind: 'line',
      speaker: 'narrator',
      text: 'Behind you, the ad stops. Someone has unplugged it. Nobody plugs it back in.',
    },
    { kind: 'line', speaker: 'narrator', text: '', durationSec: 3 },
    // Shot 4 · Descent (the pan)
    {
      label: 'p_descent',
      kind: 'line',
      speaker: 'pa',
      text: 'Now descending to Everglow Gardens! Local time: afternoon. It will be afternoon for a while!',
    },
    {
      kind: 'line',
      speaker: 'narrator',
      text: 'Far below, small things move across the valley in a long line, all going the same way.',
    },
    {
      kind: 'line',
      speaker: 'pa',
      text: "Those are pests! Don't worry. Pests are why you're here!",
    },
    // Shot 5 · Touchdown (the sign flips to 0)
    {
      label: 'p_touchdown',
      kind: 'line',
      speaker: 'pa',
      text: 'Welcome to Everglow Gardens! Population: 340. Now 341!',
    },
    {
      label: 'p_incident',
      kind: 'line',
      speaker: 'pa',
      text: 'Pest incident! Please continue to enjoy your arrival!',
    },
    // Shot 6 · Dome Row (Bricks, a silhouette at the gate)
    {
      label: 'p_dome_row',
      kind: 'line',
      speaker: 'narrator',
      text: 'Dome Row. The domes, the turrets on their pads, and one road running out through the gate.',
    },
    {
      label: 'p_wave',
      kind: 'line',
      speaker: 'narrator',
      text: 'By the gate, someone very large raises one hand. The other hand holds a cannon.',
    },
    // Shot 7 · Delivery (Form FF-1; the intake rises over the still)
    { label: 'p_delivery', kind: 'line', speaker: 'gerald', text: 'DELIVERY: ATTEMPTED.' },
    {
      kind: 'line',
      speaker: 'narrator',
      text: "The mail drone drops a clipboard at your boots and leaves. It doesn't wait for a signature.",
    },
    {
      label: 'p_form',
      kind: 'line',
      speaker: 'system',
      text: 'Helmet link online. Form FF-1 detected.',
    },
  ]),
]);
