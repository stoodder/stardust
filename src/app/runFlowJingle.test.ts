// A flow scene's jingle (T512): Act II's close plays the colony jingle once, in minor, as the A2M6
// stinger's caption shows, never before it and never twice; a skipped stinger plays nothing.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SCENES } from '../content/dialogue/index.ts';
import { dialogue } from '../ui/dialogue/state.ts';
import { advanceScene, setDialogueEnabled, skipScene } from './dialogue.ts';
import { jingleDue, jinglesOf, playInOrder } from './runFlow.ts';

const played = vi.hoisted(() => [] as string[]);
vi.mock('./audio.ts', () => ({
  playJingle: (variant: string) => played.push(variant),
}));

const stinger = SCENES.a2_m06_scene_stinger!;
/** Lets the audio's on-demand import settle. */
const settle = () => new Promise((r) => setTimeout(r, 0));
const lineIndex = (): number | null =>
  dialogue.scene.value?.line === null ? null : (dialogue.scene.value?.transcript.length ?? null);

afterEach(() => {
  while (skipScene());
  setDialogueEnabled(true);
  played.length = 0;
});

describe("the A2M6 stinger's jingle", () => {
  it('belongs to the stinger, on its caption line', () => {
    expect(jinglesOf([stinger])).toEqual([
      { scene: 'a2_m06_scene_stinger', line: 2, jingle: 'minor' },
    ]);
    expect(jinglesOf([SCENES.a1_m05_scene_stinger!])).toEqual([]);
    expect(jingleDue(null, jinglesOf([stinger]))).toBeNull();
  });

  it('plays once, in minor, as the caption shows (after the dark and the PA)', async () => {
    let done = 0;
    playInOrder([stinger], () => done++);
    expect(dialogue.scene.value?.sceneId).toBe('a2_m06_scene_stinger');
    // The dark, then the PA's "Shift change.": no jingle yet.
    expect(lineIndex()).toBe(0);
    advanceScene();
    expect(dialogue.scene.value?.line?.speaker).toBe('pa');
    await settle();
    expect(played).toEqual([]);
    advanceScene();
    expect(dialogue.scene.value?.line?.text).toBe(
      'The jingle plays once, over the dark. In minor.',
    );
    await vi.waitFor(() => expect(played).toEqual(['minor']));
    // Left to ring out, then the way on; it never plays twice.
    advanceScene();
    advanceScene();
    expect(done).toBe(1);
    await settle();
    expect(played).toEqual(['minor']);
  });

  it('plays nothing when the stinger is skipped, or while dialogue is off', async () => {
    let done = 0;
    playInOrder([stinger], () => done++);
    expect(skipScene()).toBe(true);
    setDialogueEnabled(false);
    playInOrder([stinger], () => done++);
    expect(done).toBe(2);
    expect(played).toEqual([]);
    // A later scene showing a line at the same index plays nothing: the watch ended with the flow.
    setDialogueEnabled(true);
    playInOrder([SCENES.a1_m05_scene_stinger!], () => done++);
    advanceScene();
    advanceScene();
    await settle();
    expect(played).toEqual([]);
  });
});
