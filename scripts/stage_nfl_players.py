"""Stage compact verified cross-provider player identities, no guessed matches."""
import json
from pathlib import Path
import nflreadpy as nfl
import polars as pl
players=nfl.load_players()
out=[]
for x in players.select([c for c in ("gsis_id","pfr_id","espn_id","display_name") if c in players.columns]).to_dicts():
 ids={k:str(x[k]).strip() if x.get(k) is not None else None for k in ("gsis_id","pfr_id","espn_id")}
 if not any(ids.values()):continue
 out.append({**ids,"display_name":x.get("display_name")})
path=Path("diagnostics/staged-nfl-players.json")
path.parent.mkdir(parents=True,exist_ok=True)
path.write_text(json.dumps(out,ensure_ascii=False,separators=(",",":"),default=str))
print(json.dumps({"source":"nflreadpy.load_players","players":len(out),"bytes":path.stat().st_size}))
