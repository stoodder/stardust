// The loadout screen's view model (T201): app/loadout.ts builds it from the save in play and the
// map when the router opens the screen; Loadout.tsx reads it and acts through app/loadout.ts.
import { signal } from '@preact/signals';

/** How a tower answers one of the map's counters (meta/loadout.ts TowerAnswerNote, as text). */
export interface LoadoutAnswerView {
  readonly counter: string;
  /** "Armor". */
  readonly label: string;
  /** "T3" or a spec's name ("Bunker Buster"), or null when tier 1 already answers. */
  readonly via: string | null;
  /** One of the map's required counters. */
  readonly required: boolean;
}

/** A tower on offer. */
export interface LoadoutTowerView {
  readonly id: string;
  /** "Rivet". */
  readonly name: string;
  /** "Single-target DPS". */
  readonly role: string;
  /** Its tier-1 build cost in credits, after the save's cost modifiers. */
  readonly cost: number;
  /** The build icon's sprite id. */
  readonly icon: string;
  /** The map's counters it answers, in enemies.md § 3.1 order. */
  readonly answers: readonly LoadoutAnswerView[];
  /**
   * The save holds the class jailbroken (T731; towers.md § 9): the card shows its icon in
   * `everglow.jailbroken` and reads "Jailbroken". Absent: false.
   */
  readonly jailbroken?: boolean;
}

/** A Technician ability on offer (slot 1). */
export interface LoadoutAbilityView {
  readonly id: string;
  readonly name: string;
  readonly icon: string;
  /** Labels of the map's counters it answers when cast (detection, jam). */
  readonly answers: readonly string[];
  /**
   * Whose ability it was, if the story made it the Technician's (T731; meta `INHERITED_ABILITIES`:
   * "QUILL's" for Time Dilation under C4 Keep, "Bricks's" for Suppressing Fire); absent: none.
   */
  readonly inheritedFrom?: string;
}

/**
 * A Technician ability the save owns that this map locks under its story (T731; A3M5's System
 * Reboot under C4 Rewrite): a card to read, never a pick, with why.
 */
export interface LoadoutLockedAbilityView {
  readonly id: string;
  readonly name: string;
  readonly icon: string;
  /** "QUILL is offline. It runs the reboot." */
  readonly reason: string;
}

/**
 * A class or ability revoked from the save (A3M2's Clean Exit, until the jailbreak; towers.md § 9):
 * shown on the screen under its stamp, never pickable, so the player sees why it's gone.
 */
export interface LoadoutRevokedView {
  readonly id: string;
  readonly name: string;
  /** The icon's sprite id. */
  readonly icon: string;
}

/** A synergy link two towers in the pool can form. */
export interface LoadoutLinkView {
  readonly id: string;
  /** "Crossfire". */
  readonly name: string;
  readonly partners: readonly [string, string];
  /** "Rivet + Thumper". */
  readonly partnerNames: string;
  /** "Rivet +10% fire rate · Thumper +10% fire rate". */
  readonly bonus: string;
}

/** A counter category the map calls for (from its threat intel, or required). */
export interface LoadoutCounterView {
  readonly id: string;
  readonly label: string;
  /** The map requires an answer (maps.md § 6.3); the screen warns when the pick has none. */
  readonly required: boolean;
}

/** A Field Protocol on offer (owned; progression.md § 5). */
export interface LoadoutProtocolView {
  readonly id: string;
  /** "Head Start". */
  readonly name: string;
  /** "+10% starting credits", from its grants. */
  readonly effect: string;
  /** It takes a tower pick when equipped (Specialist). */
  readonly takesTower: boolean;
  /**
   * Why it does nothing on this map, or null (D143 R9: a core-only protocol, Emergency Bulkhead,
   * on a map with no core reads "No core on this shift"). It still equips: the player's choice.
   */
  readonly inert: string | null;
  /**
   * What it reads while it's off, once the screen benched it on arrival for one that acts here
   * (D144 S1b: "Benched: no core on this shift"), or null. Equipped again, it reads `inert`.
   */
  readonly benched: string | null;
}

export interface LoadoutPickView {
  readonly towers: readonly string[];
  readonly ability: string | null;
  /** Equipped Field Protocols, in slot order (save-wide: the same on every map). */
  readonly protocols: readonly string[];
  /** The tower each equipped tower-pick protocol (Specialist) takes. */
  readonly protocolPicks: Readonly<Record<string, string>>;
}

/** The loadout screen for one map and the save in play. */
export interface LoadoutView {
  readonly mapId: string;
  readonly mapName: string;
  /** Its shift number on the campaign plan, or null off the plan. */
  readonly shift: number | null;
  /**
   * The map's threat intel, as words ("Fast", "Armored"), each with its tooltip or null (the
   * Skittish chip's names the runners' traits; D134).
   */
  readonly threats: readonly { readonly label: string; readonly tip: string | null }[];
  readonly counters: readonly LoadoutCounterView[];
  readonly towers: readonly LoadoutTowerView[];
  /** Revoked classes (after the pickable towers, stamped "License revoked"; D143 R4). */
  readonly revoked: readonly LoadoutRevokedView[];
  readonly abilities: readonly LoadoutAbilityView[];
  /** Revoked Technician abilities (Orbital Strike: "Uplink revoked" under its stamp). */
  readonly revokedAbilities: readonly LoadoutRevokedView[];
  /** Owned abilities this map locks under the save's story (T731; absent: none). */
  readonly lockedAbilities?: readonly LoadoutLockedAbilityView[];
  /** Links among the pool's towers, in registry order. */
  readonly links: readonly LoadoutLinkView[];
  /** Slot 2 is the map's companion's ("Bricks · Suppressing Fire"), or null for none. */
  readonly companion: string | null;
  /** The Field Protocols owned, in ownership order (none before Zibzab's shop). */
  readonly protocols: readonly LoadoutProtocolView[];
  /** Field Protocol slots: 0 before the shop opens, then 1, plus R&D's. */
  readonly protocolSlots: number;
  /**
   * Where the pick starts: the map's preset, else the last one, else the default; and the
   * protocols equipped now.
   */
  readonly initial: LoadoutPickView;
  /** The tower limit (the CLAUDE.md 4-tower rule). */
  readonly max: number;
}

/** The open loadout screen's view, or null. */
export const loadout = signal<LoadoutView | null>(null);

/** Whether the running battle's briefing offers Change loadout (the screen came before it). */
export const loadoutChangeable = signal(false);
