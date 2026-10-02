import { expect, test } from '@playwright/test';
import { freshStart, hook, newRun, playRound, setDev, setSettings } from './helpers';

const shot = (name: string, project: string) => `test-results/shots/${name}-${project}.png`;

test('the title offers Continue, New run, Collection and Settings', async ({ page }) => {
  await freshStart(page);
  for (const id of ['btn-new', 'btn-collection', 'btn-settings'])
    await expect(page.getByTestId(id)).toBeVisible();
  await expect(page.getByTestId('btn-continue')).toHaveCount(0);
  await page.getByTestId('btn-new').click();
  await expect(page.getByTestId('setup')).toBeVisible();
  await page.getByTestId('btn-back').click();
  await page.getByTestId('btn-collection').click();
  await expect(page.getByTestId('collection')).toBeVisible();
});

test('settings persist, and only unlocked colourways are offered', async ({ page }, info) => {
  await freshStart(page);
  await page.getByTestId('btn-settings').click();
  await expect(page.getByTestId('colourway-theatre')).toBeVisible();
  await expect(page.getByTestId('colourway-porcelain')).toHaveCount(0);
  await expect(page.getByTestId('colourway-papercut')).toHaveCount(0);
  await page.getByTestId('speed-fast').click();
  await page.getByTestId('hints-full').click();
  await page.getByTestId('haptics-off').click();
  await page.getByTestId('sfx').fill('0.3');
  await page.reload();
  await page.getByTestId('btn-settings').click();
  await expect(page.getByTestId('speed-fast')).toHaveAttribute('aria-checked', 'true');
  await expect(page.getByTestId('hints-full')).toHaveAttribute('aria-checked', 'true');
  await expect(page.getByTestId('haptics-off')).toHaveAttribute('aria-checked', 'true');
  expect(await page.getByTestId('sfx').inputValue()).toBe('0.3');
  await page.screenshot({ path: shot('settings', info.project.name) });

  // the development flag opens every colourway; choosing one changes the whole look
  await setDev(page, { unlockAll: true });
  await page.reload();
  await page.getByTestId('btn-settings').click();
  await expect(page.getByTestId('colourway-porcelain')).toBeVisible();
  await expect(page.getByTestId('colourway-papercut')).toBeVisible();
  await page.getByTestId('colourway-papercut').click();
  await expect(page.locator('.viewport')).toHaveAttribute('data-theme', 'papercut');
  await page.screenshot({ path: shot('settings-papercut', info.project.name) });
  await page.reload();
  await expect(page.locator('.viewport')).toHaveAttribute('data-theme', 'papercut');
  // a locked colourway falls back when the flag is off
  await page.evaluate(() => localStorage.setItem('bb.dev.v1', '{}'));
  await page.reload();
  await expect(page.locator('.viewport')).toHaveAttribute('data-theme', 'theatre');
});

test('winning a run unlocks Two Rivers, a lantern and porcelain, and they can be used', async ({
  page,
}, info) => {
  await freshStart(page);
  await setDev(page, { seed: 77, targets: [200, 200, 200, 200] });
  await newRun(page);
  for (let r = 0; r < 4; r++) {
    await page.getByTestId('host-calm').click();
    await playRound(page);
    await page.getByTestId('btn-score-continue').click();
    if (r === 3) break;
    await page.getByTestId('btn-payout-continue').click();
    if (await page.getByTestId('btn-gift-decline').count())
      await page.getByTestId('btn-gift-decline').click();
    await page.getByTestId('btn-leave').click();
  }
  await expect(page.getByTestId('phase-won')).toBeVisible();
  const unlocks = page.getByTestId('unlocks');
  await expect(unlocks).toContainText('Two Rivers');
  await expect(unlocks).toContainText('Lantern 2');
  await expect(unlocks).toContainText('Porcelain');
  await page.screenshot({ path: shot('unlock-reveal', info.project.name) });
  await page.getByTestId('btn-end-continue').click();

  // the collection shows the records and what is open
  await page.getByTestId('btn-collection').click();
  await expect(page.getByTestId('col-set-twoRivers')).not.toHaveClass(/locked/);
  await expect(page.getByTestId('col-set-jadeCourt')).toHaveClass(/locked/);
  await expect(page.getByTestId('col-colourway-porcelain')).not.toHaveClass(/locked/);
  await expect(page.getByTestId('col-colourway-papercut')).toHaveClass(/locked/);
  await expect(page.getByTestId('col-records')).toContainText('1 of 1');
  await page.screenshot({ path: shot('collection', info.project.name) });
  await page.getByTestId('btn-back').click();

  // lanterns are lit per tile set: Bone & Bamboo has lantern 2, Two Rivers is still at 1
  await page.getByTestId('btn-new').click();
  await expect(page.getByTestId('lantern-2')).toBeEnabled();
  await expect(page.getByTestId('lantern-3')).toBeDisabled();
  await page.getByTestId('set-twoRivers').click();
  await expect(page.getByTestId('set-jadeCourt')).toBeDisabled();
  await expect(page.getByTestId('lantern-2')).toBeDisabled();
  await page.screenshot({ path: shot('setup', info.project.name) });
  await page.getByTestId('btn-start').click();
  const run = (await hook(page))?.run;
  expect(run?.tileSet).toBe('twoRivers');
  expect(run?.lantern).toBe(1);
  expect(run?.tiles).toHaveLength(76);
  expect(run?.target).toBe(200);
});

test('the offline panel shows, and a save code round-trips', async ({ page }) => {
  await freshStart(page);
  await page.evaluate(() =>
    localStorage.setItem(
      'bb.profile.v1',
      JSON.stringify({
        guidedDone: true,
        runsPlayed: 2,
        runsWon: 1,
        bestRound: 54321,
        lanterns: { boneBamboo: 2 },
      }),
    ),
  );
  await setSettings(page, { speed: 'fast', hints: 'full' });
  await page.reload();
  await page.getByTestId('btn-settings').click();
  await expect(page.getByTestId('install-panel')).toBeVisible();
  await expect(page.getByTestId('offline-status')).toBeVisible();
  await page.getByTestId('btn-copy-save').click();
  const code = await page.getByTestId('save-code').inputValue();
  expect(code.startsWith('BB1.')).toBe(true);

  // erase everything
  await page.getByTestId('btn-reset').click();
  await page.getByTestId('btn-confirm').click();
  await page.getByTestId('btn-collection').click();
  await expect(page.getByTestId('col-records')).toContainText('0 of 0');
  await page.getByTestId('btn-back').click();

  // load the code back
  await page.getByTestId('btn-settings').click();
  await page.getByTestId('btn-load-save').click();
  await page.getByTestId('load-code').fill('not a save');
  await page.getByTestId('btn-load-code').click();
  await expect(page.getByTestId('load-error')).toBeVisible();
  await page.getByTestId('load-code').fill(code);
  await page.getByTestId('btn-load-code').click();
  await page.getByTestId('btn-confirm').click();
  await page.getByTestId('btn-collection').click();
  await expect(page.getByTestId('col-records')).toContainText('1 of 2');
  await expect(page.getByTestId('col-records')).toContainText('54,321');
  await page.getByTestId('btn-back').click();
  await page.getByTestId('btn-settings').click();
  await expect(page.getByTestId('speed-fast')).toHaveAttribute('aria-checked', 'true');
});
