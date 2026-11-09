// The base (T209, D031): Research, Zibzab's shop, and Engineering as tabs. A tab whose system the
// campaign hasn't opened yet shows a locked pane with what opens it ("Opens after The Audit";
// meta/progress.ts SYSTEM_UNLOCKS). An open tab shows its shelf (BasePanes.tsx, T204d).
import { useState } from 'preact/hooks';
import { openSettings, toCampaign } from '../../app/navigation.ts';
import { BASE_PANES, type BaseTab } from './BasePanes.tsx';
import { Banks } from './Campaign.tsx';
import { useEscape } from './escape.ts';
import { focusOnce } from './focus.ts';
import { campaign } from './state.ts';
import './screens.css';
import './base.css';

const TABS: readonly { readonly id: BaseTab; readonly label: string }[] = [
  { id: 'rnd', label: 'Research' },
  { id: 'shop', label: 'Shop' },
  { id: 'engineering', label: 'Engineering' },
];

/** The base for the save in play. Arrow keys move between tabs (the WAI-ARIA tabs pattern). */
export function Base() {
  const [tab, setTab] = useState<BaseTab>('rnd');
  // Esc (T212) goes back to the Shift board, as its button does.
  useEscape(() => {
    toCampaign();
    return true;
  });
  const view = campaign.value;
  if (view === null) return null;
  const system = view.systems[tab];
  const Pane = BASE_PANES[tab];
  const move = (by: number): void => {
    const i = TABS.findIndex((t) => t.id === tab);
    const next = TABS[(i + by + TABS.length) % TABS.length]!;
    setTab(next.id);
    document.getElementById(`sd-tab-${next.id}`)?.focus();
  };
  return (
    <main class="sd-screen sd-menu" aria-labelledby="sd-base-heading">
      <section class="sd-panel sd-menu-panel sd-base-panel">
        <header class="sd-menu-header">
          <div>
            <p class="sd-kicker">Everglow · Dome Row Perimeter · Base</p>
            <h1 id="sd-base-heading" class="sd-menu-heading">
              Base
            </h1>
          </div>
          <Banks view={view} />
        </header>
        <div class="sd-tabs" role="tablist" aria-label="Base">
          {TABS.map((t) => {
            const open = view.systems[t.id].unlocked;
            return (
              <button
                key={t.id}
                id={`sd-tab-${t.id}`}
                type="button"
                role="tab"
                class={`sd-tab${t.id === tab ? ' sd-tab-on' : ''}${open ? '' : ' sd-tab-locked'}`}
                aria-selected={t.id === tab}
                aria-controls="sd-tab-pane"
                tabIndex={t.id === tab ? 0 : -1}
                ref={t.id === tab ? focusOnce : null}
                onClick={() => setTab(t.id)}
                onKeyDown={(e) => {
                  if (e.key === 'ArrowRight') move(1);
                  else if (e.key === 'ArrowLeft') move(-1);
                  else return;
                  e.preventDefault();
                }}
              >
                {!open && <span class="sd-lock" aria-hidden="true" />}
                {t.label}
                {!open && <span class="sd-visually-hidden"> (locked)</span>}
              </button>
            );
          })}
        </div>
        <div
          id="sd-tab-pane"
          class={`sd-tab-pane${system.unlocked ? ' sd-tab-pane-store' : ' sd-tab-pane-locked'}`}
          role="tabpanel"
          aria-labelledby={`sd-tab-${tab}`}
        >
          {system.unlocked ? (
            <Pane view={view} />
          ) : (
            <div class="sd-pane-body">
              <span class="sd-lock sd-lock-big" aria-hidden="true" />
              <p class="sd-pane-who">Locked</p>
              <p class="sd-pane-line">{system.hint}</p>
            </div>
          )}
        </div>
        <footer class="sd-row sd-menu-footer">
          <button type="button" class="sd-button sd-button-primary" onClick={toCampaign}>
            Shift board
          </button>
          <button type="button" class="sd-button" onClick={openSettings}>
            Settings
          </button>
        </footer>
      </section>
    </main>
  );
}
