// Every content set the build ships passes validate() here, in the gate's test step, because a
// production build compiles them without it (app/battleSetup.ts `compileContentUnchecked`; D150):
// the live game's (also content/content.test.ts) and the dev battles' (loaded on demand).
import { describe, expect, it } from 'vitest';
import { composeRevisits } from '../src/content/compileRevisit.ts';
import { RAW_CONTENT } from '../src/content/registry.ts';
import type { IdSpace, RawContent } from '../src/content/types.ts';
import { validate } from '../src/content/validate.ts';
import { DEV_CONTENT } from '../src/render/__fixtures__/devBattle.ts';

const SHIPPED: readonly [string, RawContent<IdSpace>][] = [
  ['live', RAW_CONTENT],
  ['dev', DEV_CONTENT],
];

describe('the content sets the build ships', () => {
  it.each(SHIPPED)('%s passes validate()', (_name, content) => {
    const { raw, errors } = composeRevisits(content);
    expect([...errors, ...validate(raw)]).toEqual([]);
  });
});
