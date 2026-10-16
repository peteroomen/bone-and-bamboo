import { type Page, expect } from '@playwright/test';

/** A fresh browser with a fixed seed; the introduction already seen. */
export async function freshGame(
  page: Page,
  seed = 7,
  speed: 'normal' | 'fast' | 'instant' = 'fast',
) {
  await page.goto('/');
  await page.evaluate(
    ([s, sp]) => {
      localStorage.clear();
      localStorage.setItem('bb.dev.v1', JSON.stringify({ seed: s }));
      localStorage.setItem('bb.dice.settings.v1', JSON.stringify({ speed: sp, introSeen: true }));
    },
    [seed, speed] as const,
  );
  await page.reload();
  await page.getByTestId('new-run').click();
  await expect(page.getByTestId('roll')).toBeVisible();
}

export async function idle(page: Page) {
  await page.waitForFunction(() => window.__bb?.busy() === 0, null, { timeout: 30_000 });
}

export async function shot(page: Page, name: string, project: string) {
  await page.evaluate(() => window.__bb?.textures());
  await page.waitForTimeout(200);
  await page.screenshot({ path: `test-results/${project}-${name}.png` });
}

/** Let the guide play until the round ends. */
export async function playRoundWithGuide(page: Page) {
  for (let i = 0; i < 400; i++) {
    const a = await page.evaluate(() => window.__bb?.advise() ?? null);
    if (!a) return;
    const problem = await page.evaluate((x) => window.__bb?.dispatch(x) ?? null, a);
    expect(problem).toBeNull();
    await idle(page);
    // the score count blocks until it is done (or tapped)
    const count = page.locator('.count-overlay');
    if (await count.count()) await count.click();
    await idle(page);
  }
}
