import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
export async function GET(request: Request) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const token = process.env.NFL_BRIDGE_TOKEN;
  if (!url || !key || !token) return NextResponse.json({error:'not_configured'},{status:503});
  if (request.headers.get('authorization') !== 'Bearer '+token)
    return NextResponse.json({error:'unauthorized'},{status:401});
  const gameId = new URL(request.url).searchParams.get('game_id');
  if (gameId && !/^20[0-9]{2}_[0-9]{2}_[A-Z]{2,3}_[A-Z]{2,3}$/.test(gameId))
    return NextResponse.json({error:'invalid_game_id'},{status:400});
  const query=new URLSearchParams({select:'game_id,week,kickoff_utc,home_team_id,away_team_id,home_win_probability,away_win_probability,model_version,approved_for_betting',order:'kickoff_utc.asc',limit:'50'});
  if (gameId) query.set('game_id','eq.'+gameId);
  try {
    const response=await fetch(url+'/rest/v1/nfl_studio_upcoming_moneyline_preview_v1?'+query.toString(),{headers:{apikey:key,authorization:'Bearer '+key},cache:'no-store'});
    if (!response.ok) throw new Error('unavailable');
    return NextResponse.json({status:'experimental_only',not_betting_recommendations:true,games:await response.json()},{headers:{'Cache-Control':'no-store'}});
  } catch { return NextResponse.json({error:'database_unavailable'},{status:502}); }
}
