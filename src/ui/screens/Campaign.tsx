// The campaign screen: the Shift board (T209, D031) through Act I, and the star map (the Sector
// map, StarMap.tsx; T301b, D102) once A1M5 is won, so every way back to the campaign lands on the
// right one. The Shift board lists Act I's maps in order. Each row shows its shift number, name,
// medals, and state: Start (open), Replay (won), locked until the shift before is won, or coming
// soon (its content isn't built yet); then one dimmed, padlocked, unnamed sixth row, so the board
// never dead-ends (D097). The header shows the banks; the footer leads to the base (locked with
// its hint until A1M1 is won) and Settings.
import { Banks, MedalPips } from './Banks.tsx';
import { MenuNotice } from './MenuNotice.tsx';
import { StarMap } from './StarMap.tsx';
import { silkText } from '../silk.ts';
import { openSettings, playMap, toBase, toTitle } from '../../app/navigation.ts';
import { focusOnce } from './focus.ts';
import { campaign, type ShiftView } from './state.ts';
import './screens.css';

const STATE_TEXT: Readonly<Record<ShiftView['state'], string>> = {
  won: 'Cleared',
  open: 'Next up',
  locked: 'Locked',
  coming_soon: 'Coming soon',
};

function ShiftRow({ shift, first }: { shift: ShiftView; first: boolean }) {
  const playable = shift.state === 'open' || shift.state === 'won';
  return (
    <li
      class={`sd-shift sd-shift-${shift.state}${shift.teaser ? ' sd-shift-teaser' : ''}`}
      data-testid={shift.teaser ? 'shift-teaser' : undefined}
    >
      <span class="sd-shift-index">Shift {shift.index}</span>
      <span class="sd-shift-name">{silkText(shift.name)}</span>
      {shift.teaser ? (
        <span class="sd-medals" aria-hidden="true" />
      ) : (
        <MedalPips earned={shift.medals} />
      )}
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
        <span class="sd-shift-lock" aria-hidden="true">
          <span class="sd-lock" />
        </span>
      )}
    </li>
  );
}

export { Banks, MedalPips };

/** The campaign screen for the save in play: the Shift board, or the star map after Act I. */
export function Campaign() {
  const view = campaign.value;
  if (view === null) return null;
  if (view.mode === 'starMap') return <StarMap />;
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
            {view.profile !== null && (
              <p class="sd-kicker sd-campaign-tech" data-testid="technician">
                JPT-1 {silkText(view.profile.name)} · #ED-447
              </p>
            )}
          </div>
          <Banks view={view} />
        </header>
        <MenuNotice />
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
