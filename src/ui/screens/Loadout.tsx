// The loadout screen (T201; design/core-loop.md § 1, vision pillar 2): before a map, pick up to
// four tower types (in build-slot order) and the Technician's ability. Each tower shows its icon,
// role, cost, and which of the map's counters it answers; the side column shows slot 2 (the map's
// companion), the synergy links the pool can form (lit when the pick forms them), and a heads-up
// for any required counter the pick leaves unanswered (a warning, never a block or a scold).
// The router shows it only when there's a choice to make (meta/loadout.ts, the skip rule).
// Keys: Tab moves between the groups; the arrows move within the tower grid and the ability
// radio group; Enter or Space toggles a tower; Lock in has the focus on arrival, so Enter goes
// straight on with the remembered pick; Esc goes back to the Shift board.
import { silkText } from '../silk.ts';
import { useState } from 'preact/hooks';
import { formedLinks, pickWarnings, togglePickTower } from '../../app/loadout.ts';
import { lockInLoadout, toCampaign } from '../../app/navigation.ts';
import { Icon } from '../hud/Icon.tsx';
import { useEscape } from './escape.ts';
import { focusOnce } from './focus.ts';
import {
  loadout,
  type LoadoutAbilityView,
  type LoadoutPickView,
  type LoadoutTowerView,
  type LoadoutView,
} from './loadoutView.ts';
import './screens.css';
import './Loadout.css';

/** The tower grid's columns (the arrow keys move by these). */
const GRID_COLUMNS = 2;

/** Moves the focus to the button at `index` in `selector` under the screen's root. */
function focusAt(selector: string, index: number): void {
  const items = document.querySelectorAll<HTMLElement>(selector);
  if (items.length === 0) return;
  items[Math.max(0, Math.min(items.length - 1, index))]?.focus();
}

function TowerCard(props: {
  t: LoadoutTowerView;
  slot: number | null;
  full: boolean;
  index: number;
  onToggle: () => void;
}) {
  const { t, slot, full, index } = props;
  const blocked = slot === null && full;
  const answers = t.answers.map((a) => (a.via === null ? a.label : `${a.label} ${a.via}`));
  return (
    <li>
      <button
        type="button"
        class={`sd-lo-tower${slot !== null ? ' sd-lo-on' : ''}${blocked ? ' sd-lo-full' : ''}`}
        aria-pressed={slot !== null}
        aria-disabled={blocked}
        aria-label={
          `${t.name}, ${t.role}, ${t.cost} credits` +
          (answers.length > 0 ? `, answers ${answers.join(', ')}` : '') +
          (slot !== null ? `, build slot ${slot}` : '')
        }
        onClick={props.onToggle}
        onKeyDown={(e) => {
          const by: Readonly<Record<string, number>> = {
            ArrowLeft: -1,
            ArrowRight: 1,
            ArrowUp: -GRID_COLUMNS,
            ArrowDown: GRID_COLUMNS,
          };
          const step = by[e.key];
          if (step === undefined) return;
          e.preventDefault();
          focusAt('.sd-lo-tower', index + step);
        }}
      >
        <span class="sd-lo-slot" aria-hidden="true">
          {slot ?? ''}
        </span>
        <Icon id={t.icon} class="sd-lo-icon" />
        <span class="sd-lo-text" aria-hidden="true">
          <span class="sd-lo-row">
            <span class="sd-lo-name">{silkText(t.name)}</span>
            <span class="sd-lo-cost">{t.cost}</span>
          </span>
          <span class="sd-lo-role">{t.role}</span>
          {t.answers.length > 0 && (
            <span class="sd-lo-chips">
              {t.answers.map((a) => (
                <span key={a.counter} class={`sd-lo-chip${a.required ? ' sd-lo-chip-need' : ''}`}>
                  {a.via === null ? a.label : `${a.label} · ${a.via}`}
                </span>
              ))}
            </span>
          )}
        </span>
      </button>
    </li>
  );
}

function AbilityPicker(props: {
  abilities: readonly LoadoutAbilityView[];
  picked: string | null;
  onPick: (id: string) => void;
}) {
  const { abilities, picked } = props;
  const move = (i: number): void => {
    const next = abilities[(i + abilities.length) % abilities.length];
    if (next === undefined) return;
    props.onPick(next.id);
    focusAt('.sd-lo-ability', (i + abilities.length) % abilities.length);
  };
  return (
    <div class="sd-lo-abilities" role="radiogroup" aria-labelledby="sd-lo-ability-label">
      {abilities.map((a, i) => (
        <button
          key={a.id}
          type="button"
          role="radio"
          class={`sd-lo-ability${a.id === picked ? ' sd-lo-on' : ''}`}
          aria-checked={a.id === picked}
          tabIndex={a.id === picked || (picked === null && i === 0) ? 0 : -1}
          onClick={() => props.onPick(a.id)}
          onKeyDown={(e) => {
            if (e.key === 'ArrowRight' || e.key === 'ArrowDown') move(i + 1);
            else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') move(i - 1);
            else return;
            e.preventDefault();
          }}
        >
          <Icon id={a.icon} class="sd-lo-icon" />
          <span class="sd-lo-ability-name">{silkText(a.name)}</span>
          {a.answers.length > 0 && <span class="sd-lo-chip">{a.answers.join(' · ')}</span>}
        </button>
      ))}
    </div>
  );
}

function Links({ view, pick }: { view: LoadoutView; pick: LoadoutPickView }) {
  const formed = formedLinks(pick);
  if (view.links.length === 0) {
    return <p class="sd-lo-dim">No links among your towers yet.</p>;
  }
  return (
    <ul class="sd-lo-links">
      {view.links.map((l) => {
        const on = formed.includes(l.id);
        const missing = l.partners.filter((p) => !pick.towers.includes(p));
        const names = missing.map((p) => view.towers.find((t) => t.id === p)?.name ?? p);
        return (
          <li key={l.id} class={on ? 'sd-lo-link sd-lo-link-on' : 'sd-lo-link'}>
            <span class="sd-lo-link-head">
              <span class="sd-lo-link-name">{silkText(l.name)}</span>
              <span class="sd-lo-link-state">{on ? 'Linked' : `Needs ${names.join(' + ')}`}</span>
            </span>
            <span class="sd-lo-link-bonus">{l.bonus}</span>
          </li>
        );
      })}
    </ul>
  );
}

/** The loadout screen for the open map. */
export function Loadout() {
  const view = loadout.value;
  const [pick, setPick] = useState<LoadoutPickView>(
    () => view?.initial ?? { towers: [], ability: null },
  );
  const [notice, setNotice] = useState<string | null>(null);
  // Esc (T212) goes back to the Shift board, as its button does.
  useEscape(() => {
    toCampaign();
    return true;
  });
  if (view === null) return null;
  const full = pick.towers.length >= view.max;
  const warnings = pickWarnings(pick);
  const canLock = pick.towers.length > 0 && (pick.ability !== null || view.abilities.length === 0);
  const toggle = (id: string): void => {
    const next = togglePickTower(pick, id);
    if (next === pick) {
      setNotice(`${view.max} towers is the limit. Drop one to swap this one in.`);
      return;
    }
    setNotice(null);
    setPick(next);
  };
  return (
    <main class="sd-screen sd-menu" aria-labelledby="sd-loadout-heading">
      <section class="sd-panel sd-menu-panel sd-lo-panel">
        <header class="sd-menu-header">
          <div>
            <p class="sd-kicker">
              {view.shift === null ? view.mapName : `Shift ${view.shift} · ${view.mapName}`}
            </p>
            <h1 id="sd-loadout-heading" class="sd-menu-heading">
              Loadout
            </h1>
          </div>
          <dl class="sd-lo-intel">
            <div>
              <dt>Threats</dt>
              <dd>{view.threats.length === 0 ? 'None reported' : view.threats.join(' · ')}</dd>
            </div>
            {view.counters.some((c) => c.required) && (
              <div>
                <dt>Needs an answer to</dt>
                <dd class="sd-lo-need">
                  {view.counters
                    .filter((c) => c.required)
                    .map((c) => c.label)
                    .join(' · ')}
                </dd>
              </div>
            )}
          </dl>
        </header>
        <div class="sd-lo-body">
          <section class="sd-lo-main" aria-labelledby="sd-lo-towers-label">
            <h2 id="sd-lo-towers-label" class="sd-panel-heading sd-lo-heading">
              Towers{' '}
              <span class="sd-lo-count">
                {pick.towers.length} / {view.max}
              </span>
            </h2>
            <ul class="sd-lo-towers" aria-label={`Towers, pick up to ${view.max}`}>
              {view.towers.map((t, i) => {
                const at = pick.towers.indexOf(t.id);
                return (
                  <TowerCard
                    key={t.id}
                    t={t}
                    index={i}
                    slot={at < 0 ? null : at + 1}
                    full={full}
                    onToggle={() => toggle(t.id)}
                  />
                );
              })}
            </ul>
            <p class="sd-lo-hint" role="status">
              {notice ?? 'Pick order is build-slot order (keys 1–4 in the shift).'}
            </p>
          </section>
          <aside class="sd-lo-side">
            <h2 id="sd-lo-ability-label" class="sd-panel-heading sd-lo-heading">
              Technician
            </h2>
            {view.abilities.length === 0 ? (
              <p class="sd-lo-dim">No abilities issued yet.</p>
            ) : (
              <AbilityPicker
                abilities={view.abilities}
                picked={pick.ability}
                onPick={(id) => setPick({ ...pick, ability: id })}
              />
            )}
            {view.companion !== null && (
              <p class="sd-lo-companion">
                <span class="sd-lo-dim">Slot 2 </span>
                {view.companion}
              </p>
            )}
            <h2 class="sd-panel-heading sd-lo-heading">Links</h2>
            <Links view={view} pick={pick} />
            <div class="sd-lo-warnings" aria-live="polite">
              {warnings.map((w) => (
                <p key={w} class="sd-lo-warning">
                  {w}
                </p>
              ))}
            </div>
          </aside>
        </div>
        <footer class="sd-row sd-menu-footer">
          <button type="button" class="sd-button" onClick={toCampaign}>
            Shift board
          </button>
          <button
            type="button"
            class="sd-button sd-button-primary"
            aria-disabled={!canLock}
            title={canLock ? undefined : 'Pick at least one tower'}
            ref={focusOnce}
            onClick={() => {
              if (canLock) lockInLoadout(pick);
              else setNotice('Pick at least one tower to clock in with.');
            }}
          >
            Lock in
          </button>
        </footer>
      </section>
    </main>
  );
}
