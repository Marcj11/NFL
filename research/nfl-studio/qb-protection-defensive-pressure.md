# NFL Studio — Combined individual QB, protection, defensive sacks (2026-10-14)

Research-only SQL on the new Supabase NFL Studio compact database; no legacy EXPERT NFL, no Vercel or production changes.

Formula based on 0.75 season recency + net EPA 0.30 reference. Add historical team sacks suffered gap * -0.04; previous game's starter QB historical passing TD-minus-interception difference * +0.02; optional historical defense sacks made gap * +0.02. All histories restricted to games before evaluated kickoff. The previous-game QB is a proxy, not an independently confirmed pregame starter.

| Variant | 2025 correct of 284 | 2025 Brier | 2026 correct of 78 | 2026 Brier |
|---|---:|---:|---:|---:|
| Form + EPA | 182 (64.08%) | .22316 | 49 (62.82%) | .23102 |
| Protection | 187 (65.85%) | .22233 | 52 (66.67%) | **.22984** |
| QB + protection | 189 (66.55%) | **.22230** | 51 (65.38%) | .23009 |
| QB + protection + defense | 189 (66.55%) | **.22230** | 53 (67.95%) | .23117 |

Decision: keep historical sacks suffered as provisional research benchmark for 2026 probability calibration; do not promote combined feature. 2025-2026 reused for extensive experimentation and cannot be presented as independent holdouts; original source-vintage timestamps also unverified. No actual odds, return, betting profitability, or guaranteed future accuracy claim.
