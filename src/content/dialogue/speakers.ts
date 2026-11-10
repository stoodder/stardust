// The speaker registry (docs/story/style-guide.md § 5.1; docs/tech/story-runtime.md § Dialogue
// runner): every speaker's name plate, its color, its voice blip, its portrait sprite, and the rules
// that pick a portrait variant. Portrait sprite ids are final: `portrait.<speaker>` in
// src/content/sprites/portraits/ (T310a/b). One sprite per speaker; a variant is a frame prefix
// in it (`<variant>.<expression>[_talk]`, art-direction.md § Portrait roster), and every variant
// has all of the speaker's expressions. The derived `dark` bake is the absent speaker's frame.
import type { ColorName } from '../palettes/master.ts';
import type { Condition, SpeakerId } from './types.ts';

/** A portrait's sprite id (registered by the portrait tasks; `portrait.<speaker>`). */
export type PortraitSpriteId = `portrait.${string}`;
/** A voice blip's sound id (the typewriter's per-speaker blip; T314 authors the sounds). */
export type BlipId = `blip.${string}`;

/**
 * How a speaker's lines are framed (art-direction.md § Dialogue presentation): a 48×48 portrait,
 * a 16×16 icon with status text (Gerald), or no portrait, with its text style: `pa` a speaker
 * icon and PA name plate, `form` an off-white form panel (`kfa`), `distorted` the Hollow's
 * dropped letters, `caption` a centered caption (`narrator`), `ui` plain system copy.
 */
export type SpeakerFrame = 'portrait' | 'icon' | 'pa' | 'form' | 'distorted' | 'caption' | 'ui';

/** A portrait variant and when it shows. The first rule that holds wins; none: the base frame. */
export interface PortraitVariantRule {
  readonly variant: string;
  readonly when: Condition;
}

/** A name plate other than the speaker's own, and when it shows. The first rule that holds wins. */
export interface NamePlateRule {
  readonly name: string;
  readonly when: Condition;
}

export interface SpeakerDef {
  /** The name plate. */
  readonly name: string;
  /** Other name plates, in priority order (Pebble's "???" before she's named); none: `name`. */
  readonly names?: readonly NamePlateRule[];
  /** The name plate's color (a master palette name). */
  readonly color: ColorName;
  readonly frame: SpeakerFrame;
  /** The portrait (or Gerald's icon); null for a speaker with none. */
  readonly portrait: PortraitSpriteId | null;
  /** In priority order. */
  readonly variants: readonly PortraitVariantRule[];
  /** The typewriter's blip; null types silently (forms, captions, the Hollow, system copy). */
  readonly blip: BlipId | null;
}

/**
 * Every speaker. Colors follow each character's look (story/characters.md): QUILL's teal screen,
 * Bricks's Everglow-orange kit, Goldie's green overalls, Kip's gold trophy pin, Sterling's
 * corporate pink, Zibzab's brass shell, Prim's audit grey.
 */
export const SPEAKERS = {
  player: {
    name: 'You',
    color: 'white.0',
    frame: 'portrait',
    portrait: 'portrait.player',
    // Visor reflections (art-direction.md § Portrait roster): Act I confetti; later acts with art.
    variants: [{ variant: 'reflect_confetti', when: { act: 1 } }],
    blip: 'blip.player',
  },
  bricks: {
    name: 'Bricks',
    color: 'orange.4',
    frame: 'portrait',
    portrait: 'portrait.bricks',
    // Pebble in his breast pocket (D103): from her rescue on, live mid-battle (the cue is saved as
    // seen as it ends), and on every map after.
    variants: [
      {
        variant: 'pebble',
        when: {
          any: [
            { mapAtLeast: 'a2_m04' },
            { all: [{ mapIs: 'a2_m03' }, { seen: 'a2_m03_cue_pebble' }] },
          ],
        },
      },
    ],
    blip: 'blip.bricks',
  },
  quill: {
    name: 'QUILL',
    color: 'teal.4',
    frame: 'portrait',
    portrait: 'portrait.quill',
    variants: [
      { variant: 'purge', when: { flag: 'quill_choice', eq: 'purge' } },
      { variant: 'party_hat', when: { mapIs: 'a1_m05' } },
    ],
    blip: 'blip.quill',
  },
  sterling: {
    name: 'Sterling',
    color: 'pink.4',
    frame: 'portrait',
    portrait: 'portrait.sterling',
    variants: [],
    blip: 'blip.sterling',
  },
  zibzab: {
    name: 'Zibzab',
    color: 'brass.4',
    frame: 'portrait',
    portrait: 'portrait.zibzab',
    variants: [],
    blip: 'blip.zibzab',
  },
  vesthara: {
    name: "Ves'thara",
    color: 'violet.4',
    frame: 'portrait',
    portrait: 'portrait.vesthara',
    // The finale's Phase 3 `dawn` variant needs a phase condition; it joins with the finale.
    variants: [
      { variant: 'touched_deep', when: { act: 3 } },
      { variant: 'touched', when: { mapAtLeast: 'a2_m05' } },
    ],
    blip: 'blip.vesthara',
  },
  pebble: {
    name: 'Pebble',
    // Nobody knows her name until Bricks gives her one (A2M3 w07; D103).
    names: [
      {
        name: '???',
        when: { not: { any: [{ mapAtLeast: 'a2_m04' }, { seen: 'a2_m03_w07' }] } },
      },
    ],
    color: 'coral.4',
    frame: 'portrait',
    portrait: 'portrait.pebble',
    // Bricks's bottle cap from A2M4 (art-direction.md § Portrait roster), carrying his Survey Corps
    // patch from A3M3.
    variants: [
      { variant: 'patch', when: { mapAtLeast: 'a3_m03' } },
      { variant: 'cap', when: { mapAtLeast: 'a2_m04' } },
    ],
    blip: 'blip.pebble',
  },
  goldie: {
    name: 'Goldie',
    color: 'green.4',
    frame: 'portrait',
    portrait: 'portrait.goldie',
    variants: [{ variant: 'act3', when: { act: 3 } }],
    blip: 'blip.goldie',
  },
  kip: {
    name: 'Kip',
    color: 'gold.3',
    frame: 'portrait',
    portrait: 'portrait.kip',
    variants: [
      { variant: 'act3', when: { act: 3 } },
      { variant: 'act2', when: { act: 2 } },
    ],
    blip: 'blip.kip',
  },
  thrum: {
    name: 'Old Thrum',
    color: 'patina.4',
    frame: 'portrait',
    portrait: 'portrait.thrum',
    variants: [],
    blip: 'blip.thrum',
  },
  chitterbloom: {
    // Displayed as "Bramble" from A3M1 (characters.md); the name plate rule joins with Act III.
    name: 'Chitterbloom',
    color: 'coral.3',
    frame: 'portrait',
    portrait: 'portrait.chitterbloom',
    variants: [],
    blip: 'blip.chitterbloom',
  },
  prim: {
    name: 'Prim',
    color: 'steel.4',
    frame: 'portrait',
    portrait: 'portrait.prim',
    variants: [],
    blip: 'blip.prim',
  },
  gerald: {
    name: 'Gerald',
    color: 'blue.4',
    frame: 'icon',
    portrait: 'portrait.gerald',
    variants: [],
    blip: 'blip.gerald',
  },
  pa: {
    name: 'Everglow PA',
    color: 'orange.3',
    frame: 'pa',
    portrait: null,
    variants: [],
    blip: 'blip.pa',
  },
  kfa: {
    name: 'Kepler Frontier Authority',
    color: 'steel.3',
    frame: 'form',
    portrait: null,
    variants: [],
    blip: null,
  },
  hollow: {
    name: '',
    color: 'hollow.3',
    frame: 'distorted',
    portrait: null,
    variants: [],
    blip: null,
  },
  narrator: {
    name: '',
    color: 'white.1',
    frame: 'caption',
    portrait: null,
    variants: [],
    blip: null,
  },
  system: {
    name: 'Everglow',
    color: 'teal.3',
    frame: 'ui',
    portrait: null,
    variants: [],
    blip: null,
  },
} as const satisfies Readonly<Record<SpeakerId, SpeakerDef>>;

/** The speaker registry, typed for lookups. */
export const SPEAKER_DEFS: Readonly<Record<SpeakerId, SpeakerDef>> = SPEAKERS;

/** Speakers Act I's scripts use (act1.md), the set T310a/b give portraits in M3. */
export const ACT1_SPEAKERS: readonly SpeakerId[] = [
  'player',
  'bricks',
  'quill',
  'sterling',
  'zibzab',
  'goldie',
  'kip',
  'prim',
  'gerald',
  'pa',
  'system',
];
