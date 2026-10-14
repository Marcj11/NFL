import os,json,hashlib
import nflreadpy as nfl
from supabase import create_client
url=os.environ["NFL_COMPACT_SUPABASE_URL"]
assert url.rstrip("/")=="https://jwetwyqlogowznkidnly.supabase.co"
db=create_client(url,os.environ["NFL_COMPACT_SUPABASE_SERVICE_ROLE_KEY"])
src=db.table("source_registry").select("id,approved_for_ingestion").eq("source_name","nflverse").single().execute().data
assert src["approved_for_ingestion"]
df=nfl.load_schedules([2023,2024,2025,2026])
print(json.dumps({"columns":df.columns,"rows":df.height}),flush=True)
assert {"game_id","home_score","away_score","roof","surface","temp","wind"}<=set(df.columns)
ids={x["game_id"] for x in db.table("games").select("game_id").limit(2000).execute().data}
def integer(v):
 if v is None:return None
 try:
  if not float(v).is_integer():return None
  return int(v)
 except (TypeError,ValueError):return None
rows=[]
for x in df.to_dicts():
 if x["game_id"] not in ids:continue
 a=integer(x["home_score"]);b=integer(x["away_score"])
 if a is None or b is None:continue
 rows.append({"game_id":x["game_id"],"home_score":a,"away_score":b,"roof":x["roof"],"surface":x["surface"],"temperature_f":integer(x["temp"]),"wind_mph":integer(x["wind"]),"result_status":"retrospective_unverified"})
if len(rows)<700:raise RuntimeError("Insufficient confirmed game results")
digest=hashlib.sha256(json.dumps(sorted(rows,key=lambda a:a["game_id"]),sort_keys=True).encode()).hexdigest()
rid=db.table("source_releases").insert({"source_id":src["id"],"dataset":"retrospective_game_results_weather","normalized_sha256":digest,"row_count":len(rows),"status":"provisional"}).execute().data[0]["release_id"]
for i in range(0,len(rows),150):
 chunk=rows[i:i+150]
 for x in chunk:x["source_release_id"]=rid
 db.table("game_results").upsert(chunk,on_conflict="game_id").execute()
print(json.dumps({"rows_imported":len(rows),"status":"RETROSPECTIVE_ONLY","source_release_hash_verified":False}),flush=True)
