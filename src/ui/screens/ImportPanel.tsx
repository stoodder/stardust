// Import a shift code (Title → Import, Settings → Import): paste, check, then pick the slot it
// goes into. A slot that holds a save asks before replacing it. Problems read in the Act I voice
// and never blame the player (app/save.ts). Once a code checks out, the focus moves to the first
// slot's button (U6); Keep returns it to that slot's Replace.
import { useState } from 'preact/hooks';
import { importGame } from '../../app/navigation.ts';
import { checkImport, type ImportCheck } from '../../app/save.ts';
import { useEscape } from './escape.ts';
import { focusOnce } from './focus.ts';
import { SlotList } from './SlotList.tsx';
import { slots, type SlotView } from './state.ts';

/** A ref callback that leaves the focus alone. */
function noFocus(): void {
  // The focus goes elsewhere.
}

type Step =
  | { readonly kind: 'paste'; readonly error: string | null; readonly busy: boolean }
  | { readonly kind: 'pick'; readonly check: Extract<ImportCheck, { ok: true }> };

/**
 * The import flow, ending on the imported campaign's Shift board. `quietLabel`: the field's label
 * is for screen readers only, where a heading over the panel already says it (the Title's
 * "Import a shift code"; T803c).
 */
export function ImportPanel({
  onCancel,
  quietLabel = false,
}: {
  onCancel: () => void;
  quietLabel?: boolean;
}) {
  const [text, setText] = useState('');
  const [step, setStep] = useState<Step>({ kind: 'paste', error: null, busy: false });
  const [confirm, setConfirm] = useState<1 | 2 | 3 | null>(null);
  /** The slot whose Replace takes the focus: the first one, then the one Keep backed out of. */
  const [focusSlot, setFocusSlot] = useState<1 | 2 | 3 | null>(null);
  const [writeError, setWriteError] = useState<string | null>(null);
  const keep = (slot: 1 | 2 | 3): void => {
    setConfirm(null);
    setFocusSlot(slot);
  };
  // Esc (T212): a Replace confirm says Keep; otherwise it's Back.
  useEscape(() => {
    if (confirm !== null) keep(confirm);
    else onCancel();
    return true;
  });

  const check = async (): Promise<void> => {
    setStep({ kind: 'paste', error: null, busy: true });
    const r = await checkImport(text);
    setStep(r.ok ? { kind: 'pick', check: r } : { kind: 'paste', error: r.message, busy: false });
    if (r.ok) setFocusSlot(slots.value[0]?.slot ?? null);
  };

  if (step.kind === 'paste') {
    return (
      <div class="sd-import">
        <label class={quietLabel ? 'sd-visually-hidden' : 'sd-field-label'} for="sd-import-code">
          Paste a shift code
        </label>
        <textarea
          id="sd-import-code"
          class="sd-code"
          rows={4}
          spellcheck={false}
          autocomplete="off"
          placeholder="SD2-…"
          value={text}
          ref={focusOnce}
          onInput={(e) => setText(e.currentTarget.value)}
        />
        {step.error !== null && (
          <p class="sd-message sd-warn" role="alert">
            {step.error}
          </p>
        )}
        <div class="sd-row">
          <button type="button" class="sd-button" onClick={onCancel}>
            Back
          </button>
          <button
            type="button"
            class="sd-button sd-button-primary"
            disabled={step.busy}
            onClick={() => void check()}
          >
            Check code
          </button>
        </div>
      </div>
    );
  }

  const place = (slot: 1 | 2 | 3): void => {
    const r = importGame(slot, step.check.save);
    if (!r.ok) setWriteError(r.message);
  };
  const actions = (view: SlotView) => {
    const focus = view.slot === focusSlot ? focusOnce : noFocus;
    if (view.status === 'empty') {
      return (
        <button
          type="button"
          class="sd-button sd-button-small"
          ref={focus}
          onClick={() => place(view.slot)}
        >
          Import here
        </button>
      );
    }
    if (confirm === view.slot) {
      return (
        <>
          <button
            type="button"
            class="sd-button sd-button-small sd-button-danger"
            ref={focusOnce}
            onClick={() => place(view.slot)}
          >
            Yes, replace
          </button>
          <button type="button" class="sd-button sd-button-small" onClick={() => keep(view.slot)}>
            Keep
          </button>
        </>
      );
    }
    return (
      <button
        type="button"
        class="sd-button sd-button-small"
        ref={focus}
        onClick={() => setConfirm(view.slot)}
      >
        Replace
      </button>
    );
  };
  return (
    <div class="sd-import">
      <p class="sd-message sd-ok" role="status">
        Code checks out! {step.check.summary}. Where should it go?
      </p>
      <SlotList slots={slots.value} label="Import into" actions={actions} />
      {writeError !== null && (
        <p class="sd-message sd-warn" role="alert">
          {writeError}
        </p>
      )}
      <div class="sd-row">
        <button type="button" class="sd-button" onClick={onCancel}>
          Back
        </button>
      </div>
    </div>
  );
}
