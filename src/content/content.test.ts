// The schema test: the live content passes every validation rule (architecture.md § Validation).
// Revisits are composed with their originals first, as compileContent() does (compileRevisit.ts):
// A2M3's own tiles hold only its band.
import { describe, expect, it } from 'vitest';
import { composeRevisits } from './compileRevisit.ts';
import { RAW_CONTENT } from './registry.ts';
import { validate } from './validate.ts';

describe('live content', () => {
  it('passes validate()', () => {
    const { raw, errors } = composeRevisits(RAW_CONTENT);
    expect([...errors, ...validate(raw)]).toEqual([]);
  });
});
