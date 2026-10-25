import {NextResponse} from 'next/server';
export const dynamic='force-dynamic';
export async function GET(req:Request){
 const url=new URL(req.url),player=url.searchParams.get('player')||'';
 const market=url.searchParams.get('market')||'';
 const before=url.searchParams.get('before')||'';
 const kicker:Record<string,string>={player_field_goals:'fg_made',player_field_goals_made:'fg_made',player_field_goal_attempts:'fg_att',player_extra_points:'pat_made',player_extra_points_made:'pat_made',player_kicking_points:'points',player_pats:'pat_made'};
 const allowed:Record<string,string>={'player_pass_yds':'passing_yards','player_rush_yds':'rushing_yards','player_reception_yds':'receiving_yards','player_sacks':'def_sacks','player_solo_tackles':'def_tackles_solo','player_tackles_assists':'def_tackles_with_assist','player_defensive_interceptions':'def_interceptions','player_tackles':'def_tackles_solo','player_interceptions':'def_interceptions','player_qb_hits':'def_qb_hits','player_pass_defended':'def_pass_defended','player_forced_fumbles':'def_fumbles_forced'};
 if(!player||player.length>100||!(allowed[market]||kicker[market])||!Number.isFinite(Date.parse(before)))return NextResponse.json({error:'invalid_parameters'},{status:400});
 const base=process.env.SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!base||!key)return NextResponse.json({error:'not_configured'},{status:503});
 if(kicker[market]){
  const qs=new URLSearchParams({select:'player_id,season,week,cutoff_utc,metrics',display_name:'eq.'+player,cutoff_utc:'lt.'+new Date(before).toISOString(),order:'cutoff_utc.desc',limit:'30'});
  try{
   const response=await fetch(base+'/rest/v1/nfl_studio_kicker_prop_history_v1?'+qs,{headers:{apikey:key,Authorization:'Bearer '+key},cache:'no-store',signal:AbortSignal.timeout(9000)});
   if(!response.ok)return NextResponse.json({error:'kicker_history_unavailable'},{status:502});
   const rows=await response.json() as Array<{player_id:string;season:number;week:number;cutoff_utc:string;metrics:Record<string,number>}>;
   const games=rows.flatMap(r=>{const m=r.metrics||{},v=kicker[market]==='points'?(m.fg_made===undefined||m.pat_made===undefined?null:3*m.fg_made+m.pat_made):m[kicker[market]];return v===null||v===undefined||!Number.isFinite(Number(v))?[]:[{game_id:r.season+'_'+r.week+'_'+r.player_id,date:r.cutoff_utc,value:Number(v)}]}).reverse();
   return NextResponse.json({source:'nflverse_kicker_weekly',player,market,game_count:games.length,eligible:games.length>=5,history:games},{headers:{'Cache-Control':'no-store'}});
  }catch{return NextResponse.json({error:'kicker_history_failed'},{status:502})}
 }
 const defense=market.startsWith('player_')&&!['player_pass_yds','player_rush_yds','player_reception_yds'].includes(market);
 const p=new URLSearchParams({select:defense?'game_id,display_name,kickoff_utc,metrics':'game_id,display_name,kickoff_utc,'+allowed[market],display_name:'eq.'+player,kickoff_utc:'lt.'+new Date(before).toISOString(),order:'kickoff_utc.desc',limit:'12'});
 try{
  const r=await fetch(base+'/rest/v1/'+(defense?'nfl_studio_defense_prop_history_v1':'nfl_studio_player_recent_prop_results_v1')+'?'+p,{headers:{apikey:key,Authorization:'Bearer '+key},cache:'no-store',signal:AbortSignal.timeout(9000)});
  if(!r.ok)return NextResponse.json({error:'historical_data_unavailable'},{status:502});
  const rows=await r.json() as Array<Record<string,unknown>>;
  const unique=new Map<string,Record<string,unknown>>();for(const row of rows){const id=String(row.game_id||'');if(!id||unique.has(id)||(defense?(row.metrics as Record<string,unknown>|null)?.[allowed[market]]:row[allowed[market]])===null||(defense?(row.metrics as Record<string,unknown>|null)?.[allowed[market]]:row[allowed[market]])===undefined||!Number.isFinite(Number(defense?(row.metrics as Record<string,unknown>)[allowed[market]]:row[allowed[market]])))continue;unique.set(id,row)}
  const games=[...unique.values()].reverse().map(x=>({game_id:String(x.game_id),date:String(x.kickoff_utc),value:Number(defense?(x.metrics as Record<string,unknown>)[allowed[market]]:x[allowed[market]])}));
  return NextResponse.json({source:'expert-nfl-independent',player,market,game_count:games.length,eligible:games.length>=5,duplicate_rows_excluded:rows.length-unique.size,cutoff_utc:new Date(before).toISOString(),model_executed:false,history:games},{headers:{'Cache-Control':'no-store'}});
 }catch{return NextResponse.json({error:'query_failed'},{status:502})}
}
