# NFL Studio — Recalcul universel des disponibilites joueurs v0.1
Date 2026-10-13. Statut: specifications, NON implante ni calibre.
Règle obligatoire: chaque changement de statut de TOUS les joueurs et personnels importants (pas seulement QB) declenche une invalidation des projections affectees, suivi d'un recalcul et de tests. Personne n'est considere negligeable a priori. L'effet chiffre peut etre voisin de zero apres estimation, mais l'evenement ne doit jamais etre ignore.

## Donnees a accumuler par joueur/blessure
- Identifiant stable, equipe/date, position et role reel (formation, special teams, backup), profondeur et remplacement probable.
- Nature de la blessure et statut public autorise, rapport de pratique, limitation de participation, dates de publication et fiabilite; DNP/out/questionable et activation officielle.
- Snaps par position, routes, targets, carries, dropbacks, rush attempts, pressure, cover snaps, blocages, alignements, formations, precedents de retour seulement si dates sont connues AVANT le match.
- Expositions variables et incertitude : probabilite active, part de snaps, redistribution conditionnelle d'opportunites, performance diminuée possible, remplacements multiples.
- Relations de dependance et style adversaire; statut utile au kickoff et scenario alternatif lorsque incertain.

## Propagation des impacts (hypotheses a ajuster sur donnees)
QB -> WR/TE/RB, OL, pass/run, sacks, redzone, turnovers.
LT/LG/C/RG/RT -> protection QB, jeu au sol, scrambles, pression adverse, receveurs; ne pas traiter toute la OL comme un score unique.
WR/TE -> couverture defensive, routes, cibles redistribuees, separation, OL via protections TE.
RB/FB -> courses, reception, protection passe, formation/personnel.
DL/EDGE -> pression, temps QB, run defense, couverture indirecte, tactiques de blitz.
LB -> course, TE/RB coverage, blitz, defensive substitutions.
CB/S/Nickel -> assignments man/zone, explosive plays, safety help, blitz/coverage, redistribution cibles.
K/P/LS -> field goal/extra point, punt, field position, drives/expected points.
Returners/ST/gunners -> return yards, field position, penalties, touchback risk.
Coach/playcaller injury/absence/changement -> personnel, timing, calls; enregistrer cause et horodatage.
Multi-injuries -> joint simulations, conserver interactions non lineaires; ne pas simplement additionner deux ajustements independants.

## Contrat de recalcul
Pour chaque statut change: (1) snapshot immuable; (2) invalidation de toutes features utilisant ce joueur, sa position, ses adversaires, ses remplacements et correlations; (3) generation scenarios d'alignements avec poids; (4) simulation conjointe marge, total et props; (5) comparer avant/apres par marche avec intervalle d'incertitude; (6) audit source + publication + hash; (7) aucun pari si manque critical/low confidence.
Tests: chaque position couverte dans matrice de propagation; retrait + retablissement; permutation de remplaçants; double blessure et interaction, statut incertain; toute recommandation bloque si simulation non recalculee apres update.
Pas d'extraction automatique de donnees de santé privees; uniquement statuts et participation publiquement communiques sous droits autorises. Aucune annonce de precision sans calibration.
