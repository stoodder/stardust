import { describe, expect, it } from 'vitest';
import { silkText } from './silk.ts';

describe('silkText (D059: "&" never reaches Silkscreen)', () => {
  it('reads "&" as "and", spaced or not', () => {
    expect(silkText('Logistics & Lethality')).toBe('Logistics and Lethality');
    expect(silkText('R&D')).toBe('R and D');
    expect(silkText('Salt &  pepper')).toBe('Salt and pepper');
  });

  it('leaves text without "&" alone (the same string)', () => {
    const s = 'Hello, Technician!';
    expect(silkText(s)).toBe(s);
  });
});
