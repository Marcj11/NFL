"""Safely collect ESPN NFL boxscores for review. Dry run unless --commit is explicit.
The canonical player_game_stats table is only changed for uniquely matched players,
only for completed games, only when ESPN source_registry approval is present.
"""
import argparse, json, os, urllib.request
from collections import defaultdict
from supabase import create_client
from espn_boxscore_mapper import map_boxscore, norm_team

p=argparse.ArgumentParser()
p.add_argument("--season",type=int,required=True)
p.add_argument("--week",type=int,required=True)
p.add_argument("--commit",action="store_true")
a=p.parse_args()
if not (2023<=a.season<=2030 and 1<=a.week<=18):raise SystemExit("invalid season or week")
base=os.environ["NFL_COMPACT_SUPABASE_URL"].rstrip("/")
if base!="https://jwetwyqlogowznkidnly.supabase.co":raise SystemExit("wrong project")
db=create_client(base,os.environ["NFL_COMPACT_SUPABASE_SERVICE_ROLE_KEY"])
source=db.table("source_registry").select("id,approved_for_ingestion").eq("source_name","espn").execute().data
if a.commit and (len(source)!=1 or not source[0]["approved_for_ingestion"]):
 raise SystemExit("ESPN not approved; no write permitted")
def get(endpoint):
 req=urllib.request.Request(endpoint,headers={"User-Agent":"NFL-Studio-Audit/1.0"})
 with urllib.request.urlopen(req,timeout=15) as response:return json.load(response)
board=get(f"https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard?dates={a.season}&seasontype=2&week={a.week}&limit=50")
games=db.table("games").select("game_id,away_team_id,home_team_id").eq("season",a.season).eq("week",a.week).execute().data
game_map={(g["away_team_id"],g["home_team_id"]):g["game_id"] for g in games}
players=[]
for offset in range(0,100000,1000):
 batch=db.table("players").select("player_id,display_name").order("player_id").range(offset,offset+999).execute().data
 players.extend(batch)
 if len(batch)<1000:break
else:raise SystemExit("player directory pagination limit reached")
names=defaultdict(list)
for x in players:names[x["display_name"].strip().casefold()].append(x["player_id"])
# Use only verified ESPN athlete IDs mapped to canonical GSIS IDs.
crosswalk=[]
for offset in range(0,100000,1000):
 batch=db.table("nfl_studio_espn_player_crosswalk").select("espn_athlete_id,gsis_id,verified_at").not_.is_("verified_at","null").order("espn_athlete_id").range(offset,offset+999).execute().data
 crosswalk.extend(batch)
 if len(batch)<1000:break
gsis_to_uuid={}
for offset in range(0,100000,1000):
 batch=db.table("players").select("player_id,gsis_id").order("player_id").range(offset,offset+999).execute().data
 gsis_to_uuid.update({x["gsis_id"]:x["player_id"] for x in batch if x.get("gsis_id")})
 if len(batch)<1000:break
verified_espn_ids={r["espn_athlete_id"]:gsis_to_uuid[r["gsis_id"]] for r in crosswalk if r["gsis_id"] in gsis_to_uuid}
if a.commit and not verified_espn_ids:raise SystemExit("No verified ESPN crosswalk: writes blocked")
rows={};rejected=defaultdict(int);completed=[]
for event in board.get("events",[]):
 comp=(event.get("competitions") or [{}])[0]
 sides={x.get("homeAway"):norm_team(x.get("team",{}).get("abbreviation","")) for x in comp.get("competitors",[])}
 gid=game_map.get((sides.get("away"),sides.get("home")))
 if not gid:rejected["unknown_game"]+=1;continue
 if event.get("status",{}).get("type",{}).get("completed") is not True:
  rejected["unfinished"]+=1;continue
 summary=get("https://site.api.espn.com/apis/site/v2/sports/football/nfl/summary?event="+str(event["id"]))
 mapped,issues=map_boxscore(summary,gid,set(sides.values()),names,verified_espn_ids=verified_espn_ids,strict_identity=True)
 for reason,_ in issues:rejected[reason]+=1
 for row in mapped:
  k=(gid,row["player_id"])
  if k in rows:raise SystemExit("duplicate player-game")
  rows[k]=row
 completed.append(gid)
print(json.dumps({"season":a.season,"week":a.week,"games_completed":len(completed),"player_games":len(rows),"rejected":dict(rejected),"dry_run":not a.commit}))
if not a.commit:raise SystemExit(0)
if not rows:raise SystemExit("no rows to import")
existing=set()
for gid in completed:
 for x in db.table("player_game_stats").select("player_id").eq("game_id",gid).limit(2000).execute().data:
  existing.add((gid,x["player_id"]))
new=[r for k,r in rows.items() if k not in existing]
if not new:raise SystemExit("all player-games already present")
import hashlib
digest=hashlib.sha256(json.dumps(new,sort_keys=True).encode()).hexdigest()
release=db.table("source_releases").insert({"source_id":source[0]["id"],"dataset":"espn_nfl_boxscore","season":a.season,"normalized_sha256":digest,"status":"provisional","row_count":len(new)}).execute().data[0]["release_id"]
for i in range(0,len(new),100):
 db.table("player_game_stats").insert([dict(x,release_id=release) for x in new[i:i+100]]).execute()
print(json.dumps({"inserted":len(new),"release_id":release}))
