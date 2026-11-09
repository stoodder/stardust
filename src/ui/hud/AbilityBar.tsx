// Bottom-left: the commander ability slots (core-loop §3.1), each with its icon, hotkey, and
// cooldown wipe, and the aiming hint while one is aimed.
import { cancel, pressAbility } from '../../app/commands.ts';
import { hud, type AbilityCooldownView, type AbilitySlotView } from '../state.ts';
import { Icon } from './Icon.tsx';
import { Key, noFocusOnPress } from './parts.tsx';

/** The icon's size in game px: the cooldown wipe steps one pixel per 1/16. */
const ICON_PX = 16;

/**
 * One commander ability slot (bottom-left): icon, hotkey, and the cooldown wipe and seconds. An
 * absent companion's slot (A3M4) is dark and disabled, with no label (core-loop §3.1).
 */
function AbilitySlot({ a, cd }: { a: AbilitySlotView; cd: AbilityCooldownView | undefined }) {
  const left = cd?.secondsLeft ?? 0;
  const ready = left === 0 && !a.absent;
  const aiming = hud.aimingAbility.value === a.slot;
  const cue = hud.countdownCue.value;
  if (a.absent) {
    return (
      <button
        type="button"
        class="hud-btn hud-slot hud-ability chamfer absent"
        aria-disabled="true"
        aria-label={`Ability slot ${a.slot}, empty`}
        onMouseDown={noFocusOnPress}
      >
        <span class="ability-icon">
          <Icon id={a.icon} class="slot-icon" />
        </span>
      </button>
    );
  }
  const status = aiming
    ? `, aiming: ${a.aim === 'path' ? 'click the path' : 'click a target'}`
    : ready
      ? ', ready'
      : `, recharging, ${left} s`;
  return (
    <button
      type="button"
      class={`hud-btn hud-slot hud-ability chamfer ${ready ? 'ready' : 'charging'}`}
      aria-pressed={aiming}
      aria-disabled={!ready}
      aria-label={`${a.label}${status}`}
      title={`${a.label} (${a.key}): ${a.description}`}
      onMouseDown={noFocusOnPress}
      onClick={() => pressAbility(a.slot)}
      onContextMenu={(e) => {
        e.preventDefault();
        cancel();
      }}
    >
      <Key k={a.key} />
      <span class="ability-icon">
        <Icon id={a.icon} class="slot-icon" />
        {!ready && (
          <span
            class="hud-wipe"
            style={{ height: `${Math.round((cd?.remaining ?? 0) * ICON_PX)}px` }}
          />
        )}
      </span>
      {/* A countdown starting pulses a ready slot once; the key restarts it each countdown. */}
      {ready && cue > 0 && <span key={cue} class="hud-ready-cue chamfer" aria-hidden="true" />}
      <span class="hud-cd num">{ready ? 'Ready' : `${left}s`}</span>
    </button>
  );
}

/**
 * Bottom-left: the commander ability slots, and the aiming hint while one is aimed (drawn past the
 * fire-control buttons that follow the slots).
 */
export function AbilityBar() {
  const slots = hud.abilities.value;
  const cds = hud.abilityCooldowns.value;
  const aimed = slots.find((a) => a.slot === hud.aimingAbility.value);
  if (slots.length === 0) return null;
  return (
    <nav class="hud-abilities" aria-label="Abilities">
      {slots.map((a, i) => (
        <AbilitySlot key={a.slot} a={a} cd={cds[i]} />
      ))}
      {/* Placed beside the whole bottom-left cluster (hud.css), after the fire control. */}
      {aimed !== undefined && (
        <div class="hud-aim-hint chamfer" role="status">
          {aimed.aim === 'path' ? 'Pick a stretch of path' : 'Pick a target'}
          {/* With the keyboard cursor up, Enter is how it fires (T213). */}
          {hud.cursorShown.value && (
            <span class="dim">
              <Key k="Enter" /> fires
            </span>
          )}
          <span class="dim">
            <Key k="Esc" /> cancels
          </span>
        </div>
      )}
    </nav>
  );
}
