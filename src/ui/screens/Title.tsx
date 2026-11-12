// The title screen (T115, T209): the game's name over the animated backdrop (render BackdropScene)
// and the way into a campaign. With no saves, one big Start shift button starts a new campaign in
// slot 1, straight into its first briefing. With saves, Continue (the slot played last) leads, and
// New game, Load, and Import open their panels in place of the buttons. Copy: Everglow's slogan
// (story/races.md § Everglow Dynamics) and a loading tip from the Continue slot's presentation
// dials (its next map's act: Act I's "a clean perimeter is a happy perimeter!", Act II's "a clean
// perimeter."; story/style-guide.md §2), Act I's with no save to continue.
import { useState } from 'preact/hooks';
import {
  continueGame,
  loadGame,
  newGame,
  openSettings,
  resumeLongWalk,
  startGame,
} from '../../app/navigation.ts';
import { RESUME_LABEL } from '../../app/resume.ts';
import { continueSlot, deleteSave, rawSlotText, type SaveResult } from '../../app/save.ts';
import { MuteButton } from '../hud/MuteButton.tsx';
import { copyText } from './clipboard.ts';
import { useEscape } from './escape.ts';
import { focusOnce } from './focus.ts';
import { ImportPanel } from './ImportPanel.tsx';
import { SlotList } from './SlotList.tsx';
import { slots, type SlotView } from './state.ts';
import { titleTip } from './presentationText.ts';
import './screens.css';

type Panel = 'main' | 'new' | 'load' | 'import';

const PANEL_TITLE: Readonly<Record<Exclude<Panel, 'main'>, string>> = {
  new: 'New game · pick an empty slot',
  load: 'Load a campaign',
  import: 'Import a shift code',
};

/** The main buttons: Start shift with no saves, else Continue and the rest. */
function MainButtons({ open, act }: { open: (p: Panel) => void; act: (r: SaveResult) => void }) {
  const hasSaves = slots.value.some((s) => s.status !== 'empty');
  const canContinue = continueSlot() !== null;
  // The finale's run waits at a checkpoint (D154): Continue offers picking the walk back up first.
  const last = slots.value.find((v) => v.slot === continueSlot());
  const pending = last?.status === 'ok' && last.pending === true;
  const full = slots.value.every((s) => s.status !== 'empty');
  return (
    <div class="sd-title-menu">
      {pending && (
        <button
          type="button"
          class="sd-button sd-button-primary sd-title-start"
          data-testid="title-resume"
          // Focused on arrival, so Enter picks the walk back up.
          ref={focusOnce}
          onClick={() => act(resumeLongWalk())}
        >
          {RESUME_LABEL}
        </button>
      )}
      {hasSaves ? (
        <button
          type="button"
          class={pending ? 'sd-button sd-title-start' : 'sd-button sd-button-primary sd-title-start'}
          disabled={!canContinue}
          // Focused on arrival, so Enter continues (after the resume, when one waits).
          ref={pending ? null : focusOnce}
          onClick={() => act(continueGame())}
        >
          Continue
        </button>
      ) : (
        <button
          type="button"
          class="sd-button sd-button-primary sd-title-start"
          // Focused on arrival, so Enter starts.
          ref={focusOnce}
          onClick={() => act(startGame())}
        >
          Start shift
        </button>
      )}
      <div class="sd-row">
        {hasSaves && (
          <>
            <button
              type="button"
              class="sd-button"
              disabled={full}
              title={full ? 'Every slot is taken: delete one in Load first' : undefined}
              onClick={() => open('new')}
            >
              New game
            </button>
            <button type="button" class="sd-button" onClick={() => open('load')}>
              Load
            </button>
          </>
        )}
        <button type="button" class="sd-button" onClick={() => open('import')}>
          Import code
        </button>
        <button type="button" class="sd-button" onClick={openSettings}>
          Settings
        </button>
      </div>
    </div>
  );
}

/** Load's row actions: Load (or Copy raw data for an unreadable slot) and Delete, which asks. */
function LoadActions({
  view,
  confirming,
  setConfirming,
  act,
  setMessage,
}: {
  view: SlotView;
  confirming: boolean;
  setConfirming: (slot: 1 | 2 | 3 | null) => void;
  act: (r: SaveResult) => void;
  setMessage: (m: string | null) => void;
}) {
  if (view.status === 'empty') return null;
  if (confirming) {
    return (
      <>
        <button
          type="button"
          class="sd-button sd-button-small sd-button-danger"
          ref={focusOnce}
          onClick={() => {
            deleteSave(view.slot);
            setConfirming(null);
          }}
        >
          Yes, delete
        </button>
        <button type="button" class="sd-button sd-button-small" onClick={() => setConfirming(null)}>
          Keep
        </button>
      </>
    );
  }
  const copyRaw = async (): Promise<void> => {
    const raw = rawSlotText(view.slot);
    const ok = raw !== null && (await copyText(raw));
    setMessage(
      ok
        ? `Slot ${view.slot}'s raw data is on your clipboard. Keep it somewhere safe!`
        : "Your browser wouldn't let us copy it. Sorry about that!",
    );
  };
  return (
    <>
      {view.status === 'ok' ? (
        <button
          type="button"
          class="sd-button sd-button-small sd-button-primary"
          onClick={() => act(loadGame(view.slot))}
        >
          Load
        </button>
      ) : (
        <button type="button" class="sd-button sd-button-small" onClick={() => void copyRaw()}>
          Copy raw data
        </button>
      )}
      <button
        type="button"
        class="sd-button sd-button-small"
        aria-label={`Delete slot ${view.slot}`}
        onClick={() => setConfirming(view.slot)}
      >
        Delete
      </button>
    </>
  );
}

/** The title screen. */
export function Title() {
  const [panel, setPanel] = useState<Panel>('main');
  const [message, setMessage] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<1 | 2 | 3 | null>(null);
  const open = (p: Panel): void => {
    setPanel(p);
    setMessage(null);
    setConfirming(null);
  };
  const act = (r: SaveResult): void => setMessage(r.ok ? null : r.message);
  // Esc (T212): a Delete confirm says Keep; a panel goes back to the main buttons.
  useEscape(() => {
    if (confirming !== null) {
      setConfirming(null);
      return true;
    }
    if (panel === 'main') return false;
    open('main');
    return true;
  });

  return (
    <main
      class={`sd-screen sd-title${panel === 'main' ? '' : ' sd-title-paneled'}`}
      aria-labelledby="sd-title-heading"
    >
      <div class="sd-title-brand">
        <span class="sd-title-chevron" aria-hidden="true">
          ››
        </span>
        <span>EVERGLOW · Brighter Every Day!</span>
        <span class="sd-title-chevron" aria-hidden="true">
          ‹‹
        </span>
      </div>
      <h1 id="sd-title-heading" class="sd-title-logo">
        Stardust
      </h1>
      {panel === 'main' ? (
        <MainButtons open={open} act={act} />
      ) : (
        <section class="sd-panel sd-title-panel" aria-labelledby="sd-title-panel-heading">
          <h2 id="sd-title-panel-heading" class="sd-panel-heading">
            {PANEL_TITLE[panel]}
          </h2>
          {panel === 'import' ? (
            <ImportPanel onCancel={() => open('main')} />
          ) : (
            <>
              <SlotList
                slots={slots.value}
                label={PANEL_TITLE[panel]}
                actions={(view) =>
                  panel === 'new' ? (
                    view.status === 'empty' ? (
                      <button
                        type="button"
                        class="sd-button sd-button-small sd-button-primary"
                        onClick={() => act(newGame(view.slot))}
                      >
                        Start here
                      </button>
                    ) : (
                      <span class="sd-dim">Taken</span>
                    )
                  ) : (
                    <LoadActions
                      view={view}
                      confirming={confirming === view.slot}
                      setConfirming={setConfirming}
                      act={act}
                      setMessage={setMessage}
                    />
                  )
                }
              />
              <div class="sd-row">
                <button
                  type="button"
                  class="sd-button"
                  ref={focusOnce}
                  onClick={() => open('main')}
                >
                  Back
                </button>
              </div>
            </>
          )}
        </section>
      )}
      {message !== null && (
        <p class="sd-message sd-title-message" role="status">
          {message}
        </p>
      )}
      <MuteButton class="sd-title-sound" />
      <p class="sd-title-tip" data-testid="title-tip">
        <span class="sd-title-tip-label">Tip</span> {titleTip(slots.value, continueSlot())}
      </p>
    </main>
  );
}
