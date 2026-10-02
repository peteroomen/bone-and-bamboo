// Writes every tile and every guide mood in every colourway as a standalone SVG:
// svg/<colourway>/<id>.svg and svg/<colourway>/guide-<mood>.svg
const fs = require("fs"), B = require("./tiles.js");
const id = t => t.suit === "back" ? "back" : `${t.suit}-${t.rank}`;
let count = 0;
for (const theme of Object.keys(B.THEMES)) {
  fs.mkdirSync(`${__dirname}/svg/${theme}`, { recursive: true });
  for (const t of [...B.ALL, { suit: "back" }]) {
    fs.writeFileSync(`${__dirname}/svg/${theme}/${id(t)}.svg`, B.svg(t, { theme }));
    count++;
  }
  for (const mood of B.GUIDE_MOODS) {
    fs.writeFileSync(`${__dirname}/svg/${theme}/guide-${mood}.svg`, B.guide({ theme, mood }));
    count++;
  }
}
console.log(`${count} SVGs written`);
