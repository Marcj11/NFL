import {NextResponse} from 'next/server';
import {simulateYards} from '../../../lib/expert-nfl/simulate-yards';
export const dynamic='force-dynamic';
type Input={offer?:{player?:string;selection?:string;odds?:number;line?:number;book?:string;game?:string};eligible?:boolean;history?:Array<{date?:string;value?:number}>;kickoff_utc?:string};
export async function GET(request:Request){
 try{
  const origin=new URL(request.url).origin;
  const params=new URL(request.url).searchParams;
  const offset=Math.max(0,Math.floor(Number(params.get('offset')||0)));
  const response=await fetch(origin+'/api/expert-prop-batch?limit=30&offset='+offset,{cache:'no-store',signal:AbortSignal.timeout(55000)});
  if(!response.ok)return NextResponse.json({status:'batch_unavailable',evaluations:[]},{status:502});
  const batch=await response.json();
  const evaluations=(Array.isArray(batch.inputs)?batch.inputs as Input[]:[]).map((item)=>{
   const offer=item.offer||{},market=String(offer.selection||'').split(' · ').pop();
   if(!item.eligible||!['player_pass_yds','player_rush_yds','player_reception_yds','player_sacks','player_tackles','player_interceptions','player_qb_hits','player_pass_defended','player_forced_fumbles'].includes(String(market)))return {offer,status:'PASSER',explanation:'Historique insuffisant ou marche non pris en charge.'};
   try{
    const result=simulateYards((item.history||[]).map(h=>Number(h.value)),Number(offer.line),42,5000,(item.history||[]).filter(h=>typeof h.date==='string'&&Number.isFinite(Number(h.value))).map(h=>({date:h.date!,value:Number(h.value)})),String(market));
    const label=String(offer.selection).toLowerCase();
    const over=/\bover\b/.test(label),under=/\bunder\b/.test(label);
    const probability=over!==under?(over?result.p_over:result.p_under):null;
    const odds=Number(offer.odds);
    const ev=probability!==null&&Number.isFinite(odds)&&odds>1?probability*(odds-1)-(1-probability-result.p_push):null;
    return {offer,probability,model:'independent-expert-nfl-props-research',expected_value_experimental:ev,push_probability:result.p_push,implied_probability:odds>1?1/odds:null,projection:result.projection,interval_10_90:[result.p10,result.p90],status:'PASSER',explanation:result.explanation,experimental:true};
   }catch{return {offer,status:'PASSER',explanation:'Simulation impossible avec les observations actuellement disponibles.'}}
  });
  return NextResponse.json({status:'research_only',validated:false,bookmaker_recommendations:false,evaluations,total:batch.total||0,offset,nextOffset:batch.nextOffset??null},{headers:{'Cache-Control':'no-store'}});
 }catch{return NextResponse.json({status:'evaluation_unavailable',evaluations:[]},{status:502})}
}
