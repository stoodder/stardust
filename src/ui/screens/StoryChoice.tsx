// A debrief's story choice (C2, Zibzab's Price; C4, QUILL's directives, under its own title with
// nothing priced, T710): on the Results card in the way on's place (Results.tsx), and at the base
// when the card was never answered (BaseChoice.tsx). Price first, truly (D138): the stake (the
// whole bank) heads the group, and each option shows what it pays under it before the pick (Sell:
// the Intel windfall and the Zibzab Tune-up; Return: "Carried home · Fee: an IOU"), side by side
// and alike, since neither is wrong. A stray key can't make it (D138): the focus lands on the
// group's heading, not an option, and the options ignore input for CHOICE_LOCK_MS after they show.
import { useEffect, useState } from 'preact/hooks';
import { silkText } from '../silk.ts';
import { focusOnce } from './focus.ts';
import { formatCount } from './format.ts';
import type { ResultsChoice, ResultsPay } from './state.ts';

/** How long the options ignore input after they show, in ms (D138). */
export const CHOICE_LOCK_MS = 700;

/** What an option pays, under its button: "+5 Intel · Zibzab Tune-up". */
function Pays({ pays, id }: { pays: ResultsPay; id: string }) {
  return (
    <span id={id} class="sd-choice-pays" data-testid="choice-pays">
      {pays.intel > 0 && (
        <span class="sd-results-pay-amount sd-intel">+{formatCount(pays.intel)} Intel</span>
      )}
      {pays.intel > 0 && pays.note !== '' && ' · '}
      {pays.note !== '' && silkText(pays.note)}
    </span>
  );
}

/** The choice's name: its title (C4), else "{offerer}'s offer" (C2). */
export function choiceName(choice: ResultsChoice): string {
  if (choice.title !== null) return choice.title;
  return choice.by === '' ? 'Your answer' : `${choice.by}'s offer`;
}

/**
 * The choice: the stake as the group's heading (focused as it shows), then the options with what
 * each pays. `onPick` takes the option's index; presses in the first CHOICE_LOCK_MS are ignored.
 */
export function StoryChoice({
  choice,
  onPick,
}: {
  choice: ResultsChoice;
  onPick: (index: number) => void;
}) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setReady(true), CHOICE_LOCK_MS);
    return () => clearTimeout(t);
  }, []);
  const by = choiceName(choice);
  return (
    <div
      class={`sd-results-buttons sd-results-choice${choice.title === null ? '' : ' sd-results-choice-titled'}`}
      role="group"
      aria-label={by}
    >
      <h2
        class="sd-results-stake"
        tabIndex={-1}
        ref={focusOnce}
        data-testid="choice-heading"
        data-voice="stake"
      >
        {choice.title === null ? (
          <>
            <span class="sd-visually-hidden">{by}. </span>
            The whole bank: <span class="sd-stardust">{formatCount(choice.bank)} Stardust</span>
          </>
        ) : (
          silkText(choice.title)
        )}
      </h2>
      {choice.options.map((text, i) => {
        const pays = choice.pays[i];
        return (
          <div key={i} class="sd-choice-option">
            <button
              type="button"
              class={ready ? 'sd-button' : 'sd-button sd-choice-locked'}
              data-voice="choice"
              aria-disabled={ready ? undefined : 'true'}
              aria-describedby={pays === undefined ? undefined : `sd-choice-pays-${i}`}
              onClick={() => {
                if (ready) onPick(i);
              }}
            >
              {silkText(text)}
            </button>
            {pays !== undefined && <Pays pays={pays} id={`sd-choice-pays-${i}`} />}
          </div>
        );
      })}
    </div>
  );
}

/** What the taken option's speaker will remember, or null (none taken, or nobody remembers). */
export function rememberedText(choice: ResultsChoice): string | null {
  if (choice.picked === null) return null;
  return choice.remember?.[choice.picked] ?? null;
}

/**
 * Once a C4 answer is taken (T714): "QUILL will remember that." under the card, in `teal.4`, as
 * C3's shows in the briefing (art-direction.md § Dialogue presentation): never a warning.
 */
export function Remembered({ choice }: { choice: ResultsChoice }) {
  const text = rememberedText(choice);
  if (text === null || choice.picked === null) return null;
  const answer = choice.options[choice.picked] ?? '';
  return (
    <div class="sd-choice-answered" data-testid="choice-answered" data-voice="choice">
      {/* The answer as the player said it (C3's shows as their own line in the briefing). */}
      <p class="sd-choice-answer">{silkText(answer)}</p>
      <p
        class="sd-choice-remember"
        role="status"
        data-testid="choice-remember"
        data-voice="remember"
      >
        {text}
      </p>
    </div>
  );
}
