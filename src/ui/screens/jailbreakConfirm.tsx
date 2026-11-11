// The jailbreak's confirmation (towers.md § 9; D146; T714): the Shop's Firmware row asks before it
// takes the jailbreak, so the moment is seen, free or not. A small panel over the shelf: each
// revoked class under its LICENSE REVOKED stamp, then what the jailbreak does to it, the price
// first (Zibzab's way: "Free: Goldie's engineers did the work." under the convoy, 300 Stardust under
// the warren), and Jailbreak it beside Not now. The confirm waits CHOICE_LOCK_MS (a story beat, as
// a story choice's options do); Esc and Not now back out. Act III copy: no exclamation points.
import { useEffect, useState } from 'preact/hooks';
import { TOWERS } from '../../content/towers/index.ts';
import type { TowerId } from '../../content/types.ts';
import { trapTab } from '../dialogue/SceneParts.tsx';
import { Icon } from '../hud/Icon.tsx';
import { silkText } from '../silk.ts';
import { useEscape } from './escape.ts';
import { focusOnce } from './focus.ts';
import { formatCount } from './format.ts';
import { towerName } from './storeText.ts';
import { CHOICE_LOCK_MS } from './StoryChoice.tsx';
import './results.css';
import './jailbreakConfirm.css';

/** The revoked class's stamp (the HUD slot's and the loadout card's). */
const LICENSE_STAMP = 'icon.stamp.license_revoked';

/** What the panel says about the price: free under the convoy, else the Stardust it costs. */
export function jailbreakPriceLine(price: number): string {
  return price === 0
    ? "Free: Goldie's engineers did the work."
    : `Price first: ${formatCount(price)} Stardust.`;
}

/** What the jailbreak does to `towers` (their names in a list: "the Rivet", "the Rivet and the Thumper"). */
export function jailbreakWhat(towers: readonly string[]): string {
  const names = towers.map((t) => `the ${towerName(t)}`);
  const list =
    names.length <= 1
      ? (names[0] ?? 'your revoked turrets')
      : `${names.slice(0, -1).join(', ')} and ${names.at(-1)!}`;
  return `Brings back ${list} on jailbroken firmware: the same stats and specs, the Everglow plate scratched out, a Vrell patch on.`;
}

export function JailbreakConfirm({
  towers,
  price,
  onConfirm,
  onCancel,
}: {
  /** The revoked classes it brings back. */
  towers: readonly TowerId[];
  /** Its Stardust price (0 under the convoy). */
  price: number;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setReady(true), CHOICE_LOCK_MS);
    return () => clearTimeout(t);
  }, []);
  useEscape(() => {
    onCancel();
    return true;
  });
  return (
    <div class="jb-scrim" data-testid="jailbreak-confirm">
      <section
        class="sd-panel jb chamfer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="jb-title"
        onKeyDown={trapTab}
      >
        <p class="sd-results-kicker">Zibzab's · Firmware</p>
        <h2 id="jb-title" class="jb-title" tabIndex={-1} ref={focusOnce}>
          Jailbreak
        </h2>
        <ul class="jb-towers" aria-hidden="true">
          {towers.map((t) => (
            <li key={t} class="jb-tower">
              <span class="jb-icon revoked">
                <Icon id={TOWERS[t]?.sprites.icon ?? `icon.tower.${t}`} />
                <Icon id={LICENSE_STAMP} class="jb-stamp" />
              </span>
              <span class="jb-arrow">›</span>
              <span class="jb-icon">
                <Icon id={TOWERS[t]?.sprites.icon ?? `icon.tower.${t}`} />
              </span>
              <span class="jb-tag">Jailbroken</span>
            </li>
          ))}
        </ul>
        <p class="jb-what">{silkText(jailbreakWhat(towers))}</p>
        <p class={price === 0 ? 'jb-price free' : 'jb-price'} data-testid="jailbreak-price">
          {jailbreakPriceLine(price)}
        </p>
        <div class="sd-results-buttons jb-buttons">
          <button type="button" class="sd-button" onClick={onCancel}>
            Not now
          </button>
          <button
            type="button"
            class={ready ? 'sd-button sd-button-primary' : 'sd-button sd-button-primary sd-choice-locked'}
            aria-disabled={ready ? undefined : 'true'}
            onClick={() => {
              if (ready) onConfirm();
            }}
          >
            Jailbreak it
          </button>
        </div>
      </section>
    </div>
  );
}
