// Pebble and Bricks on screen (T422; D103): his `pebble` portrait (her in his breast pocket) shows
// only once she's rescued (A2M3's cue seen, so it changes mid-battle, and every map after), and her
// name plate reads "???" until he names her (A2M3 w07).
import { describe, expect, it, vi } from 'vitest';
import type { CampaignMapId } from '../content/campaign.ts';
import type { StoryContext } from '../story/conditions.ts';
import { lineView } from './dialogue.ts';

vi.mock('./battle.ts', () => ({ startBattle: () => undefined }));
vi.mock('../render/scenes/BackdropScene.ts', () => ({ BACKDROP_SCENE_KEY: 'backdrop' }));

const ctx = (map: CampaignMapId, seen: readonly string[] = []): StoryContext => ({
  flags: {},
  map,
  pestsProcessed: 0,
  seen,
  run: null,
});
const TEXT = { profile: null, pestsProcessed: 0, evacuated: null };
const bricks = (c: StoryContext) =>
  lineView({ speaker: 'bricks', text: 'Small Fry.' }, c, TEXT, null).portrait?.variant ?? null;
const pebble = (c: StoryContext) =>
  lineView({ speaker: 'pebble', text: '(squeak)' }, c, TEXT, null).portrait?.variant ?? null;
const plate = (c: StoryContext) =>
  lineView({ speaker: 'pebble', text: '(squeak)' }, c, TEXT, null).name;

describe("Bricks's pocket and Pebble's name plate", () => {
  it('keeps Bricks bare-pocketed on A2M3 until the rescue cue has played', () => {
    expect(bricks(ctx('a2_m02'))).toBeNull();
    expect(bricks(ctx('a2_m03'))).toBeNull();
    expect(bricks(ctx('a2_m03', ['a2_m03_brief', 'a2_m03_w02']))).toBeNull();
    expect(bricks(ctx('a2_m03', ['a2_m03_cue_pebble']))).toBe('pebble');
    expect(bricks(ctx('a2_m04'))).toBe('pebble');
  });

  it('reads "???" until Bricks names her at W7, then "Pebble"', () => {
    expect(plate(ctx('a2_m03'))).toBe('???');
    expect(plate(ctx('a2_m03', ['a2_m03_cue_pebble']))).toBe('???');
    expect(plate(ctx('a2_m03', ['a2_m03_cue_pebble', 'a2_m03_w07']))).toBe('Pebble');
    expect(plate(ctx('a2_m04'))).toBe('Pebble');
    expect(plate(ctx('a3_m01'))).toBe('Pebble');
  });

  it("wears Bricks's bottle cap from A2M4 (T513), and his patch on it from A3M3", () => {
    expect(pebble(ctx('a2_m03', ['a2_m03_cue_pebble', 'a2_m03_w07']))).toBeNull();
    for (const map of ['a2_m04', 'a2_m05', 'a2_m06', 'a3_m01', 'a3_m02'] as const) {
      expect(pebble(ctx(map)), map).toBe('cap');
    }
    expect(pebble(ctx('a3_m03'))).toBe('patch');
  });
});
