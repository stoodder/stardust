// Bottom-right: the four build slots (icon, cost, hotkey; locked, unaffordable, armed, and NEW
// states; the armed-slot rule is app/commands.ts's).
import { cancel, pressBuildSlot } from '../../app/commands.ts';
import { hud, type BuildSlotView } from '../state.ts';
import { lockedText } from '../../app/hudText.ts';
import { Icon } from './Icon.tsx';
import { alignPulse } from './pulse.ts';
import { Key, noFocusOnPress, Credits } from './parts.tsx';

/** Build slots shown, whatever the loadout size (the loadout limit, CLAUDE.md). */
const SLOT_COUNT = 4;

/** One build slot (bottom-right). */
function BuildSlot({ index, slot }: { index: number; slot: BuildSlotView | undefined }) {
  if (slot === undefined) {
    return <div class="hud-slot empty chamfer" aria-hidden="true" />;
  }
  const locked = hud.lockedTowers.value.includes(slot.tower);
  const poor = hud.credits.value < slot.cost;
  const armed = hud.armedTower.value === slot.tower;
  // Onboarding (D026): the first slot pulses until the first tower is built.
  const teach = index === 0 && !hud.built.value && !locked && !poor && !armed;
  const state = `${locked ? 'locked' : poor ? 'poor' : ''}${teach ? ' pulse' : ''}`;
  const status = `${slot.isNew ? ', new' : ''}${locked ? `, ${lockedText(slot)}` : poor ? ', not enough credits' : ''}`;
  const button = (
    <button
      type="button"
      class={`hud-btn hud-slot chamfer ${state}`}
      ref={(el) => alignPulse(el)}
      aria-pressed={armed}
      aria-disabled={locked || poor}
      aria-label={`Build ${slot.label}, ${slot.cost} credits${status}`}
      title={locked ? lockedText(slot) : `${slot.label} (${index + 1})`}
      onMouseDown={noFocusOnPress}
      onClick={() => pressBuildSlot(index)}
      onContextMenu={(e) => {
        e.preventDefault();
        cancel();
      }}
    >
      <Key k={String(index + 1)} />
      <Icon id={slot.icon} class="slot-icon" />
      {locked ? (
        <span class="hud-locked">
          <Icon id="icon.lock" />
        </span>
      ) : (
        <Credits value={slot.cost} short />
      )}
    </button>
  );
  if (!slot.isNew) return button;
  // Newly issued, in its first battle for this save (D061): a NEW tag sits on the slot's top
  // edge, outside the chamfer's clip.
  return (
    <div class="hud-slot-holder">
      {button}
      <span class="hud-new" aria-hidden="true">
        NEW
      </span>
    </div>
  );
}

export function BuildBar() {
  const slots = hud.slots.value;
  return (
    <nav class="hud-build" aria-label="Build">
      {Array.from({ length: SLOT_COUNT }, (_, i) => (
        <BuildSlot key={i} index={i} slot={slots[i]} />
      ))}
    </nav>
  );
}
