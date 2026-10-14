# NFL Studio — Data warehouse
Status: schema prepared in GitHub; not provisioned, not imported, not live. No Supabase account/connection confirmed.

Migration 001_nfl_core.sql creates identifier, team, schedule, versioned source, raw event, injury, snap, odds and forecast tables. Row-level security default denies unauthenticated/client access; users must not use service-role secrets in a browser.
Import guardrails: check source licenses and rights, bounded batch imports, content hashes, immutable raw data, quarantine 124 unresolved snap lines from 10 PFR IDs, don't silently substitute missing values, preserve source publication and observation times. Injuries at any position must invalidate affected model features.
Before data ready: Supabase Free project connection, migration apply and schema tests, ingestion from eligible public sources, per-position coverage, team/week crosschecks, snapshot point-in-time validity, independent source reconciliation, role-based security verification.
No odds API automatic polling, paid storage, subscriptions or credits without explicit approval; legacy EXPERT NFL untouched.
