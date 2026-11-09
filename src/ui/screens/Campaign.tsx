// The Shift board (T209, D031): the campaign's maps in order, standing in for the star map (T301).
// Each row shows its shift number, name, medals, and state: Start (open), Replay (won), locked
// until the shift before is won, or coming soon (its content isn't built yet). The header shows
// the banks; the footer leads to the base (locked with its hint until A1M1 is won) and Settings.
import { openSettings, playMap, toBase, toTitle } from '../../app/navigation.ts';
import { focusOnce } from './focus.ts';
import { formatCount } from './format.ts';
import { campaign, type CampaignView, type ShiftView } from './state.ts';
import './screens.css';

/** A map has three medals (progression.md § 3); filled pips for the ones earned. */
export function MedalPips({ earned }: { earned: number }) {
  return (
    <span class="sd-medals" role="img" aria-label={`${earned} of 3 medals`}>
      {[0, 1, 2].map((i) => (
        <span key={i} class={i < earned ? 'sd-medal sd-medal-on' : 'sd-medal'} />
      ))}
    </span>
  );
}

/** The banks: Stardust and Intel. */
export function Banks({ view }: { view: CampaignView }) {
  return (
    <dl class="sd-banks">
      <div>
        <dt class="sd-stardust">Stardust</dt>
        <dd>{formatCount(view.stardust)}</dd>
      </div>
      <div>
        <dt class="sd-intel">Intel</dt>
        <dd>{formatCount(view.intel)}</dd>
      </div>
    </dl>
  );
}

const STATE_TEXT: Readonly<Record<ShiftView['state'], string>> = {
  won: 'Cleared',
  open: 'Next up',
  locked: 'Locked',
  coming_soon: 'Coming soon',
};

function ShiftRow({ shift, first }: { shift: ShiftView; first: boolean }) {
  const playable = shift.state === 'open' || shift.state === 'won';
  return (
    <li class={`sd-shift sd-shift-${shift.state}`}>
      <span class="sd-shift-index">Shift {shift.index}</span>
      <span class="sd-shift-name">{shift.name}</span>
      <MedalPips earned={shift.medals} />
      <span class="sd-shift-state">{STATE_TEXT[shift.state]}</span>
      {playable ? (
        <button
          type="button"
          class={
            shift.state === 'open'
              ? 'sd-button sd-button-small sd-button-primary'
              : 'sd-button sd-button-small'
          }
          aria-label={`${shift.state === 'open' ? 'Start' : 'Replay'} ${shift.name}`}
          ref={first ? focusOnce : null}
          onClick={() => playMap(shift.id)}
        >
          {shift.state === 'open' ? 'Start' : 'Replay'}
        </button>
      ) : (
        <span class="sd-shift-lock" aria-hidden="true" />
      )}
    </li>
  );
}

/** The Shift board for the save in play. */
export function Campaign() {
  const view = campaign.value;
  if (view === null) return null;
  // The focus lands on the next shift to play (else the first playable one).
  const focus =
    view.board.find((s) => s.state === 'open') ??
    view.board.findLast((s) => s.state === 'won') ??
    null;
  const base = view.systems.base;
  return (
    <main class="sd-screen sd-menu" aria-labelledby="sd-campaign-heading">
      <section class="sd-panel sd-menu-panel">
        <header class="sd-menu-header">
          <div>
            <p class="sd-kicker">
              Everglow · Dome Row Perimeter
              {view.slot === null ? ' · Dev save' : ` · Slot ${view.slot}`}
            </p>
            <h1 id="sd-campaign-heading" class="sd-menu-heading">
              Shift board
            </h1>
          </div>
          <Banks view={view} />
        </header>
        <ol class="sd-shifts" aria-label="Shifts">
          {view.board.map((s) => (
            <ShiftRow key={s.id} shift={s} first={s === focus} />
          ))}
        </ol>
        <footer class="sd-row sd-menu-footer">
          <button type="button" class="sd-button" onClick={toTitle}>
            Title
          </button>
          <button type="button" class="sd-button" onClick={openSettings}>
            Settings
          </button>
          <button
            type="button"
            class="sd-button"
            aria-disabled={!base.unlocked}
            title={base.unlocked ? undefined : base.hint}
            onClick={() => {
              if (base.unlocked) toBase();
            }}
          >
            {base.unlocked ? 'Base' : `Base · ${base.hint}`}
          </button>
        </footer>
      </section>
    </main>
  );
}
