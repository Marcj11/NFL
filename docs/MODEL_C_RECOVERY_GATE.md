# Moteur C - recuperation et blocage des probabilites non verifiees

2026-10-17. Correctif isole, aucun changement aux moteurs A et B.

## Regle produit approuvee
Les moteurs A et B alimentent C. Toutes les surfaces NFL (accueil, matchs, fiches d'equipes, top paris, EV, analyses) affichent uniquement les probabilites publiees par **C**, avec sa version, sa date de calcul et son identifiant de match exact. Ne jamais substituer A, B, un rapport de l'ancien EXPERT NFL Sites, une preview, ni une moyenne 50/50.

## Resultats historiques retrouves dans app/forecast-audit.tsx
- Developpement 2025, 284 matchs : Brier A simplifie 0.2217, B 0.2182, 50/50 0.2167.
- Validation chronologique 2026, 78 matchs : Brier A simplifie 0.2297, B 0.2494, 50/50 0.2366.
- 34 matchs serres : A 0.2484, B 0.2655, 50/50 0.2532, 75/25 0.2499.
- 44 autres matchs : A 0.2152, B 0.2370, 50/50 0.2238, 75/25 0.2189.
Ces resultats n'etablissent pas une formule C approuvee pour la production. Ne pas les utiliser comme modele de production.

## Verification reelle
- Supabase compact: nfl_studio_forecast_audit a des model_name A simple-historical-scores-v0, B independent-recent-winrate-v1, baseline, mais pas de version C identifiee.
- prediction_runs, nfl_studio_prediction_journal, nfl_studio_pregame_prediction_audit: aucune ligne dans les verifications.
- GET /api/engine-conductor renvoie explicitement experimentalBlend=(A+B)/2 et topFiveInfluence:false.
- GET /api/public-model-preview est experimental:true, verified_lines:false, betting_recommendations:false.
- GET /api/expert-nfl lit des archives du site EXPERT NFL distinct.
- NFL Studio affiche actuellement des probabilites issues de plusieurs sources. Ne pas qualifier l'une d'elles de C.

## Go/no-go avant deploiement
1. Retrouver les coefficients et la logique C **approuves** (ou obtenir validation utilisateur pour une nouvelle calibration).
2. Prouver les deux entrees A/B du meme match, memes temps de coup d'envoi et limites de donnees.
3. Obtenir sortie C horodatee et versionnee, independamment de l'UI.
4. Ajouter une route unique C et remplacer TOUTES les sources de probabilites en NFL, sans fallback silencieux.
5. QA pour Texans-Jaguars: meme probabilite partout, aucune cote/EV sans calcul compatible de C et horodatage visible.
6. Validation build + verification preview + decision explicite avant promotion.

STATUT ACTUEL: NO GO. Ne pas remplacer les valeurs par les anciennes moyennes ou les rapports de l'ancien site.
