// Capture a deterministic scroll-driven image sequence from the existing 3D showcase.
// Run with the Flask server at http://127.0.0.1:5000, then:
// node scripts/capture-showcase-frames.cjs
// The resulting PNGs are masters; encode to AVIF/WebP before shipping.
const { chromium } = require('playwright');
const fs = require('node:fs/promises');
const path = require('node:path');

(async () => {
  const base = process.env.GKM_URL || 'http://127.0.0.1:5000';
  const frames = Math.max(2, Number(process.env.FRAMES || 120));
  const output = path.resolve(process.env.FRAME_DIR || 'static/showcase-frames');
  const width = Number(process.env.FRAME_WIDTH || 1440);
  const height = Number(process.env.FRAME_HEIGHT || 900);
  await fs.mkdir(output, { recursive: true });
  const browser = await chromium.launch({ headless: true, args: ['--enable-webgl', '--use-gl=angle', '--use-angle=swiftshader'] });
  try {
    const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
    await page.goto(base + '?renderer=main', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('#showcase canvas', { timeout: 60000 });
    await page.waitForFunction(() => document.querySelector('#showcase')?.dataset.ready === 'true', { timeout: 90000 });
    for (let i = 0; i < frames; i++) {
      const progress = i / (frames - 1);
      await page.evaluate(p => {
        const root = document.querySelector('#showcase');
        const stage = root.querySelector('.showcase-stage');
        const y = scrollY + root.getBoundingClientRect().top + (root.offsetHeight - stage.offsetHeight) * p;
        scrollTo({ top: y, behavior: 'instant' });
      }, progress);
      await page.waitForTimeout(130);
      const canvas = page.locator('#showcase canvas').first();
      await canvas.screenshot({ path: path.join(output, String(i).padStart(4, '0') + '.png'), animations: 'disabled' });
      if (i % 20 === 0) console.log('Captured', i + 1, '/', frames);
    }
    await fs.writeFile(path.join(output, 'manifest.json'), JSON.stringify({ frames, width, height, format: 'png', pattern: '%04d.png' }, null, 2));
  } finally { await browser.close(); }
})().catch(err => { console.error(err); process.exitCode = 1; });
