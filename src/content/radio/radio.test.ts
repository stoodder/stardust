import { describe, expect, it } from 'vitest';
import { RAW_CONTENT } from '../registry.ts';
import { radioLines, RADIO_TABLES } from './index.ts';
import { SPEAKERS } from './types.ts';

describe('radio tables', () => {
  it('fit the dialogue line limit and name known speakers (story/style-guide.md §5.4)', () => {
    for (const [mapId, lines] of Object.entries(RADIO_TABLES)) {
      for (const l of lines) {
        expect(l.text.length, `${mapId}: ${l.text}`).toBeLessThanOrEqual(120);
        expect(Object.keys(SPEAKERS)).toContain(l.speaker);
        if (l.on === 'countdown' || l.on === 'waveStart' || l.on === 'waveCleared') {
          expect(l.wave).toBeGreaterThanOrEqual(1);
        }
        if (l.on === 'unlock' || l.on === 'issued') {
          expect(Object.keys(RAW_CONTENT.towers), `${mapId}: ${l.text}`).toContain(l.tower);
        }
        if (l.on === 'enemyKilled' || l.on === 'enemyLeaked') {
          expect(Object.keys(RAW_CONTENT.enemies), `${mapId}: ${l.text}`).toContain(l.enemy);
        }
      }
    }
  });

  it('play each line at most once, so no table repeats a line', () => {
    for (const lines of Object.values(RADIO_TABLES)) {
      const texts = lines.map((l) => l.text);
      expect(new Set(texts).size).toBe(texts.length);
    }
  });

  it('are found by map id', () => {
    expect(radioLines('a1_m02')).toBe(RADIO_TABLES.a1_m02);
    expect(radioLines('no_such_map')).toEqual([]);
  });
});
