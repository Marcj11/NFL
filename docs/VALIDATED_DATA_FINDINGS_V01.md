# Résultats validés — audit conditionnel nflverse
Date source 2026-10-14T02:50:42.494566+00:00. Source: diagnostics/nflverse-conditional-quality.json

## Résultats exécutés
16 datasets successfully fetched and processed: PBP/player_stats/snap_counts/rosters_weekly × 2023–2026. All 16 status=ok. PBP game_id+play_id duplicate groups = 0 each season. All four snap_count tables zero NULL cells (not a proof of row coverage). PBP completed-pass yards_after_catch nonnull 2023 12427/12427, 2024 12136/12136, 2025 11748/11749, 2026 3365/3365. Passing CPOE where attempts > 0 nonnull 2023 696/700, 2024 694/697, 2025 677/684, 2026 182/184. Play-based pass air yards ~92.5–93.1%, run location ~96.0–96.3%, run_gap 69.0–72.0%. Rosters weekly contain NULL cells (not per critical field assessed).

## Quality status distinctions
VERIFIED_STRUCTURAL: successful retrieval, no duplicate groups for observed nonnull IDs, raw null counts, conditional coverage for selected columns and derived predicates.
NOT VERIFIED: cross-source agreement, official counts, roster IDs matching across vendors, unique player names vs IDs, playing status as-of pregame, injuries as-of timestamp, 2026 participation availability, real-time latency, coach/OL/coverage impact, player-specific props correctness, weather forecasts as-of, betting odds, simulation calibration.
Pending: conditional pass attempt/complete flag definitions validated against schema/code; join-based reconciliation, schedule games per season and NFL official, cross source ESPN sampling, errors by week/team, broad seasons.

## Safety release gates
Never promote VERIFIED_STRUCTURAL into VERIFIED_PREDICTIVE. Do not use odds source or claim betting profitability until line/book/source/current time and calibrated probability available. Injury change all positions triggers recomputation.
