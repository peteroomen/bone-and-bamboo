import { type Page, expect, test } from '@playwright/test';
import { botTurn, freshStart, newRun, setDev } from './helpers';

type AudioInfo = { state: string; sounds: number; notes: number; scene: string };
const audio = (page: Page) =>
  page.evaluate(
    () => (window as unknown as { __bbAudio?: () => unknown }).__bbAudio?.() as AudioInfo,
  );

async function hide(page: Page, hidden: boolean) {
  await page.evaluate((h) => {
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => h });
    document.dispatchEvent(new Event('visibilitychange'));
  }, hidden);
}

test('sound plays after a tap, music starts, and everything stops when the tab is hidden', async ({
  page,
}) => {
  await freshStart(page, { speed: 'normal' });
  await setDev(page, { seed: 5, targets: [300, 400, 500, 600] });
  expect((await audio(page)).state).toBe('none');
  await expect.poll(async () => (await audio(page)).scene).toBe('title');
  await newRun(page); // the first tap wakes the audio
  await expect.poll(async () => (await audio(page)).state).toBe('running');
  const before = await audio(page);
  await page.getByTestId('host-calm').click();
  await expect.poll(async () => (await audio(page)).scene).toBe('round0');
  await botTurn(page);
  const played = await audio(page);
  expect(played.sounds).toBeGreaterThan(before.sounds + 3);

  // the music schedules ahead on the audio clock
  await expect.poll(async () => (await audio(page)).notes, { timeout: 15000 }).toBeGreaterThan(0);

  // hidden: the context is suspended and nothing more is scheduled
  await hide(page, true);
  await expect.poll(async () => (await audio(page)).state).toBe('suspended');
  const quiet = await audio(page);
  await page.waitForTimeout(1500);
  const still = await audio(page);
  expect(still.notes).toBe(quiet.notes);
  expect(still.sounds).toBe(quiet.sounds);

  // back: it runs again
  await hide(page, false);
  await expect.poll(async () => (await audio(page)).state).toBe('running');
});

test('volumes follow the settings', async ({ page }) => {
  await freshStart(page);
  await page.getByTestId('btn-settings').click();
  await page.getByTestId('sfx').fill('0.2');
  await page.getByTestId('music').fill('0');
  const v = (await audio(page)) as unknown as { volumes: { sfx: number; music: number } };
  expect(v.volumes.sfx).toBeCloseTo(0.2);
  expect(v.volumes.music).toBe(0);
});

test('instant speed plays a round with no animation waits; normal speed animates', async ({
  page,
}) => {
  await freshStart(page, { speed: 'instant' });
  await setDev(page, { seed: 5, targets: [300, 400, 500, 600] });
  await newRun(page);
  await page.getByTestId('host-calm').click();
  const animations = () => page.evaluate(() => document.getAnimations().length);
  let busiest = 0;
  const t0 = Date.now();
  for (let i = 0; i < 40; i++) {
    if (!(await botTurn(page, { auto: true }))) break;
    busiest = Math.max(busiest, await animations());
  }
  expect(busiest).toBe(0);
  await expect(page.getByTestId('score-overlay')).toBeVisible();
  await expect(page.getByTestId('score-total')).toBeVisible();
  expect(Date.now() - t0).toBeLessThan(60_000);

  // at normal speed a tap on a stack sets tiles flying
  await freshStart(page, { speed: 'normal' });
  await setDev(page, { seed: 5, targets: [300, 400, 500, 600] });
  await newRun(page);
  await page.getByTestId('host-calm').click();
  await page.getByTestId('stack-0').click();
  await page.getByTestId('stack-1').click();
  expect(await animations()).toBeGreaterThan(0);
});
