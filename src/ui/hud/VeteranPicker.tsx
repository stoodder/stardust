// The briefing's veteran picker (T860; design/progression.md § 6): on a replay, one line under the
// medals (the total, the Veteran medal, and Choose). Choose opens a compact grid of eight toggles
// in the medals' place (`veteranOpen`; Briefing.tsx hides the medals and objectives meanwhile, so
// the briefing never grows past its usual height), each a name, one short line, and its bonus.
// The whole effect and a quip show on focus or hover, in one line under the grid (and in each
// toggle's accessible name). A dimmed toggle says why there and never toggles. Playful, never a
// dare: nothing here scolds a player who leaves every toggle off.
import { signal } from '@preact/signals';
import { useEffect, useState } from 'preact/hooks';
import { activeSave } from '../../app/save.ts';
import { toggleVeteran, veteranPickerView, type VeteranRowView } from '../../app/veteran.ts';
import { hud } from '../state.ts';
import './veteranPicker.css';

/** The detail line for a hovered or focused toggle: its whole effect and quip, or why it's dimmed. */
export function veteranDetail(row: VeteranRowView): string {
  return row.available ? `${row.effect}. ${row.quip}` : `${row.effect}. ${row.why ?? ''}`;
}

/** The picker's grid is open (in the medals' place); each briefing starts with it closed. */
export const veteranOpen = signal(false);

/** The picker over the briefing's actions, on a won map in a campaign save; else nothing. */
export function VeteranPicker() {
  // The save is written by the toggles; this counter re-reads it after each one.
  const [, setVersion] = useState(0);
  const [hover, setHover] = useState<VeteranRowView['id'] | null>(null);
  useEffect(
    () => () => {
      veteranOpen.value = false;
    },
    [],
  );
  const view = veteranPickerView(activeSave(), hud.mapId.value);
  if (view === null) return null;
  const open = veteranOpen.value;
  const shown = view.rows.find((r) => r.id === hover) ?? null;
  const toggle = (row: VeteranRowView): void => {
    if (toggleVeteran(view.mapId, row.id)) setVersion((v) => v + 1);
  };
  const medalText = view.medal.held
    ? 'Veteran medal on file'
    : view.medal.reached
      ? 'Veteran medal in reach'
      : `Veteran medal at +${view.medal.at}%`;
  return (
    <section class="hud-veteran" aria-labelledby="hud-veteran-heading" data-testid="veteran-picker">
      <header class="hud-veteran-head">
        <h3 id="hud-veteran-heading" class="hud-veteran-title">
          Veteran modifiers
        </h3>
        <span class="hud-veteran-total" data-testid="veteran-total" aria-live="polite">
          {view.total === 0 ? 'Optional' : `+${view.total}% Stardust`}
        </span>
        <span
          class={`hud-veteran-medal${view.medal.held ? ' held' : view.medal.reached ? ' reached' : ''}`}
          data-testid="veteran-medal"
        >
          <span class="hud-veteran-diamond" aria-hidden="true" />
          {medalText}
        </span>
        <button
          type="button"
          class="hud-btn chamfer hud-veteran-open"
          aria-expanded={open}
          aria-controls="hud-veteran-grid"
          onClick={() => {
            veteranOpen.value = !open;
          }}
        >
          {open ? 'Done' : 'Choose'}
        </button>
      </header>
      {open && (
        <>
          <ul id="hud-veteran-grid" class="hud-veteran-grid" aria-label="Veteran modifiers">
            {view.rows.map((r) => (
              <li key={r.id}>
                <button
                  type="button"
                  class={`hud-veteran-toggle${r.on ? ' on' : ''}${r.available ? '' : ' dim'}`}
                  aria-pressed={r.on}
                  aria-disabled={r.available ? undefined : 'true'}
                  aria-label={`${r.name}, +${r.bonus}% Stardust. ${veteranDetail(r)}`}
                  title={veteranDetail(r)}
                  data-veteran={r.id}
                  onClick={() => toggle(r)}
                  onMouseEnter={() => setHover(r.id)}
                  onMouseLeave={() => setHover((h) => (h === r.id ? null : h))}
                  onFocus={() => setHover(r.id)}
                  onBlur={() => setHover((h) => (h === r.id ? null : h))}
                >
                  <span class="hud-veteran-box" aria-hidden="true" />
                  <span class="hud-veteran-name">{r.name}</span>
                  <span class="hud-veteran-short">
                    {r.available ? r.short : (r.why ?? r.short)}
                  </span>
                  <span class="hud-veteran-bonus">+{r.bonus}%</span>
                </button>
              </li>
            ))}
          </ul>
          <p class="hud-veteran-detail" data-testid="veteran-detail" aria-hidden="true">
            {shown === null
              ? view.best > 0
                ? `Best here: +${view.best}%. Bonuses add; replay wins pay them.`
                : 'Bonuses add; replay wins pay them.'
              : veteranDetail(shown)}
          </p>
        </>
      )}
    </section>
  );
}
