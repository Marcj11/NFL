import {NextResponse} from 'next/server';
export const dynamic='force-dynamic';
const MARKETS='player_sacks,player_solo_tackles,player_tackles_assists,player_defensive_interceptions,player_field_goals,player_kicking_points,player_pats';
const DECIMAL=(x:number)=>x>0?1+x/100:1+100/Math.abs(x);
export async function GET(){
 const base=process.env.SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY,apiKey=process.env.THE_ODDS_API_KEY;
 if(!base||!key||!apiKey)return NextResponse.json({status:'not_configured',refreshed:0});
 const headers={apikey:key,Authorization:'Bearer '+key,'Content-Type':'application/json'};
 try{
  const gamesRes=await fetch(base+'/rest/v1/nfl_studio_live_odds_cache?id=eq.nfl&select=payload',{headers,cache:'no-store'});
  if(!gamesRes.ok)throw Error('games_cache');
  const games=(await gamesRes.json())[0]?.payload||[];
  const future=(Array.isArray(games)?games:[]).filter((x:{id:string;commence_time:string})=>x.id&&Date.parse(x.commence_time)>Date.now()).sort((a:{commence_time:string},b:{commence_time:string})=>Date.parse(a.commence_time)-Date.parse(b.commence_time)).slice(0,8);
  let refreshed=0,marketsFound=0;
  for(const game of future){
   const id='props_'+game.id;
   const old=await fetch(base+'/rest/v1/nfl_studio_live_odds_cache?select=fetched_at&id=eq.'+encodeURIComponent(id),{headers,cache:'no-store'});
   const rows=old.ok?await old.json():[];
   if(rows[0]?.fetched_at&&Date.now()-Date.parse(rows[0].fetched_at)<6*3600000)continue;
   const url='https://api.the-odds-api.com/v4/sports/americanfootball_nfl/events/'+encodeURIComponent(game.id)+'/odds?'+new URLSearchParams({apiKey,regions:'us',markets:MARKETS,oddsFormat:'american'});
   const res=await fetch(url,{cache:'no-store',signal:AbortSignal.timeout(15000)});
   if(!res.ok)continue;
   const event=await res.json();
   const props:Array<Record<string,unknown>>=[];
   for(const book of event.bookmakers||[])for(const market of book.markets||[])for(const outcome of market.outcomes||[]){
    const odds=Number(outcome.price);
    if(!market.key?.startsWith('player_')||!outcome.description||!Number.isFinite(odds)||odds===0)continue;
    props.push({market:market.key,player:outcome.description,side:outcome.name,point:outcome.point,book:book.title,decimal:DECIMAL(odds)});
   }
   // Retain previously cached pass/rush/receiving props; never overwrite them.
   const existing=await fetch(base+'/rest/v1/nfl_studio_live_odds_cache?select=payload&id=eq.'+encodeURIComponent(id),{headers,cache:'no-store'});
   const older=existing.ok?(await existing.json())[0]?.payload:[];
   const preserved=(Array.isArray(older)?older:[]).filter((p:{market?:string})=>!MARKETS.split(',').includes(p.market||''));
   const payload=[...preserved,...props];
   const save=await fetch(base+'/rest/v1/nfl_studio_live_odds_cache?on_conflict=id',{method:'POST',headers:{...headers,Prefer:'resolution=merge-duplicates,return=minimal'},body:JSON.stringify([{id,payload,fetched_at:new Date().toISOString()}]),cache:'no-store'});
   if(save.ok){refreshed++;marketsFound+=props.length}
  }
  return NextResponse.json({status:'ok',refreshed,marketsFound,checked:future.length},{headers:{'Cache-Control':'no-store'}});
 }catch{return NextResponse.json({status:'refresh_unavailable',refreshed:0},{status:502})}
}
