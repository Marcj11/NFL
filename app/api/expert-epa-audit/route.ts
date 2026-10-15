import {NextResponse} from 'next/server';
export const dynamic='force-dynamic';
export async function GET(req:Request){
 const p=new URL(req.url).searchParams,team=p.get('team')||'',before=p.get('before')||'';
 if(!/^[A-Z]{2,3}$/.test(team)||!Number.isFinite(Date.parse(before)))return NextResponse.json({error:'invalid_team'},{status:400});
 const base=process.env.SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!base||!key)return NextResponse.json({error:'not_configured'},{status:503});
 try{
  const headers={apikey:key,Authorization:'Bearer '+key};
  const gp=new URLSearchParams({select:'game_id,kickoff_utc',or:'(home_team_id.eq.'+team+',away_team_id.eq.'+team+')',kickoff_utc:'lt.'+new Date(before).toISOString(),order:'kickoff_utc.desc',limit:'12'});
  const gr=await fetch(base+'/rest/v1/games?'+gp,{headers,cache:'no-store',signal:AbortSignal.timeout(9000)});
  if(!gr.ok)throw Error('games_unavailable');
  const games=await gr.json() as Array<{game_id:string;kickoff_utc:string}>;
  if(!games.length)return NextResponse.json({team,status:'no_pregame_history',sample:0,forecast:null,publishable:false});
  const ids=games.map(g=>'"'+g.game_id.replace(/"/g,'')+'"').join(',');
  const q=new URLSearchParams({select:'game_id,epa,success,offense_team',offense_team:'eq.'+team,game_id:'in.('+ids+')',epa:'not.is.null',success:'not.is.null',limit:'1000'});
  const r=await fetch(base+'/rest/v1/game_plays?'+q,{headers,cache:'no-store',signal:AbortSignal.timeout(9000)});
  if(!r.ok)throw Error('plays_unavailable');
  const rows=await r.json() as Array<{epa:number;success:boolean|number;game_id:string}>;
  const sample_truncated=rows.length===1000;
  const n=rows.length,epa=n?rows.reduce((s,x)=>s+Number(x.epa),0)/n:null;
  const success=n?rows.reduce((s,x)=>s+(x.success===true||x.success===1?1:0),0)/n:null;
  return NextResponse.json({team,source:'game_plays',sample:n,epa_per_play:epa,success_rate:success,status:sample_truncated?'sample_truncated':'pregame_historical_sample',sample_truncated,forecast:null,publishable:false,cutoff_utc:new Date(before).toISOString(),historical_games:games.length,warning:sample_truncated?'Résultat partiel : plafond de 1000 jeux atteint. Aucune interprétation prédictive autorisée.':'12 matchs au plus avant le coup d’envoi, non corrigé pour adversaire. Pas une projection de match.'},{headers:{'Cache-Control':'no-store'}});
 }catch{return NextResponse.json({error:'source_timeout'},{status:502})}
}
