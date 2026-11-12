// Top-right: speed and pause, the wave counter, the call-wave button (with its early-call bonus),
// and the next wave's preview with its countdown (core-loop §2.2): a NEW tag on a type the player
// has never met, a MAIL tag with the hold-fire glyph on a neutral (Gerald, R9), and on a map with
// two spawns, which spawn each group comes from: the groups by spawn, its name once before them
// (T803b; a spawn opening for the first time is flagged too).
import { callWave, setSpeed } from '../../app/commands.ts';
import { hud, speed } from '../state.ts';
import { Icon } from './Icon.tsx';
import { alignPulse } from './pulse.ts';
import { Glyph, HOLD_GLYPH, Key } from './parts.tsx';
import { revokedHud } from './revokedState.ts'; // T606
import { nextHeld } from './finaleState.ts'; // T832
import { endlessNextLine, endlessRun, fastestSpeed } from '../../app/postGameHooks.ts'; // T863

/** Top-right: speed and pause. */
export function SpeedControls() {
  const s = speed.value;
  const btn = (value: 0 | 1 | 2 | 3, text: string, label: string, key: string) => (
    <button
      type="button"
      class="hud-btn chamfer square"
      aria-pressed={s === value}
      aria-label={label}
      title={`${label} (${key})`}
      onClick={() => setSpeed(value)}
    >
      {text}
    </button>
  );
  return (
    <div class="hud-speed" role="group" aria-label="Game speed">
      {btn(0, 'II', 'Pause', 'Space')}
      {btn(1, '1x', 'Normal speed', 'F')}
      {btn(2, '2x', 'Double speed', 'F')}
      {/* T863: 3x unlocks once the finale is won (core-loop.md § 2.8). */}
      {fastestSpeed.value === 3 && btn(3, '3x', 'Triple speed', 'F')}
    </div>
  );
}

/** Longest spawn chip the preview shows (8 px Silkscreen: ~48 px). */
const SPAWN_CHIP_CHARS = 8;
/** A spawn name's last word that says nothing on its own ("Bore road" is the Bore's). */
const SPAWN_GENERIC_WORDS = new Set(['road', 'field', 'path', 'lane', 'route', 'trail']);
/** Compass words, shown as capitals ("Rift ne" → "Rift NE"). */
const COMPASS_WORDS = new Set(['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw']);
/** A compass word's letter, for a name too long to show whole ("Rift East" → "Rift E"). */
const COMPASS_LETTERS: Readonly<Record<string, string>> = {
  north: 'N',
  south: 'S',
  east: 'E',
  west: 'W',
};

/**
 * A spawn's chip in the preview (T803b: words, never cryptic initials): its name without a generic
 * last word ("Bore road" → "Bore", "Rift field" → "Rift"), compass words in capitals ("Rift NE"),
 * a long name's compass word as its letter ("Rift East" → "Rift E"), and failing that its first
 * word (cut to SPAWN_CHIP_CHARS). The group's tooltip and screen-reader label carry the full name.
 */
export function spawnShort(spawn: string): string {
  const words = spawn.split(' ').filter((w) => w !== '');
  const last = words.at(-1)?.toLowerCase() ?? '';
  if (words.length > 1 && SPAWN_GENERIC_WORDS.has(last)) words.pop();
  const shown = words.map((w) => (COMPASS_WORDS.has(w.toLowerCase()) ? w.toUpperCase() : w));
  const whole = shown.join(' ');
  if (whole.length <= SPAWN_CHIP_CHARS) return whole;
  // Still long: a compass word to its letter ("Rift East" → "Rift E"), else the first word.
  const terse = shown.map((w) => COMPASS_LETTERS[w.toLowerCase()] ?? w).join(' ');
  if (terse.length <= SPAWN_CHIP_CHARS) return terse;
  return (shown[0] ?? whole).slice(0, SPAWN_CHIP_CHARS);
}

/**
 * The preview's groups in spawn order (T803b): each spawn's groups together, in the order the spawns
 * first appear, so its chip shows once, on the first of them (`chip`), not on every row.
 */
export function bySpawn<G extends { readonly spawn: string | null }>(
  groups: readonly G[],
): { readonly group: G; readonly chip: boolean }[] {
  const order: (string | null)[] = [];
  for (const g of groups) if (!order.includes(g.spawn)) order.push(g.spawn);
  const out: { group: G; chip: boolean }[] = [];
  for (const spawn of order) {
    let first = true;
    for (const g of groups) {
      if (g.spawn !== spawn) continue;
      out.push({ group: g, chip: first && spawn !== null });
      first = false;
    }
  }
  return out;
}

/**
 * Top-right: the wave counter, the call-wave button (with what an early call pays), and the next
 * wave's preview with its countdown.
 */
export function WavePanel() {
  const wave = hud.wave.value;
  const count = hud.waveCount.value;
  const next = hud.nextWave.value;
  const ended = hud.outcome.value !== 'playing';
  const countdown = hud.countdown.value;
  const bonus = hud.callBonus.value;
  const walking = hud.nextWalking.value;
  // T863: an Endless run names the next wave's counter block (and, near its end, the next one's).
  const run = endlessRun.value;
  const endless = run !== null && run.map === hud.mapId.value;
  const block = endless && next !== null ? endlessNextLine(run, next.number) : null;
  // T606: QUILL's lockout hides the preview's threats (it never shows anything false).
  const restricted = revokedHud.value.previewHidden;
  const named = next?.groups.some((g) => g.spawn !== null) === true;
  const leak = revokedHud.value.leakLine;
  // A `noCall` wave walks in on its own (the Quiet Wave, D097; A2M5's W6): no button, no bonus.
  const callLabel =
    next === null || hud.nextNoCall.value
      ? null
      : wave === 0
        ? `Start wave ${next.number}`
        : `Call wave ${next.number} early${bonus > 0 ? `, +${bonus} credits` : ''}`;
  return (
    <section class="hud-waves chamfer" aria-label="Waves">
      <div class="hud-wave-row">
        <span class="hud-label">Wave</span>
        <span
          class="big num"
          data-critical="wave"
          aria-label={endless ? `Wave ${wave}` : `Wave ${wave} of ${count}`}
        >
          {wave}
          {/* Endless runs on with no last wave to count to (T863). */}
          {!endless && <span class="dim">/{count}</span>}
        </span>
        {callLabel !== null && (
          <button
            type="button"
            class={hud.callPulse.value ? 'hud-btn chamfer call pulse' : 'hud-btn chamfer call'}
            ref={(el) => alignPulse(el)}
            aria-label={callLabel}
            title={`${callLabel} (W)`}
            // Nothing to call while a wave is still spawning: the next countdown hasn't started.
            aria-disabled={ended || (wave > 0 && countdown === null)}
            onClick={callWave}
          >
            {wave === 0 ? 'Start' : 'Call'}
            {bonus > 0 && (
              <span class="hud-bonus num gold">
                +{bonus}
                <Icon id="icon.credits" />
              </span>
            )}
            <Key k="W" />
          </button>
        )}
      </div>
      {next !== null && (
        <ul class="hud-preview" data-critical="preview" aria-label={`Next: wave ${next.number}`}>
          {/* On a map that names its spawns, the first spawn's chip heads the row in the label's
              place (T803b): "Warren ×1 ×6" under the wave counter reads as the next wave. */}
          {(restricted || !named) && <li class="hud-label">Next</li>}
          {/* QUILL's lockout (T606, T631): the threats hidden behind ACCESS RESTRICTED and a
              struck blank where the icons were; its leak line under it, in its color. */}
          {restricted && (
            <li class="hud-restricted-row" aria-label="Access restricted">
              <span class="hud-restricted">
                <Icon id="icon.lock" />
                <span data-testid="preview-restricted">ACCESS RESTRICTED</span>
              </span>
            </li>
          )}
          {restricted && <li class="hud-restricted-blank" aria-hidden="true" />}
          {restricted && leak !== null && (
            <li
              class="hud-leak-line"
              data-testid="preview-leak"
              data-voice="leak-line"
              aria-label={`QUILL: ${leak}`}
            >
              <span class="hud-leak-who">QUILL </span>
              {leak}
            </li>
          )}
          {!restricted &&
            bySpawn(next.groups).map(({ group: g, chip }) => {
              const where = `${g.air ? ', air' : ''}${g.spawn === null ? '' : `, from ${g.spawn}${g.newSpawn ? ', a new spawn' : ''}`}`;
              return (
                <li
                  key={`${g.enemy}:${g.air ? 'air' : 'ground'}:${g.spawn ?? ''}`}
                  class={`hud-preview-group${g.isNew ? ' new' : ''}`}
                  data-enemy={g.enemy}
                  aria-label={`${g.count} ${g.label}${g.neutral ? ', the mail: hold fire' : ''}${g.isNew ? ', new' : ''}${g.fast ? ', fast' : ''}${where}`}
                  title={`${g.label}${g.neutral ? ' (the mail: hold fire)' : ''}${g.fast ? ' (fast)' : ''}${g.air ? ' (air)' : ''}${g.spawn === null ? '' : ` (${g.spawn})`}`}
                >
                  {/* Its spawn's chip, once per spawn, before the first of its groups (T803b). */}
                  {chip && g.spawn !== null && (
                    <span class={`hud-spawn${g.newSpawn ? ' opens' : ''}`} aria-hidden="true">
                      {spawnShort(g.spawn)}
                    </span>
                  )}
                  <span class="hud-preview-icon">
                    <Icon id={g.icon} />
                    {g.isNew && (
                      <span class="hud-new hud-preview-new" aria-hidden="true">
                        New
                      </span>
                    )}
                  </span>
                  <span class="num">x{g.count}</span>
                  {g.fast && <Icon id="icon.tell.fast" class="hud-fast" />}
                  {g.air && <span class="hud-air">Air</span>}
                  {g.neutral && (
                    <span class="hud-mail">
                      <Glyph rects={HOLD_GLYPH} />
                      Mail
                    </span>
                  )}
                </li>
              );
            })}
          {block !== null && (
            <li class="hud-endless-block" data-testid="preview-endless" aria-label={block.spoken}>
              <span class="hud-label">{block.needs.length === 0 ? 'Warm-up' : 'Needs'}</span>
              {block.needs.length > 0 && <span> {block.needs.join(' ')}</span>}
              {block.coming !== null && (
                <span class="hud-endless-then">
                  <span class="hud-label"> Then</span> +{block.coming.join(' +')}
                </span>
              )}
            </li>
          )}
          {/* An Escort's next refugees (D138): a friendly chip, never a threat's. */}
          {walking > 0 && (
            <li
              class="hud-preview-group hud-walking"
              data-testid="preview-walking"
              aria-label={`${walking} refugees walking`}
              title="Refugees walking (get them out)"
            >
              <span class="hud-preview-icon">
                <Icon id="icon.refugee" />
              </span>
              <span class="num">+{walking}</span>
              <span class="hud-walking-word" aria-hidden="true">
                walking
              </span>
            </li>
          )}
          {countdown !== null && (
            <li class="hud-countdown" aria-label={`Starts in ${countdown} seconds`}>
              <span class="hud-label">in</span> <span class="num">{countdown}s</span>
            </li>
          )}
          {/* A wave held for its script phase (the finale's W19 waits for the Halls; T832): no
              countdown runs, so none shows. */}
          {countdown === null && nextHeld.value && (
            <li
              class="hud-countdown held"
              data-testid="preview-held"
              aria-label="Held until the choir reaches the Halls"
            >
              <span class="hud-label">Held</span>
            </li>
          )}
        </ul>
      )}
    </section>
  );
}
