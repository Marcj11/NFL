import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const bearer = request.headers.get('authorization');
  const access = process.env.NFL_BRIDGE_TOKEN;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key || !access) return NextResponse.json({error:'not_configured'}, {status:503});
  if (bearer !== 'Bearer ' + access) return NextResponse.json({error:'unauthorized'}, {status:401});
  const params = new URL(request.url).searchParams;
  const gameId = params.get('game_id') || '';
  const asOf = params.get('as_of') || '';
  if (!/^20[0-9]{2}_[0-9]{2}_[A-Z]{2,3}_[A-Z]{2,3}$/.test(gameId) || !Number.isFinite(Date.parse(asOf))) {
    return NextResponse.json({error:'invalid_parameters'},{status:400});
  }
  const fetchRows = async (table:string, query:URLSearchParams) => {
    const result = await fetch(url + '/rest/v1/' + table + '?' + query.toString(), {
      headers: {apikey:key, authorization:'Bearer ' + key},
      cache:'no-store'
    });
    if (!result.ok) throw new Error('database_read_failed');
    return result.json();
  };
  try {
    const matches = await fetchRows('games', new URLSearchParams({select:'game_id,kickoff_utc,home_team_id,away_team_id,season,week',game_id:'eq.'+gameId}));
    const game = matches[0];
    if (!game) return NextResponse.json({error:'game_not_found'},{status:404});
    if (Date.parse(asOf) >= Date.parse(game.kickoff_utc)) return NextResponse.json({error:'must_be_pregame'}, {status:422});
    const history = await fetchRows('games',new URLSearchParams({
      select:'game_id,kickoff_utc,home_team_id,away_team_id',
      or:'(home_team_id.eq.'+game.home_team_id+',away_team_id.eq.'+game.home_team_id+',home_team_id.eq.'+game.away_team_id+',away_team_id.eq.'+game.away_team_id+')',
      kickoff_utc:'lt.'+new Date(asOf).toISOString(),order:'kickoff_utc.desc',limit:'20'
    }));
    const gameIds = history.map((item:{game_id:string})=>item.game_id);
    const pastResults = gameIds.length ? await fetchRows('game_results',new URLSearchParams({select:'game_id,home_score,away_score',game_id:'in.('+gameIds.join(',')+')'})) : [];
    const completed = new Set(pastResults.map((item:{game_id:string})=>item.game_id));
    const eligible = history.filter((item:{game_id:string})=>completed.has(item.game_id));
    const ids = eligible.map((item:{game_id:string})=>item.game_id);
    const stats = ids.length ? await fetchRows('player_game_stats',new URLSearchParams({select:'game_id,player_id,team_id,metrics',game_id:'in.('+ids.join(',')+')',limit:'2000'})) : [];
    return NextResponse.json({source:'nfl-studio-compact',game,as_of:asOf,history:eligible,stats,model_applied:false,caution:'Historical source publication times not yet verified'}, {headers:{'Cache-Control':'no-store'}});
  } catch {
    return NextResponse.json({error:'database_unavailable'},{status:502});
  }
}
