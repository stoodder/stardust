// The Technician beside the companion (T501, D154; design/core-loop.md § 3): slot 1 can't hold the
// ability the run's companion brings in slot 2 (no double Time Dilation in the finale under C4
// Keep, where QUILL may walk with you and her Time Dilation is also a Technician ability). The
// rule's one home: validateBuilds' [locked-abilities] checks every build against its companion
// with it, and the loadout greys the slot-1 card it names (T809). Pure.

/** What the rule reads of an ability (a raw or compiled def). */
export interface CompanionOwned {
  readonly companion?: string | null | undefined;
}

/**
 * The abilities slot 1 can't hold beside `companion` (null: none walks with you): its own ability
 * (each ability whose `companion` names it), in registry order. A companion that is absent (a dark
 * slot 2) brings nothing, so pass null for one.
 */
export function technicianOffBeside(
  abilities: Readonly<Record<string, CompanionOwned>>,
  companion: string | null,
): string[] {
  if (companion === null) return [];
  return Object.keys(abilities).filter((id) => abilities[id]!.companion === companion); // own keys
}

/** Whether slot 1 holding `ability` beside `companion` breaks the rule (`technicianOffBeside`). */
export function technicianClashes(
  abilities: Readonly<Record<string, CompanionOwned>>,
  ability: string | null,
  companion: string | null,
): boolean {
  return (
    ability !== null &&
    companion !== null &&
    Object.hasOwn(abilities, ability) &&
    abilities[ability]!.companion === companion // hasOwn
  );
}
