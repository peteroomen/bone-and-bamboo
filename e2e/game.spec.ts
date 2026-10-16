import { expect, test } from '@playwright/test';
import { freshGame, idle, playRoundWithGuide, shot } from './helpers';

test('the title shows and a run starts', async ({ page }, info) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /Bone/ })).toBeVisible();
  await shot(page, 'title', info.project.name);
  await freshGame(page);
  await shot(page, 'start', info.project.name);
});

test('roll, then tap a die on the table to hold it', async ({ page }, info) => {
  await freshGame(page);
  await page.getByTestId('roll').click();
  await idle(page);
  const run = await page.evaluate(() => window.__bb!.run()!);
  expect(run.current!.rollsLeft).toBe(23);
  const die = run.current!.cup.find((c) => !c.spent)!;
  const at = await page.evaluate((id) => window.__bb!.dieAt(id), die.dieId);
  expect(at).not.toBeNull();
  await page.mouse.click(at!.x, at!.y);
  await idle(page);
  const held = await page.evaluate(
    (id) => window.__bb!.run()!.current!.cup.find((c) => c.dieId === id)!.held,
    die.dieId,
  );
  expect(held).toBe(true);
  await shot(page, 'held', info.project.name);
  // the held die stays put on the next roll
  const face = die.face;
  await page.getByTestId('roll').click();
  await idle(page);
  const after = await page.evaluate(
    (id) => window.__bb!.run()!.current!.cup.find((c) => c.dieId === id)!.face,
    die.dieId,
  );
  expect(after).toBe(face);
  await shot(page, 'rolled', info.project.name);
});

test('taking a set from the buttons puts it on the rack', async ({ page }, info) => {
  await freshGame(page);
  for (let i = 0; i < 10; i++) {
    await page.getByTestId('roll').click();
    await idle(page);
    const take = page.locator('.take').first();
    if (await take.count()) {
      await take.click();
      await idle(page);
      const rack = await page.evaluate(() => window.__bb!.run()!.current!.rack.length);
      expect(rack).toBe(1);
      await shot(page, 'rack', info.project.name);
      return;
    }
  }
  throw new Error('no set in ten rolls');
});

test('the hand book lists hands and sets a target', async ({ page }, info) => {
  await freshGame(page);
  await page.getByTestId('roll').click();
  await idle(page);
  await page.locator('.btn.aim').click();
  await expect(page.getByRole('dialog', { name: 'Hands' })).toBeVisible();
  await shot(page, 'book', info.project.name);
  await page.locator('.book-row:not(.off):not(.guide-pick)').nth(1).click();
  await expect(page.locator('.btn.aim')).toContainText('Aiming for');
  await shot(page, 'target', info.project.name);
});

test('a round played by the guide reaches the teahouse and the next round', async ({
  page,
}, info) => {
  await freshGame(page, 7, 'instant');
  await playRoundWithGuide(page);
  await expect(page.getByTestId('collect')).toBeVisible();
  await shot(page, 'cashout', info.project.name);
  await page.getByTestId('collect').click();
  await expect(page.getByTestId('next')).toBeVisible();
  await shot(page, 'shop', info.project.name);
  await page.getByTestId('next').click();
  await expect(page.getByTestId('roll')).toBeVisible();
  const round = await page.evaluate(() => window.__bb!.run()!.round);
  expect(round).toBe(1);
});

test('the score count shows a finished hand', async ({ page }, info) => {
  await freshGame(page, 7, 'normal');
  for (let i = 0; i < 400; i++) {
    const a = await page.evaluate(() => window.__bb!.advise());
    if (!a || a.action.type === 'end') break;
    await page.evaluate((x) => window.__bb!.dispatch(x), a);
    if (await page.locator('.count-overlay').count()) {
      await page.waitForTimeout(2600);
      await shot(page, 'count', info.project.name);
      return;
    }
    await idle(page);
  }
  throw new Error('no hand finished');
});

test('nothing on screen errors', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await freshGame(page, 3, 'instant');
  await playRoundWithGuide(page);
  expect(errors).toEqual([]);
});
