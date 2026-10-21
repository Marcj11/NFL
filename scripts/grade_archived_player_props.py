"""Grade archived NFL player yard props using canonical player-game stats.
Never assign zero to missing data; preserve unsupported markets as pending.
"""
import os
from datetime import datetime, timezone
from supabase import create_client

URL = os.environ["NFL_SUPABASE_URL"]
KEY = os.environ["NFL_SUPABASE_SERVICE_ROLE_KEY"]
assert URL.rstrip("/") == "https://jwetwyqlogowznkidnly.supabase.co", "Unexpected Supabase project"
db = create_client(URL, KEY)
MARKETS = {
    "player_reception_yds": "receiving_yards",
    "player_rush_yds": "rushing_yards",
    "player_pass_yds": "passing_yards",
}
predictions = []
for start in range(0, 10000, 500):
    batch = (db.table("nfl_studio_forecast_decisions_v2")
             .select("id,game_id,market,selection,line,reasoning,result_status")
             .eq("result_status", "pending")
             .in_("market", list(MARKETS))
             .order("id")
             .range(start, start + 499).execute().data)
    predictions.extend(batch)
    if len(batch) < 500:
        break
names = sorted({str(d["selection"]).lower().strip() for d in predictions})
players = {}
for i in range(0, len(names), 50):
    records = db.table("players").select("player_id,display_name").in_("display_name", [d["selection"] for d in predictions if str(d["selection"]).lower().strip() in names[i:i+50]]).execute().data
    for record in records:
        players.setdefault(record["display_name"].lower().strip(), []).append(record["player_id"])
updated = 0
skipped = 0
for d in predictions:
    explanation = (d.get("reasoning") or {}).get("explanation", "")
    side = "over" if "a dépassé" in explanation else "under" if "a terminé sous" in explanation else None
    ids = players.get(str(d["selection"]).lower().strip(), [])
    if side is None or len(ids) != 1 or d.get("line") is None:
        skipped += 1
        continue
    rows = (db.table("player_game_stats").select("metrics")
            .eq("game_id", d["game_id"]).eq("player_id", ids[0])
            .limit(2).execute().data)
    metric = MARKETS[d["market"]]
    if len(rows) != 1 or rows[0].get("metrics", {}).get(metric) is None:
        skipped += 1
        continue
    actual = float(rows[0]["metrics"][metric])
    line = float(d["line"])
    outcome = "push" if actual == line else ("won" if (actual > line if side == "over" else actual < line) else "lost")
    (db.table("nfl_studio_forecast_decisions_v2")
       .update({"result_status": outcome, "actual_outcome": outcome,
                "actual_value": actual, "graded_at": datetime.now(timezone.utc).isoformat()})
       .eq("id", d["id"]).eq("result_status", "pending").execute())
    updated += 1
print({"pending_checked": len(predictions), "graded": updated, "missing_or_ambiguous": skipped})
