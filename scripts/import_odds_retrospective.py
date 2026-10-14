import os,json,hashlib,math
import nflreadpy as nfl
from supabase import create_client
assert os.environ["NFL_COMPACT_SUPABASE_URL"].rstrip("/")=="https://jwetwyqlogowznkidnly.supabase.co"
db=create_client(os.environ["NFL_COMPACT_SUPABASE_URL"],os.environ["NFL_COMPACT_SUPABASE_SERVICE_ROLE_KEY"])
src=db.table("source_registry").select("id,approved_for_ingestion").eq("source_name","nflverse").single().execute().data
assert src["approved_for_ingestion"]
df=nfl.load_schedules([2023,2024,2025,2026])
need={"game_id","home_moneyline","away_moneyline","home_spread_odds","away_spread_odds","spread_line","total_line","over_odds","under_odds"}
assert need<=set(df.columns)
games={x["game_id"] for x in db.table("games").select("game_id").limit(2000).execute().data}
rows=[]
def num(v):
 if v is None:return None
 try:
  k=float(v);return k if math.isfinite(k) else None
 except (TypeError,ValueError):return None
for x in df.to_dicts():
 if x["game_id"] not in games:continue
 for market,selection,column,line in [
  ("moneyline","home","home_moneyline",None),("moneyline","away","away_moneyline",None),
  ("spread","home","home_spread_odds","spread_line"),("spread","away","away_spread_odds","spread_line"),
  ("total","over","over_odds","total_line"),("total","under","under_odds","total_line")]:
  odds=num(x.get(column))
  if odds is None:continue
  if not odds.is_integer():raise RuntimeError("Non-integral American odds")
  rows.append({"game_id":x["game_id"],"market":market,"selection":selection,"american_odds":int(odds),"point_line":num(x.get(line)) if line else None})
if len(rows)<1000:raise RuntimeError("Insufficient historical odds")
digest=hashlib.sha256(json.dumps(sorted(rows,key=lambda x:(x["game_id"],x["market"],x["selection"])),sort_keys=True).encode()).hexdigest()
rid=db.table("source_releases").insert({"source_id":src["id"],"dataset":"retrospective_undated_odds","normalized_sha256":digest,"row_count":len(rows),"status":"provisional"}).execute().data[0]["release_id"]
for i in range(0,len(rows),200):
 chunk=rows[i:i+200]
 for x in chunk:x["source_release_id"]=rid
 db.table("odds_retrospective").upsert(chunk,on_conflict="game_id,market,selection").execute()
print(json.dumps({"imported":len(rows),"pregame_eligible":False,"status":"PROVISIONAL_RETROSPECTIVE"}))
