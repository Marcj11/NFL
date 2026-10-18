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
  const params=new URLSearchParams({select:'game_id,week,home_team_id,away_team_id,kickoff_utc',kickoff_utc:'gte.'+now.toISOString(),order:'kickoff_utc.asc',limit:'100'});
  const res=await fetch(base+'/rest/v1/games?'+params,{headers:{apikey:key,Authorization:'Bearer '+key},cache:'no-store',signal:AbortSignal.timeout(9000)});
  if(!res.ok)return NextResponse.json({status:'schedule_unavailable',http:res.status},{status:502});
  const list=(await res.json() as Game[]).filter(g=>Date.parse(g.kickoff_utc)<until.getTime());
  // CRITICAL: archive Elo first, before slow research. No 12-game truncation.
  const weeks=[...new Set(list.map(g=>g.week))];
  const eloArchive:Array<{week:number;status:string;games:number}>=[];
  for(const week of weeks){
   try{
    const response=await fetch(url.origin+'/api/elo?week='+week,{cache:'no-store',signal:AbortSignal.timeout(30000)});
    const data=await response.json();
    eloArchive.push({week,status:String(data.archive_status||data.error||'unknown'),games:Array.isArray(data.games)?data.games.length:0});
   }catch{eloArchive.push({week,status:'fetch_failed',games:0});}
  }
  const outcomes:Array<{game:string;status:string;audit:string}>=[];
  const independent={status:'skipped_for_archive_priority'};
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