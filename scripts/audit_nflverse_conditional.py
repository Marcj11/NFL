"""Conditional field quality audit. NA is measured only on eligible events."""
import json
from datetime import datetime,timezone
from pathlib import Path
import polars as pl
import nflreadpy as nfl

YEARS=[2023,2024,2025,2026]
# Explicit eligibility: do not equate missing values on ineligible plays with data defects.
RULES=[
 ("pass_air_yards","pass_attempt","air_yards"),
 ("pass_location","pass_attempt","pass_location"),
 ("pass_length","pass_attempt","pass_length"),
 ("rush_run_location","rush_attempt","run_location"),
 ("rush_run_gap","rush_attempt","run_gap"),
 ("completed_pass_yac","complete_pass","yards_after_catch"),
]
report={"created_utc":datetime.now(timezone.utc).isoformat(),"seasons":YEARS,"datasets":{},"warnings":["Conditional eligibility is approximate until definitions are validated against nflverse dictionary.","Missing on eligible events is a flag for investigation, not proof of corruption.","QB and injuries as-of publication cannot be verified from aggregates alone."]}
def load(name,year):
 if name=="pbp":return nfl.load_pbp(year)
 if name=="player_stats":return nfl.load_player_stats(year)
 if name=="snap_counts":return nfl.load_snap_counts(year)
 if name=="rosters_weekly":return nfl.load_rosters_weekly(year)
 raise ValueError(name)
for year in YEARS:
 for dataset in ("pbp","player_stats","snap_counts","rosters_weekly"):
  key=f"{dataset}_{year}"
  try:
   df=load(dataset,year)
   info={"status":"ok","rows":df.height,"columns":len(df.columns),"checks":[]}
   if dataset=="pbp":
    for label,flag,field in RULES:
     if flag not in df.columns or field not in df.columns:
      info["checks"].append({"rule":label,"status":"unknown_column","required":[flag,field]});continue
     # null eligibility flag is excluded from eligible denominator and counted separately.
     eligible=df.filter(pl.col(flag).cast(pl.Float64,strict=False)==1)
     n=eligible.height
     valid=eligible.select(pl.col(field).is_not_null().sum()).item()
     info["checks"].append({"rule":label,"status":"ok" if n else "no_eligible_events","eligible":n,"non_null":valid,"eligible_non_null_pct":round(100*valid/n,2) if n else None})
    # critical identity uniqueness: game + play id where available.
    ids=[col for col in ("game_id","play_id") if col in df.columns]
    if len(ids)==2:
     duplicates=df.filter(pl.col("game_id").is_not_null() & pl.col("play_id").is_not_null()).group_by(ids).len().filter(pl.col("len")>1)
     info["identity_check"]={"keys":ids,"duplicate_groups":duplicates.height}
   elif dataset=="player_stats":
    # passing cpoe eligible where there are pass attempts, not across every roster player.
    cols=df.columns
    if "attempts" in cols and "passing_cpoe" in cols:
     active=df.filter(pl.col("attempts").cast(pl.Float64,strict=False)>0)
     n=active.height
     valid=active.select(pl.col("passing_cpoe").is_not_null().sum()).item()
     info["checks"].append({"rule":"passing_cpoe_on_pass_attempts","eligible":n,"non_null":valid,"eligible_non_null_pct":round(100*valid/n,2) if n else None})
    else:info["checks"].append({"rule":"passing_cpoe_on_pass_attempts","status":"schema_check_required","columns_present":list(c for c in ("attempts","passing_cpoe") if c in cols)})
   else:
    info["total_null_cells"]=int(df.null_count().sum_horizontal().sum().item())
   report["datasets"][key]=info
  except Exception as e:
   report["datasets"][key]={"status":"error","error_type":type(e).__name__,"error":str(e)[:450]}
p=Path("diagnostics/nflverse-conditional-quality.json");p.parent.mkdir(parents=True,exist_ok=True);p.write_text(json.dumps(report,indent=2,ensure_ascii=False))
print(json.dumps({"datasets":len(report["datasets"]),"success":sum(x["status"]=="ok" for x in report["datasets"].values()),"report":str(p)}))
