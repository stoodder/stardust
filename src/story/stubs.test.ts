// The seam stubs (T300b) throw until their tasks land; this keeps each one honest about which.
import { describe, expect, it } from 'vitest';
import { newBarkState } from './barks.ts';
import { codexTitle } from './codex.ts';
import { actOf, type StoryContext } from './conditions.ts';
import { memosDue } from './inbox.ts';
import { sceneSlot } from './runner.ts';
import { resolveText } from './text.ts';

const CTX: StoryContext = { flags: {}, map: null, pestsProcessed: 0, run: null };

describe('story seam stubs', () => {
  it.each([
    ['actOf', () => actOf('a1_m01'), 'T302a'],
    ['sceneSlot', () => sceneSlot('a1_m01_brief'), 'T302a'],
    [
      'resolveText',
      () => resolveText('{name}', { profile: null, pestsProcessed: 0, evacuated: null }),
      'T302a',
    ],
    ['newBarkState', () => newBarkState(1), 'T302a'],
    ['codexTitle', () => codexTitle(CTX), 'T303'],
    ['memosDue', () => memosDue([], [], CTX), 'T303'],
  ])('%s names its task', (_, call, task) => {
    expect(call).toThrow(task);
  });
});
