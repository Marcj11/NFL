# NFL Studio new-model research: season recency (2026-10-14)

Separate from legacy EXPERT NFL. No production model updated.

Dataset: compact Supabase 2023–2025 games/results; each match computed using games with strictly earlier kickoff. Ties omitted. 2024 development, 2025 retrospective evaluation already observed by prior baseline experiment (therefore NOT an untouched test).

Baseline p_home = clip(0.05,0.95, 0.54 + 0.70 * (historical_home_winrate_smoothed - historical_away_winrate_smoothed)).
Historical smoothed win rates = (prior_wins+6)/(prior_games+12).
Current-season smoothed win rates = (prior_current_season_wins+3)/(prior_current_season_games+6).
New p_home = clip(0.05,0.95,0.54 + 0.70 * ((1-w)*(historical_home_rate-historical_away_rate)+w*(current_season_home_rate-current_season_away_rate))).
Candidate w = 0, 0.25, 0.5, 0.75, 1.0.

2024 results (285 games):
weight | correct | accuracy | Brier
0 | 189 | 66.32% | 0.22285
0.25 | 191 | 67.02% | 0.22041
0.5 | 191 | 67.02% | 0.21886
0.75 | 196 | 68.77% | 0.21820
1.0 | 192 | 67.37% | 0.21843

2025 results (284 games):
weight | correct | accuracy | Brier
0 | 171 | 60.21% | 0.23380
0.25 | 177 | 62.32% | 0.22952
0.5 | 187 | 65.85% | 0.22659
0.75 | 180 | 63.38% | 0.22502
1.0 | 180 | 63.38% | 0.22480

Choosing w=0.75 by 2024 Brier yields 63.38% and Brier 0.22502 on 2025, improved vs baseline 60.21% and 0.23380. **Do not claim w=0.5 is independently validated: it was selected on 2025 accuracy**. Historical source correction timestamps remain uncertified; future prospective snapshots required. Do not interpret win accuracy as betting profitability. Next: add QB availability with certified pregame timestamps, team offense/defense EPA with regularization, then run time-forward comparisons against this baseline.
