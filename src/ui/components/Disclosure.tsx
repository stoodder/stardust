// The "more" disclosure (T803a; D153: secondary detail one press away, never unreachable), for the
// declutter pass's screens (T803b–e). The WAI-ARIA disclosure pattern: a real <button> with
// `aria-expanded` and `aria-controls`, its region `hidden` while closed (out of the page, the tab
// order and the screen reader's reading alike), opened by a click, Enter or Space (the button's
// own); Esc inside an open one closes it and puts the focus back on its toggle, without reaching
// the game's Esc (the pause menu, a menu's way back). The toggle reads like the Inbox's small print
// (a +/- caret, small caps; or a chevron after the words, `caret: 'trail'`). `float` lays the region over what follows instead of pushing it down,
// for a panel that mustn't grow. It opens with a short fade, none under reduced motion
// (disclosure.css). Never put a `data-critical` readout inside one: the declutter guard
// (smoke/declutter.ts) fails a critical readout that isn't shown without a click.
import type { ComponentChildren, JSX } from 'preact';
import { useId, useRef, useState } from 'preact/hooks';
import './disclosure.css';

export interface DisclosureProps {
  /** The toggle's words while closed. Default "More". */
  readonly label?: string;
  /** The toggle's words while open. Default: `label`. */
  readonly lessLabel?: string;
  /**
   * What the hidden part holds, read after the toggle's words by screen readers ("More: medals and
   * objectives"), so a list of toggles isn't a list of "More".
   */
  readonly about?: string;
  /** Controlled: the open state (with `onToggle`). */
  readonly open?: boolean;
  /** Uncontrolled: open on mount. Default false. */
  readonly defaultOpen?: boolean;
  /** Called with the new state on every toggle (a click, Enter, Space, or Esc). */
  readonly onToggle?: (open: boolean) => void;
  /** Lay the region over what follows (absolutely placed under the toggle) instead of in flow. */
  readonly float?: boolean;
  /**
   * Where its mark sits: `lead` (default) a +/- before the words; `trail` a small chevron after
   * them, pointing right while closed and down while open (a count like "8 of yours answer it",
   * which a leading "+" turned into "+8"; D156).
   */
  readonly caret?: 'lead' | 'trail';
  /** Extra classes on the root. */
  readonly class?: string;
  readonly children?: ComponentChildren;
}

/** The toggle's words for its state: `label` while closed, `lessLabel` (or `label`) while open. */
export function toggleText(open: boolean, label = 'More', lessLabel?: string): string {
  return open ? (lessLabel ?? label) : label;
}

/** The toggle's screen-reader name: its words, then what it holds ("More: the medals"). */
export function toggleName(text: string, about: string | undefined): string | undefined {
  return about === undefined || about === '' ? undefined : `${text}: ${about}`;
}

/**
 * What a key does to the disclosure: Esc closes an open one (`false`); anything else is the
 * button's or the page's (`null`: Enter and Space press the button natively).
 */
export function keyResult(key: string, open: boolean): false | null {
  return key === 'Escape' && open ? false : null;
}

/** The parts of the markup that change with the state (pure, for the unit test). */
export function disclosureState(
  open: boolean,
  regionId: string,
  props: Pick<DisclosureProps, 'label' | 'lessLabel' | 'about' | 'float' | 'class'>,
): {
  readonly rootClass: string;
  readonly text: string;
  readonly name: string | undefined;
  readonly toggle: {
    readonly 'aria-expanded': boolean;
    readonly 'aria-controls': string;
  };
  readonly region: { readonly id: string; readonly hidden: boolean };
} {
  const text = toggleText(open, props.label, props.lessLabel);
  const classes = ['sd-disclosure'];
  if (open) classes.push('sd-disclosure-open');
  if (props.float === true) classes.push('sd-disclosure-float');
  if (props.class !== undefined && props.class !== '') classes.push(props.class);
  return {
    rootClass: classes.join(' '),
    text,
    name: toggleName(text, props.about),
    toggle: { 'aria-expanded': open, 'aria-controls': regionId },
    region: { id: regionId, hidden: !open },
  };
}

/** A "more" toggle and the region it shows. */
export function Disclosure(props: DisclosureProps): JSX.Element {
  const regionId = `sd-disclosure-${useId()}`;
  const [own, setOwn] = useState(props.defaultOpen === true);
  const open = props.open ?? own;
  const toggleRef = useRef<HTMLButtonElement>(null);
  const set = (next: boolean): void => {
    if (props.open === undefined) setOwn(next);
    props.onToggle?.(next);
  };
  const s = disclosureState(open, regionId, props);
  const onKeyDown = (e: KeyboardEvent): void => {
    if (keyResult(e.key, open) === null) return;
    // Esc is the disclosure's while focus is inside it: the game's (the pause menu, a menu's way
    // back; app/keys.ts listens on window) never hears it.
    e.preventDefault();
    e.stopPropagation();
    set(false);
    toggleRef.current?.focus();
  };
  return (
    <div class={s.rootClass} onKeyDown={onKeyDown}>
      <button
        ref={toggleRef}
        type="button"
        class="sd-disclosure-toggle"
        aria-expanded={s.toggle['aria-expanded']}
        aria-controls={s.toggle['aria-controls']}
        aria-label={s.name}
        onClick={() => set(!open)}
      >
        {props.caret !== 'trail' && (
          <span class="sd-disclosure-caret" aria-hidden="true">
            {open ? '-' : '+'}
          </span>
        )}
        {s.text}
        {props.caret === 'trail' && <span class="sd-disclosure-chevron" aria-hidden="true" />}
      </button>
      <div id={s.region.id} class="sd-disclosure-region" hidden={s.region.hidden}>
        {props.children}
      </div>
    </div>
  );
}
