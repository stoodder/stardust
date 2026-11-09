// Scenes that hold input (art-direction.md § Dialogue presentation; story/style-guide.md § 4): a
// bottom panel over the paused battle (a 48×48 portrait framed in the speaker's colour, the name
// plate, the typewriter, Next, and choices), or a full-screen scene on a dark stage with the
// lines so far above the current one (the party, the stinger). The briefing is the HUD's own
// (hud/Briefing.tsx). Esc skips to the next choice or the end (app/keys.ts routes it here).
import { hud } from '../state.ts';
import { NamePlate } from './CommsPanel.tsx';
import { plateColor } from './plate.ts';
import { LineText } from './LineText.tsx';
import { Portrait } from './Portrait.tsx';
import { ChoiceList, NextButton, trapTab, useSceneStep, type SceneStep } from './SceneParts.tsx';
import { plainText } from './text.ts';
import { dialogue, type LineView, type SceneView } from './state.ts';
import './dialogue.css';

/** The line on screen: portrait, plate, and typed text; a narrator's is a centered caption. */
function CurrentLine({ line, step }: { line: LineView; step: SceneStep }) {
  if (line.frame === 'caption') {
    return (
      <p class="dlg-caption" onClick={step.next}>
        <LineText line={line} typed={step.typed} />
      </p>
    );
  }
  return (
    <div class={`dlg-line dlg-frame-${line.frame}`} onClick={step.next}>
      <Portrait line={line} talking={!step.typed.done} />
      <div class="dlg-words">
        <NamePlate line={line} />
        <LineText line={line} typed={step.typed} />
      </div>
    </div>
  );
}

/** The line a choice answers, whole and still (its portrait at rest). */
function Prompt({ line }: { line: LineView }) {
  return (
    <div class={`dlg-line prompt dlg-frame-${line.frame}`}>
      <Portrait line={line} talking={false} />
      <div class="dlg-words">
        <NamePlate line={line} />
        <span class="dlg-text">{plainText(line.text)}</span>
      </div>
    </div>
  );
}

/** Everything under the current line: choices, the "will remember", and Next. */
function Controls({ view, step }: { view: SceneView; step: SceneStep }) {
  return (
    <>
      {view.choices !== null && <ChoiceList choices={view.choices} />}
      {view.remember !== null && (
        <p class="dlg-remember" role="status">
          {view.remember}
        </p>
      )}
      <div class="dlg-actions">
        <NextButton step={step} lineKey={view.line?.id ?? (view.ended ? 'end' : 'choice')} />
      </div>
    </>
  );
}

/** A transcript row: the plate and the words (no portrait). */
export function TranscriptLine({ line }: { line: LineView }) {
  if (line.frame === 'caption') return <p class="dlg-caption past">{plainText(line.text)}</p>;
  return (
    <p class="dlg-past">
      {line.name !== '' && (
        <span class="dlg-name" style={{ color: plateColor(line.color) }}>
          {line.name}
        </span>
      )}
      <span class="dlg-text">{line.silence ? '…' : plainText(line.text)}</span>
    </p>
  );
}

/** The last few lines a full-screen scene keeps up above the current one. */
const FULLSCREEN_HISTORY = 4;

function ScenePanel({ view }: { view: SceneView }) {
  const step = useSceneStep(view);
  const full = view.mode === 'fullscreen';
  const prompt = view.transcript.at(-1);
  return (
    <div class={full ? 'dlg-stage' : 'dlg-scrim'} data-act={hud.act.value}>
      <section
        class={full ? 'dlg-fullscreen' : 'dlg-panel chamfer'}
        role="dialog"
        aria-modal="true"
        aria-label={full ? 'Scene' : 'Comms'}
        data-testid="scene"
        onKeyDown={trapTab}
      >
        {full && (
          <div class="dlg-history" aria-hidden="true">
            {view.transcript.slice(-FULLSCREEN_HISTORY).map((l) => (
              <TranscriptLine key={l.id} line={l} />
            ))}
          </div>
        )}
        {view.line !== null && <CurrentLine line={view.line} step={step} />}
        {/* At a choice, the line it answers stays up above the options. */}
        {view.line === null && view.choices !== null && prompt !== undefined && !full && (
          <Prompt line={prompt} />
        )}
        <Controls view={view} step={step} />
      </section>
    </div>
  );
}

/** The scene holding input, over whatever screen is up (the briefing draws itself in the HUD). */
export function SceneLayer() {
  const view = dialogue.scene.value;
  if (view === null || view.mode === 'briefing') return null;
  return <ScenePanel key={view.sceneId} view={view} />;
}
