import { chromium } from '@playwright/test';
const b = await chromium.launch({ executablePath: process.env.CHROME_PATH, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
await p.goto('http://localhost:4481/gallery.html'); await p.waitForTimeout(2500);
const r = await p.evaluate(() => [...document.querySelectorAll('[data-sprite-id]')].map(e => { const r = e.getBoundingClientRect(); return [e.dataset.spriteId, Math.round(r.top), Math.round(r.height), Math.round(r.width)]; }));
for (const x of r) console.log(x.join(' '));
await b.close();
