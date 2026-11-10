// Bottom-left: the commander ability slots (core-loop §3.1; slot 2 with its companion's face), each
// with its icon, hotkey, and
// cooldown wipe (seconds, or wave starts for Clearance Sale), Ready Room's FREE tag, the charges a
// sale has left, and the aiming hint while one is aimed. An untargeted ability (Time Dilation,
// Clearance Sale) casts on the press (D082).
import { cancel, pressAbility } from '../../app/commands.ts';
import { cooldownChip, cooldownWords } from '../../app/hudViews.ts';
import { DEFAULT_VARIANT } from '../../render/sprites/bake.ts';
import { plateColor } from '../dialogue/plate.ts';
import { hud, type AbilityCooldownView, type AbilitySlotView, type CompanionView } from '../state.ts';
import { baked, Icon } from './Icon.tsx';
import { Key, noFocusOnPress } from './parts.tsx';
import { alignPulse } from './pulse.ts';

/** The icon's size in game px: the cooldown wipe steps one pixel per 1/16. */
const ICON_PX = 16;

/**
 * The companion's face on slot 2 (T216): a FACE_PX square of their 48×48 `neutral` portrait,
 * FACE_AT from its top-left (the face on every bust, art-direction §5), 1:1 in a 1 px frame of
 * their color. An absent companion's is the portrait's derived `dark` bake.
 */
const FACE_PX = 14;
const FACE_AT = { x: 15, y: 13 } as const;

/** The companion's face beside slot 2's icon. Decorative: the slot's label names the ability. */
function CompanionFace({ c, absent }: { c: CompanionView; absent: boolean }) {
  const b = baked(c.portrait, 'neutral', absent ? `${DEFAULT_VARIANT}+dark` : DEFAULT_VARIANT);
  return (
    <span
      class="hud-companion"
      style={{ '--frame': plateColor(c.color) }}
      data-testid="companion-face"
      title={c.name}
      aria-hidden="true"
    >
      {b !== null && (
        <img
          src={b.url}
          width={b.w}
          height={b.h}
          alt=""
          style={{ marginLeft: `${-FACE_AT.x}px`, marginTop: `${-FACE_AT.y}px` }}
        />
      )}
    </span>
  );
}

/** The slot's icon row: the companion's face first on slot 2, then the ability's icon. */
function SlotFace({ a }: { a: AbilitySlotView }) {
  return a.companion === null ? null : <CompanionFace c={a.companion} absent={a.absent} />;
}

/**
 * One commander ability slot (bottom-left): icon, hotkey, and the cooldown wipe and seconds. An
 * absent companion's slot (A3M4) is dark and disabled, with no label (core-loop §3.1).
 */
function AbilitySlot({ a, cd }: { a: AbilitySlotView; cd: AbilityCooldownView | undefined }) {
  const ready = (cd?.secondsLeft ?? 0) === 0 && (cd?.wavesLeft ?? 0) === 0 && !a.absent;
  const free = ready && cd?.free === true;
  const charges = cd?.charges ?? 0;
  const aiming = hud.aimingAbility.value === a.slot;
  const cue = hud.countdownCue.value;
  // The Time Dilation teach (A1M3's flock, D098): the slot pulses at 1 Hz until it's first cast.
  const teach = ready && hud.timeDilationTeach.value === a.slot;
  if (a.absent) {
    return (
      <button
        type="button"
        class={`hud-btn hud-slot hud-ability chamfer absent${a.companion === null ? '' : ' companion'}`}
        aria-disabled="true"
        aria-label={`Ability slot ${a.slot}, empty`}
        onMouseDown={noFocusOnPress}
      >
        <span class="ability-row">
          <SlotFace a={a} />
          <span class="ability-icon">
            <Icon id={a.icon} class="slot-icon" />
          </span>
        </span>
      </button>
    );
  }
  const status = aiming
    ? `, aiming: ${a.aim === 'path' ? 'click the path' : 'click a target'}`
    : ready
      ? `, ready${free ? ', free cast' : ''}${a.aim === 'none' ? ', casts at once' : ''}`
      : `, recharging, ${cd === undefined ? '' : cooldownWords(cd)}`;
  const sale = charges > 0 ? `, ${charges} ${charges === 1 ? 'purchase' : 'purchases'} left` : '';
  const button = (
    <button
      type="button"
      class={`hud-btn hud-slot hud-ability chamfer ${ready ? 'ready' : 'charging'}${teach ? ' pulse' : ''}${a.companion === null ? '' : ' companion'}`}
      ref={(el) => alignPulse(el)}
      data-testid={`ability-${a.slot}`}
      aria-pressed={a.aim === 'none' ? undefined : aiming}
      aria-disabled={!ready}
      aria-label={`${a.label}${status}${sale}`}
      title={`${a.label} (${a.key}): ${a.description}`}
      onMouseDown={noFocusOnPress}
      onClick={() => pressAbility(a.slot)}
      onContextMenu={(e) => {
        e.preventDefault();
        cancel();
      }}
    >
      <Key k={a.key} />
      <span class="ability-row">
        <SlotFace a={a} />
        <span class="ability-icon">
          <Icon id={a.icon} class="slot-icon" />
          {!ready && (
            <span
              class="hud-wipe"
              style={{ height: `${Math.round((cd?.remaining ?? 0) * ICON_PX)}px` }}
            />
          )}
        </span>
      </span>
      {/* A countdown starting pulses a ready slot once; the key restarts it each countdown. */}
      {ready && cue > 0 && <span key={cue} class="hud-ready-cue chamfer" aria-hidden="true" />}
      {/* Clearance Sale's charges left: a count on the icon's corner. */}
      {charges > 0 && (
        <span class="hud-charges num" aria-hidden="true">
          x{charges}
        </span>
      )}
      <span class="hud-cd num">{ready ? 'Ready' : cd === undefined ? '' : cooldownChip(cd)}</span>
    </button>
  );
  if (!free) return button;
  // Ready Room's free cast (D077): a FREE tag on the slot's top edge, outside the chamfer's clip.
  return (
    <div class="hud-slot-holder">
      {button}
      <span class="hud-new hud-free-tag" aria-hidden="true">
        Free
      </span>
    </div>
  );
}

/**
 * Bottom-left: the commander ability slots, and the aiming hint while one is aimed (drawn past the
 * fire-control buttons that follow the slots).
 */
export function AbilityBar() {
  const slots = hud.abilities.value;
  const cds = hud.abilityCooldowns.value;
  const aimed = slots.find((a) => a.slot === hud.aimingAbility.value && a.aim !== 'none');
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
