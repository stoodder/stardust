// The "more" disclosure's pure parts (T803a): its words, its screen-reader name, what Esc does, and
// the ARIA the markup carries in each state. The browser half (focus back on the toggle after Esc,
// the region out of the tab order while closed) is the declutter screens' smoke flows' (T803b–e).
import { describe, expect, it } from 'vitest';
import { disclosureState, keyResult, toggleName, toggleText } from './Disclosure.tsx';

describe('Disclosure', () => {
  it('reads "More" by default, its own words when given, and the open words while open', () => {
    expect(toggleText(false)).toBe('More');
    expect(toggleText(true)).toBe('More');
    expect(toggleText(false, 'Medals')).toBe('Medals');
    expect(toggleText(true, 'More', 'Less')).toBe('Less');
    expect(toggleText(false, 'More', 'Less')).toBe('More');
  });

  it('names what it holds for screen readers, its visible words first (label in name)', () => {
    expect(toggleName('More', 'medals and objectives')).toBe('More: medals and objectives');
    expect(toggleName('More', undefined)).toBeUndefined();
    expect(toggleName('More', '')).toBeUndefined();
  });

  it('closes on Esc only while open; other keys are the button’s or the page’s', () => {
    expect(keyResult('Escape', true)).toBe(false);
    expect(keyResult('Escape', false)).toBeNull();
    expect(keyResult('Enter', true)).toBeNull();
    expect(keyResult(' ', false)).toBeNull();
  });

  it('carries aria-expanded and aria-controls, and hides its region while closed', () => {
    const closed = disclosureState(false, 'r1', { about: 'the medals' });
    expect(closed.toggle).toEqual({ 'aria-expanded': false, 'aria-controls': 'r1' });
    expect(closed.region).toEqual({ id: 'r1', hidden: true });
    expect(closed.text).toBe('More');
    expect(closed.name).toBe('More: the medals');
    expect(closed.rootClass).toBe('sd-disclosure');

    const open = disclosureState(true, 'r1', { lessLabel: 'Less', float: true, class: 'x' });
    expect(open.toggle['aria-expanded']).toBe(true);
    expect(open.region.hidden).toBe(false);
    expect(open.text).toBe('Less');
    expect(open.name).toBeUndefined();
    expect(open.rootClass).toBe('sd-disclosure sd-disclosure-open sd-disclosure-float x');
  });
});
