// The pending forced input (design/core-loop.md § 2.11: A3M3's SEAL; T605, T614), as the HUD reads
// it. app/forcedInput.ts keeps it in sync.
import { signal } from '@preact/signals';

/** A box in game px (the HUD's space; render/vfx/xrayPixels.ts `Rect`). */
export interface AvoidRect {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
}

/** The forced input's id while the sim waits for its press ("seal"), else null. */
export const forcedInput = signal<string | null>(null);

/**
 * Whether its button takes a press yet: ARM_DELAY_MS after its permission line has typed (A3M3:
 * "Do it, {name}."; app/forcedInput.ts), and then only from a key-down or pointer-down that
 * started after that.
 */
export const forcedInputArmed = signal(false);

/**
 * What the forced input's screen must keep clear, in game px (D143 R3, D144 S8: A3M3's blast
 * doors, open or shut, so the player sees the door they seal): the SEAL button lifts above them (or
 * to the top band, under the comms panel, with no room), and the comms panel moves to the top
 * centre. Set as the input shows and kept through the close (the doors run shut after the
 * press); cleared as the battle unbinds. Empty: nothing to avoid.
 */
export const forcedInputAvoid = signal<readonly AvoidRect[]>([]);
