raise SystemExit("STORAGE_QUOTA_PAUSE: Individual-stat imports paused pending compact schema and size verification. No database writes.")
import os,json,hashlib,datetime,math
import nflreadpy as nfl
from supabase import create_client

YEAR=int(os.environ.get("NFL_STATS_SEASON","2024"))
if YEAR not in (2023,2024,2025,2026):raise ValueError("Unapproved season")
db=create_client(os.environ["SUPABASE_URL"],os.environ["SUPABASE_SERVICE_ROLE_KEY"])
src=db.table("source_registry").select("id,approved_for_ingestion").eq("source_name","nflverse").execute().data
if len(src)!=1 or not src[0]["approved_for_ingestion"]:raise RuntimeError("Source not approved")
df=nfl.load_player_stats([YEAR])
needed={"player_id","season","week"}
if not needed.issubset(df.columns):raise RuntimeError("Unexpected stats schema: "+str(df.columns))
# NFL player stats are GSIS keyed. Join strictly to roster master and schedule.
games=db.table("games").select("game_id,week,home_team_id,away_team_id").eq("season",YEAR).limit(500).execute().data
byweek={}
for g in games:
 for team in (g["home_team_id"],g["away_team_id"]):
  byweek.setdefault((g["week"],team),[]).append(g["game_id"])
data=df.to_dicts()
ids=sorted({str(r["player_id"]) for r in data if r.get("player_id")})
pmap={}
for i in range(0,len(ids),100):
 for p in db.table("players").select("player_id,gsis_id").in_("gsis_id",ids[i:i+100]).execute().data:
  pmap[p["gsis_id"]]=p["player_id"]
metric_names=[c for c in df.columns if c not in {"player_id","player_name","player_display_name","position","position_group","recent_team","team","season","week","season_type","completions_percentage"} and any(c.startswith(prefix) for prefix in ("passing_","rushing_","receiving_","targets","receptions","carries","sacks_","def_","fantasy_"))]
valid=[];excluded=0
for r in data:
 gs=str(r.get("player_id"))
 team=r.get("recent_team") or r.get("team")
 match=byweek.get((int(r["week"]),team),[])
 if gs not in pmap or len(match)!=1:
  excluded+=1;continue
 for name in metric_names:
  value=r.get(name)
  if isinstance(value,(int,float)) and math.isfinite(value):
   valid.append({"game_id":match[0],"player_id":pmap[gs],"team_id":team,"stat_key":name,"stat_value":value})
if not valid:raise RuntimeError("No matchable player statistics")
print(json.dumps({"season":YEAR,"input_player_week_rows":len(data),"excluded_player_weeks":excluded,"metric_keys":len(metric_names),"metrics_prepared":len(valid)}),flush=True)
# A single snapshot per finite chunk; never declare source bytes proven.
for i in range(0,len(valid),250):
 chunk=valid[i:i+250]
 sha=hashlib.sha256(json.dumps(chunk,sort_keys=True,separators=(",",":"),allow_nan=False).encode()).hexdigest()
 db.table("raw_snapshots").upsert({"source_id":src[0]["id"],"record_type":"player_stats_normalized_batch","observed_at":datetime.datetime.now(datetime.timezone.utc).isoformat(),"payload":{"season":YEAR,"row_count":len(chunk),"source_hash_verified":False},"content_sha256":sha,"quality_status":"provisional"},on_conflict="source_id,record_type,content_sha256").execute()
 snaps=db.table("raw_snapshots").select("snapshot_id").eq("source_id",src[0]["id"]).eq("record_type","player_stats_normalized_batch").eq("content_sha256",sha).execute().data
 if len(snaps)!=1:raise RuntimeError("Snapshot uniqueness mismatch")
 for x in chunk:x["source_snapshot_id"]=snaps[0]["snapshot_id"]
 db.table("player_game_statistics").upsert(chunk,on_conflict="game_id,player_id,stat_key,source_snapshot_id").execute()
print(json.dumps({"season":YEAR,"persisted_candidate_stats":len(valid),"status":"IMPORTED_PROVISIONAL"}),flush=True)
