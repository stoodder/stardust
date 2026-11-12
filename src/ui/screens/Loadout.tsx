// The loadout screen (T201; design/core-loop.md § 1, vision pillar 2): before a map, pick up to
// four tower types (in build-slot order), the Technician's ability, and the Field Protocols to
// equip (T308: up to the save's slots, save-wide). Each tower shows its icon, role, cost, and which
// of the map's counters it answers, and the protocols sit under the towers; the side column shows
// slot 2 (the map's companion), the synergy links the pool can form (lit when it forms them), and a heads-up
// for any required counter the pick leaves unanswered (a warning, never a block or a scold).
// A class revoked from the save (A3M2's Clean Exit) stays on the grid as a stamped, locked card,
// "License revoked", never pickable; a revoked Orbital Strike reads "Uplink revoked" under its
// stamp in the Technician column (towers.md § 9; D143 R4).
// The router shows it only when there's a choice to make (meta/loadout.ts, the skip rule).
// Declutter (T803d; D153): what the pick decides stays in first view (the threats on their own row
// under the kicker, every card's counter chips, the picked protocols' effects, the formed links'
// names, the heads-up); the rest is one hover, focus or press away: an unpicked protocol's effect
// shows on the line under the list while it's hovered or focused, the whole Links list opens from
// its toggle (a floating Disclosure), and the pick-order hint is the grid's tooltip. Slot 2's line
// shows only where no Technician card already says who brings it. The run's rules show where they
// bite (T860, T862): Short-Handed beside the tower count, a challenge's stay-home towers greyed
// with why, Radio Silence and No Protocols as a line under their heading.
// Keys: Tab moves between the groups; the arrows move within the tower grid and the ability
// radio group; Enter or Space toggles a tower or a protocol; Lock in has the focus on arrival, so
// Enter goes straight on with the remembered pick; Esc goes back to the Shift board.
import { MenuNotice } from './MenuNotice.tsx';
import { Fragment, type RefObject } from 'preact';
import { Disclosure } from '../components/Disclosure.tsx';
import { useEffect, useRef, useState } from 'preact/hooks';
import {
  abilityGreyed,
  formedLinks,
  pickAbility,
  pickCompanion,
  pickWarnings,
  setProtocolTower,
  togglePickProtocol,
  togglePickTower,
} from '../../app/loadout.ts';
import { lockInLoadout, toCampaign } from '../../app/navigation.ts';
import { campaignScreenName } from '../../app/starMap.ts';
import { UPLINK_STAMP } from '../hud/AbilityBar.tsx';
import { LICENSE_STAMP } from '../hud/BuildBar.tsx';
import { Icon, JAILBROKEN_ICON } from '../hud/Icon.tsx';
import { useEscape } from './escape.ts';
import { focusOnce } from './focus.ts';
import { prefersReducedMotion } from '../motion.ts';
import {
  loadout,
  type LoadoutAbilityView,
  type LoadoutCompanionView,
  type LoadoutLockedAbilityView,
  type LoadoutPickView,
  type LoadoutProtocolView,
  type LoadoutRevokedView,
  type LoadoutTowerView,
  type LoadoutView,
} from './loadoutView.ts';
import './screens.css';
import './Loadout.css';

/** How the pick's order plays (the Towers heading's tooltip and the grid's description). */
const PICK_ORDER_HINT = 'Pick order is build-slot order (keys 1–4 in the shift).';

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
  const stays = t.stays !== undefined;
  const blocked = slot === null && (full || stays);
  const answers = t.answers.map((a) => (a.via === null ? a.label : `${a.label} ${a.via}`));
  return (
    <li>
      <button
        type="button"
        class={`sd-lo-tower${slot !== null ? ' sd-lo-on' : ''}${blocked ? ' sd-lo-full' : ''}${stays ? ' sd-lo-stays' : ''}`}
        aria-pressed={slot !== null}
        aria-disabled={blocked}
        aria-label={
          `${t.name}${t.jailbroken === true ? ', jailbroken' : ''}, ${t.role}, ${t.cost} credits` +
          (stays ? `, ${t.stays}` : '') +
          (answers.length > 0 ? `, answers ${answers.join(', ')}` : '') +
          (slot !== null ? `, build slot ${slot}` : '')
        }
        onClick={(e) => {
          props.onToggle();
          // A pick half under the grid's fold scrolls into view, so its slot number shows (D151).
          if (slot === null && !blocked) e.currentTarget.scrollIntoView?.({ block: 'nearest' });
        }}
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
        <Icon
          id={t.icon}
          class="sd-lo-icon"
          variant={t.jailbroken === true ? JAILBROKEN_ICON : undefined}
        />
        <span class="sd-lo-text" aria-hidden="true">
          <span class="sd-lo-row">
            <span class="sd-lo-name">{t.name}</span>
            <span class="sd-lo-cost">{t.cost}</span>
          </span>
          <span class="sd-lo-role">
            {t.role}
            {/* Zibzab's firmware (T731; towers.md § 9): said in words too, not only the glow. */}
            {t.jailbroken === true && <span class="sd-lo-jb"> · Jailbroken</span>}
          </span>
          {/* A challenge's faction rule leaves it home (T862): greyed, and says why. */}
          {stays && (
            <span class="sd-lo-stays-why" data-testid="loadout-stays">
              {t.stays}
            </span>
          )}
          {t.answers.length > 0 && (
            <span class="sd-lo-chips" data-critical="tower-counters">
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

/**
 * A revoked class or ability: its icon dimmed under the stamp, its name, and what happened. Not a
 * control (nothing to press); read as one line ("Thumper: License revoked").
 */
function RevokedCard({ r, stamp, what }: { r: LoadoutRevokedView; stamp: string; what: string }) {
  return (
    <div class="sd-lo-revoked" data-testid="loadout-revoked" data-revoked={r.id}>
      <span class="sd-lo-revoked-art" aria-hidden="true">
        <Icon id={r.icon} class="sd-lo-icon" />
        <span class="sd-lo-revoked-stamp">
          <Icon id={stamp} />
        </span>
      </span>
      <span class="sd-lo-text">
        <span class="sd-lo-name">
          {r.name}
          <span class="sd-visually-hidden">:</span>
        </span>
        <span class="sd-lo-revoked-what">{what}</span>
      </span>
    </div>
  );
}

/**
 * A Technician ability the map locks under the save's story (T731; A3M5's System Reboot under C4
 * Rewrite): its icon dimmed under the padlock, its name, and why, like a revoked card but with no
 * stamp (nobody revoked it; QUILL is offline). Not a control: read as one line.
 */
function LockedAbilityCard({ l }: { l: LoadoutLockedAbilityView }) {
  return (
    <div class="sd-lo-revoked sd-lo-locked" data-testid="loadout-locked" data-locked={l.id}>
      <span class="sd-lo-revoked-art" aria-hidden="true">
        <Icon id={l.icon} class="sd-lo-icon" />
        <span class="sd-lo-locked-pad">
          <Icon id="icon.lock" />
        </span>
      </span>
      <span class="sd-lo-text">
        <span class="sd-lo-name">
          {l.name}
          <span class="sd-visually-hidden">: locked on this shift.</span>
        </span>
        <span class="sd-lo-locked-why">{l.reason}</span>
      </span>
    </div>
  );
}

function AbilityPicker(props: {
  abilities: readonly LoadoutAbilityView[];
  picked: string | null;
  /** Whether a card greys beside the picked companion (T501: they bring it in slot 2). */
  greyed: (id: string) => boolean;
  onPick: (id: string) => void;
}) {
  const { abilities, picked, greyed } = props;
  // The arrows skip a greyed card (it can't be the pick); it still reads, and says why.
  const move = (i: number, step: number): void => {
    for (let n = 1; n <= abilities.length; n++) {
      const at = (i + step * n + abilities.length * n) % abilities.length;
      const next = abilities[at];
      if (next === undefined || greyed(next.id)) continue;
      props.onPick(next.id);
      focusAt('.sd-lo-ability', at);
      return;
    }
  };
  return (
    <div class="sd-lo-abilities" role="radiogroup" aria-labelledby="sd-lo-ability-label">
      {abilities.map((a, i) => {
        const off = greyed(a.id);
        return (
          <button
            key={a.id}
            type="button"
            role="radio"
            class={`sd-lo-ability${a.id === picked ? ' sd-lo-on' : ''}${off ? ' sd-lo-off' : ''}`}
            aria-checked={a.id === picked}
            aria-disabled={off ? 'true' : undefined}
            data-testid="loadout-ability"
            data-ability={a.id}
            tabIndex={a.id === picked || (picked === null && i === 0) ? 0 : -1}
            onClick={() => {
              if (!off) props.onPick(a.id);
            }}
            onKeyDown={(e) => {
              if (e.key === 'ArrowRight' || e.key === 'ArrowDown') move(i, 1);
              else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') move(i, -1);
              else return;
              e.preventDefault();
            }}
          >
            <Icon id={a.icon} class="sd-lo-icon" />
            <span class="sd-lo-ability-name">
              {a.name}
              {/* Inherited from a companion (T731: QUILL's Time Dilation under C4 Keep). */}
              {a.inheritedFrom !== undefined && (
                <span class="sd-lo-from" data-testid="loadout-inherited">
                  {' '}
                  · {a.inheritedFrom}
                </span>
              )}
              {/* Its companion walks with you and brings it in slot 2 (T501). */}
              {off && a.brings !== undefined && (
                <span
                  class="sd-lo-locked-why sd-lo-brings"
                  data-testid="loadout-brings"
                  data-voice="brings"
                >
                  {' '}
                  · {a.brings.reason}
                </span>
              )}
            </span>
            {a.answers.length > 0 && <span class="sd-lo-chip">{a.answers.join(' · ')}</span>}
          </button>
        );
      })}
    </div>
  );
}

/**
 * The finale's companion pick (core-loop.md § 3.1): who walks with you, each with the ability they
 * bring to slot 2, as a radio group in slot 2's place. The first (Ves'thara) is the default; QUILL
 * isn't on it under C4 Purge.
 */
function CompanionPicker(props: {
  companions: readonly LoadoutCompanionView[];
  picked: string | null;
  onPick: (id: string) => void;
}) {
  const { companions, picked } = props;
  const move = (i: number): void => {
    const at = (i + companions.length) % companions.length;
    const next = companions[at];
    if (next === undefined) return;
    props.onPick(next.id);
    focusAt('.sd-lo-companion-card', at);
  };
  return (
    <div
      class="sd-lo-abilities sd-lo-companions"
      role="radiogroup"
      aria-labelledby="sd-lo-companion-label"
      data-testid="loadout-companions"
    >
      {companions.map((k, i) => (
        <button
          key={k.id}
          type="button"
          role="radio"
          class={`sd-lo-ability sd-lo-companion-card${k.id === picked ? ' sd-lo-on' : ''}`}
          aria-checked={k.id === picked}
          data-testid="loadout-companion"
          data-voice="companion"
          data-companion={k.id}
          tabIndex={k.id === picked || (picked === null && i === 0) ? 0 : -1}
          onClick={() => props.onPick(k.id)}
          onKeyDown={(e) => {
            if (e.key === 'ArrowRight' || e.key === 'ArrowDown') move(i + 1);
            else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') move(i - 1);
            else return;
            e.preventDefault();
          }}
        >
          {k.icon !== '' && <Icon id={k.icon} class="sd-lo-icon" />}
          <span class="sd-lo-ability-name">
            {k.name}
            <span class="sd-lo-companion-ability">
              <span class="sd-visually-hidden">, </span>
              {k.ability}
            </span>
          </span>
        </button>
      ))}
    </div>
  );
}

/**
 * The Field Protocol picker: each owned protocol toggles on and off (aria-pressed), up to the
 * slots; with one slot, picking another swaps it in. Specialist, once equipped, picks its tower.
 * A row is its name; an equipped one shows its effect too, and the others show theirs on the line
 * under the list while hovered or focused (T803d; the button's name always carries it). A note
 * (no core on this shift, benched) always shows: it says why the row is dim.
 */
function Protocols(props: {
  view: LoadoutView;
  pick: LoadoutPickView;
  onPick: (next: LoadoutPickView) => void;
  onFull: () => void;
}) {
  const { view, pick } = props;
  const [peek, setPeek] = useState<string | null>(null);
  if (view.protocols.length === 0) {
    return <p class="sd-lo-dim">None owned yet. Zibzab sells them.</p>;
  }
  const full = pick.protocols.length >= view.protocolSlots && view.protocolSlots > 1;
  const peeked = view.protocols.find((p) => p.id === peek && !pick.protocols.includes(p.id));
  return (
    <>
      <ul class="sd-lo-protocols" aria-label={`Field Protocols, equip up to ${view.protocolSlots}`}>
        {view.protocols.map((p: LoadoutProtocolView) => {
          const on = pick.protocols.includes(p.id);
          const blocked = !on && full;
          const tower = pick.protocolPicks[p.id];
          // Benched on arrival (D144 S1b), its note says so until the player equips it again.
          const note = on ? p.inert : (p.benched ?? p.inert);
          const show = (): void => setPeek(p.id);
          const hide = (): void => setPeek((was) => (was === p.id ? null : was));
          return (
            <li key={p.id} class="sd-lo-protocol-row">
              <button
                type="button"
                class={`sd-lo-protocol${on ? ' sd-lo-on' : ''}${blocked ? ' sd-lo-full' : ''}${p.inert === null ? '' : ' sd-lo-inert'}`}
                data-protocol={p.id}
                aria-pressed={on}
                aria-disabled={blocked}
                aria-label={`${p.name}: ${p.effect}${note === null ? '' : `. ${note}`}${on ? ', equipped' : ''}`}
                onMouseEnter={show}
                onMouseLeave={hide}
                onFocus={show}
                onBlur={hide}
                onClick={() => {
                  const next = togglePickProtocol(pick, p.id);
                  if (next === pick) props.onFull();
                  else props.onPick(next);
                }}
              >
                <span class="sd-lo-protocol-name" aria-hidden="true">
                  {p.name}
                </span>
                {/* Equipped: what it does stays in view (the pick is the decision). */}
                <span
                  class={on ? 'sd-lo-protocol-effect' : 'sd-lo-protocol-effect sd-lo-peek-only'}
                  aria-hidden="true"
                >
                  {p.effect}
                </span>
                {note !== null && (
                  // Still equips (the player's call); it just has nothing to do here (D143 R9).
                  <span
                    class="sd-lo-protocol-inert"
                    aria-hidden="true"
                    data-testid="protocol-inert"
                  >
                    {note}
                  </span>
                )}
              </button>
              {on && p.takesTower && (
                <label class="sd-lo-protocol-tower">
                  <span class="sd-lo-dim">Tower </span>
                  <select
                    value={tower}
                    aria-label={`${p.name}: tower`}
                    onChange={(e) =>
                      props.onPick(setProtocolTower(pick, p.id, e.currentTarget.value))
                    }
                  >
                    {view.towers.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </label>
              )}
            </li>
          );
        })}
      </ul>
      {/* The hovered or focused protocol's effect, one line under the list (the screen reader has
          it in the button's name already). */}
      <p class="sd-lo-peek" aria-hidden="true" data-testid="protocol-peek">
        {peeked === undefined ? '' : `${peeked.name}: ${peeked.effect}`}
      </p>
    </>
  );
}

/** How many of the pool's links `pick` forms (the Links heading's count). */
function linkedCount(view: LoadoutView, pick: LoadoutPickView): number {
  const formed = formedLinks(pick);
  return view.links.filter((l) => formed.includes(l.id)).length;
}

function Links({ view, pick }: { view: LoadoutView; pick: LoadoutPickView }) {
  const formed = formedLinks(pick);
  if (view.links.length === 0) {
    return <p class="sd-lo-dim">No links among your towers yet.</p>;
  }
  // Formed links first, so what the pick does shows before what it could (the list scrolls). A
  // formed link shows its bonus; one still missing a partner is a single line (its bonus is the
  // tooltip and the screen reader's), so five or six links fit the column (T431).
  const shown = view.links.toSorted(
    (a, b) => Number(formed.includes(b.id)) - Number(formed.includes(a.id)),
  );
  return (
    <ul class="sd-lo-links" aria-label="Links" data-testid="loadout-links">
      {shown.map((l) => {
        const on = formed.includes(l.id);
        const missing = l.partners.filter((p) => !pick.towers.includes(p));
        const names = missing.map((p) => view.towers.find((t) => t.id === p)?.name ?? p);
        return (
          <li
            key={l.id}
            class={on ? 'sd-lo-link sd-lo-link-on' : 'sd-lo-link'}
            title={on ? undefined : l.bonus}
          >
            <span class="sd-lo-link-head">
              <span class="sd-lo-link-name">{l.name}</span>
              <span class="sd-lo-link-state">{on ? 'Linked' : `Needs ${names.join(' + ')}`}</span>
            </span>
            <span class={on ? 'sd-lo-link-bonus' : 'sd-visually-hidden'}>{l.bonus}</span>
          </li>
        );
      })}
    </ul>
  );
}

/**
 * The Links section (T803d): its heading with the formed count, the formed links' names in view
 * (what the pick does), and the whole list, bonuses and what each still needs, one press away in a
 * floating Disclosure that opens upward over the column, so it never pushes the heads-up or the
 * footer.
 */
function LinksSection({ view, pick }: { view: LoadoutView; pick: LoadoutPickView }) {
  const formed = formedLinks(pick);
  const names = view.links.filter((l) => formed.includes(l.id)).map((l) => l.name);
  return (
    <section class="sd-lo-links-section" aria-labelledby="sd-lo-links-label">
      <h2 id="sd-lo-links-label" class="sd-panel-heading sd-lo-heading">
        Links{' '}
        {view.links.length > 0 && (
          // How many of the pool's links the pick forms (T431).
          <span class="sd-lo-count" data-testid="loadout-links-count">
            {linkedCount(view, pick)} / {view.links.length}
          </span>
        )}
      </h2>
      {view.links.length === 0 ? (
        <Links view={view} pick={pick} />
      ) : (
        <div class="sd-lo-links-row">
          <p class={names.length === 0 ? 'sd-lo-linked sd-lo-dim' : 'sd-lo-linked'}>
            {names.length === 0 ? 'None formed' : names.join(' · ')}
          </p>
          <Disclosure
            float
            class="sd-lo-links-more"
            label="Every link"
            lessLabel="Hide links"
            about="every link your towers can form, and what each needs"
          >
            <Links view={view} pick={pick} />
          </Disclosure>
        </div>
      )}
    </section>
  );
}

/** Where the scrolling tower grid stands (D150, D151). */
interface GridScroll {
  /** It holds more cards than show (A3M5's 16 at 1280×720). */
  readonly scrolls: boolean;
  /** Cards wait below what shows. */
  readonly more: boolean;
  /** The rail's thumb: its top and height as fractions of the grid's. */
  readonly thumb: { readonly top: number; readonly size: number };
}

const NO_SCROLL: GridScroll = { scrolls: false, more: false, thumb: { top: 0, size: 1 } };

/** The tower grid's scroll (`GridScroll`), kept up to date as it scrolls or resizes. */
function useGridScroll(ref: RefObject<HTMLElement | null>): GridScroll {
  const [at, setAt] = useState<GridScroll>(NO_SCROLL);
  useEffect(() => {
    const el = ref.current;
    if (el === null) return undefined;
    const check = (): void => {
      const { scrollTop: top, clientHeight: shown, scrollHeight: all } = el;
      const scrolls = all > shown + 1;
      const next: GridScroll = scrolls
        ? {
            scrolls,
            more: top + shown < all - 1,
            thumb: { top: top / all, size: shown / all },
          }
        : NO_SCROLL;
      setAt((was) =>
        was.scrolls === next.scrolls &&
        was.more === next.more &&
        was.thumb.top === next.thumb.top &&
        was.thumb.size === next.thumb.size
          ? was
          : next,
      );
    };
    check();
    el.addEventListener('scroll', check, { passive: true });
    const resize = new ResizeObserver(check);
    resize.observe(el);
    return () => {
      el.removeEventListener('scroll', check);
      resize.disconnect();
    };
  }, []);
  return at;
}

/**
 * "▾ More" (D151): a button in the gutter under the grid, so it covers no card. It scrolls the
 * grid down most of a view; at the bottom it reads "▴ Top" and scrolls back up.
 */
function scrollGrid(el: HTMLElement | null, down: boolean): void {
  if (el === null) return;
  const behavior = prefersReducedMotion() ? 'instant' : 'smooth';
  if (down) el.scrollBy({ top: Math.max(16, el.clientHeight - 24), behavior });
  else el.scrollTo({ top: 0, behavior });
}

/** The loadout screen for the open map. */
export function Loadout() {
  const view = loadout.value;
  const [pick, setPick] = useState<LoadoutPickView>(
    () => view?.initial ?? { towers: [], ability: null, protocols: [], protocolPicks: {} },
  );
  const [notice, setNotice] = useState<string | null>(null);
  const grid = useRef<HTMLUListElement>(null);
  const scroll = useGridScroll(grid);
  // Esc (T212) goes back to the Shift board, as its button does.
  useEscape(() => {
    toCampaign();
    return true;
  });
  if (view === null) return null;
  const full = pick.towers.length >= view.max;
  const warnings = pickWarnings(pick);
  const canLock = pick.towers.length > 0 && (pick.ability !== null || view.abilities.length === 0);
  const greyed = (id: string): boolean => abilityGreyed(pick, id);
  const toggle = (id: string): void => {
    const next = togglePickTower(pick, id);
    if (next === pick) {
      const t = view.towers.find((x) => x.id === id);
      const cap = view.rules?.cap ?? null;
      setNotice(
        t?.stays !== undefined
          ? `${t.name}: ${t.stays}.`
          : `${view.max} towers is the limit${cap === null ? '' : ` (${cap})`}. Drop one to swap this one in.`,
      );
      return;
    }
    setNotice(null);
    setPick(next);
  };
  return (
    <main class="sd-screen sd-menu" aria-labelledby="sd-loadout-heading">
      <section class="sd-panel sd-menu-panel sd-lo-panel">
        {/* The kicker has its own line; the threats sit beside the heading, never under it. */}
        <header class="sd-menu-header sd-lo-header">
          <div class="sd-lo-title">
            <p class="sd-kicker" data-voice="kicker">
              {view.shift === null ? view.mapName : `Shift ${view.shift} · ${view.mapName}`}
            </p>
            <h1 id="sd-loadout-heading" class="sd-menu-heading">
              Loadout
            </h1>
          </div>
          <dl class="sd-lo-intel" data-critical="threats">
            <div>
              <dt>Threats</dt>
              <dd>
                {view.threats.length === 0
                  ? 'None reported'
                  : view.threats.map((t, i) => (
                      <Fragment key={t.label}>
                        {i > 0 && ' · '}
                        <span title={t.tip ?? undefined}>{t.label}</span>
                        {t.tip !== null && <span class="sd-visually-hidden"> ({t.tip})</span>}
                      </Fragment>
                    ))}
              </dd>
            </div>
            {view.counters.some((c) => c.required) && (
              <div>
                <dt>Needs an answer to</dt>
                <dd class="sd-lo-need" data-critical="counters">
                  {view.counters
                    .filter((c) => c.required)
                    .map((c) => c.label)
                    .join(' · ')}
                </dd>
              </div>
            )}
          </dl>
        </header>
        <MenuNotice />
        <div class="sd-lo-body">
          <section class="sd-lo-main" aria-labelledby="sd-lo-towers-label">
            {/* The pick-order hint is the heading's tooltip and the grid's description (T803d). */}
            <h2
              id="sd-lo-towers-label"
              class="sd-panel-heading sd-lo-heading"
              title={PICK_ORDER_HINT}
            >
              Towers{' '}
              <span class="sd-lo-count-group">
                {view.rules?.cap !== null && view.rules?.cap !== undefined && (
                  // A run rule lowers the limit (Short-Handed; T860): said where the count is.
                  <span class="sd-lo-rule" data-testid="loadout-cap">
                    {view.rules.cap}
                  </span>
                )}
                <span class="sd-lo-count">
                  {pick.towers.length} / {view.max}
                </span>
              </span>
            </h2>
            <p id="sd-lo-order-hint" class="sd-visually-hidden">
              {PICK_ORDER_HINT}
            </p>
            <div class="sd-lo-towers-wrap">
              <div class="sd-lo-grid-row">
                <ul
                  ref={grid}
                  id="sd-lo-towers"
                  class="sd-lo-towers"
                  aria-label={`Towers, pick up to ${view.max}`}
                  aria-describedby="sd-lo-order-hint"
                >
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
                  {view.revoked.map((r) => (
                    <li key={r.id}>
                      <RevokedCard r={r} stamp={LICENSE_STAMP} what="License revoked" />
                    </li>
                  ))}
                </ul>
                {/* The grid scrolls past what fits (D150): its own thin rail beside the cards
                    (on every platform, never an overlay scrollbar that hides), and More in the
                    gutter under them, where it covers no card (D151). */}
                {scroll.scrolls && (
                  <span class="sd-lo-rail" aria-hidden="true" data-testid="loadout-rail">
                    <span
                      class="sd-lo-thumb"
                      style={{
                        top: `${(scroll.thumb.top * 100).toFixed(2)}%`,
                        height: `${(scroll.thumb.size * 100).toFixed(2)}%`,
                      }}
                    />
                  </span>
                )}
              </div>
              {scroll.scrolls && (
                <button
                  type="button"
                  class="sd-lo-more"
                  data-testid="loadout-more"
                  aria-controls="sd-lo-towers"
                  onClick={() => scrollGrid(grid.current, scroll.more)}
                >
                  <span aria-hidden="true">{scroll.more ? '▾ ' : '▴ '}</span>
                  {scroll.more ? 'More' : 'Top'}
                </button>
              )}
            </div>
            {view.protocolSlots > 0 && (
              <>
                <h2 class="sd-panel-heading sd-lo-heading">
                  Field Protocols{' '}
                  <span class="sd-lo-count">
                    {pick.protocols.length} / {view.protocolSlots}
                  </span>
                </h2>
                {view.rules?.noProtocols !== null && view.rules?.noProtocols !== undefined && (
                  <p class="sd-lo-rule-note">{view.rules.noProtocols}</p>
                )}
                <Protocols
                  view={view}
                  pick={pick}
                  onPick={(next) => {
                    setNotice(null);
                    setPick(next);
                  }}
                  onFull={() =>
                    setNotice(
                      `${view.protocolSlots} protocols is the limit. Drop one to swap this one in.`,
                    )
                  }
                />
              </>
            )}
          </section>
          <aside class="sd-lo-side">
            <h2 id="sd-lo-ability-label" class="sd-panel-heading sd-lo-heading">
              Technician
            </h2>
            {view.abilities.length === 0 &&
              view.revokedAbilities.length === 0 &&
              (view.lockedAbilities ?? []).length === 0 && (
                <p class="sd-lo-dim">No abilities issued yet.</p>
              )}
            {view.rules?.noAbilities !== null && view.rules?.noAbilities !== undefined && (
              <p class="sd-lo-rule-note">{view.rules.noAbilities}</p>
            )}
            {view.abilities.length > 0 && (view.rules?.noAbilities ?? null) === null && (
              <AbilityPicker
                abilities={view.abilities}
                picked={pick.ability}
                greyed={greyed}
                onPick={(id) => setPick(pickAbility(pick, id))}
              />
            )}
            {view.revokedAbilities.map((r) => (
              <RevokedCard key={r.id} r={r} stamp={UPLINK_STAMP} what="Uplink revoked" />
            ))}
            {(view.lockedAbilities ?? []).map((l) => (
              <LockedAbilityCard key={l.id} l={l} />
            ))}
            {view.companions !== undefined && view.companions.length > 0 ? (
              <>
                <h2 id="sd-lo-companion-label" class="sd-panel-heading sd-lo-heading">
                  Walking with you
                </h2>
                <CompanionPicker
                  companions={view.companions}
                  picked={pick.companion ?? null}
                  onPick={(id) => setPick(pickCompanion(pick, id))}
                />
              </>
            ) : (
              // Slot 2's line, unless a Technician card already says who brings it (T803d).
              view.companion !== null &&
              !view.abilities.some((a) => a.brings !== undefined) && (
                <p class="sd-lo-companion">
                  <span class="sd-lo-dim">Slot 2 </span>
                  {view.companion}
                </p>
              )
            )}
            {/* The heads-up before the links, so it always has room (T871). */}
            <div class="sd-lo-warnings" aria-live="polite">
              {warnings.map((w) => (
                <p key={w} class="sd-lo-warning">
                  {w}
                </p>
              ))}
            </div>
            <LinksSection view={view} pick={pick} />
          </aside>
        </div>
        <footer class="sd-row sd-menu-footer">
          {/* A notice (the limit, a stay-home tower), left of the buttons (D144). */}
          <p class="sd-lo-hint" role="status">
            {notice ?? ''}
          </p>
          <button type="button" class="sd-button" onClick={toCampaign}>
            {campaignScreenName()}
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
