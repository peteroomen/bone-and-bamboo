import { type Page, expect, test } from '@playwright/test';
import { botTurn, freshStart, hook, newRun, playRound, setDev } from './helpers';

const shot = (name: string, project: string) => `test-results/shots/${name}-${project}.png`;

/** Nothing scrolls, and every control is at least 44px on screen. */
async function checkFit(page: Page, selectors: string[]) {
  const vp = page.viewportSize() as { width: number; height: number };
  const scroll = await page.evaluate(() => ({
    h: document.documentElement.scrollHeight,
    w: document.documentElement.scrollWidth,
  }));
  expect(scroll.h).toBeLessThanOrEqual(vp.height);
  expect(scroll.w).toBeLessThanOrEqual(vp.width);
  for (const sel of selectors) {
    const items = page.locator(sel);
    const n = await items.count();
    for (let i = 0; i < n; i++) {
      const box = await items.nth(i).boundingBox();
      if (!box) continue;
      expect(box.width, `${sel} #${i} width`).toBeGreaterThanOrEqual(43.5);
      expect(box.height, `${sel} #${i} height`).toBeGreaterThanOrEqual(43.5);
      expect(box.y + box.height, `${sel} #${i} bottom`).toBeLessThanOrEqual(vp.height + 0.5);
    }
  }
}

test('the brick wall: chosen on setup, a side per wind, free tiles only, then a whole round', async ({
  page,
}, info) => {
  const project = info.project.name;
  await freshStart(page);
  await setDev(page, { seed: 7, targets: [300, 400, 500, 600] });
  await page.getByTestId('btn-new').click();
  await page.getByTestId('draw-wall').click();
  await expect(page.getByTestId('draw-wall')).toHaveAttribute('aria-pressed', 'true');
  await page.getByTestId('btn-start').click();
  // the host screen shows the square, East lit
  await expect(page.getByTestId('wall-square')).toBeVisible();
  await page.screenshot({ path: shot('wall-host', project) });
  await page.getByTestId('host-calm').click();
  await page.getByTestId('btn-banner-ok').click();

  const r0 = (await hook(page))?.run.round;
  expect(r0?.rules.draw).toBe('wall');
  expect(r0?.wall).toHaveLength(30);
  expect(r0?.hand).toHaveLength(r0?.rules.handSize ?? -1);
  await expect(page.locator('[data-testid^="brick-"]')).toHaveCount(30);
  await expect(page.locator('[data-testid^="brick-"][data-free="true"]')).toHaveCount(7);
  // a full hand takes nothing; a covered tile can never be taken
  await expect(page.getByTestId('brick-0')).toBeDisabled();
  await expect(page.getByTestId('brick-10')).toBeDisabled();
  await checkFit(page, [
    '[data-testid^="tile-"]',
    '[data-testid="btn-play"]',
    '[data-testid="btn-auto"]',
  ]);
  await page.screenshot({ path: shot('wall-start', project) });

  // after a move the hand waits for tiles from the wall: play and discard hold
  for (let i = 0; i < 6; i++) {
    const r = (await hook(page))?.run.round;
    if (r && r.hand.length < r.rules.handSize) break;
    await botTurn(page);
  }
  const short = (await hook(page))?.run.round;
  expect(short?.hand.length).toBeLessThan(short?.rules.handSize ?? 0);
  await expect(page.getByTestId('btn-play')).toBeDisabled();
  await expect(page.getByTestId('score-add')).toContainText('Take tiles from the wall');
  // Ask names a tile to take, and it is a free one
  await page.getByTestId('btn-ask').click();
  await expect(page.getByTestId('advice')).toContainText('Take');
  await expect(page.locator('.brick.advised')).toHaveAttribute('data-free', 'true');
  await page.screenshot({ path: shot('wall-take', project) });
  // tap a free tile: it moves to the hand
  const free = page.locator('[data-testid^="brick-"][data-free="true"]').first();
  const before = short?.hand.length ?? 0;
  await free.click();
  await expect.poll(async () => (await hook(page))?.run.round?.hand.length).toBe(before + 1);
  await checkFit(page, ['[data-free="true"]', '[data-testid^="tile-"]']);

  await playRound(page, { auto: true });
  await expect(page.getByTestId('score-overlay')).toBeVisible();
});

test('the brick wall resumes exactly after a reload', async ({ page }) => {
  await freshStart(page);
  await setDev(page, { seed: 3, targets: [300, 400, 500, 600], draw: 'wall' });
  await newRun(page);
  await page.getByTestId('host-calm').click();
  await botTurn(page);
  await botTurn(page, { auto: true });
  const before = (await hook(page))?.run;
  expect(before?.round?.wall?.some((t) => t === null)).toBe(true);
  await page.reload();
  await page.getByTestId('btn-continue').click();
  await expect(page.getByTestId('wall')).toBeVisible();
  expect((await hook(page))?.run).toEqual(before);
});
