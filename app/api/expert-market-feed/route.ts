import {NextResponse} from 'next/server';
export const dynamic='force-dynamic';

type Outcome={name?:string;description?:string;point?:number;price?:number};
type Market={key?:string;outcomes?:Outcome[]};
type Book={key?:string;title?:string;markets?:Market[]};
type Event={id?:string;commence_time?:string;home_team?:string;away_team?:string;bookmakers?:Book[]};
type Cache={id:string;payload:unknown;fetched_at:string|null};

const group=(key:string)=>key==='h2h'?'moneyline':key==='spreads'?'spread':key==='totals'?'total':key.startsWith('player_')?'player_prop':null;
const decimal=(american:number)=>american>0?1+american/100:american<0?1+100/Math.abs(american):null;
export async function GET(){
 const base=process.env.SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!base||!key)return NextResponse.json({status:'unavailable',reason:'database_not_configured'},{status:503});
 try{
  const response=await fetch(base+'/rest/v1/nfl_studio_live_odds_cache?select=id,payload,fetched_at&id=eq.nfl',{headers:{apikey:key,Authorization:'Bearer '+key},cache:'no-store',signal:AbortSignal.timeout(10000)});
  if(!response.ok)throw Error('cache_unavailable');
  const rows=await response.json() as Cache[];
  const row=rows[0],events=Array.isArray(row?.payload)?row.payload as Event[]:[];
  const quotes:{event_id:string;home_team:string;away_team:string;kickoff_utc:string;bookmaker:string;bookmaker_key:string;market:string;family:string;selection:string;player:string|null;line:number|null;american_odds:number;decimal_odds:number;observed_at:string}[]=[];
  for(const event of events)for(const book of event.bookmakers||[])for(const market of book.markets||[]){
   const family=group(market.key||'');if(!family)continue;
   for(const outcome of market.outcomes||[]){
    const price=Number(outcome.price),odd=decimal(price);
    if(!Number.isFinite(price)||odd===null||odd<=1||!event.id||!event.home_team||!event.away_team||!row.fetched_at)continue;
    quotes.push({event_id:event.id,home_team:event.home_team,away_team:event.away_team,kickoff_utc:event.commence_time||'',bookmaker:book.title||book.key||'unknown',bookmaker_key:book.key||'',market:market.key||'',family,selection:outcome.name||'',player:outcome.description||null,line:typeof outcome.point==='number'?outcome.point:null,american_odds:price,decimal_odds:odd,observed_at:row.fetched_at});
   }
  }
  return NextResponse.json({status:'available',source:'The Odds API via existing NFL Studio cache',fetched_at:row?.fetched_at||null,quote_count:quotes.length,market_coverage:['moneyline','spread','total'],notes:['Quotes are not predictions','Bookmaker settlement rules must be verified','Player props remain in separate cached feeds'],quotes},{headers:{'Cache-Control':'no-store'}});
 }catch{return NextResponse.json({status:'unavailable',reason:'database_read_failed'},{status:502})}
}
