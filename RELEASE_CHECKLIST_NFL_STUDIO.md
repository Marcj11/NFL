# NFL Studio - Single release checklist (Oct 14 2026)

Branch: feature/live-model-preview-ui; base: main. Do NOT consume Vercel Hobby deployments for each small change.
Already staged:
- week-filtered read-only Moneyline historical form preview /api/public-model-preview
- week-filtered historical roster risk /api/roster-risk
- both clearly marked unverified / not betting recommendations
Existing main app:
- ESPN scoreboard schedule
- odds endpoint intentionally locked; no quota-consuming calls
- P&L currently placeholder

Before ONE production release:
1. Confirm runtime env SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY exist for production and preview; do not expose them publicly.
2. Build Next.js once; inspect route/UI/type errors. Check 2xx JSON in each endpoint and ensure no unconfirmed lineup represented as official.
3. Validate ESPN scoreboard separately, and solve confirmed pregame lineup availability.
4. Integrate and validate real licensed bookmaker Moneyline/spread/prop data + quota guard, no guessed quotes.
5. Calibrate spread/props and run point-in-time checks; no retrospective snap participation in pregame probability.
6. Implement durable CAD wager ledger and settlement before any ROI claim.
7. Only then merge and release. Test on-site flows /api/games, /api/public-model-preview, /api/roster-risk, /api/odds, UI.
Blockers: Vercel 402 API deployments free/day (>100); omit teamId for personal marcj-1079 scope to avoid prior 403 (confirmed for NFL Studio only).
