import { test, expect } from '@playwright/test';
import {
  factoryAdvice,
  factoryReduce,
  newFactory,
  type FactoryAction,
} from '../src/engine/factory';
import { kindName } from '../src/engine/tiles';

test('factory: build sets, hold and recover, automate safely, reload and finish a crate', async ({
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
  await expect(page.getByRole('heading', { name: 'The tile works' })).toBeVisible();
  await page.getByRole('button', { name: 'How to play' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByRole('button', { name: 'Back to the bench' }).click();
  await page.getByRole('button', { name: 'Hold ↓', exact: true }).click();
  await page.getByRole('button', { name: 'Held tile: 2 Bamboo' }).click();
  await page.getByRole('button', { name: 'Feed Press ↓', exact: true }).click();
  await page.getByRole('button', { name: 'Return 2 Bamboo from Press to tray' }).click();
  await page.getByRole('button', { name: 'Held tile: 2 Bamboo' }).click();
  await page.getByRole('button', { name: 'Feed Press ↓', exact: true }).click();
  await page.getByRole('button', { name: 'Feed Press ↓', exact: true }).click();
  await expect(page.getByTestId('factory-score')).toHaveText('00020');
  for (let i = 0; i < 3; i++)
    await page.getByRole('button', { name: 'Feed Loom ↓', exact: true }).click();
  for (let i = 0; i < 3; i++)
    await page.getByRole('button', { name: 'Feed Kiln ↓', exact: true }).click();
  await expect(page.getByTestId('factory-score')).toHaveText('00125');
  await page.getByRole('button', { name: 'Fit gate · 40 ◉', exact: true }).click();
  await expect(page.getByTestId('factory-brass')).toHaveText('85 ◉');
  await page.getByLabel('Gate suit', { exact: true }).selectOption('s');
  await page.getByLabel('Gate destination', { exact: true }).selectOption('run');
  await page.getByLabel('Gate suit', { exact: true }).selectOption('both');
  await page.getByRole('button', { name: 'Auto ▶', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Auto ▶', exact: true })).toBeVisible({
    timeout: 15000,
  });
  await expect(page.getByRole('button', { name: 'Auto ▶', exact: true })).toBeDisabled();
  const saved = await page.evaluate(() => localStorage.getItem('bb.factory.v1'));
  await page.reload();
  expect(await page.evaluate(() => localStorage.getItem('bb.factory.v1'))).toBe(saved);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const sizes = await page
    .locator('.factory button:visible')
    .evaluateAll((els) => els.map((e) => e.getBoundingClientRect().height));
  expect(sizes.every((h) => h >= 44)).toBe(true);
  await page.screenshot({ path: `test-results/factory-${info.project.name}.png`, fullPage: true });
  const data = JSON.parse(saved!) as { seed: number; actions: FactoryAction[] };
  let s = newFactory(data.seed);
  for (const a of data.actions) s = factoryReduce(s, a).state;
  for (let i = 0; i < 160 && !s.finished; i++) {
    const a = factoryAdvice(s);
    if ('source' in a) {
      const t = s.tray.find((t) => t.id === a.source);
      if (t)
        await page
          .getByRole('button', { name: `Held tile: ${kindName(t.kind)}`, exact: true })
          .first()
          .click();
      else await page.getByRole('button', { name: /^Front tile:/ }).click();
      if (a.type === 'route')
        await page
          .getByRole('button', {
            name: `Feed ${{ pair: 'Press', triple: 'Kiln', run: 'Loom' }[a.machine]} ↓`,
            exact: true,
          })
          .click();
      else if (a.type === 'hold')
        await page.getByRole('button', { name: 'Hold ↓', exact: true }).click();
      else await page.getByRole('button', { name: 'Recycle +1 ◉', exact: true }).click();
    } else if (a.type === 'finish')
      await page.getByRole('button', { name: /^Finish shift/ }).click();
    else throw new Error(`Unexpected policy action ${a.type}`);
    s = factoryReduce(s, a).state;
  }
  expect(s.finished).toBe(true);
  await expect(
    page.getByRole('heading', { name: `A little factory, ${s.score} points.` }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Open another crate →', exact: true }).click();
  await expect(page.getByTestId('factory-score')).toHaveText('00000');
  await page.getByRole('button', { name: 'New crate', exact: true }).click();
  await page.getByRole('button', { name: 'Keep playing', exact: true }).click();
  expect(errors).toEqual([]);
});
