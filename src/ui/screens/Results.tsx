// The results screen (T115, T204c, T316, T410b): shown over the frozen battle when a run ends, in
// the map's presentation dials (its counter style and UI act theme; core-loop.md § 6.7). One headline
// (with any story stamp beside it: A1M5's CONTAINMENT LAPSE, core-loop.md § 6.2), the run's waves
// and integrity on one line, the counter and the lifetime count, which tick up together
// (art-direction §9; T235), the payroll (the Stardust paid and why, the first payday marked; on a
// win the map's medals and optional objectives, this run's lit and first-time ones tagged NEW with
// their Intel), and the debrief with its speakers' name plates (D028). The way on is Continue (base
// or Shift board) or Retry, with Change loadout beside Retry where the map offers the loadout
// screen (T220), and after a loss with a checkpoint (Act II on) "Retry from wave N" first
// (core-loop.md § 2.12); after a win, leaving plays the map's after-Results scenes first
// (app/runFlow.ts). The story's transactions join the payroll (T510: A2M4's Q3 Bonus with its memo,
// A2M5's gift, C2's trade), an Escort's meter takes Core integrity's place in the stats (Evacuated, with its lost count), and a debrief's story
// choice (C2) takes the way on's place until it is answered (app/resultsFlow.ts; StoryChoice.tsx:
// price first, its heading focused, its options locked for a beat). The card is a real modal: Tab
// stays on it.
// Compact by design: everything fits 360 game px of height.
import { campaignScreenName } from '../../app/starMap.ts';
import { silkText } from '../silk.ts';
import { useEffect, useState } from 'preact/hooks';
import {
  afterWin,
  changeLoadoutAfterRun,
  leaveResultsTo,
  loadoutOfferedAfterRun,
  retryFromCheckpoint,
  retryRun,
} from '../../app/navigation.ts';
import { pickResultsChoice } from '../../app/resultsFlow.ts';
import { resultsStats } from '../../app/runResult.ts';
import { countUpDuration, countUpValue } from './countUp.ts';
import { formatCount } from './format.ts';
import { focusOnce } from './focus.ts';
import { StoryChoice } from './StoryChoice.tsx';
import {
  campaign,
  runResult,
  type MedalResult,
  type ObjectiveResult,
  type ResultsTransaction,
  type RunResult,
  type RunRewards,
} from './state.ts';
import { sceneBlocks } from '../dialogue/state.ts';
import { trapTab } from '../dialogue/SceneParts.tsx';
import { colorVar } from '../color.ts';
import { assertNever } from '../../shared/types.ts';
import { prefersReducedMotion } from '../motion.ts';
import type { SpokenLine } from '../state.ts';
import { resultsCounter, type ResultsCounter } from '../../story/counter.ts';
import { resultsHeader, spokenCounter } from './presentationText.ts';
import './screens.css';
import './results.css';
import './resultsCounter.css';

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

/**
 * This run's counter line in the map's style (story/counter.ts): Act I's starred badge, Act II's
 * plain line. Its number ticks up (`shown`) to its own.
 */
function Counter({ counter, shown }: { counter: ResultsCounter; shown: number }) {
  const { n } = counter;
  const done = n === null || shown >= n;
  return (
    // The live text updates every frame while counting, so screen readers get the final line
    // only, as hidden text (an `aria-label` on a <p> isn't announced; T329).
    <p class={`sd-results-counter sd-results-counter-${counter.stars ? 'starred' : 'plain'}`}>
      <span class="sd-visually-hidden">{spokenCounter(counter)}</span>
      <span class="sd-results-counter-shown" aria-hidden="true" data-testid="results-counter">
        <span class="sd-results-counter-label">{counter.label}</span>
        {n !== null && (
          <>
            {' '}
            <span
              class={done ? 'sd-results-count sd-results-count-done' : 'sd-results-count'}
              // Reserve the final width, so the line doesn't shift while it counts.
              style={{ minWidth: `${formatCount(n).length}ch` }}
            >
              {formatCount(Math.min(shown, n))}
            </span>
          </>
        )}
        {counter.end}
        {counter.brag !== null && (
          <>
            {' '}
            <span class="sd-results-star">★</span>{' '}
            <span class="sd-results-brag">{counter.brag}</span>
          </>
        )}
      </span>
    </p>
  );
}

/**
 * The debrief (D028): each line under its speaker's name plate. A silence (a line with no text,
 * style-guide § 5.6: A2M5's unanswered "Then where?") has no name plate on the card: it holds as a
 * quiet "…" in its speaker's colour (T531).
 */
function Debrief({ lines }: { lines: readonly SpokenLine[] }) {
  return (
    <ul class="sd-results-debrief" aria-label="Debrief">
      {lines.map((l, i) =>
        l.text === '' ? (
          <li
            key={i}
            class="sd-results-silence"
            data-testid="debrief-silence"
            aria-label={`${l.name} says nothing`}
            style={{ color: colorVar(l.color) }}
          >
            <span aria-hidden="true">…</span>
          </li>
        ) : (
          <li key={i}>
            <span class="sd-results-speaker" style={{ color: colorVar(l.color) }}>
              {l.name}
            </span>
            <span class="sd-results-line">{silkText(l.text)}</span>
          </li>
        ),
      )}
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
    case 'defeat': {
      // After a checkpoint retry the stipend counts the waves from the checkpoint on (D006).
      const since = s.fromWave === null ? '' : ` since wave ${s.fromWave}`;
      return { label: 'Effort stipend', note: `${s.wavesResolved}/${s.waveCount} waves${since}` };
    }
    case 'defeat_replay':
      return { label: 'Effort stipend', note: 'Shift already cleared!' };
    default:
      return assertNever(s.source);
  }
}

/** Why a checkpoint run's card lights Victory only (core-loop.md § 2.12). */
export function resumedNote(wave: number): string {
  return `Resumed from wave ${wave}: Perfect Core and the Challenge need a shift from wave 1.`;
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

/** One of the map's optional objectives: done (NEW! and its Intel the first time) or Next time! */
function ObjectiveRow({ objective: o }: { objective: ObjectiveResult }) {
  const status = o.isNew ? 'new!' : o.done ? 'on file' : 'next time';
  return (
    <li
      class={o.done ? 'sd-results-objective sd-results-objective-done' : 'sd-results-objective'}
      aria-label={`${o.name}: ${status}`}
    >
      <span class="sd-results-pay-label">
        <span class="sd-results-objective-box" aria-hidden="true" />
        {silkText(o.name)}
        {o.isNew && (
          <span class="sd-results-new" aria-hidden="true">
            NEW!
          </span>
        )}
      </span>
      {o.isNew ? (
        <Amount n={o.intel} currency="intel" />
      ) : (
        <span class="sd-results-pay-note" aria-hidden="true">
          {o.done ? 'On file' : 'Next time!'}
        </span>
      )}
    </li>
  );
}

/**
 * A story transaction's payroll row (T510; progression.md § 2.1): the Q3 Bonus's Stardust, C2's
 * trade, price first and never a verdict (Sell's Intel, Return's IOU). A gift and C2's `none`
 * have no row: the gift is an aside, and with an empty bank there was nothing to trade.
 */
function TransactionRow({ t }: { t: ResultsTransaction }) {
  switch (t.kind) {
    case 'q3_bonus':
      return (
        <li data-testid="results-q3-bonus">
          <span class="sd-results-pay-label">Q3 Performance Bonus</span>
          <Amount n={t.stardust} currency="stardust" />
        </li>
      );
    case 'c2':
      if (t.choice === 'none') return null;
      return (
        <li data-testid="results-c2">
          <span class="sd-results-pay-label">
            {t.choice === 'sold' ? 'Sold at market' : 'Carried home'}
            <span class="sd-results-pay-note"> · {formatCount(t.bank)} Stardust</span>
          </span>
          {t.choice === 'sold' ? (
            <Amount n={t.intel} currency="intel" />
          ) : (
            <span class="sd-results-pay-note">Fee: an IOU</span>
          )}
        </li>
      );
    case 'gift':
      return null;
    default:
      return assertNever(t);
  }
}

/** The story's asides under the payroll: a gift, the Zibzab Tune-up, the memo on the card. */
function StoryAsides({ rewards }: { rewards: RunRewards }) {
  return (
    <>
      {rewards.transactions.map((t, i) =>
        t.kind === 'gift' ? (
          <p key={i} class="sd-results-pay-aside sd-results-issued" data-testid="results-gift">
            Given: {silkText(t.tower)}
          </p>
        ) : t.kind === 'c2' && t.tuneUp !== null ? (
          <p key={i} class="sd-results-pay-aside sd-results-issued" data-testid="results-tune-up">
            {silkText(`${t.tuneUp.name}: ${t.tuneUp.line}`)}
          </p>
        ) : null,
      )}
      {rewards.memos.map((m) => (
        <p key={m.id} class="sd-results-pay-aside sd-results-memo" data-testid="results-memo">
          New memo: {silkText(m.subject)}
        </p>
      ))}
    </>
  );
}

/**
 * The payroll: the run's Stardust with where it came from, then (on a win) the map's medals, each
 * paying its Intel the first time it is earned.
 */
function Payroll({
  rewards,
  won,
  resumedFromWave,
}: {
  rewards: RunRewards;
  won: boolean;
  resumedFromWave: number | null;
}) {
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
            {rewards.firstPayday && <span class="sd-results-payday">FIRST PAYDAY!</span>}
          </span>
          <Amount n={rewards.stardust.amount} currency="stardust" />
        </li>
        {rewards.transactions.map((t, i) => (
          <TransactionRow key={i} t={t} />
        ))}
      </ul>
      {rewards.stardustNote !== null && (
        <p class="sd-results-pay-aside">{silkText(rewards.stardustNote)}</p>
      )}
      {rewards.issued.length > 0 && (
        <p class="sd-results-pay-aside sd-results-issued">
          Issued for next shift: {silkText(rewards.issued.join(', '))}
        </p>
      )}
      <StoryAsides rewards={rewards} />
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
      {/* A checkpoint run keeps Victory only (core-loop.md § 2.12): say why, without a scolding. */}
      {won && resumedFromWave !== null && (
        <p class="sd-results-pay-aside" data-testid="results-resumed">
          {silkText(resumedNote(resumedFromWave))}
        </p>
      )}
      {/* Under the medals (core-loop.md § 2.13): a loss pays none, so like the medals, a win's only. */}
      {won && rewards.objectives.length > 0 && (
        <ul aria-label="Objectives">
          {rewards.objectives.map((o) => (
            <ObjectiveRow key={o.id} objective={o} />
          ))}
        </ul>
      )}
    </section>
  );
}

/**
 * The lifetime count beside this run's (design/core-loop.md § 6.2): it ticks up with the counter,
 * from the total before this run (`counted` is how far the counter has got, of `run`; T235).
 */
function Career({ n, run, counted }: { n: number; run: number; counted: number }) {
  const shown = n - run + counted;
  return (
    <p class="sd-results-career">
      {/* Screen readers get the final count only; the ticking one is for the eyes. */}
      <span class="sd-visually-hidden">Career total: {formatCount(n)}</span>
      <span aria-hidden="true">
        Career total:{' '}
        <span
          class={shown === n ? 'sd-results-career-count done' : 'sd-results-career-count'}
          style={{ minWidth: `${formatCount(n).length}ch` }}
        >
          {formatCount(shown)}
        </span>
      </span>
    </p>
  );
}

/**
 * The way on from Results. In a campaign: after a win, Continue (to the base once it's open, else
 * the Shift board); after a loss, the Shift board. Without one (a `?map=` dev battle): Title.
 */
function OnwardButton({ won }: { won: boolean }) {
  const inCampaign = campaign.value !== null;
  const label = !inCampaign ? 'Title' : won ? 'Continue' : campaignScreenName();
  const go = !inCampaign
    ? () => leaveResultsTo('title')
    : won
      ? afterWin
      : () => leaveResultsTo('campaign');
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

/** A story stamp (core-loop.md § 6.2): red, askew, over the headline's right. Never pays. */
function Stamp({ text, index }: { text: string; index: number }) {
  return (
    <p class="sd-results-stamp" style={{ top: `${20 + index * 18}px` }}>
      <span class="sd-visually-hidden">Stamped: </span>
      {silkText(text)}
    </p>
  );
}

function Body({ result }: { result: RunResult }) {
  const won = result.outcome === 'won';
  const { rewards } = result;
  const checkpoint = won ? null : result.retryFromWave;
  const header = resultsHeader(result.counter, result.outcome);
  const { escort } = result;
  const counter = resultsCounter(
    result.counter,
    result.pestsProcessed,
    rewards?.lifetimePests ?? result.pestsProcessed,
    // An Escort's meter line, where the dial shows one (Act III; core-loop.md § 6.2).
    escort === null ? null : { kind: escort.kind, n: escort.evacuated },
  );
  const asking = result.choice !== null && result.choice.picked === null;
  const counted = useCountUp(counter.n ?? 0);
  return (
    <section
      class={`sd-panel sd-results-panel ${won ? 'sd-results-won' : 'sd-results-lost'}`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="sd-results-heading"
      // A real modal (D138): Tab stays on the card, like the pause menu.
      onKeyDown={trapTab}
    >
      <p class="sd-results-kicker">{header.kicker}</p>
      <h1 id="sd-results-heading" class="sd-results-heading">
        {header.headline}
      </h1>
      {result.stamps.map((t, i) => (
        <Stamp key={t} text={t} index={i} />
      ))}
      <dl class="sd-results-stats">
        {/* An Escort's meter stands in Core integrity's place (core-loop.md § 6.2). */}
        {resultsStats(result).map((row) => (
          <div key={row.id} data-testid={`results-${row.id}`}>
            <dt>{silkText(row.label)}</dt>
            <dd>
              {row.value}
              {row.note !== null && <span class="sd-results-stat-note"> · {row.note}</span>}
            </dd>
          </div>
        ))}
      </dl>
      <div class="sd-results-counts">
        <Counter counter={counter} shown={counted} />
        {rewards !== null && counter.career !== null && (
          <Career n={rewards.lifetimePests} run={result.pestsProcessed} counted={counted} />
        )}
      </div>
      {rewards !== null && (
        <Payroll rewards={rewards} won={won} resumedFromWave={result.resumedFromWave} />
      )}
      {result.debrief.length > 0 && <Debrief lines={result.debrief} />}
      {asking && result.choice !== null && (
        <StoryChoice choice={result.choice} onPick={pickResultsChoice} />
      )}
      {!asking && <WayOn result={result} won={won} checkpoint={checkpoint} />}
    </section>
  );
}

/** The way on from Results: Retry from a checkpoint, Retry, Change loadout, and Continue. */
function WayOn({
  result,
  won,
  checkpoint,
}: {
  result: RunResult;
  won: boolean;
  checkpoint: number | null;
}) {
  return (
    <div class="sd-results-buttons">
      {/* A loss with a checkpoint (Act II on): pick up where the run was, first and focused. */}
      {checkpoint !== null && (
        <button
          type="button"
          class="sd-button sd-button-primary"
          ref={focusOnce}
          onClick={retryFromCheckpoint}
        >
          Retry from wave {checkpoint}
        </button>
      )}
      <button
        type="button"
        class={won || checkpoint !== null ? 'sd-button' : 'sd-button sd-button-primary'}
        ref={won || checkpoint !== null ? null : focusOnce}
        onClick={retryRun}
      >
        Retry
      </button>
      {/* Before a retry, a different four (T220): only where the loadout screen is offered. */}
      {campaign.value !== null && loadoutOfferedAfterRun(result.mapId) && (
        <button type="button" class="sd-button" onClick={() => changeLoadoutAfterRun(result.mapId)}>
          Change loadout
        </button>
      )}
      <OnwardButton won={won} />
    </div>
  );
}

/** The results screen: a scrim over the frozen battle and the results panel. */
export function Results() {
  const result = runResult.value;
  if (result === null) return null;
  return (
    // Inert under a scene (the stinger plays over the card as it's dismissed).
    // The map's UI act theme (its presentation dial): Act II's card edges in orange.
    <main class="sd-screen sd-results" inert={sceneBlocks.value} data-act={result.theme}>
      <Body result={result} />
    </main>
  );
}
