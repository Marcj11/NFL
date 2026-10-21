-- NFL Studio baseline v0.1; retrospective, not production; evaluation 2025.
-- Simple pregame team win-rate prior using games from 2023 until each kickoff.
-- Parameters are experimental; never claim these have been validated for wagering.
WITH completed AS (
 SELECT g.game_id,g.season,g.kickoff_utc,g.home_team_id,g.away_team_id,
        r.home_score,r.away_score
 FROM public.games g JOIN public.game_results r USING(game_id)
 WHERE g.season BETWEEN 2023 AND 2025 AND r.home_score<>r.away_score
), trials AS (
 SELECT g.game_id,g.season,g.kickoff_utc,
        g.home_score>g.away_score AS home_won,
        (SELECT count(*) FROM completed p WHERE p.kickoff_utc<g.kickoff_utc AND (p.home_team_id=g.home_team_id OR p.away_team_id=g.home_team_id)) AS home_n,
        (SELECT count(*) FROM completed p WHERE p.kickoff_utc<g.kickoff_utc AND ((p.home_team_id=g.home_team_id AND p.home_score>p.away_score) OR (p.away_team_id=g.home_team_id AND p.away_score>p.home_score))) AS home_w,
        (SELECT count(*) FROM completed p WHERE p.kickoff_utc<g.kickoff_utc AND (p.home_team_id=g.away_team_id OR p.away_team_id=g.away_team_id)) AS away_n,
        (SELECT count(*) FROM completed p WHERE p.kickoff_utc<g.kickoff_utc AND ((p.home_team_id=g.away_team_id AND p.home_score>p.away_score) OR (p.away_team_id=g.away_team_id AND p.away_score>p.home_score))) AS away_w
 FROM completed g WHERE g.season=2025
), forecasts AS (
 SELECT *, greatest(0.05,least(0.95, 0.54+0.70*((home_w+6.0)/(home_n+12.0)-(away_w+6.0)/(away_n+12.0)))) AS p_home
 FROM trials
)
SELECT count(*) AS games,
       count(*) FILTER(WHERE (p_home>=0.5)=home_won) AS correct,
       round(100.0*count(*) FILTER(WHERE (p_home>=0.5)=home_won)/nullif(count(*),0),2) AS accuracy_pct,
       round(avg(power(p_home-(CASE WHEN home_won THEN 1 ELSE 0 END),2))::numeric,4) AS brier
FROM forecasts;
