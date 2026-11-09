// The in-map HUD (T106, T113; art-direction §9, core-loop §4): status top-left, waves and speed
// top-right, commander abilities bottom-left, build slots bottom-right, the selected tower's panel
// beside it (clear of its neighbours, T126), notices top center, and the keyboard tile cursor's
// announcement (a visually hidden aria-live region). Components read the `hud` signals (kept in sync by app/hud.ts) and act only through
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
import { lockedText } from '../../app/hud.ts';
import { Icon } from './Icon.tsx';
import { MuteButton } from './MuteButton.tsx';
import { placePanel, tickToward } from './layout.ts';
import { alignPulse } from './pulse.ts';
import { colorVar } from '../color.ts';
import { prefersReducedMotion } from '../motion.ts';
import './hud.css';

/** Build slots shown, whatever the loadout size (the loadout limit, CLAUDE.md). */
const SLOT_COUNT = 4;
/** The tower panel's size in game px (fixed, so it can be placed before it renders). */
export const PANEL_W = 124;
export const PANEL_H = 96;
/** Integrity at or below this shows the low-integrity alarm (art-direction §9: red at 5). */
const LOW_INTEGRITY = 5;

const PRIORITY_LABEL: Readonly<Record<TargetPriority, string>> = {
  first: 'First',
  last: 'Last',
  strong: 'Strong',
  close: 'Close',
};

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

/** Keeps a pointer press from focusing a button, so its focus ring doesn't linger (D026). */
const noFocusOnPress = (e: MouseEvent): void => e.preventDefault();

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
  const leak = hud.leak.value;
  const low = integrity <= LOW_INTEGRITY;
  return (
    <section class="hud-status chamfer" aria-label="Status">
      {/* A leak flashes the panel's edge red (D026); the key restarts it on every leak. */}
      {leak !== null && <span key={leak.id} class="hud-leak-flash chamfer" aria-hidden="true" />}
      <div
        class="hud-meter"
        role="status"
        aria-label={`${label} ${integrity}${low ? ', integrity low' : ''}`}
      >
        <Icon id="icon.core" />
        <span class="hud-label">
          {label}
          {/* Low integrity: a blinking alarm shape, not only a red number. */}
          {low && (
            <span class="hud-alarm" aria-hidden="true">
              !
            </span>
          )}
        </span>
        <span class={low ? 'big num danger' : 'big num'}>{integrity}</span>
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

/** One build slot (bottom-right). */
function BuildSlot({ index, slot }: { index: number; slot: BuildSlotView | undefined }) {
  if (slot === undefined) {
    return <div class="hud-slot empty chamfer" aria-hidden="true" />;
  }
  const locked = hud.lockedTowers.value.includes(slot.tower);
  const poor = hud.credits.value < slot.cost;
  const armed = hud.armedTower.value === slot.tower;
  // Onboarding (D026): the first slot pulses until the first tower is built.
  const teach = index === 0 && !hud.built.value && !locked && !poor && !armed;
  const state = `${locked ? 'locked' : poor ? 'poor' : ''}${teach ? ' pulse' : ''}`;
  const status = locked ? `, ${lockedText(slot)}` : poor ? ', not enough credits' : '';
  return (
    <button
      type="button"
      class={`hud-btn hud-slot chamfer ${state}`}
      ref={(el) => alignPulse(el)}
      aria-pressed={armed}
      aria-disabled={locked || poor}
      aria-label={`Build ${slot.label}, ${slot.cost} credits${status}`}
      title={locked ? lockedText(slot) : `${slot.label} (${index + 1})`}
      onMouseDown={noFocusOnPress}
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
  const cue = hud.countdownCue.value;
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
      title={`${a.label} (${a.key}): ${a.description}`}
      onMouseDown={noFocusOnPress}
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
      {/* A countdown starting pulses a ready slot once; the key restarts it each countdown. */}
      {ready && cue > 0 && <span key={cue} class="hud-ready-cue chamfer" aria-hidden="true" />}
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
  const others = hud.towerPoints.value.filter((p) => p.x !== t.x || p.y !== t.y);
  const { left, top } = placePanel(t.x, t.y, PANEL_W, PANEL_H, others);
  const credits = hud.credits.value;
  const max = t.upgradeCost === null;
  const poor = !max && credits < (t.upgradeCost ?? 0);
  // The upgrade teach (D028): the Upgrade button pulses while it's on.
  const teach = hud.upgradeHint.value && !max && !poor;
  const upgradeClass = `hud-btn chamfer wide${poor ? ' poor' : ''}${teach ? ' pulse' : ''}`;
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
      <p class="hud-stats">{t.stats}</p>
      <p class="hud-delta">{t.upgradeDelta === null ? '' : `Next: ${t.upgradeDelta}`}</p>
      <button
        type="button"
        class={upgradeClass}
        ref={(el) => alignPulse(el)}
        aria-disabled={max || poor}
        aria-label={
          max
            ? 'Max tier'
            : `Upgrade to tier ${t.tier + 1}, ${t.upgradeCost ?? 0} credits${t.upgradeDelta === null ? '' : `: ${t.upgradeDelta}`}`
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

/** What the keyboard tile cursor is on (T126), for screen readers; empty while it's hidden. */
function CursorAnnouncer() {
  return (
    <div class="hud-sr-only" role="status" aria-live="polite" data-testid="cursor-announce">
      {hud.cursor.value ?? ''}
    </div>
  );
}

/** The upgrade hint (D028), bottom center, while the teach is on and no tower is selected. */
function UpgradeHint() {
  if (!hud.upgradeHint.value || hud.selected.value !== null) return null;
  return (
    <div class="hud-hint-slot">
      <div class="hud-hint chamfer" role="status" aria-label="Click a turret to upgrade it (U)">
        Click a turret to upgrade it
        <Key k="U" />
      </div>
    </div>
  );
}

/**
 * The radio ticker (D026): one line at a time (a reply under its cue), top-left under the status
 * panel; never blocks.
 */
function Radio() {
  const r = hud.radio.value;
  return (
    <div class="hud-radio-slot" role="log" aria-live="polite" aria-label="Radio">
      {r !== null && (
        <div key={r.id} class="hud-radio chamfer">
          {/* A reply keeps its cue up above it, dimmed (D028). */}
          {r.cue !== null && (
            <div class="hud-radio-cue">
              <span class="hud-radio-name" style={{ color: colorVar(r.cue.color) }}>
                {r.cue.name}
              </span>
              <span class="hud-radio-text">{r.cue.text}</span>
            </div>
          )}
          <span class="hud-radio-name" style={{ color: colorVar(r.color) }}>
            {r.name}
          </span>
          <span class="hud-radio-text">{r.text}</span>
        </div>
      )}
    </div>
  );
}

/** The "WAVE n" banner as a wave starts (D026). */
function WaveBannerView() {
  const b = hud.waveBanner.value;
  if (b === null) return null;
  return (
    <div key={b.id} class="hud-wave-banner" aria-hidden="true">
      Wave {b.wave}
    </div>
  );
}

/** While paused: a light scrim over the playfield and a pinned PAUSED notice (D026). */
function PausedOverlay() {
  if (speed.value !== 0 || hud.outcome.value !== 'playing') return null;
  return (
    <>
      <div class="hud-paused-scrim" aria-hidden="true" />
      <div class="hud-paused chamfer" role="status">
        Paused
      </div>
    </>
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
function Briefing({ lines }: { lines: readonly BriefingLine[] }) {
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
      {/* Everything but the briefing: inert (unfocusable, unclickable) while the briefing is open. */}
      <div class="hud-play" inert={briefing !== null}>
        <PausedOverlay />
        <WaveBannerView />
        <StatusPanel />
        <Radio />
        <div class="hud-top-right">
          <div class="hud-top-row">
            <MuteButton />
            <SpeedControls />
          </div>
          <WavePanel />
        </div>
        <AbilityBar />
        <BuildBar />
        {selected !== null && <TowerPanel t={selected} />}
        <UpgradeHint />
        <Notice />
        <CursorAnnouncer />
      </div>
      {briefing !== null && <Briefing lines={briefing} />}
    </div>
  );
}
