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
   if(!item.eligible||!['player_pass_yds','player_rush_yds','player_reception_yds','player_sacks','player_solo_tackles','player_tackles_assists','player_defensive_interceptions','player_tackles','player_interceptions','player_qb_hits','player_pass_defended','player_forced_fumbles','player_field_goals','player_field_goals_made','player_field_goal_attempts','player_extra_points','player_extra_points_made','player_kicking_points','player_pats'].includes(String(market)))return {offer,status:'PASSER',explanation:'Historique insuffisant ou marche non pris en charge.'};
   try{
    const result=simulateYards((item.history||[]).map(h=>Number(h.value)),Number(offer.line),42,5000,(item.history||[]).filter(h=>typeof h.date==='string'&&Number.isFinite(Number(h.value))).map(h=>({date:h.date!,value:Number(h.value)})),String(market));
    const label=String(offer.selection).toLowerCase();
    const over=/\bover\b/.test(label),under=/\bunder\b/.test(label);
    // Defensive and kicking counts are discrete: a continuous yardage gamma model
    // systematically overstates certainty at 0.5/1.5 lines. Use observed hits
    // with a conservative Beta(2,2) prior instead of the gamma tail.
    const discrete=/sacks|tackles|interceptions|qb_hits|pass_defended|fumbles|field_goals|extra_points|kicking_points|pats/.test(String(market));
    const history=(item.history||[]).filter(h=>Number.isFinite(Number(h.value))&&Number(h.value)>=0);
    const season=(d:string)=>{const x=new Date(d);return x.getUTCFullYear()-(x.getUTCMonth()<2?1:0)}; const year=season(item.kickoff_utc||new Date().toISOString()); const current=history.filter(h=>h.date&&season(h.date)===year).slice(-8),prior=history.filter(h=>h.date&&season(h.date)===year-1).slice(-4); const hits=(xs:typeof history)=>xs.filter(h=>over?Number(h.value)>Number(offer.line):Number(h.value)<Number(offer.line)).length; const smooth=(xs:typeof history)=>(hits(xs)+2)/(xs.length+4); const weighted=current.length&&prior.length?.7*smooth(current)+.3*smooth(prior):smooth(current.length?current:history);
    const probability=over!==under?(discrete?weighted:(over?result.p_over:result.p_under)):null;
    const odds=Number(offer.odds);
    const ev=probability!==null&&Number.isFinite(odds)&&odds>1?probability*(odds-1)-(1-probability-result.p_push):null;
    return {offer,probability,model:'independent-expert-nfl-props-research',expected_value_experimental:ev,push_probability:result.p_push,implied_probability:odds>1?1/odds:null,projection:result.projection,interval_10_90:[result.p10,result.p90],status:'PASSER',explanation:result.explanation,experimental:true};
   }catch{return {offer,status:'PASSER',explanation:'Simulation impossible avec les observations actuellement disponibles.'}}
  });
  return NextResponse.json({status:'research_only',validated:false,bookmaker_recommendations:false,evaluations,total:batch.total||0,offset,nextOffset:batch.nextOffset??null},{headers:{'Cache-Control':'no-store'}});
 }catch{return NextResponse.json({status:'evaluation_unavailable',evaluations:[]},{status:502})}
}
