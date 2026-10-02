/**
 * Splits art-source/icons/icons.json by family so the game ships only what it uses:
 *   src/ui/art/generated/faces.json  the traced tile faces (dots, bamboo, chars, winds, dragons,
 *                                    flowers, seasons)
 *   src/ui/art/generated/icons.json  the dragon, fortune, pack and service icons
 * The card, dice, hanafuda and jester sets in the source are not used and are left out.
 *   pnpm tsx --tsconfig tsconfig.sim.json scripts/build-icons.ts
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const all = JSON.parse(readFileSync(resolve('art-source/icons/icons.json'), 'utf8')) as Record<
  string,
  unknown
>;
const FACE = /^(dots|bamboo|chars|wind|dragon|flower|season)-\d$/;
const UNUSED = /^(card-|die$|hana-|jester-|num-|pips-|suit-)/;
const faces: Record<string, unknown> = {};
const icons: Record<string, unknown> = {};
for (const [id, icon] of Object.entries(all)) {
  if (FACE.test(id)) faces[id] = icon;
  else if (!UNUSED.test(id)) icons[id] = icon;
}
writeFileSync(resolve('src/ui/art/generated/faces.json'), JSON.stringify(faces));
writeFileSync(resolve('src/ui/art/generated/icons.json'), JSON.stringify(icons));
console.log(`faces: ${Object.keys(faces).length}, icons: ${Object.keys(icons).length}`);
