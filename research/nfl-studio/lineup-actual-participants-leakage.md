# NFL Studio — full participant-lineup retrospective leakage diagnostic
14 Oct 2026. Supabase compact, not EXPERT NFL. Base p=clip(.54 + .70*(.25 long_winrate_gap + .75 season_winrate_gap)+.30 net_EPA_gap,.05,.95). Lineup signals: number of players with >0 offensive or defensive snaps in the EVALUATED game who did not have snaps in that unit for their team's previous game, home minus away. **This is outcome-time player participation and must not enter a real pregame model.**

| Model | 2025 correct/284 | Brier | 2026 correct/78 | Brier |
|---|---|---|---|---|
| Base | 182 | .22316 | 49 | .23102 |
| weak lineup adjustment (-.005 offense, -.005 defense) | 188 | .22302 | 50 | .23387 |
| medium (-.015, -.015) | 184 | .22479 | 47 | .24170 |
| split (-.015,+.015) | 176 | .22654 | 43 | .24105 |

Important: despite marginal classification increase for weak adjustment, 2026 Brier worsens. This experiment cannot establish forecasting accuracy because it uses the real game's participants, unavailable before kickoff. Next valid experiment must use point-in-time roster/injury announcements, provenance timestamps, and locked chronological parameters, compared against the stronger protection benchmark (2025: 187/284; 2026: 52/78).
