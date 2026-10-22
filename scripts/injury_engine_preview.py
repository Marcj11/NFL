"""Engine C injury preview; reads Supabase, never writes wagers."""
import os
from supabase import create_client

GAME_ID = os.getenv('NFL_GAME_ID', '401873010')
BLOCKED = {'Out', 'Injured Reserve', 'Suspension', 'Doubtful'}

def main():
    db = create_client(os.environ['NFL_SUPABASE_URL'], os.environ['NFL_SUPABASE_SERVICE_ROLE_KEY'])
    injuries = db.table('engine_c_injury_player_features_v1').select('gsis_id,player_name,injury_status,position').eq('game_id', GAME_ID).execute().data or []
    print('Injury reports:', len(injuries))
    print('Unavailable:', sum(i['injury_status'] in BLOCKED for i in injuries))

if __name__ == '__main__':
    main()
