create table if not exists public.nfl_studio_kicker_weekly_v1 (player_id text not null, season int not null, week int not null, metrics jsonb not null default '{}'::jsonb, primary key(player_id,season,week));
alter table public.nfl_studio_kicker_weekly_v1 enable row level security;
