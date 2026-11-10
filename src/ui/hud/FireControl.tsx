// Fire control beside the abilities (core-loop §2.7): Hold fire (all), always there, and Spare
// runners (all) once it unlocks.
import { toggleHoldFireAll, toggleSpareRunnersAll } from '../../app/commands.ts';
import { hud } from '../state.ts';
import { alignPulse } from './pulse.ts';
import { Key, noFocusOnPress, Glyph, HOLD_GLYPH, SPARE_GLYPH } from './parts.tsx';

/**
 * Hold fire (all), bottom-left beside the abilities (core-loop §2.7): the master switch, always
 * there. Pressed while every tower holds; its label says so too ("Held"), not only its color.
 * It pulses while Gerald (a neutral unit) is on the field until it's first used (A1M3's teach).
 */
export function HoldFireAllButton() {
  const on = hud.holdFireAll.value;
  const n = hud.holdingCount.value;
  const teach = hud.holdFireTeach.value && !on;
  const label = on
    ? 'Hold fire, all: on. Every turret is holding'
    : `Hold fire, all${n > 0 ? `: ${n} holding` : ''}`;
  return (
    <button
      type="button"
      class={`hud-btn hud-slot hud-fire chamfer${teach ? ' pulse' : ''}`}
      ref={(el) => alignPulse(el)}
      data-testid="hold-fire-all"
      aria-pressed={on}
      aria-label={label}
      title={
        on ? 'Every turret is holding. Fire again (Shift+H)' : 'Hold fire, all turrets (Shift+H)'
      }
      onMouseDown={noFocusOnPress}
      onClick={toggleHoldFireAll}
    >
      <Key k="Shift+H" />
      <Glyph rects={HOLD_GLYPH} />
      <span class="hud-fire-label">{on ? 'Held' : 'Hold'}</span>
    </button>
  );
}

/**
 * Spare runners (all), from A2M1 (hidden until it unlocks): Alt+H. It pulses while its teach shows
 * (T431: A2M1's first runner waves, until the filter is first used this run).
 */
export function SpareRunnersAllButton() {
  if (!hud.spareRunnersOpen.value) return null;
  const on = hud.spareRunnersAll.value;
  const teach = hud.spareRunnersTeach.value && !on;
  return (
    <button
      type="button"
      class={`hud-btn hud-slot hud-fire chamfer${teach ? ' pulse' : ''}`}
      ref={(el) => alignPulse(el)}
      data-testid="spare-runners-all"
      aria-pressed={on}
      aria-label={`Spare runners, all${on ? ': on' : ''}`}
      title={on ? 'Every turret spares runners (Alt+H)' : 'Spare runners, all turrets (Alt+H)'}
      onMouseDown={noFocusOnPress}
      onClick={toggleSpareRunnersAll}
    >
      <Key k="Alt+H" />
      <Glyph rects={SPARE_GLYPH} />
      <span class="hud-fire-label">{on ? 'Sparing' : 'Spare'}</span>
    </button>
  );
}
