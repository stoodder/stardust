// The forced input in the app (design/core-loop.md § 2.11: A3M3's SEAL; T605's minimal hook, which
// T614's SEAL screen builds on): the HUD's `forcedInput` signal follows the sim's pending input
// (ForcedInputRequested / ForcedInputResolved, and the state as the battle binds), and a press
// issues the `scriptInput` command, so the moment is in the command log like any other. The sim
// rejects everything else while it waits (sim/forcedInput.ts).
import type { IdSpace } from '../content/types.ts';
import { forcedInput } from '../ui/hud/forcedInputState.ts';
import { issue } from './commands.ts';
import type { Host } from './host.ts';

/** Keeps the HUD's `forcedInput` in sync with `host`'s sim; returns the unbind. */
export function bindForcedInput(host: Host<IdSpace>): () => void {
  forcedInput.value = host.sim.state.pendingInput;
  const offs = [
    host.bus.on('ForcedInputRequested', (e) => {
      forcedInput.value = e.id;
    }),
    host.bus.on('ForcedInputResolved', () => {
      forcedInput.value = null;
    }),
  ];
  return () => {
    for (const off of offs) off();
    forcedInput.value = null;
  };
}

/** Presses the pending forced input (the HUD's button, the test hooks); nothing if none waits. */
export function pressForcedInput(): void {
  const id = forcedInput.value;
  if (id !== null) issue({ type: 'scriptInput', id });
}
