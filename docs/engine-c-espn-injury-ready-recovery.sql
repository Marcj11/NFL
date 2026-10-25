-- Backup of the validated SQL view in Supabase, 2026-10-24.
-- Reapply only after checking dependent objects and access policies.
create or replace view public.engine_c_espn_injury_ready_v1 as
select s.game_id,s.team_id,s.kickoff_utc,s.observed_at,x.gsis_id,x.espn_athlete_id,
coalesce(p.value->>'name',p.value->'athlete'->>'displayName') as player_name,
p.value->>'status' as injury_status,
coalesce(p.value->>'date',p.value->'raw_espn'->>'date') as injury_reported_at,
(p.value->>'status' = any(array['Out','Injured Reserve','Doubtful','Questionable'])) as impacts_availability,
'verified_identity_only'::text as identity_rule
from public.engine_c_espn_injury_snapshots s
cross join lateral jsonb_array_elements(s.players) p(value)
join public.nfl_studio_espn_player_crosswalk x
on x.espn_athlete_id=coalesce(nullif(p.value->>'espn_id',''),substring(p.value->'athlete'->'links'->0->>'href','/id/([0-9]+)'))
where x.match_method=any(array['manual_verified','official_reference'])
and s.observed_at=(select max(s2.observed_at) from public.engine_c_espn_injury_snapshots s2 where s2.game_id=s.game_id and s2.team_id=s.team_id);
