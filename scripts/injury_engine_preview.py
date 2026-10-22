"""Engine C experimental usage gap preview; does not change picks."""
import os
from supabase import create_client
GAME_ID=os.getenv('NFL_GAME_ID','401873010')
BLOCKED={'Out','Injured Reserve','Suspension','Doubtful'}
BROAD_ROLES={'OL','DB','DL','LB'}
def production(db, gsis):
 p=db.table('players').select('player_id').eq('gsis_id',gsis).limit(1).execute().data or []
 if not p:return None
 return db.table('player_game_stats').select('metrics,game_id').eq('player_id',p[0]['player_id']).like('game_id','2026_%').order('game_id',desc=True).limit(4).execute().data or []

def averages(games):
 if not games:return None
 keys=('receiving_yards','rushing_yards','def_sacks','def_qb_hits','targets','carries')
 return {'games_sample':len(games),'sample_sufficient':len(games)>=3,**{k:round(sum(float(g['metrics'].get(k) or 0) for g in games)/len(games),2) for k in keys}}

def main():
 db=create_client(os.environ['NFL_SUPABASE_URL'],os.environ['NFL_SUPABASE_SERVICE_ROLE_KEY'])
 injuries=db.table('engine_c_injury_player_features_v1').select('gsis_id,injury_status').eq('game_id',GAME_ID).execute().data or []
 pairs=db.table('engine_c_injury_replacement_candidates_v1').select('injured_gsis,injured_player,replacement_gsis,replacement_name,position').eq('game_id',GAME_ID).execute().data or []
 usage=db.table('engine_c_injury_last4_usage_v1').select('gsis_id,usage_ratio,games_sample').execute().data or []
 status={i['gsis_id']:i['injury_status'] for i in injuries}
 snaps={u['gsis_id']:u['usage_ratio'] for u in usage}
 sample={u['gsis_id']:u['games_sample'] for u in usage}
 eligible=[p for p in pairs if status.get(p['replacement_gsis']) not in BLOCKED and (sample.get(p['replacement_gsis']) or 0)>=3 ]
 ranked=sorted(eligible,key=lambda p:float(snaps.get(p['replacement_gsis']) or 0),reverse=True)
 groups={}
 for p in ranked:groups.setdefault(p['injured_gsis'],[]).append(p)
 for group in groups.values():
  for p in group[:3]:
   a,b=snaps.get(p['injured_gsis']),snaps.get(p['replacement_gsis'])
   gap=round(float(a)-float(b),3) if a is not None and b is not None else None
   starter_stats=averages(production(db,p['injured_gsis']))
   stats=averages(production(db,p['replacement_gsis']))
   print('ROLE_UNVERIFIED' if p['position'] in BROAD_ROLES else 'ROLE_GROUP',p['injured_player'],'->',p['replacement_name'],'snap_gap',gap,'starter_stats',starter_stats,'backup_stats',stats)
if __name__=='__main__':main()
