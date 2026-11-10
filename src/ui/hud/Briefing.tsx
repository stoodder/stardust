// The map's briefing as a scene (T302b), a blocking modal over the battle: its lines in the comms
// style, the threat-intel strip, the medals on offer, and the optional objectives (T431).
import { dismissBriefing } from '../../app/commands.ts';
import { hud, type MedalView, type ObjectiveView, type ThreatIntelView } from '../state.ts';
import { changeLoadout } from '../../app/navigation.ts';
import { NamePlate } from '../dialogue/CommsPanel.tsx';
import { LineText } from '../dialogue/LineText.tsx';
import { Portrait } from '../dialogue/Portrait.tsx';
import {
  ChoiceList,
  LineAnnouncer,
  NextButton,
  trapTab,
  useFocusOn,
  useSceneStep,
} from '../dialogue/SceneParts.tsx';
import type { LineView, SceneView } from '../dialogue/state.ts';
import { plainText } from '../dialogue/text.ts';
import { loadoutChangeable } from '../screens/loadoutView.ts';
import { Icon } from './Icon.tsx';

/**
 * The briefing's threat-intel strip (T202d; campaign.md § 4.8): the map's threats as tell glyphs
 * with their names, then each required counter ("Required: Armor") with the owned towers that
 * answer it. Every glyph has its word beside it (art-direction §8: never the shape alone).
 */
function IntelStrip({ intel }: { intel: ThreatIntelView }) {
  return (
    <section class="hud-intel" aria-label="Threat intel" data-testid="threat-intel">
      <ul class="hud-intel-threats">
        <li class="hud-label">Threats</li>
        {intel.threats.map((t) => (
          <li key={t.id} class="hud-intel-threat">
            {t.glyph !== null && <Icon id={t.glyph} />}
            <span>{t.label}</span>
          </li>
        ))}
      </ul>
      {intel.required.map((r) => (
        <p key={r.counter} class="hud-intel-required">
          <span class="hud-intel-req">Required: {r.label}</span>
          <span class="hud-intel-answers">
            {r.answers.length === 0 ? 'Nothing owned answers it yet' : r.answers.join(', ')}
          </span>
        </p>
      ))}
    </section>
  );
}

/**
 * The map's medals in the briefing (T202d): each one's name and what earns it, with a lit diamond
 * for the ones already on file ("On file").
 */
function BriefingMedals({ medals }: { medals: readonly MedalView[] }) {
  return (
    <ul class="hud-briefing-medals" aria-label="Medals" data-testid="briefing-medals">
      {medals.map((m) => (
        <li
          key={m.id}
          class={m.held ? 'held' : ''}
          aria-label={`${m.name}: ${m.description}${m.held ? ' On file.' : ''}`}
        >
          <span class={m.held ? 'hud-medal earned' : 'hud-medal'} aria-hidden="true" />
          <span class="hud-briefing-medal-name">{m.name}</span>
          <span class="hud-briefing-medal-desc">{m.description}</span>
          {m.held && <span class="hud-briefing-medal-held">On file</span>}
        </li>
      ))}
    </ul>
  );
}

/**
 * The map's optional objectives in the briefing (T431; core-loop §2.13), under the medals and in
 * their grammar: the tracker's square, the name, what does it, and the Intel it pays ("+1 Intel"),
 * or "On file" once the save holds it (A2M1's Crew Logs).
 */
function BriefingObjectives({ objectives }: { objectives: readonly ObjectiveView[] }) {
  return (
    <ul class="hud-briefing-medals" aria-label="Optional objectives" data-testid="briefing-objectives">
      {objectives.map((o) => (
        <li
          key={o.id}
          class={o.held ? 'held' : ''}
          aria-label={`Optional: ${o.name}: ${o.description}${o.held ? ' On file.' : ` +${o.intel} Intel.`}`}
        >
          <span class={`hud-objective-box${o.held ? ' done' : ''}`} aria-hidden="true" />
          <span class="hud-briefing-medal-name">{o.name}</span>
          <span class="hud-briefing-medal-desc">{o.description}</span>
          {o.held ? (
            <span class="hud-briefing-medal-held">On file</span>
          ) : (
            <span class="hud-briefing-objective-intel">+{o.intel} Intel</span>
          )}
        </li>
      ))}
    </ul>
  );
}

/**
 * The map's briefing (story/style-guide.md § 4: before play, ≤ 8 lines), a scene in the comms
 * style and a blocking modal over the battle until Clock in (its button, or Esc, which
 * app/keys.ts routes here wherever the focus is). The speaker's portrait sits beside the lines so
 * far; the current one types, and Next (focused) reads on. Once it has played out, Clock in takes
 * the focus. With dialogue off (`?test=1`) the lines show whole at once. The threat intel and the
 * medals are always up. The rest of the HUD is `inert` while it's open, and Tab cycles inside it.
 */
export function Briefing({ view }: { view: SceneView }) {
  const intel = hud.intel.value;
  const medals = hud.medals.value;
  const objectives = hud.objectives.value;
  const step = useSceneStep(view);
  // The portrait shows whoever speaks now (or spoke last).
  const speaker = view.line ?? view.transcript.at(-1) ?? null;
  const clockIn = useFocusOn(view.ended, view.ended);
  return (
    <div class="hud-briefing-scrim">
      <section
        class="hud-briefing chamfer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="hud-briefing-heading"
        onKeyDown={trapTab}
      >
        <h2 id="hud-briefing-heading" class="hud-briefing-title">
          Shift briefing
        </h2>
        <div class="hud-briefing-comms">
          {speaker !== null && speaker.portrait !== null ? (
            <Portrait line={speaker} talking={view.line !== null && !step.typed.done} />
          ) : (
            <span class="hud-briefing-noportrait" aria-hidden="true" />
          )}
          <div class="hud-briefing-lines" data-testid="briefing-lines">
            {view.transcript.map((l) => (
              <BriefingRow key={l.id} line={l} />
            ))}
            {view.line !== null && (
              <p class="hud-briefing-line now" onClick={step.next}>
                <NamePlate line={view.line} />
                <LineText line={view.line} typed={step.typed} />
              </p>
            )}
            {view.choices !== null && <ChoiceList choices={view.choices} />}
            {view.remember !== null && (
              <p class="dlg-remember" role="status">
                {view.remember}
              </p>
            )}
            <div class="hud-briefing-next">
              <NextButton step={step} lineKey={view.line?.id ?? 'none'} />
            </div>
          </div>
        </div>
        <LineAnnouncer line={view.line} />
        {intel !== null && <IntelStrip intel={intel} />}
        {medals.length > 0 && <BriefingMedals medals={medals} />}
        {objectives.length > 0 && <BriefingObjectives objectives={objectives} />}
        <div class="hud-briefing-actions">
          {/* Back to the loadout screen, where it came before this map (T201). */}
          {loadoutChangeable.value && (
            <button type="button" class="hud-btn chamfer" onClick={changeLoadout}>
              Change loadout
            </button>
          )}
          <button
            type="button"
            class="hud-btn chamfer hud-briefing-go"
            // Focused once the briefing has played out (at once while dialogue is off), so Enter
            // (or Space) clocks in.
            ref={clockIn}
            onClick={dismissBriefing}
          >
            Clock in
          </button>
        </div>
      </section>
    </div>
  );
}

/** A line already said: its plate and words. */
function BriefingRow({ line }: { line: LineView }) {
  return (
    <p class="hud-briefing-line">
      <NamePlate line={line} />
      <span class="dlg-text">{plainText(line.text)}</span>
    </p>
  );
}
