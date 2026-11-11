// What the script revoked, as the HUD reads it (design/towers.md § 9, core-loop.md § 2.2 and
// § 2.11; T606's minimal hook, which T631's REVOKED slots and hidden preview build on): the tower
// classes whose build slots read REVOKED, the ability slots gone dark (UPLINK REVOKED; QUILL's under
// her lockout), whether the wave preview is hidden (ACCESS RESTRICTED), and QUILL's leak line for the
// next wave (null until story sets one). app/revoked.ts keeps it in sync.
import { signal } from '@preact/signals';

export interface RevokedHud {
  readonly towers: readonly string[];
  readonly slots: readonly (1 | 2)[];
  readonly previewHidden: boolean;
  /** The leak line slot (T621's lines, T631's look): shown under ACCESS RESTRICTED. */
  readonly leakLine: string | null;
}

export const NOTHING_REVOKED: RevokedHud = {
  towers: [],
  slots: [],
  previewHidden: false,
  leakLine: null,
};

export const revokedHud = signal<RevokedHud>(NOTHING_REVOKED);
