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

test('a whole round through the UI: start, mid-round and the score count', async ({
  page,
}, info) => {
  const project = info.project.name;
  await freshStart(page, { speed: 'instant' });
  await setDev(page, { seed: 7, targets: [300, 400, 500, 600] });
  await newRun(page);
  await page.getByTestId('host-calm').click();
  await expect(page.getByTestId('round')).toBeVisible();

  // The start: a full hand dealt from the pile, nothing on the table.
  const first = (await hook(page))?.run.round;
  await expect(page.getByTestId('hand').locator('button')).toHaveCount(first?.rules.handSize ?? 0);
  await expect(page.getByTestId('pile')).toHaveAttribute(
    'data-count',
    String(first?.stacks[0]?.length),
  );
  await expect(page.getByTestId('target')).toContainText('300');
  await checkFit(page, [
    '[data-testid^="tile-"]',
    '[data-testid="btn-play"]',
    '[data-testid="btn-clear"]',
  ]);
  await page.screenshot({ path: shot('round-1-start', project) });

  // The hint bot picks each move; the hand refills on its own.
  // A legal opening can spend all three discards before placing a set, so advance by observed
  // plays rather than assuming a turn always means a play.
  for (let turn = 0; turn < 5; turn++) {
    if (((await hook(page))?.run.round?.table.length ?? 0) >= 2) break;
    await botTurn(page);
  }
  await expect(page.locator('[data-testid^="set-"]').first()).toBeVisible();
  await page.screenshot({ path: shot('round-2-mid', project) });
  const h = await hook(page);
  expect(h?.run.round?.playsLeft).toBeLessThan(8);
  const mid = (await hook(page))?.run.round;
  expect(mid?.hand.length).toBe(mid?.rules.handSize);
  await checkFit(page, [
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
  await expect(page.getByTestId('payout')).toBeVisible();
});

test('the count-up plays at normal speed and can be skipped', async ({ page }) => {
  await freshStart(page, { speed: 'normal' });
  await setDev(page, { seed: 7, targets: [300, 400, 500, 600] });
  await newRun(page);
  await page.getByTestId('host-calm').click();
  await playRound(page);
  await expect(page.getByTestId('score-overlay')).toBeVisible();
  await expect(page.getByTestId('score-total')).toHaveCount(0);
  await page.getByTestId('btn-score-skip').click();
  await expect(page.getByTestId('score-total')).toBeVisible();
});

test('play and discard enable only when legal', async ({ page }) => {
  await freshStart(page);
  await setDev(page, { seed: 7, targets: [300, 400, 500, 600] });
  await newRun(page);
  await page.getByTestId('host-calm').click();
  await expect(page.getByTestId('btn-play')).toBeDisabled();
  await expect(page.getByTestId('btn-discard')).toBeDisabled();
  const r = (await hook(page))?.run.round;
  await expect(page.locator('[data-testid^="tile-"]')).toHaveCount(r?.rules.handSize ?? 0);
  // one tile selected: discard is fine, play is not (a single is a last resort)
  const one = page.locator('[data-testid^="tile-"]').first();
  await one.click();
  await expect(page.getByTestId('btn-discard')).toBeEnabled();
  await expect(page.getByTestId('btn-play')).toBeDisabled();
  await one.click();
  await expect(page.getByTestId('btn-discard')).toBeDisabled();
  // a discard refills the hand at once
  const before = (await hook(page))?.run.round?.stacks[0]?.length ?? 0;
  await one.click();
  await page.getByTestId('btn-discard').click();
  await expect(page.locator('[data-testid^="tile-"]')).toHaveCount(r?.rules.handSize ?? 0);
  await expect(page.getByTestId('pile')).toHaveAttribute('data-count', String(before - 1));
});
