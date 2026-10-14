import nflreadpy as nfl
for name in ("load_coaches","load_depth_charts","load_participation","load_ftn_charting"):
 try:
  fn=getattr(nfl,name)
  d=fn([2025])
  print(name,d.height,d.columns,flush=True)
  print("sample",str(d.head(1).to_dicts())[:1000],flush=True)
 except Exception as e:print(name,"ERROR",str(e)[:500],flush=True)
