"""Prospective ESPN full-team injury snapshots. Run in GitHub Actions with service-role secrets."""
import os, json, datetime, urllib.request, time
from supabase import create_client
BASE="https://site.api.espn.com/apis/site/v2/sports/football/nfl/teams/"
def get(url):
    req=urllib.request.Request(url,headers={"User-Agent":"NFLStudio/1.0"})
    for attempt in range(3):
        try:
            with urllib.request.urlopen(req,timeout=15) as response: return json.load(response)
        except Exception:
            if attempt==2: raise
            time.sleep(2*(attempt+1))
def run():
    db=create_client(os.environ["NFL_SUPABASE_URL"],os.environ["NFL_SUPABASE_SERVICE_ROLE_KEY"])
    now=datetime.datetime.now(datetime.timezone.utc)
    end=(now+datetime.timedelta(days=10)).isoformat()
    games=db.table("games").select("game_id,kickoff_utc,home_team_id,away_team_id").gte("kickoff_utc",now.isoformat()).lte("kickoff_utc",end).order("kickoff_utc").limit(30).execute().data or []
    if not games: raise RuntimeError("No upcoming NFL games available in Supabase; cannot verify injury sync")
    # ESPN team ids via public ESPN team index, not abbreviation guesses.
    try:
        index=get(BASE+"?limit=50")
    except Exception as exc:
        print("ESPN team index failed:",repr(exc))
        index={}
    mapping={}
    for item in index.get("sports",[]):
        for league in item.get("leagues",[]):
            for t in league.get("teams",[]):
                team=t.get("team",t)
                mapping[str(team.get("abbreviation","")).upper()]=str(team.get("id",""))
    aliases={"LA":"LAR","WSH":"WAS","JAC":"JAX"}
    nowstr=now.isoformat()
    teams=sorted(set(t for g in games for t in (g["home_team_id"],g["away_team_id"])))
    # Prefer league-wide ESPN injury feed; team endpoints are fallbacks.
    league_injuries={}
    try:
        league=get("https://site.api.espn.com/apis/site/v2/sports/football/nfl/injuries")
        for group in league.get("injuries",[]):
            team=group.get("team") or {}
            abbr=str(team.get("abbreviation","")).upper()
            if abbr and isinstance(group.get("injuries"),list):
                league_injuries[abbr]=group["injuries"]
    except Exception as exc:
        print("ESPN league injury endpoint:",repr(exc))
    fetched={}
    for t in teams:
        tid=mapping.get(aliases.get(t,t), "")
        if not tid: tid=aliases.get(t,t).lower()
        try:
            payload={"injuries":league_injuries[aliases.get(t,t)]} if aliases.get(t,t) in league_injuries else get(BASE+tid+"/injuries")
            if not isinstance(payload,dict) or not isinstance(payload.get("injuries"),list):
                raise ValueError("ESPN injury response missing injuries list")
            injuries=payload["injuries"]
            players=[{"espn_id":str((i.get("athlete") or {}).get("id","")),"name":(i.get("athlete") or {}).get("displayName",i.get("displayName","")),"status":str(i.get("status",i.get("type","unknown"))),"position":((i.get("athlete") or {}).get("position") or {}).get("abbreviation","")} for i in injuries]
            fetched[t]={"endpoint_status":"fetched","players":players,"roster":[]}
        except Exception as exc:
            print("ESPN injury fetch failed for",t,"using",tid,repr(exc))
            fetched[t]={"endpoint_status":"espn_error","players":[],"roster":[]}
    good={t for t,d in fetched.items() if d["endpoint_status"]=="fetched"}
    bad=sorted(set(teams)-good)
    if bad: print("::warning::ESPN unavailable for: "+",".join(bad))
    if teams and not good: raise RuntimeError("No usable ESPN injury reports")
    rows=[]
    for game in games:
        for team in (game["home_team_id"],game["away_team_id"]):
            if team not in good: continue
            data=fetched[team]
            rows.append({"game_id":game["game_id"],"team_id":team,"kickoff_utc":game["kickoff_utc"],"observed_at":nowstr,"source":"ESPN live team injuries","endpoint_status":data["endpoint_status"],"players":data["players"],"roster":[],"source_quality":"live_snapshot_not_official_inactives" if data["endpoint_status"]=="fetched" else "unavailable"})
    if rows:
        print("Prepared",len(rows),"injury snapshots; ESPN responses",sum(v["endpoint_status"]=="fetched" for v in fetched.values()))
        db.table("engine_c_espn_injury_snapshots").insert(rows).execute()
    print(json.dumps({"games":len(games),"snapshots_saved":len(rows),"teams":{k:{"status":v["endpoint_status"],"injuries":len(v["players"])} for k,v in fetched.items()}}))
if __name__=="__main__":run()
