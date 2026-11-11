// The pending forced input (design/core-loop.md § 2.11: A3M3's SEAL; T605, T614), as the HUD reads
// it. app/forcedInput.ts keeps it in sync.
import { signal } from '@preact/signals';

/** The forced input's id while the sim waits for its press ("seal"), else null. */
export const forcedInput = signal<string | null>(null);

/**
 * Whether its button takes a press yet: ARM_DELAY_MS after its permission line has typed (A3M3:
 * "Do it, {name}."; app/forcedInput.ts), and then only from a key-down or pointer-down that
 * started after that.
 */
export const forcedInputArmed = signal(false);
