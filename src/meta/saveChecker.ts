// The save validator's checker (meta/validate.ts and meta/validateEndgame.ts): collects errors with
// their field paths and checks plain objects, bounded integers, booleans, and ids, known or free-form.
/** Validation stops collecting after this many errors. */
export const MAX_ERRORS = 20;
/** Ids with no registry yet (scenes, memos, codex entries, grants, medals, flag values). */
export const FREE_ID = /^[a-z][a-z0-9_]{0,47}$/;

/**
 * Whether a save can hold `id` as a free-form id (lowercase snake_case from a letter, ≤ 48
 * chars): what `story.seen` keeps (scene, bark, and codex-read ids), so content whose id fails it
 * would make a save validation refuses (meta/freeIds.test.ts checks every one).
 */
export function isFreeId(id: string): boolean {
  return FREE_ID.test(id);
}

/** True for a plain object (from JSON.parse or a literal): not null, not a list, not a class. */
export function isPlainRecord(x: unknown): x is Record<string, unknown> {
  if (typeof x !== 'object' || x === null || Array.isArray(x)) return false;
  const proto: unknown = Object.getPrototypeOf(x);
  return proto === Object.prototype || proto === null;
}

/** Narrows `x` to a member of `list`. */
export function isMember<T extends string>(list: readonly T[], x: string): x is T {
  const wide: readonly string[] = list;
  return wide.includes(x);
}

export class Checker {
  readonly errors: string[] = [];

  fail(path: string, message: string): void {
    if (this.errors.length < MAX_ERRORS) this.errors.push(`${path}: ${message}`);
  }

  /** Checks `x` is a plain object with exactly `keys`; returns it, or null after reporting. */
  /** `optional`: fields that may be absent (each reader supplies its default). */
  object(
    x: unknown,
    path: string,
    keys: readonly string[],
    optional: readonly string[] = [],
  ): Record<string, unknown> | null {
    const obj = this.record(x, path);
    if (obj === null) return null;
    for (const key of keys) {
      if (!Object.hasOwn(obj, key)) this.fail(path, `missing field "${key}"`);
    }
    for (const key of Object.keys(obj)) {
      if (!keys.includes(key) && !optional.includes(key)) {
        this.fail(path, `unknown field ${JSON.stringify(key.slice(0, 64))}`);
      }
    }
    return obj;
  }

  /** Checks `x` is a plain object (any keys); returns it, or null after reporting. */
  record(x: unknown, path: string): Record<string, unknown> | null {
    if (isPlainRecord(x)) return x;
    const isObject = typeof x === 'object' && x !== null && !Array.isArray(x);
    this.fail(
      path,
      isObject ? 'expected a plain object' : `expected an object, got ${describe(x)}`,
    );
    return null;
  }

  int(x: unknown, path: string, min: number, max: number): number {
    if (typeof x !== 'number' || !Number.isSafeInteger(x) || x < min || x > max) {
      this.fail(path, `expected an integer in [${min}, ${max}], got ${describe(x)}`);
      return min;
    }
    return x;
  }

  bool(x: unknown, path: string): boolean {
    if (typeof x !== 'boolean') {
      this.fail(path, `expected a boolean, got ${describe(x)}`);
      return false;
    }
    return x;
  }

  /** An id from `known`. */
  id<T extends string>(x: unknown, path: string, known: readonly T[]): T | null {
    if (typeof x !== 'string') {
      this.fail(path, `expected an id string, got ${describe(x)}`);
      return null;
    }
    if (!isMember(known, x)) {
      this.fail(path, `unknown id ${JSON.stringify(x.slice(0, 64))}`);
      return null;
    }
    return x;
  }

  /** A free-form id (no registry yet): lowercase snake_case, starting with a letter. */
  freeId(x: unknown, path: string): string | null {
    if (typeof x !== 'string') {
      this.fail(path, `expected an id string, got ${describe(x)}`);
      return null;
    }
    if (!FREE_ID.test(x)) {
      this.fail(path, `unknown id ${JSON.stringify(x.slice(0, 64))}`);
      return null;
    }
    return x;
  }

  /** A list of distinct ids from `known` (or free-form ids, when `known` is null). */
  ids<T extends string>(x: unknown, path: string, known: readonly T[], max?: number): T[];
  ids(x: unknown, path: string, known: null, max: number): string[];
  ids(
    x: unknown,
    path: string,
    known: readonly string[] | null,
    max = known?.length ?? 0,
  ): string[] {
    if (!Array.isArray(x)) {
      this.fail(path, `expected a list, got ${describe(x)}`);
      return [];
    }
    if (x.length > max) {
      this.fail(path, `expected at most ${max} entries, got ${x.length}`);
      return [];
    }
    const out: string[] = [];
    x.forEach((item: unknown, i) => {
      const at = `${path}[${i}]`;
      const id = known === null ? this.freeId(item, at) : this.id(item, at, known);
      if (id === null) return;
      if (out.includes(id)) this.fail(at, `duplicate id "${id}"`);
      else out.push(id);
    });
    return out;
  }

  subset(sub: readonly string[], of: readonly string[], path: string, ofPath: string): void {
    for (const id of sub) {
      if (!of.includes(id)) this.fail(path, `"${id}" is not in ${ofPath}`);
    }
  }
}

export function describe(x: unknown): string {
  if (x === null) return 'null';
  if (Array.isArray(x)) return 'a list';
  if (typeof x === 'string') return `the string ${JSON.stringify(x.slice(0, 32))}`;
  if (typeof x === 'number') return String(x);
  return typeof x;
}
