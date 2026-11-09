// scratch: node .shot.tmp.mjs <name> <map> [ticks] [build]
import { chromium } from '@playwright/test';
const [name, map, ticks = '0', build = 'par'] = process.argv.slice(2);
const OUT = '/tmp/claude-0/-home-user-stardust/7156e6b1-e125-514b-89a1-eaea2df28fd8/scratchpad/shots';
const b = await chromium.launch({ executablePath: process.env.CHROME_PATH, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
if (map === 'card') {
  await p.goto('http://localhost:4481/gallery.html');
  await p.waitForTimeout(2500);
  const ids = ticks.split(',');
  let i = 0;
  for (const id of ids) {
    const el = p.locator(`[data-sprite-id="${id}"]`).first();
    await el.screenshot({ path: `${OUT}/${name}_${i++}.png` });
  }
} else if (map === 'gallery') {
  await p.goto('http://localhost:4481/gallery.html');
  await p.waitForTimeout(3000);
  const h = await p.evaluate(() => document.documentElement.scrollHeight);
  console.log('gallery height', h);
  const y = Number(ticks);
  await p.screenshot({ path: `${OUT}/${name}.png`, clip: { x: 0, y, width: 1280, height: 2400 }, fullPage: true });
} else {
  await p.goto(`http://localhost:4481/?test=1&map=${map}&skipIntro=1&seed=1`);
  await p.waitForFunction(() => globalThis.__sd !== undefined, null, { timeout: 20000 });
  await p.evaluate(() => globalThis.__sd.ready);
  {
    await p.evaluate((bd) => globalThis.__sd.autoplay(bd), build);
    await p.evaluate((t) => globalThis.__sd.fastForward(t), Number(ticks));
    await p.evaluate(() => globalThis.__sd.setSpeed(0));
  }
  await p.waitForTimeout(600);
  await p.screenshot({ path: `${OUT}/${name}.png` });
}
await b.close();
