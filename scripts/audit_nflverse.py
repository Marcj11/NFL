"""Audit reproductible de couverture nflverse; rapport JSON sans données privées."""
import json, math, traceback
from datetime import datetime, timezone
from pathlib import Path
import nflreadpy as nfl
OUT=Path("diagnostics/nflverse-coverage.json")
YEARS=[2024,2025,2026]
JOBS={
 "schedules":lambda year:nfl.load_schedules(),
 "pbp":lambda year:nfl.load_pbp(year),
 "player_stats":lambda year:nfl.load_player_stats(year),
 "rosters_weekly":lambda year:nfl.load_rosters_weekly(year),
 "snap_counts":lambda year:nfl.load_snap_counts(year),
 "injuries":lambda year:nfl.load_injuries(year),
 "participation":lambda year:nfl.load_participation(year),
 "ftn_charting":lambda year:nfl.load_ftn_charting(year),
}
report={"created_at_utc":datetime.now(timezone.utc).isoformat(),"library":"nflreadpy","years":YEARS,"checks":{},"notes":["L'existence de donnees en 2026 ne signifie pas qu'elles sont pregame/live.","Un echec du fournisseur n'equivaut pas a zero match.","Le statut published_at/as-of necessite verification separee."]}
for name, fn in JOBS.items():
 for year in YEARS:
  key=f"{name}_{year}"
  try:
   df=fn(year)
   if name=="schedules" and "season" in df.columns:
    df=df.filter(__import__('polars').col('season')==year)
   n=df.height
   missing={}
   for col in df.columns:
    nulls=df[col].null_count()
    if nulls:missing[col]=round(nulls/max(n,1),4)
   report["checks"][key]={"status":"ok","rows":n,"columns":len(df.columns),"column_names":df.columns[:250],"null_fraction":missing,"schema_types":{c:str(t) for c,t in zip(df.columns,df.dtypes)}}
  except Exception as e:
   report["checks"][key]={"status":"error","error_type":type(e).__name__,"error":str(e)[:500]}
OUT.parent.mkdir(exist_ok=True,parents=True)
OUT.write_text(json.dumps(report,ensure_ascii=False,indent=2))
print(json.dumps({"total_checks":len(report["checks"]),"successful":sum(x["status"]=="ok" for x in report["checks"].values()),"total_rows":sum(x.get("rows",0) for x in report["checks"].values()),"report":str(OUT)}))
