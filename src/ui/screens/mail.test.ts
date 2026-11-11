// T714: Gerald's mail's staging rules (mail.ts): the envelope's lead-in, one paper per spoken
// caption, the newest lit; and the scene it stages reads in that order (T720's lines).
import { describe, expect, it } from 'vitest';
import { SCENES } from '../../content/dialogue/index.ts';
import { stagingLeadInMs, stagingOf } from '../dialogue/staging.ts';
import {
  ENVELOPE_OPEN_MS,
  ENVELOPE_SHUT_MS,
  ENVELOPE_STILL_MS,
  envelopeAt,
  KEY_SLIP,
  KIP_BATCH,
  mailLabel,
  mailLeadInMs,
  PENSION_FORM,
  papersOut,
  papersShown,
} from './mail.ts';

const line = (text: string) => ({ text });

describe("Gerald's mail (T714)", () => {
  it('stages a3_m04_scene_mail, led in by the envelope', () => {
    expect(stagingOf('a3_m04_scene_mail')).toBe('mail');
    expect(stagingLeadInMs('mail', false)).toBe(ENVELOPE_SHUT_MS + ENVELOPE_OPEN_MS);
    expect(stagingLeadInMs('mail', true)).toBe(ENVELOPE_STILL_MS);
    expect(mailLeadInMs(true)).toBeLessThan(mailLeadInMs(false));
  });

  it('opens the envelope: shut, opening, open; open at once under reduced motion', () => {
    expect(envelopeAt(0, false)).toBe('shut');
    expect(envelopeAt(ENVELOPE_SHUT_MS, false)).toBe('opening');
    expect(envelopeAt(ENVELOPE_SHUT_MS + ENVELOPE_OPEN_MS, false)).toBe('open');
    expect(envelopeAt(0, true)).toBe('open');
  });

  it('brings one paper out per spoken caption; a silence brings none', () => {
    expect(papersOut([])).toBe(0);
    expect(papersOut([line('Pebble, c/o the Deep Halls.')])).toBe(1);
    expect(papersOut([line('a'), line('')])).toBe(1);
    expect(papersOut([line('a'), line(''), line('b')])).toBe(2);
    expect(papersOut([line('a'), line(''), line('b'), line(''), line('c'), line('d')])).toBe(3);
    expect(papersShown(2)).toEqual([
      { paper: 'pension', lit: false },
      { paper: 'key', lit: true },
    ]);
    expect(papersShown(0)).toEqual([]);
    expect(mailLabel(3)).toContain('batch number');
  });

  it('matches the scene: each caption reads the paper it brings out', () => {
    const scene = SCENES['a3_m04_scene_mail'];
    expect(scene).toBeDefined();
    const spoken = (scene?.nodes ?? []).flatMap((n) =>
      n.kind === 'line' && n.text !== '' ? [n.text] : [],
    );
    expect(spoken).toEqual([PENSION_FORM.beneficiary, KEY_SLIP, KIP_BATCH]);
  });

  it('keeps Act III copy: no exclamation points on the papers', () => {
    const words = [...Object.values(PENSION_FORM).flat(2).map(String), KEY_SLIP, KIP_BATCH].join(
      ' ',
    );
    expect(words).not.toContain('!');
  });
});
