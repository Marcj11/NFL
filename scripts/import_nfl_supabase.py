"""NFL Studio historical import. Run only in a trusted server with SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.
Dry-run is default. Never handles bookmaker API quota.
"""
import os, sys, json, hashlib, datetime
import nflreadpy as nfl
from supabase import create_client
from urllib.parse import urlparse

def main():
    season=int(os.getenv("NFL_SEASON","2024"))
    if not 1999<=season<=2026: raise ValueError("season out of range")
    dry=os.getenv("NFL_IMPORT_COMMIT","false").lower()!="true"
    data=nfl.load_schedules()
    games=data.filter(__import__("polars").col("season")==season)
    print(json.dumps({"season":season,"schedule_rows":games.height,"dry_run":dry}))
    if dry:return
    url=os.environ["SUPABASE_URL"]
    key=os.environ["SUPABASE_SERVICE_ROLE_KEY"]
    if not url.startswith("https://") or not key:raise ValueError("server-side Supabase credentials missing")
    db=create_client(url,key)
    source=db.table("source_registry").select("id,approved_for_ingestion").eq("source_name","nflverse").execute().data
    if len(source)!=1 or source[0]["approved_for_ingestion"] is not True:
        raise RuntimeError("Source license not reviewed/approved: import blocked")
    rows=games.to_dicts()
    teams={}
    for row in rows:
        for side in ("home","away"):
            abbr=row.get(f"{side}_team")
            if abbr:teams[abbr]={"team_id":abbr,"display_name":abbr}
    for batch in chunks(list(teams.values()),100):
        db.table("teams").upsert(batch,on_conflict="team_id").execute()
    accepted=0;rejected=0
    for batch in chunks(rows,50):
        payload=[]
        for row in batch:
            if not row.get("game_id") or not row.get("gameday") or not row.get("gametime"):
                rejected+=1;continue
            dt=f'{row["gameday"]}T{row["gametime"]}'
            try:
                # schedule local-time conversion must be proven; DO NOT assume gametime timezone!
                # use validated universal kickoff field only
                kickoff=row.get("start_time")
                if kickoff is None or "+" not in str(kickoff) and not str(kickoff).endswith("Z"):
                    rejected+=1;continue
                payload.append({"game_id":str(row["game_id"]),"season":season,"week":int(row["week"]),"kickoff_utc":str(kickoff),"home_team_id":row["home_team"],"away_team_id":row["away_team"],"status":"scheduled"})
            except Exception:rejected+=1
        if payload:
            db.table("games").upsert(payload,on_conflict="game_id").execute();accepted+=len(payload)
    print(json.dumps({"accepted":accepted,"quarantined":rejected,"season":season}))
    if rejected:raise RuntimeError("Records quarantined: inspect schema & timezone before continuing")

def chunks(seq,size):
    for i in range(0,len(seq),size):yield seq[i:i+size]

if __name__=="__main__":main()
