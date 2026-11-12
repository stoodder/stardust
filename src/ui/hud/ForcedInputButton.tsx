// The forced input's screen (design/core-loop.md § 2.11: A3M3's SEAL; T605's hook, T614's screen;
// the rules are app/forcedInput.ts). While the sim waits for it, a veil under the HUD takes the
// clicks off the playfield and darkens its edges, every HUD control but the Menu and the speaker is
// inert (index.tsx), and one large button, centered low, labelled with the input ("SEAL"), is the
// only way on, lifted above the blast doors it would cover, open or shut (`sealButtonBottom`,
// `forcedInputAvoid`; D143, D144: the top band, under the comms panel, with no room). It has the focus as it appears, dimmed and "Not yet" to a screen reader until it
// arms (ARM_DELAY_MS after its permission line, Bricks's "Do it, {name}.", and then only from a
// fresh key-down or pointer-down). Reduced motion: the veil
// is there at once and the armed button holds still (no breathing fill). The focus comes back to it as the pause menu or a scene closes.
import { useEffect, useRef } from 'preact/hooks';
import { currentSeal } from '../../app/forcedInput.ts';
import { forcedInputDef } from '../../content/forcedInputs.ts';
import { sceneBlocks } from '../dialogue/state.ts';
import { pauseMenu } from '../pause/state.ts';
import { forcedInput, forcedInputArmed, forcedInputAvoid } from './forcedInputState.ts';
import { SEAL_BOTTOM, sealButtonBottom } from './layout.ts';
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
  const covered = pauseMenu.value || sceneBlocks.value;
  const ref = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (id !== null && !covered) ref.current?.focus();
  }, [id, covered]);
  if (id === null) return null;
  // Its def's words ("SEAL", the finale's "Who's there?"; content/forcedInputs.ts).
  const label = forcedInputDef(id).label;
  // Lifted above the doors when it would cover one (D143 R3, D144 S8).
  const bottom = sealButtonBottom(forcedInputAvoid.value);
  return (
    // Under the pause menu or a scene, theirs are the only live controls.
    <div
      class="hud-forced-input"
      inert={covered}
      style={bottom === SEAL_BOTTOM ? undefined : { bottom: `${bottom}px` }}
    >
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
