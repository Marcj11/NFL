-- NFL Studio: versioned database schema. NOT APPLIED UNTIL SUPABASE CONNECTED.
begin;
create extension if not exists pgcrypto;
create table if not exists public.source_registry (
 id uuid primary key default gen_random_uuid(), source_name text not null unique,
 source_url text not null, license_status text not null default 'unreviewed',
 approved_for_ingestion boolean not null default false,
 checked_at timestamptz, created_at timestamptz not null default now());
create table if not exists public.teams (
 team_id text primary key, display_name text not null);
create table if not exists public.players (
 player_id uuid primary key default gen_random_uuid(),
 gsis_id text unique, pfr_id text unique, espn_id text unique,
 display_name text, updated_at timestamptz not null default now(),
 check (gsis_id is not null or pfr_id is not null or espn_id is not null));
create table if not exists public.games (
 game_id text primary key, season integer not null,
 week integer, kickoff_utc timestamptz not null,
 home_team_id text not null references public.teams(team_id),
 away_team_id text not null references public.teams(team_id),
 status text not null default 'scheduled',
 check(home_team_id<>away_team_id));
create table if not exists public.raw_snapshots (
 snapshot_id uuid primary key default gen_random_uuid(),
 source_id uuid not null references public.source_registry(id),
 record_type text not null, external_event_id text, external_player_id text,
 source_published_at timestamptz, observed_at timestamptz not null,
 ingested_at timestamptz not null default now(),
 payload jsonb not null, content_sha256 text not null,
 quality_status text not null default 'provisional'
 check (quality_status in ('provisional','verified','quarantined','conflict')),
 unique(source_id,record_type,content_sha256));
create table if not exists public.identity_exceptions (
 exception_id uuid primary key default gen_random_uuid(), provider text not null,
 external_id text not null, season integer not null, team_id text,
 reason text not null, status text not null default 'quarantined'
 check(status in ('quarantined','verified','discarded')),
 evidence_url text, created_at timestamptz not null default now());
create table if not exists public.player_game_snaps (
 id bigint generated always as identity primary key,
 game_id text not null references public.games(game_id),
 player_id uuid not null references public.players(player_id),
 team_id text not null references public.teams(team_id),
 offense_snaps integer, defense_snaps integer, special_snaps integer,
 source_snapshot_id uuid not null references public.raw_snapshots(snapshot_id),
 check ((offense_snaps is null or offense_snaps>=0) and
        (defense_snaps is null or defense_snaps>=0) and
        (special_snaps is null or special_snaps>=0)),
 unique(game_id,player_id,source_snapshot_id));
create table if not exists public.availability_reports (
 report_id uuid primary key default gen_random_uuid(),
 player_id uuid not null references public.players(player_id),
 game_id text not null references public.games(game_id),
 report_type text not null, participation_status text,
 source_snapshot_id uuid not null references public.raw_snapshots(snapshot_id),
 published_at timestamptz not null);
create table if not exists public.odds_snapshots (
 quote_id uuid primary key default gen_random_uuid(),
 game_id text not null references public.games(game_id),
 bookmaker text not null, jurisdiction text not null, market text not null,
 selection text not null, line numeric,
 decimal_odds numeric not null check (decimal_odds>1),
 observed_at timestamptz not null,
 source_snapshot_id uuid not null references public.raw_snapshots(snapshot_id));
create table if not exists public.forecast_runs (
 run_id uuid primary key default gen_random_uuid(),
 game_id text not null references public.games(game_id),
 as_of timestamptz not null, model_commit_sha text not null,
 input_snapshot_hash text not null, output jsonb not null,
 validation_status text not null default 'blocked'
 check (validation_status in ('blocked','experimental','validated')),
 created_at timestamptz not null default now());
create index if not exists ix_raw_snapshots_type_date on public.raw_snapshots(record_type,observed_at desc);
create index if not exists ix_availability_reports_game_pub on public.availability_reports(game_id,published_at desc);
create index if not exists ix_odds_snapshots_game_date on public.odds_snapshots(game_id,observed_at desc);
do $block$
declare t text;
begin
 foreach t in array array['source_registry','teams','players','games','raw_snapshots','identity_exceptions','player_game_snaps','availability_reports','odds_snapshots','forecast_runs']
 loop
  execute format('alter table public.%I enable row level security',t);
  execute format('revoke all on table public.%I from anon, authenticated',t);
 end loop;
end $block$;
commit;
