import os,json,hashlib
import nflreadpy as nfl
from supabase import create_client
assert os.environ["NFL_COMPACT_SUPABASE_URL"].rstrip("/")=="https://jwetwyqlogowznkidnly.supabase.co"
db=create_client(os.environ["NFL_COMPACT_SUPABASE_URL"],os.environ["NFL_COMPACT_SUPABASE_SERVICE_ROLE_KEY"])
src=db.table("source_registry").select("id,approved_for_ingestion").eq("source_name","nflverse").single().execute().data
assert src["approved_for_ingestion"]
d=nfl.load_officials([2023,2024,2025,2026])
print(json.dumps({"source_rows":d.height,"columns":d.columns}),flush=True)
assert {"game_id","official_name","position"}<=set(d.columns)
games={x["game_id"] for x in db.table("games").select("game_id").limit(1500).execute().data}
rows={}
for x in d.to_dicts():
 if x.get("game_id") not in games or not x.get("official_name") or not x.get("position"):continue
 def num(v):
  if v is None:return None
  try:return int(v) if float(v).is_integer() else None
  except (ValueError,TypeError):return None
 r={"game_id":x["game_id"],"official_name":x["official_name"],"official_role":x["position"],"official_id":str(x["official_id"]) if x.get("official_id") is not None else None,"jersey_number":num(x.get("jersey_number"))}
 rows[(r["game_id"],r["official_name"],r["official_role"])]=r
data=list(rows.values())
if len(data)<5000:raise RuntimeError("Low officials coverage")
digest=hashlib.sha256(json.dumps(sorted(data,key=lambda x:(x["game_id"],x["official_name"],x["official_role"])),sort_keys=True).encode()).hexdigest()
rid=db.table("source_releases").insert({"source_id":src["id"],"dataset":"game_officials","normalized_sha256":digest,"row_count":len(data),"status":"provisional"}).execute().data[0]["release_id"]
for i in range(0,len(data),200):
 batch=data[i:i+200]
 for r in batch:r["source_release_id"]=rid
 db.table("game_official_assignments").upsert(batch,on_conflict="game_id,official_name,official_role").execute()
print(json.dumps({"accepted":len(data),"games":len(set(x["game_id"] for x in data)),"status":"IMPORTED_PROVISIONAL"}),flush=True)
