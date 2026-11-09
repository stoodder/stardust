// Small shared type helpers.

/** Exhaustiveness check for discriminated-union switches: a compile error if a case is missing. */
export function assertNever(x: never): never {
  throw new Error(`Unexpected value: ${JSON.stringify(x)}`);
}
