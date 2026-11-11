// Top-right: speed and pause, the wave counter, the call-wave button (with its early-call bonus),
// and the next wave's preview with its countdown (core-loop §2.2): a NEW tag on a type the player
// has never met, a MAIL tag with the hold-fire glyph on a neutral (Gerald, R9), and on a map with
// two spawns, which spawn each group comes from (a spawn opening for the first time is flagged too).
import { callWave, setSpeed } from '../../app/commands.ts';
import { hud, speed } from '../state.ts';
import { Icon } from './Icon.tsx';
import { alignPulse } from './pulse.ts';
import { Glyph, HOLD_GLYPH, Key } from './parts.tsx';
import { revokedHud } from './revokedState.ts'; // T606

/** Top-right: speed and pause. */
export function SpeedControls() {
  const s = speed.value;
  const btn = (value: 0 | 1 | 2, text: string, label: string, key: string) => (
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
    </div>
  );
}

/** Longest spawn name the preview's chip shows whole. */
const SPAWN_CHIP_CHARS = 5;

/** A spawn's chip in the preview: its name ("West"), or its initials if long ("North Gate" → "NG"). */
export function spawnShort(spawn: string): string {
  if (spawn.length <= SPAWN_CHIP_CHARS) return spawn;
  return spawn
    .split(' ')
    .map((w) => w.charAt(0))
    .join('')
    .slice(0, SPAWN_CHIP_CHARS);
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
  // T606: QUILL's lockout hides the preview's threats (it never shows anything false).
  const restricted = revokedHud.value.previewHidden;
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
        <span class="big num" aria-label={`Wave ${wave} of ${count}`}>
          {wave}
          <span class="dim">/{count}</span>
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
        <ul class="hud-preview" aria-label={`Next: wave ${next.number}`}>
          <li class="hud-label">Next</li>
          {restricted && (
            <li class="hud-restricted" data-testid="preview-restricted">
              ACCESS RESTRICTED
            </li>
          )}
          {restricted && leak !== null && (
            <li class="hud-leak-line" data-testid="preview-leak">
              {leak}
            </li>
          )}
          {!restricted &&
            next.groups.map((g) => {
              const where = `${g.air ? ', air' : ''}${g.spawn === null ? '' : `, from ${g.spawn}${g.newSpawn ? ', a new spawn' : ''}`}`;
              return (
                <li
                  key={`${g.enemy}:${g.air ? 'air' : 'ground'}:${g.spawn ?? ''}`}
                  class={`hud-preview-group${g.isNew ? ' new' : ''}`}
                  data-enemy={g.enemy}
                  aria-label={`${g.count} ${g.label}${g.neutral ? ', the mail: hold fire' : ''}${g.isNew ? ', new' : ''}${g.fast ? ', fast' : ''}${where}`}
                  title={`${g.label}${g.neutral ? ' (the mail: hold fire)' : ''}${g.fast ? ' (fast)' : ''}${g.air ? ' (air)' : ''}${g.spawn === null ? '' : ` (${g.spawn})`}`}
                >
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
                  {g.spawn !== null && (
                    <span class={`hud-spawn${g.newSpawn ? ' opens' : ''}`} aria-hidden="true">
                      {spawnShort(g.spawn)}
                    </span>
                  )}
                </li>
              );
            })}
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
        </ul>
      )}
    </section>
  );
}
