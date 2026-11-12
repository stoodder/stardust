// What the script revoked, as the HUD reads it (design/towers.md § 9, core-loop.md § 2.2 and
// § 2.11; T606's minimal hook, which T631's REVOKED slots and hidden preview build on): the tower
// classes whose build slots read REVOKED, the ability slots gone dark (UPLINK REVOKED; QUILL's under
// its lockout), whether the wave preview is hidden (ACCESS RESTRICTED), and QUILL's leak line for the
// next wave (null until story sets one). app/revoked.ts keeps it in sync.
import { signal } from '@preact/signals';

export interface RevokedHud {
  readonly towers: readonly string[];
  readonly slots: readonly (1 | 2)[];
  readonly previewHidden: boolean;
  /** The leak line slot (T621's lines, T631's look): shown under ACCESS RESTRICTED. */
  readonly leakLine: string | null;
  /**
   * Radio Silence (T860; sim/rules.ts `noAbilities`): the dark slots read "Radio Silence", not
   * "Locked out". Absent: false.
   */
  readonly silenced?: boolean;
  /**
   * The slots dark under Directive 0's phase lock (T807's `lockAbility`, sim `abilitiesLocked`;
   * T832): they read "Directive 0", never a revocation's stamp. Absent: none.
   */
  readonly locked?: readonly (1 | 2)[];
}

export const NOTHING_REVOKED: RevokedHud = {
  towers: [],
  slots: [],
  previewHidden: false,
  leakLine: null,
};

export const revokedHud = signal<RevokedHud>(NOTHING_REVOKED);
