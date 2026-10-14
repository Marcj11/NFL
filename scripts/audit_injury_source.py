import nflreadpy as nfl
for season in (2023,2024,2025,2026):
 try:
  table=nfl.load_injuries([season])
  print(season,table.height,table.columns)
 except Exception as error:
  print(season,type(error).__name__,str(error)[:200])
