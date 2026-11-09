// The codex (T303; design/core-loop.md § 6.5): the base's *Pest Field Guide* pane. Unlocked entries,
// grouped by kind, in a list beside the open entry: its picture (the subject's icon, or a prop or
// portrait), its title, and the version it shows (from A3M1, original beside corrected). Opening an
// entry reads it, which clears its NEW tag. The view models are app/inbox.ts.
import { useState } from 'preact/hooks';
import { CODEX_SECTIONS, codexView, markCodexRead, type CodexEntryView } from '../../app/inbox.ts';
import { Icon } from '../hud/Icon.tsx';
import { GlyphText, listKeys, NewTag, SmallPrint, useReadOnDwell } from './Inbox.tsx';
import { campaign } from './state.ts';
import './inbox.css';

const VERSION_LABEL = {
  original: 'Pest Field Guide',
  annotated: 'Annotated',
  corrected: 'Field Journal',
} as const;

function Entry({ entry, title }: { entry: CodexEntryView; title: string }) {
  const section = CODEX_SECTIONS.find((s) => s.kind === entry.kind)?.label ?? '';
  const sideBySide = entry.versions.length > 1;
  return (
    <article class="sd-codex-entry" aria-labelledby="sd-codex-title">
      <header class="sd-codex-head">
        <div class="sd-codex-photo">
          {entry.picture === null ? (
            <span class="sd-codex-pending">Photo pending</span>
          ) : (
            <Icon
              id={entry.picture.id}
              frame={entry.picture.frame}
              // A 16×16 icon shows at 3× (whole pixels); props and portraits at 1×.
              class={
                entry.picture.frame === 'icon' ? 'sd-codex-sprite sd-codex-x3' : 'sd-codex-sprite'
              }
            />
          )}
        </div>
        <div>
          <p class="sd-codex-kicker">
            {title} · {section}
          </p>
          <h2 id="sd-codex-title" class="sd-codex-title">
            {entry.title}
          </h2>
        </div>
      </header>
      <div class={sideBySide ? 'sd-codex-versions sd-codex-side' : 'sd-codex-versions'}>
        {entry.versions.map((v) => (
          <section key={v.version} class="sd-codex-version">
            {sideBySide && <p class="sd-codex-version-label">{VERSION_LABEL[v.version]}</p>}
            <p class="sd-codex-text">
              <GlyphText text={v.text} />
            </p>
            {v.smallPrint !== null && (
              <SmallPrint
                key={`${entry.id}-${v.version}`}
                id={`sd-codex-print-${entry.id}-${v.version}`}
                text={v.smallPrint}
              />
            )}
          </section>
        ))}
      </div>
    </article>
  );
}

/** The Codex tab's pane: the entry list and the open entry. */
export function CodexPane() {
  // Subscribing to the campaign view re-renders the pane whenever the save changes (a read).
  void campaign.value;
  const view = codexView();
  const entries = view?.entries ?? [];
  const [picked, setPicked] = useState<string | null>(
    () => entries.find((e) => e.isNew)?.id ?? entries[0]?.id ?? null,
  );
  const shown = entries.find((e) => e.id === picked) ?? entries[0] ?? null;

  useReadOnDwell(shown?.id ?? null, markCodexRead);

  if (view === null || shown === null) {
    return (
      <div class="sd-pane-body">
        <p class="sd-pane-who">{view?.title ?? 'Pest Field Guide'}</p>
        <p class="sd-pane-line">No entries on file yet. Get out there and meet some pests!</p>
      </div>
    );
  }
  // The list in section order; the index is the entry's place in that order (arrow keys).
  const ordered = CODEX_SECTIONS.flatMap((s) => entries.filter((e) => e.kind === s.kind));
  const pick = (i: number): void => {
    const id = ordered[i]?.id;
    if (id === undefined) return;
    setPicked(id);
    markCodexRead(id);
  };
  return (
    <div class="sd-story-pane sd-codex">
      <nav class="sd-story-list" aria-label={`${view.title} entries`}>
        <p class="sd-story-list-title">
          {view.title} · {entries.length} of {view.total}
        </p>
        <div onKeyDown={(e) => listKeys(e, pick, ordered.length)}>
          {CODEX_SECTIONS.map((s) => {
            const inSection = ordered.filter((e) => e.kind === s.kind);
            if (inSection.length === 0) return null;
            return (
              <div key={s.kind} class="sd-codex-section">
                <p class="sd-store-group-title" id={`sd-codex-sec-${s.kind}`}>
                  {s.label}
                </p>
                <ul aria-labelledby={`sd-codex-sec-${s.kind}`}>
                  {inSection.map((e) => (
                    <li key={e.id}>
                      <button
                        type="button"
                        data-list-item
                        class={`sd-story-item${e.id === shown.id ? ' sd-story-item-on' : ''}`}
                        aria-current={e.id === shown.id ? 'true' : undefined}
                        aria-label={`${e.title}${e.isNew ? ', new' : ''}`}
                        tabIndex={e.id === shown.id ? 0 : -1}
                        onClick={() => pick(ordered.indexOf(e))}
                      >
                        {e.picture?.frame === 'icon' ? (
                          <Icon id={e.picture.id} class="sd-codex-thumb" />
                        ) : (
                          <span class="sd-codex-thumb" aria-hidden="true" />
                        )}
                        <span class="sd-story-item-name">{e.title}</span>
                        {e.isNew && <NewTag />}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </nav>
      <div class="sd-story-reader" tabIndex={0} aria-label="Codex entry">
        <Entry entry={shown} title={view.title} />
      </div>
    </div>
  );
}
