// The seam stubs' error (T300b): a stubbed story function throws this until its task lands.

/** Thrown by a story function whose task hasn't landed yet. */
export function notImplemented(fn: string, task: string): never {
  throw new Error(`story: ${fn} is not implemented yet (${task})`);
}
