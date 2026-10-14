# NFLverse : analyse effective des 24 tests de couverture (2026-10-14 UTC)
Source primaire interne: diagnostics/nflverse-coverage.json, créé 2026-10-14T02:43:35.408492+00:00.
## Volumes
|Dataset|2024|2025|2026|
|---|---:|---:|---:|
|Calendrier|285|285|272|
|Play-by-play|49492|48771|13842|
|Statistiques joueurs|18983|19422|5506|
|Rosters weekly|46579|46849|15293|
|Snap counts|26615|26613|7370|
|Blessures|6215|6068|1413|
|Participation|45919|45184|erreur: saison 2016–2025 seulement|
|FTN charting|48031|47316|13438|

23 requêtes sur 24 statut ok. **Statut ok != complet, exact ou frais.** 2026 saison en cours, calendrier 272 comprend futurs matchs.

## Découvertes critiques
1. Blessures 2025/2026 récupérées contrairement à notre hypothèse précédente de source arrêtée en 2024. Il faut CORRIGER nos notices : la fonction load_injuries a retourné 6068 et 1413 lignes, sous réserve de source/fraîcheur/horodatage/validation officielle.
2. Participation détaillée 2026 n'est pas actuellement exposée (erreur saison must be between 2016 and 2025), donc les schémas man/zone et tracking par jeu en 2026 risquent de manquer de données. Détecter substitution.
3. 372 colonnes PBP et 150 colonnes player_stats; grande quantité de NA structurels: PBP pass_length 62.4–62.6% NA car inapplicable non-passes, yards_after_catch 75.5–75.9%, run_gap 77.5–78.9%; à mesurer SEULEMENT sur jeux pertinents. Player_stats passing_cpoe ~96.3–96.7% NA parce que beaucoup de joueurs non-QB, pas conclure automatiquement mauvais dataset. Pour injuries report_status ~54–57% NA peut refléter pratique sans désignation; vérifier.
4. snap_counts 16 colonnes, zéro valeur NA pour 2024/25/26; important mais vérifier complétude des équipes/semaines.
5. ftn_charting 29 colonnes, presque aucun NA, mais source saison/codage à vérifier et absent != zéro pas prouvé.
6. schedules 2026 : score absent 70.96% (matchs pas encore joués), cotes +/- 60.66% NA; ne pas utiliser ces cotes implicites comme base rétrospective horodatée.

## Étape qualité v0.2
Mesurer conditionnellement : PBP pass_location/air_yards uniquement pass_attempt, run_location/run_gap uniquement rush, YAC receptions seulement; player passing EPA/CPOE seulement QB dropbacks et éligibilité; injuries report_status seulement lorsqu'un rapport officiel existe. Au lieu des taux globaux, produire coverage=(valids parmi lignes eligible)/(lignes eligible), avec dénominateur documenté.
Exiger contraintes de jointure GSIS/player_id/game_id; dates publication as-of; tests équipe/score; contrôle absence d'équipe et position; match stat sums; duplicate IDs; contrôle historique all years 1999+ nécessaire pour expertise multi-saisons.
Créer registre metadata de chaque dataset (licence, endpoint, cadence, timestamp, unit of observation, schema version, exposure).
## Priorités de développement
P0: tests conditionnels et identité pour 2024/25/26; vérifier reproduction des résultats et QB.
P1: établir accès prospectif aux blessures/rosters officiels et stade/météo, coverage style playcall; historique forecasts unavailable sans snapshots.
P2: ingestion et hash de données brutes, backfill longue période, calibration et modèle.
Aucune recommandation de mise ; simulateur actuel coefficients illustratifs.
