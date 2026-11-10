// T505: Sundown's darkness on its dev map (`?map=dev_dark`, render/__fixtures__/devBattle.ts):
// dev_act2 half dark as W1 starts and full dark as W2 does, two lamps (the west road's bend and
// the merge), Rivets inside the bend's lamp and out in the dark, and a Prism on the high ground
// with a Rivet beside it that only the Prism's beam lights. The overlay draws exactly the sim's
// darkness (`__sd.render().darkness.dark` = `state.dark`, mid-ease and at full dark) and punches
// out each light source the sim counts; the lamp-lit Rivet keeps its full range while the one
// in the dark loses 15%; selecting the dark one dims its ring. At full dark (T530b) the night is
// deep on the world and light on the actors (the tones `__sd.render()` reports, and the playfield
// as shot: under half as bright as before the dark), the lamps glow with lamplight pooled in their
// discs, the scenery in their light stays lit while the rest sinks, and a beaming Prism's crystal
// glows. Screenshots in <out>/screens/darkness/ (look at them: the dark and the lit discs are the
// point).
import type { Page } from '@playwright/test';
import { expect, test } from './fixtures.ts';
import { nextFrames, shot, waitForReady } from './hooks.ts';

const MAP = 'dev_dark';
const LAMP_RIVET = [8, 4] as const;
const DARK_RIVET = [3, 6] as const;
const PRISM = [13, 4] as const;
const PRISM_RIVET = [14, 4] as const;

type Row = { lit: boolean; darkRangePct: number; beamActive: boolean };

/** The live tower on tile (c, r): its light, its range penalty, and whether it beams. */
const tower = (page: Page, [c, r]: readonly [number, number]): Promise<Row | null> =>
  page.evaluate(
    ([col, row]) => {
      const st = globalThis.__sd!.state()!;
      for (let i = 0; i < st.towers.used; i++) {
        const t = st.towers.items[i]!;
        if (t.alive && t.col === col && t.row === row) {
          return { lit: t.lit, darkRangePct: t.darkRangePct, beamActive: t.beamActive };
        }
      }
      return null;
    },
    [c, r] as const,
  );

/** Relative luminance (0–1) of a 0xRRGGBB tone: how bright a multiply leaves white. */
const lumOf = (c: number): number => {
  const lin = (v: number) =>
    v / 255 <= 0.04045 ? v / 255 / 12.92 : ((v / 255 + 0.055) / 1.055) ** 2.4;
  return 0.2126 * lin((c >> 16) & 0xff) + 0.7152 * lin((c >> 8) & 0xff) + 0.0722 * lin(c & 0xff);
};

/** The playfield's mean brightness (0–255) as shot: the middle of the view, clear of the HUD. */
async function playfieldLum(page: Page): Promise<number> {
  await nextFrames(page);
  const png = await page.screenshot({ clip: { x: 320, y: 200, width: 640, height: 320 } });
  return page.evaluate(async (b64) => {
    const img = new Image();
    img.src = `data:image/png;base64,${b64}`;
    await img.decode();
    const c = document.createElement('canvas');
    c.width = img.width;
    c.height = img.height;
    const g = c.getContext('2d')!; // a 2D context always exists for a fresh canvas
    g.drawImage(img, 0, 0);
    const d = g.getImageData(0, 0, c.width, c.height).data;
    let sum = 0;
    for (let i = 0; i < d.length; i += 4)
      sum += 0.2126 * d[i]! + 0.7152 * d[i + 1]! + 0.0722 * d[i + 2]!;
    return sum / (d.length / 4);
  }, png.toString('base64'));
}

/** The sim's darkness and the overlay's, after the canvas has drawn the state as it stands. */
async function darkness(page: Page): Promise<{ sim: number; drawn: number; lights: number }> {
  await nextFrames(page);
  return page.evaluate(() => {
    const sd = globalThis.__sd!;
    const d = sd.render()!.darkness;
    return { sim: sd.state()!.dark, drawn: d.dark, lights: d.lights };
  });
}

test('darkness: the overlay is the sim’s dark, lamps and a beaming Prism keep full range', async ({
  page,
}) => {
  await page.goto(`/?test=1&map=${MAP}&seed=1`);
  await waitForReady(page);
  await expect(page.getByTestId('hud')).toBeVisible();
  await page.evaluate(
    ([lamp, dark, prism, beside]) => {
      const sd = globalThis.__sd!;
      sd.setSpeed(0);
      sd.enqueue({ type: 'build', tower: 'rivet', tile: [lamp[0], lamp[1]] });
      sd.enqueue({ type: 'build', tower: 'rivet', tile: [dark[0], dark[1]] });
      sd.enqueue({ type: 'build', tower: 'prism', tile: [prism[0], prism[1]] });
      sd.enqueue({ type: 'build', tower: 'rivet', tile: [beside[0], beside[1]] });
      sd.fastForward(1);
    },
    [LAMP_RIVET, DARK_RIVET, PRISM, PRISM_RIVET] as const,
  );
  expect(await page.evaluate(() => globalThis.__sd!.state()!.towers.live)).toBe(4);
  // Before wave 1: no dark, no overlay.
  expect(await darkness(page)).toEqual({ sim: 0, drawn: 0, lights: 0 });
  const dayLum = await playfieldLum(page);

  // W1 starts: the dark eases toward half over 4 s; a second in, the overlay matches the sim.
  await page.evaluate(() => {
    const sd = globalThis.__sd!;
    sd.enqueue({ type: 'callWave' });
    sd.fastForward(60);
  });
  const easing = await darkness(page);
  expect(easing.sim).toBeGreaterThan(0);
  expect(easing.sim).toBeLessThan(0.5);
  expect(easing.drawn).toBe(easing.sim);
  expect(easing.lights).toBeGreaterThanOrEqual(2); // the two lamps
  await shot(page, 'darkness', 1, 'dusk-easing');

  // W2, called as soon as it can be, then past the ease: full dark.
  const wave = await page.evaluate(() => {
    const sd = globalThis.__sd!;
    for (let k = 0; k < 20_000 && sd.state()!.wave < 2; k++) {
      const phase = sd.state()!.schedule.phase;
      if (phase === 'countdown') sd.enqueue({ type: 'callWave' });
      sd.fastForward(1);
    }
    sd.fastForward(260);
    return sd.state()!.wave;
  });
  expect(wave).toBe(2);
  const full = await darkness(page);
  expect(full).toMatchObject({ sim: 1, drawn: 1 });

  // T530b: the night's tone. Deep on the world, a light veil on the actors, and the playfield as
  // shot under half as bright as before the dark (the lit discs and the actors still show).
  const night = await page.evaluate(() => {
    const r = globalThis.__sd!.render()!;
    return { ...r.darkness, glow: r.glow };
  });
  expect(lumOf(night.world)).toBeLessThan(0.05);
  expect(lumOf(night.veil)).toBeGreaterThan(0.5);
  // The scenery in the lamps' light stays lit (their gateposts), the rest sinks into the night.
  expect(night.litScenery).toBeGreaterThanOrEqual(2);
  expect(night.darkScenery).toBeGreaterThan(night.litScenery);
  // Both lamps glow and pool their light in their discs; the moons wait for a lighting schedule.
  expect(night.glow.props).toBeGreaterThanOrEqual(2);
  expect(night.glow.pools).toBe(full.lights);
  const nightLum = await playfieldLum(page);
  expect(nightLum).toBeLessThan(0.5 * dayLum);

  // The lamp-lit Rivet keeps its full range; the one out in the dark loses 15%.
  expect(await tower(page, LAMP_RIVET)).toMatchObject({ lit: true, darkRangePct: 0 });
  expect(await tower(page, DARK_RIVET)).toMatchObject({ lit: false, darkRangePct: 0.15 });

  // W2's Nibblers reach the Prism's beam on the south road: it lights itself and its neighbour,
  // and the overlay punches its disc too.
  const beamed = await page.evaluate(([col, row]) => {
    const sd = globalThis.__sd!;
    const prism = () => {
      const st = sd.state()!;
      for (let i = 0; i < st.towers.used; i++) {
        const t = st.towers.items[i]!;
        if (t.alive && t.col === col && t.row === row) return t;
      }
      return null;
    };
    for (let k = 0; k < 3600 && prism()?.beamActive !== true; k++) sd.fastForward(1);
    return prism()?.beamActive === true;
  }, PRISM);
  expect(beamed).toBe(true);
  expect(await tower(page, PRISM)).toMatchObject({ lit: true, darkRangePct: 0 });
  expect(await tower(page, PRISM_RIVET)).toMatchObject({ lit: true, darkRangePct: 0 });
  const lit = await darkness(page);
  expect(lit).toEqual({ sim: 1, drawn: 1, lights: 3 });
  // The beaming Prism's crystal glows, and its light pools in its disc too.
  const glow = await page.evaluate(() => globalThis.__sd!.render()!.glow);
  expect(glow.crystals).toBe(1);
  expect(glow.pools).toBe(3);
  await shot(page, 'darkness', 2, 'full-dark-prism');

  // Selecting the Rivet in the dark shows its ring shortened and dimmed; the lamp-lit one's isn't.
  const click = async ([c, r]: readonly [number, number]) => {
    const p = await page.evaluate(([x, y]) => globalThis.__sd!.tileToClient(x, y), [c, r] as const);
    expect(p).not.toBeNull();
    await page.mouse.click(p!.x, p!.y); // checked just above
    await nextFrames(page);
  };
  await click(DARK_RIVET);
  expect(await page.evaluate(() => globalThis.__sd!.render()!.darkness.ringDimmed)).toBe(true);
  await shot(page, 'darkness', 3, 'dim-ring');
  await click(LAMP_RIVET);
  expect(await page.evaluate(() => globalThis.__sd!.render()!.darkness.ringDimmed)).toBe(false);
});
