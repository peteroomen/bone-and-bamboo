"""Paired experiments; write all outputs with --out. Standard library only."""
import argparse
import json
import random
import statistics as st
from pathlib import Path
from collections import Counter
from math import sqrt
from catalogue import DRAGONS, BY_ID
from lab import DragonRound, starting_tiles, effects

POLICIES=('greedy','pongs','aware')
TUNING={'sparrowNest':3,'outside':2,'abacus':1,'stoneLion':2,'threeTreasures':1.3}
SCENARIOS={
 'starter':dict(),
 'prepared':dict(tiles=starting_tiles()+[(s,r) for s in 'mps' for r in (2,5,8)]+[('w',r) for r in range(1,5) for _ in range(3)],money=25,round_index=3,levels={'chow':1,'pong':1}),
 'simples':dict(tiles=[t for t in starting_tiles() if t[1] not in (1,9)],money=15,round_index=2,levels={'pair':1}),
}


def summary(values):
    values=sorted(values)
    return {'mean':round(st.mean(values),3),'median':round(st.median(values),3),'p10':values[len(values)//10],'p90':values[9*len(values)//10]}


def paired(base, values):
    diffs=[(v-b)/max(1,b)*100 for b,v in zip(base,values)]
    mean=st.mean(diffs)
    se=st.stdev(diffs)/sqrt(len(diffs)) if len(diffs)>1 else 0
    return dict(summary(diffs),mean_ci95=[round(mean-1.96*se,3),round(mean+1.96*se,3)])


def sweep(n,seed0):
    rows=[]
    for scenario,kwargs in SCENARIOS.items():
        for policy in POLICIES:
            baseline=[DragonRound(seed=seed0+i,policy=policy,**kwargs).go().total for i in range(n)]
            for d in DRAGONS:
                rounds=[DragonRound([d['id']],seed=seed0+i,policy=policy,**kwargs).go() for i in range(n)]
                values=[r.total for r in rounds]
                vals=[effects(r.table,[d['id']],r.context())[d['id']] for r in rounds]
                neutral=1 if d['lane'] in ('xmult','xlinear') else 0
                rows.append(dict(id=d['id'],scenario=scenario,policy=policy,baseline=summary(baseline),score=summary(values),paired_pct=paired(baseline,values),activation=sum(v!=neutral for v in vals)/n,mean_income=st.mean(r.earned for r in rounds),pass_rate=sum(v>=1000 for v in values)/n))
            print(f'{scenario}/{policy}: {n*61} rounds',flush=True)
    return rows


def interactions(n,seed0):
    builds={
      'pairs':['sparrowNest','pairBridge','twinPeaches','pairPeddler','redString'],
      'chows':['abacus','chowDrum','pureStraight','rainbowChow','nineWindows'],
      'pongs':['pongHall','stoneLion','threeTreasures','pongSeal','threeBrothers'],
      'winds':['windChime','windSail','eastCompass','windCourier','fourTools'],
      'savings':['jadeOx','coinBelt','closedFan','paperFan','stillPond'],
      'kongs':['kongBell','fourthPillar','kongMint','pongHall','stoneLion'],
      'single_suit':['singleSuit','twoSuits','bambooGrove','allSimples','oddBeads'],
    }
    out=[]
    for name,ids in builds.items():
        kwargs=dict(SCENARIOS['prepared'])
        if name=='single_suit': kwargs['tiles']=[t for t in starting_tiles() if t[0]=='s' and 2<=t[1]<=8]
        if name=='kongs': kwargs['tiles']=starting_tiles()+[(s,r) for s in 'mps' for r in range(1,10)]
        for policy in POLICIES:
            for tuned in (False,True):
                vals=[DragonRound(ids,seed0+i,policy=policy,tuning=TUNING if tuned else None,**kwargs).go().total for i in range(n)]
                out.append(dict(build=name,ids=ids,policy=policy,tuned=tuned,score=summary(vals)))
    return out


def evaluate(ids,money,index,seeds,policy,tuning):
    rounds=[DragonRound(ids,s,policy=policy,money=money,round_index=index,tuning=tuning,bank=True,target=(1000,4000,9000,18000)[index-1]).go() for s in seeds]
    # Income valued explicitly as future buying power, never as score. Heuristic, not fitted exchange rate.
    return st.mean(min(r.total/(1000,4000,9000,18000)[index-1],2) + 0.025*r.earned*(4-index) for r in rounds)


def market_run(seed,aware,tuned=False):
    rng=random.Random(seed); ids=[]; money=4; buys=[]; replacements=0
    tuning=TUNING if tuned else None
    for index,target in enumerate((1000,4000,9000,18000),1):
        # Training walls independent of played walls; prospectively choose policy for each candidate.
        seeds=[700000+seed*37+index*7+j for j in range(3)]
        def value(candidate,cash):
            choices=POLICIES if aware else ('greedy',)
            return max((evaluate(candidate,cash,index,seeds,p,tuning),p) for p in choices)
        policy=value(ids,money)[1] if aware else 'greedy'
        r=DragonRound(ids,900000+seed*11+index,policy=policy,money=money,round_index=index,tuning=tuning,bank=True,target=target).go()
        if r.total<target: return dict(won=False,rounds=index-1,buys=buys,replacements=replacements,money=money)
        if index==4: return dict(won=True,rounds=4,buys=buys,replacements=replacements,money=money)
        money+=(10,12,14)[index-1]+r.unused_discards+min(5,money//5)+r.earned
        # A deliberately limited dragon-only market: free rare gift and three weighted offers.
        gifts=rng.sample([d['id'] for d in DRAGONS if d['rarity']=='rare' and d['id'] not in ids],2)
        offers=rng.choices([d['id'] for d in DRAGONS],weights=[{'common':6,'uncommon':3,'rare':1}[d['rarity']] for d in DRAGONS],k=3)
        next_seeds=[800000+seed*37+index*7+j for j in range(3)]
        def next_value(candidate,cash):
            return max(evaluate(candidate,cash,index+1,next_seeds,p,tuning) for p in (POLICIES if aware else ('greedy',)))
        for pool,free in ((gifts,True),(offers,False)):
            while pool:
                baseline=next_value(ids,money)
                options=[]
                for id in pool:
                    if id in ids: continue
                    price=0 if free else BY_ID[id]['price']
                    for old in ([None] if len(ids)<5 else list(ids)):
                        # Gifts replace without sale income; bought replacements sell the old dragon.
                        cash=money-price+(BY_ID[old]['price']//2 if old and not free else 0)
                        if cash<0: continue
                        candidate=[d for d in ids if d!=old]+[id]
                        options.append((next_value(candidate,cash)-baseline,id,old,cash,candidate))
                if not options: break
                gain,id,old,cash,candidate=max(options)
                if gain<=0: break
                ids=candidate; money=cash; buys.append(id); replacements+=old is not None
                pool.remove(id)
                if free: break
    raise AssertionError('unreachable')


def main():
    ap=argparse.ArgumentParser(); ap.add_argument('--n',type=int,default=128); ap.add_argument('--runs',type=int,default=48); ap.add_argument('--out',default='docs/balance/dragon-lab-results.json'); a=ap.parse_args()
    data=dict(version=1,n=a.n,seed0=42000,scenarios={k:{x:v for x,v in kw.items() if x!='tiles'}|{'deck_size':len(kw.get('tiles',starting_tiles()))} for k,kw in SCENARIOS.items()},sweep=sweep(a.n,42000),interactions=interactions(a.n,52000),tuning=TUNING,market={})
    # Checkpoint the expensive paired sweep before market experiments.
    path=Path(a.out); path.parent.mkdir(parents=True,exist_ok=True); path.write_text(json.dumps(data,indent=2)+'\n')
    for aware,tuned in ((False,False),(True,False),(True,True)):
        name=f'{"adaptive" if aware else "fixed"}_{"tuned" if tuned else "original"}'
        runs=[market_run(61000+i,aware,tuned) for i in range(a.runs)]
        data['market'][name]=dict(n=a.runs,wins=sum(r['won'] for r in runs),mean_rounds=st.mean(r['rounds'] for r in runs),replacements=sum(r['replacements'] for r in runs),purchases=dict(Counter(id for r in runs for id in r['buys'])),runs=runs)
        path.write_text(json.dumps(data,indent=2)+'\n'); print(name,data['market'][name]['wins'],flush=True)


if __name__=='__main__': main()
