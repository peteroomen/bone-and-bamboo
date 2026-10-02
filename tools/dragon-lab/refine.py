"""Holdout tuning and resource-policy checks after the initial sweep."""
import json
import statistics as st
from pathlib import Path
from experiment import SCENARIOS, paired, summary
from lab import DragonRound

PROPOSALS={'sparrowNest':3,'abacus':1,'outside':2,'evenComb':0.5,'middlePath':0.5,
           'paperFan':2,'fourTools':2,'emptyChair':0.15,'lastEmber':1.5,'stillPond':1.5,
           'stoneLion':2,'threeTreasures':1.3}


def main():
    n=128; rows=[]
    for scenario in ('starter','prepared'):
        kwargs=SCENARIOS[scenario]
        baseline=[DragonRound(seed=62000+i,**kwargs).go().total for i in range(n)]
        for id,amount in PROPOSALS.items():
            old=[DragonRound([id],seed=62000+i,**kwargs).go().total for i in range(n)]
            new=[DragonRound([id],seed=62000+i,tuning={id:amount},**kwargs).go().total for i in range(n)]
            rows.append(dict(id=id,scenario=scenario,amount=amount,old=summary(old),new=summary(new),old_uplift=paired(baseline,old),new_uplift=paired(baseline,new)))
    out=Path('docs/balance/dragon-lab-refinements.json')
    out.write_text(json.dumps(dict(n=n,seed0=62000,policy='aware',rows=rows),indent=2)+'\n')
    for r in rows:
        if r['scenario']=='starter':print(r['id'],r['old_uplift']['median'],r['new_uplift']['median'])


if __name__=='__main__': main()
