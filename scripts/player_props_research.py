#!/usr/bin/env python3
"""Historical prop-like statistical direction test. NO real bookmaker props/backtest claims.
Predefined hypothetical thresholds; forecast based only on PREVIOUS completed weeks.
"""
import csv,io,json,urllib.request
from collections import defaultdict,deque
BASE="https://github.com/nflverse/nflverse-data/releases/download/stats_player/stats_player_reg_{}.csv"
THRESHOLDS={"passing_yards":224.5,"rushing_yards":49.5,"receiving_yards":49.5}
history=defaultdict(lambda:deque(maxlen=5))
summary=defaultdict(lambda:{"decided":0,"correct":0,"over_calls":0,"wins_over":0})
meta={}
for year in (2023,2024,2025,2026):
    with urllib.request.urlopen(BASE.format(year),timeout=60) as r:
        records=list(csv.DictReader(io.StringIO(r.read().decode("utf-8-sig"))))
    assert records and 'player_id' in records[0] and 'week' in records[0], "unexpected schema"
    meta[str(year)]={"source_rows":len(records)}
    for rec in sorted(records,key=lambda x:(int(float(x.get('week') or 0)),x.get('player_id') or '')):
        if rec.get('season_type','REG') not in ('REG',''): continue
        player=rec.get('player_id','');week=rec.get('week')
        if not player or not week:continue
        for metric,line in THRESHOLDS.items():
            value=rec.get(metric)
            if value is None or value=='': continue
            try:actual=float(value)
            except ValueError:continue
            key=(year,player,metric)
            previous=history[key]
            # Need >=3 distinct previous weeks, never include current result in features.
            if len(previous)>=3:
                forecast=sum(previous)/len(previous)
                predicted_over=forecast>line
                outcome_over=actual>line
                k=(str(year),metric)
                s=summary[k];s['decided']+=1;s['correct']+=int(predicted_over==outcome_over)
                s['over_calls']+=int(predicted_over);s['wins_over']+=int(outcome_over)
            previous.append(actual)
out={"research_only":True,"real_market_lines":False,"actual_bookmaker_prop_accuracy":None,
     "method":"last 3-5 player games average vs fixed synthetic threshold; next result compared with same threshold",
     "limitations":["Fixed thresholds are illustrative, not actual betting lines or odds.",
      "Rows include zeros for players with recorded stats; no lineup or role verification.",
      "Only within-season preceding weeks; no retrospective current-match feature leakage.",
      "Selection of thresholds not out-of-sample validated."],
     "thresholds":THRESHOLDS,"source_counts":meta,"results":[]}
for (year,metric),d in sorted(summary.items()):
    out['results'].append({"season":int(year),"metric":metric,**d,"accuracy_pct":round(100*d['correct']/d['decided'],2) if d['decided'] else None})
import os
os.makedirs("diagnostics",exist_ok=True)
with open("diagnostics/prop-history-research.json","w") as f:json.dump(out,f,indent=2)
print(json.dumps(out,indent=2))
