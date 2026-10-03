import { test, expect } from '@playwright/test';
import { newChase, chaseAdvice, chaseReduce } from '../src/engine/handChase';

test('hand chase: exchange, complete hands, save, bank, upgrade and four winds', async ({
  page,
}, info) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  // Find a repeatable complete run using only the public-information policy.
  let seed = 64000;
  for (; seed < 64050; seed++) {
    let s = newChase(seed);
    for (let i = 0; i < 100 && s.phase !== 'won' && s.phase !== 'lost'; i++) {
      const r = chaseReduce(
        s,
        s.phase === 'upgrade' ? { type: 'upgrade', pattern: 'complete' } : chaseAdvice(s),
      );
      if (r.error) break;
      s = r.state;
    }
    if (s.phase === 'won') break;
  }
  expect(seed).toBeLessThan(64050);
  await page.addInitScript((seed) => {
    if (!localStorage.getItem('bb.hand-chase.v1'))
      localStorage.setItem('bb.hand-chase.v1', JSON.stringify({ version: 1, seed, actions: [] }));
    localStorage.setItem(
      'bb.settings.v1',
      JSON.stringify({ sfx: 0, music: 0, ambience: 0, speed: 'instant' }),
    );
  }, seed);
  await page.goto('/');
  await expect(page.getByRole('region', { name: 'Your rack' }).getByRole('button')).toHaveCount(16);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const sizes = await page.locator('.chase-rack button').evaluateAll((els) =>
    els.map((e) => {
      const b = e.getBoundingClientRect();
      return [b.width, b.height];
    }),
  );
  expect(sizes.every(([w, h]) => w! >= 44 && h! >= 44)).toBe(true);
  await page.getByRole('button', { name: 'Hands', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Hand book' })).toContainText('Seven Pairs');
  await page.getByRole('button', { name: 'Close', exact: true }).click();
  await page.screenshot({
    path: `test-results/hand-chase-${info.project.name}.png`,
    fullPage: true,
  });
  let state = newChase(seed);
  let reloaded = false;
  let sawComplete = false;
  for (let i = 0; i < 100 && state.phase !== 'won'; i++) {
    const a =
      state.phase === 'upgrade'
        ? { type: 'upgrade' as const, pattern: 'complete' as const }
        : chaseAdvice(state);
    if (a.type === 'upgrade') {
      await page.getByRole('button', { name: /^Complete hand/ }).click();
    } else if (a.type === 'bank') {
      await page.getByRole('button', { name: /Target reached · bank/ }).click();
    } else if ('ids' in a) {
      await page.getByRole('button', { name: 'Suggest', exact: true }).click();
      await expect(page.locator('.chase-rack button[aria-pressed="true"]')).toHaveCount(
        a.ids.length,
      );
      if (a.type === 'exchange') await page.getByRole('button', { name: /^Exchange/ }).click();
      else {
        if (await page.getByRole('button', { name: 'Play hand', exact: true }).count()) {
          sawComplete ||= await page
            .getByRole('button', { name: 'Play hand', exact: true })
            .isEnabled()
            .catch(() => false);
        }
        await page.getByRole('button', { name: /^Play (small )?hand$/ }).click();
      }
    }
    const r = chaseReduce(state, a);
    expect(r.error).toBeUndefined();
    state = r.state;
    await expect(page.getByTestId('chase-points')).toContainText(state.points.toLocaleString());
    if (!reloaded && state.phase === 'play') {
      const before = await page
        .locator('.chase-rack button')
        .evaluateAll((els) => els.map((e) => e.getAttribute('data-tile-id')));
      await page.reload();
      await expect(page.locator('.chase-rack button')).toHaveCount(before.length);
      expect(
        await page
          .locator('.chase-rack button')
          .evaluateAll((els) => els.map((e) => e.getAttribute('data-tile-id'))),
      ).toEqual(before);
      reloaded = true;
    }
  }
  expect(sawComplete).toBe(true);
  await expect(page.getByRole('heading', { name: 'Four winds, well played.' })).toBeVisible();
  await page.getByRole('button', { name: 'Replay same deal' }).click();
  await expect(page.getByRole('heading', { name: 'East wind' })).toBeVisible();
  expect(errors).toEqual([]);
});
