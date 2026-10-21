"""NFL Studio standalone chronological research trainer. No betting or production deployment.
Requires: pip install numpy scikit-learn
Environment: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (server-side only).
"""
import csv
import io
import json
import os
from urllib.parse import urlencode
from urllib.request import Request, urlopen

import numpy as np
from sklearn.impute import SimpleImputer
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import HistGradientBoostingClassifier
from sklearn.metrics import accuracy_score, brier_score_loss, log_loss

FEATURES = [
    "home_long_winrate", "away_long_winrate",
    "home_season_winrate", "away_season_winrate",
    "home_prior_games", "away_prior_games",
    "home_net_epa", "away_net_epa"
]
def load_rows():
    url = os.environ["SUPABASE_URL"].rstrip("/") + "/rest/v1/nfl_studio_training_features_v1"
    token = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
    out = []
    offset = 0
    while True:
        query = urlencode({"select": "game_id,season,week,kickoff_utc,home_win," + ",".join(FEATURES),
                           "order": "kickoff_utc.asc,game_id.asc", "limit": 500, "offset": offset})
        req = Request(url + "?" + query, headers={
            "apikey": token, "Authorization": "Bearer " + token,
            "Accept": "application/json"})
        with urlopen(req, timeout=90) as response:
            batch = json.load(response)
        out.extend(batch)
        if len(batch) < 500:
            return out
        offset += len(batch)

def cohort(rows, seasons):
    filtered = [r for r in rows if int(r["season"]) in seasons and r["home_win"] is not None]
    x = np.array([[float(r[k]) if r[k] is not None else np.nan for k in FEATURES]
                  for r in filtered], dtype=float)
    y = np.array([int(r["home_win"]) for r in filtered], dtype=int)
    return x, y, filtered

def score(model, x, y):
    p = np.clip(model.predict_proba(x)[:, 1], 0.001, 0.999)
    return {"games": len(y), "correct": int(((p >= 0.5) == y).sum()),
            "accuracy": round(accuracy_score(y, p >= 0.5), 4),
            "brier": round(brier_score_loss(y, p), 5),
            "log_loss": round(log_loss(y, p, labels=[0,1]), 5)}

def main():
    rows = load_rows()
    x_train, y_train, _ = cohort(rows, {2023, 2024})
    x_val, y_val, _ = cohort(rows, {2025})
    x_eval, y_eval, _ = cohort(rows, {2026})
    assert len(x_train) > 0 and len(x_val) > 0 and len(x_eval) > 0
    candidates = {
        "logistic_c0.1": Pipeline([("impute", SimpleImputer(strategy="median")),
                                  ("scale", StandardScaler()),
                                  ("model", LogisticRegression(C=0.1, max_iter=2000))]),
        "logistic_c1": Pipeline([("impute", SimpleImputer(strategy="median")),
                                ("scale", StandardScaler()),
                                ("model", LogisticRegression(C=1, max_iter=2000))]),
        "boost_shallow": Pipeline([("impute", SimpleImputer(strategy="median")),
                                   ("model", HistGradientBoostingClassifier(
                                       max_iter=100, max_leaf_nodes=5,
                                       l2_regularization=3.0, random_state=42))])
    }
    reports = {}
    for name, model in candidates.items():
        model.fit(x_train, y_train)
        reports[name] = {"validation_2025": score(model, x_val, y_val)}
    best = min(candidates, key=lambda n: reports[n]["validation_2025"]["brier"])
    # 2026 scores are informational, not virgin holdout: earlier research already inspected 2026.
    reports[best]["retrospective_2026"] = score(candidates[best], x_eval, y_eval)
    print(json.dumps({
        "status": "research_only", "features": FEATURES,
        "split": {"train": [2023, 2024], "validation": [2025], "retrospective_evaluation": [2026]},
        "selected_by": "2025_brier", "winner": best, "reports": reports,
        "cautions": [
            "Some source publication timestamps are not verified.",
            "2025 and 2026 were inspected in previous experiments: neither is virgin holdout.",
            "No live predictions and no profitability conclusions."
        ]}, indent=2))

if __name__ == "__main__":
    main()
