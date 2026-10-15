import {NextResponse} from 'next/server';
export const dynamic='force-dynamic';
export async function GET(req:Request){
 const p=new URL(req.url).searchParams,team=p.get('team')||'';
 if(!/^[A-Z]{2,3}$/.test(team))return NextResponse.json({error:'invalid_team'},{status:400});
 const base=process.env.SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!base||!key)return NextResponse.json({error:'not_configured'},{status:503});
 try{
  const q=new URLSearchParams({select:'game_id,epa,success,offense_team',offense_team:'eq.'+team,epa:'not.is.null',success:'not.is.null',limit:'1000'});
  const r=await fetch(base+'/rest/v1/game_plays?'+q,{headers:{apikey:key,Authorization:'Bearer '+key},cache:'no-store',signal:AbortSignal.timeout(9000)});
  if(!r.ok)return NextResponse.json({error:'play_data_unavailable'},{status:502});
  const rows=await r.json() as Array<{epa:number;success:boolean|number;game_id:string}>;
  const n=rows.length,epa=n?rows.reduce((s,x)=>s+Number(x.epa),0)/n:null;
  const success=n?rows.reduce((s,x)=>s+(x.success===true||x.success===1?1:0),0)/n:null;
  return NextResponse.json({team,source:'game_plays',sample:n,epa_per_play:epa,success_rate:success,status:'unadjusted_historical_sample',forecast:null,publishable:false,warning:'Échantillon limité, non chronologique, non corrigé pour adversaire. Pas une projection de match.'},{headers:{'Cache-Control':'no-store'}});
 }catch{return NextResponse.json({error:'source_timeout'},{status:502})}
}
