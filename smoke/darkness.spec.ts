// T505: Sundown's darkness on its dev map (`?map=dev_dark`, render/__fixtures__/devBattle.ts):
// dev_act2 half dark as W1 starts and full dark as W2 does, two lamps (the west road's bend and
// the merge), Rivets inside the bend's lamp and out in the dark, and a Prism on the high ground
// with a Rivet beside it that only the Prism's beam lights. The overlay draws exactly the sim's
// darkness (`__sd.render().darkness.dark` = `state.dark`, mid-ease and at full dark) and punches
// out each light source the sim counts; the lamp-lit Rivet keeps its full range while the one
// in the dark loses 15%; selecting the dark one dims its ring. Screenshots in
// test-results/screens/darkness/ (look at them: the dark and the lit discs are the point).
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
