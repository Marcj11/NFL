-- Applied on Supabase project nfl-studio at ca-central-1.
-- Migration nfl_extended_statistics_and_indexing; DDL reference.
-- Add schemas for normalized advanced data; all default RLS deny.
create table if not exists public.pbp_plays(
 game_id text not null references public.games(game_id), play_id bigint not null,
 season integer not null, posteam text, defteam text, quarter integer,
 game_seconds_remaining integer, down integer, ydstogo integer,
 yardline_100 numeric, play_type text, epa numeric, wp numeric,
 passer_gsis_id text, rusher_gsis_id text, receiver_gsis_id text,
 source_snapshot_id uuid not null references public.raw_snapshots(snapshot_id),
 primary key(game_id,play_id,source_snapshot_id));
create table if not exists public.player_game_statistics(
 game_id text not null references public.games(game_id),
 player_id uuid not null references public.players(player_id),
 team_id text not null references public.teams(team_id),
 stat_key text not null, stat_value numeric,
 source_snapshot_id uuid not null references public.raw_snapshots(snapshot_id),
 primary key(game_id,player_id,stat_key,source_snapshot_id));
create table if not exists public.player_week_rosters(
 season integer not null, week integer not null,
 player_id uuid not null references public.players(player_id),
 team_id text not null references public.teams(team_id),
 position text, roster_status text,
 source_snapshot_id uuid not null references public.raw_snapshots(snapshot_id),
 primary key(season,week,player_id,source_snapshot_id));
create table if not exists public.coach_assignments(
 id uuid primary key default gen_random_uuid(),coach_name text not null,
 team_id text not null references public.teams(team_id),
 role text not null,valid_from date not null,valid_to date,
 source_snapshot_id uuid references public.raw_snapshots(snapshot_id),
 check(valid_to is null or valid_to>=valid_from));
create table if not exists public.weather_snapshots(
 id uuid primary key default gen_random_uuid(),
 game_id text not null references public.games(game_id),
 forecast_issued_at timestamptz not null,observed_at timestamptz not null,
 temperature_c numeric,wind_kph numeric,wind_gust_kph numeric,precipitation_mm numeric,
 roof_status text,source_snapshot_id uuid not null references public.raw_snapshots(snapshot_id));
create table if not exists public.data_quality_events(
 event_id bigint generated always as identity primary key,
 source_snapshot_id uuid references public.raw_snapshots(snapshot_id),
 severity text not null check(severity in ('info','warning','critical')),
 rule_code text not null, affected_entity text,
 details jsonb not null default '{}'::jsonb,
 resolved_at timestamptz,created_at timestamptz not null default now());
create index if not exists ix_availability_player on public.availability_reports(player_id);
create index if not exists ix_availability_source on public.availability_reports(source_snapshot_id);
create index if not exists ix_forecast_game on public.forecast_runs(game_id);
create index if not exists ix_games_home on public.games(home_team_id);
create index if not exists ix_games_away on public.games(away_team_id);
create index if not exists ix_odds_source on public.odds_snapshots(source_snapshot_id);
create index if not exists ix_snaps_player on public.player_game_snaps(player_id);
create index if not exists ix_snaps_source on public.player_game_snaps(source_snapshot_id);
create index if not exists ix_snaps_team on public.player_game_snaps(team_id);
create index if not exists ix_pbp_source on public.pbp_plays(source_snapshot_id);
create index if not exists ix_stats_source on public.player_game_statistics(source_snapshot_id);
create index if not exists ix_stats_player on public.player_game_statistics(player_id);
create index if not exists ix_stats_team on public.player_game_statistics(team_id);
create index if not exists ix_roster_player on public.player_week_rosters(player_id);
create index if not exists ix_roster_team on public.player_week_rosters(team_id);
create index if not exists ix_roster_source on public.player_week_rosters(source_snapshot_id);
create index if not exists ix_coach_team on public.coach_assignments(team_id);
create index if not exists ix_coach_source on public.coach_assignments(source_snapshot_id);
create index if not exists ix_weather_game on public.weather_snapshots(game_id);
create index if not exists ix_weather_source on public.weather_snapshots(source_snapshot_id);
create index if not exists ix_quality_source on public.data_quality_events(source_snapshot_id);
do $block$
declare t text;
begin
 foreach t in array array['pbp_plays','player_game_statistics','player_week_rosters','coach_assignments','weather_snapshots','data_quality_events']
 loop
  execute format('alter table public.%I enable row level security',t);
  execute format('revoke all on public.%I from anon,authenticated',t);
 end loop;
end $block$;
