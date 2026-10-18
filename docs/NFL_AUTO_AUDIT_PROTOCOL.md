# NFL Studio — audit automatique et recalibration Elo

## Obligation principale
Archiver **avant le kickoff** chaque TOP 5 de chaque rencontre et chaque TOP 5 general, ainsi que leurs versions par categorie (Moneyline, spreads, totaux, props, Heavyballs). Sauvegarder aussi les candidats analyses et rejetes pour mesurer le biais de selection.
Toute prediction doit porter: game_id, bookmaker, cotes decimales, marche, seuil, cote observee a, probabilite, EV, modele/version, date de calcul, deadline kickoff et donnees sources.

## Cycle de verification
1. Avant les matchs: ecrire des snapshots immuables; idempotence par hash des predictions (mais conserver la nouvelle version si les cotes/probabilites changent).
2. Apres les matchs: lire les scores et les stats finales OFFICIELLES; regler win/loss/push/void (regles du bookmaker, DNP, overtime) et sauvegarder la provenance.
3. Auditer chaque categorie: ROI a cotes archivees, Brier, logloss, frequences reelles par tranche de probabilite, biais over/under, exactitude, rendement relativement aux probabilites implicites sans vig.
4. Auditer contextes: blessures documentees avant match, temps de jeu, starter QB, adversaire, lignes surestimees, fausses probabilites de queue, echantillons par poste et joueur.
5. Recalibration sur periode d'entrainement uniquement; valider sur periode future reservee chronologiquement; comparer au modele courant et au marche.
6. Proposer un changement seulement si calibration hors echantillon s'ameliore et si l'echantillon est suffisant. Exiger un rapport et une validation avant activation; conserver l'ancienne version et permettre rollback.
7. Aucune modification des probabilites historiques; aucun resultat futur dans les features pre-match.

## Etat verifie au 2026-10-17
Table nfl_studio_top5_snapshots creee en Supabase, avec selections JSONB et colonnes settlement/graded_at.
Le stockage automatique depuis toutes les pages et le reglement automatique ne sont PAS encore branches ni testes. Les journaux historiques detailles sont vides.
Le moteur Elo reconstruit n'a pas reproduit les 68,73% en test prospectif.
Ne pas annoncer que l'auto-apprentissage est actif tant que des tests d'insertion, settlement, puis audit/calibration hors echantillon n'ont pas ete faits.
