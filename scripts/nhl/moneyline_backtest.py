#!/usr/bin/env python3
"""Three-season NHL moneyline walk-forward backtest.

Public NHL schedule API -> prior-score rate estimates -> independent Poisson
goal simulation. This is a score-based baseline, NOT a validated xG model.
No hindsight: games grouped by date, predictions are made before the day's
results update rolling histories. Excludes playoffs and games not final.
"""
import csv
import json
import math
import time
import urllib.request
from collections import defaultdict
from datetime import datetime
from pathlib import Path

SEASONS = (20232024, 20242025, 20252026)
TEAMS = ("ANA","BOS","BUF","CGY","CAR","CHI","COL","CBJ","DAL","DET",
         "EDM","FLA","LAK","MIN","MTL","NSH","NJD","NYI","NYR","OTT",
         "PHI","PIT","SJS","SEA","STL","TBL","TOR","UTA","VAN","VGK","WSH","WPG")
# UTA joined for 2024-25; ARI was its predecessor through 2023-24.
def teams_for(season):
    return tuple(t for t in TEAMS if t != "UTA") + (("ARI",) if season == 20232024 else ("UTA",))

def fetch_json(url):
    for attempt in range(3):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 NHLStudioResearch/1.0", "Accept": "application/json"})
            with urllib.request.urlopen(req, timeout=45) as resp:
                return json.load(resp)
        except Exception:
            if attempt == 2: raise
            time.sleep(2 * (attempt + 1))

def download(season):
    games = {}
    errors = []
    for team in teams_for(season):
        url = f"https://api-web.nhle.com/v1/club-schedule-season/{team}/{season}"
        try:
            result = fetch_json(url)
            for g in result.get("games", []):
                if g.get("gameType") != 2 or g.get("gameState") not in ("OFF","FINAL"):
                    continue
                home, away = g.get("homeTeam", {}), g.get("awayTeam", {})
                hs, aas = home.get("score"), away.get("score")
                if not isinstance(hs, int) or not isinstance(aas, int) or hs == aas:
                    continue
                date = g.get("gameDate")
                if not date or not g.get("id"): continue
                games[str(g["id"])] = {"id": str(g["id"]), "date": date,
                    "home": home.get("abbrev"), "away": away.get("abbrev"),
                    "home_goals": hs, "away_goals": aas}
        except Exception as e:
            errors.append({"team":team, "error":str(e)})
    if errors:
        raise RuntimeError(f"Schedule download incomplete {season}: {errors}")
    return sorted((g for g in games.values() if g["home"] and g["away"]), key=lambda g:(g["date"],g["id"]))

def pmf(lam):
    p=[math.exp(-lam)]
    for i in range(1,50): p.append(p[-1]*lam/i)
    norm=sum(p)
    return [v/norm for v in p]

def win_chance(h, a):
    ph,pa=pmf(h),pmf(a)
    hr=ar=tie=0.
    for i,hi in enumerate(ph):
        for j,aj in enumerate(pa):
            p=hi*aj
            if i>j:hr+=p
            elif i<j:ar+=p
            else:tie+=p
    # Overtime allocation proxy, uncalibrated.
    ot=1/(1+math.exp(-.38*(h-a)))
    return hr+tie*ot

def shrink(history, field):
    n=len(history)
    return (sum(row[field] for row in history)+15*2.9)/(n+15)

def weighted_rate(history, field, venue=None):
    rows = history if venue is None else [r for r in history if r["venue"] == venue]
    # Exponential weighting emphasizes recent form; prior prevents early extremes.
    weights = [0.95**(len(rows)-1-i) for i in range(len(rows))]
    return (sum(w*r[field] for w,r in zip(weights,rows)) + 12*2.9) / (sum(weights)+12)

def model_probability(hh, ah, date, model):
    if model == "baseline":
        return win_chance(max(.25,(shrink(hh,"for")+shrink(ah,"against"))/2+.12),
                          max(.25,(shrink(ah,"for")+shrink(hh,"against"))/2-.12))
    # All features derive from games played before this calendar date.
    h_for=.55*weighted_rate(hh,"for")+.45*weighted_rate(hh,"for","home")
    h_against=.55*weighted_rate(hh,"against")+.45*weighted_rate(hh,"against","home")
    a_for=.55*weighted_rate(ah,"for")+.45*weighted_rate(ah,"for","away")
    a_against=.55*weighted_rate(ah,"against")+.45*weighted_rate(ah,"against","away")
    def fatigue(history):
        if not history: return 0
        days=(datetime.fromisoformat(date)-datetime.fromisoformat(history[-1]["date"])).days
        return -.16 if days<=1 else .05 if days>=3 else 0
    h_rate=(h_for+a_against)/2+.12+fatigue(hh)-fatigue(ah)
    a_rate=(a_for+h_against)/2-.12+fatigue(ah)-fatigue(hh)
    return win_chance(max(.25,h_rate),max(.25,a_rate))

def elo_probability(home_rating, away_rating, home_advantage=55):
    return 1/(1+10**((away_rating-home_rating-home_advantage)/400))

def backtest(games, season, model="baseline"):
    histories=defaultdict(list)
    ratings=defaultdict(lambda:1500.0)
    rows=[]
    for date in sorted(set(g["date"] for g in games)):
        today=[g for g in games if g["date"]==date]
        pending=[]
        for g in today:
            home,away=g["home"],g["away"]
            hh,ah=histories[home],histories[away]
            if len(hh)<10 or len(ah)<10:
                pending.append(g)
                continue
            if model=="elo":
                p=elo_probability(ratings[home],ratings[away])
            elif model=="ensemble":
                p=.5*model_probability(hh,ah,date,"enhanced")+.5*elo_probability(ratings[home],ratings[away])
            else:
                p=model_probability(hh,ah,date,model)
            pick=home if p>=.5 else away
            actual=home if g["home_goals"]>g["away_goals"] else away
            rows.append({"season":season,"date":date,"id":g["id"],"home":home,"away":away,
                         "home_win_probability":round(p,7),"predicted_winner":pick,
                         "actual_winner":actual,"correct":int(pick==actual),
                         "home_score":g["home_goals"],"away_score":g["away_goals"],
                         "pre_home_games":len(hh),"pre_away_games":len(ah)})
            pending.append(g)
        # No same-day information leakage
        for g in pending:
            outcome=1.0 if g["home_goals"]>g["away_goals"] else 0.0
            expected=elo_probability(ratings[g["home"]],ratings[g["away"]])
            shift=22*(outcome-expected)
            ratings[g["home"]]+=shift
            ratings[g["away"]]-=shift
            histories[g["home"]].append({"for":g["home_goals"],"against":g["away_goals"],"venue":"home","date":date})
            histories[g["away"]].append({"for":g["away_goals"],"against":g["home_goals"],"venue":"away","date":date})
    return rows

def summarize(rows, season, model):
    n=len(rows)
    hit=sum(r["correct"] for r in rows)
    brier=sum((r["home_win_probability"]-(1 if r["actual_winner"]==r["home"] else 0))**2 for r in rows)/n
    return {"season":season,"model":model,"predictions":n,"correct":hit,"accuracy_pct":round(100*hit/n,3),"brier":round(brier,5)}

def main():
    out=Path("artifacts/nhl-moneyline-backtest")
    out.mkdir(parents=True,exist_ok=True)
    all_rows=[]
    summary=[]
    comparison=[]
    for season in SEASONS:
        games=download(season)
        # Check substantial coverage; never claim a complete season otherwise.
        if len(games)<1000:
            raise RuntimeError(f"Insufficient historical season {season}: only {len(games)} games")
        baseline=backtest(games,season,"baseline")
        improved=backtest(games,season,"enhanced")
        elo=backtest(games,season,"elo")
        ensemble=backtest(games,season,"ensemble")
        if len(baseline)<700 or len(improved)!=len(baseline) or len(elo)!=len(baseline) or len(ensemble)!=len(baseline): raise RuntimeError(f"Coverage mismatch {season}")
        old=summarize(baseline,season,"baseline")
        new=summarize(improved,season,"enhanced")
        elo_result=summarize(elo,season,"elo")
        ensemble_result=summarize(ensemble,season,"ensemble")
        summary.append(new)
        comparison.append({"baseline":old,"enhanced":new,"elo":elo_result,"ensemble":ensemble_result,"delta_percentage_points":round(new["accuracy_pct"]-old["accuracy_pct"],3)})
        all_rows.extend(improved)
        print(json.dumps(comparison[-1]),flush=True)
    with (out/"predictions.csv").open("w",newline="",encoding="utf8") as f:
        w=csv.DictWriter(f,fieldnames=list(all_rows[0]));w.writeheader();w.writerows(all_rows)
    total=len(all_rows)
    report={"method":"Fixed 50/50 probability blend of enhanced score Poisson and Elo; all model results reported separately. Not full xG engine.",
            "seasons":summary,"comparison":comparison,"overall":{"predictions":total,
            "correct":sum(r["correct"] for r in all_rows),
            "accuracy_pct":round(100*sum(r["correct"] for r in all_rows)/total,3)},
            "limitations":"No pregame xG, goaltender/injury confirmations or historical odds. Win accuracy is not profitability."}
    (out/"report.json").write_text(json.dumps(report,indent=2),encoding="utf8")
    print(json.dumps(report,indent=2),flush=True)

if __name__=="__main__":main()
