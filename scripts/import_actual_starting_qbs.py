import os,json,hashlib
import nflreadpy as nfl
from supabase import create_client
assert os.environ["NFL_COMPACT_SUPABASE_URL"].rstrip("/")=="https://jwetwyqlogowznkidnly.supabase.co"
db=create_client(os.environ["NFL_COMPACT_SUPABASE_URL"],os.environ["NFL_COMPACT_SUPABASE_SERVICE_ROLE_KEY"])
src=db.table("source_registry").select("id,approved_for_ingestion").eq("source_name","nflverse").single().execute().data
assert src["approved_for_ingestion"]
d=nfl.load_schedules([2023,2024,2025,2026])
ids={x["game_id"] for x in db.table("game_results").select("game_id").limit(1500).execute().data}
assert {"home_qb_id","away_qb_id","home_qb_name","away_qb_name"}<=set(d.columns)
rows=[]
for g in d.to_dicts():
 if g["game_id"] not in ids:continue
 for side in ("home","away"):
  if not g.get(side+"_qb_id") and not g.get(side+"_qb_name"):continue
  rows.append({"game_id":g["game_id"],"side":side,"team_id":g[side+"_team"],"qb_gsis_id":g.get(side+"_qb_id"),"qb_name":g.get(side+"_qb_name")})
assert len(rows)>=1500
digest=hashlib.sha256(json.dumps(sorted(rows,key=lambda x:(x["game_id"],x["side"])),sort_keys=True).encode()).hexdigest()
rid=db.table("source_releases").insert({"source_id":src["id"],"dataset":"actual_starting_quarterbacks","normalized_sha256":digest,"row_count":len(rows),"status":"provisional"}).execute().data[0]["release_id"]
for i in range(0,len(rows),150):
 chunk=rows[i:i+150]
 for item in chunk:item["source_release_id"]=rid
 db.table("game_starting_quarterbacks").upsert(chunk,on_conflict="game_id,side").execute()
print(json.dumps({"quarterback_game_sides":len(rows),"games":len(set(x["game_id"] for x in rows)),"pregame_eligible":False,"status":"IMPORTED_PROVISIONAL"}),flush=True)
