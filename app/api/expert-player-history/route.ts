import {NextResponse} from 'next/server';
export const dynamic='force-dynamic';
export async function GET(req:Request){
 const url=new URL(req.url),player=url.searchParams.get('player')||'';
 const market=url.searchParams.get('market')||'';
 const before=url.searchParams.get('before')||'';
 const allowed:Record<string,string>={'player_pass_yds':'passing_yards','player_rush_yds':'rushing_yards','player_reception_yds':'receiving_yards'};
 if(!player||player.length>100||!allowed[market]||!Number.isFinite(Date.parse(before)))return NextResponse.json({error:'invalid_parameters'},{status:400});
 const base=process.env.SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!base||!key)return NextResponse.json({error:'not_configured'},{status:503});
 const p=new URLSearchParams({select:'display_name,kickoff_utc,'+allowed[market],display_name:'eq.'+player,kickoff_utc:'lt.'+new Date(before).toISOString(),order:'kickoff_utc.desc',limit:'12'});
 try{
  const r=await fetch(base+'/rest/v1/nfl_studio_player_recent_prop_results_v1?'+p,{headers:{apikey:key,Authorization:'Bearer '+key},cache:'no-store',signal:AbortSignal.timeout(9000)});
  if(!r.ok)return NextResponse.json({error:'historical_data_unavailable'},{status:502});
  const rows=await r.json() as Array<Record<string,unknown>>;
  const games=rows.filter(x=>x[allowed[market]]!==null&&Number.isFinite(Number(x[allowed[market]]))).reverse().map(x=>({date:x.kickoff_utc,value:Number(x[allowed[market]])}));
  return NextResponse.json({source:'expert-nfl-independent',player,market,game_count:games.length,eligible:games.length>=5,model_executed:false,history:games},{headers:{'Cache-Control':'no-store'}});
 }catch{return NextResponse.json({error:'query_failed'},{status:502})}
}
