# NFL Studio : moteur statistique multi-postes — spécification v0.1
Date 2026-10-13. Statut : architecture de recherche, PAS prédicteur validé. Aucun calcul de mise réelle avant calibration hors échantillon.

## Filiations scientifiques
- Bill James : séparer processus et résultat, estimer victoire attendue à partir des points pour/contre (Pythagorean expectation; exposant sportif à estimer, ne pas réutiliser baseball mécaniquement). MLB https://www.mlb.com/glossary/advanced-stats/pythagorean-winning-percentage
- nflfastR : modèles EP, WP, CP, xYAC, xPass, correction époque/calibration. https://github.com/nflverse/open-source-football/blob/master/_posts/2020-09-28-nflfastr-ep-wp-and-cp-models/nflfastr-ep-wp-and-cp-models.Rmd
- nflfastR modèles open source https://github.com/nflverse/fastrmodels ; code EP https://github.com/nflverse/nflfastR/blob/master/R/ep_wp_calculators.R
- NFL Next Gen Stats : CP selon air distance, separation, rush, vitesse, temps lancer. https://www.nfl.com/news/next-gen-stats-introduction-to-completion-probability-0ap3000000964655
- NGS expected rushing yards sur tracking à la remise : https://www.nfl.com/news/next-gen-stats-intro-to-expected-rushing-yards
- nfl_data_py ARCHIVÉ 2025, remplacé par nflreadpy https://github.com/nflverse/nfl_data_py

## Modèle génératif hiérarchique
1. Couche rostering et disponibilité: pour tout joueur p à l'instant t, P(active), P(snap|active), distribution usage conditionnelle; QB starter projeté/confirmé daté, inactifs. NE PAS substituer ancien QB.
2. Couche matchups: attaque (QB, OL par poste LT LG C RG RT, RB, WR, TE, coordonnateur) × défense (front7, pass rush, LB, corners, safeties, scheme) × contexte (home, météo, repos, stade, score). Effets équipe/joueur régularisés (partial pooling) et interactions, données manquantes → incertitude.
3. Simulation possession et plays: N possessions/plays; choix pass/run via prob conditionnelle (situation, score, personnel, coach, adversaire); distributions de gains, turnovers, sacks, pénalités, touchdowns et 4e down. Propager la position, temps, score, possession jusqu'à fin réglementaire + OT si règlement applicable.
4. Outputs cohérents tirés des MÊMES simulations: score pair (home,away), victoire/nul/OT, écart, total, stats joueurs. Conservation: yards reçues par joueur <= yards passing équipe + conventions nettes, attempts/catches cohérents, snap counts par poste, touchdowns et drive points vérifiés.
5. Moneyline: moyenne de l'indicateur gagnant selon settlement. Spread -L: P(marge>L), P(marge=L), P(marge<L). Props ligne q: P(Y>q), P(Y=q), P(Y<q), règles DNP/void et OT. EV nette avec push: p_win*(o-1)-p_loss; ne jamais coder p*(o-1)-(1-p) en présence de p_push.
6. Injury recalculation: modifier roster de scénario, redistribution conditionnelle des snaps/routes/targets, modifier protection OL et pression QB, run blocking, coverage; relancer toutes simulations avec seed contrôlée. Produire différence causale de scénario conditionnelle (pas prétendre causalité identifiée). Tester reversion sans blessure.
7. Styles: tester man/zone, blitz/no blitz, 12/11 personnel, pace, neutral pass rate, run gap/zone. Si indisponible pas inventer: scénarios avec intervalle élargi ou abstention.
8. Monte Carlo: 20 000+ simulations paramétrables selon convergence, corrélations via état commun de jeu (pas des props indépendantes); quantifier variance Monte Carlo et incertitude paramètres séparément.
9. Validation: split rolling-origin chronologique, aucun futur, calibrations Brier/logloss, distributions de points via scoring rules, prop PIT/CRPS, alternatives baseline marché sans marge, ablations QB/OL/coverage, drift saison, performance par position et marché.
10. Data contracts: id joueurs stable multi-provider, observed_at/published_at/ingested_at, as_of_cutoff, raw source, qualité et licence; roster/warnings; hash des features; sortie déterministe reproductible et tests invariants.

## Plan concret
PHASE 1: cataloguer et vérifier légalement sources historiques et stat live, identifier champs manquants, consolider nflreadpy/nflverse, ESPN et données propriétaires sous droits.
PHASE 2: Supabase schema + ingest brut immuable, audits croisés, historique PIT.
PHASE 3: baseline points/possessions, forecast distributions, calibrer; ajouter postes un à un mesurant gain OOS.
PHASE 4: scénario blessures/QB et matchups; simulation cohérente.
PHASE 5: cotes manuelles, contrôle budget gratuit et pipeline de décision.
Statut actuel : document scientifique ajouté, aucune simulation de production ni source payante.
