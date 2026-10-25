import {NextResponse} from 'next/server';
export const dynamic='force-dynamic';
type CacheRow={payload:unknown;fetched_at:string|null;requests_used:number|null;requests_remaining:number|null;last_error:string|null};
// Fixed NFL odds slots in America/Toronto: Sunday 08:00/12:00, Monday 18:00, Thursday 18:00.
const slots=[{day:0,hour:8},{day:0,hour:12},{day:1,hour:18},{day:4,hour:18}];
function mostRecentSlot(now=new Date()):Date{
 const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Toronto',weekday:'short',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(now);
 const find=(type:string)=>parts.find(p=>p.type===type)?.value||'';
 const weekdays=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];const dow=weekdays.indexOf(find('weekday'));const hour=Number(find('hour'));const minute=Number(find('minute'));
 const elapsed=dow*1440+hour*60+minute;
 const past=slots.map(slot=>slot.day*1440+slot.hour*60).filter(v=>v<=elapsed);
 const chosen=past.length?Math.max(...past):Math.max(...slots.map(x=>x.day*1440+x.hour*60))-10080;
 return new Date(now.getTime()-(elapsed-chosen)*60000);
}
export async function GET(){
 const base=process.env.SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY,oddsKey=process.env.THE_ODDS_API_KEY;
 if(!base||!key)return NextResponse.json({status:'not_configured',games:[]},{status:503});
 const headers={apikey:key,Authorization:'Bearer '+key,'Content-Type':'application/json'};
 const api=base+'/rest/v1/';
 const getCache=async()=>{const r=await fetch(api+'nfl_studio_live_odds_cache?id=eq.nfl&select=*',{headers,cache:'no-store',signal:AbortSignal.timeout(10000)});if(!r.ok)throw Error('cache_read_'+r.status);return (await r.json())[0] as CacheRow};
 try{
  let cache=await getCache();
  const slot=mostRecentSlot();
  const due=!cache.fetched_at||new Date(cache.fetched_at).getTime()<slot.getTime();
  if(due&&oddsKey){
   const period=new Date().toISOString().slice(0,7);
   const claim=await fetch(api+'rpc/nfl_studio_claim_odds_refresh',{method:'POST',headers,body:JSON.stringify({p_period:period}),cache:'no-store',signal:AbortSignal.timeout(10000)});
   if(claim.ok&&await claim.json()===true){
    try{
     const url='https://api.the-odds-api.com/v4/sports/americanfootball_nfl/odds/?'+new URLSearchParams({apiKey:oddsKey,regions:'us',markets:'h2h,spreads,totals',oddsFormat:'american',dateFormat:'iso'});
     const result=await fetch(url,{cache:'no-store',signal:AbortSignal.timeout(14000)});
     if(!result.ok)throw Error('odds_provider_'+result.status);
     const games=await result.json();
     if(!Array.isArray(games))throw Error('invalid_provider_payload');
     const update=await fetch(api+'nfl_studio_live_odds_cache?id=eq.nfl',{method:'PATCH',headers:{...headers,Prefer:'return=minimal'},body:JSON.stringify({payload:games,fetched_at:new Date().toISOString(),requests_used:Number(result.headers.get('x-requests-used'))||null,requests_remaining:Number(result.headers.get('x-requests-remaining'))||null,last_error:null,updated_at:new Date().toISOString()})});
     if(!update.ok)throw Error('cache_write_'+update.status);
     cache=await getCache();
    }catch(e){await fetch(api+'nfl_studio_live_odds_cache?id=eq.nfl',{method:'PATCH',headers,body:JSON.stringify({last_error:String(e).slice(0,140)})}).catch(()=>{});}
   }
  }
  const games=Array.isArray(cache.payload)?cache.payload:[];
  return NextResponse.json({provider:'The Odds API',configured:Boolean(oddsKey),status:games.length?'available':cache.last_error?'provider_error':'awaiting_data',fetched_at:cache.fetched_at,age_minutes:cache.fetched_at?Math.round((Date.now()-new Date(cache.fetched_at).getTime())/60000):null,update_schedule:'Dimanche 08:00 et 12:00, lundi 18:00, jeudi 18:00 (America/Toronto)',requests_remaining:cache.requests_remaining,games},{headers:{'Cache-Control':'public, s-maxage=120, stale-while-revalidate=180'}});
 }catch{return NextResponse.json({status:'cache_unavailable',games:[]},{status:503})}
}
export async function POST(){return NextResponse.json({error:'Manual refresh disabled; shared cache refreshes when due.'},{status:403})}
