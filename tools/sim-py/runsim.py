"""Bone & Bamboo run simulator: four rounds, three shops.

A run starts with 81 tiles (3 suits, 1-9, 3 copies), $4 and no curios. After each of the first
three rounds you are paid and visit the teahouse. Two shoppers:
  smart   tries every item it can afford on its current build (the same 12 seeded rounds with and
          without the item) and buys the best gain per mon until nothing helps
  casual  buys random affordable items, a stand-in for someone still learning
Rounds are played by the round bot from roundsim.py, made curio-aware, choosing between playing
the best set it has (greedy) and holding pairs for pongs (pongs).

Usage:
  python3 runsim.py free  [--runs N]   # no targets: score distributions per round
  python3 runsim.py run   [--runs N] [--targets a,b,c,d]
  python3 runsim.py trace [seed]
"""
from __future__ import annotations

import argparse
import copy
import random
import statistics
import sys
from collections import Counter, defaultdict
from dataclasses import dataclass, field
from multiprocessing import Pool

from roundsim import SUIT_NAME, find_sets, tile_chips, tname

# ---- prices and levels (the "cheap chows" pricing) -----------------------------------------
PRICES = {"single": (5, 0), "pair": (5, 1), "chow": (10, 1), "pong": (40, 4), "kong": (100, 8),
          "dragons": (60, 6), "winds": (100, 10)}
LEVEL_UP = {"single": (0, 0), "pair": (5, 1), "chow": (10, 1), "pong": (15, 2), "kong": (30, 3),
            "dragons": (20, 2), "winds": (30, 3)}

ROUND = dict(hand=8, stacks=8, peek=1, plays=8, discards=3, max_discard=5)
REWARD = [10, 12, 14]   # paid after rounds 1-3
START_MONEY = 4
CURIO_SLOTS = 5
EVAL_SEEDS = 12
OPTS = {"gift": False, "fire": 2}  # set from the command line


def terminal_or_honour(t):
    return t[0] not in SUIT_NAME or t[1] in (1, 9)


def is_big(kind):
    return kind in ("pong", "kong")


# ---- curios ---------------------------------------------------------------------------------
@dataclass
class Curio:
    name: str
    price: int
    text: str
    score: object = None      # (table, chips, mult, build) -> (chips, mult, xmult)
    set_bonus: object = None  # (kind, tiles, table, build) -> chips-equivalent, for the bot
    tile_bonus: object = None  # (t, build) -> multiplier on a tile's draw value
    mods: dict = field(default_factory=dict)
    income: int = 0


def flat(chips=0, mult=0):
    return lambda table, c, m, b: (c + chips, m + mult, 1.0)


def per_tile_suit(suit, chips):
    def f(table, c, m, b):
        return c + chips * sum(t[0] == suit for _, ts in table for t in ts), m, 1.0
    return f


def suit_bonus(suit, w):
    return lambda kind, tiles, table, b: w * sum(t[0] == suit for t in tiles)


def suits_on(table):
    return {t[0] for _, ts in table for t in ts if t[0] in SUIT_NAME}


def straight_done(table):
    for s in "mps":
        starts = {ts[0][1] for k, ts in table if k == "chow" and ts[0][0] == s}
        if {1, 4, 7} <= starts:
            return True
    return False


def identical_pairs(table):
    c = Counter((k, tuple(ts)) for k, ts in table if k != "single")
    return sum(v // 2 for v in c.values())


CURIOS = {c.name: c for c in [
    # common, 4
    Curio("abacus", 4, "+2 mult per chow",
          score=lambda t, c, m, b: (c, m + 2 * sum(k == "chow" for k, _ in t), 1.0),
          set_bonus=lambda k, ts, t, b: 24 if k == "chow" else 0),
    Curio("red_string", 4, "+6 mult", score=flat(mult=6)),
    Curio("coin_string", 4, "+50 chips", score=flat(chips=50)),
    Curio("bamboo_grove", 4, "+12 chips per Bamboo tile", score=per_tile_suit("s", 12),
          set_bonus=suit_bonus("s", 12), tile_bonus=lambda t, b: 1.5 if t[0] == "s" else 1.0),
    Curio("coin_purse", 4, "+12 chips per Dots tile", score=per_tile_suit("p", 12),
          set_bonus=suit_bonus("p", 12), tile_bonus=lambda t, b: 1.5 if t[0] == "p" else 1.0),
    Curio("scroll", 4, "+12 chips per Characters tile", score=per_tile_suit("m", 12),
          set_bonus=suit_bonus("m", 12), tile_bonus=lambda t, b: 1.5 if t[0] == "m" else 1.0),
    Curio("sparrow_nest", 4, "pairs +6 mult",
          score=lambda t, c, m, b: (c, m + 6 * sum(k == "pair" for k, _ in t), 1.0),
          set_bonus=lambda k, ts, t, b: 72 if k == "pair" else 0),
    Curio("gold_toad", 4, "+$4 after each round", income=4),
    # uncommon, 6
    Curio("pong_hall", 6, "x2 mult with 2+ pongs or kongs",
          score=lambda t, c, m, b: (c, m, 2.0 if sum(is_big(k) for k, _ in t) >= 2 else 1.0),
          set_bonus=lambda k, ts, t, b: 80 if is_big(k) else 0),
    Curio("outside", 6, "+4 mult per set with a 1, 9 or honour",
          score=lambda t, c, m, b: (c, m + 4 * sum(any(map(terminal_or_honour, ts)) for k, ts in t if k != "single"), 1.0),
          set_bonus=lambda k, ts, t, b: 48 if any(map(terminal_or_honour, ts)) else 0,
          tile_bonus=lambda t, b: 1.4 if terminal_or_honour(t) else 1.0),
    Curio("iron_teapot", 6, "+2 discards", mods={"discards": 2}),
    Curio("long_sleeves", 6, "+1 hand size", mods={"hand": 1}),
    Curio("lantern", 6, "see 1 tile deeper in every stack", mods={"peek": 1}),
    Curio("mahjong", 6, "x2 mult with 4+ sets and a pair",
          score=lambda t, c, m, b: (c, m, 2.0 if sum(k not in ("pair", "single") for k, _ in t) >= 4
                                     and any(k == "pair" for k, _ in t) else 1.0),
          set_bonus=lambda k, ts, t, b: (150 if k == "pair" and not any(x == "pair" for x, _ in t) else 0)),
    Curio("two_suits", 6, "x1.5 mult if the table uses 2 suits or fewer",
          score=lambda t, c, m, b: (c, m, 1.5 if len(suits_on(t)) <= 2 else 1.0),
          set_bonus=lambda k, ts, t, b: (-90 if len(suits_on(t)) >= 2 and any(x[0] in SUIT_NAME and x[0] not in suits_on(t) for x in ts) else 0)),
    # rare, 8
    Curio("all_simples", 8, "x2 mult if no 1s, 9s or honours on the table",
          score=lambda t, c, m, b: (c, m, 2.0 if t and not any(terminal_or_honour(x) for _, ts in t for x in ts) else 1.0),
          set_bonus=lambda k, ts, t, b: -250 if any(map(terminal_or_honour, ts)) else 0,
          tile_bonus=lambda t, b: 0.1 if terminal_or_honour(t) else 1.0),
    Curio("pure_straight", 8, "x3 mult with 1-2-3, 4-5-6, 7-8-9 of one suit",
          score=lambda t, c, m, b: (c, m, 3.0 if straight_done(t) else 1.0),
          set_bonus=lambda k, ts, t, b: 40 if k == "chow" and ts[0][1] in (1, 4, 7) else 0),
    Curio("night_owl", 8, "+1 play", mods={"plays": 1}),
    Curio("kong_bell", 8, "x2 mult per kong",
          score=lambda t, c, m, b: (c, m, 2.0 ** sum(k == "kong" for k, _ in t)),
          set_bonus=lambda k, ts, t, b: 250 if k == "kong" else 0),
    Curio("dragon_lantern", 8, "+12 mult per dragon set",
          score=lambda t, c, m, b: (c, m + 12 * sum(k == "dragons" or (is_big(k) and ts[0][0] == "d") for k, ts in t), 1.0),
          set_bonus=lambda k, ts, t, b: 144 if k == "dragons" or (is_big(k) and ts[0][0] == "d") else 0,
          tile_bonus=lambda t, b: 2.0 if t[0] == "d" else 1.0),
    Curio("twin_cranes", 8, "x1.5 mult per pair of identical sets",
          score=lambda t, c, m, b: (c, m, 1.5 ** identical_pairs(t)),
          set_bonus=lambda k, ts, t, b: 100 if (k, tuple(ts)) in {(x, tuple(y)) for x, y in t} else 0),
]}


# ---- the build --------------------------------------------------------------------------------
@dataclass
class Build:
    tiles: list
    money: int = START_MONEY
    curios: list = field(default_factory=list)
    levels: Counter = field(default_factory=Counter)
    jade: Counter = field(default_factory=Counter)   # tile type -> copies with +4 mult
    bone: Counter = field(default_factory=Counter)   # tile type -> copies with +30 chips
    policy: str = "greedy"

    def mod(self, key):
        return sum(CURIOS[c].mods.get(key, 0) for c in self.curios)

    def pref_suit(self):
        for c, s in (("bamboo_grove", "s"), ("coin_purse", "p"), ("scroll", "m")):
            if c in self.curios:
                return s
        n = Counter(t[0] for t in self.tiles if t[0] in SUIT_NAME)
        return n.most_common(1)[0][0]


def starting_tiles():
    return [(s, n) for s in "mps" for n in range(1, 10) for _ in range(3)]


# ---- a round with a build --------------------------------------------------------------------
class RunRound:
    def __init__(self, build: Build, seed: int, policy: str | None = None, log=False):
        self.b = build
        self.policy = policy or build.policy
        self.log = log
        self.rng = random.Random(seed)
        tiles = list(build.tiles)
        self.rng.shuffle(tiles)
        self.nst = ROUND["stacks"]
        self.wall = [tiles[i::self.nst] for i in range(self.nst)]
        self.hand_size = ROUND["hand"] + build.mod("hand")
        self.peek = ROUND["peek"] + build.mod("peek")
        self.plays = ROUND["plays"] + build.mod("plays")
        self.discards = ROUND["discards"] + build.mod("discards")
        self.copies = Counter(build.tiles)
        self.hand, self.table = [], []

    def say(self, *a):
        if self.log:
            print(*a)

    def base(self, kind):
        c, m = PRICES[kind]
        dc, dm = LEVEL_UP[kind]
        lv = self.b.levels[kind]
        return c + dc * lv, m + dm * lv

    def set_value(self, kind, tiles):
        c, m = self.base(kind)
        v = c + sum(tile_chips(t) for t in tiles) + 12 * m
        for t in tiles:
            v += 12 * 4 * self.b.jade[t] / max(1, self.copies[t]) + 30 * self.b.bone[t] / max(1, self.copies[t])
        for name in self.b.curios:
            sb = CURIOS[name].set_bonus
            if sb:
                v += sb(kind, tiles, self.table, self.b)
        return v

    def tile_value(self, t, hand=None):
        hand = self.hand if hand is None else hand
        c = Counter(hand)
        hunter = self.policy == "pongs"
        if c[t] == 3 and self.copies[t] >= 4:
            v = 10
        elif c[t] == 2:
            v = 11
        else:
            v = 0
            if t[0] in SUIT_NAME:
                s, n = t
                if any(c[(s, a)] and c[(s, b)] for a, b in ((n - 2, n - 1), (n - 1, n + 1), (n + 1, n + 2))):
                    v = 3 if hunter else 8
            if not v and t[0] == "d" and sum(c[("d", n)] > 0 for n in (1, 2, 3)) == 2 and not c[t]:
                v = 8
            if not v and t[0] == "w" and sum(c[("w", n)] > 0 for n in (1, 2, 3, 4)) >= 2 and not c[t]:
                v = 6
            if not v and c[t] == 1:
                v = 6 if hunter else 4
            if not v and not hunter and t[0] in SUIT_NAME:
                s, n = t
                if c[(s, n - 1)] or c[(s, n + 1)]:
                    v = 3
                elif c[(s, n - 2)] or c[(s, n + 2)]:
                    v = 2
        for name in self.b.curios:
            tb = CURIOS[name].tile_bonus
            if tb:
                v *= tb(t, self.b)
        return v

    def keep_value(self, t):
        rest = list(self.hand)
        rest.remove(t)
        return self.tile_value(t, rest)

    def visible(self, i):
        return list(reversed(self.wall[i][-(self.peek + 1):]))

    def refill(self):
        while len(self.hand) < self.hand_size and any(self.wall):
            best, bi = None, None
            for i, st in enumerate(self.wall):
                if st:
                    sc = sum(w * self.tile_value(t) for w, t in zip((1.0, 0.55, 0.3, 0.15), self.visible(i)))
                    if best is None or sc > best:
                        best, bi = sc, i
            self.hand.append(self.wall[bi].pop())

    def kong_in_reach(self, t):
        return self.copies[t] >= 4 and any(t in self.visible(i) for i in range(self.nst))

    def turn(self):
        sets = find_sets(self.hand)
        sets = [s for s in sets if self.set_value(*s) > -50 or self.plays <= 2]
        if self.policy == "pongs":
            big = [s for s in sets if s[0] in ("kong", "pong", "dragons", "winds")]
            if big:
                return self.play(*max(big, key=lambda s: self.set_value(*s)))
            if self.discards and self.plays > 1:
                return self.discard()
            rest = [s for s in sets if s[0] != "pair"] or sets
            if rest:
                return self.play(*max(rest, key=lambda s: self.set_value(*s)))
        else:
            ranked = sorted(sets, key=lambda s: -self.set_value(*s))
            strong = [s for s in ranked if s[0] != "pair" or self.set_value(*s) >= 80]
            if strong:
                choice = strong[0]
                if choice[0] == "pong" and self.kong_in_reach(choice[1][0]) and self.plays > 1:
                    alt = [s for s in strong[1:] if choice[1][0] not in s[1]]
                    if alt:
                        choice = alt[0]
                    elif self.discards:
                        return self.discard()
                return self.play(*choice)
            if self.discards and self.plays > 1:
                return self.discard()
            if ranked:
                return self.play(*ranked[0])
        if not self.hand:
            self.plays -= 1
            return
        t = max(self.hand, key=lambda x: tile_chips(x) + (0 if not self.b.curios else 0))
        return self.play("single", [t])

    def play(self, kind, tiles):
        for t in tiles:
            self.hand.remove(t)
        self.table.append((kind, tiles))
        self.plays -= 1
        self.say(f"  play {kind}: {' '.join(map(tname, tiles))}")
        if self.plays:
            self.refill()

    def discard(self):
        ranked = sorted(self.hand, key=self.keep_value)
        junk = [t for t in ranked if self.keep_value(t) <= 1][: ROUND["max_discard"]] or ranked[:2]
        for t in junk:
            self.hand.remove(t)
        self.discards -= 1
        self.say(f"  discard {' '.join(map(tname, junk))}")
        self.refill()

    def score(self):
        chips = mult = 0.0
        for kind, tiles in self.table:
            c, m = self.base(kind)
            chips += c + sum(tile_chips(t) for t in tiles)
            mult += m
            for t in tiles:
                f = 1 / max(1, self.copies[t])
                mult += 4 * self.b.jade[t] * f
                chips += 30 * self.b.bone[t] * f
        x = 1.0
        for name in self.b.curios:
            sc = CURIOS[name].score
            if sc:
                chips, mult, xm = sc(self.table, chips, mult, self.b)
                x *= xm
        return int(chips * mult * x)

    def go(self):
        self.refill()
        while self.plays:
            self.turn()
        self.total = self.score()
        self.unused_discards = self.discards
        return self


def estimate(build, seeds, policy=None):
    return statistics.mean(RunRound(build, s, policy).go().total for s in seeds)


# ---- the shop ---------------------------------------------------------------------------------
@dataclass
class Offer:
    kind: str     # curio | almanac | fortune | tile
    what: object
    price: int

    def label(self):
        return f"{self.kind}:{self.what}"


FORTUNES = ["rubbing", "fire", "brush", "jade", "bone"]
PACKS = ["fourth", "dragons", "winds", "honour"]
ALMANAC = ["chow", "pong", "pair", "kong"]


def roll_shop(rng, build):
    pool = [c for c in CURIOS if c not in build.curios]
    weights = [{4: 6, 6: 3, 8: 1}[CURIOS[c].price] for c in pool]
    curios = []
    while len(curios) < 3 and pool:
        c = rng.choices(pool, weights)[0]
        i = pool.index(c)
        pool.pop(i); weights.pop(i)
        curios.append(Offer("curio", c, CURIOS[c].price))
    alm = [Offer("almanac", rng.choice(ALMANAC), 3) for _ in range(2)]
    fort = [Offer("fortune", f, 3) for f in rng.sample(FORTUNES, 2)]
    pack = rng.choice(PACKS)
    if pack == "fourth":
        nums = [t for t, k in Counter(build.tiles).items() if t[0] in SUIT_NAME and k == 3]
        picks = rng.sample(nums, min(3, len(nums)))
        tiles = [Offer("tile", ("copy", t), 4) for t in picks]  # one pack, choose one
    elif pack == "dragons":
        tiles = [Offer("tile", ("dragons",), 4)]
    elif pack == "winds":
        tiles = [Offer("tile", ("winds",), 4)]
    else:
        h = rng.choice([("d", 1), ("d", 2), ("d", 3), ("w", 1), ("w", 2), ("w", 3), ("w", 4)])
        tiles = [Offer("tile", ("honour", h), 5)]
    return curios + alm + fort + tiles


def fortune_targets(build, f):
    """Deterministic choices for a fortune, given the build."""
    pref = build.pref_suit()
    c = Counter(build.tiles)
    if f == "rubbing":
        for n in (5, 4, 6, 3, 7, 2, 8):
            if c[(pref, n)] == 3:
                return [(pref, n)]
        return []
    if f == "fire":
        if "all_simples" in build.curios:
            out = [t for t in build.tiles if terminal_or_honour(t)]
        elif any(x in build.curios for x in ("bamboo_grove", "coin_purse", "scroll", "two_suits")):
            out = sorted([t for t in build.tiles if t[0] in SUIT_NAME and t[0] != pref], key=lambda t: abs(t[1] - 5), reverse=True)
        else:
            out = [t for t in build.tiles if t[0] in SUIT_NAME and t[1] in (1, 9)]
        return out[:OPTS["fire"]]
    if f == "brush":
        if not any(x in build.curios for x in ("bamboo_grove", "coin_purse", "scroll", "two_suits")):
            return []
        return [t for t in build.tiles if t[0] in SUIT_NAME and t[0] != pref and 3 <= t[1] <= 7][:3]
    if f in ("jade", "bone"):
        return [(pref, 5), (pref, 4)]
    return []


def apply(build, offer):
    b = copy.deepcopy(build)
    b.money -= offer.price
    k, w = offer.kind, offer.what
    if k == "curio":
        b.curios.append(w)
    elif k == "almanac":
        b.levels[w] += 1
    elif k == "fortune":
        tg = fortune_targets(b, w)
        if not tg:
            return None
        if w == "rubbing":
            b.tiles.append(tg[0])
        elif w == "fire":
            for t in tg:
                b.tiles.remove(t)
        elif w == "brush":
            pref = b.pref_suit()
            for t in tg:
                b.tiles.remove(t)
                b.tiles.append((pref, t[1]))
        elif w == "jade":
            for t in tg:
                b.jade[t] += 1
        elif w == "bone":
            for t in tg:
                b.bone[t] += 1
    elif k == "tile":
        if w[0] == "copy":
            b.tiles.append(w[1])
        elif w[0] == "dragons":
            b.tiles += [("d", 1), ("d", 2), ("d", 3)]
        elif w[0] == "winds":
            b.tiles += [("w", 1), ("w", 2), ("w", 3), ("w", 4)]
        else:
            b.tiles += [w[1]] * 3
    return b


def shop_smart(build, rng, seeds, log):
    offers = roll_shop(rng, build)
    base = estimate(build, seeds)
    bought = []
    while True:
        best = None
        for o in offers:
            if o.price > build.money or (o.kind == "curio" and len(build.curios) >= CURIO_SLOTS):
                continue
            nb = apply(build, o)
            if nb is None:
                continue
            e = estimate(nb, seeds)
            gain = (e - base) / o.price
            if e > base * 1.03 and (best is None or gain > best[0]):
                best = (gain, o, nb, e)
        if not best:
            break
        _, o, build, base = best
        bought.append(o.label())
        offers = [x for x in offers if x is not o and not (o.kind == "tile" and x.kind == "tile")]
        if log:
            print(f"    buy {o.label()} for ${o.price} -> est {base:,.0f}")
    # pick the better way to play this build
    g, p = estimate(build, seeds, "greedy"), estimate(build, seeds, "pongs")
    build.policy = "pongs" if p > g else "greedy"
    return build, bought


def spirit_gift(build, rng, seeds, shopper, log):
    """The calmed spirit offers 1 of 2 rare curios, free (a slot must be open)."""
    pool = [c for c in CURIOS if CURIOS[c].price == 8 and c not in build.curios]
    if len(build.curios) >= CURIO_SLOTS or not pool:
        return build
    offers = rng.sample(pool, min(2, len(pool)))
    if shopper != "smart":
        pick = rng.choice(offers)
    else:
        pick = max(offers, key=lambda c: estimate(apply(build, Offer("curio", c, 0)), seeds))
    if log:
        print(f"    gift: {pick} (from {offers})")
    return apply(build, Offer("curio", pick, 0))


def shop_casual(build, rng, seeds, log):
    offers = roll_shop(rng, build)
    rng.shuffle(offers)
    bought = []
    for o in offers:
        if o.price <= build.money and not (o.kind == "curio" and len(build.curios) >= CURIO_SLOTS):
            nb = apply(build, o)
            if nb is not None and rng.random() < 0.7:
                build = nb
                bought.append(o.label())
                offers = [x for x in offers if not (o.kind == "tile" and x.kind == "tile")]
    build.policy = "greedy"
    return build, bought


# ---- a run -------------------------------------------------------------------------------------
def play_run(seed, shopper="smart", targets=None, log=False):
    rng = random.Random(10_000 + seed)
    build = Build(starting_tiles())
    scores, bought_all = [], []
    won, lost_at = True, None
    for r in range(4):
        rr = RunRound(build, seed * 101 + r).go()
        scores.append(rr.total)
        if log:
            print(f"Round {r+1} ({build.policy}): {rr.total:,}   curios {build.curios}  levels {dict(build.levels)}  tiles {len(build.tiles)}")
        if targets and rr.total < targets[r]:
            won, lost_at = False, r
            break
        if r == 3:
            break
        build.money += REWARD[r] + rr.unused_discards + min(build.money // 5, 5)
        build.money += sum(CURIOS[c].income for c in build.curios)
        seeds = [seed * 7919 + r * 131 + i for i in range(EVAL_SEEDS)]
        if log:
            print(f"  teahouse with ${build.money}")
        if OPTS["gift"]:
            build = spirit_gift(build, rng, seeds, shopper, log)
        if shopper == "smart":
            build, bought = shop_smart(build, rng, seeds, log)
        else:
            build, bought = shop_casual(build, rng, seeds, log)
        bought_all += bought
    return {"scores": scores, "won": won, "lost_at": lost_at, "bought": bought_all,
            "curios": list(build.curios), "policy": build.policy, "tiles": len(build.tiles)}


def _job(a):
    OPTS.update(a[3])
    return play_run(*a[:3])


def many(runs, shopper, targets=None):
    with Pool(4) as p:
        return p.map(_job, [(s, shopper, targets, dict(OPTS)) for s in range(runs)])


def pct(xs, q):
    xs = sorted(xs)
    return xs[min(len(xs) - 1, int(q * len(xs)))]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("mode", default="free", nargs="?")
    ap.add_argument("seed", nargs="?", type=int, default=1)
    ap.add_argument("--runs", type=int, default=200)
    ap.add_argument("--targets", default="")
    ap.add_argument("--shopper", default="smart")
    ap.add_argument("--gift", action="store_true")
    ap.add_argument("--fire", type=int, default=2)
    a = ap.parse_args()
    OPTS["gift"], OPTS["fire"] = a.gift, a.fire
    if a.mode == "trace":
        play_run(a.seed, a.shopper, log=True)
        return
    targets = [int(x) for x in a.targets.split(",")] if a.targets else None
    res = many(a.runs, a.shopper, targets)
    if a.mode == "free":
        print(f"| Round | p10 | p25 | Median | p75 | p90 |  ({a.shopper}, {a.runs} runs, no targets)")
        print("|---|---|---|---|---|---|")
        for r in range(4):
            xs = [x["scores"][r] for x in res]
            print(f"| {r+1} | " + " | ".join(f"{pct(xs, q):,}" for q in (0.1, 0.25, 0.5, 0.75, 0.9)) + " |")
    else:
        wins = sum(x["won"] for x in res)
        lost = Counter(x["lost_at"] for x in res if not x["won"])
        print(f"{a.shopper}: won {100*wins/len(res):.0f}% of {len(res)} runs; lost in round " +
              ", ".join(f"{r+1}: {100*lost[r]/len(res):.0f}%" for r in range(4)))
    pol = Counter(x["policy"] for x in res)
    print(f"final way of playing: {dict(pol)}")
    buys = Counter(b for x in res for b in x["bought"])
    print("most bought: " + ", ".join(f"{k} {v/len(res):.2f}" for k, v in buys.most_common(14)))
    # what a curio is worth: final-round score with it vs without
    if a.mode == "free":
        last = statistics.median(x["scores"][3] for x in res)
        rows = []
        for c in CURIOS:
            w = [x["scores"][3] for x in res if c in x["curios"]]
            if len(w) >= 5:
                rows.append((statistics.median(w) / last, c, len(w)))
        print("round 4 median with each curio, against all runs:")
        for ratio, c, n in sorted(rows, reverse=True):
            print(f"  {c:16s} x{ratio:.2f}  (in {100*n/len(res):.0f}% of runs)")
    else:
        rows = []
        for c in CURIOS:
            w = [x["won"] for x in res if c in x["curios"]]
            if len(w) >= 5:
                rows.append((statistics.mean(w), c, len(w)))
        print("win rate with each curio at the end:")
        for wr, c, n in sorted(rows, reverse=True):
            print(f"  {c:16s} {100*wr:.0f}%  (in {100*n/len(res):.0f}% of finished builds)")


if __name__ == "__main__":
    main()
