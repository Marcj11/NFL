import os,json
import nflreadpy as nfl
from supabase import create_client
season=int(os.environ["NFL_SEASON"])
assert season in (2023,2024,2025,2026)
url=os.environ["NFL_COMPACT_SUPABASE_URL"]
assert url.rstrip("/").endswith("jwetwyqlogowznkidnly.supabase.co")
db=create_client(url,os.environ["NFL_COMPACT_SUPABASE_SERVICE_ROLE_KEY"])
df=nfl.load_rosters_weekly(season)
print(json.dumps({"season":season,"columns":df.columns,"rows":df.height}),flush=True)
required={"season","week","team","gsis_id"}
if not required.issubset(df.columns):
 raise RuntimeError("Unexpected roster schema")
ids=set(str(x) for x in df["gsis_id"].drop_nulls().unique().to_list())
lookup={}
for chunk_start in range(0,len(ids),100):
 batch=sorted(ids)[chunk_start:chunk_start+100]
 for p in db.table("players").select("gsis_id,player_id").in_("gsis_id",batch).execute().data:
  lookup[p["gsis_id"]]=p["player_id"]
valid=[];excluded=0
for row in df.to_dicts():
 player=lookup.get(row.get("gsis_id"))
 if player is None:
  excluded+=1
  continue
 valid.append({"season":season,"week":int(row["week"]),"player_id":player,"team_id":row["team"],"position":row.get("position"),"roster_status":row.get("status")})
if len(valid)<5000 or excluded/max(df.height,1)>.05:
 raise RuntimeError("Roster identity coverage failed")
for i in range(0,len(valid),200):
 db.table("player_week_rosters_compact").upsert(valid[i:i+200],on_conflict="season,week,player_id,team_id").execute()
print(json.dumps({"season":season,"accepted":len(valid),"excluded":excluded,"status":"IMPORTED_PROVISIONAL"}),flush=True)
