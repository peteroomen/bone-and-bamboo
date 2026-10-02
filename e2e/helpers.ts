/**
 * Drives the real UI with the engine's hint bot: the bot decides, and every decision is carried
 * out by tapping the same buttons and tiles a player would.
 */
import type { Page } from '@playwright/test';
import { chooseMove, chooseStack } from '../src/engine/ai';
import type { RunState } from '../src/engine/runTypes';

export interface BbHook {
  readonly run: RunState;
  readonly scoring: boolean;
}

export async function hook(page: Page): Promise<BbHook | null> {
  return page.evaluate(() => (window as unknown as { __bb?: BbHook }).__bb ?? null);
}

export async function setSettings(page: Page, settings: Record<string, unknown>): Promise<void> {
  await page.evaluate((s) => {
    const cur = JSON.parse(localStorage.getItem('bb.settings.v1') ?? '{}') as Record<
      string,
      unknown
    >;
    localStorage.setItem('bb.settings.v1', JSON.stringify({ ...cur, ...s }));
  }, settings);
}

/** A fresh browser: nothing saved, the given settings, the title showing. */
export async function freshStart(
  page: Page,
  settings: Record<string, unknown> = {},
): Promise<void> {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await setSettings(page, { speed: 'instant', introSeen: true, ...settings });
  // not a new profile: no guided first run unless a test asks for one
  await page.evaluate(() =>
    localStorage.setItem('bb.profile.v1', JSON.stringify({ guidedDone: true })),
  );
  await page.reload();
  await page.getByTestId('title').waitFor();
}

export async function newRun(page: Page): Promise<void> {
  await page.getByTestId('btn-new').click();
  // after the guided first run, a new run begins at the setup screen
  const begin = page.getByTestId('btn-start');
  if ((await begin.count()) > 0 || (await page.getByTestId('setup').count()) > 0)
    await begin.click();
}

const T = { timeout: 5000 };

/** Take one tile per bot choice until the hand is full (or use the Auto button now and then). */
async function refill(page: Page): Promise<void> {
  for (let guard = 0; guard < 20; guard++) {
    const h = await hook(page);
    const round = h?.run.round;
    if (!round || round.phase !== 'play') return;
    if (round.hand.length >= round.rules.handSize) return;
    const i = chooseStack(round);
    if (i === null) return;
    await page.getByTestId(`stack-${i}`).click(T);
    await page.waitForFunction(
      (n) => ((window as unknown as { __bb?: BbHook }).__bb?.run.round?.hand.length ?? 0) > n,
      round.hand.length,
      T,
    );
  }
}

/** One turn of the bot, played through the UI. Returns false once the round is over. */
export async function botTurn(
  page: Page,
  opts: { auto?: boolean; tips?: string[] } = {},
): Promise<boolean> {
  const h = await hook(page);
  const round = h?.run.round;
  if (!round || round.phase !== 'play') return false;
  if (round.hand.length < round.rules.handSize && round.stacks.some((s) => s.length > 0)) {
    if (opts.auto) await page.getByTestId('btn-auto').click(T);
    else await refill(page);
  }
  if (opts.tips) opts.tips.push(...(await readTips(page)));
  const now = (await hook(page))?.run.round;
  if (!now || now.phase !== 'play') return false;
  const move = chooseMove(now);
  if (!move) return false;
  for (const id of move.ids) {
    if (opts.tips) opts.tips.push(...(await readTips(page)));
    await page.getByTestId(`tile-${id}`).click(T);
  }
  if (opts.tips) opts.tips.push(...(await readTips(page)));
  await page.getByTestId(move.type === 'play' ? 'btn-play' : 'btn-discard').click(T);
  await page.waitForFunction(
    (turns) => {
      const r = (window as unknown as { __bb?: BbHook }).__bb?.run.round;
      return !r || r.turns > turns || r.phase === 'done';
    },
    now.turns,
    T,
  );
  return true;
}

/** Plays the current round to its end through the UI. */
export async function playRound(
  page: Page,
  opts: { auto?: boolean; tips?: string[] } = {},
): Promise<void> {
  for (let guard = 0; guard < 60; guard++) {
    const more = await botTurn(page, opts);
    if (!more) return;
  }
}

export async function setDev(page: Page, dev: Record<string, unknown>): Promise<void> {
  await page.evaluate((d) => localStorage.setItem('bb.dev.v1', JSON.stringify(d)), dev);
}

/** The saved run, as the game keeps it. */
export async function savedRun(page: Page): Promise<RunState | null> {
  return page.evaluate(() => {
    const raw = localStorage.getItem('bb.run.v1');
    return raw ? (JSON.parse(raw) as RunState) : null;
  });
}

export async function phase(page: Page): Promise<string | undefined> {
  return (await hook(page))?.run.phase;
}

/** One teahouse visit with scripted choices that touch every part of the shop. */
export async function shopVisit(page: Page, visit: number): Promise<void> {
  const tap = async (id: string) => {
    const el = page.getByTestId(id);
    if ((await el.count()) && (await el.isEnabled())) {
      await el.click(T);
      return true;
    }
    return false;
  };
  await tap('buy-almanac-0');
  if (await tap('buy-fortune-0')) {
    await page.getByTestId('pb-fortunes').click(T);
    await page.getByTestId('use-fortune-0').click(T);
    const pickers = page.locator('[data-testid^="pick-"]');
    await pickers.first().click(T);
    if (await page.getByTestId('suit-s').count()) await page.getByTestId('suit-s').click(T);
    await page.getByTestId('btn-picker-confirm').click(T);
    await page.getByTestId('sheet-use').waitFor({ state: 'detached', ...T });
  }
  await tap('buy-dragon-0');
  if (visit === 1) await tap('btn-reroll');
  if (await tap('buy-pack')) {
    await page.getByTestId('sheet-pack').waitFor(T);
    await page.getByTestId('pack-offer-0').click(T);
  }
  if (visit === 2 && (await page.getByTestId('btn-burn').isEnabled())) {
    await page.getByTestId('btn-burn').click(T);
    await page.locator('[data-testid^="burn-"]').first().click(T);
  }
  if (visit === 2) {
    await page.getByTestId('pb-dragons').click(T);
    if (await page.getByTestId('sell-0').count()) await page.getByTestId('sell-0').click(T);
    await page.getByTestId('sheet-close').click(T);
  }
  await page.getByTestId('btn-leave').click(T);
}

/** Starts a run from a prepared state: saves it and presses Continue. */
export async function resumeFrom(page: Page, run: RunState): Promise<void> {
  await page.evaluate((r) => localStorage.setItem('bb.run.v1', JSON.stringify(r)), run);
  await page.reload();
  await page.getByTestId('btn-continue').click();
}

/** Reads and dismisses the guide's tips while any is showing; returns their texts. */
export async function readTips(page: Page): Promise<string[]> {
  const seen: string[] = [];
  for (let i = 0; i < 12; i++) {
    const tip = page.getByTestId('tip');
    if (!(await tip.count())) {
      await page.waitForTimeout(60);
      if (!(await tip.count())) break;
    }
    seen.push((await page.getByTestId('tip-text').textContent()) ?? '');
    await page.getByTestId('btn-tip-ok').click(T);
  }
  return seen;
}
