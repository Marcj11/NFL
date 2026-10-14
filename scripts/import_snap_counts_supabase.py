import os,json,datetime,hashlib,math
import nflreadpy as nfl
from supabase import create_client

def main():
 y=int(os.getenv("NFL_SNAPS_SEASON","2024"))
 if y not in (2023,2024,2025,2026):raise RuntimeError("Unapproved season")
 db=create_client(os.environ["SUPABASE_URL"],os.environ["SUPABASE_SERVICE_ROLE_KEY"])
 src=db.table("source_registry").select("id,approved_for_ingestion").eq("source_name","nflverse").execute().data
 if len(src)!=1 or src[0]["approved_for_ingestion"] is not True:raise RuntimeError("Unapproved data source")
 sid=src[0]["id"]
 df=nfl.load_snap_counts(y)
 required={"game_id","pfr_player_id","team","offense_snaps","defense_snaps","st_snaps"}
 if not required.issubset(df.columns):raise RuntimeError(f"Schema mismatch: {sorted(required-set(df.columns))}")
 games={r["game_id"] for r in db.table("games").select("game_id").eq("season",y).limit(500).execute().data}
 # Master identity registry: PFR only, exact matches. Ambiguous/null excluded.
 master=nfl.load_players().select(["pfr_id","gsis_id"]).drop_nulls().unique().to_dicts()
 idx={}
 for x in master:idx.setdefault(x["pfr_id"],set()).add(x["gsis_id"])
 rows=df.to_dicts()
 accepted=[];issues=[]
 for x in rows:
  pfr=x["pfr_player_id"];gs=idx.get(pfr,set())
  if x["game_id"] not in games or len(gs)!=1:
   issues.append({"game_id":x.get("game_id"),"pfr":pfr,"reason":"missing_game_or_player_identity"});continue
  for col in ("offense_snaps","defense_snaps","st_snaps"):
   v=x.get(col)
   if v is not None and (not float(v).is_integer() or v<0):
    issues.append({"game_id":x["game_id"],"pfr":pfr,"reason":"invalid_snap_count"});break
  else:accepted.append((x,next(iter(gs))))
 print(json.dumps({"season":y,"source_rows":len(rows),"identity_candidates":len(accepted),"quarantined":len(issues),"examples":issues[:3]}),flush=True)
 # Keep unmatched PFR records out of dependent predictions.
 gsis=sorted({gs for _,gs in accepted});players={}
 for i in range(0,len(gsis),100):
  response=db.table("players").select("player_id,gsis_id").in_("gsis_id",gsis[i:i+100]).execute()
  players.update({x["gsis_id"]:x["player_id"] for x in response.data})
 usable=[];missing_master=0
 for x,gs in accepted:
  if gs not in players:
   missing_master+=1
   continue
  usable.append({"game_id":x["game_id"],"player_id":players[gs],"team_id":x["team"],"offense_snaps":int(x["offense_snaps"]) if x.get("offense_snaps") is not None else None,"defense_snaps":int(x["defense_snaps"]) if x.get("defense_snaps") is not None else None,"special_snaps":int(x["st_snaps"]) if x.get("st_snaps") is not None else None})
 if missing_master:
  print(json.dumps({"season":y,"excluded_missing_master_rows":missing_master,"action":"quarantined_no_guess"}),flush=True)
 if missing_master / max(len(rows),1) > 0.005:
  raise RuntimeError("Missing master IDs exceed 0.5% fail-closed bound")
 if len(usable)<5000:raise RuntimeError("Unexpectedly low validated coverage; no writes")
 for i in range(0,len(usable),250):
  chunk=usable[i:i+250]
  digest=hashlib.sha256(json.dumps(chunk,sort_keys=True,separators=(",",":")).encode()).hexdigest()
  snap=db.table("raw_snapshots").upsert({"source_id":sid,"record_type":"snap_counts_normalized_batch","observed_at":datetime.datetime.now(datetime.timezone.utc).isoformat(),"payload":{"year":y,"row_count":len(chunk),"hash_note":"normalized batch; not original source release hash"},"content_sha256":digest,"quality_status":"provisional"},on_conflict="source_id,record_type,content_sha256").execute()
  snapshot_id=db.table("raw_snapshots").select("snapshot_id").eq("source_id",sid).eq("record_type","snap_counts_normalized_batch").eq("content_sha256",digest).single().execute().data["snapshot_id"]
  for r in chunk:r["source_snapshot_id"]=snapshot_id
  db.table("player_game_snaps").upsert(chunk,on_conflict="game_id,player_id,source_snapshot_id").execute()
 print(json.dumps({"season":y,"accepted":len(usable),"quarantined":len(issues),"status":"IMPORTED_PROVISIONAL"}),flush=True)
if __name__=="__main__":main()
