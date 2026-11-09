// The seam stubs (T300b) throw until their tasks land; this keeps each one honest about which.
import { describe, expect, it } from 'vitest';
import { codexTitle } from './codex.ts';
import type { StoryContext } from './conditions.ts';
import { memosDue } from './inbox.ts';

const CTX: StoryContext = { flags: {}, map: null, pestsProcessed: 0, seen: [], run: null };

describe('story seam stubs', () => {
  it.each([
    ['codexTitle', () => codexTitle(CTX), 'T303'],
    ['memosDue', () => memosDue([], [], CTX), 'T303'],
  ])('%s names its task', (_, call, task) => {
    expect(call).toThrow(task);
  });
});
