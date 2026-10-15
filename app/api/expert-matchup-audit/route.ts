import {NextResponse} from 'next/server';
export const dynamic='force-dynamic';
export async function GET(req:Request){
 const p=new URL(req.url).searchParams,home=p.get('home')||'',away=p.get('away')||'',before=p.get('before')||'',requestedGame=p.get('game_id')||'';
 if(!/^[A-Z]{2,3}$/.test(home)||!/^[A-Z]{2,3}$/.test(away)||home===away||!Number.isFinite(Date.parse(before))||(requestedGame!==''&&!/^[a-zA-Z0-9_-]{3,80}$/.test(requestedGame)))return NextResponse.json({error:'invalid_parameters'},{status:400});
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
    const rows:Array<{epa:number;game_id:string;play_id:string}>=[];
    let truncated=false;
    for(let page=0;page<4;page++){
     q.set('offset',String(page*1000));
     const r=await fetch(base+'/rest/v1/game_plays?'+q,{headers,cache:'no-store',signal:AbortSignal.timeout(9000)});
     if(!r.ok)throw Error('plays_fetch_failed');
     const batch=await r.json() as typeof rows;
     rows.push(...batch);
     if(batch.length<1000)break;
     if(page===3)truncated=true;
    }
    const unique=[...new Map(rows.map(x=>[x.game_id+'|'+x.play_id,x])).values()];
    if(unique.length!==rows.length)truncated=true;
    stats.push({side,plays:unique.length,epa_per_play:unique.length?unique.reduce((a,x)=>a+Number(x.epa),0)/unique.length:null,truncated,duplicate_rows:rows.length-unique.length});
   }
   results.push({team,ready:stats.every(x=>x.plays>=100&&!x.truncated),historical_games:games.length,stats});
  }
  const qbQuery=new URLSearchParams({select:'game_id,team_id,qb_name,announced_status,source_name,source_published_at,usable_pregame',team_id:'in.('+home+','+away+')',usable_pregame:'eq.true',source_published_at:'lt.'+new Date(before).toISOString(),order:'source_published_at.desc',limit:'20'});
  if(requestedGame&&/^[a-zA-Z0-9_-]{3,80}$/.test(requestedGame))qbQuery.set('game_id','eq.'+requestedGame);
  const qbr=await fetch(base+'/rest/v1/nfl_studio_pregame_qb_sources_v1?'+qbQuery,{headers,cache:'no-store',signal:AbortSignal.timeout(9000)});
  const qbSources=qbr.ok?await qbr.json() as Array<{team_id:string;game_id:string;qb_name:string;source_published_at:string;announced_status:string;source_name:string}>:[];
  const historyQuery=new URLSearchParams({select:'game_id,team_id,qb_name,source_release_id',team_id:'in.('+home+','+away+')',limit:'24'});
  const historyResp=await fetch(base+'/rest/v1/game_starting_quarterbacks?'+historyQuery,{headers,cache:'no-store',signal:AbortSignal.timeout(9000)});
  const historicalQB=historyResp.ok?await historyResp.json() as Array<{game_id:string;team_id:string;qb_name:string}>:[];
  const qbCoverage=[home,away].map(team=>{
   const sources=qbSources.filter(q=>q.team_id===team&&!!requestedGame&&q.game_id===requestedGame);
   const source=sources[0];
   return {team,source_count:sources.length,qb_name_for_game:source?.qb_name||null,announced_status:source?.announced_status||null,source_name:source?.source_name||null,source_published_at:source?.source_published_at||null,starter_confirmed_for_requested_game:false,verification:'not_verified',reason:sources.length?'Announcement exists but confirmation criteria not established':'No verified pregame QB source for the requested game'};
  });
  return NextResponse.json({status:'historical_matchup_research',home,away,requested_game_id:requestedGame||null,cutoff_utc:new Date(before).toISOString(),teams:results,qb_coverage:qbCoverage,historical_qb_examples:historicalQB,qb_data_complete:false,model_executed:false,forecast:null,publishable:false,reason:'Le contexte QB, les blessures, les forces adverses et la validation temporelle du modele restent a integrer.'},{headers:{'Cache-Control':'no-store'}});
 }catch{return NextResponse.json({status:'data_unavailable',publishable:false},{status:502})}
}
