// T803's declutter guard (D153 and its addendum; tasks.md § M8 T803a–e). Every screen and state of
// the app at 1280×720, under reduced motion so each capture is a still: a screenshot to
// <out>/screens/declutter/<id>.png, and a measure to <out>/declutter/<id>.json of
//   - each `data-voice` element (portraits, speaker plates, comms and scene lines, character copy,
//     story stamps and kickers; the playfield, measured as the canvas no opaque panel covers) and
//     each `data-critical` readout (threats, counters, tells, meters, credits, wave): its visible
//     boxes (clipped to the viewport and to any clipping ancestor) and their area, summed per name;
//   - the screen's density: visible elements, controls, words, numbers, numbers shown twice or
//     more, and text blocks over two lines (the audit's checklist, counted the same way each time).
// The guard: no `data-critical` readout sits inside a "more" (a Disclosure's region or a <details>:
// it's one glance away, never a click), and against the baseline (`smoke/declutter-before/<id>.json`,
// the T803a "before" set; DECLUTTER_BASELINE=<dir> reads another) every voice name keeps at least
// its area on top (AREA_TOLERANCE), and every critical name that was on top still is. A screen with
// no baseline file is measured but not compared.
// DECLUTTER_RECORD=<dir> writes each screen's measure to <dir>/<id>.json instead of comparing: to
// re-record a screen after a deliberate change, run its flow (`-g`) with
// DECLUTTER_RECORD=smoke/declutter-before, `npx prettier --write smoke/declutter-before`, and commit
// only that screen's file.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import type { Locator, Page } from '@playwright/test';
import { expect } from './fixtures.ts';
import { nextFrames, waitForReady } from './hooks.ts';
import { outPath } from './out.ts';

/** The T803 sub-task that owns a screen. */
export type Group = 'b' | 'c' | 'd' | 'e';

/** Every screen and state the guard captures, with its sub-task (T803b battle … T803e story). */
export const SCREENS = {
  // T803b: the battle HUD, the tower panel, the wave preview, comms, pause.
  'hud-a1-build': 'b',
  'hud-a1-armed': 'b',
  'hud-tower-panel': 'b',
  'hud-tower-panel-comms': 'b',
  'hud-a3-wave': 'b',
  'hud-boss': 'b',
  'hud-comms': 'b',
  'hud-bark': 'b',
  pause: 'b',
  'hud-fin-descent': 'b',
  'hud-fin-phase1': 'b',
  'hud-fin-held': 'b',
  'hud-fin-phase2': 'b',
  'hud-fin-dawn': 'b',
  'hud-endless': 'b',
  'hud-challenge': 'b',
  // T803c: Title, Intake, the Shift board, the Sector and post-game star maps, the Base, Settings,
  // Import.
  'title-new': 'c',
  'title-saves': 'c',
  'title-load': 'c',
  'title-postgame': 'c',
  'title-resume': 'c',
  import: 'c',
  intake: 'c',
  'shift-board': 'c',
  'sector-act2': 'c',
  'sector-dusk': 'c',
  'sector-act3': 'c',
  'sector-act3-late': 'c',
  'postgame-map': 'c',
  'postgame-challenge': 'c',
  'postgame-node': 'c',
  'postgame-go': 'c',
  settings: 'c',
  // T803d: Loadout, Shop, Research, Engineering, Xenotech, the Bounty Board.
  loadout: 'd',
  'loadout-a3': 'd',
  'loadout-fin': 'd',
  'research-early': 'd',
  research: 'd',
  shop: 'd',
  engineering: 'd',
  xenotech: 'd',
  bounty: 'd',
  // T803e: Briefing, Results, Inbox, Journal, the full-screen stages, C5, the epilogue.
  'briefing-a1': 'e',
  'briefing-a3': 'e',
  'briefing-fin': 'e',
  'briefing-challenge': 'e',
  'veteran-closed': 'e',
  'veteran-open': 'e',
  crate: 'e',
  'results-win': 'e',
  'results-loss': 'e',
  'results-escort': 'e',
  'results-held': 'e',
  'results-choice': 'e',
  'results-finale': 'e',
  'endless-score': 'e',
  inbox: 'e',
  journal: 'e',
  'scene-full': 'e',
  'scene-base': 'e',
  'stage-feed': 'e',
  'stage-yield-log': 'e',
  'stage-mail': 'e',
  'stage-night-shift': 'e',
  'stage-waykeeper': 'e',
  'stage-dawn': 'e',
  c5: 'e',
  'epilogue-card': 'e',
  'epilogue-counter': 'e',
  'epilogue-credits': 'e',
  'epilogue-final': 'e',
} as const satisfies Record<string, Group>;
export type ScreenId = keyof typeof SCREENS;

/** How much a voice element's area may shrink before the guard fails: sub-pixel rounding only. */
const AREA_TOLERANCE = 0.01;
const BASELINE = process.env['DECLUTTER_BASELINE'] ?? 'smoke/declutter-before';
const RECORD = process.env['DECLUTTER_RECORD'];

interface Box {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
}
interface MarkRecord {
  readonly count: number;
  /** The area on top, in CSS px² (the viewport is 1280×720): rendered and covered by nothing. */
  readonly area: number;
  /** The rendered area, covered or not (behind a modal, say): 0 means hidden or clipped away. */
  readonly shown: number;
  /** How many of its elements sit inside a "more" (a Disclosure's region, or a <details>). */
  readonly inMore: number;
  readonly boxes: readonly Box[];
}
interface Density {
  /** Visible units on top: controls, images, and text blocks outside a control. */
  readonly elements: number;
  readonly controls: number;
  readonly words: number;
  /** Number tokens in visible text. */
  readonly numbers: number;
  /** Numbers (10 or more, or with a %) shown twice or more, with their count. */
  readonly repeated: readonly string[];
  /** Text blocks over two lines: their line count and opening words. */
  readonly longCopy: readonly string[];
}
export interface ScreenRecord {
  readonly id: ScreenId;
  readonly group: Group;
  readonly voice: Readonly<Record<string, MarkRecord>>;
  readonly critical: Readonly<Record<string, MarkRecord>>;
  readonly density: Density;
}
interface RawMark {
  readonly kind: 'voice' | 'critical';
  readonly name: string;
  readonly box: Box | null;
  /** The share of the box on top (0–1). */
  readonly onTop: number;
  /** Inside a "more": a Disclosure's region (open or closed) or a <details>. */
  readonly inMore: boolean;
}
interface Raw {
  readonly marks: readonly RawMark[];
  readonly playfield: { readonly box: Box; readonly area: number } | null;
  readonly density: Density;
}

/**
 * Measures the page (runs in the browser; self-contained). A box is the element's client rect
 * clipped to the viewport and to every ancestor that clips its overflow; null when the element
 * isn't rendered (display none, visibility hidden, opacity 0 on it or an ancestor) or is clipped
 * away. What is on top is hit-tested with every #ui element taking the pointer for the moment:
 * at a point, the mark shows unless something that paints (a half-opaque background, an image, a
 * canvas, its own text; a transparent layer doesn't) is drawn over it first, so a modal, a stage or
 * a panel covers it and a full-screen layout box doesn't. A mark's share on top is sampled on a
 * grid of up to ~600 points, a density unit at its center. The playfield is the battle canvas's
 * area that no opaque UI covers (as above, without text), sampled every 4 px.
 */
/* oxlint-disable unicorn/consistent-function-scoping -- it runs in the page, so its helpers live inside it */
function measurePage(): Raw {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const rendered = (el: Element): boolean =>
    el.checkVisibility({ opacityProperty: true, visibilityProperty: true });
  const visibleBox = (el: Element): Box | null => {
    if (!rendered(el)) return null;
    const r = el.getBoundingClientRect();
    let l = Math.max(0, r.left);
    let t = Math.max(0, r.top);
    let rt = Math.min(vw, r.right);
    let b = Math.min(vh, r.bottom);
    for (let a = el.parentElement; a !== null; a = a.parentElement) {
      const cs = getComputedStyle(a);
      if (cs.overflowX === 'visible' && cs.overflowY === 'visible') continue;
      const ar = a.getBoundingClientRect();
      if (cs.overflowX !== 'visible') {
        l = Math.max(l, ar.left);
        rt = Math.min(rt, ar.right);
      }
      if (cs.overflowY !== 'visible') {
        t = Math.max(t, ar.top);
        b = Math.min(b, ar.bottom);
      }
    }
    if (rt - l < 1 || b - t < 1) return null;
    const round = (n: number): number => Math.round(n * 10) / 10;
    return { x: round(l), y: round(t), w: round(rt - l), h: round(b - t) };
  };
  const ui = document.getElementById('ui');
  const probe = document.createElement('style');
  probe.textContent = '#ui * { pointer-events: auto !important; }';
  document.head.append(probe);
  const alpha = (c: string): number => {
    if (c === 'transparent') return 0;
    const m = /\(([^)]*)\)/.exec(c);
    const parts = (m?.[1] ?? '').split(/[\s,/]+/).filter((p) => p !== '');
    if (parts.length < 4) return 1;
    const a = parts[parts.length - 1] ?? '1';
    return a.endsWith('%') ? Number.parseFloat(a) / 100 : Number.parseFloat(a);
  };
  // Whether an element draws over what's under it: a background at least half opaque, an image,
  // a canvas, or its own text. A transparent layout box (a full-screen layer) draws nothing.
  const paints = (e: Element): boolean => {
    const cs = getComputedStyle(e);
    if (alpha(cs.backgroundColor) >= 0.5 || cs.backgroundImage !== 'none') return true;
    if (e.tagName === 'IMG' || e.tagName === 'CANVAS' || e.tagName === 'svg') return true;
    for (const n of e.childNodes) {
      if (n.nodeType === Node.TEXT_NODE && (n.textContent ?? '').trim() !== '') return true;
    }
    return false;
  };
  // Whether `el` is what shows at (x, y): the first element there, top down, that is `el` (or
  // inside it) before any that paints over it; its own ancestors are behind it.
  const onTopAt = (el: Element, x: number, y: number): boolean => {
    for (const hit of document.elementsFromPoint(x, y)) {
      if (hit === el || el.contains(hit)) return true;
      if (hit.contains(el)) continue;
      if (paints(hit)) return false;
    }
    return false;
  };
  const shareOnTop = (el: Element, b: Box): number => {
    const step = Math.max(2, Math.sqrt((b.w * b.h) / 600));
    let on = 0;
    let all = 0;
    for (let y = b.y + step / 2; y < b.y + b.h; y += step) {
      for (let x = b.x + step / 2; x < b.x + b.w; x += step) {
        all++;
        if (onTopAt(el, x, y)) on++;
      }
    }
    return all === 0 ? 0 : on / all;
  };

  const marks: RawMark[] = [];
  for (const el of document.querySelectorAll('[data-voice], [data-critical]')) {
    const box = visibleBox(el);
    const onTop = box === null ? 0 : shareOnTop(el, box);
    const inMore = (el.parentElement?.closest('.sd-disclosure-region, details') ?? null) !== null;
    const voice = el.getAttribute('data-voice');
    const critical = el.getAttribute('data-critical');
    if (voice !== null) marks.push({ kind: 'voice', name: voice, box, onTop, inMore });
    if (critical !== null) marks.push({ kind: 'critical', name: critical, box, onTop, inMore });
  }

  // Density: the checklist's counts over what #ui shows on top.
  const root = ui ?? document.body;
  const CONTROL =
    'button, a[href], input, select, textarea, [role="button"], [role="tab"], [role="radio"], ' +
    '[role="slider"], [role="checkbox"], [role="switch"], [role="option"]';
  const seen = (el: Element): boolean => {
    const b = visibleBox(el);
    return b !== null && onTopAt(el, b.x + b.w / 2, b.y + b.h / 2);
  };
  const units = new Set<Element>();
  let controls = 0;
  for (const el of root.querySelectorAll(CONTROL)) {
    if (!seen(el)) continue;
    controls++;
    units.add(el);
  }
  for (const el of root.querySelectorAll('img, canvas, [role="img"]')) {
    if (el.closest(CONTROL) === null && seen(el)) units.add(el);
  }
  const numbers = new Map<string, number>();
  let numberCount = 0;
  let words = 0;
  const blocks = new Set<Element>();
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  for (let n = walker.nextNode(); n !== null; n = walker.nextNode()) {
    const text = n.textContent ?? '';
    const parent = n.parentElement;
    if (text.trim() === '' || parent === null || !seen(parent)) continue;
    words += text.trim().split(/\s+/).length;
    for (const m of text.matchAll(/\d[\d,.]*%?/g)) {
      numberCount++;
      const token = m[0].replace(/[,.]$/, '');
      const value = Number.parseFloat(token.replace(/,/g, ''));
      if (token.endsWith('%') || value >= 10) numbers.set(token, (numbers.get(token) ?? 0) + 1);
    }
    if (parent.closest(CONTROL) !== null) continue;
    let block: Element = parent;
    while (
      block !== root &&
      block.parentElement !== null &&
      getComputedStyle(block).display.startsWith('inline')
    ) {
      block = block.parentElement;
    }
    units.add(block);
    blocks.add(block);
  }
  probe.remove();

  const longCopy: string[] = [];
  for (const block of blocks) {
    const range = document.createRange();
    range.selectNodeContents(block);
    const tops = new Set<number>();
    for (const r of range.getClientRects()) if (r.width > 0) tops.add(Math.round(r.top / 4));
    if (tops.size > 2) {
      const text = (block.textContent ?? '').replace(/\s+/g, ' ').trim();
      longCopy.push(`${tops.size} lines: ${text.slice(0, 70)}`);
    }
  }
  const repeated = [...numbers]
    .filter(([, count]) => count >= 2)
    .map(([token, count]) => `${token} ×${count}`);

  // The playfield, while a battle's HUD is up: the canvas minus what opaque UI covers.
  let playfield: Raw['playfield'] = null;
  const canvas = document.querySelector('#game canvas');
  const hud = document.querySelector('[data-testid="hud"]');
  const cb = canvas === null ? null : visibleBox(canvas);
  if (cb !== null && hud !== null && rendered(hud) && ui !== null) {
    const covers: Box[] = [];
    for (const el of ui.querySelectorAll('*')) {
      const cs = getComputedStyle(el);
      const opaque =
        alpha(cs.backgroundColor) >= 0.5 ||
        cs.backgroundImage !== 'none' ||
        el.tagName === 'IMG' ||
        el.tagName === 'CANVAS';
      if (!opaque) continue;
      const b = visibleBox(el);
      if (b !== null) covers.push(b);
    }
    const step = 4;
    let open = 0;
    for (let y = cb.y + step / 2; y < cb.y + cb.h; y += step) {
      for (let x = cb.x + step / 2; x < cb.x + cb.w; x += step) {
        if (!covers.some((c) => x >= c.x && x < c.x + c.w && y >= c.y && y < c.y + c.h)) open++;
      }
    }
    playfield = { box: cb, area: open * step * step };
  }

  return {
    marks,
    playfield,
    density: { elements: units.size, controls, words, numbers: numberCount, repeated, longCopy },
  };
}

/* oxlint-enable unicorn/consistent-function-scoping */

/** Folds the raw marks into one record per name (a name may mark several elements). */
function fold(raw: readonly RawMark[], kind: RawMark['kind']): Record<string, MarkRecord> {
  const out: Record<
    string,
    { count: number; area: number; shown: number; inMore: number; boxes: Box[] }
  > = {};
  for (const m of raw) {
    if (m.kind !== kind) continue;
    const rec = (out[m.name] ??= { count: 0, area: 0, shown: 0, inMore: 0, boxes: [] });
    rec.count++;
    if (m.inMore) rec.inMore++;
    if (m.box !== null) {
      const area = m.box.w * m.box.h;
      rec.shown += Math.round(area);
      rec.area += Math.round(area * m.onTop);
      rec.boxes.push(m.box);
    }
  }
  return out;
}

function writeJson(path: string, data: unknown): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(data, null, 2)}\n`);
}

/** Whether `v` reads as a measure this file wrote (the parts the guard compares). */
function isScreenRecord(v: unknown): v is ScreenRecord {
  if (typeof v !== 'object' || v === null) return false;
  const voice: unknown = Reflect.get(v, 'voice');
  const critical: unknown = Reflect.get(v, 'critical');
  return (
    typeof voice === 'object' && voice !== null && typeof critical === 'object' && critical !== null
  );
}

function baselineOf(id: ScreenId): ScreenRecord | null {
  const path = join(BASELINE, `${id}.json`);
  if (!existsSync(path)) return null;
  const parsed: unknown = JSON.parse(readFileSync(path, 'utf8'));
  if (!isScreenRecord(parsed)) throw new Error(`${path} isn't a declutter measure`);
  return parsed;
}

/**
 * Captures screen `id` as it stands: settles two frames, screenshots, measures, writes the
 * measure, and runs the guard (soft assertions, so one capture reports every problem): every
 * critical readout marked here is outside any "more" (Disclosure.tsx, <details>); against
 * the baseline, every voice name keeps its area on top and every critical name that was on top
 * still is.
 */
export async function capture(page: Page, id: ScreenId): Promise<void> {
  await nextFrames(page);
  await nextFrames(page);
  await page.screenshot({ path: outPath(`screens/declutter/${id}.png`) });
  const raw = await page.evaluate(measurePage);
  const voice = fold(raw.marks, 'voice');
  if (raw.playfield !== null) {
    const { box, area } = raw.playfield;
    const shown = Math.round(box.w * box.h);
    voice['playfield'] = { count: 1, area, shown, inMore: 0, boxes: [box] };
  }
  const critical = fold(raw.marks, 'critical');
  const record: ScreenRecord = { id, group: SCREENS[id], voice, critical, density: raw.density };
  writeJson(outPath(`declutter/${id}.json`), record);
  if (RECORD !== undefined) writeJson(join(RECORD, `${id}.json`), record);

  // A critical readout is never behind a "more" (a state may hide it: Dawn's HUD steps back).
  for (const [name, rec] of Object.entries(critical)) {
    expect.soft(rec.inMore, `${id}: critical "${name}" is never behind a "more"`).toBe(0);
  }
  if (RECORD !== undefined) return;
  const before = baselineOf(id);
  if (before === null) return;
  for (const [name, was] of Object.entries(before.voice)) {
    if (was.area === 0) continue;
    expect
      .soft(
        voice[name]?.area ?? 0,
        `${id}: voice "${name}" keeps its room (before ${was.area} px²)`,
      )
      .toBeGreaterThanOrEqual(Math.floor(was.area * (1 - AREA_TOLERANCE)));
  }
  for (const [name, was] of Object.entries(before.critical)) {
    if (was.area === 0) continue;
    expect
      .soft(critical[name]?.area ?? 0, `${id}: critical "${name}" still shows at a glance`)
      .toBeGreaterThan(0);
  }
}

// ---- Getting there ----

/** Boots `query` (after `?test=1&seed=1`) under reduced motion and waits for boot. */
export async function boot(page: Page, query: string): Promise<void> {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(`/?test=1&seed=1${query}`);
  await waitForReady(page);
}

/** Closes the briefing (Clock in), and Zibzab's crate if it follows. */
export async function clockIn(page: Page): Promise<void> {
  const briefing = page.getByRole('dialog', { name: 'Shift briefing' });
  await expect(briefing).toBeVisible();
  await briefing.getByRole('button', { name: 'Clock in' }).click();
  await expect(briefing).toHaveCount(0);
  await expect(page.getByTestId('hud')).toBeVisible();
}

/** Runs `build` paused from now and steps the sim until `wave` has spawned (or the map ends). */
export async function playTo(
  page: Page,
  build: string,
  wave: number,
  extraTicks = 0,
): Promise<void> {
  await page.evaluate(
    ([b, w, extra]) => {
      const sd = globalThis.__sd!; // installed: waitForReady passed
      sd.setSpeed(0);
      sd.autoplay(b);
      sd.fastForward(0);
      const st = sd.state()!; // in a battle
      for (let k = 0; k < 400 && st.wave < w && st.outcome === 'playing'; k++) sd.fastForward(60);
      sd.fastForward(extra);
    },
    [build, wave, extraTicks] as const,
  );
}

/** Opens the base on its tab `name` (a role name or pattern). */
export async function baseTab(page: Page, name: string | RegExp): Promise<Locator> {
  await page.evaluate(() => globalThis.__sd!.goto('base'));
  await expect(page.getByRole('heading', { name: 'Base' })).toBeVisible();
  const tab = page.getByRole('tab', typeof name === 'string' ? { name, exact: true } : { name });
  await tab.click();
  await expect(tab).toHaveAttribute('aria-selected', 'true');
  return page.getByRole('tabpanel');
}

/** An attribute of `locator`, or null when it's gone (a stage that ended): never waits long. */
export async function attr(locator: Locator, name: string): Promise<string | null> {
  return locator.getAttribute(name, { timeout: 1000 }).catch(() => null);
}

/**
 * Presses Next (or Skip) until `done` holds, a line at a time (at most `max` presses). After each
 * press it gives `done` up to 1.5 s to come true before the next, so a loaded machine doesn't
 * read past the line it waits for.
 */
export async function readUntil(page: Page, done: () => Promise<boolean>, max = 30): Promise<void> {
  const next = page.getByRole('button', { name: /^(Skip|Next)$/ });
  for (let i = 0; i < max; i++) {
    // oxlint-disable-next-line no-await-in-loop -- one line at a time
    if (await done()) return;
    // oxlint-disable-next-line no-await-in-loop -- one line at a time
    if (await next.isVisible()) await next.click();
    for (let t = 0; t < 15; t++) {
      // oxlint-disable-next-line no-await-in-loop -- waiting on the line just pressed
      if (await done()) return;
      // oxlint-disable-next-line no-await-in-loop -- a short beat between checks
      await page.waitForTimeout(100);
    }
  }
  expect(await done()).toBe(true);
}

/** Presses the scene's Next until `done` holds (at most `max` presses). */
export async function nextUntil(page: Page, done: () => Promise<boolean>, max = 40): Promise<void> {
  for (let i = 0; i < max; i++) {
    // oxlint-disable-next-line no-await-in-loop -- one press after another
    if (await done()) return;
    // oxlint-disable-next-line no-await-in-loop -- one press after another
    await page.locator('.dlg-next').click();
  }
  expect(await done()).toBe(true);
}
