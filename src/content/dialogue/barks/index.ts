// Shared bark pools (docs/story/style-guide.md § 5.5): barks that can fire on more than one map,
// one file per trigger (`barks/<trigger>.ts`), each bark gated by its own `when` (act, map, flags).
// Map-only barks live with their map (`a1/a1_m0N/barks.ts`). Empty until the first pool lands.
import type { Bark } from '../types.ts';

export const SHARED_BARKS: readonly Bark[] = [];
