"""Bone & Bamboo round simulator.

One round: you hold a hand of tiles; the wall is face-up stacks (you see the top tile and the
corner of the next `peek` tiles). Each turn you either play one set from your hand onto the table
(uses a play) or discard up to 5 tiles (uses a discard), then refill your hand from the stack tops,
one tile at a time, in the order you choose. When the plays run out the whole table scores at once:
(set chips + tile chips) x (set mult).

Usage:
  python3 roundsim.py               # the default round, then every sweep
  python3 roundsim.py trace [seed]  # one round, turn by turn
  python3 roundsim.py --n 3000      # rounds per config
"""
from __future__ import annotations

import argparse
import random
import statistics
from collections import Counter
from dataclasses import dataclass, field, replace

# ---- tiles ---------------------------------------------------------------------------------
# A tile is (suit, rank). Suits: m Characters, p Dots, s Bamboo (ranks 1-9),
# w winds (1-4: East South West North), d dragons (1-3: red green white), f flower (bonus).
SUIT_NAME = {"m": "C", "p": "D", "s": "B"}
HONOUR_NAME = {("w", 1): "East", ("w", 2): "South", ("w", 3): "West", ("w", 4): "North",
               ("d", 1): "Red", ("d", 2): "Green", ("d", 3): "White"}


def tname(t):
    if t[0] in SUIT_NAME:
        return f"{t[1]}{SUIT_NAME[t[0]]}"
    if t[0] == "f":
        return "Flower"
    return HONOUR_NAME[t]


def tile_chips(t):
    return t[1] if t[0] in SUIT_NAME else 10


# ---- set types -----------------------------------------------------------------------------
BASE = {  # chips, mult
    "single": (5, 0),
    "pair": (10, 1),
    "chow": (20, 2),
    "pong": (30, 3),
    "kong": (60, 6),
    "winds": (80, 8),    # one of each wind
}
LEVEL_UP = {"single": (5, 0), "pair": (10, 1), "chow": (15, 1), "pong": (20, 2), "kong": (30, 3),
            "winds": (30, 3)}
SET_ORDER = ["kong", "winds", "pong", "chow", "pair", "single"]


@dataclass(frozen=True)
class Rules:
    ranks: int = 9          # 1..ranks in each suit
    copies: int = 3         # copies of each numbered tile
    honours: int = 0        # copies of each wind and dragon (0 = none)
    flowers: int = 0        # flower tiles in the wall (each levels up a set type when drawn)
    hand: int = 8
    stacks: int = 8
    peek: int = 2           # tiles visible under each stack top
    plays: int = 8
    discards: int = 5
    max_discard: int = 5
    curios: tuple = ()      # names from CURIOS
    removed: tuple = ()     # ranks taken out of every suit (e.g. (1, 9) for an All Simples build)
    prices: tuple = ()      # overrides for BASE, e.g. (("chow", (10, 1)),)
    policy: str = "greedy"  # greedy: play the best set you have; pongs: hold pairs, dig for pongs


def build_set(r: Rules):
    tiles = [(s, n) for s in "mps" for n in range(1, r.ranks + 1) for _ in range(r.copies)
             if n not in r.removed]
    if r.honours:
        tiles += [("w", n) for n in range(1, 5) for _ in range(r.honours)]
    tiles += [("f", i) for i in range(r.flowers)]
    return tiles


# ---- curios (a few, to sanity-check "x for each y" synergies) -----------------------------
def curio_abacus(table, chips, mult):
    return chips, mult + 2 * sum(k == "chow" for k, _ in table), 1.0


def curio_pong_hall(table, chips, mult):
    n = sum(k in ("pong", "kong") for k, _ in table)
    return chips, mult, 3.0 if n >= 4 else 1.0


def curio_all_simples(table, chips, mult):
    ok = all(t[0] in SUIT_NAME and 2 <= t[1] <= 8 for _, ts in table for t in ts)
    return chips, mult, 2.0 if ok and table else 1.0


CURIOS = {"abacus": curio_abacus, "pong_hall": curio_pong_hall, "all_simples": curio_all_simples}


# ---- finding sets in a hand ----------------------------------------------------------------
def find_sets(hand):
    """Every set that can be played from the hand: (kind, tiles)."""
    c = Counter(hand)
    out = []
    for t, k in c.items():
        if t[0] == "f":
            continue
        if k >= 4:
            out.append(("kong", [t] * 4))
        if k >= 3:
            out.append(("pong", [t] * 3))
        if k >= 2:
            out.append(("pair", [t] * 2))
    for s in "mps":
        for n in range(1, 8):
            if c[(s, n)] and c[(s, n + 1)] and c[(s, n + 2)]:
                out.append(("chow", [(s, n), (s, n + 1), (s, n + 2)]))
    if all(c[("w", n)] for n in (1, 2, 3, 4)):
        out.append(("winds", [("w", n) for n in (1, 2, 3, 4)]))
    return out


# ---- a round -------------------------------------------------------------------------------
@dataclass
class Round:
    rules: Rules
    seed: int
    log: bool = False
    hand: list = field(default_factory=list)
    table: list = field(default_factory=list)
    levels: Counter = field(default_factory=Counter)

    def __post_init__(self):
        r = self.rules
        self.rng = random.Random(self.seed)
        tiles = build_set(r)
        self.rng.shuffle(tiles)
        self.wall = [tiles[i::r.stacks] for i in range(r.stacks)]  # end of each list = top
        self.plays, self.discards = r.plays, r.discards
        self.drawn = self.flowers = self.tiles_discarded = 0
        self.held_for_kong = 0
        self.copies = Counter(build_set(r))

    def say(self, *a):
        if self.log:
            print(*a)

    # -- values ------------------------------------------------------------------------------
    def base(self, kind):
        return dict(self.rules.prices).get(kind, BASE[kind])

    def set_value(self, kind, tiles):
        lv = self.levels[kind]
        c0, m0 = self.base(kind)
        dc, dm = LEVEL_UP[kind]
        chips = c0 + dc * lv + sum(tile_chips(t) for t in tiles)
        mult = m0 + dm * lv
        return chips + 12 * mult  # one mult is worth about 12 chips on a typical table

    def tile_value(self, t, hand=None):
        """How much drawing t helps the hand."""
        hand = self.hand if hand is None else hand
        if t[0] == "f":
            return 7
        c = Counter(hand)
        if c[t] == 3 and self.copies[t] >= 4:
            return 10
        if c[t] == 2:
            return 9 + (2 if dict(self.rules.prices).get("pong", BASE["pong"])[1] >= 4 else 0)
        hunter = self.rules.policy == "pongs"
        if t[0] in SUIT_NAME:
            s, n = t
            for a, b in ((n - 2, n - 1), (n - 1, n + 1), (n + 1, n + 2)):
                if c[(s, a)] and c[(s, b)]:
                    return 3 if hunter else 8
        if t[0] == "w" and sum(1 for n in (1, 2, 3, 4) if c[("w", n)]) >= 2 and not c[t]:
            return 6
        if c[t] == 1:
            return 6 if hunter else 4
        if hunter:
            return 0
        if t[0] in SUIT_NAME:
            s, n = t
            if c[(s, n - 1)] or c[(s, n + 1)]:
                return 3
            if c[(s, n - 2)] or c[(s, n + 2)]:
                return 2
        if t[0] == "w" and any(c[(t[0], n)] for n in range(1, 5)):
            return 1
        return 0

    def keep_value(self, t):
        rest = list(self.hand)
        rest.remove(t)
        return self.tile_value(t, rest)

    # -- the wall ----------------------------------------------------------------------------
    def visible(self, i):
        st = self.wall[i]
        return list(reversed(st[-(self.rules.peek + 1):]))  # top first

    def refill(self):
        while len(self.hand) < self.rules.hand and any(self.wall):
            best, bi = None, None
            for i, st in enumerate(self.wall):
                if not st:
                    continue
                vis = self.visible(i)
                score = sum(w * self.tile_value(t) for w, t in zip((1.0, 0.55, 0.3, 0.15), vis))
                if best is None or score > best:
                    best, bi = score, i
            t = self.wall[bi].pop()
            self.drawn += 1
            if t[0] == "f":
                kind = self.flower_pick()
                self.levels[kind] += 1
                self.flowers += 1
                self.say(f"    flower! level up {kind} (now level {self.levels[kind]})")
                continue
            self.hand.append(t)
            self.say(f"    take {tname(t)} from stack {bi + 1}")

    def flower_pick(self):
        played = Counter(k for k, _ in self.table if k not in ("single", "pair"))
        if played:
            return played.most_common(1)[0][0]
        return "chow"

    # -- a turn --------------------------------------------------------------------------------
    def kong_in_reach(self, t):
        if self.copies[t] < 4:
            return False
        return any(t in self.visible(i) for i in range(len(self.wall)))

    def turn(self):
        sets = find_sets(self.hand)
        if self.rules.policy == "pongs":
            big = [s for s in sets if s[0] in ("kong", "pong", "winds")]
            if big:
                return self.play(*max(big, key=lambda s: self.set_value(*s)))
            if self.discards and self.plays > 1:
                return self.discard()
            # out of discards: a chow keeps the pairs in hand
            chows = [s for s in sets if s[0] == "chow"]
            if chows:
                return self.play(*max(chows, key=lambda s: self.set_value(*s)))
        strong = [s for s in sets if s[0] not in ("pair",)]
        # hold a pong when its fourth copy is in sight and there's something else to do
        if strong:
            cand = sorted(strong, key=lambda s: -self.set_value(*s))
            choice = cand[0]
            if choice[0] == "pong" and self.kong_in_reach(choice[1][0]) and self.plays > 1:
                alt = [s for s in cand[1:] if choice[1][0] not in s[1]]
                if alt:
                    choice = alt[0]; self.held_for_kong += 1
                elif self.discards:
                    choice = None; self.held_for_kong += 1
            if choice:
                return self.play(*choice)
        if self.discards and self.plays > 1:
            return self.discard()
        pairs = [s for s in sets if s[0] == "pair"]
        if pairs:
            return self.play(*max(pairs, key=lambda s: self.set_value(*s)))
        t = max(self.hand, key=tile_chips)
        return self.play("single", [t])

    def play(self, kind, tiles):
        for t in tiles:
            self.hand.remove(t)
        self.table.append((kind, tiles))
        self.plays -= 1
        self.say(f"  play {kind}: {' '.join(map(tname, tiles))}   ({self.plays} plays left)")
        if self.plays:
            self.refill()

    def discard(self):
        ranked = sorted(self.hand, key=self.keep_value)
        junk = [t for t in ranked if self.keep_value(t) <= 1][: self.rules.max_discard]
        if not junk:
            junk = ranked[:2]
        for t in junk:
            self.hand.remove(t)
        self.discards -= 1
        self.tiles_discarded += len(junk)
        self.say(f"  discard {' '.join(map(tname, junk))}   ({self.discards} discards left)")
        self.refill()

    def score(self):
        chips = mult = 0
        for kind, tiles in self.table:
            lv = self.levels[kind]
            b = self.base(kind)
            chips += b[0] + LEVEL_UP[kind][0] * lv + sum(tile_chips(t) for t in tiles)
            mult += b[1] + LEVEL_UP[kind][1] * lv
        x = 1.0
        for name in self.rules.curios:
            chips, mult, xm = CURIOS[name](self.table, chips, mult)
            x *= xm
        return chips, mult, int(chips * mult * x)

    def play_round(self):
        self.refill()
        self.say(f"  hand: {' '.join(map(tname, sorted(self.hand)))}")
        while self.plays:
            self.turn()
            if self.log:
                self.say(f"  hand: {' '.join(map(tname, sorted(self.hand)))}")
        self.chips, self.mult, self.total = self.score()
        self.say(f"  TABLE: {self.chips} chips x {self.mult} mult = {self.total}")
        return self


# ---- batches -------------------------------------------------------------------------------
def batch(rules: Rules, n: int, seed0=0):
    rs = [Round(rules, seed0 + i).play_round() for i in range(n)]
    sc = sorted(r.total for r in rs)
    mix = Counter()
    for r in rs:
        mix.update(k for k, _ in r.table)
    taps = statistics.mean(r.drawn + sum(len(ts) + 1 for _, ts in r.table) + r.tiles_discarded
                           + (rules.discards - r.discards) for r in rs)
    return {
        "p25": sc[n // 4], "p50": sc[n // 2], "p75": sc[3 * n // 4], "p90": sc[9 * n // 10],
        "mix": {k: mix[k] / n for k in SET_ORDER if mix[k]},
        "discards": statistics.mean(rules.discards - r.discards for r in rs),
        "drawn": statistics.mean(r.drawn for r in rs),
        "left": statistics.mean(sum(map(len, r.wall)) for r in rs),
        "taps": taps,
    }


def fmt_mix(m):
    return " ".join(f"{k} {v:.1f}" for k, v in m.items())


def row(label, rules, n):
    b = batch(rules, n)
    print(f"| {label} | {b['p25']:,} | {b['p50']:,} | {b['p75']:,} | {fmt_mix(b['mix'])} | "
          f"{b['discards']:.1f} | {b['drawn']:.0f} of {len(build_set(rules))} | {b['taps']:.0f} |")
    return b


def header(title):
    print(f"\n### {title}\n")
    print("| Rules | p25 | Median | p75 | Sets per round | Discards used | Tiles drawn | Taps |")
    print("|---|---|---|---|---|---|---|---|")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("mode", nargs="?", default="sweep")
    ap.add_argument("seed", nargs="?", type=int, default=1)
    ap.add_argument("--n", type=int, default=2000)
    a = ap.parse_args()
    base = Rules()
    if a.mode == "trace":
        Round(base, a.seed, log=True).play_round()
        return
    n = a.n
    header("The default round (1-9, 3 copies, hand 8, 8 stacks, see 2 under the top, 8 plays, 5 discards)")
    row("Default", base, n)
    header("Tile set")
    row("1-9, 3 copies (81)", base, n)
    row("1-7, 3 copies (63)", replace(base, ranks=7), n)
    row("1-9, 4 copies (108)", replace(base, copies=4), n)
    row("1-9, 3 copies + honours x3 (102)", replace(base, honours=3), n)
    header("Hand size")
    for h in (7, 8, 9, 10):
        row(f"Hand {h}", replace(base, hand=h), n)
    header("How deep you can see")
    for p in (0, 1, 2, 3):
        row(f"See {p} under the top", replace(base, peek=p), n)
    header("Number of stacks")
    for s in (5, 6, 8, 10):
        row(f"{s} stacks", replace(base, stacks=s), n)
    header("Plays and discards")
    for p, d in ((6, 4), (8, 3), (8, 5), (8, 8), (10, 5), (10, 6)):
        row(f"{p} plays, {d} discards", replace(base, plays=p, discards=d), n)
    header("Flowers in the wall (each levels up a set type when drawn)")
    for f in (0, 2, 4):
        row(f"{f} flowers", replace(base, flowers=f), n)
    header("A few curios (the bot doesn't change its play for them)")
    row("No curios", base, n)
    row("Abacus (+2 mult per chow)", replace(base, curios=("abacus",)), n)
    row("Pong hall (x3 with 4+ pongs)", replace(base, curios=("pong_hall",)), n)
    row("All Simples (x2, no 1s or 9s)", replace(base, curios=("all_simples",)), n)
    row("All Simples, 1s and 9s removed", replace(base, curios=("all_simples",), removed=(1, 9)), n)


if __name__ == "__main__":
    main()
