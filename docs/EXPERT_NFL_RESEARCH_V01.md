# EXPERT NFL — Recherche bookmaker v0.1

## Résultats sourcés
1. Les books peuvent détenir une exposition et exploiter les préférences des clients, pas simplement équilibrer le marché 50/50 : Levitt, Economic Journal, 2004, https://doi.org/10.1111/j.1468-0297.2004.00207.x
2. La valeur informationnelle de la ligne augmente généralement entre ouverture et fermeture (étude NFL), https://www.sciencedirect.com/science/article/pii/S0927539813000509
3. Les inefficiences historiques de Moneyline NFL sont instables d'une saison à l'autre : Tuttle et al., 2024, https://journalofeconomicinsight.com/index.php/joei/article/view/1335
4. Les inefficiences Spread documentées ne prouvent pas de stratégie stable hors échantillon : https://doi.org/10.2139/ssrn.3022567
5. ESPN fournit dans NFL Studio scores et boxscores via endpoint non officiel, test Bills–Rams terminé exact 5/5; latence live non mesurée.
6. nflverse play-by-play/EPA : https://github.com/nflverse/nflverse-pbp
7. The Odds API quotas/marchés/headers, historique payant : https://the-odds-api.com/liveapi/guides/v4/

## Garde-fous obligatoires
Cote décimale o: probabilite seuil 1/o, EV par dollar p*o-1. La désurimposition proportionnelle q_i / somme(q_i) est une approximation. Moneyline, spread, props ont des modèles et règles de settlement distincts. Ligne exact/OT/DNP/push obligatoires. Jamais d'estimation « edge » sans probabilité validée. Horodatage et bookmaker obligatoire. Aucune collecte de cotes sans demande explicite. Aucune souscription payante. Aucune importation ni modification de l'ancien EXPERT NFL.

## Architecture cible
Plugin ChatGPT privé + outils MCP authentifiés + Supabase mémoire versionnée + NFL Studio Vercel affichage. Le présent document est uniquement une base de référence; l'exécution MCP et la persistance doivent être développées et testées.
