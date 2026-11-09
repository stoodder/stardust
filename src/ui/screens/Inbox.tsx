// The Everglow Inbox (T303; design/core-loop.md § 6.4, art-direction § 9 *Memos*): the base's
// memo pane. Delivered memos, newest first, in a list beside a reader on Everglow letterhead; the
// small print collapses under its toggle, one click away. Showing a memo reads it, which clears its
// NEW tag (and the Inbox tab's count). The view models are app/inbox.ts.
import type { ComponentChildren } from 'preact';
import { useEffect, useState } from 'preact/hooks';
import { inboxView, markMemoRead, type MemoView } from '../../app/inbox.ts';
import { GLYPH_CHARS } from '../../story/text.ts';
import { silkText } from '../silk.ts';
import { campaign } from './state.ts';
import './inbox.css';

// ── Shared with the codex pane ───────────────────────────────────────────────────────────────

/** Text with its glyphs drawn: the Evie sun as a small pixel sun, everything through silkText. */
export function GlyphText({ text }: { text: string }) {
  const parts = silkText(text).split(GLYPH_CHARS.sun);
  const out: ComponentChildren[] = [];
  parts.forEach((p, i) => {
    if (i > 0) out.push(<span key={`sun${i}`} class="sd-glyph-sun" aria-hidden="true" />);
    if (p !== '') out.push(p);
  });
  return <>{out}</>;
}

/** The teal NEW tag (the HUD's build-slot tag, as a menu badge). Decorative: names say "new". */
export function NewTag({ count }: { count?: number }) {
  return (
    <span class="sd-new-tag" aria-hidden="true">
      {count === undefined ? 'NEW' : `${count} NEW`}
    </span>
  );
}

/** "Small print", collapsed until clicked (style-guide § 6.1: where the fair-play clues live). */
export function SmallPrint({ id, text }: { id: string; text: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div class="sd-small-print">
      <button
        type="button"
        class="sd-small-print-toggle"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen(!open)}
      >
        <span class="sd-small-print-caret" aria-hidden="true">
          {open ? '-' : '+'}
        </span>
        Small print
      </button>
      <p id={id} class="sd-small-print-text" hidden={!open}>
        <GlyphText text={text} />
      </p>
    </div>
  );
}

/**
 * How long an item the pane opened by itself stays on screen before it counts as read (ms), so
 * arrowing through the base's tabs doesn't read what it passes. Picking an item reads it at once.
 */
export const READ_DWELL_MS = 800;

/** Marks the shown item read once it has stayed on screen for READ_DWELL_MS. */
export function useReadOnDwell(id: string | null, mark: (id: string) => unknown): void {
  useEffect(() => {
    if (id === null) return undefined;
    const timer = setTimeout(() => mark(id), READ_DWELL_MS);
    return () => clearTimeout(timer);
  }, [id]);
}

/**
 * Up and Down (and Home and End) move between a list's buttons and pick the one they land on, as
 * a click would; Tab leaves the list.
 */
export function listKeys(e: KeyboardEvent, pick: (index: number) => void, count: number): void {
  const list = e.currentTarget;
  if (!(list instanceof HTMLElement)) return;
  const items = Array.from(list.querySelectorAll<HTMLButtonElement>('[data-list-item]'));
  const focused = document.activeElement;
  const at = focused instanceof HTMLButtonElement ? items.indexOf(focused) : -1;
  let next: number;
  if (e.key === 'ArrowDown') next = Math.min(count - 1, at + 1);
  else if (e.key === 'ArrowUp') next = Math.max(0, at - 1);
  else if (e.key === 'Home') next = 0;
  else if (e.key === 'End') next = count - 1;
  else return;
  e.preventDefault();
  items[next]?.focus();
  pick(next);
}

// ── The Inbox ────────────────────────────────────────────────────────────────────────────────

function Letter({ memo }: { memo: MemoView }) {
  return (
    <article class="sd-memo" aria-labelledby="sd-memo-subject">
      <header class="sd-memo-head">
        <span class="sd-memo-brand">
          <span class="sd-memo-chevrons" aria-hidden="true" />
          <span class="sd-glyph-sun sd-glyph-sun-big" aria-hidden="true" />
          Everglow · Memo
        </span>
        <dl class="sd-memo-fields">
          <dt>From</dt>
          <dd>
            <GlyphText text={memo.from} />
          </dd>
          <dt>To</dt>
          <dd>
            <GlyphText text={memo.to} />
          </dd>
          <dt>Re</dt>
          <dd id="sd-memo-subject" class="sd-memo-subject">
            <GlyphText text={memo.subject} />
          </dd>
        </dl>
      </header>
      <div class="sd-memo-body">
        {memo.paragraphs.map((p, i) => (
          <p key={i}>
            <GlyphText text={p} />
          </p>
        ))}
        {memo.signOff !== null && (
          <p class="sd-memo-sign">
            <GlyphText text={memo.signOff} />
          </p>
        )}
      </div>
      {memo.smallPrint !== null && (
        <SmallPrint key={memo.id} id={`sd-memo-print-${memo.id}`} text={memo.smallPrint} />
      )}
    </article>
  );
}

/** The Inbox tab's pane: the memo list and the reader. */
export function InboxPane() {
  // Subscribing to the campaign view re-renders the pane whenever the save changes (a read).
  void campaign.value;
  const memos = inboxView();
  const firstUnread = memos.find((m) => m.unread)?.id ?? memos[0]?.id ?? null;
  const [picked, setPicked] = useState<string | null>(firstUnread);
  const shown = memos.find((m) => m.id === picked) ?? memos[0] ?? null;

  // Showing a memo reads it (core-loop.md § 6.4: the badge counts the unread).
  useReadOnDwell(shown?.id ?? null, markMemoRead);

  if (shown === null) {
    return (
      <div class="sd-pane-body">
        <p class="sd-pane-who">Everglow Inbox</p>
        <p class="sd-pane-line">Nothing here yet. Everglow will be in touch!</p>
      </div>
    );
  }
  const pick = (i: number): void => {
    const id = memos[i]?.id;
    if (id === undefined) return;
    setPicked(id);
    markMemoRead(id);
  };
  return (
    <div class="sd-story-pane sd-inbox">
      <nav class="sd-story-list" aria-label="Memos">
        <p class="sd-story-list-title">Inbox · {memos.length}</p>
        <ul onKeyDown={(e) => listKeys(e, pick, memos.length)}>
          {memos.map((m, i) => (
            <li key={m.id}>
              <button
                type="button"
                data-list-item
                class={`sd-story-item${m.id === shown.id ? ' sd-story-item-on' : ''}`}
                aria-current={m.id === shown.id ? 'true' : undefined}
                aria-label={`${m.subject.replace(GLYPH_CHARS.sun, '').trim()}${m.unread ? ', new' : ''}`}
                tabIndex={m.id === shown.id ? 0 : -1}
                onClick={() => pick(i)}
              >
                <span class="sd-story-item-name">
                  <GlyphText text={m.subject} />
                </span>
                {m.unread && <NewTag />}
              </button>
            </li>
          ))}
        </ul>
      </nav>
      <div class="sd-story-reader" tabIndex={0} aria-label="Memo">
        <Letter memo={shown} />
      </div>
    </div>
  );
}
