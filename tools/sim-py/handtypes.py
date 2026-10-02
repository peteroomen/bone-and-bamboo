"""How often each candidate hand type is available in a random hand (no draws, no discards)."""
import random
from collections import Counter
ALL = [(s, n) for s in "mps" for n in range(1, 10)] + [("z", n) for n in range(1, 8)]
BAG = [t for t in ALL for _ in range(4)]

def has(hand):
    c = Counter(hand)
    k = sorted(c.values(), reverse=True)
    suitc = Counter(t[0] for t in hand)
    nums = {s: {t[1] for t in hand if t[0] == s} for s in "mps"}
    anynum = {t[1] for t in hand if t[0] != "z"}
    def run(ns, L):
        return any(all(n + i in ns for i in range(L)) for n in range(1, 11 - L))
    out = {
        "Pair": k[0] >= 2,
        "Two Pair": sum(v >= 2 for v in c.values()) >= 2,
        "Chow (run of 3, one suit)": any(run(nums[s], 3) for s in "mps"),
        "Pong (3 alike)": k[0] >= 3,
        "Run of 4, one suit": any(run(nums[s], 4) for s in "mps"),
        "Straight (run of 5, any suits)": run(anynum, 5),
        "Flush (5 of one suit)": any(suitc[s] >= 5 for s in "mps"),
        "Three Dragons (one of each)": all(("z", n) in c for n in (5, 6, 7)),
        "Pong + Pair": k[0] >= 3 and len(k) > 1 and k[1] >= 2,
        "Chow + Pair": any(run(nums[s], 3) for s in "mps") and k[0] >= 2,
        "Kong (4 alike)": k[0] >= 4,
        "Four Winds (one of each)": all(("z", n) in c for n in (1, 2, 3, 4)),
        "Pure Straight (run of 5, one suit)": any(run(nums[s], 5) for s in "mps"),
    }
    return out

rng = random.Random(1)
for size in (8, 10):
    N = 100000
    tot = Counter()
    for _ in range(N):
        h = rng.sample(BAG, size)
        for name, ok in has(h).items():
            tot[name] += ok
    print(f"\nHand of {size}:")
    for name, v in sorted(tot.items(), key=lambda x: -x[1]):
        print(f"  {name:38s} {100*v/N:5.1f}%")
