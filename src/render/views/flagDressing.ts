// Flag-gated dressing and decor (design/maps.md § 7 "State-dependent dressing"; T706): a dressing
// layer's `when` and a decor marker's `markerWhen` entry show only when the run's story flags meet
// their gate (an unset flag never does), so a choice shows on the map (A3M4's HE HELD THE DOOR
// under `convoy`, the humming ring under `warren`). The ground is drawn once per battle
// (GroundView), from the map as this returns it, so a gated decor marker's prop stands only under
// its gate. An ally post's `when` is the sim's (sim/bearers.ts `postManned`).
import type { FlagGateDef, MarkerId, GridPos } from '../../content/types.ts';
import type { ScriptFlags } from '../../sim/index.ts';

/** Whether `gate` holds under `flags` (null: no gate). */
export function gateHolds(gate: FlagGateDef | null | undefined, flags: ScriptFlags): boolean {
  return gate === null || gate === undefined || flags[gate.flag] === gate.eq;
}

/**
 * `map` with the dressing layers and decor markers its flag gates hide under `flags` left out (the
 * same object when nothing is gated out).
 */
export function flagGatedGround<
  M extends {
    readonly dressing?: readonly { readonly when?: FlagGateDef }[];
    readonly markers?: Readonly<Record<MarkerId, GridPos>>;
    readonly markerWhen?: Readonly<Record<MarkerId, FlagGateDef>>;
  },
>(map: M, flags: ScriptFlags): M {
  const dressing = map.dressing ?? [];
  const keptLayers = dressing.filter((d) => gateHolds(d.when, flags));
  const gates = map.markerWhen ?? {};
  const hidden = Object.keys(gates).filter((m) => !gateHolds(gates[m], flags));
  if (keptLayers.length === dressing.length && hidden.length === 0) return map;
  const markers = Object.fromEntries(
    Object.entries(map.markers ?? {}).filter(([m]) => !hidden.includes(m)),
  );
  return { ...map, dressing: keptLayers, markers };
}
