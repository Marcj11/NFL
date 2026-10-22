import csv,io,os,urllib.request
from supabase import create_client
db=create_client(os.environ["NFL_SUPABASE_URL"],os.environ["NFL_SUPABASE_SERVICE_ROLE_KEY"])
for year in (2025,2026):
 url=f"https://github.com/nflverse/nflverse-data/releases/download/stats_player/stats_player_week_{year}.csv"
 with urllib.request.urlopen(url,timeout=60) as f: rows=list(csv.DictReader(io.StringIO(f.read().decode("utf-8-sig"))))
 keys=set(rows[0]) if rows else set()
 fg=[x for x in keys if x.startswith(("fg_","pat_"))]
 if not {"player_id","week"}.issubset(keys) or not fg:raise ValueError(f"{year}: no identified kicking fields; fields={sorted(keys)}")
 data=[]
 for r in rows:
  if not r.get("player_id") or not r.get("week"):continue
  m={}
  for k in fg:
   try:
    if r.get(k) not in ("",None,"NA"):m[k]=float(r[k])
   except ValueError:pass
  if not m or not any(v>0 for v in m.values()):continue
  data.append(dict(player_id=r["player_id"],season=year,week=int(r["week"]),metrics=m))
 if not data:raise ValueError(f"{year}: 0 valid kicker rows")
 for i in range(0,len(data),100):db.table("nfl_studio_kicker_weekly_v1").upsert(data[i:i+100],on_conflict="player_id,season,week").execute()
 print(year,len(data))
