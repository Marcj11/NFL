# NFL Studio player thresholds calibrated by 2024 results (2026-10-14)
New NFL Studio Supabase only; research-only. We are NOT measuring book lines or real bet ROI.

For each player-game row, use previous five player appearances' mean passing, receiving or rushing yards. Candidate rule predicts OVER fixed target (passing 250+, receiving 50+, rushing 50+) if prior rolling mean exceeds candidate multiplier times target. Multipliers evaluated: 0.8, 1.0, 1.2. Eligibility determined by *past mean* only: passing >= 100, receiving >=15, rushing >=15. NOTE unlisted and zero-snap participants are not in the evaluated universe; availability bias remains. Previous-five rows may include postseason; measured performances for previous games only.

Choose the multiplier with highest 2024 accuracy separately by category:
- Passing 250+: multiplier 1.2; 2024 65.76% (n=587), 2025 66.16% (n=588), 2026 67.92% (n=159).
- Receiving 50+: multiplier 1.0; 2024 74.27% (n=2973), 2025 74.13% (n=2949), 2026 73.28% (n=816).
- Rushing 50+: multiplier 1.2; 2024 75.84% (n=1391), 2025 74.46% (n=1351), 2026 73.14% (n=376).

2025 naive always-UNDER: passing 65.82%, receiving 73.75%, rushing 67.14%.
2026 naive always-UNDER: passing 64.78%, receiving 72.30%, rushing 67.82%.

Important: These are simple retrospectively tuned decision thresholds, NOT independently calibrated probabilities, or a trained multivariable sportsbook-props model. 2024-2026 already inspected; not clean untouched holdouts. Historical market lines for player props not available in compact Supabase. Further evaluation needs actual offered lines, market prices, dated player availability, proper no-play treatment, and prospective frozen model runs.
