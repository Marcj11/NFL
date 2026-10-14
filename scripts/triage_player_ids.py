import json
from pathlib import Path
from datetime import datetime, timezone
import polars as pl
import nflreadpy as nfl
years=(2023,2024,2025,2026)
players=nfl.load_players()
mapping=(players.select(pl.col("pfr_id").cast(pl.String).str.strip_chars().alias("pfr"),pl.col("gsis_id").cast(pl.String).alias("gsis"))
 .filter(pl.col("pfr").is_not_null()&(pl.col("pfr")!=""))
 .group_by("pfr").agg(pl.col("gsis").drop_nulls().unique().alias("gsis_candidates"))
 .with_columns(pl.col("gsis_candidates").list.len().alias("n")))
all_rows=[];status={}
for year in years:
 try:
  snaps=nfl.load_snap_counts(year)
  s=snaps.with_columns(pl.col("pfr_player_id").cast(pl.String).str.strip_chars().alias("pfr"))
  bad=s.join(mapping,on="pfr",how="left").filter(pl.col("n").is_null()|(pl.col("n")!=1))
  cols=[x for x in ("pfr","team","week","game_id","player") if x in bad.columns]
  b=bad.select(cols).unique().with_columns(pl.lit(year).alias("season")).to_dicts()
  all_rows+=b
  status[str(year)]={"unmatched_snap_rows":bad.height,"unique_exception_records":len(b)}
 except Exception as e:status[str(year)]={"error":str(e)[:400]}
groups={}
for r in all_rows:
 key=r["pfr"];z=groups.setdefault(key,{"pfr":key,"seasons":[],"teams":[],"affected_snap_rows":0})
 if r["season"] not in z["seasons"]:z["seasons"].append(r["season"])
 if r.get("team") not in z["teams"]:z["teams"].append(r.get("team"))
 z["affected_snap_rows"]+=1
report={"generated_at":datetime.now(timezone.utc).isoformat(),"status":status,"distinct_exception_pfr":len(groups),"exceptions":sorted(groups.values(),key=lambda z:-z["affected_snap_rows"]),"notes":["Grouped records refer to unique weekly entries, not a correction by guessed name.","No mapping is fabricated; unresolved IDs remain in quarantine."]}
Path("diagnostics").mkdir(exist_ok=True)
Path("diagnostics/nflverse-identity-exceptions.json").write_text(json.dumps(report,ensure_ascii=False,indent=2))
print(json.dumps({"unique_pfr_exceptions":len(groups),"seasons":status}))
