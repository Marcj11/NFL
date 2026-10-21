"""Conservative postgame settlement of archived 2026 NFL recommendations.

Never synthesizes odds or player statistics. Only settles verified final games.
"""
import os, json, datetime
from supabase import create_client

db = create_client(os.environ["NFL_COMPACT_SUPABASE_URL"], os.environ["NFL_COMPACT_SUPABASE_SERVICE_ROLE_KEY"])
assert os.environ["NFL_COMPACT_SUPABASE_URL"].rstrip("/") == "https://jwetwyqlogowznkidnly.supabase.co"
dry_run = os.environ.get("NFL_GRADE_DRY_RUN", "true").lower() != "false"
games = {g["game_id"]: g for g in db.table("games").select("game_id,home_team_id,away_team_id").eq("season", int(os.environ.get("NFL_GRADE_SEASON", "2026"))).limit(500).execute().data}
finals = {g["game_id"]: g for g in db.table("game_results").select("game_id,home_score,away_score,result_status").in_("game_id", list(games)).execute().data if g.get("result_status") == "official_nfl_verified"}
team_names = {t["team_id"]: t["display_name"] for t in db.table("teams").select("team_id,display_name").execute().data}
names = {}
stats = {}
results = {"won": 0, "lost": 0, "push": 0, "skipped": 0}
page = 0
while True:
    batch = db.table("nfl_studio_forecast_decisions_v2").select("id,game_id,market,selection,line,reasoning").eq("result_status", "pending").gte("game_id", str(os.environ.get("NFL_GRADE_SEASON", "2026"))+"_").lt("game_id", str(int(os.environ.get("NFL_GRADE_SEASON", "2026"))+1)+"_").order("id").range(page * 200, page * 200 + 199).execute().data
    if not batch:
        break
    # Snapshot pagination: gather all pending before changing rows in this run.
    if page == 0:
        pending = []
    pending.extend(batch)
    page += 1
    if len(batch) < 200:
        break
for d in pending if 'pending' in locals() else []:
    gid = d["game_id"]
    if gid not in finals or gid not in games:
        results["skipped"] += 1
        continue
    final = finals[gid]
    game = games[gid]
    market = d["market"]
    actual = None
    verdict = None
    if market in ("h2h", "moneyline"):
        winner = game["home_team_id"] if final["home_score"] > final["away_score"] else game["away_team_id"] if final["away_score"] > final["home_score"] else None
        picked = next((t for t in (game["home_team_id"], game["away_team_id"]) if d["selection"] in (t,team_names.get(t))), None)
        if picked:
            actual = 1 if picked == winner else 0 if winner else None
            verdict = "won" if actual == 1 else "lost" if actual == 0 else "push"
    elif market == "totals" and d.get("line") is not None:
        side = str(d.get("selection") or "").strip().lower()
        total = float(final["home_score"]) + float(final["away_score"])
        line = float(d["line"])
        if side.startswith("over") or side.startswith("under"):
            actual = total
            verdict = "push" if total == line else "won" if ((total > line) == side.startswith("over")) else "lost"
    elif market in ("spreads", "spread") and d.get("line") is not None:
        home, away = game["home_team_id"], game["away_team_id"]
        selection = str(d.get("selection") or "")
        picked = next((t for t in (home,away) if selection in (t,team_names.get(t))), None)
        if picked:
            margin = float(final["home_score"]) - float(final["away_score"])
            margin = margin if picked == home else -margin
            adjusted = margin + float(d["line"])
            actual = margin
            verdict = "won" if adjusted > 0 else "lost" if adjusted < 0 else "push"
    elif market in ("player_pass_yds", "player_rush_yds", "player_reception_yds"):
        sel = d.get("selection")
        if sel not in names:
            people = db.table("players").select("player_id").eq("display_name", sel).limit(2).execute().data
            names[sel] = people[0]["player_id"] if len(people) == 1 else None
        pid = names[sel]
        if pid:
            key = (gid, pid)
            if key not in stats:
                found = db.table("player_game_stats").select("metrics").eq("game_id", gid).eq("player_id", pid).limit(1).execute().data
                stats[key] = found[0]["metrics"] if len(found) == 1 else {}
            stat_key = {"player_pass_yds":"passing_yards", "player_rush_yds":"rushing_yards", "player_reception_yds":"receiving_yards"}[market]
            val = stats[key].get(stat_key)
            rationale = (d.get("reasoning") or {}).get("explanation") or ""
            side = "over" if "a depasse" in rationale.lower().replace("é","e") else "under" if "a termine sous" in rationale.lower().replace("é","e") else None
            if isinstance(val, (int,float)) and d.get("line") is not None and side:
                actual = float(val)
                line = float(d["line"])
                verdict = "push" if actual == line else "won" if ((actual > line) == (side == "over")) else "lost"
    if verdict is None:
        results["skipped"] += 1
        continue
    if not dry_run:
        db.table("nfl_studio_forecast_decisions_v2").update({"result_status":verdict,"actual_outcome":verdict,"actual_value":actual,"graded_at":datetime.datetime.now(datetime.timezone.utc).isoformat()}).eq("id",d["id"]).eq("result_status","pending").execute()
    results[verdict] += 1
print(json.dumps({"dry_run": dry_run, "pending_examined":len(pending) if 'pending' in locals() else 0, "results":results}))
