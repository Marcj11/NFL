import {NextResponse} from 'next/server';
export const dynamic='force-dynamic';
export async function GET(req:Request){
 const p=new URL(req.url).searchParams,home=p.get('home')||'',away=p.get('away')||'',before=p.get('before')||'';
 if(!/^[A-Z]{2,3}$/.test(home)||!/^[A-Z]{2,3}$/.test(away)||home===away||!Number.isFinite(Date.parse(before)))return NextResponse.json({error:'invalid_parameters'},{status:400});
 const base=process.env.SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!base||!key)return NextResponse.json({status:'not_configured',publishable:false},{status:503});
 const headers={apikey:key,Authorization:'Bearer '+key};
 try{
  const teams=[home,away],results=[];
  for(const team of teams){
   const gq=new URLSearchParams({select:'game_id,kickoff_utc',or:'(home_team_id.eq.'+team+',away_team_id.eq.'+team+')',kickoff_utc:'lt.'+new Date(before).toISOString(),order:'kickoff_utc.desc',limit:'12'});
   const gr=await fetch(base+'/rest/v1/games?'+gq,{headers,cache:'no-store',signal:AbortSignal.timeout(9000)});
   if(!gr.ok)throw Error('game_fetch_failed');
   const games=await gr.json() as Array<{game_id:string}>;
   if(games.length<5){results.push({team,ready:false,reason:'less_than_five_games'});continue}
   const ids=games.map(g=>'"'+g.game_id.replace(/"/g,'')+'"').join(',');
   const stats=[];
   for(const side of ['offense_team','defense_team']){
    const q=new URLSearchParams({select:'game_id,play_id,epa,success',game_id:'in.('+ids+')',[side]:'eq.'+team,epa:'not.is.null',limit:'1000',order:'game_id.asc,play_id.asc'});
    const r=await fetch(base+'/rest/v1/game_plays?'+q,{headers,cache:'no-store',signal:AbortSignal.timeout(9000)});
    if(!r.ok)throw Error('plays_fetch_failed');
    const rows=await r.json() as Array<{epa:number;game_id:string;play_id:string}>;
    const unique=[...new Map(rows.map(x=>[x.game_id+'|'+x.play_id,x])).values()];
    stats.push({side,plays:unique.length,epa_per_play:unique.length?unique.reduce((a,x)=>a+Number(x.epa),0)/unique.length:null,truncated:rows.length===1000});
   }
   results.push({team,ready:stats.every(x=>x.plays>=100&&!x.truncated),historical_games:games.length,stats});
  }
  return NextResponse.json({status:'historical_matchup_research',home,away,cutoff_utc:new Date(before).toISOString(),teams:results,model_executed:false,forecast:null,publishable:false,reason:'Le contexte QB, les blessures, les forces adverses et la validation temporelle du modele restent a integrer.'},{headers:{'Cache-Control':'no-store'}});
 }catch{return NextResponse.json({status:'data_unavailable',publishable:false},{status:502})}
}
