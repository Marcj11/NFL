import {NextResponse} from 'next/server';
export const dynamic='force-dynamic';
export async function GET(req:Request){
 const base=process.env.SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!base||!key)return NextResponse.json({status:'not_configured',offers:[]},{status:503});
 const headers={apikey:key,Authorization:'Bearer '+key};
 // Refresh supplementary props before reading cache, with a 6-hour provider throttle.
 try{await fetch(new URL('/api/refresh-special-props',req.url),{cache:'no-store',signal:AbortSignal.timeout(18000)});}catch{}
 try{
  const res=await fetch(base+'/rest/v1/nfl_studio_live_odds_cache?select=id,payload,fetched_at&id=like.props_*',{headers,cache:'no-store'});
  if(!res.ok)throw Error('cache_'+res.status);
  const rows=await res.json();
  const gr=await fetch(base+'/rest/v1/nfl_studio_live_odds_cache?select=payload&id=eq.nfl',{headers,cache:'no-store'});
  const baseRows=gr.ok?await gr.json():[];
  const games=Array.isArray(baseRows[0]?.payload)?baseRows[0].payload:[];
  const byId=new Map(games.map((g:{id:string})=>[g.id,g]));
  const offers=[];
  for(const row of rows){
   const game=byId.get(String(row.id).replace(/^props_/,'')) as {home_team?:string;away_team?:string;commence_time?:string}|undefined;
   if(!game?.commence_time||Date.parse(game.commence_time)<=Date.now()||!Array.isArray(row.payload))continue;
   for(const p of row.payload){
    const odds=Number(p?.decimal);
    if(!String(p?.market||'').startsWith('player_')||!p?.player||!(odds>1))continue;
    offers.push({id:[row.id,p.market,p.player,p.side,p.point].join(':'),game:game.away_team+' vs '+game.home_team,market:'props',marketKey:String(p.market),selection:p.player+' · '+p.side+' '+p.point+' · '+p.market,book:p.book||'Bookmaker',odds,prob:1/odds,team:'',player:String(p.player),line:Number(p.point),kickoff:game.commence_time,kickoff_utc:game.commence_time,fetchedAt:row.fetched_at});
   }
  }
  return NextResponse.json({status:offers.length?'available':'no_current_props',offers},{headers:{'Cache-Control':'no-store'}});
 }catch{return NextResponse.json({status:'cache_unavailable',offers:[]},{status:503})}
}