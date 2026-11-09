// System 3: triggers. Evaluates map-script triggers and runs their actions (story-runtime.md
// § Map scripts). M1 needs only `unlockTowerClass` (compiled from towerUnlockWave), which fires
// on a wave's countdown phase, so it lands with the wave state machine.
// TODO(T105b): wave-phase triggers and unlockTowerClass (remove from state.lockedTowers, emit
// TowerClassUnlocked).
export function triggers(): void {}
