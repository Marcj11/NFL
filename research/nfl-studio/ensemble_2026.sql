-- NFL Studio research ensemble v0.3. READ-ONLY.
-- Season 2026 retrospective evaluation; excludes tied games.
-- Source data game_results/game_plays are retrospective; pregame publication timing NOT verified.
WITH g AS (
 SELECT a.game_id,a.season,a.kickoff_utc,a.home_team_id,a.away_team_id,b.home_score,b.away_score
 FROM games a JOIN game_results b USING(game_id)
 WHERE a.season BETWEEN 2023 AND 2026 AND b.home_score<>b.away_score
), p AS (
 SELECT game_id,offense_team team,sum(epa) e,count(epa) n
 FROM game_plays WHERE epa IS NOT NULL AND offense_team IS NOT NULL GROUP BY 1,2
), t AS (
 SELECT g.game_id,g.season,g.kickoff_utc,g.home_team_id team,
 (g.home_score>g.away_score)::int won,
 coalesce(h.e,0)-coalesce(a.e,0) net,coalesce(h.n,0) plays
 FROM g LEFT JOIN p h ON h.game_id=g.game_id AND h.team=g.home_team_id
 LEFT JOIN p a ON a.game_id=g.game_id AND a.team=g.away_team_id
 UNION ALL
 SELECT g.game_id,g.season,g.kickoff_utc,g.away_team_id,
 (g.away_score>g.home_score)::int,
 coalesce(a.e,0)-coalesce(h.e,0),coalesce(a.n,0)
 FROM g LEFT JOIN p h ON h.game_id=g.game_id AND h.team=g.home_team_id
 LEFT JOIN p a ON a.game_id=g.game_id AND a.team=g.away_team_id
), f AS (
 SELECT g.game_id,g.season,(g.home_score>g.away_score)::int y,
 count(t.game_id) FILTER(WHERE t.team=g.home_team_id) hn,
 coalesce(sum(t.won) FILTER(WHERE t.team=g.home_team_id),0) hw,
 count(t.game_id) FILTER(WHERE t.team=g.away_team_id) an,
 coalesce(sum(t.won) FILTER(WHERE t.team=g.away_team_id),0) aw,
 count(t.game_id) FILTER(WHERE t.team=g.home_team_id AND t.season=g.season) hsn,
 coalesce(sum(t.won) FILTER(WHERE t.team=g.home_team_id AND t.season=g.season),0) hsw,
 count(t.game_id) FILTER(WHERE t.team=g.away_team_id AND t.season=g.season) asn,
 coalesce(sum(t.won) FILTER(WHERE t.team=g.away_team_id AND t.season=g.season),0) asw,
 coalesce(sum(t.net) FILTER(WHERE t.team=g.home_team_id),0) he,
 coalesce(sum(t.plays) FILTER(WHERE t.team=g.home_team_id),0) hp,
 coalesce(sum(t.net) FILTER(WHERE t.team=g.away_team_id),0) ae,
 coalesce(sum(t.plays) FILTER(WHERE t.team=g.away_team_id),0) ap
 FROM g LEFT JOIN t ON t.kickoff_utc<g.kickoff_utc
 AND t.team IN(g.home_team_id,g.away_team_id)
 WHERE g.season=2026
 GROUP BY g.game_id,g.season,g.home_score,g.away_score
), pr AS (
 SELECT y,v.name,
 greatest(0.05,least(0.95,0.54+
 0.70*((1-v.w)*((hw+6.0)/(hn+12.0)-(aw+6.0)/(an+12.0))+
 v.w*((hsw+3.0)/(hsn+6.0)-(asw+3.0)/(asn+6.0)))+
 v.e*(he/(hp+200.0)-ae/(ap+200.0)))) probability
 FROM f CROSS JOIN (VALUES
 ('original',0.0,0.0),
 ('recency',0.75,0.0),
 ('ensemble_epa',0.75,0.3)) v(name,w,e)
)
SELECT name,count(*) games,count(*) FILTER(WHERE (probability>=0.5)=(y=1)) correct,
 round(100*avg(((probability>=0.5)=(y=1))::int),2) accuracy,
 round(avg(power(probability-y,2))::numeric,5) brier
FROM pr GROUP BY name ORDER BY name;
