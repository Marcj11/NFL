import os,json,hashlib
import nflreadpy as nfl
from supabase import create_client
url=os.environ["NFL_COMPACT_SUPABASE_URL"]
assert url.rstrip("/")=="https://jwetwyqlogowznkidnly.supabase.co"
db=create_client(url,os.environ["NFL_COMPACT_SUPABASE_SERVICE_ROLE_KEY"])
df=nfl.load_schedules([2023,2024,2025,2026])
required={"season","home_team","away_team","home_coach","away_coach"}
assert required<=set(df.columns)
rows={}
for r in df.to_dicts():
 for side in ("home","away"):
  name=r.get(side+"_coach")
  if not name:continue
  key=(int(r["season"]),r[side+"_team"],str(name),"head_coach")
  rows[key]={"season":key[0],"team_id":key[1],"coach_name":key[2],"role":key[3]}
data=list(rows.values())
src=db.table("source_registry").select("id,approved_for_ingestion").eq("source_name","nflverse").single().execute().data
assert src["approved_for_ingestion"]
if len(data)<100:raise RuntimeError("Unexpected number of head-coach records")
digest=hashlib.sha256(json.dumps(sorted(data,key=lambda x:(x["season"],x["team_id"],x["coach_name"])),sort_keys=True).encode()).hexdigest()
rid=db.table("source_releases").insert({"source_id":src["id"],"dataset":"retrospective_head_coaches","normalized_sha256":digest,"status":"provisional","row_count":len(data)}).execute().data[0]["release_id"]
for r in data:r["source_release_id"]=rid
for i in range(0,len(data),100):db.table("coaching_assignments").upsert(data[i:i+100],on_conflict="season,team_id,role,coach_name").execute()
print(json.dumps({"accepted_head_coach_team_season_rows":len(data),"status":"IMPORTED_PROVISIONAL","coordinators_included":False}),flush=True)
