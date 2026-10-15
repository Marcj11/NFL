import {NextResponse} from 'next/server';
export const dynamic='force-dynamic';
export async function GET(request:Request){
 const origin=new URL(request.url).origin;
 const requested=Math.min(5,Math.max(1,Number(new URL(request.url).searchParams.get('limit')||3)));
 try{
  const res=await fetch(origin+'/api/player-props',{cache:'no-store',signal:AbortSignal.timeout(10000)});
  if(!res.ok)throw Error('offers_unavailable');
  const data=await res.json();
  const seen=new Set<string>();
  const selected=(Array.isArray(data.offers)?data.offers:[]).filter((o:{player?:string;selection?:string;line?:number})=>{
   if(!o.player||!o.selection||!Number.isFinite(Number(o.line)))return false;
   const k=o.player+'|'+o.selection;if(seen.has(k))return false;seen.add(k);return true;
  }).slice(0,requested);
  const inputs=[];
  for(const offer of selected){
   const market=String(offer.selection).split(' · ').pop()||'';
   const match=String(offer.game||'');
   const games=await fetch(origin+'/api/odds',{cache:'no-store',signal:AbortSignal.timeout(10000)}).then(r=>r.json());
   const event=(Array.isArray(games.games)?games.games:[]).find((g:{away_team:string;home_team:string})=>g.away_team+' vs '+g.home_team===match);
   if(!event?.commence_time){inputs.push({offer,eligible:false,reason:'kickoff_missing'});continue}
   const qs=new URLSearchParams({player:offer.player,market,before:event.commence_time});
   const result=await fetch(origin+'/api/expert-player-history?'+qs,{cache:'no-store',signal:AbortSignal.timeout(10000)}).then(r=>r.json());
   inputs.push({offer,eligible:result.eligible===true,reason:result.eligible?'research_input_only':'history_or_identity_unverified',history:result.history||[],kickoff_utc:event.commence_time});
  }
  return NextResponse.json({source:'independent_expert_nfl_player_props',status:'research_inputs_only',models_executed:false,recommendations_validated:false,count:inputs.length,inputs},{headers:{'Cache-Control':'no-store'}});
 }catch{return NextResponse.json({status:'source_unavailable',models_executed:false},{status:502})}
}
