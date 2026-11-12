// Character creation (T306; design/core-loop.md § 6.1): Everglow's onboarding form, "Frontier
// Futures: New Hire Intake". It opens on New game before A1M1, and on Continue, Load, or Import
// for a save with no profile yet. Name, the form of address (optional, Tech. until the player picks
// another; D163), and the reason for joining, with no name or reason picked for the player; the
// callsign is assigned in the field (Bricks, A1M1). An ID badge previews the name (and carries the
// employee number) and a file note shows how the form of address reads in a sentence. The
// name's hint shows while the field has the focus (or a problem takes its place; T803c). The copy's home is
// docs/story/campaign/act1.md § Character creation; the rules are app/profile.ts. On a new
// campaign it follows the prelude (T1001), rising off its last line (Form FF-1 at your boots).
import { useLayoutEffect, useRef, useState } from 'preact/hooks';
import type { TargetedKeyboardEvent } from 'preact';
import { cancelIntake, submitIntake } from '../../app/navigation.ts';
import { intakeRises } from './preludeState.ts';
import {
  ARRIVAL_ORDER,
  BLANK_INTAKE,
  SAMPLE_NOTE,
  cleanName,
  intakeMode,
  intakeProblems,
  previewText,
  type IntakeForm,
  type IntakeProblems,
} from '../../app/profile.ts';
import {
  ADDRESSES,
  ADDRESS_IDS,
  ARRIVAL_REASONS,
  PLAYER_NAME,
  type AddressId,
  type ArrivalReason,
} from '../../content/dialogue/profile.ts';
import { Icon } from '../hud/Icon.tsx';
import { useEscape } from './escape.ts';
import { focusOnce } from './focus.ts';
import './screens.css';
import './Intake.css';

/** The form's copy (act1.md § Character creation), verbatim. */
export const INTAKE_COPY = {
  kicker: 'Everglow · Frontier Futures · Form FF-1',
  heading: 'New hire intake',
  grade: 'Junior Perimeter Technician, Grade 1',
  intro: 'Welcome to the Everglow family! Please print clearly. Every answer goes in your file.',
  introExisting:
    'Records switched to a new form! Fill it in once, and your shifts carry on where you left them.',
  nameLabel: 'Name',
  nameHint: "As it goes on your name tag: up to 16 letters, digits, spaces, and ' - .",
  addressLabel: 'Form of address',
  addressHint: 'For your file. Most of the crew just uses your name.',
  arrivalLabel: 'Reason for joining',
  arrivalHint: 'There are no wrong answers. All answers are filed.',
  callsignLabel: 'Callsign',
  callsignValue: 'Assigned in the field by your supervisor',
  badgeBlank: 'Your name',
  badgePhoto: 'Photo on file',
  smallPrint:
    'Small print: Name and form of address can be updated in Settings. Your reason for joining is ' +
    'final and goes in your permanent file, which your field supervisor may read.',
  back: 'Back',
  submit: 'Sign and submit',
} as const;

/** Arrow keys in a radio group: which way each moves the pick. */
const RADIO_STEP: Readonly<Record<string, number>> = {
  ArrowLeft: -1,
  ArrowUp: -1,
  ArrowRight: 1,
  ArrowDown: 1,
};

export interface ChoiceOption<T extends string> {
  readonly id: T;
  readonly label: string;
}

/**
 * A radio group of small buttons (the WAI-ARIA radio pattern, like Settings' difficulty): one Tab
 * stop, the arrows move the pick. The picked option holds the Tab stop; with nothing picked yet
 * (a required group the player hasn't answered), the first option holds it. An optional group
 * (`required={false}`) always arrives with a pick.
 */
export function ChoiceGroup<T extends string>({
  name,
  labelledBy,
  describedBy,
  options,
  value,
  invalid = false,
  required = true,
  stacked = false,
  compact = false,
  groupRef,
  onPick,
}: {
  name: string;
  labelledBy: string;
  describedBy?: string;
  options: readonly ChoiceOption<T>[];
  value: T | null;
  invalid?: boolean;
  required?: boolean;
  stacked?: boolean;
  /** Short labels kept on one row in a narrow column (the form of address in Settings). */
  compact?: boolean;
  groupRef?: (el: HTMLDivElement | null) => void;
  onPick: (id: T) => void;
}) {
  const stop = value ?? options[0]?.id ?? null;
  const onKeyDown = (e: TargetedKeyboardEvent<HTMLDivElement>): void => {
    const step = RADIO_STEP[e.key];
    if (step === undefined) return;
    e.preventDefault();
    const n = options.length;
    const i = value === null ? (step > 0 ? -1 : 0) : options.findIndex((o) => o.id === value);
    const next = options[(i + step + n) % n];
    if (next === undefined) return;
    onPick(next.id);
    const group = e.currentTarget;
    requestAnimationFrame(() => {
      group.querySelector<HTMLElement>(`[data-choice="${next.id}"]`)?.focus();
    });
  };
  return (
    <div
      ref={groupRef ?? null}
      class={`sd-choices${stacked ? ' sd-choices-stacked' : ''}${compact ? ' sd-choices-compact' : ''}`}
      role="radiogroup"
      aria-labelledby={labelledBy}
      aria-describedby={describedBy}
      aria-invalid={invalid ? 'true' : undefined}
      aria-required={required ? 'true' : undefined}
      data-group={name}
      onKeyDown={onKeyDown}
    >
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          role="radio"
          data-choice={o.id}
          aria-checked={value === o.id}
          tabIndex={stop === o.id ? 0 : -1}
          class={`sd-button sd-button-small sd-choice${value === o.id ? ' sd-button-primary' : ''}`}
          onClick={() => onPick(o.id)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** The form of address options, in form order (Mr., Ms., Mrs., Dr., Tech.; profile.ts). */
export const ADDRESS_OPTIONS: readonly ChoiceOption<AddressId>[] = ADDRESS_IDS.map((id) => ({
  id,
  label: ADDRESSES[id].label,
}));

const ARRIVAL_OPTIONS: readonly ChoiceOption<ArrivalReason>[] = ARRIVAL_ORDER.map((id) => ({
  id,
  label: ARRIVAL_REASONS[id],
}));

/** The ID badge: the visor-down photo, the name as typed, and the grade. */
function Badge({ name }: { name: string }) {
  const shown = cleanName(name);
  return (
    <figure class="sd-intake-badge" data-voice="badge" aria-label="ID badge preview">
      <div class="sd-intake-photo">
        <Icon id="portrait.player" frame="neutral" class="sd-intake-portrait" />
        <figcaption class="sd-intake-photo-note">{INTAKE_COPY.badgePhoto}</figcaption>
      </div>
      <div class="sd-intake-badge-text">
        <p class="sd-intake-badge-brand">Everglow</p>
        <p class={`sd-intake-badge-name${shown === '' ? ' sd-dim' : ''}`} data-testid="badge-name">
          {shown === '' ? INTAKE_COPY.badgeBlank : shown}
        </p>
        <p class="sd-intake-badge-grade">JPT-1 · #ED-447</p>
      </div>
    </figure>
  );
}

/** The intake form. */
export function Intake() {
  const mode = intakeMode();
  const [form, setForm] = useState<IntakeForm>(BLANK_INTAKE);
  // Problems show once the player tries to sign, then follow the form live.
  const [tried, setTried] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const nameRef = useRef<HTMLInputElement | null>(null);
  const arrivalRef = useRef<HTMLDivElement | null>(null);
  // Off the prelude's last line (T1001), the form rises into place over the dimmed still, once.
  const [rises] = useState(() => intakeRises.peek());
  useLayoutEffect(() => {
    intakeRises.value = false;
  }, []);
  useEscape(() => {
    cancelIntake();
    return true;
  });
  const problems: IntakeProblems = tried ? intakeProblems(form) : {};
  const update = (patch: Partial<IntakeForm>): void => setForm((f) => ({ ...f, ...patch }));

  const focusFirstProblem = (p: IntakeProblems): void => {
    if (p.name !== undefined) nameRef.current?.focus();
    else if (p.arrival !== undefined) firstRadio(arrivalRef.current)?.focus();
  };
  const onSubmit = (e: Event): void => {
    e.preventDefault();
    setTried(true);
    const r = submitIntake(form);
    if (r.ok) return;
    if ('problems' in r) {
      setFailure(null);
      focusFirstProblem(r.problems);
    } else {
      setFailure(r.message);
    }
  };

  return (
    <main
      class={`sd-screen sd-menu sd-intake${rises ? ' sd-intake-rise' : ''}`}
      aria-labelledby="sd-intake-heading"
    >
      <section class="sd-panel sd-menu-panel sd-intake-panel">
        <header class="sd-menu-header">
          <div>
            <p class="sd-kicker" data-voice="kicker">
              {INTAKE_COPY.kicker}
            </p>
            <h1 id="sd-intake-heading" class="sd-menu-heading">
              {INTAKE_COPY.heading}
            </h1>
          </div>
          {/* The employee number is on the ID badge (T803c: once, where it's voice). */}
          <dl class="sd-intake-ids">
            <dt class="sd-visually-hidden">Grade</dt>
            <dd class="sd-dim">{INTAKE_COPY.grade}</dd>
          </dl>
        </header>
        <p class="sd-intake-intro" data-voice="intro">
          {mode?.kind === 'existing' ? INTAKE_COPY.introExisting : INTAKE_COPY.intro}
        </p>
        <form class="sd-intake-form" noValidate onSubmit={onSubmit}>
          <div class="sd-intake-grid">
            <div class="sd-intake-col">
              <div class="sd-intake-field">
                <label class="sd-field-label" for="sd-intake-name">
                  {INTAKE_COPY.nameLabel}
                </label>
                <input
                  id="sd-intake-name"
                  ref={(el) => {
                    nameRef.current = el;
                    focusOnce(el);
                  }}
                  class="sd-code sd-intake-name"
                  type="text"
                  autocomplete="off"
                  spellcheck={false}
                  maxLength={PLAYER_NAME.maxLength}
                  aria-required="true"
                  aria-invalid={problems.name !== undefined ? 'true' : undefined}
                  aria-describedby={
                    problems.name !== undefined ? 'sd-intake-name-problem' : 'sd-intake-name-hint'
                  }
                  value={form.name}
                  onInput={(e) => update({ name: e.currentTarget.value })}
                />
                {problems.name !== undefined ? (
                  <p id="sd-intake-name-problem" class="sd-message sd-warn" role="alert">
                    {problems.name}
                  </p>
                ) : (
                  <p id="sd-intake-name-hint" class="sd-message sd-dim sd-intake-focus-hint">
                    {INTAKE_COPY.nameHint}
                  </p>
                )}
              </div>
              <div class="sd-intake-field">
                <p id="sd-intake-address" class="sd-field-label">
                  {INTAKE_COPY.addressLabel}
                </p>
                <ChoiceGroup
                  name="address"
                  labelledBy="sd-intake-address"
                  describedBy="sd-intake-address-hint"
                  options={ADDRESS_OPTIONS}
                  value={form.address}
                  required={false}
                  compact
                  onPick={(address) => update({ address })}
                />
                <p id="sd-intake-address-hint" class="sd-message sd-dim">
                  {INTAKE_COPY.addressHint}
                </p>
              </div>
              <div class="sd-intake-field">
                <p id="sd-intake-arrival" class="sd-field-label">
                  {INTAKE_COPY.arrivalLabel}
                </p>
                <ChoiceGroup
                  name="arrival"
                  labelledBy="sd-intake-arrival"
                  describedBy={
                    problems.arrival !== undefined
                      ? 'sd-intake-arrival-problem'
                      : 'sd-intake-arrival-hint'
                  }
                  options={ARRIVAL_OPTIONS}
                  value={form.arrival}
                  invalid={problems.arrival !== undefined}
                  stacked
                  groupRef={(el) => {
                    arrivalRef.current = el;
                  }}
                  onPick={(arrival) => update({ arrival })}
                />
                {problems.arrival !== undefined ? (
                  <p id="sd-intake-arrival-problem" class="sd-message sd-warn" role="alert">
                    {problems.arrival}
                  </p>
                ) : (
                  <p id="sd-intake-arrival-hint" class="sd-message sd-dim">
                    {INTAKE_COPY.arrivalHint}
                  </p>
                )}
              </div>
            </div>
            <div class="sd-intake-col">
              <dl class="sd-intake-callsign">
                <dt class="sd-field-label">{INTAKE_COPY.callsignLabel}</dt>
                <dd class="sd-dim">{INTAKE_COPY.callsignValue}</dd>
              </dl>
              <Badge name={form.name} />
              <p
                class="sd-intake-note"
                aria-live="polite"
                data-testid="file-note"
                data-voice="file-note"
              >
                {previewText(SAMPLE_NOTE, form.address)}
              </p>
              <p class="sd-intake-small" data-voice="small-print">
                {INTAKE_COPY.smallPrint}
              </p>
            </div>
          </div>
          {failure !== null && (
            <p class="sd-message sd-warn sd-intake-failure" role="alert">
              {failure}
            </p>
          )}
          <footer class="sd-row sd-menu-footer">
            <button type="button" class="sd-button" onClick={cancelIntake}>
              {INTAKE_COPY.back}
            </button>
            <button type="submit" class="sd-button sd-button-primary">
              {INTAKE_COPY.submit}
            </button>
          </footer>
        </form>
      </section>
    </main>
  );
}

function firstRadio(group: HTMLElement | null): HTMLElement | null {
  return group?.querySelector<HTMLElement>('[role="radio"][tabindex="0"]') ?? null;
}
