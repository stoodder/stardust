// Bottom-right: the four build slots (icon, cost, hotkey; locked, unaffordable, armed, NEW, sale,
// and free states; the armed-slot rule is app/commands.ts's), Clearance Sale's tag over them
// while it has charges ("SALE -40% x3", D077), and a revoked class's LICENSE REVOKED stamp (T631).
import { cancel, pressBuildSlot } from '../../app/commands.ts';
import { hud, type BuildSlotView, type PriceTag } from '../state.ts';
import { lockedText } from '../../app/hudText.ts';
import { saleText } from '../../app/hudViews.ts';
import { Icon } from './Icon.tsx';
import { revokedHud } from './revokedState.ts'; // T606
import { alignPulse } from './pulse.ts';
import { Key, noFocusOnPress, Credits } from './parts.tsx';

/** The stamp a revoked class's slot wears (art-direction §5 *REVOKED stamps*). */
export const LICENSE_STAMP = 'icon.stamp.license_revoked';

/** Build slots shown, whatever the loadout size (the loadout limit, CLAUDE.md). */
const SLOT_COUNT = 4;

/** How a price came about, for a slot's screen-reader label. */
export const PRICE_WORDS: Readonly<Record<PriceTag, string>> = {
  list: '',
  sale: ', on sale',
  free: ', free',
};

/** One build slot (bottom-right). */
function BuildSlot({ index, slot }: { index: number; slot: BuildSlotView | undefined }) {
  if (slot === undefined) {
    return <div class="hud-slot empty chamfer" aria-hidden="true" />;
  }
  // T606: a revoked class's slot is dead for the rest of the map, under its stamp (T631).
  const revoked = revokedHud.value.towers.includes(slot.tower);
  const locked = revoked || hud.lockedTowers.value.includes(slot.tower);
  const poor = hud.credits.value < slot.cost;
  const armed = hud.armedTower.value === slot.tower;
  // Onboarding (D026): the first slot pulses until the first tower is built.
  const teach = index === 0 && !hud.built.value && !locked && !poor && !armed;
  const state = `${locked ? 'locked' : poor ? 'poor' : ''}${revoked ? ' revoked' : ''}${teach ? ' pulse' : ''}`;
  const lockWords = revoked ? 'license revoked' : lockedText(slot);
  const status = `${slot.isNew ? ', new' : ''}${PRICE_WORDS[slot.price]}${locked ? `, ${lockWords}` : poor ? ', not enough credits' : ''}`;
  const button = (
    <button
      type="button"
      class={`hud-btn hud-slot chamfer ${state}`}
      ref={(el) => alignPulse(el)}
      aria-pressed={armed}
      aria-disabled={locked || poor}
      aria-label={`Build ${slot.label}, ${slot.cost} credits${status}`}
      title={
        locked ? (revoked ? 'License revoked' : lockedText(slot)) : `${slot.label} (${index + 1})`
      }
      onMouseDown={noFocusOnPress}
      onClick={() => pressBuildSlot(index)}
      onContextMenu={(e) => {
        e.preventDefault();
        cancel();
      }}
    >
      <Key k={String(index + 1)} />
      <Icon id={slot.icon} class="slot-icon" variant={slot.iconVariant} />
      {locked ? (
        <span class="hud-locked">
          <Icon id="icon.lock" />
        </span>
      ) : slot.price === 'free' ? (
        <span class="hud-free">Free</span>
      ) : (
        <Credits value={slot.cost} short sale={slot.price === 'sale'} />
      )}
    </button>
  );
  // A revoked class (T606, T631): the LICENSE REVOKED stamp (the one that folded its towers) lies
  // across the slot's dimmed icon, overhanging its edges, outside the chamfer's clip.
  if (revoked) {
    return (
      <div class="hud-slot-holder">
        {button}
        <span class="hud-revoked-stamp" data-testid="slot-revoked" aria-hidden="true">
          <Icon id={LICENSE_STAMP} />
        </span>
      </div>
    );
  }
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
  const sale = hud.sale.value;
  return (
    <nav class="hud-build" aria-label="Build">
      {/* Clearance Sale (core-loop §3.2): the discount and the purchases it has left. */}
      {sale !== null && (
        <span class="hud-sale chamfer" role="status" data-testid="sale-tag">
          {saleText(sale)}
        </span>
      )}
      {Array.from({ length: SLOT_COUNT }, (_, i) => (
        <BuildSlot key={i} index={i} slot={slots[i]} />
      ))}
    </nav>
  );
}
