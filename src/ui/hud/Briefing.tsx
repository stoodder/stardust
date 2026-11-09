// The map's static briefing (M1), a blocking modal over the battle: its lines, the threat-intel
// strip, and the medals on offer.
import { dismissBriefing } from '../../app/commands.ts';
import { hud, type BriefingLine, type MedalView, type ThreatIntelView } from '../state.ts';
import { changeLoadout } from '../../app/navigation.ts';
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

/** The focusable controls inside `root`, in tab order. */
function focusables(root: HTMLElement): HTMLElement[] {
  return [...root.querySelectorAll<HTMLElement>('button, [href], input, [tabindex]')].filter(
    (el) => el.tabIndex >= 0 && !el.hasAttribute('disabled'),
  );
}

/**
 * The map's static briefing (M1), a blocking modal over the battle until dismissed (its button,
 * Enter, or Esc, which app/keys.ts routes here wherever the focus is). The rest of the HUD is
 * `inert` while it's open, and Tab cycles inside it.
 */
export function Briefing({ lines }: { lines: readonly BriefingLine[] }) {
  const intel = hud.intel.value;
  const medals = hud.medals.value;
  return (
    <div class="hud-briefing-scrim">
      <section
        class="hud-briefing chamfer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="hud-briefing-heading"
        onKeyDown={(e) => {
          if (e.key !== 'Tab') return;
          const items = focusables(e.currentTarget);
          if (items.length === 0) return;
          const active = document.activeElement;
          const i = active instanceof HTMLElement ? items.indexOf(active) : -1;
          const next = e.shiftKey ? (i <= 0 ? items.length - 1 : i - 1) : (i + 1) % items.length;
          e.preventDefault();
          items[next]?.focus();
        }}
      >
        <h2 id="hud-briefing-heading" class="hud-briefing-title">
          Shift briefing
        </h2>
        <ul class="hud-briefing-lines">
          {lines.map((l, i) => (
            <li key={i}>
              {l.speaker !== null && <span class="hud-briefing-speaker">{l.speaker}</span>}
              <span class="hud-briefing-text">{l.text}</span>
            </li>
          ))}
        </ul>
        {intel !== null && <IntelStrip intel={intel} />}
        {medals.length > 0 && <BriefingMedals medals={medals} />}
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
            // Focused on arrival, so Enter (or Space) clocks in.
            ref={(el) => el?.focus()}
            onClick={dismissBriefing}
          >
            Clock in
          </button>
        </div>
      </section>
    </div>
  );
}
