import { expect, test } from '@playwright/test';
import { runReduce, newRun } from '../src/engine/run';
import type { RunState } from '../src/engine/runTypes';
import { roundWith } from '../src/engine/testkit';
import { freshStart, hook, newRun as tapNewRun, resumeFrom, setDev } from './helpers';

const shot = (name: string, project: string) => `test-results/shots/${name}-${project}.png`;

/** A run in a round we have set up by hand. */
function prepared(
  spec: Parameters<typeof roundWith>[0],
  target = 100,
  dragons: string[] = [],
): RunState {
  let run = newRun({ seed: 'e2e', targets: [target, 400, 500, 600] });
  run = runReduce(run, { type: 'chooseHost', storm: false }).state;
  const round = roundWith({ rules: { handSize: 8 }, ...spec, target, dragons });
  return { ...run, dragons, round };
}

test('the introduction shows on the first round, can be replayed, and the set book and hints work', async ({
  page,
}, info) => {
  await freshStart(page, { introSeen: false });
  await setDev(page, { seed: 5, targets: [300, 400, 500, 600] });
  await tapNewRun(page);
  await page.getByTestId('host-calm').click();
  await expect(page.getByTestId('sheet-help')).toBeVisible();
  await expect(page.getByTestId('help-intro')).toContainText('Red Dragon');
  await page.screenshot({ path: shot('help-intro', info.project.name) });
  await page.getByTestId('sheet-close').click();
  await expect(page.getByTestId('sheet-help')).toHaveCount(0);
  await page.reload();
  await page.getByTestId('btn-continue').click();
  await expect(page.getByTestId('round')).toBeVisible();
  await expect(page.getByTestId('sheet-help')).toHaveCount(0);

  await page.getByTestId('btn-help').click();
  await page.getByTestId('help-tab-sets').click();
  await expect(page.getByTestId('help-sets').locator('li')).toHaveCount(7);
  await page.screenshot({ path: shot('help-sets', info.project.name) });
  await page.getByTestId('help-tab-dragons').click();
  await expect(page.getByTestId('help-dragons').locator('li')).toHaveCount(23);
  await page.getByTestId('help-tab-hints').click();
  await page.getByTestId('hint-full').click();
  await page.getByTestId('sheet-close').click();
  await page.reload();
  const saved = await page.evaluate(() =>
    JSON.parse(localStorage.getItem('bb.settings.v1') ?? '{}'),
  );
  expect(saved.hints).toBe('full');
});

test('Ask the dragon selects a legal move with a reason, every turn of a round', async ({
  page,
}) => {
  await freshStart(page);
  await setDev(page, { seed: 9, targets: [300, 400, 500, 600] });
  await tapNewRun(page);
  await page.getByTestId('host-calm').click();
  for (let turn = 0; turn < 40; turn++) {
    const round = (await hook(page))?.run.round;
    if (!round || round.phase !== 'play') break;
    await page.getByTestId('btn-ask').click();
    await expect(page.getByTestId('advice')).toBeVisible();
    const sel = page.locator('[data-testid^="tile-"][aria-pressed="true"]');
    const n = await sel.count();
    const play = page.getByTestId('btn-play');
    const discard = page.getByTestId('btn-discard');
    if (n > 0 && (await play.isEnabled())) await play.click();
    else if (n > 0 && (await discard.isEnabled())) await discard.click();
    else if (await page.getByTestId('btn-bank').count()) await page.getByTestId('btn-bank').click();
    else if (await page.getByTestId('btn-upgrade').count())
      await page.getByTestId('btn-upgrade').click();
    else throw new Error('Ask returned nothing playable');
  }
  expect((await hook(page))?.run.round?.phase).toBe('done');
});

test('upgrade a tabled pong to a kong, then bank the table; it settles once and resumes', async ({
  page,
}, info) => {
  const project = info.project.name;
  await freshStart(page);
  const run = prepared({ hand: 'p5 p5 p5 p5 s1 s2 s3 m9', stacks: ['m1 m2 m3 m4'] });
  await resumeFrom(page, run);
  // play the pong from the hand
  const hand = (await hook(page))?.run.round?.hand ?? [];
  const fives = hand.filter((t) => t.kind === 'p5');
  for (const t of fives.slice(0, 3)) await page.getByTestId(`tile-${t.id}`).click();
  await page.getByTestId('btn-play').click();
  await expect(page.getByTestId('set-0')).toBeVisible();
  await expect(page.getByTestId('btn-upgrade')).toBeVisible();
  await expect(page.getByTestId('btn-upgrade')).toContainText('+');
  await page.screenshot({ path: shot('upgrade-offer', project) });
  const playsBefore = (await hook(page))?.run.round?.playsLeft ?? 0;
  await page.getByTestId('btn-upgrade').click();
  const after = (await hook(page))?.run.round;
  expect(after?.table[0]?.kind).toBe('kong');
  expect(after?.table).toHaveLength(1);
  expect(after?.playsLeft).toBe(playsBefore - 1);
  await expect(page.getByTestId('btn-upgrade')).toHaveCount(0);
  // the target (100) is beaten: bank
  await expect(page.getByTestId('btn-bank')).toBeVisible();
  const money = (await hook(page))?.run.money ?? 0;
  await page.getByTestId('btn-bank').click();
  await expect(page.getByTestId('score-overlay')).toBeVisible();
  if (await page.getByTestId('btn-score-skip').count())
    await page.getByTestId('btn-score-skip').click();
  await page.getByTestId('btn-score-continue').click();
  await expect(page.getByTestId('payout')).toBeVisible();
  const settled = (await hook(page))?.run;
  expect(settled?.scores).toHaveLength(1);
  expect(settled?.round?.result?.unusedDiscards).toBe(4);
  expect(settled?.money).toBe(money + (settled?.payout?.total ?? 0));
  await page.reload();
  await page.getByTestId('btn-continue').click();
  await expect(page.getByTestId('payout')).toBeVisible();
  expect((await hook(page))?.run).toEqual(settled);
});

test('dragon goals show progress, and a play that breaks a multiplier is warned about', async ({
  page,
}, info) => {
  await freshStart(page);
  const run = prepared({ hand: 'p2 p3 p4 w1 w1 s6 s7 s8', stacks: ['m1'] }, 100000, [
    'allSimples',
    'pongHall',
  ]);
  await resumeFrom(page, run);
  await expect(page.getByTestId('goals')).toContainText('Rice Bowl not yet');
  await expect(page.getByTestId('goals')).toContainText('Bell Hall not yet');
  const hand = (await hook(page))?.run.round?.hand ?? [];
  const id = (k: string) => hand.filter((t) => t.kind === k).map((t) => t.id);
  for (const t of ['p2', 'p3', 'p4']) await page.getByTestId(`tile-${id(t)[0]}`).click();
  await page.getByTestId('btn-play').click();
  await expect(page.getByTestId('goals')).toContainText('Rice Bowl no 1s, 9s or winds yet');
  await expect(page.getByTestId('goals')).toContainText('Bell Hall 0/2 pongs or kongs');
  const hand2 = (await hook(page))?.run.round?.hand ?? [];
  const winds = hand2.filter((t) => t.kind === 'w1').map((t) => t.id);
  for (const w of winds) await page.getByTestId(`tile-${w}`).click();
  await expect(page.getByTestId('warn')).toContainText('Rice Bowl');
  await expect(page.getByTestId('score-add')).toContainText('→');
  await page.screenshot({ path: shot('goals-warning', info.project.name) });
});
