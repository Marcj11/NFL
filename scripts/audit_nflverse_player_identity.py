"""Audit des identifiants snaps PFR vers roster PFR et GSIS.
Les résultats indéterminés restent explicites, sans matching par nom.
"""
import json
from datetime import datetime, timezone
from pathlib import Path
import polars as pl
import nflreadpy as nfl

YEARS=[2023,2024,2025,2026]
res={"generated_utc":datetime.now(timezone.utc).isoformat(),"years":YEARS,"results":{},"notes":["Association sur identifiant PFR exact et saison; vérification par équipe/semaine secondaire.","Sans mapping GSIS un joueur reste non résolu, jamais imputé par nom.","Les équipes peuvent changer pendant une saison; 'different_team' nécessite revue des transactions."]}
for year in YEARS:
 o={}
 try:
  snap=nfl.load_snap_counts(year)
  roster=nfl.load_rosters_weekly(year)
  required_s={"pfr_player_id","team","week","season"}
  required_r={"pfr_id","gsis_id","team","week","season"}
  o["snap_columns"]=snap.columns
  o["roster_columns"]=roster.columns
  if not required_s.issubset(snap.columns) or not required_r.issubset(roster.columns):
   o["status"]="schema_failure";o["missing_snap"]=sorted(required_s-set(snap.columns));o["missing_roster"]=sorted(required_r-set(roster.columns))
  else:
   s=snap.with_columns(pl.col("pfr_player_id").cast(pl.String).str.strip_chars().alias("pfr")).filter(pl.col("pfr").is_not_null() & (pl.col("pfr")!=""))
   r=roster.with_columns(pl.col("pfr_id").cast(pl.String).str.strip_chars().alias("pfr")).filter(pl.col("pfr").is_not_null() & (pl.col("pfr")!=""))
   o["snap_rows_total"]=snap.height;o["snap_rows_with_pfr"]=s.height;o["roster_rows_total"]=roster.height;o["roster_rows_with_pfr"]=r.height
   pairs=r.select(["season","pfr","gsis_id"]).unique()
   conflicts=pairs.filter(pl.col("gsis_id").is_not_null()).group_by(["season","pfr"]).agg(pl.col("gsis_id").n_unique().alias("n")).filter(pl.col("n")>1)
   o["ambiguous_pfr_to_gsis"]=conflicts.height
   unique_id=pairs.group_by(["season","pfr"]).agg(pl.col("gsis_id").drop_nulls().unique().alias("gsis_set"))
   unique_id=unique_id.with_columns(pl.col("gsis_set").list.len().alias("mapping_count"))
   linked=s.join(unique_id,on=["season","pfr"],how="left")
   o["snap_rows_mapped_unique_gsis"]=linked.filter(pl.col("mapping_count")==1).height
   o["snap_rows_unmapped_pfr"]=linked.filter(pl.col("mapping_count").is_null()).height
   o["snap_rows_no_gsis"]=linked.filter(pl.col("mapping_count")==0).height
   o["snap_rows_ambiguous"]=linked.filter(pl.col("mapping_count")>1).height
   # Distinct weekly PFR key independent of repeated snaps in one game.
   roster_week=r.select(["season","week","team","pfr"]).unique()
   in_week=s.join(roster_week,on=["season","week","team","pfr"],how="anti")
   o["snap_rows_not_in_matching_week_team_roster"]=in_week.height
   o["missing_pfr_examples"]=s.join(unique_id,on=["season","pfr"],how="anti").select("pfr").unique().head(12).to_series().to_list()
   o["status"]="ok"
 except Exception as e:
  o["status"]="error";o["error_type"]=type(e).__name__;o["error"]=str(e)[:600]
 res["results"][str(year)]=o
p=Path("diagnostics/nflverse-player-identity.json");p.parent.mkdir(parents=True,exist_ok=True);p.write_text(json.dumps(res,indent=2,ensure_ascii=False))
print(json.dumps({"years":len(YEARS),"passed":sum(v["status"]=="ok" for v in res["results"].values()),"report":str(p)}))
