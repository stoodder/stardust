// The base (T209, D031, T303): the Everglow Inbox, the codex, Research, Zibzab's shop,
// Engineering, and Ves'thara's Xenotech (T509) as tabs. The Inbox and the codex are open whenever
// the base is, and carry a NEW badge while something in them is unread; a shelf tab whose system
// the campaign hasn't opened yet shows a locked pane with what opens it ("Opens after The Audit";
// meta/progress.ts SYSTEM_UNLOCKS), except Xenotech's, which is hidden until it opens after A2M5,
// so the base never names Ves'thara's shelf before she joins; it then carries a NEW tag until its
// first visit (the `xenotech` hint, meta/hints.ts; T566). An open tab shows its pane
// (BasePanes.tsx); from A3M1 the Codex tab reads "Journal", as its pane is the *Field Journal*
// (app/inbox.ts `codexTabLabel`). Entering the base delivers any memo or codex unlock a save missed
// (app/inbox.ts). The first visit with Zibzab's shop open lands on the Shop tab and plays his
// arrival (app/baseScenes.ts, T308; with any other visit scene due, such as Pebble's handover after
// A2M4); otherwise an unread memo opens the Inbox (T320), and nothing new opens Research. Before
// any of them, a won A2M4 whose card was never answered offers C2 as a panel over the base (D138;
// app/baseChoice.ts, BaseChoice.tsx), the base behind it inert. While a scene plays over the base,
// the base dims behind it and the Inbox opens no memo (InboxPane; D143 R8): a visit scene plays
// over a neutral backdrop, and the memo opens once it ends.
import { useEffect, useRef, useState } from 'preact/hooks';
import { dropBaseChoice, offerChoiceAtBase } from '../../app/baseChoice.ts';
import { arrivalDue, playBaseScenesIfDue } from '../../app/baseScenes.ts';
import { BaseChoice } from './BaseChoice.tsx';
import { HeldRewards } from './HeldRewards.tsx';
import { catchUpStory, codexTabLabel, storyBadges } from '../../app/inbox.ts';
import { hintShown, markHintsShown } from '../../app/save.ts';
import { XENOTECH_HINT } from '../../meta/index.ts';
import { openSettings, toCampaign } from '../../app/navigation.ts';
import { campaignScreenName } from '../../app/starMap.ts';
import { BASE_PANES, isStoryTab, type BaseTab } from './BasePanes.tsx';
import { NewTag } from './Inbox.tsx';
import { Banks } from './Campaign.tsx';
import { useEscape } from './escape.ts';
import { focusOnce } from './focus.ts';
import { baseChoice, campaign, type CampaignView, type SystemView } from './state.ts';
import { dialogue } from '../dialogue/state.ts';
import './screens.css';
import './base.css';
import './inbox.css';

/** In tab order. The base opens on `openingTab`'s pick; the badges point at the story tabs. */
const TABS: readonly { readonly id: BaseTab; readonly label: string }[] = [
  { id: 'inbox', label: 'Inbox' },
  { id: 'codex', label: 'Codex' },
  { id: 'rnd', label: 'Research' },
  { id: 'shop', label: 'Shop' },
  { id: 'engineering', label: 'Engineering' },
  // Ves'thara's shelf (T509): shown once it opens, after A2M5 (CampaignView.systems.xenotech).
  { id: 'xenotech', label: 'Xenotech' },
  // The Pest Bounty Board (T301b): Acts I–II only, from A1M2 won (CampaignView.bountyBoard).
  { id: 'bounty', label: 'Bounty' },
];

const OPEN: SystemView = { unlocked: true, hint: '' };

function systemOf(view: CampaignView, tab: BaseTab): SystemView {
  return isStoryTab(tab) ? OPEN : view.systems[tab];
}

/**
 * The tab the base opens on (T320): Zibzab's shop when his arrival plays; the Inbox while a memo is
 * unread (the run end just delivered one, so after A1M5's stinger the player lands on Sterling's
 * Record Quarter memo, not a shelf); otherwise Research.
 */
export function openingTab(arrival: boolean, unreadMemos: number): BaseTab {
  if (arrival) return 'shop';
  return unreadMemos > 0 ? 'inbox' : 'rnd';
}

/** The base for the save in play. Arrow keys move between tabs (the WAI-ARIA tabs pattern). */
export function Base() {
  const [tab, setTab] = useState<BaseTab>(() => openingTab(arrivalDue(), storyBadges().inbox));
  // Whether the player has picked a tab yet: the catch-up below never takes the pick back (T461:
  // on a loaded machine an arrow key could land before this effect and be undone by it).
  const picked = useRef(false);
  // Esc (T212) goes back to the campaign screen, as its button does.
  useEscape(() => {
    toCampaign();
    return true;
  });
  // Entering the base: memos due and codex unlocks a save missed arrive now (a no-op after a run).
  useEffect(() => {
    // A memo the catch-up delivers (an older save's) opens the Inbox as one from a run end would.
    const delivered = catchUpStory() !== null;
    // An unanswered C2 first (D138), then the visit scenes once it closes.
    const arrival = arrivalDue();
    if (!offerChoiceAtBase(playBaseScenesIfDue)) playBaseScenesIfDue();
    if (arrival) setTab('shop');
    else if (delivered && storyBadges().inbox > 0 && !picked.current) setTab('inbox');
    return dropBaseChoice;
  }, []);
  // The Xenotech tab's NEW tag (T566) holds until its first visit.
  useEffect(() => {
    if (tab === 'xenotech') markHintsShown([XENOTECH_HINT]);
  }, [tab]);
  const view = campaign.value;
  if (view === null) return null;
  const system = systemOf(view, tab);
  const Pane = BASE_PANES[tab];
  const badges = storyBadges();
  const xenotechNew =
    view.systems.xenotech.unlocked && tab !== 'xenotech' && !hintShown(XENOTECH_HINT);
  const badgeOf = (id: BaseTab): number =>
    id === 'inbox'
      ? badges.inbox
      : id === 'codex'
        ? badges.codex
        : id === 'xenotech' && xenotechNew
          ? 1
          : 0;
  // From A3M1 the codex is the *Field Journal*, and its tab says so (T611).
  const codexLabel = codexTabLabel();
  const tabs = TABS.filter(
    (t) =>
      (t.id !== 'bounty' || view.bountyBoard.shown) &&
      (t.id !== 'xenotech' || view.systems.xenotech.unlocked),
  );
  const labelOf = (t: (typeof TABS)[number]): string => (t.id === 'codex' ? codexLabel : t.label);
  const move = (by: number): void => {
    picked.current = true;
    const i = tabs.findIndex((t) => t.id === tab);
    const next = tabs[(i + by + tabs.length) % tabs.length]!;
    setTab(next.id);
    document.getElementById(`sd-tab-${next.id}`)?.focus();
  };
  return (
    <main class="sd-screen sd-menu" aria-labelledby="sd-base-heading">
      <section
        class={`sd-panel sd-menu-panel sd-base-panel${dialogue.scene.value === null ? '' : ' sd-base-dim'}`}
        inert={baseChoice.value !== null}
      >
        <header class="sd-menu-header">
          <div>
            <p class="sd-kicker">Everglow · Dome Row Perimeter · Base</p>
            <h1 id="sd-base-heading" class="sd-menu-heading">
              Base
            </h1>
          </div>
          <Banks view={view} />
        </header>
        {/* A3M3's held-back rewards, once (T610; core-loop.md § 6.2). */}
        <HeldRewards />
        <div class="sd-tabs" role="tablist" aria-label="Base">
          {tabs.map((t) => {
            const open = systemOf(view, t.id).unlocked;
            const badge = badgeOf(t.id);
            return (
              <button
                key={t.id}
                id={`sd-tab-${t.id}`}
                type="button"
                role="tab"
                class={`sd-tab${t.id === tab ? ' sd-tab-on' : ''}${open ? '' : ' sd-tab-locked'}`}
                // One name, said once (D138, U3): "Xenotech (new)", "Inbox (2 new)", "Shop (locked)";
                // the lock and the NEW tag are only for the eyes.
                aria-label={tabName(
                  labelOf(t),
                  open,
                  t.id === 'xenotech' && badge > 0 ? 'new' : badge,
                )}
                aria-selected={t.id === tab}
                aria-controls="sd-tab-pane"
                tabIndex={t.id === tab ? 0 : -1}
                ref={t.id === tab ? focusOnce : null}
                onClick={() => {
                  picked.current = true;
                  setTab(t.id);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'ArrowRight') move(1);
                  else if (e.key === 'ArrowLeft') move(-1);
                  else return;
                  e.preventDefault();
                }}
              >
                {!open && <span class="sd-lock" aria-hidden="true" />}
                {labelOf(t)}
                {badge > 0 && <NewTag />}
              </button>
            );
          })}
        </div>
        <div
          id="sd-tab-pane"
          class={`sd-tab-pane${paneClass(tab, system.unlocked)}`}
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
            {campaignScreenName()}
          </button>
          <button type="button" class="sd-button" onClick={openSettings}>
            Settings
          </button>
        </footer>
      </section>
      <BaseChoice />
    </main>
  );
}

/** A tab's accessible name: its label, locked, and what's new in it (a count, or just "new"). */
export function tabName(label: string, open: boolean, badge: number | 'new'): string {
  const locked = open ? '' : ' (locked)';
  const fresh = badge === 0 ? '' : badge === 'new' ? ' (new)' : ` (${badge} new)`;
  return `${label}${locked}${fresh}`;
}

function paneClass(tab: BaseTab, unlocked: boolean): string {
  if (!unlocked) return ' sd-tab-pane-locked';
  return isStoryTab(tab) ? ' sd-tab-pane-story' : ' sd-tab-pane-store';
}
