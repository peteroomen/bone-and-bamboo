/**
 * Renders the PWA icons and apple-touch-icon from a bamboo tile.
 *   pnpm tsx --tsconfig tsconfig.sim.json scripts/make-icons.ts
 */
import { resolve } from 'node:path';
import { chromium } from '@playwright/test';

function tile(pad: number): string {
  const s = 1 - pad;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="#2a1a10"/><g transform="translate(${50 - 30 * s} ${50 - 40 * s}) scale(${s})"><rect x="2" y="6" width="56" height="72" rx="7" fill="#2f7a64" stroke="#0d0806" stroke-width="1.5"/><rect x="2" y="2" width="56" height="72" rx="7" fill="#f3ead6" stroke="#0d0806" stroke-width="1.5"/><rect x="25" y="14" width="10" height="46" rx="5" fill="#2f7a64"/><rect x="24" y="26" width="12" height="3" rx="1.5" fill="#2f7a64"/><rect x="24" y="44" width="12" height="3" rx="1.5" fill="#2f7a64"/></g></svg>`;
}

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
});
const page = await browser.newPage();
for (const [name, size, pad] of [
  ['icon-192.png', 192, 0.25],
  ['icon-512.png', 512, 0.25],
  ['icon-512-maskable.png', 512, 0.45],
  ['apple-touch-icon.png', 180, 0.25],
] as const) {
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(
    `<html><body style="margin:0">${tile(pad).replace('<svg ', `<svg width="${size}" height="${size}" `)}</body></html>`,
  );
  await page.screenshot({ path: resolve('public', name) });
  console.log('wrote', name);
}
await browser.close();
