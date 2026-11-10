// A debrief's story choice offered at the base (D138; app/baseChoice.ts): C2 when A2M4's card was
// never answered. A modal panel over the base: the offerer's lines under their name plates, then
// the choice as the Results card shows it (StoryChoice.tsx: price first, its heading focused, its
// options locked for a beat). Once taken: what it did (the payroll row's words), the lines after,
// and Continue, which closes it and plays the base's visit scenes. Esc waits for the answer.
import { colorVar } from '../color.ts';
import { silkText } from '../silk.ts';
import { closeBaseChoice, pickBaseChoice } from '../../app/baseChoice.ts';
import { trapTab } from '../dialogue/SceneParts.tsx';
import { useEscape } from './escape.ts';
import { focusOnce } from './focus.ts';
import { formatCount } from './format.ts';
import { StoryChoice } from './StoryChoice.tsx';
import { baseChoice, type BaseChoiceView, type ResultsTransaction } from './state.ts';
import './results.css';

/** What the choice did, in the payroll row's words: "Sold at market · 940 Stardust +6 Intel". */
function Made({ t }: { t: ResultsTransaction }) {
  if (t.kind !== 'c2' || t.choice === 'none') return null;
  return (
    <p class="sd-base-choice-made" data-testid="base-choice-made">
      {t.choice === 'sold' ? 'Sold at market' : 'Carried home'}
      <span class="sd-results-pay-note"> · {formatCount(t.bank)} Stardust · </span>
      {t.choice === 'sold' ? (
        <span class="sd-results-pay-amount sd-intel">+{formatCount(t.intel)} Intel</span>
      ) : (
        <span class="sd-results-pay-note">Fee: an IOU</span>
      )}
      {t.tuneUp !== null && (
        <span class="sd-base-choice-tune-up">{silkText(`${t.tuneUp.name}: ${t.tuneUp.line}`)}</span>
      )}
    </p>
  );
}

/** The panel, while a choice is offered at the base. */
export function BaseChoice() {
  const view = baseChoice.value;
  return view === null ? null : <Panel view={view} />;
}

/**
 * The panel itself: mounted only while it shows, so its Esc handler sits over the base's (a
 * sub-panel mounts after its screen; escape.ts).
 */
function Panel({ view }: { view: BaseChoiceView }) {
  // Esc never answers for the player, or leaves the base; once answered, it closes like Continue.
  useEscape(() => {
    closeBaseChoice();
    return true;
  });
  const answered = view.choice.picked !== null;
  return (
    <div class="sd-screen sd-base-choice" data-testid="base-choice">
      <section
        class="sd-panel sd-base-choice-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="sd-base-choice-heading"
        onKeyDown={trapTab}
      >
        <h1 id="sd-base-choice-heading" class="sd-results-kicker">
          {view.choice.by}'s offer
        </h1>
        <ul class="sd-results-debrief" aria-label="Debrief">
          {view.lines.map((l, i) => (
            <li key={i}>
              <span class="sd-results-speaker" style={{ color: colorVar(l.color) }}>
                {l.name}
              </span>
              <span class="sd-results-line">{silkText(l.text)}</span>
            </li>
          ))}
        </ul>
        {!answered && <StoryChoice choice={view.choice} onPick={pickBaseChoice} />}
        {view.made !== null && <Made t={view.made} />}
        {view.notice !== null && (
          <p class="sd-results-save-notice" role="alert">
            {silkText(view.notice)}
          </p>
        )}
        {answered && (
          <div class="sd-results-buttons sd-base-choice-buttons">
            <button
              type="button"
              class="sd-button sd-button-primary"
              ref={focusOnce}
              onClick={closeBaseChoice}
            >
              Continue
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
