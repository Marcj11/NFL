import os,json,hashlib
import nflreadpy as nfl
from supabase import create_client
y=int(os.environ["NFL_SEASON"])
assert y in (2023,2024,2025,2026)
assert os.environ["NFL_COMPACT_SUPABASE_URL"].rstrip("/")=="https://jwetwyqlogowznkidnly.supabase.co"
db=create_client(os.environ["NFL_COMPACT_SUPABASE_URL"],os.environ["NFL_COMPACT_SUPABASE_SERVICE_ROLE_KEY"])
source=db.table("source_registry").select("id,approved_for_ingestion").eq("source_name","nflverse").single().execute().data
assert source["approved_for_ingestion"]
df=nfl.load_snap_counts(y); columns=set(df.columns)
assert {"game_id","pfr_player_id","team","offense_snaps","defense_snaps","st_snaps"}<=columns
games={g["game_id"] for g in db.table("games").select("game_id").eq("season",y).limit(400).execute().data}
idx={}
for p in nfl.load_players().select(["pfr_id","gsis_id"]).drop_nulls().unique().to_dicts():
 idx.setdefault(p["pfr_id"],set()).add(p["gsis_id"])
players={}
for pfr,gsids in idx.items():
 if len(gsids)==1:players[pfr]=next(iter(gsids))
gsis_ids=list(set(players.values()));ids={}
for i in range(0,len(gsis_ids),100):
 for p in db.table("players").select("player_id,gsis_id").in_("gsis_id",gsis_ids[i:i+100]).execute().data:ids[p["gsis_id"]]=p["player_id"]
valid=[];excluded=0
for x in df.to_dicts():
 gs=players.get(x["pfr_player_id"])
 if x["game_id"] not in games or gs not in ids:
  excluded+=1;continue
 snapcols=("offense_snaps","defense_snaps","st_snaps")
 if any(x.get(k) is not None and (float(x[k])<0 or not float(x[k]).is_integer()) for k in snapcols):
  excluded+=1;continue
 valid.append({"game_id":x["game_id"],"player_id":ids[gs],"team_id":x["team"],"offense":int(x["offense_snaps"]) if x.get("offense_snaps") is not None else None,"defense":int(x["defense_snaps"]) if x.get("defense_snaps") is not None else None,"special_teams":int(x["st_snaps"]) if x.get("st_snaps") is not None else None})
if len(valid)<5000 or excluded/max(df.height,1)>0.01:raise RuntimeError(f"Coverage check failed {y} {len(valid)} {excluded}")
digest=hashlib.sha256(json.dumps(sorted(valid,key=lambda z:(z["game_id"],z["player_id"])),sort_keys=True).encode()).hexdigest()
r=db.table("source_releases").insert({"source_id":source["id"],"dataset":"snaps","season":y,"normalized_sha256":digest,"status":"provisional","row_count":len(valid)}).execute().data
rid=r[0]["release_id"]
for i in range(0,len(valid),200):
 chunk=valid[i:i+200]
 for v in chunk:v["release_id"]=rid
 db.table("player_game_snaps").upsert(chunk,on_conflict="game_id,player_id").execute()
print(json.dumps({"season":y,"accepted":len(valid),"excluded":excluded,"status":"IMPORTED_PROVISIONAL"}))
