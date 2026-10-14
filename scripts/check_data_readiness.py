"""Consolidated NFL data readiness gates from independently generated audit reports."""
import json
from datetime import datetime,timezone
from pathlib import Path
root=Path("diagnostics")
def read(name):
 p=root/name
 return json.loads(p.read_text()) if p.exists() else None
cov=read("nflverse-coverage.json")
cond=read("nflverse-conditional-quality.json")
rel=read("nflverse-relational-integrity.json")
ident=read("nflverse-master-identity.json")
exc=read("nflverse-identity-exceptions.json")
checks={}
def gate(name,passed,evidence,reason):
 checks[name]={"pass":bool(passed),"evidence":evidence,"reason":reason}
gate("coverage_retrieval_2023_2026", bool(cond) and all(v.get("status")=="ok" for v in cond["datasets"].values()), "nflverse-conditional-quality.json","16 cross-season datasets retrievable without error")
gate("game_id_relation",bool(rel) and all(not v.get("pbp_without_schedule_ids") and not v.get("completed_scored_schedule_without_pbp_ids") and v.get("status")=="ok" for v in rel["checks"].values()),"nflverse-relational-integrity.json","PBP game IDs map to schedule and completed scored games have PBP")
gate("play_id_uniqueness",bool(cond) and all(v.get("identity_check",{}).get("duplicate_groups")==0 for k,v in cond["datasets"].items() if k.startswith("pbp_")),"nflverse-conditional-quality.json","No duplicated non-null game/play ID pairs in observed PBP")
gate("snap_no_nulls",bool(cond) and all(v.get("total_null_cells")==0 for k,v in cond["datasets"].items() if k.startswith("snap_counts_")),"nflverse-conditional-quality.json","Only NA-free snap rows, not player validity")
# Missing identities are allowed only under explicit quarantine and bounded prevalence.
# This gate measures overall integrity; specific affected players/matches remain blocked.
identity_total=sum(v.get("rows",0) for v in ident["years"].values()) if ident else 0
identity_unmapped=sum(v.get("rows",0)-v.get("matched_unique",0) for v in ident["years"].values()) if ident else 0
unresolved_share=identity_unmapped/identity_total if identity_total else 1.0
gate("player_identity_quarantine_threshold",
 bool(ident and exc and identity_total and unresolved_share<=0.005
      and sum(v.get("unmatched_snap_rows",0) for v in exc["status"].values())==identity_unmapped
      and all(v.get("ambiguous",0)==0 and v.get("status")=="ok" for v in ident["years"].values())),
 "nflverse-master-identity.json + nflverse-identity-exceptions.json",
 "Allow <=0.5% excluded snap rows ONLY if every excluded row is accounted for and quarantined. "
 "This does not validate affected player/match projections; those remain blocked.")
for name,description in [
 ("player_week_team_join","Exact GSIS + team + week agreement between roster, play and snaps"),
 ("official_cross_source_agreement","Validated ESPN/NFL official score, individual stats and snaps concordance"),
 ("injury_all_positions_asof","Pregame injury and inactives with publication timestamp, substitutions across all positions"),
 ("coaches_and_matchups","Coach stints, playcalling, lineup, styles and matching validated"),
 ("weather_forecasts_asof","Forecast snapshots captured before game / bet"),
 ("odds_market_asof","Book, legal market, rules, line and observed historical timestamp"),
 ("historical_multi_season","Long-term full historical audit and missingness by role"),
 ("raw_ingestion_persistence","Immutable authorized durable data storage in Supabase"),
 ("dataset_licensing","Machine-verified right to store and process each source"),
 ("model_input_lineage","Provenance and feature hashes, all injuries invalidate calculations")]:
 gate(name,False,None,description+" — no passing test evidence")
out={"generated_at_utc":datetime.now(timezone.utc).isoformat(),"status":"READY" if all(v["pass"] for v in checks.values()) else "BLOCKED","passed":sum(v["pass"] for v in checks.values()),"total":len(checks),"gates":checks,"policy":"Do not predict or propose actual bets until ALL gates passed and a separate calibration audit succeeds."}
root.mkdir(exist_ok=True)
(root/"nfl-data-readiness.json").write_text(json.dumps(out,indent=2,ensure_ascii=False))
print(json.dumps({"status":out["status"],"passed":out["passed"],"total":out["total"]}))
