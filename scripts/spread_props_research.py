#!/usr/bin/env python3
"""Exploratory spread backtest, independent of frozen production engines.
Uses nflverse game results and bookmaker line; NEVER claims to evaluate actual NFL Studio predictions.
"""
import csv, io, json, math, urllib.request
from collections import defaultdict, deque
URL = "https://raw.githubusercontent.com/nflverse/nfldata/master/data/games.csv"
with urllib.request.urlopen(URL, timeout=35) as response:
    games = list(csv.DictReader(io.StringIO(response.read().decode("utf-8-sig"))))
history = defaultdict(lambda: deque(maxlen=5))
scores = defaultdict(lambda: defaultdict(lambda: {"n":0,"won":0,"push":0,"missing":0}))
for g in sorted((x for x in games if x["season"].isdigit() and int(x["season"]) >= 2023 and int(x["season"]) <= 2026 and x["game_type"]=="REG"), key=lambda x:(int(x["season"]),int(x["week"]),x["gameday"],x["game_id"])):
    yr = int(g["season"])
    try:
        home,away = g["home_team"],g["away_team"]
        hs,aw = int(g["home_score"]),int(g["away_score"])
    except (ValueError,TypeError):
        continue
    h=history[(yr,home)]; a=history[(yr,away)]
    d = scores[yr]["all"]
    if h and a and g.get("spread_line") and g.get("home_moneyline") and g.get("away_moneyline"):
        try:
            # nflverse spread_line is a magnitude; moneyline identifies favorite, but not a verified pregame snapshot
            mag=float(g["spread_line"])
            hm=float(g["home_moneyline"]); am=float(g["away_moneyline"])
            if hm == am: raise ValueError("ambiguous favorite")
            home_handicap=-mag if hm<am else mag
            prediction=(sum(h)/len(h)-sum(a)/len(a)+3)+home_handicap
            actual=(hs-aw)+home_handicap
            d["n"]+=1
            if actual == 0: d["push"]+=1
            elif (prediction>0)==(actual>0): d["won"]+=1
        except (ValueError,TypeError):
            d["missing"]+=1
    else: d["missing"]+=1
    h.append(hs-aw); a.append(aw-hs)
report={"method":"five-game scoring margin, home +3, compare against historical spread","not_production_engine":True,"data_url":URL,"historical_odds_observation_time_verified":False,"results":[],"props":{"accuracy":None,"reason":"No timestamp-verified historical prop predictions and matching odds available in this input."}}
for year in sorted(scores):
    s=scores[year]["all"]; decided=s["n"]-s["push"]
    report["results"].append({"season":year,**s,"decided":decided,"accuracy_pct":round(s["won"]/decided*100,2) if decided else None})
print(json.dumps(report,indent=2))
with open("diagnostics/spread-props-backtest.json","w") as f: json.dump(report,f,indent=2)
