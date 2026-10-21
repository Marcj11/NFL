# NFL Studio spread and player-threshold research (2026-10-14)

NEW NFL Studio Supabase only. Historic retrospective evaluation, not real market bet backtesting.

Historical sportsbook archive: odds_observations 132 'spreads' rows and 132 'totals' rows but only 6 distinct games each; no historical player-prop price/line coverage confirmed. Thus use fixed thresholds (not sportsbook lines).

Spread reference: forecast home-vs-away point margin from half the difference in team historical mean scoring margins, using only previous games; classify home margin > +3.5 and > +6.5. 2025 n=285, MAE 10.61 pts, +3.5 62.81%, +6.5 66.32%; 2026 n=79, MAE 9.94 pts, +3.5 60.76%, +6.5 69.62%. NOT ATS or profitable market metrics.

Player thresholds: preceding 5 player appearances average predicts threshold crossing; select historical 'eligible' records by previous average (pass>=100, receiving>=15, rushing>=15) and NOT by the evaluated game's statistics. Note: includes records for actual participants; availability and unlisted nonparticipants remain an unresolved selection caveat.

| Season | Test | N | Accuracy | Always-under |
|---|---|---:|---:|---:|
| 2025 | 250+ passing yards | 588 | 64.80% | 65.82% |
| 2026 | 250+ passing yards | 159 | 69.18% | 64.78% |
| 2025 | 50+ receiving yards | 2949 | 74.13% | 73.75% |
| 2026 | 50+ receiving yards | 816 | 73.28% | 72.30% |
| 2025 | 50+ rushing yards | 1351 | 75.50% | 67.14% |
| 2026 | 50+ rushing yards | 376 | 72.87% | 67.82% |

Earlier uncorrected analysis filtered on *outcomes of evaluated game* and was discarded as leakage. These results have no pregame market price, no true zero-snap/nonparticipant treatment, no confidence-calibration test and cannot determine ROI. A low-usage player with an easy UNDER may yield high accuracy without actionable value. Need proper historical lines and odds, starter/availability snapshots, calibration and Brier, temporal frozen evaluation before model promotion.
