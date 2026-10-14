import os,json,hashlib,math,datetime
import nflreadpy as nfl
from supabase import create_client
y=int(os.environ["NFL_SEASON"])
assert y in (2023,2024,2025,2026)
assert os.environ["NFL_COMPACT_SUPABASE_URL"].rstrip("/")=="https://jwetwyqlogowznkidnly.supabase.co"
db=create_client(os.environ["NFL_COMPACT_SUPABASE_URL"],os.environ["NFL_COMPACT_SUPABASE_SERVICE_ROLE_KEY"])
src=db.table("source_registry").select("id,approved_for_ingestion").eq("source_name","nflverse").single().execute().data
assert src["approved_for_ingestion"]
data=nfl.load_ftn_charting([y]);needed={"nflverse_game_id","nflverse_play_id","season","week"}
assert needed<=set(data.columns)
games={x["game_id"] for x in db.table("games").select("game_id").eq("season",y).limit(400).execute().data}
def normalize(v):
 if isinstance(v,float) and not math.isfinite(v):return None
 if isinstance(v,(datetime.datetime,datetime.date)):return v.isoformat()
 return v
rows=[];excluded=0;seen=set()
for r in data.to_dicts():
 gid=r["nflverse_game_id"];pid=r["nflverse_play_id"]
 if gid not in games or pid is None:
  excluded+=1;continue
 key=(gid,int(pid))
 if key in seen:raise RuntimeError("Duplicate FTN key")
 seen.add(key)
 metrics={k:normalize(v) for k,v in r.items() if k not in ("nflverse_game_id","nflverse_play_id","season","week") and v is not None}
 rows.append({"game_id":gid,"play_id":int(pid),"season":y,"week":int(r["week"]),"metrics":metrics})
if len(rows)<10000 or excluded/max(data.height,1)>.01:raise RuntimeError(f"Coverage failure season {y} {len(rows)} excluded {excluded}")
digest=hashlib.sha256(json.dumps(sorted(rows,key=lambda x:(x["game_id"],x["play_id"])),sort_keys=True,allow_nan=False).encode()).hexdigest()
rid=db.table("source_releases").insert({"source_id":src["id"],"dataset":"ftn_charting","season":y,"normalized_sha256":digest,"row_count":len(rows),"status":"provisional"}).execute().data[0]["release_id"]
for i in range(0,len(rows),200):
 chunk=rows[i:i+200]
 for x in chunk:x["source_release_id"]=rid
 db.table("play_charting_ftn").upsert(chunk,on_conflict="game_id,play_id").execute()
print(json.dumps({"season":y,"source_rows":data.height,"accepted":len(rows),"excluded":excluded,"status":"IMPORTED_PROVISIONAL"}),flush=True)
