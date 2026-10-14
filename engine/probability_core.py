"""Deterministic NFL odds arithmetic; not a forecast model."""
from math import fsum, isfinite
def implied_probability(odds):
    odds=float(odds)
    if not isfinite(odds) or odds<=1: raise ValueError("decimal odds > 1 required")
    return 1/odds
def devig(offers):
    if len(offers)<2: raise ValueError("need complete market")
    q={k:implied_probability(v) for k,v in offers.items()}
    z=fsum(q.values())
    if z<1-1e-10: raise ValueError("underround/incomplete market")
    return {k:v/z for k,v in q.items()}
def ev(win,push,lose,odds):
    if any(not isfinite(x) or x<0 or x>1 for x in (win,push,lose)): raise ValueError("invalid probability")
    if abs(fsum((win,push,lose))-1)>1e-9: raise ValueError("not normalized")
    return win*(1/implied_probability(odds)-1)-lose
def threshold(pmf,line):
    if not isfinite(line): raise ValueError("line")
    if any(not isinstance(y,int) or not isfinite(p) or p<0 for y,p in pmf.items()) or abs(fsum(pmf.values())-1)>1e-9: raise ValueError("pmf")
    return (fsum(p for y,p in pmf.items() if y>line),fsum(p for y,p in pmf.items() if y==line),fsum(p for y,p in pmf.items() if y<line))
def spread(pmf,home_spread):
    return threshold(pmf,-home_spread)
def brier(probs,results):
    p=list(probs); y=list(results)
    if not p or len(p)!=len(y) or any(not 0<=a<=1 or b not in (0,1) for a,b in zip(p,y)): raise ValueError("invalid input")
    return fsum((a-b)**2 for a,b in zip(p,y))/len(p)
