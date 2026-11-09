// The schema test: the live content passes every validation rule (architecture.md § Validation).
import { describe, expect, it } from 'vitest';
import { RAW_CONTENT } from './registry.ts';
import { validate } from './validate.ts';

describe('live content', () => {
  it('passes validate()', () => {
    expect(validate(RAW_CONTENT)).toEqual([]);
  });
});
