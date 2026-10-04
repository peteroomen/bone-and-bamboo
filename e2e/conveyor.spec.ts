import { test, expect } from '@playwright/test';

test('conveyor: physical motion, build a route, split, queue, score, replay and restore', async ({
  page,
}, info) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.addInitScript(() =>
    localStorage.setItem(
      'bb.settings.v1',
      JSON.stringify({ sfx: 0, music: 0, ambience: 0, speed: 'normal' }),
    ),
  );
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'The little tile works' })).toBeVisible();
  await page.getByRole('button', { name: 'How conveyors work' }).click();
  await page.getByRole('button', { name: 'Back to the tabletop' }).click();
  await page.getByRole('button', { name: 'Play ▶', exact: true }).click();
  await page.waitForFunction(
    () => document.querySelector('[data-tile-id="0"]')?.getAttribute('data-tile-cell') === '16',
    undefined,
    { timeout: 10000 },
  );
  await page.getByRole('button', { name: 'Pause Ⅱ', exact: true }).click();
  const save = await page.evaluate(() => localStorage.getItem('bb.conveyor.v1'));
  await page.reload();
  expect(await page.evaluate(() => localStorage.getItem('bb.conveyor.v1'))).toBe(save);
  await expect(page.getByRole('button', { name: 'Play ▶', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Rewind ↶', exact: true }).click();
  await page.locator('[data-cell="15"]').click();
  await page.getByRole('button', { name: 'Rotate ↻', exact: true }).click();
  for (let i = 0; i < 3; i++)
    await page.getByRole('button', { name: 'Step ▷', exact: true }).click();
  await expect(page.locator('[data-cell="14"]')).toHaveClass(/cv-blocked/);
  await expect(page.getByRole('status')).toContainText('waiting');
  await page.getByRole('button', { name: 'Clear belts', exact: true }).click();
  await page.getByRole('button', { name: 'Yes, clear belts', exact: true }).click();
  await expect(page.getByTestId('conveyor-score')).toHaveText('0000');
  await page.getByRole('button', { name: 'Straight', exact: true }).click();
  for (const cell of [15, 17, 12, 31, 32, 33]) await page.locator(`[data-cell="${cell}"]`).click();
  await page.getByRole('button', { name: 'Splitter', exact: true }).click();
  await page.locator('[data-cell="16"]').click();
  await page.getByLabel('Splitter suit', { exact: true }).selectOption('s');
  await page.getByLabel('Splitter number', { exact: true }).selectOption('2');
  await page.getByLabel('Splitter suit', { exact: true }).selectOption('p');
  await page.getByLabel('Splitter number', { exact: true }).selectOption('0');
  await page.getByRole('button', { name: 'Right bend', exact: true }).click();
  await page.locator('[data-cell="11"]').click();
  await page.getByRole('button', { name: 'Left bend', exact: true }).click();
  await page.getByRole('button', { name: 'Build pointing N', exact: true }).click();
  await page.locator('[data-cell="18"]').click();
  await page.getByRole('button', { name: 'Straight', exact: true }).click();
  await page.getByRole('button', { name: 'Build pointing S', exact: true }).click();
  await page.locator('[data-cell="23"]').click();
  await page.getByRole('button', { name: 'Left bend', exact: true }).click();
  await page.getByRole('button', { name: 'Build pointing E', exact: true }).click();
  await page.locator('[data-cell="30"]').click();
  await page.getByRole('button', { name: 'Select', exact: true }).click();
  await page.getByRole('button', { name: 'Play ▶', exact: true }).click();
  await expect(page.getByTestId('conveyor-score')).not.toHaveText('0000', { timeout: 18000 });
  await page.getByRole('button', { name: 'Pause Ⅱ', exact: true }).click();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const cells = await page
    .locator('.cv-grid button')
    .evaluateAll((els) =>
      els.map((e) => [e.getBoundingClientRect().width, e.getBoundingClientRect().height]),
    );
  expect(cells.every(([w, h]) => w! >= 44 && h! >= 44)).toBe(true);
  await page.screenshot({ path: `test-results/conveyor-${info.project.name}.png`, fullPage: true });
  for (
    let i = 0;
    i < 100 && (await page.getByRole('button', { name: 'Step ▷', exact: true }).isEnabled());
    i++
  )
    await page.getByRole('button', { name: 'Step ▷', exact: true }).click();
  await expect(page.getByTestId('conveyor-score')).toHaveText('0640');
  await expect(page.getByRole('status')).toContainText('Crate complete');
  await page.getByRole('button', { name: 'Rewind ↶', exact: true }).click();
  await page.getByLabel('Bay 1 recipe', { exact: true }).selectOption('triple');
  await page.getByRole('button', { name: 'Starter layout', exact: true }).click();
  await page.getByRole('button', { name: 'Yes, restore layout', exact: true }).click();
  await expect(page.getByLabel('Bay 1 recipe', { exact: true })).toHaveValue('pair');
  expect(errors).toEqual([]);
});
