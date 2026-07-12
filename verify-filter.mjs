import { chromium } from 'playwright';

const SHOT_DIR = '/private/tmp/claude-501/-Users-tushar-Documents-platinum-township/5d60a187-a199-4a44-a7b8-3eb3337785d0/scratchpad/shots';
await (await import('fs/promises')).mkdir(SHOT_DIR, { recursive: true });

const browser = await chromium.launch();

async function run(viewport, prefix) {
  const page = await browser.newPage({ viewport });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (msg) => { if (msg.type() === 'error') errors.push(msg.text()); });

  await page.goto('http://localhost:3000/walkthrough', { waitUntil: 'networkidle' });
  await page.waitForTimeout(4000); // let loading screen / R3F scene settle

  await page.screenshot({ path: `${SHOT_DIR}/${prefix}-01-walkthrough.png` });

  // Open the minimap radar -> full site map
  const mapArea = page.locator('[title="Open site map"]');
  await mapArea.click({ timeout: 15000 });
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${SHOT_DIR}/${prefix}-02-sitemap-open.png` });

  // Open the plot-size filter dropdown
  const filterToggle = page.locator('button[aria-label="Filter plots by size"]');
  await filterToggle.waitFor({ timeout: 10000 });
  await filterToggle.click();
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${SHOT_DIR}/${prefix}-03-filter-open.png` });

  const countText = await page.locator('text=/of \\d+ plots|All \\d+ plots/').first().textContent().catch(() => null);

  // Drag the max-thumb slider down using keyboard (native range input) for determinism
  const maxThumb = page.locator('input[aria-label="Maximum plot size"]');
  await maxThumb.focus();
  for (let i = 0; i < 30; i++) await page.keyboard.press('ArrowLeft');
  await page.waitForTimeout(300);

  const minThumb = page.locator('input[aria-label="Minimum plot size"]');
  await minThumb.focus();
  for (let i = 0; i < 10; i++) await page.keyboard.press('ArrowRight');
  await page.waitForTimeout(300);

  await page.screenshot({ path: `${SHOT_DIR}/${prefix}-04-filtered.png` });

  const countTextAfter = await page.locator('text=/of \\d+ plots|All \\d+ plots/').first().textContent().catch(() => null);
  const pinCountAfter = await page.locator('button[aria-label*="details"]').count();

  // Reset
  const resetBtn = page.locator('button:has-text("Reset")');
  await resetBtn.click();
  await page.waitForTimeout(300);
  const pinCountReset = await page.locator('button[aria-label*="details"]').count();
  await page.screenshot({ path: `${SHOT_DIR}/${prefix}-05-reset.png` });

  // Close filter panel via outside click, confirm map + legend + zoom still there
  await page.mouse.click(20, 20);
  await page.waitForTimeout(300);
  const legendVisible = await page.locator('footer').first().isVisible().catch(() => false);
  const zoomInVisible = await page.locator('button[aria-label="Zoom in"]').isVisible().catch(() => false);

  // Click a plot pin to confirm plot info panel still opens
  const firstPin = page.locator('button[aria-label*="details"]').first();
  let plotPanelOpened = false;
  if (await firstPin.count() > 0) {
    await firstPin.click({ force: true });
    await page.waitForTimeout(400);
    plotPanelOpened = await page.locator('[role="dialog"]').count() > 1 || await page.locator('text=/Sq\\. Yd\\./').count() > 0;
    await page.screenshot({ path: `${SHOT_DIR}/${prefix}-06-plotpanel.png` });
  }

  console.log(JSON.stringify({
    prefix,
    countText,
    countTextAfter,
    pinCountAfter,
    pinCountReset,
    legendVisible,
    zoomInVisible,
    plotPanelOpened,
    errors,
  }, null, 2));

  await page.close();
}

await run({ width: 1440, height: 900 }, 'desktop');
await run({ width: 390, height: 844 }, 'mobile');

await browser.close();
