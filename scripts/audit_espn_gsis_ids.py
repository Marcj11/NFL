"""Audit ESPN <-> GSIS identity pairs from nflreadpy, read-only by default."""
import argparse, os, json
from collections import Counter
import nflreadpy as nfl
from supabase import create_client

p=argparse.ArgumentParser()
p.add_argument("--commit",action="store_true")
a=p.parse_args()
db=create_client(os.environ["NFL_COMPACT_SUPABASE_URL"],os.environ["NFL_COMPACT_SUPABASE_SERVICE_ROLE_KEY"])
records=nfl.load_players().to_dicts()
if not records:raise SystemExit("No player identity records")
sample=set(records[0])
if not {"espn_id","gsis_id"}.issubset(sample):raise SystemExit("Upstream identity columns unavailable: "+str(sorted(sample)))
pairs=[(str(x["espn_id"]),str(x["gsis_id"])) for x in records if x.get("espn_id") and x.get("gsis_id")]
ce=Counter(e for e,g in pairs);cg=Counter(g for e,g in pairs)
unique={(e,g) for e,g in pairs if ce[e]==1 and cg[g]==1 and e.lower() not in ("nan","none") and g.lower() not in ("nan","none")}
known=set()
for offset in range(0,100000,1000):
 batch=db.table("players").select("gsis_id").order("gsis_id").range(offset,offset+999).execute().data
 known.update(x["gsis_id"] for x in batch)
 if len(batch)<1000:break
valid=sorted((e,g) for e,g in unique if g in known)
print(json.dumps({"source_rows":len(records),"unique_verified_candidates":len(valid),"dry_run":not a.commit}))
if not a.commit:raise SystemExit(0)
raise SystemExit("Write mode deliberately disabled until data provenance and conflicts are audited")
