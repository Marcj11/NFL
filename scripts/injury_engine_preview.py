"""Engine C experimental usage gap preview; does not change picks."""
import os
from supabase import create_client
GAME_ID=os.getenv('NFL_GAME_ID','401873010')
BLOCKED={'Out','Injured Reserve','Suspension','Doubtful'}
def main():
 db=create_client(os.environ['NFL_SUPABASE_URL'],os.environ['NFL_SUPABASE_SERVICE_ROLE_KEY'])
 injuries=db.table('engine_c_injury_player_features_v1').select('gsis_id,injury_status').eq('game_id',GAME_ID).execute().data or []
 pairs=db.table('engine_c_injury_replacement_candidates_v1').select('injured_gsis,injured_player,replacement_gsis,replacement_name').eq('game_id',GAME_ID).execute().data or []
 usage=db.table('engine_c_injury_last4_usage_v1').select('gsis_id,usage_ratio').execute().data or []
 status={i['gsis_id']:i['injury_status'] for i in injuries}
 snaps={u['gsis_id']:u['usage_ratio'] for u in usage}
 eligible=[p for p in pairs if status.get(p['replacement_gsis']) not in BLOCKED]
 ranked=sorted(eligible,key=lambda p:float(snaps.get(p['replacement_gsis']) or 0),reverse=True)
 groups={}
 for p in ranked:groups.setdefault(p['injured_gsis'],[]).append(p)
 for group in groups.values():
  for p in group[:3]:
   a,b=snaps.get(p['injured_gsis']),snaps.get(p['replacement_gsis'])
   gap=round(float(a)-float(b),3) if a is not None and b is not None else None
   print(p['injured_player'],'->',p['replacement_name'],'snap_gap',gap)
if __name__=='__main__':main()
