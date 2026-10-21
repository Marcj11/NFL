# NFL Studio — EPA evaluation v0.2 (2026-10-14)

**Project**: Supabase nfl-studio-compact (jwetwyqlogowznkidnly).
**Separate** from legacy EXPERT NFL plugin. Retrospective research only; no wager model activated.

## Method
- Use game_results + games for seasons 2023–2025; disregard tied games.
- For each evaluated game, accumulate team game-win history and play-level offensive EPA on games with kickoff strictly earlier than the evaluated kickoff.
- Aggregate EPA at team-game level. Ignore plays with null EPA or offensive team outside both game teams.
- Win-rate baseline: p(home) = clip[0.05,0.95](0.54 + 0.70*((home_prior_wins+6)/(home_prior_games+12) - (away_prior_wins+6)/(away_prior_games+12))).
- EPA feature: home_prior_EPA / (home_prior_EPA_plays+200) minus away_prior_EPA / (away_prior_EPA_plays+200).
- EPA candidate: p(home) = clip[0.05,0.95](baseline + coefficient*EPA_feature).
- Candidate coefficients preselected for comparison: 0, 0.3, 0.6, 1.0.
- Development comparison: 2024. Later evaluation: 2025. This is **not an untouched holdout**, as prior baseline work had already inspected 2025.
- EPA is offense-only and NOT a comprehensive net team EPA model.
- Results of same-timestamp kickoffs are excluded by strictly-less-than temporal filter. Source publication timestamps and retrospective corrections not independently verified.

## SQL outputs (direct from Supabase)

| Year | Coefficient | Games | Correct | Accuracy | Brier |
|---|---:|---:|---:|---:|---:|
| 2024 | 0.0 | 285 | 189 | 66.32% | 0.22285 |
| 2024 | 0.3 | 285 | 189 | 66.32% | 0.21793 |
| 2024 | 0.6 | 285 | 198 | 69.47% | 0.21428 |
| 2024 | 1.0 | 285 | 198 | 69.47% | 0.21141 |
| 2025 | 0.0 | 284 | 171 | 60.21% | 0.23380 |
| 2025 | 0.3 | 284 | 174 | 61.27% | 0.23444 |
| 2025 | 0.6 | 284 | 172 | 60.56% | 0.23627 |
| 2025 | 1.0 | 284 | 175 | 61.62% | 0.24025 |

## Decision
**REJECT** EPA adjustment for the currently proposed baseline: the best 2024 Brier candidate (coefficient 1.0) is worse than baseline on 2025 Brier: 0.24025 vs 0.23380. Although raw accuracy increases, probability quality worsens. No coefficients changed in production. Next develop appropriately regularized rolling offense + defense EPA, QB starter pregame availability and independent prospective test. Do not claim profitability.
