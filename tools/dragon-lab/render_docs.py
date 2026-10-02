"""Regenerate catalogue, artist kit and results tables. Node only reads existing art constants."""
import json
import subprocess
from pathlib import Path
from catalogue import DRAGONS
ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'docs/dragons'


def main():
    OUT.mkdir(exist_ok=True)
    art=json.loads(subprocess.check_output(['node','-e',"const p=require('./art-source/prompts/prompts-data.js'); process.stdout.write(JSON.stringify({style:p.ICON_STYLE,subjects:p.SUBJECTS.filter(s=>s.kind==='dragons')}))"],cwd=ROOT))
    existing={}
    for sheet in art['subjects']:
        lines=sheet['text'].split('\n')[1:]
        for id,line in zip(sheet['ids'],lines):
            if id!='-': existing[id]=line.split(': ',1)[1]
    approved=json.loads((ROOT/'art-source/icons/icons.json').read_text())
    data=[dict(d,icon=existing.get(d['id'],d['icon']),art_status='traced asset exists: reuse' if d['id'] in approved else 'existing brief: generate' if d['existing'] else 'new brief: generate') for d in DRAGONS]
    (OUT/'catalogue.json').write_text(json.dumps(data,indent=2)+'\n')
    text=['# Dragon catalogue — 60 designs','',
          'Proposal v1: 23 existing dragons and 37 additions. Existing game numbers are unchanged. See [findings](../balance/2026-10-02-dragon-expansion.md) before promoting proposals into the live pool.','',
          'All additive chips and mult resolve before the product of ×mult effects. A dragon can be owned only once; five slots. White/common $4, green/uncommon $6, red/rare $8. Prices and rarities for new content are hypotheses. Income is paid only after winning East, South or West; it arrives after ordinary interest is calculated. No North income is valued.','',
          'The metric caps apply before multiplication. Fractional mult is retained until the final score is floored. Table metrics use currently tabled sets: a pong upgraded to a kong stops counting as a pong. That intentionally means Three Treasures can lose a factor on upgrade; preview the signed change. First Echo follows the current first tabled set after replacement, and never repeats dragon effects. No effect here accumulates hidden permanent state.','',
          '| ID / name | Status | Rarity / price | Lane | Exact rule |','|---|---|---|---|---|']
    for d in data:
        text.append(f"| `{d['id']}` {d['name']} | {'Existing' if d['existing'] else 'Proposal'} | {d['rarity']} / ${d['price']} | {d['lane']} | {d['rule']} |")
    text+=['','## Build recipes and teaching','',
      '- **Pairs:** Nest → Pair Bridge → Twin Peaches. A cheap pair becomes useful now; teach disjoint repeat counts with three matching sets giving one repeat bonus, not three.',
      '- **Chows:** Abacus / Chow Drum → Nine Rings or Rainbow Bridge. Show three missing-pattern slots and highlight a visible tile that completes one.',
      '- **Pongs:** Pong Seal → Bell Hall → Stone Lion / Three Treasures. Teach holding a pair and the cost of using a needed third tile in a chow.',
      '- **Kongs:** Fourth copies → Fourth Pillar → Great Bell. Show zero available kongs before the deck can contain four matching tiles. Keep these offers out of the initial teaching pool.',
      '- **Winds:** Wind pack → Wind Sail → Wind Chime. Distinguish a wind pair from a qualifying wind set and show the current prevailing direction.',
      '- **Savings:** Gold Toad → Jade Ox / Coin Belt. Display both current bonus and what a purchase would cost in lost score; income is future choice, not immediate score.',
      '- **Restraint:** Closed Fan / Paper Fan / Still Pond. Let the player inspect the score tradeoff before discarding; teach that preserving resources has a cost.',
      '- **Deck shaping:** Rice Bowl / Silk Banner / Small Garden. Preview the effect of adding a forbidden tile and allow an already-won round to be banked.',
      '', 'Use contextual hints: one observation, one action, one reason. Example: “A Dots 5 is under this 2. Take the 2 first to reach your pong.” Hint explanations must use only visible information. Offer a dismissible practice deal for pairs, chows and pongs; reveal ×mult and income after the first successful score.','',
      '## Inspiration','',
      'Balatro-inspired entries borrow mechanical archetypes (flat chips/mult, parity, saved resources, cash scaling, empty slots and bounded repeats), with original names and artwork. Sources consulted: [Joker list](https://balatrogame.fandom.com/wiki/Jokers), [Bootstraps](https://balatrojokers.com/joker/Bootstraps-Joker). These are adaptations, not claims of identical Balatro timing or balance. Each inspiration is recorded in catalogue.json.','']
    (OUT/'catalogue.md').write_text('\n'.join(text))
    format='One square image, one isolated upright object centred at about 70% height. Flat chroma-key green (#00FF00) background, with no ground or shadow. Use dark jade for green within the object. No tile, frame, border, labels, writing or watermark. Every shape has a closed thick dark edge. Leave wide space around the silhouette. No detail smaller than 1/25 of the image width. This will be traced and recoloured, and must read at 18–30 pixels. Animal subjects may have their natural faces; inanimate objects have no faces or limbs.'
    kit=['# Artist handoff — all 60 dragons','',
      'Generate only entries marked **generate**. Six existing traced icons are reused. The remaining existing briefs retain the original prompt-kit subjects; new subjects are designed for distinct silhouettes. Each block below is a complete standalone prompt. IDs are filenames and integration keys, never text to draw.','',
      'Review each result at 18px and 30px beside its neighbours. In particular distinguish Coin String / Coin Belt / Kong Mint, Bell Hall / Great Bell / Wind Chime, Closed Fan / Paper Fan, and Pair Bridge / Rainbow Bridge. If the outline collapses at small size, simplify the subject before adding detail. Preserve colour slots; rarity frames are drawn by the game.','',
      'Individual outputs: `<id>.png`. For batch generation, use six subjects per 3×2 sheet, top-left to bottom-right; square image, invisible cells and identical scale. Use `sheet-manifest.txt` with the existing tracing workflow only after the named sheets have actually been generated and checked. It is a proposed manifest, not a change to the active asset list.','']
    for d in data:
        kit += [f"## {d['name']} — `{d['id']}`",'',f"Status: **{d['art_status']}**. Gameplay: {d['rule']}",'','```text',art['style'],'',format,'',f"SUBJECT: {d['icon']}",'```','']
    (OUT/'artist-prompts.md').write_text('\n'.join(kit))
    needed=[d for d in data if d['id'] not in approved]
    sheets=[]
    for i in range(0,len(needed),6):
        sheets.append(f"dragon-expansion-{i//6+1:02d}.png "+' '.join(d['id'] for d in needed[i:i+6])+ ' -'*(6-len(needed[i:i+6])))
    (OUT/'sheet-manifest.txt').write_text('# Proposed sheets; do not trace until generated and reviewed.\n'+'\n'.join(sheets)+'\n')
    results=ROOT/'docs/balance/dragon-lab-results.json'
    if results.exists(): render_results(json.loads(results.read_text()))


def render_results(data):
    lines=['# Per-dragon model results','',f"{data['n']} paired walls per cell; seeds {data['seed0']} onward. Each column is the median percentage score change versus a no-dragon run of the same policy and wall. These are isolated additions, not ownership win rates. `aware` uses exact immediate score deltas, not a full future search. Income columns are mean realised extra dollars, conditional on winning the 1,000-point diagnostic round and having a shop afterwards.",'','| Dragon | Starter greedy | Starter pongs | Starter aware | Prepared aware | Trimmed aware | Starter aware effect non-neutral | Starter / prepared income |','|---|---:|---:|---:|---:|---:|---:|---:|']
    idx={(r['id'],r['scenario'],r['policy']):r for r in data['sweep']}
    for d in DRAGONS:
        get=lambda s,p='aware':idx[d['id'],s,p]
        vals=[get('starter','greedy'),get('starter','pongs'),get('starter'),get('prepared'),get('simples')]
        change=' | '.join(f"{r['paired_pct']['median']:+.1f}%" for r in vals)
        lines.append(f"| {d['name']} | {change} | {get('starter')['activation']:.0%} | ${get('starter')['mean_income']:.2f} / ${get('prepared')['mean_income']:.2f} |")
    lines+=['','Effect non-neutral is an effect-level check, not useful activation: resource bonuses always exist even if a bot wastes them. Zero uplift on an income dragon is expected. Prepared includes winds and nine fourth copies; trimmed removes all 1s and 9s. Full quantiles, paired means and approximate 95% mean intervals are in the JSON. Intervals do not adjust for 540 comparisons.','', '## Five-dragon combinations','','| Build | Policy | Original median / p90 | Candidate tuning median / p90 |','|---|---|---:|---:|']
    combos={(r['build'],r['policy'],r['tuned']):r for r in data['interactions']}
    for name,policy,tuned in combos:
        if tuned:continue
        a=combos[name,policy,False]['score'];b=combos[name,policy,True]['score']
        lines.append(f"| {name} | {policy} | {a['median']:,.0f} / {a['p90']:,.0f} | {b['median']:,.0f} / {b['p90']:,.0f} |")
    lines+=['','## Limited market diagnostic','','| Shopper | Wins | Mean rounds cleared | Replacements |','|---|---:|---:|---:|']
    for name,r in data['market'].items(): lines.append(f"| {name} | {r['wins']}/{r['n']} | {r['mean_rounds']:.2f} | {r['replacements']} |")
    lines+=['','These are dragon-only markets; they exclude pages, fortunes, packs, burns, rerolls and host twists. Use them to diagnose policy and shopping logic, not to set the live game’s targets.','']
    (OUT/'model-results.md').write_text('\n'.join(lines))


if __name__=='__main__': main()
