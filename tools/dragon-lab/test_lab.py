import unittest
from collections import Counter
from catalogue import DRAGONS, BY_ID
from lab import Context, DragonRound, score, effects, income, starting_tiles

TABLE=[('chow',[(s,r) for r in (1,2,3)]) for s in 'mps'] + [('pong',[(s,5)]*3) for s in 'mps'] + [('pair',[('w',1)]*2),('kong',[('w',2)]*4)]
CTX=Context(money=25,discards=2,initial_discards=3,plays=0,round_index=1,deck_size=75,levels=Counter(chow=1))
# Hand-calculated effect outputs on TABLE, one dragon owned at a time.
EXPECTED=dict(abacus=6,redString=6,coinString=50,bambooGrove=72,coinPurse=72,scroll=72,sparrowNest=6,goldToad=4,
 pongHall=2,outside=20,ironTeapot=2,longSleeves=1,lantern=1,mahjong=2,twoSuits=1,allSimples=1,pureStraight=1,
 nightOwl=1,kongBell=2,windChime=12,twinCranes=1,threeTreasures=3.375,stoneLion=39,
 oddBeads=105,evenComb=3,littleSteps=81,highPeaks=0,middlePath=9,fiveLanterns=2,closedFan=50,paperFan=6,
 jadeOx=75,coinBelt=10,emptyChair=2,lastEmber=1.75,stillPond=1,firstEcho=26,pairBridge=1,chowDrum=54,
 pongSeal=140,windSail=90,eastCompass=4,rainbowChow=2.5,threeBrothers=3,singleSuit=1,nineWindows=1,
 terminalGuard=60,balancedScales=2,fourTools=12,quietScholar=2,smallGarden=3,fullGranary=0,dawnRooster=2,
 pairPeddler=1,kongMint=4,windCourier=3,teaLedger=0,spareCup=3,twinPeaches=0,fourthPillar=100)


class EffectsTest(unittest.TestCase):
    def test_every_dragon_fixture(self):
        self.assertEqual(set(EXPECTED),set(BY_ID))
        for id, expected in EXPECTED.items():
            with self.subTest(dragon=id):
                self.assertAlmostEqual(effects(TABLE,[id],CTX)[id],expected)

    def test_base_and_order(self):
        self.assertEqual(score(TABLE,ctx=CTX)['total'],408*27)
        ids=['coinString','redString','pongHall']
        self.assertEqual(score(TABLE,ids,CTX)['total'],458*33*2)
        self.assertEqual(score(TABLE,ids,CTX),score(TABLE,ids[::-1],CTX))

    def test_positive_conditions(self):
        straight=[('chow',[('m',r+i) for i in range(3)]) for r in (1,4,7)]
        self.assertEqual(effects(straight,['pureStraight','nineWindows','singleSuit'],Context()),{'pureStraight':3,'nineWindows':2,'singleSuit':2.5})
        pairs=[('pair',[('s',2)]*2)]*3
        e=effects(pairs,['pairBridge','twinCranes','twinPeaches','allSimples','highPeaks'],Context())
        self.assertEqual(e,dict(pairBridge=1.75,twinCranes=1.5,twinPeaches=6,allSimples=2,highPeaks=0))
        self.assertEqual(effects([('pong',[('s',9)]*3)],['highPeaks'],Context())['highPeaks'],27)
        self.assertEqual(effects(TABLE,['stillPond','teaLedger'],Context()),{'stillPond':1.75,'teaLedger':5})
        self.assertEqual(effects(TABLE,['fullGranary'],Context(deck_size=90))['fullGranary'],45)

    def test_boundaries_caps_and_empty(self):
        for id in ('allSimples','twoSuits','singleSuit','lastEmber','balancedScales','mahjong'):
            self.assertEqual(effects([],[id],Context())[id],1)
        self.assertEqual(score([],['redString','coinString'])['total'],0)
        self.assertEqual(effects(TABLE,['coinBelt'],Context(money=4))['coinBelt'],0)
        self.assertEqual(effects(TABLE,['coinBelt'],Context(money=5))['coinBelt'],2)
        self.assertEqual(effects(TABLE,['jadeOx','coinBelt','smallGarden','fullGranary','quietScholar'],Context(money=999,deck_size=0,levels=Counter(chow=99))),dict(jadeOx=120,coinBelt=16,smallGarden=12,fullGranary=0,quietScholar=20))
        self.assertEqual(effects(TABLE,['fullGranary'],Context(deck_size=999))['fullGranary'],120)
        self.assertEqual(effects(TABLE,['lastEmber'],Context(plays=1))['lastEmber'],1)
        self.assertEqual(effects(TABLE,['fiveLanterns','emptyChair'],CTX),dict(fiveLanterns=4,emptyChair=1.75))

    def test_wind_direction_and_pairs(self):
        self.assertEqual(effects(TABLE,['eastCompass'],Context(round_index=2))['eastCompass'],8)
        self.assertEqual(effects([('pair',[('w',1)]*2)],['windChime'],Context())['windChime'],0)

    def test_income_timing(self):
        self.assertEqual(income(TABLE,['goldToad','kongMint'],CTX),8)
        self.assertEqual(income(TABLE,['goldToad'],CTX,False),0)
        self.assertEqual(income(TABLE,['goldToad'],Context(round_index=4)),0)
        self.assertEqual(income([('pair',[('m',2)]*2)]*8,['pairPeddler'],CTX),5)

    def test_twins_are_disjoint_and_order_independent(self):
        a=('chow',[('m',1),('m',2),('m',3)])
        b=('chow',list(reversed(a[1])))
        self.assertEqual(effects([a,b,a],['twinCranes'],CTX)['twinCranes'],1.5)
        self.assertEqual(effects([a,b,a,b],['twinCranes'],CTX)['twinCranes'],2.25)

    def test_conditional_score_can_drop(self):
        t=[('pong',[(s,5)]*3) for s in 'mps']
        self.assertLess(score(t+[('chow',[('m',7),('m',8),('m',9)])],['allSimples'])['total'],score(t,['allSimples'])['total'])


class RoundTest(unittest.TestCase):
    def test_every_dragon_round_and_conservation(self):
        for d in DRAGONS:
            with self.subTest(dragon=d['id']):
                r=DragonRound([d['id']],seed=932).go()
                physical=r.hand+r.discarded+[t for _,ts in r.table for t in ts]+[t for st in r.wall for t in st]
                self.assertEqual(Counter(physical),Counter(starting_tiles()))
                self.assertGreaterEqual(r.total,0)
                self.assertEqual(r.total,DragonRound([d['id']],seed=932).go().total)

    def test_depletion_does_not_spend_unused_plays(self):
        r=DragonRound(['lastEmber'],tiles=[('m',1)],seed=3).go()
        self.assertTrue(r.exhausted)
        self.assertEqual(r.plays,8)
        self.assertEqual(effects(r.table,r.ids,r.context())['lastEmber'],1)

    def test_resources(self):
        r=DragonRound(['ironTeapot','longSleeves','nightOwl','lantern'])
        self.assertEqual((r.discards,r.hand_size,r.plays,r.peek),(5,9,9,2))
        with self.assertRaises(ValueError): DragonRound(['lantern']*2)

    def test_hidden_tiles_do_not_change_draw(self):
        a,b=DragonRound(['lantern'],seed=4),DragonRound(['lantern'],seed=4)
        # Keep visible three tiles and stack sizes; permute only hidden contents.
        b.wall=[list(reversed(st[:-3]))+st[-3:] for st in b.wall]
        # One draw, not a whole refill (later reveals legitimately affect choices).
        a.hand_size=b.hand_size=1
        a.refill(); b.refill()
        self.assertEqual(a.hand,b.hand)

    def test_bank_and_single_legality(self):
        r=DragonRound(['redString'],seed=1,bank=True,target=1).go()
        self.assertTrue(r.banked)
        self.assertGreater(r.plays,0)
        r=DragonRound(seed=2,tiles=[('m',1),('p',4)])
        r.go()
        self.assertEqual(len(r.table),0)


if __name__=='__main__': unittest.main()
