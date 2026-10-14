# NFL Studio chronological model selection (2026-10-14)

Executed and deployed SQL view in Supabase compact: `public.nfl_studio_walkforward_v1` (read restricted to service_role/postgres). Model is selected by prior seasons' pooled Brier; tested on subsequent season. Four frozen research candidates, not newly trained coefficients: base, recency, EPA, blend.

| Tested season | Selected on previous seasons | Correct | Brier | Accuracy |
|---|---|---|---|---|
| 2024 | blend | 192/285 | .21724 | 67.37% |
| 2025 | EPA | 182/284 | .22316 | 64.08% |
| 2026 (partial) | EPA | 49/78 | .23102 | 62.82% |

This is retrospective walk-forward selection using repeated previously explored candidate families. It is NOT untouched prospective validation. Source-vintage feature timestamps still unverified. NFL 2026 season only partly completed. No betting return measured. No promotion to production and no Vercel changes.