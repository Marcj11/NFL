# NFL Studio individual QB historical test (2026-10-14)

Separate from legacy EXPERT NFL. SQL computed directly in Supabase compact.

Pregame proxy: each team's quarterback from its immediately preceding game, never the starter of the evaluated game. Join player GSIS ID to player_game_stats through players. Compute each proxy QB's historical mean of passing TD minus interceptions from games before the evaluated kickoff. Add difference between home and away proxy QB stats to the existing .75 recency + .30 net EPA model with candidate coefficients 0, .01, .02, .04.

Results:
2025 (284 games): baseline 182/284, Brier .22316; .01=185/284, Brier .22294; .02=188/284, Brier .22281; .04=188/284, Brier .22283.
2026 (78 games): baseline 49/78, Brier .23102; .01=50/78, Brier .23098; .02=49/78, Brier .23102; .04=50/78, Brier .23136.

Coverage: 2025 568 QB-side records, previous QB available all, 558 with >=3 prior player-stat games. 2026 156 QB-sides, 155 with >=3 prior player-stat games.

No consistent 2026 gains; do not deploy or claim >65% performance. QB preceding game is NOT a certified announced current-game starter. No historical source publication timestamp certification. Seasons have already been inspected and are not untouched holdouts. No bets.
