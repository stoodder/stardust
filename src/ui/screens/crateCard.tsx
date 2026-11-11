// Zibzab's crate card (act3.md § A3M6; T714; the rules are crate.ts): over A3M6's briefing once
// Clock in is pressed. The crate's lid with the NO REFUNDS sticker peeling, Zibzab's "Price first:
// nothing." under his plate (D150), a line, then what it holds: the tune-ups it installs, listed,
// or the Field Protocols to pick one from (a story choice's 700 ms lock first, CHOICE_LOCK_MS). "Take the crate" (focused, or once a pick is
// made) takes it and clocks in. A modal over the briefing: Tab stays inside it.
import { useEffect, useState } from 'preact/hooks';
import { dismissBriefing } from '../../app/commands.ts';
import { activeSave } from '../../app/save.ts';
import { trapTab } from '../dialogue/SceneParts.tsx';
import { plateColor } from '../dialogue/plate.ts';
import { SPEAKERS } from '../../content/dialogue/speakers.ts';
import { hud } from '../state.ts';
import { silkText } from '../silk.ts';
import { focusOnce } from './focus.ts';
import { CHOICE_LOCK_MS } from './StoryChoice.tsx';
import {
  canTake,
  crate,
  crateHere,
  crateLine,
  crateQuote,
  STICKER,
  takeCrate,
  type CrateView,
} from './crate.ts';
import './crate.css';

/** The crate's view on the map in play, for the save in play (null: nothing to open here). */
export function crateInPlay(): CrateView | null {
  return crateHere(hud.mapId.value, activeSave());
}

function Contents({ view, ready }: { view: CrateView; ready: boolean }) {
  if (view.kind === 'tune_ups') {
    return (
      <ul class="cr-rows" aria-label="Installed">
        {view.rows.map((r) => (
          <li key={r.id} class="cr-row">
            <span class="cr-row-name">{silkText(r.name)}</span>
            <span class="cr-row-ranks">{r.ranks}</span>
          </li>
        ))}
      </ul>
    );
  }
  if (view.kind === 'empty') return null;
  const pick = crate.pick.value;
  return (
    <div class="cr-pick" role="radiogroup" aria-label="Field Protocol">
      {view.options.map((o) => (
        <button
          key={o.id}
          type="button"
          role="radio"
          aria-checked={pick === o.id}
          aria-disabled={ready ? undefined : 'true'}
          class={`cr-option${pick === o.id ? ' picked' : ''}${ready ? '' : ' locked'}`}
          onClick={() => {
            if (ready) crate.pick.value = o.id;
          }}
        >
          <span class="cr-option-name">{silkText(o.name)}</span>
          <span class="cr-option-effect">{o.effect}</span>
        </button>
      ))}
    </div>
  );
}

/** The card, while it is open over the briefing. */
export function CrateCard() {
  const view = crateInPlay();
  if (!crate.open.value || view === null) return null;
  return <Card view={view} />;
}

function Card({ view }: { view: CrateView }) {
  const [ready, setReady] = useState(view.kind !== 'pick');
  useEffect(() => {
    if (ready) return undefined;
    const t = setTimeout(() => setReady(true), CHOICE_LOCK_MS);
    return () => clearTimeout(t);
  }, []);
  const can = canTake(view, crate.pick.value);
  const quote = crateQuote();
  return (
    <div class="cr-layer">
      <section
        class="cr chamfer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="cr-title"
        data-testid="crate-card"
        data-kind={view.kind}
        onKeyDown={trapTab}
      >
        <div class="cr-lid" aria-hidden="true">
          <span class="cr-lid-brand">Zibzab</span>
          <span class="cr-sticker">{STICKER}</span>
        </div>
        <h2
          id="cr-title"
          class="cr-title"
          tabIndex={-1}
          ref={view.kind === 'pick' ? focusOnce : null}
        >
          Zibzab's crate
        </h2>
        {quote !== null && (
          <p class="cr-quote" data-testid="crate-quote">
            <span class="cr-quote-plate" style={{ color: plateColor(SPEAKERS.zibzab.color) }}>
              {SPEAKERS.zibzab.name}
            </span>
            <span class="cr-quote-text">{quote}</span>
          </p>
        )}
        <p class="cr-line">{crateLine(view)}</p>
        <Contents view={view} ready={ready} />
        <div class="cr-actions">
          <button
            type="button"
            class="hud-btn chamfer cr-take"
            ref={view.kind === 'pick' ? null : focusOnce}
            aria-disabled={can ? undefined : 'true'}
            onClick={() => {
              if (takeCrate(view)) dismissBriefing();
            }}
          >
            Take the crate
          </button>
        </div>
      </section>
    </div>
  );
}
