# NFL Studio — registre d'exceptions d'identité (audit du 14 octobre 2026)
Source: diagnostics/nflverse-identity-exceptions.json, généré 2026-10-14T03:04:11Z.
Résultat: 124 lignes de snaps sans correspondance GSIS unique dans table maîtresse load_players, réparties en 10 identifiants PFR distincts. Les 87 014 autres lignes sur 87 138 ont une correspondance PFR->GSIS unique. 99,86% est une **couverture de mapping**, pas une preuve d'exactitude sémantique ou de validité des statistiques.

## Exceptions réelles (aucun mapping inventé)
|PFR ID|Équipe(s)|Saisons|Lignes affectées|
|---|---|---|---:|
|AndeAl01|BUF|2024,2025,2026|44|
|WillRo08|PIT|2023,2024|20|
|WhitCo05|SEA,LV|2024,2025,2026|19|
|OkoyCJ00|BAL,NYG|2025,2026|16|
|ShenJo00|LV|2024|8|
|CartNa00|ATL|2025|7|
|JohnIs03|MIA|2025|4|
|MurrBi00|CHI|2024|3|
|HallGa01|PHI|2025|2|
|CoopBu00|BAL|2024|1|

## Régime de quarantaine
Aucun événement, feature, ajustement de blessure, distribution de snaps ou calcul de prop ne doit utiliser des lignes non identifiées comme si elles étaient attribuées à un joueur GSIS confirmé. Les ID PFR peuvent être conservés bruts pour audit, mais sans mapping manuel basé uniquement sur le nom. Examiner source PFR officielle, identifiant roster saisonnier, transactions; exiger correspondance à au moins une source fiable indépendante et cohérence équipe/date. Suivre justification, approbateur, date, identifiant GSIS final, preuve source.
Les changements d'équipe entre saisons doivent être vérifiés temporellement (pas être considérés automatiquement une anomalie).
Prochaine validation: preuves avec lineup jeu/semaine + snap totals + fournisseurs indépendants, calibrage des champs de probabilités. Aucune recommandation de pari.
