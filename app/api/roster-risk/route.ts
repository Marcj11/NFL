import {NextResponse} from 'next/server';
export const dynamic='force-dynamic';
export async function GET(request:Request){
 const week=Number(new URL(request.url).searchParams.get('week')||6);
 if(!Number.isInteger(week)||week<1||week>18)return NextResponse.json({error:'invalid_week'},{status:400});
 const url=process.env.SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!url||!key)return NextResponse.json({error:'not_configured',teams:[]},{status:503});
 try{
  const params=new URLSearchParams({select:'game_id,team_id,roster_week,listed_active,high_usage_missing,high_usage_snaps_at_risk,targets_at_risk_per_game',order:'game_id.asc',limit:'100'});
  const res=await fetch(url+'/rest/v1/nfl_studio_roster_disruption_v1?'+params,{headers:{apikey:key,Authorization:'Bearer '+key},cache:'no-store',signal:AbortSignal.timeout(8000)});
  if(!res.ok)throw Error('db');
  const rows=await res.json() as Array<{game_id:string;team_id:string;roster_week:number;listed_active:number;high_usage_missing:number;high_usage_snaps_at_risk:number}>;
  return NextResponse.json({status:'unconfirmed_roster_analysis',source:'Supabase historical roster snapshot',not_official_inactives:true,teams:rows.filter(r=>Number(r.game_id.split('_')[1])===week)},{headers:{'Cache-Control':'no-store'}});
 }catch{return NextResponse.json({error:'roster_analysis_unavailable',teams:[]},{status:502})}
}
