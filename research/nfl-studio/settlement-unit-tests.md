# NFL Studio settlement unit tests (2026-10-14)

Executed SQL read-only with 10 VALUES examples in Supabase compact project. No official journal rows inserted.

| Scenario | Expected / observed |
|---|---|
| home BUF spread -3.5, BUF 28 vs opponent 20 | win |
| home BUF spread -10.5, BUF 28 vs opponent 20 | loss |
| home BUF spread -8, BUF 28 vs opponent 20 | push |
| over total 40, final 48 | win |
| under total 50, final 48 | win |
| over 250 passing, 280 yards | win |
| under 50 receiving, 34 yards | win |
| over 50 rushing, 50 yards | push |
| player game statistics missing | needs_review |
| late forecast | unverified |

All 10 returned expected category in SQL scenario expression. **Scope caution**: These are SQL expression unit checks, NOT end-to-end tests of nfl_studio_settlement_candidates_v1 on inserted journal records. Nonparticipating players require authoritative snap/game participation and bookmaker void rules; currently needs_review. A first-party market feed, rulebook-specific overtime handling, real pregame prediction writer, and end-to-end tests remain outstanding. No money bet and no production predictions made.
