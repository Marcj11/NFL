"""Import NFL play-by-play for one validated season; server-only, provenance-aware, idempotent.
Not pregame observations; never use for features ahead of game's completion.
"""
import os,json,hashlib,datetime,math
import polars as pl
import nflreadpy as nfl
from supabase import create_client
from uuid import uuid4
def normalize(v):
    if isinstance(v,float) and not math.isfinite(v): return None
    if isinstance(v,(datetime.date,datetime.datetime)): return v.isoformat()
    return v
def batch(seq,n):
    for p in range(0,len(seq),n): yield seq[p:p+n]
def main():
    season=int(os.getenv("NFL_PBP_SEASON","2024"))
    if not 2023<=season<=2026: raise RuntimeError("season outside audited window")
    db=create_client(os.environ["SUPABASE_URL"],os.environ["SUPABASE_SERVICE_ROLE_KEY"])
    source=db.table("source_registry").select("id,approved_for_ingestion").eq("source_name","nflverse").execute().data
    if len(source)!=1 or not source[0]["approved_for_ingestion"]: raise RuntimeError("Source not approved")
    source_id=source[0]["id"]
    df=nfl.load_pbp([season])
    required={"game_id","play_id","season"}
    if not required.issubset(set(df.columns)):raise RuntimeError("Missing required PBP fields")
    game_ids={x["game_id"] for x in db.table("games").select("game_id").eq("season",season).limit(1000).execute().data}
    cols=["game_id","play_id","season","posteam","defteam","qtr","game_seconds_remaining","down","ydstogo","yardline_100","play_type","epa","wp","passer_player_id","rusher_player_id","receiver_player_id"]
    cols=[c for c in cols if c in df.columns]
    rows=df.select(cols).to_dicts()
    clean=[];seen=set();rejected=0
    for x in rows:
        gid=x.get("game_id");pid=x.get("play_id")
        if gid not in game_ids or pid is None:
            rejected+=1;continue
        key=(str(gid),int(pid))
        if key in seen:raise RuntimeError("Duplicate game_id/play_id found")
        seen.add(key)
        item={"game_id":str(gid),"play_id":int(pid),"season":season}
        for src,dst in [("posteam","posteam"),("defteam","defteam"),("qtr","quarter"),("game_seconds_remaining","game_seconds_remaining"),("down","down"),("ydstogo","ydstogo"),("yardline_100","yardline_100"),("play_type","play_type"),("epa","epa"),("wp","wp"),("passer_player_id","passer_gsis_id"),("rusher_player_id","rusher_gsis_id"),("receiver_player_id","receiver_gsis_id")]:
            item[dst]=normalize(x.get(src))
        clean.append(item)
    if rejected:raise RuntimeError(f"PBP quarantined {rejected} rows; import blocked for review")
    if len(clean)<10000:raise RuntimeError(f"Unexpectedly small PBP {len(clean)}")
    ingested=0
    for chunk in batch(clean,300):
        stable=json.dumps(chunk,sort_keys=True,separators=(",",":"),allow_nan=False)
        digest=hashlib.sha256(stable.encode()).hexdigest()
        snap={"source_id":source_id,"record_type":"pbp_normalized_batch","observed_at":datetime.datetime.now(datetime.timezone.utc).isoformat(),"payload":{"season":season,"count":len(chunk),"hash_semantics":"normalized JSON batch, NOT original release-byte SHA256","source":"nflreadpy.load_pbp"},"content_sha256":digest,"quality_status":"provisional"}
        result=db.table("raw_snapshots").upsert(snap,on_conflict="source_id,record_type,content_sha256").execute()
        snapshots=db.table("raw_snapshots").select("snapshot_id").eq("source_id",source_id).eq("record_type","pbp_normalized_batch").eq("content_sha256",digest).execute().data
        if len(snapshots)!=1:raise RuntimeError("Cannot resolve snapshot")
        snapshot_id=snapshots[0]["snapshot_id"]
        for row in chunk: row["source_snapshot_id"]=snapshot_id
        db.table("pbp_plays").upsert(chunk,on_conflict="game_id,play_id,source_snapshot_id").execute()
        ingested+=len(chunk)
        if ingested%3000==0:print("progress",season,ingested,flush=True)
    print(json.dumps({"season":season,"source_records":len(rows),"accepted":ingested,"quarantined":rejected,"status":"IMPORTED_PROVISIONAL","source_sha256_verified":False}))
if __name__=="__main__":main()
