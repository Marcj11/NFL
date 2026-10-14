"""Cross-table NFL data integrity checks; no simulated outcomes."""
import json
from pathlib import Path
from datetime import datetime,timezone
import polars as pl
import nflreadpy as nfl
YEARS=[2023,2024,2025,2026]
report={"created_utc":datetime.now(timezone.utc).isoformat(),"years":YEARS,"checks":{},"caveats":["Schedule ids must be inspected for semantics; matched games are not necessarily fully finalized.","player identifiers may have a field naming variation across datasets.","Null and duplicate counts do not prove semantic correctness."]}
for year in YEARS:
 out={}
 try:
  pbp=nfl.load_pbp(year)
  schedule=nfl.load_schedules().filter(pl.col("season")==year)
  out["pbp_rows"]=pbp.height
  out["schedule_rows"]=schedule.height
  if "game_id" in pbp.columns and "game_id" in schedule.columns:
   actual=set(pbp.select("game_id").drop_nulls().unique().to_series().to_list())
   scheduled=set(schedule.select("game_id").drop_nulls().unique().to_series().to_list())
   out["pbp_unique_game_ids"]=len(actual)
   out["scheduled_unique_game_ids"]=len(scheduled)
   out["pbp_without_schedule_ids"]=sorted(str(x) for x in actual-scheduled)[:100]
   out["schedule_without_pbp_count"]=len(scheduled-actual)
   if "home_score" in schedule.columns:
    done=schedule.filter(pl.col("home_score").is_not_null()).select("game_id").unique().to_series().to_list()
    out["completed_scored_schedule_without_pbp_ids"]=sorted(str(x) for x in set(done)-actual)[:100]
  else:out["game_join_error"]="game_id not found in one dataset"
  id_cols=[x for x in ("game_id","play_id","posteam","defteam","passer_player_id","rusher_player_id","receiver_player_id") if x in pbp.columns]
  out["pbp_id_missing"]={x:int(pbp[x].null_count()) for x in id_cols}
  snap=nfl.load_snap_counts(year)
  roster=nfl.load_rosters_weekly(year)
  out["snap_rows"]=snap.height;out["roster_rows"]=roster.height
  out["snap_id_columns"]=[x for x in snap.columns if "id" in x.lower() or "week" in x.lower() or x in ("team","season")]
  out["roster_id_columns"]=[x for x in roster.columns if "id" in x.lower() or "week" in x.lower() or x in ("team","season")]
  if "player_id" in snap.columns and "gsis_id" in roster.columns:
   s=set(snap.select("player_id").drop_nulls().unique().to_series().to_list())
   r=set(roster.select("gsis_id").drop_nulls().unique().to_series().to_list())
   out["snap_player_ids"]=len(s);out["roster_gsis_ids"]=len(r)
   out["snap_ids_without_any_roster"]=len(s-r)
  out["status"]="ok"
 except Exception as e:out["status"]="error";out["error"]=str(e)[:600]
 report["checks"][str(year)]=out
p=Path("diagnostics/nflverse-relational-integrity.json");p.parent.mkdir(exist_ok=True,parents=True);p.write_text(json.dumps(report,indent=2,ensure_ascii=False))
print(json.dumps({"seasons":len(report["checks"]),"ok":sum(x["status"]=="ok" for x in report["checks"].values())}))
