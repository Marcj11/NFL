#!/usr/bin/env python3
"""Exploratory player props benchmark. NO real odds or production engine accuracy."""
import csv,io,json,urllib.request,os
from collections import defaultdict,deque
BASE="https://github.com/nflverse/nflverse-data/releases/download/stats_player/stats_player_week_{}.csv"
CUTS={"passing_yards":224.5,"rushing_yards":49.5,"receiving_yards":49.5}
# Only players with material prior workload, determined strictly before the tested game.
MIN_PRIOR={"passing_yards":150.0,"rushing_yards":25.0,"receiving_yards":25.0}
history=defaultdict(lambda:deque(maxlen=5))
results=defaultdict(lambda:{"n":0,"correct":0,"over_calls":0,"actual_overs":0,"always_under_correct":0})
for year in (2023,2024,2025,2026):
 with urllib.request.urlopen(BASE.format(year),timeout=60) as response:
  records=list(csv.DictReader(io.StringIO(response.read().decode("utf-8-sig"))))
 assert records and "player_id" in records[0] and "week" in records[0]
 for rec in sorted(records,key=lambda x:(int(float(x.get("week") or 0)),x.get("player_id") or "")):
  if rec.get("season_type","REG") not in ("REG",""):continue
  player=rec.get("player_id")
  if not player:continue
  for metric,line in CUTS.items():
   raw=rec.get(metric)
   if raw is None or raw=="":continue
   try:value=float(raw)
   except ValueError:continue
   h=history[(year,player,metric)]
   if len(h)>=3:
    prior_avg=sum(h)/len(h)
    if prior_avg>=MIN_PRIOR[metric]:
     over=prior_avg>line;actual_over=value>line
     d=results[(year,metric)]
     d["n"]+=1;d["correct"]+=int(over==actual_over)
     d["over_calls"]+=int(over);d["actual_overs"]+=int(actual_over)
     d["always_under_correct"]+=int(not actual_over)
   h.append(value)
out={"research_only":True,"real_bookmaker_lines":False,"accuracy_for_real_props":None,
 "method":"previous 3-5 appearances average, fixed hypothetical thresholds, filter on prior average workload",
 "thresholds":CUTS,"minimum_prior_average":MIN_PRIOR,
 "cautions":["Not actual sportsbook lines or bets","No official pregame availability verification","Sample restricted on strictly prior results; retains zeros for eligible players","Always-under baseline required to judge useful signal"],"results":[]}
for (year,metric),d in sorted(results.items()):
 out["results"].append({"season":year,"market":metric,**d,"accuracy_pct":round(100*d["correct"]/d["n"],2) if d["n"] else None,"always_under_pct":round(100*d["always_under_correct"]/d["n"],2) if d["n"] else None})
os.makedirs("diagnostics",exist_ok=True)
with open("diagnostics/prop-history-research.json","w") as f:json.dump(out,f,indent=2)
print(json.dumps(out,indent=2))
