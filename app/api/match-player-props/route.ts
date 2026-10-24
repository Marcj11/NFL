import {NextResponse} from 'next/server';
export const dynamic='force-dynamic';
const markets='player_pass_yds,player_rush_yds,player_reception_yds';
type OddsGame={id:string;home_team:string;away_team:string;commence_time:string};
export async function GET(req:Request){
 const q=new URL(req.url).searchParams;
 const home=q.get('home')||'',away=q.get('away')||'';
 if(!home||!away||home.length>70||away.length>70)return NextResponse.json({status:'invalid_teams',props:[]},{status:400});
 const base=process.env.SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY,oddsKey=process.env.THE_ODDS_API_KEY;
 if(!base||!key)return NextResponse.json({status:'database_not_configured',props:[]},{status:503});
 const headers={apikey:key,Authorization:'Bearer '+key,'Content-Type':'application/json'};
 const root=base+'/rest/v1/';
 try{
  const r=await fetch(root+'nfl_studio_live_odds_cache?id=eq.nfl&select=payload,fetched_at',{headers,cache:'no-store',signal:AbortSignal.timeout(9000)});
  if(!r.ok)throw Error('odds_cache_'+r.status);
  const cache=(await r.json())[0];
  const game=((cache?.payload||[]) as OddsGame[]).find(g=>g.home_team===home&&g.away_team===away&&Date.parse(g.commence_time)>Date.now()-86400000);
  if(!game)return NextResponse.json({status:'game_unavailable',props:[],source:'The Odds API',fetchedAt:null});
  const cacheId='props_'+game.id.replace(/[^a-zA-Z0-9_-]/g,'').slice(0,100);
  const cached=await fetch(root+'nfl_studio_live_odds_cache?id=eq.'+encodeURIComponent(cacheId)+'&select=payload,fetched_at',{headers,cache:'no-store',signal:AbortSignal.timeout(8000)});
  const records=cached.ok?await cached.json():[];
  const current=records[0];
  const fresh=current?.fetched_at&&Date.now()-Date.parse(current.fetched_at)<2*3600000;
  if(fresh)return NextResponse.json({status:'available',props:current.payload||[],fetchedAt:current.fetched_at,source:'The Odds API',live:true});
  if(!oddsKey)return NextResponse.json({status:'provider_not_configured',props:current?.payload||[],fetchedAt:current?.fetched_at||null});
  const quota=await fetch(root+'rpc/nfl_studio_reserve_odds_credits',{method:'POST',headers,body:JSON.stringify({p_period:new Date().toISOString().slice(0,7),p_credits:3,p_cap:450}),signal:AbortSignal.timeout(9000)});
  if(!quota.ok||await quota.json()!==true)return NextResponse.json({status:'quota_guard',props:current?.payload||[],fetchedAt:current?.fetched_at||null});
  const endpoint='https://api.the-odds-api.com/v4/sports/americanfootball_nfl/events/'+encodeURIComponent(game.id)+'/odds?'+new URLSearchParams({apiKey:oddsKey,regions:'us',markets,oddsFormat:'american'});
  const response=await fetch(endpoint,{cache:'no-store',signal:AbortSignal.timeout(14000)});
  if(!response.ok)return NextResponse.json({status:'provider_'+response.status,props:current?.payload||[],fetchedAt:current?.fetched_at||null});
  const body=await response.json();
  const props:unknown[]=[];
  for(const book of body.bookmakers||[])for(const market of book.markets||[])if(markets.split(',').includes(market.key))for(const outcome of market.outcomes||[]){
   const price=Number(outcome.price);const decimal=price>0?1+price/100:price<0?1+100/Math.abs(price):0;
   if(!Number.isFinite(decimal)||decimal<=1)continue;
   props.push({market:market.key,player:outcome.description||outcome.name,side:outcome.name,point:outcome.point,decimal:Number(decimal.toFixed(2)),book:book.title});
  }
  const at=new Date().toISOString();
  const payload={id:cacheId,payload:props,fetched_at:at,updated_at:at};
  await fetch(root+'nfl_studio_live_odds_cache',{method:'POST',headers:{...headers,Prefer:'resolution=merge-duplicates,return=minimal'},body:JSON.stringify(payload),signal:AbortSignal.timeout(9000)});
  return NextResponse.json({status:props.length?'available':'no_player_markets',props,fetchedAt:at,source:'The Odds API',live:true},{headers:{'Cache-Control':'no-store'}});
 }catch(e){return NextResponse.json({status:'temporary_unavailable',detail:e instanceof Error?e.message:'unknown',props:[]},{status:503})}
}
