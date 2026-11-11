// The forced input's one button (design/core-loop.md § 2.11; T605's minimal hook: T614 builds the
// real SEAL screen, with its arming delay, the 20 s line, the hum, and reduced motion). While the
// sim waits for a forced input, the rest of the HUD is inert (index.tsx) and this is the only live
// control: one large button, centered low, labelled with the input's name ("SEAL"), focused as it
// appears. Pressing it issues the `scriptInput` command (app/forcedInput.ts).
import { useEffect, useRef } from 'preact/hooks';
import { pressForcedInput } from '../../app/forcedInput.ts';
import { forcedInput } from './forcedInputState.ts';
import './forcedInput.css';

export function ForcedInputButton() {
  const id = forcedInput.value;
  const ref = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (id !== null) ref.current?.focus();
  }, [id]);
  if (id === null) return null;
  return (
    <div class="hud-forced-input">
      <button
        ref={ref}
        type="button"
        class="hud-forced-input-button chamfer"
        data-testid="forced-input"
        onClick={() => pressForcedInput()}
      >
        {id.toUpperCase()}
      </button>
    </div>
  );
}
