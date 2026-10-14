import nflreadpy as nfl, polars as pl, json
from pathlib import Path
from datetime import datetime,timezone
out={"utc":datetime.now(timezone.utc).isoformat(),"seasons":{},"definition":"Cross-check distinct roster PFR IDs by season/team/week against snaps. Coverage rates conditional; missing mappings quarantined. No guessed names."}
for year in (2023,2024,2025,2026):
 try:
  s=nfl.load_snap_counts(year)
  r=nfl.load_rosters_weekly(year)
  sk=s.select(pl.col("season"),pl.col("week"),pl.col("team"),pl.col("pfr_player_id").alias("pfr")).filter(pl.col("pfr").is_not_null()).unique()
  rk=r.select(pl.col("season"),pl.col("week"),pl.col("team"),pl.col("pfr_id").alias("pfr")).filter(pl.col("pfr").is_not_null()).unique()
  missing=sk.join(rk,on=["season","week","team","pfr"],how="anti")
  out["seasons"][str(year)]={"status":"ok","unique_snap_player_weeks":sk.height,"not_in_same_week_team_roster":missing.height,"coverage_pct":round(100*(1-missing.height/max(sk.height,1)),3),"examples":missing.head(10).to_dicts()}
 except Exception as e:out["seasons"][str(year)]={"status":"error","error":str(e)[:600]}
p=Path("diagnostics/nflverse-player-team-week.json");p.parent.mkdir(exist_ok=True);p.write_text(json.dumps(out,indent=2,ensure_ascii=False))
print(json.dumps({k:{a:b for a,b in v.items() if a!="examples"} for k,v in out["seasons"].items()}))
