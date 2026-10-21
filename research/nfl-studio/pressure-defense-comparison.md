# NFL Studio pressure / pass protection experiment (2026-10-14)

New NFL Studio project, separate from legacy EXPERT NFL. Live Supabase read-only research. Using completed historical games strictly before each evaluated kickoff. Base: recent season form (w=.75) + historical form (w=.25), net EPA coefficient .30. Historical team sacks suffered (offensive protection) and defense sacks made compared, using previous games only. Candidate coefficients: -0.04 suffered, +0.02 made.

| Model | 2025 correct / 284 | Brier 2025 | 2026 correct / 78 | Brier 2026 |
|---|---:|---:|---:|---:|
| Base | 182 | .22316 | 49 | .23102 |
| Sacks suffered | 187 | .22233 | 52 | .22984 |
| Defense sacks | 188 | .22291 | 49 | .23208 |
| Both | 186 | .22227 | 53 | .23092 |

The combined model has one extra correct pick on 2026, but worse Brier than sacks-suffered alone. These are exploratory historical tests with heavily reused 2025 and 2026 cohorts; no model promotion, no real market pricing and no reliable generalization claim. No QB-individual factor was included in this particular SQL test, despite eventual ensemble roadmap. Provisional preference is sacks-suffered only for research due to simplicity and 2026 Brier.
