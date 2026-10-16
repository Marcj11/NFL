import {NextResponse} from 'next/server';
export const dynamic='force-dynamic';
export const maxDuration=60;
type G={game_id:string;kickoff_utc:string;home_team_id:string;away_team_id:string};
type R={game_id:string;home_score:number;away_score:number};
export async function GET(request:Request){
 const secret=process.env.CRON_SECRET;
 if(!secret||request.headers.get('authorization')!=='Bearer '+secret)return NextResponse.json({error:'unauthorized'},{status:401});
 const base=process.env.SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!base||!key)return NextResponse.json({error:'not_configured'},{status:503});
 const headers={apikey:key,Authorization:'Bearer '+key,'Content-Type':'application/json'};
 const read=async(table:string,params:URLSearchParams)=>{const r=await fetch(base+'/rest/v1/'+table+'?'+params,{headers,cache:'no-store',signal:AbortSignal.timeout(10000)});if(!r.ok)throw Error(table+'_'+r.status);return r.json()};
 try{
  const now=new Date(),until=new Date(now.getTime()+8*86400000);
  const games=(await read('games',new URLSearchParams({select:'game_id,kickoff_utc,home_team_id,away_team_id',kickoff_utc:'gte.'+now.toISOString(),order:'kickoff_utc.asc',limit:'25'})) as G[]).filter(g=>Date.parse(g.kickoff_utc)<until.getTime());
  const teams=[...new Set(games.flatMap(g=>[g.home_team_id,g.away_team_id]))];
  const stats=new Map<string,number>();
  await Promise.all(teams.map(async team=>{
   const list=await read('games',new URLSearchParams({select:'game_id,kickoff_utc,home_team_id,away_team_id',or:'(home_team_id.eq.'+team+',away_team_id.eq.'+team+')',kickoff_utc:'lt.'+now.toISOString(),order:'kickoff_utc.desc',limit:'20'})) as G[];
   const results=await read('game_results',new URLSearchParams({select:'game_id,home_score,away_score',game_id:'in.('+list.map(g=>'"'+g.game_id+'"').join(',')+')',limit:'25'})) as R[];
   const map=new Map(results.map(r=>[r.game_id,r]));
   const finished=list.map(g=>({g,r:map.get(g.game_id)})).filter((x):x is {g:G;r:R}=>!!x.r&&x.r.home_score!==null&&x.r.away_score!==null).slice(0,12);
   if(finished.length<5)return;
   const wins=finished.reduce((sum,{g,r})=>sum+(r.home_score===r.away_score?.5:((g.home_team_id===team?r.home_score>r.away_score:r.away_score>r.home_score)?1:0)),0);
   stats.set(team,wins/finished.length);
  }));
  const stamp=new Date().toISOString();const rows=games.filter(g=>stats.has(g.home_team_id)&&stats.has(g.away_team_id)).map(g=>({
   game_id:g.game_id,model_name:'independent-recent-winrate-v1',home_team:g.home_team_id,away_team:g.away_team_id,
   home_probability:Math.max(.05,Math.min(.95,.535+.70*(stats.get(g.home_team_id)!-stats.get(g.away_team_id)!))),
   forecast_at:stamp,kickoff_at:g.kickoff_utc
  }));
  if(rows.length){const r=await fetch(base+'/rest/v1/nfl_studio_forecast_audit?on_conflict=game_id,model_name,forecast_at',{method:'POST',headers:{...headers,Prefer:'resolution=ignore-duplicates,return=minimal'},body:JSON.stringify(rows)});if(!r.ok)throw Error('audit_write_'+r.status)}
  return NextResponse.json({status:'completed',model:'independent-recent-winrate-v1',created:rows.length,compared:games.length,verified:false},{headers:{'Cache-Control':'no-store'}});
 }catch(e){return NextResponse.json({status:'failed',error:String(e)},{status:502})}
}
