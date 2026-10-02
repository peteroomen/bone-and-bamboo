// Writes every tile in every colourway as a standalone SVG: svg/<colourway>/<id>.svg
const fs = require("fs"), B = require("./tiles.js");
const id = t => t.suit === "back" ? "back" : `${t.suit}-${t.rank}`;
let count = 0;
for (const theme of Object.keys(B.THEMES)) {
  fs.mkdirSync(`svg/${theme}`, { recursive: true });
  for (const t of [...B.ALL, { suit: "back" }]) {
    fs.writeFileSync(`svg/${theme}/${id(t)}.svg`, B.svg(t, { theme }));
    count++;
  }
}
console.log(`${count} SVGs written`);
