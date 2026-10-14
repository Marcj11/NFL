# NFL Studio — Audit des données A à Z (phase 0, 2026-10-13)

## Verdict
Infrastructure actuelle NON prête pour recommandations. Le diagnostic ESPN Bills–Rams a validé score + 4 valeurs d'un match terminé, pas la disponibilité historique complète, la latence live, la détermination QB titulaire, ni la consommation réelle des données par un moteur prédictif. L'ancienne plateforme EXPERT NFL demeure intacte; ses chiffres ne sont pas fiables sans nouvelle vérification.

## Constat vérifié dans GitHub Marcj11/NFL
- app/api/games/route.ts appelle scoreboard ESPN non officiel (2026, saison régulière, semaine 1..18), cache 300 s, retourne seulement ID, date, score, statut et équipes.
- Ne collecte ni QB partant, ni historique individuel, ni blessures, ni météo, ni play-by-play, ni profondeur de banc, ni snap counts, ni données adversaires, ni contexte possessions.
- app/api/diagnostics/espn/route.ts compare un seul match terminé, score + quatre stats joueurs; ne mesure PAS latence live.
- app/api/odds/route.ts est verrouillé sur démo publique; pas de pipeline cotes ni historique.
- Supabase/MCP centralisés absents. Aucune intégration de probabilités versionnées à la plateforme n'est confirmée.
- Le plugin EXPERT NFL Recherche v1.2 contient documentation, pas encore moteur de données/MCP.

## Champs minimaux par lot et critères d'acceptation
1. Identités: gsis_id, espn_id, team_id, saison, franchise/roster historique, alias, timestamps. Test: zéro collision non résolue et chaque match/joueur aligné avec source secondaire.
2. Calendrier/résultats: id stable, saison/semaine/stage, kickoff UTC, home/away, lieu, status, scores par quart, OT. Test: exhaustivité 2021–2026, tous matchs programmés et joués; crosscheck NFL officiel; exceptions explicites.
3. Joueurs: participations snaps, starts, targets, receptions, routes, carries, passing, efficiency, boxscore, play by play. Test: distinctions DNP/inactif/zéro stat, total match ↔ joueurs; joindre par ID pas par nom.
4. QB: starter projeté, déclaré, confirmé (source+publié+validité), QB ayant joué, remplaçant et snaps. Test de régression obligatoire: changer QB déclenche recalcul effectif, trace de feature changement, recalcul empêché sans statut valide.
5. Blessures: rapports quotidiens, inactifs officiels, pratiques, date publication vs ingestion, absence éventuelle. Test: information connue AVANT bet_timestamp uniquement.
6. Avancé: EPA/play, success rate, CPOE, pace, pass rate over expected, red zone, pressure, coverage, opposition quality, data dictionary; interdire doubles comptages et fuite vers futur.
7. Contexte: days rest, déplacement, voyage, weather forecast as-of decision, coaching scheme and personnel. Source/time check obligatoire.
8. Odds: bookmaker, juridiction, event_id mapping, opening/snapshot/closing if actually observed, market key, line decimal odds, book rules OT/void/push; no invented history; manually refreshed quota bounded.
9. Props: athlete mapping, position, settled rule by book, stat from official endpoint, snap participation; distinguish actual stat from model probability.
10. Stakes and decisions: forecast frozen, feature_snapshot_hash, model SHA, odds observed, approved stake CAD, settle outcome, correction append-only, audit + reconciliation.

## Qualité et usages
- États: VERIFIED, PROVISIONAL, MISSING, CONFLICT, STALE (séparés pour fraîcheur et exactitude).
- Source primaire, secondaire, méthode, horodatage source/ingestion, licence, coverage, version de schéma.
- Règle STOP: si attribut critique absent, pas de recommandation; pas de probabilité inventée; jamais remplacer par dernière apparition QB.
- Règle fraîcheur: seuil par champ (QB/inactifs avant match, odds au moment de demande, scores/stat live à définir après mesure).
- Preuve d'usage: journal forecast -> ensemble IDs d'entrées + timestamp as-of + features numériques + modèle SHA; tests d'injection QB, blessure, odds et version source.
- Validation chronologique: snapshots historiques point-in-time (notamment injuries et prix non reconstituables rétroactivement), couverture > seuil défini par marché, rapports data-quality, évitement survivorship/selection/look-ahead bias.

## Ordre impératif des travaux
A. Audit complet des sources disponibles, légalité/licences/limites et champs par marché;
B. Base Supabase gratuite créée et schéma versionné (pas encore faite);
C. Pipeline ingestion brut append-only, normalisation/matching, contrôles automatiques; 
D. Collecte backfill historique NFL officiellement autorisée et état de couverture, snapshots actifs;
E. Tests de fiabilité entre fournisseurs + cadence live et détection corrections;
F. Simulateur de trace prouvant que le modèle utilise bonnes données avant tout entraînement/conseil.

## Contraintes
Pas d'abonnement payé, pas de clés client ni de dépense API automatique, pas de paris externes, pas de modification de l'ancien EXPERT NFL. Ne jamais annoncer un pipeline fonctionnel sur la base de ce cahier.
