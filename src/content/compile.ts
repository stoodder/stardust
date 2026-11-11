// compileContent(): validate() (validate.ts: the design rules types and compile can't express,
// each error tagged `[rule]`), then the compiler (compileCore.ts, where the conversion rules
// live). It throws one ContentCompileError listing every validation and compile problem, so
// invalid content never compiles. The shipped game compiles with compileCore.ts's
// `compileContentUnchecked` instead (app/battleSetup.ts; D150).
import type { CompiledContent } from './compiled.ts';
import { compileContentWith } from './compileCore.ts';
import type { IdSpace, LiveIds, RawContent } from './types.ts';
import { validate, type ValidationRules } from './validate.ts';

export { ContentCompileError } from './compileCore.ts';

/**
 * Validates and compiles every registry. Throws ContentCompileError when anything is invalid or
 * can't be compiled. `rules` defaults to rules.ts; tests pass fixture answer lists.
 */
export function compileContent<K extends IdSpace = LiveIds>(
  input: RawContent<K>,
  rules?: ValidationRules,
): CompiledContent<K> {
  return compileContentWith(input, (raw) => validate(raw, rules));
}
