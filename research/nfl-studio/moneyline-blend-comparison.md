# NFL Studio — Moneyline blend comparison, 2026-10-14

New NFL Studio Supabase only, no EXPERT NFL legacy data and no Vercel deployment.

Evaluated from nfl_studio_training_features_v1 with only strictly prior-kickoff outcome/efficiency features (the underlying source publication times are not certified).
Formula: p(home)=clip(.05,.95,.54+.70*(w*(home_current_season_rate-away_current_season_rate)+(1-w)*(home_historical_rate-away_historical_rate))+e*(home_net_EPA-away_net_EPA)).
Variants: base (w=0,e=0); recency (w=.75,e=0); net_epa (w=.75,e=.3); blend (w=.5,e=.15).

2025 / 284 games:
base 171 60.21% Brier .23380
recency 180 63.38% Brier .22502
net_epa 182 64.08% Brier .22316
blend 186 65.49% Brier .22575

2026 / 78 games:
base 48 61.54% Brier .23113
recency 51 65.38% Brier .23451
net_epa 49 62.82% Brier .23102
blend 48 61.54% Brier .23042

Blend improves 2025 but does not maintain an accuracy gain in 2026. Rejected for production. 2025-2026 already repeatedly inspected, not untouched holdouts. This is research-only, not validated profitability.
