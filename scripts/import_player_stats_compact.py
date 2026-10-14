import os,json,math,hashlib,datetime
import nflreadpy as nfl
from supabase import create_client

year=int(os.environ.get("NFL_STATS_SEASON","2024"))
if year not in (2023,2024,2025,2026):raise SystemExit("Unsupported season")
db=create_client(os.environ["SUPABASE_URL"],os.environ["SUPABASE_SERVICE_ROLE_KEY"])
registry=db.table("source_registry").select("id,approved_for_ingestion").eq("source_name","nflverse").execute().data
if len(registry)!=1 or not registry[0]["approved_for_ingestion"]:raise SystemExit("Dataset not authorized")
games=db.table("games").select("game_id,week,home_team_id,away_team_id").eq("season",year).limit(500).execute().data
game_lookup={}
for g in games:
 for team in [g["home_team_id"],g["away_team_id"]]:
  game_lookup.setdefault((g["week"],team),[]).append(g["game_id"])
df=nfl.load_player_stats([year])
rows=df.to_dicts()
identities=sorted({r["player_id"] for r in rows if r.get("player_id")})
master={}
for i in range(0,len(identities),100):
 for p in db.table("players").select("player_id,gsis_id").in_("gsis_id",identities[i:i+100]).execute().data:
  master[p["gsis_id"]]=p["player_id"]
names=[c for c in df.columns if c not in ("player_id","player_name","player_display_name","position","position_group","recent_team","team","season","week","season_type","completions_percentage") and any(c.startswith(p) for p in ("passing_","rushing_","receiving_","targets","receptions","carries","sacks_","def_","fantasy_"))]
compiled={};excluded=0
for r in rows:
 team=r.get("recent_team") or r.get("team")
 m=game_lookup.get((int(r["week"]),team),[])
 pid=master.get(r["player_id"])
 if pid is None or len(m)!=1:
  excluded+=1;continue
 key=(m[0],pid)
 if key in compiled:raise RuntimeError(f"Duplicate player-game in source {key}")
 metrics={n:r[n] for n in names if isinstance(r.get(n),(int,float)) and math.isfinite(r[n])}
 compiled[key]={"game_id":m[0],"player_id":pid,"team_id":team,"stats":metrics}
if len(compiled)<500:raise RuntimeError("Unexpectedly few player-game records, stopping")
# Digest of normalized canonical content; NOT SHA256 of original upstream release bytes.
canonical=[compiled[k] for k in sorted(compiled)]
digest=hashlib.sha256(json.dumps(canonical,sort_keys=True,separators=(",",":"),allow_nan=False).encode()).hexdigest()
db.table("raw_snapshots").upsert({"source_id":registry[0]["id"],"record_type":"player_stats_compact_normalized_season","observed_at":datetime.datetime.now(datetime.timezone.utc).isoformat(),"content_sha256":digest,"payload":{"season":year,"player_games":len(canonical),"source_release_sha256_verified":False},"quality_status":"provisional"},on_conflict="source_id,record_type,content_sha256").execute()
snaps=db.table("raw_snapshots").select("snapshot_id").eq("source_id",registry[0]["id"]).eq("record_type","player_stats_compact_normalized_season").eq("content_sha256",digest).execute().data
if len(snaps)!=1:raise RuntimeError("Snapshot lookup failed")
for i in range(0,len(canonical),100):
 batch=canonical[i:i+100]
 for b in batch:b["source_snapshot_ids"]=[snaps[0]["snapshot_id"]]
 db.table("player_game_stats_compact").upsert(batch,on_conflict="game_id,player_id").execute()
 if i%1000==0:print(json.dumps({"season":year,"written_player_games":i+len(batch)}),flush=True)
print(json.dumps({"season":year,"source_rows":len(rows),"excluded":excluded,"player_games":len(canonical),"metrics":sum(len(x["stats"]) for x in canonical),"status":"IMPORTED_PROVISIONAL"}),flush=True)
