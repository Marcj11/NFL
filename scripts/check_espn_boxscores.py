"""ESPN NFL boxscore inspection. Read-only, no Supabase writes."""
import argparse
import json
import urllib.request

parser = argparse.ArgumentParser()
parser.add_argument("--season", type=int, required=True)
parser.add_argument("--week", type=int, required=True)
args = parser.parse_args()
if not 2023 <= args.season <= 2030 or not 1 <= args.week <= 18:
    parser.error("Invalid season/week")
def read(url):
    req = urllib.request.Request(url, headers={"User-Agent":"NFL-Studio-Audit/1.0"})
    with urllib.request.urlopen(req, timeout=15) as response:
        return json.load(response)
board = read(f"https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard?dates={args.season}&seasontype=2&week={args.week}&limit=50")
for event in board.get("events", []):
    competitors = (event.get("competitions") or [{}])[0].get("competitors", [])
    teams = {c.get("homeAway"):c.get("team",{}).get("abbreviation") for c in competitors}
    completed = event.get("status",{}).get("type",{}).get("completed",False)
    result = {"espn_game_id":event.get("id"),"teams":teams,"completed":completed}
    if completed:
        summary = read("https://site.api.espn.com/apis/site/v2/sports/football/nfl/summary?event="+str(event["id"]))
        result["boxscore_players"] = sum(len(block.get("athletes",[])) for team in summary.get("boxscore",{}).get("players",[]) for block in team.get("statistics",[]))
    print(json.dumps(result))
