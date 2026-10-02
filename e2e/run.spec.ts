import { type Page, expect, test } from '@playwright/test';
import {
  freshStart,
  hook,
  newRun,
  phase,
  playRound,
  savedRun,
  setDev,
  setSettings,
  shopVisit,
} from './helpers';

const shot = (name: string, project: string) => `test-results/shots/${name}-${project}.png`;

async function startRun(page: Page, targets: number[]) {
  await freshStart(page);
  await setDev(page, { seed: 42, targets });
  await newRun(page);
}

/** After a won round: the count-up, the payout, the gift (swap or take) and the teahouse. */
async function toShop(page: Page, project: string, name: string) {
  await expect(page.getByTestId('score-overlay')).toBeVisible();
  await page.getByTestId('btn-score-continue').click();
  await expect(page.getByTestId('payout')).toBeVisible();
  if (name) await page.screenshot({ path: shot(`${name}-payout`, project) });
  await page.getByTestId('btn-payout-continue').click();
  await expect(page.getByTestId('gift')).toBeVisible();
  if (name) await page.screenshot({ path: shot(`${name}-gift`, project) });
  if (await page.getByTestId('gift-0').count()) await page.getByTestId('gift-0').click();
  else await page.getByTestId('btn-gift-decline').click();
  await expect(page.getByTestId('shop')).toBeVisible();
}

test('a full four-round run through the UI, with every part of the teahouse', async ({
  page,
}, info) => {
  const project = info.project.name;
  await startRun(page, [300, 400, 500, 600]);
  for (let r = 0; r < 4; r++) {
    await expect(page.getByTestId('host')).toBeVisible();
    await page.getByTestId(r % 2 ? 'host-storm' : 'host-calm').click();
    await playRound(page);
    if (r === 3) break;
    await toShop(page, project, r === 1 ? 'run-r2' : '');
    if (r === 1) await page.screenshot({ path: shot('run-shop', project) });
    await shopVisit(page, r + 1);
  }
  await expect(page.getByTestId('score-overlay')).toBeVisible();
  await page.getByTestId('btn-score-continue').click();
  await expect(page.getByTestId('phase-won')).toBeVisible();
  await page.screenshot({ path: shot('run-won', project) });
  const run = (await hook(page))?.run;
  expect(run?.scores).toHaveLength(4);
  await page.getByTestId('btn-end-continue').click();
  await expect(page.getByTestId('title')).toBeVisible();
});

test('a missed target ends the run', async ({ page }, info) => {
  await startRun(page, [1e9, 1, 1, 1]);
  await page.getByTestId('host-calm').click();
  await playRound(page);
  await page.getByTestId('btn-score-continue').click();
  await expect(page.getByTestId('phase-over')).toBeVisible();
  await page.screenshot({ path: shot('run-over', info.project.name) });
});

test('reloading mid-round resumes exactly', async ({ page }) => {
  await startRun(page, [300, 400, 500, 600]);
  await page.getByTestId('host-calm').click();
  await page.getByTestId('btn-auto').click();
  const before = (await hook(page))?.run;
  expect(before?.round?.hand).toHaveLength(8);
  await page.reload();
  await expect(page.getByTestId('title')).toBeVisible();
  await page.getByTestId('btn-continue').click();
  await expect(page.getByTestId('round')).toBeVisible();
  expect((await hook(page))?.run).toEqual(before);
  expect(await savedRun(page)).toEqual(before);
  // and play on
  await playRound(page);
  await expect(page.getByTestId('score-overlay')).toBeVisible();
});

test('reloading in the teahouse, with a pack open, resumes exactly', async ({ page }, info) => {
  const project = info.project.name;
  await startRun(page, [300, 400, 500, 600]);
  await page.getByTestId('host-calm').click();
  await playRound(page);
  await toShop(page, project, '');
  await page.getByTestId('buy-almanac-0').click();
  await page.getByTestId('buy-pack').click();
  await expect(page.getByTestId('sheet-pack')).toBeVisible();
  await page.screenshot({ path: shot('run-pack', project) });
  const before = (await hook(page))?.run;
  expect(before?.shop?.open).toBeTruthy();
  await page.reload();
  await page.getByTestId('btn-continue').click();
  await expect(page.getByTestId('sheet-pack')).toBeVisible();
  expect((await hook(page))?.run).toEqual(before);
  await page.getByTestId('pack-offer-0').click();
  await expect(page.getByTestId('sheet-pack')).toHaveCount(0);
  expect(await phase(page)).toBe('shop');
  // the set picker shows your tiles
  await page.getByTestId('pb-set').click();
  await expect(page.getByTestId('sheet-set')).toBeVisible();
  await page.screenshot({ path: shot('run-set', project) });
});

test('the player bar is on the run screens and fits at this size', async ({ page }) => {
  await startRun(page, [300, 400, 500, 600]);
  await expect(page.getByTestId('playerbar')).toBeVisible();
  await page.getByTestId('host-calm').click();
  await expect(page.getByTestId('playerbar')).toBeVisible();
  const vp = page.viewportSize() as { width: number; height: number };
  for (const id of ['pb-dragons', 'pb-fortunes', 'pb-set']) {
    const box = await page.getByTestId(id).boundingBox();
    expect(box?.height ?? 0).toBeGreaterThanOrEqual(43.5);
    expect(box?.width ?? 0).toBeGreaterThanOrEqual(43.5);
    expect((box?.y ?? 0) + (box?.height ?? 0)).toBeLessThanOrEqual(vp.height + 0.5);
  }
  await setSettings(page, {});
});
