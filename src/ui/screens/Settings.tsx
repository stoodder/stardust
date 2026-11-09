// Settings (T209): sound (mute and the three volumes, app/settings.ts, which the audio engine
// follows live), the campaign's difficulty (Standard or Story, progression.md § 9: changeable any
// time between maps), and the save's export and import codes. Difficulty and Export need a save
// in play; from the Title they explain that instead.
import { useState } from 'preact/hooks';
import { closeSettings } from '../../app/navigation.ts';
import { exportActive, setDifficulty } from '../../app/save.ts';
import { setAudioSettings, settings, toggleMute, type AudioSettings } from '../../app/settings.ts';
import { copyText } from './clipboard.ts';
import { useEscape } from './escape.ts';
import { focusOnce } from './focus.ts';
import { ImportPanel } from './ImportPanel.tsx';
import { campaign, type Difficulty } from './state.ts';
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
            aria-valuetext={`${Math.round(a[v.id] * 100)}%`}
            onInput={(e) => setAudioSettings({ [v.id]: Number(e.currentTarget.value) / 100 })}
          />
          <span class="sd-slider-value">{Math.round(a[v.id] * 100)}</span>
        </label>
      ))}
    </fieldset>
  );
}

function DifficultyPick() {
  const view = campaign.value;
  const [error, setError] = useState<string | null>(null);
  return (
    <fieldset class="sd-fieldset">
      <legend class="sd-field-label">Difficulty</legend>
      {view === null ? (
        <p class="sd-message sd-dim">Load a campaign to pick its difficulty.</p>
      ) : (
        <>
          <div class="sd-row sd-row-left" role="radiogroup" aria-label="Difficulty">
            {DIFFICULTIES.map((d) => (
              <button
                key={d.id}
                type="button"
                role="radio"
                aria-checked={view.difficulty === d.id}
                class={`sd-button sd-button-small${view.difficulty === d.id ? ' sd-button-primary' : ''}`}
                onClick={() => {
                  const r = setDifficulty(d.id);
                  setError(r.ok ? null : r.message);
                }}
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
            <Codes />
          </div>
        </div>
        <footer class="sd-row sd-menu-footer">
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
