// The in-map HUD (T106, T113; art-direction §9, core-loop §4): status top-left, waves and speed
// top-right, commander abilities bottom-left, build slots bottom-right, the selected tower's panel
// beside it (clear of its neighbours, T126), notices top center, and the keyboard tile cursor's
// announcement (a visually hidden aria-live region). Components read the `hud` signals (kept in
// sync by app/hud.ts) and act only through app/commands.ts; each lives in its own file here
// (T225). Every control is a real <button> of at least 16×16 game px.
import type { ComponentChildren } from 'preact';
import { CommsPanel } from '../dialogue/CommsPanel.tsx';
import { dialogue, sceneBlocks } from '../dialogue/state.ts';
import { MenuButton, PauseMenu } from '../pause/PauseMenu.tsx';
import { pauseMenu } from '../pause/state.ts';
import { hud } from '../state.ts';
import { MuteButton } from './MuteButton.tsx';
import { ForcedInputButton, ForcedInputVeil } from './ForcedInputButton.tsx'; // T605, T614
import { forcedInput, forcedInputAvoid } from './forcedInputState.ts';
import { AbilityBar } from './AbilityBar.tsx';
import { Briefing } from './Briefing.tsx';
import { BuildBar } from './BuildBar.tsx';
import { HoldFireAllButton, SpareRunnersAllButton } from './FireControl.tsx';
import {
  Notice,
  CursorAnnouncer,
  ActionAnnouncer,
  BottomHint,
  CheckpointCueView,
  WaveBannerView,
  PausedOverlay,
} from './Notices.tsx';
import { StatusPanel } from './StatusPanel.tsx';
import { TowerPanel } from './TowerPanel.tsx';
import { SpeedControls, WavePanel } from './WavePanel.tsx';
import './hud.css';
import './revoked.css'; // T606

/**
 * A part of the HUD a forced input locks (T614): inert while it waits, laid out as if the wrapper
 * weren't there (`display: contents`).
 */
function Lock({ locked, children }: { locked: boolean; children: ComponentChildren }) {
  return (
    <div class="hud-lock" inert={locked}>
      {children}
    </div>
  );
}

/** The battle HUD. */
export function Hud() {
  const selected = hud.selected.value;
  const briefing = dialogue.scene.value?.mode === 'briefing' ? dialogue.scene.value : null;
  const open = hud.briefing.value !== null || sceneBlocks.value || pauseMenu.value;
  // A forced input (T605, T614: A3M3's SEAL) locks every control but its own button, the Menu,
  // and the speaker (design/core-loop.md § 2.11: settings stay reachable); its veil takes the
  // playfield's clicks.
  const locked = forcedInput.value !== null;
  // The comms panel moves off the doors while a forced input waits and through the close (D143 R3).
  const topComms = locked || forcedInputAvoid.value.length > 0;
  return (
    <div class="hud" data-act={hud.act.value} data-testid="hud" data-locked={locked || undefined}>
      <ForcedInputVeil />
      {/* Everything but the briefing: inert (unfocusable, unclickable) while it, a scene, or the
          pause menu is open; under a forced input, everything but the Menu and the speaker. */}
      <div class="hud-play" inert={open}>
        <Lock locked={locked}>
          <PausedOverlay />
          <WaveBannerView />
          {/* Top-left: status, then the comms panel under it (it follows the status panel's height).
              Under a forced input the panel moves to the top centre, clear of the map's doors
              (D143 R3: at A3M3's SEAL it covered the convoy's blast door). */}
          <div class="hud-top-left">
            <StatusPanel />
            {!topComms && <CommsPanel />}
          </div>
          {topComms && (
            <div class="hud-comms-top" data-testid="comms-top">
              <CommsPanel />
            </div>
          )}
        </Lock>
        <div class="hud-top-right">
          <div class="hud-top-row">
            <MenuButton />
            <MuteButton />
            <Lock locked={locked}>
              <SpeedControls />
            </Lock>
          </div>
          <Lock locked={locked}>
            <WavePanel />
            <CheckpointCueView />
          </Lock>
        </div>
        <Lock locked={locked}>
          {/* Bottom-left: the abilities, then fire control (always there: core-loop §2.7). */}
          <div class="hud-bottom-left">
            <AbilityBar />
            <div class="hud-fire-control" role="group" aria-label="Fire control">
              <HoldFireAllButton />
              <SpareRunnersAllButton />
            </div>
          </div>
          <BuildBar />
          {selected !== null && <TowerPanel t={selected} />}
          <BottomHint />
          <Notice />
          <CursorAnnouncer />
          <ActionAnnouncer />
        </Lock>
      </div>
      <ForcedInputButton />
      {hud.briefing.value !== null && briefing !== null && <Briefing view={briefing} />}
      {pauseMenu.value && <PauseMenu />}
    </div>
  );
}
