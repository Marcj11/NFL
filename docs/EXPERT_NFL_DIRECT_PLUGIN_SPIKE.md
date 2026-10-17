# EXPERT NFL direct-plugin integration: isolated go/no-go spike

Date: 2026-10-17. Branch: experiment/plugin-direct-qa-spike (not production).

## Exact requested behavior
A user asks a free-form question inside NFL Studio. The *actual* EXPERT NFL Recherche 1.6.2 and EXPERT NFL Player Props 1.0.9 run, produce verifiable outputs using current inputs, and return an answer. A substitute heuristic, another plugin, an archived report, or generic ChatGPT text **does not count**.

## Verified sources
- EXPERT NFL Recherche 1.6.2 is a PRIVATE workspace plugin. Files inspected: skills/expert-nfl-research/SKILL.md, references/probability_core.py, references/player-props.md. The former orchestrates tools; probability_core.py explicitly says 'No predictive model included'.
- EXPERT NFL Player Props 1.0.9 is referenced in the NFL Studio engine-status code, but no plugin ID, executable archive, endpoint, or credentials were verified.
- app/api/expert-engine-status/route.ts reports independent_plugin_runtime_not_wired_to_webapp.
- app/api/expert-independent/route.ts reads stored forecasts only; it does not execute either independent plugin.
- NFL Studio's existing simulation in app/api/expert-prop-research/route.ts is research-only; it is NOT demonstrated to be the Player Props plugin.

## Acceptance gates (ALL mandatory)
1. Obtain Player Props 1.0.9's exact plugin ID, source files, runnable algorithm and dependencies by authorized means.
2. Verify official/authorized independent invocation of BOTH exact plugins from a non-ChatGPT server, or run their original algorithms in a dedicated backend under appropriate permissions. A private ChatGPT plugin subscription must not be tunneled or impersonated.
3. End-to-end test: same named NFL event and real decimal odds yields individual per-plugin outputs, versions, input hashes, timestamps, and a source-backed explanation. Compare with an execution via the original plugin environment when available.
4. Tests of rejects: missing odds, old quotes, missing lineup/injury, unsupported prop, and absent/failed engine. No fabricated EV or output.
5. No client-side secret, no unbounded public paid API usage, no access to user's wallet or bet modification.
6. Pass deployment build AND live endpoint probe.

## Current decision
NO-GO for production implementation. Gates 1, 2, 3, 4, and 6 are not demonstrated. Do not implement a misleading chat UI.

## Reversal condition
Re-open the spike only when exact Player Props source AND authorized callable runtime are available. Then run a single same-odds dual-engine test. No production changes before success.
