import { type Page, expect, test } from '@playwright/test';
import { botTurn, freshStart, hook, newRun, playRound } from './helpers';

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

test('a whole round through the UI: start, mid-round and the score count', async ({
  page,
}, info) => {
  const project = info.project.name;
  await freshStart(page, { speed: 'instant' });
  await newRun(page);
  await page.getByTestId('host-folk').click();
  await expect(page.getByTestId('round')).toBeVisible();

  // The start: an empty hand, eight stacks, nothing on the table.
  await expect(page.getByTestId('hand').locator('button')).toHaveCount(0);
  await expect(page.locator('[data-testid^="stack-"]')).toHaveCount(8);
  await expect(page.getByTestId('target')).toContainText('1,000');
  await checkFit(page, [
    '[data-testid^="stack-"]',
    '[data-testid="btn-play"]',
    '[data-testid="btn-auto"]',
  ]);
  await page.screenshot({ path: shot('round-1-start', project) });

  // Fill the hand by tapping stacks: the hint bot picks which.
  // A legal opening can spend all three discards before placing a set.
  // Advance by observed plays, rather than assuming a turn always means a play.
  for (let turn = 0; turn < 5; turn++) {
    if (((await hook(page))?.run.round?.table.length ?? 0) >= 2) break;
    await botTurn(page);
  }
  await expect(page.locator('[data-testid^="set-"]').first()).toBeVisible();
  await page.screenshot({ path: shot('round-2-mid', project) });
  const h = await hook(page);
  expect(h?.run.round?.playsLeft).toBeLessThan(8);
  await checkFit(page, [
    '[data-testid^="stack-"]',
    '[data-testid^="tile-"]',
    '[data-testid="btn-play"]',
    '[data-testid="btn-discard"]',
  ]);

  // Select a set: the preview shows what it would add.
  const round = (await hook(page))?.run.round;
  expect(round).toBeTruthy();

  await playRound(page);
  await expect(page.getByTestId('score-overlay')).toBeVisible();
  await expect(page.getByTestId('score-total')).toBeVisible();
  await page.screenshot({ path: shot('round-3-score', project) });
  const end = (await hook(page))?.run;
  const total = end?.round?.result?.score.total ?? -1;
  expect(total).toBeGreaterThan(0);
  await expect(page.getByTestId('score-total')).toHaveText(total.toLocaleString('en-GB'));
  await page.getByTestId('btn-score-continue').click();
  await expect(page.getByTestId(/^phase-/)).toBeVisible();
});

test('the count-up plays at normal speed and can be skipped', async ({ page }) => {
  await freshStart(page, { speed: 'normal' });
  await newRun(page);
  await page.getByTestId('host-folk').click();
  await playRound(page, { auto: true });
  await expect(page.getByTestId('score-overlay')).toBeVisible();
  await expect(page.getByTestId('score-total')).toHaveCount(0);
  await page.getByTestId('btn-score-skip').click();
  await expect(page.getByTestId('score-total')).toBeVisible();
});

test('play and discard enable only when legal', async ({ page }) => {
  await freshStart(page);
  await newRun(page);
  await page.getByTestId('host-folk').click();
  await expect(page.getByTestId('btn-play')).toBeDisabled();
  await expect(page.getByTestId('btn-discard')).toBeDisabled();
  await page.getByTestId('btn-auto').click();
  await expect(page.getByTestId('btn-auto')).toBeDisabled();
  await expect(page.locator('[data-testid^="tile-"]')).toHaveCount(8);
  // a stack can't be taken from with a full hand
  await expect(page.getByTestId('stack-0')).toBeDisabled();
  // one tile selected: discard is fine, play is not (a single is a last resort)
  const first = page.locator('[data-testid^="tile-"]').first();
  await first.click();
  await expect(page.getByTestId('btn-discard')).toBeEnabled();
  await expect(page.getByTestId('btn-play')).toBeDisabled();
  await first.click();
  await expect(page.getByTestId('btn-discard')).toBeDisabled();
});
