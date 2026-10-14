import json
from pathlib import Path
import nflreadpy as nfl
import polars as pl
from datetime import datetime,timezone
from zoneinfo import ZoneInfo
years=[2023,2024,2025,2026]
df=nfl.load_schedules()
out={"generated_at":datetime.now(timezone.utc).isoformat(),"source":"nflverse via nflreadpy load_schedules","seasons":{},"teams":{}}
for year in years:
 subset=df.filter(pl.col("season")==year)
 rows=[];errors=[]
 for r in subset.to_dicts():
  teamh=r.get("home_team");teama=r.get("away_team")
  start=r.get("start_time")
  if not r.get("game_id") or not teamh or not teama or not r.get("gameday") or not r.get("gametime"):
   errors.append(str(r.get("game_id")));continue
  try:
   # Official NFL game-time fields use Eastern local time; DST handled by zoneinfo.
   local=datetime.fromisoformat(f'{r["gameday"]}T{r["gametime"]}')
   timestamp=local.replace(tzinfo=ZoneInfo("America/New_York")).astimezone(timezone.utc).isoformat()
  except Exception as ex:
   errors.append(str(r.get("game_id"))+":bad_gameday_gametime:"+str(ex)[:80]);continue
  for team in (teamh,teama):out["teams"][team]=team
  rows.append({"game_id":str(r["game_id"]),"season":year,"week":int(r["week"]) if r.get("week") is not None else None,"kickoff_utc":timestamp,"home_team_id":teamh,"away_team_id":teama,"status":"completed" if r.get("home_score") is not None and r.get("away_score") is not None else "scheduled"})
 out["seasons"][str(year)]={"count":len(rows),"errors":errors,"games":rows}
p=Path("diagnostics/nflverse-schedule-staging.json");p.parent.mkdir(exist_ok=True,parents=True);p.write_text(json.dumps(out,ensure_ascii=False,separators=(",",":"),default=str))
print(json.dumps({"teams":len(out["teams"]),"seasons":{y:{"games":v["count"],"errors":v["errors"][:5]} for y,v in out["seasons"].items()}}))
