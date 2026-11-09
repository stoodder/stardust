// Map-specific harness expectations that the build data (content/types.ts BuildsDef) can't
// express yet. Each cites the doc that sets it.

/**
 * By map id: alt builds that must win at a *lower* margin than par on the same seed. A1M1's
 * Rivet-only build shows the Thumper helps without being required (design/maps.md § 6.4, A1M1).
 */
export const ALT_BELOW_PAR: Readonly<Record<string, readonly string[]>> = {
  a1_m01: ['rivet_only'],
};
