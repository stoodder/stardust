// The comms panel (art-direction.md § Dialogue presentation; story-runtime.md § Barks): top-left
// under the status panel (at the top centre while a forced input waits, off A3M3's doors; D143;
// ui/hud/index.tsx), the speaker's portrait beside their name plate and the line as it
// types, auto-dismissed. It never pauses, blocks, or takes the keys. A line that answers the one
// before it (another speaker, same scene) shows under it, the cue dimmed above (D028). An optional
// reply button (core-loop.md § 6.10) sits under the text, small and mouse-first, gone with the line.
import { pressCommsButton } from '../../app/dialogue.ts';
import { plateColor } from './plate.ts';
import { LineText, useTypewriter } from './LineText.tsx';
import { Portrait } from './Portrait.tsx';
import { plainText } from './text.ts';
import { dialogue, type LineView } from './state.ts';
import './dialogue.css';

/** A speaker's name plate in their colour (none for the Hollow and the narrator). */
export function NamePlate({ line }: { line: LineView }) {
  if (line.name === '') return null;
  return (
    <span
      class={`dlg-name dlg-frame-${line.frame}`}
      data-voice="speaker"
      style={{ color: plateColor(line.color) }}
    >
      {line.frame === 'pa' && <span class="dlg-pa-icon" aria-hidden="true" />}
      {line.name}
    </span>
  );
}

/** The comms panel: a `log` region, so screen readers hear each line once, whole. */
export function CommsPanel() {
  const view = dialogue.comms.value;
  const typed = useTypewriter(view?.line ?? null, false);
  return (
    <div class="dlg-comms-slot" role="log" aria-live="polite" aria-label="Radio">
      {view !== null && (
        <div
          key={view.line.id}
          class={`dlg-comms chamfer${view.line.portrait === null ? ' no-portrait' : ''}`}
          data-testid="comms"
        >
          {view.cue !== null && (
            <div class="dlg-comms-cue">
              <NamePlate line={view.cue} />
              <span class="dlg-text">{plainText(view.cue.text)}</span>
            </div>
          )}
          <div class="dlg-comms-line">
            <Portrait line={view.line} talking={!typed.done} />
            <div class="dlg-comms-words">
              <NamePlate line={view.line} />
              <LineText line={view.line} typed={typed} />
              {/* The reply button shows once its line has typed out. */}
              {view.button !== null && typed.done && (
                <button type="button" class="hud-btn chamfer dlg-reply" onClick={pressCommsButton}>
                  {view.button}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
