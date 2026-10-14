# EXPERT NFL : catalogue de collecte v0.1 (13 octobre 2026)
Statut : inventaire et exigences, PAS de collecte en service.

## Principes
Accumuler un maximum de données **licites, utiles, vérifiables**, sans inventer la couverture. Sauvegarder version brute immuable, source/URL, droits d'utilisation, ID source, UTC published_at/observed_at/ingested_at, statut de qualité, version du schéma, transformations et hash de calcul. Ne jamais confondre absent avec zéro, ni connaissance postérieure avec prévision d'avant-match.

## P0 — indispensable
- Franchise, équipe, lieu, stade, saison, semaine, date UTC, score/OT, jeu par jeu, EPA, possession, down/distance, position terrain.
- Joueurs : ID GSIS/ESPN/PFR, historique équipe, position, statut actif/DNP, rosters hebdomadaires, snaps par poste.
- QB partant attendu et confirmé, remplacements, circonstances et horodatage de publication; blessure et inactifs.
- Stats individuelles et équipe, cohérence boxscore vs play-by-play, statut officiel.
- Marché : bookmaker, juridiction, type, sélection, seuil, cote décimale, timestamp et règles OT/push/DNP; historique seulement si réellement enregistré.

## P1 — essentiel pour le moteur multi-postes
- QB : EPA/dropback, CPOE, pression, sacks, temps avant lancer, air yards, scrambles, couverture adverse.
- RB : snaps, carries, routes, targets, efficacité, box personnel, défense run, blocking OL.
- WR/TE : snaps, targets, routes si accessibles, separation/air yards si disponibles, slot/outside, coverage et style man/zone.
- OL : disponibilité individuelle LT/LG/C/RG/RT, continuité, pénalités, protection, run blocking si métriques accessibles légalement.
- Défense : DL/LB/CB/S disponibilité, pass rush, coverage, pressure, blitz/zone/man (couverture à vérifier), missed tackles.
- Entraîneurs : période en poste HC/OC/DC, call plays, situation score, pass rate over expected, pace, personnel 11/12, quatrième essai.
- Météo AS-OF: vent, rafales, pluie, neige, température, toiture, prévisions publiées AVANT match; pas météo observée après le match pour backtest.
- Repos, voyage, altitude, surface, décalage horaire; occasions et matches d'oppositions.
- Props : attempts, completions, receptions, passing/rushing/receiving yards, TD, interceptions et règles exactes.

## P2 — haute valeur potentielle mais accès non garanti
- Trajectoires brutes des 22 joueurs, vitesse/accélération par play, coverage matchup exact; NFL NGS brutes sous accès/licence distincts.
- Charting approfondi FTN/PFR si licence et couverture suffisante; universitaire et rookies, coaching tendencies très fines.
- Historique intra-semaine cotes d'ouverture/fermeture, impossible à inventer si aucun snapshot collecté.

## Sources et limites vérifiées
- nflreadpy https://nflreadpy.nflverse.com/api/load_functions/ : load_pbp données depuis 1999, load_players avec mappings GSIS/ESPN/PFR, load_player_stats, load_team_stats, rosters_weekly, snap_counts, injuries depuis 2009, nextgen_stats, ft n charting, depth_charts, draft_picks, participation, pfr_advstats. Existence d'un loader ne garantit pas couverture toutes saisons/positions.
- nflverse cadence https://nflreadr.nflverse.com/articles/nflverse_data_schedule.html : jeu par jeu mis à jour surtout après match; ne pas confondre live.
- NFL Pro https://support.nfl.com/hc/en-us/articles/35869706651156-NFL-Pro-FAQ-s-and-Answers : données NFL Pro boxscore/play-by-play pendant le match; Next Gen Stats disponibles le lendemain, tracking brut non promis gratuitement.
- ESPN endpoint non officiel : 5/5 vérifications d'un match terminé dans NFL Studio, latence live encore inconnue.
- The Odds API https://the-odds-api.com/liveapi/guides/v4/ : cotes sur demande manuelle uniquement, aucun appel payant en crédits avant budget ledger robuste.

## Architecture base et validation
Tables attendues : source_registry, raw_snapshots, identity_map, games, pbp_plays, player_week, team_week, roster_asof, injuries_asof, starters_asof, coach_stints, weather_forecasts_asof, odds_snapshots, feature_snapshots, forecast_runs, audit_failures.
Tests : couverture par saison/stat/marché; identité sans collision; agrégats joueurs=équipe selon définition; score final et événements cohérents; publication et timestamp; fraîcheur; correction append-only; moteur prouve données utilisées avec hash/versions; tests d'injection changement QB/OL/WR/CB/coach/météo; split temporel hors échantillon.
Données fondamentales absentes ou contradictoires = état PASSER. Ce document est un cahier de collecte, pas la preuve d'une base remplie ni d'un moteur calibré.
