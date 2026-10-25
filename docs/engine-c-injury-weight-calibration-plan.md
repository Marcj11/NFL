# Engine C injury-weight calibration — 2026-10-24

Verified Supabase inventory: 19,194 retrospective injury rows; 63,263 player game stats; 86,731 player snap records. All 1,536 forecast rows in engine_c_injury_backtest_eligibility_v1 have has_asof_injuries=false and state blocked_no_pregame_injury_snapshot.

Never use retrospective injury data as if published before kickoff. Collect verified source publication and first-observation timestamps, identifiers, and availability before forecasts. Build player/replacement/context features from prior games only. Train separately for moneyline, spread, total, player props, defense, kicking and special teams; propagate to parlays without counting twice. Evaluate against no-injury baseline using chronological out-of-sample Brier, log-loss, MAE and calibration. Record calibration_id and sample provenance. Do not activate weights or claim improvement before independent validation.

Current status: injury impacts not calibrated or enabled in production.
