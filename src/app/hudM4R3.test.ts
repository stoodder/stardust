// M4 review round 2's HUD fixes (D135), built in round 3: the checkpoint resume's notice is a
// banner (two lines below the HUD's top row; S5), the PAUSED notice hides while a scene holds the
// battle (S5), and the runner tooltip words a huddle as "huddled" (S8).
import { describe, expect, it } from 'vitest';
import { showsPaused } from '../ui/hud/Notices.tsx';
import { hud } from '../ui/state.ts';
import { NOTICE_MS, showNotice } from './hud.ts';
import { runnersTip } from './hudViews.ts';

describe('the PAUSED notice (D135 S5)', () => {
  it('shows while paused in play, but not under a pausing panel or a full-screen scene', () => {
    expect(showsPaused(0, 'playing', null)).toBe(true);
    expect(showsPaused(0, 'playing', 'briefing')).toBe(true);
    expect(showsPaused(0, 'playing', 'panel')).toBe(false);
    expect(showsPaused(0, 'playing', 'fullscreen')).toBe(false);
    expect(showsPaused(1, 'playing', null)).toBe(false);
    expect(showsPaused(0, 'won', null)).toBe(false);
  });
});

describe('notices and banners (D135 S5)', () => {
  it('a notice is plain by default; the resume banner says it is one', () => {
    showNotice('Max tier');
    expect(hud.notice.value).toMatchObject({ text: 'Max tier' });
    expect(hud.notice.value?.banner).toBeUndefined();
    showNotice('Resumed before wave 5.', NOTICE_MS, true);
    expect(hud.notice.value).toMatchObject({ text: 'Resumed before wave 5.', banner: true });
  });
});

describe('the runner tooltip (D135 S8)', () => {
  it('words each trait as an adjective: "huddled", not "huddle"', () => {
    expect(runnersTip(['fast', 'huddle'])).toBe(
      "Runners: fast, huddled · They don't hurt the core.",
    );
    expect(runnersTip([])).toBe("Runners · They don't hurt the core.");
  });
});
