// A2M2's habitat domes (docs/story/campaign/act2.md § A2M2, Layout data): decor on the west side
// that nothing goes near, where the camera frames them clear of the comms panel (D134).
import { describe, expect, it } from 'vitest';
import { compileContent } from '../../compile.ts';
import { RAW_CONTENT } from '../../registry.ts';

const content = compileContent(RAW_CONTENT);
const map = content.maps.a2_m02;
const DOMES = ['dome_north', 'dome_south'] as const;
/**
 * The iso depth (col + row) from which a tile's prop stands below the comms panel's bottom edge at
 * 1280×720 (measured: the panel ends at y ≈ 316; a dome on depth 11 reaches it, on depth 12 it
 * clears it by ~20 px).
 */
const CLEAR_OF_COMMS_DEPTH = 12;

describe('A2M2 · The Glass Witch: the habitat domes', () => {
  it('sit on decor on the west side, off every route, each alone on its tile', () => {
    const routeTiles = new Set(
      Object.values(map.routes).flatMap((r) => r.tiles.map(([c, rr]) => `${c},${rr}`)),
    );
    for (const id of DOMES) {
      const [c, r] = map.markers[id]!;
      expect(map.tiles[r * map.cols + c], id).toBe('.');
      expect(c, id).toBeLessThanOrEqual(2);
      expect(routeTiles.has(`${c},${r}`), id).toBe(false);
      const sharing = Object.entries(map.markers).filter(([, [mc, mr]]) => mc === c && mr === r);
      expect(sharing.map(([m]) => m)).toEqual([id]);
    }
  });

  it('stand where the comms panel never hides them', () => {
    for (const id of DOMES) {
      const [c, r] = map.markers[id]!;
      expect(c + r, id).toBeGreaterThanOrEqual(CLEAR_OF_COMMS_DEPTH);
    }
  });
});
