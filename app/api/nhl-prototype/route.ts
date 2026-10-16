import {NextResponse} from 'next/server';
export const dynamic='force-dynamic';
type Json=Record<string,unknown>;
async function nhl(path:string){
 const response=await fetch('https://api-web.nhle.com/v1/'+path,{headers:{Accept:'application/json'},cache:'no-store',signal:AbortSignal.timeout(12000)});
 if(!response.ok)throw new Error('nhl_http_'+response.status);
 return response.json() as Promise<Json>;
}
export async function GET(){
 try{
  const [schedule,standings,players]=await Promise.allSettled([
   nhl('schedule/now'),nhl('standings/now'),nhl('skater-stats-leaders/current?categories=goals,assists,points&limit=10')
  ]);
  const success=(x:PromiseSettledResult<Json>):x is PromiseFulfilledResult<Json>=>x.status==='fulfilled';
  const games=success(schedule)?(Array.isArray(schedule.value.gameWeek)?schedule.value.gameWeek as Array<{date?:string;games?:unknown[]}>:[]):[];
  const teams=success(standings)&&Array.isArray(standings.value.standings)?standings.value.standings as unknown[]:[];
  const leaderboard=success(players)?players.value:{};
  const categories=['goals','assists','points'];
  const historic=await Promise.allSettled([nhl('score/2024-01-15'),nhl('gamecenter/2023020204/play-by-play')]);
  const historicalScore=historic[0],historicalPlays=historic[1];
  const leaderCounts=Object.fromEntries(categories.map(k=>[k,Array.isArray(leaderboard[k])?(leaderboard[k] as unknown[]).length:0]));
  return NextResponse.json({
   status:success(schedule)&&success(standings)?'ok':'partial',
   source:'Official NHL API',mode:'read_only_prototype',
   collected_at:new Date().toISOString(),
   schedule:{ok:success(schedule),days:games.length,games:games.reduce((sum,day)=>sum+(day.games?.length||0),0),dates:games.map(day=>day.date)},
   standings:{ok:success(standings),teams:teams.length},
   skater_leaders:{ok:success(players),counts:leaderCounts},
   historical:{score_date:'2024-01-15',score_ok:success(historicalScore),games:success(historicalScore)&&Array.isArray(historicalScore.value.games)?historicalScore.value.games.length:0,play_by_play_ok:success(historicalPlays),events:success(historicalPlays)&&Array.isArray(historicalPlays.value.plays)?historicalPlays.value.plays.length:0},
   errors:Object.fromEntries((([['schedule',schedule],['standings',standings],['leaders',players],['historical_score',historicalScore],['historical_plays',historicalPlays]]) as Array<[string,PromiseSettledResult<Json>]>).filter(([,v])=>v.status==='rejected').map(([k,v])=>[k,String((v as PromiseRejectedResult).reason)])),
   note:'Diagnostic de couverture seulement. Aucune cote, blessure, garde de donnees ni prediction.'
  },{headers:{'Cache-Control':'no-store'}});
 }catch(e){return NextResponse.json({status:'error',message:String(e)},{status:502})}
}
