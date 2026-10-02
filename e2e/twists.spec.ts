import { expect, test } from '@playwright/test';
import { HOSTS } from '../src/content/hosts';
import { newRun, targetFor } from '../src/engine/run';
import type { RunState } from '../src/engine/runTypes';
import { roundWith } from '../src/engine/testkit';
import { freshStart, hook, playRound, resumeFrom } from './helpers';

const shot = (name: string, project: string) => `test-results/shots/${name}-${project}.png`;

/** A run waiting at a wind's host choice, with an easy target. */
function atHost(wind: number): RunState {
  const run = newRun({ seed: `twist${wind}`, targets: [200, 200, 200, 200] });
  return { ...run, roundIndex: wind, target: targetFor(1, wind, false, run.targets) };
}

for (const host of HOSTS) {
  test(`${host.title}: the banner shows the rule and a whole round can be played`, async ({
    page,
  }, info) => {
    await freshStart(page);
    await resumeFrom(page, atHost(host.wind));
    await expect(page.getByTestId('host')).toContainText(host.title);
    await expect(page.getByTestId('twist-text').nth(host.storm ? 1 : 0)).toContainText(
      host.twistText.slice(0, 20),
    );
    await page.getByTestId(host.storm ? 'host-storm' : 'host-calm').click();
    await expect(page.getByTestId('twist-banner')).toContainText(host.twistText.slice(0, 20));
    if (host.id === 'azureDragon' || host.id === 'fox')
      await page.screenshot({ path: shot(`twist-${host.id}`, info.project.name) });
    const run = (await hook(page))?.run;
    expect(run?.hostId).toBe(host.id);
    expect(run?.round?.twist?.twist.id).toBe(host.twist.id);
    // the whole round, through the UI, is playable under every twist (phone size only: it is slow)
    if (info.project.name === 'phone') {
      await playRound(page);
      await expect(page.getByTestId('score-overlay')).toBeVisible();
    }
  });
}

test('the coil: no discarding until a chow is played', async ({ page }) => {
  await freshStart(page);
  const base = atHost(0);
  const round = roundWith({
    hand: 'p1 p2 p3 s4 s5 s9 m9 m8',
    stacks: ['m1 m2 m3 m4 m5 m6'],
    rules: { handSize: 8 },
    twist: HOSTS.find((h) => h.id === 'azureDragon')?.twist,
    target: 100000,
  });
  await resumeFrom(page, { ...base, phase: 'round', storm: true, round });
  const hand = (await hook(page))?.run.round?.hand ?? [];
  const tile = (k: string) => page.getByTestId(`tile-${hand.find((t) => t.kind === k)?.id}`);
  await tile('s9').click();
  await expect(page.getByTestId('btn-discard')).toBeDisabled();
  await tile('s9').click();
  for (const k of ['p1', 'p2', 'p3']) await tile(k).click();
  await page.getByTestId('btn-play').click();
  expect((await hook(page))?.run.round?.twist?.uncoiled).toBe(true);
  await tile('s9').click();
  await expect(page.getByTestId('btn-discard')).toBeEnabled();
});

test('the swaps: the player may swap one tile once', async ({ page }) => {
  await freshStart(page);
  const base = atHost(1);
  const round = roundWith({
    hand: 'p1 s9 m5',
    stacks: ['m1 m2 m4'],
    rules: { handSize: 3 },
    twist: HOSTS.find((h) => h.id === 'monkey')?.twist,
    target: 100000,
  });
  await resumeFrom(page, { ...base, phase: 'round', round });
  await expect(page.getByTestId('btn-swap')).toBeDisabled();
  const id = round.hand[1]?.id as number;
  await page.getByTestId(`tile-${id}`).click();
  await page.getByTestId('btn-swap').click();
  const after = (await hook(page))?.run.round;
  expect(after?.hand.map((t) => t.id)).not.toContain(id);
  expect(after?.hand).toHaveLength(3);
  await expect(page.getByTestId('btn-swap')).toHaveCount(0);
});

test('the shell: armoured tiles cannot be discarded until a set is played', async ({ page }) => {
  await freshStart(page);
  const base = atHost(3);
  const round = roundWith({
    hand: 'p1 p2 s9 m9 p5 p5 p5 s1',
    stacks: ['m1'],
    twist: HOSTS.find((h) => h.id === 'blackTortoise')?.twist,
    target: 100000,
  });
  const armouredId = round.hand[0]?.id as number;
  const prepared: RunState = {
    ...base,
    phase: 'round',
    storm: true,
    round: {
      ...round,
      twist: { ...(round.twist as NonNullable<typeof round.twist>), tops: [armouredId] },
    },
  };
  await resumeFrom(page, prepared);
  await expect(page.getByTestId(`tile-${armouredId}`).locator('.badge')).toBeVisible();
  await page.getByTestId(`tile-${armouredId}`).click();
  await expect(page.getByTestId('btn-discard')).toBeDisabled();
  expect((await hook(page))?.run.round?.discardsLeft).toBe(4);
  const hand = (await hook(page))?.run.round?.hand ?? [];
  for (const t of hand.filter((x) => x.kind === 'p5'))
    await page.getByTestId(`tile-${t.id}`).click();
  await page.getByTestId(`tile-${armouredId}`).click(); // deselect
  await page.getByTestId('btn-play').click();
  await expect(page.getByTestId(`tile-${armouredId}`).locator('.badge')).toHaveCount(0);
});
