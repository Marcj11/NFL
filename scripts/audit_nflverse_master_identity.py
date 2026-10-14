"""Reconciliation PFR snap ids to nflverse master players; no name matching."""
import nflreadpy as nfl
import polars as pl
import json
from pathlib import Path
from datetime import datetime,timezone
out={"created_utc":datetime.now(timezone.utc).isoformat(),"years":{},"source":"nflreadpy.load_players and load_snap_counts","rules":"Exact PFR id only; unique nonnull GSIS accepted; ambiguous quarantined"}
players=nfl.load_players()
for y in (2023,2024,2025,2026):
 try:
  snap=nfl.load_snap_counts(y)
  p=players.select([pl.col("pfr_id").cast(pl.String).str.strip_chars().alias("pfr"),pl.col("gsis_id").cast(pl.String).str.strip_chars().alias("gsis")]).filter(pl.col("pfr").is_not_null()&(pl.col("pfr")!="")).unique()
  pm=p.group_by("pfr").agg(pl.col("gsis").drop_nulls().unique().alias("g")).with_columns(pl.col("g").list.len().alias("count"))
  s=snap.with_columns(pl.col("pfr_player_id").cast(pl.String).str.strip_chars().alias("pfr"))
  m=s.join(pm,on="pfr",how="left")
  out["years"][str(y)]={"status":"ok","rows":s.height,"matched_unique":m.filter(pl.col("count")==1).height,"unmatched":m.filter(pl.col("count").is_null()).height,"no_gsis":m.filter(pl.col("count")==0).height,"ambiguous":m.filter(pl.col("count")>1).height,"missing_pfr":s.filter(pl.col("pfr").is_null()).height,"unique_pfr":s.select("pfr").n_unique(),"examples_unmatched":m.filter(pl.col("count").is_null()).select("pfr").unique().head(10).to_series().to_list()}
 except Exception as e:out["years"][str(y)]={"status":"error","error":str(e)[:500]}
p=Path("diagnostics/nflverse-master-identity.json");p.parent.mkdir(exist_ok=True,parents=True);p.write_text(json.dumps(out,indent=2,ensure_ascii=False))
print(json.dumps({"statuses":{y:v["status"] for y,v in out["years"].items()}}))
