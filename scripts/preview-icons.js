// Draws every traced icon (art-source/icons/icons.json) on its dragon tile in every colourway,
// at hand size and large, into art-source/icons/preview.html. Rarity comes from docs: pass a
// JSON map with --rarity, or everything shows as common.
//   node scripts/preview-icons.js [--rarity art-source/icons/rarity.json]
const fs = require("fs"), path = require("path");
const root = path.resolve(__dirname, "..");
const B = require(path.join(root, "art-source/tiles/tiles.js"));
const icons = JSON.parse(fs.readFileSync(path.join(root, "art-source/icons/icons.json"), "utf8"));
const ri = process.argv.indexOf("--rarity");
const rarity = ri > 0 ? JSON.parse(fs.readFileSync(process.argv[ri + 1], "utf8")) : {};
let html = `<!doctype html><meta charset="utf-8"><title>Icon preview</title><style>
body{margin:0;padding:12px;font-family:system-ui,sans-serif;background:#ddd}
.row{display:flex;gap:10px;align-items:end;padding:10px 12px;margin-bottom:6px;flex-wrap:wrap}
.c{display:grid;justify-items:center;gap:3px;font:11px ui-monospace,monospace}
</style>`;
for (const theme of Object.keys(B.THEMES)) {
  html += `<div class="row" style="background:${B.THEMES[theme].table};color:${theme === "theatre" ? "#f3ead6" : B.THEMES[theme].ink}">`;
  for (const id of Object.keys(icons)) {
    const r = rarity[id] || "common";
    html += `<div class="c">${B.dragonTile({ theme, rarity: r, icon: icons[id], width: 72 })}${B.dragonTile({ theme, rarity: r, icon: icons[id], width: 36 })}<span>${id}</span></div>`;
  }
  html += "</div>";
}
fs.writeFileSync(path.join(root, "art-source/icons/preview.html"), html);
console.log(`preview of ${Object.keys(icons).length} icons in ${Object.keys(B.THEMES).length} colourways: art-source/icons/preview.html`);
