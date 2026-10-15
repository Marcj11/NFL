import {NextResponse} from 'next/server';
export const dynamic='force-dynamic';
export async function GET(request:Request){
 const origin=new URL(request.url).origin;
 const requested=Math.min(30,Math.max(1,Number(new URL(request.url).searchParams.get('limit')||20)));
 try{
  const res=await fetch(origin+'/api/player-props',{cache:'no-store',signal:AbortSignal.timeout(10000)});
  if(!res.ok)throw Error('offers_unavailable');
  const data=await res.json();
  const seen=new Set<string>();
  const selected=(Array.isArray(data.offers)?data.offers:[]).filter((o:{player?:string;selection?:string;line?:number})=>{
   if(!o.player||!o.selection||!Number.isFinite(Number(o.line)))return false;
   const k=o.player+'|'+o.selection;if(seen.has(k))return false;seen.add(k);return true;
  }).slice(0,requested);
  
  const inputs=await Promise.all(selected.map(async (offer:{player:string;selection:string;game?:string;kickoff_utc?:string})=>{
   const market=String(offer.selection).split(' · ').pop()||'';
   const kickoff=String(offer.kickoff_utc||'');
   if(!Number.isFinite(Date.parse(kickoff)))return {offer,eligible:false,reason:'kickoff_missing'};
   try{
    const qs=new URLSearchParams({player:offer.player,market,before:kickoff});
    const response=await fetch(origin+'/api/expert-player-history?'+qs,{cache:'no-store',signal:AbortSignal.timeout(12000)});
    if(!response.ok)return {offer,eligible:false,reason:'history_http_'+response.status};
    const result=await response.json();
    return {offer,eligible:result.eligible===true,reason:result.eligible?'research_input_only':'history_or_identity_unverified',history:result.history||[],kickoff_utc:kickoff};
   }catch{return {offer,eligible:false,reason:'history_unavailable'}}
  }));
  return NextResponse.json({source:'independent_expert_nfl_player_props',status:'research_inputs_only',models_executed:false,recommendations_validated:false,count:inputs.length,inputs},{headers:{'Cache-Control':'no-store'}});
 }catch{return NextResponse.json({status:'source_unavailable',models_executed:false},{status:502})}
}
