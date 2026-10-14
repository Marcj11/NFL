import os,json,hashlib,datetime
import nflreadpy as nfl
from supabase import create_client
year=int(os.environ["NFL_SEASON"])
assert year in (2023,2024,2025,2026)
assert os.environ["NFL_COMPACT_SUPABASE_URL"].rstrip("/")=="https://jwetwyqlogowznkidnly.supabase.co"
db=create_client(os.environ["NFL_COMPACT_SUPABASE_URL"],os.environ["NFL_COMPACT_SUPABASE_SERVICE_ROLE_KEY"])
source=db.table("source_registry").select("id,approved_for_ingestion").eq("source_name","nflverse").single().execute().data
assert source["approved_for_ingestion"]
d=nfl.load_injuries([year])
needed={"gsis_id","season","week","team","report_status","practice_status"}
assert needed<=set(d.columns)
identifiers=sorted({str(x) for x in d["gsis_id"].drop_nulls().to_list()})
lookup={}
for i in range(0,len(identifiers),100):
 for p in db.table("players").select("gsis_id,player_id").in_("gsis_id",identifiers[i:i+100]).execute().data:
  lookup[p["gsis_id"]]=p["player_id"]
items={};excluded=0;repeated=0
for x in d.to_dicts():
 pid=lookup.get(x.get("gsis_id"))
 if pid is None:excluded+=1;continue
 key=(year,int(x["week"]),pid)
 def clean(v):
  return None if v is None else str(v)
 entry={"season":year,"week":int(x["week"]),"player_id":pid,"team_id":x["team"],"injury_status":clean(x.get("report_status") or x.get("practice_status")),"injury_description":clean(x.get("report_primary_injury") or x.get("practice_primary_injury")),"provenance_note":"Retrospective only. Source row publication timestamp not independently verified. NOT pregame eligible."}
 if key in items:
  repeated+=1
  # Prefer populated report status, but never infer a timestamp or availability.
  if entry["injury_status"] is not None and items[key]["injury_status"] is None:items[key]=entry
 else:items[key]=entry
rows=list(items.values())
if not rows or excluded/max(d.height,1)>.10:raise RuntimeError("Injury identity coverage failed")
digest=hashlib.sha256(json.dumps(sorted(rows,key=lambda x:(x["week"],x["player_id"])),sort_keys=True).encode()).hexdigest()
rid=db.table("source_releases").insert({"source_id":source["id"],"dataset":"injuries_retrospective","season":year,"normalized_sha256":digest,"row_count":len(rows),"status":"provisional"}).execute().data[0]["release_id"]
for i in range(0,len(rows),200):
 chunk=rows[i:i+200]
 for x in chunk:x["source_release_id"]=rid
 db.table("injury_history_retrospective").upsert(chunk,on_conflict="season,week,player_id").execute()
print(json.dumps({"season":year,"source_rows":d.height,"imported_player_weeks":len(rows),"excluded_unmatched":excluded,"merged_same_player_week":repeated,"pregame_eligible":False,"status":"IMPORTED_PROVISIONAL"}),flush=True)
