import {NextResponse} from 'next/server';
export const dynamic='force-dynamic';
type Forecast={game_id:string;model_name:string;home_team:string;away_team:string;home_probability:number;forecast_at:string;kickoff_at:string;result_home_win:number|null};
const A='simple-historical-scores-v0',B='independent-recent-winrate-v1';
export async function GET(){
 const base=process.env.SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!base||!key)return NextResponse.json({status:'unavailable'},{status:503});
 try{
  const params=new URLSearchParams({select:'game_id,model_name,home_team,away_team,home_probability,forecast_at,kickoff_at,result_home_win',model_name:'in.('+A+','+B+')',order:'forecast_at.desc',limit:'2000'});
  const r=await fetch(base+'/rest/v1/nfl_studio_forecast_audit?'+params,{headers:{apikey:key,Authorization:'Bearer '+key},cache:'no-store',signal:AbortSignal.timeout(10000)});
  if(!r.ok)throw Error('audit_fetch');
  const all=await r.json() as Forecast[];
  const latest=new Map<string,Forecast>();
  for(const f of all){
   if(!Number.isFinite(Number(f.home_probability))||Number(f.home_probability)<=0||Number(f.home_probability)>=1||Date.parse(f.forecast_at)>=Date.parse(f.kickoff_at))continue;
   const game=[f.home_team,f.away_team,f.kickoff_at].join('|'),k=game+'|'+f.model_name;
   if(!latest.has(k))latest.set(k,f);
  }
  const matches=new Map<string,{a?:Forecast;b?:Forecast}>();
  for(const f of latest.values()){const k=[f.home_team,f.away_team,f.kickoff_at].join('|');const entry=matches.get(k)||{};if(f.model_name===A)entry.a=f;else entry.b=f;matches.set(k,entry)}
  const paired=[...matches.values()].filter((m):m is {a:Forecast;b:Forecast}=>!!m.a&&!!m.b).map(({a,b})=>{
   const pa=Number(a.home_probability),pb=Number(b.home_probability);
   const gap=Math.abs(pa-pb),disagree=(pa-.5)*(pb-.5)<0;
   // Equal-weight benchmark only. Not a calibrated recommendation.
   const experimentalBlend=(pa+pb)/2;
   const result=a.result_home_win??b.result_home_win;
   return {game:a.game_id,home:a.home_team,away:a.away_team,kickoff:a.kickoff_at,motorA:pa,motorB:pb,gap,disagree,experimentalBlend,result:result===0||result===1?result:null};
  }).sort((x,y)=>Date.parse(x.kickoff)-Date.parse(y.kickoff));
  const settled=paired.filter(x=>x.result!==null);
  const brier=(get:(x:typeof paired[number])=>number)=>settled.length?settled.reduce((sum,x)=>sum+(get(x)-x.result!)**2,0)/settled.length:null;
  const disagreements=paired.filter(x=>x.disagree);
  const settledDisagreements=disagreements.filter(x=>x.result!==null);
  const summary={
   closeDisagreements:disagreements.filter(x=>Math.abs(x.motorA-.5)<.1).length,
   agreement:paired.length-disagreements.length,
   disagreementSettled: settledDisagreements.length,
   correctA: settledDisagreements.filter(x=>(x.motorA>=.5)===(x.result===1)).length,
   correctB: settledDisagreements.filter(x=>(x.motorB>=.5)===(x.result===1)).length,
   trialOnly:true,
   topFiveInfluence:false,
   caution:'Ces statistiques pré-match ne valident pas une règle de pondération; garder une période de test future intacte.'
  };
  return NextResponse.json({status:'ok',method:'experimental_equal_weight_only',calibrated:false,paired:paired.length,disagreements:paired.filter(x=>x.disagree).length,meanGap:paired.length?paired.reduce((s,x)=>s+x.gap,0)/paired.length:null,settled: settled.length,brierA:brier(x=>x.motorA),brierB:brier(x=>x.motorB),brierBlend:brier(x=>x.experimentalBlend),matches:paired,diagnostics:summary},{headers:{'Cache-Control':'no-store'}});
 }catch{return NextResponse.json({status:'unavailable'},{status:503})}
}
