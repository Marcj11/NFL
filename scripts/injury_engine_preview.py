"""Read-only Engine C injury preview."""
import os
from supabase import create_client
GAME_ID = os.getenv('NFL_GAME_ID','401873010')
BLOCKED = {'Out','Injured Reserve','Suspension','Doubtful'}
def main():
 db=create_client(os.environ['NFL_SUPABASE_URL'],os.environ['NFL_SUPABASE_SERVICE_ROLE_KEY'])
 injuries=db.table('engine_c_injury_player_features_v1').select('gsis_id,injury_status').eq('game_id',GAME_ID).execute().data or []
 pairs=db.table('engine_c_injury_replacement_candidates_v1').select('replacement_gsis').eq('game_id',GAME_ID).execute().data or []
 status={i['gsis_id']:i['injury_status'] for i in injuries}
 eligible=[p for p in pairs if status.get(p['replacement_gsis']) not in BLOCKED]
 print({'injuries':len(injuries),'candidates':len(pairs),'eligible':len(eligible)})
if __name__=='__main__':main()
