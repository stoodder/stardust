// Top-right: speed and pause, the wave counter, the call-wave button (with its early-call bonus),
// and the next wave's preview with its countdown (core-loop §2.2).
import { callWave, setSpeed } from '../../app/commands.ts';
import { hud, speed } from '../state.ts';
import { Icon } from './Icon.tsx';
import { alignPulse } from './pulse.ts';
import { Key } from './parts.tsx';

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
  const callLabel =
    next === null
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
          {next.groups.map((g) => (
            <li
              key={`${g.enemy}:${g.air ? 'air' : 'ground'}`}
              class="hud-preview-group"
              aria-label={`${g.count} ${g.label}${g.air ? ', air' : ''}${g.fast ? ', fast' : ''}`}
              title={`${g.label}${g.fast ? ' (fast)' : ''}${g.air ? ' (air)' : ''}`}
            >
              <Icon id={g.icon} />
              <span class="num">x{g.count}</span>
              {g.fast && <Icon id="icon.tell.fast" class="hud-fast" />}
              {g.air && <span class="hud-air">Air</span>}
            </li>
          ))}
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
