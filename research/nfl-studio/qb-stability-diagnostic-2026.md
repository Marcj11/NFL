# NFL Studio — Pre-match QB stability diagnostic (2026-10-14)

New NFL Studio Supabase dataset (NOT the old EXPERT NFL plugin). Read-only queries; no active prediction model change.

## Leakage controls
Historical table game_starting_quarterbacks records who **actually started** each completed game. Using the same game's starter in a retrospective prediction leaks future information. Do not use it as a pre-match input. Instead, this audit defines historical team QB stability entirely from each team's two previous completed games (lag 1 versus lag 2), both strictly prior to the game being evaluated.

## Coverage
- 2025 evaluated non-tie games: 284.
- Changes between actual current-game QB and previous game's QB (NOT legitimate pre-match feature): at least one side changed in 66 games.
- Prior-two-game QB instability available before the target match: at least one side changed in 67 games; zero missing by this basic query.

## Observed segment diagnostics
These are descriptive *outcomes*, not predictive model validation:

| Season | Segment | Games | Home wins |
|---|---|---:|---:|
| 2024 | Away stable, home unstable | 31 | 64.52% |
| 2024 | Home stable, away unstable | 28 | 50.00% |
| 2024 | Other | 226 | 53.98% |
| 2025 | Away stable, home unstable | 39 | 66.67% |
| 2025 | Home stable, away unstable | 24 | 25.00% |
| 2025 | Other | 221 | 54.30% |

## Decision
Do **not** give QB stability a positive model coefficient based on intuition. The segmented results do not show a simple monotonic benefit from recent QB continuity, and samples are small/confounded. Wait for certified pregame starter/injury availability and then run chronologically scored baseline comparisons, with 2025 considered already inspected. No proof of improved forecasting and no claim of ROI. Next evaluate opponent-adjusted team efficiency and then a future genuinely untouched cohort.
