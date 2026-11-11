// QUILL's own list as a card (act3.md § A3M6, under C4 Rewrite; T714; the rules are quillList.ts):
// while the briefing's `system` header line is on screen, the list QUILL wrote while it was dark
// stands in the briefing where its intel and medals were (hud/Briefing.tsx), in its own terminal:
// the header in steel, each directive's number in QUILL's teal and its words in white. Not modal:
// Next reads on, and the intel comes back with the next line. Nothing moves.
import { silkText } from '../silk.ts';
import { directiveParts } from './quillList.ts';
import './quillList.css';

/** The card: the header line's words, then the entries. */
export function QuillListCard({
  header,
  entries,
}: {
  header: string;
  entries: readonly string[];
}) {
  return (
    <section class="ql chamfer" aria-label="QUILL's list" data-testid="quill-list">
      <p class="ql-header">{silkText(header)}</p>
      <ol class="ql-entries">
        {entries.map((e) => {
          const { label, words } = directiveParts(e);
          return (
            <li key={e} class="ql-entry">
              {label !== '' && <span class="ql-label">{silkText(label)}</span>}
              <span class="ql-words">{silkText(words)}</span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
