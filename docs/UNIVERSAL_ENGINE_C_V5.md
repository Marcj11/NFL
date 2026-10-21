# HEAVYBALLS BET - Moteur C universel V5

Decision: un seul moteur pour tous les marches NFL et toutes les surfaces de l'application. Les anciens calculateurs Elo, V4, recherche avances et props sont des composants internes ou references historiques, jamais des moteurs concurrents visibles.

## Inventaire verifie
- /api/elo: probabilite derivee du classement Elo.
- /api/match-top5: historical_market_research_v4, formule logistique pour marches d'equipe et frequence lissee pour plusieurs props. Status experimental_unvalidated.
- /api/expert-game-research: calculs historiques et contexte QB.
- /api/expert-prop-research: simulateYards, simulateur statistique non calibre.
- evaluation EV: appliquer une meme regle p*cote-1 (avec gestion des push).
- betting-hub utilise plusieurs API, a unifier.

## Contrat unique
Chaque proposition produite par le moteur C V5 doit avoir game_id, market, selection, side, line, bookmaker, decimal_odds, estimated_probability, estimated_ev, model_version='engine-c-universal-v5', forecast_at, kickoff_utc, injuries_asof, stats_asof et identifiant stable de la prediction. Les marches non pris en charge sont indisponibles, jamais maquilles en V5.

## Etapes obligatoires
1. Geler les predictions des matchs deja commences ou archives.
2. Construire une seule entree de calcul, reutilisant des composants de statistiques et contexte sans exposer plusieurs moteurs publics.
3. Former des probabilites specifiques aux moneyline, spreads, totaux, props offensives, props defensives, botteurs et unites speciales. Conserver les incertitudes et aucune donnee future.
4. Top 5 general, Top 5 par match et Heavyball consomment la meme liste de candidats; les parlays tiennent compte des correlations.
5. Verifier identite joueur, alignement QB, blessures horodatees, stats joueur et equipe, provenance des cotes et bookmaker.
6. Mesurer Brier, fiabilite, ROI, EV et CLV par marche avec deduplication par contrat et separation chronologique entrainement/test.
7. Basculer les API une a une vers l'entree unique; supprimer ou desactiver les anciens appels dans le tableau principal; verifier aucune divergence de probabilite entre pages.
8. Autorisation explicite de publication avant de publier la production Vercel; verifier ensuite site et restauration possible.

## Etat
Ceci est le contrat d'architecture, pas encore une implementation. Ne pas presenter le moteur V5 comme en fonction avant branchement complet et validation.
