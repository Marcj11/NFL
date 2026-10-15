import {NextResponse} from 'next/server';
import {simulateYards} from '../../../lib/expert-nfl/simulate-yards';
export const dynamic='force-dynamic';
type Input={offer?:{player?:string;selection?:string;odds?:number;line?:number;book?:string;game?:string};eligible?:boolean;history?:Array<{date?:string;value?:number}>;kickoff_utc?:string};
export async function GET(request:Request){
 try{
  const origin=new URL(request.url).origin;
  const response=await fetch(origin+'/api/expert-prop-batch?limit=5',{cache:'no-store',signal:AbortSignal.timeout(25000)});
  if(!response.ok)return NextResponse.json({status:'batch_unavailable',evaluations:[]},{status:502});
  const batch=await response.json();
  const evaluations=(Array.isArray(batch.inputs)?batch.inputs as Input[]:[]).map((item)=>{
   const offer=item.offer||{},market=String(offer.selection||'').split(' · ').pop();
   if(!item.eligible||!['player_pass_yds','player_rush_yds','player_reception_yds'].includes(String(market)))return {offer,status:'PASSER',explanation:'Historique insuffisant ou marche non pris en charge.'};
   try{
    const result=simulateYards((item.history||[]).map(h=>Number(h.value)),Number(offer.line));
    const label=String(offer.selection).toLowerCase();
    const over=/\bover\b/.test(label),under=/\bunder\b/.test(label);
    const probability=over?result.p_over:under?result.p_under:null;
    const odds=Number(offer.odds);
    const ev=probability!==null&&Number.isFinite(odds)&&odds>1?probability*(odds-1)-(1-probability):null;
    return {offer,probability,model:'independent-expert-nfl-props-research',expected_value_experimental:ev,implied_probability:odds>1?1/odds:null,projection:result.projection,interval_10_90:[result.p10,result.p90],status:'PASSER',explanation:result.explanation,experimental:true};
   }catch{return {offer,status:'PASSER',explanation:'Simulation impossible avec les observations actuellement disponibles.'}}
  });
  return NextResponse.json({status:'research_only',validated:false,bookmaker_recommendations:false,evaluations},{headers:{'Cache-Control':'no-store'}});
 }catch{return NextResponse.json({status:'evaluation_unavailable',evaluations:[]},{status:502})}
}
