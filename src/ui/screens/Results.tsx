// The results screen (T115, T204c): shown over the frozen battle when a run ends. One headline and
// the counter sub-line (story/style-guide.md §4, "Results screen"), plus the run's waves and
// integrity, the lifetime count, the payroll (the Stardust paid and why; on a win the map's medals,
// this run's lit and first-time ones tagged NEW with their Intel), and the debrief with its
// speakers' name plates (D028). The counter is the Act I line (design/core-loop.md §6.2) and ticks up
// (art-direction §9). The way on is Continue (base or Shift board) or Retry, with Change loadout
// beside Retry where the map offers the loadout screen (T220).
import { silkText } from '../silk.ts';
import { useEffect, useState } from 'preact/hooks';
import {
  afterWin,
  changeLoadoutAfterRun,
  loadoutOfferedAfterRun,
  retryRun,
  toCampaign,
  toTitle,
} from '../../app/navigation.ts';
import { countUpDuration, countUpValue } from './countUp.ts';
import { formatCount } from './format.ts';
import { focusOnce } from './focus.ts';
import { campaign, runResult, type MedalResult, type RunResult, type RunRewards } from './state.ts';
import { colorVar } from '../color.ts';
import { assertNever } from '../../shared/types.ts';
import { prefersReducedMotion } from '../motion.ts';
import type { SpokenLine } from '../state.ts';
import './screens.css';

/**
 * Headlines in Everglow's voice. A loss is never scolded: it is a "minor operational hiccup", the
 * euphemism dictionary's word for a catastrophe (story/races.md § Everglow Dynamics).
 */
const HEADLINE = {
  won: 'PERIMETER SECURED!',
  lost: 'MINOR OPERATIONAL HICCUP',
} as const;

/** The kicker above the headline, in the same corporate voice (D026). */
const KICKER = {
  won: 'Shift report · Exemplary!',
  lost: 'Shift report · Incident logged',
} as const;

/** Counts up from 0 to `target` once, on mount (instantly under reduced motion). */
function useCountUp(target: number): number {
  const [shown, setShown] = useState(() => (prefersReducedMotion() ? target : 0));
  useEffect(() => {
    if (prefersReducedMotion()) {
      setShown(target);
      return undefined;
    }
    const duration = countUpDuration(target);
    let start: number | null = null;
    let raf = 0;
    const tick = (now: number): void => {
      start ??= now;
      const v = countUpValue(target, now - start, duration);
      setShown(v);
      if (v < target) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target]);
  return shown;
}

function Counter({ n }: { n: number }) {
  const shown = useCountUp(n);
  const done = shown === n;
  return (
    // The live text updates every frame while counting; screen readers get the final line only.
    <p
      class="sd-results-counter"
      aria-label={`PESTS PROCESSED: ${formatCount(n)}, Top 5% of Technicians!`}
    >
      <span class="sd-results-counter-label">PESTS PROCESSED:</span>{' '}
      <span
        class={done ? 'sd-results-count sd-results-count-done' : 'sd-results-count'}
        // Reserve the final width, so the line doesn't shift while it counts.
        style={{ minWidth: `${formatCount(n).length}ch` }}
      >
        {formatCount(shown)}
      </span>{' '}
      <span class="sd-results-star" aria-hidden="true">
        ★
      </span>{' '}
      <span class="sd-results-brag">Top 5% of Technicians!</span>
    </p>
  );
}

/** The debrief (D028): each line under its speaker's name plate. */
function Debrief({ lines }: { lines: readonly SpokenLine[] }) {
  return (
    <ul class="sd-results-debrief" aria-label="Debrief">
      {lines.map((l, i) => (
        <li key={i}>
          <span class="sd-results-speaker" style={{ color: colorVar(l.color) }}>
            {l.name}
          </span>
          <span class="sd-results-line">{silkText(l.text)}</span>
        </li>
      ))}
    </ul>
  );
}

const CURRENCY = { stardust: 'Stardust', intel: 'Intel' } as const;

/** An amount in its currency's color: "+48 Stardust". */
function Amount({ n, currency }: { n: number; currency: keyof typeof CURRENCY }) {
  return (
    <span class={`sd-results-pay-amount sd-${currency}`}>
      +{formatCount(n)} {CURRENCY[currency]}
    </span>
  );
}

/** The Stardust line's label and note, in Everglow's voice (style-guide § 2, Act I system copy). */
function stardustLine(s: RunRewards['stardust']): { label: string; note?: string } {
  switch (s.source) {
    case 'first_clear':
      return s.base === 0
        ? { label: 'Shift bonus', note: 'Training shifts are unpaid!' }
        : { label: 'Shift bonus' };
    case 'replay':
      return s.base === 0
        ? { label: 'Overtime bonus', note: 'Training shifts are unpaid!' }
        : { label: 'Overtime bonus' };
    case 'defeat':
      return { label: 'Effort stipend', note: `${s.wavesResolved}/${s.waveCount} waves` };
    case 'defeat_replay':
      return { label: 'Effort stipend', note: 'Shift already cleared!' };
    default:
      return assertNever(s.source);
  }
}

/** One of the map's medals: lit when earned this run, NEW! and its Intel the first time. */
function MedalRow({ medal }: { medal: MedalResult }) {
  const status = medal.isNew ? 'new!' : medal.earned ? 'on file' : 'next time';
  return (
    <li
      class={medal.earned ? 'sd-results-medal sd-results-medal-earned' : 'sd-results-medal'}
      aria-label={`${medal.name}: ${status}`}
    >
      <span class="sd-results-pay-label">
        <span class={medal.earned ? 'sd-medal sd-medal-on' : 'sd-medal'} aria-hidden="true" />
        {medal.name}
        {medal.isNew && (
          <span class="sd-results-new" aria-hidden="true">
            NEW!
          </span>
        )}
      </span>
      {medal.isNew ? (
        <Amount n={medal.intel} currency="intel" />
      ) : (
        <span class="sd-results-pay-note" aria-hidden="true">
          {medal.earned ? 'On file' : 'Next time!'}
        </span>
      )}
    </li>
  );
}

/**
 * The payroll: the run's Stardust with where it came from, then (on a win) the map's medals, each
 * paying its Intel the first time it is earned.
 */
function Payroll({ rewards, won }: { rewards: RunRewards; won: boolean }) {
  const { label, note } = stardustLine(rewards.stardust);
  return (
    <section class="sd-results-payroll" aria-labelledby="sd-results-payroll-heading">
      <h2 id="sd-results-payroll-heading" class="sd-results-payroll-heading">
        Payroll
      </h2>
      <ul>
        <li>
          <span class="sd-results-pay-label">
            {label}
            {note !== undefined && <span class="sd-results-pay-note"> · {note}</span>}
          </span>
          <Amount n={rewards.stardust.amount} currency="stardust" />
        </li>
      </ul>
      {rewards.stardustNote !== null && (
        <p class="sd-results-pay-aside">{silkText(rewards.stardustNote)}</p>
      )}
      {rewards.issued.length > 0 && (
        <p class="sd-results-pay-aside sd-results-issued">
          Issued for next shift: {silkText(rewards.issued.join(', '))}
        </p>
      )}
      {rewards.saveNotice !== null && (
        <p class="sd-results-save-notice" role="alert">
          {silkText(rewards.saveNotice)}
        </p>
      )}
      {won && (
        <ul aria-label="Medals">
          {rewards.medals.map((m) => (
            <MedalRow key={m.id} medal={m} />
          ))}
        </ul>
      )}
    </section>
  );
}

/** The lifetime count under this run's (design/core-loop.md § 6.2). */
function Career({ n }: { n: number }) {
  return (
    <p class="sd-results-career">
      Career total: <span class="sd-results-career-count">{formatCount(n)}</span>
    </p>
  );
}

/**
 * The way on from Results. In a campaign: after a win, Continue (to the base once it's open, else
 * the Shift board); after a loss, the Shift board. Without one (a `?map=` dev battle): Title.
 */
function OnwardButton({ won }: { won: boolean }) {
  const inCampaign = campaign.value !== null;
  const label = !inCampaign ? 'Title' : won ? 'Continue' : 'Shift board';
  const go = !inCampaign ? toTitle : won ? afterWin : toCampaign;
  return (
    <button
      type="button"
      class={won ? 'sd-button sd-button-primary' : 'sd-button'}
      ref={won ? focusOnce : null}
      onClick={go}
    >
      {label}
    </button>
  );
}

function Body({ result }: { result: RunResult }) {
  const won = result.outcome === 'won';
  const { rewards } = result;
  return (
    <section
      class={`sd-panel sd-results-panel ${won ? 'sd-results-won' : 'sd-results-lost'}`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="sd-results-heading"
    >
      <p class="sd-results-kicker">{KICKER[result.outcome]}</p>
      <h1 id="sd-results-heading" class="sd-results-heading">
        {HEADLINE[result.outcome]}
      </h1>
      <dl class="sd-results-stats">
        <div>
          <dt>Waves survived</dt>
          <dd>
            {result.wavesSurvived} / {result.waveCount}
          </dd>
        </div>
        <div>
          <dt>Core integrity</dt>
          <dd>
            {result.integrity} / {result.maxIntegrity}
          </dd>
        </div>
      </dl>
      <Counter n={result.pestsProcessed} />
      {rewards !== null && <Career n={rewards.lifetimePests} />}
      {rewards !== null && <Payroll rewards={rewards} won={won} />}
      {result.debrief.length > 0 && <Debrief lines={result.debrief} />}
      <div class="sd-results-buttons">
        <button
          type="button"
          class={won ? 'sd-button' : 'sd-button sd-button-primary'}
          ref={won ? null : focusOnce}
          onClick={retryRun}
        >
          Retry
        </button>
        {/* Before a retry, a different four (T220): only where the loadout screen is offered. */}
        {campaign.value !== null && loadoutOfferedAfterRun(result.mapId) && (
          <button
            type="button"
            class="sd-button"
            onClick={() => changeLoadoutAfterRun(result.mapId)}
          >
            Change loadout
          </button>
        )}
        <OnwardButton won={won} />
      </div>
    </section>
  );
}

/** The results screen: a scrim over the frozen battle and the results panel. */
export function Results() {
  const result = runResult.value;
  if (result === null) return null;
  return (
    <main class="sd-screen sd-results">
      <Body result={result} />
    </main>
  );
}
