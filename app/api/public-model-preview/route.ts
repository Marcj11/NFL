import {NextResponse} from 'next/server';
export const dynamic='force-dynamic';
// Public research preview only. No service key is exposed to the client.
export async function GET(request:Request){
 const week=Number(new URL(request.url).searchParams.get('week')||6);
 if(!Number.isInteger(week)||week<1||week>18)return NextResponse.json({error:'invalid_week'},{status:400});
 const base=process.env.SUPABASE_URL;
 const key=process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!base||!key)return NextResponse.json({error:'preview_not_configured',games:[]},{status:503});
 const params=new URLSearchParams({select:'game_id,week,kickoff_utc,home_team_id,away_team_id,home_win_probability,away_win_probability,model_version,approved_for_betting',week:'eq.'+week,order:'kickoff_utc.asc',limit:'25'});
 try{
 const res=await fetch(base+'/rest/v1/nfl_studio_upcoming_moneyline_preview_v1?'+params,{headers:{apikey:key,Authorization:'Bearer '+key},cache:'no-store',signal:AbortSignal.timeout(8000)});
 if(!res.ok)throw Error('upstream_'+res.status);
 return NextResponse.json({experimental:true,verified_lines:false,betting_recommendations:false,games:await res.json()},{headers:{'Cache-Control':'no-store, max-age=0'}});
 }catch{return NextResponse.json({error:'preview_temporarily_unavailable',games:[]},{status:502})}
}
