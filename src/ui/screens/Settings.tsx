// Settings (T209): sound (mute and the three volumes, app/settings.ts, which the audio engine
// follows live), the campaign's difficulty (Standard or Story, progression.md § 9: changeable any
// time between maps), the player's file (T306: name and form of address; the callsign and the
// reason for joining show read-only), and the save's export and import codes. Difficulty and Export
// need a save in play; from the Title they explain that instead.
import { useState } from 'preact/hooks';
import { closeSettings, watchArrival } from '../../app/navigation.ts';
import { exportActive, setDifficulty } from '../../app/save.ts';
import { setAudioSettings, settings, toggleMute, type AudioSettings } from '../../app/settings.ts';
import { editProfile } from '../../app/profile.ts';
import {
  ARRIVAL_REASONS,
  CALLSIGNS,
  PLAYER_NAME,
  type AddressId,
} from '../../content/dialogue/profile.ts';
import { copyText } from './clipboard.ts';
import { ADDRESS_OPTIONS, ChoiceGroup } from './Intake.tsx';
import { useEscape } from './escape.ts';
import { focusOnce } from './focus.ts';
import { ImportPanel } from './ImportPanel.tsx';
import { campaign, type Difficulty, type ProfileView } from './state.ts';
import './screens.css';

type Volume = Exclude<keyof AudioSettings, 'muted'>;

const VOLUMES: readonly { readonly id: Volume; readonly label: string }[] = [
  { id: 'master', label: 'Master' },
  { id: 'music', label: 'Music' },
  { id: 'sfx', label: 'Effects' },
];

const DIFFICULTIES: readonly {
  readonly id: Difficulty;
  readonly label: string;
  readonly blurb: string;
}[] = [
  { id: 'standard', label: 'Standard', blurb: 'As designed.' },
  {
    id: 'story',
    label: 'Story',
    blurb: 'Softer pests, more credits, a sturdier core. Same rewards, no catch.',
  },
];

function Sound() {
  const a = settings.value.audio;
  return (
    <fieldset class="sd-fieldset">
      <legend class="sd-field-label">Sound</legend>
      <button
        type="button"
        class="sd-button sd-button-small"
        aria-pressed={a.muted}
        onClick={toggleMute}
      >
        {a.muted ? 'Sound off (M)' : 'Sound on (M)'}
      </button>
      {VOLUMES.map((v) => (
        <label key={v.id} class="sd-slider">
          <span class="sd-slider-label">{v.label}</span>
          <input
            type="range"
            min={0}
            max={100}
            step={5}
            value={Math.round(a[v.id] * 100)}
            aria-label={v.label}
            aria-valuetext={`${Math.round(a[v.id] * 100)}%`}
            onInput={(e) => setAudioSettings({ [v.id]: Number(e.currentTarget.value) / 100 })}
          />
          <span class="sd-slider-value" aria-hidden="true">
            {Math.round(a[v.id] * 100)}
          </span>
        </label>
      ))}
    </fieldset>
  );
}

/** Arrow keys in the difficulty group: which way each moves the pick. */
const RADIO_STEP: Readonly<Record<string, number>> = {
  ArrowLeft: -1,
  ArrowUp: -1,
  ArrowRight: 1,
  ArrowDown: 1,
};

function DifficultyPick() {
  const view = campaign.value;
  const [error, setError] = useState<string | null>(null);
  const pick = (d: Difficulty): void => {
    const r = setDifficulty(d);
    setError(r.ok ? null : r.message);
  };
  return (
    <fieldset class="sd-fieldset">
      <legend class="sd-field-label">Difficulty</legend>
      {view === null ? (
        <p class="sd-message sd-dim">Load a campaign to pick its difficulty.</p>
      ) : (
        <>
          {/* One Tab stop; the arrows move the pick (the WAI-ARIA radio group pattern; D059). */}
          <div
            class="sd-row sd-row-left"
            role="radiogroup"
            aria-label="Difficulty"
            onKeyDown={(e) => {
              const step = RADIO_STEP[e.key];
              if (step === undefined) return;
              e.preventDefault();
              const i = DIFFICULTIES.findIndex((d) => d.id === view.difficulty);
              const n = DIFFICULTIES.length;
              const next = DIFFICULTIES[(i + step + n) % n]!; // n > 0
              pick(next.id);
              const group = e.currentTarget;
              requestAnimationFrame(() => {
                group.querySelector<HTMLElement>(`[data-difficulty="${next.id}"]`)?.focus();
              });
            }}
          >
            {DIFFICULTIES.map((d) => (
              <button
                key={d.id}
                type="button"
                role="radio"
                data-difficulty={d.id}
                aria-checked={view.difficulty === d.id}
                tabIndex={view.difficulty === d.id ? 0 : -1}
                class={`sd-button sd-button-small${view.difficulty === d.id ? ' sd-button-primary' : ''}`}
                onClick={() => pick(d.id)}
              >
                {d.label}
              </button>
            ))}
          </div>
          <p class="sd-message sd-dim">
            {DIFFICULTIES.find((d) => d.id === view.difficulty)?.blurb}
          </p>
          {error !== null && (
            <p class="sd-message sd-warn" role="alert">
              {error}
            </p>
          )}
        </>
      )}
    </fieldset>
  );
}

/**
 * The player's file (T306; core-loop.md § 6.1): the name and form of address can change here; the
 * callsign is the story's (dialogue `set` nodes) and the reason for joining is final, so both
 * show read-only.
 */
function TechnicianFile() {
  const view = campaign.value;
  const profile = view?.profile ?? null;
  return (
    <fieldset class="sd-fieldset sd-file">
      <legend class="sd-field-label">Your file</legend>
      {view === null ? (
        <p class="sd-message sd-dim">Load a campaign to update your file.</p>
      ) : profile === null ? (
        <p class="sd-message sd-dim">Your intake form opens when you continue this campaign.</p>
      ) : (
        <FileEditor profile={profile} />
      )}
    </fieldset>
  );
}

function FileEditor({ profile }: { profile: ProfileView }) {
  const [name, setName] = useState(profile.name);
  const [address, setAddress] = useState<AddressId>(profile.address);
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);
  const changed = name !== profile.name || address !== profile.address;
  const save = (e: Event): void => {
    e.preventDefault();
    const r = editProfile(name, address);
    setNote(
      r.ok
        ? { ok: true, text: 'Filed! Your name tag is being reprinted.' }
        : { ok: false, text: r.message },
    );
  };
  return (
    <form class="sd-file-form" noValidate onSubmit={save}>
      <label class="sd-file-row">
        <span class="sd-slider-label">Name</span>
        <input
          class="sd-code sd-file-name"
          type="text"
          autocomplete="off"
          spellcheck={false}
          maxLength={PLAYER_NAME.maxLength}
          value={name}
          aria-invalid={note !== null && !note.ok ? 'true' : undefined}
          onInput={(e) => {
            setName(e.currentTarget.value);
            setNote(null);
          }}
        />
      </label>
      <div class="sd-file-row sd-file-row-stack">
        <span id="sd-file-address" class="sd-slider-label">
          Form of address
        </span>
        <ChoiceGroup
          name="address"
          labelledBy="sd-file-address"
          options={ADDRESS_OPTIONS}
          value={address}
          required={false}
          compact
          onPick={(p) => {
            setAddress(p);
            setNote(null);
          }}
        />
      </div>
      <dl class="sd-file-facts">
        <div>
          <dt class="sd-slider-label">Callsign</dt>
          <dd>{CALLSIGNS[profile.callsign]}</dd>
        </div>
        <div>
          <dt class="sd-slider-label">Reason</dt>
          <dd>
            {profile.arrival === null ? 'Not on file' : ARRIVAL_REASONS[profile.arrival]}
            <span class="sd-dim"> · final</span>
          </dd>
        </div>
      </dl>
      {note !== null && (
        <p
          class={`sd-message ${note.ok ? 'sd-ok' : 'sd-warn'}`}
          role={note.ok ? 'status' : 'alert'}
        >
          {note.text}
        </p>
      )}
      <div class="sd-row sd-row-left">
        <button type="submit" class="sd-button sd-button-small" disabled={!changed}>
          Update file
        </button>
      </div>
    </form>
  );
}

function Codes() {
  const view = campaign.value;
  const [code, setCode] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  if (importing) return <ImportPanel onCancel={() => setImporting(false)} />;
  const make = async (): Promise<void> => {
    const c = await exportActive();
    setCode(c);
    setNote(null);
  };
  const copy = async (): Promise<void> => {
    if (code === null) return;
    const ok = await copyText(code);
    setNote(ok ? 'Copied! Paste it anywhere safe.' : 'Select the code and copy it (Ctrl+C).');
  };
  return (
    <fieldset class="sd-fieldset">
      <legend class="sd-field-label">Shift code</legend>
      {view === null ? (
        <p class="sd-message sd-dim">Load a campaign to export its code.</p>
      ) : code === null ? (
        <p class="sd-message sd-dim">
          A code carries this whole campaign to another browser or machine.
        </p>
      ) : (
        <textarea
          class="sd-code"
          rows={4}
          readOnly
          aria-label="Shift code"
          value={code}
          onFocus={(e) => e.currentTarget.select()}
        />
      )}
      {note !== null && (
        <p class="sd-message sd-ok" role="status">
          {note}
        </p>
      )}
      <div class="sd-row sd-row-left">
        {view !== null && (
          <button
            type="button"
            class="sd-button sd-button-small"
            onClick={() => void (code === null ? make() : copy())}
          >
            {code === null ? 'Export code' : 'Copy code'}
          </button>
        )}
        <button type="button" class="sd-button sd-button-small" onClick={() => setImporting(true)}>
          Import code
        </button>
      </div>
    </fieldset>
  );
}

/** The settings screen. Back returns to the menu it was opened from. */
export function Settings() {
  // Esc (T212) is Back, unless the import panel inside is open (it closes first).
  useEscape(() => {
    closeSettings();
    return true;
  });
  return (
    <main class="sd-screen sd-menu" aria-labelledby="sd-settings-heading">
      <section class="sd-panel sd-menu-panel">
        <header class="sd-menu-header">
          <div>
            <p class="sd-kicker">Everglow · Technician preferences</p>
            <h1 id="sd-settings-heading" class="sd-menu-heading">
              Settings
            </h1>
          </div>
        </header>
        <div class="sd-settings-grid">
          <div class="sd-settings-col">
            <Sound />
            <DifficultyPick />
          </div>
          <div class="sd-settings-col">
            <TechnicianFile />
            <Codes />
          </div>
        </div>
        <footer class="sd-row sd-menu-footer">
          {/* T1001: the prelude again, over Settings (no save needed; Esc or Skip ends it). */}
          <button
            type="button"
            class="sd-button"
            data-testid="watch-arrival"
            onClick={watchArrival}
          >
            Watch the arrival
          </button>
          <button
            type="button"
            class="sd-button sd-button-primary"
            ref={focusOnce}
            onClick={closeSettings}
          >
            Back
          </button>
        </footer>
      </section>
    </main>
  );
}
