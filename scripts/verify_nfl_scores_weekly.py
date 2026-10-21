"""Verify stored scores against nflverse schedules. Never label nflverse alone 'official NFL'."""
import os,json
import nflreadpy as nfl
from supabase import create_client
db_url=os.environ["NFL_COMPACT_SUPABASE_URL"].rstrip("/")
assert db_url=="https://jwetwyqlogowznkidnly.supabase.co"
db=create_client(db_url,os.environ["NFL_COMPACT_SUPABASE_SERVICE_ROLE_KEY"])
year=int(os.getenv("NFL_GRADE_SEASON","2026"))
assert 2023<=year<=2027
dry=os.getenv("NFL_VERIFY_DRY_RUN","true").lower()!="false"
registry=db.table("source_registry").select("id,approved_for_ingestion").eq("source_name","nflverse").execute().data
assert len(registry)==1 and registry[0]["approved_for_ingestion"] is True
rows=nfl.load_schedules().filter(__import__("polars").col("season")==year).to_dicts()
schedule={str(r["game_id"]):r for r in rows if r.get("game_id")}
stored=db.table("game_results").select("game_id,home_score,away_score,result_status").gte("game_id",str(year)+"_").lt("game_id",str(year+1)+"_").limit(500).execute().data
verified=0; mismatches=[];skipped=0
for old in stored:
    r=schedule.get(old["game_id"])
    if not r or r.get("home_score") is None or r.get("away_score") is None:
        skipped+=1;continue
    if int(old["home_score"])!=int(r["home_score"]) or int(old["away_score"])!=int(r["away_score"]):
        mismatches.append(old["game_id"]);continue
    if old["result_status"]=="retrospective_unverified":
        if not dry:
            db.table("game_results").update({"result_status":"nflverse_scores_verified"}).eq("game_id",old["game_id"]).eq("result_status","retrospective_unverified").eq("home_score",old["home_score"]).eq("away_score",old["away_score"]).execute()
        verified+=1
print(json.dumps({"season":year,"dry_run":dry,"matched_for_verification":verified,"mismatches":mismatches,"skipped":skipped}))
if mismatches:raise SystemExit("Source score disagreement; review mismatch before grading")
