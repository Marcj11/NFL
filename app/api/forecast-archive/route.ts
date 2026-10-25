import {NextResponse} from 'next/server';
import {createHash} from 'node:crypto';
export const dynamic='force-dynamic';
type Forecast={game_id:string;kickoff_utc:string;category:string;market:string;selection:string;selection_key:string;line?:number;bookmaker?:string;decimal_odds?:number;odds_observed_at?:string;estimated_probability:number;recommendation:'miser'|'passer'|'non_evalue';scope:'all_games'|'match_top5'|'global_top5'|'candidate';scope_key?:string;rank?:number;reasoning?:Record<string,unknown>;prediction_context?:Record<string,unknown>;data_quality?:Record<string,unknown>;inputs_asof?:string};
export async function POST(req:Request){
 try{
  const origin=req.headers.get('origin');if(origin&&new URL(origin).host!==new URL(req.url).host)return NextResponse.json({error:'cross_origin'},{status:403});
  const b=await req.json() as {model_version?:string;forecasts?:Forecast[]};
  if(typeof b.model_version!=='string'||b.model_version.length>90||!Array.isArray(b.forecasts)||b.forecasts.length<1||b.forecasts.length>150)return NextResponse.json({error:'invalid_batch'},{status:400});
  const current=Date.now(),rows=[];
  for(const f of b.forecasts){
   const kick=Date.parse(f.kickoff_utc);
   if(!f.game_id||f.game_id.length>150||!Number.isFinite(kick)||kick<=current||!Number.isFinite(f.estimated_probability)||f.estimated_probability<0||f.estimated_probability>1||!f.selection_key||!f.selection||!f.market||!f.category||!['miser','passer','non_evalue'].includes(f.recommendation)||!['all_games','match_top5','global_top5','candidate'].includes(f.scope))return NextResponse.json({error:'bad_forecast'},{status:400});
   const hasOdds=Number.isFinite(f.decimal_odds)&&Number(f.decimal_odds)>1;
   const implied=hasOdds?1/Number(f.decimal_odds):null,ev=hasOdds?f.estimated_probability*Number(f.decimal_odds)-1:null;
   const row={model_version:b.model_version,game_id:f.game_id,kickoff_utc:f.kickoff_utc,category:f.category,market:f.market,selection:f.selection,selection_key:f.selection_key,line:f.line??null,bookmaker:f.bookmaker??null,decimal_odds:hasOdds?f.decimal_odds:null,odds_observed_at:f.odds_observed_at??null,estimated_probability:f.estimated_probability,implied_probability:implied,estimated_ev:ev,recommendation:f.recommendation,rank:f.rank??null,scope:f.scope,scope_key:f.scope_key??null,reasoning:f.reasoning??{},prediction_context:f.prediction_context??{},data_quality:f.data_quality??{},inputs_asof:f.inputs_asof??null};
   const decision_key=createHash('sha256').update(JSON.stringify(row)).digest('hex');
   rows.push({...row,decision_key});
  }
  const base=process.env.SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;
  if(!base||!key)return NextResponse.json({error:'database_unavailable'},{status:503});
  const r=await fetch(base+'/rest/v1/nfl_studio_forecast_decisions_v2?on_conflict=decision_key',{method:'POST',headers:{apikey:key,Authorization:'Bearer '+key,'Content-Type':'application/json',Prefer:'resolution=ignore-duplicates'},body:JSON.stringify(rows),cache:'no-store',signal:AbortSignal.timeout(10000)});
  if(!r.ok)return NextResponse.json({error:'persist_failed',upstream:r.status},{status:502});
  return NextResponse.json({archived:rows.length,model_version:b.model_version});
 }catch{return NextResponse.json({error:'archive_failed'},{status:500})}
}
