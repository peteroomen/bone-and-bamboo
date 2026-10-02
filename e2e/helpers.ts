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
  await setSettings(page, { speed: 'instant', ...settings });
  await page.reload();
  await page.getByTestId('title').waitFor();
}

export async function newRun(page: Page): Promise<void> {
  await page.getByTestId('btn-new').click();
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
export async function botTurn(page: Page, opts: { auto?: boolean } = {}): Promise<boolean> {
  const h = await hook(page);
  const round = h?.run.round;
  if (!round || round.phase !== 'play') return false;
  if (round.hand.length < round.rules.handSize && round.stacks.some((s) => s.length > 0)) {
    if (opts.auto) await page.getByTestId('btn-auto').click(T);
    else await refill(page);
  }
  const now = (await hook(page))?.run.round;
  if (!now || now.phase !== 'play') return false;
  const move = chooseMove(now);
  if (!move) return false;
  for (const id of move.ids) await page.getByTestId(`tile-${id}`).click(T);
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
export async function playRound(page: Page, opts: { auto?: boolean } = {}): Promise<void> {
  for (let guard = 0; guard < 60; guard++) {
    const more = await botTurn(page, opts);
    if (!more) return;
  }
}
