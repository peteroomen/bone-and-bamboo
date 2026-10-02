import { expect, test } from '@playwright/test';

test('the title shows at this size', async ({ page }, info) => {
  await page.goto('/');
  const title = page.getByTestId('title');
  await expect(title).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Bone & Bamboo' })).toBeVisible();
  const box = await title.boundingBox();
  const vp = page.viewportSize();
  expect(box && vp && box.y >= 0 && box.y + box.height <= vp.height + 1).toBeTruthy();
  await page.screenshot({ path: `test-results/shots/title-${info.project.name}.png` });
});
