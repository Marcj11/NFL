import {NextResponse} from 'next/server';
export const dynamic='force-dynamic';
export async function GET(req:Request){
 const u=new URL(req.url),team=u.searchParams.get('team'),before=u.searchParams.get('before');
 if(!team||!/^[A-Z]{2,3}$/.test(team)||!before||!Number.isFinite(Date.parse(before)))return NextResponse.json({error:'invalid_parameters'},{status:400});
 const base=process.env.SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!base||!key)return NextResponse.json({error:'not_configured'},{status:503});
 try{
  const params=new URLSearchParams({select:'game_id,kickoff_utc,home_team_id,away_team_id,game_results(home_score,away_score)',or:'(home_team_id.eq.'+team+',away_team_id.eq.'+team+')',kickoff_utc:'lt.'+new Date(before).toISOString(),order:'kickoff_utc.desc',limit:'20'});
  const r=await fetch(base+'/rest/v1/games?'+params,{headers:{apikey:key,Authorization:'Bearer '+key},cache:'no-store',signal:AbortSignal.timeout(8000)});
  if(!r.ok)return NextResponse.json({error:'history_source_unavailable'},{status:502});
  const rows=await r.json();
  return NextResponse.json({team,source:'historical_results',forecast:null,model_executed:false,games:rows},{headers:{'Cache-Control':'no-store'}});
 }catch{return NextResponse.json({error:'history_timeout'},{status:502})}
}
