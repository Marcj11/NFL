import {NextResponse} from 'next/server';
export const dynamic='force-dynamic';
type Row={metrics:Record<string,number|null>;games:{season:number;kickoff_utc:string}};
const freq=(rows:Row[],test:(r:Row)=>boolean)=>(rows.filter(test).length+1)/(rows.length+2);
export async function GET(req:Request){
 const url=new URL(req.url),player=url.searchParams.get('player_id')||'',before=url.searchParams.get('before')||'';
 if(!/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(player)||!Number.isFinite(Date.parse(before)))return NextResponse.json({error:'invalid_input'},{status:400});
 const base=process.env.SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!base||!key)return NextResponse.json({status:'not_configured',publishable:false},{status:503});
 try{
  const query=new URLSearchParams({select:'metrics,games!inner(season,kickoff_utc)',player_id:'eq.'+player,'games.kickoff_utc':'lt.'+new Date(before).toISOString(),limit:'100'});
  const res=await fetch(base+'/rest/v1/player_game_stats?'+query,{headers:{apikey:key,Authorization:'Bearer '+key},cache:'no-store',signal:AbortSignal.timeout(10000)});
  if(!res.ok)throw Error('data_unavailable');
  const rows=((await res.json()) as Row[]).filter(r=>r.games?.kickoff_utc).sort((a,b)=>Date.parse(b.games.kickoff_utc)-Date.parse(a.games.kickoff_utc));
  const season=rows[0]?.games.season;
  if(!season)return NextResponse.json({status:'insufficient_data',publishable:false});
  const current=rows.filter(r=>r.games.season===season).slice(0,5),prior=rows.filter(r=>r.games.season===season-1).slice(0,4);
  if(current.length<3||prior.length<4)return NextResponse.json({status:'insufficient_data',publishable:false,current_games:current.length,prior_games:prior.length});
  const markets=[{market:'tackles_over_4_5',test:(r:Row)=>Number(r.metrics.def_tackles_solo||0)+Number(r.metrics.def_tackle_assists||0)>4.5},{market:'sack_1_plus',test:(r:Row)=>Number(r.metrics.def_sacks||0)>=1}];
  return NextResponse.json({status:'research_only',publishable:false,model:'defense-65-35-v1',player_id:player,probabilities:markets.map(m=>({market:m.market,probability:Number((.65*freq(current,m.test)+.35*freq(prior,m.test)).toFixed(4)),season_current:current.length,season_prior:prior.length})),warning:'No bookmaker odds, snap projection or independent market calibration verified.'},{headers:{'Cache-Control':'no-store'}});
 }catch{return NextResponse.json({status:'data_unavailable',publishable:false},{status:502})}
}
