import {NextResponse} from 'next/server';
export const dynamic='force-dynamic';
export async function GET(req:Request){
 const params=new URL(req.url).searchParams,team=params.get('team')||'',before=params.get('before')||'';
 if(!/^[A-Z]{2,3}$/.test(team)||!Number.isFinite(Date.parse(before)))return NextResponse.json({error:'invalid_input'},{status:400});
 const base=process.env.SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!base||!key)return NextResponse.json({status:'not_configured'},{status:503});
 const headers={apikey:key,Authorization:'Bearer '+key};
 try{
  const gp=new URLSearchParams({select:'game_id,kickoff_utc',or:'(home_team_id.eq.'+team+',away_team_id.eq.'+team+')',kickoff_utc:'lt.'+new Date(before).toISOString(),order:'kickoff_utc.desc',limit:'12'});
  const g=await fetch(base+'/rest/v1/games?'+gp,{headers,cache:'no-store',signal:AbortSignal.timeout(9000)});
  if(!g.ok)throw Error('games_failed');
  const games=await g.json() as Array<{game_id:string}>;
  if(!games.length)return NextResponse.json({status:'insufficient_history',team,publishable:false});
  const ids=games.map(x=>'"'+x.game_id.replace(/"/g,'')+'"').join(',');
  const qp=new URLSearchParams({select:'game_id,play_id,offense_team,epa,success',defense_team:'eq.'+team,offense_team:'not.is.null',epa:'not.is.null',game_id:'in.('+ids+')',order:'game_id.asc,play_id.asc',limit:'1000'});
  const rows:Array<{game_id:string;play_id:string;offense_team:string;epa:number;success:boolean|number}>=[];
  let truncated=false;
  for(let i=0;i<4;i++){
   qp.set('offset',String(i*1000));
   const r=await fetch(base+'/rest/v1/game_plays?'+qp,{headers,cache:'no-store',signal:AbortSignal.timeout(9000)});
   if(!r.ok)throw Error('plays_failed');
   const batch=await r.json() as typeof rows;rows.push(...batch);
   if(batch.length<1000)break;
   if(i===3)truncated=true;
  }
  const unique=new Map(rows.map(x=>[x.game_id+'|'+x.play_id,x]));
  const items=[...unique.values()],n=items.length;
  return NextResponse.json({team,status:truncated?'partial':'historical_defense_audit',historical_games:games.length,plays:n,duplicate_rows:rows.length-n,truncated,epa_allowed_per_play:n?items.reduce((s,x)=>s+Number(x.epa),0)/n:null,success_rate_allowed:n?items.reduce((s,x)=>s+(x.success===true||x.success===1?1:0),0)/n:null,publishable:false,forecast:null,warning:'Observations defensives historiques. Correction de force adverse, titulaires et validation hors echantillon non effectuees.'},{headers:{'Cache-Control':'no-store'}});
 }catch{return NextResponse.json({status:'history_unavailable',publishable:false},{status:502})}
}
