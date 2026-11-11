// The pending forced input (design/core-loop.md § 2.11: A3M3's SEAL; T605), as the HUD reads it:
// its id while the sim waits for its press, else null. app/forcedInput.ts keeps it in sync.
import { signal } from '@preact/signals';

export const forcedInput = signal<string | null>(null);
