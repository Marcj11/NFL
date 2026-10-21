# NFL Studio: historical team passing production test

2026-10-14. Research only, compact Supabase, NOT legacy EXPERT NFL. Retrospective rolling-team prior-game features (only games with earlier kickoff). Reference: recency weight 0.75 and net EPA weight 0.3. Additional candidates: mean historical team passing yards gap (coefficient .0005), TD minus interceptions gap (coefficient .02), or both.

| Model | 2025 accuracy | 2025 Brier | 2026 accuracy | 2026 Brier |
|---|---:|---:|---:|---:|
| baseline | 64.08% | .22316 | 62.82% | .23102 |
| passing yards | 64.08% | .22329 | 61.54% | .23090 |
| TD minus INT | 65.49% | .22331 | 64.10% | .23116 |
| both | 64.79% | .22363 | 61.54% | .23121 |

2025 n=284; 2026 n=78. Higher classification accuracy on TD-INT candidate but slightly worse Brier both years. Not promoted. **Crucial limitation:** this is historical *team* passing performance, not verified pregame starter QB. Previous historical games are used; original publication timestamps may be uncertified. 2025 and 2026 already inspected many times and are not virgin holdouts. No betting/ROI claim.