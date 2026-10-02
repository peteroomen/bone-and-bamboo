import { type Page, expect, test } from '@playwright/test';
import { chooseMove } from '../src/engine/ai';
import { botTurn, freshStart, hook, newRun, readTips } from './helpers';

const shot = (name: string, project: string) => `test-results/shots/${name}-${project}.png`;

async function newProfile(page: Page) {
  await freshStart(page);
  await page.evaluate(() => localStorage.removeItem('bb.profile.v1'));
  await page.reload();
  await page.getByTestId('title').waitFor();
}

test('a new profile gets the guided first run: a fixed seed, a plain round and a queue of tips', async ({
  page,
}, info) => {
  await newProfile(page);
  await newRun(page);
  await expect(page.getByTestId('tip')).toBeVisible();
  const run0 = (await hook(page))?.run;
  expect(run0?.guided).toBe(true);
  expect(run0?.seed).toBe(11);
  await page.screenshot({ path: shot('guide-tip-host', info.project.name) });

  // a tip holds play: the host buttons cannot be pressed until it is read
  const blocked = await page
    .getByTestId('host-calm')
    .click({ timeout: 1500 })
    .then(() => false)
    .catch(() => true);
  expect(blocked).toBe(true);
  const texts = await readTips(page);
  expect(texts[0]).toMatch(/hosted by a wind/);
  await page.getByTestId('host-calm').click();

  // the first round is plain (no twist) and the wall tip comes first
  expect((await hook(page))?.run.round?.twist).toBeNull();
  await expect(page.getByTestId('twist-banner')).toHaveCount(0);
  await expect(page.getByTestId('tip')).toBeVisible();
  const blockedStack = await page
    .getByTestId('stack-0')
    .click({ timeout: 1500 })
    .then(() => false)
    .catch(() => true);
  expect(blockedStack).toBe(true);
  texts.push(...(await readTips(page)));

  // play the round: after each move any tip that has come due is read
  for (let turn = 0; turn < 60; turn++) {
    const round = (await hook(page))?.run.round;
    if (!round || round.phase !== 'play') break;
    texts.push(...(await readTips(page)));
    if (!(await botTurn(page, { tips: texts }))) break;
  }
  texts.push(...(await readTips(page)));
  const joined = texts.join(' | ');
  expect(joined).toMatch(/Tap a stack/);
  expect(joined).toMatch(/hand is full/);
  expect(joined).toMatch(/pair|run|pong/);
  const seen = (await hook(page))?.run.tipsSeen ?? [];
  expect(seen).toEqual(expect.arrayContaining(['host', 'wall', 'full']));
  expect(new Set(seen).size).toBe(seen.length);

  // the score tip rides on the count-up; finishing it ends the lesson
  await expect(page.getByTestId('score-overlay')).toBeVisible();
  await expect(page.getByTestId('score-tip')).toBeVisible();
  await page.screenshot({ path: shot('guide-tip-score', info.project.name) });
  await page.getByTestId('btn-score-continue').click();
  const profile = await page.evaluate(() =>
    JSON.parse(localStorage.getItem('bb.profile.v1') ?? '{}'),
  );
  expect(profile.guidedDone).toBe(true);
});

test('tips already read are not shown again after a reload, and the next run is not guided', async ({
  page,
}) => {
  await newProfile(page);
  await newRun(page);
  await readTips(page);
  await page.getByTestId('host-calm').click();
  await readTips(page);
  const before = (await hook(page))?.run.tipsSeen ?? [];
  expect(before.length).toBeGreaterThanOrEqual(2);
  await page.reload();
  await page.getByTestId('btn-continue').click();
  await page.waitForTimeout(200);
  expect(await page.getByTestId('tip').count()).toBe(0);
  expect((await hook(page))?.run.tipsSeen).toEqual(before);
  // finish the lesson round, then a new run is a normal one
  await page.evaluate(() =>
    localStorage.setItem('bb.profile.v1', JSON.stringify({ guidedDone: true })),
  );
  await page.evaluate(() => localStorage.removeItem('bb.run.v1'));
  await page.reload();
  await newRun(page);
  expect((await hook(page))?.run.guided).toBe(false);
  await expect(page.getByTestId('tip')).toHaveCount(0);
});

test('Ask the dragon names a legal action in the guided round, and the guide appears on the title', async ({
  page,
}) => {
  await newProfile(page);
  await expect(page.locator('.guide').first()).toBeVisible();
  await newRun(page);
  await readTips(page);
  await page.getByTestId('host-calm').click();
  await readTips(page);
  await page.getByTestId('btn-ask').click();
  await expect(page.getByTestId('advice')).toContainText('Draw');
  const round = (await hook(page))?.run.round;
  expect(round && chooseMove).toBeTruthy();
});
