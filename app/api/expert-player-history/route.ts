import {NextResponse} from 'next/server';
export const dynamic='force-dynamic';
export async function GET(req:Request){
 const url=new URL(req.url),player=url.searchParams.get('player')||'';
 const market=url.searchParams.get('market')||'';
 const before=url.searchParams.get('before')||'';
 const allowed:Record<string,string>={'player_pass_yds':'passing_yards','player_rush_yds':'rushing_yards','player_reception_yds':'receiving_yards','player_sacks':'def_sacks','player_tackles':'def_tackles_solo','player_interceptions':'def_interceptions','player_qb_hits':'def_qb_hits','player_pass_defended':'def_pass_defended','player_forced_fumbles':'def_fumbles_forced'};
 if(!player||player.length>100||!allowed[market]||!Number.isFinite(Date.parse(before)))return NextResponse.json({error:'invalid_parameters'},{status:400});
 const base=process.env.SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!base||!key)return NextResponse.json({error:'not_configured'},{status:503});
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
