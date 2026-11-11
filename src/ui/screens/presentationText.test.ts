// The screens' copy that reads the presentation dials (T410b): Act I's card cheers and Act II's
// doesn't; the counter's spoken line; the Title's tip follows the Continue slot's next map.
import { describe, expect, it } from 'vitest';
import type { CampaignMapId } from '../../content/campaign.ts';
import { PRESENTATION } from '../../content/presentation.ts';
import { resultsCounter } from '../../story/counter.ts';
import { medalMarks, resultsHeader, spokenCounter, titleTip } from './presentationText.ts';
import type { SlotView } from './state.ts';

describe('resultsHeader', () => {
  it("Act I's report is Exemplary!; Act II's is only filed; the headline's words never change", () => {
    expect(resultsHeader(PRESENTATION.byAct[1].counter, 'won')).toEqual({
      kicker: 'Shift report · Exemplary!',
      headline: 'PERIMETER SECURED!',
    });
    expect(resultsHeader(PRESENTATION.byAct[2].counter, 'won')).toEqual({
      kicker: 'Shift report · Filed',
      headline: 'PERIMETER SECURED!',
    });
    for (const style of ['starred', 'plain'] as const) {
      expect(resultsHeader(style, 'lost')).toEqual({
        kicker: 'Shift report · Incident logged',
        headline: 'MINOR OPERATIONAL HICCUP',
      });
    }
  });

  it("files Act III's report itself, a win's and a loss's alike (T612; the finale follows)", () => {
    for (const act of [3, 'finale'] as const) {
      const style = PRESENTATION.byAct[act].counter;
      expect(resultsHeader(style, 'won').kicker).toBe('Shift report · Auto-filed');
      expect(resultsHeader(style, 'lost')).toEqual({
        kicker: 'Shift report · Auto-filed',
        headline: 'MINOR OPERATIONAL HICCUP',
      });
    }
  });

  it('cheers only in the starred style', () => {
    for (const style of ['plain', 'meter', 'remembered'] as const) {
      expect(resultsHeader(style, 'won').kicker).not.toContain('!');
    }
  });

  it("drops the headline's exclamation in Act III and the finale (style-guide § 2, T613)", () => {
    for (const act of [3, 'finale'] as const) {
      expect(resultsHeader(PRESENTATION.byAct[act].counter, 'won')).toEqual({
        kicker: 'Shift report · Auto-filed',
        headline: 'PERIMETER SECURED.',
      });
    }
  });
});

describe('medalMarks (T613)', () => {
  it('marks NEW! and Next time! until Act III, then New and Next time.', () => {
    for (const act of [1, 2] as const) {
      expect(medalMarks(PRESENTATION.byAct[act].counter)).toEqual({
        new: 'NEW!',
        nextTime: 'Next time!',
      });
    }
    for (const act of [3, 'finale'] as const) {
      const marks = medalMarks(PRESENTATION.byAct[act].counter);
      expect(marks).toEqual({ new: 'New', nextTime: 'Next time.' });
      expect(Object.values(marks).join('')).not.toContain('!');
    }
  });
});

describe('spokenCounter', () => {
  it("reads Act I's brag after a comma, never the star; other lines as written", () => {
    expect(spokenCounter(resultsCounter('starred', 1234, 9999))).toBe(
      'PESTS PROCESSED: 1,234, Top 5% of Technicians!',
    );
    expect(spokenCounter(resultsCounter('plain', 43, 2243))).toBe('Pests processed: 43.');
  });
});

/** A readable slot whose next map is `frontier`. */
const slot = (frontier: CampaignMapId | null, mapsWon = 0): SlotView => ({
  slot: 1,
  status: 'ok',
  progress: '',
  mapsWon,
  stardust: 0,
  intel: 0,
  savedAt: 0,
  fromBackup: false,
  frontier,
});

describe('titleTip', () => {
  it("is Act I's with no save to continue", () => {
    expect(titleTip([], null)).toBe('Remember: a clean perimeter is a happy perimeter!');
    expect(titleTip([{ slot: 1, status: 'empty' }], 1)).toBe(
      'Remember: a clean perimeter is a happy perimeter!',
    );
  });

  it("follows the Continue slot's next map: Act II's from A1M5 won, the post-game's after", () => {
    expect(titleTip([slot('a1_m03', 2)], 1)).toBe(
      'Remember: a clean perimeter is a happy perimeter!',
    );
    expect(titleTip([slot('a2_m01', 5)], 1)).toBe('Remember: a clean perimeter.');
    expect(titleTip([slot(null, 23)], 1)).toBe('Remember them.');
    // Another slot's progress never sets the tip.
    expect(titleTip([slot('a2_m01', 5), { ...slot('a1_m01'), slot: 2 }], 2)).toBe(
      'Remember: a clean perimeter is a happy perimeter!',
    );
  });
});
