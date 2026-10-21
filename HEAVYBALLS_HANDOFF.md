# HEAVYBALLS BET — reprise permanente

Derniere mise a jour : 2026-10-20. Document de reference; toujours reverifier les statuts en direct avant toute modification.

## Projets et connexion
- GitHub : Marcj11/NFL, branche de travail `feature/nhl-nfl-component-parity`. Ne pas deployer sur production sans autorisation expresse.
- Supabase : projet `jwetwyqlogowznkidnly`, URL `https://jwetwyqlogowznkidnly.supabase.co`.
- Vercel : projet `nfl-studio`, ID `prj_8HDzE5aBbfNRfbH0PPgqobMtxQX3`, site `https://nfl-studio.vercel.app`.
- CORRECTIF 403 VERCEL CONFIRME : `get_project({idOrName:"prj_8HDzE5aBbfNRfbH0PPgqobMtxQX3"})` fonctionne SANS `teamId`. L'appel avec `teamId` donnait 403. Ne pas redemander de reconnexion avant d'essayer sans `teamId`.
- GitHub Actions utilise les secrets `NFL_SUPABASE_URL` et `NFL_SUPABASE_SERVICE_ROLE_KEY` ; ne jamais afficher ni copier les valeurs en clair. Leur configuration a fini par fonctionner.

## Resultats reellement confirmes
- GitHub Actions `NFL controlled Supabase ingestion` a execute avec succes un import nflverse 2026.
- Supabase `public.player_game_stats` contient **978 joueurs-matchs de semaine 6** pour **14 matchs** (constate le 20 oct 2026).
- Import `source_releases` 2026 provisoire de **6468 joueurs-matchs**; 20 lignes source exclues selon le journal de dry-run.
- `public.games` : les 14 matchs de semaine 6 etaient `completed` lors du dernier audit.
- `public.nfl_studio_forecast_decisions_v2` : **22 recommandations de props de semaine 6 restent pending** au dernier audit; cela represente 17 paris distincts : 6 gagnants, 10 perdants, un non resolu, d'apres comparaison des lignes aux statistiques et au sens du pari extrait de `reasoning.explanation`. 2 entrees archivees Jonnu Smith sans stats du match DAL-GB: ne pas interpreter absence comme zero.
- Resultats des props **calcules mais NON sauvegardes** ; ne pas pretendre que le grading est termine.
- La table `nfl_studio_espn_player_crosswalk` possedait 0 correspondance verifiee. Import semaine 6 reussi via nflverse/GSIS, sans dependance sur cet appariement ESPN.

## Workflow et regles
- Workflow `.github/workflows/nfl-ingestion.yml` : manuel `workflow_dispatch`, parametres saison, `include_player_stats`, `commit`.
- Importeur `scripts/import_player_stats_compact_v2.py` : `NFL_IMPORT_COMMIT=false` = dry-run; `true` = ecriture. Le dry-run 2026 a produit 6488 lignes source, 6468 joueurs-matchs apparies, semaine 6 = 982 lignes source.
- Brancher prochainement un flux hebdomadaire automatise, idempotent, avec journal, verification et alerte. Ce flux N'EST PAS ENCORE INSTALLE.
- Les ecritures directes `mcp__Supabase__execute_sql UPDATE` sur les predictions ont bloque regulierement; ne pas insister. Preferer une operation ciblee via workflow GitHub Actions, avec preuves pre/post.
- Des tentatives d'ecriture GitHub depuis ChatGPT ont parfois ete bloquees; verifier immediatement le commit et le fichier apres chaque changement.
- Maintenir un historique de predictions et les cotes pregame; une seule version globale du moteur C.
- Ne pas publier/reassigner Vercel production sans autorisation expresse. Aucun changement aux paris actifs sans demande.
- Utilisateur : ne souhaite aucune intervention technique manuelle recurrente, aucun abonnement additionnel, ni repetition de nombreux "Go".

## Quatre priorites strictes
1. Completer et fiabiliser l'historique de predictions et les resultats de tous les marches, importer et evaluer la semaine 6 (etat indicatif : 75 %, NON termine).
2. Audit Brier / calibration / probabilites par marche (pas encore commence).
3. Recalibrage global du moteur C avec tests historiques avant/apres (pas encore commence).
4. Validation EV, Top 5 et parlays avec cotes pregame et correlations (pas encore commence).

## Prochaine action unique
Evaluer puis **sauvegarder les 20 entrees props verifiables de la semaine 6**, en conservant les deux Jonnu Smith `pending`; lire les donnees et confirmer le resultat DB. Ensuite valider les 17 paris uniques, surveiller les erreurs d'identite/direction, puis automatiser import + grading hebdomadaires. Ne pas partir dans des changements d'interface.

## Pour reprendre depuis une autre conversation
Demande : « Reprends HEAVYBALLS : lis `HEAVYBALLS_HANDOFF.md` dans `Marcj11/NFL`, verifie les donnees courantes dans Supabase, continue la prochaine action sans refaire les anciens diagnostics. »

## Mise a jour du 20 octobre 2026 : evaluation automatisee
- Semaine 6 : 20 lignes de paris joueurs reglees dans Supabase, 8 won et 12 lost; 2 Jonnu Smith pending (stat absente). Ces lignes incluent des doublons entre classements.
- Recuperation des blocages Supabase documentee dans docs/HEAVYBALLS_CONNECTOR_RECOVERY.md : BEGIN; SET LOCAL statement_timeout='8s'; UPDATE cible; COMMIT; puis SELECT de validation.
- Script scripts/grade_weekly_predictions.py cree sur la branche feature; gere h2h/moneyline et player pass/rush/receiving yards avec scores officiellement verifies. Les marches spreads, totals, props generiques restent a faire.
- Workflow .github/workflows/nfl-weekly-player-stats.yml modifie sur main, commit 380b7c1 : import des stats suivi de la notation automatique des selections prises en charge.
- La planification est enregistree et relue, mais la premiere execution automatique reussie n'est PAS encore confirmee. Ne pas compter les paris historiques repetes plusieurs fois comme des paris distincts.
