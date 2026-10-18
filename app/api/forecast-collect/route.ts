import {NextResponse} from 'next/server';
export const dynamic='force-dynamic';
export const maxDuration=60;
type Game={game_id:string;week:number;home_team_id:string;away_team_id:string;kickoff_utc:string};
export async function GET(req:Request){
 const url=new URL(req.url);
 const secret=process.env.CRON_SECRET;
 if(secret&&req.headers.get('authorization')!=='Bearer '+secret)return NextResponse.json({error:'unauthorized'},{status:401});
 const base=process.env.SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!base||!key)return NextResponse.json({status:'not_configured'},{status:503});
 try{
  const now=new Date(),until=new Date(now.getTime()+8*86400000);
  const params=new URLSearchParams({select:'game_id,week,home_team_id,away_team_id,kickoff_utc',kickoff_utc:'gte.'+now.toISOString(),order:'kickoff_utc.asc',limit:'24'});
  const res=await fetch(base+'/rest/v1/games?'+params,{headers:{apikey:key,Authorization:'Bearer '+key},cache:'no-store',signal:AbortSignal.timeout(9000)});
  if(!res.ok)return NextResponse.json({status:'schedule_unavailable',http:res.status},{status:502});
  const list=(await res.json() as Game[]).filter(g=>Date.parse(g.kickoff_utc)<until.getTime()).slice(0,12);
  const outcomes=[] as Array<{game:string;status:string;audit:string}>;
  for(let i=0;i<list.length;i+=6){const batch=await Promise.all(list.slice(i,i+6).map(async g=>{
   try{
    const p=new URLSearchParams({home:g.home_team_id,away:g.away_team_id,before:g.kickoff_utc});
    const response=await fetch(url.origin+'/api/expert-game-research?'+p,{cache:'no-store',signal:AbortSignal.timeout(25000)});
    const data=await response.json();
    return {game:g.away_team_id+'-'+g.home_team_id,status:String(data.status||'unavailable'),audit:String(data.forecast_audit_status||'not_recorded')};
   }catch{return {game:g.away_team_id+'-'+g.home_team_id,status:'unavailable',audit:'request_failed'}}
  }));outcomes.push(...batch)}
  let independent:{status:string;created?:number;error?:string}={status:'not_started'};
  try{const response=await fetch(url.origin+'/api/independent-collect',{headers:{authorization:'Bearer '+secret},cache:'no-store',signal:AbortSignal.timeout(25000)});independent=await response.json()}catch(e){independent={status:'unavailable',error:String(e)}}
  // Archive every upcoming Elo winner/loser, and each matchup TOP5 even when nobody opens the app.
  const weeks=[...new Set(list.map(g=>{const m=(g as Game&{week?:number}).week;return m}).filter((x):x is number=>typeof x==='number'))];
  let eloArchive:any[]=[];
  for(const week of weeks){
   try{const r=await fetch(url.origin+'/api/elo?week='+week,{cache:'no-store',signal:AbortSignal.timeout(25000)});const d=await r.json();eloArchive.push({week,status:d.archive_status||d.error||'unknown',games:d.games?.length??0});}catch{eloArchive.push({week,status:'fetch_failed'});}
  }
  const matchArchives:any[]=[];
  for(let i=0;i<list.length;i+=4){
   const chunk=await Promise.all(list.slice(i,i+4).map(async(g:any)=>{
    try{const r=await fetch(url.origin+'/api/match-top5?game_id='+encodeURIComponent(g.game_id),{cache:'no-store',signal:AbortSignal.timeout(23000)});const d=await r.json();return {game_id:g.game_id,status:r.ok?'checked':d.error||'error',count:d.analysis?.length||0};}
    catch{return {game_id:g.game_id,status:'fetch_failed'};}
   }));matchArchives.push(...chunk);
  }
  try{await fetch(base+'/rest/v1/rpc/nfl_studio_grade_archived_moneylines',{method:'POST',headers:{apikey:key,Authorization:'Bearer '+key,'Content-Type':'application/json'},body:'{}',signal:AbortSignal.timeout(7000)});}catch{}
  return NextResponse.json({status:'completed',checked:outcomes.length,outcomes,independent,eloArchive,matchArchives},{headers:{'Cache-Control':'no-store'}});
 }catch{return NextResponse.json({status:'collection_failed'},{status:502})}
}