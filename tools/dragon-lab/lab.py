"""Deterministic design lab; no runtime application dependency or hidden-wall search."""
from __future__ import annotations
import sys
from pathlib import Path
from collections import Counter
from dataclasses import dataclass, field
from math import prod, floor
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'sim-py'))
from runsim import RunRound, Build, PRICES, LEVEL_UP, starting_tiles
from roundsim import find_sets, tile_chips
from catalogue import BY_ID


@dataclass
class Context:
    money: int = 4
    discards: int = 3
    initial_discards: int = 3
    plays: int = 0
    round_index: int = 1
    deck_size: int = 81
    levels: Counter = field(default_factory=Counter)


def base(table, levels):
    c = m = 0
    for k, ts in table:
        c += PRICES[k][0] + LEVEL_UP[k][0] * levels[k] + sum(map(tile_chips, ts))
        m += PRICES[k][1] + LEVEL_UP[k][1] * levels[k]
    return c, m


def metrics(table, ids, ctx):
    ts = [t for _, tiles in table for t in tiles]
    kinds = Counter(k for k, _ in table)
    suits = Counter(t[0] for t in ts if t[0] in 'mps')
    numbered = [r for s, r in ts if s in 'mps']
    chows = {(tiles[0][0], min(t[1] for t in tiles)) for k, tiles in table if k == 'chow'}
    triples = {(tiles[0][0], tiles[0][1]) for k, tiles in table if k in ('pong','kong')}
    identical = Counter((k, tuple(sorted(tiles))) for k, tiles in table if k != 'single')
    return dict(kinds, one=1, s=suits['s'], p=suits['p'], m=suits['m'],
        twoTriples=int(kinds['pong'] + kinds['kong'] >= 2),
        outside=sum(k != 'single' and any(s == 'w' or r in (1,9) for s,r in tiles) for k, tiles in table),
        mahjong=int(sum(k not in ('pair','single') for k,_ in table) >= 4 and kinds['pair'] > 0),
        twoSuits=int(bool(ts) and len(suits) <= 2),
        simples=int(bool(ts) and all(s in 'mps' and 2 <= r <= 8 for s,r in ts)),
        straight=int(any(all((s,r) in chows for r in (1,4,7)) for s in 'mps')),
        windSets=sum(k == 'winds' or (k in ('pong','kong') and tiles[0][0] == 'w') for k,tiles in table),
        twins=sum(n//2 for n in identical.values()),
        tripleTiles=sum(len(tiles) for k,tiles in table if k in ('pong','kong')),
        odd=sum(r%2 == 1 for r in numbered), even=sum(r%2 == 0 for r in numbered),
        low=sum(r <= 3 for r in numbered), high=sum(r >= 7 for r in numbered),
        middle=sum(4 <= r <= 6 for r in numbered), owned=len(ids),
        discards=ctx.discards, money=ctx.money, moneyFives=ctx.money//5,
        emptySlots=max(0,5-len(ids)), lastPlay=int(ctx.plays == 0 and bool(table)),
        noDiscard=int(ctx.discards == ctx.initial_discards),
        firstChips=base(table[:1], ctx.levels)[0], threePairs=int(kinds['pair'] >= 3),
        triples=kinds['pong']+kinds['kong'], windTiles=sum(s == 'w' for s,r in ts),
        prevailing=sum((s,r) == ('w',ctx.round_index) for s,r in ts),
        rainbowChow=int(any(all((s,r) in chows for s in 'mps') for r in range(1,8))),
        rainbowPong=int(any(all((s,r) in triples for s in 'mps') for r in range(1,10))),
        oneSuit=int(bool(ts) and len(suits)==1 and len(numbered)==len(ts)),
        nineRanks=int(len(set(numbered))==9), terminal=sum(r in (1,9) for r in numbered),
        balanced=int(suits['m'] >= 3 and suits['m']==suits['p']==suits['s']),
        distinctSets=len(set(kinds)-{'single'}), levels=sum(ctx.levels.values()),
        removed=max(0,81-ctx.deck_size), extraTiles=max(0,ctx.deck_size-81), roundIndex=ctx.round_index)


def effects(table, ids, ctx, tuning=None):
    ms = metrics(table, ids, ctx)
    result = {}
    for id in ids:
        d = BY_ID[id]
        n = ms.get(d['metric'],0)
        if d['cap'] is not None:
            n = min(n,d['cap'])
        a = (tuning or {}).get(id,d['amount'])
        value = a**n if d['lane']=='xmult' else 1+a*n if d['lane']=='xlinear' else a*n
        result[id] = value
    return result


def score(table, ids=(), ctx=None, tuning=None):
    ctx = ctx or Context()
    c,m = base(table,ctx.levels)
    e = effects(table,ids,ctx,tuning)
    c += sum(e[id] for id in ids if BY_ID[id]['lane']=='chips')
    m += sum(e[id] for id in ids if BY_ID[id]['lane']=='mult')
    x = prod(e[id] for id in ids if BY_ID[id]['lane'] in ('xmult','xlinear'))
    return dict(chips=c, mult=m, xmult=x, total=floor(c*m*x + 1e-9) if table else 0, effects=e)


def income(table, ids, ctx, won=True):
    # Currency after North cannot be spent and is not treated as progression value.
    if not won or ctx.round_index >= 4:
        return 0
    e = effects(table,ids,ctx)
    return sum(e[id] for id in ids if BY_ID[id]['lane']=='income')


class DragonRound(RunRound):
    def __init__(self, ids=(), seed=0, policy='aware', tiles=None, levels=None, money=4,
                 round_index=1, tuning=None, bank=False, target=1000):
        if len(ids)>5 or len(set(ids))!=len(ids):
            raise ValueError('Five distinct dragon slots')
        self.ids = tuple(ids)
        self.tuning = tuning
        self.bank = bank
        self.target = target
        self.round_index = round_index
        b = Build(list(starting_tiles() if tiles is None else tiles), money=money, levels=Counter(levels or {}))
        super().__init__(b,seed,policy)
        for key, attr in [('hand','hand_size'),('peek','peek'),('plays','plays'),('discards','discards')]:
            setattr(self,attr,getattr(self,attr)+sum(BY_ID[id]['amount'] for id in ids if BY_ID[id]['lane']==key))
        self.initial_discards=self.discards
        self.discarded=[]
        self.banked=False
        self.exhausted=False

    def context(self, plays=None):
        return Context(self.b.money,self.discards,self.initial_discards,
            self.plays if plays is None else plays,self.round_index,len(self.b.tiles),self.b.levels)

    def score(self):
        return score(self.table,self.ids,self.context(),self.tuning)['total']

    def set_value(self, kind, tiles):
        if self.policy != 'aware':
            return super().set_value(kind,tiles)
        ctx=self.context(max(0,self.plays-1))
        before=score(self.table,self.ids,ctx,self.tuning)['total']
        after=score(self.table+[(kind,tiles)],self.ids,ctx,self.tuning)['total']
        # Exact current-table delta; small base tie-break avoids zero-mult ties.
        return after-before + 0.01*super().set_value(kind,tiles)

    def tile_value(self,t,hand=None):
        v=super().tile_value(t,hand)
        if self.policy!='aware':
            return v
        s,r=t
        # Public hand, table and owned dragons only. No inspection of hidden stack tiles.
        weights={'bambooGrove':s=='s','coinPurse':s=='p','scroll':s=='m',
                 'oddBeads':s in 'mps' and r%2==1,'evenComb':s in 'mps' and r%2==0,
                 'littleSteps':s in 'mps' and r<=3,'highPeaks':s in 'mps' and r>=7,
                 'middlePath':s in 'mps' and 4<=r<=6,'terminalGuard':s in 'mps' and r in (1,9),
                 'windChime':s=='w','windSail':s=='w','eastCompass':t==('w',self.round_index)}
        for id in self.ids:
            if weights.get(id,False): v*=1.4
        if 'allSimples' in self.ids and (s=='w' or r in (1,9)): v*=0.2
        used={x[0] for _,ts in self.table for x in ts if x[0] in 'mps'}
        if ('twoSuits' in self.ids and len(used)>=2 or 'singleSuit' in self.ids and used) and s not in used: v*=0.25
        return v

    def turn(self):
        if self.bank and self.score()>=self.target:
            self.banked=True
            return
        sets=find_sets(self.hand)
        if self.policy=='aware' and sets:
            best=max(sets,key=lambda st:self.set_value(*st))
            if best[0]=='pair' and not any(id in self.ids for id in ('sparrowNest','pairBridge','pairPeddler')) and self.discards and self.plays>1:
                if self.set_value(*best)<100:
                    return self.discard()
            if self.set_value(*best)<0 and self.discards:
                return self.discard()
            return self.play(*best)
        if not sets:
            if self.discards and self.hand: return self.discard()
            if self.hand: return self.play('single',[max(self.hand,key=tile_chips)])
            self.exhausted=True
            return
        return super().turn()

    def discard(self):
        ranked=sorted(self.hand,key=self.keep_value)
        junk=[t for t in ranked if self.keep_value(t)<=1][:5] or ranked[:2]
        for t in junk: self.hand.remove(t)
        self.discarded.extend(junk)
        self.discards-=1
        self.refill()

    def go(self):
        self.refill()
        while self.plays and not self.banked and not self.exhausted:
            self.turn()
        self.total=self.score()
        self.unused_discards=self.discards
        self.earned=income(self.table,self.ids,self.context(),self.total>=self.target)
        return self
