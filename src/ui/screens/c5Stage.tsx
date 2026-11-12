// C5's stage (staging `c5`; the rules are c5.ts; T810): the valley at first light, a deep violet
// night giving way to a low rose-and-gold band along the bottom; at the top, the KFA's off-white form
// (the relay's answer), its clauses filed one by one as they're read. Nothing else: the voices and
// the two lines play below, alone. DOM at whole pixels, silent, aria-hidden under one label.
// Part of the finale's lazy chunk (app/acts/fin.ts registers it).
import { dialogue } from '../dialogue/state.ts';
import { plainText } from '../dialogue/text.ts';
import { prefersReducedMotion } from '../motion.ts';
import { C5_FORM_BRAND, C5_FORM_TITLE, c5Label, filedClauses } from './c5.ts';
import './c5.css';

/** The stage, `from` its staging's start (unused: the form follows the lines, not a clock). */
export function C5Stage(_props: { readonly from: number }) {
  const still = prefersReducedMotion();
  const view = dialogue.scene.value;
  const clauses = filedClauses(view?.transcript ?? []);
  return (
    <div
      class={`c5${still ? ' still' : ''}`}
      role="img"
      aria-label={c5Label(clauses.length)}
      data-testid="stage-c5"
      data-voice="stage"
      data-clauses={clauses.length}
    >
      <span class="c5-sky" aria-hidden="true" />
      <span class="c5-sun" aria-hidden="true" />
      {clauses.length > 0 && (
        <article class="c5-form" aria-hidden="true">
          <header class="c5-form-head">
            <span class="c5-form-brand">{C5_FORM_BRAND}</span>
            <span class="c5-form-title">{C5_FORM_TITLE}</span>
          </header>
          <ol class="c5-clauses">
            {clauses.map((c, i) => (
              <li key={i} class="c5-clause">
                {plainText(c)}
              </li>
            ))}
          </ol>
        </article>
      )}
    </div>
  );
}
