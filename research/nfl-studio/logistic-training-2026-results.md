# NFL Studio — Logistic regression training run (2026-10-14)

Executed on 934 records returned from compact Supabase view `nfl_studio_training_features_v1`, loaded in ten <=100-record chunks via authorized Supabase connector. **This is the new NFL Studio database, not the old EXPERT NFL plugin.**

Training: 2023+2024, 570 labeled games; validation: 2025, 284; retrospective evaluation: 2026, 78. Tied games excluded.

Eight inputs: team historical smoothed win rates (home and away), current-season smoothed win rates (home and away), prior game counts (home and away), past net EPA (home and away). Feature standardization fitted using training cohort only. Three regularized binary logistic regression variants optimized by in-memory gradient descent (1600 iterations, step 0.2, L2 penalty). These are independent JavaScript implementations, not execution of the previously committed Python sklearn program. Coefficients and loss can differ from sklearn's C convention.

| L2 penalty | Validation 2025 correct | Accuracy | Brier | 2026 correct | Accuracy | Brier |
|---:|---:|---:|---:|---:|---:|---:|
| 0.1 | 176/284 | 61.97% | 0.22710 | 46/78 | 58.97% | 0.23154 |
| 0.01 | 176/284 | 61.97% | 0.22673 | 49/78 | 62.82% | 0.23016 |
| 0.001 | 178/284 | 62.68% | 0.22772 | 50/78 | 64.10% | 0.23000 |

2025 validation Brier selects L2=0.01, giving 2026 62.82%, Brier .23016. The 64.10% is highest observed 2026 accuracy among tested variants and is **not** an independent selection result. Both 2025 and 2026 were previously inspected by other experiments: neither is a clean untouched holdout. The 2026 cohort is small. Retrospective provenance snapshots have not been certified. No trained model activated, no betting claim, and gradient-boosting candidate in PR #8 has NOT been run. Need a reproducible run environment, stronger pregame feature engineering, strict dated snapshots and future prospective tests.
