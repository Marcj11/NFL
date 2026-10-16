import {NextResponse} from 'next/server';
export const dynamic='force-dynamic';
type Game={home_team_id:string;away_team_id:string;kickoff_utc:string};
export async function GET(req:Request){
 const url=new URL(req.url);
 const secret=process.env.CRON_SECRET;
 if(secret&&req.headers.get('authorization')!=='Bearer '+secret)return NextResponse.json({error:'unauthorized'},{status:401});
 const base=process.env.SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!base||!key)return NextResponse.json({status:'not_configured'},{status:503});
 try{
  const now=new Date(),until=new Date(now.getTime()+8*86400000);
  const params=new URLSearchParams({select:'home_team_id,away_team_id,kickoff_utc',kickoff_utc:'gte.'+now.toISOString(),order:'kickoff_utc.asc',limit:'16'});
  const res=await fetch(base+'/rest/v1/games?'+params,{headers:{apikey:key,Authorization:'Bearer '+key},cache:'no-store',signal:AbortSignal.timeout(9000)});
  if(!res.ok)return NextResponse.json({status:'schedule_unavailable',http:res.status},{status:502});
  const list=(await res.json() as Game[]).filter(g=>Date.parse(g.kickoff_utc)<until.getTime()).slice(0,4);
  const outcomes=await Promise.all(list.map(async g=>{
   try{
    const p=new URLSearchParams({home:g.home_team_id,away:g.away_team_id,before:g.kickoff_utc});
    const response=await fetch(url.origin+'/api/expert-game-research?'+p,{cache:'no-store',signal:AbortSignal.timeout(25000)});
    const data=await response.json();
    return {game:g.away_team_id+'-'+g.home_team_id,status:String(data.status||'unavailable'),audit:String(data.forecast_audit_status||'not_recorded')};
   }catch{return {game:g.away_team_id+'-'+g.home_team_id,status:'unavailable',audit:'request_failed'}}
  }));
  return NextResponse.json({status:'completed',checked:outcomes.length,outcomes},{headers:{'Cache-Control':'no-store'}});
 }catch{return NextResponse.json({status:'collection_failed'},{status:502})}
}