// The in-map HUD (T106, T113; art-direction §9, core-loop §4): status top-left, waves and speed
// top-right, commander abilities bottom-left, build slots bottom-right, the selected tower's panel
// beside it, and notices top center. Components read the `hud` signals (kept in sync by app/hud.ts) and act only through
// app/commands.ts. Every control is a real <button> of at least 16×16 game px.
import { useEffect, useRef, useState } from 'preact/hooks';
import {
  callWave,
  cancel,
  cycleTargeting,
  dismissBriefing,
  pressAbility,
  pressBuildSlot,
  sellSelected,
  setSpeed,
  upgradeSelected,
} from '../../app/commands.ts';
import type { TargetPriority } from '../../content/types.ts';
import {
  hud,
  speed,
  type AbilityCooldownView,
  type AbilitySlotView,
  type BriefingLine,
  type BuildSlotView,
  type SelectedTowerView,
} from '../state.ts';
import { Icon } from './Icon.tsx';
import { placePanel, tickToward } from './layout.ts';
import './hud.css';

/** Build slots shown, whatever the loadout size (the loadout limit, CLAUDE.md). */
const SLOT_COUNT = 4;
/** The tower panel's size in game px (fixed, so it can be placed before it renders). */
export const PANEL_W = 100;
export const PANEL_H = 78;

const PRIORITY_LABEL: Readonly<Record<TargetPriority, string>> = {
  first: 'First',
  last: 'Last',
  strong: 'Strong',
  close: 'Close',
};

function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** A number that ticks toward `value` instead of jumping (art-direction § Look). */
function useTicker(value: number): number {
  const [shown, setShown] = useState(value);
  const shownRef = useRef(value);
  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const step = (now: number): void => {
      const next = prefersReducedMotion() ? value : tickToward(shownRef.current, value, now - last);
      last = now;
      shownRef.current = next;
      setShown(next);
      if (next !== value) raf = requestAnimationFrame(step);
    };
    if (shownRef.current !== value) raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return shown;
}

/** A small key-hint badge. */
function Key({ k }: { k: string }) {
  return (
    <span class="hud-key" aria-hidden="true">
      {k}
    </span>
  );
}

/** A credits amount: the gold chip and the number. */
function Credits({ value, short = false }: { value: number; short?: boolean }) {
  return (
    <span class={short ? 'hud-cost short' : 'hud-cost'}>
      <Icon id="icon.credits" />
      <span class="num">{value}</span>
    </span>
  );
}

/** Top-left: the meter (core integrity) and credits. */
function StatusPanel() {
  const credits = useTicker(hud.credits.value);
  const integrity = hud.integrity.value;
  const label = hud.meterLabel.value;
  return (
    <section class="hud-status chamfer" aria-label="Status">
      <div class="hud-meter" role="status" aria-label={`${label} ${integrity}`}>
        <Icon id="icon.core" />
        <span class="hud-label">{label}</span>
        <span class={integrity <= 5 ? 'big num danger' : 'big num'}>{integrity}</span>
      </div>
      <div class="hud-credits" aria-label={`Credits ${hud.credits.value}`}>
        <Icon id="icon.credits" />
        <span class="hud-label">Credits</span>
        <span class="big num gold">{credits}</span>
      </div>
    </section>
  );
}

/** Top-right: speed and pause. */
function SpeedControls() {
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
function WavePanel() {
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
            class="hud-btn chamfer call"
            aria-label={callLabel}
            title={`${callLabel} (W)`}
            // Nothing to call while a wave is still spawning: the next countdown hasn't started.
            aria-disabled={ended || (wave > 0 && countdown === null)}
            onClick={callWave}
          >
            {wave === 0 ? 'Start' : 'Call'}
            {bonus > 0 && <span class="hud-bonus num gold">+{bonus}</span>}
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
              aria-label={`${g.count} ${g.label}${g.air ? ', air' : ''}`}
            >
              <Icon id={g.icon} />
              <span class="num">x{g.count}</span>
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

/** One build slot (bottom-right). */
function BuildSlot({ index, slot }: { index: number; slot: BuildSlotView | undefined }) {
  if (slot === undefined) {
    return <div class="hud-slot empty chamfer" aria-hidden="true" />;
  }
  const locked = hud.lockedTowers.value.includes(slot.tower);
  const poor = hud.credits.value < slot.cost;
  const armed = hud.armedTower.value === slot.tower;
  const state = locked ? 'locked' : poor ? 'poor' : '';
  const status = locked ? ', locked' : poor ? ', not enough credits' : '';
  return (
    <button
      type="button"
      class={`hud-btn hud-slot chamfer ${state}`}
      aria-pressed={armed}
      aria-disabled={locked || poor}
      aria-label={`Build ${slot.label}, ${slot.cost} credits${status}`}
      title={`${slot.label} (${index + 1})`}
      onClick={() => pressBuildSlot(index)}
      onContextMenu={(e) => {
        e.preventDefault();
        cancel();
      }}
    >
      <Key k={String(index + 1)} />
      <Icon id={slot.icon} class="slot-icon" />
      {locked ? (
        <span class="hud-locked">
          <Icon id="icon.lock" />
        </span>
      ) : (
        <Credits value={slot.cost} short />
      )}
    </button>
  );
}

function BuildBar() {
  const slots = hud.slots.value;
  return (
    <nav class="hud-build" aria-label="Build">
      {Array.from({ length: SLOT_COUNT }, (_, i) => (
        <BuildSlot key={i} index={i} slot={slots[i]} />
      ))}
    </nav>
  );
}

/** The icon's size in game px: the cooldown wipe steps one pixel per 1/16. */
const ICON_PX = 16;

/** One commander ability slot (bottom-left): icon, hotkey, and the cooldown wipe and seconds. */
function AbilitySlot({ a, cd }: { a: AbilitySlotView; cd: AbilityCooldownView | undefined }) {
  const left = cd?.secondsLeft ?? 0;
  const ready = left === 0;
  const aiming = hud.aimingAbility.value === a.slot;
  const status = aiming
    ? ', aiming: click a target'
    : ready
      ? ', ready'
      : `, recharging, ${left} s`;
  return (
    <button
      type="button"
      class={`hud-btn hud-slot hud-ability chamfer ${ready ? 'ready' : 'charging'}`}
      aria-pressed={aiming}
      aria-disabled={!ready}
      aria-label={`${a.label}${status}`}
      title={`${a.label} (${a.key})`}
      onClick={() => pressAbility(a.slot)}
      onContextMenu={(e) => {
        e.preventDefault();
        cancel();
      }}
    >
      <Key k={a.key} />
      <span class="ability-icon">
        <Icon id={a.icon} class="slot-icon" />
        {!ready && (
          <span
            class="hud-wipe"
            style={{ height: `${Math.round((cd?.remaining ?? 0) * ICON_PX)}px` }}
          />
        )}
      </span>
      <span class="hud-cd num">{ready ? 'Ready' : `${left}s`}</span>
    </button>
  );
}

/** Bottom-left: the commander ability slots, and the aiming hint while one is aimed. */
function AbilityBar() {
  const slots = hud.abilities.value;
  if (slots.length === 0) return null;
  const cds = hud.abilityCooldowns.value;
  const aiming = hud.aimingAbility.value !== null;
  return (
    <nav class="hud-abilities" aria-label="Abilities">
      {slots.map((a, i) => (
        <AbilitySlot key={a.slot} a={a} cd={cds[i]} />
      ))}
      {aiming && (
        <div class="hud-aim-hint chamfer" role="status">
          Pick a target
          <span class="dim">
            <Key k="Esc" /> cancels
          </span>
        </div>
      )}
    </nav>
  );
}

/** Tier pips: filled up to the current tier. */
function Tier({ tier, max }: { tier: number; max: number }) {
  return (
    <span class="hud-tier" aria-label={`Tier ${tier} of ${max}`}>
      <span class="hud-label">T{tier}</span>
      {Array.from({ length: max }, (_, i) => (
        <span key={i} class={i < tier ? 'pip on' : 'pip'} />
      ))}
    </span>
  );
}

/** The selected tower's panel: upgrade, sell, and targeting, beside the tower. */
function TowerPanel({ t }: { t: SelectedTowerView }) {
  const { left, top } = placePanel(t.x, t.y, PANEL_W, PANEL_H);
  const credits = hud.credits.value;
  const max = t.upgradeCost === null;
  const poor = !max && credits < (t.upgradeCost ?? 0);
  return (
    <section
      class="hud-tower chamfer"
      style={{ left: `${left}px`, top: `${top}px`, width: `${PANEL_W}px`, height: `${PANEL_H}px` }}
      aria-label={`${t.label} tower`}
      onContextMenu={(e) => {
        e.preventDefault();
        cancel();
      }}
    >
      <header class="hud-tower-head">
        <Icon id={t.icon} />
        <span class="hud-name">{t.label}</span>
        <Tier tier={t.tier} max={t.maxTier} />
      </header>
      <button
        type="button"
        class={poor ? 'hud-btn chamfer wide poor' : 'hud-btn chamfer wide'}
        aria-disabled={max || poor}
        aria-label={
          max ? 'Max tier' : `Upgrade to tier ${t.tier + 1}, ${t.upgradeCost ?? 0} credits`
        }
        onClick={upgradeSelected}
      >
        <span class="grow">{max ? 'Max tier' : 'Upgrade'}</span>
        {!max && <Credits value={t.upgradeCost ?? 0} />}
        <Key k="U" />
      </button>
      <button
        type="button"
        class={t.fullRefund ? 'hud-btn chamfer wide full' : 'hud-btn chamfer wide'}
        aria-label={`Sell for ${t.sellValue} credits${t.fullRefund ? ', full refund' : ''}`}
        title={t.fullRefund ? 'Full refund: not fired yet' : 'Sell (70% back)'}
        onClick={sellSelected}
      >
        <span class="grow">Sell</span>
        <Credits value={t.sellValue} />
        <Key k="S" />
      </button>
      <button
        type="button"
        class="hud-btn chamfer wide"
        aria-disabled={t.priority === null}
        aria-label={
          t.priority === null
            ? 'Targeting: hits everything in range'
            : `Targeting: ${PRIORITY_LABEL[t.priority]}. Change`
        }
        onClick={cycleTargeting}
      >
        <span class="grow">
          Target{' '}
          <span class="accent">{t.priority === null ? 'All' : PRIORITY_LABEL[t.priority]}</span>
        </span>
        <Key k="T" />
      </button>
    </section>
  );
}

/** A short message (a rejected command), top center. */
function Notice() {
  const n = hud.notice.value;
  return (
    <div class="hud-notice-slot" role="status" aria-live="polite">
      {n !== null && (
        <div key={n.id} class="hud-notice chamfer">
          {n.text}
        </div>
      )}
    </div>
  );
}

/** The map's static briefing (M1), over the battle until dismissed (its button, Enter, or Esc). */
function Briefing({ lines }: { lines: readonly BriefingLine[] }) {
  return (
    <div class="hud-briefing-scrim">
      <section
        class="hud-briefing chamfer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="hud-briefing-heading"
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            e.preventDefault();
            dismissBriefing();
          }
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
        <button
          type="button"
          class="hud-btn chamfer hud-briefing-go"
          // Focused on arrival, so Enter (or Space) clocks in.
          ref={(el) => el?.focus()}
          onClick={dismissBriefing}
        >
          Clock in
        </button>
      </section>
    </div>
  );
}

/** The battle HUD. */
export function Hud() {
  const selected = hud.selected.value;
  const briefing = hud.briefing.value;
  return (
    <div class="hud" data-act={hud.act.value} data-testid="hud">
      <StatusPanel />
      <div class="hud-top-right">
        <SpeedControls />
        <WavePanel />
      </div>
      <AbilityBar />
      <BuildBar />
      {selected !== null && <TowerPanel t={selected} />}
      <Notice />
      {briefing !== null && <Briefing lines={briefing} />}
    </div>
  );
}
