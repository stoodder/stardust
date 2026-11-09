// Small shared type helpers.

/** Exhaustiveness check for discriminated-union switches: a compile error if a case is missing. */
export function assertNever(x: never): never {
  throw new Error(`Unexpected value: ${JSON.stringify(x)}`);
}

/** Read-only all the way down (arrays and tuples included). Functions are left as they are. */
export type DeepReadonly<T> = T extends (...args: never[]) => unknown
  ? T
  : T extends object
    ? { readonly [P in keyof T]: DeepReadonly<T[P]> }
    : T;
