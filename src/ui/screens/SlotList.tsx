// The three save slots as a list (Title → New game / Load, and Import's target pick). Each row
// shows the slot's progress and banks; the caller decides each row's action. Deleting and
// overwriting always ask first (meta-runtime.md: never silently wipe a save).
import type { ComponentChildren } from 'preact';
import { assertNever } from '../../shared/types.ts';
import { formatCount } from './format.ts';
import type { SlotView } from './state.ts';

/** "Nov 9 · 14:02": when a slot was last written, in the player's locale. */
export function savedAtText(ms: number): string {
  const d = new Date(ms);
  const day = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  const time = d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  return `${day} · ${time}`;
}

/** One slot's description: its progress line and its banks, or why it has none. */
export function SlotSummary({ view }: { view: SlotView }) {
  switch (view.status) {
    case 'empty':
      return <span class="sd-slot-progress sd-dim">Empty</span>;
    case 'unreadable':
      return <span class="sd-slot-progress sd-warn">Can't be read</span>;
    case 'ok':
      return (
        <span class="sd-slot-summary">
          <span class="sd-slot-progress">{view.progress}</span>
          <span class="sd-slot-banks">
            <span class="sd-stardust">{formatCount(view.stardust)} Stardust</span>
            <span class="sd-intel">{formatCount(view.intel)} Intel</span>
            <span class="sd-dim">{savedAtText(view.savedAt)}</span>
            {view.fromBackup && <span class="sd-warn">From backup</span>}
          </span>
        </span>
      );
    default:
      return assertNever(view);
  }
}

/** The slot list: `actions` renders each row's buttons. */
export function SlotList({
  slots,
  label,
  actions,
}: {
  slots: readonly SlotView[];
  label: string;
  actions: (view: SlotView) => ComponentChildren;
}) {
  return (
    <ul class="sd-slots" aria-label={label}>
      {slots.map((view) => (
        <li key={view.slot} class={view.status === 'empty' ? 'sd-slot sd-slot-empty' : 'sd-slot'}>
          <span class="sd-slot-label">Slot {view.slot}</span>
          <SlotSummary view={view} />
          <span class="sd-slot-actions">{actions(view)}</span>
        </li>
      ))}
    </ul>
  );
}
