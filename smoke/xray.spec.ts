// Review R3, R2-S3 (D143, D144): Bricks is never hidden. On A3M3 *The Gap* (`map=a3_m03`, its first
// door) par builds a Mindspike on the pad in front of his post; as W13 starts (QUILL's vitals cue)
// he holds the choke behind it. His silhouette shows THROUGH the tower (over its pixels only: an
// `ink.0` checker edged in `white.1`, nothing round the tower), and his bar sits over his head
// with his stone at its left end, never on the tower's base. The flow plays par to W13, plays a
// moment at 1×, and shoots the post at 1× and a 2× crop of it; then plays par on to the SEAL and
// shoots it again (look at all four: his head and shoulders read through the Mindspike at 1×, the
// bar over his head). Screenshots in <out>/screens/xray/.
import { expect, test } from './fixtures.ts';
import { nextFrames, shot, waitForReady } from './hooks.ts';
import { outPath } from './out.ts';

test('xray: Bricks shows through the tower in front of his post at W13, his bar over his head', async ({
  page,
}) => {
  await page.goto('/?test=1&map=a3_m03&seed=1');
  await waitForReady(page);
  const reached = await page.evaluate(() => {
    const sd = globalThis.__sd!; // installed: waitForReady passed
    sd.setSpeed(0);
    sd.autoplay('par');
    sd.fastForward(0);
    const st = sd.state()!;
    for (let k = 0; k < 60 * 900 && st.wave < 13 && st.outcome === 'playing'; k++) {
      sd.fastForward(1);
    }
    return { wave: st.wave, outcome: st.outcome };
  });
  expect(reached).toEqual({ wave: 13, outcome: 'playing' });
  // A moment at 1× (the purchases' floaters gone), so the outline is drawn on a real frame.
  await page.evaluate(() => globalThis.__sd!.setSpeed(1));
  await page.waitForTimeout(1200);
  await page.evaluate(() => globalThis.__sd!.setSpeed(0));
  await nextFrames(page);

  const look = await page.evaluate(() => globalThis.__sd!.render()!.blocker);
  expect(look.shown).toBe(1);
  expect(look.xray).toBe(true);
  await shot(page, 'xray', 1, 'w13-post');

  // A close-up of the post (the page shows the game at 2×): the outline and the bar, pixel by pixel.
  const at = await page.evaluate(() => {
    const sd = globalThis.__sd!;
    const s = sd.state()!;
    const b = s.allies.items.find((a) => a.alive && a.kind === 'bricks');
    return b === undefined ? null : sd.tileToClient(b.x - 0.5, b.y - 0.5);
  });
  expect(at).not.toBeNull();
  if (at === null) return;
  const clip = { x: Math.max(0, at.x - 100), y: Math.max(0, at.y - 110), width: 200, height: 150 };
  await page.screenshot({ path: outPath('screens/xray/02-w13-post-zoom.png'), clip });

  // On to the SEAL (the last wave's start): he still shows through it.
  const sealed = await page.evaluate(() => {
    const sd = globalThis.__sd!;
    const st = sd.state()!;
    for (let k = 0; k < 60 * 900 && st.pendingInput === null && st.outcome === 'playing'; k++) {
      sd.fastForward(1);
    }
    return st.pendingInput;
  });
  expect(sealed).toBe('seal');
  await nextFrames(page);
  expect(await page.evaluate(() => globalThis.__sd!.render()!.blocker.xray)).toBe(true);
  await page.screenshot({ path: outPath('screens/xray/03-seal-post.png') });
  await page.screenshot({ path: outPath('screens/xray/04-seal-post-zoom.png'), clip });
});
