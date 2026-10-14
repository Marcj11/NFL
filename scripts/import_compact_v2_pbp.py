import os,json,hashlib,math
import nflreadpy as nfl
from supabase import create_client
y=int(os.environ["NFL_SEASON"]);assert y in (2023,2024,2025,2026)
assert os.environ["NFL_COMPACT_SUPABASE_URL"].rstrip("/")=="https://jwetwyqlogowznkidnly.supabase.co"
db=create_client(os.environ["NFL_COMPACT_SUPABASE_URL"],os.environ["NFL_COMPACT_SUPABASE_SERVICE_ROLE_KEY"])
source=db.table("source_registry").select("id,approved_for_ingestion").eq("source_name","nflverse").single().execute().data
assert source["approved_for_ingestion"]
df=nfl.load_pbp([y]);games={x["game_id"] for x in db.table("games").select("game_id").eq("season",y).limit(400).execute().data}
needed={"game_id","play_id","qtr","game_seconds_remaining","posteam","defteam","down","ydstogo","epa","play_type"}
assert needed<=set(df.columns)
rows=[];missing=0
def integer(v):
 if v is None:return None
 if not math.isfinite(float(v)) or not float(v).is_integer():return None
 return int(v)
def number(v):
 if v is None:return None
 v=float(v)
 return v if math.isfinite(v) else None
for x in df.to_dicts():
 if x["game_id"] not in games or x["play_id"] is None:
  missing+=1;continue
 rows.append({"game_id":x["game_id"],"play_id":integer(x["play_id"]),"quarter":integer(x["qtr"]),"seconds_remaining":integer(x["game_seconds_remaining"]),"offense_team":x["posteam"],"defense_team":x["defteam"],"down":integer(x["down"]),"ydstogo":integer(x["ydstogo"]),"yards_gained":integer(x.get("yards_gained")),"expected_points":number(x.get("ep")),"epa":number(x["epa"]),"success":bool(x["success"]) if x.get("success") is not None and number(x["success"]) is not None else None,"play_type":x["play_type"]})
if missing or len(rows)<10000 or len({(x["game_id"],x["play_id"]) for x in rows})!=len(rows):raise RuntimeError(f"PBP integrity failure {y}: missing={missing} rows={len(rows)}")
digest=hashlib.sha256(json.dumps(rows,sort_keys=True,allow_nan=False).encode()).hexdigest()
rid=db.table("source_releases").insert({"source_id":source["id"],"dataset":"pbp","season":y,"normalized_sha256":digest,"status":"provisional","row_count":len(rows)}).execute().data[0]["release_id"]
for i in range(0,len(rows),200):
 chunk=rows[i:i+200]
 for x in chunk:x["release_id"]=rid
 db.table("game_plays").upsert(chunk,on_conflict="game_id,play_id").execute()
 if i%4000==0:print(json.dumps({"season":y,"pbp_progress":i+len(chunk)}),flush=True)
print(json.dumps({"season":y,"accepted":len(rows),"status":"IMPORTED_PROVISIONAL"}))
