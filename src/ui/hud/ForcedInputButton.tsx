// The forced input's screen (design/core-loop.md § 2.11: A3M3's SEAL; T605's hook, T614's screen;
// the rules are app/forcedInput.ts). While the sim waits for it, a veil under the HUD takes the
// clicks off the playfield and darkens its edges, every HUD control but the Menu and the speaker is
// inert (index.tsx), and one large button, centered low, labelled with the input ("SEAL"), is the
// only way on. It has the focus as it appears, dimmed and "Not yet" to a screen reader until it
// arms (ARM_DELAY_MS, and then only from a fresh key-down or pointer-down). Reduced motion: the veil
// is there at once and the armed button holds still (no breathing edge).
import { useEffect, useRef } from 'preact/hooks';
import { currentSeal } from '../../app/forcedInput.ts';
import { forcedInput, forcedInputArmed } from './forcedInputState.ts';
import './forcedInput.css';

/** The veil under the HUD while a forced input waits (index.tsx draws it before the HUD). */
export function ForcedInputVeil() {
  if (forcedInput.value === null) return null;
  return <div class="hud-forced-veil" aria-hidden="true" data-testid="forced-input-veil" />;
}

/** The one button. */
export function ForcedInputButton() {
  const id = forcedInput.value;
  const armed = forcedInputArmed.value;
  const ref = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (id !== null) ref.current?.focus();
  }, [id]);
  if (id === null) return null;
  const label = id.toUpperCase();
  return (
    <div class="hud-forced-input">
      <button
        ref={ref}
        type="button"
        class={armed ? 'hud-forced-input-button chamfer armed' : 'hud-forced-input-button chamfer'}
        data-testid="forced-input"
        data-armed={armed ? 'true' : 'false'}
        aria-disabled={armed ? undefined : 'true'}
        aria-label={armed ? label : `${label}, not yet`}
        onPointerDown={() => currentSeal()?.pointerDown()}
        onClick={() => currentSeal()?.click()}
      >
        {label}
      </button>
    </div>
  );
}
