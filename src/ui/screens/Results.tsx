// The results screen (T115): shown over the frozen battle when a run ends. One headline and the
// counter sub-line (story/style-guide.md §4, "Results screen"), plus the run's waves and integrity.
// The counter is the Act I line (design/core-loop.md §6.2) and ticks up (art-direction §9). No
// medals or currencies until M2.
import { useEffect, useState } from 'preact/hooks';
import { retryRun, toTitle } from '../../app/navigation.ts';
import { countUpDuration, countUpValue } from './countUp.ts';
import { formatCount } from './format.ts';
import { runResult, type RunResult } from './state.ts';
import './screens.css';

/**
 * Headlines in Everglow's voice. A loss is never scolded: it is a "minor operational hiccup", the
 * euphemism dictionary's word for a catastrophe (story/races.md § Everglow Dynamics).
 */
const HEADLINE = {
  won: 'PERIMETER SECURED!',
  lost: 'MINOR OPERATIONAL HICCUP',
} as const;

function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

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

function Body({ result }: { result: RunResult }) {
  const won = result.outcome === 'won';
  return (
    <section
      class={`sd-panel sd-results-panel ${won ? 'sd-results-won' : 'sd-results-lost'}`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="sd-results-heading"
    >
      <p class="sd-results-kicker">Shift report · {won ? 'Victory' : 'Defeat'}</p>
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
      <div class="sd-results-buttons">
        <button
          type="button"
          class={won ? 'sd-button' : 'sd-button sd-button-primary'}
          ref={(el) => {
            if (!won) el?.focus();
          }}
          onClick={retryRun}
        >
          Retry
        </button>
        <button
          type="button"
          class={won ? 'sd-button sd-button-primary' : 'sd-button'}
          ref={(el) => {
            if (won) el?.focus();
          }}
          onClick={toTitle}
        >
          Title
        </button>
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
